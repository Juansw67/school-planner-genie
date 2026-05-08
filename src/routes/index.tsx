import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Notamín — quanto você precisa tirar na prova final" },
      {
        name: "description",
        content:
          "Notamín monta sua planilha de notas em segundos e calcula a nota mínima que falta pra você passar.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Work+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
});

const BASE_SUBJECTS = [
  "Português", "Matemática", "Ciências", "História", "Geografia",
  "Inglês", "Educação Física", "Arte", "Biologia", "Física",
  "Química", "Filosofia", "Sociologia", "Redação",
];

function Index() {
  const [name, setName] = useState("");
  const [passing, setPassing] = useState("6");
  const [extras, setExtras] = useState(["", "", "", "", ""]);
  const [done, setDone] = useState(false);

  const setExtra = (i: number, v: string) =>
    setExtras((e) => e.map((x, j) => (j === i ? v : x)));

  function generate() {
    const p = parseFloat(passing) || 6;
    const subjects = [...BASE_SUBJECTS, ...extras.map((s) => s.trim()).filter(Boolean)];
    const wb = XLSX.utils.book_new();
    const trimNames = ["1º Trimestre", "2º Trimestre", "3º Trimestre"];

    trimNames.forEach((trimName) => {
      const ws_data: (string | { f: string })[][] = [
        [name ? `Planejamento Escolar — ${name}` : "Planejamento Escolar"],
        [trimName],
        [`Média para aprovação: ${p}`],
        [],
        ["Matéria", "Nota 1", "Nota 2", "Mínimo na Prova", "Nota 3 (Prova)", "Média do Trimestre", "Situação"],
      ];
      subjects.forEach((subj, si) => {
        const r = si + 6;
        const B = `B${r}`, C = `C${r}`, E = `E${r}`, F = `F${r}`;
        const minF = `=IF(OR(${B}="",${C}=""),"Insira N1 e N2",IF((${p}*3-${B}-${C})<=0,"Garantido",IF((${p}*3-${B}-${C})>10,"Impossível",ROUND(${p}*3-${B}-${C},2))))`;
        const avgF = `=IF(OR(${B}="",${C}="",${E}=""),"—",ROUND((${B}+${C}+${E})/3,2))`;
        const sitF = `=IF(${F}="—","Sem notas",IF(${F}>=${p},"Aprovado","Recuperação"))`;
        ws_data.push([subj, "", "", { f: minF }, "", { f: avgF }, { f: sitF }]);
      });
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      ws["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 16 }, { wch: 20 }, { wch: 16 }];
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
      ];
      XLSX.utils.book_append_sheet(wb, ws, trimName);
    });

    const res: (string | { f: string })[][] = [
      [name ? `Resumo Anual — ${name}` : "Resumo Anual"],
      [`Média para aprovação: ${p}`],
      ["Insira manualmente as médias de cada trimestre nas colunas B, C e D."],
      [],
      ["Matéria", "Média 1º Tri", "Média 2º Tri", "Média 3º Tri", "Média Anual", "Situação Final"],
    ];
    subjects.forEach((subj, si) => {
      const r = si + 6;
      const B = `B${r}`, C = `C${r}`, D = `D${r}`, E = `E${r}`;
      const avgF = `=IF(AND(${B}="",${C}="",${D}=""),"—",ROUND(AVERAGE(IF(ISNUMBER(${B}),${B},0),IF(ISNUMBER(${C}),${C},0),IF(ISNUMBER(${D}),${D},0)),2))`;
      const sitF = `=IF(${E}="—","Sem notas",IF(${E}>=${p},"Aprovado","Recuperação"))`;
      res.push([subj, "", "", "", { f: avgF }, { f: sitF }]);
    });
    const ws_r = XLSX.utils.aoa_to_sheet(res);
    ws_r["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
    ws_r["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
    ];
    XLSX.utils.book_append_sheet(wb, ws_r, "Resumo Anual");

    const fileName = name ? `Planejamento_${name.replace(/\s+/g, "_")}.xlsx` : "Planejamento_Escolar.xlsx";
    XLSX.writeFile(wb, fileName);
    setDone(true);
    setTimeout(() => setDone(false), 4000);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top strip */}
      <div className="border-b border-border bg-paper/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span className="font-mono">Notamín · v.1</span>
          <span className="font-mono">terça-feira</span>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-12 px-6 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        {/* Left — editorial intro */}
        <header className="flex flex-col justify-between">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-paper px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Notamín · gerador de planilha grátis
            </p>
            <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Quanto você precisa tirar na <em className="text-accent">prova final</em> pra passar?
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              Eu sei, você abriu o Excel, ficou meia hora arrastando célula e desistiu.
              Preenche aí embaixo, baixa a planilha, e ela faz a conta sozinha.
            </p>
          </div>

          <div className="mt-12 grid gap-4 text-sm sm:grid-cols-3">
            {[
              { n: "01", t: "3 trimestres", d: "uma aba pra cada" },
              { n: "02", t: "Resumo anual", d: "média final automática" },
              { n: "03", t: "14 matérias", d: "+ 5 extras suas" },
            ].map((x) => (
              <div key={x.n} className="border-l-2 border-accent pl-3">
                <div className="font-mono text-xs text-muted-foreground">{x.n}</div>
                <div className="font-medium text-foreground">{x.t}</div>
                <div className="text-muted-foreground">{x.d}</div>
              </div>
            ))}
          </div>
        </header>

        {/* Right — the form, on a notebook page */}
        <section
          aria-label="Configurar planilha"
          className="relative rounded-sm bg-paper p-8 shadow-[0_1px_0_rgba(0,0,0,0.04),0_30px_60px_-30px_rgba(50,40,20,0.25)] lg:p-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0 31px, var(--rule) 31px 32px)",
            backgroundPosition: "0 56px",
          }}
        >
          <div className="absolute left-12 top-0 h-full w-px bg-destructive/30" />

          <div className="space-y-6">
            <Field label="Aluno (opcional)">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="João da Silva"
                className="w-full border-0 border-b border-transparent bg-transparent px-0 py-1 font-display text-2xl text-ink placeholder:text-muted-foreground/50 focus:border-ink focus:outline-none"
              />
            </Field>

            <Field label="Média pra passar">
              <input
                type="number"
                value={passing}
                onChange={(e) => setPassing(e.target.value)}
                min={0}
                max={10}
                step={0.1}
                className="w-24 border-0 border-b border-ink/40 bg-transparent px-0 py-1 font-display text-2xl text-ink focus:border-ink focus:outline-none"
              />
              <span className="ml-2 text-sm text-muted-foreground">/ 10</span>
            </Field>

            <Field label="Matérias extras">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {extras.map((v, i) => (
                  <input
                    key={i}
                    value={v}
                    onChange={(e) => setExtra(i, e.target.value)}
                    placeholder={`extra ${i + 1}`}
                    className="border-0 border-b border-transparent bg-transparent px-0 py-1 text-base text-ink placeholder:text-muted-foreground/50 focus:border-ink focus:outline-none"
                  />
                ))}
              </div>
            </Field>

            <details className="group pt-2">
              <summary className="cursor-pointer list-none text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
                <span className="mr-1 inline-block transition-transform group-open:rotate-90">›</span>
                matérias já incluídas
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {BASE_SUBJECTS.join(" · ")}
              </p>
            </details>

            <button
              onClick={generate}
              className="group relative mt-2 inline-flex w-full items-center justify-between overflow-hidden rounded-sm bg-ink px-6 py-4 text-left text-paper transition hover:bg-foreground"
            >
              <span className="font-display text-xl">Baixar planilha</span>
              <span className="font-mono text-sm tracking-tight">.xlsx ↓</span>
            </button>

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
          <span>Funciona offline depois de baixar. Abre no Excel, Google Sheets e LibreOffice.</span>
          <span className="font-mono">Notamín — bons estudos.</span>
        </div>
      </footer>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}
