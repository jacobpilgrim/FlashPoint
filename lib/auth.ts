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

    // Use the database function to check if user is admin (creator or invited admin)
    const { data, error } = await supabase
      .rpc('is_competition_admin', {
        p_competition_id: competitionId,
        p_user_id: user.id
      })

    if (error) {
      console.error('Error checking admin status:', error)
      return false
    }

    return data === true
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
