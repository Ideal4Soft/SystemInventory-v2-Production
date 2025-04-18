import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  FileText, 
  Filter, 
  Calendar, 
  ArrowDown, 
  Download, 
  Printer, 
  ShoppingCart,
  Tag,
  FileUp,
  Eye,
  Pencil,
  Trash,
  RefreshCw,
  FileDown,
  Upload
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import InvoiceForm from "./invoice-form";
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDownIcon,
  FilterIcon,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import InvoicePrint from "./invoice-print";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { exportInvoicesToExcel, getExcelTemplate, importFromExcel, ExcelInvoice } from "@/lib/excel-utils";

export default function InvoicesView() {
  const [activeTab, setActiveTab] = useState('sales');
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<any>(null);
  const queryClient = useQueryClient();
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch settings to check if purchases view is combined
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      return apiRequest('/api/settings', 'GET');
    }
  });

  // Check if purchases should be shown in this view
  const combinePurchaseViews = settings?.combinePurchaseViews !== false;
  
  // Fetch invoices data
  const { data: invoicesData, isLoading, error, refetch } = useQuery({
    queryKey: ['invoices', activeTab],
    queryFn: async () => {
      const response = await apiRequest(`/api/invoices?type=${activeTab}&include=details`, 'GET');
      return response;
    }
  });
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  const handleNewInvoice = () => {
    if (activeTab === 'sales') {
      navigate('/invoices/new');
    } else {
      navigate('/purchases/new');
    }
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
  };
  
  const handleDeleteInvoice = async (id: number) => {
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete invoice');
      }
      
      toast({
        title: "Invoice deleted",
        description: "The invoice has been deleted successfully.",
      });
      
      // Refresh the data
      refetch();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: "Error",
        description: "Failed to delete the invoice. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const filteredInvoices = invoicesData
    ? invoicesData.filter((invoice: any) => {
        const matchesSearch = searchQuery === '' || 
          (invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (invoice.account?.name && invoice.account.name.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      })
    : [];
  
  const getStatusBadge = (status: string) => {
    let variant: "default" | "secondary" | "destructive" | "outline" = "default";
    
    switch (status) {
      case 'draft':
        variant = "outline";
        break;
      case 'posted':
        variant = "secondary";
        break;
      case 'paid':
        variant = "default";
        break;
      case 'partially_paid':
        variant = "secondary";
        break;
      case 'cancelled':
        variant = "destructive";
        break;
      default:
        variant = "outline";
    }
    
    return (
      <Badge variant={variant} className="mx-auto">
        {status === 'posted' ? 'جاري' : 
         status === 'draft' ? 'مسودة' : 
         status === 'paid' ? 'مدفوع' :
         status === 'partially_paid' ? 'مدفوع جزئياً' :
         status === 'cancelled' ? 'ملغي' : status}
      </Badge>
    );
  };
  
  // Get a translation for the tab name
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'sales':
        return 'فواتير المبيعات';
      case 'purchases':
        return 'فواتير المشتريات';
      default:
        return tab;
    }
  };
  
  // Get a proper account column name based on the tab
  const getAccountColumnName = () => {
    return activeTab === 'sales' ? 'العميل' : 'المورد';
  };
  
  // Content for each tab
  function InvoiceTabContent() {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2 space-x-reverse">
                <div className="relative w-72">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="بحث في الفواتير..."
                    className="pl-4 pr-10"
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                </div>
                
                <Select 
                  value={statusFilter} 
                  onValueChange={handleFilterChange}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="جميع الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="posted">جاري</SelectItem>
                    <SelectItem value="paid">مدفوع</SelectItem>
                    <SelectItem value="partially_paid">مدفوع جزئياً</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                  </SelectContent>
                </Select>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center">
                      <Calendar className="h-4 w-4 ml-1" />
                      <span>التاريخ</span>
                      <ChevronDownIcon className="mr-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>اليوم</DropdownMenuItem>
                    <DropdownMenuItem>هذا الأسبوع</DropdownMenuItem>
                    <DropdownMenuItem>هذا الشهر</DropdownMenuItem>
                    <DropdownMenuItem>هذا العام</DropdownMenuItem>
                    <DropdownMenuItem>الكل</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 ml-1" />
                  <span>تحديث</span>
                </Button>
                <Button variant="outline" size="sm">
                  <Printer className="h-4 w-4 ml-1" />
                  <span>طباعة</span>
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 ml-1" />
                  <span>تصدير</span>
                </Button>
              </div>
            </div>
            
            <div className="m-0 pt-4">
              <div className="rounded-md border">
                <Table dir="rtl">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">رقم الفاتورة</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">{getAccountColumnName()}</TableHead>
                      <TableHead className="text-right">إجمالي الكمية</TableHead>
                      <TableHead className="text-right">إجمالي المنتجات</TableHead>
                      <TableHead className="text-right">سعر القطعة</TableHead>
                      <TableHead className="text-right">الإجمالي</TableHead>
                      <TableHead className="text-center">الحالة</TableHead>
                      <TableHead className="text-center">خيارات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          جاري التحميل...
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-red-500">
                          حدث خطأ أثناء تحميل البيانات. الرجاء المحاولة مرة أخرى.
                        </TableCell>
                      </TableRow>
                    ) : filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          لا توجد فواتير للعرض
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvoices.map((invoice: any) => {
                        // التأكد من وجود التفاصيل وأنها مصفوفة
                        const details = Array.isArray(invoice.details) ? invoice.details : [];
                        
                        // حساب إجمالي الكمية
                        const totalQuantity = details.reduce((sum: number, item: any) => {
                          const quantity = Number(item.quantity) || 0;
                          return sum + quantity;
                        }, 0);
                        
                        // حساب متوسط سعر القطعة
                        const avgUnitPrice = totalQuantity > 0 ? invoice.total / totalQuantity : 0;
                        
                        return (
                          <TableRow key={invoice.id}>
                            <TableCell>
                              <button
                                onClick={() => handlePrintInvoice(invoice.id)}
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {invoice.invoiceNumber}
                              </button>
                            </TableCell>
                            <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                            <TableCell>{invoice.account?.name || "-"}</TableCell>
                            <TableCell className="text-center">{totalQuantity !== undefined && totalQuantity !== null ? totalQuantity.toFixed(2) : "0.00"}</TableCell>
                            <TableCell>{details.length}</TableCell>
                            <TableCell>{formatCurrency(avgUnitPrice)}</TableCell>
                            <TableCell>{formatCurrency(invoice.total)}</TableCell>
                            <TableCell className="text-center">{getStatusBadge(invoice.status)}</TableCell>
                            <TableCell>
                              <div className="flex justify-center space-x-1 space-x-reverse">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                                  onClick={() => handlePrintInvoice(invoice.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-amber-600 hover:text-amber-900 hover:bg-amber-50"
                                  onClick={() => {
                                    setInvoiceToEdit(invoice);
                                    setIsInvoiceFormOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-red-600 hover:text-red-900 hover:bg-red-50"
                                  onClick={() => handleDeleteInvoice(invoice.id)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Add print dialog
  const handlePrintInvoice = (invoiceId: number) => {
    setSelectedInvoiceForPrint(invoiceId);
  };
  
  // Handle Excel import
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const invoices = await importFromExcel<ExcelInvoice>(file);
      
      // Create invoices one by one
      for (const invoice of invoices) {
        const accountName = invoice['اسم العميل/المورد'];
        const account = await apiRequest('/api/accounts/search', 'POST', { query: accountName });
        
        if (!account) {
          throw new Error(`لم يتم العثور على الحساب: ${accountName}`);
        }

        const invoiceData = {
          date: new Date(invoice.التاريخ),
          accountId: account.id,
          type: invoice['نوع الفاتورة'] === 'مبيعات' ? 'sales' : 'purchase',
          status: 'draft',
          discountAmount: invoice.الخصم || 0,
          taxRate: invoice.الضريبة ? (invoice.الضريبة / invoice['إجمالي القيمة']) * 100 : 0,
          notes: invoice.ملاحظات,
          details: JSON.parse(invoice.المنتجات)
        };

        await apiRequest('/api/invoices', 'POST', invoiceData);
      }
      
      toast({
        title: "تم الاستيراد بنجاح",
        description: `تم استيراد ${invoices.length} فاتورة`,
      });
      
      // Refresh invoices list
      refetch();
      
    } catch (error) {
      console.error('Error importing invoices:', error);
      toast({
        title: "خطأ في الاستيراد",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء استيراد الفواتير. يرجى التحقق من تنسيق الملف.",
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
    if (!invoicesData) return;
    exportInvoicesToExcel(invoicesData);
  };
  
  // Handle template download
  const handleDownloadTemplate = () => {
    getExcelTemplate('invoices');
  };

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-green-600">{getTabTitle(activeTab)}</h2>
        <div className="flex items-center space-x-2 space-x-reverse">
          {/* Excel Operations */}
          <div className="flex items-center space-x-2 space-x-reverse ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="flex items-center"
            >
              <FileDown className="h-4 w-4 ml-1" />
              <span>تحميل القالب</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center"
            >
              <Upload className="h-4 w-4 ml-1" />
              <span>استيراد من Excel</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="flex items-center"
            >
              <Download className="h-4 w-4 ml-1" />
              <span>تصدير إلى Excel</span>
            </Button>
            
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
            />
          </div>

          <Button 
            variant="default" 
            className="bg-green-500 hover:bg-green-600"
            onClick={handleNewInvoice}
          >
            <Plus className="h-5 w-5 ml-1" />
            فاتورة جديدة
          </Button>
        </div>
      </div>
      
      <div className="mb-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="sales">فواتير المبيعات</TabsTrigger>
            {combinePurchaseViews && <TabsTrigger value="purchases">فواتير المشتريات</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="sales" className="mt-6">
            <InvoiceTabContent />
          </TabsContent>
          
          {combinePurchaseViews && (
            <TabsContent value="purchases" className="mt-6">
              <InvoiceTabContent />
            </TabsContent>
          )}
        </Tabs>
      </div>
      
      {/* Invoice Form */}
      {isInvoiceFormOpen && (
        <InvoiceForm
          isOpen={isInvoiceFormOpen}
          onClose={() => setIsInvoiceFormOpen(false)}
          invoiceToEdit={invoiceToEdit}
          invoiceType={activeTab === "purchases" ? "purchase" : "sales"}
        />
      )}
      
      {/* Print dialog */}
      {selectedInvoiceForPrint && (
        <Dialog open={!!selectedInvoiceForPrint} onOpenChange={() => setSelectedInvoiceForPrint(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>معاينة الفاتورة</DialogTitle>
              <DialogDescription>
                يمكنك طباعة الفاتورة أو حفظها كملف PDF
              </DialogDescription>
            </DialogHeader>
            <InvoicePrint invoiceId={selectedInvoiceForPrint} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}