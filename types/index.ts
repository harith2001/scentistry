export interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  stock: number;
  images?: string[];
  ingredients?: string;
  scents?: string[];
  moods?: string[];
  limitedEdition?: boolean;
  sku?: string;
  createdAt?: any;
}

export type OrderStatus = 'pending_payment' | 'paid' | 'preparing' | 'shipped' | 'completed';

export interface Order {
  id: string;
  userId?: string;
  items: Array<{ id: string; title: string; price: number; qty: number; }>;
  total: number;
  customer: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    postalCode: string;
    city: string;
  };
  gift?: {
    enabled: boolean;
    recipientName?: string;
    phone?: string;
    email?: string;
    address?: string;
    postalCode?: string;
    city?: string;
  };
  slipUrl?: string;
  code: string; // order code for bank transfer remark
  status: OrderStatus;
  createdAt?: any;
}
