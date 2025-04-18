import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ProductForm from "./product-form";

export interface Product {
  id: number;
  code: string;
  name: string;
  categoryId?: number;
  costPrice: number;
  sellPrice1: number;
  isActive: boolean;
  unit?: string;
  quantity?: number;
  category?: string;
  [key: string]: any; // Allow additional properties
}

export default function ProductList() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  
  // Fetch products
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const currentTime = Date.now();
      return apiRequest(`/api/products?t=${currentTime}`, "GET");
    },
  });
  
  // Fetch categories for display
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      return apiRequest("/api/categories", "GET");
    },
  });
  
  // Filter products based on search
  const filteredProducts = products.filter((product: Product) => {
    const searchLower = search.toLowerCase();
    return (
      product.name?.toLowerCase().includes(searchLower) ||
      product.code?.toLowerCase().includes(searchLower) ||
      (categories?.find(c => c.id === product.categoryId)?.name || "")
        .toLowerCase()
        .includes(searchLower)
    );
  });
  
  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsProductFormOpen(true);
  };
  
  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsProductFormOpen(true);
  };
  
  const handleProductFormClose = () => {
    setIsProductFormOpen(false);
    setSelectedProduct(null);
    refetch();
  };
  
  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return "غير مصنف";
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : "غير مصنف";
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2 space-x-reverse">
          <Input
            placeholder="بحث عن منتج..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
        <Button onClick={handleAddProduct}>إضافة منتج</Button>
      </div>
      
      <Card>
        <CardHeader className="py-4">
          <CardTitle>قائمة المنتجات</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center p-4">جاري التحميل...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الكود</TableHead>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">التصنيف</TableHead>
                  <TableHead className="text-right">الوحدة</TableHead>
                  <TableHead className="text-right">سعر التكلفة</TableHead>
                  <TableHead className="text-right">سعر البيع</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      لا توجد منتجات
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product: Product) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.code}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{getCategoryName(product.categoryId)}</TableCell>
                      <TableCell>{product.unit || "قطعة"}</TableCell>
                      <TableCell>{product.costPrice?.toFixed(2)}</TableCell>
                      <TableCell>{product.sellPrice1?.toFixed(2)}</TableCell>
                      <TableCell>{product.quantity || 0}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditProduct(product)}
                        >
                          تعديل
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <ProductForm 
        isOpen={isProductFormOpen} 
        onClose={handleProductFormClose} 
        productToEdit={selectedProduct} 
      />
    </div>
  );
} 