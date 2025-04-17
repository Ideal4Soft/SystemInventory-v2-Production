import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Users, 
  Settings, 
  BarChart, 
  Database, 
  FileUp,
  Truck 
} from "lucide-react";

export default function MainNav() {
  const [location] = useLocation();

  const routes = [
    {
      href: "/",
      label: "الرئيسية",
      icon: Home,
      active: location === "/"
    },
    {
      href: "/invoices",
      label: "المبيعات",
      icon: ShoppingCart,
      active: location === "/invoices"
    },
    {
      href: "/purchases",
      label: "المشتريات",
      icon: Truck,
      active: location === "/purchases"
    },
    {
      href: "/inventory",
      label: "المخزون",
      icon: Package,
      active: location === "/inventory"
    },
    {
      href: "/accounts",
      label: "الحسابات",
      icon: Users,
      active: location === "/accounts"
    },
    {
      href: "/reports",
      label: "التقارير",
      icon: BarChart,
      active: location === "/reports"
    },
    {
      href: "/settings",
      label: "الإعدادات",
      icon: Settings,
      active: location === "/settings"
    },
    {
      href: "/backup",
      label: "النسخ الاحتياطي",
      icon: Database,
      active: location === "/backup"
    },
    {
      href: "/restore",
      label: "استعادة البيانات",
      icon: FileUp,
      active: location === "/restore"
    }
  ];

  return (
    <nav className="flex flex-col space-y-1 p-2">
      {routes.map((route) => {
        const Icon = route.icon;
        return (
          <Link key={route.href} href={route.href}>
            <Button
              variant={route.active ? "default" : "ghost"}
              className={`w-full justify-start ${route.active ? "bg-primary" : ""}`}
            >
              <Icon className="h-5 w-5 ml-2" />
              {route.label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
} 