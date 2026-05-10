import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Hotmart Webhook (Postback 2.0).
// Configurar em: Hotmart → Ferramentas → Webhook → Adicionar URL.
// URL pra cadastrar:  https://notamin.lovable.app/api/public/hotmart-webhook?token=SEU_HOTTOK
// Eventos: PURCHASE_APPROVED, PURCHASE_COMPLETE, PURCHASE_REFUNDED, PURCHASE_CHARGEBACK, PURCHASE_CANCELED

const APPROVED_EVENTS = new Set(["PURCHASE_APPROVED", "PURCHASE_COMPLETE"]);
const REVOKED_EVENTS = new Set([
  "PURCHASE_REFUNDED",
  "PURCHASE_CHARGEBACK",
  "PURCHASE_CANCELED",
  "PURCHASE_PROTEST",
]);

export const Route = createFileRoute("/api/public/hotmart-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.HOTMART_HOTTOK;
        if (!expected) return new Response("server not configured", { status: 500 });

        const url = new URL(request.url);
        const headerToken =
          request.headers.get("x-hotmart-hottok") ||
          request.headers.get("X-HOTMART-HOTTOK") ||
          url.searchParams.get("token") ||
          url.searchParams.get("hottok");

        if (!headerToken || headerToken !== expected) {
          return new Response("invalid token", { status: 401 });
        }

        let payload: any;
        try {
          payload = await request.json();
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const event: string = payload?.event ?? payload?.data?.event ?? "";
        const data = payload?.data ?? payload;
        const email: string | undefined =
          data?.buyer?.email ?? data?.purchase?.buyer?.email ?? payload?.email;
        const transaction: string | undefined =
          data?.purchase?.transaction ?? data?.transaction ?? payload?.transaction;

        if (!email) return new Response("missing email", { status: 400 });
        const normalizedEmail = email.trim().toLowerCase();

        // Achar usuário por email (usa admin API)
        const { data: usersList, error: listErr } =
          await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        if (listErr) {
          console.error("listUsers error", listErr);
          return new Response("lookup failed", { status: 500 });
        }
        const user = usersList.users.find(
          (u) => (u.email ?? "").toLowerCase() === normalizedEmail,
        );

        if (!user) {
          // Comprador ainda não tem conta — registramos o email pra liberar quando ele se cadastrar.
          // (gravamos numa linha de profiles "órfã" não é ideal por causa da FK; logamos por enquanto)
          console.warn("hotmart webhook: no user with email", normalizedEmail, "event", event);
          return new Response("user not found, ignored", { status: 200 });
        }

        if (APPROVED_EVENTS.has(event)) {
          const { error } = await supabaseAdmin.from("profiles").upsert(
            {
              user_id: user.id,
              email: normalizedEmail,
              is_premium: true,
              premium_since: new Date().toISOString(),
              hotmart_transaction: transaction ?? null,
            },
            { onConflict: "user_id" },
          );
          if (error) {
            console.error("upsert premium error", error);
            return new Response("db error", { status: 500 });
          }
          return new Response("premium granted", { status: 200 });
        }

        if (REVOKED_EVENTS.has(event)) {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ is_premium: false })
            .eq("user_id", user.id);
          if (error) {
            console.error("revoke premium error", error);
            return new Response("db error", { status: 500 });
          }
          return new Response("premium revoked", { status: 200 });
        }

        return new Response("event ignored", { status: 200 });
      },
    },
  },
});