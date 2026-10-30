-- Explicit dashboard and property roles.
--
-- Disable public sign-ups in Supabase Auth settings (Authentication → Providers
-- → Email → "Allow new users to sign up" off) before creating property logins.
-- New users must be created in the dashboard with raw_app_meta_data.role set
-- to admin, kiosk, or property. A property login also needs a property_members
-- row.
--
-- Access tokens keep the previous app_metadata until the next sign-in. After
-- this migration, existing dashboard sessions have no role claim. Sign in
-- again so the token picks up role = admin.

-- ---------------------------------------------------------------------------
-- Backfill current dashboard users. Kiosk rows already have role = kiosk.
-- ---------------------------------------------------------------------------

UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    '"admin"'::jsonb,
    true
)
WHERE raw_app_meta_data ->> 'role' IS NULL;

-- ---------------------------------------------------------------------------
-- Admin is an explicit claim. Every policy that calls this function tightens
-- with it. NULL and property and kiosk are not admins.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.is_dashboard_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
$$;

COMMENT ON FUNCTION private.is_dashboard_admin() IS
    'True only when the access token app_metadata.role is admin.';

-- Policies whose only check is auth.role() = 'authenticated' would still let
-- a property login through. Rewrite those to is_dashboard_admin().
DO $$
DECLARE
    pol record;
    role_list text;
    admin_check constant text := '(SELECT private.is_dashboard_admin())';
    role_only constant text := '^[[:space:]]*\(?[[:space:]]*auth\.role\(\)[[:space:]]*=[[:space:]]*''authenticated''(::text)?[[:space:]]*\)?[[:space:]]*$';
    qual_is_role boolean;
    check_is_role boolean;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname IN ('public', 'storage')
    LOOP
        qual_is_role := pol.qual IS NOT NULL AND pol.qual ~ role_only;
        check_is_role := pol.with_check IS NOT NULL AND pol.with_check ~ role_only;

        IF pol.qual IS NOT NULL AND pol.with_check IS NOT NULL THEN
            IF NOT (qual_is_role AND check_is_role) THEN
                CONTINUE;
            END IF;
        ELSIF pol.qual IS NOT NULL THEN
            IF NOT qual_is_role THEN
                CONTINUE;
            END IF;
        ELSIF pol.with_check IS NOT NULL THEN
            IF NOT check_is_role THEN
                CONTINUE;
            END IF;
        ELSE
            CONTINUE;
        END IF;

        IF pol.cmd NOT IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL') THEN
            RAISE EXCEPTION 'refusing to rewrite policy % on %.%',
                pol.policyname, pol.schemaname, pol.tablename;
        END IF;

        SELECT string_agg(quote_ident(r::text), ', ')
        INTO role_list
        FROM unnest(pol.roles) AS r;

        IF role_list IS NULL OR role_list = '' THEN
            role_list := 'public';
        END IF;

        EXECUTE format(
            'DROP POLICY %I ON %I.%I',
            pol.policyname, pol.schemaname, pol.tablename
        );

        IF pol.cmd = 'INSERT' THEN
            EXECUTE format(
                'CREATE POLICY %I ON %I.%I AS %s FOR INSERT TO %s WITH CHECK (%s)',
                pol.policyname,
                pol.schemaname,
                pol.tablename,
                pol.permissive,
                role_list,
                admin_check
            );
        ELSIF pol.cmd IN ('SELECT', 'DELETE') THEN
            EXECUTE format(
                'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s USING (%s)',
                pol.policyname,
                pol.schemaname,
                pol.tablename,
                pol.permissive,
                pol.cmd,
                role_list,
                admin_check
            );
        ELSE
            EXECUTE format(
                'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s USING (%s) WITH CHECK (%s)',
                pol.policyname,
                pol.schemaname,
                pol.tablename,
                pol.permissive,
                pol.cmd,
                role_list,
                admin_check,
                admin_check
            );
        END IF;

        RAISE NOTICE 'rewrote %.% policy % to is_dashboard_admin()',
            pol.schemaname, pol.tablename, pol.policyname;
    END LOOP;
END $$;

-- Live database: bookings_realtime_select is SELECT for public with
-- auth.role() = ANY (anon, authenticated). That is broader than a lone
-- authenticated check and would let property logins read every booking,
-- including staff ids and prices. Admin reads stay on is_dashboard_admin().
DROP POLICY IF EXISTS "bookings_realtime_select" ON public.bookings;
CREATE POLICY "bookings_realtime_select" ON public.bookings
    FOR SELECT
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()));

-- ---------------------------------------------------------------------------
-- property_members
-- ---------------------------------------------------------------------------

CREATE TABLE public.property_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    member_role text NOT NULL DEFAULT 'staff',
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT property_members_role_check CHECK (member_role IN ('manager', 'staff')),
    CONSTRAINT property_members_property_user_key UNIQUE (property_id, user_id)
);

COMMENT ON TABLE public.property_members IS
    'Links an Auth user with app_metadata.role = property to the properties they can see.';
COMMENT ON COLUMN public.property_members.member_role IS
    'manager or staff. Both can read the property portal. Neither is a dashboard admin.';

-- Unique (property_id, user_id) indexes property_id. Membership lookups are by user.
CREATE INDEX property_members_user_id_idx ON public.property_members (user_id);

ALTER TABLE public.property_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_members_admin_all" ON public.property_members
    FOR ALL
    TO authenticated
    USING ((SELECT private.is_dashboard_admin()))
    WITH CHECK ((SELECT private.is_dashboard_admin()));

CREATE POLICY "property_members_select_own" ON public.property_members
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.property_members FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.property_members TO authenticated;

-- ---------------------------------------------------------------------------
-- Property ids for the signed-in user. Definer so bookings and properties
-- policies can call it without recursing through property_members RLS.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.my_property_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT property_id
    FROM public.property_members
    WHERE user_id = (SELECT auth.uid());
$$;

COMMENT ON FUNCTION private.my_property_ids() IS
    'Property ids linked to auth.uid() in property_members.';

REVOKE ALL ON FUNCTION private.my_property_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.my_property_ids() TO authenticated;

-- ---------------------------------------------------------------------------
-- bookings: property users may read their own rows. No insert, update, or
-- delete policy for them. Writes stay on is_dashboard_admin() or a later RPC.
-- ---------------------------------------------------------------------------

CREATE POLICY "bookings_property_select" ON public.bookings
    FOR SELECT
    TO authenticated
    USING (
        (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'property'
        AND property_id IN (SELECT private.my_property_ids())
    );

-- ---------------------------------------------------------------------------
-- properties: property users may read their own properties. Writes stay admin.
-- ---------------------------------------------------------------------------

CREATE POLICY "properties_member_select" ON public.properties
    FOR SELECT
    TO authenticated
    USING (
        (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'property'
        AND id IN (SELECT private.my_property_ids())
    );

-- ---------------------------------------------------------------------------
-- Prices are hidden from the property portal unless a property opts in.
-- portal_bookings is the column-safe read. The table SELECT above still
-- returns every booking column for those rows; the portal should use the view.
-- ---------------------------------------------------------------------------

ALTER TABLE public.properties
    ADD COLUMN show_prices boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.properties.show_prices IS
    'When true, portal_bookings includes total_price. Otherwise that column is null.';

CREATE VIEW public.portal_bookings
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
    b.ready_at
FROM public.bookings AS b
JOIN public.services AS s ON s.id = b.service_id
JOIN public.properties AS p ON p.id = b.property_id
WHERE (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'property'
  AND b.property_id IN (SELECT private.my_property_ids());

COMMENT ON VIEW public.portal_bookings IS
    'Property projection of bookings. Rows require app_metadata.role = property and a property_members row. total_price is returned only when properties.show_prices is true. Omits weighed_by and ready_acknowledged_at.';

REVOKE ALL ON TABLE public.portal_bookings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.portal_bookings TO authenticated;
