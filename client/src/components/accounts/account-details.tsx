import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Icons
import { Printer, Download, RefreshCw, Plus, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

// Transaction schema for form validation
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

interface AccountDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  account: any;
  initialTransactionType?: "credit" | "debit" | null;
}

export default function AccountDetailsDialog({ isOpen, onClose, account, initialTransactionType = null }: AccountDetailsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 3);
    return date.toISOString().substring(0, 10);
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().substring(0, 10));
  const [activeTab, setActiveTab] = useState("statement");
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"credit" | "debit">("credit");
  
  // Open transaction form if initialTransactionType is provided
  useEffect(() => {
    if (initialTransactionType) {
      setTransactionType(initialTransactionType);
      setIsTransactionFormOpen(true);
    }
  }, [initialTransactionType]);

  // Fetch account statement data
  const { 
    data: statementData = {}, 
    isLoading: isStatementLoading,
    refetch: refetchStatement
  } = useQuery({
    queryKey: ['/api/accounts/statement', account?.id, startDate, endDate],
    queryFn: async () => {
      if (!account?.id) return null;
      const result = await apiRequest(`/api/accounts/${account.id}/statement?startDate=${startDate}&endDate=${endDate}`, 'GET');
      
      // Sort transactions from newest to oldest
      if (result && result.transactions) {
        result.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
      
      return result;
    },
    enabled: !!account?.id && isOpen,
  });

  // Fetch invoices by account id
  const { 
    data: invoices = [], 
    isLoading: isInvoicesLoading,
    refetch: refetchInvoices
  } = useQuery({
    queryKey: ['/api/invoices', account?.id],
    queryFn: async () => {
      if (!account?.id) return [];
      const result = await apiRequest(`/api/invoices?accountId=${account.id}`, 'GET');
      
      // Sort invoices from newest to oldest
      return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    enabled: !!account?.id && isOpen && activeTab === "invoices",
  });

  // Fetch purchases by account id
  const { 
    data: purchases = [], 
    isLoading: isPurchasesLoading,
    refetch: refetchPurchases
  } = useQuery({
    queryKey: ['/api/purchases', account?.id],
    queryFn: async () => {
      if (!account?.id) return [];
      const result = await apiRequest(`/api/purchases?accountId=${account.id}`, 'GET');
      
      // Sort purchases from newest to oldest
      return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    enabled: !!account?.id && isOpen && activeTab === "purchases",
  });

  // Fetch transactions by account id
  const { 
    data: transactions = [], 
    isLoading: isTransactionsLoading,
    refetch: refetchTransactions
  } = useQuery({
    queryKey: ['/api/transactions', account?.id],
    queryFn: async () => {
      if (!account?.id) return [];
      const result = await apiRequest(`/api/transactions?accountId=${account.id}`, 'GET');
      
      // Sort transactions from newest to oldest
      return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    enabled: !!account?.id && isOpen && activeTab === "transactions",
  });

  // Transaction form
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: transactionType,
      accountId: account?.id || 0,
      amount: 0,
      date: new Date().toISOString().substring(0, 10),
      paymentMethod: "cash",
      notes: "",
      reference: "",
    },
  });

  // Update form values when transaction type changes
  useEffect(() => {
    if (isTransactionFormOpen) {
      form.setValue("type", transactionType);
      form.setValue("accountId", account?.id || 0);
    }
  }, [isTransactionFormOpen, transactionType, account, form]);

  // Handle quick transaction submit
  const onSubmitTransaction = async (values: TransactionFormValues) => {
    try {
      await apiRequest('/api/transactions', 'POST', values);
      toast({
        title: "تم إنشاء المعاملة بنجاح",
        description: `تم ${values.type === 'credit' ? 'استلام' : 'دفع'} مبلغ ${values.amount} ج.م`,
      });
      setIsTransactionFormOpen(false);
      
      // Refresh data
      refetchStatement();
      refetchTransactions();
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء المعاملة",
        variant: "destructive",
      });
    }
  };

  // Open transaction form for quick payment or receipt
  const handleQuickTransaction = (type: "credit" | "debit") => {
    setTransactionType(type);
    setIsTransactionFormOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString('ar-EG');
    } catch (e) {
      return dateString;
    }
  };

  // Get badge for transaction type
  const getTransactionTypeBadge = (type: string, isDebit?: boolean) => {
    switch (type) {
      case 'credit':
        return <Badge className="bg-green-100 text-green-800">قبض</Badge>;
      case 'debit':
        return <Badge className="bg-red-100 text-red-800">دفع</Badge>;
      case 'journal':
        return <Badge className="bg-gray-100 text-gray-800">{isDebit ? "مدين" : "دائن"}</Badge>;
      case 'invoice':
        return <Badge className="bg-blue-100 text-blue-800">فاتورة</Badge>;
      case 'purchase':
        return <Badge className="bg-purple-100 text-purple-800">مشتريات</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{type}</Badge>;
    }
  };

  // Get badge for invoice status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-yellow-100 text-yellow-800">مسودة</Badge>;
      case 'posted':
        return <Badge className="bg-green-100 text-green-800">مرحلة</Badge>;
      case 'voided':
        return <Badge className="bg-red-100 text-red-800">ملغاة</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  // Get account type as Arabic string
  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'customer': return 'عميل';
      case 'supplier': return 'مورد';
      case 'expense': return 'مصروف';
      case 'income': return 'إيراد';
      case 'bank': return 'بنك';
      case 'cash': return 'صندوق';
      default: return type;
    }
  };

  // Handle date filter change
  const handleDateFilterChange = () => {
    // Validate dates
    if (!startDate || !endDate) {
      toast({
        title: "خطأ",
        description: "يرجى تحديد تاريخ البداية والنهاية",
        variant: "destructive",
      });
      return;
    }

    // Check if end date is after start date
    if (new Date(endDate) < new Date(startDate)) {
      toast({
        title: "خطأ",
        description: "يجب أن يكون تاريخ النهاية بعد تاريخ البداية",
        variant: "destructive",
      });
      return;
    }

    // Trigger a full refresh of the statement data
    refetchStatement();
  };

  // Print account statement
  const printAccountStatement = () => {
    if (!statementData || !statementData.account) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const currencySymbol = "ج.م";
    const companyName = "شركة الريادي للمواد الغذائية";
    const companyAddress = "القاهرة، مصر";
    const companyPhone = "01234567890";
    
    // Create print content (simplified for this example)
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>كشف حساب - ${statementData.account.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; direction: rtl; }
          .header { text-align: center; margin-bottom: 20px; }
          .table { width: 100%; border-collapse: collapse; }
          .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          .table th { background-color: #f2f2f2; }
          .green { color: green; }
          .red { color: red; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${companyName}</h2>
          <p>${companyAddress} - ${companyPhone}</p>
          <h3>كشف حساب: ${statementData.account.name} (${getAccountTypeLabel(statementData.account.type)})</h3>
          <p>الفترة من ${formatDate(statementData.periodStart)} إلى ${formatDate(statementData.periodEnd)}</p>
          <p>الرصيد الافتتاحي: ${statementData.startingBalance?.toFixed(2)} ${currencySymbol}</p>
          <p>الرصيد الختامي: 
            <span class="${statementData.endingBalance >= 0 ? 'green' : 'red'}">
              ${statementData.endingBalance?.toFixed(2)} ${currencySymbol}
            </span>
          </p>
        </div>
        
        <table class="table">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>المرجع</th>
              <th>البيان</th>
              <th>النوع</th>
              <th>مدين</th>
              <th>دائن</th>
              <th>الرصيد</th>
            </tr>
          </thead>
          <tbody>
            ${statementData.transactions?.map((t: any) => `
              <tr>
                <td>${formatDate(t.date)}</td>
                <td>${t.reference || '-'}</td>
                <td>${t.description || '-'}</td>
                <td>${t.type}</td>
                <td>${t.isDebit ? t.amount.toFixed(2) : '-'}</td>
                <td>${!t.isDebit ? t.amount.toFixed(2) : '-'}</td>
                <td class="${t.balance >= 0 ? 'green' : 'red'}">${t.balance.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()">طباعة</button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = function() {
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    };
  };

  // Function to export data as CSV
  const exportAsCSV = () => {
    // Implementation would go here
    alert("سيتم توفير هذه الخاصية قريباً");
  };

  if (!account) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[450px] overflow-y-auto p-3">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">{account?.name} - كشف حساب</DialogTitle>
        </DialogHeader>
        
        {/* Account balance summary cards */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="flex">
            <Card className="shadow-sm flex-1">
              <CardContent className="p-2">
                <div className="text-center">
                  <p className="text-xs text-gray-500">الرصيد الحالي</p>
                  <p className={`text-sm font-bold ${statementData.endingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {statementData.endingBalance?.toFixed(2)} ج.م
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex">
            <Card className="shadow-sm flex-1">
              <CardContent className="p-2">
                <div className="text-center">
                  <p className="text-xs text-gray-500">الرصيد الافتتاحي</p>
                  <p className="text-sm font-bold">
                    {statementData.startingBalance?.toFixed(2)} ج.م
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex">
            <Card className="shadow-sm flex-1">
              <CardContent className="p-2">
                <div className="text-center">
                  <p className="text-xs text-gray-500">إجمالي المدين</p>
                  <p className="text-sm font-bold text-red-600">
                    {statementData.totalDebits?.toFixed(2)} ج.م
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex">
            <Card className="shadow-sm flex-1">
              <CardContent className="p-2">
                <div className="text-center">
                  <p className="text-xs text-gray-500">إجمالي الدائن</p>
                  <p className="text-sm font-bold text-green-600">
                    {statementData.totalCredits?.toFixed(2)} ج.م
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Quick transaction buttons */}
        {(account?.type === 'customer' || account?.type === 'supplier') && (
          <div className="flex gap-1 mb-2">
            <Button 
              onClick={() => handleQuickTransaction('credit')}
              className="flex-1 bg-green-100 text-green-800 hover:bg-green-200 h-7 text-xs"
              size="sm"
            >
              <ArrowDownCircle className="h-3.5 w-3.5 ml-1" />
              استلام مبلغ
            </Button>
            
            <Button 
              onClick={() => handleQuickTransaction('debit')}
              className="flex-1 bg-red-100 text-red-800 hover:bg-red-200 h-7 text-xs"
              size="sm"
            >
              <ArrowUpCircle className="h-3.5 w-3.5 ml-1" />
              دفع مبلغ
            </Button>
          </div>
        )}
        
        {/* Date Filter */}
        <div className="flex flex-wrap gap-1 items-center mb-2 text-xs">
          <div className="flex items-center space-x-1 space-x-reverse">
            <label className="text-xs whitespace-nowrap">من:</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-1 py-0.5 border rounded h-6 text-xs w-28"
            />
          </div>
          
          <div className="flex items-center space-x-1 space-x-reverse">
            <label className="text-xs whitespace-nowrap mr-1">إلى:</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-1 py-0.5 border rounded h-6 text-xs w-28"
            />
          </div>
          
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleDateFilterChange}
            className="h-6 text-xs px-2"
          >
            تطبيق
          </Button>
          
          <div className="flex-grow"></div>
          
          <Button size="sm" variant="outline" onClick={printAccountStatement} className="h-6 text-xs px-2">
            <Printer className="h-3 w-3 ml-1" />
            طباعة
          </Button>
          
          <Button size="sm" variant="outline" onClick={exportAsCSV} className="h-6 text-xs px-2">
            <Download className="h-3 w-3 ml-1" />
            تصدير
          </Button>
        </div>
        
        {/* Tabs */}
        <Tabs 
          defaultValue="statement" 
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
          }}
        >
          <TabsList className="mb-1 h-7">
            <TabsTrigger value="statement" className="text-xs px-2 py-0.5 h-5">كشف حساب</TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs px-2 py-0.5 h-5">المعاملات</TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs px-2 py-0.5 h-5">الفواتير</TabsTrigger>
            <TabsTrigger value="purchases" className="text-xs px-2 py-0.5 h-5">المشتريات</TabsTrigger>
          </TabsList>
          
          {/* Account Statement Tab */}
          <TabsContent value="statement" className="mt-0">
            {isStatementLoading ? (
              <div className="text-center py-2 text-xs">جاري تحميل البيانات...</div>
            ) : statementData.transactions?.length > 0 ? (
              <div className="overflow-x-auto rounded-md border">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-0.5 px-1">التاريخ</TableHead>
                      <TableHead className="py-0.5 px-1">المرجع</TableHead>
                      <TableHead className="py-0.5 px-1">البيان</TableHead>
                      <TableHead className="py-0.5 px-1">النوع</TableHead>
                      <TableHead className="text-left py-0.5 px-1">مدين</TableHead>
                      <TableHead className="text-left py-0.5 px-1">دائن</TableHead>
                      <TableHead className="text-left py-0.5 px-1">الرصيد</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Starting balance row */}
                    <TableRow className="bg-slate-50">
                      <TableCell className="py-0.5 px-1">{formatDate(statementData.periodStart)}</TableCell>
                      <TableCell className="py-0.5 px-1">-</TableCell>
                      <TableCell className="py-0.5 px-1 font-semibold">رصيد افتتاحي</TableCell>
                      <TableCell className="py-0.5 px-1">-</TableCell>
                      <TableCell className="py-0.5 px-1 text-left">-</TableCell>
                      <TableCell className="py-0.5 px-1 text-left">-</TableCell>
                      <TableCell className="py-0.5 px-1 text-left font-semibold">{statementData.startingBalance?.toFixed(2)} ج.م</TableCell>
                    </TableRow>
                    
                    {/* Transaction rows */}
                    {statementData.transactions.map((transaction: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="py-0.5 px-1">{formatDate(transaction.date)}</TableCell>
                        <TableCell className="py-0.5 px-1 truncate max-w-[40px]" title={transaction.reference || '-'}>{transaction.reference || '-'}</TableCell>
                        <TableCell className="py-0.5 px-1 truncate max-w-[40px]" title={transaction.description || '-'}>{transaction.description || '-'}</TableCell>
                        <TableCell className="py-0.5 px-1">
                          {getTransactionTypeBadge(transaction.type, transaction.isDebit)}
                        </TableCell>
                        <TableCell className="py-0.5 px-1 text-left">{transaction.isDebit ? transaction.amount.toFixed(2) : '-'} {transaction.isDebit ? 'ج.م' : ''}</TableCell>
                        <TableCell className="py-0.5 px-1 text-left">{!transaction.isDebit ? transaction.amount.toFixed(2) : '-'} {!transaction.isDebit ? 'ج.م' : ''}</TableCell>
                        <TableCell className={`py-0.5 px-1 text-left font-semibold ${transaction.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.balance.toFixed(2)} ج.م
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {/* Ending balance row */}
                    <TableRow className="bg-slate-50 font-bold">
                      <TableCell className="py-0.5 px-1">{formatDate(statementData.periodEnd)}</TableCell>
                      <TableCell className="py-0.5 px-1">-</TableCell>
                      <TableCell className="py-0.5 px-1 font-semibold">الإجمالي</TableCell>
                      <TableCell className="py-0.5 px-1">-</TableCell>
                      <TableCell className="py-0.5 px-1 text-left">{statementData.totalDebits?.toFixed(2)} ج.م</TableCell>
                      <TableCell className="py-0.5 px-1 text-left">{statementData.totalCredits?.toFixed(2)} ج.م</TableCell>
                      <TableCell className={`py-0.5 px-1 text-left font-semibold ${statementData.endingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {statementData.endingBalance?.toFixed(2)} ج.م
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-2 text-xs text-gray-500">
                لا توجد معاملات في هذه الفترة
              </div>
            )}
          </TabsContent>
          
          {/* Transactions Tab */}
          <TabsContent value="transactions">
            {isTransactionsLoading ? (
              <div className="text-center py-10">جاري تحميل البيانات...</div>
            ) : transactions.length > 0 ? (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>وسيلة الدفع</TableHead>
                      <TableHead>المرجع</TableHead>
                      <TableHead>ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.id}</TableCell>
                        <TableCell>{formatDate(transaction.date)}</TableCell>
                        <TableCell>{getTransactionTypeBadge(transaction.type, transaction.isDebit)}</TableCell>
                        <TableCell>{transaction.amount.toFixed(2)} ج.م</TableCell>
                        <TableCell>{transaction.paymentMethod}</TableCell>
                        <TableCell>{transaction.reference || '-'}</TableCell>
                        <TableCell>{transaction.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                لا توجد معاملات لهذا الحساب
              </div>
            )}
          </TabsContent>
          
          {/* Invoices Tab */}
          <TabsContent value="invoices">
            {isInvoicesLoading ? (
              <div className="text-center py-10">جاري تحميل البيانات...</div>
            ) : invoices.length > 0 ? (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الفاتورة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المخزن</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.invoiceNumber}</TableCell>
                        <TableCell>{formatDate(invoice.date)}</TableCell>
                        <TableCell>{invoice.warehouse?.name || '-'}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>{invoice.total.toFixed(2)} ج.م</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                لا توجد فواتير مبيعات لهذا الحساب
              </div>
            )}
          </TabsContent>
          
          {/* Purchases Tab */}
          <TabsContent value="purchases">
            {isPurchasesLoading ? (
              <div className="text-center py-10">جاري تحميل البيانات...</div>
            ) : purchases.length > 0 ? (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الفاتورة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المخزن</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((purchase: any) => (
                      <TableRow key={purchase.id}>
                        <TableCell>{purchase.invoiceNumber}</TableCell>
                        <TableCell>{formatDate(purchase.date)}</TableCell>
                        <TableCell>{purchase.warehouse?.name || '-'}</TableCell>
                        <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                        <TableCell>{purchase.total.toFixed(2)} ج.م</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                لا توجد فواتير مشتريات لهذا الحساب
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Transaction Form Dialog */}
        <Dialog open={isTransactionFormOpen} onOpenChange={(open) => {
          if (!open) {
            setIsTransactionFormOpen(false);
          }
        }}>
          <DialogContent className="max-w-[350px]">
            <DialogHeader className="pb-2">
              <DialogTitle>
                {transactionType === "credit" ? 
                  <div className="flex items-center text-green-700">
                    <ArrowDownCircle className="h-5 w-5 ml-2" />
                    استلام مبلغ
                  </div> : 
                  <div className="flex items-center text-red-700">
                    <ArrowUpCircle className="h-5 w-5 ml-2" />
                    دفع مبلغ
                  </div>
                }
              </DialogTitle>
              <DialogDescription className="text-xs">
                {account?.name} - {getAccountTypeLabel(account?.type)}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitTransaction)} className="space-y-2">
                {/* Hidden fields */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <input type="hidden" {...field} />
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <input type="hidden" {...field} value={account?.id} />
                  )}
                />
                
                {/* Amount */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="space-y-0.5">
                      <FormLabel className="text-xs">المبلغ</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="أدخل المبلغ"
                          className="h-6 text-xs"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {/* Date */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="space-y-0.5">
                      <FormLabel className="text-xs">التاريخ</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-6 text-xs"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {/* Payment Method */}
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem className="space-y-0.5">
                      <FormLabel className="text-xs">طريقة الدفع</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-6 text-xs">
                            <SelectValue placeholder="اختر طريقة الدفع" />
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
                
                {/* Reference */}
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem className="space-y-0.5">
                      <FormLabel className="text-xs">المرجع</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="رقم الشيك / التحويل"
                          className="h-6 text-xs"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="space-y-0.5">
                      <FormLabel className="text-xs">ملاحظات</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="أي ملاحظات إضافية"
                          className="h-12 text-xs resize-none"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 space-x-reverse pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-7 text-xs px-2"
                    onClick={() => setIsTransactionFormOpen(false)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    className={`h-7 text-xs px-2 ${
                      transactionType === 'credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {transactionType === 'credit' ? 'استلام' : 'دفع'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
} 