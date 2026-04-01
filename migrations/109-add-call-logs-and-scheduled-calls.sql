-- Migration 109: Add call_configuration, call_logs, and scheduled_calls tables
-- call_configuration holds per-company Twilio/AI credentials and prompts.
-- call_logs and scheduled_calls reference call_configuration instead of companies directly.

BEGIN;

-- ============================================================
-- 1. call_configuration — per-company call settings & credentials
-- ============================================================
CREATE TABLE IF NOT EXISTS call_configuration (
    id                SERIAL PRIMARY KEY,
    company_id        INTEGER REFERENCES companies(id),
    system_prompt     TEXT,
    greeting_prompt   TEXT,
    openai_api_key    VARCHAR(255),
    twl_account_sid   VARCHAR(255),
    twl_auth_token    VARCHAR(255),
    twl_phone_number  VARCHAR(50),
    voice_model       VARCHAR(50) DEFAULT 'gpt-3.5-turbo',
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_configuration_company_id ON call_configuration(company_id);

-- ============================================================
-- 2. call_logs — stores individual call records with transcripts
-- ============================================================
CREATE TABLE IF NOT EXISTS call_logs (
    id                      SERIAL PRIMARY KEY,
    call_configuration_id   INTEGER NOT NULL REFERENCES call_configuration(id),
    company_id             INTEGER REFERENCES companies(id),
    phone_number            VARCHAR(50),
    call_sid                VARCHAR(100) UNIQUE,
    status                  TEXT DEFAULT 'initiated'
                                CHECK (status IN ('initiated', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer')),
    duration_seconds        INTEGER DEFAULT 0,
    transcript              TEXT DEFAULT '',
    summary                 TEXT DEFAULT '',
    analysis                TEXT DEFAULT '',
    created_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_config_id ON call_logs(call_configuration_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_company_id ON call_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_sid ON call_logs(call_sid);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at);

-- ============================================================
-- 3. scheduled_calls — stores calls scheduled for future execution
-- ============================================================
CREATE TABLE IF NOT EXISTS scheduled_calls (
    id                      SERIAL PRIMARY KEY,
    call_configuration_id   INTEGER NOT NULL REFERENCES call_configuration(id),
    company_id             INTEGER REFERENCES companies(id),
    phone_number            VARCHAR(50) NOT NULL,
    contact_name            VARCHAR(100),
    custom_instructions     TEXT,
    scheduled_for           TIMESTAMP NOT NULL,
    status                  TEXT DEFAULT 'pending'
                                CHECK (status IN ('pending', 'called', 'failed', 'cancelled')),
    call_sid                VARCHAR(100),
    error_message           TEXT,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_calls_config_id ON scheduled_calls(call_configuration_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_company_id ON scheduled_calls(company_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_status ON scheduled_calls(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_scheduled_for ON scheduled_calls(scheduled_for);

COMMIT;
