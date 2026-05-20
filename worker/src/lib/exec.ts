import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function run(
  cmd: string,
  args: string[],
  cwd?: string
): Promise<void> {
  await execFileAsync(cmd, args, {
    cwd,
    timeout: 300_000,
    maxBuffer: 100 * 1024 * 1024,
  });
}

export async function exists(cmd: string): Promise<boolean> {
  try {
    await execFileAsync("which", [cmd]);
    return true;
  } catch {
    return false;
  }
}
