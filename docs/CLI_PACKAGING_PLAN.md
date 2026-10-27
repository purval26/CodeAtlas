# CodeAtlas CLI Packaging Plan (`npx codeatlas`)

This document preserves the complete architectural blueprint and phased implementation plan for packaging CodeAtlas into an executable command-line tool and npm package.

---

## 1. Overview & Vision

CodeAtlas was built on the thesis: **Structure first. Reason second. Evidence always.**

Packaging CodeAtlas as an npm binary (`npx codeatlas` or globally installed `codeatlas`) allows developers to run architecture mapping, dependency tracing, code auditing, and AI questioning directly on any local project or remote repository from their terminal.

```bash
# Instant local codebase exploration:
cd my-project
npx codeatlas
```

---

## 2. Invocations & Capabilities

### Mode 1: Interactive Web Launch (Default)
When executed without subcommands, CodeAtlas scans the current working directory, spins up a local server, and automatically opens the interactive architecture map in the default web browser.

```bash
# Analyze current working directory and open browser
codeatlas

# Analyze specific directory path
codeatlas ./packages/backend

# Analyze remote GitHub repository
codeatlas https://github.com/facebook/react

# Custom port or headless launch
codeatlas . --port 4000 --no-open
```

### Mode 2: Headless Terminal Commands
For CI/CD pipelines, quick terminal lookups, and headless scripting:

```bash
# Export architecture graph to JSON or SVG
codeatlas analyze . --output graph.json
codeatlas export . --format svg --output architecture.svg

# Shortest path dependency trace between two source files
codeatlas trace src/index.ts src/database/client.ts

# Ask grounded architectural questions directly in the terminal
codeatlas ask "How does the authentication flow work?"

# Circular dependency and orphan file linting for CI/CD
codeatlas lint . --fail-on-cycles
```

---

## 3. System Architecture

```
User Terminal Command
      │
      ▼
┌───────────────────────────────────────────────┐
│              bin/codeatlas.js                 │
│         (Node.js CLI Dispatcher)              │
└───────────────────────┬───────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│ Interactive Mode │          │  Headless Mode   │
└────────┬─────────┘          └────────┬─────────┘
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│ Local FS Scanner │          │ Terminal Runner  │
│ (.gitignore, AST)│          │  (Trace/Ask/Lint)│
└────────┬─────────┘          └────────┬─────────┘
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│ Local Web Server │          │  Terminal Output │
│ (Next.js Stand.) │          │  (JSON / Table)  │
└────────┬─────────┘          └──────────────────┘
         │
         ▼
┌──────────────────┐
│ Auto-open Browser│
│  localhost:3000  │
└──────────────────┘
```

---

## 4. Key Engineering Modules to Implement

### Module 1: Local Filesystem Ingestion (`src/server/ingestion/local.ts`)
- Recursively traverses directories using Node.js `fs.promises`.
- Honors `.gitignore` using the `ignore` package.
- Automatically skips `.git`, `node_modules`, `dist`, `.next`, `coverage`, binary files, and media assets.
- Detects languages (`.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.json`, etc.).
- Feeds source code into `parseSourceFile()` and `DependencyResolver` identical to GitHub ingestion.

### Module 2: CLI Binary & Argument Dispatcher (`bin/codeatlas.js`)
- Shebang header `#!/usr/bin/env node`.
- Uses `commander` or lightweight argument parsing.
- Handles arguments:
  - `[path]` (directory or GitHub URL, default: `.`)
  - `-p, --port <port>` (default: `3000` with automatic increment if in use)
  - `--no-open` (do not launch browser)
  - `-k, --api-key <key>` (API key override)
  - `-m, --model <id>` (Model selection)
  - `--json [file]` (Output graph to JSON)
  - `--format <svg|json>` (Export format)

### Module 3: Dynamic Port Finder & Server Launcher
- Uses a lightweight port probe (`net.createServer`) to detect if port 3000 is occupied.
- If occupied, automatically selects the next free port (3001, 3002...) to prevent server startup crashes.
- Launches the bundled Next.js standalone server and calls system opener (`open` / `child_process.exec`).

### Module 4: Headless CLI Subcommands
- **`codeatlas trace <start> <end>`**: Executes `fetchTraceFlow` logic directly in Node and prints colorized ASCII path steps.
- **`codeatlas ask "<question>"`**: Runs `buildBoundedContext()` and streams LLM answers with line citations to `process.stdout`.
- **`codeatlas lint`**: Detects circular dependencies and prints architectural warnings; exits with code 1 if `--fail-on-cycles` is set.

---

## 5. NPM Packaging Specifications

In `package.json`:

```json
{
  "name": "codeatlas",
  "version": "1.0.0",
  "description": "Interactive codebase architecture maps & grounded AI intelligence",
  "bin": {
    "codeatlas": "./bin/codeatlas.js"
  },
  "files": [
    "bin",
    ".next/standalone",
    ".next/static",
    "public",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=18.17.0"
  }
}
```

---

## 6. Implementation Checklist (When Ready)

- [ ] Create `src/server/ingestion/local.ts` to scan local directories.
- [ ] Connect local ingestion to `JobManager` in `src/server/jobs.ts`.
- [ ] Create `bin/codeatlas.js` CLI entry point.
- [ ] Implement port collision detection.
- [ ] Configure `next.config.mjs` with `output: "standalone"`.
- [ ] Add headless terminal commands (`analyze`, `trace`, `ask`, `lint`).
- [ ] Test locally using `npm link` and `npx .`.
- [ ] Publish to npm registry.
