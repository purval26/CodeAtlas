import ts from "typescript";
import type { CodeFile, CodeSymbol } from "@/types";
import { getLanguageFromPath } from "../ingestion/filter";

export interface ExtractedImport {
  specifier: string;
  names: string[];
  line: number;
  type: "import" | "require" | "dynamic-import";
  isTypeOnly: boolean;
}

export interface ParsedFileResult {
  file: CodeFile;
  lines?: string[];
  imports: ExtractedImport[];
  exports: string[];
  symbols: CodeSymbol[];
}

export interface ParseRepositoryResult {
  files: Map<string, ParsedFileResult>;
  unparsedFiles: string[];
  parseWarnings: { file: string; message: string }[];
}

export function parseSourceFile(
  path: string,
  content: string,
  repositoryId: string
): ParsedFileResult {
  const lines = content.split("\n");
  const lineCount = lines.length;
  const size = Buffer.byteLength(content, "utf8");
  const language = getLanguageFromPath(path);
  const fileId = `${repositoryId}:${path}`;

  const codeFile: CodeFile = {
    id: fileId,
    repositoryId,
    path,
    language,
    content,
    size,
    lineCount,
  };

  const scriptTarget = ts.ScriptTarget.Latest;
  const scriptKind = path.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : path.endsWith(".ts")
    ? ts.ScriptKind.TS
    : path.endsWith(".jsx")
    ? ts.ScriptKind.JSX
    : ts.ScriptKind.JS;

  const sourceFile = ts.createSourceFile(
    path,
    content,
    scriptTarget,
    true,
    scriptKind
  );

  const sourceDiagnostics = (sourceFile as ts.SourceFile & {
    parseDiagnostics?: readonly ts.DiagnosticWithLocation[];
  }).parseDiagnostics || [];
  const syntaxErrors = sourceDiagnostics.filter(
    (diagnostic: ts.DiagnosticWithLocation) => diagnostic.category === ts.DiagnosticCategory.Error
  );
  if (syntaxErrors.length > 0) {
    const first = syntaxErrors[0];
    const position = first.start === undefined ? "" : ` at line ${sourceFile.getLineAndCharacterOfPosition(first.start).line + 1}`;
    throw new Error(`TypeScript parser rejected source${position}: ${ts.flattenDiagnosticMessageText(first.messageText, " ")}`);
  }

  const imports: ExtractedImport[] = [];
  const exports: string[] = [];
  const symbols: CodeSymbol[] = [];

  function getLine(pos: number): number {
    return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
  }

  function hasModifier(
    targetNode: { modifiers?: ts.NodeArray<ts.ModifierLike> },
    kind: ts.SyntaxKind
  ): boolean {
    return targetNode.modifiers?.some((m: ts.ModifierLike) => m.kind === kind) ?? false;
  }

  function visit(node: ts.Node) {
    // 1. Static Import Declarations
    if (ts.isImportDeclaration(node)) {
      const specifier = node.moduleSpecifier;
      if (ts.isStringLiteral(specifier)) {
        const line = getLine(node.getStart());
        const names: string[] = [];
        const namedBindings = node.importClause?.namedBindings;
        const namedImports = namedBindings && ts.isNamedImports(namedBindings) ? namedBindings : undefined;
        const isTypeOnly =
          node.importClause?.isTypeOnly ??
          (Boolean(namedImports?.elements.length) && namedImports!.elements.every((element) => element.isTypeOnly));

        if (node.importClause) {
          if (node.importClause.name) {
            names.push(node.importClause.name.text);
          }
          if (
            namedImports
          ) {
            for (const elem of namedImports.elements) {
              names.push(elem.name.text);
            }
          } else if (
            node.importClause.namedBindings &&
            ts.isNamespaceImport(node.importClause.namedBindings)
          ) {
            names.push(`* as ${node.importClause.namedBindings.name.text}`);
          }
        }

        imports.push({
          specifier: specifier.text,
          names,
          line,
          type: "import",
          isTypeOnly,
        });
      }
    }

    // 1b. TypeScript import assignment: import fs = require("fs")
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      imports.push({
        specifier: node.moduleReference.expression.text,
        names: [node.name.text],
        line: getLine(node.getStart()),
        type: "require",
        isTypeOnly: node.isTypeOnly,
      });
    }

    // 2. Export Declarations with module specifier: export { x } from 'y'
    if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const line = getLine(node.getStart());
        const names: string[] = [];
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const elem of node.exportClause.elements) {
            names.push(elem.name.text);
            exports.push(elem.name.text);
          }
        }
        imports.push({
          specifier: node.moduleSpecifier.text,
          names,
          line,
          type: "import",
          isTypeOnly: node.isTypeOnly,
        });
      } else if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const elem of node.exportClause.elements) {
          exports.push(elem.name.text);
        }
      }
    }

    // 3. Export Assignment (export default ...)
    if (ts.isExportAssignment(node)) {
      exports.push("default");
    }

    // 4. Function Declarations
    if (ts.isFunctionDeclaration(node) && (node.name || hasModifier(node, ts.SyntaxKind.DefaultKeyword))) {
      const name = node.name?.text || "default";
      const startLine = getLine(node.getStart());
      const endLine = getLine(node.getEnd());
      symbols.push({
        id: `${fileId}:fn:${name}:${startLine}`,
        fileId,
        name,
        kind: "function",
        startLine,
        endLine,
      });

      const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
      const isDefault = hasModifier(node, ts.SyntaxKind.DefaultKeyword);
      if (isExported) {
        exports.push(isDefault ? "default" : name);
      }
    }

    // 5. Class Declarations
    if (ts.isClassDeclaration(node) && (node.name || hasModifier(node, ts.SyntaxKind.DefaultKeyword))) {
      const name = node.name?.text || "default";
      const startLine = getLine(node.getStart());
      const endLine = getLine(node.getEnd());
      symbols.push({
        id: `${fileId}:class:${name}:${startLine}`,
        fileId,
        name,
        kind: "class",
        startLine,
        endLine,
      });

      const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
      const isDefault = hasModifier(node, ts.SyntaxKind.DefaultKeyword);
      if (isExported) {
        exports.push(isDefault ? "default" : name);
      }
    }

    // 6. Interface Declarations
    if (ts.isInterfaceDeclaration(node)) {
      const name = node.name.text;
      const startLine = getLine(node.getStart());
      const endLine = getLine(node.getEnd());
      symbols.push({
        id: `${fileId}:iface:${name}:${startLine}`,
        fileId,
        name,
        kind: "interface",
        startLine,
        endLine,
      });

      const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
      if (isExported) exports.push(name);
    }

    // 7. Type Alias Declarations
    if (ts.isTypeAliasDeclaration(node)) {
      const name = node.name.text;
      const startLine = getLine(node.getStart());
      const endLine = getLine(node.getEnd());
      symbols.push({
        id: `${fileId}:type:${name}:${startLine}`,
        fileId,
        name,
        kind: "type",
        startLine,
        endLine,
      });

      const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
      if (isExported) exports.push(name);
    }

    // 8. Variable Statements (const/let/var)
    if (ts.isVariableStatement(node)) {
      const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);

      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          const startLine = getLine(decl.getStart());
          const endLine = getLine(decl.getEnd());
          symbols.push({
            id: `${fileId}:var:${name}:${startLine}`,
            fileId,
            name,
            kind: "variable",
            startLine,
            endLine,
          });
          if (isExported) {
            exports.push(name);
          }
        }
      }
    }

    // 9. Dynamic Imports: import('...')
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push({
        specifier: (node.arguments[0] as ts.StringLiteral).text,
        names: ["*"],
        line: getLine(node.getStart()),
        type: "dynamic-import",
        isTypeOnly: false,
      });
    }

    // 10. require('...') calls
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require" &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push({
        specifier: (node.arguments[0] as ts.StringLiteral).text,
        names: ["*"],
        line: getLine(node.getStart()),
        type: "require",
        isTypeOnly: false,
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // Deduplicate exports
  const uniqueExports = Array.from(new Set(exports));

  return {
    file: codeFile,
    lines,
    imports,
    exports: uniqueExports,
    symbols,
  };
}
