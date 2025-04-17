import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Icons
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Download, 
  Printer, 
  Pencil,
  Trash,
  RefreshCw,
  DollarSign,
  FileText,
  Upload,
  FileDown,
} from "lucide-react";

// Form handling
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Excel utils
import { exportTransactionsToExcel, getExcelTemplate, importFromExcel, ExcelTransaction } from "@/lib/excel-utils";

// Transaction type schema for form validation
const transactionFormSchema = z.object({
  type: z.string().min(1, { message: "نوع المعاملة مطلوب" }),
  accountId: z.number({ required_error: "الحساب مطلوب" }),
  amount: z.number().min(0.01, { message: "المبلغ يجب أن يكون أكبر من 0" }),
  date: z.string().min(1, { message: "التاريخ مطلوب" }),
  paymentMethod: z.string().min(1, { message: "طريقة الدفع مطلوبة" }),
  notes: z.string().optional(),
  reference: z.string().optional(),
  isDebit: z.boolean().optional(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface Transaction {
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

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  accounts: any[];
}

function TransactionForm({ isOpen, onClose, transaction, accounts }: TransactionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [showDebitCredit, setShowDebitCredit] = useState(false);
  
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: transaction?.type || "credit",
      accountId: transaction?.accountId || (accounts[0]?.id || 0),
      amount: transaction?.amount || 0,
      date: transaction?.date ? new Date(transaction.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      paymentMethod: transaction?.paymentMethod || "bank",
      notes: transaction?.notes || "",
      reference: transaction?.reference || "",
      isDebit: transaction?.isDebit !== undefined ? transaction.isDebit : true,
    },
  });
  
  // Find account details when accountId changes
  useEffect(() => {
    const accountId = form.watch('accountId');
    const foundAccount = accounts.find((a: any) => a.id === accountId);
    setSelectedAccount(foundAccount);
  }, [form.watch('accountId'), accounts]);
  
  // Show/hide debit/credit field based on transaction type
  useEffect(() => {
    const type = form.watch('type');
    setShowDebitCredit(type === 'journal');
  }, [form.watch('type')]);
  
  // Fill amount to match account balance
  const fillAccountBalance = () => {
    if (selectedAccount && selectedAccount.currentBalance) {
      // Use absolute value for the form, but preserve sign for debit/credit suggestion
      const balance = Math.abs(selectedAccount.currentBalance);
      form.setValue('amount', balance);
      
      // Suggest transaction type based on balance direction
      if (selectedAccount.currentBalance < 0) {
        form.setValue('type', 'credit'); // Customer owes money, so they're paying (credit)
      } else if (selectedAccount.currentBalance > 0) {
        form.setValue('type', 'debit'); // We owe customer money, so we're paying (debit)
      }
    }
  };
  
  const onSubmit = async (data: TransactionFormValues) => {
    setIsSubmitting(true);
    try {
      if (transaction) {
        // Update existing transaction
        await apiRequest(`/api/transactions/${transaction.id}`, "PATCH", data);
        toast({
          title: "تم التحديث بنجاح",
          description: "تم تحديث المعاملة المالية بنجاح",
        });
      } else {
        // Create new transaction
        await apiRequest("/api/transactions", "POST", data);
        toast({
          title: "تم الإنشاء بنجاح",
          description: "تم إنشاء المعاملة المالية بنجاح",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      onClose();
    } catch (error) {
      console.error("Error saving transaction:", error);
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ المعاملة المالية",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[400px] overflow-y-auto p-3">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-sm font-medium">
            {transaction ? "تعديل معاملة" : "إضافة معاملة جديدة"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel className="text-xs">النوع</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="اختر النوع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="credit">قبض</SelectItem>
                        <SelectItem value="debit">صرف</SelectItem>
                        <SelectItem value="journal">قيد يومية</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel className="text-xs">التاريخ</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-7 text-xs" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">الحساب</FormLabel>
                  <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="اختر الحساب" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedAccount?.currentBalance !== undefined && (
                    <div className="mt-0.5 text-xs flex items-center justify-between">
                      <span className={selectedAccount.currentBalance < 0 ? "text-red-500" : "text-green-500"}>
                        {Math.abs(selectedAccount.currentBalance).toFixed(2)} ج.م
                        {selectedAccount.currentBalance < 0 ? " (مدين)" : " (دائن)"}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={fillAccountBalance}
                        className="h-5 text-xs px-1"
                      >
                        استخدام الرصيد
                      </Button>
                    </div>
                  )}
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">المبلغ</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-7 text-xs"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">طريقة الدفع</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="طريقة الدفع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">نقدي</SelectItem>
                        <SelectItem value="bank">تحويل بنكي</SelectItem>
                        <SelectItem value="check">شيك</SelectItem>
                        <SelectItem value="card">بطاقة ائتمان</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">ملاحظات</FormLabel>
                    <FormControl>
                      <Input className="h-7 text-xs" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">المرجع</FormLabel>
                    <FormControl>
                      <Input className="h-7 text-xs" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="h-7 text-xs px-2"
              >
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="h-7 text-xs px-2"
              >
                {isSubmitting ? "جاري..." : "حفظ"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function FinanceView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [transactionType, setTransactionType] = useState("all");
  const [accountFilter, setAccountFilter] = useState<number | null>(null);
  
  // Financial report states
  const [reportType, setReportType] = useState("income");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().substring(0, 10);
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().substring(0, 10));
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  // Fetch transactions
  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/transactions'],
    queryFn: async () => {
      return apiRequest('/api/transactions', 'GET');
    }
  });

  // Fetch accounts for dropdown
  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: async () => {
      return apiRequest('/api/accounts', 'GET');
    }
  });
  
  // Fetch financial report data
  const { 
    data: reportData = {}, 
    isLoading: isReportLoading,
    isError: isReportError,
    refetch: refetchReport 
  } = useQuery({
    queryKey: ['/api/finance/reports', reportType, startDate, endDate],
    queryFn: async () => {
      return apiRequest(`/api/finance/reports?type=${reportType}&startDate=${startDate}&endDate=${endDate}`, 'GET');
    },
    enabled: reportType !== 'accounts' || !selectedAccountId
  });

  // Fetch account statement data when needed
  const { 
    data: statementData = {}, 
    isLoading: isStatementLoading,
    isError: isStatementError,
    refetch: refetchStatement
  } = useQuery({
    queryKey: ['/api/accounts/statement', selectedAccountId, startDate, endDate],
    queryFn: async () => {
      if (!selectedAccountId) return null;
      return apiRequest(`/api/accounts/${selectedAccountId}/statement?startDate=${startDate}&endDate=${endDate}`, 'GET');
    },
    enabled: reportType === 'accounts' && !!selectedAccountId
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle Excel import
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const transactions = await importFromExcel<ExcelTransaction>(file);
      
      // Create transactions one by one
      for (const transaction of transactions) {
        const accountName = transaction['اسم الحساب'];
        const account = await apiRequest('/api/accounts/search', 'POST', { query: accountName });
        
        if (!account) {
          throw new Error(`لم يتم العثور على الحساب: ${accountName}`);
        }

        const transactionData = {
          date: new Date(transaction.التاريخ),
          accountId: account.id,
          type: getTransactionTypeKey(transaction['نوع المعاملة']),
          amount: transaction.المبلغ,
          paymentMethod: getPaymentMethodKey(transaction['طريقة الدفع']),
          notes: transaction.الملاحظات
        };

        await apiRequest('/api/transactions', 'POST', transactionData);
      }
      
      toast({
        title: "تم الاستيراد بنجاح",
        description: `تم استيراد ${transactions.length} معاملة`,
      });
      
      // Refresh transactions list
      refetch();
      
    } catch (error) {
      console.error('Error importing transactions:', error);
      toast({
        title: "خطأ في الاستيراد",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء استيراد المعاملات. يرجى التحقق من تنسيق الملف.",
        variant: "destructive",
      });
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle Excel export
  const handleExportExcel = () => {
    if (!transactions) return;
    exportTransactionsToExcel(transactions);
  };
  
  // Handle template download
  const handleDownloadTemplate = () => {
    getExcelTemplate('transactions');
  };

  // Helper functions
  const getTransactionTypeKey = (arabicType: string): string => {
    const typeMap: { [key: string]: string } = {
      'دفع': 'payment',
      'قبض': 'receipt',
      'مصروف': 'expense',
      'إيراد': 'revenue'
    };
    return typeMap[arabicType] || arabicType;
  };

  const getPaymentMethodKey = (arabicMethod: string): string => {
    const methodMap: { [key: string]: string } = {
      'نقدي': 'cash',
      'تحويل بنكي': 'bank',
      'شيك': 'check',
      'بطاقة ائتمان': 'card'
    };
    return methodMap[arabicMethod] || arabicMethod;
  };

  // Filter transactions based on search term, type, and account
  const filteredTransactions = transactions.filter((transaction: Transaction) => {
    const matchesSearch = 
      transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.amount.toString().includes(searchTerm);
    
    let matchesType = false;
    if (transactionType === 'all') {
      matchesType = true;
    } else if (transactionType === 'credit' && transaction.type === 'credit') {
      matchesType = true;
    } else if (transactionType === 'debit' && transaction.type === 'debit') {
      matchesType = true;
    } else if (transactionType === 'journal' && transaction.type === 'journal') {
      matchesType = true;
    } else if (transactionType === 'journal_debit' && transaction.type === 'journal' && transaction.isDebit) {
      matchesType = true;
    } else if (transactionType === 'journal_credit' && transaction.type === 'journal' && !transaction.isDebit) {
      matchesType = true;
    }
    
    const matchesAccount = !accountFilter || transaction.accountId === accountFilter;
    
    return matchesSearch && matchesType && matchesAccount;
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "yyyy-MM-dd", { locale: ar });
    } catch (e) {
      return dateString;
    }
  };

  // Get transaction type badge
  const getTransactionTypeBadge = (type: string, isDebit?: boolean) => {
    if (type === "credit") {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">قبض</Badge>;
    } else if (type === "debit") {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">دفع</Badge>;
    } else if (type === "journal") {
      if (isDebit) {
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">مدين</Badge>;
      } else {
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">دائن</Badge>;
      }
    } else {
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">{type}</Badge>;
    }
  };

  // Get account name by ID
  const getAccountName = (accountId: number) => {
    const account = accounts.find((a: any) => a.id === accountId);
    return account ? account.name : "";
  };

  // Get payment method label
  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "cash": return "نقدي";
      case "bank": return "بنك";
      case "check": return "شيك";
      case "card": return "بطاقة ائتمان";
      default: return method;
    }
  };

  // Handle opening form to create a new transaction
  const handleCreateTransaction = () => {
    setTransactionToEdit(null);
    setIsFormOpen(true);
  };

  // Handle opening form to edit an existing transaction
  const handleEditTransaction = (transaction: Transaction) => {
    setTransactionToEdit(transaction);
    setIsFormOpen(true);
  };

  // Handle transaction deletion
  const handleDeleteTransaction = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذه المعاملة؟')) {
      return;
    }
    
    try {
      await apiRequest(`/api/transactions/${id}`, "DELETE");
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف المعاملة المالية بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    } catch (error) {
      toast({
        title: "خطأ في الحذف",
        description: "حدث خطأ أثناء حذف المعاملة المالية",
        variant: "destructive",
      });
    }
  };

  // Print account statement
  const printAccountStatement = useCallback(() => {
    if (!statementData || !statementData.account) {
      toast({
        title: "خطأ",
        description: "لا يمكن طباعة كشف الحساب، تأكد من اختيار حساب أولاً",
        variant: "destructive",
      });
      return;
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "خطأ",
        description: "فشل في فتح نافذة الطباعة. يرجى التأكد من عدم حظر النوافذ المنبثقة.",
        variant: "destructive",
      });
      return;
    }

    // Get company settings if available
    const settings = queryClient.getQueryData<any>(['/api/settings']);
    const companyName = settings?.companyName || 'شركة النظام المحاسبي';
    const companyAddress = settings?.address || '';
    const companyPhone = settings?.phone || '';
    const currencySymbol = settings?.currencySymbol || 'ج.م';

    // Create print content
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>كشف حساب - ${statementData.account.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            direction: rtl;
          }
          .report-header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
          }
          .company-name {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .company-info {
            font-size: 14px;
            color: #555;
            margin-bottom: 5px;
          }
          .report-title {
            font-size: 18px;
            font-weight: bold;
            margin: 15px 0;
            text-decoration: underline;
          }
          .account-info {
            text-align: center;
            margin-bottom: 20px;
          }
          .account-name {
            font-size: 16px;
            font-weight: bold;
          }
          .account-type {
            font-size: 14px;
            color: #555;
          }
          .date-range {
            font-size: 14px;
            margin-top: 5px;
          }
          .summary-cards {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
          }
          .summary-card {
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 10px;
            flex: 1;
            margin: 0 5px;
            text-align: center;
          }
          .summary-card-title {
            font-size: 14px;
            color: #555;
            margin-bottom: 5px;
          }
          .summary-card-value {
            font-size: 16px;
            font-weight: bold;
          }
          .statement-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          .statement-table th, .statement-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: right;
          }
          .statement-table th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .statement-table .numeric {
            text-align: left;
          }
          .statement-table .highlight-row {
            background-color: #f8f8f8;
          }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            text-align: center;
          }
          .badge-debit {
            background-color: #fee2e2;
            color: #b91c1c;
          }
          .badge-credit {
            background-color: #d1fae5;
            color: #047857;
          }
          .badge-invoice {
            background-color: #dbeafe;
            color: #1e40af;
          }
          .badge-purchase {
            background-color: #f3e8ff;
            color: #6b21a8;
          }
          .badge-journal {
            background-color: #f3f4f6;
            color: #374151;
          }
          .green { color: #047857; }
          .red { color: #b91c1c; }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div class="company-name">${companyName}</div>
          ${companyAddress ? `<div class="company-info">${companyAddress}</div>` : ''}
          ${companyPhone ? `<div class="company-info">هاتف: ${companyPhone}</div>` : ''}
          <div class="report-title">كشف حساب</div>
        </div>
        
        <div class="account-info">
          <div class="account-name">${statementData.account.name}</div>
          <div class="account-type">
            ${statementData.account.type === 'customer' ? 'عميل' : 
              statementData.account.type === 'supplier' ? 'مورد' : 
              statementData.account.type === 'expense' ? 'مصروف' : 
              statementData.account.type === 'income' ? 'إيراد' : 
              statementData.account.type === 'bank' ? 'بنك' : 'نقدي'}
          </div>
          <div class="date-range">
            الفترة من ${new Date(statementData.periodStart || startDate).toLocaleDateString('ar-EG')} 
            إلى ${new Date(statementData.periodEnd || endDate).toLocaleDateString('ar-EG')}
          </div>
        </div>
        
        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-card-title">الرصيد الافتتاحي</div>
            <div class="summary-card-value">${statementData.startingBalance?.toFixed(2)} ${currencySymbol}</div>
          </div>
          <div class="summary-card">
            <div class="summary-card-title">صافي الحركة</div>
            <div class="summary-card-value ${statementData.netChange >= 0 ? 'green' : 'red'}">
              ${statementData.netChange?.toFixed(2)} ${currencySymbol}
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-card-title">الرصيد الختامي</div>
            <div class="summary-card-value ${statementData.endingBalance >= 0 ? 'green' : 'red'}">
              ${statementData.endingBalance?.toFixed(2)} ${currencySymbol}
            </div>
          </div>
        </div>
        
        <table class="statement-table">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>المرجع</th>
              <th>البيان</th>
              <th>النوع</th>
              <th class="numeric">مدين</th>
              <th class="numeric">دائن</th>
              <th class="numeric">الرصيد</th>
            </tr>
          </thead>
          <tbody>
            <tr class="highlight-row">
              <td>${new Date(statementData.periodStart || startDate).toLocaleDateString('ar-EG')}</td>
              <td>-</td>
              <td>رصيد افتتاحي</td>
              <td>-</td>
              <td class="numeric">-</td>
              <td class="numeric">-</td>
              <td class="numeric">${statementData.startingBalance?.toFixed(2)} ${currencySymbol}</td>
            </tr>
            
            ${statementData.transactions && statementData.transactions.map((transaction: {
              date: string;
              reference?: string;
              description?: string;
              type: string;
              isDebit: boolean;
              amount: number;
              balance: number;
            }, index: number) => `
              <tr>
                <td>${new Date(transaction.date).toLocaleDateString('ar-EG')}</td>
                <td>${transaction.reference || '-'}</td>
                <td>${transaction.description || '-'}</td>
                <td>
                  ${transaction.type === 'credit' ? 
                    '<span class="badge badge-credit">قبض</span>' : 
                    transaction.type === 'debit' ? 
                    '<span class="badge badge-debit">دفع</span>' : 
                    transaction.type === 'invoice' ? 
                    '<span class="badge badge-invoice">فاتورة</span>' : 
                    transaction.type === 'purchase' ? 
                    '<span class="badge badge-purchase">مشتريات</span>' : 
                    transaction.type === 'journal' && transaction.isDebit ? 
                    '<span class="badge badge-journal">مدين</span>' : 
                    '<span class="badge badge-journal">دائن</span>'}
                </td>
                <td class="numeric">${transaction.isDebit ? transaction.amount.toFixed(2) : '-'} ${transaction.isDebit ? currencySymbol : ''}</td>
                <td class="numeric">${!transaction.isDebit ? transaction.amount.toFixed(2) : '-'} ${!transaction.isDebit ? currencySymbol : ''}</td>
                <td class="numeric ${transaction.balance >= 0 ? 'green' : 'red'}">${transaction.balance.toFixed(2)} ${currencySymbol}</td>
              </tr>
            `).join('')}
            
            <tr class="highlight-row">
              <td>${new Date(statementData.periodEnd || endDate).toLocaleDateString('ar-EG')}</td>
              <td>-</td>
              <td>الإجمالي</td>
              <td>-</td>
              <td class="numeric">${statementData.totalDebits?.toFixed(2)} ${currencySymbol}</td>
              <td class="numeric">${statementData.totalCredits?.toFixed(2)} ${currencySymbol}</td>
              <td class="numeric ${statementData.endingBalance >= 0 ? 'green' : 'red'}">${statementData.endingBalance?.toFixed(2)} ${currencySymbol}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          تم إنشاء هذا التقرير في ${new Date().toLocaleString('ar-EG')}
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()">طباعة</button>
        </div>
      </body>
      </html>
    `;

    // Write content to the new window and print
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Auto print after content is loaded
    printWindow.onload = function() {
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    };
  }, [statementData, toast, queryClient, startDate, endDate]);

  // Export account statement as PDF
  const exportAccountStatement = useCallback(() => {
    // TODO: Implement PDF export functionality
    toast({
      title: "قريباً",
      description: "سيتم توفير هذه الخاصية قريباً",
      variant: "default",
    });
  }, [toast]);

  // Handle applying date filters for reports
  const handleApplyDateFilter = () => {
    if (reportType === 'accounts' && selectedAccountId) {
      refetchStatement();
      toast({
        title: "تم تحديث كشف الحساب",
        description: `تم تحديث كشف الحساب للفترة من ${startDate} إلى ${endDate}`,
      });
    } else {
      refetchReport();
      toast({
        title: "تم تحديث التقرير",
        description: `تم تحديث التقرير للفترة من ${startDate} إلى ${endDate}`,
      });
    }
  };

  return (
    <div className="container mx-auto p-2">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-green-600">المعاملات المالية</h2>
        <div className="flex items-center gap-1">
          {/* Excel Operations */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="flex items-center text-xs"
            >
              <FileDown className="h-3 w-3 ml-1" />
              <span>تحميل القالب</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center text-xs"
            >
              <Upload className="h-3 w-3 ml-1" />
              <span>استيراد</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="flex items-center text-xs"
            >
              <Download className="h-3 w-3 ml-1" />
              <span>تصدير</span>
            </Button>
            
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
            />
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
            <RefreshCw className="h-3 w-3 ml-1" />
            <span>تحديث</span>
          </Button>

          <Button 
            variant="default" 
            size="sm"
            className="bg-green-500 hover:bg-green-600 text-xs"
            onClick={() => setIsFormOpen(true)}
          >
            <Plus className="h-3 w-3 ml-1" />
            إضافة
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="transactions">
        <TabsList className="mb-2">
          <TabsTrigger value="transactions" className="text-sm">المعاملات المالية</TabsTrigger>
          <TabsTrigger value="reports" className="text-sm">تقارير مالية</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transactions">
          <Card>
            <CardContent className="p-2">
              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-3">
                <div className="relative w-[200px]">
                  <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-500" />
                  <Input 
                    placeholder="بحث..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-8 h-8 text-sm"
                  />
                </div>
              
                <Select value={transactionType} onValueChange={setTransactionType}>
                  <SelectTrigger className="w-[120px] h-8 text-sm">
                    <SelectValue placeholder="نوع المعاملة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="credit">قبض</SelectItem>
                    <SelectItem value="debit">دفع</SelectItem>
                    <SelectItem value="journal">قيود محاسبية</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select
                  value={accountFilter?.toString() || "all"}
                  onValueChange={(value) => setAccountFilter(value !== "all" ? parseInt(value) : null)}
                >
                  <SelectTrigger className="w-[150px] h-8 text-sm">
                    <SelectValue placeholder="الحساب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحسابات</SelectItem>
                    {accounts.map((account: any) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Transactions Table */}
              {isLoading ? (
                <div className="text-center py-10 text-sm">جاري تحميل البيانات...</div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-500">
                  لا توجد معاملات مالية للعرض
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs py-2">#</TableHead>
                        <TableHead className="text-xs py-2">التاريخ</TableHead>
                        <TableHead className="text-xs py-2">الحساب</TableHead>
                        <TableHead className="text-xs py-2">المبلغ</TableHead>
                        <TableHead className="text-xs py-2">النوع</TableHead>
                        <TableHead className="text-xs py-2">طريقة الدفع</TableHead>
                        <TableHead className="text-xs py-2">الملاحظات</TableHead>
                        <TableHead className="text-xs py-2 text-center w-[80px]">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction: Transaction) => (
                        <TableRow key={transaction.id} className="text-sm">
                          <TableCell className="py-1">{transaction.id}</TableCell>
                          <TableCell className="py-1">{formatDate(transaction.date)}</TableCell>
                          <TableCell className="py-1">
                            <div className="flex items-center">
                              <span>{getAccountName(transaction.accountId)}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 ml-1 text-green-600 hover:text-green-800 hover:bg-green-50"
                                onClick={() => {
                                  // Pre-fill the transaction form with the account details
                                  setTransactionToEdit({
                                    id: undefined, // This will be assigned by the server
                                    accountId: transaction.accountId,
                                    date: new Date().toISOString().split('T')[0],
                                    type: transaction.type === 'credit' ? 'credit' : 'debit',
                                    amount: 0,
                                    paymentMethod: 'cash',
                                    notes: ''
                                  } as any);
                                  setIsFormOpen(true);
                                }}
                                title="إضافة معاملة جديدة لهذا الحساب"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="py-1 font-semibold">
                            {transaction.amount.toFixed(2)} ج.م
                          </TableCell>
                          <TableCell className="py-1">{getTransactionTypeBadge(transaction.type, transaction.isDebit)}</TableCell>
                          <TableCell className="py-1">{getPaymentMethodLabel(transaction.paymentMethod)}</TableCell>
                          <TableCell className="py-1">
                            {transaction.notes}
                            {transaction.reference && (
                              <div className="text-xs text-gray-500">
                                {transaction.reference}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-1">
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleEditTransaction(transaction)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleDeleteTransaction(transaction.id)}
                              >
                                <Trash className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4 mb-6">
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="نوع التقرير" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">قائمة الدخل</SelectItem>
                    <SelectItem value="balance">الميزانية العمومية</SelectItem>
                    <SelectItem value="cashflow">التدفقات النقدية</SelectItem>
                    <SelectItem value="accounts">كشف حساب</SelectItem>
                  </SelectContent>
                </Select>

                {reportType === 'accounts' && (
                  <Select 
                    value={selectedAccountId?.toString() || ""} 
                    onValueChange={(value) => setSelectedAccountId(value ? parseInt(value) : null)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="اختر الحساب" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account: any) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="flex items-center gap-2">
                <Input 
                    type="date" 
                    className="w-[150px]" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                  />
                  <span>إلى</span>
                  <Input 
                    type="date"
                    className="w-[150px]" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                  />
                  <Button variant="outline" size="sm" onClick={handleApplyDateFilter}>
                    <Calendar className="ml-2 h-4 w-4" />
                    تطبيق
                  </Button>
                </div>
                
                <div className="flex-grow"></div>
                
                <Button variant="outline" size="sm" onClick={exportAccountStatement}>
                  <Download className="ml-2 h-4 w-4" />
                  تصدير PDF
                </Button>
                
                <Button variant="outline" size="sm" onClick={printAccountStatement}>
                  <Printer className="ml-2 h-4 w-4" />
                  طباعة
                </Button>
              </div>
              
              {isReportLoading || isStatementLoading ? (
                <div className="text-center py-20">جاري تحميل البيانات...</div>
              ) : isReportError || isStatementError ? (
                <div className="text-center py-20 text-red-500">
                  حدث خطأ أثناء تحميل التقرير. يرجى المحاولة مرة أخرى.
                </div>
              ) : reportType === 'income' ? (
                <>
                  {/* Income Statement */}
                  <div className="border rounded-md p-4 mb-4">
                    <h3 className="text-lg font-bold mb-4 text-center">قائمة الدخل</h3>
                    <h4 className="text-sm text-gray-500 mb-4 text-center">
                      للفترة من {new Date(reportData.periodStart).toLocaleDateString('ar-EG')} إلى {new Date(reportData.periodEnd).toLocaleDateString('ar-EG')}
                    </h4>
                    
                    <div className="space-y-4">
                      {/* Revenue Section */}
              <div>
                        <h5 className="font-bold mb-2">الإيرادات</h5>
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell>إيرادات المبيعات</TableCell>
                              <TableCell className="text-left">{reportData.revenue?.sales?.toFixed(2)} ج.م</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>إيرادات أخرى</TableCell>
                              <TableCell className="text-left">{reportData.revenue?.other?.toFixed(2)} ج.م</TableCell>
                            </TableRow>
                            <TableRow className="font-bold">
                              <TableCell>إجمالي الإيرادات</TableCell>
                              <TableCell className="text-left">{reportData.revenue?.total?.toFixed(2)} ج.م</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
              </div>
                      
                      {/* Expenses Section */}
                      <div>
                        <h5 className="font-bold mb-2">المصروفات</h5>
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell>تكلفة البضاعة المباعة</TableCell>
                              <TableCell className="text-left">{reportData.expenses?.cogs?.toFixed(2)} ج.م</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>رواتب الموظفين</TableCell>
                              <TableCell className="text-left">{reportData.expenses?.salaries?.toFixed(2)} ج.م</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>إيجار</TableCell>
                              <TableCell className="text-left">{reportData.expenses?.rent?.toFixed(2)} ج.م</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>مرافق</TableCell>
                              <TableCell className="text-left">{reportData.expenses?.utilities?.toFixed(2)} ج.م</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>مصروفات أخرى</TableCell>
                              <TableCell className="text-left">{reportData.expenses?.other?.toFixed(2)} ج.م</TableCell>
                            </TableRow>
                            <TableRow className="font-bold">
                              <TableCell>إجمالي المصروفات</TableCell>
                              <TableCell className="text-left">{reportData.expenses?.total?.toFixed(2)} ج.م</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
            </div>
            
                      {/* Net Income */}
                      <div className="border-t pt-2">
                        <Table>
                          <TableBody>
                            <TableRow className="font-bold text-lg">
                              <TableCell>صافي الربح</TableCell>
                              <TableCell className="text-left">{reportData.netIncome?.toFixed(2)} ج.م</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
            </div>
            
                  {/* Financial Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-500 mb-1">إجمالي الإيرادات</p>
                          <p className="text-2xl font-bold text-green-600">{reportData.revenue?.total?.toFixed(2)} ج.م</p>
                </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-500 mb-1">إجمالي المصروفات</p>
                          <p className="text-2xl font-bold text-red-600">{reportData.expenses?.total?.toFixed(2)} ج.م</p>
                </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-500 mb-1">صافي الربح</p>
                          <p className="text-2xl font-bold text-blue-600">{reportData.netIncome?.toFixed(2)} ج.م</p>
                </div>
                      </CardContent>
                    </Card>
              </div>
                </>
              ) : reportType === 'balance' ? (
                <div className="border rounded-md p-4 mb-4">
                  <h3 className="text-lg font-bold mb-4 text-center">الميزانية العمومية</h3>
                  <h4 className="text-sm text-gray-500 mb-4 text-center">
                    كما في {new Date(reportData.asOf).toLocaleDateString('ar-EG')}
                  </h4>
                  
                  {/* Balance Sheet details would go here */}
                  <div className="text-center py-4">
                    تم إظهار قائمة الدخل كمثال. يمكن توسيع هذا القسم لعرض الميزانية العمومية بناءً على البيانات المستلمة.
            </div>
                </div>
              ) : reportType === 'cashflow' ? (
                <div className="border rounded-md p-4 mb-4">
                  <h3 className="text-lg font-bold mb-4 text-center">قائمة التدفقات النقدية</h3>
                  <h4 className="text-sm text-gray-500 mb-4 text-center">
                    للفترة من {new Date(reportData.periodStart).toLocaleDateString('ar-EG')} إلى {new Date(reportData.periodEnd).toLocaleDateString('ar-EG')}
                  </h4>
                  
                  {/* Cash Flow details would go here */}
                  <div className="text-center py-4">
                    تم إظهار قائمة الدخل كمثال. يمكن توسيع هذا القسم لعرض التدفقات النقدية بناءً على البيانات المستلمة.
                  </div>
                </div>
              ) : reportType === 'accounts' && selectedAccountId ? (
                <div className="border rounded-md p-4 mb-4">
                  <h3 className="text-lg font-bold mb-4 text-center">كشف حساب</h3>
                  {statementData.account ? (
                    <>
                      <div className="text-center mb-4">
                        <h4 className="font-bold text-lg">{statementData.account.name}</h4>
                        <p className="text-sm text-gray-500">
                          {statementData.account.type === 'customer' ? 'عميل' : 
                           statementData.account.type === 'supplier' ? 'مورد' : 
                           statementData.account.type === 'expense' ? 'مصروف' : 
                           statementData.account.type === 'income' ? 'إيراد' : 
                           statementData.account.type === 'bank' ? 'بنك' : 'نقدي'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          للفترة من {new Date(statementData.periodStart || startDate).toLocaleDateString('ar-EG')} 
                          إلى {new Date(statementData.periodEnd || endDate).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card>
                          <CardContent className="pt-4">
                            <div className="text-center">
                              <p className="text-sm text-gray-500 mb-1">الرصيد الافتتاحي</p>
                              <p className="text-xl font-bold">{statementData.startingBalance?.toFixed(2)} ج.م</p>
                            </div>
        </CardContent>
      </Card>
      
                        <Card>
                          <CardContent className="pt-4">
                            <div className="text-center">
                              <p className="text-sm text-gray-500 mb-1">صافي الحركة</p>
                              <p className={`text-xl font-bold ${statementData.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {statementData.netChange?.toFixed(2)} ج.م
                              </p>
      </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="pt-4">
                            <div className="text-center">
                              <p className="text-sm text-gray-500 mb-1">الرصيد الختامي</p>
                              <p className={`text-xl font-bold ${statementData.endingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {statementData.endingBalance?.toFixed(2)} ج.م
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      {statementData.transactions && statementData.transactions.length > 0 ? (
                        <div className="overflow-x-auto rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>التاريخ</TableHead>
                                <TableHead>المرجع</TableHead>
                                <TableHead>البيان</TableHead>
                                <TableHead>النوع</TableHead>
                                <TableHead className="text-left">مدين</TableHead>
                                <TableHead className="text-left">دائن</TableHead>
                                <TableHead className="text-left">الرصيد</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {/* Starting balance row */}
                              <TableRow className="bg-slate-50">
                                <TableCell>{new Date(statementData.periodStart || startDate).toLocaleDateString('ar-EG')}</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell className="font-semibold">رصيد افتتاحي</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell className="text-left">-</TableCell>
                                <TableCell className="text-left">-</TableCell>
                                <TableCell className="text-left font-semibold">{statementData.startingBalance?.toFixed(2)} ج.م</TableCell>
                              </TableRow>
                              
                              {/* Transaction rows */}
                              {statementData.transactions.map((transaction: {
                                date: string;
                                reference?: string;
                                description?: string;
                                type: string;
                                isDebit: boolean;
                                amount: number;
                                balance: number;
                              }, index: number) => (
                                <TableRow key={index}>
                                  <TableCell>{new Date(transaction.date).toLocaleDateString('ar-EG')}</TableCell>
                                  <TableCell>{transaction.reference || '-'}</TableCell>
                                  <TableCell>{transaction.description || '-'}</TableCell>
                                  <TableCell>
                                    {transaction.type === 'credit' && 
                                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200">قبض</Badge>
                                    }
                                    {transaction.type === 'debit' && 
                                      <Badge className="bg-red-100 text-red-800 hover:bg-red-200">دفع</Badge>
                                    }
                                    {transaction.type === 'invoice' && 
                                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">فاتورة</Badge>
                                    }
                                    {transaction.type === 'purchase' && 
                                      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">مشتريات</Badge>
                                    }
                                    {transaction.type === 'journal' && transaction.isDebit && 
                                      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">مدين</Badge>
                                    }
                                    {transaction.type === 'journal' && !transaction.isDebit && 
                                      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">دائن</Badge>
                                    }
                                  </TableCell>
                                  <TableCell className="text-left">{transaction.isDebit ? transaction.amount.toFixed(2) : '-'} {transaction.isDebit ? 'ج.م' : ''}</TableCell>
                                  <TableCell className="text-left">{!transaction.isDebit ? transaction.amount.toFixed(2) : '-'} {!transaction.isDebit ? 'ج.م' : ''}</TableCell>
                                  <TableCell className={`text-left font-semibold ${transaction.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {transaction.balance.toFixed(2)} ج.م
                                  </TableCell>
                                </TableRow>
                              ))}
                              
                              {/* Ending balance row */}
                              <TableRow className="bg-slate-50 font-bold">
                                <TableCell>{new Date(statementData.periodEnd || endDate).toLocaleDateString('ar-EG')}</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell className="font-semibold">الإجمالي</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell className="text-left">{statementData.totalDebits?.toFixed(2)} ج.م</TableCell>
                                <TableCell className="text-left">{statementData.totalCredits?.toFixed(2)} ج.م</TableCell>
                                <TableCell className={`text-left font-semibold ${statementData.endingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {statementData.endingBalance?.toFixed(2)} ج.م
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          لا توجد معاملات في هذه الفترة
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      الرجاء اختيار حساب لعرض كشف الحساب
                    </div>
                  )}
                </div>
              ) : (
                <div className="border rounded-md p-4 mb-4 text-center py-8">
                  {reportType === 'accounts' ? 
                    'الرجاء اختيار حساب لعرض كشف الحساب' : 
                    'الرجاء اختيار نوع التقرير'
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Transaction Form Dialog */}
      {isFormOpen && (
        <TransactionForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          transaction={transactionToEdit}
          accounts={accounts}
        />
      )}
    </div>
  );
}
