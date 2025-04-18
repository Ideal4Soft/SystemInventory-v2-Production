import { useState, useEffect } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import { useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );
  const [pageTitle, setPageTitle] = useState("لوحة التحكم");
  
  // Update page title based on location
  useEffect(() => {
    // Set page title based on current route
    switch (location) {
      case '/accounts':
        setPageTitle('الحسابات');
        break;
      case '/inventory':
        setPageTitle('البضاعة والمخزون');
        break;
      case '/finance':
        setPageTitle('الخزينة');
        break;
      case '/invoices':
        setPageTitle('الفواتير');
        break;
      case '/reports':
        setPageTitle('التقارير');
        break;
      case '/settings':
        setPageTitle('إعدادات');
        break;
      default:
        setPageTitle('لوحة التحكم');
    }
    
    // Update document title
    document.title = `${pageTitle} | سهل لإدارة الأعمال`;
  }, [pageTitle, location]);
  
  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    
    // Add event listener
    window.addEventListener("resize", handleResize);
    
    // Initial check
    handleResize();
    
    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-right">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
          aria-hidden="true"
        />
      )}
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header 
          pageTitle={pageTitle}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />
        
        {/* Mobile sidebar toggle - floating button */}
        <div className="fixed bottom-4 right-4 z-50 lg:hidden">
          <Button 
            size="icon" 
            className="h-12 w-12 rounded-full shadow-lg bg-primary text-white hover:bg-primary/90"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
        
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 pb-20 sm:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
