'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/database.types'

type FinalsBoulder = Database['public']['Tables']['finals_boulders']['Row']

export default function FinalsBoulders({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [maleBoulders, setMaleBoulders] = useState<FinalsBoulder[]>([])
  const [femaleBoulders, setFemaleBoulders] = useState<FinalsBoulder[]>([])
  const [loading, setLoading] = useState(false)

  const loadBoulders = async () => {
    const { data: boulders } = await supabase
      .from('finals_boulders')
      .select('*')
      .eq('competition_id', params.id)
      .order('identifier')

    if (boulders) {
      setMaleBoulders(boulders.filter(b => b.category === 'male'))
      setFemaleBoulders(boulders.filter(b => b.category === 'female'))
    }
  }

  const createBoulders = async () => {
    setLoading(true)
    try {
      const bouldersToCreate = []

      // Create 3 boulders for Open Men's
      for (let i = 1; i <= 3; i++) {
        bouldersToCreate.push({
          competition_id: params.id,
          identifier: `FM${i}`,
          category: 'male' as const
        })
      }

      // Create 3 boulders for Open Women's
      for (let i = 1; i <= 3; i++) {
        bouldersToCreate.push({
          competition_id: params.id,
          identifier: `FF${i}`,
          category: 'female' as const
        })
      }

      const { error } = await supabase
        .from('finals_boulders')
        .insert(bouldersToCreate)

      if (error) throw error

      await loadBoulders()
      alert('Finals boulders created successfully!')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create boulders')
    } finally {
      setLoading(false)
    }
  }

  const deleteBoulder = async (boulderId: string) => {
    if (!confirm('Are you sure you want to delete this boulder?')) return

    const { error } = await supabase
      .from('finals_boulders')
      .delete()
      .eq('id', boulderId)

    if (error) {
      alert(error.message)
    } else {
      await loadBoulders()
    }
  }

  useEffect(() => {
    loadBoulders()
  }, [params.id])

  const totalBoulders = maleBoulders.length + femaleBoulders.length

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Finals Boulders</h1>
        <p className="text-gray-600">Manage finals boulders for Open Men's and Open Women's categories</p>
      </div>

      {totalBoulders === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">No Finals Boulders Yet</h2>
          <p className="text-gray-600 mb-4">
            Create 3 boulders for Open Men's (FM1, FM2, FM3) and 3 for Open Women's (FF1, FF2, FF3)
          </p>
          <button
            onClick={createBoulders}
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            {loading ? 'Creating...' : 'Create Finals Boulders'}
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Open Men's Boulders */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Open Men's Finals Boulders</h2>
            <div className="space-y-2">
              {maleBoulders.map((boulder) => (
                <div
                  key={boulder.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <span className="font-medium">{boulder.identifier}</span>
                  <button
                    onClick={() => deleteBoulder(boulder.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Open Women's Boulders */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Open Women's Finals Boulders</h2>
            <div className="space-y-2">
              {femaleBoulders.map((boulder) => (
                <div
                  key={boulder.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <span className="font-medium">{boulder.identifier}</span>
                  <button
                    onClick={() => deleteBoulder(boulder.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => router.push(`/competitions/${params.id}/finals/score`)}
          disabled={totalBoulders === 0}
          className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Go to Finals Scoring
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
