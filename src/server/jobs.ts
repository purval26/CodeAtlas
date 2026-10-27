import { randomUUID } from "node:crypto";
import {
  AnalysisJob,
  GraphData,
  Repository,
} from "@/types";
import { fetchRepositoryFiles } from "./ingestion/github";
import { parseSourceFile, ParsedFileResult } from "./parser/ast";
import { DependencyResolver } from "./parser/resolver";
import { buildDependencyGraph } from "./parser/graph";

export interface StoredRepoData {
  repository: Repository;
  parsedFiles: Map<string, ParsedFileResult>;
  graphData: GraphData;
  ownerUserId?: number;
  authorizedUserIds?: Set<number>;
}

interface StoredRepoEntry {
  data: StoredRepoData;
  createdAt: number;
  lastAccessed: number;
}

interface StoredJobEntry {
  job: AnalysisJob;
  createdAt: number;
  githubToken?: string;
  userId?: number;
}

export class JobManager {
  private readonly MAX_REPOSITORIES = 10;
  private readonly REPO_TTL_MS = 60 * 60 * 1000; // 1 hour TTL
  private readonly MAX_JOBS = 50;
  private readonly JOB_TTL_MS = 60 * 60 * 1000; // 1 hour TTL

  private jobs = new Map<string, StoredJobEntry>();
  private repositories = new Map<string, StoredRepoEntry>();

  public pruneExpired() {
    const now = Date.now();

    for (const [id, entry] of this.repositories.entries()) {
      if (now - entry.createdAt > this.REPO_TTL_MS) {
        this.repositories.delete(id);
      }
    }

    for (const [id, entry] of this.jobs.entries()) {
      if (
        (entry.job.status === "completed" || entry.job.status === "failed") &&
        now - entry.createdAt > this.JOB_TTL_MS
      ) {
        this.jobs.delete(id);
      }
    }

    if (this.jobs.size > this.MAX_JOBS) {
      const candidates = Array.from(this.jobs.entries())
        .filter(([, e]) => e.job.status === "completed" || e.job.status === "failed")
        .sort((a, b) => a[1].createdAt - b[1].createdAt);

      while (this.jobs.size > this.MAX_JOBS && candidates.length > 0) {
        const oldest = candidates.shift()!;
        this.jobs.delete(oldest[0]);
      }
    }
  }

  public storeRepositoryData(repositoryId: string, data: StoredRepoData) {
    this.pruneExpired();

    if (this.repositories.size >= this.MAX_REPOSITORIES && !this.repositories.has(repositoryId)) {
      let lruKey: string | null = null;
      let oldestAccess = Infinity;

      for (const [id, entry] of this.repositories.entries()) {
        if (entry.lastAccessed < oldestAccess) {
          oldestAccess = entry.lastAccessed;
          lruKey = id;
        }
      }

      if (lruKey) {
        this.repositories.delete(lruKey);
      }
    }

    const now = Date.now();
    this.repositories.set(repositoryId, {
      data,
      createdAt: now,
      lastAccessed: now,
    });
  }

  public createJob(url: string, githubToken?: string, userId?: number): AnalysisJob {
    this.pruneExpired();

    const id = `job_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const nowIso = new Date().toISOString();
    const job: AnalysisJob = {
      id,
      status: "queued",
      progress: 0,
      stage: "01 FETCH REPOSITORY: Initializing...",
      url,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.jobs.set(id, { job, createdAt: Date.now(), githubToken, userId });

    // Process asynchronously without blocking the response
    setImmediate(() => {
      this.processJob(id).catch((err) => {
        console.error(`Job ${id} error:`, err);
      });
    });

    return job;
  }

  public getJob(id: string): AnalysisJob | undefined {
    this.pruneExpired();
    return this.jobs.get(id)?.job;
  }

  public getRepositoryData(repositoryId: string): StoredRepoData | undefined {
    this.pruneExpired();
    const entry = this.repositories.get(repositoryId);
    if (!entry) return undefined;

    entry.lastAccessed = Date.now();
    return entry.data;
  }

  private updateJob(id: string, patch: Partial<AnalysisJob>) {
    const existing = this.jobs.get(id);
    if (!existing) return;
    const updated: AnalysisJob = {
      ...existing.job,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(id, {
      job: updated,
      createdAt: existing.createdAt,
      githubToken: existing.githubToken,
    });
  }

  private async processJob(jobId: string) {
    const entry = this.jobs.get(jobId);
    if (!entry) return;
    const job = entry.job;

    try {
      // Stage 1: FETCH REPOSITORY
      this.updateJob(jobId, {
        status: "fetching",
        stage: "01 FETCH REPOSITORY: Initializing...",
        progress: 10,
      });

      const { repository, files } = await fetchRepositoryFiles(
        job.url,
        entry.githubToken,
        (progress, stage) => {
          this.updateJob(jobId, {
            status: "fetching",
            stage,
            progress,
          });
        }
      );

      await new Promise((r) => setTimeout(r, 60));

      // Stage 2: INDEX FILES
      this.updateJob(jobId, {
        status: "indexing",
        stage: `02 INDEX FILES: Indexed ${files.length} repository files`,
        progress: 38,
        repositoryId: repository.id,
      });

      await new Promise((r) => setTimeout(r, 60));

      // Find tsconfig content if present
      const tsconfigFile = files.find(
        (f) => f.path === "tsconfig.json" || f.path === "jsconfig.json"
      );
      const tsconfigContent = tsconfigFile?.content;

      // Stage 3: PARSE AST
      this.updateJob(jobId, {
        status: "parsing",
        stage: `03 PARSE AST: Parsing code files...`,
        progress: 52,
      });

      const parsedFiles = new Map<string, ParsedFileResult>();
      const codePaths: string[] = [];
      let parsedCount = 0;

      for (const file of files) {
        if (file.path === "tsconfig.json" || file.path === "package.json") {
          continue;
        }

        try {
          const parsed = parseSourceFile(file.path, file.content, repository.id);
          parsedFiles.set(file.path, parsed);
          codePaths.push(file.path);
          parsedCount++;
        } catch (err: any) {
          console.warn(`AST Parse warning for ${file.path}:`, err.message);
        }
      }

      this.updateJob(jobId, {
        status: "parsing",
        stage: `03 PARSE AST: Extracted AST symbols across ${parsedCount} files`,
        progress: 68,
      });

      await new Promise((r) => setTimeout(r, 60));

      // Stage 4: RESOLVE DEPENDENCIES
      this.updateJob(jobId, {
        status: "resolving",
        stage: "04 RESOLVE DEPENDENCIES: Resolving imports & aliases...",
        progress: 78,
      });

      const resolver = new DependencyResolver(codePaths, tsconfigContent);

      await new Promise((r) => setTimeout(r, 60));

      // Stage 5: BUILD ATLAS
      this.updateJob(jobId, {
        status: "graphing",
        stage: "05 BUILD ATLAS: Building architecture map...",
        progress: 90,
      });

      const graphData = buildDependencyGraph(repository, parsedFiles, resolver);

      // Store in memory
      const authorizedUserIds = new Set<number>();
      if (entry.userId !== undefined) {
        authorizedUserIds.add(entry.userId);
      }

      this.storeRepositoryData(repository.id, {
        repository,
        parsedFiles,
        graphData,
        ownerUserId: entry.userId,
        authorizedUserIds,
      });

      await new Promise((r) => setTimeout(r, 60));

      // Stage 6: PREPARE ASK & COMPLETED
      this.updateJob(jobId, {
        status: "completed",
        stage: `06 PREPARE ASK: Complete (${graphData.stats.totalFiles} files, ${graphData.stats.totalImports} edges)`,
        progress: 100,
        repositoryId: repository.id,
      });
    } catch (err: any) {
      console.error(`Analysis failed for job ${jobId}:`, err);
      this.updateJob(jobId, {
        status: "failed",
        error: err.message || "An unknown analysis error occurred.",
        progress: 0,
      });
    }
  }
}

// Global singleton to persist across Next.js API requests in node environment
const globalForJobs = globalThis as unknown as { jobManager: JobManager };
export const jobManager = globalForJobs.jobManager || new JobManager();
if (process.env.NODE_ENV !== "production") globalForJobs.jobManager = jobManager;
