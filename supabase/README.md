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

## Renamed migrations and `migration repair`

The CLI version is the filename text before the first `_`. `022_1_name.sql` is still version `022`. The kiosk badge file is `0221_kiosk_property_badge.sql`, and properties is `0220_properties.sql`.

`db reset` applies files in directory order. `0221_…` sorts before `022_…` because `1` comes before `_`, so a file named `0221` cannot sit between `022_properties.sql` and `023`. `0220` then `0221` is the same sequence as a version-string sort (`0220` < `0221` < `023`). A fresh database therefore runs `0220` → `0221` → `023` → `024` → `025` → `026`, and `999` stays last. `024` is the last definition of `kiosk_bookings` and `portal_bookings`, so the delivery filter stays in place.

If a database already recorded version `022`, mark that row reverted and `0220` applied before pushing.

`supabase db push` compares that version with `supabase_migrations.schema_migrations`. It does not compare file contents. Renaming a file makes the new version look unapplied, so push runs the SQL again. `supabase migration repair` only inserts or deletes history rows. `--status reverted` removes a row and does not undo SQL. `--status applied` inserts a row and does not run SQL.

Check `supabase migration list` first. Mark an old version reverted only when that row is present. Mark the new version applied only when that SQL has already run:

```bash
supabase migration repair 022 --status reverted
supabase migration repair 0220 --status applied

supabase migration repair 20261030204338 --status reverted
supabase migration repair 0221 --status applied

supabase migration repair 20261030231221 --status reverted
supabase migration repair 026 --status applied
```

`20261030204338` is the previous kiosk badge version. This database recorded the guest insert as `20261030231221`, not as `025`. Leave version `025` alone. It still belongs to `025_admin_list_property_members.sql`.

Do not let `0221` run after `024` has already replaced `kiosk_bookings`. That statement has no delivery filter, and repair will not put the filter back. If `20261030204338` already ran on a database, re-apply the `kiosk_bookings` statement from `024_delivery_and_property_access.sql` once, then repair the history.

A remote version with no local file makes `db push` stop. This project also recorded `20261030183336`, `20261030201130`, `20261030224536`, and `20261030224620`. Mark a remote-only version reverted only when that SQL has already run, and mark the matching local version applied so push does not run it again.
