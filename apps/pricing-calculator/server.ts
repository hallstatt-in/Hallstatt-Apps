import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import Papa from "papaparse";
import pg from "pg";
import crypto from "crypto";

const { Pool } = pg;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "9990019572Hh@";
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "hallstatt-local-admin-session";
const ADMIN_SESSION_TOKEN = crypto
  .createHash("sha256")
  .update(`${ADMIN_PASSWORD}:${ADMIN_SESSION_SECRET}`)
  .digest("hex");

interface Product {
  sku: string;
  cogs: number;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function startServer() {
  const app = express();
  const isRailway =
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    Boolean(process.env.RAILWAY_PROJECT_ID) ||
    Boolean(process.env.RAILWAY_SERVICE_ID);
  const isProduction = process.env.NODE_ENV === "production" || isRailway;
  const PORT = isRailway ? Number(process.env.PORT) || 3000 : 3000;
  const HOST = isRailway ? "0.0.0.0" : "127.0.0.1";

  // Initialize Database
  if (process.env.DATABASE_URL) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
          sku TEXT PRIMARY KEY,
          cogs NUMERIC NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("Database initialized successfully");
    } catch (err) {
      console.error("Failed to initialize database:", err);
    }
  } else {
    console.warn("DATABASE_URL not found. Database operations will fail. Please set it in Settings.");
  }

  app.use(express.json());

  const isAdminAuthenticated = (req: express.Request) => {
    const cookieHeader = req.headers.cookie || "";
    return cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .some((cookie) => cookie === `hallstatt_admin=${ADMIN_SESSION_TOKEN}`);
  };

  app.get("/api/admin/session", (req, res) => {
    res.json({ authenticated: isAdminAuthenticated(req) });
  });

  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body || {};
    const submittedPassword = typeof password === "string" ? password.trim() : "";

    if (!ADMIN_PASSWORD) {
      return res.status(500).json({ error: "Admin credentials are not configured" });
    }

    if (submittedPassword !== ADMIN_PASSWORD.trim()) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    const secureCookie = isRailway ? "; Secure" : "";
    res.setHeader(
      "Set-Cookie",
      `hallstatt_admin=${ADMIN_SESSION_TOKEN}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${secureCookie}`
    );
    res.json({ authenticated: true });
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Set up multer for file upload
  const upload = multer({ storage: multer.memoryStorage() });

  // API Route: Upload COGS CSV
  app.post("/api/upload-cogs", upload.single("file"), async (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return res.status(401).json({ error: "Admin login required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: "Database not configured. Please set DATABASE_URL in Settings." });
    }

    const fileContent = req.file.buffer.toString("utf8");

    Papa.parse(fileContent, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedProducts = results.data
          .filter((row: any) => row.sku && typeof row.cogs === 'number')
          .map((row: any) => ({
            sku: String(row.sku),
            cogs: Number(row.cogs),
          }));

        if (parsedProducts.length === 0) {
          return res.status(400).json({ error: "No valid product data found in CSV. Ensure columns 'sku' and 'cogs' exist." });
        }

        try {
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            for (const product of parsedProducts) {
              await client.query(
                `INSERT INTO products (sku, cogs, updated_at) 
                 VALUES ($1, $2, CURRENT_TIMESTAMP) 
                 ON CONFLICT (sku) 
                 DO UPDATE SET cogs = EXCLUDED.cogs, updated_at = CURRENT_TIMESTAMP`,
                [product.sku, product.cogs]
              );
            }
            await client.query('COMMIT');
            res.json({ message: `Successfully synced ${parsedProducts.length} products to database`, count: parsedProducts.length });
          } catch (error: any) {
            await client.query('ROLLBACK');
            throw error;
          } finally {
            client.release();
          }
        } catch (error: any) {
          console.error("Database upload error:", error);
          res.status(500).json({ error: "Failed to save products to database: " + error.message });
        }
      },
      error: (error: any) => {
        res.status(500).json({ error: "Failed to parse CSV: " + error.message });
      }
    });
  });

  // API Route: Get Products
  app.get("/api/products", async (req, res) => {
    if (!process.env.DATABASE_URL) {
      return res.json([]);
    }
    try {
      const result = await pool.query('SELECT sku, cogs FROM products ORDER BY sku ASC');
      // Convert numeric strings back to numbers if necessary (pg returns numeric as string)
      const data = result.rows.map(row => ({
        sku: row.sku,
        cogs: parseFloat(row.cogs)
      }));
      res.json(data);
    } catch (error: any) {
      console.error("Database fetch error:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.put("/api/products/:sku", async (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return res.status(401).json({ error: "Admin login required" });
    }

    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: "Database not configured. Please set DATABASE_URL in Settings." });
    }

    const sku = req.params.sku;
    const cogs = Number(req.body?.cogs);

    if (!sku) {
      return res.status(400).json({ error: "SKU is required." });
    }

    if (!Number.isFinite(cogs) || cogs < 0) {
      return res.status(400).json({ error: "A valid COGS value is required." });
    }

    try {
      const result = await pool.query(
        `UPDATE products
         SET cogs = $1, updated_at = CURRENT_TIMESTAMP
         WHERE sku = $2
         RETURNING sku, cogs`,
        [cogs, sku],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "SKU not found." });
      }

      const row = result.rows[0];
      res.json({ product: { sku: row.sku, cogs: parseFloat(row.cogs) } });
    } catch (error: any) {
      console.error("Database update error:", error);
      res.status(500).json({ error: "Failed to update product COGS" });
    }
  });

  // Vite middleware for development
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    const displayHost = HOST === "127.0.0.1" ? "localhost" : HOST;
    console.log(`Server running on http://${displayHost}:${PORT}`);
  });
}

startServer();
