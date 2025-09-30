-- Fix Realtime Replication Access
-- Problem: "Realtime Replication not allowed" error
-- Solution: Ensure proper permissions for realtime replication

-- Step 1: Ensure realtime publication exists
-- (It should already exist in Supabase)

-- Step 2: Remove tables from publication (to clean state)
-- Note: These may error if tables aren't in publication - that's OK, we'll add them next
DO $$
BEGIN
    -- Try to drop bookings from publication
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE bookings;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;
    
    -- Try to drop services from publication
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE services;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;
END $$;

-- Step 3: Re-add tables to publication
-- This ensures the publication is properly configured
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE services;

-- Step 4: Grant necessary permissions to roles
-- These are needed for realtime to work with RLS enabled
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.bookings TO anon, authenticated;
GRANT SELECT ON public.services TO anon, authenticated;

-- Step 5: Ensure the publication includes all changes (INSERT, UPDATE, DELETE)
-- Check current publication settings
DO $$
BEGIN
  -- Recreate publication with explicit settings if it doesn't have the right config
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'services'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE services;
  END IF;
END $$;

-- Step 6: Update table comments for documentation
COMMENT ON TABLE public.bookings IS 'Bookings table with realtime replication enabled and proper permissions';
COMMENT ON TABLE public.services IS 'Services table with realtime replication enabled and proper permissions';

-- Verification query (optional - run separately to check)
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
