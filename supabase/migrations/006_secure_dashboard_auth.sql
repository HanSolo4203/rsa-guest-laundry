-- Secure dashboard with proper authentication
-- Remove anonymous update/delete permissions since dashboard now requires authentication

-- Drop anonymous update and delete policies
DROP POLICY IF EXISTS "bookings_allow_update_for_anonymous" ON bookings;
DROP POLICY IF EXISTS "bookings_allow_delete_for_anonymous" ON bookings;

-- Ensure we have proper authenticated user policies
-- These should already exist from migration 004, but let's make sure

-- Drop any existing authenticated policies to recreate them cleanly
DROP POLICY IF EXISTS "bookings_authenticated_all_operations" ON bookings;
DROP POLICY IF EXISTS "bookings_authenticated_select" ON bookings;
DROP POLICY IF EXISTS "bookings_authenticated_insert" ON bookings;
DROP POLICY IF EXISTS "bookings_authenticated_update" ON bookings;
DROP POLICY IF EXISTS "bookings_authenticated_delete" ON bookings;

-- Create clean authenticated user policies
CREATE POLICY "bookings_authenticated_select" ON bookings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "bookings_authenticated_insert" ON bookings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "bookings_authenticated_update" ON bookings
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "bookings_authenticated_delete" ON bookings
    FOR DELETE USING (auth.role() = 'authenticated');

-- Keep anonymous read and insert for the public booking form
-- These policies should already exist from the initial setup
-- Anonymous users can still create bookings and read services

-- Verify the policies are in place
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('bookings', 'services')
ORDER BY tablename, policyname;
