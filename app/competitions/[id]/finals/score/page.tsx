'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/database.types'
import { calculateFinalsScore } from '@/lib/scoring'

type FinalsBoulder = Database['public']['Tables']['finals_boulders']['Row']
type FinalsQualifier = Database['public']['Tables']['finals_qualifiers']['Row']
type FinalsScore = Database['public']['Tables']['finals_scores']['Row']
type Competitor = Database['public']['Tables']['competitors']['Row']

interface QualifierWithCompetitor extends FinalsQualifier {
  competitor: Competitor
}

export default function FinalsScorePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [category, setCategory] = useState<'male' | 'female'>('male')
  const [qualifiers, setQualifiers] = useState<QualifierWithCompetitor[]>([])
  const [boulders, setBoulders] = useState<FinalsBoulder[]>([])
  const [scores, setScores] = useState<FinalsScore[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    // Load qualifiers
    const { data: qualifiersData } = await supabase
      .from('finals_qualifiers')
      .select(`
        *,
        competitor:competitors(*)
      `)
      .eq('competition_id', params.id)
      .eq('category', category)
      .order('qualification_rank')

    if (qualifiersData) {
      setQualifiers(qualifiersData as any)
    }

    // Load boulders
    const { data: bouldersData } = await supabase
      .from('finals_boulders')
      .select('*')
      .eq('competition_id', params.id)
      .eq('category', category)
      .order('identifier')

    if (bouldersData) {
      setBoulders(bouldersData)
    }

    // Load scores
    if (qualifiersData && bouldersData) {
      const competitorIds = qualifiersData.map(q => q.competitor_id)
      const { data: scoresData } = await supabase
        .from('finals_scores')
        .select('*')
        .in('competitor_id', competitorIds)

      if (scoresData) {
        setScores(scoresData)
      }
    }
  }

  const updateScore = async (
    competitorId: string,
    boulderId: string,
    field: 'topped' | 'zone' | 'attempts' | 'time_seconds',
    value: boolean | number
  ) => {
    setLoading(true)
    try {
      const existingScore = scores.find(
        s => s.competitor_id === competitorId && s.finals_boulder_id === boulderId
      )

      if (existingScore) {
        const updates: any = { [field]: value }

        // If topped is set to true, zone should be false (zone only counts if top not achieved)
        if (field === 'topped' && value === true) {
          updates.zone = false
        }

        const { error } = await supabase
          .from('finals_scores')
          .update(updates)
          .eq('id', existingScore.id)

        if (error) throw error
      } else {
        const newScore = {
          competitor_id: competitorId,
          finals_boulder_id: boulderId,
          topped: field === 'topped' ? value : false,
          zone: field === 'zone' ? value : false,
          attempts: field === 'attempts' ? value : 0,
          time_seconds: field === 'time_seconds' ? value : null
        }

        const { error } = await supabase
          .from('finals_scores')
          .insert(newScore)

        if (error) throw error
      }

      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update score')
    } finally {
      setLoading(false)
    }
  }

  const getScore = (competitorId: string, boulderId: string) => {
    return scores.find(
      s => s.competitor_id === competitorId && s.finals_boulder_id === boulderId
    )
  }

  useEffect(() => {
    loadData()
  }, [params.id, category])

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Finals Scoring</h1>
        <p className="text-gray-600 mb-4">
          Top = 25 points | Zone = 10 points (only if top not achieved) | -0.1 per attempt
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => setCategory('male')}
            className={`px-4 py-2 rounded ${
              category === 'male'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Open Men's
          </button>
          <button
            onClick={() => setCategory('female')}
            className={`px-4 py-2 rounded ${
              category === 'female'
                ? 'bg-pink-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Open Women's
          </button>
        </div>
      </div>

      {qualifiers.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-gray-700">No qualifiers found. Please set up finals qualifiers first.</p>
          <button
            onClick={() => router.push(`/competitions/${params.id}/finals/qualify`)}
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            Go to Qualification
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-lg shadow">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">Rank</th>
                <th className="px-4 py-3 text-left">Competitor</th>
                {boulders.map(boulder => (
                  <th key={boulder.id} className="px-4 py-3 text-center" colSpan={4}>
                    {boulder.identifier}
                  </th>
                ))}
                <th className="px-4 py-3 text-center">Total</th>
              </tr>
              <tr className="bg-gray-50 text-sm">
                <th colSpan={2}></th>
                {boulders.map(boulder => (
                  <>
                    <th key={`${boulder.id}-top`} className="px-2 py-1 text-center">Top</th>
                    <th key={`${boulder.id}-zone`} className="px-2 py-1 text-center">Zone</th>
                    <th key={`${boulder.id}-att`} className="px-2 py-1 text-center">Att</th>
                    <th key={`${boulder.id}-time`} className="px-2 py-1 text-center">Time (s)</th>
                  </>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {qualifiers.map((qualifier) => {
                const competitorScores = boulders.map(boulder => {
                  const score = getScore(qualifier.competitor_id, boulder.id)
                  return score || { topped: false, zone: false, attempts: 0 }
                })
                const totalScore = competitorScores.reduce((sum, s) =>
                  sum + calculateFinalsScore(s.topped, s.zone, s.attempts), 0
                )

                return (
                  <tr key={qualifier.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold">#{qualifier.qualification_rank}</td>
                    <td className="px-4 py-3">{qualifier.competitor.name}</td>
                    {boulders.map(boulder => {
                      const score = getScore(qualifier.competitor_id, boulder.id)
                      return (
                        <>
                          <td key={`${boulder.id}-top`} className="px-2 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={score?.topped || false}
                              onChange={(e) => updateScore(
                                qualifier.competitor_id,
                                boulder.id,
                                'topped',
                                e.target.checked
                              )}
                              disabled={loading}
                              className="w-5 h-5"
                            />
                          </td>
                          <td key={`${boulder.id}-zone`} className="px-2 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={score?.zone || false}
                              disabled={score?.topped || loading}
                              onChange={(e) => updateScore(
                                qualifier.competitor_id,
                                boulder.id,
                                'zone',
                                e.target.checked
                              )}
                              className="w-5 h-5 disabled:opacity-50"
                            />
                          </td>
                          <td key={`${boulder.id}-att`} className="px-2 py-3 text-center">
                            <input
                              type="number"
                              value={score?.attempts || 0}
                              onChange={(e) => updateScore(
                                qualifier.competitor_id,
                                boulder.id,
                                'attempts',
                                parseInt(e.target.value) || 0
                              )}
                              disabled={loading}
                              min="0"
                              className="w-16 px-2 py-1 border rounded text-center"
                            />
                          </td>
                          <td key={`${boulder.id}-time`} className="px-2 py-3 text-center">
                            <input
                              type="number"
                              step="0.01"
                              value={score?.time_seconds || ''}
                              placeholder="--"
                              onChange={(e) => updateScore(
                                qualifier.competitor_id,
                                boulder.id,
                                'time_seconds',
                                parseFloat(e.target.value) || 0
                              )}
                              disabled={loading}
                              min="0"
                              className="w-20 px-2 py-1 border rounded text-center"
                            />
                          </td>
                        </>
                      )
                    })}
                    <td className="px-4 py-3 text-center font-bold text-lg">
                      {totalScore.toFixed(1)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex gap-4">
        <button
          onClick={() => router.push(`/competitions/${params.id}/finals/results`)}
          className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
        >
          View Finals Results
        </button>
        <button
          onClick={() => router.push(`/competitions/${params.id}`)}
          className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
        >
          Back to Competition
        </button>
      </div>
    </div>
  )
}
