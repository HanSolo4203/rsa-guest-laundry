export interface Service {
  id: string;
  name: string;
  price: number;
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
}

export interface BookingWithService extends Booking {
  service: Service;
}
