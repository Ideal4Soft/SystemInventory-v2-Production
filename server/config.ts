import { config as dotenvConfig } from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Get the directory path of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env file
dotenvConfig({ path: resolve(__dirname, '../.env') });

// Configuration settings
const config = {
  // Node environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database connections
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_qzP7KaAFL1Ey@ep-dry-boat-a5mkhdg3-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
  
  // Database type - use postgres
  DB_TYPE: process.env.DB_TYPE || 'postgres', // 'postgres' or 'mock'
  
  // Session secret
  SESSION_SECRET: process.env.SESSION_SECRET || 'your-secret-key',
  
  // Port settings
  PORT: process.env.PORT || 5000,
  
  // Mock DB flag - set to false to use real database
  USE_MOCK_DB: false
};

export default config; 