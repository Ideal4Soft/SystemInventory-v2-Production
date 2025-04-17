import { 
  Account, InsertAccount, 
  Product, InsertProduct, 
  Category, InsertCategory,
  Warehouse, InsertWarehouse,
  Inventory, InsertInventory,
  Transaction, InsertTransaction,
  InventoryTransaction, InsertInventoryTransaction,
  Invoice, InsertInvoice, InvoiceDetail, InsertInvoiceDetail,
  Purchase, InsertPurchase, PurchaseDetail, InsertPurchaseDetail,
  User, InsertUser, 
  Settings, InsertSettings,
  accounts, products, categories, warehouses, inventory, 
  transactions, inventoryTransactions, invoices, invoiceDetails,
  purchases, purchaseDetails, users, settings
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, like, desc, gte, lte, SQL, sql, count, not, lt, or, isNull } from "drizzle-orm";

// interface defining all operations for our storage
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  listUsers(): Promise<User[]>;
  
  // Accounts
  createAccount(account: InsertAccount): Promise<Account>;
  getAccount(id: number): Promise<Account | undefined>;
  listAccounts(type?: string, showNonZeroOnly?: boolean, showActiveOnly?: boolean): Promise<Account[]>;
  updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account | undefined>;
  deleteAccount(id: number): Promise<boolean>;
  searchAccounts(query: string, type?: string): Promise<Account[]>;
  getAccountStatement(accountId: number, startDate?: Date, endDate?: Date): Promise<any>;
  getAccountLastTransactions(accountId: number): Promise<any>;

  // Categories
  createCategory(category: InsertCategory): Promise<Category>;
  getCategory(id: number): Promise<Category | undefined>;
  listCategories(): Promise<Category[]>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  countCategories(): Promise<number>;

  // Products
  createProduct(product: InsertProduct): Promise<Product>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductByCode(code: string): Promise<Product | undefined>;
  listProducts(): Promise<Product[]>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  searchProducts(query: string): Promise<Product[]>;
  countProducts(): Promise<number>;

  // Warehouses
  createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse>;
  getWarehouse(id: number): Promise<Warehouse | undefined>;
  listWarehouses(): Promise<Warehouse[]>;
  updateWarehouse(id: number, warehouse: Partial<InsertWarehouse>): Promise<Warehouse | undefined>;
  deleteWarehouse(id: number): Promise<boolean>;

  // Inventory
  getInventory(productId: number, warehouseId: number): Promise<Inventory | undefined>;
  listInventory(warehouseId?: number): Promise<any[]>;
  updateInventory(productId: number, warehouseId: number, quantity: number, isAbsoluteValue?: boolean): Promise<Inventory>;
  
  // Transactions
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  listTransactions(accountId?: number, startDate?: Date, endDate?: Date): Promise<Transaction[]>;
  deleteTransaction(id: number): Promise<boolean>;

  // Inventory Transactions
  createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction>;
  listInventoryTransactions(productId?: number, warehouseId?: number): Promise<InventoryTransaction[]>;
  
  // Invoices
  createInvoice(invoice: InsertInvoice, details: InsertInvoiceDetail[]): Promise<Invoice>;
  getInvoice(id: number): Promise<{invoice: Invoice, details: InvoiceDetail[]} | undefined>;
  listInvoices(accountId?: number, startDate?: Date, endDate?: Date): Promise<Invoice[]>;
  updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;

  // Purchases
  createPurchase(purchase: InsertPurchase, details: InsertPurchaseDetail[]): Promise<Purchase>;
  getPurchase(id: number): Promise<{purchase: Purchase, details: PurchaseDetail[]} | undefined>;
  listPurchases(accountId?: number, startDate?: Date, endDate?: Date): Promise<Purchase[]>;
  updatePurchaseStatus(id: number, status: string): Promise<Purchase | undefined>;
  deletePurchase(id: number): Promise<boolean>;

  // Settings
  getSettings(): Promise<Settings | undefined>;
  updateSettings(settings: Partial<InsertSettings>): Promise<Settings>;

  // New method
  updateInvoice(id: number, invoice: Partial<InsertInvoice>, details?: any[]): Promise<Invoice | undefined>;
}

// Define the statement item type
interface StatementItem {
  date: Date;
  type: string;
  isDebit: boolean;
  reference: string;
  description: string;
  amount: number;
  balance: number;
  documentType: string;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async listUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Accounts
  async createAccount(account: InsertAccount): Promise<Account> {
    const [newAccount] = await db
      .insert(accounts)
      .values({ ...account, currentBalance: account.openingBalance || 0 })
      .returning();
    return newAccount;
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account;
  }

  async listAccounts(type?: string, showNonZeroOnly?: boolean, showActiveOnly?: boolean): Promise<Account[]> {
    let query = db.select().from(accounts);
    
    const conditions = [];
    const useNonZeroFilter = showNonZeroOnly === true; // استخدم القيمة الافتراضية (false) إذا كانت undefined
    const useActiveFilter = showActiveOnly === true; // استخدم القيمة الافتراضية (false) إذا كانت undefined
    
    if (type) {
      conditions.push(eq(accounts.type, type));
    }
    
    if (useNonZeroFilter) {
      conditions.push(sql`ABS(${accounts.currentBalance}) > 0`);
    }
    
    if (useActiveFilter) {
      // We need to handle accounts without isActive field (null/undefined) as active
      conditions.push(sql`(${accounts.isActive} = true OR ${accounts.isActive} IS NULL)`);
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const accountList = await query.orderBy(accounts.name);

    // For each account, recalculate the balance dynamically
    for (const account of accountList) {
      // Get all transactions for this account
      const transactionsList = await db
        .select()
        .from(transactions)
        .where(eq(transactions.accountId, account.id));
      let balance = account.openingBalance || 0;
      for (const transaction of transactionsList) {
        if (account.type === 'customer') {
          if (transaction.documentType === 'invoice' || transaction.type === 'debit') {
            balance += transaction.amount;
          } else if (transaction.type === 'credit') {
            balance -= transaction.amount;
          }
        } else if (account.type === 'supplier') {
          if (transaction.documentType === 'purchase' || transaction.type === 'credit') {
            balance += transaction.amount;
          } else if (transaction.type === 'debit') {
            balance -= transaction.amount;
          }
        }
      }
      account.currentBalance = balance;
    }
    
    // طباعة الحسابات مع أرصدتها المحسوبة ديناميكياً للتأكد من صحة الحساب
    console.log("Accounts sent to frontend with dynamically calculated balances:", 
      accountList.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        currentBalance: a.currentBalance
      }))
    );
    
    return accountList;
  }

  async updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account | undefined> {
    const [updatedAccount] = await db
      .update(accounts)
      .set({ ...account, updatedAt: new Date() })
      .where(eq(accounts.id, id))
      .returning();
    return updatedAccount;
  }

  async deleteAccount(id: number): Promise<boolean> {
    try {
      await db.delete(accounts).where(eq(accounts.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      return false;
    }
  }

  async searchAccounts(query: string, type?: string): Promise<Account[]> {
    if (type) {
      return await db
        .select()
        .from(accounts)
        .where(and(
          like(accounts.name, `%${query}%`),
          eq(accounts.type, type)
        ))
        .orderBy(accounts.name);
    }
    return await db
      .select()
      .from(accounts)
      .where(like(accounts.name, `%${query}%`))
      .orderBy(accounts.name);
  }

  async getAccountStatement(accountId: number, startDate?: Date, endDate?: Date): Promise<any> {
    try {
      // Get the account details
      const account = await this.getAccount(accountId);
      if (!account) {
        throw new Error("Account not found");
      }

      // Initialize arrays for conditions
      const conditions = [eq(transactions.accountId, accountId)];
      const invoiceConditions = [
        eq(invoices.accountId, accountId),
        eq(invoices.status, 'posted')
      ];

      // Add date conditions if provided
      if (startDate) {
        conditions.push(gte(transactions.date, startDate));
        invoiceConditions.push(gte(invoices.date, startDate));
      }
      if (endDate) {
        conditions.push(lte(transactions.date, endDate));
        invoiceConditions.push(lte(invoices.date, endDate));
      }

      // Add type-specific conditions
      if (account.type === 'customer') {
        // For customers: Only show sales invoices and their payments
        // Purchase invoice transactions should never appear in customer accounts
        conditions.push(
          sql`(
            (${transactions.documentType} = 'invoice' AND ${transactions.reference} NOT LIKE 'PUR-%') OR
            ${transactions.type} = 'credit'
          )`
        );
        // Only include sales invoices for customers (not purchase invoices)
        invoiceConditions.push(sql`${invoices.invoiceNumber} NOT LIKE 'PUR-%'`);
      } else if (account.type === 'supplier') {
        // For suppliers: Only show purchase invoices and their payments
        // Sales invoice transactions should never appear in supplier accounts
        conditions.push(
          sql`(
            (${transactions.documentType} = 'purchase' AND ${transactions.reference} LIKE 'PUR-%') OR
            ${transactions.type} = 'debit'
          )`
        );
        // Only include purchase invoices for suppliers
        invoiceConditions.push(sql`${invoices.invoiceNumber} LIKE 'PUR-%'`);
      }

      // Get transactions
      const accountTransactions = await db
        .select()
        .from(transactions)
        .where(and(...conditions))
        .orderBy(transactions.date);

      // Get invoices - but only if this is a customer or supplier account
      let accountInvoices: any[] = [];
      if (account.type === 'customer' || account.type === 'supplier') {
        accountInvoices = await db
          .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            date: invoices.date,
            dueDate: invoices.dueDate,
            accountId: invoices.accountId,
            total: invoices.total,
            status: invoices.status
          })
          .from(invoices)
          .where(and(...invoiceConditions))
          .orderBy(invoices.date);
      }

      // Calculate starting balance
      let startingBalance = account.openingBalance || 0;
      if (startDate) {
        const prevConditions = [
          eq(transactions.accountId, accountId),
          lt(transactions.date, startDate)
        ];

        // Add same type-specific conditions for previous transactions
        if (account.type === 'customer') {
          prevConditions.push(
            sql`(
              (${transactions.documentType} = 'invoice' AND ${transactions.reference} NOT LIKE 'PUR-%') OR
              ${transactions.type} = 'credit'
            )`
          );
        } else if (account.type === 'supplier') {
          prevConditions.push(
            sql`(
              (${transactions.documentType} = 'purchase' AND ${transactions.reference} LIKE 'PUR-%') OR
              ${transactions.type} = 'debit'
            )`
          );
        }

        const previousTransactions = await db
          .select()
          .from(transactions)
          .where(and(...prevConditions));

        // Calculate starting balance based on previous transactions
        for (const transaction of previousTransactions) {
          if (account.type === 'customer') {
            // For customers:
            // - Invoices (debit) increase the balance
            // - Payments (credit) decrease the balance
            if (transaction.type === 'debit' || transaction.documentType === 'invoice') {
              startingBalance += transaction.amount;
            } else if (transaction.type === 'credit') {
              startingBalance -= transaction.amount;
            }
          } else if (account.type === 'supplier') {
            // For suppliers:
            // - Purchases (credit) increase the balance
            // - Payments (debit) decrease the balance
            if (transaction.type === 'credit' || transaction.documentType === 'purchase') {
              startingBalance += transaction.amount;
            } else if (transaction.type === 'debit') {
              startingBalance -= transaction.amount;
            }
          }
        }
      }

      // Combine and format transactions for the statement
      let statementItems: StatementItem[] = [];
      let runningBalance = startingBalance;

      // Helper function to get transaction type display text
      const getTransactionTypeDisplay = (transaction: any) => {
        if (account.type === 'customer') {
          if (transaction.documentType === 'invoice') return 'مبيعات';
          if (transaction.type === 'credit') return 'قبض';
          return transaction.type;
        } else if (account.type === 'supplier') {
          if (transaction.documentType === 'purchase') return 'مشتريات';
          if (transaction.type === 'debit') return 'دفع';
          return transaction.type;
        }
        return transaction.type;
      };

      // Add transactions
      for (const transaction of accountTransactions) {
        if (account.type === 'customer') {
          // For customers:
          // - Invoices (debit) increase the balance
          // - Payments (credit) decrease the balance
          if (transaction.type === 'debit' || transaction.documentType === 'invoice') {
            runningBalance += transaction.amount;
          } else if (transaction.type === 'credit') {
            runningBalance -= transaction.amount;
          }
        } else if (account.type === 'supplier') {
          // For suppliers:
          // - Purchases (credit) increase the balance
          // - Payments (debit) decrease the balance
          if (transaction.type === 'credit' || transaction.documentType === 'purchase') {
            runningBalance += transaction.amount;
          } else if (transaction.type === 'debit') {
            runningBalance -= transaction.amount;
          }
        }

        statementItems.push({
          date: transaction.date,
          type: getTransactionTypeDisplay(transaction),
          isDebit: transaction.type === 'debit' || transaction.documentType === 'invoice',
          reference: transaction.reference || '',
          description: transaction.notes || '',
          amount: transaction.amount,
          balance: runningBalance,
          documentType: transaction.documentType || ''
        });
      }

      // Add invoices that don't have corresponding transactions
      for (const invoice of accountInvoices) {
        const existingTransaction = accountTransactions.find(t => 
          t.reference === invoice.invoiceNumber
        );

        if (!existingTransaction) {
          const isPurchase = invoice.invoiceNumber.startsWith('PUR-');
          
          // Only add the invoice if it's appropriate for this account type
          if ((account.type === 'customer' && !isPurchase) || 
              (account.type === 'supplier' && isPurchase)) {
            
            runningBalance += invoice.total;
            
            statementItems.push({
              date: invoice.date,
              type: isPurchase ? 'مشتريات' : 'مبيعات',
              isDebit: !isPurchase, // Sales invoices are debit, purchase invoices are credit
              reference: invoice.invoiceNumber,
              description: isPurchase ? 'فاتورة مشتريات' : 'فاتورة مبيعات',
              amount: invoice.total,
              balance: runningBalance,
              documentType: isPurchase ? 'purchase' : 'invoice'
            });
          }
        }
      }

      // Sort by date
      statementItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate totals
      let totalDebits = 0;
      let totalCredits = 0;

      for (const item of statementItems) {
        if (item.isDebit) {
          totalDebits += item.amount;
        } else {
          totalCredits += item.amount;
        }
      }

      return {
        account: {
          id: account.id,
          name: account.name,
          type: account.type,
          code: account.code,
          email: account.email,
          phone: account.phone
        },
        startingBalance,
        endingBalance: runningBalance,
        totalDebits,
        totalCredits,
        netChange: totalDebits - totalCredits,
        transactions: statementItems,
        periodStart: startDate ? startDate.toISOString() : null,
        periodEnd: endDate ? endDate.toISOString() : null,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error generating account statement:", error);
      throw error;
    }
  }

  // New method to get last transaction and last invoice for an account
  async getAccountLastTransactions(accountId: number): Promise<any> {
    try {
      // Get the account details
      const account = await this.getAccount(accountId);
      if (!account) {
        throw new Error("Account not found");
      }

      // Get the most recent transaction
      const latestTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.accountId, accountId))
        .orderBy(desc(transactions.date))
        .limit(1);

      // Get the most recent invoice
      const invoiceConditions = [
        eq(invoices.accountId, accountId),
        eq(invoices.status, 'posted')
      ];

      // Add type-specific conditions
      if (account.type === 'customer') {
        // For customers: Only sales invoices
        invoiceConditions.push(sql`${invoices.invoiceNumber} NOT LIKE 'PUR-%'`);
      } else if (account.type === 'supplier') {
        // For suppliers: Only purchase invoices
        invoiceConditions.push(sql`${invoices.invoiceNumber} LIKE 'PUR-%'`);
      }

      const latestInvoices = await db
        .select()
        .from(invoices)
        .where(and(...invoiceConditions))
        .orderBy(desc(invoices.date))
        .limit(1);

      return {
        lastTransaction: latestTransactions.length > 0 ? latestTransactions[0] : null,
        lastInvoice: latestInvoices.length > 0 ? latestInvoices[0] : null
      };
    } catch (error) {
      console.error("Error getting account last transactions:", error);
      throw error;
    }
  }

  // Categories
  async createCategory(category: InsertCategory): Promise<Category> {
    // If this category is set as default, unset any existing default categories
    if (category.isDefault) {
      await db.update(categories)
        .set({ isDefault: false })
        .where(eq(categories.isDefault, true));
    }
    
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async listCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    // If this category is being set as default, unset any existing default categories
    if (category.isDefault) {
      await db.update(categories)
        .set({ isDefault: false })
        .where(eq(categories.isDefault, true));
    }
    
    const [updatedCategory] = await db
      .update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    try {
      await db.delete(categories).where(eq(categories.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  }

  // Products
  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductByCode(code: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.code, code));
    return product;
  }

  async listProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(products.name);
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    try {
      // First check if this product is used in any invoice or purchase
      const [invoiceCheck] = await db.select({ count: sql`count(*)` })
        .from(invoiceDetails)
        .where(eq(invoiceDetails.productId, id));
      
      if (invoiceCheck.count > 0) {
        console.error(`Cannot delete product ${id}: Referenced in invoice_details`);
        return false;
      }
      
      const [purchaseCheck] = await db.select({ count: sql`count(*)` })
        .from(purchaseDetails)
        .where(eq(purchaseDetails.productId, id));
      
      if (purchaseCheck.count > 0) {
        console.error(`Cannot delete product ${id}: Referenced in purchase_details`);
        return false;
      }

      // Use a transaction to delete all related records and the product
      await db.transaction(async (tx) => {
        // First delete any related inventory records
        await tx.delete(inventory).where(eq(inventory.productId, id));
        
        // Then delete the related inventory transactions
        await tx.delete(inventoryTransactions).where(eq(inventoryTransactions.productId, id));
        
        // Finally delete the product
        await tx.delete(products).where(eq(products.id, id));
      });
      
      // Return success if no errors
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      return false;
    }
  }

  async searchProducts(query: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        or(
          like(products.name, `%${query}%`),
          like(products.code, `%${query}%`),
          like(products.barcode, `%${query}%`)
        )
      )
      .orderBy(products.name);
  }

  // Warehouses
  async createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse> {
    const [newWarehouse] = await db.insert(warehouses).values(warehouse).returning();
    return newWarehouse;
  }

  async getWarehouse(id: number): Promise<Warehouse | undefined> {
    const [warehouse] = await db.select().from(warehouses).where(eq(warehouses.id, id));
    return warehouse;
  }

  async listWarehouses(): Promise<Warehouse[]> {
    return await db.select().from(warehouses).orderBy(warehouses.name);
  }

  async updateWarehouse(id: number, warehouse: Partial<InsertWarehouse>): Promise<Warehouse | undefined> {
    const [updatedWarehouse] = await db
      .update(warehouses)
      .set({ ...warehouse, updatedAt: new Date() })
      .where(eq(warehouses.id, id))
      .returning();
    return updatedWarehouse;
  }

  async deleteWarehouse(id: number): Promise<boolean> {
    try {
      await db.delete(warehouses).where(eq(warehouses.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      return false;
    }
  }

  // Inventory
  async getInventory(productId: number, warehouseId: number): Promise<Inventory | undefined> {
    const [inv] = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.productId, productId),
          eq(inventory.warehouseId, warehouseId)
        )
      );
    return inv;
  }

  async listInventory(warehouseId?: number): Promise<any[]> {
    let query = db
      .select({
        id: inventory.id,
        productId: products.id,
        productName: products.name,
        productCode: products.code,
        warehouseId: warehouses.id,
        warehouseName: warehouses.name,
        quantity: inventory.quantity,
        costPrice: products.costPrice,
        sellPrice: products.sellPrice1,
        value: sql`${inventory.quantity} * ${products.costPrice}`,
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .innerJoin(warehouses, eq(inventory.warehouseId, warehouses.id));
    
    if (warehouseId) {
      query = query.where(eq(inventory.warehouseId, warehouseId));
    }
    
    return await query;
  }

  async updateInventory(productId: number, warehouseId: number, quantity: number, isAbsoluteValue?: boolean): Promise<Inventory> {
    const existingInventory = await this.getInventory(productId, warehouseId);
    const useAbsoluteValue = isAbsoluteValue === true; // Default to false if undefined
    
    if (existingInventory) {
      // Update existing inventory
      let newQuantity: number;
      
      if (useAbsoluteValue) {
        // For count operations, set the quantity directly
        newQuantity = quantity;
      } else {
        // For adjustments, add/subtract from existing quantity
        newQuantity = (existingInventory.quantity || 0) + quantity;
      }
      
      const [updatedInventory] = await db
        .update(inventory)
        .set({ 
          quantity: newQuantity, 
          updatedAt: new Date() 
        })
        .where(
          and(
            eq(inventory.productId, productId),
            eq(inventory.warehouseId, warehouseId)
          )
        )
        .returning();
      
      // Add transaction record
      await this.createInventoryTransaction({
        productId,
        warehouseId,
        quantity: useAbsoluteValue ? quantity - (existingInventory.quantity || 0) : quantity,
        type: 'adjustment',
        date: new Date(),
        notes: useAbsoluteValue ? 'Quantity count adjustment' : (quantity > 0 ? 'Addition' : 'Reduction')
      });
      
      return updatedInventory;
    } else {
      // Create new inventory record
      const [newInventory] = await db
        .insert(inventory)
        .values({
          productId,
          warehouseId,
          quantity,
        })
        .returning();
      
      // Add transaction record
      await this.createInventoryTransaction({
        productId,
        warehouseId,
        quantity,
        type: 'adjustment',
        date: new Date(),
        notes: useAbsoluteValue ? 'Initial count' : 'Initial stock'
      });
      
      return newInventory;
    }
  }

  // Transactions
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    // Get the account first to determine its type
    const account = await this.getAccount(transaction.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    console.log(`Creating transaction for ${account.type} account ${account.id} (${account.name})`);
    console.log(`Transaction type: ${transaction.type}, amount: ${transaction.amount}`);
    console.log(`Current balance: ${account.currentBalance}`);

    // Calculate the balance change based on account type and transaction type
    let balanceChange = 0;
    
    if (account.type === 'customer') {
      // For customers:
      // - Sales invoices and debits increase the balance (customer owes us more)
      // - Payments (credits) decrease the balance (customer paid us)
      if (transaction.type === 'debit' || transaction.documentType === 'invoice') {
        balanceChange = transaction.amount;
      } else if (transaction.type === 'credit') {
        balanceChange = -transaction.amount;
      }
    } else if (account.type === 'supplier') {
      // For suppliers:
      // - Purchase invoices and credits increase the balance (we owe supplier more)
      // - Payments (debits) decrease the balance (we paid supplier)
      if (transaction.type === 'credit' || transaction.documentType === 'purchase') {
        balanceChange = transaction.amount;
      } else if (transaction.type === 'debit') {
        balanceChange = -transaction.amount;
      }
    }

    const newBalance = (account.currentBalance || 0) + balanceChange;
    console.log(`Balance change: ${balanceChange}, New balance will be: ${newBalance}`);

    // Create the transaction first
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    
    // Then update the account balance
    await db
      .update(accounts)
      .set({ 
        currentBalance: newBalance,
        updatedAt: new Date()
      })
      .where(eq(accounts.id, transaction.accountId));
    
    console.log(`Updated ${account.type} account ${account.id} balance to ${newBalance}`);
    
    return newTransaction;
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction;
  }

  async listTransactions(accountId?: number, startDate?: Date, endDate?: Date): Promise<Transaction[]> {
    let query = db.select().from(transactions);
    
    const conditions: SQL[] = [];
    
    if (accountId) {
      conditions.push(eq(transactions.accountId, accountId));
    }
    
    if (startDate) {
      conditions.push(gte(transactions.date, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(transactions.date, endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(transactions.date));
  }

  async deleteTransaction(id: number): Promise<boolean> {
    try {
      const transaction = await this.getTransaction(id);
      if (transaction) {
        await db.delete(transactions).where(eq(transactions.id, id));
        // Update account balance after deletion
        await this.updateAccountBalance(transaction.accountId);
      }
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
  }

  // Inventory Transactions
  async createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction> {
    const [newTransaction] = await db.insert(inventoryTransactions).values(transaction).returning();
    
    // Update inventory
    let quantity = transaction.quantity;
    if (['sale', 'transfer_out'].includes(transaction.type)) {
      quantity = -quantity; // Decrease inventory for sales and transfers out
    }
    
    await this.updateInventory(
      transaction.productId,
      transaction.warehouseId,
      quantity
    );
    
    // For transfers, update the destination warehouse
    if (transaction.type === 'transfer' && transaction.notes) {
      try {
        const destinationWarehouseId = parseInt(transaction.notes);
        if (!isNaN(destinationWarehouseId)) {
          await this.updateInventory(
            transaction.productId,
            destinationWarehouseId,
            transaction.quantity
          );
        }
      } catch (error) {
        console.error('Error processing transfer:', error);
      }
    }
    
    return newTransaction;
  }

  async listInventoryTransactions(productId?: number, warehouseId?: number): Promise<InventoryTransaction[]> {
    let query = db.select().from(inventoryTransactions);
    
    const conditions: SQL[] = [];
    
    if (productId) {
      conditions.push(eq(inventoryTransactions.productId, productId));
    }
    
    if (warehouseId) {
      conditions.push(eq(inventoryTransactions.warehouseId, warehouseId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(inventoryTransactions.date));
  }

  // Add helper method to get next invoice number
  private async getNextInvoiceNumber(isPurchase: boolean): Promise<string> {
    try {
      // Get the last invoice number based on type
      const lastInvoice = await db
        .select({ invoiceNumber: invoices.invoiceNumber })
        .from(invoices)
        .where(
          isPurchase 
            ? sql`${invoices.invoiceNumber} LIKE 'PUR-%'`
            : sql`${invoices.invoiceNumber} NOT LIKE 'PUR-%'`
        )
        .orderBy(desc(invoices.id))
        .limit(1);

      if (lastInvoice.length === 0) {
        // No existing invoices, start with 1
        return isPurchase ? 'PUR-1' : 'INV-1';
      }

      const lastNumber = lastInvoice[0].invoiceNumber;
      const numStr = lastNumber.split('-')[1];
      const nextNum = parseInt(numStr) + 1;
      
      return isPurchase ? `PUR-${nextNum}` : `INV-${nextNum}`;
    } catch (error) {
      console.error('Error getting next invoice number:', error);
      throw error;
    }
  }

  // Modify createInvoice method
  async createInvoice(invoice: InsertInvoice, details: InsertInvoiceDetail[]): Promise<Invoice> {
    const isPurchase = invoice.invoiceNumber?.startsWith('PUR-');
    
    // If no invoice number provided, generate the next number
    if (!invoice.invoiceNumber) {
      invoice.invoiceNumber = await this.getNextInvoiceNumber(isPurchase);
    }

    const { status } = invoice;
    
    return await db.transaction(async (tx: any) => {
      try {
        // Calculate totals
        let subtotal = 0;
        details.forEach(detail => {
          subtotal += detail.quantity * detail.unitPrice;
        });
        
        const discount = invoice.discount || 0;
        const tax = invoice.tax || 0;
        const total = subtotal - discount + tax;
        
        // Log invoice details when status is 'posted'
        if (status === 'posted') {
          console.log(`Creating POSTED ${isPurchase ? 'purchase' : 'sales'} invoice: ${invoice.invoiceNumber}`);
          console.log(`Account ID: ${invoice.accountId}, Total: ${total}`);

          // Validate required fields for posted invoices
          if (!invoice.accountId) {
            throw new Error(`Account ID is required for posted ${isPurchase ? 'purchase' : 'sales'} invoices`);
          }

          if (!invoice.warehouseId) {
            throw new Error(`Warehouse ID is required for posted ${isPurchase ? 'purchase' : 'sales'} invoices`);
          }

          // Get the account to check its type and current balance
          const account = await this.getAccount(invoice.accountId);
          if (!account) {
            throw new Error(`Account with ID ${invoice.accountId} not found`);
          }

          console.log(`Account type: ${account.type}, Current balance: ${account.currentBalance}`);
        }
        
        // Create the invoice
        const [newInvoice] = await tx
          .insert(invoices)
          .values({
            ...invoice,
            subtotal,
            discount,
            tax,
            total,
          })
          .returning();
          
        console.log(`Created invoice with ID: ${newInvoice.id}`);

        // Create the invoice details
        for (const detail of details) {
          await tx
            .insert(invoiceDetails)
            .values({
              ...detail,
              invoiceId: newInvoice.id,
            });
        }
        
        // Process inventory updates for posted invoices
        if (status === 'posted' && invoice.warehouseId) {
          console.log(`Processing inventory updates for ${isPurchase ? 'purchase' : 'sales'} invoice`);
          
          // Process each item in the invoice
          for (const detail of details) {
            try {
              const productId = detail.productId;
              const warehouseId = invoice.warehouseId;
              const quantity = detail.quantity;
              
              // Validate product existence
              const [product] = await tx
                .select()
                .from(products)
                .where(eq(products.id, productId));
              
              if (!product) {
                throw new Error(`Product with ID ${productId} not found`);
              }
              
              // For sales invoices, decrease inventory
              // For purchase invoices, increase inventory
              let quantityChange = isPurchase ? quantity : -quantity;
              
              console.log(`Creating inventory transaction: ${isPurchase ? 'purchase' : 'sale'} of ${Math.abs(quantityChange)} units of product ${product.name} (ID: ${productId})`);
              
              // Create inventory transaction
              await tx.insert(inventoryTransactions).values({
                productId,
                warehouseId,
                quantity: Math.abs(quantity), // Always positive in the transaction record
                type: isPurchase ? 'purchase' : 'sale',
                documentId: newInvoice.id,
                documentType: 'invoice',
                date: new Date(),
                notes: `${isPurchase ? 'Purchase' : 'Sales'} Invoice #${newInvoice.invoiceNumber}`,
                userId: invoice.userId
              });
              
              // Update inventory
              const existingInventory = await this.getInventory(productId, warehouseId);
              
              if (existingInventory) {
                // Update existing inventory record
                const currentQuantity = existingInventory.quantity || 0;
                const newQuantity = currentQuantity + quantityChange;
                
                console.log(`Updating inventory for product ${productId}: ${currentQuantity} ${quantityChange >= 0 ? '+' : '-'} ${Math.abs(quantityChange)} = ${newQuantity}`);
                
                // For sales invoices, ensure we have enough stock
                if (!isPurchase && currentQuantity < quantity) {
                  throw new Error(`Not enough stock for product ${product.name}. Available: ${currentQuantity}, Required: ${quantity}`);
                }
                
                await tx
                  .update(inventory)
                  .set({ 
                    quantity: newQuantity, 
                    updatedAt: new Date() 
                  })
                  .where(
                    and(
                      eq(inventory.productId, productId),
                      eq(inventory.warehouseId, warehouseId)
                    )
                  );
              } else {
                // For sales invoices, we can't sell what we don't have
                if (!isPurchase) {
                  throw new Error(`No inventory record found for product ${product.name} in the selected warehouse. Cannot sell items that are not in stock.`);
                }
                
                // Create new inventory record for purchases
                console.log(`Creating new inventory record for product ${productId} with quantity ${quantity}`);
                
                await tx
                  .insert(inventory)
                  .values({
                    productId,
                    warehouseId,
                    quantity: quantityChange,
                  });
              }
            } catch (error) {
              console.error(`Error updating inventory for product ${detail.productId}:`, error);
              throw new Error(`Failed to update inventory for product ${detail.productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
        
        // If invoice is posted, create transaction and update balances
        if (status === 'posted' && invoice.accountId) {
          const account = await this.getAccount(invoice.accountId);
          if (!account) {
            throw new Error(`Account with ID ${invoice.accountId} not found`);
          }

          // For sales invoices to customers: Create a debit transaction (increases their balance)
          // For purchase invoices from suppliers: Create a credit transaction (increases their balance)
          const transactionType = isPurchase ? 'credit' : 'debit';
          
          console.log(`Creating ${transactionType} transaction for ${total}`);
          
          // Create the transaction
          await tx.insert(transactions).values({
            accountId: invoice.accountId,
            amount: total,
            type: transactionType,
            reference: newInvoice.invoiceNumber,
            date: invoice.date || new Date(),
            documentId: newInvoice.id,
            documentType: isPurchase ? 'purchase' : 'invoice',
            userId: invoice.userId,
            notes: `${isPurchase ? 'Purchase' : 'Sales'} Invoice #${newInvoice.invoiceNumber}`
          });

          // Calculate new balance
          const currentBalance = account.currentBalance || 0;
          let newBalance: number;

          if (account.type === 'customer') {
            // For customers: sales invoices increase their balance
            newBalance = currentBalance + total;
          } else if (account.type === 'supplier') {
            // For suppliers: purchase invoices increase their balance
            newBalance = currentBalance + total;
          } else {
            newBalance = currentBalance;
          }

          console.log(`Updating account balance: ${currentBalance} -> ${newBalance}`);

          // Update account balance
          await tx
            .update(accounts)
            .set({ 
              currentBalance: newBalance,
              updatedAt: new Date()
            })
            .where(eq(accounts.id, invoice.accountId));
        }
        
        return newInvoice;
      } catch (error) {
        console.error("Error in createInvoice:", error);
        throw error;
      }
    });
  }

  async getInvoice(id: number): Promise<{invoice: Invoice, details: InvoiceDetail[]} | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) {
      return undefined;
    }
    
    const details = await db
      .select()
      .from(invoiceDetails)
      .where(eq(invoiceDetails.invoiceId, id));
    
    return { invoice, details };
  }

  async listInvoices(accountId?: number, startDate?: Date, endDate?: Date): Promise<Invoice[]> {
    let query = db.select().from(invoices);
    
    const conditions: SQL[] = [];
    
    if (accountId) {
      conditions.push(eq(invoices.accountId, accountId));
    }
    
    if (startDate) {
      conditions.push(gte(invoices.date, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(invoices.date, endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(invoices.date));
  }

  async listInvoicesWithDetails(accountId?: number, startDate?: Date, endDate?: Date): Promise<any[]> {
    // First get all invoices
    let invoicesQuery = db.select().from(invoices);
    
    const conditions: SQL[] = [];
    
    if (accountId) {
      conditions.push(eq(invoices.accountId, accountId));
    }
    
    if (startDate) {
      conditions.push(gte(invoices.date, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(invoices.date, endDate));
    }
    
    if (conditions.length > 0) {
      invoicesQuery = invoicesQuery.where(and(...conditions));
    }
    
    const allInvoices = await invoicesQuery.orderBy(desc(invoices.date));
    
    // Then get details for all invoices
    const allDetails = await db
      .select()
      .from(invoiceDetails)
      .where(inArray(invoiceDetails.invoiceId, allInvoices.map(inv => inv.id)));
    
    // Combine invoices with their details
    return allInvoices.map(invoice => ({
      ...invoice,
      details: allDetails.filter(detail => detail.invoiceId === invoice.id)
    }));
  }

  async updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(invoices.id, id))
      .returning();
    
    return updatedInvoice;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    return await db.transaction(async (tx: any) => {
      try {
        // Get invoice to update account balance
        const [invoice] = await tx
          .select()
          .from(invoices)
          .where(eq(invoices.id, id));
        
        if (invoice && invoice.status === 'posted') {
          // Delete related inventory transactions
          await tx
            .delete(inventoryTransactions)
            .where(
              and(
                eq(inventoryTransactions.documentId, id),
                eq(inventoryTransactions.documentType, 'invoice')
              )
            );
          
          // Restore inventory
          const details = await tx
            .select()
            .from(invoiceDetails)
            .where(eq(invoiceDetails.invoiceId, id));
          
          for (const detail of details) {
            const [invRecord] = await tx
              .select()
              .from(inventory)
              .where(
                and(
                  eq(inventory.productId, detail.productId),
                  eq(inventory.warehouseId, invoice.warehouseId)
                )
              );
            
            if (invRecord) {
              await tx
                .update(inventory)
                .set({ 
                  quantity: invRecord.quantity + detail.quantity,
                  updatedAt: new Date()
                })
                .where(eq(inventory.id, invRecord.id));
            } else {
              await tx
                .insert(inventory)
                .values({
                  productId: detail.productId,
                  warehouseId: invoice.warehouseId,
                  quantity: detail.quantity
                });
            }
          }
          
          // Delete financial transaction
          const [transaction] = await tx
            .select()
            .from(transactions)
            .where(
              and(
                eq(transactions.documentId, id),
                eq(transactions.documentType, 'invoice')
              )
            );
          
          if (transaction) {
            await tx.delete(transactions).where(eq(transactions.id, transaction.id));
            
            // Update account balance
            if (invoice.accountId) {
              const [account] = await tx
                .select()
                .from(accounts)
                .where(eq(accounts.id, invoice.accountId));
              
              if (account) {
                await tx
                  .update(accounts)
                  .set({ 
                    currentBalance: account.currentBalance - invoice.total,
                    updatedAt: new Date()
                  })
                  .where(eq(accounts.id, invoice.accountId));
              }
            }
          }
        }
        
        // Delete invoice details
        await tx
          .delete(invoiceDetails)
          .where(eq(invoiceDetails.invoiceId, id));
        
        // Delete invoice
        await tx
          .delete(invoices)
          .where(eq(invoices.id, id));
        
        return true;
      } catch (error) {
        console.error('Error deleting invoice:', error);
        return false;
      }
    });
  }

  // Purchases
  async createPurchase(purchase: InsertPurchase, details: InsertPurchaseDetail[]): Promise<Purchase> {
    // Start a transaction
    return await db.transaction(async (tx: any) => {
      try {
        // Calculate totals for the purchase
        let subtotal = 0;
        details.forEach(detail => {
          subtotal += detail.quantity * detail.unitPrice;
        });
        
        const discount = purchase.discount || 0;
        const tax = purchase.tax || 0;
        const total = subtotal - discount + tax;
        
        // Update the purchase with calculated totals
        const updatedPurchase = {
          ...purchase,
          subtotal,
          discount,
          tax,
          total
        };

        // Log purchase details when status is 'posted'
        if (purchase.status === 'posted') {
          console.log(`Creating POSTED purchase invoice: ${purchase.purchaseNumber} for accountId: ${purchase.accountId}, warehouseId: ${purchase.warehouseId}`);
          console.log(`Purchase contains ${details.length} items with total value: ${total}`);

          // Validate required fields for posted purchases
          if (!purchase.accountId) {
            throw new Error("Account ID is required for posted purchases");
          }

          if (!purchase.warehouseId) {
            throw new Error("Warehouse ID is required for posted purchases");
          }
        }
        
        // Create purchase
        const [newPurchase] = await tx.insert(purchases).values(updatedPurchase).returning();
        console.log(`Created purchase with ID: ${newPurchase.id}`);
        
        // Create purchase details with the new purchase ID
        for (const detail of details) {
          await tx.insert(purchaseDetails).values({
            ...detail,
            purchaseId: newPurchase.id
          });
          
          // Create inventory transaction for each product if purchase is posted
          if (purchase.status === 'posted') {
            try {
              // Validate product existence
              const [product] = await tx
                .select()
                .from(products)
                .where(eq(products.id, detail.productId));
              
              if (!product) {
                throw new Error(`Product with ID ${detail.productId} not found`);
              }

              console.log(`Processing inventory update for product: ${product.name} (ID: ${detail.productId}), quantity: ${detail.quantity}`);
              
              await tx.insert(inventoryTransactions).values({
                productId: detail.productId,
                warehouseId: purchase.warehouseId,
                quantity: detail.quantity,
                type: 'purchase',
                documentId: newPurchase.id,
                documentType: 'purchase',
                date: purchase.date || new Date(),
                userId: purchase.userId,
                notes: `Purchase #${purchase.purchaseNumber}`
              });
              
              // Update inventory
              const existingInventory = await this.getInventory(detail.productId, purchase.warehouseId);
              
              if (existingInventory) {
                const currentQuantity = existingInventory.quantity || 0;
                const newQuantity = currentQuantity + detail.quantity;
                
                console.log(`Updating inventory for product ${detail.productId}: ${currentQuantity} + ${detail.quantity} = ${newQuantity}`);
                
                await tx
                  .update(inventory)
                  .set({ 
                    quantity: newQuantity,
                    updatedAt: new Date()
                  })
                  .where(
                    and(
                      eq(inventory.productId, detail.productId),
                      eq(inventory.warehouseId, purchase.warehouseId)
                    )
                  );
              } else {
                console.log(`Creating new inventory record for product ${detail.productId} with quantity ${detail.quantity}`);
                
                await tx
                  .insert(inventory)
                  .values({
                    productId: detail.productId,
                    warehouseId: purchase.warehouseId,
                    quantity: detail.quantity
                  });
              }
            } catch (error) {
              console.error(`Error updating inventory for product ${detail.productId}:`, error);
              throw new Error(`Failed to update inventory for product ${detail.productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
        
        // Create financial transaction for purchase if it's posted and has accountId
        if (purchase.status === 'posted' && purchase.accountId) {
          try {
            console.log(`Creating financial transaction for purchase ${newPurchase.id}`);
            
            await tx.insert(transactions).values({
              accountId: purchase.accountId,
              amount: total,
              type: 'credit' as 'credit' | 'debit' | 'journal', // We owe supplier money
              reference: purchase.purchaseNumber,
              date: purchase.date || new Date(),
              documentId: newPurchase.id,
              documentType: 'purchase',
              userId: purchase.userId,
              notes: `Purchase #${purchase.purchaseNumber}`
            });
            
            // Update account balance
            const [account] = await tx
              .select()
              .from(accounts)
              .where(eq(accounts.id, purchase.accountId));
            
            if (account) {
              const currentBalance = account.currentBalance || 0;
              const newBalance = currentBalance - total; // Credit: negative means we owe them
              
              console.log(`Updating account ${purchase.accountId} balance: ${currentBalance} - ${total} = ${newBalance}`);
              
              await tx
                .update(accounts)
                .set({ 
                  currentBalance: newBalance,
                  updatedAt: new Date()
                })
                .where(eq(accounts.id, purchase.accountId));
            } else {
              throw new Error(`Account with ID ${purchase.accountId} not found`);
            }
          } catch (error) {
            console.error(`Error creating financial transaction for purchase ${newPurchase.id}:`, error);
            throw new Error(`Failed to create financial transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        
        console.log(`Purchase processing completed successfully for ID: ${newPurchase.id}`);
        return newPurchase;
      } catch (error) {
        console.error("Error in createPurchase transaction:", error);
        throw error; // Rethrow the error to trigger transaction rollback
      }
    });
  }

  async getPurchase(id: number): Promise<{purchase: Purchase, details: PurchaseDetail[]} | undefined> {
    const [purchase] = await db.select().from(purchases).where(eq(purchases.id, id));
    if (!purchase) {
      return undefined;
    }
    
    const details = await db
      .select()
      .from(purchaseDetails)
      .where(eq(purchaseDetails.purchaseId, id));
    
    return { purchase, details };
  }

  async listPurchases(accountId?: number, startDate?: Date, endDate?: Date): Promise<Purchase[]> {
    let query = db.select().from(purchases);
    
    const conditions: SQL[] = [];
    
    if (accountId) {
      conditions.push(eq(purchases.accountId, accountId));
    }
    
    if (startDate) {
      conditions.push(gte(purchases.date, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(purchases.date, endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(purchases.date));
  }

  async updatePurchaseStatus(id: number, status: string): Promise<Purchase | undefined> {
    const [updatedPurchase] = await db
      .update(purchases)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(purchases.id, id))
      .returning();
    
    return updatedPurchase;
  }

  async deletePurchase(id: number): Promise<boolean> {
    return await db.transaction(async (tx: any) => {
      try {
        // Get purchase to update account balance
        const [purchase] = await tx
          .select()
          .from(purchases)
          .where(eq(purchases.id, id));
        
        if (purchase && purchase.status === 'posted') {
          // Delete related inventory transactions
          await tx
            .delete(inventoryTransactions)
            .where(
              and(
                eq(inventoryTransactions.documentId, id),
                eq(inventoryTransactions.documentType, 'purchase')
              )
            );
          
          // Restore inventory
          const details = await tx
            .select()
            .from(purchaseDetails)
            .where(eq(purchaseDetails.purchaseId, id));
          
          for (const detail of details) {
            const [invRecord] = await tx
              .select()
              .from(inventory)
              .where(
                and(
                  eq(inventory.productId, detail.productId),
                  eq(inventory.warehouseId, purchase.warehouseId)
                )
              );
            
            if (invRecord) {
              await tx
                .update(inventory)
                .set({ 
                  quantity: invRecord.quantity - detail.quantity,
                  updatedAt: new Date()
                })
                .where(eq(inventory.id, invRecord.id));
            }
          }
          
          // Delete financial transaction
          const [transaction] = await tx
            .select()
            .from(transactions)
            .where(
              and(
                eq(transactions.documentId, id),
                eq(transactions.documentType, 'purchase')
              )
            );
          
          if (transaction) {
            await tx.delete(transactions).where(eq(transactions.id, transaction.id));
            
            // Update account balance
            if (purchase.accountId) {
              const [account] = await tx
                .select()
                .from(accounts)
                .where(eq(accounts.id, purchase.accountId));
              
              if (account) {
                await tx
                  .update(accounts)
                  .set({ 
                    currentBalance: account.currentBalance + purchase.total,
                    updatedAt: new Date()
                  })
                  .where(eq(accounts.id, purchase.accountId));
              }
            }
          }
        }
        
        // Delete purchase details
        await tx
          .delete(purchaseDetails)
          .where(eq(purchaseDetails.purchaseId, id));
        
        // Delete purchase
        await tx
          .delete(purchases)
          .where(eq(purchases.id, id));
        
        return true;
      } catch (error) {
        console.error('Error deleting purchase:', error);
        return false;
      }
    });
  }

  // Settings
  async getSettings(): Promise<Settings | undefined> {
    const allSettings = await db.select().from(settings);
    return allSettings[0];
  }

  async updateSettings(updatedSettings: Partial<InsertSettings>): Promise<Settings> {
    const currentSettings = await this.getSettings();
    
    if (currentSettings) {
      const [updated] = await db
        .update(settings)
        .set({ 
          ...updatedSettings,
          updatedAt: new Date()
        })
        .where(eq(settings.id, currentSettings.id))
        .returning();
      return updated;
    } else {
      const [newSettings] = await db
        .insert(settings)
        .values({
          companyName: updatedSettings.companyName || 'شركة الريادي لتوزيع المواد الغذائية',
          ...updatedSettings
        })
        .returning();
      return newSettings;
    }
  }

  // Add count methods
  async countProducts(): Promise<number> {
    try {
      const result = await db.select({ count: count() }).from(products);
      return result[0].count;
    } catch (error) {
      console.error("Error counting products:", error);
      return 0;
    }
  }

  async countCategories(): Promise<number> {
    try {
      const result = await db.select({ count: count() }).from(categories);
      return result[0].count;
    } catch (error) {
      console.error("Error counting categories:", error);
      return 0;
    }
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>, details?: any[]): Promise<Invoice | undefined> {
    try {
      // Start a transaction
      return await db.transaction(async (tx) => {
        // First update the invoice
        const [updatedInvoice] = await tx
          .update(invoices)
          .set({
            ...invoice,
            updatedAt: new Date()
          })
          .where(eq(invoices.id, id))
          .returning();

        if (!updatedInvoice) {
          return undefined;
        }

        // If details are provided, update them
        if (details && Array.isArray(details)) {
          // Delete existing details
          await tx
            .delete(invoiceDetails)
            .where(eq(invoiceDetails.invoiceId, id));

          // Insert new details
          for (const detail of details) {
            await tx
              .insert(invoiceDetails)
              .values({
                ...detail,
                invoiceId: id
              });
          }
        }

        return updatedInvoice;
      });
    } catch (error) {
      console.error("Error updating invoice:", error);
      throw error;
    }
  }

  async updateAccountBalance(accountId: number): Promise<void> {
    const account = await this.getAccount(accountId);
    if (!account) return;

    // Get all transactions for this account
    const transactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.accountId, accountId))
      .orderBy(transactions.date);

    // Calculate balance based on transaction types and account type
    let balance = account.openingBalance || 0;
    
    for (const transaction of transactions) {
      if (account.type === 'customer') {
        // For customers:
        // - Sales invoices (debit) increase balance
        // - Payments (credit) decrease balance
        if (transaction.documentType === 'invoice' || transaction.type === 'debit') {
          balance += transaction.amount;
        } else if (transaction.type === 'credit') {
          balance -= transaction.amount;
        }
      } else if (account.type === 'supplier') {
        // For suppliers:
        // - Purchase invoices (credit) increase balance
        // - Payments (debit) decrease balance
        if (transaction.documentType === 'purchase' || transaction.type === 'credit') {
          balance += transaction.amount;
        } else if (transaction.type === 'debit') {
          balance -= transaction.amount;
        }
      }
    }

    // Update the account balance
    await db
      .update(accounts)
      .set({ 
        currentBalance: balance,
        updatedAt: new Date()
      })
      .where(eq(accounts.id, accountId));

    console.log(`Updated balance for account ${accountId} (${account.name}): ${balance}`);
  }

  // Add a method to recalculate all account balances
  async recalculateAllBalances(): Promise<void> {
    const allAccounts = await db.select().from(accounts);
    
    for (const account of allAccounts) {
      await this.updateAccountBalance(account.id);
    }
  }
}

// Create a missing helper function
function or(...conditions: SQL[]): SQL {
  return sql`(${conditions.join(' OR ')})`;
}

export const storage = new DatabaseStorage();
