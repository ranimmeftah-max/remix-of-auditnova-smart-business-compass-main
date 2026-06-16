## الهدف

تحويل `/dashboard/evaluation` إلى صفحة ذكية تتبدّل حسب نوع الحساب:

- **مستثمر** → لوحة "تقييم فرص الاستثمار" (الميزة الجديدة).
- **مؤسسة / مهني / أكاديمي** → تبقى لوحة تقييم ردود المساعد الحالية كما هي.

---

## 1. قاعدة البيانات (Migration)

### جدول `investment_opportunities`
الحقول الوظيفية (تخطي id/created_at/updated_at القياسية):
- `user_id` — صاحب الفرصة
- `company_name` — اسم الشركة
- `sector` — القطاع (تقنية، صناعة، خدمات، فلاحة…)
- `stage` — مرحلة (Seed / Series A / Growth / Mature)
- `wilaya_code` — الولاية
- `ticket_size_dzd` — مبلغ الاستثمار المطلوب
- `valuation_dzd` — التقييم المُقترح
- `revenue_dzd`, `ebitda_dzd` — أرقام مالية
- `description` — وصف نصي للفرصة
- `notes` — ملاحظات المستثمر
- **خمس درجات تقييم (0-100)**: `score_financial`, `score_legal`, `score_market`, `score_risk`, `score_team`
- `score_overall` — متوسط مرجّح (محسوب تلقائياً)
- `recommendation` — `go` / `hold` / `no_go` / `pending`
- `status` — `screening` / `due_diligence` / `negotiation` / `closed` / `passed`

### الأمان
- RLS مفعّل، سياسة واحدة: المستخدم يدير فرصه فقط (`auth.uid() = user_id`).
- GRANT للـ `authenticated` و `service_role`.
- Trigger لتحديث `updated_at`.
- Trigger لإعادة حساب `score_overall` تلقائياً عند أي تحديث (متوسط الـ 5 درجات، يتجاهل القيم الفارغة).

---

## 2. الواجهة الخلفية (Server Functions)

ملف جديد `src/lib/opportunities.functions.ts`:
- `listOpportunities({ q?, status?, recommendation? })` — قائمة مع فلترة.
- `getOpportunity({ id })` — تفاصيل فرصة.
- `upsertOpportunity({ ...fields })` — إنشاء/تحديث.
- `deleteOpportunity({ id })` — حذف.
- `getInvestorStats()` — إحصاءات عامة: عدد الفرص، إجمالي حجم الصفقات، توزيع التوصيات، متوسط الدرجة.

كلها بـ `requireSupabaseAuth`.

---

## 3. واجهة المستخدم

### Routing ذكي
تعديل `src/routes/_authenticated/dashboard.evaluation.tsx` ليقرأ `account_type` من `profiles`:
- إذا `investor` → عرض `<InvestorEvaluation />`.
- غير ذلك → عرض المكون الحالي `<AssistantFeedbackEvaluation />` (نُخرج المنطق الحالي إلى مكون مستقل).

### مكوّن `InvestorEvaluation`
لوحة من ثلاث طبقات:

**أ. بطاقات الإحصاءات** (4 بطاقات):
- عدد الفرص الكلي
- التوصيات الإيجابية (Go)
- متوسط درجة الجاهزية
- إجمالي حجم الصفقات (DZD)

**ب. فلتر + قائمة الفرص**:
- بحث بالاسم/القطاع
- فلتر حالة (screening/due_diligence/negotiation/closed/passed)
- فلتر توصية (go/hold/no_go/pending)
- زر "+ فرصة جديدة"
- بطاقات Grid لكل فرصة تعرض: الاسم، القطاع، الولاية، المرحلة، Badge للتوصية، Progress للدرجة الكلية، حجم الصفقة.

**ج. Dialog إضافة/تعديل فرصة**:
- نموذج بحقول الجدول.
- 5 منزلقات (Slider) للدرجات الجزئية.
- Select للتوصية والحالة.
- زر حفظ يستدعي `upsertOpportunity`.

### تكامل مع المساعد (مرحلة لاحقة - خارج نطاق هذه الدفعة)
رابط "حلّل بالـ AI" في كل بطاقة يفتح محادثة جديدة مع المساعد ويُرسل ملخص الفرصة كرسالة أولى. سننفّذه لاحقاً.

---

## التفاصيل التقنية

- التحقق من الإدخال: Zod مع حدود معقولة (`min(0).max(100)` للدرجات، `max(255)` للنصوص القصيرة، `max(5000)` للوصف).
- Mutations مع `useMutation` و invalidation للـ queries.
- مكونات shadcn: Card, Dialog, Slider, Select, Input, Textarea, Badge, Progress.
- تنسيق RTL، نصوص عربية.
- تنسيق المبالغ بـ `Intl.NumberFormat("ar-DZ", { style: "currency", currency: "DZD" })`.

---

## ما لن ننفّذه في هذه الدفعة

- تحليل ملفات الشركة بالـ AI (سيُربط لاحقاً بمساعد AuditNova).
- تصدير تقرير PDF لكل فرصة (يمكن إعادة استخدام `export-chat-pdf` لاحقاً).
- مشاركة الفرصة مع أعضاء فريق.
- إشعارات/تذكيرات بالمتابعة.

هذه يمكن إضافتها في دفعات لاحقة بعد التحقق من المسار الأساسي.