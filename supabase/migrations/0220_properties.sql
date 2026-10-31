-- Multi-property branding for the guest booking site.
--
-- Numbered 022 because 018-021 are already applied. 019 and 021 replace
-- kiosk_bookings, so the property name has to be appended after those columns.
--
-- Dashboard admins are signed-in users whose app_metadata.role is not kiosk
-- (private.is_dashboard_admin). The kiosk tablet keeps using kiosk_bookings.

-- ---------------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------------

CREATE TABLE public.properties (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    logo_url text,
    background_url text,
    background_type text NOT NULL DEFAULT 'image',
    primary_color text,
    accent_color text,
    background_color text,
    text_color text,
    button_text_color text,
    font text NOT NULL DEFAULT 'inter',
    heading text NOT NULL DEFAULT 'Book Guest Laundry Service',
    welcome_message text,
    contact_info text,
    ask_room_number boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT properties_background_type_check
        CHECK (background_type IN ('image', 'video', 'none'))
);

COMMENT ON TABLE public.properties IS
    'Hostel or hotel that has its own guest-booking brand. Public reads are limited to active rows.';
COMMENT ON COLUMN public.properties.slug IS 'URL key, for example trade or 91-loop.';
COMMENT ON COLUMN public.properties.background_type IS 'How background_url is rendered: image, video, or none.';
COMMENT ON COLUMN public.properties.ask_room_number IS 'When true, the guest form asks for a room number.';

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_anon_select_active" ON public.properties
    FOR SELECT
    TO anon
    USING (active = true);

CREATE POLICY "properties_admin_select" ON public.properties
    FOR SELECT
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()));

CREATE POLICY "properties_admin_insert" ON public.properties
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT private.is_dashboard_admin()));

CREATE POLICY "properties_admin_update" ON public.properties
    FOR UPDATE
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()))
    WITH CHECK ((SELECT private.is_dashboard_admin()));

CREATE POLICY "properties_admin_delete" ON public.properties
    FOR DELETE
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()));

REVOKE ALL ON TABLE public.properties FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.properties TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.properties TO authenticated;

-- Trade colours come from clientBrand and the minimal home theme.
-- primary #2B5F44 is clientBrand.colors.primary.
-- accent #84A98C is minimalTheme.colors.accent and clientBrand.colors.green.
-- background #FFFFFF is both files. text #2F2F2F is clientBrand.colors.text.
-- 91 Loop and Curiosity are placeholders until their brands are supplied.
INSERT INTO public.properties (
    slug,
    name,
    active,
    background_type,
    primary_color,
    accent_color,
    background_color,
    text_color,
    button_text_color,
    font,
    heading,
    welcome_message,
    ask_room_number
)
VALUES
    (
        'trade',
        'The Trade Boutique Hotel',
        true,
        'none',
        '#2B5F44',
        '#84A98C',
        '#FFFFFF',
        '#2F2F2F',
        '#FFFFFF',
        'inter',
        'Book Guest Laundry Service',
        'A Boutique Hotel In Cape Town CBD',
        true
    ),
    (
        '91-loop',
        '91 Loop',
        true,
        'none',
        '#1D4E89',
        '#F2A365',
        '#F4F7FB',
        '#1A2332',
        '#FFFFFF',
        'inter',
        'Book Guest Laundry Service',
        NULL,
        true
    ),
    (
        'curiosity',
        'Curiosity',
        true,
        'none',
        '#C4522A',
        '#E6B325',
        '#FFF8F3',
        '#2C2118',
        '#FFFFFF',
        'inter',
        'Book Guest Laundry Service',
        NULL,
        true
    );

-- ---------------------------------------------------------------------------
-- property_services
-- ---------------------------------------------------------------------------

CREATE TABLE public.property_services (
    property_id uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
    service_id uuid NOT NULL REFERENCES public.services (id) ON DELETE CASCADE,
    PRIMARY KEY (property_id, service_id)
);

COMMENT ON TABLE public.property_services IS
    'Services a property offers. Guest inserts are rejected unless the pair is listed here.';

-- Leading PK column covers property_id. service_id needs its own index for the FK.
CREATE INDEX idx_property_services_service_id
    ON public.property_services (service_id);

ALTER TABLE public.property_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_services_anon_select" ON public.property_services
    FOR SELECT
    TO anon
    USING (
        EXISTS (
            SELECT 1
            FROM public.properties AS p
            WHERE p.id = property_id
              AND p.active = true
        )
    );

CREATE POLICY "property_services_admin_select" ON public.property_services
    FOR SELECT
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()));

CREATE POLICY "property_services_admin_insert" ON public.property_services
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT private.is_dashboard_admin()));

CREATE POLICY "property_services_admin_update" ON public.property_services
    FOR UPDATE
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()))
    WITH CHECK ((SELECT private.is_dashboard_admin()));

CREATE POLICY "property_services_admin_delete" ON public.property_services
    FOR DELETE
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()));

REVOKE ALL ON TABLE public.property_services FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.property_services TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.property_services TO authenticated;

-- Every current service is offered at every property. Remove rows to narrow a property.
INSERT INTO public.property_services (property_id, service_id)
SELECT p.id, s.id
FROM public.properties AS p
CROSS JOIN public.services AS s;

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------

ALTER TABLE public.bookings
    ADD COLUMN property_id uuid REFERENCES public.properties (id),
    ADD COLUMN room_number text;

COMMENT ON COLUMN public.bookings.property_id IS 'Property this guest booking belongs to.';
COMMENT ON COLUMN public.bookings.room_number IS 'Room number collected when the property asks for one.';

UPDATE public.bookings
SET property_id = (
    SELECT id
    FROM public.properties
    WHERE slug = 'trade'
)
WHERE property_id IS NULL;

ALTER TABLE public.bookings
    ALTER COLUMN property_id SET NOT NULL;

CREATE INDEX idx_bookings_property_id ON public.bookings (property_id);

-- Public booking form. Same stage locks as 020, plus an active property that
-- actually offers the chosen service.
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
        AND property_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.properties AS p
            WHERE p.id = property_id
              AND p.active = true
        )
        AND EXISTS (
            SELECT 1
            FROM public.property_services AS ps
            WHERE ps.property_id = property_id
              AND ps.service_id = service_id
        )
    );

-- ---------------------------------------------------------------------------
-- property-assets
-- Public read so logo_url and background_url can be fetched without a signed
-- URL. Insert, update, and delete stay with dashboard admins. Upsert works
-- because those admins can also select.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'property-assets',
    'property-assets',
    true,
    52428800,
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/webm'
    ]
);

CREATE POLICY "property_assets_public_read" ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'property-assets');

CREATE POLICY "property_assets_admin_insert" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'property-assets'
        AND (SELECT private.is_dashboard_admin())
    );

CREATE POLICY "property_assets_admin_update" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'property-assets'
        AND (SELECT private.is_dashboard_admin())
    )
    WITH CHECK (
        bucket_id = 'property-assets'
        AND (SELECT private.is_dashboard_admin())
    );

CREATE POLICY "property_assets_admin_delete" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'property-assets'
        AND (SELECT private.is_dashboard_admin())
    );

-- ---------------------------------------------------------------------------
-- kiosk_bookings
-- Append only. CREATE OR REPLACE cannot reorder or rename existing columns.
-- security_invoker stays off so the kiosk role can read the property name
-- without a SELECT grant on properties or bookings.
-- ---------------------------------------------------------------------------

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
    p.name AS property_name
FROM public.bookings AS b
JOIN public.services AS s ON s.id = b.service_id
JOIN public.properties AS p ON p.id = b.property_id
WHERE (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'kiosk';

COMMENT ON VIEW public.kiosk_bookings IS
    'Kiosk projection of bookings. Rows are returned only when app_metadata.role is kiosk. Includes the guest first name, stay dates, service name, property name, and notes. Omits phone and prices.';

GRANT SELECT ON TABLE public.kiosk_bookings TO authenticated;
