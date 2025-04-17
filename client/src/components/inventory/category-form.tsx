import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Category form schema for validation
const formSchema = z.object({
  name: z.string().min(2, { message: "يجب أن يكون اسم الفئة على الأقل حرفين" }),
  parent_id: z.number().optional().nullable(),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
});

// Form values type
type CategoryFormValues = z.infer<typeof formSchema>;

interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: any;
}

export default function CategoryForm({ isOpen, onClose, categoryToEdit }: CategoryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories for parent category dropdown
  const { data: categories = [] } = useQuery<{id: number, name: string}[]>({
    queryKey: ['/api/categories'],
  });

  // Initialize form with react-hook-form and zod validation
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      parent_id: null,
      description: "",
      isDefault: false,
    },
  });

  // Update form when editing a category
  useEffect(() => {
    if (categoryToEdit) {
      form.reset({
        name: categoryToEdit.name,
        parent_id: categoryToEdit.parent_id || null,
        description: categoryToEdit.description || "",
        isDefault: categoryToEdit.isDefault || false,
      });
    } else {
      form.reset({
        name: "",
        parent_id: null,
        description: "",
        isDefault: false,
      });
    }
  }, [categoryToEdit, form]);

  // Create/update category mutation
  const mutation = useMutation({
    mutationFn: (values: CategoryFormValues) => {
      if (categoryToEdit) {
        return apiRequest(`/api/categories/${categoryToEdit.id}`, "PUT", values);
      } else {
        return apiRequest("/api/categories", "POST", values);
      }
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      
      // Show success toast
      toast({
        title: categoryToEdit ? "تم تحديث الفئة" : "تم إضافة الفئة",
        description: categoryToEdit ? "تم تحديث بيانات الفئة بنجاح" : "تم إضافة الفئة بنجاح",
      });
      
      // Close the dialog
      onClose();
    },
    onError: (error) => {
      console.error("Error saving category:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الفئة. يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = async (values: CategoryFormValues) => {
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
          <DialogTitle>{categoryToEdit ? "تعديل فئة" : "إضافة فئة جديدة"}</DialogTitle>
          <DialogDescription>
            {categoryToEdit 
              ? "قم بتعديل بيانات الفئة ثم اضغط على حفظ" 
              : "ادخل بيانات الفئة الجديدة ثم اضغط على حفظ"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Category Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم الفئة</FormLabel>
                  <FormControl>
                    <Input placeholder="ادخل اسم الفئة" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Parent Category */}
            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الفئة الأم (اختياري)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))}
                    value={field.value?.toString() || "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الفئة الأم (اختياري)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">بدون فئة أم</SelectItem>
                      {categories
                        .filter((cat: {id: number}) => !categoryToEdit || cat.id !== categoryToEdit.id)
                        .map((category: {id: number, name: string}) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    اختر الفئة الأم إذا كانت هذه الفئة فرعية
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="ادخل وصف الفئة"
                      className="resize-none"
                      {...field}
                    />
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
                    <FormLabel>جعل هذه الفئة افتراضية</FormLabel>
                    <FormDescription>
                      سيتم استخدام هذه الفئة كفئة افتراضية للمنتجات الجديدة
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
                ) : categoryToEdit ? (
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