export interface Resident {
  id: string;
  name: string;
  flatNumber: string;
  contact: string;
  role?: 'President' | 'Secretary' | 'Owner' | 'Tenant' | 'Admin';
}

export interface Transaction {
  id: string;
  date: string;
  type: 'REVENUE' | 'EXPENSE';
  category: string;
  amount: number;
  description: string;
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'NET_BANKING' | 'CHEQUE' | 'ADJUSTMENT';
  spender?: string; // For expenses: who spent it
  isRefundable?: boolean; // For expenses: is the spender liable for refund
  isSettled?: boolean; // For refunds: has it been adjusted against maintenance?
  residentId?: string; // For revenue: who paid (link to resident)
  invoiceImage?: string; // Base64 string of the invoice image (legacy)
  invoiceImages?: string[]; // Array of Base64 strings of the invoice images
  isReimbursement?: boolean; // Flag to indicate if this is a cash reimbursement to a resident
  applicableMonth?: string; // Format: YYYY-MM, used for advance/late payments
}

export interface AppData {
  residents: Resident[];
  transactions: Transaction[];
}
