-- Add total_price column to bookings table
ALTER TABLE bookings 
ADD COLUMN total_price DECIMAL(10,2);

-- Add comment to explain the column
COMMENT ON COLUMN bookings.total_price IS 'Final price charged to customer after service completion';

-- Update the status check constraint to include new statuses
ALTER TABLE bookings 
DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'confirmed', 'collected', 'processing', 'completed', 'cancelled'));
