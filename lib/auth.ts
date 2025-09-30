import { createBrowserClient } from '@supabase/ssr'

export async function isCompetitionAdmin(competitionId: string): Promise<boolean> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return false
    }

    // Check if user is the creator of the competition
    const { data: competition, error: compError } = await supabase
      .from('competitions')
      .select('created_by')
      .eq('id', competitionId)
      .single()

    if (compError || !competition) {
      return false
    }

    return competition.created_by === user.id
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

export async function requireAuth(): Promise<{ user: any; error: string | null }> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      return { user: null, error: `Authentication error: ${error.message}` }
    }
    
    if (!user) {
      return { user: null, error: 'You must be logged in to perform this action' }
    }

    return { user, error: null }
  } catch (error) {
    return { user: null, error: 'Authentication failed' }
  }
}
