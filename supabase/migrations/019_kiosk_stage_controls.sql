-- Dryer assignment for the kiosk stage controls.
--
-- machine_number stays the washer chosen at weigh-in. dryer_number is set
-- only when staff optionally pick a dryer while moving a bag to drying.
-- Washer 1 and dryer 1 are different machines, so one column cannot hold both.
-- The dryer is cleared when the bag is marked ready, and when an undo leaves
-- drying. Finishing keeps dryer_number so an undo back to drying still knows
-- which dryer it was on. The machines grid treats a dryer as busy only while
-- the booking stage is drying.

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS dryer_number integer;

COMMENT ON COLUMN public.bookings.dryer_number IS
    'Dryer number chosen when moving to drying. Null when no dryer was picked. Cleared when the bag is ready or when drying is undone.';

-- dryer_number is appended. CREATE OR REPLACE VIEW cannot insert a column
-- ahead of weight_kg; Postgres treats that as a rename.
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
    b.dryer_number
FROM public.bookings AS b
JOIN public.services AS s ON s.id = b.service_id
WHERE (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'kiosk';

COMMENT ON VIEW public.kiosk_bookings IS 'Kiosk projection of bookings. Rows are returned only when app_metadata.role is kiosk. Omits phone and prices.';

GRANT SELECT ON TABLE public.kiosk_bookings TO authenticated;

-- Anonymous inserts must not stamp a dryer. Omitting the column is NULL.
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
    );

-- Replace the two-argument function. Keeping both overloads makes PostgREST
-- refuse the call.
DROP FUNCTION IF EXISTS public.kiosk_set_stage(uuid, text);
DROP FUNCTION IF EXISTS public.kiosk_set_stage(uuid, text, integer);

CREATE FUNCTION public.kiosk_set_stage(
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

    -- machine_number stays the washer. dryer_number is the optional dryer.
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
    'Kiosk only. Sets the processing stage and that stage''s timestamp. machine_number is an optional dryer, used only when stage is drying. ready also completes the booking and clears both machines.';

REVOKE ALL ON FUNCTION public.kiosk_set_stage(uuid, text, integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.kiosk_set_stage(uuid, text, integer) TO authenticated;

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

    -- Leaving ready reopens the booking. The washer number was cleared when
    -- it became ready and is not restored. Leaving drying clears the dryer.
    UPDATE public.bookings AS b
    SET stage = v_previous_stage,
        washing_at = CASE WHEN v_stage = 'washing' THEN NULL ELSE b.washing_at END,
        drying_at = CASE WHEN v_stage = 'drying' THEN NULL ELSE b.drying_at END,
        finishing_at = CASE WHEN v_stage = 'finishing' THEN NULL ELSE b.finishing_at END,
        ready_at = CASE WHEN v_stage = 'ready' THEN NULL ELSE b.ready_at END,
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
    'Kiosk only. Moves a booking back one stage and clears the timestamp of the stage being left. Undoing drying also clears the dryer.';
