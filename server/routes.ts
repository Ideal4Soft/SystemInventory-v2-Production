import express, { Express, Request, Response } from 'express';
import { Server } from 'http';
import { createServer } from 'http';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcryptjs from 'bcryptjs';
import { z, ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { db, usingMockData as dbUsingMockData, forceRealDatabase, isDatabaseConnected } from './db';
import { mockDB } from './mockdb';
import { 
  users, 
  insertUserSchema, 
  insertCategorySchema, 
  insertProductSchema, 
  insertWarehouseSchema,
  insertAccountSchema, 
  insertTransactionSchema,
  insertInvoiceSchema,
  insertInvoiceDetailSchema,
  accounts,
  inventory,
  inventoryTransactions,
  transactions,
  sessions
} from '@shared/schema';
import { eq, and, like, desc, sql, or, asc, gte, lte, SQL } from 'drizzle-orm';
import { storage } from "./storage";
import { compare, hash } from "bcryptjs";
import MemoryStore from "memorystore";
import config from './config';
import { createHash } from 'crypto';
import { 
  createMockProduct, 
  getMockProduct, 
  getMockProducts, 
  updateMockProduct, 
  deleteMockProduct,
  getMockCategories, 
  createMockCategory, 
  getMockCategory, 
  updateMockCategory, 
  deleteMockCategory,
  getMockWarehouses,
  createMockWarehouse,
  getMockWarehouse,
  updateMockWarehouse,
  deleteMockWarehouse,
  getMockAccounts,
  createMockAccount,
  getMockAccount,
  updateMockAccount,
  deleteMockAccount,
  createMockInventory,
  getMockInventoryByWarehouse,
  getMockInventoryByProductAndWarehouse,
  updateMockInventory,
  getMockInventoryByProduct,
  mockInvoices,
  createMockTransaction,
  getMockTransaction,
  updateMockTransaction,
  deleteMockTransaction,
  mockTransactions
} from './mockdb';
import { 
  mockAccounts, 
  mockWarehouses,
  mockTransactions,
  mockInvoices,
  mockSettings
} from "./mockdb";

// Mock invoice implementation for development
const createMockInvoice = (data: any) => ({...data, id: Math.floor(Math.random() * 1000)});

interface MockInvoice {
  id: number;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  accountId: number;
  warehouseId: number;
  status: string;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  createdAt: string;
  account?: {
    name: string;
    type: string;
  };
  details?: Array<{
    id: number;
    invoiceId: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

const mockInvoices: MockInvoice[] = [];

export async function registerRoutes(app: Express): Promise<Server> {
  // Check if mock data should be used
  const useMock = config.NODE_ENV !== 'production' || config.USE_MOCK_DB === true;
  
  // For debugging and development
  // Use the usingMockData flag from db.ts for consistency
  if (useMock === false && isDatabaseConnected()) {
    // Try to force using real database if requested and possible
    forceRealDatabase();
    console.log('[DEBUG] Configuration requests real database: setting usingMockData to false.');
  }
  
  // Reference the shared usingMockData variable from db.ts
  // We'll check this later before each database operation
  console.log('[DEBUG] Current database mode:', dbUsingMockData ? 'MOCK DATA' : 'REAL DATABASE');
  
  // Set up session middleware
  app.use(
    session({
      secret: config.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: { 
        secure: config.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        sameSite: 'lax'
      },
      store: new (class Store extends session.Store {
        async get(sid: string, callback: (err: any, session?: any) => void) {
          try {
            const result = await db.query.sessions.findFirst({
              where: eq(sessions.sid, sid)
            });
            callback(null, result?.sess);
          } catch (err) {
            callback(err);
          }
        }

        async set(sid: string, sess: any, callback?: (err?: any) => void) {
          try {
            const now = new Date();
            const expire = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
            await db.insert(sessions).values({
              sid,
              sess,
              expire
            }).onConflictDoUpdate({
              target: sessions.sid,
              set: { sess, expire }
            });
            if (callback) callback();
          } catch (err) {
            if (callback) callback(err);
          }
        }

        async destroy(sid: string, callback?: (err?: any) => void) {
          try {
            await db.delete(sessions).where(eq(sessions.sid, sid));
            if (callback) callback();
          } catch (err) {
            if (callback) callback(err);
          }
        }

        async touch(sid: string, sess: any, callback?: (err?: any) => void) {
          try {
            const now = new Date();
            const expire = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
            await db.update(sessions)
              .set({ expire })
              .where(eq(sessions.sid, sid));
            if (callback) callback();
          } catch (err) {
            if (callback) callback(err);
          }
        }
      })()
    })
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport local strategy
  passport.use(
    new LocalStrategy(async (username: string, password: string, done: any) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        const isPasswordValid = await compare(password, user.password);
        if (!isPasswordValid) {
          return done(null, false, { message: "Invalid username or password" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Auth routes
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info.message });

      req.logIn(user, (err) => {
        if (err) return next(err);
        req.session.save((err) => {
          if (err) return next(err);
          return res.json({ user, authenticated: true });
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/status", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ authenticated: true, user: req.user });
    } else {
      res.json({ authenticated: false });
    }
  });

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      // Hash password
      const hashedPassword = await hash(data.password, 10);
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error("Error creating user:", error);
        res.status(500).json({ message: "Error creating user" });
      }
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.listUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Error fetching users" });
    }
  });

  // Account routes
  app.post("/api/accounts", async (req, res) => {
    try {
      if (dbUsingMockData) {
        // Use the persistent mockDB
        console.log('Using mockDB for POST /api/accounts', req.body);
        const newAccount = mockDB.addAccount(req.body);
        
        // Force browser to reload data by preventing 304 response
        res.set({
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'ETag': Date.now().toString() // Change ETag on every response
        });
        return res.status(201).json(newAccount);
      }

      const data = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(data);
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error("Error creating account:", error);
        res.status(500).json({ message: "Error creating account" });
      }
    }
  });

  app.get("/api/accounts", async (req, res) => {
    try {
      // console.log('GET /api/accounts endpoint called');
      
      if (dbUsingMockData) {
        // console.log('Using mockDB for GET /api/accounts');
        const { type, showNonZeroOnly, showActiveOnly } = req.query;
        let accounts = mockDB.getAccounts();
        
        // Filter by type if specified
        if (type) {
          accounts = accounts.filter(a => a.type === type);
        }
        
        // Filter out accounts with zero balance if requested
        if (showNonZeroOnly === 'true') {
          accounts = accounts.filter(a => a.currentBalance !== 0);
        }
        
        // Filter active accounts only if requested
        if (showActiveOnly === 'true') {
          accounts = accounts.filter(a => a.isActive !== false);
        }
        
        // console.log(`Retrieved ${accounts.length} accounts from mockDB:`, accounts);
        
        // Force browser to reload data by preventing 304 response
        res.set({
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Content-Type': 'application/json',
          'ETag': Date.now().toString() // Change ETag on every response
        });
        
        return res.json(accounts || []);
      }

      const { type, showNonZeroOnly, showActiveOnly } = req.query;
      const accounts = await storage.listAccounts(
        type as string, 
        showNonZeroOnly === 'true',
        showActiveOnly === 'true'
      );
      // console.log(`Retrieved ${accounts.length} accounts from database`);
      
      // Force browser to reload data
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Type': 'application/json',
        'ETag': Date.now().toString()
      });
      
      res.json(accounts || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ 
        message: "Error fetching accounts",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/accounts/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }

      if (dbUsingMockData) {
        // Use the persistent mockDB
        console.log(`Using mockDB for GET /api/accounts/${id}`);
        const account = mockDB.getAccount(id);
        
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
        }
        
        // Force browser to reload data by preventing 304 response
        res.set({
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'ETag': Date.now().toString() // Change ETag on every response
        });
        
        return res.json(account);
      }

      const account = await storage.getAccount(id);
      if (!account) {
        res.status(404).json({ message: "Account not found" });
        return;
      }
      res.json(account);
    } catch (error) {
      console.error("Error fetching account:", error);
      res.status(500).json({ message: "Error fetching account" });
    }
  });

  app.put("/api/accounts/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }

      if (dbUsingMockData) {
        // Use the persistent mockDB
        console.log(`Using mockDB for PUT /api/accounts/${id}`, req.body);
        const account = mockDB.getAccount(id);
        
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
        }
        
        // Handle isActive field conversion to boolean if it comes as string
        if (req.body.isActive !== undefined) {
          req.body.isActive = req.body.isActive === true || req.body.isActive === 'true';
        }
        
        const updatedAccount = mockDB.updateAccount(id, req.body);
        
        // Force browser to reload data by preventing 304 response
        res.set({
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'ETag': Date.now().toString() // Change ETag on every response
        });
        
        return res.json(updatedAccount);
      }

      const data = updateAccountSchema.parse(req.body);
      const account = await storage.updateAccount(id, data);
      if (!account) {
        res.status(404).json({ message: "Account not found" });
        return;
      }
      res.json(account);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error("Error updating account:", error);
        res.status(500).json({ message: "Error updating account" });
      }
    }
  });

  app.delete("/api/accounts/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      console.log(`DELETE /api/accounts/${id} endpoint called`);
      
      if (isNaN(id)) {
        console.log(`Invalid account ID: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid account ID" });
      }

      if (dbUsingMockData) {
        // Use the persistent mockDB
        console.log(`Using mockDB for DELETE /api/accounts/${id}`);
        const deletedAccount = mockDB.deleteAccount(id);
        
        if (!deletedAccount) {
          console.log(`Account with ID ${id} not found in mockDB`);
          return res.status(404).json({ message: "Account not found" });
        }
        
        console.log(`Successfully deleted account with ID ${id} from mockDB:`, deletedAccount);
        
        // Force browser to reload data by preventing 304 response
        res.set({
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'ETag': Date.now().toString() // Change ETag on every response
        });
        
        return res.json({ message: "Account deleted successfully", deletedAccount });
      }

      const success = await storage.deleteAccount(id);
      if (!success) {
        console.log(`Account with ID ${id} not found in database`);
        return res.status(404).json({ message: "Account not found" });
      }
      
      console.log(`Successfully deleted account with ID ${id} from database`);
      
      // Force browser to reload data by preventing 304 response
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': Date.now().toString() // Change ETag on every response
      });
      
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Error deleting account" });
    }
  });

  // Add PATCH endpoint for accounts
  app.patch("/api/accounts/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }

      if (dbUsingMockData) {
        // Use the persistent mockDB
        console.log(`Using mockDB for PATCH /api/accounts/${id}`, req.body);
        const account = mockDB.getAccount(id);
        
        if (!account) {
          return res.status(404).json({ message: "Account not found" });
        }
        
        // Handle isActive field conversion to boolean if it comes as string
        if (req.body.isActive !== undefined) {
          req.body.isActive = req.body.isActive === true || req.body.isActive === 'true';
        }
        
        const updatedAccount = mockDB.updateAccount(id, req.body);
        
        // Force browser to reload data by preventing 304 response
        res.set({
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'ETag': Date.now().toString() // Change ETag on every response
        });
        
        return res.json(updatedAccount);
      }

      // For PATCH, we don't need full validation since we're updating partial data
      // Just ensure the id is valid and the account exists
      const existingAccount = await storage.getAccount(id);
      if (!existingAccount) {
        return res.status(404).json({ message: "Account not found" });
      }

      // Handle isActive field conversion to boolean if it comes as string
      if (req.body.isActive !== undefined) {
        req.body.isActive = req.body.isActive === true || req.body.isActive === 'true';
      }

      const updatedAccount = await storage.updateAccount(id, req.body);
      
      // Force browser to reload data
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': Date.now().toString()
      });
      
      res.json(updatedAccount);
    } catch (error) {
      console.error("Error patching account:", error);
      res.status(500).json({ message: "Error patching account" });
    }
  });

  app.get("/api/accounts/search", async (req, res) => {
    try {
      const { query, type } = req.query;
      if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
      }
      const accounts = await storage.searchAccounts(query as string, type as string);
      res.json(accounts);
    } catch (error) {
      console.error("Error searching accounts:", error);
      res.status(500).json({ message: "Error searching accounts" });
    }
  });

  // Category routes
  app.post("/api/categories", async (req, res) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(data);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error("Error creating category:", error);
        res.status(500).json({ message: "Error creating category" });
      }
    }
  });

  app.get("/api/categories", async (req, res) => {
    try {
      // Set cache control headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      console.log("[DEBUG] GET /api/categories called");
      
      if (dbUsingMockData) {
        console.log("[DEBUG] Using mock data for categories");
        const mockCategories = mockDB.getCategories();
        return res.json(mockCategories);
      }
      
    try {
      const categories = await storage.listCategories();
      res.json(categories);
      } catch (dbError) {
        console.error("Error fetching categories:", dbError);
        
        // If there's a database error, fall back to mock data
        console.log("[DEBUG] Database error, falling back to mock data for categories");
        const mockCategories = mockDB.getCategories();
        return res.json(mockCategories);
      }
    } catch (error) {
      console.error("Error in categories route:", error);
      res.status(500).json({ message: "Error fetching categories" });
    }
  });

  app.get("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      const category = await storage.getCategory(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).json({ message: "Error fetching category" });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      const data = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, data);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error("Error updating category:", error);
        res.status(500).json({ message: "Error updating category" });
      }
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      const result = await storage.deleteCategory(id);
      if (!result) {
        return res.status(404).json({ message: "Category not found or could not be deleted" });
      }
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Error deleting category" });
    }
  });

  // Product routes
  app.post("/api/products", async (req, res) => {
    try {
      if (dbUsingMockData) {
        // Use the persistent mockDB
        console.log('Using mockDB for POST /api/products', req.body);
        const newProduct = mockDB.addProduct(req.body);
        
        // Force browser to reload data by preventing 304 response
        res.set({
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'ETag': Date.now().toString() // Change ETag on every response
        });
        return res.status(201).json(newProduct);
      }

      // Real database code - prioritize using this
      const data = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(data);
      
      // Force browser to reload data by preventing 304 response
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': Date.now().toString() // Change ETag on every response
      });
      
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error("Error creating product:", error);
        res.status(500).json({ message: "Error creating product" });
      }
    }
  });

  app.get("/api/products", async (req, res) => {
    try {
      console.log('GET /api/products request received', {
        query: req.query,
        headers: req.headers['cache-control']
      });
      
      if (dbUsingMockData) {
        // Use the persistent mockDB
        console.log('Using mockDB for GET /api/products');
        // Add a small delay to simulate network latency
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force browser to reload data by preventing 304 response
        res.set({
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'ETag': Date.now().toString() // Change ETag on every response
        });
        
        const products = mockDB.getProducts();
        console.log(`Returning ${products.length} products from mockDB`);
        return res.json(products);
      }

      // Real database code - prioritize using this
      console.log('Using real DB for GET /api/products');
      const products = await storage.listProducts();
      console.log(`Retrieved ${products.length} products from real database`);
      
      // Force browser to reload data by preventing 304 response
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': Date.now().toString() // Change ETag on every response
      });
      
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Error fetching products" });
    }
  });

  // Move search route BEFORE the ID-specific routes to prevent conflicts
  app.get("/api/products/search", async (req, res) => {
    try {
      const { query } = req.query;
      if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
      }
      const products = await storage.searchProducts(query as string);
      res.json(products);
    } catch (error) {
      console.error("Error searching products:", error);
      res.status(500).json({ message: "Error searching products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      if (dbUsingMockData) {
        // Use the persistent mockDB
        console.log(`Using mockDB for GET /api/products/${id}`);
        const product = mockDB.getProduct(id);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }
        
        // Force browser to reload data by preventing 304 response
        res.set({
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        
        return res.json(product);
      }

      // Real database code - prioritize using this
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Force browser to reload data by preventing 304 response
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Error fetching product" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      if (dbUsingMockData) {
        // Use the persistent mockDB
        console.log(`Using mockDB for PATCH /api/products/${id}`, req.body);
        const updatedProduct = mockDB.updateProduct(id, req.body);
        if (!updatedProduct) {
          return res.status(404).json({ message: "Product not found" });
        }
        
        // Force browser to reload data by preventing 304 response
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'ETag': Date.now().toString() // Change ETag on every response
        });
        
        return res.json(updatedProduct);
      }

      // Real database code - prioritize using this
      const data = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(id, data);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Force browser to reload data by preventing 304 response
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': Date.now().toString() // Change ETag on every response
      });
      
      res.json(product);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error("Error updating product:", error);
        res.status(500).json({ message: "Error updating product" });
      }
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`DELETE request received for product ID: ${id}`);
      
      if (isNaN(id)) {
        console.log(`Invalid product ID: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      if (dbUsingMockData) {
        // Use the persistent mockDB
        console.log(`Using mockDB for DELETE /api/products/${id}`);
        
        // First check if the product exists
        const product = mockDB.getProduct(id);
        if (!product) {
          console.log(`Product with ID ${id} not found in mockDB`);
          return res.status(404).json({ message: "Product not found" });
        }
        
        // Delete any inventory records
        const inventoryItems = mockDB.getInventory().filter(item => item.productId === id);
        console.log(`Found ${inventoryItems.length} inventory items to delete for product ${id}`);
        
        // Then delete the product
        const result = mockDB.deleteProduct(id);
        if (!result) {
          console.log(`Error deleting product with ID ${id} from mockDB`);
          return res.status(404).json({ message: "Product not found or could not be deleted" });
        }
        
        console.log(`Product with ID ${id} successfully deleted from mockDB`);
        return res.json({ message: "Product deleted successfully" });
      }
      
      // Real database code
      console.log(`Using real DB for DELETE /api/products/${id}`);
      
      // Check if the product exists first
      const existingProduct = await storage.getProduct(id);
      if (!existingProduct) {
        console.log(`Product with ID ${id} not found in database`);
        return res.status(404).json({ message: "Product not found" });
      }
      
      console.log(`Product found, attempting to delete...`);
      const result = await storage.deleteProduct(id);
      console.log(`Delete operation result: ${result}`);
      
      if (!result) {
        console.log(`Error deleting product with ID ${id} from database`);
        return res.status(404).json({ message: "Product not found or could not be deleted" });
      }
      
      console.log(`Product with ID ${id} successfully deleted from database`);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Error deleting product" });
    }
  });

  // TEMPORARY: Force delete product route for debugging
  app.delete("/api/forceDeleteProduct/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    console.log(`FORCE DELETE request received for product ID: ${id}`);
    
    try {
      // Check if product exists
      const product = await storage.getProduct(id);
      
      if (!product) {
        console.log(`Product ${id} not found`);
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Check if product has any inventory
      const inventoryItems = await db
        .select()
        .from(inventory)
        .where(eq(inventory.productId, id));
      
      const hasInventory = inventoryItems.some(item => item.quantity > 0);
      
      if (hasInventory) {
        console.error(`Cannot force delete product ${id} with existing inventory`);
        return res.status(400).json({ 
          message: "Cannot delete product with existing inventory. Set quantities to zero first." 
        });
      }
      
      // Perform DB transaction to delete everything
      await db.transaction(async (tx) => {
        // First delete invoice_details referencing this product
        await tx.delete(invoiceDetails).where(eq(invoiceDetails.productId, id));
        
        // Delete purchase_details referencing this product
        await tx.delete(purchaseDetails).where(eq(purchaseDetails.productId, id));
        
        // Delete inventory records
        await tx.delete(inventory).where(eq(inventory.productId, id));
        
        // Delete inventory transactions
        await tx.delete(inventoryTransactions).where(eq(inventoryTransactions.productId, id));
        
        // Finally delete the product
        await tx.delete(products).where(eq(products.id, id));
      });
      
      console.log(`Successfully force deleted product ${id}`);
      return res.status(200).json({ message: "Product force deleted successfully" });
    } catch (error) {
      console.error(`Error force deleting product ${id}:`, error);
      return res.status(500).json({ message: "Error deleting product", error: String(error) });
    }
  });

  // Warehouse routes
  app.post("/api/warehouses", async (req, res) => {
    try {
      const data = insertWarehouseSchema.parse(req.body);
      const warehouse = await storage.createWarehouse(data);
      res.status(201).json(warehouse);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error("Error creating warehouse:", error);
        res.status(500).json({ message: "Error creating warehouse" });
      }
    }
  });

  app.get("/api/warehouses", async (req, res) => {
    try {
      const warehouses = await storage.listWarehouses();
      res.json(warehouses);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      res.status(500).json({ message: "Error fetching warehouses" });
    }
  });

  app.get("/api/warehouses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid warehouse ID" });
      }
      const warehouse = await storage.getWarehouse(id);
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      res.json(warehouse);
    } catch (error) {
      console.error("Error fetching warehouse:", error);
      res.status(500).json({ message: "Error fetching warehouse" });
    }
  });

  app.put("/api/warehouses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid warehouse ID" });
      }
      const data = insertWarehouseSchema.partial().parse(req.body);
      const warehouse = await storage.updateWarehouse(id, data);
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      res.json(warehouse);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error("Error updating warehouse:", error);
        res.status(500).json({ message: "Error updating warehouse" });
      }
    }
  });

  app.delete("/api/warehouses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid warehouse ID" });
      }
      const result = await storage.deleteWarehouse(id);
      if (!result) {
        return res.status(404).json({ message: "Warehouse not found or could not be deleted" });
      }
      res.json({ message: "Warehouse deleted successfully" });
    } catch (error) {
      console.error("Error deleting warehouse:", error);
      res.status(500).json({ message: "Error deleting warehouse" });
    }
  });

  // Inventory routes
  app.get("/api/inventory", async (req, res) => {
    try {
      const { warehouseId } = req.query;
      let warehouseIdNumber: number | undefined;
      if (warehouseId) {
        warehouseIdNumber = parseInt(warehouseId as string);
        if (isNaN(warehouseIdNumber)) {
          return res.status(400).json({ message: "Invalid warehouse ID" });
        }
      }
      const inventory = await storage.listInventory(warehouseIdNumber);
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Error fetching inventory" });
    }
  });

  app.get("/api/inventory/:productId/:warehouseId", async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      const warehouseId = parseInt(req.params.warehouseId);
      if (isNaN(productId) || isNaN(warehouseId)) {
        return res.status(400).json({ message: "Invalid product or warehouse ID" });
      }
      const inv = await storage.getInventory(productId, warehouseId);
      if (!inv) {
        return res.status(404).json({ message: "Inventory record not found" });
      }
      res.json(inv);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Error fetching inventory" });
    }
  });

  app.post("/api/inventory", async (req, res) => {
    try {
      const { productId, warehouseId, quantity, isCount } = req.body;
      
      // Add detailed logging
      console.log(`==== INVENTORY UPDATE REQUEST ====`);
      console.log(`Product ID: ${productId}, Warehouse ID: ${warehouseId}`);
      console.log(`Requested quantity: ${quantity}, Is Count: ${isCount}`);
      
      if (!productId || !warehouseId || quantity === undefined) {
        return res.status(400).json({ message: "Product ID, warehouse ID, and quantity are required" });
      }

      if (dbUsingMockData) {
        // Mock implementation - directly call mockDB methods
        if (isCount) {
          // For count operations, set the quantity directly (isAbsoluteValue=true)
          console.log(`Using mockDB for absolute inventory count: Setting product ${productId} to exactly ${quantity} units`);
          
          // Get current quantity for logging
          const beforeItem = mockDB.getInventory().find(i => i.productId === productId && i.warehouseId === warehouseId);
          console.log(`Current quantity before update: ${beforeItem ? beforeItem.quantity : 'None (new item)'}`);
          
          // Update with absolute value
          const result = mockDB.updateInventory(productId, warehouseId, quantity, true);
          
          // Log the final result
          console.log(`Final quantity after update: ${result.quantity}`);
          
          // Log the transaction but DON'T update inventory again
          mockDB.createInventoryTransaction({
            productId,
            warehouseId,
            quantity,
            type: 'adjustment',
            date: new Date(),
            notes: 'Quantity count adjustment'
          });
          return res.status(200).json(result);
        } else {
          // For normal adjustments, just add/subtract from existing
          console.log(`Using mockDB for relative inventory adjustment: Adjusting product ${productId} by ${quantity} units`);
          
          // Get current quantity for logging
          const beforeItem = mockDB.getInventory().find(i => i.productId === productId && i.warehouseId === warehouseId);
          console.log(`Current quantity before update: ${beforeItem ? beforeItem.quantity : 'None (new item)'}`);
          
          // Update with relative value
          const result = mockDB.updateInventory(productId, warehouseId, quantity, false);
          
          // Log the final result
          console.log(`Final quantity after update: ${result.quantity}`);
          
          // Log the transaction but DON'T update inventory again
          mockDB.createInventoryTransaction({
            productId,
            warehouseId,
            quantity,
            type: quantity > 0 ? 'adjustment' : 'sale',
            date: new Date(),
            notes: quantity > 0 ? 'Manual addition' : 'Manual reduction'
          });
          return res.status(200).json(result);
        }
      }

      // Real database implementation
      // For count operations, we need to set the quantity directly rather than adding to existing quantity
      if (isCount) {
        console.log(`Setting absolute inventory quantity: Product ID ${productId}, Warehouse ID ${warehouseId}, Quantity ${quantity}`);
        
        // First check if inventory record exists
        const existingInventory = await storage.getInventory(productId, warehouseId);
        
        if (existingInventory) {
          // Calculate adjustment amount for transaction history
          const adjustmentAmount = quantity - (existingInventory.quantity || 0);
          console.log(`Existing quantity: ${existingInventory.quantity}, New quantity: ${quantity}, Adjustment: ${adjustmentAmount}`);
          
          // Update inventory record with exact quantity using direct DB query
          const [updatedInventory] = await db
            .update(inventory)
            .set({ 
              quantity: quantity, 
              updatedAt: new Date() 
            })
            .where(
              and(
                eq(inventory.productId, productId),
                eq(inventory.warehouseId, warehouseId)
              )
            )
            .returning();
          
          // Add transaction record for audit trail
          await db.insert(inventoryTransactions).values({
            productId,
            warehouseId,
            quantity: adjustmentAmount,
            type: 'adjustment',
            date: new Date(),
            notes: 'Quantity count adjustment'
          });
          
          return res.status(200).json(updatedInventory);
        } else {
          console.log(`No existing inventory record found, creating new record with quantity ${quantity}`);
          
          // Create new inventory record with exact quantity
          const [newInventory] = await db
            .insert(inventory)
            .values({
              productId,
              warehouseId,
              quantity,
            })
            .returning();
          
          // Add transaction record
          await db.insert(inventoryTransactions).values({
            productId,
            warehouseId,
            quantity,
            type: 'adjustment',
            date: new Date(),
            notes: 'Initial count'
          });
          
          return res.status(201).json(newInventory);
        }
      } else {
        // Regular inventory update (adding/subtracting quantity)
        // Use the storage method which handles both adding inventory and recording transactions
      const inv = await storage.updateInventory(productId, warehouseId, quantity);
      res.status(201).json(inv);
      }
    } catch (error) {
      console.error("Error updating inventory:", error);
      res.status(500).json({ message: "Error updating inventory" });
    }
  });

  // Transaction routes
  app.post("/api/transactions", async (req, res) => {
    try {
      // Set cache control headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      console.log('[DEBUG] POST /api/transactions:', JSON.stringify(req.body));
      
      const { type, accountId, amount, date, notes, paymentMethod, reference } = req.body;
      console.log('[DEBUG] Parsed transaction data:', { type, accountId, amount, date, notes, paymentMethod, reference });
      
      // Validate required fields
      if (!type || !accountId || !amount) {
        console.log('[DEBUG] Missing required fields:', { type, accountId, amount });
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Validate accountId
      const parsedAccountId = parseInt(String(accountId));
      if (isNaN(parsedAccountId)) {
        console.log('[DEBUG] Invalid account ID:', accountId);
        return res.status(400).json({ message: "Invalid account ID" });
      }
      
      // Validate amount
      const parsedAmount = parseFloat(String(amount));
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        console.log('[DEBUG] Invalid amount:', amount);
        return res.status(400).json({ message: "Invalid amount - must be greater than zero" });
      }
      
      // Validate date format if provided
      let parsedDate = new Date();
      if (date) {
        try {
          parsedDate = new Date(date);
          if (isNaN(parsedDate.getTime())) {
            console.log('[DEBUG] Invalid date format:', date);
            return res.status(400).json({ message: "Invalid date format" });
          }
        } catch (e) {
          console.log('[DEBUG] Error parsing date:', date, e);
          return res.status(400).json({ message: "Invalid date format" });
        }
      }
      
      // Validate transaction type
      if (!['credit', 'debit', 'journal'].includes(type)) {
        console.log('[DEBUG] Invalid transaction type:', type);
        return res.status(400).json({ message: "Transaction type must be 'credit', 'debit' or 'journal'" });
      }
      
      // Validate payment method
      const validPaymentMethods = ['cash', 'bank', 'check', 'card'];
      const parsedPaymentMethod = paymentMethod || 'cash';
      if (!validPaymentMethods.includes(parsedPaymentMethod)) {
        console.log('[DEBUG] Invalid payment method:', parsedPaymentMethod);
        return res.status(400).json({ message: "Invalid payment method" });
      }
      
      console.log('[DEBUG] Using mock data:', dbUsingMockData);
      
      if (dbUsingMockData) {
        console.log("[DEBUG] Using mock data for creating transaction");
        
        try {
          // Create a mock transaction
          const newTransaction = createMockTransaction({
            type,
            accountId: parsedAccountId,
            amount: parsedAmount,
            date: parsedDate,
            notes: notes || "",
            paymentMethod: parsedPaymentMethod,
            reference: reference || ""
          });
          
          // Update account balance based on transaction type
          const account = mockDB.getAccount(parsedAccountId);
          if (account) {
            const currentBalance = account.currentBalance || 0;
            let newBalance = currentBalance;
            
            // If it's a credit transaction (قبض/Collect from customer), 
            // reduce customer balance, if debit (دفع/Pay to supplier), 
            // increase supplier balance
            if (type === "credit") {
              // Customer paying us, reduce their debt or increase our debt to them
              if (account.type === "customer") {
                newBalance -= parsedAmount;
              } else if (account.type === "supplier") {
                newBalance += parsedAmount;
              }
            } else if (type === "debit") {
              // We're paying customer, increase customer debt or decrease our debt
              if (account.type === "customer") {
                newBalance += parsedAmount;
              } else if (account.type === "supplier") {
                newBalance -= parsedAmount;
              }
            }
            
            // Update mock account balance
            mockDB.updateAccount(parsedAccountId, { ...account, currentBalance: newBalance });
          }
          
          console.log("[DEBUG] Mock transaction created successfully:", newTransaction);
          return res.status(201).json(newTransaction);
        } catch (mockError) {
          console.error('[DEBUG] Error creating mock transaction:', mockError);
          return res.status(500).json({ message: "Error creating mock transaction", error: String(mockError) });
        }
      }
      
      // Original database code
      try {
        const newTransaction = await storage.createTransaction({
          type,
          accountId: parsedAccountId,
          amount: parsedAmount,
          date: parsedDate,
          notes: notes || "",
          paymentMethod: parsedPaymentMethod,
          reference: reference || ""
        });
        
        console.log('[DEBUG] Created DB transaction:', newTransaction);
        res.status(201).json(newTransaction);
      } catch (dbError) {
        console.error('[DEBUG] Error in database transaction creation:', dbError);
        res.status(500).json({ message: "Database error creating transaction", error: String(dbError) });
      }
    } catch (error) {
      console.error("[DEBUG] Error creating transaction:", error);
      res.status(500).json({ 
        message: "Error creating transaction", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.get("/api/transactions", async (req, res) => {
    try {
      // Set cache control headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      console.log('[DEBUG] GET /api/transactions called');
      console.log('[DEBUG] Using mock data:', dbUsingMockData);
      
      if (dbUsingMockData) {
        console.log('[DEBUG] Using mock data for transactions list');
        
        // Get transactions from mockdb
        let filteredTransactions = [...mockTransactions];
        
        if (req.query.accountId) {
          const accountId = parseInt(req.query.accountId as string);
          if (isNaN(accountId)) {
          return res.status(400).json({ message: "Invalid account ID" });
        }
          filteredTransactions = filteredTransactions.filter(t => t.accountId === accountId);
        }
        
        // Sort by date descending
        filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        console.log(`[DEBUG] Returning ${filteredTransactions.length} mock transactions`);
        return res.json(filteredTransactions);
      }
      
      // Original database code
      const accountId = req.query.accountId
        ? parseInt(req.query.accountId as string)
        : undefined;
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;

      if (
        (req.query.accountId && isNaN(accountId!)) ||
        (req.query.startDate && isNaN(startDate!.getTime())) ||
        (req.query.endDate && isNaN(endDate!.getTime()))
      ) {
        return res.status(400).json({ message: "Invalid query parameters" });
      }

      const transactions = await storage.listTransactions(accountId, startDate, endDate);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Error fetching transactions" });
    }
  });

  app.get("/api/transactions/:id", async (req, res) => {
    try {
      // Set cache control headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid transaction ID" });
      }
      
      if (dbUsingMockData) {
        console.log(`Using mock data for transaction ${id}`);
        
        // Get the transaction from mockdb
        const transaction = getMockTransaction(id);
        
        if (!transaction) {
          return res.status(404).json({ message: "Transaction not found" });
        }
        
        return res.json(transaction);
      }
      
      // Original database code
      const transaction = await storage.getTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.json(transaction);
    } catch (error) {
      console.error("Error fetching transaction:", error);
      res.status(500).json({ message: "Error fetching transaction" });
    }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      // Set cache control headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid transaction ID" });
      }
      
      const { type, accountId, amount, date, notes, paymentMethod, reference } = req.body;
      
      if (dbUsingMockData) {
        console.log(`Using mock data for updating transaction ${id}`);
        
        // Update the transaction in mockdb
        const updated = updateMockTransaction(id, {
          type,
          accountId: accountId ? parseInt(String(accountId)) : undefined,
          amount: amount ? parseFloat(String(amount)) : undefined,
          date,
          notes,
          paymentMethod,
          reference
        });
        
        if (!updated) {
          return res.status(404).json({ message: "Transaction not found" });
        }
        
        return res.json(updated);
      }
      
      // Original database code is not implemented yet for transaction updating
      // This is a placeholder for future implementation
      return res.status(501).json({ message: "Transaction updating not implemented yet" });
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ message: "Error updating transaction" });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      // Set cache control headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid transaction ID" });
      }
      
      if (dbUsingMockData) {
        console.log(`Using mock data for deleting transaction ${id}`);
        
        // Delete the transaction from mockdb
        const result = deleteMockTransaction(id);
        
        if (!result) {
          return res.status(404).json({ message: "Transaction not found or could not be deleted" });
        }
        
        return res.json({ message: "Transaction deleted successfully" });
      }
      
      // Original database code
      const result = await storage.deleteTransaction(id);
      if (!result) {
        return res.status(404).json({ message: "Transaction not found or could not be deleted" });
      }
      res.json({ message: "Transaction deleted successfully" });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Error deleting transaction" });
    }
  });

  // Inventory transaction routes
  app.post("/api/inventory-transactions", async (req, res) => {
    try {
      const data = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createInventoryTransaction(data);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error("Error creating inventory transaction:", error);
        res.status(500).json({ message: "Error creating inventory transaction" });
      }
    }
  });

  app.get("/api/inventory-transactions", async (req, res) => {
    try {
      const { productId, warehouseId } = req.query;
      let productIdNumber: number | undefined;
      let warehouseIdNumber: number | undefined;

      if (productId) {
        productIdNumber = parseInt(productId as string);
        if (isNaN(productIdNumber)) {
          return res.status(400).json({ message: "Invalid product ID" });
        }
      }

      if (warehouseId) {
        warehouseIdNumber = parseInt(warehouseId as string);
        if (isNaN(warehouseIdNumber)) {
          return res.status(400).json({ message: "Invalid warehouse ID" });
        }
      }

      const transactions = await storage.listInventoryTransactions(productIdNumber, warehouseIdNumber);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching inventory transactions:", error);
      res.status(500).json({ message: "Error fetching inventory transactions" });
    }
  });

  // List invoices
  app.get("/api/invoices", async (req, res) => {
    try {
      const { accountId, startDate, endDate, type, include } = req.query;
      
      // Only use mock implementation when mock flag is true
      if (dbUsingMockData) {
        console.log('USING MOCK DATA for invoice listing');
        
        // Filter by account if accountId is provided
        let filteredInvoices = mockInvoices;
        
        if (accountId) {
          const id = Number(accountId);
          filteredInvoices = filteredInvoices.filter(invoice => invoice.accountId === id);
        }
        
        // Filter by date range if provided
        if (startDate) {
          const start = new Date(startDate as string);
          filteredInvoices = filteredInvoices.filter(invoice => 
            new Date(invoice.date) >= start
          );
        }
        
        if (endDate) {
          const end = new Date(endDate as string);
          filteredInvoices = filteredInvoices.filter(invoice => 
            new Date(invoice.date) <= end
          );
        }
        
        // Filter by invoice type (sales or purchases)
        if (type === 'sales') {
          filteredInvoices = filteredInvoices.filter(invoice => 
            !invoice.invoiceNumber.startsWith('PUR-')
          );
        } else if (type === 'purchases') {
          filteredInvoices = filteredInvoices.filter(invoice => 
            invoice.invoiceNumber.startsWith('PUR-')
          );
        }
        
        // Fetch account details and invoice details for each invoice
        const invoicesWithDetails = await Promise.all(
          filteredInvoices.map(async (invoice) => {
            const result: any = { ...invoice };
            
            // Add account details if available
            if (invoice.accountId) {
              const account = mockDB.getAccount(invoice.accountId);
              if (account) {
                result.account = {
                  id: account.id,
                  name: account.name,
                  type: account.type
                };
              }
            }
            
            // Add invoice details if requested
            if (include === 'details') {
              const details = mockDB.getInvoiceDetails(invoice.id);
              if (details) {
                result.details = details;
              }
            }
            
            return result;
          })
        );
        
        return res.json(invoicesWithDetails);
      }
      
      let parsedAccountId: number | undefined;
      if (accountId && typeof accountId === 'string') {
        parsedAccountId = parseInt(accountId);
      }
      
      let parsedStartDate: Date | undefined;
      if (startDate && typeof startDate === 'string') {
        parsedStartDate = new Date(startDate);
      }
      
      let parsedEndDate: Date | undefined;
      if (endDate && typeof endDate === 'string') {
        parsedEndDate = new Date(endDate);
      }
      
      // Get invoices with their details if requested
      const invoices = include === 'details' 
        ? await storage.listInvoicesWithDetails(parsedAccountId, parsedStartDate, parsedEndDate)
        : await storage.listInvoices(parsedAccountId, parsedStartDate, parsedEndDate);
      
      // Filter by invoice type (sales or purchases)
      let filteredInvoices = invoices;
      if (type === 'sales') {
        filteredInvoices = invoices.filter(invoice => 
          !invoice.invoiceNumber.startsWith('PUR-')
        );
      } else if (type === 'purchases') {
        filteredInvoices = invoices.filter(invoice => 
          invoice.invoiceNumber.startsWith('PUR-')
        );
      }
      
      // Fetch account details for each invoice
      const invoicesWithAccounts = await Promise.all(
        filteredInvoices.map(async (invoice) => {
          const result: any = { ...invoice };
          
          if (invoice.accountId) {
            try {
              const account = await storage.getAccount(invoice.accountId);
              if (account) {
                result.account = {
                  id: account.id,
                  name: account.name,
                  type: account.type
                };
              }
            } catch (err) {
              console.error('Error fetching account details for invoice:', err);
            }
          }
          
          return result;
        })
      );
      
      res.json(invoicesWithAccounts);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Error fetching invoices" });
    }
  });

  // Invoice routes
  app.post("/api/invoices", async (req, res) => {
    try {
      console.log('Invoice data received:', JSON.stringify(req.body).slice(0, 100) + '...');
      
      // Only use mock implementation when mock flag is true
      if (dbUsingMockData) {
        console.log('USING MOCK DATA for invoice creation');
        // Mock successful invoice creation
        const newInvoice = {
          id: Math.floor(Math.random() * 10000),
          ...req.body.invoice,
          createdAt: new Date().toISOString()
        };
        
        // Add account details for proper display in UI
        if (newInvoice.accountId) {
          const account = mockDB.getAccount(newInvoice.accountId);
          if (account) {
            newInvoice.account = {
              id: account.id,
              name: account.name,
              type: account.type
            };
          }
        }
        
        // Store in our mock array
        mockInvoices.push(newInvoice);
        
        const { details } = req.body;
        const isPurchase = newInvoice.invoiceNumber && newInvoice.invoiceNumber.startsWith('PUR-');
        const isSale = newInvoice.invoiceNumber && newInvoice.invoiceNumber.startsWith('INV-');
        
        // Only update inventory and accounts if the invoice is posted (not draft)
        if (newInvoice.status === 'posted' && details && Array.isArray(details)) {
          // 1. Update inventory quantities
          if (isPurchase || isSale) {
            console.log(`Updating inventory for ${isPurchase ? 'purchase' : 'sales'} invoice`);
            
            let costOfGoodsSold = 0; // For sales, track COGS
            
            details.forEach(detail => {
              if (detail.productId && detail.quantity) {
                const product = mockDB.getProduct(detail.productId);
                
                // For purchases, add to inventory; for sales, subtract
                const quantityChange = isPurchase ? detail.quantity : -detail.quantity;
                
                // For sales, calculate cost of goods sold
                if (isSale && product) {
                  costOfGoodsSold += product.costPrice * detail.quantity;
                }
                
                mockDB.updateInventory(
                  detail.productId, 
                  newInvoice.warehouseId, 
                  quantityChange,
                  false, // don't force set, add/subtract from existing
                  newInvoice.id,
                  isPurchase ? 'purchase' : 'sale'
                );
                console.log(`${isPurchase ? 'Added' : 'Subtracted'} ${Math.abs(quantityChange)} of product ${detail.productId} ${isPurchase ? 'to' : 'from'} warehouse ${newInvoice.warehouseId}`);
              }
            });
            
            // 2. Create accounting entries
            if (isPurchase) {
              // PURCHASE ACCOUNTING ENTRIES
              // من ح/ المخزون
              // إلى ح/ النقدية (أو الموردين إذا كانت مشتريات آجلة)
              
              // 2.1 Create inventory increase entry - مخزون
              createMockTransaction({
                type: "journal",
                accountId: 3, // Inventory account ID (المخزون)
                amount: newInvoice.total,
                date: new Date(newInvoice.date),
                notes: "زيادة المخزون - فاتورة مشتريات",
                reference: newInvoice.invoiceNumber,
                paymentMethod: "journal",
                isDebit: true // مدين (Debit entry)
              });
              
              // 2.2 Supplier entry if on credit, cash if paid immediately
              createMockTransaction({
                type: "journal",
                accountId: newInvoice.accountId, // Supplier account
                amount: newInvoice.total,
                date: new Date(newInvoice.date),
                notes: "فاتورة مشتريات",
                reference: newInvoice.invoiceNumber,
                paymentMethod: "journal",
                isDebit: false // دائن (Credit entry)
              });
              
            } else if (isSale) {
              // SALES ACCOUNTING ENTRIES
              // 1. من ح/ العميل (أو النقدية إذا كان دفع فوري)
              //    إلى ح/ المبيعات
              // 2. من ح/ تكلفة البضاعة المباعة
              //    إلى ح/ المخزون
              
              // 3.1 Customer/Cash entry - زيادة رصيد العميل
              createMockTransaction({
                type: "journal",
                accountId: newInvoice.accountId, // Customer account
                amount: newInvoice.total,
                date: new Date(newInvoice.date),
                notes: "فاتورة مبيعات",
                reference: newInvoice.invoiceNumber,
                paymentMethod: "journal",
                isDebit: true // مدين (Debit entry for asset increase)
              });
              
              // 3.2 Sales Revenue entry - الإيرادات
              createMockTransaction({
                type: "journal",
                accountId: 5, // Sales revenue account ID (المبيعات)
                amount: newInvoice.total,
                date: new Date(newInvoice.date),
                notes: "إيرادات مبيعات",
                reference: newInvoice.invoiceNumber,
                paymentMethod: "journal",
                isDebit: false // دائن (Credit entry for revenue)
              });
              
              // 3.3 Cost of Goods Sold entry - تكلفة البضاعة المباعة
              createMockTransaction({
                type: "journal",
                accountId: 6, // COGS account ID (تكلفة البضاعة المباعة)
                amount: costOfGoodsSold,
                date: new Date(newInvoice.date),
                notes: "تكلفة البضاعة المباعة",
                reference: newInvoice.invoiceNumber,
                paymentMethod: "journal",
                isDebit: true // مدين (Debit entry for expense)
              });
              
              // 3.4 Inventory decrease entry - نقص المخزون
              createMockTransaction({
                type: "journal",
                accountId: 3, // Inventory account ID (المخزون)
                amount: costOfGoodsSold,
                date: new Date(newInvoice.date),
                notes: "تخفيض المخزون - بيع بضاعة",
                reference: newInvoice.invoiceNumber,
                paymentMethod: "journal",
                isDebit: false // دائن (Credit entry for asset decrease)
              });
            }
            
            // 3. Update account balance
            if (newInvoice.accountId) {
              const account = mockDB.getAccount(newInvoice.accountId);
              if (account) {
                // Calculate how this affects the account balance
                // For purchases: increase supplier balance (we owe them money)
                // For sales: increase customer balance (they owe us money)
                const currentBalance = account.currentBalance || 0;
                let newBalance = currentBalance;
                
                if (isPurchase) {
                  // For purchases to suppliers, negative balance means we owe money
                  newBalance = currentBalance - newInvoice.total;
                } else if (isSale) {
                  // For sales to customers, positive balance means they owe money
                  newBalance = currentBalance + newInvoice.total;
                }
                
                // Update the account balance
                mockDB.updateAccount(newInvoice.accountId, {
                  currentBalance: newBalance
                });
                
                console.log(`Updated ${isPurchase ? 'supplier' : 'customer'} account balance from ${currentBalance} to ${newBalance}`);
              }
            }
          }
        }
        
        // Log success for debugging
        console.log('Created mock invoice:', newInvoice.id);
        
        // Return success response with 201 Created status
        return res.status(201).json(newInvoice);
      }
      
      // Original code for database connection
      const { invoice, details } = req.body;
      
      if (!invoice || !details || !Array.isArray(details)) {
        console.log('Error: Invoice and details array are required');
        return res.status(400).json({ message: "Invoice and details array are required" });
      }

      // Convert string dates to Date objects before validation
      if (typeof invoice.date === 'string') {
        try {
          invoice.date = new Date(invoice.date);
        } catch (err) {
          return res.status(400).json({ message: "Invalid date format" });
        }
      }
      
      if (typeof invoice.dueDate === 'string') {
        try {
          invoice.dueDate = new Date(invoice.dueDate);
        } catch (err) {
          return res.status(400).json({ message: "Invalid due date format" });
        }
      }

      console.log('DETAILED INVOICE DATA (after date conversion):', JSON.stringify({
        ...invoice,
        date: invoice.date instanceof Date ? invoice.date.toISOString() : invoice.date,
        dueDate: invoice.dueDate instanceof Date ? invoice.dueDate.toISOString() : invoice.dueDate
      }, null, 2));
      
      try {
        // Try to parse with the schema
        const invoiceData = insertInvoiceSchema.parse(invoice);
        console.log('Invoice data passed schema validation!');
      } catch (parseError) {
        console.error('VALIDATION ERROR:', parseError);
        // Re-throw to be caught by the outer try/catch
        throw parseError;
      }

      // Validate each detail item
      for (const detail of details) {
        if (!detail.productId || !detail.quantity || !detail.unitPrice || !detail.total) {
          console.log('Error: Detail item missing required fields');
          return res.status(400).json({ message: "Each detail must include productId, quantity, unitPrice, and total" });
        }
      }

      // Additional validation for posted status
      const isPurchase = invoice.invoiceNumber && invoice.invoiceNumber.startsWith('PUR-');
      if (invoice.status === 'posted') {
        // Verify account is specified for posted invoices
        if (!invoice.accountId) {
          return res.status(400).json({ 
            message: `${isPurchase ? 'Supplier' : 'Customer'} account is required for posted invoices`
          });
        }

        // Verify warehouse is specified
        if (!invoice.warehouseId) {
          return res.status(400).json({ 
            message: "Warehouse is required for posted invoices"
          });
        }

        // Log important information for posted invoices
        console.log(`Processing ${isPurchase ? 'purchase' : 'sales'} invoice with status 'posted'`);
        console.log(`Invoice contains ${details.length} items with total: ${invoice.total}`);
      }

      // Create the invoice
      const newInvoice = await storage.createInvoice(invoice, details);
      
      // Fetch account details to include in response
      if (newInvoice && newInvoice.accountId) {
        try {
          const account = await storage.getAccount(newInvoice.accountId);
          if (account) {
            (newInvoice as any).account = {
              id: account.id,
              name: account.name,
              type: account.type
            };
          }
        } catch (err) {
          console.error('Error fetching account details for invoice:', err);
        }
      }
      
      // Log successful creation
      console.log(`Successfully created ${isPurchase ? 'purchase' : 'sales'} invoice with ID ${newInvoice.id} and status ${newInvoice.status}`);
      
      res.status(201).json(newInvoice);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("ZOD VALIDATION ERROR:", fromZodError(error).message);
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error("Error creating invoice:", error);
        // Check for more specific error messages
        let errorMessage = "Error creating invoice";
        if (error instanceof Error) {
          if (error.message.includes('inventory')) {
            errorMessage = "Error updating inventory: " + error.message;
          } else if (error.message.includes('account')) {
            errorMessage = "Error processing account details: " + error.message;
          }
        }
        res.status(500).json({ message: errorMessage });
      }
    }
  });

  // Get next invoice number API endpoint
  app.get("/api/next-invoice-number", async (req, res) => {
    try {
      const { type } = req.query;
      const isPurchase = type === 'purchase';
      
      if (dbUsingMockData) {
        // For mock data, get last invoice from mock invoices
        const lastInvoice = mockInvoices
          .filter(invoice => {
            if (isPurchase) {
              return invoice.invoiceNumber.startsWith('PUR-');
            } else {
              return invoice.invoiceNumber.startsWith('INV-');
            }
          })
          .sort((a, b) => {
            // Extract numeric part from invoice number
            const numA = parseInt(a.invoiceNumber.split('-')[1]) || 0;
            const numB = parseInt(b.invoiceNumber.split('-')[1]) || 0;
            return numB - numA; // Sort in descending order
          })[0];
        
        let nextNumber;
        
        if (lastInvoice) {
          // Extract number part from the last invoice number
          const lastNumStr = lastInvoice.invoiceNumber.split('-')[1];
          const lastNum = parseInt(lastNumStr);
          const nextNum = lastNum + 1;
          nextNumber = isPurchase ? `PUR-${nextNum}` : `INV-${nextNum}`;
        } else {
          // No existing invoices, start with 1
          nextNumber = isPurchase ? 'PUR-1' : 'INV-1';
        }
        
        return res.json({ number: nextNumber });
      }
      
      // For real database, use the storage helper function
      try {
        const nextNumber = await storage.getNextInvoiceNumber(isPurchase);
        res.json({ number: nextNumber });
      } catch (error) {
        console.error('Error getting next invoice number:', error);
        res.status(500).json({ message: 'Failed to get next invoice number' });
      }
    } catch (error) {
      console.error('Error in next-invoice-number endpoint:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get invoice by ID
  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }

      // Get invoice with details from storage
      const result = await storage.getInvoice(id);
      if (!result || !result.invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Get account details if available
      let account;
      if (result.invoice.accountId) {
        try {
          account = await storage.getAccount(result.invoice.accountId);
        } catch (err) {
          console.error('Error fetching account details:', err);
        }
      }

      // Get product details for each invoice detail
      const detailsWithProducts = await Promise.all(
        (result.details || []).map(async (detail) => {
          try {
            const product = await storage.getProduct(detail.productId);
            return {
              ...detail,
              productName: product?.name || 'منتج غير معروف'
            };
          } catch (err) {
            console.error(`Error fetching product details for ID ${detail.productId}:`, err);
            return {
              ...detail,
              productName: 'منتج غير معروف'
            };
          }
        })
      );

      // Combine all data
      const fullInvoice = {
        ...result.invoice,
        details: detailsWithProducts,
        account: account ? {
          id: account.id,
          name: account.name,
          type: account.type
        } : null
      };

      res.json(fullInvoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Error fetching invoice" });
    }
  });

  app.patch("/api/invoices/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      const invoice = await storage.updateInvoiceStatus(id, status);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice status:", error);
      res.status(500).json({ message: "Error updating invoice status" });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }
      const result = await storage.deleteInvoice(id);
      if (!result) {
        return res.status(404).json({ message: "Invoice not found or could not be deleted" });
      }
      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Error deleting invoice" });
    }
  });

  // Purchase routes
  app.post("/api/purchases", async (req, res) => {
    try {
      const { purchase, details } = req.body;
      if (!purchase || !details || !Array.isArray(details)) {
        return res.status(400).json({ message: "Purchase and details array are required" });
      }

      const purchaseData = insertPurchaseSchema.parse(purchase);
      // Validate each detail item
      for (const detail of details) {
        if (!detail.productId || !detail.quantity || !detail.unitPrice || !detail.total) {
          return res.status(400).json({ message: "Each detail must include productId, quantity, unitPrice, and total" });
        }
      }

      const newPurchase = await storage.createPurchase(purchaseData, details);
      res.status(201).json(newPurchase);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error("Error creating purchase:", error);
        res.status(500).json({ message: "Error creating purchase" });
      }
    }
  });

  app.get("/api/purchases", async (req, res) => {
    try {
      const { accountId, startDate, endDate } = req.query;
      let accountIdNumber: number | undefined;
      let startDateTime: Date | undefined;
      let endDateTime: Date | undefined;

      if (accountId) {
        accountIdNumber = parseInt(accountId as string);
        if (isNaN(accountIdNumber)) {
          return res.status(400).json({ message: "Invalid account ID" });
        }
      }

      if (startDate) {
        startDateTime = new Date(startDate as string);
        if (isNaN(startDateTime.getTime())) {
          return res.status(400).json({ message: "Invalid start date" });
        }
      }

      if (endDate) {
        endDateTime = new Date(endDate as string);
        if (isNaN(endDateTime.getTime())) {
          return res.status(400).json({ message: "Invalid end date" });
        }
      }

      const purchases = await storage.listPurchases(accountIdNumber, startDateTime, endDateTime);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ message: "Error fetching purchases" });
    }
  });

  app.get("/api/purchases/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid purchase ID" });
      }
      const purchase = await storage.getPurchase(id);
      if (!purchase) {
        return res.status(404).json({ message: "Purchase not found" });
      }
      res.json(purchase);
    } catch (error) {
      console.error("Error fetching purchase:", error);
      res.status(500).json({ message: "Error fetching purchase" });
    }
  });

  app.patch("/api/purchases/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid purchase ID" });
      }
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      const purchase = await storage.updatePurchaseStatus(id, status);
      if (!purchase) {
        return res.status(404).json({ message: "Purchase not found" });
      }
      res.json(purchase);
    } catch (error) {
      console.error("Error updating purchase status:", error);
      res.status(500).json({ message: "Error updating purchase status" });
    }
  });

  app.delete("/api/purchases/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid purchase ID" });
      }
      const result = await storage.deletePurchase(id);
      if (!result) {
        return res.status(404).json({ message: "Purchase not found or could not be deleted" });
      }
      res.json({ message: "Purchase deleted successfully" });
    } catch (error) {
      console.error("Error deleting purchase:", error);
      res.status(500).json({ message: "Error deleting purchase" });
    }
  });

  // Settings routes
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings || {});
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Error fetching settings" });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const data = insertSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateSettings(data);
      res.json(settings);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        console.error("Error updating settings:", error);
        res.status(500).json({ message: "Error updating settings" });
      }
    }
  });

  // Initialize admin user if no users exist
  try {
    const users = await storage.listUsers();
    if (users.length === 0) {
      const hashedPassword = await hash("admin", 10);
      await storage.createUser({
        username: "admin",
        password: hashedPassword,
        fullName: "System Administrator",
        role: "admin"
      });
      console.log("Created default admin user");
    }
  } catch (error) {
    console.error("Error checking/creating admin user:", error);
  }

  // Initialize default settings if not exist
  try {
    const settings = await storage.getSettings();
    if (!settings) {
      await storage.updateSettings({
        companyName: "شركة الريادي لتوزيع المواد الغذائية",
        address: "١٤ شارع نور مصر سالم",
        phone: "01006779000",
        currency: "EGP",
        currencySymbol: "ج.م",
      });
      console.log("Created default settings");
    }
  } catch (error) {
    console.error("Error checking/creating settings:", error);
  }

  // Initialize default warehouse if not exist
  try {
    const warehouses = await storage.listWarehouses();
    if (warehouses.length === 0) {
      await storage.createWarehouse({
        name: "المخزن الرئيسي",
        isDefault: true
      });
      console.log("Created default warehouse");
    }
  } catch (error) {
    console.error("Error checking/creating default warehouse:", error);
  }

  // Backup route
  app.post("/api/backup", async (req, res) => {
    try {
      const { backupPath } = req.body;
      
      if (!backupPath) {
        return res.status(400).json({ message: "Backup path is required" });
      }
      
      // In a real implementation, we would create a database backup file
      // and store it at the specified path.
      // For this example, we'll simulate a successful backup operation
      
      // Simulate backup process delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      res.status(200).json({ 
        success: true, 
        message: "Backup created successfully",
        backupFile: `${backupPath}/backup_${new Date().toISOString().replace(/[:.]/g, "-")}.sql` 
      });
    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ message: "Error creating backup" });
    }
  });
  
  // Restore route
  app.post("/api/restore", async (req, res) => {
    try {
      const { backupFile, restoreData, restoreTemplates } = req.body;
      
      if (!backupFile) {
        return res.status(400).json({ message: "Backup file path is required" });
      }
      
      if (!restoreData && !restoreTemplates) {
        return res.status(400).json({ message: "At least one restore option must be selected" });
      }
      
      // In a real implementation, we would restore the database from the backup file
      // For this example, we'll simulate a successful restore operation
      
      // Simulate restore process delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      res.status(200).json({ 
        success: true, 
        message: "Database restored successfully",
        restored: {
          data: restoreData,
          templates: restoreTemplates
        }
      });
    } catch (error) {
      console.error("Error restoring database:", error);
      res.status(500).json({ message: "Error restoring database" });
    }
  });

  // Reports route
  app.get("/api/reports", async (req, res) => {
    try {
      const { type, startDate, endDate } = req.query;
      
      console.log(`Generating report: type=${type}, startDate=${startDate}, endDate=${endDate}`);
      console.log(`DEBUG - Report API - Using mock data: ${dbUsingMockData}`);
      
      if (!type) {
        return res.status(400).json({ message: "Report type is required" });
      }
      
      let reportData: any[] = [];
      
      // Validate date parameters
      let validStartDate: Date | undefined;
      let validEndDate: Date | undefined;
      
      if (startDate && typeof startDate === 'string') {
        try {
          validStartDate = new Date(startDate);
          if (isNaN(validStartDate.getTime())) {
            return res.status(400).json({ message: "Invalid start date format" });
          }
        } catch (error) {
          console.error("Error parsing start date:", error);
          return res.status(400).json({ message: "Invalid start date format" });
        }
      }
      
      if (endDate && typeof endDate === 'string') {
        try {
          validEndDate = new Date(endDate);
          if (isNaN(validEndDate.getTime())) {
            return res.status(400).json({ message: "Invalid end date format" });
          }
        } catch (error) {
          console.error("Error parsing end date:", error);
          return res.status(400).json({ message: "Invalid end date format" });
        }
      }
      
      // Use mock data if configured
      if (dbUsingMockData) {
        console.log(`Using mock data for ${type} report`);
        // Generate sample data based on report type
        switch (type) {
          case 'sales':
            reportData = generateSampleSalesData();
            break;
          case 'purchases':
            reportData = generateSamplePurchasesData();
            break;
          case 'inventory':
            reportData = generateSampleInventoryData();
            break;
          case 'customers':
            reportData = generateSampleCustomersData();
            break;
          case 'suppliers':
            reportData = generateSampleSuppliersData();
            break;
          default:
            return res.status(400).json({ message: "Invalid report type" });
        }
      } else {
        console.log(`Fetching real data for ${type} report`);
        // Fetch real data from database based on report type
        switch (type) {
          case 'sales':
            // Fetch real sales data
            const salesData = await storage.listInvoices(undefined, validStartDate, validEndDate);
            // Filter sales invoices and fetch account info for each
            const salesWithAccounts = await Promise.all(
              salesData.filter(invoice => invoice.invoiceNumber.startsWith('INV-'))
                .map(async (invoice) => {
                  let accountName = '';
                  // Get account details if available
                  if (invoice.accountId) {
                    try {
                      const account = await storage.getAccount(invoice.accountId);
                      if (account) {
                        accountName = account.name;
                      }
                    } catch (err) {
                      console.error('Error fetching account details for invoice:', err);
                    }
                  }
                  return {
                    invoiceNumber: invoice.invoiceNumber,
                    date: invoice.date,
                    accountName: accountName,
                    total: invoice.total,
                    status: invoice.status
                  };
                })
            );
            reportData = salesWithAccounts;
            break;
          case 'purchases':
            try {
              // Fetch real purchases data using the listPurchases method
              const purchasesData = await storage.listPurchases(undefined, validStartDate, validEndDate);
              
              // If no purchases are found, try to find them using invoices with PUR prefix
              if (purchasesData.length === 0) {
                console.log('No purchases found using listPurchases, falling back to alternative method');
                const allInvoices = await storage.listInvoices(undefined, validStartDate, validEndDate);
                const purchaseInvoices = allInvoices.filter(inv => inv.invoiceNumber.startsWith('PUR-'));
                
                // Map and add account names
                reportData = await Promise.all(
                  purchaseInvoices.map(async (invoice) => {
                    let accountName = '';
                    // Get account details if available
                    if (invoice.accountId) {
                      try {
                        const account = await storage.getAccount(invoice.accountId);
                        if (account) {
                          accountName = account.name;
                        }
                      } catch (err) {
                        console.error('Error fetching account details for purchase:', err);
                      }
                    }
                    return {
                      invoiceNumber: invoice.invoiceNumber,
                      date: invoice.date,
                      accountName: accountName,
                      total: invoice.total,
                      status: invoice.status
                    };
                  })
                );
              } else {
                // Map purchase data with account names
                reportData = await Promise.all(
                  purchasesData.map(async (purchase) => {
                    let accountName = '';
                    // Get account details if available
                    if (purchase.accountId) {
                      try {
                        const account = await storage.getAccount(purchase.accountId);
                        if (account) {
                          accountName = account.name;
                        }
                      } catch (err) {
                        console.error('Error fetching account details for purchase:', err);
                      }
                    }
                    return {
                      invoiceNumber: purchase.purchaseNumber,
                      date: purchase.date,
                      accountName: accountName,
                      total: purchase.total,
                      status: purchase.status
                    };
                  })
                );
              }
            } catch (error) {
              console.error("Error fetching purchases:", error);
              // Fallback - search for purchases in invoices
              const allInvoices = await storage.listInvoices(undefined, validStartDate, validEndDate);
              const purchaseInvoices = allInvoices.filter(inv => inv.invoiceNumber.startsWith('PUR-'));
              
              reportData = await Promise.all(
                purchaseInvoices.map(async (invoice) => {
                  let accountName = '';
                  // Get account details if available
                  if (invoice.accountId) {
                    try {
                      const account = await storage.getAccount(invoice.accountId);
                      if (account) {
                        accountName = account.name;
                      }
                    } catch (err) {
                      console.error('Error fetching account details for purchase:', err);
                    }
                  }
                  return {
                    invoiceNumber: invoice.invoiceNumber,
                    date: invoice.date,
                    accountName: accountName,
                    total: invoice.total,
                    status: invoice.status
                  };
                })
              );
            }
            break;
          case 'inventory':
            // Fetch real inventory data
            const inventoryData = await storage.listInventory();
            // Get product details for each inventory item
            const products = await storage.listProducts();
            
            reportData = inventoryData.map(item => {
              const product = products.find(p => p.id === item.productId);
              return {
                id: item.productId,
                name: product?.name || 'غير معروف',
                quantity: item.quantity,
                costPrice: product?.costPrice || 0,
                sellPrice1: product?.sellPrice1 || 0,
                totalValue: (item.quantity || 0) * (product?.costPrice || 0)
              };
            });
            break;
          case 'customers':
            // Fetch real customers data
            const customersData = await storage.listAccounts('customer');
            reportData = await Promise.all(customersData.map(async customer => {
              // Get invoices for this customer
              const invoices = await storage.listInvoices(customer.id);
              const customerInvoices = invoices.filter(inv => inv.invoiceNumber.startsWith('INV-'));
              // Calculate total sales
              const totalSales = customerInvoices.reduce((sum, inv) => sum + inv.total, 0);
              // Get latest transaction date
              const latestInvoice = customerInvoices.sort((a, b) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
              )[0];
              
              return {
                id: customer.id,
                name: customer.name,
                invoiceCount: customerInvoices.length,
                totalSales: totalSales,
                lastTransaction: latestInvoice?.date
              };
            }));
            break;
          case 'suppliers':
            // Fetch real suppliers data
            const suppliersData = await storage.listAccounts('supplier');
            reportData = await Promise.all(suppliersData.map(async supplier => {
              try {
                // First try to get purchases using the regular method
                let purchases = await storage.listPurchases(supplier.id);
                
                // If no purchases are found, look for invoices with PUR prefix
                if (purchases.length === 0) {
                  console.log(`No purchases found using listPurchases for supplier ${supplier.id}, checking invoices`);
                  const allInvoices = await storage.listInvoices(supplier.id);
                  purchases = allInvoices.filter(inv => inv.invoiceNumber.startsWith('PUR-'));
                }
                
                // Calculate total purchases
                const totalPurchases = purchases.reduce((sum, inv) => sum + inv.total, 0);
                
                // Get latest transaction date
                const latestPurchase = purchases.length > 0 ? 
                  purchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;
                
                return {
                  id: supplier.id,
                  name: supplier.name,
                  invoiceCount: purchases.length,
                  totalPurchases: totalPurchases,
                  lastTransaction: latestPurchase?.date
                };
              } catch (error) {
                console.error(`Error processing supplier ${supplier.id}:`, error);
                return {
                  id: supplier.id,
                  name: supplier.name,
                  invoiceCount: 0,
                  totalPurchases: 0,
                  lastTransaction: null
                };
              }
            }));
            break;
          default:
            return res.status(400).json({ message: "Invalid report type" });
        }
      }
      
      console.log(`Generated ${reportData.length} records for ${type} report`);
      
      return res.status(200).json(reportData);
    } catch (error) {
      console.error("Error generating report:", error);
      return res.status(500).json({ message: "Error generating report: " + (error instanceof Error ? error.message : "Unknown error") });
    }
  });
  
  // Financial Reports route
  app.get("/api/finance/reports", async (req, res) => {
    try {
      const { type, startDate, endDate } = req.query;
      
      if (!type) {
        return res.status(400).json({ message: "Report type is required" });
      }
      
      let reportData: any = {};
      
      // Generate sample data based on report type
      switch (type) {
        case 'income':
          reportData = generateIncomeStatementData();
          break;
        case 'balance':
          reportData = generateBalanceSheetData();
          break;
        case 'cashflow':
          reportData = generateCashFlowData();
          break;
        case 'accounts':
          reportData = generateAccountsStatementData();
          break;
        default:
          return res.status(400).json({ message: "Invalid financial report type" });
      }
      
      // In a real implementation, we would filter the data based on start and end dates
      // and retrieve the data from the database
      
      res.status(200).json(reportData);
    } catch (error) {
      console.error("Error generating financial report:", error);
      res.status(500).json({ message: "Error generating financial report" });
    }
  });

  // Account Statement API
  app.get("/api/accounts/:id/statement", async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      if (isNaN(accountId)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }

      const { startDate, endDate } = req.query;
      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate && typeof startDate === 'string') {
        parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
          return res.status(400).json({ message: "Invalid start date format" });
        }
      }

      if (endDate && typeof endDate === 'string') {
        parsedEndDate = new Date(endDate);
        if (isNaN(parsedEndDate.getTime())) {
          return res.status(400).json({ message: "Invalid end date format" });
        }
      }

      // Use mock data if configured
      if (dbUsingMockData) {
        console.log('USING MOCK DATA for account statement');
        const mockStatement = generateAccountsStatementData();
        mockStatement.account.id = accountId;
        
        // Try to find a real account name if available
        const account = mockDB.getAccount(accountId);
        if (account) {
          mockStatement.account.name = account.name;
          mockStatement.account.type = account.type;
        }
        
        return res.json(mockStatement);
      }

      // Get account statement from database
      const statement = await storage.getAccountStatement(accountId, parsedStartDate, parsedEndDate);
      res.json(statement);
    } catch (error) {
      console.error("Error generating account statement:", error);
      res.status(500).json({ message: "Error generating account statement" });
    }
  });

  // Account Last Transactions API
  app.get("/api/accounts/:id/last-transactions", async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      if (isNaN(accountId)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }

      // Use mock data if configured
      if (dbUsingMockData) {
        console.log('USING MOCK DATA for account last transactions');
        
        // Try to find a real account
        const account = mockDB.getAccount(accountId);
        if (!account) {
          return res.status(404).json({ message: "Account not found" });
        }
        
        // Generate mock last transactions
        const mockData = {
          lastTransaction: {
            id: 12345,
            accountId: accountId,
            type: account.type === 'customer' ? 'credit' : 'debit',
            amount: Math.floor(Math.random() * 10000) / 100,
            date: new Date().toISOString(),
            reference: account.type === 'customer' ? 'INV-1234' : 'PUR-1234'
          },
          lastInvoice: {
            id: 54321,
            accountId: accountId,
            invoiceNumber: account.type === 'customer' ? 'INV-1234' : 'PUR-1234',
            date: new Date().toISOString(),
            total: Math.floor(Math.random() * 10000) / 100,
            status: 'posted'
          }
        };
        
        return res.json(mockData);
      }

      // Get last transactions from database
      const lastTransactions = await storage.getAccountLastTransactions(accountId);
      res.json(lastTransactions);
    } catch (error) {
      console.error("Error getting account last transactions:", error);
      res.status(500).json({ message: "Error getting account last transactions" });
    }
  });

  // Helper functions to generate sample report data
  function generateSampleSalesData() {
    return [
      { 
        invoiceNumber: "INV-1001", 
        date: "2023-11-01", 
        accountName: "عميل 1", 
        total: 1250.50, 
        status: "paid" 
      },
      { 
        invoiceNumber: "INV-1002", 
        date: "2023-11-03", 
        accountName: "عميل 2", 
        total: 880.00, 
        status: "partially_paid" 
      },
      // Add more sample data
      { 
        invoiceNumber: "INV-1003", 
        date: "2023-11-05", 
        accountName: "عميل 3", 
        total: 1500.75, 
        status: "pending" 
      },
      { 
        invoiceNumber: "INV-1004", 
        date: "2023-11-10", 
        accountName: "عميل 1", 
        total: 750.25, 
        status: "paid" 
      },
      { 
        invoiceNumber: "INV-1005", 
        date: "2023-11-15", 
        accountName: "عميل 4", 
        total: 3200.00, 
        status: "paid" 
      }
    ];
  }
  
  // Helper function to generate sample purchases data
  function generateSamplePurchasesData() {
    return [
      { 
        invoiceNumber: "PUR-1001", 
        date: "2023-11-02", 
        accountName: "مورد 1", 
        total: 2250.50, 
        status: "paid" 
      },
      { 
        invoiceNumber: "PUR-1002", 
        date: "2023-11-05", 
        accountName: "مورد 2", 
        total: 1880.00, 
        status: "partially_paid" 
      },
      { 
        invoiceNumber: "PUR-1003", 
        date: "2023-11-08", 
        accountName: "مورد 1", 
        total: 3500.75, 
        status: "pending" 
      },
      { 
        invoiceNumber: "PUR-1004", 
        date: "2023-11-12", 
        accountName: "مورد 3", 
        total: 950.25, 
        status: "paid" 
      },
      { 
        invoiceNumber: "PUR-1005", 
        date: "2023-11-18", 
        accountName: "مورد 2", 
        total: 4200.00, 
        status: "paid" 
      }
    ];
  }
  
  // Helper function to generate sample inventory data
  function generateSampleInventoryData() {
    return [
      {
        productId: 1,
        productName: "منتج 1",
        productCode: "P001",
        quantity: 50,
        costPrice: 100,
        sellPrice: 150,
        value: 5000,
        warehouseName: "المخزن الرئيسي"
      },
      {
        productId: 2,
        productName: "منتج 2",
        productCode: "P002",
        quantity: 30,
        costPrice: 200,
        sellPrice: 300,
        value: 6000,
        warehouseName: "المخزن الرئيسي"
      },
      {
        productId: 3,
        productName: "منتج 3",
        productCode: "P003",
        quantity: 15,
        costPrice: 150,
        sellPrice: 225,
        value: 2250,
        warehouseName: "المخزن الرئيسي"
      },
      {
        productId: 4,
        productName: "منتج 4",
        productCode: "P004",
        quantity: 40,
        costPrice: 80,
        sellPrice: 120,
        value: 3200,
        warehouseName: "المخزن الرئيسي"
      },
      {
        productId: 5,
        productName: "منتج 5",
        productCode: "P005",
        quantity: 25,
        costPrice: 120,
        sellPrice: 180,
        value: 3000,
        warehouseName: "المخزن الرئيسي"
      }
    ];
  }
  
  // Helper function to generate sample customers data
  function generateSampleCustomersData() {
    return [
      {
        id: 1,
        name: "عميل 1",
        type: "customer",
        currentBalance: 2500,
        lastTransaction: {
          date: "2023-11-15",
          amount: 500,
          type: "payment"
        },
        totalPurchases: 8000,
        totalPayments: 5500
      },
      {
        id: 2,
        name: "عميل 2",
        type: "customer",
        currentBalance: 1800,
        lastTransaction: {
          date: "2023-11-10",
          amount: 300,
          type: "payment"
        },
        totalPurchases: 4500,
        totalPayments: 2700
      },
      {
        id: 3,
        name: "عميل 3",
        type: "customer",
        currentBalance: 1200,
        lastTransaction: {
          date: "2023-11-05",
          amount: 1000,
          type: "invoice"
        },
        totalPurchases: 3200,
        totalPayments: 2000
      },
      {
        id: 4,
        name: "عميل 4",
        type: "customer",
        currentBalance: 3500,
        lastTransaction: {
          date: "2023-11-20",
          amount: 1500,
          type: "invoice"
        },
        totalPurchases: 10000,
        totalPayments: 6500
      },
      {
        id: 5,
        name: "عميل 5",
        type: "customer",
        currentBalance: -500, // عميل دائن (لهم)
        lastTransaction: {
          date: "2023-11-22",
          amount: 1000,
          type: "payment"
        },
        totalPurchases: 5000,
        totalPayments: 5500
      }
    ];
  }
  
  // Helper function to generate sample suppliers data
  function generateSampleSuppliersData() {
    return [
      {
        id: 11,
        name: "مورد 1",
        type: "supplier",
        currentBalance: -3500, // مورد دائن (لهم)
        lastTransaction: {
          date: "2023-11-18",
          amount: 1000,
          type: "payment"
        },
        totalPurchases: 12000,
        totalPayments: 8500
      },
      {
        id: 12,
        name: "مورد 2",
        type: "supplier",
        currentBalance: -2200,
        lastTransaction: {
          date: "2023-11-12",
          amount: 2200,
          type: "invoice"
        },
        totalPurchases: 8500,
        totalPayments: 6300
      },
      {
        id: 13,
        name: "مورد 3",
        type: "supplier",
        currentBalance: -1500,
        lastTransaction: {
          date: "2023-11-08",
          amount: 500,
          type: "payment"
        },
        totalPurchases: 4500,
        totalPayments: 3000
      },
      {
        id: 14,
        name: "مورد 4",
        type: "supplier",
        currentBalance: 800, // مورد مدين (علينا)
        lastTransaction: {
          date: "2023-11-25",
          amount: 2000,
          type: "payment"
        },
        totalPurchases: 5000,
        totalPayments: 5800
      },
      {
        id: 15,
        name: "مورد 5",
        type: "supplier",
        currentBalance: -4200,
        lastTransaction: {
          date: "2023-11-15",
          amount: 4200,
          type: "invoice"
        },
        totalPurchases: 15000,
        totalPayments: 10800
      }
    ];
  }
  
  // Helper functions to generate financial reports data
  function generateIncomeStatementData() {
    return {
      periodStart: "2024-05-01",
      periodEnd: "2024-05-31",
      revenue: {
        sales: 45000.00,
        other: 2500.00,
        total: 47500.00
      },
      expenses: {
        cogs: 28000.00,
        salaries: 8500.00,
        rent: 3000.00,
        utilities: 1200.00,
        other: 1800.00,
        total: 42500.00
      },
      netIncome: 5000.00
    };
  }
  
  function generateBalanceSheetData() {
    return {
      asOf: "2024-05-31",
      assets: {
        current: {
          cash: 25000.00,
          accounts_receivable: 15000.00,
          inventory: 35000.00,
          total: 75000.00
        },
        nonCurrent: {
          equipment: 40000.00,
          furniture: 10000.00,
          vehicles: 25000.00,
          total: 75000.00
        },
        totalAssets: 150000.00
      },
      liabilities: {
        current: {
          accounts_payable: 18000.00,
          short_term_debt: 7000.00,
          total: 25000.00
        },
        nonCurrent: {
          long_term_debt: 40000.00,
          total: 40000.00
        },
        totalLiabilities: 65000.00
      },
      equity: {
        capital: 70000.00,
        retained_earnings: 15000.00,
        total: 85000.00
      }
    };
  }
  
  function generateCashFlowData() {
    return {
      periodStart: "2024-05-01",
      periodEnd: "2024-05-31",
      operating: {
        netIncome: 5000.00,
        depreciation: 1200.00,
        accountsReceivable: -3000.00,
        inventory: -1500.00,
        accountsPayable: 2000.00,
        netCashOperating: 3700.00
      },
      investing: {
        equipmentPurchase: -4000.00,
        netCashInvesting: -4000.00
      },
      financing: {
        loanRepayment: -1200.00,
        netCashFinancing: -1200.00
      },
      netCashFlow: -1500.00,
      startingCash: 26500.00,
      endingCash: 25000.00
    };
  }
  
  function generateAccountsStatementData() {
    return {
      account: {
        id: 1,
        name: "عميل افتراضي",
        type: "customer"
      },
      periodStart: "2024-05-01",
      periodEnd: "2024-05-31",
      startingBalance: 12000.00,
      transactions: [
        {
          date: "2024-05-03",
          type: "debit",
          reference: "INV-1005",
          amount: 3500.00,
          balance: 15500.00
        },
        {
          date: "2024-05-12",
          type: "credit",
          reference: "PAY-2234",
          amount: 5000.00,
          balance: 10500.00
        },
        {
          date: "2024-05-18",
          type: "debit",
          reference: "INV-1012",
          amount: 1800.00,
          balance: 12300.00
        },
        {
          date: "2024-05-25",
          type: "credit",
          reference: "PAY-2240",
          amount: 2300.00,
          balance: 10000.00
        }
      ],
      endingBalance: 10000.00,
      totalDebits: 5300.00,
      totalCredits: 7300.00
    };
  }

  // Add a simple stats endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      // Set cache control headers to enable caching for 30 seconds
      // This will reduce the number of calls made to this endpoint
      res.setHeader('Cache-Control', 'public, max-age=30');
      res.setHeader('Expires', new Date(Date.now() + 30000).toUTCString());
      
      // Reduce logging - only log occasionally for debugging
      // console.log('[DEBUG] GET /api/stats called');
      
      if (dbUsingMockData) {
        // Return mock stats
        const mockStats = {
          totalSales: 25600.50,
          totalPurchases: 18450.75,
          totalCustomers: 10,
          totalSuppliers: 5,
          totalProducts: 25,
          totalCategories: 5,
          customersWithDebit: 7,
          customersWithCredit: 2,
          totalCustomersDebit: 42500.00,
          totalCustomersCredit: 7800.00,
          lowStockItems: 3,
          recentTransactions: 12,
          lastUpdated: new Date().toISOString()
        };
        
        return res.json(mockStats);
      }
      
      // For real database, gather actual stats
      // This is just a placeholder implementation
      const totalProducts = await storage.countProducts();
      const totalCategories = await storage.countCategories();
      const totalCustomers = await storage.countCustomers();
      const totalSuppliers = await storage.countSuppliers();
      const customersWithDebit = await storage.countCustomersWithDebit();
      const customersWithCredit = await storage.countCustomersWithCredit();
      const totalCustomersDebit = await storage.getTotalCustomersDebit();
      const totalCustomersCredit = await storage.getTotalCustomersCredit();
      
      const stats = {
        totalSales: 0, // Would calculate from actual invoices
        totalPurchases: 0, // Would calculate from actual purchases
        totalCustomers: totalCustomers || 0,
        totalSuppliers: totalSuppliers || 0,
        totalProducts: totalProducts || 0,
        totalCategories: totalCategories || 0,
        customersWithDebit: customersWithDebit || 0,
        customersWithCredit: customersWithCredit || 0,
        totalCustomersDebit: totalCustomersDebit || 0,
        totalCustomersCredit: totalCustomersCredit || 0,
        lowStockItems: 0, // Would count products below minStock
        recentTransactions: 0, // Would count recent transactions
        lastUpdated: new Date().toISOString()
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Error fetching stats" });
    }
  });

  // Update invoice
  app.patch("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }

      const { invoice, details } = req.body;
      if (!invoice) {
        return res.status(400).json({ message: "Invoice data is required" });
      }

      // Convert string dates to Date objects
      if (typeof invoice.date === 'string') {
        invoice.date = new Date(invoice.date);
      }
      if (typeof invoice.dueDate === 'string') {
        invoice.dueDate = new Date(invoice.dueDate);
      }

      // Update the invoice
      const updatedInvoice = await storage.updateInvoice(id, invoice, details);
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Get account details if available
      if (updatedInvoice.accountId) {
        try {
          const account = await storage.getAccount(updatedInvoice.accountId);
          if (account) {
            (updatedInvoice as any).account = {
              id: account.id,
              name: account.name,
              type: account.type
            };
          }
        } catch (err) {
          console.error('Error fetching account details:', err);
        }
      }

      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Error updating invoice" });
    }
  });

  // Update invoice status
  app.patch("/api/invoices/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      const invoice = await storage.updateInvoiceStatus(id, status);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice status:", error);
      res.status(500).json({ message: "Error updating invoice status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Log setup
console.log(`API routes initialized with usingMockData: ${dbUsingMockData}`);