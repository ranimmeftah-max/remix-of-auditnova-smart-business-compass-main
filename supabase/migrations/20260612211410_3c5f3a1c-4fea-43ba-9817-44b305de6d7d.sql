-- Helper: updated_at trigger
CREATE OR REPLACE FUNCTION public.lms_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ============ COURSES ============
CREATE TABLE public.lms_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  cover_url TEXT,
  language TEXT NOT NULL DEFAULT 'ar' CHECK (language IN ('ar','fr','en')),
  level TEXT NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner','intermediate','advanced')),
  category TEXT,
  duration_minutes INTEGER DEFAULT 0,
  price_dzd INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lms_courses TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lms_courses TO authenticated;
GRANT ALL ON public.lms_courses TO service_role;
ALTER TABLE public.lms_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses_select" ON public.lms_courses FOR SELECT
  USING (is_published = true OR public.has_role(auth.uid(),'admin') OR auth.uid() = instructor_id);
CREATE POLICY "courses_admin_all" ON public.lms_courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "courses_instructor_own" ON public.lms_courses FOR ALL TO authenticated
  USING (auth.uid() = instructor_id AND public.has_role(auth.uid(),'instructor'))
  WITH CHECK (auth.uid() = instructor_id AND public.has_role(auth.uid(),'instructor'));
CREATE TRIGGER trg_lms_courses_upd BEFORE UPDATE ON public.lms_courses
  FOR EACH ROW EXECUTE FUNCTION public.lms_set_updated_at();

-- ============ MODULES ============
CREATE TABLE public.lms_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lms_modules_course ON public.lms_modules(course_id, position);
GRANT SELECT ON public.lms_modules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lms_modules TO authenticated;
GRANT ALL ON public.lms_modules TO service_role;
ALTER TABLE public.lms_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modules_select" ON public.lms_modules FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.lms_courses c WHERE c.id = course_id
    AND (c.is_published OR public.has_role(auth.uid(),'admin') OR auth.uid() = c.instructor_id)));
CREATE POLICY "modules_manage" ON public.lms_modules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lms_courses c WHERE c.id = course_id
    AND (public.has_role(auth.uid(),'admin') OR auth.uid() = c.instructor_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lms_courses c WHERE c.id = course_id
    AND (public.has_role(auth.uid(),'admin') OR auth.uid() = c.instructor_id)));

-- ============ LESSONS ============
CREATE TABLE public.lms_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.lms_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_md TEXT,
  video_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  is_free_preview BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lms_lessons_module ON public.lms_lessons(module_id, position);
GRANT SELECT ON public.lms_lessons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lms_lessons TO authenticated;
GRANT ALL ON public.lms_lessons TO service_role;
ALTER TABLE public.lms_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons_select" ON public.lms_lessons FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.lms_modules m
    JOIN public.lms_courses c ON c.id = m.course_id
    WHERE m.id = module_id
    AND (c.is_published OR public.has_role(auth.uid(),'admin') OR auth.uid() = c.instructor_id)));
CREATE POLICY "lessons_manage" ON public.lms_lessons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lms_modules m
    JOIN public.lms_courses c ON c.id = m.course_id
    WHERE m.id = module_id
    AND (public.has_role(auth.uid(),'admin') OR auth.uid() = c.instructor_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lms_modules m
    JOIN public.lms_courses c ON c.id = m.course_id
    WHERE m.id = module_id
    AND (public.has_role(auth.uid(),'admin') OR auth.uid() = c.instructor_id)));

-- ============ QUIZZES ============
CREATE TABLE public.lms_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lms_lessons(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  pass_score INTEGER NOT NULL DEFAULT 70,
  time_limit_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (lesson_id IS NOT NULL OR course_id IS NOT NULL)
);
GRANT SELECT ON public.lms_quizzes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lms_quizzes TO authenticated;
GRANT ALL ON public.lms_quizzes TO service_role;
ALTER TABLE public.lms_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quizzes_select" ON public.lms_quizzes FOR SELECT USING (true);
CREATE POLICY "quizzes_manage" ON public.lms_quizzes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'instructor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'instructor'));

-- ============ QUIZ QUESTIONS ============
CREATE TABLE public.lms_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.lms_quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'single' CHECK (question_type IN ('single','multiple','true_false')),
  points INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lms_qq_quiz ON public.lms_quiz_questions(quiz_id, position);
GRANT SELECT ON public.lms_quiz_questions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lms_quiz_questions TO authenticated;
GRANT ALL ON public.lms_quiz_questions TO service_role;
ALTER TABLE public.lms_quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qq_select" ON public.lms_quiz_questions FOR SELECT USING (true);
CREATE POLICY "qq_manage" ON public.lms_quiz_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'instructor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'instructor'));

-- ============ QUIZ CHOICES ============
CREATE TABLE public.lms_quiz_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.lms_quiz_questions(id) ON DELETE CASCADE,
  choice_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_lms_qc_q ON public.lms_quiz_choices(question_id, position);
GRANT SELECT ON public.lms_quiz_choices TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lms_quiz_choices TO authenticated;
GRANT ALL ON public.lms_quiz_choices TO service_role;
ALTER TABLE public.lms_quiz_choices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qc_select" ON public.lms_quiz_choices FOR SELECT USING (true);
CREATE POLICY "qc_manage" ON public.lms_quiz_choices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'instructor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'instructor'));

-- ============ ENROLLMENTS ============
CREATE TABLE public.lms_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  progress_pct INTEGER NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lms_enrollments TO authenticated;
GRANT ALL ON public.lms_enrollments TO service_role;
ALTER TABLE public.lms_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enr_select" ON public.lms_enrollments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "enr_insert" ON public.lms_enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "enr_update" ON public.lms_enrollments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "enr_delete" ON public.lms_enrollments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ============ LESSON PROGRESS ============
CREATE TABLE public.lms_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lms_lessons(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lms_lesson_progress TO authenticated;
GRANT ALL ON public.lms_lesson_progress TO service_role;
ALTER TABLE public.lms_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_all" ON public.lms_lesson_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ QUIZ ATTEMPTS ============
CREATE TABLE public.lms_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.lms_quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  answers JSONB,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.lms_quiz_attempts TO authenticated;
GRANT ALL ON public.lms_quiz_attempts TO service_role;
ALTER TABLE public.lms_quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_select" ON public.lms_quiz_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "qa_insert" ON public.lms_quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============ CERTIFICATES ============
CREATE TABLE public.lms_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  verification_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12),'hex'),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT ON public.lms_certificates TO anon, authenticated;
GRANT INSERT ON public.lms_certificates TO authenticated;
GRANT ALL ON public.lms_certificates TO service_role;
ALTER TABLE public.lms_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cert_select_public_verify" ON public.lms_certificates FOR SELECT USING (true);
CREATE POLICY "cert_insert_own" ON public.lms_certificates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);