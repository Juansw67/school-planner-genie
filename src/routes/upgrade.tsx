import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { useAuth } from "@/hooks/use-auth";
import { useUsage } from "@/hooks/use-usage";

export const Route = createFileRoute("/upgrade")({
  component: UpgradePage,
  head: () => ({
    meta: [
      { title: "Notamín — acesso ilimitado" },
      { name: "description", content: "Trabalhos ABNT ilimitados em breve." },
    ],
  }),
});

function UpgradePage() {
  const { user, loading } = useAuth();
  const { isPremium, used, limit } = useUsage();

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;

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
              Acesso <em className="text-accent">ilimitado</em> em breve.
            </h1>
            <p className="mt-5 text-muted-foreground">
              Você já usou <strong>{used}/{limit}</strong> trabalhos do plano gratuito.
              Estamos finalizando a forma de pagamento — em breve será possível liberar trabalhos ilimitados por aqui.
            </p>

            <div className="mt-10 rounded-md border border-border bg-paper p-8 shadow-[0_30px_60px_-30px_rgba(50,40,20,0.25)]">
              <ul className="space-y-2 text-sm text-foreground">
                <li>· trabalhos ABNT ilimitados</li>
                <li>· geração do zero ou a partir da sua pesquisa</li>
                <li>· capa, sumário, citações e referências formatados</li>
              </ul>
              <p className="mt-6 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
                em breve
              </p>
            </div>

            <Link to="/" className="mt-8 inline-block text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← voltar pra home</Link>
          </>
        )}
      </main>
    </div>
  );
}
