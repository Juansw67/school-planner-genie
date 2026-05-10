import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  mode: "scratch" | "from-research";
  tema: string;
  materia?: string;
  professor?: string;
  escola?: string;
  cidade?: string;
  ano?: string;
  integrantes?: string[];
  pesquisa?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

    if (!body.tema?.trim()) {
      return new Response(JSON.stringify({ error: "Tema é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const regrasComuns = `
REGRAS OBRIGATÓRIAS DE FORMATO (NÃO QUEBRE NENHUMA):
- NÃO use markdown: nada de **negrito**, *itálico*, _underline_, \`código\`, listas com - ou •, títulos com #, tabelas em pipe.
- Texto puro, em parágrafos completos e densos. Cada item dos arrays "paragrafos" é UM parágrafo inteiro (mínimo 4 frases, ideal 6 a 10). Nunca quebre uma ideia em vários itens curtos.
- Português do Brasil, registro acadêmico formal, impessoal (3ª pessoa, sem "eu/nós/você", sem "vamos ver", sem "neste artigo apresentaremos").
- Citações conforme NBR 10520: indireta SOBRENOME (ano) ou (SOBRENOME, ano); direta curta com página (SOBRENOME, ano, p. 12). Toda citação direta precisa ter fonte com autor-data e página.
- Citação com mais de 3 linhas: retornar como objeto { "tipo": "citacao_longa", "texto": "...", "fonte": "SOBRENOME, ano, p. X" } — texto sem aspas, fonte sem parênteses externos.
- Referências (NBR 6023): texto puro, autor em CAIXA ALTA, título destacado apenas pela posição (sem asteriscos/sublinhado), local, editora e ano. Sem markdown, sem bullets, sem URLs encurtadas. 4 a 8 itens coerentes com as citações usadas no corpo do texto.
- Resumo: parágrafo único, 150 a 250 palavras, sem citações e sem recuo, apresentando objetivo, metodologia (mesmo que bibliográfica), discussão e conclusão.
- Palavras-chave: 3 a 5 termos curtos, separados por ponto final no texto final (a aplicação cuida disso; você só devolve o array).

REGRAS DE ESCRITA HUMANIZADA (CRÍTICAS — o texto NÃO pode soar como IA):
- Varie o tamanho das frases: misture sentenças curtas (8–12 palavras) com longas (25–40), evitando ritmo monótono.
- Varie a estrutura sintática: alterne início com sujeito, com oração subordinada, com adjunto adverbial, com conector argumentativo.
- Use conectivos naturais e variados: "nesse sentido", "por outro lado", "cabe destacar", "convém ressaltar", "diante disso", "ainda que", "embora", "à medida que", "todavia", "por conseguinte". Não repita o mesmo conector em parágrafos seguidos.
- Construa argumentação: contextualize → apresente o problema → discuta → relacione com autores → interprete. Não escreva enciclopédia (lista seca de fatos e datas).
- Evite chavões e marcas típicas de IA: "no mundo atual", "nos dias de hoje", "é importante destacar que", "em suma", "por fim, podemos concluir", "este trabalho tem como objetivo apresentar", abertura "A [tema] é um assunto de grande relevância". Reescreva sempre que esses padrões aparecerem.
- Não use emojis, hashtags, gírias, exclamações, perguntas retóricas em série, nem interjeições.
- Não comece dois parágrafos seguidos com a mesma palavra. Não termine parágrafos com a mesma fórmula.
- Insira pequenas marcas de interpretação autoral ("o que sugere", "isso evidencia", "tal aspecto reforça") para humanizar o texto.
- Não invente dados estatísticos exatos, nomes de leis ou citações que não existam. Se precisar exemplificar, use formulações cautelosas ("segundo a literatura sobre o tema", "estudos da área indicam").

REGRAS ANTI-PLÁGIO (somente quando há pesquisa enviada pelo usuário):
- PROIBIDO copiar trechos literais da pesquisa. Reescreva integralmente cada ideia com vocabulário e sintaxe diferentes.
- Reorganize a ordem das informações: não siga a sequência do material original.
- Faça paráfrase profunda: troque verbos, substantivos, conectores, e reagrupe ideias relacionadas que estavam separadas.
- Quando uma ideia for de um autor identificável na pesquisa, atribua autoria em formato autor-data.
- Transforme dados brutos em interpretação acadêmica autoral, não em transcrição.

REGRAS DE ESTRUTURA:
- Introdução: 3 a 4 parágrafos contextualizando o tema, justificando relevância, apresentando objetivo geral e indicando como o trabalho está organizado (sem dizer "este trabalho está dividido em capítulos").
- Desenvolvimento: 2 a 4 seções principais com títulos curtos e específicos (não genéricos como "Conceito" ou "Histórico"). Cada seção tem 3 a 6 parágrafos longos. Use subseções (2.1, 2.1.1) quando o assunto pedir hierarquia real, não para todas as seções.
- Considerações finais: 2 a 4 parágrafos retomando objetivos, sintetizando o que foi discutido (não repetindo literalmente), apontando limites e possibilidades de aprofundamento.
`;
    const sysScratch = `Você é um pesquisador acadêmico brasileiro experiente, escrevendo um trabalho universitário do zero. Escreva como um aluno de graduação avançado: argumentativo, claro, bem articulado, com fluência natural. Não invente dados numéricos específicos, leis fictícias ou citações inexistentes — quando precisar exemplificar use formulações genéricas plausíveis e cite autores reais relevantes da área (clássicos consagrados do tema).\n${regrasComuns}`;
    const sysFromResearch = `Você é um pesquisador acadêmico brasileiro reescrevendo um material de pesquisa bruto como trabalho universitário autoral. Use APENAS o conteúdo da pesquisa fornecida como insumo de informação, mas REESCREVA TUDO com suas próprias palavras, em outra ordem, com outra sintaxe, transformando descrição em análise. O objetivo é produzir um texto original, com baixíssima similaridade textual com a pesquisa de origem, mantendo a fidelidade aos fatos.\n${regrasComuns}`;

    const userPrompt =
      body.mode === "from-research"
        ? `Tema do trabalho: "${body.tema}".\nMatéria: ${body.materia ?? "—"}.\n\nMaterial de pesquisa fornecido pelo usuário (use só isto como base):\n"""\n${body.pesquisa ?? ""}\n"""\n\nMonte um trabalho ABNT completo a partir disso.`
        : `Tema do trabalho: "${body.tema}".\nMatéria: ${body.materia ?? "—"}.\n\nEscreva um trabalho ABNT completo do zero sobre o tema.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "montar_trabalho",
          description: "Retorna o trabalho acadêmico em ABNT com seções estruturadas.",
          parameters: {
            type: "object",
            properties: {
              titulo: {
                type: "string",
                description: "Título do trabalho, claro e específico, sem aspas.",
              },
              resumo: {
                type: "string",
                description:
                  "Resumo de 150 a 500 palavras, parágrafo único, sem citações e sem recuo.",
              },
              palavras_chave: {
                type: "array",
                items: { type: "string" },
                description: "3 a 5 palavras-chave.",
              },
              introducao: {
                type: "array",
                items: { type: "string" },
                description:
                  "Parágrafos da introdução (cada item = 1 parágrafo). 2 a 4 parágrafos.",
              },
              desenvolvimento: {
                type: "array",
                description:
                  "Seções do desenvolvimento (capítulo 2 em diante). Gere de 2 a 4 seções principais, cada uma com 3 a 6 parágrafos. Use citações autor-data quando fizer sentido. Pode incluir subseções (nível 2.1) e sub-subseções (nível 2.1.1).",
                items: {
                  type: "object",
                  properties: {
                    titulo: { type: "string" },
                    paragrafos: {
                      type: "array",
                      description:
                        "Cada item é um parágrafo. Use string para parágrafo normal, ou objeto { tipo: 'citacao_longa', texto, fonte } para citação com mais de 3 linhas.",
                      items: {
                        anyOf: [
                          { type: "string" },
                          {
                            type: "object",
                            properties: {
                              tipo: { type: "string", enum: ["citacao_longa"] },
                              texto: { type: "string" },
                              fonte: { type: "string" },
                            },
                            required: ["tipo", "texto"],
                            additionalProperties: false,
                          },
                        ],
                      },
                    },
                    subsecoes: {
                      type: "array",
                      description:
                        "Opcional. Subseções nível 2 (ex: 2.1). Inclua quando fizer sentido dividir o tema. 0 a 3 subseções por seção.",
                      items: {
                        type: "object",
                        properties: {
                          titulo: { type: "string" },
                          paragrafos: {
                            type: "array",
                            items: {
                              anyOf: [
                                { type: "string" },
                                {
                                  type: "object",
                                  properties: {
                                    tipo: { type: "string", enum: ["citacao_longa"] },
                                    texto: { type: "string" },
                                    fonte: { type: "string" },
                                  },
                                  required: ["tipo", "texto"],
                                  additionalProperties: false,
                                },
                              ],
                            },
                          },
                          subsubsecoes: {
                            type: "array",
                            description:
                              "Opcional. Sub-subseções nível 3 (ex: 2.1.1). 0 a 2 itens.",
                            items: {
                              type: "object",
                              properties: {
                                titulo: { type: "string" },
                                paragrafos: {
                                  type: "array",
                                  items: {
                                    anyOf: [
                                      { type: "string" },
                                      {
                                        type: "object",
                                        properties: {
                                          tipo: { type: "string", enum: ["citacao_longa"] },
                                          texto: { type: "string" },
                                          fonte: { type: "string" },
                                        },
                                        required: ["tipo", "texto"],
                                        additionalProperties: false,
                                      },
                                    ],
                                  },
                                },
                              },
                              required: ["titulo", "paragrafos"],
                              additionalProperties: false,
                            },
                          },
                        },
                        required: ["titulo", "paragrafos"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["titulo", "paragrafos"],
                  additionalProperties: false,
                },
              },
              conclusao: {
                type: "array",
                items: { type: "string" },
                description:
                  "Parágrafos das CONSIDERAÇÕES FINAIS. 2 a 4 parágrafos densos retomando objetivos, principais achados e reflexão final.",
              },
              referencias: {
                type: "array",
                items: { type: "string" },
                description:
                  "Lista de referências em formato ABNT (NBR 6023). 4 a 8 itens, plausíveis e relevantes ao tema.",
              },
            },
            required: [
              "titulo",
              "resumo",
              "palavras_chave",
              "introducao",
              "desenvolvimento",
              "conclusao",
              "referencias",
            ],
            additionalProperties: false,
          },
        },
      },
    ];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: body.mode === "from-research" ? sysFromResearch : sysScratch,
          },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: {
          type: "function",
          function: { name: "montar_trabalho" },
        },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway erro:", resp.status, t);
      if (resp.status === 429)
        return new Response(
          JSON.stringify({
            error: "Muitas requisições. Tente novamente em alguns segundos.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      if (resp.status === 402)
        return new Response(
          JSON.stringify({
            error: "Créditos de IA esgotados. Adicione créditos no workspace Lovable.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      return new Response(JSON.stringify({ error: "Falha ao gerar trabalho." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) throw new Error("Resposta da IA sem tool call.");
    const trabalho = JSON.parse(call.function.arguments);

    return new Response(JSON.stringify({ trabalho }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gen-abnt erro:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
