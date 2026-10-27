import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { UserRepoItem } from "@/types";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const authHeader = request.headers.get("authorization");
  const session = getSession(cookieHeader, authHeader);

  if (!session) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Authentication required to fetch user repositories." },
      { status: 401 }
    );
  }

  try {
    const reposRes = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator",
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "User-Agent": "CodeAtlas",
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!reposRes.ok) {
      return NextResponse.json(
        {
          error: "GITHUB_API_ERROR",
          message: `Failed to fetch repositories from GitHub (${reposRes.statusText})`,
        },
        { status: reposRes.status }
      );
    }

    const rawRepos = (await reposRes.json()) as any[];
    const repos: UserRepoItem[] = rawRepos.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      private: Boolean(r.private),
      htmlUrl: r.html_url,
      description: r.description || undefined,
      updatedAt: r.updated_at,
      defaultBranch: r.default_branch,
    }));

    return NextResponse.json({ repos }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err.message || "Failed to load user repositories." },
      { status: 502 }
    );
  }
}
