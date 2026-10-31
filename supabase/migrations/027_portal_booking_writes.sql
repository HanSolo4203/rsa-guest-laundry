-- Front desk can create and cancel laundry bookings from the property portal.
--
-- Property users still have no INSERT or UPDATE on bookings. The checks and the
-- writes live in private (security definer). The public names are invoker
-- wrappers so PostgREST can call them without a security definer in the
-- exposed schema. Guest form inserts stay on the anon policy, which forces
-- source = 'guest' and created_by IS NULL.

ALTER TABLE public.bookings
    ALTER COLUMN phone DROP NOT NULL;

COMMENT ON COLUMN public.bookings.phone IS
    'Guest phone. Null when the front desk books without one.';

ALTER TABLE public.bookings
    ADD COLUMN source text NOT NULL DEFAULT 'guest',
    ADD COLUMN created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.bookings
    DROP CONSTRAINT IF EXISTS bookings_source_check;

ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_source_check
    CHECK (source IN ('guest', 'portal', 'admin'));

COMMENT ON COLUMN public.bookings.source IS
    'Who created the booking: guest form, property portal, or an admin.';
COMMENT ON COLUMN public.bookings.created_by IS
    'Auth user who created a portal or admin booking. Null for guest form inserts.';

-- The portal form lists this property's services. Writes still go through the RPC.
CREATE POLICY "property_services_member_select" ON public.property_services
    FOR SELECT
    TO authenticated
    USING (
        (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'property'
        AND property_id IN (SELECT private.my_property_ids())
    );

-- ---------------------------------------------------------------------------
-- Create
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.portal_create_booking(
    p_property_id uuid,
    p_first_name text,
    p_last_name text,
    p_room_number text,
    p_phone text,
    p_service_id uuid,
    p_collection_date date,
    p_departure_date date,
    p_additional_details text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_today date;
    v_active boolean;
    v_first text;
    v_last text;
    v_room text;
    v_phone text;
    v_notes text;
    v_id uuid;
BEGIN
    IF (SELECT auth.uid()) IS NULL
       OR (SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'property' THEN
        RAISE EXCEPTION 'property access required'
            USING ERRCODE = '42501';
    END IF;

    IF p_property_id IS NULL
       OR p_property_id NOT IN (SELECT private.my_property_ids()) THEN
        RAISE EXCEPTION 'property access required'
            USING ERRCODE = '42501';
    END IF;

    v_first := pg_catalog.btrim(COALESCE(p_first_name, ''));
    v_last := pg_catalog.btrim(COALESCE(p_last_name, ''));
    v_room := pg_catalog.btrim(COALESCE(p_room_number, ''));
    v_phone := NULLIF(pg_catalog.btrim(COALESCE(p_phone, '')), '');
    v_notes := NULLIF(pg_catalog.btrim(COALESCE(p_additional_details, '')), '');

    IF pg_catalog.char_length(v_first) < 1 THEN
        RAISE EXCEPTION 'First name is required'
            USING ERRCODE = '22023';
    END IF;

    IF pg_catalog.char_length(v_first) > 100 THEN
        RAISE EXCEPTION 'First name is too long'
            USING ERRCODE = '22023';
    END IF;

    IF pg_catalog.char_length(v_last) > 100 THEN
        RAISE EXCEPTION 'Last name is too long'
            USING ERRCODE = '22023';
    END IF;

    IF pg_catalog.char_length(v_room) < 1 THEN
        RAISE EXCEPTION 'Room number is required'
            USING ERRCODE = '22023';
    END IF;

    IF pg_catalog.char_length(v_room) > 40 THEN
        RAISE EXCEPTION 'Room number is too long'
            USING ERRCODE = '22023';
    END IF;

    IF v_phone IS NOT NULL AND pg_catalog.char_length(v_phone) > 20 THEN
        RAISE EXCEPTION 'Phone number is too long'
            USING ERRCODE = '22023';
    END IF;

    IF p_service_id IS NULL THEN
        RAISE EXCEPTION 'Select a service'
            USING ERRCODE = '22023';
    END IF;

    IF p_collection_date IS NULL THEN
        RAISE EXCEPTION 'Collection date is required'
            USING ERRCODE = '22023';
    END IF;

    IF p_departure_date IS NULL THEN
        RAISE EXCEPTION 'Departure date is required'
            USING ERRCODE = '22023';
    END IF;

    IF v_notes IS NOT NULL AND pg_catalog.char_length(v_notes) > 1000 THEN
        RAISE EXCEPTION 'Notes must be 1000 characters or fewer'
            USING ERRCODE = '22023';
    END IF;

    v_today := (pg_catalog.timezone('Africa/Johannesburg', pg_catalog.now()))::date;

    IF p_collection_date < v_today THEN
        RAISE EXCEPTION 'Collection date cannot be in the past'
            USING ERRCODE = '22023';
    END IF;

    IF p_departure_date < p_collection_date THEN
        RAISE EXCEPTION 'Departure date must be on or after the collection date'
            USING ERRCODE = '22023';
    END IF;

    SELECT p.active
    INTO v_active
    FROM public.properties AS p
    WHERE p.id = p_property_id;

    IF NOT FOUND OR v_active IS NOT TRUE THEN
        RAISE EXCEPTION 'Property is not accepting bookings'
            USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.property_services AS ps
        WHERE ps.property_id = p_property_id
          AND ps.service_id = p_service_id
    ) THEN
        RAISE EXCEPTION 'That service is not offered at this property'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.bookings (
        property_id,
        first_name,
        last_name,
        phone,
        room_number,
        service_id,
        collection_date,
        departure_date,
        additional_details,
        status,
        stage,
        source,
        created_by,
        machine_number,
        dryer_number,
        weighed_by,
        weighed_at,
        washing_at,
        drying_at,
        finishing_at,
        ready_at,
        ready_acknowledged_at,
        out_for_delivery_at,
        delivered_at,
        received_at,
        total_price,
        payment_method,
        weight_kg,
        completed_at
    ) VALUES (
        p_property_id,
        v_first,
        v_last,
        v_phone,
        v_room,
        p_service_id,
        p_collection_date,
        p_departure_date,
        v_notes,
        'pending',
        'to_weigh',
        'portal',
        (SELECT auth.uid()),
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

COMMENT ON FUNCTION private.portal_create_booking(uuid, text, text, text, text, uuid, date, date, text) IS
    'Property role only, and only for a property_members property. Inserts a to_weigh pending booking with source portal.';

REVOKE ALL ON FUNCTION private.portal_create_booking(uuid, text, text, text, text, uuid, date, date, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.portal_create_booking(uuid, text, text, text, text, uuid, date, date, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_create_booking(
    p_property_id uuid,
    p_first_name text,
    p_last_name text,
    p_room_number text,
    p_phone text,
    p_service_id uuid,
    p_collection_date date,
    p_departure_date date,
    p_additional_details text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN private.portal_create_booking(
        p_property_id,
        p_first_name,
        p_last_name,
        p_room_number,
        p_phone,
        p_service_id,
        p_collection_date,
        p_departure_date,
        p_additional_details
    );
END;
$$;

COMMENT ON FUNCTION public.portal_create_booking(uuid, text, text, text, text, uuid, date, date, text) IS
    'Property role only, and only for a property_members property. Inserts a to_weigh pending booking with source portal.';

REVOKE ALL ON FUNCTION public.portal_create_booking(uuid, text, text, text, text, uuid, date, date, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.portal_create_booking(uuid, text, text, text, text, uuid, date, date, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Cancel, only while the bag is still waiting to be weighed.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.portal_cancel_booking(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_property uuid;
    v_stage text;
    v_status text;
    v_weighed timestamptz;
BEGIN
    IF (SELECT auth.uid()) IS NULL
       OR (SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'property' THEN
        RAISE EXCEPTION 'property access required'
            USING ERRCODE = '42501';
    END IF;

    IF p_booking_id IS NULL THEN
        RAISE EXCEPTION 'booking_id is required'
            USING ERRCODE = '22023';
    END IF;

    SELECT b.property_id, b.stage, b.status, b.weighed_at
    INTO v_property, v_stage, v_status, v_weighed
    FROM public.bookings AS b
    WHERE b.id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_property IS NULL
       OR v_property NOT IN (SELECT private.my_property_ids()) THEN
        RAISE EXCEPTION 'Booking not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_status = 'cancelled' THEN
        RETURN;
    END IF;

    IF v_stage IS DISTINCT FROM 'to_weigh' OR v_weighed IS NOT NULL THEN
        RAISE EXCEPTION 'Booking can no longer be cancelled'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.bookings AS b
    SET status = 'cancelled'
    WHERE b.id = p_booking_id
      AND b.stage = 'to_weigh'
      AND b.weighed_at IS NULL
      AND b.status IS DISTINCT FROM 'cancelled';
END;
$$;

COMMENT ON FUNCTION private.portal_cancel_booking(uuid) IS
    'Property role only, for a linked property. Sets status cancelled while stage is to_weigh and weighed_at is null.';

REVOKE ALL ON FUNCTION private.portal_cancel_booking(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.portal_cancel_booking(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_cancel_booking(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    PERFORM private.portal_cancel_booking(p_booking_id);
END;
$$;

COMMENT ON FUNCTION public.portal_cancel_booking(uuid) IS
    'Property role only, for a linked property. Sets status cancelled while stage is to_weigh and weighed_at is null.';

REVOKE ALL ON FUNCTION public.portal_cancel_booking(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.portal_cancel_booking(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Guest form still cannot claim a portal or admin source, or stamp a creator.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "bookings_allow_insert_for_anonymous" ON public.bookings;

CREATE POLICY "bookings_allow_insert_for_anonymous" ON public.bookings
    FOR INSERT
    TO anon
    WITH CHECK (
        stage = 'to_weigh'
        AND status = 'pending'
        AND source = 'guest'
        AND created_by IS NULL
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

-- New columns are appended. Existing column order stays the same.
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
    b.created_by
FROM public.bookings AS b
JOIN public.services AS s ON s.id = b.service_id
JOIN public.properties AS p ON p.id = b.property_id
WHERE (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'property'
  AND b.property_id IN (SELECT private.my_property_ids());

COMMENT ON VIEW public.portal_bookings IS
    'Property projection of bookings. Rows require app_metadata.role = property and a property_members row. total_price is returned only when properties.show_prices is true. Includes delivery timestamps, source, and created_by. Omits weighed_by and ready_acknowledged_at.';

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
    b.source
FROM public.bookings AS b
JOIN public.services AS s ON s.id = b.service_id
JOIN public.properties AS p ON p.id = b.property_id
WHERE (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'kiosk'
  AND b.out_for_delivery_at IS NULL
  AND b.status IS DISTINCT FROM 'delivered';

COMMENT ON VIEW public.kiosk_bookings IS
    'Kiosk projection of bookings. Rows are returned only when app_metadata.role is kiosk. Bags out for delivery or delivered are omitted. Includes the guest first name, stay dates, service name, property name, property primary colour, room number, notes, and source. Omits phone and prices.';
