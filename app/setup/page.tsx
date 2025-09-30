'use client'

import React, { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function SetupPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const checkSetup = async () => {
    setLoading(true)
    setResult('Checking database setup...\n\n')
    
    try {
      // Check if tables exist by trying to query them
      const tables = ['competitions', 'boulders', 'competitors', 'scores', 'boulder_stats', 'profiles']
      
      for (const table of tables) {
        try {
          const { error } = await supabase
            .from(table)
            .select('*')
            .limit(1)
          
          if (error) {
            setResult(prev => prev + `❌ ${table}: ${error.message}\n`)
          } else {
            setResult(prev => prev + `✅ ${table}: Table exists\n`)
          }
        } catch (err) {
          setResult(prev => prev + `❌ ${table}: ${err}\n`)
        }
      }

      setResult(prev => prev + '\n--- Setup Instructions ---\n')
      setResult(prev => prev + 'If any tables are missing, run the SQL from database-setup.sql in your Supabase SQL Editor.\n')
      setResult(prev => prev + '\n1. Go to your Supabase project dashboard\n')
      setResult(prev => prev + '2. Navigate to SQL Editor\n')
      setResult(prev => prev + '3. Copy and paste the contents of database-setup.sql\n')
      setResult(prev => prev + '4. Click "Run" to execute the SQL\n')
      setResult(prev => prev + '5. Refresh this page to check again\n')

    } catch (error) {
      setResult(prev => prev + `General error: ${error}\n`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Database Setup Checker</h1>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Setup Required</h2>
          <p className="text-yellow-700">
            Before creating competitions, you need to set up the database tables. 
            Run the SQL from <code className="bg-yellow-100 px-2 py-1 rounded">database-setup.sql</code> in your Supabase SQL Editor.
          </p>
        </div>
        
        <button
          onClick={checkSetup}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 mb-4"
        >
          {loading ? 'Checking...' : 'Check Database Setup'}
        </button>

        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Results:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
            {result || 'Click the button to check your database setup'}
          </pre>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Quick Setup Steps:</h3>
          <ol className="list-decimal list-inside text-blue-700 space-y-1">
            <li>Open your Supabase project dashboard</li>
            <li>Go to SQL Editor (in the left sidebar)</li>
            <li>Copy the entire contents of <code>database-setup.sql</code></li>
            <li>Paste it into the SQL Editor</li>
            <li>Click "Run" to execute the SQL</li>
            <li>Come back here and click "Check Database Setup"</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
