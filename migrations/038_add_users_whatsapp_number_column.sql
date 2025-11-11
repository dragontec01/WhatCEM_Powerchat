-- Add whatsapp_number column to users table if it doesn't exist
-- This migration ensures the users table has the whatsapp_number column that's defined in the schema

DO $$ 
BEGIN
    -- Check if the whatsapp_number column exists in the users table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'whatsapp_number'
    ) THEN
        -- Add the whatsapp_number column
        ALTER TABLE users ADD COLUMN whatsapp_number TEXT;

        RAISE NOTICE 'Added whatsapp_number column to users table';
    ELSE
        RAISE NOTICE 'whatsapp_number column already exists in users table';
    END IF;
END $$;

-- Add index for whatsapp_number if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_whatsapp_number ON users(whatsapp_number);

-- Add comment for documentation
COMMENT ON COLUMN users.whatsapp_number IS 'The WhatsApp number of the user';
