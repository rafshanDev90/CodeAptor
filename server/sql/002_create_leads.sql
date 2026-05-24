-- Codeaptor Leads Schema for Telegram Bot
-- Run in Supabase SQL Editor after 001_create_users.sql

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  username TEXT,
  issue TEXT NOT NULL,
  contact TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'audit',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON leads (status);
CREATE INDEX idx_leads_user_id ON leads (user_id);
CREATE INDEX idx_leads_created_at ON leads (created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_leads_updated_at ON leads;
CREATE TRIGGER trigger_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
