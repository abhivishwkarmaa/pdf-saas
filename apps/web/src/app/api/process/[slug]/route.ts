import { NextRequest, NextResponse } from "next/server";
import { getToolBySlug, resolveRuntime } from "@pdf-saas/shared";
import { processOnServer } from "@/lib/server/process";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool || !tool.enabled) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }
  if (resolveRuntime(tool) !== "server") {
    return NextResponse.json(
      { error: "This tool cannot be processed through this endpoint." },
      { status: 400 }
    );
  }

  try {
    const formData = await req.formData();
    let options: Record<string, unknown> = {};
    const optionsRaw = formData.get("options");
    if (typeof optionsRaw === "string" && optionsRaw) {
      options = JSON.parse(optionsRaw) as Record<string, unknown>;
    }

    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0 && !options.url) {
      return NextResponse.json({ error: "No files or URL provided" }, { status: 400 });
    }
    if (files.length > tool.maxFiles) {
      return NextResponse.json({ error: "Too many files" }, { status: 400 });
    }

    const filenames = files.map((f) => f.name);
    const buffers = await Promise.all(
      files.map(async (f) => Buffer.from(await f.arrayBuffer()))
    );

    const result = await processOnServer(slug, buffers, options, filenames);

    if (result.mimeType === "application/json") {
      return NextResponse.json(JSON.parse(result.buffer.toString()));
    }

    const fileName = result.fileName;

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("API PROCESS ERROR:", e);
    const message = e instanceof Error ? e.message : "Processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
