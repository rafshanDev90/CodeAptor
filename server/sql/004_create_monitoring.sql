-- Codeaptor Monitoring Schema
-- Run in Supabase SQL Editor after 003_create_conversations.sql

CREATE TABLE IF NOT EXISTS servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  domain VARCHAR(255),
  type VARCHAR(20) NOT NULL DEFAULT 'self',
  monitoring_config JSONB NOT NULL DEFAULT '{
    "cpu_warning": 70,
    "cpu_critical": 90,
    "memory_warning": 80,
    "memory_critical": 90,
    "disk_warning": 80,
    "disk_critical": 90,
    "ssl_warning_days": 14,
    "ssl_critical_days": 7
  }',
  telegram_chat_id BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checks (
  id BIGSERIAL PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  check_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  value NUMERIC(10, 2),
  message TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id BIGSERIAL PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  check_type VARCHAR(20) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checks_server_time ON checks (server_id, checked_at DESC);
CREATE INDEX idx_checks_type_time ON checks (check_type, checked_at DESC);
CREATE INDEX idx_alerts_server_open ON alerts (server_id, status) WHERE status = 'open';
CREATE INDEX idx_alerts_type_recent ON alerts (server_id, check_type, created_at DESC);

-- Seed the self-monitoring server (run once)
-- INSERT INTO servers (name, ip_address, domain, type, telegram_chat_id)
-- VALUES ('codeaptor-vps', '127.0.0.1', 'your-domain.com', 'self', 123456789);
