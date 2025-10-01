# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Boulder Score 2.0 is a climbing competition scoring web application built with Next.js 14 and Supabase. It implements a dynamic scoring system where boulder points are calculated based on: `base_points + (500 / number_of_tops)` for each category/age group.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Architecture

### Authentication & State Management

- **Supabase Client Setup**: Two client factories in `lib/supabase.ts`:
  - `createClient()`: Browser client for client components
  - `createServerClient()`: Server client with cookie handling for server components/routes

- **Global Auth State**: `SupabaseProvider` in `lib/supabase-provider.tsx` wraps the app (see `app/layout.tsx`). Access auth state in client components via `useSupabase()` hook.

### Database Schema

The competition scoring system uses 6 main tables (see `database-setup.sql`):

1. **competitions**: Competition metadata and date ranges
2. **boulders**: Individual boulder problems with color grades (green=1000, yellow=1500, orange=2000, red=2500, black=3000 base points)
3. **competitors**: Registered climbers with `category` (male/female/other) and `age_group` (u11/u13/u15/u17/u19/open/masters/veterans)
4. **scores**: Individual attempts tracking `topped` status and `attempts` count
5. **boulder_stats**: Cached calculated points per boulder/category/age_group combination
6. **profiles**: User profile data synced with Supabase auth

### Scoring Logic

The scoring system is implemented via PostgreSQL functions in `database-setup.sql`:

- `calculate_boulder_points(boulder_id, category, age_group)`: Calculates and caches points for a specific boulder/category/age_group
- `recalculate_all_boulder_stats(competition_id)`: Recalculates all stats for a competition
- `trigger_recalculate_boulder_stats()`: Automatic trigger on score INSERT/UPDATE/DELETE

**Important**: Scores are category/age_group specific. When a climber tops a boulder, it only affects the points for their specific category/age_group combination.

### Row Level Security (RLS)

- Public read access for competitions, boulders, competitors, scores, and boulder_stats
- Write access restricted to:
  - Competition creators for their competitions/boulders
  - Users for their own competitor entries and scores
  - Automatic profile creation via `handle_new_user()` trigger

### App Router Structure

Uses Next.js 14 App Router with the following key routes:

- `/`: Home page
- `/competitions`: List all competitions
- `/competitions/new`: Create new competition (admin)
- `/competitions/[id]`: Competition details
- `/competitions/[id]/competitors`: Manage competitors
- `/competitions/[id]/score`: Score entry interface
- `/competitions/[id]/results`: View results/leaderboard

## Environment Setup

Required environment variables (see `env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Database Setup

Run `database-setup.sql` in Supabase SQL Editor to set up tables, RLS policies, functions, and triggers. Configure authentication providers in Supabase dashboard (Authentication > Settings).

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **UI Components**: Custom components in `components/ui/` using Tailwind
- **Icons**: Lucide React
- **Utilities**: `clsx` and `tailwind-merge` for className handling