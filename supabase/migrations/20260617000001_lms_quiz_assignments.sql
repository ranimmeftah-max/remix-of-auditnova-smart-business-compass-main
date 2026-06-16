CREATE TABLE IF NOT EXISTS public.lms_quiz_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.lms_quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'in_progress', 'completed', 'expired')),
  UNIQUE (quiz_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_lms_quiz_assignments_student ON public.lms_quiz_assignments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_lms_quiz_assignments_course ON public.lms_quiz_assignments(course_id);

GRANT SELECT, INSERT, UPDATE ON public.lms_quiz_assignments TO authenticated;
GRANT ALL ON public.lms_quiz_assignments TO service_role;
ALTER TABLE public.lms_quiz_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qa_assign_select" ON public.lms_quiz_assignments;
CREATE POLICY "qa_assign_select" ON public.lms_quiz_assignments FOR SELECT TO authenticated
  USING (
    auth.uid() = student_id
    OR auth.uid() = assigned_by
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.lms_courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "qa_assign_insert" ON public.lms_quiz_assignments;
CREATE POLICY "qa_assign_insert" ON public.lms_quiz_assignments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = assigned_by
    AND EXISTS (
      SELECT 1 FROM public.lms_courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "qa_assign_update" ON public.lms_quiz_assignments;
CREATE POLICY "qa_assign_update" ON public.lms_quiz_assignments FOR UPDATE TO authenticated
  USING (
    auth.uid() = student_id
    OR auth.uid() = assigned_by
    OR EXISTS (
      SELECT 1 FROM public.lms_courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
  );
