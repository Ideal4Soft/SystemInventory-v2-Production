import express from 'express';
import cors from 'cors';

// Create Express app
const app = express();

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

// Parse JSON request body
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Simple accounts endpoint
app.get('/api/accounts', (req, res) => {
  console.log('GET /api/accounts - Returning accounts');
  
  // Add cache control headers
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  res.json([
    {
      id: 1,
      name: "Test Customer",
      type: "customer",
      phone: "123456789",
      isActive: true
    },
    {
      id: 2,
      name: "Test Supplier",
      type: "supplier",
      phone: "987654321",
      isActive: true
    }
  ]);
});

// Get account by ID
app.get('/api/accounts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  console.log(`GET /api/accounts/${id}`);
  
  // Add cache control headers
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  // Always return a test account
  res.json({
    id: id,
    name: "Test Account " + id,
    type: "customer",
    phone: "123456789",
    isActive: true
  });
});

// Update account by ID (PATCH)
app.patch('/api/accounts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  console.log(`PATCH /api/accounts/${id}`, req.body);
  
  // Add cache control headers
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  // Always return success
  res.json({
    id: id,
    name: req.body.name || "Updated Account " + id,
    type: req.body.type || "customer",
    phone: req.body.phone || "123456789",
    isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    updatedAt: new Date().toISOString()
  });
});

// Start server on a different port to avoid conflicts
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Test API server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api/`);
}); 