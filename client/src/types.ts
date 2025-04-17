export interface Transaction {
  id: number;
  type: string;
  accountId: number;
  amount: number;
  date: string;
  paymentMethod: string;
  notes?: string;
  reference?: string;
  isDebit?: boolean;
  account?: {
    name: string;
  };
}

export interface Account {
  id: number;
  name: string;
  type: string;
  currentBalance: number;
}

export interface TransactionFormValues {
  type: string;
  accountId: number;
  amount: number;
  date: string;
  paymentMethod: string;
  notes?: string;
  reference?: string;
  isDebit?: boolean;
}

export interface ExcelProduct {
  الكود: string;
  الاسم: string;
  الفئة: string;
  الوحدة: string;
  'سعر التكلفة': number;
  'سعر البيع': number;
  الكمية: number;
}

export interface DataTableProps {
  data: any[];
  columns: any[];
  isLoading?: boolean;
  emptyMessage?: string;
  searchable?: boolean;
  placeholder?: string;
  showActions?: boolean;
  totals?: Record<string, number>;
  onDeleteSelected?: (ids: number[]) => void;
  onRefresh?: () => void;
  onAddNew?: () => void;
  onDownload?: () => void;
} 