# CodeAtlas — PRD & Implementation Plan

*Derived from Engineering Blueprint v1.1 · PRD + AI Agent Implementation Contract · Pre-kickoff*

## 1. Overview

**CodeAtlas** turns a public GitHub repository into an interactive map of its architecture and dependencies, then lets developers ask questions answered from real files and line numbers.

**Thesis:** Structure first. Reason second. Evidence always. The LLM never builds the architecture. CodeAtlas builds a deterministic repository model first, and AI only explains it using retrieved evidence.

## 2. Problem and Goals

**Problem:** Developers joining or reviewing an unfamiliar codebase have to read files one by one to learn how it fits together, and AI chat tools often invent files and behavior.

**Goals**

- Let a developer understand a JS/TS repo's structure in minutes, visually.
- Give answers that are verifiably grounded: every claim points to a real file and line range.
- Ship a reliable end-to-end demo within a five-day hackathon.

**Non-goals:** private repos or OAuth, a full IDE, a coding agent, languages other than JS/TS, Git history, PR analysis, mobile app, collaboration, a vector database.

## 3. Users and Key Scenarios

- **Primary user:** a developer onboarding to, auditing, or evaluating a public JS/TS repository.
- **Secondary user:** hackathon judges watching a short demo.

**Golden demo (must work reliably on one prepared repo)**

1. Paste a public GitHub URL and analyze it.
2. The Atlas appears; open the Authentication area.
3. Click `Login.tsx` and inspect its imports and relationships.
4. Run **Trace Flow**: Login → authenticate → API → AuthProvider → ProtectedRoute.
5. Ask: "What happens when a user logs in?"
6. Read the grounded answer with clickable file and line citations.
7. Click a citation and land on the exact source lines.

## 4. Requirements

### P0 — MVP

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| R1 | Import a public GitHub repo by URL | Submit returns a job ID immediately (`202`); invalid URL returns `400` with a readable message |
| R2 | Background analysis jobs | Job status is persisted and pollable; analysis is not tied to a serverless request; failures end as `failed` with a safe message |
| R3 | Ingestion filtering and limits | Ignores `.git`, `node_modules`, build output, binaries; rejects oversized repos with a readable reason |
| R4 | Parse `.js/.jsx/.ts/.tsx` | Imports, exports and symbols extracted with exact line ranges; one broken file does not fail the analysis; partial coverage is recorded and disclosed |
| R5 | Dependency resolution | Resolves relative imports and `tsconfig` path aliases (e.g. `@/*`); zero unresolved local imports on the demo repo |
| R6 | Deterministic graph | File and package nodes, `imports` edges only; same repo always yields the same graph |
| R7 | Atlas UI | Interactive graph; node click opens inspector (path, imports, exports, dependents, dependencies) |
| R8 | Explorer and code viewer | File tree synced with graph selection; syntax-highlighted source with line targeting |
| R9 | Trace Flow | User picks a start and end node and the shortest dependency path is highlighted |
| R10 | Search | Keyword and symbol search over indexed files |
| R11 | Grounded Q&A | Retrieval builds bounded context; LLM answers only from that context; says so when evidence is insufficient |
| R12 | Verified citations | Server drops any citation whose file is missing or whose lines fall outside the stored file; citation click opens the viewer at that location |

### P1 — if time permits

Folder and module clustering, framework detection, architecture summary, better search, symbol-level relationships, impact analysis, basic codebase statistics.

## 5. System Design

**Components:** Next.js UI → API layer → GitHub ingestion, parser, retrieval → dependency graph → Atlas engine and AI context → LLM → citations.

| Layer | Choice |
| --- | --- |
| Frontend | Next.js + TypeScript, Tailwind CSS, React Flow, Shiki |
| Backend | Node.js + TypeScript on Render (long-running analysis) |
| Storage and search | Hosted Postgres (Neon) with indexed text search |
| GitHub access | Octokit / GitHub API |
| Parser | TypeScript Compiler API |
| AI | Provider abstraction, one primary and one fallback model |
| Deploy | Vercel (UI) + Render (API and jobs) |

**Data model:** `Repository`, `CodeFile`, `Dependency`, `CodeSymbol`, plus `GraphNode` (`file | package`) and `GraphEdge` (`imports`). Job records track status and progress.

**Retrieval pipeline:** question → keyword extraction → file and symbol search → graph expansion → rank evidence → bounded context → LLM. **MVP budget:** max 8 files, 120 lines per file, 600 total lines, about 8k input tokens; trim lowest-ranked evidence first.

### API

| Endpoint | Purpose | Responses |
| --- | --- | --- |
| `POST /api/analyze` | Queue analysis | `202 {jobId, status}`, `400`, `429` |
| `GET /api/analyze/:jobId` | Poll status | `200 {jobId, status, progress, repositoryId?}`, `404` |
| `GET /api/graph/:repositoryId` | Fetch graph | `200`, `404` |
| `GET /api/repository/:repositoryId/file` | Fetch source | `200`, `404` |
| `POST /api/search` | Search | `200`, `400` |
| `POST /api/ask` | Grounded Q&A | `200 {answer, verifiedCitations}`, `429` |

### Error states

Invalid repository, unsupported language, partial parse, insufficient evidence, rate limit (persist the job, show retry state), oversized repo (reject early with a reason), analysis timeout or failure (job marked `failed`, UI never waits on a long request).

## 6. Implementation Plan

### Pre-kickoff (only what event rules allow)

Confirm the event's kickoff and commit rules first, since they are the final authority on permitted prep. Safe preparation:

- Lock MVP scope, stack, API and data contracts, and Atlas interaction design.
- Spike: GitHub API fetch, Render backend with Neon Postgres, async job and status flow.
- Spike: parser and import resolution, including `tsconfig` path aliases, on the chosen demo repo.
- Spike: React Flow rendering of a few hundred nodes.
- Benchmark LLM candidates on real repo questions; pick primary and fallback; draft prompts.
- Validate citation filtering; write the demo script; cache a fallback answer for the golden demo.

At the event: create the real repository, commit features after kickoff, and keep the commit history meaningful.

### Five-day schedule

| Day | Focus | Work | End state |
| --- | --- | --- | --- |
| 1 | Ingest | Repo scaffolding, Postgres schema, GitHub fetch and filtering, job queue and status endpoint | A repo imports reliably and status is pollable |
| 2 | Understand | AST extraction, import and alias resolution, graph build and `GET /api/graph`; in parallel, UI shell with mock graph data | Backend understands a JS/TS repo; Atlas skeleton exists |
| 3 | Atlas | React Flow wired to the real graph, explorer, inspector, code viewer, selection sync | CodeAtlas works visually |
| 4 | Intelligence | Search, retrieval with budget, LLM provider and fallback, citation validation, Trace Flow, error states; start README and demo recording | Complete product loop |
| 5 | Ship | Integration, bug fixes, UX polish, deploy, rehearse demo, submit | Demo works reliably on production |

### Workstreams for a team

- **Backend:** ingestion, jobs, parser, graph, API.
- **Frontend:** Atlas, explorer, inspector, viewer, Ask UI, error states.
- **AI and retrieval:** search, context builder, prompts, provider abstraction, citation validation.
- **Demo owner:** demo repo, script, cached answer, README, recording.

### Suggested milestones

1. **M1 (end of Day 1):** URL in, job ID out, files stored.
2. **M2 (end of Day 2):** graph JSON for the demo repo with zero unresolved local imports.
3. **M3 (end of Day 3):** click through the Atlas and open source.
4. **M4 (end of Day 4):** ask, trace and cite end to end.
5. **M5 (Day 5):** deployed, rehearsed, submitted.

## 7. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Serverless limits kill long analysis | Render backend with persisted async jobs |
| Imports fail to resolve (aliases, index files, extensions) | Read `tsconfig` paths; choose a demo repo and test resolution before kickoff |
| LLM invents files or lines | Strict prompt, bounded context, server-side citation validation |
| LLM outage or rate limit during demo | Fallback model plus cached golden-demo answer |
| Graph looks messy at scale | Improve layout and clustering; keep the underlying model unchanged |
| Scope creep | Cut anything that does not improve the core demo loop |
| Day 5 overload | Move README and recording to Day 4 |

## 8. Definition of Done (MVP)

- A public repo URL returns a job ID immediately and the status is pollable.
- Job, repository and index data survive backend restarts.
- Demo repo parses with no blocking error and all local imports resolve.
- User can navigate the Atlas, open files, inspect relationships and trace a dependency path.
- User can ask a question and receive a grounded answer whose citations are all verified and clickable.
- The full loop runs reliably on the prepared repo in production.

## 9. Decision Rules

1. Use mature libraries instead of rebuilding them.
2. Demo value wins over everything else.
3. Deterministic first: parsing, graph and citations are code-driven.
4. Avoid extra infrastructure (no Redis, Kafka, Kubernetes, microservices, vector DB) unless a real blocker appears.
5. One language done well: JS/TS.
6. Protect the core loop: Import → Map → Explore → Trace → Ask → Evidence.

## 10. Open Questions

- Which public repo is the golden demo, and does it use path aliases?
- Which LLM is primary and which is the fallback after benchmarking?
- What are the exact repository and file-size limits for the MVP?
- What do the event rules allow before kickoff?
## 11. Visual Design System — LOCKED

The UI must implement the CodeAtlas visual language consistently. Do not introduce a generic SaaS dashboard aesthetic.

### 11.1 Design direction

**Style:** editorial / Swiss / technical / engineering artifact.

The interface should feel like a serious developer tool and architecture instrument, not an AI chatbot or generic startup dashboard.

Principles:
- High contrast.
- Strong typography.
- Sparse composition.
- Asymmetric editorial layouts where useful.
- Thin/precise borders.
- Large focal headings.
- Dense technical information only where it improves understanding.
- Clear hierarchy between repository structure, graph, source and AI evidence.
- Prefer text, lines and diagrams over decorative graphics.

### 11.2 Explicitly forbidden visual patterns

Do NOT use:
- Purple or blue/purple gradients.
- Neon gradients.
- Glassmorphism.
- Excessive rounded cards.
- Floating icon pills.
- Generic SaaS metric-card grids.
- Decorative blobs.
- Stock photography.
- AI robots or brain imagery.
- 3D illustrations.
- Fake dashboard screenshots.
- Giant decorative icons.
- Excessive shadows.
- Gradient text.
- "AI sparkle" decoration.
- Chatbot-first landing-page layouts.

### 11.3 Color tokens

#### Light mode

```text
--paper:   #F5F2EA
--ink:     #171717
--accent:  #D8FF3E
--muted:   #6E6B64
--white:   #FBFAF6
--code:    #1D1D1B
```

The accent is **acid lime**: `#D8FF3E`.

Use it for:
- primary emphasis
- selected states
- active graph paths
- key labels
- important callouts
- the main hero accent

Do not flood the page with lime. It is a signal color.

#### Dark mode

```text
--paper:   #11100F
--ink:     #F3EFE5
--accent:  #FF2AA8
--muted:   #AAA59A
--white:   #181716
--code:    #090909
```

The accent changes to **magenta**: `#FF2AA8`.

Light mode keeps acid lime. Dark mode uses magenta. The semantic role of `--accent` stays identical.

### 11.4 Typography

Primary display/UI font:

```text
Space Grotesk
```

Fallback:

```text
Inter, Arial, sans-serif
```

Technical/data font:

```text
DM Mono
```

Use DM Mono for:
- file paths
- line numbers
- API routes
- labels
- metadata
- status text
- graph identifiers
- code-adjacent UI
- technical annotations

Suggested hierarchy:

```text
Hero title:
clamp(64px, 9vw, 150px)
weight: 700–800
letter-spacing: -0.075em
line-height: 0.86

Section title:
clamp(38px, 5vw, 76px)
weight: 700–800
letter-spacing: -0.06em
line-height: 0.92

Body:
16–18px
line-height: 1.5

Technical:
11–13px
DM Mono
```

Do not make every element oversized. Large type is reserved for major hierarchy.

### 11.5 Borders, surfaces and shape language

Use sharp geometry:
- Default border: `1px solid var(--ink)`.
- Important container border: `1.5–2px solid var(--ink)`.
- Avoid rounded corners unless a native control requires them.
- Default border radius: `0`.
- Avoid heavy shadows.
- Surfaces should generally be transparent or use `var(--white)`.

The product should look constructed from lines and panels rather than floating cards.

### 11.6 Spacing

Use a consistent spacing scale based primarily on:

```text
4 / 8 / 12 / 16 / 24 / 32 / 40 / 48 / 64 / 80
```

Prefer generous whitespace around major sections.

Do not compress the Atlas or source viewer simply to fit more content. Information density should come from hierarchy, not tiny text.

### 11.7 Core interaction language

The product vocabulary is:

```text
IMPORT → UNDERSTAND → MAP → EXPLORE → TRACE → ASK → EVIDENCE
```

Use these words consistently across UI labels.

Primary action labels should be direct:
- `ANALYZE REPOSITORY`
- `OPEN ATLAS`
- `VIEW SOURCE`
- `TRACE FLOW`
- `ASK CODEATLAS`

Avoid vague labels such as:
- `Get Started`
- `Continue`
- `Magic`
- `Generate`
- `AI Insights`

### 11.8 Landing screen

The landing screen should establish the product thesis immediately.

Required hierarchy:

```text
CODEATLAS / REPOSITORY INTELLIGENCE

Understand any
codebase.
Visually.

[short product statement]

[GITHUB REPOSITORY URL________________] [ANALYZE REPOSITORY]

Structure first.
Reason second.
Evidence always.
```

The hero should be mostly typography and whitespace. Do not put a fake graph screenshot or decorative AI artwork in the hero.

### 11.9 Analysis state

Analysis should feel like an engineering process, not a generic loading spinner.

Show a staged process such as:

```text
01 FETCH REPOSITORY       ✓
02 INDEX FILES            ✓
03 PARSE AST              ●
04 RESOLVE DEPENDENCIES   ○
05 BUILD ATLAS            ○
06 PREPARE SEARCH         ○
```

Show:
- current stage
- progress where meaningful
- repository name
- file count when available
- useful status messages

Do not fake progress.

### 11.10 Atlas screen

The Atlas is the product's primary visual artifact.

Layout:

```text
┌──────────────┬───────────────────────────────┬───────────────┐
│ FILE EXPLORER│         GRAPH CANVAS          │   INSPECTOR   │
│              │                               │               │
│ src/         │      ● auth                  │ Login.tsx     │
│ components/  │     /   \                    │               │
│ lib/         │   ● api   ● provider         │ imports       │
│              │       \                       │ exports       │
│              │        ● protected            │ dependents    │
└──────────────┴───────────────────────────────┴───────────────┘
```

Rules:
- Graph is the visual focal point.
- Explorer and inspector support the graph.
- Selected nodes use `--accent`.
- Trace paths use `--accent`.
- Do not use rainbow node colors.
- Keep graph colors restrained.
- Node labels should remain readable.
- Avoid visual clutter from every possible relationship.

### 11.11 File inspector

Show technical facts first:

```text
LOGIN.TSX
src/features/auth/Login.tsx

IMPORTS
./auth
@/api/client

EXPORTS
Login

DEPENDENCIES
auth.ts
client.ts

DEPENDENTS
ProtectedRoute.tsx
```

Use DM Mono for paths and technical metadata.

### 11.12 Code viewer

The source viewer must support:
- syntax highlighting
- visible line numbers
- exact citation targeting
- highlighted cited lines
- file path/header
- click from AI citation → exact source location

Cited lines should use the active accent as a visual marker without obscuring source readability.

### 11.13 Ask / AI interface

AI is a layer on top of the Atlas, not the primary product surface.

Preferred layout:

```text
ASK CODEATLAS
────────────────────────────────────
What happens when a user logs in?

ANSWER
...

EVIDENCE
src/auth/login.ts      L42–L58
src/auth/AuthProvider.tsx  L18–L34

[OPEN SOURCE]   [TRACE FLOW]
```

Avoid making it look like ChatGPT.

The answer must visually prioritize:
1. answer
2. evidence
3. source navigation
4. trace/exploration

### 11.14 Responsive behavior

Desktop/DeX:
- Atlas uses three-column layout.
- Graph gets the majority of horizontal space.

Tablet/mobile:
- Collapse Explorer and Inspector into drawers/panels.
- Graph remains the primary surface.
- AI answer and citations become a stacked flow.
- Preserve readable type sizes.
- Do not simply shrink the desktop interface.

Minimum touch target:
```text
44px
```

The UI must remain usable on a phone even if the main development environment is desktop-oriented.

### 11.15 Accessibility and interaction states

Every interactive element needs:
- default
- hover
- focus
- active/selected
- disabled
- loading
- error

Focus states must remain visible in both themes.

Do not rely on color alone to communicate:
- selected node
- error
- loading
- citation validity

Use labels, borders, icons or text alongside accent color.

---

## 12. Prototype Rules for the AI Coding Agent

This section is the execution contract for the AI agent building the pre-kickoff prototype.

### 12.1 Agent objective

Build a working technical prototype that proves the highest-risk CodeAtlas pipeline:

```text
GitHub URL
  ↓
Repository ingestion
  ↓
JS/TS file discovery
  ↓
AST parsing
  ↓
Import extraction
  ↓
Relative + tsconfig alias resolution
  ↓
Dependency graph
  ↓
Graph JSON
  ↓
Atlas visualization
```

The prototype should prioritize technical validation over polish, while still using the locked CodeAtlas visual system for any UI that is built.

### 12.2 Agent must not

Do not:
- expand MVP scope without approval
- introduce another framework without a blocker
- replace React Flow with a custom renderer
- build private GitHub OAuth
- build a full IDE
- build a coding agent
- add vector search unnecessarily
- add Redis/Kafka/Kubernetes/microservices
- invent repository relationships with AI
- treat an LLM response as the source of truth for architecture
- create fake data once real parser output is available

### 12.3 Agent implementation order

Build in this order:

```text
1. Repository ingestion
2. File filtering
3. AST parser
4. Import extraction
5. Relative import resolution
6. tsconfig alias resolution
7. Dependency graph
8. Graph API/data contract
9. Atlas rendering
10. File explorer
11. Inspector
12. Code viewer
13. Search
14. Retrieval
15. LLM adapter
16. Citation validation
17. Trace Flow
18. Error states
19. Demo fallback
20. Polish
```

Do not start with AI chat.

### 12.4 Prototype data contracts

Use these TypeScript shapes as the baseline:

```ts
interface Repository {
  id: string;
  owner: string;
  name: string;
  url: string;
  branch: string;
  language: string;
  analyzedAt: string;
}

interface CodeFile {
  id: string;
  repositoryId: string;
  path: string;
  language: string;
  content: string;
  size: number;
  lineCount: number;
}

interface CodeSymbol {
  id: string;
  fileId: string;
  name: string;
  kind: "function" | "class" | "variable" | "interface" | "type";
  startLine: number;
  endLine: number;
}

interface Dependency {
  id: string;
  sourceFileId: string;
  targetFileId: string;
  type: "import" | "require" | "dynamic-import";
}

interface GraphNode {
  id: string;
  type: "file" | "package";
  label: string;
  path?: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "imports";
}

interface SourceReference {
  filePath: string;
  startLine: number;
  endLine: number;
}

interface AnalysisJob {
  id: string;
  status:
    | "queued"
    | "fetching"
    | "indexing"
    | "parsing"
    | "resolving"
    | "graphing"
    | "completed"
    | "failed";
  progress: number;
  repositoryId?: string;
  error?: string;
}
```

Do not silently add additional graph edge semantics. If a new relationship is needed, document it first.

### 12.5 Citation validation contract

The server is authoritative.

For every model-generated citation:

```text
1. Normalize path.
2. Confirm file exists in the analyzed repository.
3. Confirm startLine >= 1.
4. Confirm endLine >= startLine.
5. Confirm endLine <= stored lineCount.
6. Drop invalid references.
7. Return only verified citations.
```

The client must never be responsible for validating citations.

### 12.6 Retrieval contract

MVP limits are locked:

```text
MAX_FILES = 8
MAX_LINES_PER_FILE = 120
MAX_TOTAL_LINES = 600
TARGET_CONTEXT = ~8,000 input tokens
```

When the budget is exceeded:
- keep higher-ranked evidence
- trim lower-ranked evidence
- never silently exceed the budget

### 12.7 Golden repository testing

Before declaring the prototype successful, run the complete pipeline on the chosen golden repository.

Acceptance:

```text
✓ repository fetches
✓ supported files discovered
✓ AST parsing completes
✓ imports extracted
✓ relative imports resolve
✓ tsconfig aliases resolve
✓ zero unresolved local imports
✓ deterministic graph generated
✓ graph renders
✓ node opens inspector
✓ source opens at correct lines
```

Record unresolved imports explicitly even when the acceptance test passes.

### 12.8 Testing strategy

Create small fixtures for:

```text
relative import:
./foo

extension:
./foo.ts

directory index:
./components/Button

parent import:
../utils

alias:
@/lib/auth

JS:
.js / .jsx

TS:
.ts / .tsx
```

Then test the golden repository.

Do not rely only on one giant end-to-end test.

### 12.9 Error handling

Errors must be useful to developers.

Bad:

```text
Something went wrong.
```

Good:

```text
ANALYSIS FAILED

The repository could not be parsed because
the dependency graph contains unsupported syntax.

Repository: example/repo
Stage: PARSING

[RETRY]
```

For oversized repositories:

```text
REPOSITORY TOO LARGE

This MVP supports repositories up to the configured
analysis limit.

Try a smaller repository.
```

For insufficient AI evidence:

```text
INSUFFICIENT EVIDENCE

CodeAtlas could not find enough repository evidence
to answer this confidently.
```

### 12.10 Code quality

The agent should:
- use strict TypeScript
- keep parsing/resolution logic independently testable
- avoid giant route handlers
- keep provider-specific AI code behind an adapter
- validate external input
- avoid leaking secrets to the client
- keep GitHub and LLM credentials server-side
- log analysis stage failures with job ID
- make analysis idempotent where practical
- keep the code easy for a human developer to continue after the prototype

### 12.11 Definition of prototype success

The prototype is successful when a developer can:

```text
Paste GitHub URL
      ↓
Receive job ID
      ↓
Watch analysis status
      ↓
Open generated Atlas
      ↓
Click a real file
      ↓
Inspect real dependencies
      ↓
Open real source
      ↓
Trace a real dependency path
```

AI Q&A is secondary during the first technical spike. The repository model and graph must work before AI is treated as complete.

---

## 13. Agent Handoff Prompt

The following block can be given directly to an AI coding agent:

> You are implementing the CodeAtlas technical prototype from this PRD.
>
> CodeAtlas is a repository intelligence tool. Its core principle is **Structure first. Reason second. Evidence always.**
>
> Do not begin by building an AI chatbot. First build the deterministic repository model.
>
> Use:
> - Next.js + TypeScript
> - Tailwind CSS
> - React Flow
> - TypeScript Compiler API
> - Shiki
> - Node.js/TypeScript backend
> - Render for long-running backend analysis
> - Neon/Postgres for persistent state
> - GitHub API/Octokit
>
> The visual system is locked:
> - Light background `#F5F2EA`
> - Light text `#171717`
> - Light accent `#D8FF3E`
> - Dark background `#11100F`
> - Dark text `#F3EFE5`
> - Dark accent `#FF2AA8`
> - Muted `#6E6B64` light / `#AAA59A` dark
> - Code background `#1D1D1B` light / `#090909` dark
> - Space Grotesk for UI/display
> - DM Mono for technical metadata
> - Editorial/Swiss/technical visual language
> - Sharp borders, minimal radius, no gradients, no glassmorphism, no purple, no decorative AI imagery
>
> Build in this order:
> ingestion → parser → import resolver → alias resolver → graph → Atlas → explorer → inspector → code viewer → search → retrieval → AI → citation validation → Trace Flow.
>
> `POST /api/analyze` must return `202` with a job ID immediately. Analysis must run asynchronously on the backend. `GET /api/analyze/:jobId` reports status and progress.
>
> Resolve both relative imports and `tsconfig.json` path aliases. The demo repository must have zero unresolved local imports.
>
> The MVP graph contains only:
> - nodes: `file | package`
> - edges: `imports`
>
> Never invent graph structure with an LLM.
>
> Retrieval is bounded to:
> - max 8 files
> - max 120 lines/file
> - max 600 total lines
> - approximately 8k input tokens
>
> Every LLM citation must be validated server-side against the stored repository before being returned.
>
> Start by inspecting the existing repository. Then implement the smallest vertical slice that proves:
>
> `GitHub URL → job → parsed files → resolved imports → graph JSON → React Flow Atlas`.
>
> Do not expand scope until that vertical slice works.
>
> Keep the implementation clean, testable and easy for another developer to continue.

---

## 14. Prototype Completion Checklist

### Backend

- [x] Node/TypeScript backend runs
- [x] Storage connection works
- [x] `POST /api/analyze` returns `202`
- [x] Job status persists
- [x] `GET /api/analyze/:jobId` works
- [x] GitHub repository fetch works
- [x] Repository filtering works
- [x] AST parsing works
- [x] Relative imports resolve
- [x] `tsconfig` aliases resolve
- [x] Graph JSON is deterministic

### Frontend

- [x] CodeAtlas visual tokens are implemented
- [x] Light/dark themes work
- [x] Repository input works
- [x] Analysis state works
- [x] Atlas renders real graph data
- [x] Node selection works
- [x] Explorer sync works
- [x] Inspector works
- [x] Code viewer works
- [x] Exact line navigation works

### Intelligence

- [x] Search works
- [x] Retrieval budget enforced
- [x] LLM provider adapter works
- [x] Primary model works
- [x] Fallback works
- [x] Citation validator works
- [x] Invalid citations are removed
- [x] Golden answer is cached

### Demo

- [x] Golden repository chosen
- [x] Zero unresolved local imports
- [x] Golden flow tested end-to-end
- [x] Trace Flow works
- [x] Q&A works
- [x] Citations open exact source lines
- [x] Failure states tested
- [x] Production deployment tested

---

## 15. Versioning and Change Control

This PRD is the implementation source of truth for the prototype.

Before changing:
- stack
- architecture
- API contracts
- data model
- graph semantics
- visual system
- MVP scope

the agent must explain the reason and identify the affected contracts.

Prefer a small implementation over a redesign.

If a requirement conflicts with another requirement, stop and surface the conflict instead of silently choosing an interpretation.

---

## 16. Completed Post-MVP Architectural Extensions

Beyond the initial MVP scope, the following production-grade capabilities have been fully implemented, tested, and shipped:

1. **Production Graph Controls & Dynamic Routing**:
   - Multiple deterministic layouts: Pipeline (Hierarchical), Folders (Cluster), Radial (Orbit).
   - Dynamic Obstacle-Free Bezier, Subway, and Channel edge curve routing.
   - Quick-select toolbar integrated into the live canvas and synchronized with unified settings.

2. **Custom Models & Dynamic Availability Registry**:
   - Bring-your-own API keys (OpenAI, Gemini, Anthropic, OpenRouter, and local Ollama/vLLM endpoints).
   - Real-time model registry validation on site load (`/api/models`) that automatically detects and filters out deprecated or discontinued models.

3. **Interactive Symbol-to-Source Navigation**:
   - AST Symbol outline in `FileInspector` provides 1-click line-range targeting directly into `CodeViewer` with visual citation glow.

4. **Swiss Architectural Motion Design System**:
   - Fluid, high-precision animations powered by `Framer Motion v12` with calibrated physics (`damping: 32`, `stiffness: 400`, `[0.16, 1, 0.3, 1]` cubic-bezier).
   - `AnimatePresence` lifecycle handling for modals, slide-out panels, and popover dropdowns.

5. **Dual Light/Dark Monogram Favicons & Universal SVG**:
   - High-contrast Swiss Brutalist icons matching the original CodeAtlas prototype.
   - Embedded `@media (prefers-color-scheme: dark)` SVG and real-time in-app theme reactivity.

6. **CLI Packaging Architecture**:
   - Documented in `docs/CLI_PACKAGING_PLAN.md` for local offline repository ingestion (`npx codeatlas .`).
