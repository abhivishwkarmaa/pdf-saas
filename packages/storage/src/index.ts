import { mkdir, readFile, writeFile, unlink, readdir, stat } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

function defaultStorageRoot(): string {
  const cwd = process.cwd();
  if (cwd.includes(`${path.sep}apps${path.sep}web`)) {
    return path.resolve(cwd, "../../data/storage");
  }
  if (cwd.endsWith(`${path.sep}worker`) || cwd.includes(`${path.sep}worker${path.sep}`)) {
    return path.resolve(cwd, "../data/storage");
  }
  return path.resolve(cwd, "data/storage");
}

const ROOT = path.resolve(process.env.STORAGE_PATH ?? defaultStorageRoot());

function resolvePath(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.includes("..")) {
    throw new Error("Invalid storage key");
  }
  const full = path.join(ROOT, normalized);
  const rootResolved = path.resolve(ROOT);
  if (!full.startsWith(rootResolved)) {
    throw new Error("Invalid storage key");
  }
  return full;
}

export function getStorageRoot(): string {
  return ROOT;
}

export function getTtlHours(): number {
  return Number(process.env.FILE_TTL_HOURS ?? "2");
}

export function getExpiresAt(): Date {
  return new Date(Date.now() + getTtlHours() * 60 * 60 * 1000);
}

export async function ensureStorageDir(): Promise<void> {
  await mkdir(path.join(ROOT, "uploads"), { recursive: true });
  await mkdir(path.join(ROOT, "outputs"), { recursive: true });
}

export async function saveUpload(
  body: Buffer,
  fileName: string
): Promise<{ key: string; expiresAt: Date }> {
  await ensureStorageDir();
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  const key = `uploads/${uuidv4()}/${safe}`;
  const full = resolvePath(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body);
  return { key, expiresAt: getExpiresAt() };
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  return readFile(resolvePath(key));
}

export async function putObjectBuffer(
  key: string,
  body: Buffer,
  _mimeType?: string
): Promise<void> {
  const full = resolvePath(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body);
}

export async function deleteObject(key: string): Promise<void> {
  try {
    await unlink(resolvePath(key));
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

/** Build app URL for downloading a stored file (web serves GET /api/files/[...key]) */
export function getDownloadPath(key: string): string {
  const encoded = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/api/files/${encoded}`;
}

export function getPublicDownloadUrl(
  key: string,
  baseUrl?: string
): string {
  const base =
    baseUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${getDownloadPath(key)}`;
}

async function walkDir(dir: string): Promise<string[]> {
  const keys: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        keys.push(...(await walkDir(full)));
      } else if (entry.isFile()) {
        keys.push(path.relative(ROOT, full).replace(/\\/g, "/"));
      }
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  return keys;
}

export async function purgeFilesOlderThan(cutoff: Date): Promise<number> {
  let deleted = 0;
  for (const prefix of ["uploads", "outputs"]) {
    const dir = path.join(ROOT, prefix);
    const keys = await walkDir(dir);
    for (const key of keys) {
      try {
        const full = resolvePath(key);
        const st = await stat(full);
        if (st.mtime < cutoff) {
          await unlink(full);
          deleted++;
        }
      } catch {
        /* ignore */
      }
    }
  }
  return deleted;
}
