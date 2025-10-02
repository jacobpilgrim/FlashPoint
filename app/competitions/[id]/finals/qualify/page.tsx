'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

interface QualifiedCompetitor {
  competitor_id: string
  competitor_name: string
  qualification_rank: number
  qualification_score: number
}

export default function FinalsQualifyPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [maleQualifiers, setMaleQualifiers] = useState<QualifiedCompetitor[]>([])
  const [femaleQualifiers, setFemaleQualifiers] = useState<QualifiedCompetitor[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadQualifiers = async () => {
    try {
      // Load male qualifiers
      const { data: maleData, error: maleError } = await supabase
        .rpc('qualify_competitors_for_finals', {
          p_competition_id: params.id,
          p_category: 'male'
        })

      if (maleError) throw maleError
      setMaleQualifiers(maleData || [])

      // Load female qualifiers
      const { data: femaleData, error: femaleError } = await supabase
        .rpc('qualify_competitors_for_finals', {
          p_competition_id: params.id,
          p_category: 'female'
        })

      if (femaleError) throw femaleError
      setFemaleQualifiers(femaleData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load qualifiers')
    }
  }

  const confirmQualifiers = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .rpc('populate_finals_qualifiers', {
          p_competition_id: params.id
        })

      if (error) throw error

      alert('Finals qualifiers have been confirmed!')
      router.push(`/competitions/${params.id}/finals/boulders`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm qualifiers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQualifiers()
  }, [params.id])

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Finals Qualification</h1>
        <p className="text-gray-600">Top 6 Open Men's and Open Women's competitors qualify for finals</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Open Men's Qualifiers */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Open Men's Qualifiers</h2>
          <div className="space-y-2">
            {maleQualifiers.map((qualifier) => (
              <div
                key={qualifier.competitor_id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg w-8">#{qualifier.qualification_rank}</span>
                  <span className="font-medium">{qualifier.competitor_name}</span>
                </div>
                <span className="text-gray-600">{qualifier.qualification_score.toFixed(2)} pts</span>
              </div>
            ))}
            {maleQualifiers.length === 0 && (
              <p className="text-gray-500 text-center py-4">No qualifiers yet</p>
            )}
          </div>
        </div>

        {/* Open Women's Qualifiers */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Open Women's Qualifiers</h2>
          <div className="space-y-2">
            {femaleQualifiers.map((qualifier) => (
              <div
                key={qualifier.competitor_id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg w-8">#{qualifier.qualification_rank}</span>
                  <span className="font-medium">{qualifier.competitor_name}</span>
                </div>
                <span className="text-gray-600">{qualifier.qualification_score.toFixed(2)} pts</span>
              </div>
            ))}
            {femaleQualifiers.length === 0 && (
              <p className="text-gray-500 text-center py-4">No qualifiers yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={confirmQualifiers}
          disabled={loading || (maleQualifiers.length === 0 && femaleQualifiers.length === 0)}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Confirming...' : 'Confirm Qualifiers & Setup Finals'}
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
