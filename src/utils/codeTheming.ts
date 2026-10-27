export type TokenType =
  | "keyword"
  | "control"
  | "string"
  | "number"
  | "comment"
  | "fn"
  | "type"
  | "variable"
  | "constant"
  | "operator"
  | "tag"
  | "attribute"
  | "punctuation"
  | "text";

export interface Token {
  text: string;
  type: TokenType;
}

export interface VSCodeTheme {
  id: string;
  name: string;
  type: "dark" | "light";
  colors: {
    bg: string;
    gutterBg: string;
    gutterText: string;
    gutterActiveText: string;
    lineHighlight: string;
    citationBg: string;
    citationBorder: string;
    text: string;
    keyword: string;
    control: string;
    string: string;
    number: string;
    comment: string;
    fn: string;
    type: string;
    variable: string;
    constant: string;
    operator: string;
    tag: string;
    attribute: string;
    punctuation: string;
    statusBarBg: string;
    statusBarText: string;
    tabBg: string;
    tabActiveBg: string;
    border: string;
  };
}

export const VSCODE_THEMES: VSCodeTheme[] = [
  {
    id: "vscode-dark",
    name: "VS Code Dark+ (Default Dark)",
    type: "dark",
    colors: {
      bg: "#1E1E1E",
      gutterBg: "#1E1E1E",
      gutterText: "#858585",
      gutterActiveText: "#C6C6C6",
      lineHighlight: "rgba(255, 255, 255, 0.05)",
      citationBg: "rgba(216, 255, 62, 0.22)",
      citationBorder: "#D8FF3E",
      text: "#D4D4D4",
      keyword: "#C586C0",
      control: "#569CD6",
      string: "#CE9178",
      number: "#B5CEA8",
      comment: "#6A9955",
      fn: "#DCDCAA",
      type: "#4EC9B0",
      variable: "#9CDCFE",
      constant: "#4FC1FF",
      operator: "#D4D4D4",
      tag: "#569CD6",
      attribute: "#9CDCFE",
      punctuation: "#D4D4D4",
      statusBarBg: "#007ACC",
      statusBarText: "#FFFFFF",
      tabBg: "#2D2D2D",
      tabActiveBg: "#1E1E1E",
      border: "#2B2B2B",
    },
  },
  {
    id: "vscode-light",
    name: "VS Code Light+ (Default Light)",
    type: "light",
    colors: {
      bg: "#FFFFFF",
      gutterBg: "#F8F8F8",
      gutterText: "#6E7681",
      gutterActiveText: "#098658",
      lineHighlight: "rgba(0, 0, 0, 0.04)",
      citationBg: "rgba(255, 235, 59, 0.35)",
      citationBorder: "#E0A800",
      text: "#000000",
      keyword: "#AF00DB",
      control: "#0000FF",
      string: "#A31515",
      number: "#098658",
      comment: "#008000",
      fn: "#795E26",
      type: "#267F99",
      variable: "#001080",
      constant: "#0000FF",
      operator: "#000000",
      tag: "#800000",
      attribute: "#E50000",
      punctuation: "#000000",
      statusBarBg: "#007ACC",
      statusBarText: "#FFFFFF",
      tabBg: "#ECECEC",
      tabActiveBg: "#FFFFFF",
      border: "#E5E5E5",
    },
  },
  {
    id: "monokai",
    name: "Monokai",
    type: "dark",
    colors: {
      bg: "#272822",
      gutterBg: "#272822",
      gutterText: "#90908A",
      gutterActiveText: "#F8F8F2",
      lineHighlight: "rgba(255, 255, 255, 0.06)",
      citationBg: "rgba(166, 226, 46, 0.22)",
      citationBorder: "#A6E22E",
      text: "#F8F8F2",
      keyword: "#F92672",
      control: "#66D9EF",
      string: "#E6DB74",
      number: "#AE81FF",
      comment: "#75715E",
      fn: "#A6E22E",
      type: "#66D9EF",
      variable: "#FD971F",
      constant: "#AE81FF",
      operator: "#F92672",
      tag: "#F92672",
      attribute: "#A6E22E",
      punctuation: "#F8F8F2",
      statusBarBg: "#1E1F1C",
      statusBarText: "#F8F8F2",
      tabBg: "#1E1F1C",
      tabActiveBg: "#272822",
      border: "#3E3D32",
    },
  },
  {
    id: "github-dark",
    name: "GitHub Dark",
    type: "dark",
    colors: {
      bg: "#0D1117",
      gutterBg: "#0D1117",
      gutterText: "#6E7681",
      gutterActiveText: "#C9D1D9",
      lineHighlight: "rgba(110, 118, 129, 0.1)",
      citationBg: "rgba(56, 139, 253, 0.22)",
      citationBorder: "#58A6FF",
      text: "#C9D1D9",
      keyword: "#FF7B72",
      control: "#FF7B72",
      string: "#A5D6FF",
      number: "#79C0FF",
      comment: "#8B949E",
      fn: "#D2A8FF",
      type: "#FFA657",
      variable: "#79C0FF",
      constant: "#79C0FF",
      operator: "#FF7B72",
      tag: "#7EE787",
      attribute: "#79C0FF",
      punctuation: "#C9D1D9",
      statusBarBg: "#161B22",
      statusBarText: "#C9D1D9",
      tabBg: "#161B22",
      tabActiveBg: "#0D1117",
      border: "#30363D",
    },
  },
  {
    id: "one-dark-pro",
    name: "One Dark Pro",
    type: "dark",
    colors: {
      bg: "#282C34",
      gutterBg: "#282C34",
      gutterText: "#5C6370",
      gutterActiveText: "#ABB2BF",
      lineHighlight: "rgba(255, 255, 255, 0.05)",
      citationBg: "rgba(97, 175, 239, 0.2)",
      citationBorder: "#61AFEF",
      text: "#ABB2BF",
      keyword: "#C678DD",
      control: "#C678DD",
      string: "#98C379",
      number: "#D19A66",
      comment: "#5C6370",
      fn: "#61AFEF",
      type: "#E5C07B",
      variable: "#E06C75",
      constant: "#D19A66",
      operator: "#56B6C2",
      tag: "#E06C75",
      attribute: "#D19A66",
      punctuation: "#ABB2BF",
      statusBarBg: "#21252B",
      statusBarText: "#9DA5B4",
      tabBg: "#21252B",
      tabActiveBg: "#282C34",
      border: "#181A1F",
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    type: "dark",
    colors: {
      bg: "#282A36",
      gutterBg: "#282A36",
      gutterText: "#6272A4",
      gutterActiveText: "#F8F8F2",
      lineHighlight: "rgba(255, 255, 255, 0.06)",
      citationBg: "rgba(255, 121, 198, 0.22)",
      citationBorder: "#FF79C6",
      text: "#F8F8F2",
      keyword: "#FF79C6",
      control: "#BD93F9",
      string: "#F1FA8C",
      number: "#BD93F9",
      comment: "#6272A4",
      fn: "#50FA7B",
      type: "#8BE9FD",
      variable: "#FFB86C",
      constant: "#BD93F9",
      operator: "#FF79C6",
      tag: "#FF79C6",
      attribute: "#50FA7B",
      punctuation: "#F8F8F2",
      statusBarBg: "#191A21",
      statusBarText: "#F8F8F2",
      tabBg: "#21222C",
      tabActiveBg: "#282A36",
      border: "#191A21",
    },
  },
  {
    id: "solarized-dark",
    name: "Solarized Dark",
    type: "dark",
    colors: {
      bg: "#002B36",
      gutterBg: "#002B36",
      gutterText: "#586E75",
      gutterActiveText: "#93A1A1",
      lineHighlight: "rgba(7, 54, 66, 0.8)",
      citationBg: "rgba(42, 161, 152, 0.25)",
      citationBorder: "#2AA198",
      text: "#839496",
      keyword: "#859900",
      control: "#B58900",
      string: "#2AA198",
      number: "#D33682",
      comment: "#586E75",
      fn: "#268BD2",
      type: "#B58900",
      variable: "#268BD2",
      constant: "#CB4B16",
      operator: "#859900",
      tag: "#268BD2",
      attribute: "#657B83",
      punctuation: "#839496",
      statusBarBg: "#00212B",
      statusBarText: "#93A1A1",
      tabBg: "#073642",
      tabActiveBg: "#002B36",
      border: "#073642",
    },
  },
  {
    id: "abyss",
    name: "Abyss",
    type: "dark",
    colors: {
      bg: "#000C18",
      gutterBg: "#000C18",
      gutterText: "#3B5364",
      gutterActiveText: "#6688AA",
      lineHighlight: "rgba(8, 30, 54, 0.8)",
      citationBg: "rgba(255, 234, 162, 0.22)",
      citationBorder: "#FFEAA2",
      text: "#6688AA",
      keyword: "#225588",
      control: "#4080B0",
      string: "#22AA44",
      number: "#9966FF",
      comment: "#384887",
      fn: "#FFEAA2",
      type: "#FFEEBB",
      variable: "#7799BB",
      constant: "#9966FF",
      operator: "#808080",
      tag: "#225588",
      attribute: "#9966FF",
      punctuation: "#6688AA",
      statusBarBg: "#000810",
      statusBarText: "#6688AA",
      tabBg: "#051528",
      tabActiveBg: "#000C18",
      border: "#0A223D",
    },
  },
];

const CONTROL_KEYWORDS = new Set([
  "import", "export", "from", "as", "default", "return", "if", "else",
  "switch", "case", "break", "continue", "throw", "try", "catch", "finally",
  "yield", "for", "while", "do", "match", "with", "pass", "raise",
]);

const DECLARATION_KEYWORDS = new Set([
  "const", "let", "var", "function", "class", "interface", "type", "enum",
  "extends", "implements", "static", "public", "private", "protected",
  "readonly", "override", "abstract", "async", "await", "new", "this", "super",
  "typeof", "instanceof", "keyof", "in", "is", "def", "fn", "struct", "impl",
  "pub", "mut", "self", "lambda", "package", "namespace",
]);

const CONSTANTS = new Set([
  "true", "false", "null", "undefined", "NaN", "Infinity",
  "True", "False", "None", "nil", "void", "any", "unknown", "never",
]);

const OPERATORS_RE = /^(?:=>|===|!==|==|!=|<=|>=|&&|\|\||\?\?|\?\.|<<|>>|[+\-*/%=!&|^~<>?:])/;
const NUMBER_RE = /^(?:0x[0-9a-fA-F]+|0b[01]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/;
const IDENTIFIER_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*/;
const WHITESPACE_RE = /^\s+/;

export function tokenizeCode(lines: string[], language: string = "typescript"): Token[][] {
  const isPythonOrShell = ["python", "py", "sh", "bash", "yaml", "yml"].includes(language.toLowerCase());
  let inBlockComment = false;
  let inTemplateString = false;

  const result: Token[][] = [];

  for (const line of lines) {
    const tokens: Token[] = [];
    let i = 0;
    const len = line.length;

    if (len === 0) {
      result.push([{ text: " ", type: "text" }]);
      continue;
    }

    // Handle ongoing multiline block comment
    if (inBlockComment) {
      const endIdx = line.indexOf("*/");
      if (endIdx === -1) {
        tokens.push({ text: line, type: "comment" });
        result.push(tokens);
        continue;
      } else {
        tokens.push({ text: line.slice(0, endIdx + 2), type: "comment" });
        i = endIdx + 2;
        inBlockComment = false;
      }
    }

    // Handle ongoing multiline template string
    if (inTemplateString) {
      let strEnd = -1;
      for (let j = i; j < len; j++) {
        if (line[j] === "`" && (j === 0 || line[j - 1] !== "\\")) {
          strEnd = j;
          break;
        }
      }
      if (strEnd === -1) {
        tokens.push({ text: line.slice(i), type: "string" });
        result.push(tokens);
        continue;
      } else {
        tokens.push({ text: line.slice(i, strEnd + 1), type: "string" });
        i = strEnd + 1;
        inTemplateString = false;
      }
    }

    while (i < len) {
      // 1. Whitespace
      const wsMatch = line.slice(i).match(WHITESPACE_RE);
      if (wsMatch) {
        tokens.push({ text: wsMatch[0], type: "text" });
        i += wsMatch[0].length;
        continue;
      }

      // 2. Line comment (// or #)
      if (line.startsWith("//", i)) {
        tokens.push({ text: line.slice(i), type: "comment" });
        i = len;
        break;
      }
      if (isPythonOrShell && line[i] === "#") {
        tokens.push({ text: line.slice(i), type: "comment" });
        i = len;
        break;
      }

      // 3. Block comment (/* ... */)
      if (line.startsWith("/*", i)) {
        const endIdx = line.indexOf("*/", i + 2);
        if (endIdx === -1) {
          tokens.push({ text: line.slice(i), type: "comment" });
          inBlockComment = true;
          i = len;
          break;
        } else {
          tokens.push({ text: line.slice(i, endIdx + 2), type: "comment" });
          i = endIdx + 2;
          continue;
        }
      }

      // 4. Strings: "...", '...', `...`
      const char = line[i];
      if (char === '"' || char === "'") {
        let strEnd = -1;
        for (let j = i + 1; j < len; j++) {
          if (line[j] === char && line[j - 1] !== "\\") {
            strEnd = j;
            break;
          }
        }
        if (strEnd === -1) {
          tokens.push({ text: line.slice(i), type: "string" });
          i = len;
          break;
        } else {
          tokens.push({ text: line.slice(i, strEnd + 1), type: "string" });
          i = strEnd + 1;
          continue;
        }
      }

      if (char === "`") {
        let strEnd = -1;
        for (let j = i + 1; j < len; j++) {
          if (line[j] === "`" && line[j - 1] !== "\\") {
            strEnd = j;
            break;
          }
        }
        if (strEnd === -1) {
          tokens.push({ text: line.slice(i), type: "string" });
          inTemplateString = true;
          i = len;
          break;
        } else {
          tokens.push({ text: line.slice(i, strEnd + 1), type: "string" });
          i = strEnd + 1;
          continue;
        }
      }

      // 5. Numbers
      const numMatch = line.slice(i).match(NUMBER_RE);
      if (numMatch) {
        tokens.push({ text: numMatch[0], type: "number" });
        i += numMatch[0].length;
        continue;
      }

      // 6. JSX/HTML tags (e.g. </div>, <Button, <div)
      if (char === "<" && i + 1 < len && /[a-zA-Z/]/.test(line[i + 1])) {
        const tagMatch = line.slice(i).match(/^<\/?([a-zA-Z][a-zA-Z0-9_.-]*)/);
        if (tagMatch) {
          tokens.push({ text: tagMatch[0], type: "tag" });
          i += tagMatch[0].length;
          continue;
        }
      }

      // 7. Operators
      const opMatch = line.slice(i).match(OPERATORS_RE);
      if (opMatch) {
        tokens.push({ text: opMatch[0], type: "operator" });
        i += opMatch[0].length;
        continue;
      }

      // 8. Punctuation
      if ("{}()[];,.".includes(char)) {
        tokens.push({ text: char, type: "punctuation" });
        i++;
        continue;
      }

      // 9. Identifiers (Keywords, Functions, Types, Variables)
      const idMatch = line.slice(i).match(IDENTIFIER_RE);
      if (idMatch) {
        const word = idMatch[0];
        const nextCharIdx = i + word.length;
        const remainder = line.slice(nextCharIdx).trimStart();

        let type: TokenType = "text";

        if (CONTROL_KEYWORDS.has(word)) {
          type = "keyword";
        } else if (DECLARATION_KEYWORDS.has(word)) {
          type = "control";
        } else if (CONSTANTS.has(word)) {
          type = "constant";
        } else if (remainder.startsWith("(")) {
          type = "fn";
        } else if (/^[A-Z][a-zA-Z0-9_$]*$/.test(word)) {
          type = "type";
        } else if (remainder.startsWith("=")) {
          type = "attribute";
        } else {
          type = "variable";
        }

        tokens.push({ text: word, type });
        i += word.length;
        continue;
      }

      // 10. Fallback single character
      tokens.push({ text: char, type: "text" });
      i++;
    }

    result.push(tokens.length > 0 ? tokens : [{ text: " ", type: "text" }]);
  }

  return result;
}

export function resolveImportPath(
  currentFilePath: string,
  importSpecifier: string,
  knownFilePaths: string[]
): string | null {
  const spec = importSpecifier.replace(/^['"`]|['"`]$/g, "").trim();
  if (!spec) return null;

  const pathSet = new Set(knownFilePaths);
  const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".css"];

  const findMatch = (candidate: string): string | null => {
    if (pathSet.has(candidate)) return candidate;
    for (const ext of extensions) {
      if (pathSet.has(candidate + ext)) return candidate + ext;
      if (pathSet.has(`${candidate}/index${ext}`)) return `${candidate}/index${ext}`;
    }
    return null;
  };

  // 1. Relative paths (./ or ../)
  if (spec.startsWith("./") || spec.startsWith("../")) {
    const currentParts = currentFilePath.split("/");
    currentParts.pop(); // remove current filename to get directory
    const specParts = spec.split("/");

    for (const part of specParts) {
      if (part === ".") continue;
      if (part === "..") {
        currentParts.pop();
      } else {
        currentParts.push(part);
      }
    }
    const resolved = currentParts.join("/");
    const match = findMatch(resolved);
    if (match) return match;
  }

  // 2. Alias paths (@/ or ~/)
  if (spec.startsWith("@/") || spec.startsWith("~/")) {
    const withoutPrefix = spec.slice(2);
    const candidates = [`src/${withoutPrefix}`, withoutPrefix];
    for (const c of candidates) {
      const match = findMatch(c);
      if (match) return match;
    }
  }

  // 3. Fallback: Check if any known file path matches basename or ends with the specifier
  const match = knownFilePaths.find(
    (p) =>
      p === spec ||
      p.endsWith(`/${spec}`) ||
      p.endsWith(`/${spec}.ts`) ||
      p.endsWith(`/${spec}.tsx`) ||
      p.endsWith(`/${spec}.js`) ||
      p.endsWith(`/${spec}.jsx`) ||
      p.endsWith(`/${spec}/index.ts`) ||
      p.endsWith(`/${spec}/index.tsx`)
  );
  if (match) return match;

  return null;
}

