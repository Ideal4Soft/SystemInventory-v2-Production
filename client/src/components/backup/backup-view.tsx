import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, FolderOpen, Database, Mail, Download, RefreshCw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function BackupView() {
  // Load saved backup path from localStorage or use default
  const defaultPath = "D:\\newSaHL-Backups";
  const savedPath = localStorage.getItem("backupPath") || defaultPath;
  
  const [backupPath, setBackupPath] = useState(savedPath);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [lastBackupFile, setLastBackupFile] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  
  // Check for existing backups when component mounts
  useEffect(() => {
    checkForExistingBackups();
  }, []);
  
  // Function to check for existing backups
  const checkForExistingBackups = async () => {
    try {
      const response = await fetch('/api/backup/latest');
      if (response.ok) {
        const data = await response.json();
        if (data.backupFile) {
          setLastBackupFile(data.backupFile);
          toast({
            title: "وجدت نسخ احتياطية",
            description: "تم العثور على نسخ احتياطية سابقة",
          });
        }
      }
    } catch (error) {
      console.error("Error checking for existing backups:", error);
    }
  };

  // Handle backup process
  const handleBackup = async () => {
    if (!backupPath.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء تحديد مسار لحفظ النسخة الاحتياطية",
        variant: "destructive",
      });
      return;
    }

    if (sendEmail && !emailAddress.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال عنوان البريد الإلكتروني للإرسال",
        variant: "destructive",
      });
      return;
    }

    setIsBackingUp(true);
    
    try {
      console.log('Sending backup request to /api/backup');
      
      // Show starting toast
      toast({
        title: "جاري إنشاء النسخة الاحتياطية",
        description: "يرجى الانتظار...",
      });
      
      // Save backup path to localStorage
      localStorage.setItem("backupPath", backupPath);
      
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          backupPath,
          sendEmail: sendEmail ? emailAddress : false
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`خطأ: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.backupFile) {
        throw new Error("لم يتم إنشاء ملف النسخة الاحتياطية");
      }
      
      setLastBackupFile(data.backupFile);
      
      // Show success dialog
      setShowSuccessDialog(true);
      
      if (sendEmail) {
        toast({
          title: "تم الإرسال",
          description: "تم إرسال النسخة الاحتياطية عبر البريد الإلكتروني",
        });
      }
    } catch (error: any) {
      console.error("Backup error:", error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء عمل النسخة الاحتياطية",
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  // Download the backup file
  const handleDownload = () => {
    if (!lastBackupFile) return;
    
    try {
      // Create the download URL with proper encoding
      const encodedPath = encodeURIComponent(lastBackupFile);
      const downloadUrl = `/api/backup/download?filePath=${encodedPath}`;
      
      console.log("Attempting to download from:", downloadUrl);
      
      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = lastBackupFile.split('\\').pop() || 'backup.sql';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "جاري التحميل",
        description: "بدأ تحميل ملف النسخة الاحتياطية",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل النسخة الاحتياطية",
        variant: "destructive",
      });
    }
  };

  // Open the backup folder in File Explorer
  const openBackupFolder = () => {
    if (!lastBackupFile) return;
    
    // Get the directory path from the full file path
    let folderPath = lastBackupFile.substring(0, lastBackupFile.lastIndexOf('\\'));
    if (!folderPath || folderPath === lastBackupFile) {
      // Handle case where path doesn't contain backslashes
      folderPath = backupPath;
    }
    
    // Show loading toast
    toast({
      title: "جاري فتح المجلد",
      description: "يرجى الانتظار...",
    });
    
    // Call the API to open the folder
    fetch('/api/backup/open-folder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ folderPath }),
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.message || 'خطأ في فتح المجلد');
        });
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        toast({
          title: "تم فتح المجلد",
          description: `تم فتح المجلد: ${data.path || folderPath}`
        });
      } else {
        throw new Error(data.message || 'خطأ في فتح المجلد');
      }
    })
    .catch(error => {
      console.error('Error opening folder:', error);
      toast({
        title: "خطأ",
        description: error.message || "تعذر فتح مجلد النسخ الاحتياطية",
        variant: "destructive",
      });
    });
  };

  // Open file dialog to select backup directory
  const handleSelectDirectory = () => {
    // In a real implementation, this would open a directory selection dialog
    // Since we don't have access to the file system in this implementation,
    // we'll just simulate changing the path
    const newPath = prompt("أدخل مسار حفظ النسخة الاحتياطية:", backupPath);
    if (newPath) {
      setBackupPath(newPath);
      // Save to localStorage
      localStorage.setItem("backupPath", newPath);
    }
  };

  // Reset to default backup path
  const resetToDefaultPath = () => {
    setBackupPath(defaultPath);
    // Save to localStorage
    localStorage.setItem("backupPath", defaultPath);
    toast({
      title: "تم",
      description: "تم استعادة المسار الافتراضي للنسخ الاحتياطية",
    });
  };
  
  // Handle database reset
  const handleDatabaseReset = () => {
    setShowResetDialog(true);
    setResetPassword("");
    setResetError("");
  };
  
  // Confirm database reset with password
  const confirmDatabaseReset = async () => {
    if (resetPassword !== "admin") {
      setResetError("كلمة المرور غير صحيحة");
      return;
    }
    
    setIsResetting(true);
    setResetError("");
    
    try {
      const response = await fetch('/api/database/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          password: resetPassword 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل إعادة تعيين قاعدة البيانات");
      }
      
      // Success
      setShowResetDialog(false);
      toast({
        title: "تمت إعادة التعيين",
        description: "تمت إعادة تعيين قاعدة البيانات بنجاح",
      });
      
      // Redirect to dashboard after a delay
      setTimeout(() => {
        navigate("/");
      }, 2000);
      
    } catch (error) {
      console.error("Database reset error:", error);
      setResetError(error.message || "حدث خطأ أثناء إعادة تعيين قاعدة البيانات");
    } finally {
      setIsResetting(false);
    }
  };

  // Format file path to display properly
  const formatFilePath = (path: string) => {
    if (!path) return '';
    // Fix any double slashes in the path
    return path.replace(/\/\\/g, '\\').replace(/\\\\/g, '\\');
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-primary">عمل نسخة احتياطية</h2>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/")}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <p className="text-gray-600 mb-6">اختر مجلد (الغرض) لحفظ النسخ الاحتياطية. لا يمكن أن يكون على نفس "Hard Disk" جهازك خوفاً من الانهيار. الضغط لتصفح</p>
          
          <div className="mb-6">
            <div className="flex items-center mb-3">
              <div className="flex-1 bg-gray-100 rounded-md p-2 ml-2">
                {backupPath}
              </div>
              <Button 
                variant="secondary" 
                className="p-2"
                onClick={handleSelectDirectory}
              >
                <FolderOpen className="h-5 w-5" />
              </Button>
              <Button 
                variant="secondary" 
                className="p-2 mr-2"
                onClick={resetToDefaultPath}
                title="استعادة المسار الافتراضي"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
              </Button>
            </div>
            
            {lastBackupFile && (
              <>
                <div className="bg-green-50 border border-green-100 rounded-md p-3 mb-3">
                  <p className="text-green-700 text-sm mb-2">
                    <span className="font-medium">آخر نسخة احتياطية:</span> {formatFilePath(lastBackupFile)}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-green-700 border-green-300"
                      onClick={openBackupFolder}
                    >
                      <FolderOpen className="h-4 w-4 ml-2" />
                      فتح المجلد
                    </Button>
                  </div>
                </div>
                <Button 
                  variant="default"
                  size="lg" 
                  className="w-full py-3 mb-4 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
                  onClick={handleDownload}
                >
                  <Download className="h-5 w-5 ml-2" />
                  تحميل النسخة الاحتياطية على جهازك
                </Button>
              </>
            )}
            
            <div className="flex items-center mb-4">
              <Checkbox 
                id="sendEmail" 
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                className="ml-2"
              />
              <Label htmlFor="sendEmail" className="text-sm text-gray-700">
                إرسال النسخة الاحتياطية عبر البريد الإلكتروني
              </Label>
            </div>
            
            {sendEmail && (
              <div className="mb-4">
                <Label htmlFor="emailAddress" className="text-sm font-medium text-gray-700 mb-1 block">
                  البريد الإلكتروني
                </Label>
                <Input
                  id="emailAddress"
                  type="email"
                  placeholder="أدخل عنوان البريد الإلكتروني"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  dir="ltr"
                />
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Button 
              className="py-6 bg-amber-500 hover:bg-amber-600 flex items-center justify-center text-base"
              onClick={handleBackup}
              disabled={isBackingUp}
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="h-6 w-6 ml-2 animate-spin" />
                  جاري حفظ النسخة الاحتياطية...
                </>
              ) : (
                <>
                  <Database className="h-6 w-6 ml-2" />
                  احفظ النسخة الاحتياطية
                </>
              )}
            </Button>
            
            <Button 
              className="py-6 bg-red-600 hover:bg-red-700 flex items-center justify-center text-base"
              onClick={handleDatabaseReset}
              variant="destructive"
            >
              <RefreshCw className="h-6 w-6 ml-2" />
              إعادة تعيين قاعدة البيانات
            </Button>
          </div>
          
          <h3 className="text-lg font-medium text-green-600 mb-4">كيف تحمي بياناتك الهامة من الفقد</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-100 p-4 rounded-lg text-center">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Mega_logo.svg/1200px-Mega_logo.svg.png" alt="MEGA" className="h-8 mx-auto mb-2" />
              <div className="text-xs text-gray-600">MEGA</div>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg text-center">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Dropbox_Icon.svg/1101px-Dropbox_Icon.svg.png" alt="Dropbox" className="h-8 mx-auto mb-2" />
              <div className="text-xs text-gray-600">Dropbox</div>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg text-center">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Google_Drive_logo.png/1200px-Google_Drive_logo.png" alt="Google Drive" className="h-8 mx-auto mb-2" />
              <div className="text-xs text-gray-600">Google Drive</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تم عمل النسخة الاحتياطية بنجاح</DialogTitle>
            <DialogDescription>
              تم حفظ النسخة الاحتياطية في المسار التالي:
            </DialogDescription>
          </DialogHeader>
          <div className="bg-green-50 p-3 rounded-md border border-green-100 text-center mt-2">
            <p className="font-bold text-green-700 mb-2 break-all">{formatFilePath(lastBackupFile || '')}</p>
            <p className="text-sm text-green-600">تأكد من الاحتفاظ بهذا الملف في مكان آمن</p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2 mt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowSuccessDialog(false)}
            >
              إغلاق
            </Button>
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                handleDownload();
                setShowSuccessDialog(false);
              }}
            >
              <Download className="h-4 w-4 ml-2" />
              تحميل النسخة الاحتياطية
            </Button>
            <Button 
              variant="secondary"
              className="flex-1"
              onClick={() => {
                openBackupFolder();
                setShowSuccessDialog(false);
              }}
            >
              <FolderOpen className="h-4 w-4 ml-2" />
              فتح المجلد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reset Database Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إعادة تعيين قاعدة البيانات</AlertDialogTitle>
            <AlertDialogDescription>
              هذا الإجراء سوف يحذف جميع البيانات الموجودة حالياً في قاعدة البيانات. هذا الإجراء لا يمكن التراجع عنه.
              <br />
              من فضلك أدخل كلمة المرور للمتابعة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="mt-4">
            <Label htmlFor="resetPassword" className="font-medium">كلمة المرور</Label>
            <Input
              id="resetPassword"
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              className="mt-1"
            />
            {resetError && <p className="text-sm text-red-500 mt-1">{resetError}</p>}
          </div>
          
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                confirmDatabaseReset();
              }}
              disabled={isResetting || !resetPassword}
              className="bg-red-600 hover:bg-red-700"
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري إعادة التعيين...
                </>
              ) : (
                <>إعادة تعيين قاعدة البيانات</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
