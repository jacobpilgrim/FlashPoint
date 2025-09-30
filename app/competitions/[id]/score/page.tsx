'use client'

import React, { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useParams } from 'next/navigation'
import { Trophy, CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { getBoulderColorClass, getBoulderColorText, BOULDER_COLORS } from '../../../../lib/scoring'

interface Boulder {
  id: string
  identifier: string
  color: 'green' | 'yellow' | 'orange' | 'red' | 'black'
  base_points: number
}

interface Score {
  competitor_id: string
  boulder_id: string
  topped: boolean
  top_time: string | null
}

interface Competition {
  id: string
  name: string
  is_active: boolean
}

export default function ScoreSubmissionPage() {
  const params = useParams()
  const competitionId = params.id as string
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [boulders, setBoulders] = useState<Boulder[]>([])
  const [scores, setScores] = useState<Record<string, Score>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
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

      setCompetition(competitionData)
      setBoulders(bouldersData || [])
    } catch (error) {
      console.error('Error fetching competition data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScoreChange = (competitor_id: string, boulderId: string, topped: boolean, time: string | null ) => {
    setScores(prev => ({
      ...prev,
      [boulderId]: { competitor_id, boulder_id: boulderId, topped, top_time: time }
    }))
  }

  const handleSubmit = async () => {
    if (!competition) return

    setSubmitting(true)
    try {
      const scoreEntries = Object.values(scores).filter(score => score.topped )
      
      if (scoreEntries.length === 0) {
        alert('Please submit at least one score')
        return
      }

      const { error } = await supabase
        .from('scores')
        .insert(scoreEntries.map(score => ({
          ...score,
          submitted_at: new Date().toISOString()
        })))

      if (error) throw error

      alert('Scores submitted successfully!')
      setScores({})
    } catch (error) {
      console.error('Error submitting scores:', error)
      alert('Error submitting scores. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getBoulderBasePoints = (color: string) => {
    return BOULDER_COLORS.find(c => c.color === color)?.basePoints || 0
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

  if (!competition.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Competition is not active</h2>
          <p className="text-gray-600">This competition is not currently accepting score submissions.</p>
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
                <h1 className="text-xl font-semibold text-gray-900">Submit Scores</h1>
                <p className="text-sm text-gray-600">{competition.name}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Score Submission</h2>
          <p className="text-gray-600">
            Submit your scores for each boulder. You can mark boulders as topped, and record the time for black boulders topped.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {boulders.map((boulder) => {
            const score = scores[boulder.id]
            const basePoints = getBoulderBasePoints(boulder.color)
            
            return (
              <Card key={boulder.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <div className={`w-4 h-4 rounded-full mr-3 ${getBoulderColorClass(boulder.color)}`}></div>
                      Boulder {boulder.identifier}
                    </CardTitle>
                    <span className={`text-sm font-medium ${getBoulderColorText(boulder.color)}`}>
                      {basePoints} pts
                    </span>
                  </div>
                  <CardDescription>
                    {boulder.color.charAt(0).toUpperCase() + boulder.color.slice(1)} boulder
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Top Status */}
                    <div className="flex items-center space-x-4">
                      <Button
                        variant={score?.topped ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleScoreChange(score?.competitor_id, boulder.id, true, score?.top_time || null)}
                        className="flex items-center"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Topped
                      </Button>
                      <Button
                        variant={!score?.topped ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleScoreChange(score?.competitor_id, boulder.id, false, score?.top_time || null)}
                        className="flex items-center"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Not Topped
                      </Button>
                    </div>

                    {/* Black Boulder Top Time */}
                    {boulder.color === 'black' && (
                    <div className="flex items-center space-x-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Time Topped
                        </label>
                        <input
                          type="time"
                          value={score?.top_time || ""}
                          onChange={(e) => handleScoreChange(score?.competitor_id, boulder.id, score?.topped || false, e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                    )}

                    {/* Reset Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newScores = { ...scores }
                        delete newScores[boulder.id]
                        setScores(newScores)
                      }}
                      className="flex items-center text-gray-500"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleSubmit}
            disabled={submitting || Object.keys(scores).length === 0}
            size="lg"
            className="px-8"
          >
            {submitting ? 'Submitting...' : 'Submit Scores'}
          </Button>
        </div>
      </main>
    </div>
  )
}
