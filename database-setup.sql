-- Boulder Competition Scoring Database Setup
-- Run this in your Supabase SQL Editor

-- Create profiles table (if not exists)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create competitions table
CREATE TABLE IF NOT EXISTS competitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create boulders table
CREATE TABLE IF NOT EXISTS boulders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  identifier TEXT NOT NULL,
  color TEXT NOT NULL CHECK (color IN ('green', 'yellow', 'orange', 'red', 'black')),
  base_points INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(competition_id, identifier)
);

-- Create competitors table
CREATE TABLE IF NOT EXISTS competitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('male', 'female', 'other')),
  age_group TEXT NOT NULL CHECK (age_group IN ('u11', 'u13', 'u15', 'u17', 'u19', 'open', 'masters', 'veterans')),
  competitor_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(competition_id, competitor_number),
  UNIQUE(competition_id, user_id)
);

-- Create scores table
CREATE TABLE IF NOT EXISTS scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
  boulder_id UUID REFERENCES boulders(id) ON DELETE CASCADE,
  topped BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(competitor_id, boulder_id)
);

-- Create boulder_stats table for caching calculated points
CREATE TABLE IF NOT EXISTS boulder_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  boulder_id UUID REFERENCES boulders(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('male', 'female', 'other')),
  age_group TEXT NOT NULL CHECK (age_group IN ('u11', 'u13', 'u15', 'u17', 'u19', 'open', 'masters', 'veterans')),
  tops_count INTEGER NOT NULL DEFAULT 0,
  calculated_points DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(boulder_id, category, age_group)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE boulders ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE boulder_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Competitions policies (public read, admin write)
CREATE POLICY "Anyone can view competitions" ON competitions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert competitions" ON competitions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Competition creators can update their competitions" ON competitions FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Competition creators can delete their competitions" ON competitions FOR DELETE USING (auth.uid() = created_by);

-- Boulders policies (public read, admin write)
CREATE POLICY "Anyone can view boulders" ON boulders FOR SELECT USING (true);
CREATE POLICY "Competition creators can insert boulders" ON boulders FOR INSERT WITH CHECK (
  auth.uid() = (SELECT created_by FROM competitions WHERE id = competition_id)
);
CREATE POLICY "Competition creators can update boulders" ON boulders FOR UPDATE USING (
  auth.uid() = (SELECT created_by FROM competitions WHERE id = competition_id)
);
CREATE POLICY "Competition creators can delete boulders" ON boulders FOR DELETE USING (
  auth.uid() = (SELECT created_by FROM competitions WHERE id = competition_id)
);

-- Competitors policies (public read, authenticated write)
CREATE POLICY "Anyone can view competitors" ON competitors FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert competitor entries" ON competitors FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own competitor entry" ON competitors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Competition creators can manage all competitors" ON competitors FOR ALL USING (
  auth.uid() = (SELECT created_by FROM competitions WHERE id = competition_id)
);

-- Scores policies
CREATE POLICY "Anyone can view scores" ON scores FOR SELECT USING (true);
CREATE POLICY "Users can insert own scores" ON scores FOR INSERT WITH CHECK (
  auth.uid() = (SELECT user_id FROM competitors WHERE id = competitor_id)
);
CREATE POLICY "Users can update own scores" ON scores FOR UPDATE USING (
  auth.uid() = (SELECT user_id FROM competitors WHERE id = competitor_id)
);

-- Boulder stats policies (public read)
CREATE POLICY "Anyone can view boulder stats" ON boulder_stats FOR SELECT USING (true);
CREATE POLICY "System can update boulder stats" ON boulder_stats FOR ALL USING (true);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate boulder points
CREATE OR REPLACE FUNCTION calculate_boulder_points(
  p_boulder_id UUID,
  p_category TEXT,
  p_age_group TEXT
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_base_points INTEGER;
  v_tops_count INTEGER;
  v_calculated_points DECIMAL(10,2);
BEGIN
  -- Get base points from boulder
  SELECT base_points INTO v_base_points
  FROM boulders
  WHERE id = p_boulder_id;
  
  -- Count tops for this boulder in the category/age group
  SELECT COUNT(*) INTO v_tops_count
  FROM scores s
  JOIN competitors c ON s.competitor_id = c.id
  WHERE s.boulder_id = p_boulder_id
    AND s.topped = TRUE
    AND c.category = p_category
    AND c.age_group = p_age_group;
  
  -- Calculate points: base_points + (500 / tops_count)
  IF v_tops_count = 0 THEN
    v_calculated_points := 0;
  ELSE
    v_calculated_points := v_base_points + (500.0 / v_tops_count);
  END IF;
  
  -- Update or insert boulder stats
  INSERT INTO boulder_stats (boulder_id, category, age_group, tops_count, calculated_points)
  VALUES (p_boulder_id, p_category, p_age_group, v_tops_count, v_calculated_points)
  ON CONFLICT (boulder_id, category, age_group)
  DO UPDATE SET
    tops_count = v_tops_count,
    calculated_points = v_calculated_points,
    updated_at = NOW();
  
  RETURN v_calculated_points;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate all boulder stats
CREATE OR REPLACE FUNCTION recalculate_all_boulder_stats(p_competition_id UUID)
RETURNS VOID AS $$
DECLARE
  boulder_record RECORD;
  category_record RECORD;
BEGIN
  -- Clear existing stats for this competition
  DELETE FROM boulder_stats
  WHERE boulder_id IN (SELECT id FROM boulders WHERE competition_id = p_competition_id);
  
  -- Recalculate for each boulder and category combination
  FOR boulder_record IN 
    SELECT id FROM boulders WHERE competition_id = p_competition_id
  LOOP
    FOR category_record IN 
      SELECT DISTINCT category, age_group FROM competitors WHERE competition_id = p_competition_id
    LOOP
      PERFORM calculate_boulder_points(
        boulder_record.id,
        category_record.category,
        category_record.age_group
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate boulder stats when scores change
CREATE OR REPLACE FUNCTION trigger_recalculate_boulder_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_competition_id UUID;
  v_category TEXT;
  v_age_group TEXT;
BEGIN
  -- Get competition and competitor info
  SELECT c.competition_id, comp.category, comp.age_group
  INTO v_competition_id, v_category, v_age_group
  FROM competitors comp
  JOIN competitions c ON comp.competition_id = c.id
  WHERE comp.id = COALESCE(NEW.competitor_id, OLD.competitor_id);
  
  -- Recalculate stats for this boulder and category
  PERFORM calculate_boulder_points(
    COALESCE(NEW.boulder_id, OLD.boulder_id),
    v_category,
    v_age_group
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for score changes
DROP TRIGGER IF EXISTS on_score_change ON scores;
CREATE TRIGGER on_score_change
  AFTER INSERT OR UPDATE OR DELETE ON scores
  FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_boulder_stats();

-- Insert sample data (optional)
INSERT INTO competitions (name, description, start_date, end_date, is_active) VALUES
('Sample Boulder Competition', 'A sample competition to test the scoring system', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', true);

-- Get the competition ID for sample boulders
DO $$
DECLARE
  v_competition_id UUID;
BEGIN
  SELECT id INTO v_competition_id FROM competitions WHERE name = 'Sample Boulder Competition';
  
  -- Insert sample boulders
  INSERT INTO boulders (competition_id, identifier, color, base_points) VALUES
  (v_competition_id, 'G1', 'green', 1000),
  (v_competition_id, 'G2', 'green', 1000),
  (v_competition_id, 'Y1', 'yellow', 1500),
  (v_competition_id, 'Y2', 'yellow', 1500),
  (v_competition_id, 'O1', 'orange', 2000),
  (v_competition_id, 'O2', 'orange', 2000),
  (v_competition_id, 'R1', 'red', 2500),
  (v_competition_id, 'R2', 'red', 2500),
  (v_competition_id, 'B1', 'black', 3000),
  (v_competition_id, 'B2', 'black', 3000);
END $$;
