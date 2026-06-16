import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ACCOUNT_TYPES, SUBSCRIPTION_PLANS } from "@/lib/account-types";
import { formatSubscriptionTelegramMessage, sendTelegramMessage } from "@/lib/telegram.server";

const subscriptionSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(20),
  city: z.string().trim().min(1).max(120),
  accountType: z.enum(ACCOUNT_TYPES),
  accountSubtype: z.string().trim().min(1).max(80),
  planId: z.enum(SUBSCRIPTION_PLANS),
  locale: z.string().trim().min(2).max(10),
  website: z.string().max(0).optional(),
});

export const submitSubscription = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => subscriptionSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.website) {
      return { ok: true };
    }

    const message = formatSubscriptionTelegramMessage({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      city: data.city,
      accountType: data.accountType,
      accountSubtype: data.accountSubtype,
      planId: data.planId,
      locale: data.locale,
    });

    await sendTelegramMessage(message);
    return { ok: true };
  });
