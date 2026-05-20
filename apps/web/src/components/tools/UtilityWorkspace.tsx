"use client";

import type { ToolDefinition } from "@pdf-saas/shared";
import { CalculatorWorkspace } from "./CalculatorWorkspace";
import { DeveloperWorkspace } from "./DeveloperWorkspace";

interface UtilityWorkspaceProps {
  tool: ToolDefinition;
}

export function UtilityWorkspace({ tool }: UtilityWorkspaceProps) {
  if (tool.category === "calculator") {
    return <CalculatorWorkspace tool={tool} />;
  }
  return <DeveloperWorkspace tool={tool} />;
}
