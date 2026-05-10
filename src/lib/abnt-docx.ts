import {
  AlignmentType,
  Document,
  FileChild,
  HeadingLevel,
  LineRuleType,
  NumberFormat,
  PageBreak,
  Packer,
  Paragraph,
  TextRun,
  PageOrientation,
  Header,
  PageNumber,
  TableOfContents,
} from "docx";
import { saveAs } from "file-saver";

export type Trabalho = {
  titulo: string;
  resumo: string;
  palavras_chave: string[];
  introducao: string[];
  desenvolvimento: {
    titulo: string;
    paragrafos: (string | { tipo: "citacao_longa"; texto: string; fonte?: string })[];
    subsecoes?: {
      titulo: string;
      paragrafos: (string | { tipo: "citacao_longa"; texto: string; fonte?: string })[];
      subsubsecoes?: {
        titulo: string;
        paragrafos: (string | { tipo: "citacao_longa"; texto: string; fonte?: string })[];
      }[];
    }[];
  }[];
  conclusao: string[];
  referencias: string[];
};

export type DadosCapa = {
  escola: string;
  integrantes: string[];
  materia?: string;
  professor?: string;
  cidade: string;
  ano: string;
};

// 1cm ≈ 567 DXA. ABNT: margens 3cm sup/esq, 2cm inf/dir.
const CM = 567;
const FONT = "Times New Roman";
const SIZE = 24; // 12pt = 24 half-points
const SIZE_SMALL = 20; // 10pt para citação longa
const LINE_15 = 360; // 1.5 line spacing
const LINE_SINGLE = 240;
const INDENT = 709; // 1.25cm first line indent
const QUOTE_INDENT = 4 * CM; // recuo 4cm para citação longa
const A4_WIDTH = 11906;
const A4_HEIGHT = 16838;
const MARGIN_TOP_LEFT = 3 * CM;
const MARGIN_BOTTOM_RIGHT = 2 * CM;

// Limpa restos de markdown (negrito, itálico, asteriscos) das referências
function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-•]\s+/, "")
    .trim();
}

function P(
  text: string,
  opts: {
    bold?: boolean;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    indent?: boolean;
    upper?: boolean;
    spacingAfter?: number;
    spacingBefore?: number;
    heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel];
    line?: number;
    size?: number;
  } = {},
) {
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    heading: opts.heading,
    spacing: {
      line: opts.line ?? LINE_15,
      lineRule: LineRuleType.AUTO,
      before: opts.spacingBefore ?? 0,
      after: opts.spacingAfter ?? 0,
    },
    indent: opts.indent ? { firstLine: INDENT } : undefined,
    children: [
      new TextRun({
        text: opts.upper ? text.toUpperCase() : text,
        bold: opts.bold,
        font: FONT,
        size: opts.size ?? SIZE,
      }),
    ],
  });
}

function emptyLine() {
  return new Paragraph({
    spacing: { line: LINE_15, lineRule: LineRuleType.AUTO, before: 0, after: 0 },
    children: [new TextRun({ text: "", font: FONT, size: SIZE })],
  });
}

function buildCapa(d: DadosCapa, titulo: string): Paragraph[] {
  const blocks: Paragraph[] = [];
  blocks.push(P(d.escola, { align: AlignmentType.CENTER, upper: true, bold: true }));
  for (let i = 0; i < 4; i++) blocks.push(emptyLine());
  for (const nome of d.integrantes.filter((n) => n.trim())) {
    blocks.push(P(nome, { align: AlignmentType.CENTER }));
  }
  for (let i = 0; i < 8; i++) blocks.push(emptyLine());
  blocks.push(P(titulo, { align: AlignmentType.CENTER, bold: true, upper: true }));
  for (let i = 0; i < 10; i++) blocks.push(emptyLine());
  blocks.push(P(d.cidade, { align: AlignmentType.CENTER }));
  blocks.push(P(d.ano, { align: AlignmentType.CENTER }));
  return blocks;
}

function buildFolhaRosto(d: DadosCapa, titulo: string): Paragraph[] {
  const blocks: Paragraph[] = [];
  for (const nome of d.integrantes.filter((n) => n.trim())) {
    blocks.push(P(nome, { align: AlignmentType.CENTER }));
  }
  for (let i = 0; i < 6; i++) blocks.push(emptyLine());
  blocks.push(P(titulo, { align: AlignmentType.CENTER, bold: true, upper: true }));
  for (let i = 0; i < 3; i++) blocks.push(emptyLine());

  // Texto de identificação: alinhado do meio para a direita, espaçamento simples,
  // recuo esquerdo de aproximadamente 8 cm, fonte 12.
  const identif =
    `Trabalho apresentado ${d.materia ? `à disciplina de ${d.materia} ` : ""}` +
    `da ${d.escola}${d.professor ? `, ministrad${d.materia ? "a" : "o"} pel${d.professor.toLowerCase().startsWith("prof") ? "o" : "o(a) professor(a)"} ${d.professor}` : ""}, ` +
    `como requisito parcial de avaliação.`;
  blocks.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { left: CM * 8 },
      spacing: { line: LINE_SINGLE, lineRule: LineRuleType.AUTO, after: 0 },
      children: [new TextRun({ text: identif, font: FONT, size: SIZE })],
    }),
  );

  for (let i = 0; i < 7; i++) blocks.push(emptyLine());
  blocks.push(P(d.cidade, { align: AlignmentType.CENTER }));
  blocks.push(P(d.ano, { align: AlignmentType.CENTER }));
  return blocks;
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: LINE_15, lineRule: LineRuleType.AUTO, before: 240, after: 240 },
    heading: HeadingLevel.HEADING_1,
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        font: FONT,
        size: SIZE,
      }),
    ],
  });
}

function unnumberedHeading(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: LINE_15, lineRule: LineRuleType.AUTO, before: 240, after: 240 },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        font: FONT,
        size: SIZE,
      }),
    ],
  });
}

function subHeading(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: LINE_15, lineRule: LineRuleType.AUTO, before: 240, after: 120 },
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text: text.toUpperCase(), bold: true, font: FONT, size: SIZE })],
  });
}

// 2.1.1 — só primeira letra maiúscula, negrito
function subSubHeading(text: string): Paragraph {
  const t = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: LINE_15, lineRule: LineRuleType.AUTO, before: 180, after: 120 },
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text: t, bold: true, font: FONT, size: SIZE })],
  });
}

function pageBreakP(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

function citacaoLonga(texto: string, fonte?: string): Paragraph[] {
  const fonteLimpa = fonte?.replace(/^\(|\)$/g, "").trim();
  return [
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { left: QUOTE_INDENT },
      spacing: { line: LINE_SINGLE, lineRule: LineRuleType.AUTO, before: 120, after: 120 },
      children: [
        new TextRun({
          text: `${texto.replace(/[“”"]/g, "").trim()}${fonteLimpa ? ` (${fonteLimpa})` : ""}`,
          font: FONT,
          size: SIZE_SMALL,
        }),
      ],
    }),
  ];
}

function renderParagrafos(
  itens: (string | { tipo: "citacao_longa"; texto: string; fonte?: string })[],
): Paragraph[] {
  const out: Paragraph[] = [];
  for (const it of itens) {
    if (typeof it === "string") {
      out.push(P(it, { indent: true }));
    } else if (it && it.tipo === "citacao_longa") {
      out.push(...citacaoLonga(it.texto, it.fonte));
    }
  }
  return out;
}

function pageNumberHeader(): Header {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { line: LINE_SINGLE, lineRule: LineRuleType.AUTO, after: 0 },
        children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SIZE })],
      }),
    ],
  });
}

type TocEntry = { title: string; level: number; page: number };

function abntToc(t: Trabalho): TableOfContents {
  const cachedEntries: TocEntry[] = [{ title: "1 INTRODUÇÃO", level: 1, page: 1 }];
  let chapter = 2;
  let page = 2;

  for (const sec of t.desenvolvimento) {
    cachedEntries.push({ title: `${chapter} ${sec.titulo.toUpperCase()}`, level: 1, page });
    sec.subsecoes?.forEach((sub, subIndex) => {
      cachedEntries.push({
        title: `${chapter}.${subIndex + 1} ${sub.titulo.toUpperCase()}`,
        level: 2,
        page,
      });
      sub.subsubsecoes?.forEach((ss, ssIndex) => {
        const title = ss.titulo.charAt(0).toUpperCase() + ss.titulo.slice(1).toLowerCase();
        cachedEntries.push({
          title: `${chapter}.${subIndex + 1}.${ssIndex + 1} ${title}`,
          level: 3,
          page,
        });
      });
    });
    chapter++;
    page++;
  }

  cachedEntries.push({ title: `${chapter++} CONSIDERAÇÕES FINAIS`, level: 1, page: page++ });
  cachedEntries.push({ title: "REFERÊNCIAS", level: 1, page });

  return new TableOfContents("Sumário", {
    hyperlink: true,
    headingStyleRange: "1-3",
    useAppliedParagraphOutlineLevel: true,
    entryAndPageNumberSeparator: "\t",
    cachedEntries: cachedEntries as never,
    beginDirty: true,
  });
}

function emptyHeader(): Header {
  return new Header({
    children: [
      new Paragraph({
        spacing: { line: LINE_SINGLE, lineRule: LineRuleType.AUTO, after: 0 },
        children: [new TextRun({ text: "", font: FONT, size: SIZE })],
      }),
    ],
  });
}

export async function gerarDocx(t: Trabalho, d: DadosCapa) {
  // ===== Pré-textuais (sem numeração visível) =====
  const preTextuais: FileChild[] = [];

  // Capa (não conta)
  preTextuais.push(...buildCapa(d, t.titulo));
  preTextuais.push(new Paragraph({ children: [new PageBreak()] }));
  // Folha de rosto (conta como pág 1, mas não imprime)
  preTextuais.push(...buildFolhaRosto(d, t.titulo));
  preTextuais.push(new Paragraph({ children: [new PageBreak()] }));

  // Resumo
  preTextuais.push(unnumberedHeading("Resumo"));
  preTextuais.push(P(t.resumo, { align: AlignmentType.JUSTIFIED }));
  preTextuais.push(emptyLine());
  preTextuais.push(
    P(
      `Palavras-chave: ${t.palavras_chave
        .map((p) => p.trim())
        .filter(Boolean)
        .join(". ")}.`,
      {
        align: AlignmentType.JUSTIFIED,
      },
    ),
  );
  preTextuais.push(new Paragraph({ children: [new PageBreak()] }));

  // Sumário — usa campo TOC do Word (atualiza ao abrir)
  preTextuais.push(unnumberedHeading("Sumário"));
  preTextuais.push(abntToc(t));

  // ===== Textuais (com numeração visível, recomeça na 1ª seção textual) =====
  const textuais: Paragraph[] = [];

  textuais.push(sectionHeading("1 INTRODUÇÃO"));
  for (const par of t.introducao) textuais.push(P(par, { indent: true }));

  let i = 2;
  for (const sec of t.desenvolvimento) {
    textuais.push(pageBreakP());
    textuais.push(sectionHeading(`${i} ${sec.titulo.toUpperCase()}`));
    textuais.push(...renderParagrafos(sec.paragrafos));

    if (sec.subsecoes?.length) {
      let j = 1;
      for (const sub of sec.subsecoes) {
        textuais.push(subHeading(`${i}.${j} ${sub.titulo}`));
        textuais.push(...renderParagrafos(sub.paragrafos));
        if (sub.subsubsecoes?.length) {
          let k = 1;
          for (const ss of sub.subsubsecoes) {
            textuais.push(subSubHeading(`${i}.${j}.${k} ${ss.titulo}`));
            textuais.push(...renderParagrafos(ss.paragrafos));
            k++;
          }
        }
        j++;
      }
    }
    i++;
  }

  textuais.push(pageBreakP());
  textuais.push(sectionHeading(`${i++} CONSIDERAÇÕES FINAIS`));
  for (const par of t.conclusao) textuais.push(P(par, { indent: true }));

  textuais.push(pageBreakP());
  textuais.push(sectionHeading("REFERÊNCIAS"));
  for (const refRaw of t.referencias) {
    const ref = stripMarkdown(refRaw);
    if (!ref) continue;
    textuais.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { line: LINE_SINGLE, after: 240 },
        children: [new TextRun({ text: ref, font: FONT, size: SIZE })],
      }),
    );
  }

  const doc = new Document({
    features: { updateFields: true },
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE, color: "000000" },
          paragraph: {
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: LINE_15, lineRule: LineRuleType.AUTO, before: 0, after: 0 },
          },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: FONT, size: SIZE, bold: true, color: "000000" },
          paragraph: {
            spacing: { before: 240, after: 240, line: LINE_15, lineRule: LineRuleType.AUTO },
            outlineLevel: 0,
          },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: FONT, size: SIZE, bold: true, color: "000000" },
          paragraph: {
            spacing: { before: 240, after: 120, line: LINE_15, lineRule: LineRuleType.AUTO },
            outlineLevel: 1,
          },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: FONT, size: SIZE, bold: true, color: "000000" },
          paragraph: {
            spacing: { before: 180, after: 120, line: LINE_15, lineRule: LineRuleType.AUTO },
            outlineLevel: 2,
          },
        },
        {
          id: "TOC1",
          name: "TOC 1",
          basedOn: "Normal",
          run: { font: FONT, size: SIZE, color: "000000" },
          paragraph: { spacing: { line: LINE_SINGLE, lineRule: LineRuleType.AUTO, after: 0 } },
        },
        {
          id: "TOC2",
          name: "TOC 2",
          basedOn: "Normal",
          run: { font: FONT, size: SIZE, color: "000000" },
          paragraph: {
            indent: { left: 360 },
            spacing: { line: LINE_SINGLE, lineRule: LineRuleType.AUTO, after: 0 },
          },
        },
        {
          id: "TOC3",
          name: "TOC 3",
          basedOn: "Normal",
          run: { font: FONT, size: SIZE, color: "000000" },
          paragraph: {
            indent: { left: 720 },
            spacing: { line: LINE_SINGLE, lineRule: LineRuleType.AUTO, after: 0 },
          },
        },
      ],
    },
    sections: [
      // Seção 1: pré-textuais — sem cabeçalho com número de página
      {
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838,
              orientation: PageOrientation.PORTRAIT,
            },
            margin: {
              top: 3 * CM,
              left: 3 * CM,
              bottom: 2 * CM,
              right: 2 * CM,
              header: 1.5 * CM,
            },
          },
        },
        headers: { default: emptyHeader() },
        children: preTextuais,
      },
      // Seção 2: textuais — paginação no canto superior direito
      {
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838,
              orientation: PageOrientation.PORTRAIT,
            },
            margin: {
              top: 3 * CM,
              left: 3 * CM,
              bottom: 2 * CM,
              right: 2 * CM,
              header: 1.5 * CM,
            },
            pageNumbers: {
              start: 1,
              formatType: NumberFormat.DECIMAL,
            },
          },
        },
        headers: { default: pageNumberHeader() },
        children: textuais,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safe = t.titulo.replace(/[^\p{L}\p{N}]+/gu, "_").slice(0, 60) || "Trabalho";
  saveAs(blob, `${safe}_ABNT.docx`);
}
