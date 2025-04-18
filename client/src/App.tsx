import { BrowserRouter } from 'react-router-dom';
import Layout from "./components/layout/main-layout";
import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Accounts from "@/pages/accounts";
import Finance from "@/pages/finance";
import Settings from "@/pages/settings";
import Backup from "@/pages/backup";
import Restore from "@/pages/restore";
import Import from "@/pages/import";
import Inventory from "@/pages/inventory";
import Invoices from "@/pages/invoices";
import Purchases from "@/pages/purchases";
import Reports from "@/pages/reports";
import { useEffect } from "react";
import { useAppContext } from "./context/app-context";
import DashboardView from "./components/dashboard/dashboard-view";
import AccountsView from "./components/accounts/accounts-view";
import InventoryView from "./components/inventory/inventory-view";
import InvoicesView from "./components/invoices/invoices-view";
import PurchasesView from "./components/invoices/purchases-view";
import SettingsView from "./components/settings/settings-view";
import ReportsView from "./components/reports/reports-view";
import BackupView from "./components/backup/backup-view";
import RestoreView from "./components/backup/restore-view";
import FinanceView from "./components/finance/finance-view";
import MainLayout from "./components/layout/main-layout";
import InvoiceForm from "./components/invoices/invoice-form";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./lib/queryClient";
import InventoryAdjustPage from "./pages/inventory/adjust";
import InventoryCountPage from "./pages/inventory/count";
import ExpensesPage from "./pages/finance/expenses";
import NewSalesPage from "./pages/sales/new";
import ImportView from "./components/import/import-view";
import AccountsReportPage from "./pages/reports/accounts";
import DailyReportPage from "./pages/reports/daily";
import SalesReportPage from "./pages/reports/sales";

function App() {
  const { setUser, setAuthenticated } = useAppContext();
  const [, navigate] = useLocation();

  // Fetch settings
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      return apiRequest('/api/settings', 'GET');
    }
  });

  // Auto-login with default user
  useEffect(() => {
    const testUser = {
      id: 1,
      username: "test",
      fullName: "Test User",
      role: "admin"
    };
    
    // Set user in context and localStorage
    setUser(testUser);
    setAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(testUser));
    localStorage.setItem('authenticated', 'true');
    
    // Redirect to dashboard if on login page
    if (window.location.pathname === '/login') {
      navigate('/', { replace: true });
    }
  }, []);

  // New Invoice route component
  const NewInvoicePage = () => (
    <div className="p-4">
      <InvoiceForm 
        isOpen={true} 
        onClose={() => navigate('/invoices')} 
        invoiceType="sales" 
      />
    </div>
  );

  // New Purchase route component
  const NewPurchasePage = () => (
    <div className="p-4">
      <InvoiceForm 
        isOpen={true} 
        onClose={() => navigate(settings?.combinePurchaseViews ? '/invoices' : '/purchases')} 
        invoiceType="purchase" 
      />
    </div>
  );

  // View/Edit Invoice route component
  const ViewInvoicePage = (props: any) => {
    const id = props.params?.id;
    
    return (
      <div className="p-4">
        <InvoiceForm 
          isOpen={true} 
          onClose={() => navigate('/invoices')}
          invoiceToEdit={{ id: parseInt(id) }}
          invoiceType="sales" 
        />
      </div>
    );
  };

  // Determine if we should show separate purchases view
  const showPurchasesView = settings?.combinePurchaseViews === false;

  return (
    <BrowserRouter>
      <MainLayout>
        <Switch>
          <Route path="/" component={DashboardView} />
          <Route path="/accounts" component={AccountsView} />
          <Route path="/inventory" component={InventoryView} />
          <Route path="/invoices" component={InvoicesView} />
          <Route path="/invoices/new" component={NewInvoicePage} />
          <Route path="/purchases/new" component={NewPurchasePage} />
          <Route path="/invoices/:id" component={ViewInvoicePage} />
          {showPurchasesView && <Route path="/purchases" component={PurchasesView} />}
          <Route path="/finance" component={FinanceView} />
          <Route path="/reports" component={ReportsView} />
          <Route path="/reports/accounts" component={AccountsReportPage} />
          <Route path="/reports/daily" component={DailyReportPage} />
          <Route path="/reports/sales" component={SalesReportPage} />
          <Route path="/settings" component={SettingsView} />
          <Route path="/backup" component={BackupView} />
          <Route path="/restore" component={RestoreView} />
          <Route path="/import" component={ImportView} />
          <Route path="/inventory/adjust" component={InventoryAdjustPage} />
          <Route path="/inventory/count" component={InventoryCountPage} />
          <Route path="/finance/expenses" component={ExpensesPage} />
          <Route path="/sales/new" component={NewSalesPage} />
          <Route component={NotFound} />
        </Switch>
      </MainLayout>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;