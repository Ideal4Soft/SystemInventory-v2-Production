import StocktakeForm from "@/components/inventory/stocktake-form";
import { useLocation } from "wouter";

export default function InventoryCountPage() {
  const [, navigate] = useLocation();
  
  return (
    <div className="p-4 pb-20 sm:p-6 sm:pb-6">
      <StocktakeForm onComplete={() => navigate("/inventory")} />
    </div>
  );
} 