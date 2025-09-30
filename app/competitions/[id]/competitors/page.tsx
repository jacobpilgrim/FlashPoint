'use client'

import React, { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useParams, useRouter } from 'next/navigation'
import { Trophy, Plus, Users, UserPlus, Shield } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { isCompetitionAdmin } from '../../../../lib/auth'

interface Competition {
  id: string
  name: string
  is_active: boolean
}

interface Competitor {
  id: string
  name: string
  competitor_number: string
  category: 'male' | 'female' | 'other'
  age_group: 'u11' | 'u13' | 'u15' | 'u17' | 'u19' | 'open' | 'masters' | 'veterans'
  created_at: string
}

interface NewCompetitor {
  name: string
  category: 'male' | 'female' | 'other'
  age_group: 'u11' | 'u13' | 'u15' | 'u17' | 'u19' | 'open' | 'masters' | 'veterans'
}

export default function CompetitorsPage() {
  const params = useParams()
  const router = useRouter()
  const competitionId = params.id as string
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCompetitor, setNewCompetitor] = useState<NewCompetitor>({
    name: '',
    category: 'male',
    age_group: 'open'
  })
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (competitionId) {
      fetchData()
    }
    
    // Check if user is logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    
    checkUser()

    // Check if user is admin
    const checkAdmin = async () => {
      const adminStatus = await isCompetitionAdmin(competitionId)
      setIsAdmin(adminStatus)
    }
    
    checkAdmin()
  }, [competitionId])

  const fetchData = async () => {
    try {
      // Fetch competition
      const { data: competitionData, error: compError } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', competitionId)
        .single()

      if (compError) throw compError

      // Fetch competitors
      const { data: competitorsData, error: competitorsError } = await supabase
        .from('competitors')
        .select('*')
        .eq('competition_id', competitionId)
        .order('competitor_number')

      if (competitorsError) throw competitorsError

      setCompetition(competitionData)
      setCompetitors(competitorsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateCompetitorNumber = () => {
    if (competitors.length === 0) {
      return '001'
    }
    
    const numbers = competitors.map(c => parseInt(c.competitor_number) || 0)
    const maxNumber = Math.max(...numbers, 0)
    return String(maxNumber + 1).padStart(3, '0')
  }

  const handleAddCompetitor = async () => {
    if (!newCompetitor.name.trim()) {
      alert('Please enter a name')
      return
    }

    if (!competition) {
      alert('Competition not found')
      return
    }

    if (!competition.is_active) {
      alert('This competition is not active. Cannot add competitors.')
      return
    }

    setSubmitting(true)
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        throw new Error(`Authentication error: ${userError.message}`)
      }
      
      if (!user) {
        throw new Error('You must be logged in to add competitors')
      }

      const competitorNumber = generateCompetitorNumber()
      
      const { error } = await supabase
        .from('competitors')
        .insert({
          competition_id: competitionId,
          user_id: user.id,
          name: newCompetitor.name,
          category: newCompetitor.category,
          age_group: newCompetitor.age_group,
          competitor_number: competitorNumber
        })

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      // Reset form and refresh data
      setNewCompetitor({ name: '', category: 'male', age_group: 'open' })
      setShowAddForm(false)
      fetchData()
    } catch (error) {
      console.error('Error adding competitor:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Error adding competitor: ${errorMessage}`)
    } finally {
      setSubmitting(false)
    }
  }

  const removeCompetitor = async (competitorId: string) => {
    if (!confirm('Are you sure you want to remove this competitor?')) return

    try {
      const { error } = await supabase
        .from('competitors')
        .delete()
        .eq('id', competitorId)

      if (error) throw error

      fetchData()
    } catch (error) {
      console.error('Error removing competitor:', error)
      alert('Error removing competitor. Please try again.')
    }
  }

  const getAgeGroupLabel = (ageGroup: string) => {
    const labels: Record<string, string> = {
      u11: 'U11 (Youth Round)',
      u13: 'U13 (Youth Round)',
      u15: 'U15 (Youth Round)',
      u17: 'U17',
      u19: 'U19 and Open',
      open: 'Open',
      masters: 'Masters and Open',
      veterans: 'Veterans and Open'
    }
    return labels[ageGroup] || ageGroup
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!competition) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Competition not found</h2>
          <p className="text-gray-600">The competition you're looking for doesn't exist.</p>
        </div>
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
              <Trophy className="h-8 w-8 text-primary mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Competitors</h1>
                <p className="text-sm text-gray-600">{competition.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {user ? (
                isAdmin ? (
                  <Button
                    onClick={() => setShowAddForm(!showAddForm)}
                    disabled={!competition.is_active}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Add Competitor
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowAddForm(!showAddForm)}
                    disabled={!competition.is_active}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Register as Competitor
                  </Button>
                )
              ) : (
                <div className="text-sm text-gray-500">
                  Please log in to register
                </div>
              )}
              <Button variant="outline" onClick={() => router.back()}>
                Back
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Competitor Form */}
        {showAddForm && user && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                {isAdmin ? 'Add New Competitor' : 'Register as Competitor'}
              </CardTitle>
              <CardDescription>
                {isAdmin 
                  ? 'Register a new competitor for this competition'
                  : 'Register yourself as a competitor for this competition'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newCompetitor.name}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter competitor name"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={newCompetitor.category}
                      onChange={(e) => setNewCompetitor({ ...newCompetitor, category: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Age Group *
                    </label>
                    <select
                      value={newCompetitor.age_group}
                      onChange={(e) => setNewCompetitor({ ...newCompetitor, age_group: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="u11">U11 (Youth Round)</option>
                      <option value="u13">U13 (Youth Round)</option>
                      <option value="u15">U15 (Youth Round)</option>
                      <option value="u17">U17</option>
                      <option value="u19">U19 and Open</option>
                      <option value="open">Open</option>
                      <option value="masters">Masters and Open</option>
                      <option value="veterans">Veterans and Open</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCompetitor} disabled={submitting}>
                    {submitting ? 'Adding...' : 'Add Competitor'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Competitors List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Registered Competitors ({competitors.length})
            </CardTitle>
            <CardDescription>
              All competitors registered for this competition
            </CardDescription>
          </CardHeader>
          <CardContent>
            {competitors.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No competitors yet</h3>
                <p className="text-gray-600 mb-4">Start by adding competitors to this competition.</p>
                <Button onClick={() => setShowAddForm(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First Competitor
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {competitors.map((competitor) => (
                  <div key={competitor.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-semibold">
                        #{competitor.competitor_number}
                      </div>
                      <div>
                        <div className="font-semibold">{competitor.name}</div>
                        <div className="text-sm text-gray-600">
                          {competitor.category.charAt(0).toUpperCase() + competitor.category.slice(1)} • {getAgeGroupLabel(competitor.age_group)}
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeCompetitor(competitor.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
