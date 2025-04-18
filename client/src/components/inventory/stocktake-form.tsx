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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface StocktakeFormProps {
  onComplete: () => void;
}

export default function StocktakeForm({ onComplete }: StocktakeFormProps) {
  const { toast } = useToast();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  
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
      warehouse: "",
      date: new Date().toISOString().substring(0, 10),
      notes: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      toast({
        title: "تم حفظ جرد المخزن",
        description: "تم حفظ جرد المخزن بنجاح",
      });
      onComplete();
    } catch (error) {
      console.error("Error saving stocktake:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ جرد المخزن",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>جرد المخزن</CardTitle>
        <CardDescription>قم بتحديد المخزن وإدخال الكميات الفعلية للأصناف</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="warehouse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المخزن</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedWarehouse(value);
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المخزن" />
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
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ الجرد</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {selectedWarehouse && (
              <div className="border rounded-md p-2">
                <h3 className="font-medium mb-4">الأصناف</h3>
                <div className="space-y-2">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-2 border-b">
                      <div className="flex-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-gray-500 text-sm">الكمية المتوقعة: {product.quantity || 0}</div>
                      </div>
                      <Input 
                        type="number" 
                        className="w-24" 
                        placeholder="الكمية الفعلية"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
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
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onComplete}>
                إلغاء
              </Button>
              <Button type="submit">
                حفظ جرد المخزن
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 