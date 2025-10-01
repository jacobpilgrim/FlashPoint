'use client'

import React, { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useParams, useRouter } from 'next/navigation'
import { Trophy, Calendar, Users, Target, Settings, Play, Pause, Eye, Shield, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { getBoulderColorClass, getBoulderColorText } from '../../../lib/scoring'
import { isCompetitionAdmin } from '../../../lib/auth'

interface Competition {
  id: string
  name: string
  description: string | null
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

interface Boulder {
  id: string
  identifier: string
  color: 'green' | 'yellow' | 'orange' | 'red' | 'black'
  base_points: number
}

interface Competitor {
  id: string
  name: string
  competitor_number: string
  category: 'male' | 'female' | 'other'
  age_group: 'u11' | 'u13' | 'u15' | 'u17' | 'u19' | 'open' | 'masters' | 'veterans'
  user_id?: string
}

export default function CompetitionDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const competitionId = params.id as string
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [boulders, setBoulders] = useState<Boulder[]>([])
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (competitionId) {
      fetchCompetitionData()
    }
  }, [competitionId])

  const fetchCompetitionData = async () => {
    try {
      // Fetch competition
      const { data: competitionData, error: compError } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', competitionId)
        .single()

      if (compError) throw compError

      // Fetch boulders
      const { data: bouldersData, error: bouldersError } = await supabase
        .from('boulders')
        .select('*')
        .eq('competition_id', competitionId)
        .order('color', { ascending: true })

      if (bouldersError) throw bouldersError

      // Fetch competitors
      const { data: competitorsData, error: competitorsError } = await supabase
        .from('competitors')
        .select('id, name, competitor_number, category, age_group, user_id')
        .eq('competition_id', competitionId)
        .order('competitor_number')

      if (competitorsError) throw competitorsError

      setCompetition(competitionData)
      setBoulders(bouldersData || [])
      setCompetitors(competitorsData || [])

      // Check if current user is admin
      const adminStatus = await isCompetitionAdmin(competitionId)
      setIsAdmin(adminStatus)

      // Check if current user is already registered as a competitor
      const { data: { user } } = await supabase.auth.getUser()
      if (user && competitorsData) {
        const userCompetitor = competitorsData.find(c => c.user_id === user.id)
        setIsRegistered(!!userCompetitor)
      }
    } catch (error) {
      console.error('Error fetching competition data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleCompetitionStatus = async () => {
    if (!competition) return

    setUpdating(true)
    try {
      const { error } = await supabase
        .from('competitions')
        .update({ is_active: !competition.is_active })
        .eq('id', competitionId)

      if (error) throw error

      setCompetition({ ...competition, is_active: !competition.is_active })
    } catch (error) {
      console.error('Error updating competition:', error)
      alert('Error updating competition status')
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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
                <h1 className="text-xl font-semibold text-gray-900">{competition.name}</h1>
                <p className="text-sm text-gray-600">
                  {formatDate(competition.start_date)} - {formatDate(competition.end_date)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={toggleCompetitionStatus}
                  disabled={updating}
                  className={competition.is_active ? 'text-red-600' : 'text-green-600'}
                >
                  {competition.is_active ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </Button>
              )}
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Banner */}
        <div className={`mb-8 p-4 rounded-lg ${competition.is_active ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${competition.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className={`font-medium ${competition.is_active ? 'text-green-800' : 'text-gray-600'}`}>
              {competition.is_active ? 'Competition is active' : 'Competition is inactive'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Competition Info */}
          <div className="lg:col-span-2">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Competition Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-600">
                      {competition.description || 'No description provided'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900">Start Date</h4>
                      <p className="text-gray-600">{formatDate(competition.start_date)}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">End Date</h4>
                      <p className="text-gray-600">{formatDate(competition.end_date)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Boulders */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Boulders ({boulders.length})
                </CardTitle>
                <CardDescription>
                  Competition boulders and their base point values
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {boulders.map((boulder) => (
                    <div key={boulder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${getBoulderColorClass(boulder.color)}`}></div>
                        <div>
                          <div className="font-medium">Boulder {boulder.identifier}</div>
                          <div className={`text-sm ${getBoulderColorText(boulder.color)}`}>
                            {boulder.color.charAt(0).toUpperCase() + boulder.color.slice(1)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{boulder.base_points} pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Competitors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Competitors ({competitors.length})
                </CardTitle>
                <CardDescription>
                  Registered competitors for this competition
                </CardDescription>
              </CardHeader>
              <CardContent>
                {competitors.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">No competitors registered yet</p>
                ) : (
                  <div className="space-y-2">
                    {competitors.map((competitor) => (
                      <div key={competitor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{competitor.name}</div>
                          <div className="text-sm text-gray-600">
                            #{competitor.competitor_number} • {competitor.category} • {competitor.age_group}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Actions Sidebar */}
          <div>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full" 
                  onClick={() => router.push(`/competitions/${competitionId}/score`)}
                  disabled={!competition.is_active}
                >
                  Submit Scores
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push(`/competitions/${competitionId}/results`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Results
                </Button>
                {isAdmin ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/competitions/${competitionId}/competitors`)}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Manage Competitors
                  </Button>
                ) : !isRegistered && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/competitions/${competitionId}/competitors`)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Register as Competitor
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Boulders</span>
                  <span className="font-semibold">{boulders.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Competitors</span>
                  <span className="font-semibold">{competitors.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`font-semibold ${competition.is_active ? 'text-green-600' : 'text-gray-600'}`}>
                    {competition.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
