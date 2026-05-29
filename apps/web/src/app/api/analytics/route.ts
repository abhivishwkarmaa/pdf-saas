import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let hasDb = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      hasDb = true;
    } catch {
      hasDb = false;
    }

    if (!hasDb) {
      // In-Memory Fallback mockup telemetry for stateless dev environment
      return NextResponse.json({
        ok: true,
        mode: "stateless-mock",
        metrics: {
          totalConversions: 15,
          successRate: "93.3%",
          failureRate: "6.7%",
          averageExecutionTimeSec: 8.5,
          statusBreakdown: {
            completed: 14,
            failed: 1,
            processing: 0,
            queued: 0,
          },
          popularTools: {
            "video-converter": 8,
            "compress-pdf": 4,
            "pdf-to-word": 3,
          },
        },
      });
    }

    // 1. Fetch total counts
    const allJobs = await prisma.job.findMany({
      select: {
        status: true,
        toolSlug: true,
        createdAt: true,
        completedAt: true,
      },
    });

    const total = allJobs.length;
    if (total === 0) {
      return NextResponse.json({
        ok: true,
        mode: "database-empty",
        metrics: {
          totalConversions: 0,
          successRate: "100.0%",
          failureRate: "0.0%",
          averageExecutionTimeSec: 0,
          statusBreakdown: {},
          popularTools: {},
        },
      });
    }

    // 2. Count statuses and tool slugs
    const statusBreakdown: Record<string, number> = {};
    const popularTools: Record<string, number> = {};
    let completedCount = 0;
    let failedCount = 0;
    let totalDurationMs = 0;
    let durationCount = 0;

    for (const job of allJobs) {
      statusBreakdown[job.status] = (statusBreakdown[job.status] || 0) + 1;
      popularTools[job.toolSlug] = (popularTools[job.toolSlug] || 0) + 1;

      if (job.status === "completed") completedCount++;
      if (job.status === "failed") failedCount++;

      if (job.status === "completed" && job.completedAt && job.createdAt) {
        const diff = job.completedAt.getTime() - job.createdAt.getTime();
        if (diff > 0) {
          totalDurationMs += diff;
          durationCount++;
        }
      }
    }

    const successRate = total > 0 ? ((completedCount / total) * 100).toFixed(1) + "%" : "100.0%";
    const failureRate = total > 0 ? ((failedCount / total) * 100).toFixed(1) + "%" : "0.0%";
    const averageExecutionTimeSec = durationCount > 0 
      ? parseFloat((totalDurationMs / durationCount / 1000).toFixed(2)) 
      : 0;

    return NextResponse.json({
      ok: true,
      mode: "database-telemetry",
      metrics: {
        totalConversions: total,
        successRate,
        failureRate,
        averageExecutionTimeSec,
        statusBreakdown,
        popularTools,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Aggregation failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
