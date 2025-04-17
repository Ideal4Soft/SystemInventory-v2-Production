import { useState, useEffect } from "react";
import Header from "./header";
import Sidebar from "./sidebar";
import { useLocation } from "wouter";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState("لوحة التحكم");
  
  // Update page title based on current location
  useEffect(() => {
    switch (location) {
      case "/":
        setPageTitle("لوحة التحكم");
        break;
      case "/accounts":
        setPageTitle("الحسابات");
        break;
      case "/finance":
        setPageTitle("المعاملات المالية");
        break;
      case "/settings":
        setPageTitle("إعداد سهل");
        break;
      case "/backup":
        setPageTitle("عمل نسخة احتياطية");
        break;
      case "/restore":
        setPageTitle("استرجاع نسخة احتياطية");
        break;
      case "/import":
        setPageTitle("استيراد بيانات العملاء والموردين");
        break;
      default:
        setPageTitle("سهل لإدارة الأعمال");
    }
  }, [location]);

  // Function to toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <Header 
        toggleSidebar={toggleSidebar} 
        sidebarOpen={sidebarOpen}
        pageTitle={pageTitle}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        
        <main className="flex-1 overflow-y-auto p-4 pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
