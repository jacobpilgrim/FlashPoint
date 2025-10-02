-- Finals Feature Database Setup
-- Run this in your Supabase SQL Editor after the main database-setup.sql

-- Create finals_boulders table
CREATE TABLE IF NOT EXISTS finals_boulders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  identifier TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('male', 'female')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(competition_id, identifier, category)
);

-- Create finals_scores table
CREATE TABLE IF NOT EXISTS finals_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
  finals_boulder_id UUID REFERENCES finals_boulders(id) ON DELETE CASCADE,
  topped BOOLEAN NOT NULL DEFAULT FALSE,
  zone BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INTEGER NOT NULL DEFAULT 0,
  time_seconds DECIMAL(10,2),
  calculated_score DECIMAL(10,2) NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(competitor_id, finals_boulder_id)
);

-- Create finals_qualifiers table to track who qualified
CREATE TABLE IF NOT EXISTS finals_qualifiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('male', 'female')),
  qualification_rank INTEGER NOT NULL,
  qualification_score DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(competition_id, competitor_id)
);

-- Enable Row Level Security
ALTER TABLE finals_boulders ENABLE ROW LEVEL SECURITY;
ALTER TABLE finals_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE finals_qualifiers ENABLE ROW LEVEL SECURITY;

-- Finals boulders policies (public read, authenticated write)
DROP POLICY IF EXISTS "Anyone can view finals boulders" ON finals_boulders;
CREATE POLICY "Anyone can view finals boulders" ON finals_boulders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert finals boulders" ON finals_boulders;
CREATE POLICY "Authenticated users can insert finals boulders" ON finals_boulders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update finals boulders" ON finals_boulders;
CREATE POLICY "Authenticated users can update finals boulders" ON finals_boulders FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete finals boulders" ON finals_boulders;
CREATE POLICY "Authenticated users can delete finals boulders" ON finals_boulders FOR DELETE USING (auth.uid() IS NOT NULL);

-- Finals scores policies
DROP POLICY IF EXISTS "Anyone can view finals scores" ON finals_scores;
CREATE POLICY "Anyone can view finals scores" ON finals_scores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert finals scores" ON finals_scores;
CREATE POLICY "Authenticated users can insert finals scores" ON finals_scores FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update finals scores" ON finals_scores;
CREATE POLICY "Authenticated users can update finals scores" ON finals_scores FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Finals qualifiers policies
DROP POLICY IF EXISTS "Anyone can view finals qualifiers" ON finals_qualifiers;
CREATE POLICY "Anyone can view finals qualifiers" ON finals_qualifiers FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can manage finals qualifiers" ON finals_qualifiers;
CREATE POLICY "System can manage finals qualifiers" ON finals_qualifiers FOR ALL USING (true);

-- Function to calculate finals score for a single attempt
CREATE OR REPLACE FUNCTION calculate_finals_score(
  p_topped BOOLEAN,
  p_zone BOOLEAN,
  p_attempts INTEGER
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_score DECIMAL(10,2);
  v_penalty DECIMAL(10,2);
BEGIN
  -- Calculate penalty: 0.1 points per attempt
  v_penalty := p_attempts * 0.1;

  -- Calculate base score
  IF p_topped THEN
    v_score := 25.0 - v_penalty;
  ELSIF p_zone THEN
    v_score := 10.0 - v_penalty;
  ELSE
    v_score := 0.0 - v_penalty;
  END IF;

  -- Ensure score doesn't go below 0
  IF v_score < 0 THEN
    v_score := 0;
  END IF;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate finals score
CREATE OR REPLACE FUNCTION trigger_calculate_finals_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.calculated_score := calculate_finals_score(
    NEW.topped,
    NEW.zone,
    NEW.attempts
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for finals score calculation
DROP TRIGGER IF EXISTS on_finals_score_change ON finals_scores;
CREATE TRIGGER on_finals_score_change
  BEFORE INSERT OR UPDATE ON finals_scores
  FOR EACH ROW EXECUTE FUNCTION trigger_calculate_finals_score();

-- Function to qualify top 6 competitors for finals
CREATE OR REPLACE FUNCTION qualify_competitors_for_finals(
  p_competition_id UUID,
  p_category TEXT
)
RETURNS TABLE(
  competitor_id UUID,
  competitor_name TEXT,
  qualification_rank INTEGER,
  qualification_score DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH competitor_totals AS (
    SELECT
      c.id,
      c.name,
      COALESCE(SUM(
        CASE
          WHEN s.topped THEN bs.calculated_points
          ELSE 0
        END
      ), 0) as total_score
    FROM competitors c
    LEFT JOIN scores s ON c.id = s.competitor_id
    LEFT JOIN boulder_stats bs ON s.boulder_id = bs.boulder_id
      AND bs.category = c.category
      AND bs.age_group = c.age_group
    WHERE c.competition_id = p_competition_id
      AND c.category = p_category
      AND c.age_group = 'open'
    GROUP BY c.id, c.name
    ORDER BY total_score DESC
    LIMIT 6
  ),
  ranked_competitors AS (
    SELECT
      id,
      name,
      ROW_NUMBER() OVER (ORDER BY total_score DESC) as rank,
      total_score
    FROM competitor_totals
  )
  SELECT
    id as competitor_id,
    name as competitor_name,
    rank::INTEGER as qualification_rank,
    total_score as qualification_score
  FROM ranked_competitors;
END;
$$ LANGUAGE plpgsql;

-- Function to populate finals qualifiers table
CREATE OR REPLACE FUNCTION populate_finals_qualifiers(p_competition_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Clear existing qualifiers for this competition
  DELETE FROM finals_qualifiers WHERE competition_id = p_competition_id;

  -- Insert male qualifiers
  INSERT INTO finals_qualifiers (competition_id, competitor_id, category, qualification_rank, qualification_score)
  SELECT
    p_competition_id,
    q.competitor_id,
    'male',
    q.qualification_rank,
    q.qualification_score
  FROM qualify_competitors_for_finals(p_competition_id, 'male') q;

  -- Insert female qualifiers
  INSERT INTO finals_qualifiers (competition_id, competitor_id, category, qualification_rank, qualification_score)
  SELECT
    p_competition_id,
    q.competitor_id,
    'female',
    q.qualification_rank,
    q.qualification_score
  FROM qualify_competitors_for_finals(p_competition_id, 'female') q;
END;
$$ LANGUAGE plpgsql;

-- Function to get finals leaderboard
CREATE OR REPLACE FUNCTION get_finals_leaderboard(
  p_competition_id UUID,
  p_category TEXT
)
RETURNS TABLE(
  competitor_id UUID,
  competitor_name TEXT,
  qualification_rank INTEGER,
  total_finals_score DECIMAL(10,2),
  tops_count INTEGER,
  zones_count INTEGER,
  total_attempts INTEGER,
  total_time DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as competitor_id,
    c.name as competitor_name,
    fq.qualification_rank,
    COALESCE(SUM(fs.calculated_score), 0) as total_finals_score,
    COALESCE(SUM(CASE WHEN fs.topped THEN 1 ELSE 0 END)::INTEGER, 0) as tops_count,
    COALESCE(SUM(CASE WHEN fs.zone AND NOT fs.topped THEN 1 ELSE 0 END)::INTEGER, 0) as zones_count,
    COALESCE(SUM(fs.attempts)::INTEGER, 0) as total_attempts,
    COALESCE(SUM(fs.time_seconds), 0) as total_time
  FROM competitors c
  JOIN finals_qualifiers fq ON c.id = fq.competitor_id
  LEFT JOIN finals_scores fs ON c.id = fs.competitor_id
  WHERE fq.competition_id = p_competition_id
    AND fq.category = p_category
  GROUP BY c.id, c.name, fq.qualification_rank
  ORDER BY total_finals_score DESC, tops_count DESC, zones_count DESC, total_attempts ASC, total_time ASC;
END;
$$ LANGUAGE plpgsql;
