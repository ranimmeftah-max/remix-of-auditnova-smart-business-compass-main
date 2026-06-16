ALTER TABLE public.lms_lessons
  ADD COLUMN IF NOT EXISTS pdf_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('lms-lessons', 'lms-lessons', true, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "lms_lessons_upload" ON storage.objects;
CREATE POLICY "lms_lessons_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lms-lessons');

DROP POLICY IF EXISTS "lms_lessons_update" ON storage.objects;
CREATE POLICY "lms_lessons_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'lms-lessons');

DROP POLICY IF EXISTS "lms_lessons_read" ON storage.objects;
CREATE POLICY "lms_lessons_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'lms-lessons');
