const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
  // 1. Connect to default 'postgres' database to make sure 'eas_db' exists
  const clientDefault = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres'
  });

  try {
    await clientDefault.connect();
    const res = await clientDefault.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      process.env.DB_NAME || 'eas_db'
    ]);
    if (res.rowCount === 0) {
      console.log(`Database '${process.env.DB_NAME || 'eas_db'}' does not exist. Creating it...`);
      // CREATE DATABASE cannot be run inside a transaction/with parameter binding
      const dbName = process.env.DB_NAME || 'eas_db';
      await clientDefault.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database '${dbName}' created successfully.`);
    } else {
      console.log(`Database '${process.env.DB_NAME || 'eas_db'}' already exists.`);
    }
  } catch (err) {
    console.error("Error checking/creating database:", err.message);
  } finally {
    await clientDefault.end();
  }

  // 2. Connect to the actual target database to run schema and seeds
  const clientEas = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'eas_db'
  });

  try {
    await clientEas.connect();
    console.log(`Connected to '${process.env.DB_NAME || 'eas_db'}'.`);

    // Paths to SQL files
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    const seedPath = path.join(__dirname, '..', 'db', 'seed.sql');

    // Run schema.sql
    if (fs.existsSync(schemaPath)) {
      console.log("Running schema.sql...");
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await clientEas.query(schemaSql);
      console.log("✅ schema.sql executed successfully (tables created).");
    } else {
      console.error(`schema.sql not found at ${schemaPath}`);
    }

    // Run seed.sql
    if (fs.existsSync(seedPath)) {
      console.log("Running seed.sql...");
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await clientEas.query(seedSql);
      console.log("✅ seed.sql executed successfully (demo data loaded).");
    } else {
      console.error(`seed.sql not found at ${seedPath}`);
    }

    console.log("🎉 Database setup completed successfully!");
  } catch (err) {
    console.error("❌ Error setting up database tables/data:", err.message);
  } finally {
    await clientEas.end();
  }
}

run();
