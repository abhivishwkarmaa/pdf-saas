import { NextResponse } from "next/server";
import { getCliStatus } from "@/lib/server/cli-status";

export async function GET() {
  const cli = await getCliStatus();
  return NextResponse.json({
    ok: true,
    mode: "stateless",
    serverToolsReady: cli.allReady,
    cli: cli.checks.map((c) => ({
      command: c.id,
      label: c.label,
      available: c.available,
    })),
    timestamp: new Date().toISOString(),
  });
}
