-- Cleanup migration to drop existing policies if they exist
-- Run this first if you're getting duplicate policy errors

-- Drop existing policies from services table (if they exist)
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON services;
DROP POLICY IF EXISTS "Allow read access for anonymous users" ON services;

-- Drop existing policies from bookings table (if they exist)
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON bookings;
DROP POLICY IF EXISTS "Allow read access for anonymous users" ON bookings;
DROP POLICY IF EXISTS "Allow insert for anonymous users" ON bookings;
