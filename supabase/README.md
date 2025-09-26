# Database Migrations

This directory contains SQL migration files for setting up the Supabase database tables.

## Tables

### Services Table
- `id` (UUID, Primary Key)
- `name` (VARCHAR, Service name)
- `price` (DECIMAL, Service price)
- `created_at` (TIMESTAMP, Auto-generated)

### Bookings Table
- `id` (UUID, Primary Key)
- `first_name` (VARCHAR, Customer first name)
- `last_name` (VARCHAR, Customer last name)
- `phone` (VARCHAR, Customer phone number)
- `service_id` (UUID, Foreign Key to services table)
- `collection_date` (DATE, When laundry is collected)
- `departure_date` (DATE, When laundry is returned)
- `status` (VARCHAR, Booking status: pending, confirmed, in_progress, completed, cancelled)
- `created_at` (TIMESTAMP, Auto-generated)

## How to Run Migrations

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to the SQL Editor
4. Copy and paste the contents of `000_initial_setup.sql`
5. Click "Run" to execute the migration

### Option 2: Using Supabase CLI
```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## Features Included

- **Row Level Security (RLS)** enabled on both tables
- **Policies** for authenticated and anonymous users
- **Foreign key relationships** between bookings and services
- **Indexes** for optimal query performance
- **Sample data** for services table
- **Data validation** with CHECK constraints

## Security

The tables are configured with appropriate Row Level Security policies:
- Authenticated users can perform all operations
- Anonymous users can read data and create bookings
- All data is properly validated with constraints
