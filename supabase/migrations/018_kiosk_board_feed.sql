-- Kiosk board feed.
--
-- ready_at is added to kiosk_bookings so the tablet can drop bags that have
-- been ready for more than 24 hours. The column is not a secret.
--
-- The kiosk role cannot SELECT bookings (that grant would expose phone numbers
-- and prices). Postgres Changes on bookings would therefore never be delivered.
-- A one-row signal is updated after every booking change. The tablet may
-- select that row, so Realtime can wake it, and it then refetches the view.
-- The signal carries no guest data.

CREATE OR REPLACE VIEW public.kiosk_bookings
WITH (security_barrier = true, security_invoker = false) AS
SELECT
    b.id,
    b.last_name,
    pg_catalog.left(b.first_name, 1) AS first_name_initial,
    s.name AS service_name,
    b.stage,
    b.status,
    b.machine_number,
    b.weight_kg,
    b.created_at,
    b.collection_date,
    b.additional_details,
    b.ready_at
FROM public.bookings AS b
JOIN public.services AS s ON s.id = b.service_id
WHERE (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'kiosk';

COMMENT ON VIEW public.kiosk_bookings IS 'Kiosk projection of bookings. Rows are returned only when app_metadata.role is kiosk. Omits phone and prices.';

REVOKE ALL ON TABLE public.kiosk_bookings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.kiosk_bookings TO authenticated;

CREATE TABLE IF NOT EXISTS public.kiosk_board_signal (
    id integer PRIMARY KEY,
    tick bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT kiosk_board_signal_singleton CHECK (id = 1)
);

COMMENT ON TABLE public.kiosk_board_signal IS 'One-row Realtime wake-up for the kiosk board. No guest, phone, or price data.';

INSERT INTO public.kiosk_board_signal (id, tick)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.kiosk_board_signal REPLICA IDENTITY FULL;

ALTER TABLE public.kiosk_board_signal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kiosk_board_signal_select" ON public.kiosk_board_signal;
CREATE POLICY "kiosk_board_signal_select" ON public.kiosk_board_signal
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'kiosk');

REVOKE ALL ON TABLE public.kiosk_board_signal FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.kiosk_board_signal TO authenticated;

CREATE OR REPLACE FUNCTION private.notify_kiosk_board()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.kiosk_board_signal
    SET tick = tick + 1,
        updated_at = pg_catalog.clock_timestamp()
    WHERE id = 1;

    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION private.notify_kiosk_board() IS 'Bumps the kiosk board signal after a booking change. Carries no row data.';

REVOKE ALL ON FUNCTION private.notify_kiosk_board() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.notify_kiosk_board() TO anon, authenticated;

DROP TRIGGER IF EXISTS bookings_notify_kiosk_board ON public.bookings;
CREATE TRIGGER bookings_notify_kiosk_board
    AFTER INSERT OR UPDATE OR DELETE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION private.notify_kiosk_board();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'kiosk_board_signal'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.kiosk_board_signal;
    END IF;
END $$;
