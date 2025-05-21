import express, { Express } from "express";
import cors from "cors";
import path from "path";
import { registerRoutes } from "./routes-new";
import { serveStatic, setupVite, log } from "./vite";

// Set up Express app
const app: Express = express();
const port = process.env.PORT || 5000;

// Enable CORS for all routes
app.use(cors());

// Parse JSON request bodies
app.use(express.json({ limit: '50mb' }));

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Setup Vite middleware for development (handled by vite.ts)
setupVite(app).then(async (devServer) => {
  // Register API routes
  await registerRoutes(app);
  
  // Serve static assets in production
  if (!devServer) {
    serveStatic(app);
  }
  
  // Start the server
  app.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
}).catch((err) => {
  console.error("Vite middleware error:", err);
});