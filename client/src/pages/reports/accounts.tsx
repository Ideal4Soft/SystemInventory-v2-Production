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
import { Download, Printer, Filter, ArrowUpDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { exportAccountsToExcel } from "@/lib/excel-utils";

export default function AccountsReportPage() {
  const [accountType, setAccountType] = useState("all");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().substring(0, 10);
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().substring(0, 10));
  const [sortBy, setSortBy] = useState("balance");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // Function to toggle sort direction
  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDirection("desc");
    }
  };

  // Fetch accounts report data
  const { data: accountsData = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/reports/accounts', accountType, startDate, endDate, sortBy, sortDirection],
    queryFn: async () => {
      try {
        const encodedStartDate = encodeURIComponent(startDate);
        const encodedEndDate = encodeURIComponent(endDate);
        const url = `/api/reports/accounts?type=${accountType}&startDate=${encodedStartDate}&endDate=${encodedEndDate}&sortBy=${sortBy}&sortDirection=${sortDirection}`;
        
        return apiRequest(url, "GET");
      } catch (error) {
        console.error("Error fetching accounts report:", error);
        throw error;
      }
    },
    enabled: false, // Don't fetch automatically, only when button is clicked
  });

  // Handler for the "Show Report" button
  const handleShowReport = () => {
    refetch();
  };

  // Export to Excel
  const handleExport = () => {
    if (!accountsData || accountsData.length === 0) {
      alert("لا توجد بيانات للتصدير!");
      return;
    }
    
    try {
      exportAccountsToExcel(accountsData.map(account => ({
        ...account,
        type: account.type,
        code: account.id?.toString() || '',
      })));
      
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
              <CardTitle>تقرير الحسابات</CardTitle>
              <CardDescription>عرض كشف حساب للعملاء والموردين</CardDescription>
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
          <div className="print:hidden grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label>نوع الحساب</Label>
              <Select defaultValue={accountType} onValueChange={setAccountType}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الحساب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحسابات</SelectItem>
                  <SelectItem value="customer">العملاء</SelectItem>
                  <SelectItem value="supplier">الموردين</SelectItem>
                  <SelectItem value="employee">الموظفين</SelectItem>
                  <SelectItem value="expense">المصروفات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>من تاريخ</Label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
              />
            </div>
            
            <div>
              <Label>إلى تاريخ</Label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
              />
            </div>
            
            <div className="flex items-end">
              <Button onClick={handleShowReport} className="w-full">
                <Filter className="h-4 w-4 ml-1" />
                عرض التقرير
              </Button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">رقم</TableHead>
                  <TableHead>
                    <div className="flex items-center cursor-pointer" onClick={() => toggleSort("name")}>
                      اسم الحساب
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>نوع الحساب</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>
                    <div className="flex items-center cursor-pointer" onClick={() => toggleSort("balance")}>
                      الرصيد
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center cursor-pointer" onClick={() => toggleSort("transactions")}>
                      عدد المعاملات
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">جاري تحميل البيانات...</TableCell>
                  </TableRow>
                ) : accountsData && accountsData.length > 0 ? (
                  accountsData.map((account, index) => (
                    <TableRow key={account.id || index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{account.name}</TableCell>
                      <TableCell>{getAccountTypeName(account.type)}</TableCell>
                      <TableCell dir="ltr">{account.phone || "—"}</TableCell>
                      <TableCell className={`${parseFloat(account.balance) < 0 ? "text-red-500" : parseFloat(account.balance) > 0 ? "text-green-600" : ""}`}>
                        {formatCurrency(account.balance)}
                      </TableCell>
                      <TableCell>{account.transactions || 0}</TableCell>
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
          
          {accountsData && accountsData.length > 0 && (
            <div className="mt-4 text-left">
              <p className="font-medium">
                إجمالي عدد الحسابات: {accountsData.length}
              </p>
              <p className="font-medium">
                إجمالي الأرصدة: {formatCurrency(accountsData.reduce((sum, account) => sum + parseFloat(account.balance || "0"), 0))}
              </p>
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

// Helper function to get account type name in Arabic
function getAccountTypeName(type: string) {
  switch (type) {
    case 'customer':
      return 'عميل';
    case 'supplier':
      return 'مورد';
    case 'employee':
      return 'موظف';
    case 'expense':
      return 'مصروف';
    default:
      return type;
  }
} 