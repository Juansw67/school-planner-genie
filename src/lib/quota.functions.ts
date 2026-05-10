import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const FREE_LIMIT = 3;

function getClientIp(): string {
  const xff = getRequestHeader("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = getRequestHeader("x-real-ip");
  if (real) return real.trim();
  return getRequestIP({ xForwardedFor: true }) ?? "unknown";
}

async function isPremium(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("is_premium")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data?.is_premium;
}

export const getQuota = createServerFn({ method: "GET" })
  .inputValidator((d: { userId?: string | null }) => ({ userId: d?.userId ?? null }))
  .handler(async ({ data }) => {
    const ip = getClientIp();
    const premium = await isPremium(data.userId);
    const { data: row } = await supabaseAdmin
      .from("ip_usage")
      .select("count")
      .eq("ip", ip)
      .maybeSingle();
    const used = row?.count ?? 0;
    return {
      used,
      limit: FREE_LIMIT,
      isPremium: premium,
      allowed: premium || used < FREE_LIMIT,
    };
  });

export const consumeQuota = createServerFn({ method: "POST" })
  .inputValidator((d: { userId?: string | null }) => ({ userId: d?.userId ?? null }))
  .handler(async ({ data }) => {
    const ip = getClientIp();
    const premium = await isPremium(data.userId);
    if (premium) {
      return { ok: true, used: 0, limit: FREE_LIMIT, isPremium: true, allowed: true };
    }
    const { data: row } = await supabaseAdmin
      .from("ip_usage")
      .select("count")
      .eq("ip", ip)
      .maybeSingle();
    const current = row?.count ?? 0;
    if (current >= FREE_LIMIT) {
      return { ok: false, used: current, limit: FREE_LIMIT, isPremium: false, allowed: false };
    }
    const next = current + 1;
    await supabaseAdmin.from("ip_usage").upsert(
      { ip, count: next, last_user_id: data.userId },
      { onConflict: "ip" },
    );
    return { ok: true, used: next, limit: FREE_LIMIT, isPremium: false, allowed: next < FREE_LIMIT };
  });