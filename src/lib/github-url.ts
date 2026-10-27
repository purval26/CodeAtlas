export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  normalizedUrl: string;
}

export function parseGitHubUrl(input: string): { valid: true; data: ParsedGitHubUrl } | { valid: false; error: string } {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "Please enter a GitHub repository URL." };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: "URL cannot be empty." };
  }

  // Handle formats:
  // https://github.com/owner/repo
  // github.com/owner/repo
  // owner/repo
  let match = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git|\/)?$/);

  if (!match) {
    match = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  }

  if (!match) {
    return {
      valid: false,
      error: "Invalid repository format. Please use 'owner/repo' or 'https://github.com/owner/repo'.",
    };
  }

  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");

  if (!owner || !repo) {
    return { valid: false, error: "Repository owner and name must not be empty." };
  }

  return {
    valid: true,
    data: {
      owner,
      repo,
      normalizedUrl: `https://github.com/${owner}/${repo}`,
    },
  };
}
