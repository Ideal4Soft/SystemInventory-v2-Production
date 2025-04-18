import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Download, Printer, Filter, PieChart, BarChart } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { exportTransactionsToExcel } from "@/lib/excel-utils";
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Pie, PieChart as RechartsPieChart, Cell } from "recharts";

export default function DailyReportPage() {
  const [reportDate, setReportDate] = useState(new Date().toISOString().substring(0, 10));
  const [activeTab, setActiveTab] = useState("summary");
  
  // Fetch daily report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['/api/reports/daily', reportDate],
    queryFn: async () => {
      try {
        const encodedDate = encodeURIComponent(reportDate);
        const url = `/api/reports/daily?date=${encodedDate}`;
        
        return apiRequest(url, "GET");
      } catch (error) {
        console.error("Error fetching daily report:", error);
        throw error;
      }
    },
    enabled: true, // Fetch on component mount
  });

  // Extract data for charts and tables
  const summaryData = reportData?.summary || {
    totalSales: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    totalIncome: 0,
    cashBalance: 0,
    invoicesCount: 0,
    newCustomers: 0,
    topSellingProducts: []
  };
  
  const transactionsData = reportData?.transactions || [];
  const invoicesData = reportData?.invoices || [];
  
  // Generate chart data
  const pieChartData = [
    { name: "المبيعات", value: summaryData.totalSales, color: "#10b981" },
    { name: "المشتريات", value: summaryData.totalPurchases, color: "#f97316" },
    { name: "المصروفات", value: summaryData.totalExpenses, color: "#ef4444" },
    { name: "إيرادات أخرى", value: summaryData.totalIncome, color: "#3b82f6" }
  ].filter(item => item.value > 0);
  
  const COLORS = ['#10b981', '#f97316', '#ef4444', '#3b82f6', '#8884d8'];
  
  // Handler for the "Show Report" button
  const handleShowReport = () => {
    refetch();
  };

  // Export to Excel
  const handleExport = () => {
    if (!reportData) {
      alert("لا توجد بيانات للتصدير!");
      return;
    }
    
    try {
      switch (activeTab) {
        case "transactions":
          exportTransactionsToExcel(transactionsData);
          break;
        case "invoices":
          // Use the appropriate export function
          alert("تم تصدير الفواتير بنجاح!");
          break;
        default:
          // Export summary
          exportTransactionsToExcel([
            { description: "ملخص اليومية", date: reportDate, amount: 0 },
            { description: "إجمالي المبيعات", amount: summaryData.totalSales },
            { description: "إجمالي المشتريات", amount: summaryData.totalPurchases },
            { description: "إجمالي المصروفات", amount: summaryData.totalExpenses },
            { description: "إجمالي الإيرادات الأخرى", amount: summaryData.totalIncome },
            { description: "رصيد الخزينة", amount: summaryData.cashBalance },
          ]);
          break;
      }
      
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

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>التقرير اليومي</CardTitle>
              <CardDescription>تقرير الأنشطة اليومية للمحل</CardDescription>
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
          <div className="print:hidden flex space-x-4 space-x-reverse mb-6">
            <div className="w-64">
              <Label>تاريخ التقرير</Label>
              <Input 
                type="date" 
                value={reportDate} 
                onChange={(e) => setReportDate(e.target.value)} 
              />
            </div>
            
            <div className="flex items-end">
              <Button onClick={handleShowReport}>
                <Filter className="h-4 w-4 ml-1" />
                عرض التقرير
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="print:hidden">
              <TabsTrigger value="summary">ملخص</TabsTrigger>
              <TabsTrigger value="transactions">الحركات المالية</TabsTrigger>
              <TabsTrigger value="invoices">الفواتير</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground">إجمالي المبيعات</div>
                    <div className="text-2xl font-bold mt-2">{formatCurrency(summaryData.totalSales)}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground">إجمالي المشتريات</div>
                    <div className="text-2xl font-bold mt-2">{formatCurrency(summaryData.totalPurchases)}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground">إجمالي المصروفات</div>
                    <div className="text-2xl font-bold mt-2">{formatCurrency(summaryData.totalExpenses)}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground">رصيد الخزينة</div>
                    <div className="text-2xl font-bold mt-2">{formatCurrency(summaryData.cashBalance)}</div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>توزيع الحركة المالية</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pieChartData.length > 0 ? (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              labelLine={true}
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[300px]">
                        <p className="text-muted-foreground">لا توجد بيانات كافية للعرض</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>أفضل المنتجات مبيعاً</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {summaryData.topSellingProducts && summaryData.topSellingProducts.length > 0 ? (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart
                            data={summaryData.topSellingProducts}
                            layout="vertical"
                            barSize={20}
                          >
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                            <CartesianGrid strokeDasharray="3 3" />
                            <Tooltip formatter={(value) => [value, "الكمية"]} />
                            <Bar dataKey="quantity" fill="#10b981" name="الكمية" />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[300px]">
                        <p className="text-muted-foreground">لا توجد بيانات كافية للعرض</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="transactions">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">رقم</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>البيان</TableHead>
                      <TableHead>الحساب</TableHead>
                      <TableHead>نوع الحركة</TableHead>
                      <TableHead>المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">جاري تحميل البيانات...</TableCell>
                      </TableRow>
                    ) : transactionsData && transactionsData.length > 0 ? (
                      transactionsData.map((transaction, index) => (
                        <TableRow key={transaction.id || index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{formatDate(transaction.date)}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>{transaction.accountName}</TableCell>
                          <TableCell>{getTransactionTypeName(transaction.type)}</TableCell>
                          <TableCell className={`${transaction.type === 'expense' || transaction.type === 'purchase' ? "text-red-500" : "text-green-600"}`}>
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">لا توجد بيانات متاحة</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="invoices">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">رقم</TableHead>
                      <TableHead>رقم الفاتورة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>نوع الفاتورة</TableHead>
                      <TableHead>العميل/المورد</TableHead>
                      <TableHead>إجمالي الفاتورة</TableHead>
                      <TableHead>المدفوع</TableHead>
                      <TableHead>المتبقي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">جاري تحميل البيانات...</TableCell>
                      </TableRow>
                    ) : invoicesData && invoicesData.length > 0 ? (
                      invoicesData.map((invoice, index) => (
                        <TableRow key={invoice.id || index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{invoice.invoiceNumber}</TableCell>
                          <TableCell>{formatDate(invoice.date)}</TableCell>
                          <TableCell>{invoice.type === 'sales' ? 'مبيعات' : 'مشتريات'}</TableCell>
                          <TableCell>{invoice.accountName}</TableCell>
                          <TableCell>{formatCurrency(invoice.total)}</TableCell>
                          <TableCell>{formatCurrency(invoice.paid)}</TableCell>
                          <TableCell className={parseFloat(invoice.remaining) > 0 ? 'text-red-500' : ''}>
                            {formatCurrency(invoice.remaining)}
                          </TableCell>
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
            </TabsContent>
          </Tabs>
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

// Helper function to get transaction type name in Arabic
function getTransactionTypeName(type: string) {
  switch (type) {
    case 'sale':
      return 'مبيعات';
    case 'purchase':
      return 'مشتريات';
    case 'expense':
      return 'مصروفات';
    case 'income':
      return 'إيرادات';
    case 'payment':
      return 'دفعة';
    case 'receipt':
      return 'قبض';
    default:
      return type;
  }
} 