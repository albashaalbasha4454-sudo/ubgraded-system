export interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
  category?: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  date: string;
  items: InvoiceItem[];
  total: number;
  type: 'sale' | 'return';
  originalInvoiceId?: string;
}

export interface User {
  id:string;
  username: string;
  password: string; // In a real app, this should be a hash
  role: 'admin' | 'cashier';
}

export interface ReturnRequest {
  id: string;
  originalInvoiceId: string;
  originalInvoiceDate: string;
  requestedBy: string;
  requestDate: string;
  items: InvoiceItem[];
  status: 'pending' | 'approved' | 'rejected';
  processedBy?: string;
  processedDate?: string;
}

export type View = 'pos' | 'products' | 'invoices' | 'reports' | 'settings' | 'users' | 'return-requests';