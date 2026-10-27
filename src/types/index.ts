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


