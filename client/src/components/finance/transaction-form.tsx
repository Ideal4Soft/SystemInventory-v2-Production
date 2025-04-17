import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { Transaction, TransactionFormValues } from "@/types";

// Transaction form schema
const transactionFormSchema = z.object({
  type: z.string().min(1, { message: "نوع المعاملة مطلوب" }),
  accountId: z.number({ required_error: "الحساب مطلوب" }),
  amount: z.number().min(0.01, { message: "المبلغ يجب أن يكون أكبر من 0" }),
  date: z.string().min(1, { message: "التاريخ مطلوب" }),
  paymentMethod: z.string().min(1, { message: "طريقة الدفع مطلوبة" }),
  notes: z.string().optional(),
  reference: z.string().optional(),
  isDebit: z.boolean().optional(),
});

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  accounts: Array<{ id: number; name: string; currentBalance?: number }>;
}

export function TransactionForm({ isOpen, onClose, transaction, accounts }: TransactionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [showDebitCredit, setShowDebitCredit] = useState(false);
  
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: transaction?.type || "credit",
      accountId: transaction?.accountId || (accounts[0]?.id || 0),
      amount: transaction?.amount || 0,
      date: transaction?.date ? new Date(transaction.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      paymentMethod: transaction?.paymentMethod || "bank",
      notes: transaction?.notes || "",
      reference: transaction?.reference || "",
      isDebit: transaction?.isDebit !== undefined ? transaction.isDebit : true,
    },
  });
  
  // Find account details when accountId changes
  useEffect(() => {
    const accountId = form.watch('accountId');
    const foundAccount = accounts.find(a => a.id === accountId);
    setSelectedAccount(foundAccount);
  }, [form.watch('accountId'), accounts]);
  
  // Show/hide debit/credit field based on transaction type
  useEffect(() => {
    const type = form.watch('type');
    setShowDebitCredit(type === 'journal');
  }, [form.watch('type')]);
  
  // Fill amount to match account balance
  const fillAccountBalance = () => {
    if (selectedAccount?.currentBalance) {
      const balance = Math.abs(selectedAccount.currentBalance);
      form.setValue('amount', balance);
      
      if (selectedAccount.currentBalance < 0) {
        form.setValue('type', 'credit');
      } else if (selectedAccount.currentBalance > 0) {
        form.setValue('type', 'debit');
      }
    }
  };
  
  const onSubmit = async (data: TransactionFormValues) => {
    setIsSubmitting(true);
    try {
      // Log data for debugging
      console.log("Submitting transaction data:", data);
      
      // Perform basic validation
      if (!data.accountId || isNaN(Number(data.accountId))) {
        throw new Error("الحساب غير صالح");
      }
      
      if (!data.amount || data.amount <= 0 || isNaN(Number(data.amount))) {
        throw new Error("المبلغ غير صالح - يجب أن يكون أكبر من صفر");
      }
      
      // Ensure numeric values are properly formatted
      const formattedData = {
        ...data,
        accountId: Number(data.accountId),
        amount: Number(data.amount)
      };
      
      if (transaction) {
        await apiRequest(`/api/transactions/${transaction.id}`, "PATCH", formattedData);
        toast({
          title: "تم التحديث بنجاح",
          description: "تم تحديث المعاملة المالية بنجاح",
        });
      } else {
        const response = await apiRequest("/api/transactions", "POST", formattedData);
        console.log("Transaction created successfully:", response);
        
        toast({
          title: "تم الإنشاء بنجاح",
          description: "تم إنشاء المعاملة المالية بنجاح",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      onClose();
    } catch (error) {
      console.error("Error saving transaction:", error);
      
      // Provide more specific error message
      let errorMessage = "حدث خطأ أثناء حفظ المعاملة المالية";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "خطأ في الحفظ",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{transaction ? "تعديل معاملة" : "معاملة جديدة"}</DialogTitle>
          <DialogDescription>
            {transaction ? "تعديل تفاصيل المعاملة المالية" : "إنشاء معاملة مالية جديدة"}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع المعاملة</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع المعاملة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="credit">قبض</SelectItem>
                      <SelectItem value="debit">دفع</SelectItem>
                      <SelectItem value="journal">قيد محاسبي</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الحساب</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحساب" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {selectedAccount?.currentBalance !== undefined && (
                    <div className="mt-1 text-sm flex items-center justify-between">
                      <span className={selectedAccount.currentBalance < 0 ? "text-red-500" : "text-green-500"}>
                        {Math.abs(selectedAccount.currentBalance).toFixed(2)} ج.م
                        {selectedAccount.currentBalance < 0 ? " (مدين)" : " (دائن)"}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={fillAccountBalance}
                      >
                        استخدام الرصيد
                      </Button>
                    </div>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المبلغ</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التاريخ</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>طريقة الدفع</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر طريقة الدفع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">نقدي</SelectItem>
                        <SelectItem value="bank">تحويل بنكي</SelectItem>
                        <SelectItem value="check">شيك</SelectItem>
                        <SelectItem value="card">بطاقة ائتمان</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المرجع</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showDebitCredit && (
              <FormField
                control={form.control}
                name="isDebit"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="w-4 h-4"
                      />
                    </FormControl>
                    <FormLabel className="mt-0">مدين</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⌛</span>
                    جاري الحفظ...
                  </span>
                ) : transaction ? (
                  "تحديث"
                ) : (
                  "حفظ"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 