import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAppContext } from "@/context/app-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, Plus, Menu, Package, Users, DollarSign, FileText, LayoutGrid } from "lucide-react";
import { useTab } from "@/hooks/use-tab";

export interface HeaderProps {
  pageTitle: string;
  toggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export default function Header({ pageTitle, toggleSidebar, sidebarOpen }: HeaderProps) {
  const [location, navigate] = useLocation();
  const { user, companyName } = useAppContext();
  const { tabs, activeTab, addTab, removeTab, setActiveTab } = useTab();
  
  // Main navigation items - removed from UI but keeping for reference
  const navItems = [
    { title: "البرنامج", path: "/" },
    { title: "الصفحة الرئيسية", path: "/" },
    { title: "الحسابات", path: "/accounts" },
    { title: "الخزينة", path: "/finance" },
    { title: "الفواتير", path: "/" },
    { title: "مساعدة", path: "/" },
    { title: "خدمة العملاء", path: "/" },
    { title: "الشراء", path: "/" }
  ];

  // Get icon based on path
  const getTabIcon = (path: string) => {
    switch (path) {
      case '/inventory':
        return <Package className="h-4 w-4 ml-2" />;
      case '/accounts':
        return <Users className="h-4 w-4 ml-2" />;
      case '/finance':
        return <DollarSign className="h-4 w-4 ml-2" />;
      case '/invoices':
        return <FileText className="h-4 w-4 ml-2" />;
      default:
        return <LayoutGrid className="h-4 w-4 ml-2" />;
    }
  };

  // Get title based on path
  const getTabTitle = (path: string) => {
    switch (path) {
      case '/inventory':
        return 'البضاعة والمخزون';
      case '/accounts':
        return 'الحسابات';
      case '/finance':
        return 'الخزينة';
      case '/invoices':
        return 'الفواتير';
      default:
        return 'الرئيسية';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      {/* Top Header with Logo and Navigation */}
      <div className="flex items-center justify-between px-4 py-2">
        {/* Logo and Company Info */}
        <div className="flex items-center space-x-2 space-x-reverse">
          {/* Menu Toggle */}
          {toggleSidebar && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleSidebar} 
              className="mr-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          {/* Green Logo */}
          <div className="bg-primary p-1 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          
          {/* App title with company info */}
          <div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <h1 className="text-lg font-bold text-gray-800">سهل لإدارة الأعمال</h1>
              <div className="bg-gray-200 rounded px-1 text-xs text-gray-600">نسخة تجريبية</div>
            </div>
            <div className="text-xs text-gray-600">
              الشركة: {companyName || "شركة الريادي لتوزيع المواد الغذائية"} || المستخدم: {user?.fullName || user?.username || "كريم كمال"}
            </div>
          </div>
        </div>
        
        {/* Main top navigation - removed */}
      </div>
      
      {/* Tab Navigation */}
      <div className="flex items-center px-2">
        <div className="flex overflow-x-auto py-1 border-b border-gray-200 w-full custom-scrollbar">
          {tabs.map((tab) => (
            <div 
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                navigate(tab.path);
              }}
              className={cn(
                "flex items-center px-4 py-2 text-gray-600 font-medium cursor-pointer hover:bg-gray-50 rounded-t-md",
                tab.id === activeTab && "text-primary font-medium border-b-2 border-primary -mb-px bg-gray-100 rounded-t-md"
              )}
            >
              {getTabIcon(tab.path)}
              <span>{getTabTitle(tab.path)}</span>
              {/* Only show close button if not dashboard */}
              {tab.path !== "/" && (
                <button 
                  className="mr-2 text-gray-400 hover:text-gray-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTab(tab.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
