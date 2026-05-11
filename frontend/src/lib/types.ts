export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  role: 'customer' | 'seller' | 'admin';
  is_banned: boolean;
  address_line1: string | null;
  city: string | null;
  governorate: string | null;
  postal_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  phone: string | null;
  email: string | null;
  governorate: string | null;
  address: string | null;
  is_approved: boolean;
  is_active: boolean;
  commission_rate: number;
  total_sales: number;
  total_revenue: number;
  rating_avg: number;
  review_count: number;
  subscription_status?: string | null;
  subscription_plan_id?: string | null;
  subscription_interval?: string | null;
  subscription_current_period_end?: string | null;
  subscription_next_payment_date?: string | null;
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  amount: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  billing_cycle_days: number;
}

export interface SellerSubscription {
  id: string;
  seller_id: string;
  store_id: string;
  plan_id: string;
  plan_name: string;
  plan_description: string | null;
  interval: string;
  amount: number;
  currency: string;
  status: string;
  current_period_end: string | null;
  next_payment_date: string | null;
  payment_url: string | null;
  konnect_payment_id: string | null;
  konnect_session_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
}

export interface Product {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_price: number | null;
  stock_qty: number;
  tags: string[] | null;
  is_published: boolean;
  is_featured: boolean;
  is_approved: boolean;
  view_count: number;
  sold_count: number;
  rating_avg: number;
  review_count: number;
  created_at: string;
  store?: Store;
  category?: Category;
  product_images?: ProductImage[];
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: {
    id: string;
    name: string;
    price: number;
    stock_qty: number;
    store_id?: string;
    product_images?: { url: string; is_primary: boolean }[];
  };
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_method: string;
  payment_status: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  ship_full_name: string;
  ship_phone: string;
  ship_address_line1: string;
  ship_city: string;
  ship_governorate: string;
  notes: string | null;
  created_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  store_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  commission_rate: number;
  seller_earnings: number;
  item_status: string;
}

export interface Review {
  id: string;
  product_id: string;
  customer_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  customer?: Profile;
}

export const TUNISIAN_GOVERNORATES = [
  'Ariana',
  'Béja',
  'Ben Arous',
  'Bizerte',
  'Gabès',
  'Gafsa',
  'Jendouba',
  'Kairouan',
  'Kasserine',
  'Kébili',
  'Kef',
  'Mahdia',
  'Manouba',
  'Médenine',
  'Monastir',
  'Nabeul',
  'Sfax',
  'Sidi Bouzid',
  'Siliana',
  'Sousse',
  'Tataouine',
  'Tozeur',
  'Tunis',
  'Zaghouan',
];

export function formatPrice(price: number): string {
  return `${price.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`;
}

export function getDiscountPercent(price: number, comparePrice: number | null): number {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}
