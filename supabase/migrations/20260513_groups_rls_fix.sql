-- ─────────────────────────────────────────
-- RLS policy fix for groups feature
-- The initial migration used "created_by" but the actual column is "creator_id".
-- group_votes has no "group_id" column — it links via group_event_id.
--
-- Run this in Supabase SQL editor (Dashboard → SQL editor).
-- ─────────────────────────────────────────

-- Drop all existing group policies (ignore errors if they don't exist)
DO $$ BEGIN
  -- groups
  DROP POLICY IF EXISTS "members_select_groups"              ON groups;
  DROP POLICY IF EXISTS "auth_insert_groups"                 ON groups;
  DROP POLICY IF EXISTS "creator_update_groups"              ON groups;
  DROP POLICY IF EXISTS "creator_delete_groups"              ON groups;
  -- group_members
  DROP POLICY IF EXISTS "members_select_group_members"       ON group_members;
  DROP POLICY IF EXISTS "auth_insert_group_members"          ON group_members;
  DROP POLICY IF EXISTS "leave_or_admin_delete_group_members" ON group_members;
  -- group_events
  DROP POLICY IF EXISTS "members_select_group_events"        ON group_events;
  DROP POLICY IF EXISTS "members_insert_group_events"        ON group_events;
  DROP POLICY IF EXISTS "adder_or_admin_delete_group_events" ON group_events;
  -- group_votes
  DROP POLICY IF EXISTS "members_select_group_votes"         ON group_votes;
  DROP POLICY IF EXISTS "members_insert_group_votes"         ON group_votes;
  DROP POLICY IF EXISTS "users_update_own_votes"             ON group_votes;
  DROP POLICY IF EXISTS "users_delete_own_votes"             ON group_votes;
END $$;

-- Make sure RLS is enabled
ALTER TABLE groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_votes   ENABLE ROW LEVEL SECURITY;

-- ── groups ───────────────────────────────

-- Members can view their own groups
CREATE POLICY "members_select_groups" ON groups
  FOR SELECT USING (
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

-- Authenticated users can create groups (creator_id must match caller)
CREATE POLICY "auth_insert_groups" ON groups
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND creator_id = auth.uid()
  );

-- Only creator can update or delete the group
CREATE POLICY "creator_update_groups" ON groups
  FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "creator_delete_groups" ON groups
  FOR DELETE USING (creator_id = auth.uid());

-- ── group_members ─────────────────────────

CREATE POLICY "members_select_group_members" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "auth_insert_group_members" ON group_members
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

-- Users can remove themselves; group creator can remove anyone
CREATE POLICY "leave_or_admin_delete_group_members" ON group_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR group_id IN (SELECT id FROM groups WHERE creator_id = auth.uid())
  );

-- ── group_events ──────────────────────────

CREATE POLICY "members_select_group_events" ON group_events
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "members_insert_group_events" ON group_events
  FOR INSERT WITH CHECK (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
    AND added_by = auth.uid()
  );

-- Adder or group creator can remove events
CREATE POLICY "adder_or_admin_delete_group_events" ON group_events
  FOR DELETE USING (
    added_by = auth.uid()
    OR group_id IN (SELECT id FROM groups WHERE creator_id = auth.uid())
  );

-- ── group_votes ───────────────────────────
-- Note: group_votes has no group_id column — membership is checked via group_events.

CREATE POLICY "members_select_group_votes" ON group_votes
  FOR SELECT USING (
    group_event_id IN (
      SELECT ge.id FROM group_events ge
      WHERE ge.group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "members_insert_group_votes" ON group_votes
  FOR INSERT WITH CHECK (
    voter_id = auth.uid()
    AND group_event_id IN (
      SELECT ge.id FROM group_events ge
      WHERE ge.group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "users_update_own_votes" ON group_votes
  FOR UPDATE USING (voter_id = auth.uid());

CREATE POLICY "users_delete_own_votes" ON group_votes
  FOR DELETE USING (voter_id = auth.uid());

-- ── Public join helper ────────────────────
-- Lets the /join/[invite_code] page read group name + count without membership.
-- Drop and recreate in case it was previously created with wrong types.
DROP FUNCTION IF EXISTS get_group_public_info(text);

CREATE OR REPLACE FUNCTION get_group_public_info(p_invite_code text)
RETURNS TABLE (id uuid, name text, cover_image_url text, member_count bigint)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT
    g.id,
    g.name,
    g.cover_image_url,
    COUNT(gm.user_id)::bigint AS member_count
  FROM groups g
  LEFT JOIN group_members gm ON gm.group_id = g.id
  WHERE g.invite_code = p_invite_code
  GROUP BY g.id, g.name, g.cover_image_url;
$$;
