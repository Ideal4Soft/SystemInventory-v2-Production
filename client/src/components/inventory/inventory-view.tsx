import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  FileText, 
  Printer, 
  Filter, 
  Package2, 
  RefreshCw, 
  Pencil, 
  Trash, 
  Layers,
  Warehouse,
  Check,
  X,
  Download,
  Upload,
  FileDown
} from "lucide-react";
import ProductForm from "./product-form";
import CategoryForm from "./category-form";
import WarehouseForm from "./warehouse-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DataTable } from "@/components/ui/data-table";
import { exportProductsToExcel, getExcelTemplate, importFromExcel } from "@/lib/excel-utils";
import type { ExcelProduct } from "@/types";

// Define types for our data structures
interface Product {
  id: number;
  code: string;
  name: string;
  categoryId?: number;
  costPrice: number;
  sellPrice1: number;
  isActive: boolean;
  unit?: string;
  [key: string]: any; // Allow additional properties
}

interface Category {
  id: number;
  name: string;
  parent_id?: number;
  description?: string;
  isDefault?: boolean;
  [key: string]: any;
}

interface Warehouse {
  id: number;
  name: string;
  location?: string;
  manager?: string;
  isDefault: boolean;
  isActive: boolean;
  [key: string]: any;
}

interface InventoryItem {
  id: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  productName?: string;
  productCode?: string;
  warehouseName?: string;
  [key: string]: any;
}

interface ProductWithInventory {
  id: number;
  code: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  costPrice: number;
  sellPrice: number;
  value: number;
}

// Define a type for the cell info object
interface CellInfo {
  row: {
    original: ProductWithInventory | Category | Warehouse;
  }
}

export default function InventoryView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("products");
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isWarehouseFormOpen, setIsWarehouseFormOpen] = useState(false);
  const [warehouseToEdit, setWarehouseToEdit] = useState<Warehouse | null>(null);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);
  const [showCountDialog, setShowCountDialog] = useState(false);
  const [countProduct, setCountProduct] = useState<ProductWithInventory | null>(null);
  const [countValue, setCountValue] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch products with timestamp to avoid caching issues
  const { 
    data: products = [], 
    isLoading: productsLoading,
    refetch: refetchProducts
  } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      console.log("Fetching products data...");
      const timestamp = Date.now();
      const response = await fetch(`/api/products?t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching products: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Products data successfully fetched:", data);
      return data;
    },
    staleTime: 0
  });

  // Fetch inventory data
  const { 
    data: inventoryData = [], 
    isLoading: inventoryLoading,
    refetch: refetchInventory 
  } = useQuery({
    queryKey: ['/api/inventory'],
    queryFn: () => apiRequest('/api/inventory', 'GET'),
    staleTime: 0
  });

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading, refetch: refetchCategories } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: () => apiRequest('/api/categories', 'GET'),
    staleTime: 0
  });

  // Fetch warehouses
  const { data: warehouses = [], isLoading: warehousesLoading, refetch: refetchWarehouses } = useQuery({
    queryKey: ['/api/warehouses'],
    queryFn: () => apiRequest('/api/warehouses', 'GET'),
    staleTime: 0
  });

  // Process data to combine product and inventory information
  const productsWithInventory: ProductWithInventory[] = products.map((product: Product) => {
    // Find matching inventory item
    const inventoryItem = inventoryData.find((inv: InventoryItem) => inv.productId === product.id) || { quantity: 0 };
    
    // Find matching category
    const category = categories.find((cat: Category) => cat.id === product.categoryId) || { name: 'بدون فئة' };
    
    return {
      id: product.id,
      code: product.code || "",
      name: product.name || "",
      category: category.name,
      quantity: inventoryItem.quantity || 0,
      unit: product.unit || "طن",
      costPrice: product.costPrice || 0,
      sellPrice: product.sellPrice1 || 0,
      value: (inventoryItem.quantity || 0) * (product.costPrice || 0)
    };
  });
  
  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        console.log(`Starting product deletion process for ID: ${id}`);
        
        // Step 1: First identify all inventory items for this product
        const productInventory = inventoryData.filter((inv: InventoryItem) => inv.productId === id);
        console.log(`Found ${productInventory.length} inventory items for product ${id}`);
        
        // Step 2: For each inventory item, set it to zero
        for (const item of productInventory) {
          console.log(`Setting inventory to 0 for product ${id} in warehouse ${item.warehouseId}`);
          await apiRequest('/api/inventory', 'POST', {
            productId: id,
            warehouseId: item.warehouseId,
            quantity: 0,
            isCount: true
          });
        }
        
        // Step 3: Wait a moment to ensure inventory updates are processed
        if (productInventory.length > 0) {
          console.log('Waiting for inventory updates to process...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Step 4: Attempt to delete the product, with retry logic
        let retries = 3;
        let success = false;
        let lastError = null;
        
        while (retries > 0 && !success) {
          try {
            console.log(`Attempting to delete product ${id} (${retries} retries left)`);
            await apiRequest(`/api/products/${id}`, "DELETE");
            console.log(`Successfully deleted product ${id}`);
            success = true;
          } catch (error) {
            lastError = error;
            console.error(`Error deleting product ${id}, retrying...`, error);
            retries--;
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        if (!success) {
          throw lastError || new Error(`Failed to delete product ${id} after multiple attempts`);
        }
        
        return id;
      } catch (error) {
        console.error('Product deletion failed:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "تم حذف المنتج",
        description: "تم حذف المنتج بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      setProductToDelete(null);
    },
    onError: (error) => {
      console.error('Delete product error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف المنتج. يرجى المحاولة مرة أخرى لاحقًا.",
        variant: "destructive",
      });
      setProductToDelete(null);
    }
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/categories/${id}`, "DELETE");
      return id;
    },
    onSuccess: () => {
      toast({
        title: "تم حذف الفئة",
        description: "تم حذف الفئة بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setCategoryToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الفئة",
        variant: "destructive",
      });
      setCategoryToDelete(null);
    }
  });

  // Delete warehouse mutation
  const deleteWarehouseMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/warehouses/${id}`, "DELETE");
      return id;
    },
    onSuccess: () => {
      toast({
        title: "تم حذف المخزن",
        description: "تم حذف المخزن بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses'] });
      setWarehouseToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف المخزن",
        variant: "destructive",
      });
      setWarehouseToDelete(null);
    }
  });

  // Update inventory count mutation
  const updateInventoryMutation = useMutation({
    mutationFn: async (data: { productId: number, quantity: number }) => {
      return await apiRequest('/api/inventory', 'POST', {
        productId: data.productId,
        warehouseId: 1, // Default warehouse ID
        quantity: data.quantity,
        isCount: true // Always set isCount to true to indicate absolute quantity
      });
    },
    onSuccess: () => {
      toast({
        title: "تم تحديث الجرد",
        description: "تم تحديث كمية المنتج بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      setShowCountDialog(false);
      setCountProduct(null);
      setCountValue("");
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث الجرد",
        variant: "destructive",
      });
    }
  });

  // Handle product form close
  const handleProductFormClose = () => {
    setIsProductFormOpen(false);
    setProductToEdit(null);
    toast({
      title: "تم الحفظ",
      description: "تم حفظ المنتج بنجاح",
    });
    queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
  };

  // Handle count submit
  const handleCountSubmit = () => {
    if (!countProduct || countValue === "") return;
    
    // Ensure we're parsing to a proper number
    const newCount = Number(countValue);
    if (isNaN(newCount) || newCount < 0) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال رقم صحيح موجب",
        variant: "destructive",
      });
      return;
    }
    
    console.log(`Updating count for product ${countProduct.id} from ${countProduct.quantity} to ${newCount}`);
    
    updateInventoryMutation.mutate({
      productId: countProduct.id,
      quantity: newCount
    });
  };

  // Handle Excel import
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const products = await importFromExcel<ExcelProduct>(file);
      
      // Create products one by one
      for (const product of products) {
        // Ensure code is a string
        const code = String(product.الكود);
        
        // Find or create category
        let categoryId = null;
        if (product.الفئة) {
          const existingCategory = categories.find((c: Category) => c.name === product.الفئة);
          if (existingCategory) {
            categoryId = existingCategory.id;
          } else {
            // Create new category if it doesn't exist
            try {
              const newCategory = await apiRequest('/api/categories', 'POST', {
                name: product.الفئة,
                isDefault: false
              });
              categoryId = newCategory.id;
            } catch (error) {
              console.error('Error creating category:', error);
            }
          }
        }

        // Create product with validated data
        await apiRequest('/api/products', 'POST', {
          code: code,
          name: product.الاسم,
          categoryId: categoryId,
          unit: product.الوحدة || 'قطعة',
          costPrice: Number(product['سعر التكلفة']) || 0,
          sellPrice1: Number(product['سعر البيع']) || 0,
          isActive: true
        });
      }
      
      toast({
        title: "تم الاستيراد بنجاح",
        description: `تم استيراد ${products.length} منتج`,
      });
      
      // Refresh products list
      refetchProducts();
      refetchInventory();
      refetchCategories(); // Refresh categories if new ones were created
      
    } catch (error) {
      console.error('Error importing products:', error);
      toast({
        title: "خطأ في الاستيراد",
        description: "حدث خطأ أثناء استيراد المنتجات. يرجى التحقق من تنسيق الملف وصحة البيانات.",
        variant: "destructive",
      });
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle Excel export
  const handleExportExcel = () => {
    exportProductsToExcel(productsWithInventory);
  };
  
  // Handle template download
  const handleDownloadTemplate = () => {
    getExcelTemplate('products');
  };

  // Define product columns
  const productColumns = [
    {
      id: "code",
      header: "الكود",
      accessorKey: "code",
    },
    {
      id: "name",
      header: "الصنف",
      accessorKey: "name",
    },
    {
      id: "category",
      header: "الفئة",
      accessorKey: "category",
    },
    {
      id: "quantity",
      header: "الكمية",
      accessorKey: "quantity",
      cell: (info: CellInfo) => {
        const product = info.row.original as ProductWithInventory;
        return `${product.quantity} ${product.unit}`;
      }
    },
    {
      id: "costPrice",
      header: "سعر التكلفة",
      accessorKey: "costPrice",
    },
    {
      id: "sellPrice",
      header: "سعر البيع",
      accessorKey: "sellPrice",
    },
    {
      id: "value",
      header: "القيمة",
      accessorKey: "value",
    },
    {
      id: "actions",
      header: "الإجراءات",
      accessorKey: "id",
      cell: (info: CellInfo) => {
        const product = info.row.original as ProductWithInventory;
        return (
          <div className="flex space-x-1 space-x-reverse">
            <Badge variant={product.quantity > 0 ? "default" : "destructive"} className="bg-green-100 text-green-800 hover:bg-green-100">
              متوفر
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
              onClick={() => {
                const fullProduct = products.find((p: Product) => p.id === product.id);
                if (fullProduct) {
                  setProductToEdit(fullProduct);
                  setIsProductFormOpen(true);
                }
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-red-600 hover:text-red-900 hover:bg-red-50"
              onClick={() => {
                const fullProduct = products.find((p: Product) => p.id === product.id);
                if (fullProduct) {
                  setProductToDelete(fullProduct);
                }
              }}
            >
              <Trash className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setCountProduct(product);
                setCountValue(product.quantity.toString());
                setShowCountDialog(true);
              }}
            >
              <Layers className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  // Define category columns
  const categoryColumns = [
    {
      id: "name",
      header: "اسم الفئة",
      accessorKey: "name",
    },
    {
      id: "parent",
      header: "الفئة الأم",
      accessorKey: "parent_id",
      cell: (info: CellInfo) => {
        const category = info.row.original as Category;
        const parentCategory = categories.find((c: Category) => c.id === category.parent_id);
        return parentCategory?.name || "—";
      }
    },
    {
      id: "description",
      header: "الوصف",
      accessorKey: "description",
      cell: (info: CellInfo) => {
        const category = info.row.original as Category;
        return category.description || "—";
      }
    },
    {
      id: "isDefault",
      header: "افتراضي",
      accessorKey: "isDefault",
      cell: (info: CellInfo) => {
        const category = info.row.original as Category;
        return category.isDefault ? (
          <Check className="h-5 w-5 text-green-600" />
        ) : "—";
      }
    },
    {
      id: "actions",
      header: "الإجراءات",
      accessorKey: "id",
      cell: (info: CellInfo) => {
        const category = info.row.original as Category;
        return (
          <div className="flex space-x-1 space-x-reverse">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
              onClick={() => {
                setCategoryToEdit(category);
                setIsCategoryFormOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-red-600 hover:text-red-900 hover:bg-red-50"
              onClick={() => setCategoryToDelete(category)}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  // Define warehouse columns
  const warehouseColumns = [
    {
      id: "name",
      header: "اسم المخزن",
      accessorKey: "name",
    },
    {
      id: "location",
      header: "الموقع",
      accessorKey: "location",
      cell: (info: CellInfo) => {
        const warehouse = info.row.original as Warehouse;
        return warehouse.location || "—";
      }
    },
    {
      id: "manager",
      header: "المشرف",
      accessorKey: "manager",
      cell: (info: CellInfo) => {
        const warehouse = info.row.original as Warehouse;
        return warehouse.manager || "—";
      }
    },
    {
      id: "isDefault",
      header: "افتراضي",
      accessorKey: "isDefault",
      cell: (info: CellInfo) => {
        const warehouse = info.row.original as Warehouse;
        return warehouse.isDefault ? (
          <Check className="h-5 w-5 text-green-600" />
        ) : "—";
      }
    },
    {
      id: "status",
      header: "الحالة",
      accessorKey: "isActive",
      cell: (info: CellInfo) => {
        const warehouse = info.row.original as Warehouse;
        return warehouse.isActive ? (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            نشط
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            غير نشط
          </Badge>
        );
      }
    },
    {
      id: "actions",
      header: "الإجراءات",
      accessorKey: "id",
      cell: (info: CellInfo) => {
        const warehouse = info.row.original as Warehouse;
        return (
          <div className="flex space-x-1 space-x-reverse">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
              onClick={() => {
                setWarehouseToEdit(warehouse);
                setIsWarehouseFormOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-red-600 hover:text-red-900 hover:bg-red-50"
              onClick={() => setWarehouseToDelete(warehouse)}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  // Calculate product totals
  const productTotals = productsWithInventory.reduce((acc, product) => {
    acc.count = productsWithInventory.length;
    acc.totalValue = (acc.totalValue || 0) + product.value;
    acc.totalQuantity = (acc.totalQuantity || 0) + product.quantity;
    return acc;
  }, { count: 0, totalValue: 0, totalQuantity: 0 });

  const isLoading = productsLoading || inventoryLoading || categoriesLoading || warehousesLoading;
  
  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-green-600">البضاعة والمخزون</h2>
        <div className="flex items-center space-x-2 space-x-reverse">
          {/* Excel Operations */}
          <div className="flex items-center space-x-2 space-x-reverse ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="flex items-center"
            >
              <FileDown className="h-4 w-4 ml-1" />
              <span>تحميل القالب</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center"
            >
              <Upload className="h-4 w-4 ml-1" />
              <span>استيراد من Excel</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="flex items-center"
            >
              <Download className="h-4 w-4 ml-1" />
              <span>تصدير إلى Excel</span>
            </Button>
            
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
            />
          </div>
          
          {/* Existing Buttons */}
          <Button variant="outline" size="sm" onClick={() => refetchProducts()}>
            <RefreshCw className="h-4 w-4 ml-1" />
            <span>تحديث</span>
          </Button>
          
          <Button 
            variant="default" 
            className="bg-green-500 hover:bg-green-600"
            onClick={() => setIsProductFormOpen(true)}
          >
            <Plus className="h-5 w-5 ml-1" />
            منتج جديد
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="products" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0">
          <TabsTrigger 
            value="products"
            className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            الأصناف
          </TabsTrigger>
          <TabsTrigger 
            value="categories"
            className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            الفئات
          </TabsTrigger>
          <TabsTrigger 
            value="warehouses"
            className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            المخازن
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="products" className="p-4">
          <DataTable
            data={productsWithInventory}
            columns={productColumns}
            isLoading={isLoading}
            emptyMessage="لا توجد منتجات للعرض"
            searchable
            placeholder="بحث في المنتجات..."
            showActions={false}
          />
        </TabsContent>
        
        <TabsContent value="categories" className="p-4">
          <DataTable
            data={categories}
            columns={categoryColumns}
            isLoading={isLoading}
            emptyMessage="لا توجد فئات للعرض"
            searchable
            placeholder="بحث في الفئات..."
            showActions={false}
          />
        </TabsContent>
        
        <TabsContent value="warehouses" className="p-4">
          <DataTable
            data={warehouses}
            columns={warehouseColumns}
            isLoading={isLoading}
            emptyMessage="لا توجد مخازن للعرض"
            searchable
            placeholder="بحث في المخازن..."
            showActions={false}
          />
        </TabsContent>
      </Tabs>
      
      {/* Product Form Dialog */}
      {isProductFormOpen && (
      <ProductForm 
        isOpen={isProductFormOpen} 
        onClose={handleProductFormClose}
        productToEdit={productToEdit} 
      />
      )}

      {/* Category Form Dialog */}
      <CategoryForm
        isOpen={isCategoryFormOpen}
        onClose={() => {
          setIsCategoryFormOpen(false);
          setCategoryToEdit(null);
          toast({
            title: "تم الحفظ",
            description: "تم حفظ الفئة بنجاح",
          });
          queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
        }}
        categoryToEdit={categoryToEdit}
      />

      {/* Warehouse Form Dialog */}
      <WarehouseForm
        isOpen={isWarehouseFormOpen}
        onClose={() => {
          setIsWarehouseFormOpen(false);
          setWarehouseToEdit(null);
          toast({
            title: "تم الحفظ",
            description: "تم حفظ المخزن بنجاح",
          });
          queryClient.invalidateQueries({ queryKey: ['/api/warehouses'] });
        }}
        warehouseToEdit={warehouseToEdit}
      />

      {/* Delete Product Confirmation */}
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف المنتج</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المنتج "{productToDelete?.name}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => productToDelete && deleteProductMutation.mutate(productToDelete.id)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Category Confirmation */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الفئة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الفئة "{categoryToDelete?.name}"؟ قد يؤثر هذا على المنتجات المرتبطة بهذه الفئة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => categoryToDelete && deleteCategoryMutation.mutate(categoryToDelete.id)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Warehouse Confirmation */}
      <AlertDialog open={!!warehouseToDelete} onOpenChange={(open) => !open && setWarehouseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف المخزن</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المخزن "{warehouseToDelete?.name}"؟ سيؤثر هذا على كل المنتجات الموجودة في هذا المخزن.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => warehouseToDelete && deleteWarehouseMutation.mutate(warehouseToDelete.id)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Count Dialog */}
      <AlertDialog open={showCountDialog} onOpenChange={setShowCountDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>تحديث كمية المنتج</AlertDialogTitle>
            <AlertDialogDescription>
              أدخل الكمية الحالية للمنتج: {countProduct?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="number"
              min="0"
              value={countValue}
              onChange={(e) => setCountValue(e.target.value)}
              className="text-center text-xl"
              placeholder="الكمية"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleCountSubmit}>تحديث</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}