import { NextResponse } from "next/server";
import { getEnabledTools, TOOL_CATEGORIES } from "@pdf-saas/shared";

export async function GET() {
  return NextResponse.json({
    tools: getEnabledTools(),
    categories: TOOL_CATEGORIES,
  });
}
