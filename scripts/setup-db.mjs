import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const { Client } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function setupDatabase() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL_NON_POOLING,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    console.log('[v0] 🔧 Connecting to PostgreSQL database...')
    await client.connect()
    console.log('[v0] ✅ Connected successfully')

    // Drop existing tables if they exist (for migration testing)
    console.log('[v0] 🗑️  Cleaning up old tables...')
    try {
      await client.query(`
        ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
        ALTER TABLE IF EXISTS conversations DISABLE ROW LEVEL SECURITY;
        ALTER TABLE IF EXISTS conversation_participants DISABLE ROW LEVEL SECURITY;
        ALTER TABLE IF EXISTS messages DISABLE ROW LEVEL SECURITY;
        ALTER TABLE IF EXISTS attachments DISABLE ROW LEVEL SECURITY;
        ALTER TABLE IF EXISTS follows DISABLE ROW LEVEL SECURITY;
      `)
    } catch (e) {
      console.log('[v0] ℹ️  Could not disable RLS')
    }
    
    try {
      await client.query(`
        DROP TABLE IF EXISTS attachments CASCADE;
        DROP TABLE IF EXISTS messages CASCADE;
        DROP TABLE IF EXISTS conversation_participants CASCADE;
        DROP TABLE IF EXISTS follows CASCADE;
        DROP TABLE IF EXISTS conversations CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP VIEW IF EXISTS conversations_with_details CASCADE;
        DROP VIEW IF EXISTS user_stats CASCADE;
        DROP FUNCTION IF EXISTS search_users CASCADE;
      `)
    } catch (e) {
      console.log('[v0] ℹ️  No existing tables to clean up')
    }

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../supabase/migrations/001_create_tables.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    console.log('[v0] 📝 Executing database schema setup...')
    
    // Execute the entire SQL file
    await client.query(sql)
    
    console.log('[v0] ✨ Database schema created successfully!')

    // Verify tables were created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    console.log('[v0] 📊 Tables created:')
    result.rows.forEach(row => {
      console.log(`  • ${row.table_name}`)
    })

  } catch (error) {
    console.error('[v0] ❌ Error setting up database:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

setupDatabase()
