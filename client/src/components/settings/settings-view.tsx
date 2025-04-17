import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash, ArrowRight } from "lucide-react";

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState("general");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/settings'],
  });

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ['/api/warehouses'],
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: any) => {
      return await apiRequest('PUT', '/api/settings', updatedSettings);
    },
    onSuccess: () => {
      toast({
        title: "تم الحفظ",
        description: "تم حفظ الإعدادات بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء حفظ الإعدادات",
        variant: "destructive",
      });
    }
  });

  // Form state
  const [formData, setFormData] = useState({
    companyName: settings?.companyName || "شركة الريادي لتوزيع المواد الغذائية",
    address: settings?.address || "١٤ شارع نور مصر سالم",
    phone: settings?.phone || "01006779000",
    email: settings?.email || "",
    currency: settings?.currency || "EGP",
    currencySymbol: settings?.currencySymbol || "ج.م",
    defaultWarehouseId: settings?.defaultWarehouseId || 1,
    combinePurchaseViews: settings?.combinePurchaseViews !== false, // Default to true if not set
  });

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle checkbox change
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };

  // Handle warehouse selection
  const handleWarehouseSelection = (id: number, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({ ...prev, defaultWarehouseId: id }));
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-200">
        <h2 className="text-xl font-bold text-green-600">إعداد سهل</h2>
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
          >
            <ArrowRight className="h-5 w-5 ml-1 transform rotate-180" />
            إغلاق
          </Button>
        </div>
      </div>
      
      <Card className="mb-6">
        {/* Tab Navigation */}
        <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0">
            <TabsTrigger 
              value="general"
              className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              عام
            </TabsTrigger>
            <TabsTrigger 
              value="additionalFields"
              className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              حقول إضافية
            </TabsTrigger>
            <TabsTrigger 
              value="taxes"
              className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              الضرائب والفوترة
            </TabsTrigger>
            <TabsTrigger 
              value="passwords"
              className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              كلمات السر
            </TabsTrigger>
            <TabsTrigger 
              value="other"
              className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              أخرى
            </TabsTrigger>
            <TabsTrigger 
              value="restaurant"
              className="px-6 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              إعداد المطعم
            </TabsTrigger>
          </TabsList>
          
          <CardContent className="p-6">
            <TabsContent value="general">
              <form onSubmit={handleSubmit}>
                {/* Project Settings */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">المشروع</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="companyName" className="block text-gray-700 text-sm font-bold mb-2">
                        اسم المشروع
                      </Label>
                      <Input
                        id="companyName"
                        name="companyName"
                        className="w-full bg-gray-50"
                        value={formData.companyName}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <div className="flex-grow">
                        <Label className="block text-gray-700 text-sm font-bold mb-2">
                          المخزن / الفرع
                        </Label>
                        <div className="flex flex-col space-y-2">
                          {warehouses.map((warehouse: any) => (
                            <div 
                              key={warehouse.id}
                              className={`border border-gray-300 ${warehouse.id === formData.defaultWarehouseId ? 'bg-green-100 text-green-800' : 'bg-white'} rounded-md py-2 px-4 flex items-center justify-between`}
                            >
                              <div className="flex items-center">
                                <Checkbox 
                                  checked={warehouse.id === formData.defaultWarehouseId}
                                  onCheckedChange={(checked) => handleWarehouseSelection(warehouse.id, checked as boolean)}
                                  className="ml-2"
                                />
                                <span>{warehouse.name}</span>
                              </div>
                              <div className="flex space-x-1 space-x-reverse">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button className="mt-2" size="sm">
                          <Plus className="h-4 w-4 ml-1" />
                          إضافة مخزن
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Contact Info */}
                <div className="mb-8">
                  <Label htmlFor="address" className="block text-gray-700 text-sm font-bold mb-2">
                    بيانات الاتصال (مثل العنوان والتليفون وتظهر في طباعة الفواتير)
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    className="w-full bg-gray-50 mb-2"
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                  <Input
                    id="phone"
                    name="phone"
                    className="w-full bg-gray-50"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
                
                {/* Payment Methods */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">المخازن / طرق السداد</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <div className="flex-grow">
                        <div className="flex items-center">
                          <div className="border border-gray-300 bg-green-100 text-green-800 rounded-md py-2 px-4 flex-grow ml-2">
                            <div className="flex items-center">
                              <Checkbox className="ml-2" defaultChecked />
                              <span>البنك الاهلي 14</span>
                            </div>
                          </div>
                          <Button size="icon" className="p-2">
                            <Plus className="h-5 w-5" />
                          </Button>
                          <Button variant="secondary" size="icon" className="p-2 mr-2">
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <Button variant="destructive" size="icon" className="p-2">
                            <Trash className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Currency */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">العملة</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label htmlFor="currency" className="block text-gray-700 text-sm font-bold mb-2">
                        اسم العملة
                      </Label>
                      <Input
                        id="currency"
                        name="currency"
                        className="w-full bg-gray-50"
                        placeholder="جنيه مصري"
                        value={formData.currency}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="currencySymbol" className="block text-gray-700 text-sm font-bold mb-2">
                        رمز العملة المصري
                      </Label>
                      <Input
                        id="currencySymbol"
                        name="currencySymbol"
                        className="w-full bg-gray-50"
                        value={formData.currencySymbol}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div>
                      <Label className="block text-gray-700 text-sm font-bold mb-2">
                        تتكون من
                      </Label>
                      <div className="flex">
                        <Input
                          className="w-24 bg-gray-50 rounded-r"
                          value="100"
                          readOnly
                        />
                        <select className="bg-gray-50 border border-gray-300 text-gray-700 py-2 px-4 rounded-l leading-tight focus:outline-none focus:bg-white focus:border-primary">
                          <option>قرشا</option>
                          <option>جنيها صغيرا</option>
                          <option>هللة</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <Button 
                    type="submit" 
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="additionalFields">
              <div className="min-h-[400px] flex items-center justify-center">
                <p className="text-gray-500">حقول إضافية - قيد التطوير</p>
              </div>
            </TabsContent>
            
            <TabsContent value="taxes">
              <div className="min-h-[400px] flex items-center justify-center">
                <p className="text-gray-500">الضرائب والفوترة - قيد التطوير</p>
              </div>
            </TabsContent>
            
            <TabsContent value="passwords">
              <div className="min-h-[400px] flex items-center justify-center">
                <p className="text-gray-500">كلمات السر - قيد التطوير</p>
              </div>
            </TabsContent>
            
            <TabsContent value="other">
              <form onSubmit={handleSubmit}>
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">خيارات عرض الصفحات</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center space-x-4 space-x-reverse border p-4 rounded-md">
                      <div className="flex-grow">
                        <Label className="text-gray-700 font-bold">توحيد صفحة المشتريات</Label>
                        <p className="text-sm text-gray-500 mt-1">
                          عرض المشتريات ضمن صفحة الفواتير بدلاً من صفحة منفصلة. إعادة تشغيل التطبيق مطلوبة لتفعيل التغيير.
                        </p>
                      </div>
                      <Checkbox 
                        checked={formData.combinePurchaseViews}
                        onCheckedChange={(checked) => handleCheckboxChange('combinePurchaseViews', checked as boolean)}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="submit"
                      className="bg-green-500 hover:bg-green-600"
                      disabled={updateSettingsMutation.isPending}
                    >
                      {updateSettingsMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
                    </Button>
                  </div>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="restaurant">
              <div className="min-h-[400px] flex items-center justify-center">
                <p className="text-gray-500">إعداد المطعم - قيد التطوير</p>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
