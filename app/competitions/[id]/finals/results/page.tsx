'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Trophy, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../../components/ui/card'
import { Button } from '../../../../../components/ui/button'

interface FinalsResult {
  competitor_id: string
  competitor_name: string
  qualification_rank: number
  total_finals_score: number
  tops_count: number
  zones_count: number
  total_attempts: number
  total_time: number
}

interface Competition {
  id: string
  name: string
  description: string | null
  created_by: string | null
}

export default function FinalsResultsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [category, setCategory] = useState<'male' | 'female'>('male')
  const [results, setResults] = useState<FinalsResult[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const loadResults = async () => {
    setLoading(true)
    try {
      // Fetch competition data
      const { data: competitionData, error: compError } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', params.id)
        .single()

      if (compError) throw compError
      setCompetition(competitionData)

      // Check if current user is admin
      const { data: { user } } = await supabase.auth.getUser()
      if (user && competitionData) {
        setIsAdmin(user.id === competitionData.created_by)
      }

      // Fetch finals results
      const { data, error } = await supabase
        .rpc('get_finals_leaderboard', {
          p_competition_id: params.id,
          p_category: category
        })

      if (error) throw error
      setResults(data || [])
    } catch (err) {
      console.error('Failed to load results:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadResults()
  }, [params.id, category])

  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return 'bg-yellow-400 text-yellow-900'
      case 1: return 'bg-gray-300 text-gray-900'
      case 2: return 'bg-orange-400 text-orange-900'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0: return '🥇'
      case 1: return '🥈'
      case 2: return '🥉'
      default: return `#${index + 1}`
    }
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
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Finals Results</h1>
                <p className="text-sm text-gray-600">{competition?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={loadResults}>
                Refresh
              </Button>
              <Button variant="outline" onClick={() => router.push(`/competitions/${params.id}`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Filter */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <div className="flex gap-2">
            <button
              onClick={() => setCategory('male')}
              className={`px-4 py-2 rounded-md ${
                category === 'male'
                  ? 'bg-primary text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Open Men's
            </button>
            <button
              onClick={() => setCategory('female')}
              className={`px-4 py-2 rounded-md ${
                category === 'female'
                  ? 'bg-primary text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Open Women's
            </button>
          </div>
        </div>

        {results.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No finals results yet</h3>
                <p className="text-gray-600 mb-6">
                  {isAdmin
                    ? 'Complete finals scoring to see results here.'
                    : 'Check back later for finals results.'}
                </p>
                {isAdmin && (
                  <Button onClick={() => router.push(`/competitions/${params.id}/finals/score`)}>
                    Go to Finals Scoring
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {/* Leaderboard Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2" />
                  Finals Leaderboard
                </CardTitle>
                <CardDescription>
                  {results.length} finalists
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left">Rank</th>
                  <th className="px-6 py-3 text-left">Competitor</th>
                  <th className="px-6 py-3 text-center">Qual. Rank</th>
                  <th className="px-6 py-3 text-center">Finals Score</th>
                  <th className="px-6 py-3 text-center">Tops</th>
                  <th className="px-6 py-3 text-center">Zones</th>
                  <th className="px-6 py-3 text-center">Attempts</th>
                  <th className="px-6 py-3 text-center">Time (s)</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr
                    key={result.competitor_id}
                    className={`border-t ${index < 3 ? 'font-semibold' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${getRankColor(index)}`}>
                        <span className="text-lg">{getRankBadge(index)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-lg">{result.competitor_name}</td>
                    <td className="px-6 py-4 text-center text-gray-600">#{result.qualification_rank}</td>
                    <td className="px-6 py-4 text-center text-xl font-bold text-blue-600">
                      {result.total_finals_score.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-center">{result.tops_count}</td>
                    <td className="px-6 py-4 text-center">{result.zones_count}</td>
                    <td className="px-6 py-4 text-center">{result.total_attempts}</td>
                    <td className="px-6 py-4 text-center">{result.total_time ? result.total_time.toFixed(2) : '--'}</td>
                  </tr>
                ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Podium Visual */}
          {results.length >= 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Podium</CardTitle>
              </CardHeader>
              <CardContent>
              <div className="flex items-end justify-center gap-4 max-w-3xl mx-auto">
                {/* 2nd Place */}
                <div className="flex-1 text-center">
                  <div className="bg-gray-300 rounded-t-lg p-4 mb-2">
                    <div className="text-4xl mb-2">🥈</div>
                    <div className="font-bold text-lg">{results[1].competitor_name}</div>
                    <div className="text-2xl font-bold text-gray-700">{results[1].total_finals_score.toFixed(1)}</div>
                  </div>
                  <div className="bg-gray-400 h-24 rounded-b-lg flex items-center justify-center">
                    <span className="text-white font-bold text-3xl">2</span>
                  </div>
                </div>

                {/* 1st Place */}
                <div className="flex-1 text-center">
                  <div className="bg-yellow-300 rounded-t-lg p-4 mb-2">
                    <div className="text-5xl mb-2">🥇</div>
                    <div className="font-bold text-xl">{results[0].competitor_name}</div>
                    <div className="text-3xl font-bold text-yellow-900">{results[0].total_finals_score.toFixed(1)}</div>
                  </div>
                  <div className="bg-yellow-500 h-32 rounded-b-lg flex items-center justify-center">
                    <span className="text-white font-bold text-4xl">1</span>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="flex-1 text-center">
                  <div className="bg-orange-300 rounded-t-lg p-4 mb-2">
                    <div className="text-4xl mb-2">🥉</div>
                    <div className="font-bold text-lg">{results[2].competitor_name}</div>
                    <div className="text-2xl font-bold text-orange-900">{results[2].total_finals_score.toFixed(1)}</div>
                  </div>
                  <div className="bg-orange-500 h-16 rounded-b-lg flex items-center justify-center">
                    <span className="text-white font-bold text-3xl">3</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          )}
        </div>
        )}
      </main>
    </div>
  )
}
