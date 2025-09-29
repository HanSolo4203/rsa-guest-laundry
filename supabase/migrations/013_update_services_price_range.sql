-- Update services table to support price ranges instead of fixed prices
-- Change price column from DECIMAL to TEXT to support ranges like "R170-R470"

-- Step 1: Add a temporary column to store the new price format
ALTER TABLE services ADD COLUMN price_range TEXT;

-- Step 2: Convert existing numeric prices to price range format
UPDATE services SET price_range = 'R' || price::text || '-' || (price * 2.5)::text WHERE price IS NOT NULL;

-- Step 3: Drop the old price column
ALTER TABLE services DROP COLUMN price;

-- Step 4: Rename the new column to price
ALTER TABLE services RENAME COLUMN price_range TO price;

-- Step 5: Make the column NOT NULL
ALTER TABLE services ALTER COLUMN price SET NOT NULL;

-- Step 6: Add a comment to document the expected format
COMMENT ON COLUMN services.price IS 'Price range in format "R170-R470" or single price "R170"';
