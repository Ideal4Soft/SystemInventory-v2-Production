import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/app-context";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const { setUser, setAuthenticated, authenticated } = useAppContext();
  const { toast } = useToast();

  useEffect(() => {
    if (authenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [authenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Development test credentials bypass
    if (username === "test" && password === "test123") {
      const testUser = {
        id: 1,
        username: "test",
        fullName: "Test User",
        role: "admin"
      };
      
      await Promise.all([
        localStorage.setItem('user', JSON.stringify(testUser)),
        localStorage.setItem('authenticated', 'true')
      ]);
      
      setUser(testUser);
      setAuthenticated(true);
      
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 500);
      
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (response.ok && data.user) {
        await Promise.all([
          localStorage.setItem('user', JSON.stringify(data.user)),
          localStorage.setItem('authenticated', 'true')
        ]);
        setUser(data.user);
        setAuthenticated(true);
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 500);
        return;
      } else {
        toast({
          title: "خطأ",
          description: data.message || "حدث خطأ أثناء تسجيل الدخول",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تسجيل الدخول",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle className="text-2xl text-center">تسجيل الدخول</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "جاري الدخول..." : "دخول"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}