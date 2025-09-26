-- Combined migration for services and bookings tables
-- Run this file in your Supabase SQL Editor

-- Create services table
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    collection_date DATE NOT NULL,
    departure_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Services table policies
CREATE POLICY "services_allow_all_for_authenticated" ON services
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "services_allow_read_for_anonymous" ON services
    FOR SELECT USING (true);

-- Bookings table policies
CREATE POLICY "bookings_allow_all_for_authenticated" ON bookings
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "bookings_allow_read_for_anonymous" ON bookings
    FOR SELECT USING (true);

CREATE POLICY "bookings_allow_insert_for_anonymous" ON bookings
    FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_collection_date ON bookings(collection_date);
CREATE INDEX IF NOT EXISTS idx_bookings_departure_date ON bookings(departure_date);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- Insert sample services data
INSERT INTO services (name, price) VALUES
    ('Wash & Fold', 15.00),
    ('Dry Cleaning', 25.00),
    ('Express Service', 30.00),
    ('Bulk Laundry', 12.00),
    ('Ironing Only', 8.00)
ON CONFLICT DO NOTHING;
