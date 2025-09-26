-- Create initial admin user for the dashboard
-- This migration provides instructions for creating an admin user

-- Note: User creation in Supabase Auth should be done through the Supabase Dashboard
-- or using the Supabase Auth API, not through SQL migrations.

-- Instructions for creating an admin user:

-- Method 1: Using Supabase Dashboard
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to Authentication > Users
-- 3. Click "Add User"
-- 4. Enter email: admin@laundry.com
-- 5. Enter password: password123
-- 6. Confirm the password
-- 7. Click "Create User"

-- Method 2: Using Supabase CLI
-- supabase auth signup --email admin@laundry.com --password password123

-- Method 3: Using the application (if you have a signup form)
-- Users can sign up through the application and then be promoted to admin

-- The RLS policies will automatically apply to authenticated users
-- No additional database setup is required for the admin user

-- Optional: If you want to track admin roles in your database
-- You could create a user_roles table, but it's not necessary for basic functionality
-- since RLS policies are based on auth.role() = 'authenticated'

-- Example user_roles table (optional):
/*
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_authenticated_all" ON user_roles
    FOR ALL USING (auth.role() = 'authenticated');
*/
