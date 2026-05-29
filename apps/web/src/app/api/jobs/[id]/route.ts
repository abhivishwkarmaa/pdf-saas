import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { getInMemoryJob } from "../route";
import { getPublicDownloadUrl } from "@pdf-saas/storage";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
    }

    let hasDb = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      hasDb = true;
    } catch {
      hasDb = false;
    }

    let job: any = null;

    if (hasDb) {
      job = await prisma.job.findUnique({
        where: { id },
      });
    }

    if (!job) {
      job = getInMemoryJob(id);
    }

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    let downloadUrl: string | null = null;
    if (job.status === "completed" && job.outputKey) {
      downloadUrl = getPublicDownloadUrl(job.outputKey);
    }

    let downloadUrls: { name: string; url: string }[] = [];
    if (job.status === "completed" && job.outputKeys && job.outputKeys.length > 0) {
      downloadUrls = job.outputKeys.map((key: string) => {
        const parts = key.split("/");
        const name = parts[parts.length - 1];
        return {
          name,
          url: getPublicDownloadUrl(key)
        };
      });
    }

    return NextResponse.json({
      id: job.id,
      toolSlug: job.toolSlug,
      status: job.status,
      progress: job.progress,
      speed: job.speed || "1.0x",
      eta: job.eta || "00:00",
      error: job.error,
      logs: job.logs || [],
      fileName: job.fileName,
      mimeType: job.mimeType,
      downloadUrl,
      downloadUrls,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
