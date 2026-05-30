import { mkdir, readFile, writeFile, unlink, readdir, stat } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as s3GetSignedUrl } from "@aws-sdk/s3-request-presigner";

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
  if (!hasR2) {
    await mkdir(path.join(ROOT, "uploads"), { recursive: true });
    await mkdir(path.join(ROOT, "outputs"), { recursive: true });
  }
}

// R2 S3 Configuration
const hasR2 = !!(
  process.env.R2_ENDPOINT &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME
);

const s3Client = hasR2
  ? new S3Client({
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      region: "auto",
      forcePathStyle: true,
    })
  : null;

export async function saveUpload(
  body: Buffer,
  fileName: string
): Promise<{ key: string; expiresAt: Date }> {
  await ensureStorageDir();
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  const key = `uploads/${uuidv4()}/${safe}`;

  if (hasR2 && s3Client) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: body,
      })
    );
  } else {
    const full = resolvePath(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
  }
  return { key, expiresAt: getExpiresAt() };
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  if (hasR2 && s3Client) {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    );
    if (!response.Body) {
      throw new Error(`S3 Object body empty for key: ${key}`);
    }
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  } else {
    return readFile(resolvePath(key));
  }
}

export async function putObjectBuffer(
  key: string,
  body: Buffer,
  mimeType?: string
): Promise<void> {
  if (hasR2 && s3Client) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: mimeType,
      })
    );
  } else {
    const full = resolvePath(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
  }
}

export async function deleteObject(key: string): Promise<void> {
  if (hasR2 && s3Client) {
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
        })
      );
    } catch (err) {
      console.error("Failed to delete S3 object:", err);
    }
  } else {
    try {
      await unlink(resolvePath(key));
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
}

export async function getSignedUrl(
  key: string,
  expiresInSeconds: number = 86400
): Promise<string> {
  if (hasR2 && s3Client) {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });
    return s3GetSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  } else {
    return getPublicDownloadUrl(key);
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
  if (hasR2) {
    // If Cloudflare R2 is configured, rely on bucket lifecycle policy
    return 0;
  }
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
