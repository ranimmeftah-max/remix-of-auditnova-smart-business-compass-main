import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { submitSubscription } from "@/lib/subscription.functions";
import {
  ACCOUNT_TYPES,
  plansForAccount,
  SUBSCRIPTION_PLANS,
  SUBTYPES,
  type AccountType,
  type SubscriptionPlanId,
} from "@/lib/account-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

type Wilaya = { code: number; name_ar: string; name_fr: string; name_en: string };

const formSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(20),
  wilayaCode: z.string().min(1),
  accountType: z.enum(ACCOUNT_TYPES),
  accountSubtype: z.string().min(1),
  planId: z.enum(SUBSCRIPTION_PLANS),
});

type SubscribeFormProps = {
  defaultPlan?: SubscriptionPlanId;
  onSuccess?: () => void;
  variant?: "inline" | "dialog";
};

function useWilayas() {
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  useEffect(() => {
    supabase
      .from("wilayas")
      .select("code,name_ar,name_fr,name_en")
      .order("code")
      .then(({ data }) => setWilayas(data ?? []));
  }, []);
  return wilayas;
}

function planLabelKey(planId: SubscriptionPlanId) {
  return `pricing.plans.${planId}.name`;
}

export function SubscribeForm({ defaultPlan = "student_plus", onSuccess, variant = "inline" }: SubscribeFormProps) {
  const { t, i18n } = useTranslation();
  const submitFn = useServerFn(submitSubscription);
  const wilayas = useWilayas();
  const locale = i18n.resolvedLanguage ?? "ar";
  const nameKey = locale === "fr" ? "name_fr" : locale === "en" ? "name_en" : "name_ar";

  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("academic");
  const [subtype, setSubtype] = useState(SUBTYPES.academic[0]);
  const [wilayaCode, setWilayaCode] = useState("");
  const [planId, setPlanId] = useState<SubscriptionPlanId>(defaultPlan);

  const availablePlans = useMemo(() => plansForAccount(accountType, subtype), [accountType, subtype]);

  useEffect(() => setPlanId(defaultPlan), [defaultPlan]);

  useEffect(() => {
    if (!availablePlans.includes(planId)) {
      setPlanId(availablePlans[0]);
    }
  }, [availablePlans, planId]);

  const wilayaName = wilayas.find((w) => String(w.code) === wilayaCode);
  const cityLabel = wilayaName
    ? `${wilayaName.code}. ${(wilayaName as unknown as Record<string, string>)[nameKey]}`
    : "";

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (sent) return;

        const fd = new FormData(e.currentTarget);
        const payload = {
          firstName: String(fd.get("firstName") ?? ""),
          lastName: String(fd.get("lastName") ?? ""),
          email: String(fd.get("email") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          wilayaCode,
          accountType,
          accountSubtype: subtype,
          planId,
        };

        const parsed = formSchema.safeParse(payload);
        if (!parsed.success) {
          toast.error(t("pricing.subscribe.validationError"));
          return;
        }
        if (!cityLabel) {
          toast.error(t("pricing.subscribe.cityRequired"));
          return;
        }

        setLoading(true);
        try {
          await submitFn({
            data: {
              firstName: parsed.data.firstName,
              lastName: parsed.data.lastName,
              email: parsed.data.email,
              phone: parsed.data.phone,
              city: cityLabel,
              accountType: parsed.data.accountType,
              accountSubtype: parsed.data.accountSubtype,
              planId: parsed.data.planId,
              locale,
              website: String(fd.get("website") ?? ""),
            },
          });
          setSent(true);
          toast.success(t("pricing.subscribe.success"));
          onSuccess?.();
        } catch {
          toast.error(t("pricing.subscribe.error"));
        } finally {
          setLoading(false);
        }
      }}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`sub-first-${variant}`}>{t("pricing.subscribe.firstName")}</Label>
          <Input id={`sub-first-${variant}`} name="firstName" required maxLength={60} className="mt-1" />
        </div>
        <div>
          <Label htmlFor={`sub-last-${variant}`}>{t("pricing.subscribe.lastName")}</Label>
          <Input id={`sub-last-${variant}`} name="lastName" required maxLength={60} className="mt-1" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`sub-email-${variant}`}>{t("pricing.subscribe.email")}</Label>
          <Input id={`sub-email-${variant}`} name="email" type="email" required maxLength={255} className="mt-1" />
        </div>
        <div>
          <Label htmlFor={`sub-phone-${variant}`}>{t("pricing.subscribe.phone")}</Label>
          <Input id={`sub-phone-${variant}`} name="phone" type="tel" required maxLength={20} className="mt-1" dir="ltr" />
        </div>
      </div>

      <div>
        <Label>{t("pricing.subscribe.city")}</Label>
        <Select value={wilayaCode} onValueChange={setWilayaCode}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={t("pricing.subscribe.cityPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {wilayas.map((w) => (
              <SelectItem key={w.code} value={String(w.code)}>
                {w.code}. {(w as unknown as Record<string, string>)[nameKey]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>{t("pricing.subscribe.accountType")}</Label>
          <Select
            value={accountType}
            onValueChange={(v) => {
              const at = v as AccountType;
              setAccountType(at);
              setSubtype(SUBTYPES[at][0]);
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPES.map((a) => (
                <SelectItem key={a} value={a}>
                  {t(`accounts.${a}.title`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("pricing.subscribe.specialty")}</Label>
          <Select value={subtype} onValueChange={setSubtype}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBTYPES[accountType].map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`accounts.subtypes.${s}`, { defaultValue: s })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>{t("pricing.subscribe.plan")}</Label>
        <Select value={planId} onValueChange={(v) => setPlanId(v as SubscriptionPlanId)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availablePlans.map((p) => (
              <SelectItem key={p} value={p}>
                {t(planLabelKey(p))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <Button type="submit" className="w-full" disabled={loading || sent}>
        {sent ? t("pricing.subscribe.sent") : loading ? t("common.loading") : t("pricing.subscribe.submit")}
      </Button>
    </form>
  );
}

type SubscribeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPlan?: SubscriptionPlanId;
};

export function SubscribeDialog({ open, onOpenChange, defaultPlan = "student_plus" }: SubscribeDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("pricing.subscribe.title")}</DialogTitle>
          <DialogDescription>{t("pricing.subscribe.subtitle")}</DialogDescription>
        </DialogHeader>
        <SubscribeForm
          key={`${open}-${defaultPlan}`}
          defaultPlan={defaultPlan}
          variant="dialog"
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function SubscribeSection() {
  const { t } = useTranslation();

  return (
    <section className="border-t pt-16">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-3xl font-bold">{t("pricing.subscribe.title")}</h2>
        <p className="mt-3 text-muted-foreground">{t("pricing.subscribe.subtitle")}</p>
      </div>
      <Card className="max-w-2xl mx-auto border-border/60">
        <CardContent className="p-8">
          <SubscribeForm variant="inline" />
        </CardContent>
      </Card>
    </section>
  );
}
