# Commands

Utility scripts for development and testing.

## seed-users.ts

Creates test users and competitor registrations for development/testing.

### Prerequisites

1. Set up environment variables (create `.env.local` if needed):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Usage

**Create test users only:**
```bash
npx ts-node commands/seed-users.ts
```

**Create test users and register them for a competition:**
```bash
npx ts-node commands/seed-users.ts <competition-id>
```

### Test Users Created

| Email | Password | Name | Category | Age Group |
|-------|----------|------|----------|-----------|
| climber1@test.com | Test123! | Alex Stone | Male | Open |
| climber2@test.com | Test123! | Sarah Peak | Female | Open |
| climber3@test.com | Test123! | Jamie Boulder | Other | U19 |
| youth1@test.com | Test123! | Tim Young | Male | U15 |
| youth2@test.com | Test123! | Emma Swift | Female | U13 |
| veteran@test.com | Test123! | Mike Masters | Male | Veterans |

### Example

```bash
# First, get a competition ID from your app or database
# Then run:
npx ts-node commands/seed-users.ts abc-123-def-456

# Output:
# 🌱 Starting user seeding...
# ✅ Found competition: Summer Boulder Comp 2024
# ✅ Created user: climber1@test.com
#    Password: Test123!
#    Name: Alex Stone
#    ✓ Registered as competitor #001
# ...
```

### Notes

- The script uses the Supabase service role key to bypass RLS policies
- Users are automatically email-confirmed
- If a user already exists, the script will skip creation but can still register them for the competition
- Competitor numbers are auto-generated sequentially (001, 002, etc.)
