ALTER TABLE public.lms_enrollments
  ADD COLUMN IF NOT EXISTS exam_requested_at TIMESTAMPTZ;

DROP POLICY IF EXISTS "quizzes_manage" ON public.lms_quizzes;
CREATE POLICY "quizzes_manage" ON public.lms_quizzes FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'instructor')
    OR EXISTS (
      SELECT 1 FROM public.lms_courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.account_subtype = 'Professor'
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'instructor')
    OR EXISTS (
      SELECT 1 FROM public.lms_courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.account_subtype = 'Professor'
    )
  );

DROP POLICY IF EXISTS "qq_manage" ON public.lms_quiz_questions;
CREATE POLICY "qq_manage" ON public.lms_quiz_questions FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'instructor')
    OR EXISTS (
      SELECT 1 FROM public.lms_quizzes q
      JOIN public.lms_courses c ON c.id = q.course_id
      WHERE q.id = quiz_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.account_subtype = 'Professor'
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'instructor')
    OR EXISTS (
      SELECT 1 FROM public.lms_quizzes q
      JOIN public.lms_courses c ON c.id = q.course_id
      WHERE q.id = quiz_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.account_subtype = 'Professor'
    )
  );

DROP POLICY IF EXISTS "qc_manage" ON public.lms_quiz_choices;
CREATE POLICY "qc_manage" ON public.lms_quiz_choices FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'instructor')
    OR EXISTS (
      SELECT 1 FROM public.lms_quiz_questions qq
      JOIN public.lms_quizzes q ON q.id = qq.quiz_id
      JOIN public.lms_courses c ON c.id = q.course_id
      WHERE qq.id = question_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.account_subtype = 'Professor'
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'instructor')
    OR EXISTS (
      SELECT 1 FROM public.lms_quiz_questions qq
      JOIN public.lms_quizzes q ON q.id = qq.quiz_id
      JOIN public.lms_courses c ON c.id = q.course_id
      WHERE qq.id = question_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.account_subtype = 'Professor'
    )
  );
