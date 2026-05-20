import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function runCommand(
  cmd: string,
  args: string[],
  options?: { cwd?: string; timeout?: number }
): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execFileAsync(cmd, args, {
      cwd: options?.cwd,
      timeout: options?.timeout ?? 120_000,
      maxBuffer: 50 * 1024 * 1024,
    });
    return { stdout: result.stdout.toString(), stderr: result.stderr.toString() };
  } catch (err: unknown) {
    const e = err as { stdout?: Buffer; stderr?: Buffer; message?: string };
    throw new Error(
      e.stderr?.toString() || e.stdout?.toString() || e.message || "Command failed"
    );
  }
}

export async function commandExists(cmd: string): Promise<boolean> {
  try {
    await runCommand("which", [cmd]);
    return true;
  } catch {
    return false;
  }
}
