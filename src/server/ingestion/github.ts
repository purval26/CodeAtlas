import { randomUUID } from "node:crypto";
import {
  shouldIgnorePath,
  isCodeFile,
  isConfigFile,
  MAX_FILES_LIMIT,
  MAX_FILE_SIZE_BYTES,
} from "./filter";
import { GOLDEN_DEMO_FILES, GOLDEN_DEMO_REPO_URL, InMemoryFile } from "./demoRepo";
import { Repository } from "@/types";

export interface ParsedRepoUrl {
  owner: string;
  repo: string;
  branch?: string;
  isDemo: boolean;
}

function isValidGitHubOwner(owner: string): boolean {
  if (!owner || owner.length > 39 || owner.includes("..") || owner.startsWith(".") || owner.includes("/")) {
    return false;
  }
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(owner);
}

function isValidGitHubRepo(repo: string): boolean {
  if (!repo || repo.length > 100 || repo.includes("..") || repo.startsWith(".") || repo.includes("/")) {
    return false;
  }
  return /^[a-zA-Z0-9_.-]+$/.test(repo);
}

function isValidGitHubBranch(branch?: string): boolean {
  if (!branch) return true;
  if (branch.length > 255) return false;

  // Reject directory traversal, consecutive slashes, leading/trailing slashes, and git ref operators
  if (
    branch.includes("..") ||
    branch.includes("//") ||
    branch.startsWith("/") ||
    branch.endsWith("/") ||
    branch.startsWith(".") ||
    branch.endsWith(".lock") ||
    branch.includes("@{")
  ) {
    return false;
  }

  // Reject forbidden git ref characters & whitespace: ~ ^ : ? * [ ] \ and ASCII control chars (0-31, 127)
  if (/[\s~^:?*\[\\\]\x00-\x1f\x7f]/.test(branch)) {
    return false;
  }

  // Verify each slash-separated segment doesn't start with a dot or end with .lock
  const segments = branch.split("/");
  for (const seg of segments) {
    if (!seg || seg.startsWith(".") || seg.endsWith(".lock")) {
      return false;
    }
  }

  return true;
}

export function parseGitHubUrl(rawUrl: string): ParsedRepoUrl {
  let cleaned = rawUrl.trim();
  if (cleaned.endsWith(".git")) {
    cleaned = cleaned.slice(0, -4);
  }

  if (
    cleaned === GOLDEN_DEMO_REPO_URL ||
    cleaned.toLowerCase().includes("codeatlas/demo-auth-app") ||
    cleaned.toLowerCase() === "demo" ||
    cleaned.toLowerCase() === "demo-auth-app"
  ) {
    return {
      owner: "codeatlas",
      repo: "demo-auth-app",
      branch: "main",
      isDemo: true,
    };
  }

  // Support https://github.com/owner/repo or github.com/owner/repo with optional multi-segment branch path (e.g. tree/feature/auth)
  const urlPattern = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/tree\/(.+))?$/;
  const match = cleaned.match(urlPattern);

  if (match) {
    const owner = match[1];
    const repo = match[2];
    const branch = match[3] ? match[3].replace(/\/+$/, "") : undefined;

    if (!isValidGitHubOwner(owner) || !isValidGitHubRepo(repo) || !isValidGitHubBranch(branch)) {
      throw new Error(
        "Invalid GitHub repository identifier. Malformed or path traversal characters are rejected."
      );
    }

    return {
      owner,
      repo,
      branch,
      isDemo: false,
    };
  }

  // Short form owner/repo
  const shortPattern = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/;
  const shortMatch = cleaned.match(shortPattern);
  if (shortMatch) {
    const owner = shortMatch[1];
    const repo = shortMatch[2];

    if (!isValidGitHubOwner(owner) || !isValidGitHubRepo(repo)) {
      throw new Error(
        "Invalid GitHub repository identifier. Malformed or path traversal characters are rejected."
      );
    }

    return {
      owner,
      repo,
      isDemo: false,
    };
  }

  throw new Error(
    "Invalid GitHub repository URL. Expected format: https://github.com/owner/repo"
  );
}

export type ProgressCallback = (progress: number, stage: string) => void;

export interface IngestedRepoResult {
  repository: Repository;
  files: InMemoryFile[];
}

export async function fetchRepositoryFiles(
  rawUrl: string,
  githubToken?: string,
  onProgress?: ProgressCallback
): Promise<IngestedRepoResult> {
  const parsed = parseGitHubUrl(rawUrl);

  if (parsed.isDemo) {
    onProgress?.(25, "01 FETCH REPOSITORY: Loaded Demo Repository");
    const repository: Repository = {
      id: "repo_codeatlas_demo-auth-app",
      owner: "codeatlas",
      name: "demo-auth-app",
      url: GOLDEN_DEMO_REPO_URL,
      branch: "main",
      language: "TypeScript",
      analyzedAt: new Date().toISOString(),
      isPrivate: false,
    };
    return { repository, files: GOLDEN_DEMO_FILES };
  }

  onProgress?.(12, `01 FETCH REPOSITORY: Connecting to GitHub (${parsed.owner}/${parsed.repo})...`);

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "CodeAtlas-Analyzer/1.0",
  };
  const token = githubToken || process.env.GITHUB_TOKEN;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Fetch repo metadata
  const metaRes = await fetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
    { headers }
  );

  if (metaRes.status === 404) {
    throw new Error(
      `Repository not found: ${parsed.owner}/${parsed.repo}. Verify the repository is public and spelled correctly.`
    );
  }
  if (metaRes.status === 403 || metaRes.status === 429) {
    throw new Error(
      "GitHub API rate limit exceeded. Provide a GITHUB_TOKEN or try again later."
    );
  }
  if (!metaRes.ok) {
    throw new Error(
      `Failed to fetch repository metadata (${metaRes.status}: ${metaRes.statusText})`
    );
  }

  const metaData = (await metaRes.json()) as any;
  const defaultBranch = parsed.branch || metaData.default_branch || "main";

  // Resolve actual Git commit SHA (distinguishing it from the Git tree object SHA)
  let commitSha: string | undefined = undefined;
  try {
    const commitUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?sha=${encodeURIComponent(defaultBranch)}&per_page=1`;
    const commitRes = await fetch(commitUrl, { headers });
    if (commitRes.ok) {
      const commitList = (await commitRes.json()) as any;
      if (Array.isArray(commitList) && commitList.length > 0 && typeof commitList[0]?.sha === "string") {
        commitSha = commitList[0].sha;
      }
    }
  } catch {
    // Non-fatal if commit SHA lookup encounters network/rate issues
  }

  // Check repo size in KB (if repo is over 150MB, reject early)
  if (metaData.size && metaData.size > 150000) {
    throw new Error(
      "REPOSITORY TOO LARGE: This MVP supports repositories up to the configured analysis limit. Try a smaller repository."
    );
  }

  onProgress?.(18, `01 FETCH REPOSITORY: Reading file tree (${defaultBranch})...`);

  const treeUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${defaultBranch}?recursive=1`;
  const treeRes = await fetch(treeUrl, { headers });

  if (!treeRes.ok) {
    throw new Error(
      `Failed to fetch repository file tree (${treeRes.status}: ${treeRes.statusText})`
    );
  }

  const treeData = (await treeRes.json()) as any;
  if (!treeData.tree || !Array.isArray(treeData.tree)) {
    throw new Error("Repository tree is empty or invalid format.");
  }

  const relevantEntries = treeData.tree.filter((item: any) => {
    if (item.type !== "blob") return false;
    const path = item.path as string;
    if (shouldIgnorePath(path)) return false;
    return isCodeFile(path) || isConfigFile(path);
  });

  if (relevantEntries.length > MAX_FILES_LIMIT) {
    throw new Error(
      `REPOSITORY TOO LARGE: Found ${relevantEntries.length} JS/TS files, exceeding the MVP limit of ${MAX_FILES_LIMIT}. Try a smaller repository.`
    );
  }

  if (relevantEntries.length === 0) {
    throw new Error(
      `No supported JavaScript/TypeScript files found in ${parsed.owner}/${parsed.repo}.`
    );
  }

  onProgress?.(22, `01 FETCH REPOSITORY: Found ${relevantEntries.length} files. Downloading source...`);

  // Fetch file contents in parallel batches of 10
  const files: InMemoryFile[] = [];
  const batchSize = 10;
  for (let i = 0; i < relevantEntries.length; i += batchSize) {
    const currentCount = Math.min(relevantEntries.length, i + batchSize);
    onProgress?.(
      Math.min(32, Math.round(22 + (currentCount / relevantEntries.length) * 10)),
      `01 FETCH REPOSITORY: Downloaded ${currentCount}/${relevantEntries.length} files`
    );

    const batch = relevantEntries.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (entry: any) => {
        try {
          // 1. If we have a blob sha and authorization token, fetch via GitHub REST API
          if (entry.sha && token) {
            const blobUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/blobs/${entry.sha}`;
            const res = await fetch(blobUrl, {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.raw",
                "User-Agent": "CodeAtlas-Analyzer/1.0",
              },
            });
            if (res.ok) {
              const text = await res.text();
              if (text.length <= MAX_FILE_SIZE_BYTES) {
                return { path: entry.path as string, content: text };
              }
              return null;
            }
          }

          // 2. Direct raw fetch fallback (works for public repositories and raw content)
          const rawHeaders: Record<string, string> = {
            "User-Agent": "CodeAtlas-Analyzer/1.0",
          };
          if (token) {
            rawHeaders["Authorization"] = `token ${token}`;
          }

          const rawFileUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${defaultBranch}/${entry.path}`;
          const res = await fetch(rawFileUrl, { headers: rawHeaders });
          if (res.ok) {
            const text = await res.text();
            if (text.length <= MAX_FILE_SIZE_BYTES) {
              return { path: entry.path as string, content: text };
            }
            return null;
          }

          // 3. Fallback to API blob if raw fetch failed
          if (entry.sha && !token) {
            const blobUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/blobs/${entry.sha}`;
            const res = await fetch(blobUrl, {
              headers: {
                Accept: "application/vnd.github.raw",
                "User-Agent": "CodeAtlas-Analyzer/1.0",
              },
            });
            if (res.ok) {
              const text = await res.text();
              if (text.length <= MAX_FILE_SIZE_BYTES) {
                return { path: entry.path as string, content: text };
              }
            }
          }

          return null;
        } catch {
          return null;
        }
      })
    );

    for (const r of results) {
      if (r) files.push(r);
    }
  }

  const snapshotSuffix = randomUUID().replace(/-/g, "").slice(0, 8);
  const repository: Repository = {
    id: `repo_${parsed.owner}_${parsed.repo}_${snapshotSuffix}`.replace(/[^a-zA-Z0-9_]/g, "_"),
    owner: parsed.owner,
    name: parsed.repo,
    url: `https://github.com/${parsed.owner}/${parsed.repo}`,
    branch: defaultBranch,
    commitSha: commitSha,
    isPrivate: Boolean(metaData?.private || metaData?.visibility === "private"),
    language: metaData?.language || "TypeScript",
    analyzedAt: new Date().toISOString(),
  };

  return { repository, files };
}
