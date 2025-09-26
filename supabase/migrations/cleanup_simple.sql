DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON services;
DROP POLICY IF EXISTS "Allow read access for anonymous users" ON services;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON bookings;
DROP POLICY IF EXISTS "Allow read access for anonymous users" ON bookings;
DROP POLICY IF EXISTS "Allow insert for anonymous users" ON bookings;
