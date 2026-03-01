import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

// const { Pool } = pg;

// if (!process.env.DATABASE_URL) {
//   throw new Error(
//     "DATABASE_URL must be set. Did you forget to provision a database?",
//   );
// }

// console.log("Connecting to database at", process.env.DATABASE_URL);
// export const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false,
//   },
// });
// export const db = drizzle(pool, { schema });

// const { Client } = pg;

// const client = new Client({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// try {
//   await client.connect();
//   console.log("✅ Connected successfully");
// } catch (err) {
//   console.error("❌ Connection failed:");
//   console.error(err);
// }

// export const db = drizzle(client, {schema})

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Test the connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error("Failed to connect to the database:", err.message);
    process.exit(1); // or handle more gracefully
  }
  client.query("SELECT 1", (queryErr) => {
    release();
    if (queryErr) {
      console.error("Database test query failed:", queryErr.message);
      process.exit(1);
    }
    console.log("Database connected successfully");
  });
});

// Catch unexpected pool errors (e.g. dropped connections)
pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err.message);
});

export const db = drizzle(pool, { schema });
