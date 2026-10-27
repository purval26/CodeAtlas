export interface Repository {
  id: string;
  owner?: string;
  name: string;
  url?: string;
  branch?: string;
  commitSha?: string;
  isPrivate?: boolean;
  language?: string;
  analyzedAt?: string;
  rootPath?: string;
}

export interface CodeFile {
  id: string;
  repositoryId: string;
  path: string;
  language: string;
  content: string;
  size: number;
  lineCount: number;
}

export interface CodeSymbol {
  id: string;
  fileId: string;
  name: string;
  kind: "function" | "class" | "variable" | "interface" | "type";
  startLine: number;
  endLine: number;
}

export interface Dependency {
  id: string;
  sourceFileId: string;
  targetFileId: string;
  type: "import" | "require" | "dynamic-import";
}

export interface GraphNode {
  id: string;
  type: "file" | "package";
  label: string;
  path?: string;
  symbols?: CodeSymbol[];
  exports?: string[];
  lineCount?: number;
  size?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "imports";
}

export interface SourceReference {
  filePath: string;
  startLine: number;
  endLine: number;
}

export type JobStatus =
  | "queued"
  | "fetching"
  | "indexing"
  | "parsing"
  | "resolving"
  | "graphing"
  | "completed"
  | "failed";

export interface AnalysisJob {
  id: string;
  status: JobStatus;
  progress: number;
  stage?: string;
  repositoryId?: string;
  error?: string;
  url: string;
  createdAt: string;
  updatedAt?: string;
}

export type GraphLayoutMode = "layered" | "cluster" | "radial";
export type GraphEdgeStyle = "bezier" | "smoothstep" | "obstacleFree" | "straight";

export interface GraphData {
  repository: Repository;
  nodes: GraphNode[];
  edges: GraphEdge[];
  unresolvedImports: {
    sourceFile: string;
    specifier: string;
    line: number;
  }[];
  stats: {
    totalFiles: number;
    totalPackages: number;
    totalImports: number;
    totalLines: number;
  };
}

export interface AuthUser {
  id: number;
  login: string;
  name?: string;
  avatarUrl: string;
  htmlUrl?: string;
}

export interface UserRepoItem {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
  description?: string;
  updatedAt?: string;
  defaultBranch?: string;
}

export interface AuthStatusResponse {
  authenticated: boolean;
  user: AuthUser | null;
  oauthConfigured: boolean;
}

export interface ExtractedImport {
  specifier: string;
  names: string[];
  line: number;
  type: "import" | "require" | "dynamic-import";
  isTypeOnly: boolean;
}

export interface SearchResult {
  fileId: string;
  filePath: string;
  matchType: "symbol" | "file" | "content";
  symbolName?: string;
  symbolKind?: string;
  line: number;
  snippet: string;
}

export interface AskResponse {
  answer: string;
  verifiedCitations: SourceReference[];
  insufficientEvidence?: boolean;
  modelUsed?: string;
  mode?: "free" | "paid";
}

export interface ModelOption {
  id: string;
  name: string;
  mode: "free" | "paid";
  description: string;
  context?: string;
  supportsReasoning?: boolean;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "NVIDIA Nemotron 3 Ultra 550B",
    mode: "free",
    description: "Massive 550B MoE model for deep architectural reasoning & large context",
    context: "1M tokens",
  },
  {
    id: "qwen/qwen-2.5-coder-32b-instruct:free",
    name: "Qwen 2.5 Coder 32B",
    mode: "free",
    description: "State-of-the-art open coding specialist for AST & syntax comprehension",
    context: "128k tokens",
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash Exp",
    mode: "free",
    description: "Ultra-fast low-latency code understanding with generous throughput",
    context: "1M tokens",
  },
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    name: "NVIDIA Nemotron 3.5 Lightning",
    mode: "free",
    description: "Fast 30B MoE high-throughput reasoning and architectural analysis",
    context: "256k tokens",
  },
  {
    id: "google/gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    mode: "paid",
    description: "Deep thinking model with question-adaptive reasoning effort & grounded verification",
    context: "1M tokens",
    supportsReasoning: true,
  },
];

export interface AskedQuestionSessionItem {
  id: string;
  question: string;
  response: AskResponse;
  timestamp: string;
  model: string;
  mode: "free" | "paid";
}



