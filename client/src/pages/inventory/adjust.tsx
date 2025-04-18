import InventoryAdjustForm from "@/components/inventory/inventory-adjust-form";
import { useLocation } from "wouter";

export default function InventoryAdjustPage() {
  const [, navigate] = useLocation();
  
  return (
    <div className="p-4">
      <InventoryAdjustForm onComplete={() => navigate("/inventory")} />
    </div>
  );
} 