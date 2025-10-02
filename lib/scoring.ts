import { Database } from './database.types'

type Boulder = Database['public']['Tables']['boulders']['Row']
type Score = Database['public']['Tables']['scores']['Row']
type BoulderStats = Database['public']['Tables']['boulder_stats']['Row']

export interface BoulderColor {
  color: 'green' | 'yellow' | 'orange' | 'red' | 'black'
  basePoints: number
}

export const BOULDER_COLORS: BoulderColor[] = [
  { color: 'green', basePoints: 1000 },
  { color: 'yellow', basePoints: 1500 },
  { color: 'orange', basePoints: 2000 },
  { color: 'red', basePoints: 2500 },
  { color: 'black', basePoints: 3000 },
]

export function calculateBoulderPoints(
  basePoints: number,
  topsCount: number
): number {
  if (topsCount === 0) return 0
  return basePoints + (500 / topsCount)
}

export function calculateCompetitorScore(
  boulders: Boulder[],
  scores: Score[],
  boulderStats: BoulderStats[]
): number {
  const toppedBoulders = scores
    .filter(score => score.topped)
    .map(score => {
      const boulder = boulders.find(b => b.id === score.boulder_id)
      const stats = boulderStats.find(
        stat => stat.boulder_id === score.boulder_id
      )
      if (!boulder || !stats) return 0
      return stats.calculated_points
    })
    .sort((a, b) => b - a) // Sort descending
    .slice(0, 7) // Take top 7

  return toppedBoulders.reduce((sum, points) => sum + points, 0)
}

export function getBoulderColorClass(color: string): string {
  const colorMap: Record<string, string> = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    black: 'bg-gray-900',
  }
  return colorMap[color] || 'bg-gray-500'
}

export function getBoulderColorClassWithFallback(color: string): string {
  // More explicit color mapping with fallbacks
  switch (color) {
    case 'green':
      return 'bg-green-500'
    case 'yellow':
      return 'bg-yellow-500'
    case 'orange':
      return 'bg-orange-500'
    case 'red':
      return 'bg-red-500'
    case 'black':
      return 'bg-gray-900'
    default:
      return 'bg-gray-500'
  }
}

export function getBoulderColorText(color: string): string {
  const colorMap: Record<string, string> = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
    black: 'text-gray-900',
  }
  return colorMap[color] || 'text-gray-600'
}

// Finals scoring functions
export function calculateFinalsScore(
  topped: boolean,
  zone: boolean,
  attempts: number
): number {
  const penalty = attempts * 0.1
  let score: number

  if (topped) {
    score = 25.0 - penalty
  } else if (zone) {
    score = 10.0 - penalty
  } else {
    score = 0.0 - penalty
  }

  // Ensure score doesn't go below 0
  return Math.max(0, score)
}

export function calculateTotalFinalsScore(
  finalsScores: Array<{ topped: boolean; zone: boolean; attempts: number }>
): number {
  return finalsScores.reduce((total, score) => {
    return total + calculateFinalsScore(score.topped, score.zone, score.attempts)
  }, 0)
}
