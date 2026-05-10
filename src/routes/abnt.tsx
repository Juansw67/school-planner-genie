import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { gerarDocx, type DadosCapa, type Trabalho } from "@/lib/abnt-docx";
import { SiteNav } from "@/components/SiteNav";
import { useAuth } from "@/hooks/use-auth";
import { useUsage } from "@/hooks/use-usage";
import { useServerFn } from "@tanstack/react-start";
import { consumeQuota } from "@/lib/quota.functions";

export const Route = createFileRoute("/abnt")({
  component: AbntPage,
  head: () => ({
    meta: [
      { title: "Notamín — gerador de trabalho ABNT" },
      {
        name: "description",
        content:
          "Gere trabalhos escolares e universitários em formato ABNT (.docx) em segundos. Capa, folha de rosto, sumário, introdução, desenvolvimento, conclusão e referências.",
      },
    ],
  }),
});

type Mode = "scratch" | "from-research";

function AbntPage() {
  const { user, loading: authLoading } = useAuth();
  const usage = useUsage();
  const navigate = useNavigate();
  const consume = useServerFn(consumeQuota);
  const [mode, setMode] = useState<Mode>("scratch");
  const [tema, setTema] = useState("");
  const [materia, setMateria] = useState("");
  const [professor, setProfessor] = useState("");
  const [escola, setEscola] = useState("");
  const [cidade, setCidade] = useState("");
  const ano = new Date().getFullYear().toString();
  const [anoStr, setAnoStr] = useState(ano);
  const [integrantes, setIntegrantes] = useState<string[]>(["", "", "", ""]);
  const [pesquisa, setPesquisa] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const setIntegrante = (i: number, v: string) =>
    setIntegrantes((arr) => arr.map((x, j) => (j === i ? v : x)));

  async function gerar() {
    setErro(null);
    if (!tema.trim()) {
      setErro("Informe o tema do trabalho.");
      return;
    }
    if (!escola.trim() || !cidade.trim()) {
      setErro("Preencha pelo menos escola e cidade pra montar a capa.");
      return;
    }
    if (mode === "from-research" && pesquisa.trim().length < 200) {
      setErro("Cola uma pesquisa maior (pelo menos uns 200 caracteres).");
      return;
    }
    setLoading(true);
    try {
      // 1) consome a quota por IP ANTES de gerar (server-side, à prova de burla)
      const quota = await consume({ data: { userId: user?.id ?? null } });
      if (!quota.ok) {
        setLoading(false);
        navigate({ to: "/upgrade" });
        return;
      }
      const { data, error } = await supabase.functions.invoke("gen-abnt", {
        body: {
          mode,
          tema,
          materia,
          professor,
          escola,
          cidade,
          ano: anoStr,
          integrantes,
          pesquisa: mode === "from-research" ? pesquisa : undefined,
        },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error)
        throw new Error((data as { error: string }).error);
      const trabalho = (data as { trabalho: Trabalho }).trabalho;
      const dados: DadosCapa = {
        escola,
        integrantes,
        materia,
        professor,
        cidade,
        ano: anoStr,
      };
      await gerarDocx(trabalho, dados);
      usage.refresh();
      setDone(true);
      setTimeout(() => setDone(false), 5000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao gerar.";
      setErro(msg);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <SiteNav />
        <div className="mx-auto max-w-5xl px-6 py-20 text-sm text-muted-foreground">carregando…</div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav />

      <div className="mx-auto grid max-w-5xl gap-12 px-6 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <header className="flex flex-col justify-between">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-paper px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              novo · gerador de trabalho ABNT
            </p>
            {!usage.loading && (
              <p className="mb-3 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                {usage.isPremium
                  ? "✦ acesso vitalício · trabalhos ilimitados"
                  : `${usage.used}/${usage.limit} trabalhos gratuitos usados`}
                {!usage.isPremium && (
                  <Link to="/upgrade" className="ml-2 text-accent underline">liberar ilimitado</Link>
                )}
              </p>
            )}
            <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Trabalho escrito pronto, já <em className="text-accent">formatado em ABNT</em>.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              Capa, folha de rosto, sumário, intro, desenvolvimento, conclusão e
              referências — Arial 12, espaçamento 1,5, margens 3/2/3/2 cm. Sai
              em <span className="font-mono">.docx</span> pra você editar à
              vontade.
            </p>
          </div>

          <div className="mt-12 grid gap-4 text-sm sm:grid-cols-2">
            <button
              onClick={() => setMode("scratch")}
              className={`border-l-2 pl-3 text-left transition ${
                mode === "scratch"
                  ? "border-accent"
                  : "border-border opacity-60 hover:opacity-100"
              }`}
            >
              <div className="font-mono text-xs text-muted-foreground">01</div>
              <div className="font-medium text-foreground">Do zero</div>
              <div className="text-muted-foreground">
                a IA escreve o trabalho inteiro a partir do tema
              </div>
            </button>
            <button
              onClick={() => setMode("from-research")}
              className={`border-l-2 pl-3 text-left transition ${
                mode === "from-research"
                  ? "border-accent"
                  : "border-border opacity-60 hover:opacity-100"
              }`}
            >
              <div className="font-mono text-xs text-muted-foreground">02</div>
              <div className="font-medium text-foreground">Com sua pesquisa</div>
              <div className="text-muted-foreground">
                você cola o material e a IA monta e formata
              </div>
            </button>
          </div>
        </header>

        <section
          aria-label="Configurar trabalho"
          className="relative rounded-sm bg-paper p-8 shadow-[0_1px_0_rgba(0,0,0,0.04),0_30px_60px_-30px_rgba(50,40,20,0.25)] lg:p-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0 31px, var(--rule) 31px 32px)",
            backgroundPosition: "0 56px",
          }}
        >
          <div className="absolute left-12 top-0 h-full w-px bg-destructive/30" />

          <div className="space-y-6">
            <Field label="Tema do trabalho">
              <input
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="Ex: Revolução Industrial e seus impactos sociais"
                className="w-full border-0 border-b border-ink/40 bg-transparent px-0 py-1 font-display text-2xl text-ink placeholder:text-muted-foreground/50 focus:border-ink focus:outline-none"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Matéria">
                <input
                  value={materia}
                  onChange={(e) => setMateria(e.target.value)}
                  placeholder="História"
                  className="w-full border-0 border-b border-ink/40 bg-transparent px-0 py-1 text-base text-ink placeholder:text-muted-foreground/50 focus:border-ink focus:outline-none"
                />
              </Field>
              <Field label="Professor(a)">
                <input
                  value={professor}
                  onChange={(e) => setProfessor(e.target.value)}
                  placeholder="Ana Souza"
                  className="w-full border-0 border-b border-ink/40 bg-transparent px-0 py-1 text-base text-ink placeholder:text-muted-foreground/50 focus:border-ink focus:outline-none"
                />
              </Field>
            </div>

            <Field label="Escola / Universidade">
              <input
                value={escola}
                onChange={(e) => setEscola(e.target.value)}
                placeholder="Universidade Federal..."
                className="w-full border-0 border-b border-ink/40 bg-transparent px-0 py-1 text-base text-ink placeholder:text-muted-foreground/50 focus:border-ink focus:outline-none"
              />
            </Field>

            <div className="grid grid-cols-[1fr_100px] gap-4">
              <Field label="Cidade">
                <input
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="São Paulo"
                  className="w-full border-0 border-b border-ink/40 bg-transparent px-0 py-1 text-base text-ink placeholder:text-muted-foreground/50 focus:border-ink focus:outline-none"
                />
              </Field>
              <Field label="Ano">
                <input
                  value={anoStr}
                  onChange={(e) => setAnoStr(e.target.value)}
                  className="w-full border-0 border-b border-ink/40 bg-transparent px-0 py-1 text-base text-ink focus:border-ink focus:outline-none"
                />
              </Field>
            </div>

            <Field label="Integrantes (até 4)">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {integrantes.map((v, i) => (
                  <input
                    key={i}
                    value={v}
                    onChange={(e) => setIntegrante(i, e.target.value)}
                    placeholder={`integrante ${i + 1}`}
                    className="border-0 border-b border-transparent bg-transparent px-0 py-1 text-base text-ink placeholder:text-muted-foreground/50 focus:border-ink focus:outline-none"
                  />
                ))}
              </div>
            </Field>

            {mode === "from-research" && (
              <Field label="Sua pesquisa (cole o material)">
                <textarea
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                  placeholder="Cola aqui anotações, trechos de livros/artigos, resumos... a IA vai organizar e formatar."
                  rows={8}
                  className="w-full resize-y border border-ink/30 bg-transparent p-3 text-sm leading-relaxed text-ink placeholder:text-muted-foreground/50 focus:border-ink focus:outline-none"
                />
              </Field>
            )}

            <button
              onClick={gerar}
              disabled={loading}
              className="group relative mt-2 inline-flex w-full items-center justify-between overflow-hidden rounded-sm bg-ink px-6 py-4 text-left text-paper transition hover:bg-foreground disabled:opacity-60"
            >
              <span className="font-display text-xl">
                {loading
                  ? "escrevendo seu trabalho..."
                  : mode === "scratch"
                    ? "Gerar trabalho do zero"
                    : "Montar trabalho com minha pesquisa"}
              </span>
              <span className="font-mono text-sm tracking-tight">.docx ↓</span>
            </button>

            {erro && (
              <p className="rounded-sm border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {erro}
              </p>
            )}
            {done && (
              <p className="text-center font-mono text-xs uppercase tracking-widest text-accent">
                pronto. confere a pasta de downloads.
              </p>
            )}
          </div>
        </section>
      </div>

      <footer className="mx-auto max-w-5xl px-6 pb-10 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <span>
            Confere e revise antes de entregar — IA pode escorregar em datas e
            citações específicas.
          </span>
          <span className="font-mono">Notamín — bons estudos.</span>
        </div>
      </footer>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}