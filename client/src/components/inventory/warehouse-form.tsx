import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

// Warehouse form schema for validation
const formSchema = z.object({
  name: z.string().min(2, { message: "يجب أن يكون اسم المخزن على الأقل حرفين" }),
  location: z.string().optional(),
  manager: z.string().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// Form values type
type WarehouseFormValues = z.infer<typeof formSchema>;

interface WarehouseFormProps {
  isOpen: boolean;
  onClose: () => void;
  warehouseToEdit?: any;
}

export default function WarehouseForm({ isOpen, onClose, warehouseToEdit }: WarehouseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with react-hook-form and zod validation
  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      location: "",
      manager: "",
      isDefault: false,
      isActive: true,
    },
  });

  // Update form when editing a warehouse
  useEffect(() => {
    if (warehouseToEdit) {
      form.reset({
        name: warehouseToEdit.name,
        location: warehouseToEdit.location || "",
        manager: warehouseToEdit.manager || "",
        isDefault: warehouseToEdit.isDefault || false,
        isActive: warehouseToEdit.isActive !== undefined ? warehouseToEdit.isActive : true,
      });
    } else {
      form.reset({
        name: "",
        location: "",
        manager: "",
        isDefault: false,
        isActive: true,
      });
    }
  }, [warehouseToEdit, form]);

  // Create/update warehouse mutation
  const mutation = useMutation({
    mutationFn: (values: WarehouseFormValues) => {
      if (warehouseToEdit) {
        return apiRequest(`/api/warehouses/${warehouseToEdit.id}`, "PUT", values);
      } else {
        return apiRequest("/api/warehouses", "POST", values);
      }
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses'] });
      
      // Show success toast
      toast({
        title: warehouseToEdit ? "تم تحديث المخزن" : "تم إضافة المخزن",
        description: warehouseToEdit ? "تم تحديث بيانات المخزن بنجاح" : "تم إضافة المخزن بنجاح",
      });
      
      // Close the dialog
      onClose();
    },
    onError: (error) => {
      console.error("Error saving warehouse:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ المخزن. يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = async (values: WarehouseFormValues) => {
    setIsSubmitting(true);
    try {
      await mutation.mutateAsync(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>{warehouseToEdit ? "تعديل مخزن" : "إضافة مخزن جديد"}</DialogTitle>
          <DialogDescription>
            {warehouseToEdit 
              ? "قم بتعديل بيانات المخزن ثم اضغط على حفظ" 
              : "ادخل بيانات المخزن الجديد ثم اضغط على حفظ"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Warehouse Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم المخزن</FormLabel>
                  <FormControl>
                    <Input placeholder="ادخل اسم المخزن" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الموقع (اختياري)</FormLabel>
                  <FormControl>
                    <Input placeholder="ادخل موقع المخزن" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Manager */}
            <FormField
              control={form.control}
              name="manager"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المشرف (اختياري)</FormLabel>
                  <FormControl>
                    <Input placeholder="ادخل اسم مشرف المخزن" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Is Default */}
            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>المخزن الافتراضي</FormLabel>
                    <FormDescription>
                      استخدام هذا المخزن كمخزن افتراضي للنظام
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Is Active */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>نشط</FormLabel>
                    <FormDescription>
                      هذا المخزن نشط ويمكن استخدامه في المعاملات
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span>جاري الحفظ...</span>
                ) : warehouseToEdit ? (
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