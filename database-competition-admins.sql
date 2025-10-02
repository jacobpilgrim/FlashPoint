-- Competition Admins Feature
-- Run this in your Supabase SQL Editor

-- Create competition_admins table
CREATE TABLE IF NOT EXISTS competition_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(competition_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE competition_admins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competition_admins
DROP POLICY IF EXISTS "Anyone can view competition admins" ON competition_admins;
CREATE POLICY "Anyone can view competition admins" ON competition_admins FOR SELECT USING (true);

DROP POLICY IF EXISTS "Competition admins can invite other admins" ON competition_admins;
CREATE POLICY "Competition admins can invite other admins" ON competition_admins FOR INSERT WITH CHECK (
  -- User must be creator or existing admin of the competition
  auth.uid() IN (
    SELECT created_by FROM competitions WHERE id = competition_id
    UNION
    SELECT user_id FROM competition_admins WHERE competition_id = competition_admins.competition_id
  )
);

DROP POLICY IF EXISTS "Competition admins can remove other admins" ON competition_admins;
CREATE POLICY "Competition admins can remove other admins" ON competition_admins FOR DELETE USING (
  -- User must be creator or existing admin of the competition
  auth.uid() IN (
    SELECT created_by FROM competitions WHERE id = competition_id
    UNION
    SELECT user_id FROM competition_admins WHERE competition_id = competition_admins.competition_id
  )
);

-- Function to check if user is competition admin (creator or invited admin)
CREATE OR REPLACE FUNCTION is_competition_admin(
  p_competition_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is creator
  SELECT EXISTS (
    SELECT 1 FROM competitions
    WHERE id = p_competition_id
    AND created_by = p_user_id
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN true;
  END IF;

  -- Check if user is invited admin
  SELECT EXISTS (
    SELECT 1 FROM competition_admins
    WHERE competition_id = p_competition_id
    AND user_id = p_user_id
  ) INTO v_is_admin;

  RETURN v_is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically add creator as admin when competition is created
CREATE OR REPLACE FUNCTION add_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add if created_by is not null
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO competition_admins (competition_id, user_id, invited_by)
    VALUES (NEW.id, NEW.created_by, NEW.created_by)
    ON CONFLICT (competition_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to add creator as admin
DROP TRIGGER IF EXISTS on_competition_created ON competitions;
CREATE TRIGGER on_competition_created
  AFTER INSERT ON competitions
  FOR EACH ROW EXECUTE FUNCTION add_creator_as_admin();

-- Function to get all admins for a competition
CREATE OR REPLACE FUNCTION get_competition_admins(p_competition_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  email TEXT,
  full_name TEXT,
  is_creator BOOLEAN,
  invited_by_email TEXT,
  invited_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ca.id,
    ca.user_id,
    p.email,
    p.full_name,
    (c.created_by = ca.user_id) as is_creator,
    inviter.email as invited_by_email,
    ca.invited_at
  FROM competition_admins ca
  JOIN profiles p ON ca.user_id = p.id
  JOIN competitions c ON ca.competition_id = c.id
  LEFT JOIN profiles inviter ON ca.invited_by = inviter.id
  WHERE ca.competition_id = p_competition_id
  ORDER BY
    (c.created_by = ca.user_id) DESC, -- Creator first
    ca.invited_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
