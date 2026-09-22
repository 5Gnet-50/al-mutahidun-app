export type UserRole = 'user' | 'agent' | 'marketer' | 'admin';
export type UserStatus = 'active' | 'suspended';
export type AgentStatus = 'pending' | 'active' | 'suspended';
export type CardStatus = 'available' | 'sold' | 'exchanged' | 'unavailable';
export type GiftStatus = 'available' | 'used' | 'expired';
export type TransactionType = 'purchase' | 'exchange' | 'gift_sent' | 'gift_received' | 'refund';
export type TransactionStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'refunded';
export type PaymentMethod = 'kuraimi' | 'amqi' | 'qatibi' | 'inma';
export type PaymentStatus = 'pending' | 'success' | 'failed';
export type ExchangeStatus = 'pending' | 'success' | 'failed';
export type NotificationType = 'payment' | 'gift' | 'exchange' | 'card' | 'system' | 'issue';
export type TicketStatus = 'open' | 'in_progress' | 'closed';

export interface Profile {
  id: string;
  name: string;
  username: string;
  phone: string;
  email: string | null;
  role: UserRole;
  balance: number;
  avatar_url: string | null;
  status: UserStatus;
  created_at: string;
}

export interface Gift {
  id: string;
  name: string;
  value: number;
  price: number;
  description: string | null;
  terms: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Network {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Card {
  id: string;
  network_id: string;
  value: number;
  code: string;
  status: CardStatus;
  assigned_to_user_id: string | null;
  assigned_at: string | null;
  created_at: string;
  network?: Network;
}

export interface UserGift {
  id: string;
  user_id: string;
  gift_id: string;
  status: GiftStatus;
  gifted_to_user_id: string | null;
  created_at: string;
  used_at: string | null;
  gift?: Gift;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  reference: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  gift_id: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  reference: string;
  created_at: string;
  gift?: Gift;
}

export interface Exchange {
  id: string;
  user_id: string;
  user_gift_id: string;
  network_id: string;
  card_id: string;
  status: ExchangeStatus;
  reference: string;
  created_at: string;
  card?: Card;
  network?: Network;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  tracking_number: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  entity: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface Plan {
  id: string;
  network_id: string;
  name: string;
  value: number;
  duration_hours: number;
  speed_mbps: number | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  network?: Network;
}

export interface AgentProfile {
  id: string;
  user_id: string;
  commission_rate: number;
  total_sales: number;
  total_commission: number;
  status: AgentStatus;
  permissions: Record<string, unknown>;
  created_at: string;
  profile?: Profile;
}
