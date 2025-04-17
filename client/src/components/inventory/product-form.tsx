import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getFullApiUrl } from "@/lib/queryClient";
import { insertProductSchema } from "@shared/schema";

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
const formSchema = insertProductSchema.extend({
  name: z.string().min(2, { message: "يجب أن يكون اسم المنتج على الأقل حرفين" }),
  code: z.string().min(2, { message: "يجب أن يكون الكود على الأقل حرفين" }),
  costPrice: z.coerce.number().min(0, { message: "يجب ألا تقل التكلفة عن 0" }),
  sellPrice1: z.coerce.number().min(0, { message: "يجب ألا يقل سعر البيع عن 0" }),
  sellPrice2: z.coerce.number().min(0, { message: "يجب ألا يقل سعر البيع 2 عن 0" }).optional(),
  sellPrice3: z.coerce.number().min(0, { message: "يجب ألا يقل سعر البيع 3 عن 0" }).optional(),
  sellPrice4: z.coerce.number().min(0, { message: "يجب ألا يقل سعر البيع 4 عن 0" }).optional(),
  minStock: z.coerce.number().min(0, { message: "يجب ألا يقل الحد الأدنى للمخزون عن 0" }).optional(),
});

// Get the form type from the zod schema
type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: any; // Optional product to edit
}

export default function ProductForm({ isOpen, onClose, productToEdit }: ProductFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories for dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
  });

  // Use react-hook-form with zod validation
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      barcode: "",
      categoryId: null,
      costPrice: 0,
      sellPrice1: 0,
      sellPrice2: 0,
      sellPrice3: 0,
      sellPrice4: 0,
      unit: "طن",
      description: "",
      minStock: 0,
      isActive: true,
    },
  });

  // Update form values when editing a product or when categories load
  useEffect(() => {
    if (productToEdit) {
      form.reset({
        name: productToEdit.name,
        code: productToEdit.code,
        barcode: productToEdit.barcode || "",
        categoryId: productToEdit.categoryId,
        costPrice: productToEdit.costPrice,
        sellPrice1: productToEdit.sellPrice1,
        sellPrice2: productToEdit.sellPrice2 || 0,
        sellPrice3: productToEdit.sellPrice3 || 0,
        sellPrice4: productToEdit.sellPrice4 || 0,
        unit: productToEdit.unit || "طن",
        description: productToEdit.description || "",
        minStock: productToEdit.minStock || 0,
        isActive: productToEdit.isActive,
      });
    } else if (categories.length > 0 && !form.getValues('name')) {
      // Only update the categoryId if it's a new product (no name set)
      const defaultCategory = categories.find((cat: any) => cat.isDefault) || null;
      
      if (defaultCategory) {
        form.setValue('categoryId', defaultCategory.id);
      }
    }
  }, [productToEdit, form, categories]);

  // Enhanced product save mutation
  const mutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      const endpoint = productToEdit ? `/api/products/${productToEdit.id}` : '/api/products';
      console.log(`Making ${productToEdit ? 'PATCH' : 'POST'} request to ${endpoint}`, data);
      
      // Ensure all numeric fields are properly converted to numbers
      const formattedData = {
        ...data,
        costPrice: typeof data.costPrice === 'string' ? parseFloat(data.costPrice) : data.costPrice,
        sellPrice1: typeof data.sellPrice1 === 'string' ? parseFloat(data.sellPrice1) : data.sellPrice1,
        sellPrice2: data.sellPrice2 ? (typeof data.sellPrice2 === 'string' ? parseFloat(data.sellPrice2) : data.sellPrice2) : 0,
        sellPrice3: data.sellPrice3 ? (typeof data.sellPrice3 === 'string' ? parseFloat(data.sellPrice3) : data.sellPrice3) : 0,
        sellPrice4: data.sellPrice4 ? (typeof data.sellPrice4 === 'string' ? parseFloat(data.sellPrice4) : data.sellPrice4) : 0,
        minStock: data.minStock ? (typeof data.minStock === 'string' ? parseFloat(data.minStock) : data.minStock) : 0,
        categoryId: data.categoryId ? (typeof data.categoryId === 'string' ? parseInt(data.categoryId) : data.categoryId) : null
      };
      
      try {
        // Use a timestamp to prevent caching
        const timestamp = Date.now();
        const response = await fetch(`${endpoint}?_t=${timestamp}`, {
          method: productToEdit ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          body: JSON.stringify(formattedData),
          credentials: 'include', // Include cookies
        });

        // Log detailed response information
        console.log('Product save response status:', response.status);
        
        // Get text first for debugging
        const responseText = await response.text();
        console.log('Product save response text:', responseText);
        
        if (!response.ok) {
          console.error('API Error Response:', responseText);
          throw new Error(`Error: ${response.status} ${response.statusText || 'Unknown error'}`);
        }

        // Parse JSON if text is not empty
        return responseText ? JSON.parse(responseText) : { success: true };
      } catch (err) {
        console.error('Network or parsing error:', err);
        throw err;
      }
    },
    onSuccess: (data) => {
      // Log success
      console.log('Product saved successfully:', data);
      
      // Force invalidate queries to refetch data with fresh timestamp
      queryClient.invalidateQueries({ 
        queryKey: ['/api/products'],
        refetchType: 'active',
        exact: false 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['/api/inventory'],
        refetchType: 'active', 
        exact: false 
      });
      
      // Show success toast
      toast({
        title: productToEdit ? "تم تحديث المنتج" : "تم إضافة المنتج",
        description: productToEdit ? "تم تحديث بيانات المنتج بنجاح" : "تم إضافة المنتج بنجاح",
      });
      
      // Close the dialog
      onClose();
    },
    onError: (error) => {
      console.error("Error saving product:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ المنتج. يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true);
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      console.error("Error in form submission:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ المنتج. يرجى التحقق من البيانات المدخلة",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{productToEdit ? "تعديل منتج" : "إضافة منتج جديد"}</DialogTitle>
          <DialogDescription>
            {productToEdit 
              ? "قم بتعديل بيانات المنتج ثم اضغط على حفظ" 
              : "ادخل بيانات المنتج الجديد ثم اضغط على حفظ"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المنتج</FormLabel>
                    <FormControl>
                      <Input placeholder="ادخل اسم المنتج" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Product Code */}
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كود المنتج</FormLabel>
                    <FormControl>
                      <Input placeholder="ادخل كود المنتج" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Barcode */}
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الباركود</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ادخل رقم الباركود (اختياري)" 
                        {...field} 
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الفئة</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الفئة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">بدون فئة</SelectItem>
                        {(categories as any[]).map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unit */}
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>وحدة القياس</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      defaultValue={field.value || "طن"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر وحدة القياس" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="طن">طن</SelectItem>
                        <SelectItem value="piece">قطعة</SelectItem>
                        <SelectItem value="kg">كيلو جرام</SelectItem>
                        <SelectItem value="liter">لتر</SelectItem>
                        <SelectItem value="meter">متر</SelectItem>
                        <SelectItem value="box">علبة</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Min Stock */}
              <FormField
                control={form.control}
                name="minStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحد الأدنى للمخزون</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cost Price */}
              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>سعر التكلفة</FormLabel>
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

              {/* Sell Price 1 */}
              <FormField
                control={form.control}
                name="sellPrice1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>سعر البيع 1</FormLabel>
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

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>الوصف</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="وصف المنتج (اختياري)" 
                        className="h-20" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="mt-6">
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
                className="bg-amber-500 hover:bg-amber-600"
              >
                {isSubmitting ? "جاري الحفظ..." : "حفظ المنتج"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}