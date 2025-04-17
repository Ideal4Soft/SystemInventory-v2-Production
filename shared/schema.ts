import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, pgEnum, json, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const accountTypeEnum = pgEnum('account_type', ['customer', 'supplier', 'expense', 'income', 'bank', 'cash']);
export const inventoryTransactionTypeEnum = pgEnum('inventory_transaction_type', ['purchase', 'sale', 'adjustment', 'transfer', 'return']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'bank', 'credit', 'check']);

// Account tables
export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: accountTypeEnum('type').notNull(),
  code: text('code'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  taxNumber: text('tax_number'),
  openingBalance: doublePrecision('opening_balance').default(0),
  currentBalance: doublePrecision('current_balance').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  category: text('category'),
  isActive: boolean('is_active').default(true),
  notes: text('notes'),
});

export const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions),
}));

// Inventory tables
export const warehouses = pgTable('warehouses', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location'),
  manager: text('manager'),
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  parent_id: integer('parent_id').references(() => categories.id),
  description: text('description'),
  isDefault: boolean('is_default').default(false),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  barcode: text('barcode'),
  categoryId: integer('category_id').references(() => categories.id),
  costPrice: doublePrecision('cost_price').default(0),
  sellPrice1: doublePrecision('sell_price_1').default(0),
  sellPrice2: doublePrecision('sell_price_2').default(0),
  sellPrice3: doublePrecision('sell_price_3').default(0),
  sellPrice4: doublePrecision('sell_price_4').default(0),
  unit: text('unit').default('طن'),
  description: text('description'),
  minStock: doublePrecision('min_stock').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isActive: boolean('is_active').default(true),
});

export const productsRelations = relations(products, ({ many }) => ({
  inventory: many(inventory),
}));

export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  quantity: doublePrecision('quantity').default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    productWarehouseUnique: unique().on(table.productId, table.warehouseId),
  };
});

export const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
  warehouse: one(warehouses, {
    fields: [inventory.warehouseId],
    references: [warehouses.id],
  }),
}));

// Transaction tables
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  amount: doublePrecision('amount').notNull(),
  type: text('type').notNull(), // debit or credit
  reference: text('reference'),
  date: timestamp('date').defaultNow(),
  paymentMethod: paymentMethodEnum('payment_method').default('cash'),
  bankId: integer('bank_id').references(() => accounts.id),
  notes: text('notes'),
  documentId: integer('document_id'), // Can be invoice_id, purchase_id, etc.
  documentType: text('document_type'), // invoice, purchase, expense, etc.
  createdAt: timestamp('created_at').defaultNow(),
  userId: integer('user_id').references(() => users.id),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  bank: one(accounts, {
    fields: [transactions.bankId],
    references: [accounts.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

export const inventoryTransactions = pgTable('inventory_transactions', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  quantity: doublePrecision('quantity').notNull(),
  type: inventoryTransactionTypeEnum('type').notNull(),
  documentId: integer('document_id'), // Can be invoice_id, purchase_id, etc.
  documentType: text('document_type'), // invoice, purchase, expense, etc.
  date: timestamp('date').defaultNow(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  userId: integer('user_id').references(() => users.id),
});

export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  date: timestamp('date').defaultNow(),
  dueDate: timestamp('due_date'),
  total: doublePrecision('total').default(0),
  discount: doublePrecision('discount').default(0),
  tax: doublePrecision('tax').default(0),
  subtotal: doublePrecision('subtotal').default(0),
  status: text('status').default('draft'), // draft, posted, paid, partially_paid, cancelled
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  userId: integer('user_id').references(() => users.id),
  paymentTerms: text('payment_terms'),
});

export const invoiceDetails = pgTable('invoice_details', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity: doublePrecision('quantity').notNull(),
  unitPrice: doublePrecision('unit_price').notNull(),
  discount: doublePrecision('discount').default(0),
  tax: doublePrecision('tax').default(0),
  total: doublePrecision('total').notNull(),
});

export const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  purchaseNumber: text('purchase_number').notNull().unique(),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  date: timestamp('date').defaultNow(),
  dueDate: timestamp('due_date'),
  total: doublePrecision('total').default(0),
  discount: doublePrecision('discount').default(0),
  tax: doublePrecision('tax').default(0),
  subtotal: doublePrecision('subtotal').default(0),
  status: text('status').default('draft'), // draft, posted, paid, partially_paid, cancelled
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  userId: integer('user_id').references(() => users.id),
  paymentTerms: text('payment_terms'),
});

export const purchaseDetails = pgTable('purchase_details', {
  id: serial('id').primaryKey(),
  purchaseId: integer('purchase_id').notNull().references(() => purchases.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity: doublePrecision('quantity').notNull(),
  unitPrice: doublePrecision('unit_price').notNull(),
  discount: doublePrecision('discount').default(0),
  tax: doublePrecision('tax').default(0),
  total: doublePrecision('total').notNull(),
});

// User & Settings tables
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  fullName: text('full_name'),
  email: text('email'),
  phone: text('phone'),
  role: text('role').default('user'), // admin, manager, user, etc.
  isActive: boolean('is_active').default(true),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const sessions = pgTable('sessions', {
  sid: text('sid').primaryKey(),
  sess: json('sess').notNull(),
  expire: timestamp('expire', { precision: 6 }).notNull()
});

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  companyName: text('company_name').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  taxNumber: text('tax_number'),
  logo: text('logo'),
  defaultWarehouseId: integer('default_warehouse_id').references(() => warehouses.id),
  currency: text('currency').default('EGP'),
  currencySymbol: text('currency_symbol').default('ج.م'),
  currencyPosition: text('currency_position').default('after'), // before or after
  decimalPlaces: integer('decimal_places').default(2),
  financialYearStart: text('financial_year_start'),
  dateFormat: text('date_format').default('DD/MM/YYYY'),
  timeFormat: text('time_format').default('HH:mm'),
  combinePurchaseViews: boolean('combine_purchase_views').default(true),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Schema validations
export const insertAccountSchema = createInsertSchema(accounts).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true, 
  currentBalance: true 
});
export const insertWarehouseSchema = createInsertSchema(warehouses).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertCategorySchema = createInsertSchema(categories).omit({ 
  id: true 
});
export const insertProductSchema = createInsertSchema(products).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertInventorySchema = createInsertSchema(inventory).omit({ 
  id: true, 
  updatedAt: true 
});
export const insertTransactionSchema = createInsertSchema(transactions).omit({ 
  id: true, 
  createdAt: true 
});
export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactions).omit({ 
  id: true, 
  createdAt: true 
});
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertInvoiceDetailSchema = createInsertSchema(invoiceDetails).omit({ 
  id: true 
});
export const insertPurchaseSchema = createInsertSchema(purchases).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertPurchaseDetailSchema = createInsertSchema(purchaseDetails).omit({ 
  id: true 
});
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true, 
  lastLogin: true 
});
export const insertSettingsSchema = createInsertSchema(settings).omit({ 
  id: true, 
  updatedAt: true 
});

// Types
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type InsertInventoryTransaction = z.infer<typeof insertInventoryTransactionSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceDetail = typeof invoiceDetails.$inferSelect;
export type InsertInvoiceDetail = z.infer<typeof insertInvoiceDetailSchema>;

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;

export type PurchaseDetail = typeof purchaseDetails.$inferSelect;
export type InsertPurchaseDetail = z.infer<typeof insertPurchaseDetailSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
