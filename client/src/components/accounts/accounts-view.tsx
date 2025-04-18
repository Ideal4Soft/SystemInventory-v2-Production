import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  Eye, 
  Pencil, 
  Trash, 
  Plus, 
  RefreshCw, 
  Download, 
  Upload,
  FileDown,
  Search,
  Filter,
  DollarSign,
  MoreHorizontal,
  FileSpreadsheet,
  FileText,
  Edit,
  MoreVertical,
  Trash2,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import AccountForm from "./account-form";
import AccountDetailsDialog from "./account-details";
import { exportAccountsToExcel, getExcelTemplate, importFromExcel, ExcelAccount } from "@/lib/excel-utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

// Define a type for the cell info object
interface CellInfo {
  row: {
    original: any;
  }
}

// Define a type for account objects
interface Account {
  id: number;
  name: string;
  type: string;
  category?: string;
  currentBalance: number;
  lastTransactionData?: LastTransactionData;
  isActive?: boolean;
}

interface LastTransactionData {
  lastTransaction: {
    id: number;
    amount: number;
    date: string;
    type: string;
  } | null;
  lastInvoice: {
    id: number;
    total: number;
    date: string;
    invoiceNumber: string;
  } | null;
}

interface DataTableProps {
  data: any[];
  columns: any[];
  isLoading?: boolean;
}

export default function AccountsView() {
  const [accountType, setAccountType] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [isAccountDetailsOpen, setIsAccountDetailsOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<any>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showNonZeroOnly, setShowNonZeroOnly] = useState(false);
  const [accountsWithLastTransactions, setAccountsWithLastTransactions] = useState<Account[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isFileInputOpen, setIsFileInputOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [openConfirmImport, setOpenConfirmImport] = useState(false);
  const [excelData, setExcelData] = useState<any[] | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [initialTransactionType, setInitialTransactionType] = useState<"credit" | "debit" | null>(null);
  const [columnVisibility, setColumnVisibility] = useState({
    lastPaymentDate: false,
    lastInvoiceDate: false,
    lastPayment: false,
    lastInvoice: false,
  });

  // Fetch accounts data
  const { data: accountsData = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/accounts', accountType, showNonZeroOnly, showActiveOnly],
    queryFn: async ({ queryKey }) => {
      try {
        let url = '/api/accounts';
        const params = [];
        
        if (accountType) {
          params.push(`type=${accountType}`);
        }
        
        if (showNonZeroOnly) {
          params.push(`showNonZeroOnly=true`);
        }
        
        if (showActiveOnly) {
          params.push(`showActiveOnly=true`);
        }
        
        if (params.length > 0) {
          url += `?${params.join('&')}`;
        }
          
        const headers = {
          "Accept": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        };

        const res = await fetch(url, {
          headers,
          cache: 'no-store',
          credentials: 'include'
        });

        if (!res.ok) {
          throw new Error(`فشل تحميل بيانات الحسابات: ${res.status} ${res.statusText}`);
        }

        // Clone the response before reading
        const resClone = res.clone();
        
        // Read as text first
        const text = await res.text();
        if (!text) {
          return [];
        }

        // Try to parse as JSON
        try {
          const data = JSON.parse(text);
          if (!Array.isArray(data)) {
            console.error('Unexpected response format:', data);
            throw new Error('تنسيق البيانات غير صحيح');
          }
          return data;
        } catch (e) {
          console.error('Failed to parse response as JSON:', text);
          throw new Error('خطأ في تحليل البيانات');
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 0, // Disable caching
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Fetch the last transaction data for each account
  useEffect(() => {
    if (!accountsData || accountsData.length === 0) return;

    const fetchLastTransactions = async () => {
      const accountsWithData = [...accountsData];
      
      for (let i = 0; i < accountsWithData.length; i++) {
        const account = accountsWithData[i];
        try {
          const lastTransactionData = await apiRequest(`/api/accounts/${account.id}/last-transactions`, 'GET');
          accountsWithData[i] = {
            ...account,
            lastTransactionData
          };
        } catch (error) {
          console.error(`Error fetching last transactions for account ${account.id}:`, error);
        }
      }
      
      setAccountsWithLastTransactions(accountsWithData);
    };

    fetchLastTransactions();
  }, [accountsData]);

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      for (const id of ids) {
        await apiRequest(`/api/accounts/${id}`, 'DELETE');
      }
      return ids;
    },
    onSuccess: () => {
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف الحسابات المحددة بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
    },
    onError: (error) => {
      toast({
        title: "خطأ في الحذف",
        description: "حدث خطأ أثناء حذف الحسابات",
        variant: "destructive",
      });
    }
  });

  // First, add a useEffect to update accounts state when accountsData changes
  useEffect(() => {
    if (accountsData) {
      setAccounts(accountsData as Account[]);
    }
  }, [accountsData]);

  // Add a useEffect to trigger a refetch when showActiveOnly changes
  useEffect(() => {
    // Refetch data when showActiveOnly changes
    refetch();
  }, [showActiveOnly, refetch]);

  // Then, modify the filteredAccounts useMemo to only handle filtering
  const filteredAccounts = React.useMemo(() => {
    if (!accountsData) return [];
    
    return accountsData.filter((account: Account) => {
      // Apply search query filter
      if (searchQuery && !account.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !String(account.id).includes(searchQuery)) {
        return false;
      }
      
      // Apply other filters as needed
      return true;
    });
  }, [accountsData, searchQuery]);

  // Handle opening the account details dialog
  const handleViewAccount = (account: Account) => {
    setSelectedAccount(account);
    setInitialTransactionType(null);
    setIsAccountDetailsOpen(true);
  };

  // Handle quick transaction - open account details with transaction form
  const handleQuickTransaction = (account: Account, type: "credit" | "debit") => {
    setSelectedAccount(account);
    setInitialTransactionType(type);
    setIsAccountDetailsOpen(true);
  };

  // Handle edit account
  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setIsAccountFormOpen(true);
  };

  // Handle delete selected accounts
  const handleDeleteSelected = () => {
    // Implementation for bulk delete
    if (window.confirm(`هل أنت متأكد من حذف ${selectedAccounts.length} حسابات؟`)) {
      // Delete logic here
    }
  };
  
  // Handle file change for import
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Process Excel file
      try {
        setImportLoading(true);
        const importedData = await importFromExcel<ExcelAccount>(file);
        
        // Process the data to match the API format
        const processedData = importedData.map(item => ({
          code: item.الكود || '',
          name: item.الاسم || '',
          type: item.النوع === 'عميل' ? 'customer' : 
                item.النوع === 'مورد' ? 'supplier' : 
                item.النوع === 'مصروف' ? 'expense' : 
                item.النوع === 'إيراد' ? 'income' : 'customer',
          address: item.العنوان || '',
          phone: item.الهاتف || '',
          openingBalance: item['الرصيد الافتتاحي'] || 0,
          notes: item.ملاحظات || ''
        }));
        
        setExcelData(processedData);
        setOpenConfirmImport(true);
      } catch (error) {
        console.error('Error importing Excel file:', error);
        toast({
          title: "خطأ في قراءة الملف",
          description: "فشل قراءة ملف Excel. تأكد من أن الملف بالتنسيق الصحيح.",
          variant: "destructive",
        });
      } finally {
        setImportLoading(false);
      }
    }
  };
  
  // Confirm import
  const confirmImport = async () => {
    setImportLoading(true);
    try {
      if (!excelData || excelData.length === 0) {
        throw new Error("لا توجد بيانات للاستيراد");
      }
      
      // Create accounts individually instead of using batch endpoint
      let successCount = 0;
      for (const account of excelData) {
        try {
          // Call API to create each account individually
          await apiRequest('/api/accounts', 'POST', account);
          successCount++;
        } catch (error) {
          console.error('Error importing account:', account, error);
        }
      }
      
      toast({
        title: "تم الاستيراد بنجاح",
        description: `تم استيراد ${successCount} من ${excelData.length} حسابات بنجاح`,
      });
      refetch();
    } catch (error) {
      console.error('Error importing accounts:', error);
      toast({
        title: "حدث خطأ",
        description: error instanceof Error ? error.message : "فشل استيراد البيانات",
        variant: "destructive",
      });
    } finally {
      setImportLoading(false);
      setOpenConfirmImport(false);
    }
  };
  
  // Export accounts to Excel
  const exportAccounts = () => {
    if (accounts && accounts.length > 0) {
      exportAccountsToExcel(accounts);
      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير ${accounts.length} حسابات إلى ملف Excel`,
      });
    } else {
      toast({
        title: "لا توجد بيانات",
        description: "لا توجد حسابات للتصدير",
        variant: "destructive",
      });
    }
  };
  
  // Download Excel template
  const downloadExcelTemplate = () => {
    try {
      getExcelTemplate('accounts');
      toast({
        title: "تم تحميل القالب",
        description: "تم تحميل قالب Excel بنجاح",
      });
    } catch (error) {
      console.error('Error downloading template:', error);
      toast({
        title: "خطأ في تحميل القالب",
        description: "فشل تحميل قالب Excel",
        variant: "destructive",
      });
    }
  };
  
  // Function to determine if balance is debit based on account type
  const isDebitBalance = (account: Account) => {
    // For customers: positive balances should go in debit (عليهم - مدين) column
    // For suppliers: positive balances should go in credit (لهم - دائن) column
    if (account.type === 'customer') {
      // Customer with positive balance owes us money (مدين/عليه)
      return account.currentBalance > 0;
    } else if (account.type === 'supplier') {
      // Supplier with negative balance owes us money (مدين/عليه)
      return account.currentBalance < 0;
    } else if (account.type === 'expense') {
      return account.currentBalance > 0;
    } else if (account.type === 'income') {
      return account.currentBalance < 0;
    }
    return account.currentBalance > 0;
  };

  // Handle delete account
  const handleDeleteAccount = (id: number) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الحساب؟")) {
      deleteAccountMutation.mutate([id]);
    }
  };

  // Get account type badge
  const getAccountTypeBadge = (type: string) => {
    const types: Record<string, { label: string, className: string }> = {
      customer: { label: "عميل", className: "bg-green-100 text-green-800" },
      supplier: { label: "مورد", className: "bg-blue-100 text-blue-800" },
      expense: { label: "مصروف", className: "bg-red-100 text-red-800" },
      income: { label: "إيراد", className: "bg-purple-100 text-purple-800" },
      bank: { label: "بنك", className: "bg-yellow-100 text-yellow-800" },
      cash: { label: "صندوق", className: "bg-gray-100 text-gray-800" },
    };
    
    const typeInfo = types[type] || { label: type, className: "bg-gray-100 text-gray-800" };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${typeInfo.className}`}>
        {typeInfo.label}
      </span>
    );
  };

  // Handle import button click
  const handleImportButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="container mx-auto py-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">الحسابات</h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsAccountFormOpen(true)}>
            <Plus className="h-4 w-4 ml-1" />
            إضافة حساب
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <MoreHorizontal className="h-4 w-4 ml-1" />
                المزيد
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleImportButtonClick}>
                <FileSpreadsheet className="h-4 w-4 ml-1" />
                استيراد من Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportAccounts}>
                <FileDown className="h-4 w-4 ml-1" />
                تصدير إلى Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadExcelTemplate}>
                <FileDown className="h-4 w-4 ml-1" />
                تحميل قالب Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Eye className="h-4 w-4 ml-1" />
                  إظهار/إخفاء الأعمدة
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.lastPayment}
                    onCheckedChange={(checked) => 
                      setColumnVisibility({...columnVisibility, lastPayment: checked})
                    }
                  >
                    آخر دفعة/قبض
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.lastPaymentDate}
                    onCheckedChange={(checked) => 
                      setColumnVisibility({...columnVisibility, lastPaymentDate: checked})
                    }
                  >
                    تاريخ آخر دفعة/قبض
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.lastInvoice}
                    onCheckedChange={(checked) => 
                      setColumnVisibility({...columnVisibility, lastInvoice: checked})
                    }
                  >
                    آخر فاتورة بيع/شراء
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.lastInvoiceDate}
                    onCheckedChange={(checked) => 
                      setColumnVisibility({...columnVisibility, lastInvoiceDate: checked})
                    }
                  >
                    تاريخ آخر فاتورة
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Action buttons and filters */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDeleteSelected()}
            disabled={isLoading || selectedAccounts.length === 0}
          >
            <Trash2 className="h-4 w-4 ml-1" />
            حذف
            {selectedAccounts.length > 0 && ` (${selectedAccounts.length})`}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <Checkbox
              id="show-active"
              checked={showActiveOnly}
              onCheckedChange={(checked: CheckedState) => {
                if (typeof checked === 'boolean') {
                  setShowActiveOnly(checked);
                }
              }}
            />
            <label htmlFor="show-active" className="text-sm mr-2">
              إظهار الحسابات النشطة فقط
            </label>
          </div>

          <Input
            className="w-[200px] h-9"
            placeholder="بحث بالاسم أو رقم الحساب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* File input for Excel import (hidden) */}
      <input
        type="file"
        accept=".xlsx,.xls"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Data table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell className="w-12">
                <Checkbox
                  checked={
                    filteredAccounts.length > 0 &&
                    selectedAccounts.length === filteredAccounts.length
                  }
                  onCheckedChange={(checked: CheckedState) => {
                    if (checked) {
                      setSelectedAccounts(filteredAccounts.map((account) => account.id));
                    } else {
                      setSelectedAccounts([]);
                    }
                  }}
                />
              </TableCell>
              <TableCell>رقم الحساب</TableCell>
              <TableCell>اسم الحساب</TableCell>
              <TableCell>طبيعة الحساب</TableCell>
              <TableCell className="bg-red-50 border-x border-red-200 font-bold text-red-700">الرصيد (عليه / مدين)</TableCell>
              <TableCell className="bg-green-50 border-x border-green-200 font-bold text-green-700">الرصيد (له / دائن)</TableCell>
              {columnVisibility.lastPayment && <TableCell>آخر دفعة/قبض</TableCell>}
              {columnVisibility.lastPaymentDate && <TableCell>تاريخ آخر دفعة/قبض</TableCell>}
              {columnVisibility.lastInvoice && <TableCell>آخر فاتورة بيع/شراء</TableCell>}
              {columnVisibility.lastInvoiceDate && <TableCell>تاريخ آخر فاتورة</TableCell>}
              <TableCell>العمليات</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin ml-2" />
                    جاري التحميل...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredAccounts.length > 0 ? (
              filteredAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedAccounts.includes(account.id)}
                      onCheckedChange={(checked: CheckedState) => {
                        if (checked) {
                          setSelectedAccounts([...selectedAccounts, account.id]);
                        } else {
                          setSelectedAccounts(
                            selectedAccounts.filter((id) => id !== account.id)
                          );
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>{account.id}</TableCell>
                  <TableCell>
                    <span 
                      className="cursor-pointer text-primary hover:text-primary/80 hover:underline"
                      onClick={() => handleViewAccount(account)}
                    >
                      {account.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getAccountTypeBadge(account.type)}
                  </TableCell>
                  <TableCell className="bg-red-50 border-x border-red-200 font-bold">
                    {isDebitBalance(account) ? formatCurrency(account.currentBalance || 0) : formatCurrency(0)}
                  </TableCell>
                  <TableCell className="bg-green-50 border-x border-green-200 font-bold">
                    {!isDebitBalance(account) ? formatCurrency(account.currentBalance || 0) : formatCurrency(0)}
                  </TableCell>
                  {columnVisibility.lastPayment && 
                    <TableCell>{account.lastTransactionData?.lastTransaction?.amount 
                      ? formatCurrency(account.lastTransactionData.lastTransaction.amount) 
                      : '-'}</TableCell>
                  }
                  {columnVisibility.lastPaymentDate && 
                    <TableCell>{account.lastTransactionData?.lastTransaction?.date ? formatDate(account.lastTransactionData.lastTransaction.date) : '-'}</TableCell>
                  }
                  {columnVisibility.lastInvoice && 
                    <TableCell>{account.lastTransactionData?.lastInvoice?.total 
                      ? formatCurrency(account.lastTransactionData.lastInvoice.total) 
                      : '-'}</TableCell>
                  }
                  {columnVisibility.lastInvoiceDate && 
                    <TableCell>{account.lastTransactionData?.lastInvoice?.date ? formatDate(account.lastTransactionData.lastInvoice.date) : '-'}</TableCell>
                  }
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleViewAccount(account)}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleEditAccount(account)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleViewAccount(account)}>
                            <FileText className="h-4 w-4 ml-2" />
                            كشف حساب
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleQuickTransaction(account, 'credit')}>
                            <ArrowDownCircle className="h-4 w-4 ml-2 text-green-700" />
                            استلام مبلغ
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleQuickTransaction(account, 'debit')}>
                            <ArrowUpCircle className="h-4 w-4 ml-2 text-red-700" />
                            دفع مبلغ
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditAccount(account)}>
                            <Edit className="h-4 w-4 ml-2" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteAccount(account.id)}>
                            <Trash2 className="h-4 w-4 ml-2" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  لا توجد حسابات متاحة
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Account Form Modal */}
      {isAccountFormOpen && (
        <AccountForm
          isOpen={isAccountFormOpen}
          onClose={() => {
            setIsAccountFormOpen(false);
            setSelectedAccount(null);
            refetch();
          }}
          accountToEdit={selectedAccount}
          defaultType={accountType}
        />
      )}

      {/* Account Details Dialog */}
      {isAccountDetailsOpen && selectedAccount && (
        <AccountDetailsDialog
          isOpen={isAccountDetailsOpen}
          onClose={() => {
            setIsAccountDetailsOpen(false);
            setInitialTransactionType(null);
            refetch();
          }}
          account={selectedAccount}
          initialTransactionType={initialTransactionType}
        />
      )}

      {/* Confirm Import Dialog */}
      <AlertDialog open={openConfirmImport} onOpenChange={setOpenConfirmImport}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد استيراد البيانات</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم استيراد {excelData?.length} حسابات. هل أنت متأكد من المتابعة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>
              {importLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الاستيراد...
                </>
              ) : (
                "استيراد"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
