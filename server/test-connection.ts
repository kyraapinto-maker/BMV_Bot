import pg from "pg";

const { Client } = pg;

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("✅ Connected successfully");

    const res = await client.query("SELECT NOW()");
    console.log("Database time:", res.rows[0]);

    await client.end();
  } catch (err) {
    console.error("❌ Connection failed:");
    console.error(err);
  }
}

testConnection();
