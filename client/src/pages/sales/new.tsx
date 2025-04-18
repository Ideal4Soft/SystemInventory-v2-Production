import { useLocation } from "wouter";
import InvoiceForm from "@/components/invoices/invoice-form";

export default function NewSalesPage() {
  const [, navigate] = useLocation();
  
  return (
    <div className="p-4 pb-20 sm:p-6 sm:pb-6">
      <InvoiceForm 
        isOpen={true} 
        onClose={() => navigate('/invoices')} 
        invoiceType="sales" 
      />
    </div>
  );
} 