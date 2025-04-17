import { useState } from "react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Download, 
  Printer, 
  Truck,
  Eye,
  Pencil,
  Trash,
  RefreshCw
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import InvoiceForm from "./invoice-form";

export default function PurchasesView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch purchases invoices
  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/invoices', 'purchases'],
    queryFn: async () => {
      return apiRequest(`/api/invoices?type=purchases`, "GET");
    }
  });
  
  // Filter invoices based on search term and status
  const filteredInvoices = invoices.filter((invoice: any) => {
    const matchesSearch = 
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      invoice.account?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Open form to create a new purchase invoice
  const handleCreateInvoice = () => {
    setInvoiceToEdit(null);
    setIsInvoiceFormOpen(true);
  };
  
  // Open form to edit an existing purchase invoice
  const handleEditInvoice = (invoice: any) => {
    setInvoiceToEdit(invoice);
    setIsInvoiceFormOpen(true);
  };
  
  // Delete a purchase invoice
  const handleDeleteInvoice = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذه الفاتورة؟')) {
      return;
    }
    
    try {
      await apiRequest(`/api/invoices/${id}`, "DELETE");
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف فاتورة المشتريات بنجاح",
      });
      refetch();
    } catch (error) {
      toast({
        title: "خطأ في الحذف",
        description: "حدث خطأ أثناء حذف فاتورة المشتريات",
        variant: "destructive",
      });
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "yyyy-MM-dd", { locale: ar });
    } catch (e) {
      return dateString;
    }
  };
  
  // Get status badge based on status value
  const getStatusBadge = (status: string) => {
    let color = "";
    let label = status;
    
    switch (status) {
      case "paid":
        color = "bg-green-100 text-green-800";
        label = "مدفوع";
        break;
      case "draft":
        color = "bg-gray-100 text-gray-800";
        label = "مسودة";
        break;
      case "posted":
        color = "bg-blue-100 text-blue-800";
        label = "مرحلة";
        break;
      case "partially_paid":
        color = "bg-amber-100 text-amber-800";
        label = "مدفوع جزئياً";
        break;
      case "cancelled":
        color = "bg-red-100 text-red-800";
        label = "ملغاة";
        break;
      default:
        color = "bg-gray-100 text-gray-800";
    }
    
    return <Badge className={color + " hover:bg-opacity-80"}>{label}</Badge>;
  };
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-amber-600">فواتير المشتريات</h2>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button 
            variant="default" 
            className="bg-amber-500 hover:bg-amber-600"
            onClick={handleCreateInvoice}
          >
            <Plus className="h-5 w-5 ml-1" />
            فاتورة مشتريات جديدة
          </Button>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2 space-x-reverse">
                <div className="relative w-64">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input 
                    placeholder="بحث..." 
                    className="pr-10" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="posted">مرحلة</SelectItem>
                    <SelectItem value="paid">مدفوعة</SelectItem>
                    <SelectItem value="partially_paid">مدفوعة جزئياً</SelectItem>
                    <SelectItem value="cancelled">ملغاة</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 ml-1" />
                  تحديث
                </Button>
                <Button variant="outline" size="sm">
                  <Printer className="h-4 w-4 ml-1" />
                  طباعة
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 ml-1" />
                  تصدير
                </Button>
              </div>
            </div>
              
            {isLoading ? (
              <div className="py-10 text-center">جاري تحميل البيانات...</div>
            ) : filteredInvoices.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                لا توجد فواتير مشتريات للعرض. انقر على "فاتورة مشتريات جديدة" لإنشاء فاتورة جديدة.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الفاتورة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المورد</TableHead>
                      <TableHead className="text-center">المبلغ</TableHead>
                      <TableHead className="text-center">الحالة</TableHead>
                      <TableHead className="text-center">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.invoiceNumber}</TableCell>
                        <TableCell>{formatDate(invoice.date)}</TableCell>
                        <TableCell>{invoice.account?.name}</TableCell>
                        <TableCell className="text-center">{invoice.total?.toFixed(2)} ج.م</TableCell>
                        <TableCell className="text-center">{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center space-x-1 space-x-reverse">
                            <Button variant="ghost" size="icon" onClick={() => handleEditInvoice(invoice)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEditInvoice(invoice)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteInvoice(invoice.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {isInvoiceFormOpen && (
        <InvoiceForm 
          isOpen={isInvoiceFormOpen}
          onClose={() => setIsInvoiceFormOpen(false)}
          invoiceToEdit={invoiceToEdit}
          invoiceType="purchase"
        />
      )}
    </div>
  );
} 