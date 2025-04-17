import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertAccountSchema } from "@shared/schema";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Extend the schema for validation
const formSchema = insertAccountSchema.extend({
  name: z.string().min(2, { message: "يجب أن يكون اسم الحساب على الأقل حرفين" }),
  type: z.enum(['customer', 'supplier', 'expense', 'income', 'bank', 'cash']),
});

// Get the form type from the zod schema
type AccountFormValues = z.infer<typeof formSchema>;

interface AccountFormProps {
  isOpen: boolean;
  onClose: () => void;
  accountToEdit?: any; // Optional account to edit
  defaultType?: string; // Optional default account type
}

export default function AccountForm({ isOpen, onClose, accountToEdit, defaultType }: AccountFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use react-hook-form with zod validation
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: (defaultType || "customer") as any,
      code: "",
      phone: "",
      email: "",
      address: "",
      taxNumber: "",
      openingBalance: 0,
      currentBalance: 0,
      category: "",
      isActive: true,
      notes: "",
    },
  });

  // Update form values when editing an account
  useEffect(() => {
    if (accountToEdit) {
      form.reset({
        name: accountToEdit.name,
        type: accountToEdit.type,
        code: accountToEdit.code || "",
        phone: accountToEdit.phone || "",
        email: accountToEdit.email || "",
        address: accountToEdit.address || "",
        taxNumber: accountToEdit.taxNumber || "",
        openingBalance: accountToEdit.openingBalance || 0,
        currentBalance: accountToEdit.currentBalance || 0,
        category: accountToEdit.category || "",
        isActive: accountToEdit.isActive !== false,
        notes: accountToEdit.notes || "",
      });
    } else if (defaultType) {
      form.setValue('type', defaultType as any);
    }
  }, [accountToEdit, defaultType, form]);

  // Create/Update account mutation
  const mutation = useMutation({
    mutationFn: (values: AccountFormValues) => {
      if (accountToEdit) {
        return apiRequest(`/api/accounts/${accountToEdit.id}`, "PATCH", values);
      } else {
        return apiRequest("/api/accounts", "POST", values);
      }
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      
      // Show success toast
      toast({
        title: accountToEdit ? "تم تحديث الحساب" : "تم إضافة الحساب",
        description: accountToEdit ? "تم تحديث بيانات الحساب بنجاح" : "تم إضافة الحساب بنجاح",
      });
      
      // Close the dialog
      onClose();
    },
    onError: (error) => {
      console.error("Error saving account:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الحساب. يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = async (values: AccountFormValues) => {
    setIsSubmitting(true);
    try {
      await mutation.mutateAsync(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get account type label in Arabic
  const getAccountTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'customer': 'عميل',
      'supplier': 'مورد',
      'expense': 'مصروفات',
      'income': 'إيرادات',
      'bank': 'بنك',
      'cash': 'صندوق',
    };
    return types[type] || type;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {accountToEdit 
              ? `تعديل ${getAccountTypeLabel(accountToEdit.type)}: ${accountToEdit.name}` 
              : `إضافة ${getAccountTypeLabel(defaultType || 'customer')} جديد`
            }
          </DialogTitle>
          <DialogDescription>
            {accountToEdit 
              ? "قم بتعديل بيانات الحساب ثم اضغط على حفظ" 
              : "ادخل بيانات الحساب الجديد ثم اضغط على حفظ"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Account Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم الحساب</FormLabel>
                    <FormControl>
                      <Input placeholder="ادخل اسم الحساب" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Account Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع الحساب</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!!defaultType || !!accountToEdit}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الحساب" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="customer">عميل</SelectItem>
                        <SelectItem value="supplier">مورد</SelectItem>
                        <SelectItem value="expense">مصروفات</SelectItem>
                        <SelectItem value="income">إيرادات</SelectItem>
                        <SelectItem value="bank">بنك</SelectItem>
                        <SelectItem value="cash">صندوق</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone Number */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl>
                      <Input placeholder="ادخل رقم الهاتف" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="ادخل البريد الإلكتروني" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Opening Balance */}
              <FormField
                control={form.control}
                name="openingBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الرصيد الافتتاحي</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الفئة</FormLabel>
                    <FormControl>
                      <Input placeholder="فئة الحساب (اختياري)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tax Number */}
              <FormField
                control={form.control}
                name="taxNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الرقم الضريبي</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل الرقم الضريبي" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Address */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>العنوان</FormLabel>
                    <FormControl>
                      <Input placeholder="ادخل العنوان (اختياري)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>ملاحظات</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="ملاحظات (اختياري)" 
                        className="h-20" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex justify-end gap-2 mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}