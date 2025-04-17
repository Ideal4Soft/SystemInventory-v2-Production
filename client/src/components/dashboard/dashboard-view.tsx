import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAppContext } from "@/context/app-context";
import { Button } from "@/components/ui/button";
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
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Receipt,
  Calculator
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface InventoryItem {
  id: number;
  productName: string;
  quantity: number;
  warehouseName: string;
}

interface AccountItem {
  id: number;
  name: string;
  type: string;
  currentBalance: number;
}

interface Stats {
  todaySales?: number;
  invoiceCount?: number;
  netProfit?: number;
  availableInventory?: number;
  [key: string]: any;
}

export default function DashboardView() {
  const { companyName } = useAppContext();
  
  // Fetch statistics data - force refetch
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['/api/stats', Date.now()], // Add timestamp to force refresh
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0
  });
  
  // Fetch inventory items
  const { data: inventoryData, refetch: refetchInventory } = useQuery({
    queryKey: ['/api/inventory', Date.now()], // Add timestamp to force refresh
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0
  });
  
  // Fetch accounts
  const { data: accountsData, refetch: refetchAccounts } = useQuery({
    queryKey: ['/api/accounts', Date.now()], // Add timestamp to force refresh
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0
  });
  
  // Process the fetched data
  const stats: Stats = statsData || {} as Stats;
  
  // Process inventory data - filter and sort
  const inventoryItems: InventoryItem[] = Array.isArray(inventoryData) 
    ? inventoryData
        .filter((item: InventoryItem) => item.quantity > 0)
        .sort((a: InventoryItem, b: InventoryItem) => b.quantity - a.quantity)
        .slice(0, 5)
    : [];
  
  // Process accounts data - filter and sort
  const accounts: AccountItem[] = Array.isArray(accountsData)
    ? accountsData
        .filter((account: AccountItem) => 
          account.currentBalance !== 0 && 
          (account.type === 'customer' || account.type === 'supplier')
        )
        .sort((a: AccountItem, b: AccountItem) => 
          Math.abs(b.currentBalance) - Math.abs(a.currentBalance)
        )
        .slice(0, 10)
    : [];
  
  // Force refresh data when component mounts
  useEffect(() => {
    refetchStats();
    refetchInventory();
    refetchAccounts();
    
    // Set up an interval to refresh data every 30 seconds
    const intervalId = setInterval(() => {
      refetchStats();
      refetchInventory();
      refetchAccounts();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [refetchStats, refetchInventory, refetchAccounts]);
  
  // Main navigation tiles
  const mainTiles = [
    { title: "البضاعة", icon: Package, path: "/inventory", color: "bg-primary" },
    { title: "الحسابات", icon: Users, path: "/accounts", color: "bg-primary" },
    { title: "الخزينة", icon: DollarSign, path: "/finance", color: "bg-primary" },
    { title: "الفواتير", icon: FileText, path: "/invoices", color: "bg-primary" },
    { title: "تقارير", icon: BarChart3, path: "/reports", color: "bg-primary" }
  ];
  
  // Report tiles
  const reportTiles = [
    { title: "تحليل المبيعات", icon: BarChart3, path: "/reports", color: "bg-blue-600" },
    { title: "الحركة اليومية", icon: Clock, path: "/reports", color: "bg-blue-600" },
    { title: "كشف الحسابات", icon: FileText, path: "/reports", color: "bg-blue-500" },
    { title: "استيراد بيانات", icon: Upload, path: "/import", color: "bg-blue-500" },
    { title: "جرد مخزن", icon: Package, path: "/inventory", color: "bg-primary" },
    { title: "مصاريف", icon: DollarSign, path: "/finance", color: "bg-red-500" },
    { title: "شراء", icon: ShoppingCart, path: "/invoices", color: "bg-red-500" },
    { title: "تسوية مخزن", icon: LayoutGrid, path: "/inventory", color: "bg-primary" },
    { title: "بيع", icon: Tag, path: "/invoices", color: "bg-primary" }
  ];

  // Correctly filtered accounts based on accounting principles
  // For customers: positive balances mean they owe us money (مدين/عليه)
  // For suppliers: negative balances mean we owe them money (دائن/له)
  const getDebtors = () => {
    return accounts.filter(account => 
      (account.type === 'customer' && account.currentBalance > 0) || 
      (account.type === 'supplier' && account.currentBalance < 0)
    );
  };
  
  const getCreditors = () => {
    return accounts.filter(account => 
      (account.type === 'customer' && account.currentBalance < 0) || 
      (account.type === 'supplier' && account.currentBalance > 0)
    );
  };
  
  // Calculate total debt amounts
  const getTotalDebtAmount = () => {
    return getDebtors().reduce((sum, account) => sum + Math.abs(account.currentBalance), 0);
  };
  
  const getTotalCreditAmount = () => {
    return getCreditors().reduce((sum, account) => sum + Math.abs(account.currentBalance), 0);
  };

  // Calculate total available inventory
  const getTotalInventory = () => {
    return inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <div className="min-h-full">
      <div className="flex flex-col md:flex-row">
        {/* Main Section with Tiles */}
        <div className="flex-1 p-4">
          {/* App Logo and Title - Removed */}
          
          {/* Quick Statistics - With correct account display */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-100">
            <h3 className="text-md font-bold mb-3 text-gray-700 border-b pb-2">إحصائيات سريعة</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-center mb-2">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-sm text-gray-500">المخزون المتاح</div>
                <div className="text-xl font-bold text-blue-600">{getTotalInventory()}</div>
              </div>
              
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="flex justify-center mb-2">
                  <ArrowUp className="h-6 w-6 text-red-600" />
                </div>
                <div className="text-sm text-gray-500">العملاء المدينون (عليهم)</div>
                <div className="text-xl font-bold text-red-600">{formatCurrency(getTotalDebtAmount())}</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="flex justify-center mb-2">
                  <ArrowDown className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-sm text-gray-500">العملاء الدائنون (لهم)</div>
                <div className="text-xl font-bold text-green-600">{formatCurrency(getTotalCreditAmount())}</div>
              </div>
            </div>
          </div>
          
          {/* Main Navigation Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {mainTiles.map((tile, index) => (
              <Link key={index} href={tile.path}>
                <div className={`${tile.color} rounded-lg p-4 text-white text-center cursor-pointer hover:opacity-90 transition duration-150 stat-card`}>
                  <tile.icon className="h-8 w-8 mx-auto mb-2" />
                  <span className="block font-medium">{tile.title}</span>
                </div>
              </Link>
            ))}
          </div>
          
          {/* Dashboard Data Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Inventory Section */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-bold flex items-center justify-between">
                  <span>المخزون المتاح</span>
                  <Link href="/inventory">
                    <Button variant="link" className="h-6 p-0 text-xs">عرض الكل</Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inventoryItems.length > 0 ? (
                  <div className="space-y-1">
                    {inventoryItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md">
                        <div>
                          <p className="font-medium text-sm">{item.productName}</p>
                          <p className="text-xs text-gray-500">{item.warehouseName}</p>
                        </div>
                        <div className="text-sm font-bold">{item.quantity}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 text-sm py-2">لا توجد أصناف متاحة</div>
                )}
              </CardContent>
            </Card>
            
            {/* Clients Section - Debtors (THEY OWE US) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-bold flex items-center justify-between">
                  <span>العملاء المدينون (عليهم)</span>
                  <Link href="/accounts?type=customer">
                    <Button variant="link" className="h-6 p-0 text-xs">عرض الكل</Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getDebtors().length > 0 ? (
                  <div className="space-y-1">
                    {getDebtors().map((account) => (
                      <div key={account.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md">
                        <div className="flex items-center">
                          <ArrowUp className="h-3 w-3 mr-1 text-red-500" />
                          <span className="font-medium text-sm">{account.name}</span>
                        </div>
                        <div className="text-sm font-bold text-red-600">
                          {formatCurrency(Math.abs(account.currentBalance))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 text-sm py-2">لا يوجد عملاء مدينون</div>
                )}
              </CardContent>
            </Card>
            
            {/* Clients Section - Creditors (WE OWE THEM) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-bold flex items-center justify-between">
                  <span>العملاء الدائنون (لهم)</span>
                  <Link href="/accounts">
                    <Button variant="link" className="h-6 p-0 text-xs">عرض الكل</Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getCreditors().length > 0 ? (
                  <div className="space-y-1">
                    {getCreditors().map((account) => (
                      <div key={account.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md">
                        <div className="flex items-center">
                          <ArrowDown className="h-3 w-3 mr-1 text-green-500" />
                          <span className="font-medium text-sm">{account.name}</span>
                        </div>
                        <div className="text-sm font-bold text-green-600">
                          {formatCurrency(Math.abs(account.currentBalance))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 text-sm py-2">لا يوجد عملاء دائنون</div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Functional Area Title */}
          <h3 className="text-lg font-bold text-gray-800 mb-4">تقارير</h3>
          
          {/* Secondary Navigation Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {reportTiles.map((tile, index) => (
              <Link key={index} href={tile.path}>
                <div className={`${tile.color} rounded-lg p-4 text-white text-center cursor-pointer hover:opacity-90 transition duration-150 stat-card`}>
                  <tile.icon className="h-8 w-8 mx-auto mb-2" />
                  <span className="block font-medium">{tile.title}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
        
        {/* Right Sidebar Modules */}
        <div className="w-full md:w-72 bg-gradient-to-b from-green-50 to-green-100 p-4 border-r border-gray-200">
          {/* Quick Tools Section */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">أدوات سريعة</h3>
            <div className="space-y-2">
              <Link href="/settings">
                <div className="flex items-center p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-gray-50">
                  <div className="w-10 h-10 flex items-center justify-center ml-3 bg-blue-500 text-white rounded-lg">
                    <Settings className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">إعداد سهل</h4>
                    <p className="text-xs text-gray-500">ضبط إعدادات البرنامج</p>
                  </div>
                </div>
              </Link>
              
              <div className="flex items-center p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-gray-50">
                <div className="w-10 h-10 flex items-center justify-center ml-3 bg-blue-500 text-white rounded-lg">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">تعلم</h4>
                  <p className="text-xs text-gray-500">دليل استخدام البرنامج</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Statistics Section */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">إحصائيات سريعة</h3>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-gray-700">المبيعات اليوم</span>
                <span className="text-primary font-bold">{stats?.todaySales ? formatCurrency(stats.todaySales) : "0.00 ج.م"}</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-gray-700">عدد الفواتير</span>
                <span className="text-primary font-bold">{stats?.invoiceCount || "0"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">الربح الصافي</span>
                <span className="text-green-600 font-bold">{stats?.netProfit ? formatCurrency(stats.netProfit) : "0.00 ج.م"}</span>
              </div>
            </div>
          </div>
          
          {/* Backup Reminder */}
          <div>
            <Link href="/backup">
              <div className="bg-white rounded-lg shadow-sm p-4 border-r-4 border-amber-500 hover:bg-gray-50 cursor-pointer">
                <h4 className="font-bold text-gray-800 mb-2">نسخة احتياطية</h4>
                <p className="text-sm text-gray-600 mb-3">يجب عمل نسخة احتياطية بشكل دوري لضمان سلامة بياناتك</p>
                <Button className="w-full bg-amber-500 hover:bg-amber-600">
                  <Database className="h-4 w-4 ml-2" />
                  عمل نسخة الآن
                </Button>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
