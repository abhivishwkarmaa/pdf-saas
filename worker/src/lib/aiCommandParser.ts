import OpenAI from "openai";
import { ParsedCommand, ValidationError } from "@pdf-saas/shared";
import { ruleBasedParse } from "./ruleBasedParser.js";

let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ValidationError(
        "OPENAI_API_KEY environment variable is not set.",
        400,
        "AI Command Parsing is currently unavailable because the API key is not configured.",
        "OPENAI_KEY_MISSING"
      );
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export async function parseAICommand(
  userCommand: string,
  totalPages: number
): Promise<ParsedCommand> {
  // Check if OpenAI key is missing first and try rule-based fallback
  if (!process.env.OPENAI_API_KEY) {
    const fallback = ruleBasedParse(userCommand, totalPages);
    if (fallback) {
      return fallback;
    }
    throw new ValidationError(
      "OPENAI_API_KEY environment variable is not set.",
      400,
      "AI Command Parsing is currently unavailable because the API key is not configured.",
      "OPENAI_KEY_MISSING"
    );
  }

  try {
    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a PDF command parser. Parse the user's natural language command into a structured JSON action.
        
The PDF has ${totalPages} total pages.

Return ONLY valid JSON matching this schema:
{
  "action": one of: remove_pages | replace_page | extract_pages | rotate_pages | merge | split | compress | watermark | convert_to_word | reorder_pages | delete_blank_pages | add_page_numbers | encrypt | decrypt | resize_pages | unknown,
  "pages": [array of page numbers if applicable, 1-indexed],
  "pageRange": { "from": number, "to": number } if range specified,
  "rotationDegrees": 90 | 180 | 270 if rotation,
  "splitAfterPage": number if split,
  "watermarkText": string if watermark,
  "watermarkPosition": "center" | "top" | "bottom",
  "watermarkOpacity": 0.1 to 1.0,
  "password": string if encrypt/decrypt,
  "outputFormat": string if conversion,
  "targetSize": string if compress with target,
  "reorderMap": [array] if reorder,
  "confidence": 0.0 to 1.0,
  "explanation": "human readable explanation of what will be done"
}

Examples:
- "remove page 3 and 5" → { "action": "remove_pages", "pages": [3,5], "confidence": 0.99, "explanation": "Pages 3 and 5 will be permanently deleted" }
- "extract pages 4 to 8" → { "action": "extract_pages", "pageRange": { "from": 4, "to": 8 }, "confidence": 0.99, "explanation": "Pages 4 through 8 will be extracted into a new PDF" }
- "rotate page 1 by 90 degrees" → { "action": "rotate_pages", "pages": [1], "rotationDegrees": 90, "confidence": 0.99, "explanation": "Page 1 will be rotated 90 degrees clockwise" }
- "add watermark CONFIDENTIAL" → { "action": "watermark", "watermarkText": "CONFIDENTIAL", "watermarkPosition": "center", "watermarkOpacity": 0.3, "confidence": 0.95, "explanation": "CONFIDENTIAL watermark will be added to all pages" }
`
        },
        { role: "user", content: userCommand }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const content = response.choices[0].message.content ?? "{}";
    try {
      // Clean markdown code blocks if present
      const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean);
      return parsed as ParsedCommand;
    } catch (parseErr) {
      console.error("Failed to parse OpenAI response content:", parseErr);
      const fallback = ruleBasedParse(userCommand, totalPages);
      if (fallback) {
        return fallback;
      }
      throw parseErr;
    }
  } catch (err: any) {
    console.error("OpenAI parser error in worker:", err);
    // On OpenAI failure, attempt to fall back to the rule-based parser
    const fallback = ruleBasedParse(userCommand, totalPages);
    if (fallback) {
      return fallback;
    }
    throw new ValidationError(
      err.message || "Failed to parse command with OpenAI",
      400,
      "Unable to process your AI command at this time.",
      "AI_PARSER_ERROR"
    );
  }
}
