import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { stat } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

/**
 * Check if a command exists (Windows-safe).
 * Avoids importing exec.ts which uses dynamic process.cwd() paths
 * that trigger Next.js NFT over-tracing warnings.
 */
async function commandExists(cmd: string): Promise<boolean> {
  // 1. Check for a local bin directory first
  const isWin = process.platform === "win32";
  const ext = isWin ? ".exe" : "";
  const cwd = process.cwd();
  const localDirs = [
    path.join(cwd, "bin"),
    path.join(cwd, "..", "bin"),
    path.join(cwd, "..", "..", "bin"),
  ];
  for (const dir of localDirs) {
    try {
      const full = path.join(dir, `${cmd}${ext}`);
      const s = await stat(full);
      if (s.isFile()) return true;
    } catch {
      // not found here
    }
  }

  // 2. Fall back to `where` (Windows) / `which` (Unix)
  try {
    const whichCmd = isWin ? "where" : "which";
    await execFileAsync(whichCmd, [cmd]);
    return true;
  } catch {
    return false;
  }
}

/**
 * GET /api/jobs/health
 * Returns whether FFmpeg is available on the server.
 */
export async function GET() {
  const ffmpeg = await commandExists("ffmpeg").catch(() => false);
  return NextResponse.json({ ffmpeg, status: "ok" });
}
