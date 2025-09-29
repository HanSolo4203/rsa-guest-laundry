-- Add payment method to bookings table
ALTER TABLE bookings 
ADD COLUMN payment_method VARCHAR(10) CHECK (payment_method IN ('card', 'cash'));

-- Add index for better performance when querying by payment method
CREATE INDEX IF NOT EXISTS idx_bookings_payment_method ON bookings(payment_method);

-- Add comment to document the column
COMMENT ON COLUMN bookings.payment_method IS 'Payment method used for the booking: card or cash';
