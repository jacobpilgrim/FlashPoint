'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Shield, ArrowLeft, UserPlus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'

interface Admin {
  id: string
  user_id: string
  email: string
  full_name: string | null
  is_creator: boolean
  invited_by_email: string | null
  invited_at: string
}

interface Competition {
  id: string
  name: string
  created_by: string
}

export default function CompetitionAdminsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [admins, setAdmins] = useState<Admin[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const loadData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }

      // Load competition
      const { data: compData, error: compError } = await supabase
        .from('competitions')
        .select('id, name, created_by')
        .eq('id', params.id)
        .single()

      if (compError) throw compError
      setCompetition(compData)

      // Load admins using RPC function
      const { data: adminsData, error: adminsError } = await supabase
        .rpc('get_competition_admins', { p_competition_id: params.id })

      if (adminsError) throw adminsError
      setAdmins(adminsData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const inviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      // Find user by email
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email.trim().toLowerCase())
        .single()

      if (profileError || !profileData) {
        throw new Error('User not found. They must have an account first.')
      }

      // Check if already admin
      const isAlreadyAdmin = admins.some(admin => admin.user_id === profileData.id)
      if (isAlreadyAdmin) {
        throw new Error('This user is already an admin.')
      }

      // Add as admin
      const { error: insertError } = await supabase
        .from('competition_admins')
        .insert({
          competition_id: params.id,
          user_id: profileData.id,
          invited_by: currentUserId
        })

      if (insertError) throw insertError

      setEmail('')
      await loadData()
      alert(`Successfully invited ${profileData.email} as admin!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite admin')
    } finally {
      setSubmitting(false)
    }
  }

  const removeAdmin = async (adminId: string, adminUserId: string) => {
    if (adminUserId === competition?.created_by) {
      alert('Cannot remove the competition creator.')
      return
    }

    if (!confirm('Are you sure you want to remove this admin?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('competition_admins')
        .delete()
        .eq('id', adminId)

      if (error) throw error

      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove admin')
    }
  }

  useEffect(() => {
    loadData()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-primary mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Competition Admins</h1>
                <p className="text-sm text-gray-600">{competition?.name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push(`/competitions/${params.id}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Invite Admin Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserPlus className="h-5 w-5 mr-2" />
                  Invite Admin
                </CardTitle>
                <CardDescription>
                  Add another user as an admin for this competition
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={inviteAdmin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                      {error}
                    </div>
                  )}
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? 'Inviting...' : 'Invite Admin'}
                  </Button>
                  <p className="text-xs text-gray-600">
                    Note: The user must already have an account to be added as an admin.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Admins List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Current Admins</CardTitle>
                <CardDescription>
                  {admins.length} {admins.length === 1 ? 'admin' : 'admins'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {admins.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {admin.full_name || admin.email}
                          </p>
                          {admin.is_creator && (
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
                              Creator
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{admin.email}</p>
                        {!admin.is_creator && admin.invited_by_email && (
                          <p className="text-xs text-gray-500 mt-1">
                            Invited by {admin.invited_by_email}
                          </p>
                        )}
                      </div>
                      {!admin.is_creator && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeAdmin(admin.id, admin.user_id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
