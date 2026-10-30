-- Staff kiosk: processing stages, machines, PIN-backed staff, and a narrow API
-- for the tablet user (app_metadata.role = 'kiosk').
--
-- Create that Auth user in the dashboard and set raw_app_meta_data to
-- {"role":"kiosk"}. Use app_metadata, which the user cannot edit.
-- Dashboard users with no role claim keep full access.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

-- True for every signed-in user except the kiosk tablet.
-- NULL app_metadata.role stays allowed, so existing dashboard users still pass.
CREATE OR REPLACE FUNCTION private.is_dashboard_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT (SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'kiosk';
$$;

REVOKE ALL ON FUNCTION private.is_dashboard_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_dashboard_admin() TO authenticated;

CREATE OR REPLACE FUNCTION private.assert_kiosk()
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'kiosk' THEN
    RAISE EXCEPTION 'kiosk role required'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.assert_kiosk() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.assert_kiosk() TO CURRENT_USER;

-- Hash a plaintext PIN on insert/update. A value that already looks like a
-- bcrypt hash is stored as-is. Insert staff with the PIN in pin_hash.
CREATE OR REPLACE FUNCTION private.hash_staff_pin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.pin_hash IS NULL OR pg_catalog.btrim(NEW.pin_hash) = '' THEN
    RAISE EXCEPTION 'staff pin is required'
      USING ERRCODE = '22023';
  END IF;

  IF pg_catalog.left(NEW.pin_hash, 4) NOT IN ('$2a$', '$2b$', '$2y$') THEN
    NEW.pin_hash := extensions.crypt(NEW.pin_hash, extensions.gen_salt('bf'));
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.hash_staff_pin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.hash_staff_pin() TO authenticated;

-- ---------------------------------------------------------------------------
-- staff
-- ---------------------------------------------------------------------------

CREATE TABLE public.staff (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    pin_hash text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.staff IS 'Kiosk operators. pin_hash is a pgcrypto bcrypt hash; the tablet never reads this table.';
COMMENT ON COLUMN public.staff.pin_hash IS 'bcrypt hash from pgcrypto crypt(). Insert a plaintext PIN; the hash trigger stores the hash.';

CREATE TRIGGER staff_hash_pin
    BEFORE INSERT OR UPDATE OF pin_hash ON public.staff
    FOR EACH ROW
    EXECUTE FUNCTION private.hash_staff_pin();

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_admin_select" ON public.staff
    FOR SELECT
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()));

CREATE POLICY "staff_admin_insert" ON public.staff
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT private.is_dashboard_admin()));

CREATE POLICY "staff_admin_update" ON public.staff
    FOR UPDATE
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()))
    WITH CHECK ((SELECT private.is_dashboard_admin()));

CREATE POLICY "staff_admin_delete" ON public.staff
    FOR DELETE
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()));

REVOKE ALL ON TABLE public.staff FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.staff TO authenticated;

-- ---------------------------------------------------------------------------
-- machines
-- number is unique per type so washer 1 and dryer 1 are different machines.
-- ---------------------------------------------------------------------------

CREATE TABLE public.machines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    number integer NOT NULL,
    name text,
    type text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT machines_type_check CHECK (type IN ('washer', 'dryer')),
    CONSTRAINT machines_type_number_key UNIQUE (type, number)
);

COMMENT ON TABLE public.machines IS 'Washers and dryers shown on the kiosk. number is unique within type.';

INSERT INTO public.machines (number, name, type)
SELECT n, 'Washer ' || n, 'washer'
FROM generate_series(1, 6) AS n
UNION ALL
SELECT n, 'Dryer ' || n, 'dryer'
FROM generate_series(1, 4) AS n;

ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

-- The tablet needs the machine list. Numbers and types are not secret.
CREATE POLICY "machines_select_authenticated" ON public.machines
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "machines_admin_insert" ON public.machines
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT private.is_dashboard_admin()));

CREATE POLICY "machines_admin_update" ON public.machines
    FOR UPDATE
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()))
    WITH CHECK ((SELECT private.is_dashboard_admin()));

CREATE POLICY "machines_admin_delete" ON public.machines
    FOR DELETE
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()));

REVOKE ALL ON TABLE public.machines FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.machines TO authenticated;

-- ---------------------------------------------------------------------------
-- bookings columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.bookings
    ADD COLUMN machine_number integer,
    ADD COLUMN stage text NOT NULL DEFAULT 'to_weigh',
    ADD COLUMN weighed_by uuid REFERENCES public.staff (id) ON DELETE SET NULL,
    ADD COLUMN weighed_at timestamptz,
    ADD COLUMN washing_at timestamptz,
    ADD COLUMN drying_at timestamptz,
    ADD COLUMN finishing_at timestamptz,
    ADD COLUMN ready_at timestamptz;

ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_stage_check
    CHECK (stage IN ('to_weigh', 'washing', 'drying', 'finishing', 'ready'));

COMMENT ON COLUMN public.bookings.stage IS 'Kiosk processing stage: to_weigh, washing, drying, finishing, ready.';
COMMENT ON COLUMN public.bookings.machine_number IS 'Washer number chosen at weigh-in. Cleared when the bag is ready.';
COMMENT ON COLUMN public.bookings.weighed_by IS 'Staff member who weighed the bag and started the wash.';

CREATE INDEX idx_bookings_stage ON public.bookings (stage);
CREATE INDEX idx_bookings_weighed_by ON public.bookings (weighed_by);

-- Existing rows pick up the column default. Align stage with the status the
-- dashboard already recorded.
UPDATE public.bookings
SET stage = 'washing'
WHERE status = 'processing';

UPDATE public.bookings
SET stage = 'ready',
    ready_at = completed_at
WHERE status = 'completed';

-- ---------------------------------------------------------------------------
-- RLS: full bookings/services access is dashboard-only.
-- The kiosk reads kiosk_bookings and writes through the functions below.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "bookings_allow_all_for_authenticated" ON public.bookings;
DROP POLICY IF EXISTS "bookings_authenticated_all_operations" ON public.bookings;
DROP POLICY IF EXISTS "bookings_authenticated_select" ON public.bookings;
DROP POLICY IF EXISTS "bookings_authenticated_insert" ON public.bookings;
DROP POLICY IF EXISTS "bookings_authenticated_update" ON public.bookings;
DROP POLICY IF EXISTS "bookings_authenticated_delete" ON public.bookings;
DROP POLICY IF EXISTS "bookings_allow_read_for_anonymous" ON public.bookings;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.bookings;
DROP POLICY IF EXISTS "Allow read access for anonymous users" ON public.bookings;
DROP POLICY IF EXISTS "bookings_allow_insert_for_anonymous" ON public.bookings;
DROP POLICY IF EXISTS "Allow insert for anonymous users" ON public.bookings;

CREATE POLICY "bookings_authenticated_select" ON public.bookings
    FOR SELECT
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()));

CREATE POLICY "bookings_authenticated_insert" ON public.bookings
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT private.is_dashboard_admin()));

CREATE POLICY "bookings_authenticated_update" ON public.bookings
    FOR UPDATE
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()))
    WITH CHECK ((SELECT private.is_dashboard_admin()));

CREATE POLICY "bookings_authenticated_delete" ON public.bookings
    FOR DELETE
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()));

-- Public booking form. Defaults already set stage to to_weigh; reject an
-- anon payload that tries to skip ahead or stamp the kiosk columns.
CREATE POLICY "bookings_allow_insert_for_anonymous" ON public.bookings
    FOR INSERT
    TO anon
    WITH CHECK (
        stage = 'to_weigh'
        AND status = 'pending'
        AND machine_number IS NULL
        AND weighed_by IS NULL
        AND weighed_at IS NULL
        AND washing_at IS NULL
        AND drying_at IS NULL
        AND finishing_at IS NULL
        AND ready_at IS NULL
    );

REVOKE SELECT ON TABLE public.bookings FROM anon;
GRANT INSERT ON TABLE public.bookings TO anon;

DROP POLICY IF EXISTS "services_allow_all_for_authenticated" ON public.services;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.services;

CREATE POLICY "services_allow_all_for_authenticated" ON public.services
    FOR ALL
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()))
    WITH CHECK ((SELECT private.is_dashboard_admin()));

-- The kiosk session is authenticated. Without this, that login could rewrite
-- the tiers kiosk_weigh_and_start trusts. Public reads stay open.
DROP POLICY IF EXISTS "service_pricing_tiers_insert" ON public.service_pricing_tiers;
DROP POLICY IF EXISTS "service_pricing_tiers_update" ON public.service_pricing_tiers;
DROP POLICY IF EXISTS "service_pricing_tiers_delete" ON public.service_pricing_tiers;

CREATE POLICY "service_pricing_tiers_insert" ON public.service_pricing_tiers
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT private.is_dashboard_admin()));

CREATE POLICY "service_pricing_tiers_update" ON public.service_pricing_tiers
    FOR UPDATE
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()))
    WITH CHECK ((SELECT private.is_dashboard_admin()));

CREATE POLICY "service_pricing_tiers_delete" ON public.service_pricing_tiers
    FOR DELETE
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()));

-- ---------------------------------------------------------------------------
-- Narrow read model for the tablet. No phone and no prices.
-- security_invoker is off so the view can read bookings without giving the
-- kiosk role SELECT on the table (that grant would expose phone and prices
-- through the Data API). The predicate limits rows to a kiosk JWT.
-- ---------------------------------------------------------------------------

CREATE VIEW public.kiosk_bookings
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
    b.additional_details
FROM public.bookings AS b
JOIN public.services AS s ON s.id = b.service_id
WHERE (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'kiosk';

COMMENT ON VIEW public.kiosk_bookings IS 'Kiosk projection of bookings. Rows are returned only when app_metadata.role is kiosk. Omits phone and prices.';

REVOKE ALL ON TABLE public.kiosk_bookings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.kiosk_bookings TO authenticated;

-- ---------------------------------------------------------------------------
-- Kiosk writes. SECURITY DEFINER so the tablet can update bookings without a
-- table grant. EXECUTE is granted to authenticated, and every function
-- rejects callers whose app_metadata.role is not kiosk. anon has no EXECUTE.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.verify_staff_pin(pin text)
RETURNS TABLE (id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    match_count integer;
BEGIN
    PERFORM private.assert_kiosk();

    IF pin IS NULL OR pg_catalog.length(pin) = 0 OR pg_catalog.length(pin) > 72 THEN
        RETURN;
    END IF;

    SELECT count(*)
    INTO match_count
    FROM public.staff AS s
    WHERE s.active
      AND s.pin_hash = extensions.crypt(pin, s.pin_hash);

    IF match_count > 1 THEN
        RAISE EXCEPTION 'More than one staff member matches this PIN'
            USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    SELECT s.id, s.name
    FROM public.staff AS s
    WHERE s.active
      AND s.pin_hash = extensions.crypt(pin, s.pin_hash);
END;
$$;

COMMENT ON FUNCTION public.verify_staff_pin(text) IS 'Kiosk only. Returns the active staff id and name for a PIN, or no row when the PIN does not match.';

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

    SELECT b.status, b.service_id
    INTO v_status, v_service_id
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

    UPDATE public.bookings AS b
    SET weight_kg = kiosk_weigh_and_start.weight_kg,
        machine_number = kiosk_weigh_and_start.machine_number,
        weighed_by = kiosk_weigh_and_start.staff_id,
        stage = 'washing',
        status = 'processing',
        weighed_at = pg_catalog.now(),
        washing_at = pg_catalog.now(),
        total_price = v_price
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

COMMENT ON FUNCTION public.kiosk_weigh_and_start(uuid, numeric, integer, uuid) IS 'Kiosk only. Records weight, washer, staff, price, and moves the booking to washing/processing.';

CREATE OR REPLACE FUNCTION public.kiosk_set_stage(booking_id uuid, stage text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_status text;
    v_id uuid;
    v_stage text;
    v_new_status text;
    v_machine integer;
BEGIN
    PERFORM private.assert_kiosk();

    IF booking_id IS NULL THEN
        RAISE EXCEPTION 'booking_id is required'
            USING ERRCODE = '22023';
    END IF;

    IF stage IS NULL OR stage NOT IN ('to_weigh', 'washing', 'drying', 'finishing', 'ready') THEN
        RAISE EXCEPTION 'Invalid stage %', stage
            USING ERRCODE = '22023';
    END IF;

    SELECT b.status
    INTO v_status
    FROM public.bookings AS b
    WHERE b.id = kiosk_set_stage.booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_status = 'cancelled' THEN
        RAISE EXCEPTION 'Booking cannot change stage while cancelled'
            USING ERRCODE = '22023';
    END IF;

    -- to_weigh has no timestamp column. weighed_at is set by kiosk_weigh_and_start.
    UPDATE public.bookings AS b
    SET stage = kiosk_set_stage.stage,
        washing_at = CASE
            WHEN kiosk_set_stage.stage = 'washing' THEN pg_catalog.now()
            ELSE b.washing_at
        END,
        drying_at = CASE
            WHEN kiosk_set_stage.stage = 'drying' THEN pg_catalog.now()
            ELSE b.drying_at
        END,
        finishing_at = CASE
            WHEN kiosk_set_stage.stage = 'finishing' THEN pg_catalog.now()
            ELSE b.finishing_at
        END,
        ready_at = CASE
            WHEN kiosk_set_stage.stage = 'ready' THEN pg_catalog.now()
            ELSE b.ready_at
        END,
        status = CASE
            WHEN kiosk_set_stage.stage = 'ready' THEN 'completed'
            ELSE b.status
        END,
        completed_at = CASE
            WHEN kiosk_set_stage.stage = 'ready' THEN pg_catalog.now()
            ELSE b.completed_at
        END,
        machine_number = CASE
            WHEN kiosk_set_stage.stage = 'ready' THEN NULL
            ELSE b.machine_number
        END
    WHERE b.id = kiosk_set_stage.booking_id
    RETURNING b.id, b.stage, b.status::text, b.machine_number
    INTO v_id, v_stage, v_new_status, v_machine;

    RETURN pg_catalog.jsonb_build_object(
        'id', v_id,
        'stage', v_stage,
        'status', v_new_status,
        'machine_number', v_machine
    );
END;
$$;

COMMENT ON FUNCTION public.kiosk_set_stage(uuid, text) IS 'Kiosk only. Sets the processing stage and that stage''s timestamp. ready also completes the booking and clears the machine.';

CREATE OR REPLACE FUNCTION public.kiosk_undo_stage(booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_stage text;
    v_status text;
    v_previous_stage text;
    v_id uuid;
    v_new_stage text;
    v_new_status text;
    v_machine integer;
BEGIN
    PERFORM private.assert_kiosk();

    IF booking_id IS NULL THEN
        RAISE EXCEPTION 'booking_id is required'
            USING ERRCODE = '22023';
    END IF;

    SELECT b.stage, b.status
    INTO v_stage, v_status
    FROM public.bookings AS b
    WHERE b.id = kiosk_undo_stage.booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_status = 'cancelled' THEN
        RAISE EXCEPTION 'Booking cannot change stage while cancelled'
            USING ERRCODE = '22023';
    END IF;

    v_previous_stage := CASE v_stage
        WHEN 'washing' THEN 'to_weigh'
        WHEN 'drying' THEN 'washing'
        WHEN 'finishing' THEN 'drying'
        WHEN 'ready' THEN 'finishing'
        ELSE NULL
    END;

    IF v_previous_stage IS NULL THEN
        RAISE EXCEPTION 'Booking is already at to_weigh'
            USING ERRCODE = '22023';
    END IF;

    -- Leaving ready reopens the booking. The washer number was cleared when
    -- it became ready and is not restored.
    UPDATE public.bookings AS b
    SET stage = v_previous_stage,
        washing_at = CASE WHEN v_stage = 'washing' THEN NULL ELSE b.washing_at END,
        drying_at = CASE WHEN v_stage = 'drying' THEN NULL ELSE b.drying_at END,
        finishing_at = CASE WHEN v_stage = 'finishing' THEN NULL ELSE b.finishing_at END,
        ready_at = CASE WHEN v_stage = 'ready' THEN NULL ELSE b.ready_at END,
        status = CASE WHEN v_stage = 'ready' THEN 'processing' ELSE b.status END,
        completed_at = CASE WHEN v_stage = 'ready' THEN NULL ELSE b.completed_at END
    WHERE b.id = kiosk_undo_stage.booking_id
    RETURNING b.id, b.stage, b.status::text, b.machine_number
    INTO v_id, v_new_stage, v_new_status, v_machine;

    RETURN pg_catalog.jsonb_build_object(
        'id', v_id,
        'stage', v_new_stage,
        'status', v_new_status,
        'machine_number', v_machine
    );
END;
$$;

COMMENT ON FUNCTION public.kiosk_undo_stage(uuid) IS 'Kiosk only. Moves a booking back one stage and clears the timestamp of the stage being left.';

REVOKE ALL ON FUNCTION public.verify_staff_pin(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_staff_pin(text) TO authenticated;

REVOKE ALL ON FUNCTION public.kiosk_weigh_and_start(uuid, numeric, integer, uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.kiosk_weigh_and_start(uuid, numeric, integer, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.kiosk_set_stage(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.kiosk_set_stage(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.kiosk_undo_stage(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.kiosk_undo_stage(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'machines'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.machines;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'staff'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.staff;
    END IF;
END $$;
