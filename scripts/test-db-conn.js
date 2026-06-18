const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;

(async () => {
  if (!connectionString) {
    console.error('No DATABASE_URL in .env');
    process.exit(1);
  }

  console.log('Testing connection with connection string (masked):', connectionString.slice(0,50) + '...');

  const pool = new Pool({ connectionString, ssl: /supabase\\.co/.test(connectionString) ? { rejectUnauthorized: false } : undefined });

  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Connected, server time:', res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('Connection error:', err);
    process.exit(2);
  } finally {
    await pool.end().catch(()=>{});
  }
})();