'use client'

import React, { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function TestDatabasePage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const testConnection = async () => {
    setLoading(true)
    setResult('Testing database connection...\n')
    
    try {
      // Test basic connection
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      setResult(prev => prev + `User: ${user ? 'Logged in' : 'Not logged in'}\n`)
      if (userError) setResult(prev => prev + `User error: ${userError.message}\n`)

      // Test competitions table
      const { data: competitions, error: compError } = await supabase
        .from('competitions')
        .select('count')
        .limit(1)
      
      if (compError) {
        setResult(prev => prev + `Competitions table error: ${compError.message}\n`)
      } else {
        setResult(prev => prev + `Competitions table: OK\n`)
      }

      // Test boulders table
      const { data: boulders, error: boulderError } = await supabase
        .from('boulders')
        .select('count')
        .limit(1)
      
      if (boulderError) {
        setResult(prev => prev + `Boulders table error: ${boulderError.message}\n`)
      } else {
        setResult(prev => prev + `Boulders table: OK\n`)
      }

      // Test competitors table
      const { data: competitors, error: competitorError } = await supabase
        .from('competitors')
        .select('count')
        .limit(1)
      
      if (competitorError) {
        setResult(prev => prev + `Competitors table error: ${competitorError.message}\n`)
      } else {
        setResult(prev => prev + `Competitors table: OK\n`)
      }

      // Test scores table
      const { data: scores, error: scoreError } = await supabase
        .from('scores')
        .select('count')
        .limit(1)
      
      if (scoreError) {
        setResult(prev => prev + `Scores table error: ${scoreError.message}\n`)
      } else {
        setResult(prev => prev + `Scores table: OK\n`)
      }

      setResult(prev => prev + '\nDatabase test completed!')
    } catch (error) {
      setResult(prev => prev + `General error: ${error}\n`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>
        
        <button
          onClick={testConnection}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Database Connection'}
        </button>

        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Results:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap">
            {result || 'Click the button to test the database connection'}
          </pre>
        </div>
      </div>
    </div>
  )
}
