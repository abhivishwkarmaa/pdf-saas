import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { getSignedUrl } from "@pdf-saas/storage";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const shareToken = await prisma.shareToken.findUnique({
      where: { token },
    });

    if (!shareToken) {
      return NextResponse.json({ error: "Invalid share link" }, { status: 404 });
    }

    // Check expiration
    if (shareToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "This share link has expired (valid for 24h)" }, { status: 410 });
    }

    // Check download limits
    if (shareToken.downloads >= shareToken.maxDownloads) {
      return NextResponse.json({ error: "Download limit reached for this share link" }, { status: 410 });
    }

    // Fetch the job
    const job = await prisma.job.findUnique({
      where: { id: shareToken.jobId },
    });

    if (!job || !job.outputKey) {
      return NextResponse.json({ error: "File not found or job incomplete" }, { status: 404 });
    }

    // Increment downloads count
    await prisma.shareToken.update({
      where: { token },
      data: {
        downloads: { increment: 1 },
      },
    });

    // Generate signed download URL
    const downloadUrl = await getSignedUrl(job.outputKey);

    return NextResponse.redirect(downloadUrl);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
