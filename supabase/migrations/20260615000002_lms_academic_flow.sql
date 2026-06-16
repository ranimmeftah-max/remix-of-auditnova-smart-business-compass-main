ALTER TABLE public.lms_enrollments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.lms_quizzes
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'professor'
  CHECK (source IN ('professor', 'ai'));

ALTER TABLE public.lms_quizzes
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.lms_enrollments SET status = 'approved' WHERE status IS NULL;

DROP POLICY IF EXISTS "enr_select" ON public.lms_enrollments;
CREATE POLICY "enr_select" ON public.lms_enrollments FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.lms_courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "enr_update" ON public.lms_enrollments;
CREATE POLICY "enr_update" ON public.lms_enrollments FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.lms_courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.lms_courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "courses_instructor_own" ON public.lms_courses;
CREATE POLICY "courses_instructor_own" ON public.lms_courses FOR ALL TO authenticated
  USING (
    auth.uid() = instructor_id
    AND (
      public.has_role(auth.uid(), 'instructor')
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.account_subtype = 'Professor'
      )
    )
  )
  WITH CHECK (
    auth.uid() = instructor_id
    AND (
      public.has_role(auth.uid(), 'instructor')
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.account_subtype = 'Professor'
      )
    )
  );

CREATE OR REPLACE FUNCTION public.grant_instructor_role_for_professor()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.account_subtype = 'Professor' AND NEW.account_type = 'academic' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'instructor')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_instructor_on_profile ON public.profiles;
CREATE TRIGGER trg_grant_instructor_on_profile
  AFTER INSERT OR UPDATE OF account_subtype, account_type ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.grant_instructor_role_for_professor();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'instructor'::public.app_role
FROM public.profiles
WHERE account_type = 'academic' AND account_subtype = 'Professor'
ON CONFLICT DO NOTHING;
