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
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }
    if (files.length > tool.maxFiles) {
      return NextResponse.json({ error: "Too many files" }, { status: 400 });
    }

    let options: Record<string, unknown> = {};
    const optionsRaw = formData.get("options");
    if (typeof optionsRaw === "string" && optionsRaw) {
      options = JSON.parse(optionsRaw) as Record<string, unknown>;
    }

    const filenames = files.map((f) => f.name);
    const buffers = await Promise.all(
      files.map(async (f) => Buffer.from(await f.arrayBuffer()))
    );

    const result = await processOnServer(slug, buffers, options, filenames);

    const fileName =
      tool.category === "image" && files[0]?.name
        ? files[0].name
        : result.fileName;

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
