import { createServerFn } from "@tanstack/react-start";
import { requireAcademicAccount, requireProfessorAccount } from "@/lib/academic-access";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

type Supa = SupabaseClient<Database>;

const lmsAuth = [requireSupabaseAuth, requireAcademicAccount] as const;
const professorAuth = [requireSupabaseAuth, requireProfessorAccount] as const;

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

type EnrollmentRow = {
  id: string;
  progress_pct: number;
  completed_at: string | null;
  enrolled_at: string;
  status?: string;
  exam_requested_at?: string | null;
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  language: "ar" | "fr" | "en";
  level: "beginner" | "intermediate" | "advanced";
  category: string | null;
  duration_minutes: number | null;
  price_dzd: number;
  is_published: boolean;
  instructor_id: string | null;
  created_at: string;
};

export type Lesson = {
  id: string;
  module_id: string;
  title: string;
  content_md: string | null;
  video_url: string | null;
  pdf_url: string | null;
  duration_minutes: number | null;
  position: number;
  is_free_preview: boolean;
};

export type Module = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  lessons: Lesson[];
};

const COURSE_COLS =
  "id,slug,title,subtitle,description,cover_url,language,level,category,duration_minutes,price_dzd,is_published,instructor_id,created_at";

// ============ PUBLIC: list published courses ============
export const listCourses = createServerFn({ method: "GET" })
  .middleware([...lmsAuth])
  .inputValidator((d: { language?: string; level?: string; q?: string } | undefined) =>
    z
      .object({
        language: z.enum(["ar", "fr", "en"]).optional(),
        level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
        q: z.string().max(120).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("lms_courses")
      .select(COURSE_COLS)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(60);
    if (data.language) q = q.eq("language", data.language);
    if (data.level) q = q.eq("level", data.level);
    if (data.q) q = q.ilike("title", `%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { courses: (rows ?? []) as Course[] };
  });

// ============ PUBLIC: course detail by slug ============
export const getCourseBySlug = createServerFn({ method: "GET" })
  .middleware([...lmsAuth])
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: course, error } = await supabaseAdmin
      .from("lms_courses")
      .select(COURSE_COLS)
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!course) return { course: null, modules: [] };

    const { data: modules } = await supabaseAdmin
      .from("lms_modules")
      .select("id,course_id,title,position")
      .eq("course_id", course.id)
      .order("position");
    const moduleRows = (modules ?? []) as Array<{ id: string; course_id: string; title: string; position: number }>;
    const moduleIds = moduleRows.map((m) => m.id);
    const { data: lessons } = await supabaseAdmin
      .from("lms_lessons")
      .select("id,module_id,title,content_md,video_url,pdf_url,duration_minutes,position,is_free_preview")
      .in("module_id", moduleIds.length ? moduleIds : ["00000000-0000-0000-0000-000000000000"])
      .order("position");
    const lessonRows = (lessons ?? []) as Lesson[];

    const withLessons: Module[] = moduleRows.map((m) => ({
      ...m,
      lessons: lessonRows.filter((l) => l.module_id === m.id),
    }));
    return { course: course as Course, modules: withLessons };
  });

// ============ AUTH: my enrollment for a course ============
export const myEnrollment = createServerFn({ method: "POST" })
  .middleware([...lmsAuth])
  .inputValidator((d: { courseId: string }) => z.object({ courseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: enr, error: enrErr } = await supabase
      .from("lms_enrollments")
      .select("id,progress_pct,completed_at,enrolled_at,status,exam_requested_at")
      .eq("course_id", data.courseId)
      .eq("user_id", userId)
      .maybeSingle();
    if (enrErr && !enrErr.message.includes("status") && !enrErr.message.includes("exam_requested_at")) {
      throw new Error(enrErr.message);
    }
    let enrollment: EnrollmentRow | null = enr as EnrollmentRow | null;
    if (enrErr?.message.includes("status") || enrErr?.message.includes("exam_requested_at")) {
      const { data: fallback } = await supabase
        .from("lms_enrollments")
        .select("id,progress_pct,completed_at,enrolled_at")
        .eq("course_id", data.courseId)
        .eq("user_id", userId)
        .maybeSingle();
      enrollment = fallback ? { ...fallback, status: "approved", exam_requested_at: null } : null;
    }

    let assignedQuizId: string | null = null;
    const { data: assignment } = await supabase
      .from("lms_quiz_assignments")
      .select("quiz_id,status")
      .eq("student_id", userId)
      .eq("course_id", data.courseId)
      .in("status", ["assigned", "in_progress"])
      .maybeSingle();
    if (assignment?.quiz_id) assignedQuizId = assignment.quiz_id;

    const { data: progress } = await supabase
      .from("lms_lesson_progress")
      .select("lesson_id,is_completed")
      .eq("user_id", userId);
    const completed = new Set((progress ?? []).filter((p) => p.is_completed).map((p) => p.lesson_id));
    const progressPct = enrollment?.progress_pct ?? 0;
    return {
      enrollment,
      completedLessonIds: Array.from(completed),
      approved: enrollment?.status !== "pending" && enrollment?.status !== "rejected",
      assignedQuizId,
      canRequestExam:
        enrollment?.status === "approved" &&
        progressPct >= 100 &&
        !assignedQuizId &&
        !enrollment?.exam_requested_at,
      examRequested: !!enrollment?.exam_requested_at,
    };
  });

async function profileName(supabase: Supa, userId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("first_name,last_name").eq("id", userId).maybeSingle();
  return data ? `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || "مستخدم" : "مستخدم";
}

async function maybeIssueCertificate(supabase: Supa, userId: string, courseId: string): Promise<string | null> {
  const { data: enr } = await supabase
    .from("lms_enrollments")
    .select("progress_pct,status")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if ((enr as { status?: string } | null)?.status === "rejected") return null;
  if ((enr?.progress_pct ?? 0) < 100) return null;

  const { data: profQuiz } = await supabase.from("lms_quizzes").select("id,source").eq("course_id", courseId);
  const professorQuizIds = (profQuiz ?? [])
    .filter((q) => (q as { source?: string }).source !== "ai")
    .map((q) => q.id);
  if (!professorQuizIds.length) return null;

  const { data: passedAttempt } = await supabase
    .from("lms_quiz_attempts")
    .select("id")
    .eq("user_id", userId)
    .in("quiz_id", professorQuizIds)
    .eq("passed", true)
    .limit(1)
    .maybeSingle();
  if (!passedAttempt) return null;

  const { data: existingCert } = await supabase
    .from("lms_certificates")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (existingCert) return existingCert.id;

  const { data: cert } = await supabase
    .from("lms_certificates")
    .insert({ user_id: userId, course_id: courseId })
    .select("id")
    .single();
  return cert?.id ?? null;
}

// ============ AUTH: enroll ============
export const enrollInCourse = createServerFn({ method: "POST" })
  .middleware([...lmsAuth])
  .inputValidator((d: { courseId: string }) => z.object({ courseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: course } = await supabase
      .from("lms_courses")
      .select("instructor_id,title,slug")
      .eq("id", data.courseId)
      .maybeSingle();
    if (course?.instructor_id === userId) {
      throw new Error("لا يمكنك التسجيل في دورة نشرتها أنت");
    }
    const { data: existing } = await supabase
      .from("lms_enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", data.courseId)
      .maybeSingle();
    if (existing) return { ok: true, id: existing.id, status: "pending" };
    let { data: row, error } = await supabase
      .from("lms_enrollments")
      .insert({ user_id: userId, course_id: data.courseId, progress_pct: 0, status: "pending" })
      .select("id,status")
      .single();
    if (error?.message.includes("status")) {
      ({ data: row, error } = await supabase
        .from("lms_enrollments")
        .insert({ user_id: userId, course_id: data.courseId, progress_pct: 0 })
        .select("id")
        .single());
    }
    if (error) throw new Error(error.message);

    const { notifyUser } = await import("@/lib/notify.server");
    if (course?.instructor_id && course.instructor_id !== userId) {
      const student = await profileName(supabase, userId);
      await notifyUser(supabase, {
        userId: course.instructor_id,
        title: "طلب انضمام جديد",
        body: `${student} يطلب الانضمام إلى دورة «${course.title}»`,
        link: "/dashboard/enrollments",
        type: "info",
      });
    }

    return { ok: true, id: row!.id, status: (row as { status?: string }).status ?? "pending" };
  });

// ============ AUTH: complete lesson and recompute progress ============
export const completeLesson = createServerFn({ method: "POST" })
  .middleware([...lmsAuth])
  .inputValidator((d: { lessonId: string; courseId: string }) =>
    z.object({ lessonId: z.string().uuid(), courseId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: enr } = await supabase
      .from("lms_enrollments")
      .select("status")
      .eq("user_id", userId)
      .eq("course_id", data.courseId)
      .maybeSingle();
    const status = (enr as { status?: string } | null)?.status;
    if (status === "pending") throw new Error("في انتظار موافقة الأستاذ");
    if (status === "rejected") throw new Error("تم رفض طلب التسجيل");
    // Mark lesson done (upsert)
    const { error: upErr } = await supabase
      .from("lms_lesson_progress")
      .upsert(
        { user_id: userId, lesson_id: data.lessonId, is_completed: true, completed_at: new Date().toISOString() },
        { onConflict: "user_id,lesson_id" },
      );
    if (upErr) throw new Error(upErr.message);

    // Recompute progress
    const { data: modules } = await supabase
      .from("lms_modules")
      .select("id")
      .eq("course_id", data.courseId);
    const moduleIds = (modules ?? []).map((m) => m.id);
    const { data: lessons } = await supabase
      .from("lms_lessons")
      .select("id")
      .in("module_id", moduleIds.length ? moduleIds : ["00000000-0000-0000-0000-000000000000"]);
    const total = (lessons ?? []).length;
    const lessonIds = (lessons ?? []).map((l) => l.id);
    const { data: done } = await supabase
      .from("lms_lesson_progress")
      .select("lesson_id")
      .eq("user_id", userId)
      .eq("is_completed", true)
      .in("lesson_id", lessonIds.length ? lessonIds : ["00000000-0000-0000-0000-000000000000"]);
    const completedCount = (done ?? []).length;
    const pct = total === 0 ? 0 : Math.round((completedCount / total) * 100);
    const completedAt = pct >= 100 ? new Date().toISOString() : null;

    await supabase
      .from("lms_enrollments")
      .update({ progress_pct: pct, completed_at: completedAt })
      .eq("user_id", userId)
      .eq("course_id", data.courseId);

    const { data: course } = await supabase
      .from("lms_courses")
      .select("title,instructor_id,slug")
      .eq("id", data.courseId)
      .maybeSingle();
    const { data: lesson } = await supabase.from("lms_lessons").select("title").eq("id", data.lessonId).maybeSingle();

    if (course?.instructor_id && course.instructor_id !== userId) {
      const { notifyUser } = await import("@/lib/notify.server");
      const student = await profileName(supabase, userId);
      if (pct >= 100) {
        await notifyUser(supabase, {
          userId: course.instructor_id,
          title: "أكمل الطالب الدورة",
          body: `${student} أنهى جميع دروس «${course.title}». يمكنك تعيين الامتحان الآن.`,
          link: "/dashboard/enrollments",
          type: "info",
        });
      } else {
        await notifyUser(supabase, {
          userId: course.instructor_id,
          title: "إكمال درس",
          body: `${student} أنهى درس «${lesson?.title ?? "—"}» في دورة «${course.title}»`,
          link: `/dashboard/courses/${course.slug}`,
          type: "info",
        });
      }
    }

    return { progress_pct: pct, completed: pct >= 100, certificateId: null, needsProfessorQuiz: pct >= 100 };
  });

// ============ AUTH: my enrolled courses ============
export const myCourses = createServerFn({ method: "GET" })
  .middleware([...lmsAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("lms_enrollments")
      .select(`id,progress_pct,enrolled_at,completed_at,course:lms_courses(${COURSE_COLS})`)
      .eq("user_id", userId)
      .order("enrolled_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { enrollments: data ?? [] };
  });

// ============ AUTH: my certificates ============
export const myCertificates = createServerFn({ method: "GET" })
  .middleware([...lmsAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("lms_certificates")
      .select(`id,verification_code,issued_at,course:lms_courses(id,slug,title,cover_url)`)
      .eq("user_id", userId)
      .order("issued_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { certificates: data ?? [] };
  });

// ============ PUBLIC: verify certificate ============
export const verifyCertificate = createServerFn({ method: "GET" })
  .inputValidator((d: { code: string }) => z.object({ code: z.string().min(8).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cert } = await supabaseAdmin
      .from("lms_certificates")
      .select(`id,verification_code,issued_at,user_id,course:lms_courses(title,slug)`)
      .eq("verification_code", data.code)
      .maybeSingle();
    if (!cert) return { valid: false as const };
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("first_name,last_name")
      .eq("id", cert.user_id)
      .maybeSingle();
    return {
      valid: true as const,
      certificate: {
        code: cert.verification_code,
        issued_at: cert.issued_at,
        course: cert.course as { title: string; slug: string } | null,
        learner: profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : "",
      },
    };
  });

export const publishCourse = createServerFn({ method: "POST" })
  .middleware([...professorAuth])
  .inputValidator((d) =>
    z
      .object({
        title: z.string().min(3).max(200),
        subtitle: z.string().max(300).optional(),
        description: z.string().min(10).max(8000),
        category: z.string().min(2).max(120),
        level: z.enum(["beginner", "intermediate", "advanced"]),
        language: z.enum(["ar", "fr", "en"]).default("ar"),
        lessonTitle: z.string().min(2).max(200),
        lessonContent: z.string().min(10).max(50000),
        lessonPdfUrl: z.string().url().optional(),
        publish: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const slug = slugify(data.title);
    const { data: course, error: cErr } = await supabase
      .from("lms_courses")
      .insert({
        slug,
        title: data.title,
        subtitle: data.subtitle ?? null,
        description: data.description,
        category: data.category,
        level: data.level,
        language: data.language,
        instructor_id: userId,
        is_published: data.publish,
        price_dzd: 0,
      })
      .select("id,slug")
      .single();
    if (cErr) throw new Error(cErr.message);

    const { data: mod, error: mErr } = await supabase
      .from("lms_modules")
      .insert({ course_id: course.id, title: "الوحدة 1", position: 0 })
      .select("id")
      .single();
    if (mErr) throw new Error(mErr.message);

    const lessonInsert: Record<string, unknown> = {
      module_id: mod.id,
      title: data.lessonTitle,
      content_md: data.lessonContent,
      position: 0,
      is_free_preview: false,
    };
    if (data.lessonPdfUrl) lessonInsert.pdf_url = data.lessonPdfUrl;
    const { error: lErr } = await supabase.from("lms_lessons").insert(lessonInsert);
    if (lErr) throw new Error(lErr.message);

    return { courseId: course.id, slug: course.slug };
  });

export const myTeachingCourses = createServerFn({ method: "GET" })
  .middleware([...professorAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("lms_courses")
      .select(COURSE_COLS)
      .eq("instructor_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const courses = (data ?? []) as Course[];
    const ids = courses.map((c) => c.id);
    const { data: quizzes } = ids.length
      ? await supabase
          .from("lms_quizzes")
          .select("id,title,course_id,source,pass_score,time_limit_minutes")
          .in("course_id", ids)
      : { data: [] };
    const quizzesByCourse = new Map<string, Array<{ id: string; title: string; pass_score: number; time_limit_minutes: number | null }>>();
    for (const q of quizzes ?? []) {
      if ((q as { source?: string }).source === "ai") continue;
      const list = quizzesByCourse.get(q.course_id!) ?? [];
      list.push({
        id: q.id,
        title: q.title,
        pass_score: q.pass_score,
        time_limit_minutes: q.time_limit_minutes,
      });
      quizzesByCourse.set(q.course_id!, list);
    }
    return {
      courses: courses.map((c) => ({
        ...c,
        quizzes: quizzesByCourse.get(c.id) ?? [],
      })),
    };
  });

export const listPendingEnrollments = createServerFn({ method: "GET" })
  .middleware([...professorAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: courses } = await supabase.from("lms_courses").select("id,title").eq("instructor_id", userId);
    const ids = (courses ?? []).map((c) => c.id);
    if (!ids.length) return { requests: [] };

    const { data: quizzes } = await supabase
      .from("lms_quizzes")
      .select("id,title,course_id,source,time_limit_minutes,pass_score")
      .in("course_id", ids);
    const quizzesByCourse = new Map<string, Array<{ id: string; title: string; time_limit_minutes: number | null; pass_score: number }>>();
    for (const qz of quizzes ?? []) {
      if ((qz as { source?: string }).source === "ai") continue;
      const list = quizzesByCourse.get(qz.course_id!) ?? [];
      list.push({
        id: qz.id,
        title: qz.title,
        time_limit_minutes: qz.time_limit_minutes,
        pass_score: qz.pass_score,
      });
      quizzesByCourse.set(qz.course_id!, list);
    }

    const { data: rows, error } = await supabase
      .from("lms_enrollments")
      .select("id,status,enrolled_at,user_id,course_id,progress_pct,completed_at,exam_requested_at")
      .in("course_id", ids)
      .order("enrolled_at", { ascending: false });

    const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,first_name,last_name,account_subtype")
      .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const courseMap = new Map((courses ?? []).map((c) => [c.id, c.title]));

    if (error?.message.includes("status") || error?.message.includes("exam_requested_at")) {
      const { data: fallback } = await supabase
        .from("lms_enrollments")
        .select("id,enrolled_at,user_id,course_id,progress_pct,completed_at")
        .in("course_id", ids)
        .order("enrolled_at", { ascending: false });
      return {
        requests: (fallback ?? []).map((r) => ({
          ...r,
          status: "approved",
          exam_requested_at: null,
          course_title: courseMap.get(r.course_id) ?? "—",
          student: profileMap.get(r.user_id) ?? null,
          quizzes: quizzesByCourse.get(r.course_id) ?? [],
        })),
      };
    }
    if (error) throw new Error(error.message);

    return {
      requests: (rows ?? []).map((r) => ({
        ...r,
        course_title: courseMap.get(r.course_id) ?? "—",
        student: profileMap.get(r.user_id) ?? null,
        quizzes: quizzesByCourse.get(r.course_id) ?? [],
      })),
    };
  });

export const reviewEnrollment = createServerFn({ method: "POST" })
  .middleware([...professorAuth])
  .inputValidator((d) =>
    z.object({ enrollmentId: z.string().uuid(), action: z.enum(["pending", "approved", "rejected"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: enr } = await supabase
      .from("lms_enrollments")
      .select("id,course_id,user_id,status")
      .eq("id", data.enrollmentId)
      .maybeSingle();
    if (!enr) throw new Error("طلب غير موجود");

    const { data: course } = await supabase
      .from("lms_courses")
      .select("instructor_id,title,slug")
      .eq("id", enr.course_id)
      .maybeSingle();
    if (course?.instructor_id !== userId) throw new Error("غير مصرح");

    const { error } = await supabase
      .from("lms_enrollments")
      .update({ status: data.action })
      .eq("id", data.enrollmentId);
    if (error) throw new Error(error.message);

    const prevStatus = (enr as { status?: string }).status;
    if (prevStatus !== data.action && data.action !== "pending") {
      const { notifyUser } = await import("@/lib/notify.server");
      const approved = data.action === "approved";
      await notifyUser(supabase, {
        userId: enr.user_id,
        title: approved ? "تم قبول طلبك" : "تم رفض طلبك",
        body: approved
          ? `تم قبول انضمامك إلى دورة «${course?.title ?? ""}». يمكنك الآن مشاهدة المحتوى.`
          : `تم رفض طلب انضمامك إلى دورة «${course?.title ?? ""}».`,
        link: course?.slug ? `/dashboard/courses/${course.slug}` : "/dashboard/courses",
        type: approved ? "success" : "error",
      });
    }

    return { ok: true };
  });

export const requestProfessorExam = createServerFn({ method: "POST" })
  .middleware([...lmsAuth])
  .inputValidator((d) => z.object({ courseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: enr } = await supabase
      .from("lms_enrollments")
      .select("id,status,progress_pct,exam_requested_at")
      .eq("user_id", userId)
      .eq("course_id", data.courseId)
      .maybeSingle();
    const st = (enr as { status?: string } | null)?.status;
    if (!enr) throw new Error("لم تسجّل في هذه الدورة");
    if (st === "pending") throw new Error("في انتظار موافقة الأستاذ");
    if (st === "rejected") throw new Error("تم رفض طلب التسجيل");
    if ((enr.progress_pct ?? 0) < 100) throw new Error("أكمل جميع الدروس أولاً");

    const { data: existingAssign } = await supabase
      .from("lms_quiz_assignments")
      .select("id")
      .eq("student_id", userId)
      .eq("course_id", data.courseId)
      .in("status", ["assigned", "in_progress"])
      .maybeSingle();
    if (existingAssign) throw new Error("الامتحان معيّن لك بالفعل — انتقل إلى الاختبارات");

    const requestedAt = (enr as { exam_requested_at?: string | null }).exam_requested_at;
    if (requestedAt) throw new Error("تم إرسال طلبك — في انتظار تعيين الأستاذ للامتحان");

    const now = new Date().toISOString();
    const { error: upErr } = await supabase
      .from("lms_enrollments")
      .update({ exam_requested_at: now })
      .eq("id", enr.id);
    if (upErr?.message.includes("exam_requested_at")) {
      throw new Error("طبّق migration exam_requested_at على قاعدة البيانات");
    }
    if (upErr) throw new Error(upErr.message);

    const { data: course } = await supabase
      .from("lms_courses")
      .select("title,instructor_id")
      .eq("id", data.courseId)
      .maybeSingle();
    if (course?.instructor_id) {
      const { notifyUser } = await import("@/lib/notify.server");
      const student = await profileName(supabase, userId);
      await notifyUser(supabase, {
        userId: course.instructor_id,
        title: "طلب اجتياز امتحان",
        body: `${student} أنهى دورة «${course.title}» ويطلب تعيين امتحان الشهادة.`,
        link: "/dashboard/enrollments",
        type: "warning",
      });
    }

    return { ok: true };
  });

export const assignQuizToStudent = createServerFn({ method: "POST" })
  .middleware([...professorAuth])
  .inputValidator((d) =>
    z.object({ quizId: z.string().uuid(), studentId: z.string().uuid(), courseId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: course } = await supabase
      .from("lms_courses")
      .select("instructor_id,title")
      .eq("id", data.courseId)
      .maybeSingle();
    if (course?.instructor_id !== userId) throw new Error("غير مصرح");

    const { data: enr } = await supabase
      .from("lms_enrollments")
      .select("status,progress_pct")
      .eq("user_id", data.studentId)
      .eq("course_id", data.courseId)
      .maybeSingle();
    const st = (enr as { status?: string } | null)?.status;
    if (st !== "approved" && st !== undefined && st !== null) throw new Error("الطالب غير مقبول في الدورة");
    if ((enr?.progress_pct ?? 0) < 100) throw new Error("يجب أن يكمل الطالب جميع الدروس أولاً");

    const { data: quiz } = await supabase
      .from("lms_quizzes")
      .select("id,title,time_limit_minutes")
      .eq("id", data.quizId)
      .eq("course_id", data.courseId)
      .maybeSingle();
    if (!quiz) throw new Error("الاختبار غير موجود");

    const { data: existing } = await supabase
      .from("lms_quiz_assignments")
      .select("id,status")
      .eq("quiz_id", data.quizId)
      .eq("student_id", data.studentId)
      .maybeSingle();
    if (existing?.status === "completed") throw new Error("أكمل الطالب هذا الاختبار مسبقاً");
    if (existing) {
      await supabase
        .from("lms_quiz_assignments")
        .update({ status: "assigned", assigned_at: new Date().toISOString(), started_at: null, expires_at: null })
        .eq("id", existing.id);
    } else {
      const { error } = await supabase.from("lms_quiz_assignments").insert({
        quiz_id: data.quizId,
        student_id: data.studentId,
        assigned_by: userId,
        course_id: data.courseId,
        status: "assigned",
      });
      if (error?.message.includes("lms_quiz_assignments")) {
        throw new Error("طبّق migration lms_quiz_assignments على قاعدة البيانات");
      }
      if (error) throw new Error(error.message);
    }

    await supabase
      .from("lms_enrollments")
      .update({ exam_requested_at: null })
      .eq("user_id", data.studentId)
      .eq("course_id", data.courseId);

    const { notifyUser } = await import("@/lib/notify.server");
    const limit = quiz.time_limit_minutes ? ` (${quiz.time_limit_minutes} دقيقة)` : "";
    await notifyUser(supabase, {
      userId: data.studentId,
      title: "امتحان مطلوب",
      body: `الأستاذ يدعوك لاجتياز «${quiz.title}» في دورة «${course.title}»${limit}`,
      link: `/dashboard/quizzes?quiz=${data.quizId}`,
      type: "warning",
    });

    return { ok: true };
  });

export const listStudentQuizzes = createServerFn({ method: "GET" })
  .middleware([...lmsAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    let professorQuizzes: Array<Record<string, unknown>> = [];
    const { data: assignments, error: assignErr } = await supabase
      .from("lms_quiz_assignments")
      .select("id,status,expires_at,quiz:lms_quizzes(id,title,description,pass_score,time_limit_minutes,source,course_id)")
      .eq("student_id", userId)
      .in("status", ["assigned", "in_progress"]);
    if (!assignErr) {
      professorQuizzes = (assignments ?? [])
        .map((a) => ({
          ...(a.quiz as Record<string, unknown>),
          assignmentId: a.id,
          assignmentStatus: a.status,
          expiresAt: a.expires_at,
        }))
        .filter((q) => q.id && (q as { source?: string }).source !== "ai");
    }

    const { data: enr } = await supabase
      .from("lms_enrollments")
      .select("course_id,status")
      .eq("user_id", userId);
    const approvedIds = (enr ?? [])
      .filter((e) => (e as { status?: string }).status === "approved" || !(e as { status?: string }).status)
      .map((e) => e.course_id);

    let aiQuizzes: Array<Record<string, unknown>> = [];
    if (approvedIds.length) {
      let q = supabase
        .from("lms_quizzes")
        .select("id,title,description,course_id,lesson_id,pass_score,source,time_limit_minutes,created_at")
        .in("course_id", approvedIds)
        .order("created_at", { ascending: false });
      const { data: quizzes, error } = await q;
      if (!error) {
        aiQuizzes = (quizzes ?? []).filter((x) => (x as { source?: string }).source === "ai");
      }
    }

    return { professorQuizzes, aiQuizzes };
  });

export const createProfessorQuiz = createServerFn({ method: "POST" })
  .middleware([...professorAuth])
  .inputValidator((d) =>
    z
      .object({
        courseId: z.string().uuid(),
        title: z.string().min(3).max(200),
        description: z.string().max(1000).optional(),
        passScore: z.number().int().min(1).max(100).default(70),
        timeLimitMinutes: z.number().int().min(1).max(180).optional(),
        questions: z
          .array(
            z.object({
              text: z.string().min(3),
              points: z.number().int().min(1).max(100).default(1),
              choices: z.array(z.object({ text: z.string().min(1), correct: z.boolean() })).min(2).max(6),
            }),
          )
          .min(1)
          .max(20),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: course } = await supabase
      .from("lms_courses")
      .select("instructor_id")
      .eq("id", data.courseId)
      .maybeSingle();
    if (course?.instructor_id !== userId) throw new Error("غير مصرح");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin;

    const insertQuiz: Record<string, unknown> = {
      course_id: data.courseId,
      title: data.title,
      description: data.description ?? null,
      pass_score: data.passScore,
      time_limit_minutes: data.timeLimitMinutes ?? null,
      source: "professor",
      created_by: userId,
    };
    let { data: quiz, error: qErr } = await db.from("lms_quizzes").insert(insertQuiz).select("id").single();
    if (qErr?.message.includes("source")) {
      ({ data: quiz, error: qErr } = await db
        .from("lms_quizzes")
        .insert({
          course_id: data.courseId,
          title: data.title,
          description: data.description ?? null,
          pass_score: data.passScore,
          time_limit_minutes: data.timeLimitMinutes ?? null,
        })
        .select("id")
        .single());
    }
    if (qErr || !quiz) throw new Error(qErr?.message ?? "فشل إنشاء الاختبار");

    for (let qi = 0; qi < data.questions.length; qi++) {
      const q = data.questions[qi];
      const { data: question, error: qqErr } = await db
        .from("lms_quiz_questions")
        .insert({ quiz_id: quiz.id, question_text: q.text, position: qi, points: q.points ?? 1 })
        .select("id")
        .single();
      if (qqErr) throw new Error(qqErr.message);
      for (let ci = 0; ci < q.choices.length; ci++) {
        const c = q.choices[ci];
        const { error: cErr } = await db.from("lms_quiz_choices").insert({
          question_id: question.id,
          choice_text: c.text,
          is_correct: c.correct,
          position: ci,
        });
        if (cErr) throw new Error(cErr.message);
      }
    }
    return { quizId: quiz.id };
  });

export const startQuizAttempt = createServerFn({ method: "POST" })
  .middleware([...lmsAuth])
  .inputValidator((d) => z.object({ quizId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: quiz } = await supabase
      .from("lms_quizzes")
      .select("id,time_limit_minutes,source")
      .eq("id", data.quizId)
      .maybeSingle();
    if (!quiz) throw new Error("اختبار غير موجود");

    const isProfessorQuiz = (quiz as { source?: string }).source !== "ai";
    if (!isProfessorQuiz) {
      return { expiresAt: null as string | null, timeLimitMinutes: quiz.time_limit_minutes };
    }

    const { data: assignment, error } = await supabase
      .from("lms_quiz_assignments")
      .select("id,status,started_at,expires_at")
      .eq("quiz_id", data.quizId)
      .eq("student_id", userId)
      .maybeSingle();
    if (error?.message.includes("lms_quiz_assignments")) {
      throw new Error("لم يُعيَّن هذا الاختبار لك بعد");
    }
    if (!assignment) throw new Error("لم يُعيَّن هذا الاختبار لك بعد");
    if (assignment.status === "completed") throw new Error("أكملت هذا الاختبار مسبقاً");
    if (assignment.status === "expired") throw new Error("انتهى وقت الاختبار");

    const now = new Date();
    if (assignment.expires_at && new Date(assignment.expires_at) < now) {
      await supabase.from("lms_quiz_assignments").update({ status: "expired" }).eq("id", assignment.id);
      throw new Error("انتهى وقت الاختبار");
    }

    if (!assignment.started_at) {
      const limitMin = quiz.time_limit_minutes ?? 30;
      const expires = new Date(now.getTime() + limitMin * 60_000);
      await supabase
        .from("lms_quiz_assignments")
        .update({ started_at: now.toISOString(), expires_at: expires.toISOString(), status: "in_progress" })
        .eq("id", assignment.id);
      return { expiresAt: expires.toISOString(), timeLimitMinutes: limitMin };
    }

    return { expiresAt: assignment.expires_at, timeLimitMinutes: quiz.time_limit_minutes };
  });

export const generateAiQuizForLesson = createServerFn({ method: "POST" })
  .middleware([...lmsAuth])
  .inputValidator((d) => z.object({ lessonId: z.string().uuid(), courseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: enr } = await supabase
      .from("lms_enrollments")
      .select("status")
      .eq("user_id", userId)
      .eq("course_id", data.courseId)
      .maybeSingle();
    const st = (enr as { status?: string } | null)?.status;
    if (st === "pending" || st === "rejected") throw new Error("لا يمكن إنشاء اختبار قبل قبول التسجيل");

    const { data: lesson } = await supabase
      .from("lms_lessons")
      .select("title,content_md")
      .eq("id", data.lessonId)
      .maybeSingle();
    if (!lesson?.content_md) throw new Error("لا يوجد محتوى للدرس");

    const { generateObject } = await import("ai");
    const { resolveChatModel } = await import("@/lib/ai-model.server");
    const { model } = resolveChatModel();
    const { object } = await generateObject({
      model,
      schema: z.object({
        title: z.string(),
        questions: z.array(
          z.object({
            text: z.string(),
            choices: z.array(z.object({ text: z.string(), correct: z.boolean() })).length(4),
          }),
        ),
      }),
      prompt: `أنشئ اختباراً قصيراً (5 أسئلة) بالعربية من محتوى الدرس التالي. عنوان الدرس: ${lesson.title}\n\n${lesson.content_md.slice(0, 6000)}`,
    });

    const insertQuiz: Record<string, unknown> = {
      course_id: data.courseId,
      lesson_id: data.lessonId,
      title: object.title,
      description: "اختبار مولّد بالذكاء الاصطناعي",
      source: "ai",
      created_by: userId,
    };
    let { data: quiz, error: qErr } = await supabase.from("lms_quizzes").insert(insertQuiz).select("id").single();
    if (qErr?.message.includes("source")) {
      ({ data: quiz, error: qErr } = await supabase
        .from("lms_quizzes")
        .insert({
          course_id: data.courseId,
          lesson_id: data.lessonId,
          title: object.title,
          description: "اختبار AI",
        })
        .select("id")
        .single());
    }
    if (qErr || !quiz) throw new Error(qErr?.message ?? "فشل حفظ الاختبار");

    for (let qi = 0; qi < object.questions.length; qi++) {
      const q = object.questions[qi];
      const { data: question, error: qqErr } = await supabase
        .from("lms_quiz_questions")
        .insert({ quiz_id: quiz.id, question_text: q.text, position: qi })
        .select("id")
        .single();
      if (qqErr) throw new Error(qqErr.message);
      for (let ci = 0; ci < q.choices.length; ci++) {
        const c = q.choices[ci];
        await supabase.from("lms_quiz_choices").insert({
          question_id: question.id,
          choice_text: c.text,
          is_correct: c.correct,
          position: ci,
        });
      }
    }
    return { quizId: quiz.id, title: object.title };
  });

export const getQuizDetail = createServerFn({ method: "GET" })
  .middleware([...lmsAuth])
  .inputValidator((d) => z.object({ quizId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: quiz, error } = await supabase
      .from("lms_quizzes")
      .select("id,title,description,pass_score,source,course_id,time_limit_minutes")
      .eq("id", data.quizId)
      .maybeSingle();
    if (error || !quiz) throw new Error("اختبار غير موجود");

    const { data: questions } = await supabase
      .from("lms_quiz_questions")
      .select("id,question_text,position,points")
      .eq("quiz_id", data.quizId)
      .order("position");
    const qIds = (questions ?? []).map((q) => q.id);
    const { data: choices } = await supabase
      .from("lms_quiz_choices")
      .select("id,question_id,choice_text,is_correct,position")
      .in("question_id", qIds.length ? qIds : ["00000000-0000-0000-0000-000000000000"])
      .order("position");

    const withChoices = (questions ?? []).map((q) => ({
      ...q,
      choices: (choices ?? []).filter((c) => c.question_id === q.id).map(({ is_correct, ...rest }) => rest),
      _answers: (choices ?? []).filter((c) => c.question_id === q.id),
    }));

    return { quiz, questions: withChoices };
  });

export const submitQuizAttempt = createServerFn({ method: "POST" })
  .middleware([...lmsAuth])
  .inputValidator((d) =>
    z
      .object({
        quizId: z.string().uuid(),
        answers: z.record(z.string(), z.string()),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: quiz } = await supabase
      .from("lms_quizzes")
      .select("id,pass_score,source,course_id,title,time_limit_minutes")
      .eq("id", data.quizId)
      .maybeSingle();
    if (!quiz) throw new Error("اختبار غير موجود");

    const isProfessorQuiz = (quiz as { source?: string }).source !== "ai";
    if (isProfessorQuiz) {
      const { data: assignment } = await supabase
        .from("lms_quiz_assignments")
        .select("id,status,expires_at")
        .eq("quiz_id", data.quizId)
        .eq("student_id", userId)
        .maybeSingle();
      if (!assignment) throw new Error("لم يُعيَّن هذا الاختبار لك");
      if (assignment.status === "expired") throw new Error("انتهى وقت الاختبار");
      if (assignment.expires_at && new Date(assignment.expires_at) < new Date()) {
        await supabase.from("lms_quiz_assignments").update({ status: "expired" }).eq("id", assignment.id);
        throw new Error("انتهى وقت الاختبار");
      }
    }

    const { data: questions } = await supabase
      .from("lms_quiz_questions")
      .select("id,points")
      .eq("quiz_id", data.quizId);
    const qIds = (questions ?? []).map((q) => q.id);
    const { data: choices } = await supabase
      .from("lms_quiz_choices")
      .select("id,question_id,is_correct")
      .in("question_id", qIds.length ? qIds : ["00000000-0000-0000-0000-000000000000"]);

    let earned = 0;
    let maxPoints = 0;
    for (const q of questions ?? []) {
      const pts = q.points ?? 1;
      maxPoints += pts;
      const correct = (choices ?? []).find((c) => c.question_id === q.id && c.is_correct);
      if (correct && data.answers[q.id] === correct.id) earned += pts;
    }
    const pct = maxPoints === 0 ? 0 : Math.round((earned / maxPoints) * 100);
    const passed = pct >= (quiz.pass_score ?? 70);

    await supabase.from("lms_quiz_attempts").insert({
      user_id: userId,
      quiz_id: data.quizId,
      score: pct,
      max_score: 100,
      passed,
      answers: data.answers,
    });

    if (isProfessorQuiz) {
      await supabase
        .from("lms_quiz_assignments")
        .update({ status: "completed" })
        .eq("quiz_id", data.quizId)
        .eq("student_id", userId);

      if (quiz.course_id) {
        const { data: course } = await supabase
          .from("lms_courses")
          .select("instructor_id,title")
          .eq("id", quiz.course_id)
          .maybeSingle();
        if (course?.instructor_id && course.instructor_id !== userId) {
          const { notifyUser } = await import("@/lib/notify.server");
          const student = await profileName(supabase, userId);
          await notifyUser(supabase, {
            userId: course.instructor_id,
            title: passed ? "نجح الطالب في الامتحان" : "أنهى الطالب الامتحان",
            body: `${student} ${passed ? "نجح" : "أنهى"} في «${quiz.title}» (${pct}%) — دورة «${course.title}»`,
            link: "/dashboard/enrollments",
            type: passed ? "success" : "info",
          });
        }
      }
    }

    let certificateId: string | null = null;
    if (passed && isProfessorQuiz && quiz.course_id) {
      certificateId = await maybeIssueCertificate(supabase, userId, quiz.course_id);
      if (certificateId) {
        const { notifyUser } = await import("@/lib/notify.server");
        await notifyUser(supabase, {
          userId,
          title: "تهانينا! حصلت على الشهادة",
          body: `نجحت في اختبار «${quiz.title}» وحصلت على شهادتك.`,
          link: "/dashboard/certificates",
          type: "success",
        });
      }
    }

    return { score: pct, passed, maxScore: 100, certificateId };
  });
