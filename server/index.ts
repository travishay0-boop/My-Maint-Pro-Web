import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { DatabaseUnavailableError } from "./db";
import { seedPropertyTemplates } from "./seed-templates";

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message);
  console.error('Stack:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

process.on('SIGHUP', () => {
  log('SIGHUP received - ignoring to keep server alive');
});

const app = express();

// CRITICAL: Stripe webhook must be registered BEFORE express.json() middleware
// The webhook needs the raw Buffer, not parsed JSON
async function handleStripeWebhook(req: any, res: any) {
  const signature = req.headers['stripe-signature'];
  if (!signature) return res.status(400).json({ error: 'Missing stripe-signature' });
  try {
    const { WebhookHandlers } = await import('./webhookHandlers');
    const sig = Array.isArray(signature) ? signature[0] : signature;
    await WebhookHandlers.processWebhook(req.body as Buffer, sig);
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    res.status(400).json({ error: 'Webhook processing error' });
  }
}

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    log('Starting server initialization...');
    
    const server = await registerRoutes(app);
    log('Routes registered successfully');
    
    // Seed default data
    await seedPropertyTemplates();

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      // Handle database unavailable errors with helpful messaging
      if (err instanceof DatabaseUnavailableError) {
        console.warn('⚠ Database unavailable for request:', _req.method, _req.path);
        return res.status(503).json({ 
          message: err.message,
          error: 'Service Unavailable',
          hint: 'Configure DATABASE_URL in deployment secrets to enable this feature'
        });
      }

      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log the error but don't crash the server
      console.error('Request error:', {
        status,
        message,
        stack: err.stack,
        path: _req.path,
        method: _req.method
      });

      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      log('Setting up Vite for development...');
      await setupVite(app, server);
      log('Vite setup complete');
    } else {
      log('Setting up static file serving for production...');
      serveStatic(app);
      log('Static file serving configured');
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`Server successfully started on port ${port}`);
      log(`Environment: ${app.get("env")}`);
      log(`Health check endpoint available at http://0.0.0.0:${port}/api/health`);
    });

    // Add graceful shutdown
    process.on('SIGTERM', () => {
      log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        log('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Fatal error during server startup:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    
    // In production, try to keep the process alive to allow Cloud Run health checks
    if (process.env.NODE_ENV === 'production') {
      console.error('Attempting to keep process alive for debugging...');
      // Create a minimal health check server
      const http = require('http');
      const fallbackPort = parseInt(process.env.PORT || '5000', 10);
      http.createServer((req: any, res: any) => {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'error', 
          message: 'Server failed to initialize',
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }).listen(fallbackPort, '0.0.0.0', () => {
        console.log(`Fallback server listening on port ${fallbackPort} (unhealthy state)`);
      });
    } else {
      // In development, exit on fatal errors
      process.exit(1);
    }
  }
})();
