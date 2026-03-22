/**
 * git-status.ts — Cached git status for the WS status bar.
 *
 * Exports:
 *   - GitStatus — shape of the git status object
 *   - getGitStatus — cached (10s TTL), non-throwing git status fetch
 */
import { createLogger } from '../logger.js';

const logger = createLogger('git-status');

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  dirty: boolean;
  repo: string;
}

const GIT_STATUS_TTL_MS = 10_000;
let cachedGitStatus: { value: GitStatus; at: number } | null = null;

function spawnGit(args: string[]): string {
  const result = Bun.spawnSync(['git', ...args], { stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0) return '';
  return new TextDecoder().decode(result.stdout).trim();
}

/**
 * Returns the current git status, cached for 10 seconds.
 * Non-throwing: returns a safe fallback on any git error.
 */
export function getGitStatus(): GitStatus {
  const now = Date.now();
  if (cachedGitStatus && now - cachedGitStatus.at < GIT_STATUS_TTL_MS) return cachedGitStatus.value;

  const fallback: GitStatus = { branch: 'unknown', ahead: 0, behind: 0, dirty: false, repo: '' };
  try {
    const branch = spawnGit(['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown';

    let ahead = 0;
    let behind = 0;
    const aheadBehindRaw = spawnGit(['rev-list', '--count', '--left-right', 'HEAD...@{upstream}']);
    if (aheadBehindRaw) {
      const parts = aheadBehindRaw.split('\t');
      ahead = parseInt(parts[0] ?? '0', 10) || 0;
      behind = parseInt(parts[1] ?? '0', 10) || 0;
    }

    const porcelain = spawnGit(['status', '--porcelain']);
    const dirty = porcelain.length > 0;

    const topLevel = spawnGit(['rev-parse', '--show-toplevel']);
    const repo = topLevel ? (topLevel.split('/').pop() ?? '') : '';

    const value: GitStatus = { branch, ahead, behind, dirty, repo };
    cachedGitStatus = { value, at: now };
    return value;
  } catch (err) {
    logger.warn({ err }, 'getGitStatus failed — returning fallback');
    cachedGitStatus = { value: fallback, at: now };
    return fallback;
  }
}
