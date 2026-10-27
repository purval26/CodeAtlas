export interface TableBlock {
  type: "table";
  headers: string[];
  aligns: Array<"left" | "center" | "right">;
  rows: string[][];
}

export interface CodeBlock {
  type: "code";
  lang: string;
  code: string;
}

export interface HeadingBlock {
  type: "heading";
  level: number;
  text: string;
}

export interface BlockquoteBlock {
  type: "blockquote";
  text: string;
}

export interface ListBlock {
  type: "unordered-list" | "ordered-list";
  items: string[];
}

export interface ParagraphBlock {
  type: "paragraph";
  text: string;
}

export interface DividerBlock {
  type: "divider";
}

export type MarkdownBlock =
  | TableBlock
  | CodeBlock
  | HeadingBlock
  | BlockquoteBlock
  | ListBlock
  | ParagraphBlock
  | DividerBlock;

export interface InlineText {
  type: "text";
  value: string;
}

export interface InlineCode {
  type: "code";
  value: string;
}

export interface InlineBold {
  type: "bold";
  value: string;
}

export interface InlineItalic {
  type: "italic";
  value: string;
}

export interface InlineLink {
  type: "link";
  text: string;
  href: string;
}

export interface InlineCitation {
  type: "citation";
  file: string;
  startLine: number;
  endLine: number;
  raw: string;
}

export type InlineToken =
  | InlineText
  | InlineCode
  | InlineBold
  | InlineItalic
  | InlineLink
  | InlineCitation;

export function isSafeMarkdownUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("file:") ||
    trimmed.startsWith("vbscript:")
  ) {
    return false;
  }
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:")
  );
}

export function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  const cells = trimmed.replace(/^\|/, "").replace(/\|$/, "").split("|");
  return (
    cells.length >= 2 &&
    cells.every((c) => /^[\s:-]+$/.test(c) && c.includes("-"))
  );
}

export function isPotentialTableRow(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.startsWith("```") || trimmed.startsWith("#") || trimmed.startsWith(">")) {
    return false;
  }
  return (
    trimmed.includes("|") &&
    trimmed.replace(/^\|/, "").replace(/\|$/, "").split("|").length >= 2
  );
}

export function parseCells(line: string): string[] {
  let content = line.trim();
  if (content.startsWith("|")) content = content.slice(1);
  if (content.endsWith("|")) content = content.slice(0, -1);
  return content.split("|").map((c) => c.trim());
}

export function parseAligns(
  sepLine: string,
  count: number
): Array<"left" | "center" | "right"> {
  const cells = parseCells(sepLine);
  return Array.from({ length: count }, (_, idx) => {
    const c = cells[idx] || "";
    if (c.startsWith(":") && c.endsWith(":")) return "center";
    if (c.endsWith(":")) return "right";
    return "left";
  });
}

export function isDivider(line: string): boolean {
  const trimmed = line.trim();
  // 3 or more hyphens, asterisks, or underscores (e.g. ---, ***, ___, - - -)
  return /^([-*_])\s*(?:\1\s*){2,}$/.test(trimmed);
}

export function tokenizeMarkdown(text: string): MarkdownBlock[] {
  const lines = text.split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // 0. Divider / Horizontal Rule (3 or more dashes, asterisks, or underscores)
    if (isDivider(line)) {
      blocks.push({ type: "divider" });
      i++;
      continue;
    }

    // 1. Fenced Code Block
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      const fence = trimmed.slice(0, 3);
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing fence
      blocks.push({ type: "code", lang, code: codeLines.join("\n") });
      continue;
    }

    // 2. Table: line has pipes and next line is table separator
    if (
      isPotentialTableRow(line) &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const headerLine = line;
      const separatorLine = lines[i + 1];
      const headers = parseCells(headerLine);
      const aligns = parseAligns(separatorLine, headers.length);
      const rows: string[][] = [];
      i += 2;

      while (
        i < lines.length &&
        isPotentialTableRow(lines[i]) &&
        lines[i].trim().length > 0
      ) {
        rows.push(parseCells(lines[i]));
        i++;
      }
      blocks.push({ type: "table", headers, aligns, rows });
      continue;
    }

    // 3. Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      i++;
      continue;
    }

    // 4. Blockquote
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join("\n") });
      continue;
    }

    // 5. Unordered List
    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ type: "unordered-list", items });
      continue;
    }

    // 6. Ordered List
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    // 7. Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim().length > 0 &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith("~~~") &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith(">") &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !isDivider(lines[i]) &&
      !(
        isPotentialTableRow(lines[i]) &&
        i + 1 < lines.length &&
        isTableSeparator(lines[i + 1])
      )
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", text: paraLines.join(" ") });
    }
  }

  return blocks;
}

export function parseInlineTokens(text: string): InlineToken[] {
  const pattern =
    /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*]+\*(?!\*)|\[[^\]]+\]\([^)]+\)|\[[a-zA-Z0-9_\.\-\/]+(?:\[+[^\]]+\]+[a-zA-Z0-9_\.\-\/]*)*\.[a-zA-Z0-9]+:L?\d+(?:[–—\-]L?\d+)?\])/g;

  const elements: InlineToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const slice = text.slice(lastIndex, match.index);
      elements.push({ type: "text", value: slice.replace(/---/g, "—") });
    }

    const token = match[0];

    if (token.startsWith("`") && token.endsWith("`")) {
      elements.push({ type: "code", value: token.slice(1, -1) });
    } else if (
      (token.startsWith("**") && token.endsWith("**")) ||
      (token.startsWith("__") && token.endsWith("__"))
    ) {
      elements.push({ type: "bold", value: token.slice(2, -2) });
    } else if (
      (token.startsWith("*") && token.endsWith("*")) ||
      (token.startsWith("_") && token.endsWith("_"))
    ) {
      elements.push({ type: "italic", value: token.slice(1, -1) });
    } else if (
      token.startsWith("[") &&
      token.includes("](") &&
      token.endsWith(")")
    ) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        elements.push({ type: "link", text: linkMatch[1], href: linkMatch[2] });
      } else {
        elements.push({ type: "text", value: token.replace(/---/g, "—") });
      }
    } else if (token.startsWith("[") && token.endsWith("]")) {
      const citMatch = token
        .slice(1, -1)
        .match(/^([a-zA-Z0-9_\.\-\/]+(?:\[+[^\]]+\]+[a-zA-Z0-9_\.\-\/]*)*\.[a-zA-Z0-9]+):L?(\d+)(?:[–—\-]L?(\d+))?$/);

      if (citMatch) {
        const filePath = citMatch[1];
        const startLine = parseInt(citMatch[2], 10);
        const endLine = citMatch[3] ? parseInt(citMatch[3], 10) : startLine;
        elements.push({
          type: "citation",
          file: filePath,
          startLine,
          endLine,
          raw: token,
        });
      } else {
        elements.push({ type: "text", value: token.replace(/---/g, "—") });
      }
    } else {
      elements.push({ type: "text", value: token.replace(/---/g, "—") });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const slice = text.slice(lastIndex);
    elements.push({ type: "text", value: slice.replace(/---/g, "—") });
  }

  return elements;
}
