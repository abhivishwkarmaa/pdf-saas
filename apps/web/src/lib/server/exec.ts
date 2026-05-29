import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { stat } from "fs/promises";

const execFileAsync = promisify(execFile);

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath);
    return s.isFile();
  } catch {
    return false;
  }
}

async function resolveLocalBinary(cmd: string): Promise<string | null> {
  const isWin = process.platform === "win32";
  const cmdWithExt = isWin && !cmd.toLowerCase().endsWith(".exe") ? `${cmd}.exe` : cmd;

  const candidateDirs = [
    path.resolve(process.cwd(), "bin"),
    path.resolve(process.cwd(), "../bin"),
    path.resolve(process.cwd(), "../../bin"),
  ];

  for (const dir of candidateDirs) {
    const fullPath = path.join(dir, cmdWithExt);
    if (await fileExists(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

export async function run(
  cmd: string,
  args: string[],
  cwd?: string
): Promise<void> {
  const localBinary = await resolveLocalBinary(cmd);
  const executable = localBinary ?? cmd;
  await execFileAsync(executable, args, {
    cwd,
    timeout: 300_000,
    maxBuffer: 100 * 1024 * 1024,
  });
}

export async function exists(cmd: string): Promise<boolean> {
  const localBinary = await resolveLocalBinary(cmd);
  if (localBinary) return true;

  try {
    const whichCmd = process.platform === "win32" ? "where" : "which";
    await execFileAsync(whichCmd, [cmd]);
    return true;
  } catch {
    return false;
  }
}
