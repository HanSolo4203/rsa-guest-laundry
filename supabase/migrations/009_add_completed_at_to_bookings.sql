-- Add completed_at timestamp to bookings table
ALTER TABLE bookings 
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;

-- Add index for better performance when querying completed bookings
CREATE INDEX IF NOT EXISTS idx_bookings_completed_at ON bookings(completed_at);
