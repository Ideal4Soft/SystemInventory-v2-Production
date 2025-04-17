import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import session from "express-session";
import passport from "passport";
import multer from "multer";
import cors from "cors";
import { pool, db } from "./db";

// Load environment variables
dotenv.config();

const app = express();

// Configure CORS to allow requests from the client
app.use((req, res, next) => {
  // Allow requests from localhost client ports
  const allowedOrigins = [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175'
  ];
  
  const origin = req.headers.origin as string | undefined;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // In development, allow any origin for easier testing
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  // Allow credentials and methods
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Create uploads directory if it doesn't exist
const uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });
app.use(upload.any());

// Configure passport session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `${new Date().toISOString()} [express] ${req.method} ${
        req.originalUrl
      } ${res.statusCode} in ${duration}ms :: ${
        req.get("content-length") || "0"
      } bytes ${
        Object.keys(req.body || {}).length > 0
          ? `:: ${JSON.stringify(req.body).slice(0, 200)}`
          : ""
      }`
    );
  });
  next();
});

(async () => {
  try {
    // Attempt to connect to the database
    console.log("Attempting to connect to database...");
    console.log("Database initialized via db.ts");
    
    // Add a basic health check endpoint
    app.get('/api/health', (req, res) => {
      res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
    });
    
    // Register API routes first, before any static or catch-all routes
    console.log("Registering API routes...");
    const server = await registerRoutes(app);
    
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error("API error:", err);
    });

    // Add Vite or static file serving AFTER all API routes are registered
    console.log("Setting up client file serving...");
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Add a final catch-all route to handle 404 errors
    app.use('*', (req, res) => {
      if (req.originalUrl.startsWith('/api/')) {
        console.log(`API route not found: ${req.method} ${req.originalUrl}`);
        return res.status(404).json({ message: 'API endpoint not found' });
      }
      // For non-API routes, let the client handle routing
      res.redirect('/');
    });

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`Server running on port ${port}`);
      log(`API available at http://localhost:${port}/api/`);
      log(`Client available at http://localhost:${port}/`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
