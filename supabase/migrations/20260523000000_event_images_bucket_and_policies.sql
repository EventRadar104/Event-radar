-- Create the event-images storage bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for event-images
-- Public read (bucket is public, but policy is still required)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'public_read_event_images'
  ) THEN
    CREATE POLICY "public_read_event_images"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'event-images');
  END IF;
END $$;

-- Authenticated users can upload (INSERT)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'auth_insert_event_images'
  ) THEN
    CREATE POLICY "auth_insert_event_images"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'event-images');
  END IF;
END $$;

-- Authenticated users can update their own files (needed for upsert:true)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'auth_update_event_images'
  ) THEN
    CREATE POLICY "auth_update_event_images"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'event-images');
  END IF;
END $$;

-- Authenticated users can delete their own files
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'auth_delete_event_images'
  ) THEN
    CREATE POLICY "auth_delete_event_images"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'event-images');
  END IF;
END $$;
