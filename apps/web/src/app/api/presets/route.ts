import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";

export const dynamic = "force-dynamic";

const fallbackPresets = [
  { id: "preset-1", name: "Social Media (1080p MP4 H264)", format: "mp4", resolution: "1080p", fps: "30", codec: "h264", bitrate: "4M" },
  { id: "preset-2", name: "Mobile optimized (720p H265)", format: "mp4", resolution: "720p", fps: "30", codec: "hevc", bitrate: "1.5M" },
  { id: "preset-3", name: "Ultra Quality (4K VP9)", format: "webm", resolution: "4K", fps: "60", codec: "vp9", bitrate: "15M" },
  { id: "preset-4", name: "Lightweight GIF (360p 15fps)", format: "gif", resolution: "360p", fps: "15", codec: "copy", bitrate: "" },
];

export async function GET() {
  try {
    let hasDb = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      hasDb = true;
    } catch {
      hasDb = false;
    }

    if (hasDb) {
      const dbPresets = await prisma.preset.findMany({
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ presets: [...dbPresets, ...fallbackPresets] });
    }
    return NextResponse.json({ presets: fallbackPresets });
  } catch {
    return NextResponse.json({ presets: fallbackPresets });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.name || !data.format) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let hasDb = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      hasDb = true;
    } catch {
      hasDb = false;
    }

    const newPreset = {
      name: String(data.name),
      format: String(data.format),
      resolution: String(data.resolution || ""),
      fps: String(data.fps || ""),
      codec: String(data.codec || ""),
      bitrate: String(data.bitrate || ""),
    };

    if (hasDb) {
      const created = await prisma.preset.create({
        data: newPreset,
      });
      return NextResponse.json(created);
    } else {
      // In stateless mode, simulate creating it and returning it back
      const createdMock = {
        id: `mock-preset-${Date.now()}`,
        ...newPreset,
        createdAt: new Date().toISOString(),
      };
      return NextResponse.json(createdMock);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create preset";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
