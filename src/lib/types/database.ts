export interface Service {
  id: string;
  name: string;
  price: string; // Changed to string to support price ranges like "R170-R470"
  created_at: string;
}

export interface ServicePricingTier {
  id: string;
  service_id: string;
  min_weight: number;
  max_weight: number;
  price: number;
  created_at: string;
}

export type BookingStage = 'to_weigh' | 'washing' | 'drying' | 'finishing' | 'ready';

export type BookingSource = 'guest' | 'portal' | 'admin';

export type BookingPaymentStatus = 'unpaid' | 'pending' | 'paid' | 'topup_due' | 'pay_on_delivery';

export type PaymentKind = 'booking' | 'topup';

export type OnlinePaymentStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'expired';

export interface Payment {
  id: string;
  booking_id: string;
  kind: PaymentKind;
  amount_cents: number;
  currency: string;
  status: OnlinePaymentStatus;
  yoco_checkout_id: string | null;
  yoco_payment_id: string | null;
  prepaid_tier_max_kg: number | null;
  created_at: string;
  paid_at: string | null;
}

export type MachineType = 'washer' | 'dryer';

export interface Machine {
  id: string;
  number: number;
  name: string | null;
  type: MachineType;
  active: boolean;
  created_at: string;
}

export interface Staff {
  id: string;
  name: string;
  pin_hash: string;
  active: boolean;
  created_at: string;
}

export type PropertyBackgroundType = 'image' | 'video' | 'none';

export interface Property {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  logo_url: string | null;
  background_url: string | null;
  background_type: PropertyBackgroundType;
  primary_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  text_color: string | null;
  button_text_color: string | null;
  font: string;
  heading: string;
  welcome_message: string | null;
  contact_info: string | null;
  ask_room_number: boolean;
  show_prices: boolean;
  created_at: string;
}

export interface PropertyService {
  property_id: string;
  service_id: string;
}

export interface Booking {
  id: string;
  property_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  room_number: string | null;
  service_id: string;
  collection_date: string;
  departure_date: string;
  status: 'pending' | 'confirmed' | 'collected' | 'processing' | 'completed' | 'cancelled' | 'delivered';
  total_price?: number;
  additional_details?: string;
  created_at: string;
  completed_at?: string;
  payment_method?: 'card' | 'cash';
  weight_kg?: number;
  machine_number?: number | null;
  dryer_number?: number | null;
  stage: BookingStage;
  weighed_by?: string | null;
  weighed_at?: string | null;
  washing_at?: string | null;
  drying_at?: string | null;
  finishing_at?: string | null;
  ready_at?: string | null;
  ready_acknowledged_at?: string | null;
  out_for_delivery_at?: string | null;
  delivered_at?: string | null;
  received_at?: string | null;
  source: BookingSource;
  created_by?: string | null;
  payment_status?: BookingPaymentStatus;
  prepaid_amount_cents?: number | null;
  prepaid_tier_max_kg?: number | null;
}

export interface BookingPropertyTag {
  id: string;
  name: string;
  primary_color: string | null;
}

export interface BookingWithService extends Booking {
  service: Service;
  weigher_name?: string | null;
  property?: BookingPropertyTag | null;
}

export interface KioskBooking {
  id: string;
  last_name: string;
  first_name: string;
  first_name_initial: string;
  service_name: string;
  stage: BookingStage;
  status: Booking['status'];
  machine_number: number | null;
  dryer_number: number | null;
  weight_kg: number | null;
  created_at: string;
  collection_date: string;
  departure_date: string;
  additional_details: string | null;
  ready_at: string | null;
  property_name: string;
  primary_color: string | null;
  room_number: string | null;
  source: BookingSource;
  payment_status: BookingPaymentStatus;
}

export interface PortalProperty {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  show_prices: boolean;
}

export interface PortalBooking {
  id: string;
  property_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  room_number: string | null;
  service_id: string;
  service_name: string;
  collection_date: string;
  departure_date: string;
  status: Booking['status'];
  stage: BookingStage;
  total_price: number | null;
  payment_method: 'card' | 'cash' | null;
  weight_kg: number | null;
  machine_number: number | null;
  dryer_number: number | null;
  additional_details: string | null;
  created_at: string;
  completed_at: string | null;
  weighed_at: string | null;
  washing_at: string | null;
  drying_at: string | null;
  finishing_at: string | null;
  ready_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  received_at: string | null;
  source: BookingSource;
  created_by: string | null;
  payment_status: BookingPaymentStatus;
}

export type PropertyMemberRole = 'manager' | 'staff'

export interface PropertyMember {
  userId: string
  email: string
  memberRole: PropertyMemberRole
  createdAt: string
}
