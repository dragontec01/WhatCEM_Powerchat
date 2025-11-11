-- Migration: Add assign_id to channel_connections (safe/idempotent)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'channel_connections'
      AND column_name = 'assign_id'
  ) THEN
    ALTER TABLE public.channel_connections
      ADD COLUMN assign_id INTEGER;
  END IF;
END $$;

-- Add FK to assigns(id) if table exists and constraint not yet present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'assigns'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'channel_connections'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.constraint_name = 'channel_connections_assign_id_fkey'
    ) THEN
      ALTER TABLE public.channel_connections
        ADD CONSTRAINT channel_connections_assign_id_fkey
        FOREIGN KEY (assign_id) REFERENCES public.assigns(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Helpful index for lookups
CREATE INDEX IF NOT EXISTS idx_channel_connections_assign_id
  ON public.channel_connections(assign_id);
