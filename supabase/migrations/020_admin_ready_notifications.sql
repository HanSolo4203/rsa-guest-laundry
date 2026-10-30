-- Dashboard alerts when the kiosk marks a bag ready, plus admin RPCs that
-- hash staff PINs before they are stored.

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS ready_acknowledged_at timestamptz;

COMMENT ON COLUMN public.bookings.ready_acknowledged_at IS
    'When a dashboard admin acknowledged a ready-for-delivery alert. Null while stage is ready and the alert is still unseen.';

-- Bags already ready before this column existed are treated as seen, so the
-- nav badge only counts deliveries marked ready from here on.
UPDATE public.bookings
SET ready_acknowledged_at = COALESCE(ready_at, pg_catalog.now())
WHERE stage = 'ready'
  AND ready_acknowledged_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_unacknowledged_ready
    ON public.bookings (id)
    WHERE stage = 'ready' AND ready_acknowledged_at IS NULL;

-- Old row images are required so the dashboard can tell "stage became ready"
-- from a later update of a row that is already ready (acknowledgement).
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

-- Anonymous booking inserts must not stamp the acknowledgement column.
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
    );

-- Entering ready clears acknowledgement so a bag marked ready again alerts
-- the dashboard. Leaving ready through undo clears it as well.
CREATE OR REPLACE FUNCTION public.kiosk_set_stage(
    booking_id uuid,
    stage text,
    machine_number integer DEFAULT NULL
)
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
    v_dryer integer;
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

    IF kiosk_set_stage.stage = 'drying' AND kiosk_set_stage.machine_number IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.machines AS m
            WHERE m.number = kiosk_set_stage.machine_number
              AND m.type = 'dryer'
              AND m.active
        ) THEN
            RAISE EXCEPTION 'Active dryer % not found', kiosk_set_stage.machine_number
                USING ERRCODE = '22023';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM public.bookings AS other
            WHERE other.id <> kiosk_set_stage.booking_id
              AND other.status <> 'cancelled'
              AND other.stage = 'drying'
              AND other.dryer_number = kiosk_set_stage.machine_number
        ) THEN
            RAISE EXCEPTION 'Dryer % is already in use', kiosk_set_stage.machine_number
                USING ERRCODE = '22023';
        END IF;
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
        ready_acknowledged_at = CASE
            WHEN kiosk_set_stage.stage = 'ready' THEN NULL
            ELSE b.ready_acknowledged_at
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
        END,
        dryer_number = CASE
            WHEN kiosk_set_stage.stage = 'drying' THEN kiosk_set_stage.machine_number
            WHEN kiosk_set_stage.stage IN ('to_weigh', 'washing', 'ready') THEN NULL
            ELSE b.dryer_number
        END
    WHERE b.id = kiosk_set_stage.booking_id
    RETURNING b.id, b.stage, b.status::text, b.machine_number, b.dryer_number
    INTO v_id, v_stage, v_new_status, v_machine, v_dryer;

    RETURN pg_catalog.jsonb_build_object(
        'id', v_id,
        'stage', v_stage,
        'status', v_new_status,
        'machine_number', v_machine,
        'dryer_number', v_dryer
    );
END;
$$;

COMMENT ON FUNCTION public.kiosk_set_stage(uuid, text, integer) IS
    'Kiosk only. Sets the processing stage and that stage''s timestamp. machine_number is an optional dryer, used only when stage is drying. ready also completes the booking, clears both machines, and clears ready acknowledgement so the dashboard alerts again.';

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
    v_dryer integer;
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

    UPDATE public.bookings AS b
    SET stage = v_previous_stage,
        washing_at = CASE WHEN v_stage = 'washing' THEN NULL ELSE b.washing_at END,
        drying_at = CASE WHEN v_stage = 'drying' THEN NULL ELSE b.drying_at END,
        finishing_at = CASE WHEN v_stage = 'finishing' THEN NULL ELSE b.finishing_at END,
        ready_at = CASE WHEN v_stage = 'ready' THEN NULL ELSE b.ready_at END,
        ready_acknowledged_at = CASE WHEN v_stage = 'ready' THEN NULL ELSE b.ready_acknowledged_at END,
        status = CASE WHEN v_stage = 'ready' THEN 'processing' ELSE b.status END,
        completed_at = CASE WHEN v_stage = 'ready' THEN NULL ELSE b.completed_at END,
        dryer_number = CASE WHEN v_stage = 'drying' THEN NULL ELSE b.dryer_number END
    WHERE b.id = kiosk_undo_stage.booking_id
    RETURNING b.id, b.stage, b.status::text, b.machine_number, b.dryer_number
    INTO v_id, v_new_stage, v_new_status, v_machine, v_dryer;

    RETURN pg_catalog.jsonb_build_object(
        'id', v_id,
        'stage', v_new_stage,
        'status', v_new_status,
        'machine_number', v_machine,
        'dryer_number', v_dryer
    );
END;
$$;

COMMENT ON FUNCTION public.kiosk_undo_stage(uuid) IS
    'Kiosk only. Moves a booking back one stage and clears the timestamp of the stage being left. Undoing drying also clears the dryer. Undoing ready clears acknowledgement.';

-- ---------------------------------------------------------------------------
-- Staff PIN RPCs. The plaintext PIN exists only as a function argument.
-- The row stores extensions.crypt() output. The existing hash trigger keeps
-- a direct write from being stored as plaintext as well.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.assert_dashboard_admin()
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL
       OR (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'kiosk' THEN
        RAISE EXCEPTION 'dashboard admin required'
            USING ERRCODE = '42501';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.assert_dashboard_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.assert_dashboard_admin() TO CURRENT_USER;

CREATE OR REPLACE FUNCTION public.admin_create_staff(staff_name text, pin text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_id uuid;
    v_name text;
BEGIN
    PERFORM private.assert_dashboard_admin();

    v_name := pg_catalog.btrim(staff_name);
    IF v_name IS NULL OR v_name = '' OR pg_catalog.length(v_name) > 80 THEN
        RAISE EXCEPTION 'staff name is required'
            USING ERRCODE = '22023';
    END IF;

    IF pin IS NULL OR pin !~ '^[0-9]{4}$' THEN
        RAISE EXCEPTION 'PIN must be 4 digits'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.staff (name, pin_hash)
    VALUES (v_name, extensions.crypt(pin, extensions.gen_salt('bf')))
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.admin_create_staff(text, text) IS
    'Dashboard admin only. Creates an active staff member. The PIN is hashed with pgcrypto before insert and is never stored in plain text.';

CREATE OR REPLACE FUNCTION public.admin_set_staff_pin(staff_id uuid, pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM private.assert_dashboard_admin();

    IF staff_id IS NULL THEN
        RAISE EXCEPTION 'staff_id is required'
            USING ERRCODE = '22023';
    END IF;

    IF pin IS NULL OR pin !~ '^[0-9]{4}$' THEN
        RAISE EXCEPTION 'PIN must be 4 digits'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.staff AS s
    SET pin_hash = extensions.crypt(pin, extensions.gen_salt('bf'))
    WHERE s.id = admin_set_staff_pin.staff_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Staff member not found'
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;

COMMENT ON FUNCTION public.admin_set_staff_pin(uuid, text) IS
    'Dashboard admin only. Replaces a staff PIN with a pgcrypto bcrypt hash. The plaintext PIN is not stored.';

COMMENT ON COLUMN public.staff.pin_hash IS
    'bcrypt hash from pgcrypto. Dashboard writes go through admin_create_staff and admin_set_staff_pin, which hash the PIN before it is stored.';

REVOKE ALL ON FUNCTION public.admin_create_staff(text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_staff(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_staff_pin(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_staff_pin(uuid, text) TO authenticated;
