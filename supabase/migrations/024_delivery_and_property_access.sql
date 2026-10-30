-- Delivery handoff and the timestamps the portal stepper reads.
--
-- out_for_delivery_at: admin marked the bag as leaving the laundry.
-- delivered_at: admin marked it delivered. status becomes 'delivered'.
-- received_at: a property user confirmed the property has the bag.
--
-- The function bodies live in private. The public names are invoker wrappers
-- so PostgREST can call them without a security definer in the exposed schema.

ALTER TABLE public.bookings
    ADD COLUMN out_for_delivery_at timestamptz,
    ADD COLUMN delivered_at timestamptz,
    ADD COLUMN received_at timestamptz;

COMMENT ON COLUMN public.bookings.out_for_delivery_at IS
    'When an admin marked the bag out for delivery.';
COMMENT ON COLUMN public.bookings.delivered_at IS
    'When an admin marked the bag delivered. Set together with status = delivered.';
COMMENT ON COLUMN public.bookings.received_at IS
    'When a property user confirmed the property received the bag.';

ALTER TABLE public.bookings
    DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('pending', 'confirmed', 'collected', 'processing', 'completed', 'cancelled', 'delivered'));

-- ---------------------------------------------------------------------------
-- Admin: ready -> out for delivery. Does not change status.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.admin_mark_out_for_delivery(booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_stage text;
    v_status text;
BEGIN
    IF NOT private.is_dashboard_admin() THEN
        RAISE EXCEPTION 'dashboard admin required'
            USING ERRCODE = '42501';
    END IF;

    IF booking_id IS NULL THEN
        RAISE EXCEPTION 'booking_id is required'
            USING ERRCODE = '22023';
    END IF;

    SELECT b.stage, b.status
    INTO v_stage, v_status
    FROM public.bookings AS b
    WHERE b.id = admin_mark_out_for_delivery.booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_status IN ('cancelled', 'completed', 'delivered') THEN
        RAISE EXCEPTION 'Booking cannot go out for delivery'
            USING ERRCODE = '22023';
    END IF;

    IF v_stage IS DISTINCT FROM 'ready' THEN
        RAISE EXCEPTION 'Booking is not ready'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.bookings AS b
    SET out_for_delivery_at = pg_catalog.now()
    WHERE b.id = admin_mark_out_for_delivery.booking_id
      AND b.out_for_delivery_at IS NULL;
END;
$$;

COMMENT ON FUNCTION private.admin_mark_out_for_delivery(uuid) IS
    'Dashboard admin only. Stamps out_for_delivery_at on a ready booking. A second call is a no-op.';

REVOKE ALL ON FUNCTION private.admin_mark_out_for_delivery(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.admin_mark_out_for_delivery(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_mark_out_for_delivery(booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    PERFORM private.admin_mark_out_for_delivery(booking_id);
END;
$$;

COMMENT ON FUNCTION public.admin_mark_out_for_delivery(uuid) IS
    'Dashboard admin only. Stamps out_for_delivery_at on a ready booking.';

REVOKE ALL ON FUNCTION public.admin_mark_out_for_delivery(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_mark_out_for_delivery(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Admin: out for delivery -> delivered.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.admin_mark_delivered(booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_status text;
    v_out timestamptz;
BEGIN
    IF NOT private.is_dashboard_admin() THEN
        RAISE EXCEPTION 'dashboard admin required'
            USING ERRCODE = '42501';
    END IF;

    IF booking_id IS NULL THEN
        RAISE EXCEPTION 'booking_id is required'
            USING ERRCODE = '22023';
    END IF;

    SELECT b.status, b.out_for_delivery_at
    INTO v_status, v_out
    FROM public.bookings AS b
    WHERE b.id = admin_mark_delivered.booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_status = 'delivered' THEN
        RETURN;
    END IF;

    IF v_status IN ('cancelled', 'completed') THEN
        RAISE EXCEPTION 'Booking cannot be marked delivered'
            USING ERRCODE = '22023';
    END IF;

    IF v_out IS NULL THEN
        RAISE EXCEPTION 'Mark the booking out for delivery first'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.bookings AS b
    SET delivered_at = pg_catalog.now(),
        status = 'delivered'
    WHERE b.id = admin_mark_delivered.booking_id;
END;
$$;

COMMENT ON FUNCTION private.admin_mark_delivered(uuid) IS
    'Dashboard admin only. Sets status to delivered and stamps delivered_at. Requires out_for_delivery_at.';

REVOKE ALL ON FUNCTION private.admin_mark_delivered(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.admin_mark_delivered(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_mark_delivered(booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    PERFORM private.admin_mark_delivered(booking_id);
END;
$$;

COMMENT ON FUNCTION public.admin_mark_delivered(uuid) IS
    'Dashboard admin only. Sets status to delivered and stamps delivered_at. Requires out_for_delivery_at.';

REVOKE ALL ON FUNCTION public.admin_mark_delivered(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_mark_delivered(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Property portal: confirm the property received a delivered bag.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.portal_confirm_received(booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_property uuid;
    v_status text;
    v_received timestamptz;
BEGIN
    IF (SELECT auth.uid()) IS NULL
       OR (SELECT auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'property' THEN
        RAISE EXCEPTION 'property access required'
            USING ERRCODE = '42501';
    END IF;

    IF booking_id IS NULL THEN
        RAISE EXCEPTION 'booking_id is required'
            USING ERRCODE = '22023';
    END IF;

    SELECT b.property_id, b.status, b.received_at
    INTO v_property, v_status, v_received
    FROM public.bookings AS b
    WHERE b.id = portal_confirm_received.booking_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_property IS NULL
       OR v_property NOT IN (SELECT private.my_property_ids()) THEN
        RAISE EXCEPTION 'Booking not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_received IS NOT NULL THEN
        RETURN;
    END IF;

    IF v_status IS DISTINCT FROM 'delivered' THEN
        RAISE EXCEPTION 'Booking has not been delivered'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.bookings AS b
    SET received_at = pg_catalog.now()
    WHERE b.id = portal_confirm_received.booking_id;
END;
$$;

COMMENT ON FUNCTION private.portal_confirm_received(uuid) IS
    'Property role only, and only when property_members links the user to the booking''s property. Sets received_at.';

REVOKE ALL ON FUNCTION private.portal_confirm_received(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.portal_confirm_received(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_confirm_received(booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    PERFORM private.portal_confirm_received(booking_id);
END;
$$;

COMMENT ON FUNCTION public.portal_confirm_received(uuid) IS
    'Property role only, and only when property_members links the user to the booking''s property. Sets received_at.';

REVOKE ALL ON FUNCTION public.portal_confirm_received(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.portal_confirm_received(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Portal projection picks up the delivery timestamps.
-- New columns are appended. Existing column order stays the same.
-- ---------------------------------------------------------------------------

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
    b.received_at
FROM public.bookings AS b
JOIN public.services AS s ON s.id = b.service_id
JOIN public.properties AS p ON p.id = b.property_id
WHERE (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'property'
  AND b.property_id IN (SELECT private.my_property_ids());

COMMENT ON VIEW public.portal_bookings IS
    'Property projection of bookings. Rows require app_metadata.role = property and a property_members row. total_price is returned only when properties.show_prices is true. Includes delivery timestamps. Omits weighed_by and ready_acknowledged_at.';

-- Bags that have left the laundry drop off the kiosk board. Column order is unchanged.
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
    b.room_number
FROM public.bookings AS b
JOIN public.services AS s ON s.id = b.service_id
JOIN public.properties AS p ON p.id = b.property_id
WHERE (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'kiosk'
  AND b.out_for_delivery_at IS NULL
  AND b.status IS DISTINCT FROM 'delivered';

COMMENT ON VIEW public.kiosk_bookings IS
    'Kiosk projection of bookings. Rows are returned only when app_metadata.role is kiosk. Bags out for delivery or delivered are omitted. Includes the guest first name, stay dates, service name, property name, property primary colour, room number, and notes. Omits phone and prices.';
