'use client'

import React, { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Trophy, Plus, Users, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import Link from 'next/link'

interface Competition {
  id: string
  name: string
  description: string | null
  start_date: string
  end_date: string
  is_active: boolean
  competitor_count?: number
}

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchCompetitions()
  }, [])

  const fetchCompetitions = async () => {
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select(`
          *,
          competitors(count)
        `)
        .order('start_date', { ascending: false })

      if (error) throw error

      const competitionsWithCounts = data?.map(comp => ({
        ...comp,
        competitor_count: comp.competitors?.[0]?.count || 0
      })) || []

      setCompetitions(competitionsWithCounts)
    } catch (error) {
      console.error('Error fetching competitions:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Competitions</h1>
            </div>
            <Link href="/competitions/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Competition
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {competitions.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No competitions yet</h3>
            <p className="text-gray-600 mb-6">Create your first boulder competition to get started.</p>
            <Link href="/competitions/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Competition
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitions.map((competition) => (
              <Card key={competition.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{competition.name}</CardTitle>
                    {competition.is_active && (
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  {competition.description && (
                    <CardDescription>{competition.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(competition.start_date)} - {formatDate(competition.end_date)}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-2" />
                      {competition.competitor_count} competitors
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Link href={`/competitions/${competition.id}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          View Details
                        </Button>
                      </Link>
                      <Link href={`/competitions/${competition.id}/score`} className="flex-1">
                        <Button className="w-full">
                          Submit Score
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
