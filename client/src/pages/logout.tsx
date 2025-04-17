import { useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/app-context";

export default function Logout() {
  const [, navigate] = useLocation();
  const { setUser, setAuthenticated } = useAppContext();
  const { toast } = useToast();

  useEffect(() => {
    const performLogout = async () => {
      try {
        const response = await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
        });

        if (response.ok) {
          // Clear local storage
          localStorage.removeItem('user');
          localStorage.removeItem('authenticated');
          
          // Update context
          setUser(null);
          setAuthenticated(false);
          
          // Show success toast
          toast({
            title: "تم تسجيل الخروج",
            description: "تم تسجيل الخروج بنجاح",
          });
          
          // Redirect to login page
          navigate('/login', { replace: true });
        } else {
          // Handle error
          toast({
            title: "خطأ",
            description: "حدث خطأ أثناء تسجيل الخروج",
            variant: "destructive",
          });
          navigate('/login', { replace: true });
        }
      } catch (error) {
        // Handle exception
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تسجيل الخروج",
          variant: "destructive",
        });
        navigate('/login', { replace: true });
      }
    };

    performLogout();
  }, []);

  // Return null as this component doesn't render anything
  return null;
} 