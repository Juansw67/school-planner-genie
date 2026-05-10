import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { useAuth } from "@/hooks/use-auth";
import { useUsage } from "@/hooks/use-usage";

// Substitua pelo link do produto na Hotmart quando criar o produto.
const HOTMART_CHECKOUT_URL = "https://pay.hotmart.com/SEU_PRODUTO";

export const Route = createFileRoute("/upgrade")({
  component: UpgradePage,
  head: () => ({
    meta: [
      { title: "Notamín — acesso ilimitado" },
      { name: "description", content: "Trabalhos ABNT ilimitados por R$ 19,90 (pagamento único)." },
    ],
  }),
});

function UpgradePage() {
  const { user, loading } = useAuth();
  const { isPremium, used, limit } = useUsage();

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;

  const checkoutUrl = `${HOTMART_CHECKOUT_URL}?email=${encodeURIComponent(user.email ?? "")}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-2xl px-6 py-16">
        {isPremium ? (
          <div className="rounded-md border border-border bg-paper p-8">
            <h1 className="font-display text-3xl">Você já tem acesso vitalício ✨</h1>
            <p className="mt-3 text-muted-foreground">Trabalhos ilimitados liberados na sua conta.</p>
            <Link to="/abnt" className="mt-6 inline-block text-sm uppercase tracking-widest underline">ir pro gerador →</Link>
          </div>
        ) : (
          <>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">notamín premium</p>
            <h1 className="mt-3 font-display text-5xl leading-[0.95] tracking-tight">
              Trabalhos ABNT <em className="text-accent">ilimitados</em>, pra sempre.
            </h1>
            <p className="mt-5 text-muted-foreground">
              Você já usou <strong>{used}/{limit}</strong> trabalhos do plano gratuito.
              Libere acesso vitalício por um pagamento único.
            </p>

            <div className="mt-10 rounded-md border border-border bg-paper p-8 shadow-[0_30px_60px_-30px_rgba(50,40,20,0.25)]">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-6xl">R$ 19,90</span>
                <span className="text-sm text-muted-foreground">pagamento único</span>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-foreground">
                <li>· trabalhos ABNT ilimitados</li>
                <li>· geração do zero ou a partir da sua pesquisa</li>
                <li>· capa, sumário, citações e referências formatados</li>
                <li>· liberação automática após o pagamento</li>
              </ul>

              <a
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex w-full items-center justify-between rounded-sm bg-ink px-6 py-4 text-paper transition hover:bg-foreground"
              >
                <span className="font-display text-xl">comprar acesso vitalício</span>
                <span className="font-mono text-sm">→</span>
              </a>
              <p className="mt-3 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
                pagamento processado pela Hotmart · liberado em segundos
              </p>
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              Use o mesmo email que você usou pra entrar no Notamín ({user.email}) — é assim que o sistema reconhece sua compra.
            </p>
          </>
        )}
      </main>
    </div>
  );
}