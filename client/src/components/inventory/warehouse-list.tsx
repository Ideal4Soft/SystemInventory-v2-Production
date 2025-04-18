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
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import WarehouseForm from "./warehouse-form";

export interface Warehouse {
  id: number;
  name: string;
  location?: string;
  manager?: string;
  isDefault: boolean;
  isActive: boolean;
  [key: string]: any;
}

export default function WarehouseList() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [isWarehouseFormOpen, setIsWarehouseFormOpen] = useState(false);
  
  // Fetch warehouses
  const { data: warehouses = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/warehouses"],
    queryFn: async () => {
      return apiRequest("/api/warehouses", "GET");
    },
  });
  
  // Filter warehouses based on search
  const filteredWarehouses = warehouses.filter((warehouse: Warehouse) => {
    const searchLower = search.toLowerCase();
    return (
      warehouse.name?.toLowerCase().includes(searchLower) ||
      warehouse.location?.toLowerCase().includes(searchLower) ||
      warehouse.manager?.toLowerCase().includes(searchLower)
    );
  });
  
  const handleAddWarehouse = () => {
    setSelectedWarehouse(null);
    setIsWarehouseFormOpen(true);
  };
  
  const handleEditWarehouse = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setIsWarehouseFormOpen(true);
  };
  
  const handleWarehouseFormClose = () => {
    setIsWarehouseFormOpen(false);
    setSelectedWarehouse(null);
    refetch();
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2 space-x-reverse">
          <Input
            placeholder="بحث عن مخزن..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
        <Button onClick={handleAddWarehouse}>إضافة مخزن</Button>
      </div>
      
      <Card>
        <CardHeader className="py-4">
          <CardTitle>قائمة المخازن</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center p-4">جاري التحميل...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الموقع</TableHead>
                  <TableHead className="text-right">المسؤول</TableHead>
                  <TableHead className="text-right">افتراضي</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWarehouses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      لا توجد مخازن
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWarehouses.map((warehouse: Warehouse) => (
                    <TableRow key={warehouse.id}>
                      <TableCell>{warehouse.name}</TableCell>
                      <TableCell>{warehouse.location || "-"}</TableCell>
                      <TableCell>{warehouse.manager || "-"}</TableCell>
                      <TableCell>
                        {warehouse.isDefault ? (
                          <Badge>افتراضي</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={warehouse.isActive ? "default" : "destructive"}>
                          {warehouse.isActive ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditWarehouse(warehouse)}
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
      
      <WarehouseForm 
        isOpen={isWarehouseFormOpen} 
        onClose={handleWarehouseFormClose} 
        warehouseToEdit={selectedWarehouse} 
      />
    </div>
  );
} 