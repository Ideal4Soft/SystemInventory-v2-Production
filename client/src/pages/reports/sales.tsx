import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Download, Printer, Filter, PieChart, LineChart, BarChart } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { exportInvoicesToExcel } from "@/lib/excel-utils";
import { Line, LineChart as RechartsLineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, BarChart as RechartsBarChart } from "recharts";

interface SalesReportItem {
  id: number;
  invoiceNumber: string;
  date: string;
  accountName: string;
  total: number;
  paid: number;
  remaining: number;
  items: number;
  status: string;
}

interface SalesChartData {
  name: string;
  value: number;
}

export default function SalesReportPage() {
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().substring(0, 10);
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().substring(0, 10));
  const [customerFilter, setCustomerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Fetch sales report data
  const { data: reportData, isLoading, refetch } = useQuery<{
    sales: SalesReportItem[],
    summary: {
      totalSales: number;
      totalPaid: number;
      totalRemaining: number;
      averageSale: number;
      invoiceCount: number;
    },
    chartData: SalesChartData[]
  }>({
    queryKey: ['/api/reports/sales', period, startDate, endDate, customerFilter, statusFilter],
    queryFn: async () => {
      try {
        const encodedStartDate = encodeURIComponent(startDate);
        const encodedEndDate = encodeURIComponent(endDate);
        const url = `/api/reports/sales?period=${period}&startDate=${encodedStartDate}&endDate=${encodedEndDate}&customer=${customerFilter}&status=${statusFilter}`;
        
        return apiRequest(url, "GET");
      } catch (error) {
        console.error("Error fetching sales report:", error);
        throw error;
      }
    },
    enabled: false, // Don't fetch automatically, only when button is clicked
  });

  // Set date range based on period
  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    const today = new Date();
    const endDateStr = today.toISOString().substring(0, 10);
    setEndDate(endDateStr);
    
    let startDateStr = endDateStr;
    
    switch (value) {
      case "week":
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        startDateStr = weekAgo.toISOString().substring(0, 10);
        break;
      case "month":
        const monthAgo = new Date();
        monthAgo.setMonth(today.getMonth() - 1);
        startDateStr = monthAgo.toISOString().substring(0, 10);
        break;
      case "quarter":
        const quarterAgo = new Date();
        quarterAgo.setMonth(today.getMonth() - 3);
        startDateStr = quarterAgo.toISOString().substring(0, 10);
        break;
      case "year":
        const yearAgo = new Date();
        yearAgo.setFullYear(today.getFullYear() - 1);
        startDateStr = yearAgo.toISOString().substring(0, 10);
        break;
    }
    
    setStartDate(startDateStr);
  };

  // Handler for the "Show Report" button
  const handleShowReport = () => {
    refetch();
  };

  // Export to Excel
  const handleExport = () => {
    if (!reportData || !reportData.sales || reportData.sales.length === 0) {
      alert("لا توجد بيانات للتصدير!");
      return;
    }
    
    try {
      exportInvoicesToExcel(reportData.sales);
      alert("تم تصدير التقرير بنجاح!");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("حدث خطأ أثناء تصدير البيانات!");
    }
  };

  // Print report
  const handlePrint = () => {
    window.print();
  };

  // Format data for the charts
  const salesData = reportData?.chartData || [];

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>تقرير المبيعات</CardTitle>
              <CardDescription>عرض وتحليل بيانات المبيعات</CardDescription>
            </div>
            <div className="print:hidden flex space-x-2 space-x-reverse">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 ml-1" />
                تصدير
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 ml-1" />
                طباعة
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="print:hidden grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div>
              <Label>الفترة</Label>
              <Select defaultValue={period} onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفترة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">أسبوع</SelectItem>
                  <SelectItem value="month">شهر</SelectItem>
                  <SelectItem value="quarter">ربع سنة</SelectItem>
                  <SelectItem value="year">سنة</SelectItem>
                  <SelectItem value="custom">مخصص</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>من تاريخ</Label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                disabled={period !== "custom"}
              />
            </div>
            
            <div>
              <Label>إلى تاريخ</Label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                disabled={period !== "custom"}
              />
            </div>
            
            <div>
              <Label>الحالة</Label>
              <Select defaultValue={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="حالة الفاتورة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="paid">مدفوعة</SelectItem>
                  <SelectItem value="partial">مدفوعة جزئياً</SelectItem>
                  <SelectItem value="unpaid">غير مدفوعة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={handleShowReport} className="w-full">
                <Filter className="h-4 w-4 ml-1" />
                عرض التقرير
              </Button>
            </div>
          </div>
          
          {reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground">إجمالي المبيعات</div>
                    <div className="text-2xl font-bold mt-2">{formatCurrency(reportData.summary.totalSales)}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground">المحصل</div>
                    <div className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(reportData.summary.totalPaid)}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground">المتبقي</div>
                    <div className="text-2xl font-bold text-red-500 mt-2">{formatCurrency(reportData.summary.totalRemaining)}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground">عدد الفواتير</div>
                    <div className="text-2xl font-bold mt-2">{reportData.summary.invoiceCount}</div>
                  </CardContent>
                </Card>
              </div>
              
              {salesData.length > 0 && (
                <div className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>تحليل المبيعات حسب {getPeriodLabel(period)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          {period === "month" || period === "week" ? (
                            <RechartsLineChart data={salesData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip formatter={(value) => formatCurrency(value as number)} />
                              <Legend />
                              <Line type="monotone" dataKey="value" stroke="#10b981" name="المبيعات" />
                            </RechartsLineChart>
                          ) : (
                            <RechartsBarChart data={salesData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip formatter={(value) => formatCurrency(value as number)} />
                              <Legend />
                              <Bar dataKey="value" fill="#10b981" name="المبيعات" />
                            </RechartsBarChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">رقم</TableHead>
                      <TableHead>رقم الفاتورة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>إجمالي الفاتورة</TableHead>
                      <TableHead>المدفوع</TableHead>
                      <TableHead>المتبقي</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">جاري تحميل البيانات...</TableCell>
                      </TableRow>
                    ) : reportData.sales && reportData.sales.length > 0 ? (
                      reportData.sales.map((invoice, index) => (
                        <TableRow key={invoice.id || index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{invoice.invoiceNumber}</TableCell>
                          <TableCell>{formatDate(invoice.date)}</TableCell>
                          <TableCell>{invoice.accountName}</TableCell>
                          <TableCell>{formatCurrency(invoice.total)}</TableCell>
                          <TableCell className="text-green-600">{formatCurrency(invoice.paid)}</TableCell>
                          <TableCell className={invoice.remaining > 0 ? 'text-red-500' : ''}>
                            {formatCurrency(invoice.remaining)}
                          </TableCell>
                          <TableCell>{getStatusLabel(invoice.status)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">لا توجد بيانات متاحة</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to format currency
function formatCurrency(amount: string | number) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });
}

// Helper function to format date
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-EG');
}

// Helper function to get status label in Arabic
function getStatusLabel(status: string) {
  switch (status) {
    case 'paid':
      return 'مدفوعة';
    case 'partial':
      return 'مدفوعة جزئياً';
    case 'unpaid':
      return 'غير مدفوعة';
    default:
      return status;
  }
}

// Helper function to get period label in Arabic
function getPeriodLabel(period: string) {
  switch (period) {
    case 'week':
      return 'اليوم';
    case 'month':
      return 'اليوم';
    case 'quarter':
      return 'الشهر';
    case 'year':
      return 'الشهر';
    default:
      return 'الفترة';
  }
} 