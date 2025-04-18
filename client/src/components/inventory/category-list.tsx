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
import CategoryForm from "./category-form";

export interface Category {
  id: number;
  name: string;
  parent_id?: number;
  description?: string;
  isDefault?: boolean;
  [key: string]: any;
}

export default function CategoryList() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  
  // Fetch categories
  const { data: categories = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      return apiRequest("/api/categories", "GET");
    },
  });
  
  // Filter categories based on search
  const filteredCategories = categories.filter((category: Category) => {
    const searchLower = search.toLowerCase();
    return (
      category.name?.toLowerCase().includes(searchLower) ||
      category.description?.toLowerCase().includes(searchLower)
    );
  });
  
  const handleAddCategory = () => {
    setSelectedCategory(null);
    setIsCategoryFormOpen(true);
  };
  
  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setIsCategoryFormOpen(true);
  };
  
  const handleCategoryFormClose = () => {
    setIsCategoryFormOpen(false);
    setSelectedCategory(null);
    refetch();
  };
  
  // Get parent category name by parent_id
  const getParentCategoryName = (parentId?: number) => {
    if (!parentId) return "الرئيسية";
    const parent = categories.find(c => c.id === parentId);
    return parent ? parent.name : "الرئيسية";
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2 space-x-reverse">
          <Input
            placeholder="بحث عن تصنيف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
        <Button onClick={handleAddCategory}>إضافة تصنيف</Button>
      </div>
      
      <Card>
        <CardHeader className="py-4">
          <CardTitle>تصنيفات المنتجات</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center p-4">جاري التحميل...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الوصف</TableHead>
                  <TableHead className="text-right">التصنيف الأب</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      لا توجد تصنيفات
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((category: Category) => (
                    <TableRow key={category.id}>
                      <TableCell>{category.name}</TableCell>
                      <TableCell>{category.description || "-"}</TableCell>
                      <TableCell>{getParentCategoryName(category.parent_id)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditCategory(category)}
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
      
      <CategoryForm 
        isOpen={isCategoryFormOpen} 
        onClose={handleCategoryFormClose} 
        categoryToEdit={selectedCategory} 
      />
    </div>
  );
} 