import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import config from './config';
import fs from 'fs';
import path from 'path';
import NodeCache from 'node-cache';

// Set WebSocket constructor for Neon
neonConfig.webSocketConstructor = ws;

// Create a simple cache with 5 minute TTL
const dbCache = new NodeCache({ 
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired keys every minute
  useClones: false, // Improve performance by not cloning values
  maxKeys: 1000 // Limit number of keys to avoid memory leaks
});

// Create a flag to track if we're using mock data
// Default to using real data
export let usingMockData = false;

console.log("DB Configuration:", {
  DATABASE_URL: config.DATABASE_URL ? "✓ Set" : "✗ Not set",
  USE_MOCK_DB: config.USE_MOCK_DB,
  initialUsingMockData: usingMockData
});

// Create a mock pool for when the real connection fails
class MockPool {
  async query() {
    return { rows: [] };
  }
}

// Connection pool configuration
const POOL_CONFIG = {
  connectionString: config.DATABASE_URL,
  connectionTimeoutMillis: 10000, // 10 second timeout (increased for stability)
  max: 20, // Increase maximum number of clients for better concurrency
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  allowExitOnIdle: true
};

// Create connection pool with error handling
const createPool = () => {
  try {
    console.log("Attempting to connect to PostgreSQL database...");
    
    // Check if we have a valid DATABASE_URL
    if (!config.DATABASE_URL) {
      console.log("No DATABASE_URL provided, will fall back to mock database if connection fails");
    }
    
    if (config.USE_MOCK_DB) {
      console.log("USE_MOCK_DB flag is set to true, using mock database");
      usingMockData = true;
      return new MockPool() as any;
    }
    
    // Connect to the real database
    console.log("Initializing Neon PostgreSQL pool with real connection string");
    return new Pool(POOL_CONFIG);
  } catch (error) {
    console.error("Error creating database pool:", error);
    console.log("Using mock database due to connection error");
    usingMockData = true;
    return new MockPool() as any;
  }
};

export const pool = createPool();

// Test the connection and log status
let dbConnected = false;

// Initialize and test database connection
const initializeConnection = async () => {
  try {
    console.log("Testing PostgreSQL connection...");
    const result = await pool.query('SELECT 1 as connection_test');
    console.log("PostgreSQL connection test result:", result.rows);
    console.log("PostgreSQL connection successful");
    dbConnected = true;
    usingMockData = false; // Ensure we're using real data if connection succeeds
  } catch (err) {
    console.error("PostgreSQL connection failed:", err);
    console.log("Using mock data for development due to connection failure");
    usingMockData = true;
    dbConnected = false;
  }
  
  console.log("Final database status:", {
    connected: dbConnected,
    usingMockData: usingMockData
  });
};

initializeConnection();

// Load mock data from file once (for fallback)
let mockData = {};
const loadMockData = () => {
  const mockDataFile = path.join(process.cwd(), 'mock-data.json');
  try {
    if (fs.existsSync(mockDataFile)) {
      const data = fs.readFileSync(mockDataFile, 'utf8');
      mockData = JSON.parse(data);
      console.log('[mockDB] Loaded data from file');
    } else {
      console.log('[mockDB] No mock data file found, using empty data');
    }
  } catch (error) {
    console.error('[mockDB] Error loading mock data file:', error);
  }
  return mockData;
};

mockData = loadMockData();

// Create an enhanced mock drizzle DB instance with caching
const mockDb = {
  query: async () => ({ rows: [] }),
  select: () => ({ 
    from: () => ({
      orderBy: () => [],
      where: () => ({
        orderBy: () => []
      })
    }) 
  }),
  insert: () => ({ 
    values: () => ({ 
      returning: () => [],
      onConflictDoUpdate: () => ({ 
        target: () => ({
          set: () => ({})
        })
      })
    }) 
  }),
  update: () => ({ 
    set: () => ({ 
      where: () => ({ 
        returning: () => [] 
      }) 
    }) 
  }),
  delete: () => ({ 
    where: () => ({ 
      returning: () => [] 
    }) 
  }),
};

// Export the db object - use real or mock based on connection status
const realDb = drizzle(pool, { schema });
export const db = usingMockData ? mockDb as any : realDb;

// Export a function to force using real data
export const forceRealDatabase = () => {
  if (dbConnected) {
    usingMockData = false;
    console.log("Forced using real database");
    return true;
  } else {
    console.log("Cannot force real database - no connection");
    return false;
  }
};

// Export a function to force using mock data (for testing/development)
export const forceMockDatabase = () => {
  usingMockData = true;
  console.log("Forced using mock database");
  return true;
};

console.log("Database object initialized:", {
  type: usingMockData ? "Mock Database" : "Real PostgreSQL Database"
});

// Export a function to check if DB is connected
export const isDatabaseConnected = () => dbConnected;

// Utility function to cache database results
export const cachedQuery = async (key: string, queryFn: () => Promise<any>, ttl = 300) => {
  // Check if result is in cache
  const cachedResult = dbCache.get(key);
  if (cachedResult) {
    return cachedResult;
  }
  
  // Execute query and cache result
  const result = await queryFn();
  dbCache.set(key, result, ttl);
  return result;
};

// Clear cache for specific keys or patterns
export const clearCache = (pattern?: string) => {
  if (!pattern) {
    dbCache.flushAll();
    return;
  }
  
  const keys = dbCache.keys().filter((key: string) => key.includes(pattern));
  keys.forEach((key: string) => dbCache.del(key));
};
