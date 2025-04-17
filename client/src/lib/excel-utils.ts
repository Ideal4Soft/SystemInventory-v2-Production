import * as XLSX from 'xlsx';

// المنتجات
export interface ExcelProduct {
  الكود: string;
  الاسم: string;
  الفئة: string;
  الوحدة: string;
  'سعر التكلفة': number;
  'سعر البيع': number;
  الكمية: number;
}

// العملاء والموردين
export interface ExcelAccount {
  الكود: string;
  الاسم: string;
  النوع: string;
  العنوان?: string;
  الهاتف?: string;
  'الرصيد الافتتاحي': number;
  ملاحظات?: string;
}

// الفواتير
export interface ExcelInvoice {
  'رقم الفاتورة': string;
  التاريخ: string;
  'اسم العميل/المورد': string;
  'نوع الفاتورة': string;
  المنتجات: string; // JSON string of products
  'إجمالي الكمية': number;
  'إجمالي القيمة': number;
  الخصم?: number;
  الضريبة?: number;
  'الإجمالي النهائي': number;
  الحالة: string;
  ملاحظات?: string;
}

// المعاملات المالية
export interface ExcelTransaction {
  التاريخ: string;
  'نوع المعاملة': string;
  'اسم الحساب': string;
  المبلغ: number;
  'طريقة الدفع': string;
  الملاحظات?: string;
}

// تصدير المنتجات
export const exportProductsToExcel = (products: any[]) => {
  const worksheet = XLSX.utils.json_to_sheet(
    products.map(product => ({
      الكود: product.code,
      الاسم: product.name,
      الفئة: product.category,
      الوحدة: product.unit,
      'سعر التكلفة': product.costPrice,
      'سعر البيع': product.sellPrice,
      الكمية: product.quantity
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "المنتجات");
  XLSX.writeFile(workbook, "قائمة_المنتجات.xlsx");
};

// تصدير العملاء والموردين
export const exportAccountsToExcel = (accounts: any[]) => {
  const worksheet = XLSX.utils.json_to_sheet(
    accounts.map(account => ({
      الكود: account.code,
      الاسم: account.name,
      النوع: account.type === 'customer' ? 'عميل' : 'مورد',
      العنوان: account.address || '',
      الهاتف: account.phone || '',
      'الرصيد الافتتاحي': account.openingBalance || 0,
      ملاحظات: account.notes || ''
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "العملاء والموردين");
  XLSX.writeFile(workbook, "قائمة_العملاء_والموردين.xlsx");
};

// تصدير الفواتير
export const exportInvoicesToExcel = (invoices: any[]) => {
  const worksheet = XLSX.utils.json_to_sheet(
    invoices.map(invoice => ({
      'رقم الفاتورة': invoice.invoiceNumber,
      التاريخ: new Date(invoice.date).toLocaleDateString('ar-EG'),
      'اسم العميل/المورد': invoice.account?.name || '',
      'نوع الفاتورة': invoice.type === 'sales' ? 'مبيعات' : 'مشتريات',
      المنتجات: JSON.stringify(invoice.details),
      'إجمالي الكمية': invoice.totalQuantity,
      'إجمالي القيمة': invoice.subtotal,
      الخصم: invoice.discountAmount,
      الضريبة: invoice.taxAmount,
      'الإجمالي النهائي': invoice.total,
      الحالة: getInvoiceStatus(invoice.status),
      ملاحظات: invoice.notes || ''
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "الفواتير");
  XLSX.writeFile(workbook, "قائمة_الفواتير.xlsx");
};

// تصدير المعاملات المالية
export const exportTransactionsToExcel = (transactions: any[]) => {
  const worksheet = XLSX.utils.json_to_sheet(
    transactions.map(transaction => ({
      التاريخ: new Date(transaction.date).toLocaleDateString('ar-EG'),
      'نوع المعاملة': getTransactionType(transaction.type),
      'اسم الحساب': transaction.account?.name || '',
      المبلغ: transaction.amount,
      'طريقة الدفع': getPaymentMethod(transaction.paymentMethod),
      الملاحظات: transaction.notes || ''
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "المعاملات");
  XLSX.writeFile(workbook, "قائمة_المعاملات.xlsx");
};

// قوالب الملفات
export const getExcelTemplate = (type: 'products' | 'accounts' | 'invoices' | 'transactions') => {
  let template: any[] = [];
  let sheetName = '';
  let fileName = '';

  switch (type) {
    case 'products':
      template = [{
        الكود: 'مثال: 001',
        الاسم: 'مثال: منتج 1',
        الفئة: 'مثال: فئة 1',
        الوحدة: 'مثال: قطعة',
        'سعر التكلفة': 100,
        'سعر البيع': 150,
        الكمية: 10
      }];
      sheetName = "قالب_المنتجات";
      fileName = "قالب_المنتجات.xlsx";
      break;

    case 'accounts':
      template = [{
        الكود: 'مثال: C001',
        الاسم: 'مثال: شركة النور',
        النوع: 'عميل',
        العنوان: 'مثال: شارع النصر',
        الهاتف: '0123456789',
        'الرصيد الافتتاحي': 0,
        ملاحظات: 'ملاحظات إضافية'
      }];
      sheetName = "قالب_العملاء";
      fileName = "قالب_العملاء.xlsx";
      break;

    case 'invoices':
      template = [{
        'رقم الفاتورة': 'INV001',
        التاريخ: new Date().toLocaleDateString('ar-EG'),
        'اسم العميل/المورد': 'مثال: شركة النور',
        'نوع الفاتورة': 'مبيعات',
        المنتجات: '[{"code":"001","name":"منتج 1","quantity":5,"price":100}]',
        'إجمالي الكمية': 5,
        'إجمالي القيمة': 500,
        الخصم: 50,
        الضريبة: 70,
        'الإجمالي النهائي': 520,
        الحالة: 'مسودة',
        ملاحظات: 'ملاحظات الفاتورة'
      }];
      sheetName = "قالب_الفواتير";
      fileName = "قالب_الفواتير.xlsx";
      break;

    case 'transactions':
      template = [{
        التاريخ: new Date().toLocaleDateString('ar-EG'),
        'نوع المعاملة': 'قبض',
        'اسم الحساب': 'مثال: شركة النور',
        المبلغ: 1000,
        'طريقة الدفع': 'نقدي',
        الملاحظات: 'ملاحظات المعاملة'
      }];
      sheetName = "قالب_المعاملات";
      fileName = "قالب_المعاملات.xlsx";
      break;
  }

  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
};

// استيراد من Excel
export const importFromExcel = async <T>(file: File): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const items = XLSX.utils.sheet_to_json<T>(worksheet);
        resolve(items);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

// Helper functions
const getInvoiceStatus = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    draft: 'مسودة',
    posted: 'معتمد',
    paid: 'مدفوع',
    partially_paid: 'مدفوع جزئياً',
    cancelled: 'ملغي'
  };
  return statusMap[status] || status;
};

const getTransactionType = (type: string): string => {
  const typeMap: { [key: string]: string } = {
    payment: 'دفع',
    receipt: 'قبض',
    expense: 'مصروف',
    revenue: 'إيراد'
  };
  return typeMap[type] || type;
};

const getPaymentMethod = (method: string): string => {
  const methodMap: { [key: string]: string } = {
    cash: 'نقدي',
    bank: 'تحويل بنكي',
    check: 'شيك',
    card: 'بطاقة ائتمان'
  };
  return methodMap[method] || method;
}; 