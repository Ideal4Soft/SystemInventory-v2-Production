import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface InventoryAdjustFormProps {
  onComplete: () => void;
}

interface Product {
  id: number;
  name: string;
  quantity?: number;
  [key: string]: any;
}

interface Warehouse {
  id: number;
  name: string;
  [key: string]: any;
}

interface AdjustmentFormValues {
  warehouse: string;
  product: string;
  currentQuantity: number;
  newQuantity: number;
  adjustmentReason: string;
  date: string;
  notes: string;
}

export default function InventoryAdjustForm({ onComplete }: InventoryAdjustFormProps) {
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  
  // Fetch warehouses
  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
    queryFn: async () => {
      return apiRequest("/api/warehouses", "GET");
    },
  });
  
  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      return apiRequest("/api/products", "GET");
    },
  });
  
  const form = useForm<AdjustmentFormValues>({
    defaultValues: {
      warehouse: "",
      product: "",
      currentQuantity: 0,
      newQuantity: 0,
      adjustmentReason: "",
      date: new Date().toISOString().substring(0, 10),
      notes: "",
    },
  });

  const onSubmit = async (data: AdjustmentFormValues) => {
    try {
      // Prepare data for the API request
      const adjustmentData = {
        warehouseId: parseInt(data.warehouse),
        productId: parseInt(data.product),
        currentQuantity: data.currentQuantity,
        newQuantity: data.newQuantity,
        reason: data.adjustmentReason,
        date: data.date,
        notes: data.notes,
      };
      
      // Make API request to save adjustment
      await apiRequest("/api/inventory/adjust", "POST", adjustmentData);
      
      toast({
        title: "تم حفظ تسوية المخزن",
        description: "تم حفظ تسوية المخزن بنجاح",
      });
      onComplete();
    } catch (error) {
      console.error("Error saving inventory adjustment:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ تسوية المخزن",
        variant: "destructive",
      });
    }
  };
  
  // Get current product quantity
  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId);
    const selectedProductData = products.find((p: Product) => p.id.toString() === productId);
    if (selectedProductData) {
      form.setValue("currentQuantity", selectedProductData.quantity || 0);
    }
  };
  
  return (
    <Card className="mb-16 sm:mb-6">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="text-xl sm:text-2xl">تسوية المخزن</CardTitle>
        <CardDescription className="text-sm sm:text-base">قم بتعديل كميات المخزون للأصناف</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                control={form.control}
                name="warehouse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">المخزن</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-12 sm:h-10">
                          <SelectValue placeholder="اختر المخزن" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {warehouses.map((warehouse: Warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">تاريخ التسوية</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-12 sm:h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="border rounded-md p-4 sm:p-6">
              <h3 className="font-medium mb-4 text-base sm:text-lg">تعديل الكمية</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4">
                <FormField
                  control={form.control}
                  name="product"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">المنتج</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleProductChange(value);
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 sm:h-10">
                            <SelectValue placeholder="اختر المنتج" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map((product: Product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <FormField
                  control={form.control}
                  name="currentQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">الكمية الحالية</FormLabel>
                      <FormControl>
                        <Input type="number" className="h-12 sm:h-10" {...field} readOnly />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="newQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">الكمية الجديدة</FormLabel>
                      <FormControl>
                        <Input type="number" className="h-12 sm:h-10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="adjustmentReason"
                render={({ field }) => (
                  <FormItem className="mt-4 sm:mt-6">
                    <FormLabel className="text-base">سبب التعديل</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-12 sm:h-10">
                          <SelectValue placeholder="اختر سبب التعديل" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="damaged">تلف</SelectItem>
                        <SelectItem value="expired">منتهي الصلاحية</SelectItem>
                        <SelectItem value="count_error">خطأ في العد</SelectItem>
                        <SelectItem value="stolen">مفقود</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[80px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2 pt-4 sm:static fixed bottom-0 right-0 left-0 p-4 bg-white border-t border-gray-200 z-10 sm:border-0 sm:p-0 sm:z-0">
              <Button type="button" variant="outline" onClick={onComplete} className="h-12 sm:h-10 flex-1 sm:flex-initial">
                إلغاء
              </Button>
              <Button type="submit" className="h-12 sm:h-10 flex-1 sm:flex-initial">
                حفظ التسوية
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 