export type Language = 'fa' | 'ps';

export type ProductCategory =
  | 'men'
  | 'women'
  | 'winter'
  | 'summer'
  | 'shoes'
  | 'accessories';

export type FilterCategory = ProductCategory | 'all' | 'new' | 'sale' | 'wishlist';

export type PaymentMethod = 'cod' | 'online' | 'whatsapp';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type ShippingStatus =
  | 'pending'
  | 'confirmed'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface Product {
  id: string;
  nameDari: string;
  namePashto: string;
  descriptionDari: string;
  descriptionPashto: string;
  category: ProductCategory;
  priceAfn: number;
  discountPriceAfn: number;
  stock: number;
  sizes: string[];
  colors: string[];
  imageUrl: string;
  isNew: boolean;
  isFeatured: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CartItem {
  product: Product;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  nameDari: string;
  namePashto: string;
  size: string;
  color: string;
  quantity: number;
  unitPriceAfn: number;
}

export interface Order {
  id: string;
  orderCode: string;
  userId: string;
  customerName: string;
  phone: string;
  province: string;
  address: string;
  notes: string;
  items: OrderItem[];
  subtotalAfn: number;
  deliveryFeeAfn: number;
  pointsRedeemed?: number;
  pointsDiscountAfn?: number;
  pointsEarned?: number;
  totalAfn: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingStatus: ShippingStatus;
  trackingNumber: string;
  courierName: string;
  whatsappNotified: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrderTracking {
  orderId: string;
  orderCode: string;
  province: string;
  totalAfn: number;
  paymentMethod: PaymentMethod;
  shippingStatus: ShippingStatus;
  courierName: string;
  trackingNumber: string;
  updatedAt?: unknown;
}

export interface SupportMessage {
  id: string;
  customerUid: string;
  senderRole: 'customer' | 'operator' | 'system';
  senderName: string;
  text: string;
  channel: 'web' | 'whatsapp';
  createdAt: string;
}

export interface SupportThreadSummary {
  threadId: string;
  customerUid: string;
  customerName: string;
  customerPhone: string;
  channel: 'web' | 'whatsapp';
  status: 'open' | 'resolved';
  lastMessage: string;
  updatedAt: string;
  source: 'firestore' | 'server';
}

export interface WhatsAppLog {
  id: string;
  orderCode: string;
  recipientPhone: string;
  templateName: string;
  messagePreview: string;
  deliveryMode: 'cloud_api' | 'wa_me_link';
  status: 'sent' | 'queued' | 'failed';
  createdAt?: unknown;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  province: string;
  address: string;
  preferredLanguage: Language;
  role: 'customer';
  points: number;
  lastOrderId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WishlistItem {
  userId: string;
  productId: string;
  nameDari: string;
  namePashto: string;
  category: ProductCategory;
  priceAfn: number;
  discountPriceAfn: number;
  imageUrl: string;
  createdAt?: unknown;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt?: unknown;
}

export interface BackInStockRequest {
  id: string;
  productId: string;
  productNameDari: string;
  email: string;
  userId: string;
  status: 'pending' | 'notified';
  createdAt?: unknown;
}
