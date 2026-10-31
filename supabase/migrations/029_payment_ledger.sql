-- Payments tracker.
-- Safe whether or not 028_yoco_payments has been applied: the payments table,
-- payment_status, and the booking payment guard are created here when missing,
-- then extended. Amounts stay in cents. Yoco still requires R2 (200 cents).
-- Manual payments may be 1 cent or more.

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pay_on_delivery';

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS prepaid_amount_cents integer;

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS prepaid_tier_max_kg numeric;

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

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS payment_method character varying(10);

DO $method_checks$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT con.conname
        FROM pg_constraint AS con
        JOIN pg_class AS rel ON rel.oid = con.conrelid
        JOIN pg_namespace AS nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'bookings'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%payment_method%'
    LOOP
        EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT %I', constraint_name);
    END LOOP;
END
$method_checks$;

ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_payment_method_check
    CHECK (
        payment_method IS NULL
        OR payment_method IN ('card', 'cash', 'eft', 'account')
    );

COMMENT ON COLUMN public.bookings.payment_method IS
    'How the booking is settled: card, cash, eft, or account (billed to the property).';

CREATE INDEX IF NOT EXISTS bookings_payment_pending_idx
    ON public.bookings (created_at)
    WHERE payment_status = 'pending';

CREATE TABLE IF NOT EXISTS public.payments (
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
    method text NOT NULL DEFAULT 'yoco',
    recorded_by uuid,
    reference text,
    note text
);

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS method text;

UPDATE public.payments
SET method = 'yoco'
WHERE method IS NULL;

ALTER TABLE public.payments
    ALTER COLUMN method SET DEFAULT 'yoco';

ALTER TABLE public.payments
    ALTER COLUMN method SET NOT NULL;

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS recorded_by uuid;

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS reference text;

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS note text;

DO $payments_fk$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'payments_recorded_by_fkey'
    ) THEN
        ALTER TABLE public.payments
            ADD CONSTRAINT payments_recorded_by_fkey
            FOREIGN KEY (recorded_by) REFERENCES auth.users (id) ON DELETE SET NULL;
    END IF;
END
$payments_fk$;

DO $payments_checks$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT con.conname
        FROM pg_constraint AS con
        JOIN pg_class AS rel ON rel.oid = con.conrelid
        JOIN pg_namespace AS nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'payments'
          AND con.contype = 'c'
          AND (
              pg_get_constraintdef(con.oid) ILIKE '%amount_cents%'
              OR pg_get_constraintdef(con.oid) ILIKE '%kind%'
              OR pg_get_constraintdef(con.oid) ILIKE '%status%'
              OR pg_get_constraintdef(con.oid) ILIKE '%method%'
          )
    LOOP
        EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT %I', constraint_name);
    END LOOP;
END
$payments_checks$;

ALTER TABLE public.payments
    ADD CONSTRAINT payments_kind_check
    CHECK (kind IN ('booking', 'topup', 'manual'));

ALTER TABLE public.payments
    ADD CONSTRAINT payments_status_check
    CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled', 'expired', 'refunded'));

ALTER TABLE public.payments
    ADD CONSTRAINT payments_method_check
    CHECK (method IN ('yoco', 'card_machine', 'cash', 'eft', 'account'));

ALTER TABLE public.payments
    ADD CONSTRAINT payments_amount_cents_check
    CHECK (
        (method = 'yoco' AND amount_cents >= 200)
        OR (method <> 'yoco' AND amount_cents >= 1)
    );

ALTER TABLE public.payments
    DROP CONSTRAINT IF EXISTS payments_currency_check;

ALTER TABLE public.payments
    ADD CONSTRAINT payments_currency_check
    CHECK (currency = 'ZAR');

ALTER TABLE public.payments
    DROP CONSTRAINT IF EXISTS payments_prepaid_tier_max_kg_check;

ALTER TABLE public.payments
    ADD CONSTRAINT payments_prepaid_tier_max_kg_check
    CHECK (prepaid_tier_max_kg IS NULL OR prepaid_tier_max_kg > 0);

COMMENT ON COLUMN public.payments.method IS
    'yoco, card_machine, cash, eft, or account. Existing rows default to yoco.';
COMMENT ON COLUMN public.payments.recorded_by IS
    'Dashboard admin who recorded a manual payment. Null for Yoco checkouts.';
COMMENT ON COLUMN public.payments.reference IS
    'EFT reference or receipt number.';
COMMENT ON COLUMN public.payments.note IS
    'Optional note. A void stores its reason here and keeps the row.';

CREATE UNIQUE INDEX IF NOT EXISTS payments_yoco_checkout_id_key
    ON public.payments (yoco_checkout_id);

CREATE UNIQUE INDEX IF NOT EXISTS payments_yoco_payment_id_key
    ON public.payments (yoco_payment_id);

CREATE INDEX IF NOT EXISTS payments_booking_id_idx
    ON public.payments (booking_id);

CREATE INDEX IF NOT EXISTS payments_pending_created_idx
    ON public.payments (created_at)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS payments_paid_at_idx
    ON public.payments (paid_at)
    WHERE status IN ('succeeded', 'refunded');

CREATE INDEX IF NOT EXISTS payments_recorded_by_idx
    ON public.payments (recorded_by);

CREATE TABLE IF NOT EXISTS public.payment_events (
    yoco_event_id text PRIMARY KEY,
    type text NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now(),
    raw jsonb NOT NULL
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_admin_select ON public.payments;
CREATE POLICY payments_admin_select ON public.payments
    FOR SELECT
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()));

DROP POLICY IF EXISTS payments_property_select ON public.payments;
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

-- Recompute booking payment_status and payment_method from payment rows.
-- Runs as the migration owner so the payment-column guard allows the write.
CREATE OR REPLACE FUNCTION private.sync_booking_payment(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_total numeric;
    v_due integer;
    v_paid integer;
    v_prepaid integer;
    v_current_method text;
    v_latest_method text;
    v_next_method text;
    v_status text;
    v_pending boolean;
BEGIN
    SELECT b.total_price, b.prepaid_amount_cents, b.payment_method
    INTO v_total, v_prepaid, v_current_method
    FROM public.bookings AS b
    WHERE b.id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found'
            USING ERRCODE = 'P0002';
    END IF;

    SELECT
        COALESCE(SUM(pay.amount_cents) FILTER (WHERE pay.status = 'succeeded'), 0)
        - COALESCE(SUM(pay.amount_cents) FILTER (WHERE pay.status = 'refunded'), 0)
    INTO v_paid
    FROM public.payments AS pay
    WHERE pay.booking_id = p_booking_id;

    SELECT pay.method
    INTO v_latest_method
    FROM public.payments AS pay
    WHERE pay.booking_id = p_booking_id
      AND pay.status = 'succeeded'
    ORDER BY pay.paid_at DESC NULLS LAST, pay.created_at DESC
    LIMIT 1;

    v_due := CASE
        WHEN v_total IS NULL THEN NULL
        ELSE pg_catalog.round(v_total * 100)::integer
    END;

    SELECT EXISTS (
        SELECT 1
        FROM public.payments AS pay
        WHERE pay.booking_id = p_booking_id
          AND pay.status = 'pending'
    ) INTO v_pending;

    IF v_due IS NOT NULL AND v_paid >= v_due THEN
        v_status := 'paid';
    ELSIF v_prepaid IS NOT NULL AND v_due IS NOT NULL AND v_due > v_paid THEN
        v_status := 'topup_due';
    ELSIF v_pending AND v_paid = 0 THEN
        v_status := 'pending';
    ELSE
        v_status := 'pay_on_delivery';
    END IF;

    v_next_method := CASE v_latest_method
        WHEN 'yoco' THEN 'card'
        WHEN 'card_machine' THEN 'card'
        WHEN 'cash' THEN 'cash'
        WHEN 'eft' THEN 'eft'
        WHEN 'account' THEN 'account'
        ELSE CASE
            WHEN v_current_method = 'account' THEN 'account'
            ELSE NULL
        END
    END;

    UPDATE public.bookings AS b
    SET payment_status = v_status,
        payment_method = v_next_method
    WHERE b.id = p_booking_id;
END;
$$;

COMMENT ON FUNCTION private.sync_booking_payment(uuid) IS
    'Sets booking payment_status and payment_method from succeeded and refunded payments.';

REVOKE ALL ON FUNCTION private.sync_booking_payment(uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.admin_record_payment(
    p_booking_id uuid,
    p_amount_cents integer,
    p_method text,
    p_reference text,
    p_note text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_id uuid;
    v_reference text;
    v_note text;
BEGIN
    IF private.is_dashboard_admin() IS NOT TRUE THEN
        RAISE EXCEPTION 'dashboard admin required'
            USING ERRCODE = '42501';
    END IF;

    IF p_booking_id IS NULL THEN
        RAISE EXCEPTION 'booking_id is required'
            USING ERRCODE = '22023';
    END IF;

    IF p_method IS NULL OR p_method NOT IN ('yoco', 'card_machine', 'cash', 'eft', 'account') THEN
        RAISE EXCEPTION 'method is not valid'
            USING ERRCODE = '22023';
    END IF;

    IF p_amount_cents IS NULL
       OR p_amount_cents > 100000000
       OR (p_method = 'yoco' AND p_amount_cents < 200)
       OR (p_method <> 'yoco' AND p_amount_cents < 1) THEN
        RAISE EXCEPTION 'amount is not valid'
            USING ERRCODE = '22023';
    END IF;

    v_reference := NULLIF(pg_catalog.btrim(COALESCE(p_reference, '')), '');
    v_note := NULLIF(pg_catalog.btrim(COALESCE(p_note, '')), '');

    IF v_reference IS NOT NULL AND pg_catalog.char_length(v_reference) > 120 THEN
        RAISE EXCEPTION 'reference is too long'
            USING ERRCODE = '22023';
    END IF;

    IF v_note IS NOT NULL AND pg_catalog.char_length(v_note) > 500 THEN
        RAISE EXCEPTION 'note is too long'
            USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.bookings AS b WHERE b.id = p_booking_id) THEN
        RAISE EXCEPTION 'Booking not found'
            USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.payments (
        id,
        booking_id,
        kind,
        amount_cents,
        currency,
        status,
        method,
        recorded_by,
        reference,
        note,
        paid_at
    ) VALUES (
        pg_catalog.gen_random_uuid(),
        p_booking_id,
        'manual',
        p_amount_cents,
        'ZAR',
        'succeeded',
        p_method,
        auth.uid(),
        v_reference,
        v_note,
        pg_catalog.now()
    )
    RETURNING id INTO v_id;

    PERFORM private.sync_booking_payment(p_booking_id);
    RETURN v_id;
END;
$$;

COMMENT ON FUNCTION private.admin_record_payment(uuid, integer, text, text, text) IS
    'Dashboard admin only. Inserts a succeeded manual payment and syncs the booking.';

REVOKE ALL ON FUNCTION private.admin_record_payment(uuid, integer, text, text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.admin_record_payment(uuid, integer, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_record_payment(
    booking_id uuid,
    amount_cents integer,
    method text,
    reference text,
    note text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN private.admin_record_payment(
        admin_record_payment.booking_id,
        admin_record_payment.amount_cents,
        admin_record_payment.method,
        admin_record_payment.reference,
        admin_record_payment.note
    );
END;
$$;

COMMENT ON FUNCTION public.admin_record_payment(uuid, integer, text, text, text) IS
    'Dashboard admin only. Inserts a succeeded manual payment and syncs the booking.';

REVOKE ALL ON FUNCTION public.admin_record_payment(uuid, integer, text, text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_record_payment(uuid, integer, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION private.admin_void_payment(p_payment_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_booking_id uuid;
    v_kind text;
    v_status text;
    v_reason text;
BEGIN
    IF private.is_dashboard_admin() IS NOT TRUE THEN
        RAISE EXCEPTION 'dashboard admin required'
            USING ERRCODE = '42501';
    END IF;

    v_reason := NULLIF(pg_catalog.btrim(COALESCE(p_reason, '')), '');
    IF v_reason IS NULL OR pg_catalog.char_length(v_reason) > 500 THEN
        RAISE EXCEPTION 'A void reason is required'
            USING ERRCODE = '22023';
    END IF;

    SELECT pay.booking_id, pay.kind, pay.status
    INTO v_booking_id, v_kind, v_status
    FROM public.payments AS pay
    WHERE pay.id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_kind IS DISTINCT FROM 'manual' THEN
        RAISE EXCEPTION 'Only manual payments can be voided'
            USING ERRCODE = '22023';
    END IF;

    IF v_status = 'cancelled' THEN
        RAISE EXCEPTION 'Payment is already voided'
            USING ERRCODE = '22023';
    END IF;

    IF v_status NOT IN ('succeeded', 'refunded') THEN
        RAISE EXCEPTION 'Payment cannot be voided'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.payments AS pay
    SET status = 'cancelled',
        note = v_reason
    WHERE pay.id = p_payment_id;

    PERFORM private.sync_booking_payment(v_booking_id);
END;
$$;

COMMENT ON FUNCTION private.admin_void_payment(uuid, text) IS
    'Dashboard admin only. Cancels a manual payment and keeps the row for the audit trail.';

REVOKE ALL ON FUNCTION private.admin_void_payment(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.admin_void_payment(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_void_payment(payment_id uuid, reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    PERFORM private.admin_void_payment(admin_void_payment.payment_id, admin_void_payment.reason);
END;
$$;

COMMENT ON FUNCTION public.admin_void_payment(uuid, text) IS
    'Dashboard admin only. Cancels a manual payment and keeps the row for the audit trail.';

REVOKE ALL ON FUNCTION public.admin_void_payment(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_void_payment(uuid, text) TO authenticated;

CREATE OR REPLACE VIEW public.admin_payment_ledger
WITH (security_barrier = true, security_invoker = true) AS
SELECT
    computed.booking_id,
    computed.created_at,
    computed.guest_name,
    computed.room_number,
    computed.property_id,
    computed.property_name,
    computed.property_color,
    computed.service_name,
    computed.weight_kg,
    computed.stage,
    computed.booking_status,
    computed.payment_method,
    computed.payment_status,
    computed.delivered_at,
    computed.ready_at,
    computed.total_due_cents,
    computed.total_paid_cents,
    computed.balance_cents,
    computed.last_payment_at,
    computed.methods,
    computed.reference_text,
    CASE
        WHEN computed.booking_status = 'cancelled' THEN 'cancelled'
        WHEN computed.payment_method = 'account'
             AND (computed.total_due_cents IS NULL OR computed.balance_cents > 0) THEN 'on_account'
        WHEN computed.total_due_cents IS NULL THEN 'not_priced'
        WHEN computed.balance_cents <= 0 THEN 'paid'
        WHEN computed.balance_cents > 0
             AND (
                 computed.stage = 'ready'
                 OR computed.delivered_at IS NOT NULL
                 OR computed.booking_status IN ('delivered', 'completed')
             ) THEN 'outstanding'
        ELSE 'partial'
    END AS payment_state
FROM (
    SELECT
        b.id AS booking_id,
        b.created_at,
        pg_catalog.btrim(b.first_name || ' ' || b.last_name) AS guest_name,
        b.room_number,
        b.property_id,
        p.name AS property_name,
        p.primary_color AS property_color,
        s.name AS service_name,
        b.weight_kg,
        b.stage::text AS stage,
        b.status::text AS booking_status,
        b.payment_method,
        b.payment_status,
        b.delivered_at,
        b.ready_at,
        CASE
            WHEN b.total_price IS NULL THEN NULL
            ELSE pg_catalog.round(b.total_price * 100)::integer
        END AS total_due_cents,
        COALESCE(paid.paid_cents, 0)::integer AS total_paid_cents,
        CASE
            WHEN b.total_price IS NULL THEN NULL
            ELSE pg_catalog.round(b.total_price * 100)::integer - COALESCE(paid.paid_cents, 0)
        END AS balance_cents,
        paid.last_payment_at,
        COALESCE(
            paid.methods,
            CASE b.payment_method
                WHEN 'cash' THEN ARRAY['cash']::text[]
                WHEN 'eft' THEN ARRAY['eft']::text[]
                WHEN 'account' THEN ARRAY['account']::text[]
                WHEN 'card' THEN ARRAY['card']::text[]
                ELSE ARRAY[]::text[]
            END
        ) AS methods,
        paid.reference_text
    FROM public.bookings AS b
    JOIN public.services AS s ON s.id = b.service_id
    JOIN public.properties AS p ON p.id = b.property_id
    LEFT JOIN LATERAL (
        SELECT
            COALESCE(SUM(pay.amount_cents) FILTER (WHERE pay.status = 'succeeded'), 0)
                - COALESCE(SUM(pay.amount_cents) FILTER (WHERE pay.status = 'refunded'), 0) AS paid_cents,
            MAX(pay.paid_at) FILTER (WHERE pay.status IN ('succeeded', 'refunded')) AS last_payment_at,
            array_agg(DISTINCT pay.method ORDER BY pay.method) FILTER (
                WHERE pay.status IN ('succeeded', 'refunded')
            ) AS methods,
            string_agg(pay.reference, ' ' ORDER BY pay.created_at) FILTER (
                WHERE pay.reference IS NOT NULL
                  AND pg_catalog.btrim(pay.reference) <> ''
            ) AS reference_text
        FROM public.payments AS pay
        WHERE pay.booking_id = b.id
    ) AS paid ON true
) AS computed
WHERE (SELECT private.is_dashboard_admin());

COMMENT ON VIEW public.admin_payment_ledger IS
    'Dashboard admin only. One row per booking. Paid cents are succeeded payments minus refunded payments. partial is a priced balance that is not yet ready or delivered. outstanding is ready or delivered with a balance still open.';

REVOKE ALL ON TABLE public.admin_payment_ledger FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.admin_payment_ledger TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_payment_kpis(
    p_start timestamptz,
    p_end timestamptz,
    p_property_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_collected bigint;
    v_outstanding bigint;
    v_topup bigint;
    v_avg numeric;
    v_yoco bigint;
    v_card bigint;
    v_cash bigint;
    v_eft bigint;
    v_account bigint;
BEGIN
    IF private.is_dashboard_admin() IS NOT TRUE THEN
        RAISE EXCEPTION 'dashboard admin required'
            USING ERRCODE = '42501';
    END IF;

    IF p_start IS NULL OR p_end IS NULL OR p_end <= p_start THEN
        RAISE EXCEPTION 'date range is not valid'
            USING ERRCODE = '22023';
    END IF;

    SELECT COALESCE(SUM(
        CASE
            WHEN pay.status = 'succeeded' THEN pay.amount_cents
            WHEN pay.status = 'refunded' THEN -pay.amount_cents
            ELSE 0
        END
    ), 0)
    INTO v_collected
    FROM public.payments AS pay
    JOIN public.bookings AS b ON b.id = pay.booking_id
    WHERE pay.status IN ('succeeded', 'refunded')
      AND pay.method IS DISTINCT FROM 'account'
      AND pay.paid_at >= p_start
      AND pay.paid_at < p_end
      AND (p_property_id IS NULL OR b.property_id = p_property_id);

    SELECT COALESCE(SUM(ledger.balance_cents), 0)
    INTO v_outstanding
    FROM public.admin_payment_ledger AS ledger
    WHERE ledger.payment_state = 'outstanding'
      AND ledger.balance_cents > 0
      AND (p_property_id IS NULL OR ledger.property_id = p_property_id);

    SELECT COALESCE(SUM(ledger.balance_cents), 0)
    INTO v_topup
    FROM public.admin_payment_ledger AS ledger
    WHERE ledger.payment_status = 'topup_due'
      AND ledger.balance_cents > 0
      AND (p_property_id IS NULL OR ledger.property_id = p_property_id);

    SELECT pg_catalog.round(avg(
        EXTRACT(epoch FROM (ledger.last_payment_at - ledger.created_at)) / 86400
    )::numeric, 1)
    INTO v_avg
    FROM public.admin_payment_ledger AS ledger
    WHERE ledger.payment_state = 'paid'
      AND ledger.last_payment_at IS NOT NULL
      AND ledger.last_payment_at >= ledger.created_at
      AND ledger.last_payment_at >= p_start
      AND ledger.last_payment_at < p_end
      AND (p_property_id IS NULL OR ledger.property_id = p_property_id);

    SELECT
        COALESCE(SUM(net) FILTER (WHERE method = 'yoco'), 0),
        COALESCE(SUM(net) FILTER (WHERE method = 'card_machine'), 0),
        COALESCE(SUM(net) FILTER (WHERE method = 'cash'), 0),
        COALESCE(SUM(net) FILTER (WHERE method = 'eft'), 0)
    INTO v_yoco, v_card, v_cash, v_eft
    FROM (
        SELECT
            pay.method,
            CASE
                WHEN pay.status = 'succeeded' THEN pay.amount_cents
                WHEN pay.status = 'refunded' THEN -pay.amount_cents
                ELSE 0
            END AS net
        FROM public.payments AS pay
        JOIN public.bookings AS b ON b.id = pay.booking_id
        WHERE pay.status IN ('succeeded', 'refunded')
          AND pay.paid_at >= p_start
          AND pay.paid_at < p_end
          AND pay.method IS DISTINCT FROM 'account'
          AND (p_property_id IS NULL OR b.property_id = p_property_id)
    ) AS lines;

    SELECT COALESCE(SUM(ledger.total_due_cents), 0)
    INTO v_account
    FROM public.admin_payment_ledger AS ledger
    WHERE ledger.payment_method = 'account'
      AND ledger.booking_status IS DISTINCT FROM 'cancelled'
      AND ledger.created_at >= p_start
      AND ledger.created_at < p_end
      AND (p_property_id IS NULL OR ledger.property_id = p_property_id);

    RETURN pg_catalog.jsonb_build_object(
        'collected_cents', v_collected,
        'outstanding_cents', v_outstanding,
        'topup_due_cents', v_topup,
        'avg_days_to_pay', v_avg,
        'methods', pg_catalog.jsonb_build_object(
            'yoco', v_yoco,
            'card_machine', v_card,
            'cash', v_cash,
            'eft', v_eft,
            'account', v_account
        )
    );
END;
$$;

COMMENT ON FUNCTION public.admin_payment_kpis(timestamptz, timestamptz, uuid) IS
    'Dashboard admin only. Collected money in the range, all-time outstanding, top-ups due, average days to pay, and a method breakdown. On account is billed total, not cash collected.';

REVOKE ALL ON FUNCTION public.admin_payment_kpis(timestamptz, timestamptz, uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_payment_kpis(timestamptz, timestamptz, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_payment_property_totals(
    p_start timestamptz,
    p_end timestamptz
)
RETURNS TABLE (
    property_id uuid,
    property_name text,
    property_color text,
    bookings integer,
    weight_kg numeric,
    billed_cents bigint,
    collected_cents bigint,
    outstanding_cents bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF private.is_dashboard_admin() IS NOT TRUE THEN
        RAISE EXCEPTION 'dashboard admin required'
            USING ERRCODE = '42501';
    END IF;

    IF p_start IS NULL OR p_end IS NULL OR p_end <= p_start THEN
        RAISE EXCEPTION 'date range is not valid'
            USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    WITH ledger AS (
        SELECT *
        FROM public.admin_payment_ledger AS row
        WHERE row.created_at >= p_start
          AND row.created_at < p_end
    ),
    collected AS (
        SELECT
            b.property_id AS collected_property_id,
            COALESCE(SUM(
                CASE
                    WHEN pay.status = 'succeeded' THEN pay.amount_cents
                    WHEN pay.status = 'refunded' THEN -pay.amount_cents
                    ELSE 0
                END
            ), 0)::bigint AS collected_cents
        FROM public.payments AS pay
        JOIN public.bookings AS b ON b.id = pay.booking_id
        WHERE pay.status IN ('succeeded', 'refunded')
          AND pay.method IS DISTINCT FROM 'account'
          AND pay.paid_at >= p_start
          AND pay.paid_at < p_end
        GROUP BY b.property_id
    )
    SELECT
        p.id,
        p.name,
        p.primary_color,
        COALESCE(COUNT(ledger.booking_id), 0)::integer,
        COALESCE(SUM(ledger.weight_kg), 0),
        COALESCE(SUM(ledger.total_due_cents), 0)::bigint,
        COALESCE(collected.collected_cents, 0),
        COALESCE(SUM(ledger.balance_cents) FILTER (WHERE ledger.payment_state = 'outstanding'), 0)::bigint
    FROM public.properties AS p
    LEFT JOIN ledger ON ledger.property_id = p.id
    LEFT JOIN collected ON collected.collected_property_id = p.id
    GROUP BY p.id, p.name, p.primary_color, collected.collected_cents
    HAVING COUNT(ledger.booking_id) > 0 OR COALESCE(collected.collected_cents, 0) <> 0
    ORDER BY p.name;
END;
$$;

COMMENT ON FUNCTION public.admin_payment_property_totals(timestamptz, timestamptz) IS
    'Dashboard admin only. Per-property bookings, weight, billed, collected, and outstanding totals for a date range.';

REVOKE ALL ON FUNCTION public.admin_payment_property_totals(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_payment_property_totals(timestamptz, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION private.admin_staff_labels(p_ids uuid[])
RETURNS TABLE (
    user_id uuid,
    email text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF private.is_dashboard_admin() IS NOT TRUE THEN
        RAISE EXCEPTION 'dashboard admin required'
            USING ERRCODE = '42501';
    END IF;

    IF p_ids IS NULL OR cardinality(p_ids) > 200 THEN
        RAISE EXCEPTION 'too many ids'
            USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    SELECT u.id, u.email::text
    FROM auth.users AS u
    WHERE u.id = ANY (p_ids);
END;
$$;

COMMENT ON FUNCTION private.admin_staff_labels(uuid[]) IS
    'Dashboard admin only. Auth emails for payment recorders.';

REVOKE ALL ON FUNCTION private.admin_staff_labels(uuid[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.admin_staff_labels(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_staff_labels(p_ids uuid[])
RETURNS TABLE (
    user_id uuid,
    email text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT result.user_id, result.email
    FROM private.admin_staff_labels(p_ids) AS result;
$$;

COMMENT ON FUNCTION public.admin_staff_labels(uuid[]) IS
    'Dashboard admin only. Auth emails for payment recorders.';

REVOKE ALL ON FUNCTION public.admin_staff_labels(uuid[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_staff_labels(uuid[]) TO authenticated;

CREATE TABLE IF NOT EXISTS public.cash_ups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date date NOT NULL,
    recorded_by uuid,
    cash_cents integer NOT NULL,
    card_cents integer NOT NULL,
    note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT cash_ups_date_key UNIQUE (date),
    CONSTRAINT cash_ups_cash_cents_check CHECK (cash_cents >= 0),
    CONSTRAINT cash_ups_card_cents_check CHECK (card_cents >= 0)
);

DO $cash_fk$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'cash_ups_recorded_by_fkey'
    ) THEN
        ALTER TABLE public.cash_ups
            ADD CONSTRAINT cash_ups_recorded_by_fkey
            FOREIGN KEY (recorded_by) REFERENCES auth.users (id) ON DELETE SET NULL;
    END IF;
END
$cash_fk$;

COMMENT ON TABLE public.cash_ups IS
    'One cash-up per day. recorded_by and created_at are who confirmed it and when.';

CREATE INDEX IF NOT EXISTS cash_ups_recorded_by_idx
    ON public.cash_ups (recorded_by);

ALTER TABLE public.cash_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cash_ups_admin_select ON public.cash_ups;
CREATE POLICY cash_ups_admin_select ON public.cash_ups
    FOR SELECT
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()));

DROP POLICY IF EXISTS cash_ups_admin_insert ON public.cash_ups;
CREATE POLICY cash_ups_admin_insert ON public.cash_ups
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (SELECT private.is_dashboard_admin())
        AND recorded_by = (SELECT auth.uid())
    );

DROP POLICY IF EXISTS cash_ups_admin_update ON public.cash_ups;
CREATE POLICY cash_ups_admin_update ON public.cash_ups
    FOR UPDATE
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()))
    WITH CHECK (
        (SELECT private.is_dashboard_admin())
        AND recorded_by = (SELECT auth.uid())
    );

REVOKE ALL ON TABLE public.cash_ups FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.cash_ups TO authenticated;

ALTER TABLE public.payments REPLICA IDENTITY FULL;

DO $publication$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = 'payments'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = 'cash_ups'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_ups;
        END IF;
    END IF;
END
$publication$;
