import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, FolderOpen, Database, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function RestoreView() {
  const [backupFile, setBackupFile] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreData, setRestoreData] = useState(true);
  const [restoreTemplates, setRestoreTemplates] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Handle restore process
  const handleRestore = async () => {
    if (!backupFile.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء تحديد مسار النسخة الاحتياطية",
        variant: "destructive",
      });
      return;
    }

    if (!restoreData && !restoreTemplates) {
      toast({
        title: "خطأ",
        description: "الرجاء تحديد ما تريد استرجاعه (البيانات أو نماذج الطباعة)",
        variant: "destructive",
      });
      return;
    }

    if (!window.confirm("تحذير: استرجاع نسخة احتياطية سيحذف جميع البيانات الحالية. هل أنت متأكد من الاستمرار؟")) {
      return;
    }

    setIsRestoring(true);
    
    try {
      console.log('Sending restore request to /api/restore');
      
      const response = await fetch('/api/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          backupFile,
          restoreData,
          restoreTemplates
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      await response.json();
      
      toast({
        title: "تم بنجاح",
        description: "تم استرجاع النسخة الاحتياطية بنجاح",
      });
      
      // Wait a moment and then redirect to dashboard
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      console.error("Restore error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء استرجاع النسخة الاحتياطية",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Open file dialog to select backup file
  const handleSelectFile = () => {
    // In a real implementation, this would open a file selection dialog
    // Since we don't have access to the file system in this implementation,
    // we'll just simulate selecting a file
    const newFile = prompt("أدخل مسار ملف النسخة الاحتياطية:", backupFile);
    if (newFile) {
      setBackupFile(newFile);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-primary">استرجاع نسخة احتياطية</h2>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/")}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="bg-red-100 border-r-4 border-red-500 p-3 mb-6">
            <p className="text-red-800">تحذير هام - استرجاع نسخة احتياطية يقوم بحذف جميع البيانات الحالية واستبدالها</p>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">لتعرف مكان النسخة الاحتياطية التي ترغب في استرجاعها. اضغط للتصفح</label>
            <div className="flex items-center">
              <div className="flex-1 bg-gray-100 rounded-md p-2 ml-2">
                {backupFile}
              </div>
              <Button 
                variant="secondary" 
                className="p-2"
                onClick={handleSelectFile}
              >
                <FolderOpen className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <div className="mb-6 space-y-2">
            <div className="flex items-center">
              <Checkbox 
                id="restoreData" 
                checked={restoreData}
                onCheckedChange={(checked) => setRestoreData(checked as boolean)}
              />
              <Label htmlFor="restoreData" className="mr-2 text-gray-700">
                استرجاع البيانات
              </Label>
            </div>
            <div className="flex items-center">
              <Checkbox 
                id="restoreTemplates" 
                checked={restoreTemplates}
                onCheckedChange={(checked) => setRestoreTemplates(checked as boolean)}
              />
              <Label htmlFor="restoreTemplates" className="mr-2 text-gray-700">
                استرجاع نماذج الطباعة
              </Label>
            </div>
          </div>
          
          <div className="mb-8">
            <Button 
              className="w-full py-6 bg-amber-500 hover:bg-amber-600 flex items-center justify-center text-base"
              onClick={handleRestore}
              disabled={isRestoring || !restoreData && !restoreTemplates}
            >
              {isRestoring ? (
                <>
                  <Loader2 className="h-6 w-6 ml-2 animate-spin" />
                  جاري استرجاع النسخة الاحتياطية...
                </>
              ) : (
                <>
                  <FileUp className="h-6 w-6 ml-2" />
                  استرجع النسخة الاحتياطية
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
