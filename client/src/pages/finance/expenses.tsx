import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TransactionForm } from "@/components/finance/transaction-form";
import { useLocation } from "wouter";
import { Plus, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ExpensesPage() {
  const [, navigate] = useLocation();
  const [isFormOpen, setIsFormOpen] = useState(true);
  
  // Fetch accounts data for the transaction form
  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: async () => {
      return apiRequest('/api/accounts', 'GET');
    }
  });

  // Filter expense accounts if needed, or get all accounts
  const expenseAccounts = accounts.filter((account: any) => 
    account.type === 'expense' || account.type === 'supplier'
  ) || accounts;
  
  const handleClose = () => {
    navigate("/finance");
  };
  
  return (
    <div className="p-4 pb-20 sm:p-6 sm:pb-6">
      <Card className="mb-16 sm:mb-6">
        <CardHeader className="px-4 sm:px-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl sm:text-2xl">إضافة مصروف جديد</CardTitle>
            <CardDescription className="text-sm sm:text-base">إدخال مدفوعات ومصروفات</CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={handleClose} className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <TransactionForm 
            isOpen={isFormOpen} 
            onClose={handleClose} 
            transaction={{ 
              id: 0, 
              type: "debit", 
              amount: 0,
              date: new Date().toISOString().substring(0, 10),
              paymentMethod: "cash",
              notes: "",
              reference: "",
              accountId: expenseAccounts[0]?.id || 0
            }} 
            accounts={expenseAccounts}
          />
        </CardContent>
      </Card>
    </div>
  );
} 