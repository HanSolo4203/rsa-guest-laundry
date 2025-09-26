-- Create services table
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security) policy
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "services_allow_all_for_authenticated" ON services
    FOR ALL USING (auth.role() = 'authenticated');

-- Create policy to allow read access for anonymous users
CREATE POLICY "services_allow_read_for_anonymous" ON services
    FOR SELECT USING (true);

-- Insert sample services data
INSERT INTO services (name, price) VALUES
    ('Wash & Fold', 15.00),
    ('Dry Cleaning', 25.00),
    ('Express Service', 30.00),
    ('Bulk Laundry', 12.00),
    ('Ironing Only', 8.00);
