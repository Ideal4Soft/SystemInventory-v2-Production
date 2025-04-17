import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface InvoicePrintProps {
  invoiceId: number;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  date: string;
  accountId: number;
  warehouseId: number;
  status: string;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  account?: {
    id: number;
    name: string;
    type: string;
  };
  details?: Array<{
    id: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    total: number;
    productName?: string;
  }>;
}

interface Settings {
  companyName: string;
  address: string;
  phone: string;
  currencySymbol: string;
}

export default function InvoicePrint({ invoiceId }: InvoicePrintProps) {
  const { toast } = useToast();

  // Fetch invoice data
  const { data: invoice, isLoading, error } = useQuery<Invoice>({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/invoices/${invoiceId}`, 'GET');
        return response;
      } catch (error) {
        console.error('Error fetching invoice:', error);
        throw error;
      }
    },
    retry: false, // Disable retries to prevent infinite loops
    gcTime: 60000, // Keep in garbage collection for 1 minute
    staleTime: 30000 // Cache for 30 seconds
  });

  // Fetch settings for company info
  const { data: settings } = useQuery<Settings>({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      return apiRequest('/api/settings', 'GET');
    },
    gcTime: 600000, // Keep in garbage collection for 10 minutes
    staleTime: 300000 // Cache for 5 minutes
  });

  if (isLoading) {
    return <div className="p-8 text-center">جاري تحميل الفاتورة...</div>;
  }

  if (error) {
    console.error('Error in InvoicePrint:', error);
    return <div className="p-8 text-center text-red-500">حدث خطأ أثناء تحميل الفاتورة</div>;
  }

  if (!invoice) {
    return <div className="p-8 text-center">لم يتم العثور على الفاتورة</div>;
  }

  const isPurchase = invoice.invoiceNumber?.startsWith('PUR-');

  return (
    <div className="p-8 bg-white" dir="rtl">
      {/* Company Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">{settings?.companyName || 'اسم الشركة'}</h1>
        <p className="text-gray-600">{settings?.address}</p>
        <p className="text-gray-600">هاتف: {settings?.phone}</p>
      </div>

      {/* Invoice Title */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">
          {isPurchase ? 'فاتورة مشتريات' : 'فاتورة مبيعات'}
        </h2>
        <p className="text-gray-600">رقم الفاتورة: {invoice.invoiceNumber}</p>
        <p className="text-gray-600">التاريخ: {new Date(invoice.date).toLocaleDateString('ar-EG')}</p>
      </div>

      {/* Customer/Supplier Info */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">{isPurchase ? 'المورد' : 'العميل'}</h3>
        <p>{invoice.account?.name || '-'}</p>
      </div>

      {/* Invoice Items */}
      <table className="w-full mb-6">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-right">#</th>
            <th className="py-2 text-right">المنتج</th>
            <th className="py-2 text-right">الكمية</th>
            <th className="py-2 text-right">السعر</th>
            <th className="py-2 text-right">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {invoice.details?.map((item: any, index: number) => (
            <tr key={index} className="border-b">
              <td className="py-2">{index + 1}</td>
              <td className="py-2">{item.productName || 'منتج'}</td>
              <td className="py-2">{item.quantity}</td>
              <td className="py-2">{formatCurrency(item.unitPrice)}</td>
              <td className="py-2">{formatCurrency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64">
          <div className="flex justify-between mb-2">
            <span>المجموع</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between mb-2 text-red-600">
              <span>الخصم</span>
              <span>- {formatCurrency(invoice.discount)}</span>
            </div>
          )}
          {invoice.tax > 0 && (
            <div className="flex justify-between mb-2">
              <span>الضريبة</span>
              <span>{formatCurrency(invoice.tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t pt-2">
            <span>الإجمالي</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>شكراً لتعاملكم معنا</p>
        <p className="mt-2">تم إنشاء هذه الفاتورة بواسطة نظام سهل لإدارة الأعمال</p>
      </div>
    </div>
  );
} 