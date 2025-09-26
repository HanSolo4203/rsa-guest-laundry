-- Allow anonymous users to update bookings (for admin dashboard)
-- This is useful when the admin dashboard doesn't require authentication

-- Add policy to allow anonymous users to update bookings
CREATE POLICY "bookings_allow_update_for_anonymous" ON bookings
    FOR UPDATE USING (true);

-- Also allow anonymous users to delete bookings if needed for admin purposes
CREATE POLICY "bookings_allow_delete_for_anonymous" ON bookings
    FOR DELETE USING (true);

-- Note: This makes the admin dashboard fully functional without authentication
-- In a production environment, you might want to:
-- 1. Add proper authentication to the dashboard
-- 2. Or restrict these policies to specific IP addresses
-- 3. Or use a different approach like API keys
