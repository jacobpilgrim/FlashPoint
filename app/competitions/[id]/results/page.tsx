'use client'

import React, { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useParams, useRouter } from 'next/navigation'
import { Trophy, Medal, Users, Target, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { getBoulderColorClass } from '../../../../lib/scoring'

interface Competition {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

interface Score {
  boulder_id: string
  topped: boolean
  top_time: string | null
  boulders?: {
    id: string
    identifier: string
    color: string
    base_points: number
  }
}

interface Competitor {
  id: string
  name: string
  competitor_number: string
  category: 'male' | 'female' | 'other'
  age_group: 'u11' | 'u13' | 'u15' | 'u17' | 'u19' | 'open' | 'masters' | 'veterans'
  total_score: number
  boulders_topped: number
  scores?: Score[]
}

interface Boulder {
  id: string
  identifier: string
  color: 'green' | 'yellow' | 'orange' | 'red' | 'black'
  base_points: number
  tops_count: number
  calculated_points: number
}

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const competitionId = params.id as string
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [boulders, setBoulders] = useState<Boulder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'male' | 'female' | 'other'>('all')
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<'all' | 'u11' | 'u13' | 'u15' | 'u17' | 'u19' | 'open' | 'masters' | 'veterans'>('all')
  const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(null)
  const [statsLookup, setStatsLookup] = useState<Map<string, number>>(new Map())
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (competitionId) {
      fetchResults()
    }
  }, [competitionId])

  const fetchResults = async () => {
    try {
      // Fetch competition
      const { data: competitionData, error: compError } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', competitionId)
        .single()

      if (compError) throw compError

      // Fetch competitors with scores
      const { data: competitorsData, error: competitorsError } = await supabase
        .from('competitors')
        .select(`
          *,
          scores(
            boulder_id,
            topped,
            top_time,
            boulders(
              id,
              identifier,
              color,
              base_points
            )
          )
        `)
        .eq('competition_id', competitionId)

      if (competitorsError) throw competitorsError

      // Fetch boulder statistics for this competition
      const { data: bouldersForStats } = await supabase
        .from('boulders')
        .select('id')
        .eq('competition_id', competitionId)

      const boulderIds = bouldersForStats?.map(b => b.id) || []

      const { data: boulderStatsData, error: statsError } = await supabase
        .from('boulder_stats')
        .select(`
          *,
          boulders(
            id,
            identifier,
            color,
            base_points
          )
        `)
        .in('boulder_id', boulderIds)

      if (statsError) throw statsError

      setCompetition(competitionData)

      // Create a lookup map for boulder stats by boulder_id, category, and age_group
      const newStatsLookup = new Map<string, number>()
      boulderStatsData?.forEach(stat => {
        const key = `${stat.boulder_id}-${stat.category}-${stat.age_group}`
        newStatsLookup.set(key, stat.calculated_points)
      })
      setStatsLookup(newStatsLookup)

      // Process competitors data
      const processedCompetitors = competitorsData?.map(comp => {
        const toppedBoulders = comp.scores?.filter((s: Score) => s.topped) || []
        const totalScore = toppedBoulders.reduce((sum: number, score: Score) => {
          // Look up the calculated points for this boulder/category/age_group combination
          const key = `${score.boulder_id}-${comp.category}-${comp.age_group}`
          const points = newStatsLookup.get(key) || score.boulders?.base_points || 0
          return sum + points
        }, 0)

        return {
          id: comp.id,
          name: comp.name,
          competitor_number: comp.competitor_number,
          category: comp.category,
          age_group: comp.age_group,
          total_score: totalScore,
          boulders_topped: toppedBoulders.length,
          scores: comp.scores || []
        }
      }) || []

      setCompetitors(processedCompetitors)

      // Process boulder statistics
      const processedBoulders = boulderStatsData?.map(stat => ({
        id: stat.boulder_id,
        identifier: stat.boulders?.identifier || '',
        color: stat.boulders?.color || 'green',
        base_points: stat.boulders?.base_points || 0,
        tops_count: stat.tops_count,
        calculated_points: stat.calculated_points
      })) || []

      setBoulders(processedBoulders)
    } catch (error) {
      console.error('Error fetching results:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCompetitors = competitors.filter(comp => {
    if (selectedCategory !== 'all' && comp.category !== selectedCategory) return false
    if (selectedAgeGroup !== 'all' && comp.age_group !== selectedAgeGroup) return false
    return true
  }).sort((a, b) => b.total_score - a.total_score)

  const getMedalIcon = (index: number) => {
    if (index === 0) return <Medal className="h-5 w-5 text-yellow-500" />
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />
    if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />
    return null
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
                <h1 className="text-xl font-semibold text-gray-900">Live Results</h1>
                <p className="text-sm text-gray-600">{competition.name}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button variant="outline" onClick={fetchResults}>
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="all">All Categories</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age Group</label>
              <select
                value={selectedAgeGroup}
                onChange={(e) => setSelectedAgeGroup(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="all">All Age Groups</option>
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Leaderboard */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2" />
                  Leaderboard
                </CardTitle>
                <CardDescription>
                  {filteredCompetitors.length} competitors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredCompetitors.map((competitor, index) => {
                    const isExpanded = expandedCompetitor === competitor.id
                    const toppedScores = competitor.scores?.filter((s: Score) => s.topped) || []

                    // Sort boulders by color order: green, yellow, orange, red, black
                    const colorOrder = { green: 0, yellow: 1, orange: 2, red: 3, black: 4 }
                    const sortedToppedScores = [...toppedScores].sort((a, b) => {
                      const colorA = a.boulders?.color || 'green'
                      const colorB = b.boulders?.color || 'green'
                      return (colorOrder[colorA as keyof typeof colorOrder] || 0) - (colorOrder[colorB as keyof typeof colorOrder] || 0)
                    })

                    return (
                      <div key={competitor.id} className="bg-gray-50 rounded-lg overflow-hidden">
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => setExpandedCompetitor(isExpanded ? null : competitor.id)}
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="flex items-center space-x-2">
                              {getMedalIcon(index)}
                              <span className="font-medium text-lg">#{index + 1}</span>
                            </div>
                            <div>
                              <div className="font-semibold">{competitor.name}</div>
                              <div className="text-sm text-gray-600">
                                #{competitor.competitor_number} • {competitor.category} • {competitor.age_group}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="font-bold text-lg">{competitor.total_score.toLocaleString()}</div>
                              <div className="text-sm text-gray-600">{competitor.boulders_topped} boulders</div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-gray-200 bg-white">
                            <div className="pt-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-3">Boulders Topped</h4>
                              {sortedToppedScores.length === 0 ? (
                                <p className="text-sm text-gray-500">No boulders topped yet (Total scores: {competitor.scores?.length || 0})</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {sortedToppedScores.map((score) => {
                                    const key = `${score.boulder_id}-${competitor.category}-${competitor.age_group}`
                                    const totalPoints = statsLookup.get(key) || score.boulders?.base_points || 0
                                    const basePoints = score.boulders?.base_points || 0
                                    const bonusPoints = totalPoints - basePoints
                                    return (
                                      <div
                                        key={score.boulder_id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded"
                                      >
                                        <div className="flex items-center space-x-2">
                                          <div className={`w-3 h-3 rounded-full ${getBoulderColorClass(score.boulders?.color || 'green')}`}></div>
                                          <div>
                                            <div className="text-sm font-medium">
                                              {score.boulders?.identifier}
                                            </div>
                                            {score.top_time && score.boulders?.color === 'black' && (
                                              <div className="text-xs text-gray-500">{score.top_time}</div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-sm font-semibold text-primary">
                                            {totalPoints.toFixed(0)} pts
                                          </div>
                                          <div className="text-xs text-gray-600">
                                            {basePoints} + {bonusPoints.toFixed(0)} bonus
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Boulder Statistics */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Boulder Statistics
                </CardTitle>
                <CardDescription>
                  Current point values and tops
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {boulders.map((boulder) => (
                    <div key={boulder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${getBoulderColorClass(boulder.color)}`}></div>
                        <div>
                          <div className="font-medium">Boulder {boulder.identifier}</div>
                          <div className="text-sm text-gray-600">{boulder.color}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{boulder.calculated_points.toFixed(0)} pts</div>
                        <div className="text-sm text-gray-600">{boulder.tops_count} tops</div>
                      </div>
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
