import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, FileText, X, ArrowRight, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";

export default function ImportView() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    imported?: number;
    failed?: number;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' &&
          file.type !== 'application/vnd.ms-excel') {
        toast({
          title: "خطأ",
          description: "الرجاء اختيار ملف Excel فقط (.xlsx أو .xls)",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  // Handle import action
  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: "خطأ",
        description: "الرجاء تحديد ملف للاستيراد",
        variant: "destructive",
      });
      return;
    }

    if (!importType) {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار نوع البيانات للاستيراد",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setProgress(0);
    
    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', importType);
      
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);
      
      // Make API request to import the data
      const response = await apiRequest(`/api/import/${importType}`, "POST", formData, true);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      setImportResult({
        success: true,
        message: "تم استيراد البيانات بنجاح",
        imported: response.imported || 0,
        failed: response.failed || 0
      });
      
      toast({
        title: "تم بنجاح",
        description: `تم استيراد ${response.imported || 0} سجل بنجاح`,
      });
    } catch (error) {
      console.error("Import error:", error);
      setImportResult({
        success: false,
        message: "حدث خطأ أثناء استيراد البيانات"
      });
      
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء استيراد البيانات",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setProgress(100);
    }
  };

  // Trigger file input click
  const openFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-green-600">استيراد البيانات</h2>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/")}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>استيراد البيانات</CardTitle>
          <CardDescription>قم باستيراد البيانات من ملفات Excel</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-center mb-10">
            <div className="w-full max-w-xl mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">نوع البيانات</label>
              <Select onValueChange={setImportType}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع البيانات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="products">المنتجات</SelectItem>
                  <SelectItem value="customers">العملاء</SelectItem>
                  <SelectItem value="suppliers">الموردين</SelectItem>
                  <SelectItem value="inventory">المخزون</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full max-w-xl mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">اختر ملف Excel</label>
              <div className="flex">
                <Input
                  className="rounded-r-md"
                  value={selectedFile ? selectedFile.name : ""}
                  readOnly
                  placeholder="اختر ملف للاستيراد"
                />
                <Button 
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-l-md"
                  onClick={openFileSelector}
                >
                  <Upload className="h-4 w-4 ml-1" />
                  تصفح
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  accept=".xlsx,.xls" 
                />
              </div>
            </div>
            
            {isImporting && (
              <div className="w-full max-w-xl mt-4">
                <p className="text-sm mb-1">جاري الاستيراد...</p>
                <Progress value={progress} />
              </div>
            )}
            
            {importResult && (
              <div className="w-full max-w-xl mt-4">
                <Alert variant={importResult.success ? "default" : "destructive"}>
                  <div className="flex items-center">
                    {importResult.success ? 
                      <Check className="h-4 w-4 ml-2" /> : 
                      <AlertCircle className="h-4 w-4 ml-2" />
                    }
                    <AlertTitle>{importResult.success ? "تم بنجاح" : "حدث خطأ"}</AlertTitle>
                  </div>
                  <AlertDescription>
                    {importResult.message}
                    {importResult.imported !== undefined && (
                      <p className="mt-2">
                        تم استيراد {importResult.imported} سجل بنجاح
                        {importResult.failed !== undefined && importResult.failed > 0 && 
                          `, فشل استيراد ${importResult.failed} سجل`}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            <div className="mt-6">
              <Button 
                onClick={handleImport}
                disabled={isImporting || !selectedFile || !importType}
                className="px-8 py-2 bg-amber-500 hover:bg-amber-600"
              >
                <FileText className="h-5 w-5 ml-1" />
                {isImporting ? "جاري الاستيراد..." : "بدء الاستيراد"}
              </Button>
            </div>
            
            <div className="mt-4 text-sm text-gray-500">
              <p>* يمكنك تحميل نماذج ملفات الاستيراد من صفحة الإعدادات</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
