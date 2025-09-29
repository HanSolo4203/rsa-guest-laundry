export interface Service {
  id: string;
  name: string;
  price: string; // Changed to string to support price ranges like "R170-R470"
  created_at: string;
}

export interface Booking {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  service_id: string;
  collection_date: string;
  departure_date: string;
  status: 'pending' | 'confirmed' | 'collected' | 'processing' | 'completed' | 'cancelled';
  total_price?: number;
  additional_details?: string;
  created_at: string;
  completed_at?: string;
  payment_method?: 'card' | 'cash';
  weight_kg?: number;
}

export interface BookingWithService extends Booking {
  service: Service;
}
