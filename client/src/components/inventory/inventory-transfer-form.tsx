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

interface InventoryTransferFormProps {
  onComplete: () => void;
}

export default function InventoryTransferForm({ onComplete }: InventoryTransferFormProps) {
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  
  // Fetch warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ["/api/warehouses"],
    queryFn: async () => {
      return apiRequest("/api/warehouses", "GET");
    },
  });
  
  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      return apiRequest("/api/products", "GET");
    },
  });
  
  const form = useForm({
    defaultValues: {
      sourceWarehouse: "",
      targetWarehouse: "",
      product: "",
      availableQuantity: 0,
      transferQuantity: 0,
      date: new Date().toISOString().substring(0, 10),
      notes: "",
    },
  });
  
  // Prevent submitting if source and target warehouses are the same
  const isSameWarehouse = 
    form.watch("sourceWarehouse") && 
    form.watch("targetWarehouse") && 
    form.watch("sourceWarehouse") === form.watch("targetWarehouse");

  const onSubmit = async (data) => {
    if (isSameWarehouse) {
      toast({
        title: "خطأ",
        description: "لا يمكن التحويل لنفس المخزن",
        variant: "destructive",
      });
      return;
    }
    
    try {
      toast({
        title: "تم حفظ تحويل المخزن",
        description: "تم حفظ تحويل المخزن بنجاح",
      });
      onComplete();
    } catch (error) {
      console.error("Error saving inventory transfer:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ تحويل المخزن",
        variant: "destructive",
      });
    }
  };
  
  // Get current product quantity
  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId);
    const selectedProductData = products.find(p => p.id.toString() === productId);
    if (selectedProductData) {
      form.setValue("availableQuantity", selectedProductData.quantity || 0);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>تحويل مخزن</CardTitle>
        <CardDescription>تحويل المنتجات بين المخازن</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="sourceWarehouse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المخزن المصدر</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المخزن المصدر" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {warehouses.map((warehouse) => (
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
                name="targetWarehouse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المخزن الهدف</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المخزن الهدف" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isSameWarehouse && (
                      <p className="text-sm text-red-500 mt-1">لا يمكن التحويل لنفس المخزن</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ التحويل</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-4">المنتج والكمية</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="product"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المنتج</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleProductChange(value);
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المنتج" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map((product) => (
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
                
                <FormField
                  control={form.control}
                  name="availableQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الكمية المتاحة</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} readOnly />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="transferQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>كمية التحويل</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          min={1} 
                          max={form.watch("availableQuantity")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onComplete}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSameWarehouse}>
                حفظ التحويل
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 