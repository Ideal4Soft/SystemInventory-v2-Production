import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ImportView() {
  const [excelPath, setExcelPath] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Handle import action
  const handleImport = async () => {
    if (!excelPath.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء تحديد ملف الإكسل",
        variant: "destructive",
      });
      return;
    }

    if (!sheetName) {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار الصفحة",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    
    try {
      // In a real implementation, this would call an API endpoint to import data
      // For simulation, we're just showing a success message after a delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "تم بنجاح",
        description: "تم استيراد البيانات بنجاح",
      });
      
      // In a real app, we would navigate to the next step or show imported data
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء استيراد البيانات",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-green-600">استيراد بيانات العملاء والموردين</h2>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/")}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col items-center mb-10">
            <div className="w-full max-w-xl mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">حدد ملف الإكسل</label>
              <div className="flex">
                <Input
                  className="rounded-r-md"
                  value={excelPath}
                  onChange={(e) => setExcelPath(e.target.value)}
                  placeholder="مسار ملف الإكسل"
                />
                <Button 
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-l-md"
                >
                  تصفح
                </Button>
              </div>
            </div>
            
            <div className="w-full max-w-xl mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">حدد الصفحة</label>
              <Select onValueChange={setSheetName}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الصفحة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sheet1">Sheet1</SelectItem>
                  <SelectItem value="Sheet2">Sheet2</SelectItem>
                  <SelectItem value="Sheet3">Sheet3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="mt-6">
              <Button 
                onClick={handleImport}
                disabled={isImporting}
                className="px-8 py-2 bg-amber-500 hover:bg-amber-600"
              >
                <ArrowRight className="h-5 w-5 ml-1" />
                {isImporting ? "جاري الاستيراد..." : "التالي"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
