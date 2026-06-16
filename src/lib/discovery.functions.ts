import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type CompanyListing = {
  id: string;
  user_id: string;
  company_name: string;
  sector: string | null;
  stage: string | null;
  wilaya_code: number | null;
  ticket_size_dzd: number | null;
  valuation_dzd: number | null;
  revenue_dzd: number | null;
  employees_count: number | null;
  founded_year: number | null;
  website: string | null;
  /** Owner-only field. Never returned by public discovery endpoints. */
  contact_email?: string | null;
  description: string | null;
  tags: string[] | null;
  logo_url: string | null;
  is_published: boolean;
  status: string;
  created_at: string;
  updated_at: string;
};

const PUBLIC_COLS =
  "id,user_id,company_name,sector,stage,wilaya_code,ticket_size_dzd,valuation_dzd,revenue_dzd,employees_count,founded_year,website,description,tags,logo_url,is_published,status,created_at,updated_at";

const SearchSchema = z
  .object({
    q: z.string().max(200).optional(),
    sector: z.string().max(120).optional(),
    stage: z.string().max(60).optional(),
    wilaya_code: z.number().int().min(1).max(58).optional(),
    min_ticket: z.number().nonnegative().optional(),
    max_ticket: z.number().nonnegative().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .optional();

export type DiscoverInput = z.input<typeof SearchSchema>;

export const discoverCompanies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: DiscoverInput) => SearchSchema.parse(data) ?? {})
  .handler(async ({ data, context }): Promise<CompanyListing[]> => {
    const { supabase } = context;
    let qb = (supabase.from as any)("company_listings")
      .select(PUBLIC_COLS)
      .eq("is_published", true)
      .order("updated_at", { ascending: false })
      .limit(data?.limit ?? 50);

    if (data?.sector) qb = qb.eq("sector", data.sector);
    if (data?.stage) qb = qb.eq("stage", data.stage);
    if (data?.wilaya_code) qb = qb.eq("wilaya_code", data.wilaya_code);
    if (typeof data?.min_ticket === "number")
      qb = qb.gte("ticket_size_dzd", data.min_ticket);
    if (typeof data?.max_ticket === "number")
      qb = qb.lte("ticket_size_dzd", data.max_ticket);
    if (data?.q && data.q.trim()) {
      const term = data.q.trim().replace(/[%_,]/g, " ");
      qb = qb.or(
        `company_name.ilike.%${term}%,sector.ilike.%${term}%,description.ilike.%${term}%`,
      );
    }

    const { data: rows, error } = await qb;
    if (error) throw new Error(error.message);
    return (rows ?? []) as CompanyListing[];
  });

export const getDiscoveryFacets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await (supabase.from as any)("company_listings")
      .select("sector,stage,wilaya_code")
      .eq("is_published", true)
      .limit(1000);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{
      sector: string | null;
      stage: string | null;
      wilaya_code: number | null;
    }>;
    const sectors = Array.from(
      new Set(rows.map((r) => r.sector).filter(Boolean) as string[]),
    ).sort();
    const stages = Array.from(
      new Set(rows.map((r) => r.stage).filter(Boolean) as string[]),
    ).sort();
    const wilayas = Array.from(
      new Set(rows.map((r) => r.wilaya_code).filter(Boolean) as number[]),
    ).sort((a, b) => a - b);
    return { sectors, stages, wilayas, total: rows.length };
  });

const AddToPipelineSchema = z.object({ company_id: z.string().uuid() });

export const addListingToPipeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.input<typeof AddToPipelineSchema>) =>
    AddToPipelineSchema.parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: listing, error: lerr } = await (supabase.from as any)(
      "company_listings",
    )
      .select(PUBLIC_COLS)
      .eq("id", data.company_id)
      .eq("is_published", true)
      .maybeSingle();
    if (lerr) throw new Error(lerr.message);
    if (!listing) throw new Error("Company not found");

    const payload = {
      user_id: userId,
      company_name: (listing as CompanyListing).company_name,
      sector: (listing as CompanyListing).sector,
      stage: (listing as CompanyListing).stage,
      wilaya_code: (listing as CompanyListing).wilaya_code,
      ticket_size_dzd: (listing as CompanyListing).ticket_size_dzd,
      valuation_dzd: (listing as CompanyListing).valuation_dzd,
      revenue_dzd: (listing as CompanyListing).revenue_dzd,
      description: (listing as CompanyListing).description,
      recommendation: "pending" as const,
      status: "screening" as const,
    };
    const { data: row, error } = await supabase
      .from("investment_opportunities")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

// ============ My Listings (owner CRUD) ============

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  company_name: z.string().min(1).max(200),
  sector: z.string().max(120).nullable().optional(),
  stage: z.string().max(60).nullable().optional(),
  wilaya_code: z.number().int().min(1).max(58).nullable().optional(),
  ticket_size_dzd: z.number().nonnegative().nullable().optional(),
  valuation_dzd: z.number().nonnegative().nullable().optional(),
  revenue_dzd: z.number().nonnegative().nullable().optional(),
  employees_count: z.number().int().nonnegative().nullable().optional(),
  founded_year: z.number().int().min(1800).max(2100).nullable().optional(),
  website: z.string().url().max(300).nullable().optional().or(z.literal("")),
  contact_email: z.string().email().max(200).nullable().optional().or(z.literal("")),
  description: z.string().max(4000).nullable().optional(),
  tags: z.array(z.string().max(60)).max(20).nullable().optional(),
  logo_url: z.string().url().max(500).nullable().optional().or(z.literal("")),
  is_published: z.boolean().optional(),
});
export type UpsertListingInput = z.input<typeof UpsertSchema>;

export const listMyListings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CompanyListing[]> => {
    const { userId } = context;
    // Use admin client to include the owner-only contact_email column,
    // since SELECT on that column is revoked from the `authenticated` role.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin.from as any)("company_listings")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as CompanyListing[];
  });

export const upsertMyListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: UpsertListingInput) => UpsertSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const clean = (v: unknown) => (v === "" ? null : v);
    const payload: Record<string, unknown> = {
      user_id: userId,
      company_name: data.company_name,
      sector: clean(data.sector ?? null),
      stage: clean(data.stage ?? null),
      wilaya_code: data.wilaya_code ?? null,
      ticket_size_dzd: data.ticket_size_dzd ?? null,
      valuation_dzd: data.valuation_dzd ?? null,
      revenue_dzd: data.revenue_dzd ?? null,
      employees_count: data.employees_count ?? null,
      founded_year: data.founded_year ?? null,
      website: clean(data.website ?? null),
      contact_email: clean(data.contact_email ?? null),
      description: clean(data.description ?? null),
      tags: data.tags ?? null,
      logo_url: clean(data.logo_url ?? null),
      is_published: data.is_published ?? false,
    };
    if (data.id) {
      const { data: row, error } = await (supabase.from as any)("company_listings")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: (row as { id: string }).id };
    }
    const { data: row, error } = await (supabase.from as any)("company_listings")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

const IdSchema = z.object({ id: z.string().uuid() });

export const deleteMyListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.input<typeof IdSchema>) => IdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await (supabase.from as any)("company_listings")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const TogglePublishSchema = z.object({
  id: z.string().uuid(),
  is_published: z.boolean(),
});

export const toggleListingPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.input<typeof TogglePublishSchema>) =>
    TogglePublishSchema.parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await (supabase.from as any)("company_listings")
      .update({ is_published: data.is_published })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
