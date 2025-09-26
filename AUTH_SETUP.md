# Authentication Setup Guide

This guide will help you set up authentication for the Laundry Service Admin Dashboard.

## Prerequisites

1. Supabase project set up and running
2. Environment variables configured in `.env.local`
3. Database migrations applied

## Setup Steps

### 1. Apply Database Migrations

Run the following migrations in your Supabase SQL Editor in order:

1. `000_initial_setup.sql` - Basic tables and RLS
2. `001_create_services_table.sql` - Services table
3. `002_create_bookings_table.sql` - Bookings table
4. `003_add_total_price_to_bookings.sql` - Add total_price column
5. `004_ensure_booking_updates.sql` - Ensure authenticated user policies
6. `005_allow_anonymous_updates.sql` - (Optional, will be removed by step 7)
7. `006_secure_dashboard_auth.sql` - Secure with proper authentication
8. `007_create_admin_user.sql` - Instructions for creating admin user

### 2. Create Admin User

#### Method 1: Using Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** > **Users**
4. Click **"Add User"**
5. Enter the following details:
   - **Email**: `admin@laundry.com`
   - **Password**: `password123`
   - **Confirm Password**: `password123`
6. Click **"Create User"**

#### Method 2: Using Supabase CLI

```bash
supabase auth signup --email admin@laundry.com --password password123
```

### 3. Verify Authentication

1. Start your Next.js application:
   ```bash
   npm run dev
   ```

2. Navigate to `/dashboard` in your browser
3. You should be redirected to the login page
4. Use the admin credentials to sign in:
   - Email: `admin@laundry.com`
   - Password: `password123`
5. You should be redirected to the dashboard

## Features

### Authentication Features

- **Login Form**: Clean, responsive login form with validation
- **Protected Routes**: Dashboard routes are protected and require authentication
- **Session Management**: Automatic session handling and persistence
- **Logout Functionality**: Secure logout with session cleanup
- **User Display**: Shows logged-in user email in the dashboard header

### Security Features

- **Row Level Security (RLS)**: All database operations require authentication
- **Secure Policies**: Only authenticated users can perform CRUD operations
- **Anonymous Access**: Public booking form still works for customers
- **Session Validation**: Automatic session validation and refresh

## User Management

### Adding New Admin Users

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add User"
3. Enter email and password
4. The user will automatically have access to the dashboard

### Changing Passwords

Users can change their passwords through the Supabase Dashboard or by implementing a password change feature in the application.

## Troubleshooting

### Common Issues

1. **"Failed to sign in" error**
   - Check if the user exists in Supabase Auth
   - Verify email and password are correct
   - Check browser console for detailed error messages

2. **Database operations failing**
   - Ensure RLS policies are properly applied
   - Verify the user is authenticated
   - Check if migrations were applied correctly

3. **Session not persisting**
   - Check if cookies are enabled
   - Verify Supabase URL and keys are correct
   - Check browser storage permissions

### Debug Mode

To enable debug logging, check the browser console for detailed authentication logs.

## Production Considerations

1. **Strong Passwords**: Enforce strong password policies
2. **Email Verification**: Enable email verification for new users
3. **Rate Limiting**: Implement rate limiting for login attempts
4. **HTTPS**: Ensure your application uses HTTPS in production
5. **Environment Variables**: Keep Supabase keys secure and use environment variables

## API Reference

### Auth Context

The `useAuth()` hook provides:

```typescript
const { user, session, loading, signIn, signOut } = useAuth()
```

- `user`: Current authenticated user object
- `session`: Current session object
- `loading`: Boolean indicating if auth state is loading
- `signIn(email, password)`: Function to sign in a user
- `signOut()`: Function to sign out the current user

### Protected Routes

Wrap any component that requires authentication with `ProtectedRoute`:

```tsx
<ProtectedRoute>
  <YourComponent />
</ProtectedRoute>
```
