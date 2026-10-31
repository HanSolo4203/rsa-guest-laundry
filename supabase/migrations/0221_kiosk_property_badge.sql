-- Append property colour and room number for kiosk cards.
-- CREATE OR REPLACE can only add columns at the end of kiosk_bookings.

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
WHERE (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'kiosk';

COMMENT ON VIEW public.kiosk_bookings IS
    'Kiosk projection of bookings. Rows are returned only when app_metadata.role is kiosk. Includes the guest first name, stay dates, service name, property name, property primary colour, room number, and notes. Omits phone and prices.';
