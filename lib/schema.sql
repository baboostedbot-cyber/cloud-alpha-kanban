# Cloud Alpha Kanban - Database Schema
# Run this in your NEW Supabase project (separate from control-plane)

-- Enable RLS
alter database postgres set "app.jwt_secret" to 'your-jwt-secret';

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assignee TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'done', 'blocked')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  initials TEXT NOT NULL,
  bg TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent TEXT NOT NULL,
  action TEXT NOT NULL,
  task_id TEXT REFERENCES tasks(id),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Create policies (public read/write for kanban board)
CREATE POLICY "Allow all" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON activity_log FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;

-- Insert default agents
INSERT INTO agents (id, name, color, initials, bg) VALUES
  ('pilot', 'Pilot', '#f59e0b', 'PI', '#f59e0b18'),
  ('linus', 'Linus', '#3b82f6', 'LI', '#3b82f618'),
  ('sage', 'Sage', '#8b5cf6', 'SA', '#8b5cf618'),
  ('chadimous', 'Chadimous', '#ec4899', 'CH', '#ec489918'),
  ('oracle', 'Oracle', '#22d3ee', 'OR', '#22d3ee18')
ON CONFLICT (id) DO NOTHING;

-- Insert sample tasks
INSERT INTO tasks (id, title, assignee, priority, status) VALUES
  ('BAB-1', 'Define game server container spec', 'Linus', 'critical', 'backlog'),
  ('BAB-9', 'Backend: WebSocket gateway', 'Linus', 'critical', 'in_progress'),
  ('BAB-11', 'Auth system', 'Linus', 'high', 'review'),
  ('BAB-12', 'Deployment pipeline', 'Linus', 'critical', 'blocked')
ON CONFLICT (id) DO NOTHING;
