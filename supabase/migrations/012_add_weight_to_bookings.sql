-- Add weight column to bookings table
ALTER TABLE bookings 
ADD COLUMN weight_kg DECIMAL(5,2) CHECK (weight_kg > 0);

-- Add index for better performance when querying by weight
CREATE INDEX IF NOT EXISTS idx_bookings_weight_kg ON bookings(weight_kg);

-- Add comment to document the column
COMMENT ON COLUMN bookings.weight_kg IS 'Weight of laundry in kilograms';
