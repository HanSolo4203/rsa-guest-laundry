-- Guest booking inserts. The public form sends the anon role.
--
-- The previous check compared property_services columns to themselves, because
-- an unqualified property_id inside that subquery binds to property_services
-- rather than bookings. Qualify the bookings columns so the chosen service
-- has to be offered at that property.
--
-- Delivery timestamps added in 024 must stay null on a public insert.

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
