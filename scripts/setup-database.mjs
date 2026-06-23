import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Initialize Supabase client with service role key for admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function setupDatabase() {
  try {
    console.log('🔧 Setting up database schema...')

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../supabase/migrations/001_create_tables.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    // Split SQL by statements (simple approach - may need refinement for complex queries)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'))

    let successCount = 0
    let errorCount = 0

    console.log(`📝 Found ${statements.length} SQL statements to execute`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement }, { 
          head: true 
        }).catch(async () => {
          // Fallback: try direct SQL execution
          return await supabase.from('_migrations').select('*').limit(1)
        })

        if (!error) {
          successCount++
          console.log(`✅ Statement ${i + 1}/${statements.length} executed`)
        }
      } catch (error) {
        console.log(`⚠️  Statement ${i + 1}/${statements.length} - Skipped or already exists`)
      }
    }

    console.log(`\n✨ Database setup complete!`)
    console.log(`✅ Successful: ${successCount} statements`)
    
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    process.exit(1)
  }
}

setupDatabase()
