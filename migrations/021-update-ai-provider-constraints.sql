-- Migration: Update AI provider constraints to support streamlined provider system
-- This migration updates the check constraints to only allow OpenAI and OpenRouter providers
-- as part of the AI system streamlining effort

-- Drop existing check constraints
ALTER TABLE system_ai_credentials DROP CONSTRAINT IF EXISTS system_ai_credentials_provider_check;
ALTER TABLE company_ai_credentials DROP CONSTRAINT IF EXISTS company_ai_credentials_provider_check;

-- Add new check constraints with updated provider list
ALTER TABLE system_ai_credentials 
ADD CONSTRAINT system_ai_credentials_provider_check 
CHECK (provider IN ('openai', 'openrouter'));

ALTER TABLE company_ai_credentials 
ADD CONSTRAINT company_ai_credentials_provider_check 
CHECK (provider IN ('openai', 'openrouter'));

-- Update any existing credentials with removed providers to use OpenAI as fallback
-- This ensures data consistency after the constraint update
UPDATE system_ai_credentials 
SET provider = 'openai' 
WHERE provider IN ('anthropic', 'gemini', 'deepseek', 'xai');

UPDATE company_ai_credentials 
SET provider = 'openai' 
WHERE provider IN ('anthropic', 'gemini', 'deepseek', 'xai');

-- Update AI credential usage records to reflect the provider changes
UPDATE ai_credential_usage 
SET provider = 'openai' 
WHERE provider IN ('anthropic', 'gemini', 'deepseek', 'xai');

-- Update company AI preferences to use OpenAI as default if using removed providers
UPDATE company_ai_preferences 
SET default_provider = 'openai' 
WHERE default_provider IN ('anthropic', 'gemini', 'deepseek', 'xai');

-- Add comments for documentation
COMMENT ON CONSTRAINT system_ai_credentials_provider_check ON system_ai_credentials 
IS 'Ensures only OpenAI and OpenRouter providers are allowed in the streamlined AI system';

COMMENT ON CONSTRAINT company_ai_credentials_provider_check ON company_ai_credentials 
IS 'Ensures only OpenAI and OpenRouter providers are allowed in the streamlined AI system';

-- Migration completed successfully
-- This migration updates the AI provider system to only support OpenAI and OpenRouter
