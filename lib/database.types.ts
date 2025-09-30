export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      competitions: {
        Row: {
          id: string
          name: string
          description: string | null
          start_date: string
          end_date: string
          is_active: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          start_date: string
          end_date: string
          is_active?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          start_date?: string
          end_date?: string
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      boulders: {
        Row: {
          id: string
          competition_id: string
          identifier: string
          color: 'green' | 'yellow' | 'orange' | 'red' | 'black'
          base_points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          competition_id: string
          identifier: string
          color: 'green' | 'yellow' | 'orange' | 'red' | 'black'
          base_points: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          competition_id?: string
          identifier?: string
          color?: 'green' | 'yellow' | 'orange' | 'red' | 'black'
          base_points?: number
          created_at?: string
          updated_at?: string
        }
      }
      competitors: {
        Row: {
          id: string
          competition_id: string
          user_id: string
          name: string
          category: 'male' | 'female' | 'other'
          age_group: 'u11' | 'u13' | 'u15' | 'u17' | 'u19' | 'open' | 'masters' | 'veterans'
          competitor_number: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          competition_id: string
          user_id: string
          name: string
          category: 'male' | 'female' | 'other'
          age_group: 'u11' | 'u13' | 'u15' | 'u17' | 'u19' | 'open' | 'masters' | 'veterans'
          competitor_number: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          competition_id?: string
          user_id?: string
          name?: string
          category?: 'male' | 'female' | 'other'
          age_group?: 'u11' | 'u13' | 'u15' | 'u17' | 'u19' | 'open' | 'masters' | 'veterans'
          competitor_number?: string
          created_at?: string
          updated_at?: string
        }
      }
      scores: {
        Row: {
          id: string
          competitor_id: string
          boulder_id: string
          topped: boolean
          top_time: string | null
          submitted_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          competitor_id: string
          boulder_id: string
          topped: boolean
          top_time: string | null
          submitted_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          competitor_id?: string
          boulder_id?: string
          topped?: boolean
          top_time?: string | null
          submitted_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      boulder_stats: {
        Row: {
          id: string
          boulder_id: string
          category: 'male' | 'female' | 'other'
          age_group: 'u11' | 'u13' | 'u15' | 'u17' | 'u19' | 'open' | 'masters' | 'veterans'
          tops_count: number
          calculated_points: number
          updated_at: string
        }
        Insert: {
          id?: string
          boulder_id: string
          category: 'male' | 'female' | 'other'
          age_group: 'u11' | 'u13' | 'u15' | 'u17' | 'u19' | 'open' | 'masters' | 'veterans'
          tops_count: number
          calculated_points: number
          updated_at?: string
        }
        Update: {
          id?: string
          boulder_id?: string
          category?: 'male' | 'female' | 'other'
          age_group?: 'u11' | 'u13' | 'u15' | 'u17' | 'u19' | 'open' | 'masters' | 'veterans'
          tops_count?: number
          calculated_points?: number
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}