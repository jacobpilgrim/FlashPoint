#!/usr/bin/env ts-node

/**
 * Seed Users Script
 *
 * Creates test users and competitor registrations for development/testing.
 *
 * Usage:
 *   npx ts-node commands/seed-users.ts [competition-id]
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key (has admin privileges)
 */

import { createClient } from '@supabase/supabase-js'

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing required environment variables')
  console.error('Required:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Types
type Category = 'male' | 'female' | 'other'
type AgeGroup = 'u11' | 'u13' | 'u15' | 'u17' | 'u19' | 'open' | 'masters' | 'veterans'

interface TestUser {
  email: string
  password: string
  full_name: string
  category: Category
  age_group: AgeGroup
}

interface CreatedUser extends TestUser {
  id: string
}

// Test users to create
const testUsers: TestUser[] = [
  { email: 'climber1@test.com', password: 'Test123!', full_name: 'Alex Stone', category: 'male', age_group: 'open' },
  { email: 'climber2@test.com', password: 'Test123!', full_name: 'Sarah Peak', category: 'female', age_group: 'open' },
  { email: 'climber3@test.com', password: 'Test123!', full_name: 'Jamie Boulder', category: 'other', age_group: 'u19' },
  { email: 'youth1@test.com', password: 'Test123!', full_name: 'Tim Young', category: 'male', age_group: 'u15' },
  { email: 'youth2@test.com', password: 'Test123!', full_name: 'Emma Swift', category: 'female', age_group: 'u13' },
  { email: 'veteran@test.com', password: 'Test123!', full_name: 'Mike Masters', category: 'male', age_group: 'veterans' },
]

async function seedUsers(competitionId?: string): Promise<void> {
  console.log('🌱 Starting user seeding...\n')

  // Verify competition exists if provided
  if (competitionId) {
    const { data: competition, error } = await supabase
      .from('competitions')
      .select('id, name')
      .eq('id', competitionId)
      .single()

    if (error || !competition) {
      console.error(`❌ Competition with ID ${competitionId} not found`)
      process.exit(1)
    }

    console.log(`✅ Found competition: ${competition.name}\n`)
  }

  let competitorNumber = 1
  const createdUsers: CreatedUser[] = []

  for (const userData of testUsers) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`⚠️  User ${userData.email} already exists, skipping...`)

          // Try to find existing user
          const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
          if (!listError) {
            const existingUser = users.find(u => u.email === userData.email)
            if (existingUser && competitionId) {
              // Check if already registered for competition
              const { data: existing } = await supabase
                .from('competitors')
                .select('id')
                .eq('user_id', existingUser.id)
                .eq('competition_id', competitionId)
                .single()

              if (!existing) {
                // Register for competition
                const competitorNum = String(competitorNumber++).padStart(3, '0')
                const { error: compError } = await supabase
                  .from('competitors')
                  .insert({
                    competition_id: competitionId,
                    user_id: existingUser.id,
                    name: userData.full_name,
                    category: userData.category,
                    age_group: userData.age_group,
                    competitor_number: competitorNum
                  })

                if (!compError) {
                  console.log(`   ✓ Registered as competitor #${competitorNum}`)
                }
              }
            }
          }
          continue
        }
        throw authError
      }

      console.log(`✅ Created user: ${userData.email}`)
      console.log(`   Password: ${userData.password}`)
      console.log(`   Name: ${userData.full_name}`)

      createdUsers.push({
        ...userData,
        id: authData.user.id
      })

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: userData.full_name })
        .eq('id', authData.user.id)

      if (profileError) {
        console.log(`   ⚠️  Could not update profile: ${profileError.message}`)
      }

      // Register for competition if ID provided
      if (competitionId) {
        const competitorNum = String(competitorNumber++).padStart(3, '0')

        const { error: compError } = await supabase
          .from('competitors')
          .insert({
            competition_id: competitionId,
            user_id: authData.user.id,
            name: userData.full_name,
            category: userData.category,
            age_group: userData.age_group,
            competitor_number: competitorNum
          })

        if (compError) {
          console.log(`   ⚠️  Could not register competitor: ${compError.message}`)
        } else {
          console.log(`   ✓ Registered as competitor #${competitorNum}`)
        }
      }

      console.log('')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ Error creating ${userData.email}:`, errorMessage)
      console.log('')
    }
  }

  console.log('\n📊 Summary:')
  console.log(`   Created ${createdUsers.length} new users`)
  if (competitionId) {
    console.log(`   Registered for competition ${competitionId}`)
  }
  console.log('\n✨ Seeding complete!')
  console.log('\n📝 Test credentials:')
  console.log('   All passwords: Test123!')
  console.log('   Emails: climber1@test.com, climber2@test.com, etc.')
}

// Parse command line arguments
const competitionId = process.argv[2]

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Seed Users Script

Creates test users and competitor registrations for development/testing.

Usage:
  npx ts-node commands/seed-users.ts [competition-id]

Arguments:
  competition-id    Optional. If provided, users will be registered as competitors

Examples:
  npx ts-node commands/seed-users.ts
  npx ts-node commands/seed-users.ts abc-123-def-456

Environment variables required:
  NEXT_PUBLIC_SUPABASE_URL     Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY    Your Supabase service role key
  `)
  process.exit(0)
}

// Run the seeding
seedUsers(competitionId)
  .catch(error => {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ Fatal error:', errorMessage)
    process.exit(1)
  })
