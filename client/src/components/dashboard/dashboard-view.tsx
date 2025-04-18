import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useLocation } from "wouter";
import { useAppContext } from "@/context/app-context";
import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import {
  Package,
  Users,
  DollarSign,
  FileText,
  BarChart3,
  Clock,
  Upload,
  ShoppingCart,
  LayoutGrid,
  Tag,
  BookOpen,
  Settings,
  Database,
  TrendingUp,
  Download
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Define proper types
interface InventoryItem {
  id: number;
  productId?: number;
  productName: string;
  productCode?: string;
  quantity: number;
  warehouseName?: string;
}

interface Account {
  id: number;
  name: string;
  type: string;
  currentBalance: number;
}

interface StatsData {
  totalSales: number;
  todaySales: number;
  invoiceCount: number;
  netProfit: number;
  customerCount?: number;
  supplierCount?: number;
  debtorBalance?: number;
  creditorBalance?: number;
}

// Simple dashboard with direct API queries but with proper caching
export default function DashboardView() {
  const { companyName } = useAppContext();
  const [, navigate] = useLocation();
  const [lastBackupFile, setLastBackupFile] = useState<string | null>(null);

  // Get system stats
  const statsQuery = useQuery({
    queryKey: ['/api/stats'],
    retry: 2
  });

  // Get accounts data
  const accountsQuery = useQuery({
    queryKey: ['/api/accounts'],
    retry: 2
  });

  // Get inventory data
  const inventoryQuery = useQuery({
    queryKey: ['/api/inventory'],
    retry: 2
  });

  // Log API responses for debugging
  useEffect(() => {
    if (statsQuery.data) {
      console.log("Stats data:", statsQuery.data);
    }
    if (accountsQuery.data) {
      console.log("Accounts data:", accountsQuery.data);
    }
    if (inventoryQuery.data) {
      console.log("Inventory data:", inventoryQuery.data);
    }
  }, [statsQuery.data, accountsQuery.data, inventoryQuery.data]);
  
  // Process the data
  const accountsData = Array.isArray(accountsQuery.data) ? accountsQuery.data : [];
  const inventoryData = Array.isArray(inventoryQuery.data) ? inventoryQuery.data : [];
  const stats = (statsQuery.data as StatsData) || {
    totalSales: 0,
    todaySales: 0,
    invoiceCount: 0,
    netProfit: 0
  };
  
  const customersWithDebit = accountsData
    .filter(a => a && a.type === 'customer' && a.currentBalance > 0);
  
  const suppliersWithCredit = accountsData
    .filter(a => a && a.type === 'supplier' && a.currentBalance > 0);
    
  // Add new filter for customers with credit balances (we owe them)
  const customersWithCredit = accountsData
    .filter(a => a && a.type === 'customer' && a.currentBalance < 0);
  
  const totalDebit = customersWithDebit.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  const totalCredit = suppliersWithCredit.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  // Calculate the absolute value of total customer credit
  const totalCustomerCredit = Math.abs(customersWithCredit.reduce((sum, a) => sum + (a.currentBalance || 0), 0));
  
  const inventoryWithStock = inventoryData
    .filter(item => item && item.quantity > 0);
  
  const totalInventoryItems = inventoryWithStock.reduce((sum, item) => sum + (item.quantity || 0), 0);
  
  // Main navigation tiles
  const mainTiles = [
    { title: "البضاعة", icon: Package, path: "/inventory", color: "bg-emerald-600" },
    { title: "الحسابات", icon: Users, path: "/accounts", color: "bg-emerald-600" },
    { title: "الخزينة", icon: DollarSign, path: "/finance", color: "bg-emerald-600" },
    { title: "الفواتير", icon: FileText, path: "/invoices", color: "bg-emerald-600" },
    { title: "تقارير", icon: BarChart3, path: "/reports", color: "bg-emerald-600" }
  ];
  
  // Report navigation tiles
  const reportTiles = [
    { title: "تحليل المبيعات", icon: BarChart3, path: "/reports/sales", color: "bg-blue-600" },
    { title: "الحركة اليومية", icon: Clock, path: "/reports/daily", color: "bg-blue-600" },
    { title: "كشف الحسابات", icon: FileText, path: "/reports/accounts", color: "bg-blue-500" },
    { title: "استيراد بيانات", icon: Upload, path: "/import", color: "bg-blue-500" },
    { title: "جرد مخزن", icon: Package, path: "/inventory/count", color: "bg-emerald-600" },
    { title: "مصاريف", icon: DollarSign, path: "/finance/expenses", color: "bg-red-500" },
    { title: "شراء", icon: ShoppingCart, path: "/purchases/new", color: "bg-red-500" },
    { title: "تسوية مخزن", icon: LayoutGrid, path: "/inventory/adjust", color: "bg-emerald-600" },
    { title: "بيع", icon: Tag, path: "/sales/new", color: "bg-emerald-600" }
  ];

  // Function to check for latest backup file
  useEffect(() => {
    const checkLatestBackup = async () => {
      try {
        const response = await fetch('/api/backup/latest');
        if (response.ok) {
          const data = await response.json();
          if (data.backupFile) {
            setLastBackupFile(data.backupFile);
          }
        }
      } catch (error) {
        console.error("Error checking latest backup:", error);
      }
    };
    
    checkLatestBackup();
  }, []);

  // Function to handle backup creation
  const handleBackup = () => {
    // Navigate to backup page
    navigate('/backup');
  };

  // Function to download backup
  const handleDownloadBackup = () => {
    if (!lastBackupFile) return;
    
    // Create the download URL
    const downloadUrl = `/api/backup/download?filePath=${encodeURIComponent(lastBackupFile)}`;
    
    // Open the URL in a new window/tab
    window.open(downloadUrl, '_blank');
  };

  // Stats cards
  const statsCards = [
    {
      title: "العملاء النشطين",
      icon: <Users className="h-7 w-7 text-purple-600" />,
      value: customersWithDebit.length.toString(),
      bgColor: "bg-purple-100",
      borderColor: "border-purple-200"
    },
    {
      title: "المخزون المتاح",
      icon: <Package className="h-7 w-7 text-green-600" />,
      value: `${totalInventoryItems} طن`,
      bgColor: "bg-green-100",
      borderColor: "border-green-200"
    },
    {
      title: "المبيعات الشهرية",
      icon: <TrendingUp className="h-7 w-7 text-blue-600" />,
      value: stats?.totalSales ? formatCurrency(stats.totalSales) : "0.00 ج.م",
      bgColor: "bg-blue-100",
      borderColor: "border-blue-200"
    }
  ];

  // Check if any queries are loading
  const isLoading = statsQuery.isLoading || accountsQuery.isLoading || inventoryQuery.isLoading;
  
  // Check if any queries have errors
  const hasErrors = statsQuery.error || accountsQuery.error || inventoryQuery.error;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Status section */}
      {hasErrors && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 mx-4 mt-4 rounded shadow-sm">
          <div className="flex items-center">
            <div>
              <p className="font-bold">خطأ في تحميل البيانات</p>
              <p className="text-sm">
                حدث خطأ أثناء تحميل بيانات لوحة التحكم. يرجى تحديث الصفحة أو التحقق من اتصالك بالخادم.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {isLoading && (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4 mx-4 mt-4 rounded shadow-sm">
          <div className="flex items-center">
            <div>
              <p className="font-bold">جاري تحميل البيانات...</p>
              <p className="text-sm">يرجى الانتظار حتى يتم تحميل بيانات لوحة التحكم.</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 p-6">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">لوحة التحكم</h1>
          <p className="text-gray-600">مرحبًا بك في نظام إدارة {companyName || 'الشركة'}</p>
        </div>
        
        {/* Main Navigation Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {mainTiles.map((tile, index) => (
            <Link key={index} href={tile.path}>
              <div className={`${tile.color} rounded-lg p-5 text-white text-center cursor-pointer hover:opacity-90 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-1`}>
                <div className="flex flex-col items-center justify-center">
                  <tile.icon className="h-10 w-10 mb-3" />
                  <span className="text-lg font-medium">{tile.title}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {statsCards.map((card, index) => (
            <div key={index} className={`${card.bgColor} rounded-lg shadow-md p-4 border ${card.borderColor}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-gray-700 text-sm font-medium mb-1">{card.title}</h3>
                  <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                </div>
                <div className="p-3 bg-white bg-opacity-70 rounded-full shadow-sm">
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Customer & Supplier Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                <span className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-blue-600" />
                  العملاء المدينون (عليهم)
                </span>
              </h2>
              <Link href="/accounts?type=customer&balance=positive">
                <Button variant="outline" size="sm">عرض الكل</Button>
              </Link>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium text-sm text-gray-600">العميل</span>
                <span className="font-medium text-sm text-gray-600">المبلغ</span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-800">إجمالي المديونية</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(totalDebit)}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-800">عدد العملاء المدينين</span>
                <span className="font-bold">
                  {customersWithDebit.length} عميل
                </span>
              </div>

              {customersWithDebit.length > 0 ? (
                customersWithDebit.slice(0, 3).map(customer => (
                  <div key={customer.id} className="flex justify-between items-center py-2 border-t">
                    <span className="text-sm">{customer.name}</span>
                    <span className="text-sm font-medium text-red-600">{formatCurrency(customer.currentBalance)}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-2 text-gray-500">لا يوجد عملاء مدينين</div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                <span className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-green-600" />
                  العملاء الدائنين (لهم)
                </span>
              </h2>
              <Link href="/accounts?type=customer&balance=negative">
                <Button variant="outline" size="sm">عرض الكل</Button>
              </Link>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium text-sm text-gray-600">العميل</span>
                <span className="font-medium text-sm text-gray-600">المبلغ</span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-800">إجمالي المستحقات</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(totalCustomerCredit)}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-800">عدد العملاء الدائنين</span>
                <span className="font-bold">
                  {customersWithCredit.length} عميل
                </span>
              </div>

              {customersWithCredit.length > 0 ? (
                customersWithCredit.slice(0, 3).map(customer => (
                  <div key={customer.id} className="flex justify-between items-center py-2 border-t">
                    <span className="text-sm">{customer.name}</span>
                    <span className="text-sm font-medium text-green-600">{formatCurrency(Math.abs(customer.currentBalance))}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-2 text-gray-500">لا يوجد عملاء دائنين</div>
              )}
            </div>
          </div>
        </div>

        {/* Inventory Section */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">
              <span className="flex items-center">
                <Package className="h-5 w-5 mr-2 text-emerald-600" />
                المخزون المتاح
              </span>
            </h2>
            <Link href="/inventory">
              <Button variant="outline" size="sm">عرض الكل</Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {inventoryWithStock.length > 0 ? (
              <div className="space-y-2">
                {inventoryWithStock.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md border border-gray-100">
                    <div>
                      <p className="font-medium text-sm">{item.productName}</p>
                      <p className="text-xs text-gray-500">{item.productCode || ''} - {item.warehouseName || 'المخزن الرئيسي'}</p>
                    </div>
                    <div className="text-sm font-bold text-emerald-600">{item.quantity}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="col-span-2 text-center text-gray-500 py-4">لا توجد أصناف متاحة في المخزون</div>
            )}
          </div>
        </div>
        
        {/* Backup Section - Moved from Sidebar */}
        <div className="bg-white rounded-lg shadow mb-8 p-4 border-r-4 border-amber-500 max-w-md mx-auto">
          <h4 className="font-bold text-gray-800 mb-2">نسخة احتياطية</h4>
          <p className="text-sm text-gray-600 mb-3">يجب عمل نسخة احتياطية بشكل دوري لضمان سلامة بياناتك</p>
          
          <div className="space-y-2">
            <Button 
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleBackup}
            >
              <Database className="h-4 w-4 ml-2" />
              عمل نسخة الآن
            </Button>
            
            {lastBackupFile && (
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleDownloadBackup}
              >
                <Download className="h-4 w-4 ml-2" />
                تحميل آخر نسخة احتياطية
              </Button>
            )}
          </div>
        </div>
        
        {/* Reports Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">التقارير والعمليات السريعة</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {reportTiles.map((tile, index) => (
              <Link key={index} href={tile.path}>
                <div className={`${tile.color} rounded-lg p-3 text-white text-center cursor-pointer hover:opacity-90 transition hover:shadow-lg`}>
                  <tile.icon className="h-8 w-8 mx-auto mb-2" />
                  <span className="text-sm font-medium">{tile.title}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
