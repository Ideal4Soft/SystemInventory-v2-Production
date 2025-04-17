import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getFullApiUrl } from "@/lib/queryClient";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Trash, Plus, Calculator } from "lucide-react";

// Define schema for form validation
const invoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, { message: "رقم الفاتورة مطلوب" }),
  accountId: z.number({ required_error: "اختيار العميل مطلوب" }),
  warehouseId: z.number({ required_error: "اختيار المخزن مطلوب" }),
  date: z.string().min(1, { message: "التاريخ مطلوب" }),
  dueDate: z.string().optional(),
  status: z.string().default("paid"),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  discountAmount: z.number().min(0, { message: "مبلغ الخصم يجب أن يكون 0 أو أكبر" }).default(0),
  taxRate: z.number().min(0, { message: "نسبة الضريبة يجب أن تكون 0 أو أكبر" }).default(0),
  invoiceType: z.string().optional(),
});

// Define item schema
const invoiceItemSchema = z.object({
  productId: z.number(),
  quantity: z.number().min(0.01, { message: "الكمية يجب أن تكون أكبر من 0" }),
  unitPrice: z.number().min(0, { message: "السعر يجب أن يكون 0 أو أكبر" }),
  discount: z.number().min(0, { message: "الخصم يجب أن يكون 0 أو أكبر" }).default(0),
  tax: z.number().min(0, { message: "الضريبة يجب أن تكون 0 أو أكبر" }).default(0),
  total: z.number().min(0, { message: "الإجمالي يجب أن يكون 0 أو أكبر" }),
});

// Define the form values type
type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
type InvoiceItem = z.infer<typeof invoiceItemSchema>;

// Define the invoice detail item type for the API
interface InvoiceDetailItem {
  productId: number | string;
  quantity: number | string;
  unitPrice: number | string;
  discount?: number | string;
  tax?: number | string;
  total: number | string;
}

// Define the invoice data structure for submission
interface InvoiceData {
  invoice: InvoiceFormValues & {
    id?: number;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    type: string;
  };
  details: InvoiceItem[];
}

interface InvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceToEdit?: any; // Optional invoice to edit
  invoiceType?: string; // sales, purchase, etc.
}

// Add this type definition for products at the top of the file, near other type definitions
interface Product {
  id: number;
  name: string;
  sellPrice1?: number;
  costPrice?: number;
  [key: string]: any; // Allow other properties
}

// Add this interface for warehouses
interface Warehouse {
  id: number;
  name: string;
  isDefault?: boolean;
  [key: string]: any; // Allow other properties
}

export default function InvoiceForm({ isOpen, onClose, invoiceToEdit, invoiceType = "sales" }: InvoiceFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [itemDiscount, setItemDiscount] = useState(0);
  const [itemTax, setItemTax] = useState(0);
  const [totals, setTotals] = useState({
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
  });
  const [accountSearchTerm, setAccountSearchTerm] = useState("");
  const [filteredAccounts, setFilteredAccounts] = useState<any[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // Fetch customers/suppliers for dropdown
  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/accounts', invoiceType === 'sales' ? 'customer' : 'supplier'],
    queryFn: async () => {
      const type = invoiceType === 'sales' ? 'customer' : 'supplier';
      return apiRequest(`/api/accounts?type=${type}`, "GET");
    }
  });

  // Fetch warehouses for dropdown
  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
    queryFn: () => apiRequest('/api/warehouses', 'GET'),
  });

  // Fetch products for dropdown
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    queryFn: () => apiRequest('/api/products', 'GET'),
  });

  // Use react-hook-form with zod validation
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: `${invoiceType === 'sales' ? 'INV' : 'PUR'}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().substring(0, 10),
      dueDate: new Date().toISOString().substring(0, 10), // Set dueDate to today by default
      status: "draft", // default status: draft for sales invoices
      discountAmount: 0,
      taxRate: 0,
      invoiceType: invoiceType, // Initialize with the prop value
    },
  });

  // Set default warehouse when warehouses are loaded
  useEffect(() => {
    if (warehouses && warehouses.length > 0 && !form.getValues('warehouseId')) {
      // Find default warehouse or use the first one
      const defaultWarehouse = warehouses.find(w => w.isDefault) || warehouses[0];
      if (defaultWarehouse) {
        form.setValue('warehouseId', defaultWarehouse.id);
      }
    }
  }, [warehouses, form]);

  // Filter accounts based on search term
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      if (!accountSearchTerm.trim()) {
        setFilteredAccounts(accounts);
      } else {
        const filtered = accounts.filter((account: any) => 
          account.name.toLowerCase().includes(accountSearchTerm.toLowerCase())
        );
        setFilteredAccounts(filtered);
      }
    } else {
      setFilteredAccounts([]);
    }
  }, [accounts, accountSearchTerm]);

  // Filter products based on search term
  useEffect(() => {
    if (products && products.length > 0) {
      if (!productSearchTerm.trim()) {
        setFilteredProducts(products);
      } else {
        const filtered = products.filter((product: Product) => 
          product.name.toLowerCase().includes(productSearchTerm.toLowerCase())
        );
        setFilteredProducts(filtered);
      }
    } else {
      setFilteredProducts([]);
    }
  }, [products, productSearchTerm]);

  // Calculate totals whenever items change or discountAmount/taxRate changes
  useEffect(() => {
    // تحويل جميع القيم إلى أرقام لتجنب أخطاء الحساب
    const subtotal = parseFloat(invoiceItems.reduce((sum, item: InvoiceItem) => sum + (Number(item.total) || 0), 0).toFixed(2));
    const itemsDiscount = parseFloat(invoiceItems.reduce((sum, item: InvoiceItem) => sum + (Number(item.discount) || 0), 0).toFixed(2));
    const invoiceDiscount = Number(form.watch('discountAmount')) || 0;
    const totalDiscount = parseFloat((itemsDiscount + invoiceDiscount).toFixed(2));
    
    const itemsTax = parseFloat(invoiceItems.reduce((sum, item: InvoiceItem) => sum + (Number(item.tax) || 0), 0).toFixed(2));
    const invoiceTaxRate = Number(form.watch('taxRate')) || 0;
    const invoiceTaxAmount = parseFloat((((subtotal - totalDiscount) * invoiceTaxRate) / 100).toFixed(2));
    const totalTax = parseFloat((itemsTax + invoiceTaxAmount).toFixed(2));
    
    const total = parseFloat((subtotal - totalDiscount + totalTax).toFixed(2));

    setTotals({
      subtotal,
      discount: totalDiscount,
      tax: totalTax,
      total,
    });
  }, [invoiceItems, form.watch('discountAmount'), form.watch('taxRate')]);

  // Update form values when editing an invoice
  useEffect(() => {
    if (invoiceToEdit) {
      form.reset({
        invoiceNumber: invoiceToEdit.invoiceNumber,
        accountId: invoiceToEdit.accountId,
        warehouseId: invoiceToEdit.warehouseId,
        date: invoiceToEdit.date ? new Date(invoiceToEdit.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        dueDate: invoiceToEdit.dueDate ? new Date(invoiceToEdit.dueDate).toISOString().substring(0, 10) : undefined,
        status: invoiceToEdit.status || "paid",
        notes: invoiceToEdit.notes || "",
        paymentTerms: invoiceToEdit.paymentTerms || "",
        discountAmount: invoiceToEdit.discountAmount || 0,
        taxRate: invoiceToEdit.taxRate || 0,
        invoiceType: invoiceType, // Use the prop value
      });

      if (invoiceToEdit.details) {
        setInvoiceItems(invoiceToEdit.details);
      }
      
      // Set account search term if account exists
      if (invoiceToEdit.accountId) {
        const account = accounts.find((a: any) => a.id === invoiceToEdit.accountId);
        if (account) {
          setAccountSearchTerm(account.name);
        }
      }
    }
  }, [invoiceToEdit, form, accounts, invoiceType]);

  // Calculate total for an item when quantity or price changes
  const calculateItemTotal = (quantity: number, price: number) => {
    // تأكد من أن الكمية والسعر أرقام صحيحة وتجنب الأخطاء الحسابية
    const qty = Number(quantity) || 0;
    const unitPrice = Number(price) || 0;
    
    // حساب المجموع بدقة
    return parseFloat((qty * unitPrice).toFixed(2));
  };

  // Add item to invoice
  const addItem = () => {
    if (!selectedProduct) {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار منتج",
        variant: "destructive",
      });
      return;
    }

    const product = products.find((p: Product) => p.id === selectedProduct);
    if (!product) return;

    // تحويل جميع القيم إلى أرقام وضمان دقة الحساب
    const qty = Number(quantity) || 0;
    const price = Number(unitPrice) || 0;
    const discount = Number(itemDiscount) || 0;
    const taxAmount = Number(itemTax) || 0;
    
    // حساب المجموع الفرعي والإجمالي بدقة
    const itemSubtotal = parseFloat((qty * price).toFixed(2));
    const total = parseFloat((itemSubtotal - discount + taxAmount).toFixed(2));
    
    const newItem: InvoiceItem = {
      productId: selectedProduct,
      quantity: qty,
      unitPrice: price,
      discount: discount,
      tax: taxAmount,
      total: total,
    };

    setInvoiceItems([...invoiceItems, newItem]);
    setSelectedProduct(null);
    setQuantity(1);
    setUnitPrice(0);
    setItemDiscount(0);
    setItemTax(0);
  };

  // Remove item from invoice
  const removeItem = (index: number) => {
    const updatedItems = [...invoiceItems];
    updatedItems.splice(index, 1);
    setInvoiceItems(updatedItems);
  };

  // Create/Update invoice mutation
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = invoiceToEdit ? `/api/invoices/${invoiceToEdit.id}` : '/api/invoices';
      console.log(`Making ${invoiceToEdit ? 'PATCH' : 'POST'} request to ${endpoint}`, JSON.stringify(data).slice(0, 200) + '...');
      
      try {
        // Create a fresh copy of the data
        const requestData = {
          invoice: {
            ...data.invoice,
            // Keep date as string in YYYY-MM-DD format
            date: data.invoice.date,
            dueDate: data.invoice.dueDate,
            // Ensure numeric values
            accountId: Number(data.invoice.accountId),
            warehouseId: Number(data.invoice.warehouseId),
            discountAmount: Number(data.invoice.discountAmount || 0),
            taxRate: Number(data.invoice.taxRate || 0),
            subtotal: Number(data.invoice.subtotal),
            discount: Number(data.invoice.discount || 0),
            tax: Number(data.invoice.tax || 0),
            total: Number(data.invoice.total)
          },
          details: data.details.map((item: InvoiceDetailItem) => ({
            productId: Number(item.productId),
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount || 0),
            tax: Number(item.tax || 0),
            total: Number(item.total)
          }))
        };

        console.log("SIMPLIFIED DATA BEING SENT:", JSON.stringify(requestData, null, 2));

        const response = await fetch(endpoint, {
          method: invoiceToEdit ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
          credentials: 'include',
        });

        // Log the entire response for debugging
        console.log('Response status:', response.status);
        
        // Get response text first for debugging
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        if (!response.ok) {
          console.error('API Error Response:', responseText);
          // Try to parse error message if possible
          let errorMessage = `Error: ${response.status} ${response.statusText || 'Unknown error'}`;
          try {
            const errorData = JSON.parse(responseText);
            if (errorData && errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (parseError) {
            // If parsing fails, use the original error
          }
          throw new Error(errorMessage);
        }

        // Parse the responseText as JSON if not empty
        if (responseText) {
          return JSON.parse(responseText);
        } else {
          return { success: true };
        }
      } catch (err) {
        console.error('Network or parsing error:', err);
        throw err;
      }
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      
      // Show success toast
      toast({
        title: invoiceToEdit ? "تم تحديث الفاتورة" : "تم إنشاء الفاتورة",
        description: invoiceToEdit ? "تم تحديث بيانات الفاتورة بنجاح" : "تم إنشاء الفاتورة بنجاح",
      });
      
      // Close the dialog
      onClose();
    },
    onError: (error: Error) => {
      console.error("Error saving invoice:", error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء حفظ الفاتورة. يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    },
  });

  // Delete invoice function
  const deleteInvoice = async () => {
    if (!invoiceToEdit || !invoiceToEdit.id) return;
    
    if (!window.confirm("هل أنت متأكد من حذف هذه الفاتورة؟")) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/invoices/${invoiceToEdit.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error("Delete error response:", text);
        throw new Error(`Error deleting invoice: ${response.status} ${response.statusText}`);
      }
      
      toast({
        title: "تم حذف الفاتورة",
        description: "تم حذف الفاتورة بنجاح",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      onClose();
    } catch (error: any) {
      console.error("Error deleting invoice:", error);
      toast({
        title: "خطأ في حذف الفاتورة",
        description: error.message || "حدث خطأ أثناء حذف الفاتورة، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get errors setter from form
  const { formState: { errors }, setError } = form;

  // Helper function to generate invoice number
  const generateInvoiceNumber = () => {
    const prefix = invoiceType === 'sales' ? 'INV' : 'PUR';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randomNum}`;
  };

  // Form submission handler
  const onSubmit = async (values: InvoiceFormValues) => {
    setIsSubmitting(true);
    
    if (invoiceItems.length === 0) {
      toast({
        title: "خطأ",
        description: "يجب إضافة منتج واحد على الأقل",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    
    // Validate quantities
    const invalidItems = invoiceItems.filter(item => !item.quantity || item.quantity <= 0);
    if (invalidItems.length > 0) {
      toast({
        title: "خطأ في الكميات",
        description: "يجب أن تكون جميع الكميات أكبر من صفر",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Always use "posted" status to ensure inventory is affected
    const invoiceStatus = "posted";
    
    // Additional validation for 'posted' status in both sales and purchases
    // Check if account is selected
    if (!values.accountId) {
      toast({
        title: "خطأ في البيانات",
        description: `يجب اختيار ${invoiceType === "sales" ? "العميل" : "المورد"} لترحيل الفاتورة`,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Check if warehouse is selected
    if (!values.warehouseId) {
      toast({
        title: "خطأ في البيانات",
        description: "يجب اختيار المخزن لترحيل الفاتورة",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    
    // Confirm inventory impact for both sales and purchases if it's a new invoice
    if (!invoiceToEdit) {
      const action = invoiceType === 'sales' ? 'نقص' : 'زيادة';
      const confirmed = window.confirm(
        `سيؤدي ترحيل الفاتورة إلى ${action} المخزون وتسجيل معاملة مالية. هل أنت متأكد من رغبتك في ترحيل الفاتورة؟`
      );
      
      if (!confirmed) {
        // User cancelled, keep the form open
        setIsSubmitting(false);
        return;
      }
    }
    
    try {
      setIsSubmitting(true);
      
      // Prepare the invoice data with totals and ensure status is "posted"
      const invoiceData: InvoiceData = {
        invoice: {
          ...values,
          invoiceNumber: values.invoiceNumber || generateInvoiceNumber(),
          date: values.date || new Date().toISOString().split('T')[0],
          accountId: Number(values.accountId),
          warehouseId: Number(values.warehouseId),
          taxRate: Number(values.taxRate || 0),
          discountAmount: Number(values.discountAmount || 0),
          status: invoiceStatus, // Always use "posted" status
          // Include totals calculated from items
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total,
          type: values.invoiceType || invoiceType, // Use the form value or the prop value
        },
        details: invoiceItems
      };
      
      // If editing an invoice, add the id
      if (invoiceToEdit && invoiceToEdit.id) {
        invoiceData.invoice.id = invoiceToEdit.id;
      }

      // Submit the data
      await mutation.mutateAsync(invoiceData);
      
      // Let the onSuccess handler handle the rest
    } catch (err) {
      console.error("Error submitting form:", err);
      
      toast({
        title: "خطأ في حفظ الفاتورة",
        description: err instanceof Error ? err.message : "حدث خطأ أثناء حفظ الفاتورة. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
      
      setIsSubmitting(false);
    }
  };

  // Handle product selection and update unit price
  const handleProductChange = (productId: string) => {
    const id = parseInt(productId);
    setSelectedProduct(id);
    
    const product = products.find((p: Product) => p.id === id);
    if (product) {
      setUnitPrice(product.sellPrice1 || 0);
    }
  };

  // Get product name by ID
  const getProductName = (productId: number) => {
    const product = products.find((p: Product) => p.id === productId);
    return product ? product.name : "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[500px] overflow-y-auto p-3 max-h-[85vh]">
        <DialogHeader className="space-y-1 pb-1">
          <DialogTitle className="text-sm font-medium">
            {invoiceToEdit ? "تعديل الفاتورة" : "إضافة فاتورة جديدة"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              {/* Invoice Type */}
              <FormField
                control={form.control}
                name="invoiceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">نوع الفاتورة</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        const newType = value as "sales" | "purchase";
                        // Filter accounts based on the invoice type
                        if (value === "sales") {
                          setFilteredAccounts(
                            accounts.filter((account: any) => account.type === "customer")
                          );
                        } else {
                          setFilteredAccounts(
                            accounts.filter((account: any) => account.type === "supplier")
                          );
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="اختر نوع الفاتورة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sales" className="text-xs">فاتورة مبيعات</SelectItem>
                        <SelectItem value="purchase" className="text-xs">فاتورة مشتريات</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Invoice Number */}
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">رقم الفاتورة</FormLabel>
                    <FormControl>
                      <Input className="h-7 text-xs" {...field} value={field.value || ""} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Invoice Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">تاريخ الفاتورة</FormLabel>
                    <FormControl>
                      <Input
                        className="h-7 text-xs"
                        type="date"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Due Date */}
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">تاريخ الاستحقاق</FormLabel>
                    <FormControl>
                      <Input
                        className="h-7 text-xs"
                        type="date"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Discount Amount */}
              <FormField
                control={form.control}
                name="discountAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">الخصم</FormLabel>
                    <FormControl>
                      <Input 
                        className="h-7 text-xs"
                        type="number" 
                        min="0" 
                        step="0.01" 
                        {...field} 
                        value={field.value || 0}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Tax Rate */}
              <FormField
                control={form.control}
                name="taxRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">الضريبة (%)</FormLabel>
                    <FormControl>
                      <Input 
                        className="h-7 text-xs"
                        type="number" 
                        min="0" 
                        max="100" 
                        step="0.01" 
                        {...field} 
                        value={field.value || 0}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Customer/Supplier with Search */}
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-xs">{invoiceType === "sales" ? "العميل" : "المورد"}</FormLabel>
                    <div className="relative">
                      <Input
                        className="h-7 text-xs mb-1"
                        placeholder={`ابحث عن ${invoiceType === "sales" ? "العميل" : "المورد"}...`}
                        value={accountSearchTerm}
                        onChange={(e) => setAccountSearchTerm(e.target.value)}
                      />
                      {accountSearchTerm.length > 0 && (
                        <div className="absolute z-10 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 w-full overflow-y-auto">
                          {filteredAccounts.length > 0 ? (
                            filteredAccounts.map((account: any) => (
                              <div
                                key={account.id}
                                className="p-1 text-xs hover:bg-gray-100 cursor-pointer"
                                onClick={() => {
                                  field.onChange(account.id);
                                  setAccountSearchTerm(account.name);
                                }}
                              >
                                {account.name}
                              </div>
                            ))
                          ) : (
                            <div className="p-1 text-xs text-gray-500">لا توجد نتائج</div>
                          )}
                        </div>
                      )}
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(parseInt(value));
                          const selectedAccount = accounts.find((a: any) => a.id === parseInt(value));
                          if (selectedAccount) {
                            setAccountSearchTerm(selectedAccount.name);
                          }
                        }}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder={invoiceType === "sales" ? "اختر العميل" : "اختر المورد"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredAccounts.map((account: any) => (
                            <SelectItem key={account.id} value={account.id.toString()} className="text-xs">
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </FormItem>
                )}
              />

              {/* Warehouse */}
              <FormField
                control={form.control}
                name="warehouseId"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel className="text-xs">المخزن</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="اختر المخزن" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {warehouses.map((warehouse: any) => (
                          <SelectItem key={warehouse.id} value={warehouse.id.toString()} className="text-xs">
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel className="text-xs">ملاحظات</FormLabel>
                    <FormControl>
                      <Textarea className="h-7 text-xs" {...field} value={field.value || ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Product Selection */}
            <div className="mt-3 bg-gray-50 p-2 rounded-md">
              <h3 className="font-medium text-xs text-gray-700 mb-2">إضافة منتجات</h3>
              <div className="grid grid-cols-12 gap-1 mb-2">
                <div className="col-span-5">
                  <Select onValueChange={handleProductChange} value={selectedProduct?.toString()}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="اختر منتج" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product: any) => (
                        <SelectItem key={product.id} value={product.id.toString()} className="text-xs">
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Input
                    className="h-7 text-xs"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="الكمية"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="col-span-2">
                  <Input
                    className="h-7 text-xs"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="السعر"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="col-span-2">
                  <Input
                    className="h-7 text-xs bg-gray-100"
                    type="number"
                    readOnly
                    value={calculateItemTotal(quantity, unitPrice)}
                  />
                </div>

                <div className="col-span-1">
                  <Button
                    type="button"
                    className="w-full h-7 text-xs px-1"
                    onClick={addItem}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="h-7">
                      <TableHead className="w-[30px] text-xs p-1">#</TableHead>
                      <TableHead className="text-xs p-1">المنتج</TableHead>
                      <TableHead className="text-xs text-center p-1">الكمية</TableHead>
                      <TableHead className="text-xs text-center p-1">السعر</TableHead>
                      <TableHead className="text-xs text-center p-1">الإجمالي</TableHead>
                      <TableHead className="w-[50px] text-xs text-center p-1">حذف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-2 text-xs text-gray-500">
                          لا توجد منتجات
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoiceItems.map((item: InvoiceItem, index: number) => (
                        <TableRow key={index} className="h-7">
                          <TableCell className="text-xs p-1">{index + 1}</TableCell>
                          <TableCell className="text-xs p-1">{getProductName(item.productId)}</TableCell>
                          <TableCell className="text-xs text-center p-1">{item.quantity}</TableCell>
                          <TableCell className="text-xs text-center p-1">{item.unitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-center p-1">{item.total.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-center p-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-red-500 hover:text-red-700 hover:bg-red-50 p-0"
                              onClick={() => removeItem(index)}
                            >
                              <Trash className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="mt-2 flex justify-end">
                <div className="w-48 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-xs">المجموع:</span>
                    <span className="font-medium text-xs">{totals.subtotal.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-xs">الخصم:</span>
                    <span className="font-medium text-xs">{totals.discount.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-xs">الضريبة:</span>
                    <span className="font-medium text-xs">{totals.tax.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold border-t pt-1">
                    <span>الإجمالي:</span>
                    <span>{totals.total.toFixed(2)} ج.م</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              {invoiceToEdit && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  className="h-7 text-xs px-2"
                  onClick={deleteInvoice}
                  disabled={isSubmitting}
                >
                  حذف
                </Button>
              )}
              <div className="flex space-x-2 space-x-reverse">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="h-7 text-xs px-2"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  إلغاء
                </Button>
                <Button 
                  type="submit" 
                  className="h-7 text-xs px-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      جاري الحفظ...
                    </span>
                  ) : (
                    invoiceToEdit ? "تحديث" : "حفظ"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 