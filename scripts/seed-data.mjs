import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('[v0] ❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function seedDatabase() {
  try {
    console.log('[v0] 🌱 Seeding database with test data...')

    // Create test users in Supabase Auth first
    const users = []
    const testUsers = [
      { email: 'alice@example.com', password: 'Test123!', username: 'Alice' },
      { email: 'bob@example.com', password: 'Test123!', username: 'Bob' },
      { email: 'charlie@example.com', password: 'Test123!', username: 'Charlie' },
    ]

    console.log('[v0] 👥 Creating test users...')

    for (const testUser of testUsers) {
      try {
        const { data, error } = await supabase.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          email_confirm: true,
        })

        if (error) {
          console.log(`[v0] ℹ️  User ${testUser.email} already exists`)
        } else if (data?.user) {
          // Create corresponding profile
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: testUser.email,
              username: testUser.username,
              bio: `Hi, I'm ${testUser.username}!`,
            })

          if (!profileError) {
            users.push({ id: data.user.id, username: testUser.username })
            console.log(`[v0] ✅ Created user: ${testUser.username}`)
          }
        }
      } catch (err) {
        console.log(`[v0] ℹ️  Skipping user ${testUser.email}`)
      }
    }

    if (users.length < 2) {
      console.log('[v0] ⚠️  Need at least 2 users. Getting existing users...')
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id, username')
        .limit(3)

      if (existingUsers && existingUsers.length > 0) {
        users.length = 0
        users.push(...existingUsers)
        console.log(`[v0] ✅ Found ${users.length} existing users`)
      } else {
        console.log('[v0] ⚠️  No users found. Please create users first.')
        return
      }
    }

    // Create direct conversation if we have 2+ users
    if (users.length >= 2) {
      console.log('[v0] 💬 Creating direct conversation...')

      const { data: directConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          conversation_type: 'direct',
          created_by: users[0].id,
        })
        .select()
        .single()

      if (!convError && directConv) {
        // Add both users as participants
        await supabase.from('conversation_participants').insert([
          { conversation_id: directConv.id, user_id: users[0].id },
          { conversation_id: directConv.id, user_id: users[1].id },
        ])

        console.log(`[v0] ✅ Direct conversation created between ${users[0].username} and ${users[1].username}`)

        // Add test messages
        const messages = [
          { sender_id: users[0].id, content: `Hey ${users[1].username}! How are you?` },
          { sender_id: users[1].id, content: `I'm doing great! How about you?` },
          { sender_id: users[0].id, content: 'All good here! Ready to chat? 😊' },
        ]

        for (const msg of messages) {
          await supabase.from('messages').insert({
            conversation_id: directConv.id,
            sender_id: msg.sender_id,
            content: msg.content,
            message_type: 'text',
          })
        }

        console.log('[v0] ✅ Test messages added')
      }
    }

    // Create group conversation if we have 3+ users
    if (users.length >= 3) {
      console.log('[v0] 👫 Creating group conversation...')

      const { data: groupConv, error: groupError } = await supabase
        .from('conversations')
        .insert({
          conversation_type: 'group',
          group_name: 'Test Group Chat',
          created_by: users[0].id,
          relationship_type: 'bestfriend',
        })
        .select()
        .single()

      if (!groupError && groupConv) {
        // Add all users as participants
        const participants = users.map(user => ({
          conversation_id: groupConv.id,
          user_id: user.id,
        }))

        await supabase.from('conversation_participants').insert(participants)

        console.log(`[v0] ✅ Group conversation created with ${users.length} members`)

        // Add test messages
        const groupMessages = [
          { sender_id: users[0].id, content: 'Hey everyone! Welcome to the group!' },
          { sender_id: users[1].id, content: 'Thanks for creating this! 🎉' },
          { sender_id: users[2].id, content: 'Looking forward to chatting here!' },
        ]

        for (const msg of groupMessages) {
          await supabase.from('messages').insert({
            conversation_id: groupConv.id,
            sender_id: msg.sender_id,
            content: msg.content,
            message_type: 'text',
          })
        }

        console.log('[v0] ✅ Group test messages added')
      }
    }

    console.log('[v0] ✨ Database seeding complete!')
    console.log('[v0] 📝 Test users created:')
    users.forEach(u => console.log(`  • ${u.username} (${testUsers.find(t => t.username === u.username)?.email})`))

  } catch (error) {
    console.error('[v0] ❌ Seeding error:', error.message)
    process.exit(1)
  }
}

seedDatabase()
