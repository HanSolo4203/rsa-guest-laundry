-- Yoco online payments.
-- Guests can prepay a bag-size tier. The kiosk price is still the source of
-- truth: a heavier bag becomes topup_due, a lighter bag stays prepaid.
-- Only the service role (and security definer functions) write payment state.

ALTER TABLE public.bookings
    ADD COLUMN payment_status text NOT NULL DEFAULT 'pay_on_delivery',
    ADD COLUMN prepaid_amount_cents integer,
    ADD COLUMN prepaid_tier_max_kg numeric;

ALTER TABLE public.bookings
    DROP CONSTRAINT IF EXISTS bookings_payment_status_check;

ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_payment_status_check
        CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'topup_due', 'pay_on_delivery'));

ALTER TABLE public.bookings
    DROP CONSTRAINT IF EXISTS bookings_prepaid_amount_cents_check;

ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_prepaid_amount_cents_check
        CHECK (prepaid_amount_cents IS NULL OR prepaid_amount_cents >= 200);

ALTER TABLE public.bookings
    DROP CONSTRAINT IF EXISTS bookings_prepaid_tier_max_kg_check;

ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_prepaid_tier_max_kg_check
        CHECK (prepaid_tier_max_kg IS NULL OR prepaid_tier_max_kg > 0);

COMMENT ON COLUMN public.bookings.payment_status IS
    'unpaid, pending (Yoco checkout open), paid, topup_due, or pay_on_delivery.';
COMMENT ON COLUMN public.bookings.prepaid_amount_cents IS
    'Cents captured for the original prepaid tier. Set when that Yoco payment succeeds.';
COMMENT ON COLUMN public.bookings.prepaid_tier_max_kg IS
    'Max kg of the tier the guest prepaid. Compared with the weighed price at the kiosk.';

CREATE INDEX bookings_payment_pending_idx
    ON public.bookings (created_at)
    WHERE payment_status = 'pending';

-- Authenticated dashboard updates must not mark a booking paid. Service role
-- and security definer functions (kiosk weigh-in, expiry) run as a privileged
-- role and are allowed through.
CREATE OR REPLACE FUNCTION private.guard_booking_payment_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF current_user IN ('postgres', 'supabase_admin', 'service_role')
       OR (SELECT auth.role()) = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.payment_status := 'pay_on_delivery';
        NEW.prepaid_amount_cents := NULL;
        NEW.prepaid_tier_max_kg := NULL;
        RETURN NEW;
    END IF;

    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.prepaid_amount_cents IS DISTINCT FROM OLD.prepaid_amount_cents
       OR NEW.prepaid_tier_max_kg IS DISTINCT FROM OLD.prepaid_tier_max_kg THEN
        RAISE EXCEPTION 'Payment fields are updated by the server'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION private.guard_booking_payment_columns() IS
    'Blocks anon and authenticated roles from setting payment_status, prepaid amount, or prepaid tier.';

REVOKE ALL ON FUNCTION private.guard_booking_payment_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS bookings_guard_payment_columns ON public.bookings;
CREATE TRIGGER bookings_guard_payment_columns
    BEFORE INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION private.guard_booking_payment_columns();

-- Public inserts stay pay-on-delivery. Online checkout goes through the service role.
DROP POLICY IF EXISTS "bookings_allow_insert_for_anonymous" ON public.bookings;

CREATE POLICY "bookings_allow_insert_for_anonymous" ON public.bookings
    FOR INSERT
    TO anon
    WITH CHECK (
        stage = 'to_weigh'
        AND status = 'pending'
        AND machine_number IS NULL
        AND dryer_number IS NULL
        AND weighed_by IS NULL
        AND weighed_at IS NULL
        AND washing_at IS NULL
        AND drying_at IS NULL
        AND finishing_at IS NULL
        AND ready_at IS NULL
        AND ready_acknowledged_at IS NULL
        AND out_for_delivery_at IS NULL
        AND delivered_at IS NULL
        AND received_at IS NULL
        AND property_id IS NOT NULL
        AND payment_status = 'pay_on_delivery'
        AND prepaid_amount_cents IS NULL
        AND prepaid_tier_max_kg IS NULL
        AND EXISTS (
            SELECT 1
            FROM public.properties AS p
            WHERE p.id = bookings.property_id
              AND p.active = true
        )
        AND EXISTS (
            SELECT 1
            FROM public.property_services AS ps
            WHERE ps.property_id = bookings.property_id
              AND ps.service_id = bookings.service_id
        )
    );

CREATE TABLE public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
    kind text NOT NULL,
    amount_cents integer NOT NULL,
    currency text NOT NULL DEFAULT 'ZAR',
    status text NOT NULL DEFAULT 'pending',
    yoco_checkout_id text,
    yoco_payment_id text,
    prepaid_tier_max_kg numeric,
    created_at timestamptz NOT NULL DEFAULT now(),
    paid_at timestamptz,
    CONSTRAINT payments_kind_check CHECK (kind IN ('booking', 'topup')),
    CONSTRAINT payments_amount_cents_check CHECK (amount_cents >= 200),
    CONSTRAINT payments_currency_check CHECK (currency = 'ZAR'),
    CONSTRAINT payments_status_check CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled', 'expired')),
    CONSTRAINT payments_yoco_checkout_id_key UNIQUE (yoco_checkout_id),
    CONSTRAINT payments_yoco_payment_id_key UNIQUE (yoco_payment_id),
    CONSTRAINT payments_prepaid_tier_max_kg_check CHECK (prepaid_tier_max_kg IS NULL OR prepaid_tier_max_kg > 0)
);

COMMENT ON TABLE public.payments IS
    'Yoco checkout attempts. Amounts are server-side cents. Writes are service role only.';

CREATE INDEX payments_booking_id_idx ON public.payments (booking_id);
CREATE INDEX payments_pending_created_idx
    ON public.payments (created_at)
    WHERE status = 'pending';

CREATE TABLE public.payment_events (
    yoco_event_id text PRIMARY KEY,
    type text NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now(),
    raw jsonb NOT NULL
);

COMMENT ON TABLE public.payment_events IS
    'Yoco webhook ids. A duplicate delivery inserts nothing and is not applied twice.';

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_admin_select ON public.payments
    FOR SELECT
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()));

CREATE POLICY payments_property_select ON public.payments
    FOR SELECT
    TO authenticated
    USING (
        (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'property'
        AND EXISTS (
            SELECT 1
            FROM public.bookings AS b
            WHERE b.id = payments.booking_id
              AND b.property_id IN (SELECT private.my_property_ids())
        )
    );

REVOKE ALL ON TABLE public.payments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.payments TO authenticated;

REVOKE ALL ON TABLE public.payment_events FROM PUBLIC, anon, authenticated;

-- The live database can be behind 027, which is where these columns were
-- introduced. The views below append them, so they have to exist first.
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'guest';

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.bookings
    DROP CONSTRAINT IF EXISTS bookings_source_check;

ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_source_check
    CHECK (source IN ('guest', 'portal', 'admin'));

COMMENT ON COLUMN public.bookings.source IS
    'Who created the booking: guest form, property portal, or an admin.';
COMMENT ON COLUMN public.bookings.created_by IS
    'Auth user who created a portal or admin booking. Null for guest form inserts.';

-- Append only. Existing column order stays the same.
CREATE OR REPLACE VIEW public.portal_bookings
WITH (security_barrier = true, security_invoker = true) AS
SELECT
    b.id,
    b.property_id,
    b.first_name,
    b.last_name,
    b.phone,
    b.room_number,
    b.service_id,
    s.name AS service_name,
    b.collection_date,
    b.departure_date,
    b.status,
    b.stage,
    CASE
        WHEN p.show_prices THEN b.total_price
        ELSE NULL::numeric
    END AS total_price,
    b.payment_method,
    b.weight_kg,
    b.machine_number,
    b.dryer_number,
    b.additional_details,
    b.created_at,
    b.completed_at,
    b.weighed_at,
    b.washing_at,
    b.drying_at,
    b.finishing_at,
    b.ready_at,
    b.out_for_delivery_at,
    b.delivered_at,
    b.received_at,
    b.source,
    b.created_by,
    b.payment_status
FROM public.bookings AS b
JOIN public.services AS s ON s.id = b.service_id
JOIN public.properties AS p ON p.id = b.property_id
WHERE (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'property'
  AND b.property_id IN (SELECT private.my_property_ids());

COMMENT ON VIEW public.portal_bookings IS
    'Property projection of bookings. Rows require app_metadata.role = property and a property_members row. total_price is returned only when properties.show_prices is true. Includes delivery timestamps, source, created_by, and payment_status. Omits weighed_by, ready_acknowledged_at, and prepaid amounts.';

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
    b.ready_at,
    b.dryer_number,
    b.first_name,
    b.departure_date,
    p.name AS property_name,
    p.primary_color,
    b.room_number,
    b.source,
    b.payment_status
FROM public.bookings AS b
JOIN public.services AS s ON s.id = b.service_id
JOIN public.properties AS p ON p.id = b.property_id
WHERE (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'kiosk'
  AND b.out_for_delivery_at IS NULL
  AND b.status IS DISTINCT FROM 'delivered';

COMMENT ON VIEW public.kiosk_bookings IS
    'Kiosk projection of bookings. Rows are returned only when app_metadata.role is kiosk. Bags out for delivery or delivered are omitted. Includes the guest first name, stay dates, service name, property name, property primary colour, room number, notes, source, and payment_status. Omits phone and prices.';

CREATE OR REPLACE FUNCTION public.kiosk_weigh_and_start(
    booking_id uuid,
    weight_kg numeric,
    machine_number integer,
    staff_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_status text;
    v_service_id uuid;
    v_price numeric;
    v_id uuid;
    v_stage text;
    v_new_status text;
    v_weight numeric;
    v_machine integer;
    v_total numeric;
    v_payment_status text;
    v_prepaid_cents integer;
    v_price_cents integer;
    v_next_payment_status text;
BEGIN
    PERFORM private.assert_kiosk();

    IF booking_id IS NULL OR staff_id IS NULL OR machine_number IS NULL THEN
        RAISE EXCEPTION 'booking_id, staff_id, and machine_number are required'
            USING ERRCODE = '22023';
    END IF;

    IF weight_kg IS NULL OR weight_kg <= 0 THEN
        RAISE EXCEPTION 'Weight must be greater than 0'
            USING ERRCODE = '22023';
    END IF;

    SELECT b.status, b.service_id, b.payment_status, b.prepaid_amount_cents
    INTO v_status, v_service_id, v_payment_status, v_prepaid_cents
    FROM public.bookings AS b
    WHERE b.id = kiosk_weigh_and_start.booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_status IN ('cancelled', 'completed') THEN
        RAISE EXCEPTION 'Booking cannot be weighed while %', v_status
            USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.staff AS s
        WHERE s.id = kiosk_weigh_and_start.staff_id
          AND s.active
    ) THEN
        RAISE EXCEPTION 'Active staff member not found'
            USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.machines AS m
        WHERE m.number = kiosk_weigh_and_start.machine_number
          AND m.type = 'washer'
          AND m.active
    ) THEN
        RAISE EXCEPTION 'Active washer % not found', machine_number
            USING ERRCODE = '22023';
    END IF;

    SELECT t.price
    INTO v_price
    FROM public.service_pricing_tiers AS t
    WHERE t.service_id = v_service_id
      AND kiosk_weigh_and_start.weight_kg >= t.min_weight
      AND kiosk_weigh_and_start.weight_kg <= t.max_weight
    ORDER BY t.min_weight
    LIMIT 1;

    IF v_price IS NULL THEN
        RAISE EXCEPTION 'No pricing tier matches weight % kg', weight_kg
            USING ERRCODE = '22023';
    END IF;

    v_price_cents := pg_catalog.round(v_price * 100)::integer;
    v_next_payment_status := v_payment_status;
    IF v_payment_status = 'paid'
       AND v_prepaid_cents IS NOT NULL
       AND v_price_cents > v_prepaid_cents THEN
        v_next_payment_status := 'topup_due';
    END IF;

    UPDATE public.bookings AS b
    SET weight_kg = kiosk_weigh_and_start.weight_kg,
        machine_number = kiosk_weigh_and_start.machine_number,
        weighed_by = kiosk_weigh_and_start.staff_id,
        stage = 'washing',
        status = 'processing',
        weighed_at = pg_catalog.now(),
        washing_at = pg_catalog.now(),
        total_price = v_price,
        payment_status = v_next_payment_status
    WHERE b.id = kiosk_weigh_and_start.booking_id
    RETURNING
        b.id,
        b.stage,
        b.status::text,
        b.weight_kg,
        b.machine_number,
        b.total_price
    INTO v_id, v_stage, v_new_status, v_weight, v_machine, v_total;

    RETURN pg_catalog.jsonb_build_object(
        'id', v_id,
        'stage', v_stage,
        'status', v_new_status,
        'weight_kg', v_weight,
        'machine_number', v_machine,
        'total_price', v_total
    );
END;
$$;

COMMENT ON FUNCTION public.kiosk_weigh_and_start(uuid, numeric, integer, uuid) IS
    'Kiosk only. Records weight, washer, staff, and price, and moves the booking to washing/processing. A prepaid booking whose weighed price is higher is marked topup_due. A lower price does not change the payment.';

REVOKE ALL ON FUNCTION public.kiosk_weigh_and_start(uuid, numeric, integer, uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.kiosk_weigh_and_start(uuid, numeric, integer, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.expire_stale_payments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_count integer := 0;
BEGIN
    UPDATE public.payments
    SET status = 'expired'
    WHERE status = 'pending'
      AND created_at < pg_catalog.now() - interval '60 minutes';

    UPDATE public.bookings AS b
    SET payment_status = 'pay_on_delivery',
        additional_details = CASE
            WHEN b.additional_details IS NULL OR btrim(b.additional_details) = '' THEN 'Unpaid'
            WHEN b.additional_details ~ '(^|\n)Unpaid(\n|$)' THEN b.additional_details
            ELSE b.additional_details || E'\nUnpaid'
        END
    WHERE b.payment_status = 'pending'
      AND EXISTS (
          SELECT 1
          FROM public.payments AS expired_payment
          WHERE expired_payment.booking_id = b.id
            AND expired_payment.kind = 'booking'
            AND expired_payment.status = 'expired'
      )
      AND NOT EXISTS (
          SELECT 1
          FROM public.payments AS open_payment
          WHERE open_payment.booking_id = b.id
            AND open_payment.kind = 'booking'
            AND open_payment.status IN ('pending', 'succeeded')
      );

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.expire_stale_payments() IS
    'Marks pending Yoco checkouts older than 60 minutes expired. A booking still waiting on its first payment falls back to pay on delivery and gains an Unpaid note. Top-up due bookings stay top-up due.';

REVOKE ALL ON FUNCTION public.expire_stale_payments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_payments() TO service_role;

DO $cron$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        BEGIN
            CREATE EXTENSION pg_cron WITH SCHEMA pg_catalog;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'pg_cron unavailable: %', SQLERRM;
            RETURN;
        END;
    END IF;

    BEGIN
        PERFORM cron.unschedule('expire-stale-payments');
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    PERFORM cron.schedule(
        'expire-stale-payments',
        '*/10 * * * *',
        $job$SELECT public.expire_stale_payments()$job$
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule payment expiry: %', SQLERRM;
END
$cron$;
