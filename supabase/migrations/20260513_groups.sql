-- ─────────────────────────────────────────
-- Groups feature migration
-- Run in Supabase SQL editor
-- ─────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Tables ────────────────────────────────

CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  invite_code text UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  cover_image_url text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_events (
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  added_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, event_id)
);

CREATE TABLE IF NOT EXISTS group_votes (
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  vote smallint NOT NULL CHECK (vote IN (1, -1)),
  PRIMARY KEY (group_id, event_id, user_id)
);

-- ── Row Level Security ────────────────────

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_votes ENABLE ROW LEVEL SECURITY;

-- groups: members can see, creator can mutate
CREATE POLICY "members_select_groups" ON groups
  FOR SELECT USING (
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "auth_insert_groups" ON groups
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND created_by = auth.uid()
  );

CREATE POLICY "creator_update_groups" ON groups
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "creator_delete_groups" ON groups
  FOR DELETE USING (created_by = auth.uid());

-- group_members: members see each other; users can join/leave; creator can kick
CREATE POLICY "members_select_group_members" ON group_members
  FOR SELECT USING (
    group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = auth.uid())
  );

CREATE POLICY "auth_insert_group_members" ON group_members
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

CREATE POLICY "leave_or_admin_delete_group_members" ON group_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR group_id IN (SELECT id FROM groups WHERE created_by = auth.uid())
  );

-- group_events: members see & add; adder or creator can remove
CREATE POLICY "members_select_group_events" ON group_events
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "members_insert_group_events" ON group_events
  FOR INSERT WITH CHECK (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
    AND added_by = auth.uid()
  );

CREATE POLICY "adder_or_admin_delete_group_events" ON group_events
  FOR DELETE USING (
    added_by = auth.uid()
    OR group_id IN (SELECT id FROM groups WHERE created_by = auth.uid())
  );

-- group_votes: members see & cast; users manage their own
CREATE POLICY "members_select_group_votes" ON group_votes
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "members_insert_group_votes" ON group_votes
  FOR INSERT WITH CHECK (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "users_update_own_votes" ON group_votes
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "users_delete_own_votes" ON group_votes
  FOR DELETE USING (user_id = auth.uid());

-- ── Public join helper (bypasses RLS intentionally) ───────────────
-- Used only by the /join/[invite_code] page to show group name + member count
-- without requiring membership. Safe because it only exposes non-sensitive fields.

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

-- ── Storage bucket ────────────────────────
-- Create in Supabase Dashboard → Storage → New bucket:
--   Name:   group-images
--   Public: true
--   Allowed MIME types: image/jpeg, image/png, image/webp
--   Max file size: 10 MB
