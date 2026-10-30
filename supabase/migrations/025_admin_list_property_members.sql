-- Dashboard admins can read property member emails without the service role key.
-- The body lives in private. The public name is an invoker wrapper so PostgREST
-- can call it without a security definer in the exposed schema.

CREATE OR REPLACE FUNCTION private.admin_list_property_members(p_property_id uuid)
RETURNS TABLE (
    user_id uuid,
    email text,
    member_role text,
    created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- NULL is not an admin. NOT NULL does not enter an IF.
    IF private.is_dashboard_admin() IS NOT TRUE THEN
        RAISE EXCEPTION 'dashboard admin required'
            USING ERRCODE = '42501';
    END IF;

    IF p_property_id IS NULL THEN
        RAISE EXCEPTION 'property_id is required'
            USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    SELECT pm.user_id, u.email::text, pm.member_role, pm.created_at
    FROM public.property_members AS pm
    INNER JOIN auth.users AS u ON u.id = pm.user_id
    WHERE pm.property_id = p_property_id
    ORDER BY pm.created_at ASC;
END;
$$;

COMMENT ON FUNCTION private.admin_list_property_members(uuid) IS
    'Dashboard admin only. Property members with their Auth email.';

REVOKE ALL ON FUNCTION private.admin_list_property_members(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.admin_list_property_members(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_property_members(p_property_id uuid)
RETURNS TABLE (
    user_id uuid,
    email text,
    member_role text,
    created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT
        result.user_id,
        result.email,
        result.member_role,
        result.created_at
    FROM private.admin_list_property_members(p_property_id) AS result;
$$;

COMMENT ON FUNCTION public.admin_list_property_members(uuid) IS
    'Dashboard admin only. Property members with their Auth email.';

REVOKE ALL ON FUNCTION public.admin_list_property_members(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_property_members(uuid) TO authenticated;
