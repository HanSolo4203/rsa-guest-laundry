# Supabase Realtime Setup for Dashboard Refresh

## ✅ What Was Added

I've implemented **Supabase Realtime** to detect database changes in real-time. The refresh button will now flash when:

- ✅ Bookings are **added** (INSERT)
- ✅ Bookings are **updated** (UPDATE)  
- ✅ Bookings are **deleted** (DELETE)
- ✅ Changes happen **anywhere** (Supabase dashboard, API, other sessions, etc.)

## 🔧 Setup Required

Supabase Realtime needs to be enabled for the `bookings` table. Follow these steps:

### Step 1: Enable Realtime in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Replication** (in the left sidebar)
3. Find the `bookings` table in the list
4. Toggle the **Realtime** switch to **ON** for the `bookings` table
5. Click **Save** or **Apply Changes**

### Step 2: Verify Realtime is Working

1. Run your development server: `npm run dev`
2. Open the dashboard in your browser
3. Open browser DevTools Console (F12)
4. Make a change to the bookings table (add/update/delete a booking via Supabase dashboard)
5. You should see: `"Database change detected:"` in the console
6. The refresh button should flash with a yellow ring and notification badge

### Alternative: Enable via SQL

If you prefer SQL, run this in the Supabase SQL Editor:

```sql
-- Enable realtime for bookings table
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
```

## 🔍 How It Works

### Code Implementation

The dashboard now subscribes to database changes:

```typescript
useEffect(() => {
  const supabase = createClient()
  
  const channel = supabase
    .channel('bookings-changes')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'bookings'
      },
      (payload) => {
        console.log('Database change detected:', payload)
        setHasNewData(true) // Trigger refresh button flash
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])
```

### Event Types

The subscription listens for:
- `INSERT` - New booking created
- `UPDATE` - Booking status/details changed
- `DELETE` - Booking removed

### Payload Structure

When a change occurs, you'll see this in the console:

```javascript
{
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  new: { /* new record data */ },
  old: { /* old record data (for UPDATE/DELETE) */ },
  schema: 'public',
  table: 'bookings',
  commit_timestamp: '...'
}
```

## 🧪 Testing

### Test 1: Database Insert
1. Go to Supabase Dashboard → Table Editor → bookings
2. Insert a new booking manually
3. Check dashboard - refresh button should flash

### Test 2: Database Update  
1. In Supabase, edit an existing booking (change status)
2. Check dashboard - refresh button should flash

### Test 3: Database Delete
1. In Supabase, delete a booking
2. Check dashboard - refresh button should flash

### Test 4: Multiple Sessions
1. Open dashboard in two browser tabs
2. Create a booking in tab 1
3. Tab 2's refresh button should flash automatically

## 🐛 Troubleshooting

### Refresh button not flashing?

1. **Check Realtime is enabled**
   - Supabase Dashboard → Database → Replication
   - Ensure `bookings` table has Realtime ON

2. **Check browser console**
   - Look for "Database change detected:" messages
   - Look for any Supabase connection errors

3. **Check your .env files**
   - Ensure `NEXT_PUBLIC_SUPABASE_URL` is set
   - Ensure `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set

4. **Check Supabase plan**
   - Free tier: Realtime is included ✅
   - Make sure your project is active

### Still not working?

Try this diagnostic:
```typescript
// Add to dashboard page temporarily
useEffect(() => {
  const supabase = createClient()
  
  supabase.channel('test').subscribe((status) => {
    console.log('Realtime status:', status)
  })
}, [])
```

Expected output: `"Realtime status: SUBSCRIBED"`

## 📝 Files Modified

- ✅ `/src/app/dashboard/page.tsx` - Added Realtime subscription
- ✅ Build successful - No errors

## 🚀 Next Steps

1. Enable Realtime in Supabase (see Step 1 above)
2. Test the refresh button
3. Enjoy real-time database change detection!

---

**Note:** Realtime subscriptions are cleaned up automatically when the component unmounts, so there are no memory leaks.
