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

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const [location] = useLocation();
  
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
  
  // Report navigation items
  const reportNavItems = [
    { title: "تحليل المبيعات", icon: BarChart3, path: "/reports" },
    { title: "الحركة اليومية", icon: Clock, path: "/reports" },
    { title: "كشف الحسابات", icon: FileText, path: "/reports" },
    { title: "استيراد بيانات", icon: Upload, path: "/import" }
  ];
  
  // Operations navigation items
  const operationNavItems = [
    { title: "جرد مخزن", icon: Package, path: "/inventory" },
    { title: "مصاريف", icon: DollarSign, path: "/finance" },
    { title: "شراء", icon: ShoppingCart, path: "/invoices" },
    { title: "تسوية مخزن", icon: LayoutGrid, path: "/inventory" },
    { title: "تحويل لمخزن", icon: ArrowUpDownIcon, path: "/inventory" },
    { title: "بيع", icon: Tag, path: "/invoices" }
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

  return (
    <aside className={cn(
      "fixed inset-y-0 right-0 bg-white border-l border-gray-200 transition-all duration-300 overflow-y-auto z-30",
      open ? "w-64" : "w-0 lg:w-20",
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
        <nav className="space-y-1">
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
                  "w-full justify-start",
                  location === item.path ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
                )}
              >
                <item.icon className={cn("h-5 w-5 ml-2", !open && "mx-auto")} />
                {open && <span>{item.title}</span>}
              </Button>
            </Link>
          ))}
        </nav>
        
        {/* Reports */}
        <div className="space-y-1">
          <div className="mb-2 px-2 text-xs font-semibold text-gray-500">
            {open ? "التقارير" : ""}
          </div>
          
          {reportNavItems.map((item, index) => (
            <Link 
              key={index} 
              href={item.path}
              onClick={handleLinkClick}
            >
              <Button
                variant={location === item.path ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  location === item.path ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20" : ""
                )}
              >
                <item.icon className={cn("h-5 w-5 ml-2", !open && "mx-auto")} />
                {open && <span>{item.title}</span>}
              </Button>
            </Link>
          ))}
        </div>
        
        {/* Operations */}
        <div className="space-y-1">
          <div className="mb-2 px-2 text-xs font-semibold text-gray-500">
            {open ? "العمليات" : ""}
          </div>
          
          {operationNavItems.map((item, index) => (
            <Link 
              key={index} 
              href={item.path}
              onClick={handleLinkClick}
            >
              <Button
                variant="ghost"
                className="w-full justify-start"
              >
                <item.icon className={cn("h-5 w-5 ml-2", !open && "mx-auto")} />
                {open && <span>{item.title}</span>}
              </Button>
            </Link>
          ))}
        </div>
        
        {/* Admin */}
        <div className="space-y-1">
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
                  "w-full justify-start",
                  location === item.path ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
                )}
              >
                <item.icon className={cn("h-5 w-5 ml-2", !open && "mx-auto")} />
                {open && <span>{item.title}</span>}
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
