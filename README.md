# CODEATLAS

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.3-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.1-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> **Interactive Codebase Architecture Maps & Grounded Intelligence**  
> *Structure first. Reason second. Evidence always.*

CodeAtlas transforms any GitHub repository or codebase into an interactive 2D architectural map of its files, modules, and dependencies. It allows developers to visually explore code relationships, trace execution paths between components, and ask natural language architectural questions backed by verifiable, line-level source code citations.

---

## ✦ Core Philosophy

Traditional AI coding assistants often hallucinate file paths, imports, and component interactions because they guess structure from text. 

**CodeAtlas works in reverse:**
1. **Deterministic AST Modeling**: CodeAtlas constructs a mathematically rigorous dependency graph using the TypeScript Compiler API before any AI is invoked.
2. **Bounded Context Retrieval**: Questions extract only the exact AST nodes, imports, and symbols relevant to the query.
3. **Zero-Hallucination Answers**: The LLM is restricted to the retrieved context. Every claim must point to a verified file and line range. Any citation outside the repository is automatically dropped by server-side verification.

---

## ✦ Key Features

### 1. Interactive Architecture Canvas (React Flow)
- **Deterministic 2D Layout Algorithms**:
  - **Layered (Sugiyama DAG)**: Top-down hierarchical ordering reflecting import and call direction.
  - **Cluster (Directory Domains)**: Groups related modules into visual bounded context domains.
  - **Radial (Central Hub Orbit)**: Orbits components around high-degree architectural centers.
  - **Subway (Metro Transit Lines)**: Straight orthogonal transit tracks with uniform grid spacing.
- **Adaptive Edge Curve Styles**:
  - **Fluid S-Curves (Bezier)**: Adaptive cubic curves with staggered port slots to eliminate line overlap.
  - **Subway Curves**: Rounded 90° orthogonal bends.
  - **Obstacle-Free**: Dynamically calculates unobstructed paths bypassing intermediate nodes.
  - **Straight Vectors**: Direct Euclidean line segments.
- **Anti-Clutter Edge Density Filtering**:
  - **Subtle (Recommended)**: Keeps background dependency lines muted; illuminates active connections on node hover or selection.
  - **Focus Only**: Completely isolates the selected component and its direct imports/dependents.
  - **Dense Tapestry**: Displays all repository connections at full presence.
- **Camera Controls**: Zoom in/out, fit to viewport, and auto-focus centering camera tracking.

### 2. Trace Flow (Dependency Path Analysis)
- Computes the shortest dependency path between any two source files or package modules using Dijkstra / BFS.
- Visually illuminates the entire trace path on the canvas with animated directional flow.
- Displays human-readable, step-by-step explanations of how control or data flows from source to destination.

### 3. Ask CodeAtlas (Grounded Architectural Intelligence)
- Ask natural language questions about state management, component lifecycles, authentication flows, or data pipelines.
- **Verified Source Citations**: Every answer provides clickable citations (e.g. `src/features/auth/Login.tsx:14-27`). Clicking any citation immediately opens the code viewer focused at those exact lines.
- **Streaming Real-Time Tokens**: Server-sent events (SSE) stream answers token-by-token with zero buffering lag.
- **Adaptive Reasoning Effort**: Dynamically scales thinking effort based on query depth (e.g., deep architectural traces trigger high-effort chain-of-thought).
- **Session History Persistence**: Conversations and citations persist across queries and can be switched or cleared at will.
- **Offline AST Synthesizer**: If no API key is configured, CodeAtlas gracefully falls back to an offline deterministic synthesizer that analyzes AST data locally without external network dependencies.

### 4. VS Code Themeable Source Code Viewer
- Full syntax highlighting with tokenized color palettes.
- **8 VS Code Themes**:
  - VS Code Dark+
  - VS Code Light+
  - GitHub Dark
  - One Dark Pro
  - Monokai
  - Dracula
  - Solarized Dark
  - Abyss
- **Clickable Intra-Repo Import Navigation**: Hover over and click any `import ... from "./foo"` line to jump directly to the imported file.
- **In-File Search**: Press `Ctrl+F` or click the search icon to find keywords with instant match highlighting, match counters (`3 of 12`), and Next/Previous navigation (`Enter` / `Shift+Enter`).
- **Soft Word Wrapping**: Toggle between horizontal scrolling and word wrapping.
- **Persistent Status Bar**: Displays current file path, active line numbers, selection line ranges, and language indicator.

### 5. Custom Models & API Key Management
- Add custom AI models (e.g., `deepseek/deepseek-r1`, `anthropic/claude-3.5-sonnet`, `openai/gpt-4o`, `meta-llama/llama-3.3-70b-instruct`) with custom API keys.
- **Dynamic Model Availability Checking**: On site load, CodeAtlas queries the live model registry to hide discontinued or defunct models, ensuring only active, working models are selectable.
- **1-Click Model Presets**: Instantly add popular reasoning and coding models.
- **Multiple Providers**: Supports OpenRouter, OpenAI, Google Gemini, Anthropic, and local OpenAI-compatible endpoints (Ollama / vLLM / LocalAI).

### 6. Centralized Preferences & Settings
- Comprehensive Swiss Brutalist modal accessible via the header **SETTINGS** button or Ask CodeAtlas shortcuts.
- Centralizes all AI models, API keys, Graph Layout algorithms, Edge curves, Density filters, Code Viewer themes, and Light/Dark modes.
- Instant synchronization across all UI components via a reactive event bus without requiring page reloads.

### 7. Responsive Mobile & Tablet Experience
- Optimized layout for mobile phones, tablets, and wide desktop screens.
- Equalized button and selection row heights (36px standard / 32px compact).
- Mobile bottom navigation dock (`FILES`, `INSPECT`, `TRACE`, `ASK`).
- Left slide-over file explorer drawer and bottom inspection sheet.
- Auto-focus camera re-centering on mobile and tablet when nodes are selected.

### 8. GitHub OAuth & Private Repositories
- Secure GitHub OAuth authentication.
- Analyze private repositories with user-delegated GitHub access tokens.

---

## ✦ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) with Turbopack |
| **UI Library** | [React 19](https://react.dev/) |
| **Language** | [TypeScript 5.9](https://www.typescriptlang.org/) |
| **Graph Visualization** | [React Flow v11](https://reactflow.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + Swiss Brutalist CSS Custom Properties |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **AST Parsing** | TypeScript Compiler API (`typescript`) |
| **AI / LLM Integration** | OpenRouter API / OpenAI API / Gemini API / Anthropic API / Local Ollama |

---

## ✦ Getting Started

### Prerequisites
- **Node.js**: `v18.17.0` or higher
- **npm** or **pnpm** or **yarn**

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/CodeAtlas.git
cd CodeAtlas
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:

```env
# Optional: OpenRouter API key for live neural reasoning models
OPENROUTER_API_KEY="your_openrouter_api_key_here"

# Optional: Default models
OPENROUTER_MODEL="google/gemini-3.8-flash"
OPENROUTER_FREE_MODEL="nvidia/nemotron-3-ultra-550b-a55b:free"

# Optional: GitHub OAuth (for analyzing private repositories)
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
```

> **Note:** If no API key is provided, CodeAtlas will automatically run in **Offline Mode** using the built-in deterministic AST synthesizer. You can also enter custom API keys at any time directly through the in-app **Settings** modal.

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm start
```

---

## ✦ Project Structure

```
CodeAtlas/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze/         # Background repository analysis jobs
│   │   │   ├── ask/             # Grounded Q&A with token streaming & citations
│   │   │   ├── auth/            # GitHub OAuth authentication & session
│   │   │   ├── graph/           # Deterministic graph data provider
│   │   │   ├── models/          # Dynamic model availability validation
│   │   │   ├── repository/      # File details and source code streaming
│   │   │   ├── search/          # AST symbol & file search
│   │   │   └── trace/           # Shortest-path dependency path tracer
│   │   ├── globals.css          # Swiss Brutalist theme variables & layout rules
│   │   ├── layout.tsx           # Root Next.js layout & typography
│   │   └── page.tsx             # Main dashboard orchestration
│   ├── components/
│   │   ├── AnalysisProgress.tsx # Live analysis progress & stage indicators
│   │   ├── AskCodeAtlas.tsx     # Bounded-context Q&A modal & history
│   │   ├── AtlasCanvas.tsx      # React Flow interactive architecture map
│   │   ├── CodeViewer.tsx       # Themeable source viewer with import navigation
│   │   ├── CustomSelect.tsx     # Swiss Brutalist custom select menu
│   │   ├── FileExplorer.tsx     # Hierarchical file tree with search
│   │   ├── FileInspector.tsx    # Node inspector (imports, exports, dependents)
│   │   ├── Header.tsx           # Top navigation bar & action controls
│   │   ├── LandingHero.tsx      # Repository URL intake & demo starter
│   │   ├── MarkdownRenderer.tsx # GitHub-flavored markdown with code syntax
│   │   ├── SettingsModal.tsx    # Centralized preferences & custom model manager
│   │   └── TraceFlowModal.tsx   # Dependency trace start/end selector
│   ├── server/
│   │   ├── auth/                # GitHub OAuth session handling
│   │   ├── ingestion/           # GitHub repository archive streaming & filtering
│   │   ├── intelligence/        # LLM adapter, retrieval, bounded context, citations
│   │   ├── parser/              # TypeScript Compiler API AST parser & graph builder
│   │   ├── trace/               # Shortest path graph algorithms (Dijkstra/BFS)
│   │   └── jobs.ts              # In-memory background job manager
│   ├── types/
│   │   └── index.ts             # Complete domain TypeScript type definitions
│   └── utils/
│       ├── api.ts               # Client-side API fetch wrappers
│       ├── codeTheming.ts       # 8 VS Code theme definitions & AST tokenizer
│       ├── layout.ts            # 2D graph layout algorithms & edge routing
│       ├── settings.ts          # Reactive settings manager & useSettings hook
│       └── useBreakpoint.ts     # Mobile / Tablet / Desktop responsive hook
├── docs/
│   └── CLI_PACKAGING_PLAN.md    # Complete architectural plan for 'npx codeatlas'
├── PRD.md                       # Product Requirements Document
├── package.json
└── README.md
```

---

## ✦ Golden Demo Walkthrough

Want to test CodeAtlas immediately? Follow the prepared Golden Demo path:

1. Launch CodeAtlas and click **TRY DEMO** (or input `https://github.com/purval26/CodeAtlas-Prototype`).
2. The interactive **Atlas Canvas** renders the architecture with clusters and layered dependencies.
3. Select `src/features/auth/Login.tsx` in the file tree or canvas to view its incoming and outgoing imports.
4. Click **TRACE** in the top navigation:
   - Start: `Login.tsx`
   - Destination: `ProtectedRoute.tsx`
   - Click **CALCULATE TRACE FLOW** to see the 5-step dependency path illuminated across the canvas.
5. Click **ASK** and prompt:  
   *"What happens when a user logs in?"*
6. Review the streamed answer, accompanied by verified citations.
7. Click any citation to open the **Code Viewer** navigated directly to the cited lines.

---

## ✦ CLI Tool Roadmap (`npx codeatlas`)

A complete architectural specification has been prepared to package CodeAtlas as an executable command-line package. Once implemented, developers will be able to run:

```bash
# Launch interactive architecture map in any directory:
npx codeatlas .

# Headless dependency trace in terminal:
codeatlas trace src/index.ts src/database/client.ts

# Headless architectural Q&A:
codeatlas ask "How does data validation work?"
```

For full details, see [`docs/CLI_PACKAGING_PLAN.md`](docs/CLI_PACKAGING_PLAN.md).

---

## ✦ License

This project is licensed under the MIT License.
