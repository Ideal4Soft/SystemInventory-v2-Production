// Persistent mock data store for development
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFilePath = path.join(__dirname, '..', 'mock-data.json');

// Initial data state
let initialData = {
  products: [
    {
      id: 1,
      name: "سكر",
      code: "SKR001",
      barcode: "123456789",
      categoryId: 1,
      costPrice: 20.50,
      sellPrice1: 25.00,
      sellPrice2: 24.00,
      sellPrice3: 23.00,
      sellPrice4: 22.00,
      unit: "kg",
      description: "سكر أبيض ناعم",
      minStock: 10,
      isActive: true
    },
    {
      id: 2,
      name: "أرز",
      code: "RZ002",
      barcode: "234567890",
      categoryId: 1,
      costPrice: 15.75,
      sellPrice1: 18.50,
      sellPrice2: 18.00,
      sellPrice3: 17.50,
      sellPrice4: 17.00,
      unit: "kg",
      description: "أرز بسمتي",
      minStock: 15,
      isActive: true
    },
    {
      id: 3,
      name: "زيت",
      code: "ZT003",
      barcode: "345678901",
      categoryId: 2,
      costPrice: 35.00,
      sellPrice1: 40.00,
      sellPrice2: 39.00,
      sellPrice3: 38.00,
      sellPrice4: 37.00,
      unit: "liter",
      description: "زيت زيتون",
      minStock: 5,
      isActive: true
    }
  ],
  accounts: [
    {
      id: 1,
      name: "عميل افتراضي",
      type: "customer",
      phone: "01012345678",
      isActive: true
    },
    {
      id: 2,
      name: "مورد افتراضي",
      type: "supplier",
      phone: "01098765432",
      isActive: true
    }
  ],
  categories: [
    {
      id: 1,
      name: "مواد غذائية",
      description: "مواد غذائية أساسية",
      isDefault: true
    },
    {
      id: 2,
      name: "زيوت وسمن",
      description: "زيوت وسمنة وشحوم",
      isDefault: false
    }
  ],
  warehouses: [
    {
      id: 1,
      name: "المخزن الرئيسي",
      location: "القاهرة",
      isDefault: true,
      isActive: true
    },
    {
      id: 2,
      name: "مخزن الفرع",
      location: "الإسكندرية",
      isDefault: false,
      isActive: true
    }
  ],
  inventory: [
    {
      id: 1,
      productId: 1,
      warehouseId: 1,
      quantity: 150
    },
    {
      id: 2,
      productId: 2,
      warehouseId: 1,
      quantity: 200
    },
    {
      id: 3,
      productId: 3,
      warehouseId: 1,
      quantity: 100
    }
  ],
  invoices: []
};

// Try to load data from file if it exists
let data;
try {
  if (fs.existsSync(dataFilePath)) {
    const fileData = fs.readFileSync(dataFilePath, 'utf8');
    data = JSON.parse(fileData);
    console.log('[mockDB] Loaded data from file:', dataFilePath);
  } else {
    data = { ...initialData };
    // Save initial data to file
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    console.log('[mockDB] Created new data file:', dataFilePath);
  }
} catch (error) {
  console.error('[mockDB] Error loading data file:', error);
  data = { ...initialData };
}

// Helper function to save data to file
function saveData() {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    console.log('[mockDB] Data saved to file');
  } catch (error) {
    console.error('[mockDB] Error saving data to file:', error);
  }
}

// Function to ensure the system has the required accounting accounts
function ensureAccountingAccounts() {
  // Ensure accounts array exists
  if (!data.accounts) {
    data.accounts = [];
  }
  
  // Define the required accounting accounts
  const requiredAccounts = [
    // Assets (الأصول)
    { id: 100, name: "النقدية", type: "asset", accountGroup: "assets", accountNumber: "1001", isSystem: true, currentBalance: 0 },
    { id: 101, name: "البنك", type: "asset", accountGroup: "assets", accountNumber: "1002", isSystem: true, currentBalance: 0 },
    { id: 102, name: "المخزون", type: "asset", accountGroup: "assets", accountNumber: "1003", isSystem: true, currentBalance: 0 },
    
    // Liabilities (الخصوم)
    { id: 200, name: "حسابات الموردين", type: "liability", accountGroup: "liabilities", accountNumber: "2001", isSystem: true, currentBalance: 0 },
    
    // Revenue (الإيرادات)
    { id: 400, name: "المبيعات", type: "revenue", accountGroup: "revenue", accountNumber: "4001", isSystem: true, currentBalance: 0 },
    
    // Expenses (المصروفات)
    { id: 500, name: "تكلفة البضاعة المباعة", type: "expense", accountGroup: "expenses", accountNumber: "5001", isSystem: true, currentBalance: 0 },
    { id: 501, name: "المشتريات", type: "expense", accountGroup: "expenses", accountNumber: "5002", isSystem: true, currentBalance: 0 }
  ];
  
  // Add each required account if it doesn't exist
  for (const account of requiredAccounts) {
    const existingAccount = data.accounts.find((a: any) => a.id === account.id || a.accountNumber === account.accountNumber);
    if (!existingAccount) {
      console.log(`[mockDB] Adding system account: ${account.name}`);
      data.accounts.push(account);
    }
  }
  
  // Save changes
  saveData();
}

// Call the function to ensure accounting accounts exist - MOVE THIS CALL
// ensureAccountingAccounts();

// Extract collections from data
const { products, accounts, categories, warehouses, inventory, invoices } = data;

// Mock data arrays
export const mockInvoices: any[] = [];
export const mockInvoiceDetails: any[] = [];
export const mockTransactions: any[] = [
  {
    id: 1001,
    type: "debit",
    accountId: 2,
    amount: 500,
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    notes: "شراء مستلزمات مكتبية",
    paymentMethod: "cash",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    reference: "INV-102"
  },
  {
    id: 1002,
    type: "credit",
    accountId: 1,
    amount: 1500,
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    notes: "دفعة عميل",
    paymentMethod: "bank",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    reference: "REC-001"
  },
  {
    id: 1003,
    type: "credit",
    accountId: 1,
    amount: 2350.50,
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    notes: "سداد فاتورة مبيعات",
    paymentMethod: "cash",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    reference: "INV-095"
  },
  {
    id: 1004,
    type: "debit",
    accountId: 2,
    amount: 1200,
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    notes: "سداد دفعة مورد",
    paymentMethod: "bank",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    reference: "PUR-045"
  },
  {
    id: 1005,
    type: "debit",
    accountId: 2,
    amount: 800,
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    notes: "مصاريف نقل بضائع",
    paymentMethod: "cash",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    reference: "EXP-012"
  },
  {
    id: 1006,
    type: "credit",
    accountId: 1,
    amount: 3000,
    date: new Date().toISOString(), // today
    notes: "دفعة مقدمة من عميل",
    paymentMethod: "bank",
    createdAt: new Date().toISOString(),
    reference: "ADV-003"
  }
];

// Function to create a mock transaction
export function createMockTransaction(transaction: any) {
  const newTransaction = {
    id: Math.floor(1000 + Math.random() * 9000),
    ...transaction,
    createdAt: new Date().toISOString()
  };
  
  mockTransactions.push(newTransaction);
  return newTransaction;
}

// Function to get a transaction by ID
export function getMockTransaction(id: number) {
  return mockTransactions.find(t => t.id === id);
}

// Function to update a transaction
export function updateMockTransaction(id: number, transaction: any) {
  const index = mockTransactions.findIndex(t => t.id === id);
  if (index === -1) return null;
  
  mockTransactions[index] = { 
    ...mockTransactions[index], 
    ...transaction,
    updatedAt: new Date().toISOString()
  };
  
  return mockTransactions[index];
}

// Function to delete a transaction
export function deleteMockTransaction(id: number) {
  const index = mockTransactions.findIndex(t => t.id === id);
  if (index === -1) return false;
  
  mockTransactions.splice(index, 1);
  return true;
}

// Database operations
export const mockDB = {
  // Products
  getProduct: (id: number) => {
    return data.products.find(p => p.id === Number(id));
  },
  getProductByCode: (code: string) => {
    return data.products.find(p => p.code === code);
  },
  getProducts: () => data.products,
  createProduct: (product: any) => {
    const newId = Math.max(0, ...data.products.map(p => p.id)) + 1;
    const newProduct = { ...product, id: newId };
    data.products.push(newProduct);
    saveData();
    return newProduct;
  },
  updateProduct: (id: number, product: any) => {
    const index = data.products.findIndex(p => p.id === Number(id));
    if (index === -1) return null;
    
    // Merge with existing product, preserving the ID
    data.products[index] = { ...data.products[index], ...product };
    saveData();
    return data.products[index];
  },
  deleteProduct: (id: number) => {
    const index = data.products.findIndex(p => p.id === Number(id));
    if (index === -1) return false;
    
    data.products.splice(index, 1);
    saveData();
    return true;
  },
  searchProducts: (query: string) => {
    return data.products.filter(p => 
      p.name.includes(query) || 
      p.code.includes(query) || 
      (p.barcode && p.barcode.includes(query))
    );
  },
  
  // Categories
  getCategory: (id: number) => {
    return data.categories.find(c => c.id === Number(id));
  },
  getCategories: () => data.categories,
  createCategory: (category: any) => {
    const newId = Math.max(0, ...data.categories.map(c => c.id)) + 1;
    const newCategory = { ...category, id: newId };
    data.categories.push(newCategory);
    saveData();
    return newCategory;
  },
  updateCategory: (id: number, category: any) => {
    const index = data.categories.findIndex(c => c.id === Number(id));
    if (index === -1) return null;
    
    data.categories[index] = { ...data.categories[index], ...category };
    saveData();
    return data.categories[index];
  },
  deleteCategory: (id: number) => {
    const index = data.categories.findIndex(c => c.id === Number(id));
    if (index === -1) return false;
    
    data.categories.splice(index, 1);
    saveData();
    return true;
  },
  
  // Warehouses
  getWarehouse: (id: number) => {
    return data.warehouses.find(w => w.id === Number(id));
  },
  getWarehouses: () => data.warehouses,
  createWarehouse: (warehouse: any) => {
    const newId = Math.max(0, ...data.warehouses.map(w => w.id)) + 1;
    const newWarehouse = { ...warehouse, id: newId };
    data.warehouses.push(newWarehouse);
    saveData();
    return newWarehouse;
  },
  updateWarehouse: (id: number, warehouse: any) => {
    const index = data.warehouses.findIndex(w => w.id === Number(id));
    if (index === -1) return null;
    
    data.warehouses[index] = { ...data.warehouses[index], ...warehouse };
    saveData();
    return data.warehouses[index];
  },
  deleteWarehouse: (id: number) => {
    const index = data.warehouses.findIndex(w => w.id === Number(id));
    if (index === -1) return false;
    
    data.warehouses.splice(index, 1);
    saveData();
    return true;
  },
  
  // Accounts
  getAccount: (id: number) => {
    return data.accounts.find(a => a.id === Number(id));
  },
  getAccounts: (type?: string) => {
    if (type) {
      return data.accounts.filter(a => a.type === type);
    }
    return data.accounts;
  },
  createAccount: (account: any) => {
    const newId = Math.max(0, ...data.accounts.map(a => a.id)) + 1;
    const newAccount = { ...account, id: newId, currentBalance: account.openingBalance || 0 };
    data.accounts.push(newAccount);
    saveData();
    return newAccount;
  },
  updateAccount: (id: number, account: any) => {
    const index = data.accounts.findIndex(a => a.id === Number(id));
    if (index === -1) return null;
    
    data.accounts[index] = { ...data.accounts[index], ...account };
    saveData();
    return data.accounts[index];
  },
  deleteAccount: (id: number) => {
    const index = data.accounts.findIndex(a => a.id === Number(id));
    if (index === -1) return false;
    
    data.accounts.splice(index, 1);
    saveData();
    return true;
  },
  searchAccounts: (query: string, type?: string) => {
    let accounts = data.accounts;
    if (type) {
      accounts = accounts.filter(a => a.type === type);
    }
    return accounts.filter(a => a.name.includes(query));
  },
  
  // Inventory
  getInventory: (productId: number, warehouseId: number) => {
    return data.inventory.find(
      i => i.productId === Number(productId) && i.warehouseId === Number(warehouseId)
    );
  },
  listInventory: (warehouseId?: number) => {
    let inventory = data.inventory;
    
    if (warehouseId) {
      inventory = inventory.filter(i => i.warehouseId === Number(warehouseId));
    }
    
    // Enrich with product and warehouse details
    return inventory.map(inv => {
      const product = mockDB.getProduct(inv.productId);
      const warehouse = mockDB.getWarehouse(inv.warehouseId);
      
      return {
        id: inv.id,
        productId: inv.productId,
        productName: product ? product.name : 'Unknown',
        productCode: product ? product.code : 'Unknown',
        warehouseId: inv.warehouseId,
        warehouseName: warehouse ? warehouse.name : 'Unknown',
        quantity: inv.quantity,
        costPrice: product ? product.costPrice : 0,
        sellPrice: product ? product.sellPrice1 : 0,
        value: (product?.costPrice || 0) * inv.quantity
      };
    });
  },
  updateInventory: (productId: number, warehouseId: number, quantity: number, isAbsoluteValue = false, documentId?: number, documentType?: string) => {
    // Ensure numeric values
    const numericProductId = Number(productId);
    const numericWarehouseId = Number(warehouseId);
    const numericQuantity = Number(quantity);
    
    console.log(`[mockDB] Updating inventory for product ${numericProductId} in warehouse ${numericWarehouseId} with quantity ${numericQuantity} (absolute: ${isAbsoluteValue})`);
    
    // Find existing inventory item
    const item = data.inventory.find(
      i => i.productId === numericProductId && i.warehouseId === numericWarehouseId
    );
    
    if (item) {
      const oldQuantity = Number(item.quantity);
      console.log(`[mockDB] Found existing inventory item with quantity: ${oldQuantity}`);
      
      // If isAbsoluteValue is true, set the quantity directly
      // Otherwise, add the quantity to the existing value
      if (isAbsoluteValue) {
        console.log(`[mockDB] Setting absolute quantity for product ${numericProductId} from ${oldQuantity} to ${numericQuantity}`);
        // Set the quantity directly to the provided value
        item.quantity = numericQuantity;
      } else {
        const newQuantity = oldQuantity + numericQuantity;
        console.log(`[mockDB] Adjusting quantity for product ${numericProductId} by ${numericQuantity} (${oldQuantity} + ${numericQuantity} = ${newQuantity})`);
        item.quantity = newQuantity;
      }
      
      console.log(`[mockDB] Final quantity for product ${numericProductId}: ${item.quantity}`);
      saveData();
      
      // Create an inventory transaction record if documentation is provided
      if (documentId && documentType) {
        const transactionType = numericQuantity > 0 ? 'purchase' : 'sale';
        createMockInventoryTransaction({
          productId: numericProductId,
          warehouseId: numericWarehouseId,
          quantity: Math.abs(numericQuantity),
          type: transactionType,
          documentId: documentId,
          documentType: documentType,
          date: new Date().toISOString()
        });
      }
      
      return item;
    } else {
      console.log(`[mockDB] No existing inventory record found for productId=${numericProductId}, warehouseId=${numericWarehouseId}`);
      
      const newId = Math.max(0, ...data.inventory.map(i => i.id)) + 1;
      const newItem = { 
        id: newId, 
        productId: numericProductId, 
        warehouseId: numericWarehouseId, 
        quantity: numericQuantity 
      };
      
      console.log(`[mockDB] Creating new inventory entry with quantity ${numericQuantity}`);
      data.inventory.push(newItem);
      saveData();
      
      // Create an inventory transaction record if documentation is provided
      if (documentId && documentType) {
        const transactionType = numericQuantity > 0 ? 'purchase' : 'sale';
        createMockInventoryTransaction({
          productId: numericProductId,
          warehouseId: numericWarehouseId,
          quantity: Math.abs(numericQuantity),
          type: transactionType,
          documentId: documentId,
          documentType: documentType,
          date: new Date().toISOString()
        });
      }
      
      return newItem;
    }
  },
  
  // Add a createInventoryTransaction method that doesn't modify inventory quantities
  createInventoryTransaction: (transaction: any) => {
    // We don't actually need to store these transactions in the mock implementation
    // But we can log them for debugging
    console.log(`[mockDB] Creating inventory transaction: ${transaction.type}, Product ID: ${transaction.productId}, Quantity: ${transaction.quantity}`);
    return transaction;
  },
  
  // Transaction handling
  createTransaction: createMockTransaction,
  getTransaction: getMockTransaction,
  updateTransaction: updateMockTransaction,
  deleteTransaction: deleteMockTransaction,
  listTransactions: (accountId?: number) => {
    if (!accountId) return mockTransactions;
    return mockTransactions.filter(t => t.accountId === accountId);
  },

  // Invoice methods
  getInvoice: (id: number) => {
    const invoice = mockInvoices.find(i => i.id === id);
    if (!invoice) return undefined;

    const details = mockDB.getInvoiceDetails(id);
    return { invoice, details };
  },

  getInvoiceDetails: (invoiceId: number) => {
    // Return empty array if no details exist
    return mockInvoiceDetails.filter(d => d.invoiceId === invoiceId);
  }
};

// Initialize mockData with default data
function initMockData() {
  if (fs.existsSync(dataFilePath)) {
    try {
      const fileContent = fs.readFileSync(dataFilePath, 'utf8');
      data = JSON.parse(fileContent);
      console.log('[mockDB] Loaded data from file:', dataFilePath);
      
      // Ensure we have all required properties
      data.products = data.products || [];
      data.categories = data.categories || [];
      data.warehouses = data.warehouses || [];
      data.accounts = data.accounts || [];
      data.inventory = data.inventory || [];
      
      // Now that we've ensured data.accounts exists, call ensureAccountingAccounts
      ensureAccountingAccounts();
      
      return;
    } catch (error) {
      console.error('[mockDB] Error loading data from file:', error);
    }
  }
  
  // For new or failed loads, initialize with default data
  data = { ...initialData };
  // Ensure accounting accounts
  ensureAccountingAccounts();
  
  // Save initial data to file
  saveData();
  console.log('[mockDB] Created new data file:', dataFilePath);
}

// Call initMockData at startup
initMockData(); 