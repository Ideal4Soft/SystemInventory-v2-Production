import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  BarChart3, 
  Package, 
  Users, 
  DollarSign, 
  FileText, 
  Settings, 
  Database, 
  Upload, 
  Tag, 
  ShoppingCart, 
  LayoutGrid, 
  RefreshCw,
  ArrowUpDownIcon, 
  BookOpen,
  Clock,
  Truck
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTab } from "@/hooks/use-tab";

// Define interfaces for navigation items
interface NavItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

interface ReportNavItem extends NavItem {
  // No additional properties needed now
}

interface OperationNavItem extends NavItem {
  action?: string;
}

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const [location] = useLocation();
  const tabContext = useTab();
  
  // Fetch settings
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      return apiRequest('/api/settings', 'GET');
    }
  });
  
  // Show separate purchases view based on settings
  const showPurchasesView = settings?.combinePurchaseViews === false;
  
  // Primary navigation items
  const primaryNavItems = [
    { title: "الرئيسية", icon: LayoutGrid, path: "/" },
    { title: "البضاعة", icon: Package, path: "/inventory" },
    { title: "الحسابات", icon: Users, path: "/accounts" },
    { title: "الخزينة", icon: DollarSign, path: "/finance" },
    { title: "الفواتير", icon: FileText, path: "/invoices" },
    ...(showPurchasesView ? [{ title: "المشتريات", icon: Truck, path: "/purchases" }] : []),
    { title: "تقارير", icon: BarChart3, path: "/reports" }
  ];
  
  // Report navigation items - Fixed paths with proper routes
  const reportNavItems = [
    { title: "تحليل المبيعات", icon: BarChart3, path: "/reports/sales" },
    { title: "الحركة اليومية", icon: Clock, path: "/reports/daily" },
    { title: "كشف الحسابات", icon: FileText, path: "/reports/accounts" },
    { title: "استيراد بيانات", icon: Upload, path: "/import" }
  ];
  
  // Operations navigation items - Fixed paths with proper routes
  const operationNavItems = [
    { title: "جرد مخزن", icon: Package, path: "/inventory/count" },
    { title: "مصاريف", icon: DollarSign, path: "/finance/expenses" },
    { title: "شراء", icon: ShoppingCart, path: "/purchases/new" },
    { title: "تسوية مخزن", icon: LayoutGrid, path: "/inventory/adjust" },
    { title: "تحويل لمخزن", icon: ArrowUpDownIcon, path: "/inventory", action: "transfer" },
    { title: "بيع", icon: Tag, path: "/sales/new" }
  ];
  
  // Admin navigation items
  const adminNavItems = [
    { title: "إعداد سهل", icon: Settings, path: "/settings" },
    { title: "عمل نسخة احتياطية", icon: Database, path: "/backup" },
    { title: "استرجاع نسخة احتياطية", icon: RefreshCw, path: "/restore" }
  ];
  
  // Function to close sidebar on mobile when clicking a link
  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      setOpen(false);
    }
  };
  
  // Function to handle report links
  const handleReportClick = (item: ReportNavItem, event: React.MouseEvent) => {
    event.preventDefault();
    handleLinkClick();
    
    // Add tab for the report
    tabContext.addTab(item.title, item.path);
    
    // Navigate to the report page
    window.location.href = item.path;
  };
  
  // Function to handle operation links
  const handleOperationClick = (item: OperationNavItem, event: React.MouseEvent) => {
    event.preventDefault();
    handleLinkClick();
    
    // Only append action parameter if action is specified
    const url = item.action ? `${item.path}?action=${item.action}` : item.path;
    
    // Add tab for the operation using the hook's addTab function
    tabContext.addTab(item.title, url);
    
    window.location.href = url;
  };

  return (
    <aside className={cn(
      "fixed inset-y-0 right-0 bg-white border-l border-gray-200 transition-all duration-300 overflow-y-auto z-30",
      open ? "w-72 sm:w-64" : "w-0 lg:w-20",
      "lg:relative lg:translate-x-0"
    )}>
      <div className="p-4 space-y-8">
        {/* Sidebar Logo */}
        <div className="flex justify-center">
          <div className="bg-primary p-3 rounded-lg">
            <Package className="h-8 w-8 text-white" />
          </div>
        </div>
        
        {/* Main Navigation */}
        <nav className="space-y-2">
          <div className="mb-2 px-2 text-xs font-semibold text-gray-500">
            {open ? "الأقسام الرئيسية" : ""}
          </div>
          
          {primaryNavItems.map((item, index) => (
            <Link 
              key={index} 
              href={item.path}
              onClick={handleLinkClick}
            >
              <Button
                variant={location === item.path ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-12 sm:h-10",
                  location === item.path ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
                )}
              >
                <item.icon className={cn("h-6 w-6 sm:h-5 sm:w-5 ml-2", !open && "mx-auto")} />
                {open && <span className="text-base sm:text-sm">{item.title}</span>}
              </Button>
            </Link>
          ))}
        </nav>
        
        {/* Reports */}
        <div className="space-y-2">
          <div className="mb-2 px-2 text-xs font-semibold text-gray-500">
            {open ? "التقارير" : ""}
          </div>
          
          {reportNavItems.map((item, index) => (
            <a 
              key={index} 
              href={item.path}
              onClick={(e) => handleReportClick(item, e)}
              className="block"
            >
              <Button
                variant={location.startsWith(item.path) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-12 sm:h-10",
                  location.startsWith(item.path) ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20" : ""
                )}
              >
                <item.icon className={cn("h-6 w-6 sm:h-5 sm:w-5 ml-2", !open && "mx-auto")} />
                {open && <span className="text-base sm:text-sm">{item.title}</span>}
              </Button>
            </a>
          ))}
        </div>
        
        {/* Operations */}
        <div className="space-y-2">
          <div className="mb-2 px-2 text-xs font-semibold text-gray-500">
            {open ? "العمليات" : ""}
          </div>
          
          {operationNavItems.map((item, index) => (
            <a 
              key={index} 
              href={item.path}
              onClick={(e) => handleOperationClick(item, e)}
              className="block"
            >
              <Button
                variant={location === item.path ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-12 sm:h-10",
                  location === item.path ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
                )}
              >
                <item.icon className={cn("h-6 w-6 sm:h-5 sm:w-5 ml-2", !open && "mx-auto")} />
                {open && <span className="text-base sm:text-sm">{item.title}</span>}
              </Button>
            </a>
          ))}
        </div>
        
        {/* Admin */}
        <div className="space-y-2">
          <div className="mb-2 px-2 text-xs font-semibold text-gray-500">
            {open ? "الإدارة" : ""}
          </div>
          
          {adminNavItems.map((item, index) => (
            <Link 
              key={index} 
              href={item.path}
              onClick={handleLinkClick}
            >
              <Button
                variant={location === item.path ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-12 sm:h-10",
                  location === item.path ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
                )}
              >
                <item.icon className={cn("h-6 w-6 sm:h-5 sm:w-5 ml-2", !open && "mx-auto")} />
                {open && <span className="text-base sm:text-sm">{item.title}</span>}
              </Button>
            </Link>
          ))}
        </div>
        
        {/* Version */}
        <div className="pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
          {open && "النسخة التجريبية - حقوق الطبع والنشر © 2024"}
        </div>
      </div>
    </aside>
  );
}
