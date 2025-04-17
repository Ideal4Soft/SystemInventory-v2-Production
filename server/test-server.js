import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create Express app
const app = express();

// Enable CORS
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request body
app.use(express.json());

// Load mock data
let mockData;
try {
  const dataFilePath = path.join(__dirname, '..', 'mock-data.json');
  mockData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
  console.log('Loaded mock data from file');
} catch (error) {
  console.error('Error loading mock data:', error);
  mockData = {
    accounts: [
      {
        id: 1,
        name: "Default Customer",
        type: "customer",
        phone: "123456789",
        isActive: true
      }
    ]
  };
  console.log('Using default mock data');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get all accounts
app.get('/api/accounts', (req, res) => {
  console.log('GET /api/accounts - Returning', mockData.accounts.length, 'accounts');
  
  // Add cache control headers
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  
  res.json(mockData.accounts);
});

// Get account by ID
app.get('/api/accounts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  console.log(`GET /api/accounts/${id}`);
  
  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid account ID" });
  }
  
  const account = mockData.accounts.find(a => a.id === id);
  
  if (!account) {
    return res.status(404).json({ message: "Account not found" });
  }
  
  // Add cache control headers
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  
  res.json(account);
});

// Update account by ID
app.put('/api/accounts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  console.log(`PUT /api/accounts/${id}`, req.body);
  
  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid account ID" });
  }
  
  const index = mockData.accounts.findIndex(a => a.id === id);
  
  if (index === -1) {
    return res.status(404).json({ message: "Account not found" });
  }
  
  // Update the account
  mockData.accounts[index] = {
    ...mockData.accounts[index],
    ...req.body,
    id // Ensure ID remains the same
  };
  
  // Add cache control headers
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  
  res.json(mockData.accounts[index]);
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api/`);
}); 