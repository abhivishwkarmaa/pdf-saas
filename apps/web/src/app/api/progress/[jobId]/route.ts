import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId parameter" }, { status: 400 });
  }

  const responseHeaders = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
  };

  let streamClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Poll database every 500ms
      while (!streamClosed) {
        try {
          const job = await prisma.job.findUnique({
            where: { id: jobId },
          });

          if (!job) {
            sendEvent({ error: "Job not found", status: "failed" });
            controller.close();
            streamClosed = true;
            break;
          }

          sendEvent(job);

          // If the status is final, stop streaming
          if (job.status === "completed" || job.status === "failed") {
            controller.close();
            streamClosed = true;
            break;
          }
        } catch (err) {
          sendEvent({ error: "Database polling error", status: "failed" });
          controller.close();
          streamClosed = true;
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    },
    cancel() {
      streamClosed = true;
    },
  });

  return new NextResponse(stream, { headers: responseHeaders });
}
