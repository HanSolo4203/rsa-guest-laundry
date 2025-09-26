-- Ensure authenticated users can update bookings
-- This migration ensures that authenticated users have full CRUD access to bookings

-- Drop existing policies to recreate them with proper permissions
DROP POLICY IF EXISTS "bookings_allow_all_for_authenticated" ON bookings;

-- Create comprehensive policies for authenticated users
CREATE POLICY "bookings_authenticated_all_operations" ON bookings
    FOR ALL USING (auth.role() = 'authenticated');

-- Alternative approach: Create specific policies for each operation
-- This provides more granular control if needed

-- SELECT policy for authenticated users
CREATE POLICY "bookings_authenticated_select" ON bookings
    FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT policy for authenticated users  
CREATE POLICY "bookings_authenticated_insert" ON bookings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- UPDATE policy for authenticated users
CREATE POLICY "bookings_authenticated_update" ON bookings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- DELETE policy for authenticated users
CREATE POLICY "bookings_authenticated_delete" ON bookings
    FOR DELETE USING (auth.role() = 'authenticated');

-- Ensure the total_price column exists (in case migration 003 wasn't applied)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'total_price') THEN
        ALTER TABLE bookings ADD COLUMN total_price DECIMAL(10,2);
        COMMENT ON COLUMN bookings.total_price IS 'Final price charged to customer after service completion';
    END IF;
END $$;

-- Ensure the status constraint includes all new statuses
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.check_constraints 
               WHERE constraint_name = 'bookings_status_check' AND table_name = 'bookings') THEN
        ALTER TABLE bookings DROP CONSTRAINT bookings_status_check;
    END IF;
    
    -- Add updated constraint
    ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
    CHECK (status IN ('pending', 'confirmed', 'collected', 'processing', 'completed', 'cancelled'));
END $$;
