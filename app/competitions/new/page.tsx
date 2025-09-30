'use client'

import React, { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Trophy, Plus, Calendar, Users, Target } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { getBoulderColorClass, getBoulderColorClassWithFallback, BOULDER_COLORS } from '../../../lib/scoring'

interface BoulderForm {
  identifier: string
  color: 'green' | 'yellow' | 'orange' | 'red' | 'black'
  base_points: number
}

export default function NewCompetitionPage() {
  const [competitionName, setCompetitionName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [boulders, setBoulders] = useState<BoulderForm[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const addBoulder = () => {
    setBoulders([...boulders, { identifier: '', color: 'green', base_points: 1000 }])
  }

  const updateBoulder = (index: number, field: keyof BoulderForm, value: string | number) => {
    const updated = [...boulders]
    updated[index] = { ...updated[index], [field]: value }
    setBoulders(updated)
  }

  const updateBoulderColor = (index: number, color: string) => {
    const updated = [...boulders]
    updated[index] = { 
      ...updated[index], 
      color: color as any,
      base_points: getBoulderBasePoints(color)
    }
    setBoulders(updated)
  }

  const removeBoulder = (index: number) => {
    setBoulders(boulders.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!competitionName || !startDate || !endDate || boulders.length === 0) {
      alert('Please fill in all required fields and add at least one boulder')
      return
    }

    // Validate boulders
    const invalidBoulders = boulders.filter(b => !b.identifier.trim())
    if (invalidBoulders.length > 0) {
      alert('Please fill in all boulder identifiers')
      return
    }

    setLoading(true)
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('You must be logged in to create competitions')
      }

      // Create competition
      const { data: competition, error: compError } = await supabase
        .from('competitions')
        .insert({
          name: competitionName,
          description: description || null,
          start_date: startDate,
          end_date: endDate,
          is_active: false,
          created_by: user.id
        })
        .select()
        .single()

      if (compError) throw compError

      // Create boulders
      const boulderData = boulders.map(boulder => ({
        competition_id: competition.id,
        identifier: boulder.identifier,
        color: boulder.color,
        base_points: boulder.base_points
      }))

      const { error: boulderError } = await supabase
        .from('boulders')
        .insert(boulderData)

      if (boulderError) throw boulderError

      alert('Competition created successfully!')
      router.push(`/competitions/${competition.id}`)
    } catch (error) {
      console.error('Error creating competition:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Error creating competition: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const getBoulderBasePoints = (color: string) => {
    return BOULDER_COLORS.find(c => c.color === color)?.basePoints || 1000
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
                <h1 className="text-xl font-semibold text-gray-900">Create Competition</h1>
                <p className="text-sm text-gray-600">Set up a new boulder competition</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-primary' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="font-medium">Basic Info</span>
            </div>
            <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-primary' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="font-medium">Boulders</span>
            </div>
            <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-primary' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="font-medium">Review</span>
            </div>
          </div>
        </div>

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Competition Details
              </CardTitle>
              <CardDescription>
                Enter the basic information for your competition
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Competition Name *
                </label>
                <input
                  type="text"
                  value={competitionName}
                  onChange={(e) => setCompetitionName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Spring Boulder Championship"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Optional description of the competition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!competitionName || !startDate || !endDate}>
                  Next: Add Boulders
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Boulders */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Competition Boulders
              </CardTitle>
              <CardDescription>
                Add the boulders for this competition. Each boulder needs an identifier and color.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                {boulders.map((boulder, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Identifier
                          </label>
                          <input
                            type="text"
                            value={boulder.identifier}
                            onChange={(e) => updateBoulder(index, 'identifier', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="e.g., G1, Y2, B3"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Color
                          </label>
                          <select
                            value={boulder.color}
                            onChange={(e) => updateBoulderColor(index, e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {BOULDER_COLORS.map(color => (
                              <option key={color.color} value={color.color}>
                                {color.color.charAt(0).toUpperCase() + color.color.slice(1)} ({color.basePoints} pts)
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Base Points
                          </label>
                          <input
                            type="number"
                            value={boulder.base_points}
                            onChange={(e) => updateBoulder(index, 'base_points', parseInt(e.target.value))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div 
                        className={`w-6 h-6 rounded-full ${getBoulderColorClassWithFallback(boulder.color)}`}
                        title={`${boulder.color} boulder`}
                      ></div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeBoulder(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={addBoulder}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Boulder
                  </Button>
                  <Button onClick={() => setStep(3)} disabled={boulders.length === 0}>
                    Next: Review
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                Review Competition
              </CardTitle>
              <CardDescription>
                Review your competition details before creating
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Competition Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div><strong>Name:</strong> {competitionName}</div>
                    {description && <div><strong>Description:</strong> {description}</div>}
                    <div><strong>Start Date:</strong> {new Date(startDate).toLocaleDateString()}</div>
                    <div><strong>End Date:</strong> {new Date(endDate).toLocaleDateString()}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Boulders ({boulders.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {boulders.map((boulder, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div 
                          className={`w-4 h-4 rounded-full ${getBoulderColorClassWithFallback(boulder.color)}`}
                          title={`${boulder.color} boulder`}
                        ></div>
                        <div>
                          <div className="font-medium">Boulder {boulder.identifier}</div>
                          <div className="text-sm text-gray-600">
                            {boulder.color.charAt(0).toUpperCase() + boulder.color.slice(1)} - {boulder.base_points} pts
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Competition'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
