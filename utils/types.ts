export interface Category {
  id: string;
  name: string;
  is_active: boolean;
}

export interface User {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  user_type: number;
  plan: string;
  email_verified: boolean;
  notification_email: boolean;
  created_at: string;
}

export interface Verification {
  user_id: string;
  is_id_verified: boolean;
  is_company_registered: boolean;
}

export interface Provider {
  user_id: string;
  business_name: string;
  category: string;
  categories: string[];
  provider_image: string;
  provider_name: string;
  provider_plan: string;
  plan: string;
  plan_name: string;
  is_id_verified: boolean;
  is_company_registered: boolean;
  latitude?: string;
  longitude?: string;
  city?: string;
  description?: string;
  profile_picture?: string;
  logo_url?: string;
  phone?: string;
  subscription_provider?: string;
  subscription_id?: string;
  created_at?: string;
}

export interface Rating {
  provider_id: string;
  user_id: string;
  rating: number;
  id: string;
  created_at: string;
}

export interface AverageRating {
  avg: number;
  count: number;
  userRating: number;
  allUserRatings: { userName: string; rating: number }[];
}

export interface CityCoordinates {
  lat: number;
  lon: number;
}

export type ViewMode = 'list' | 'grid';