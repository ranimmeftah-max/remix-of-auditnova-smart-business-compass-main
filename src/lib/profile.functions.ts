import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyAccountType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ account_type: string | null }> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { account_type: (data?.account_type as string | null) ?? null };
  });
