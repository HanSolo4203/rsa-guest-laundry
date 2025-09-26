-- Add an optional text column for customer notes/special needs
alter table public.bookings
add column if not exists additional_details text;

comment on column public.bookings.additional_details is 'Customer-provided notes or special requests';

