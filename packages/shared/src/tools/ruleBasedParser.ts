import { ParsedCommand } from "../jobs";

export function ruleBasedParse(
  command: string,
  totalPages: number
): ParsedCommand | null {
  const lower = command.toLowerCase().trim();

  // ─── REMOVE PAGES ─────────────────────────────────────────────────────────

  // "remove last N pages" / "delete last N pages"
  const lastNMatch = lower.match(/(?:remove|delete|drop)\s+last\s+(\d+)\s+pages?/);
  if (lastNMatch) {
    const n = parseInt(lastNMatch[1], 10);
    const startPage = Math.max(1, totalPages - n + 1);
    const pages = Array.from({ length: totalPages - startPage + 1 }, (_, i) => startPage + i);
    return { action: "remove_pages", pages, confidence: 0.95, explanation: `Last ${n} pages (pages ${startPage} to ${totalPages}) will be removed.` };
  }

  // "remove N pages from last" / "delete N pages from end" / "remove N pages from the end/bottom"
  const nFromLastMatch = lower.match(
    /(?:remove|delete|drop)\s+(\d+)\s+pages?\s+(?:from\s+(?:the\s+)?(?:last|end|bottom)|at\s+(?:the\s+)?(?:end|bottom))/
  );
  if (nFromLastMatch) {
    const n = parseInt(nFromLastMatch[1], 10);
    const startPage = Math.max(1, totalPages - n + 1);
    const pages = Array.from({ length: totalPages - startPage + 1 }, (_, i) => startPage + i);
    return { action: "remove_pages", pages, confidence: 0.95, explanation: `Last ${n} pages (pages ${startPage} to ${totalPages}) will be removed.` };
  }

  // "remove N pages from the beginning/top/start" / "delete N pages from front"
  const nFromFirstMatch = lower.match(
    /(?:remove|delete|drop)\s+(\d+)\s+pages?\s+(?:from\s+(?:the\s+)?(?:first|start|beginning|top|front)|at\s+(?:the\s+)?(?:start|beginning|top))/
  );
  if (nFromFirstMatch) {
    const n = parseInt(nFromFirstMatch[1], 10);
    const endPage = Math.min(n, totalPages);
    const pages = Array.from({ length: endPage }, (_, i) => i + 1);
    return { action: "remove_pages", pages, confidence: 0.95, explanation: `First ${n} pages (pages 1 to ${endPage}) will be removed.` };
  }

  // "remove first N pages" / "delete first N pages"
  const firstNMatch = lower.match(/(?:remove|delete|drop)\s+first\s+(\d+)\s+pages?/);
  if (firstNMatch) {
    const n = parseInt(firstNMatch[1], 10);
    const endPage = Math.min(n, totalPages);
    const pages = Array.from({ length: endPage }, (_, i) => i + 1);
    return { action: "remove_pages", pages, confidence: 0.95, explanation: `First ${n} pages (pages 1 to ${endPage}) will be removed.` };
  }

  // "remove pages N to M" / "delete pages N-M"
  const rangeRemoveMatch = lower.match(
    /(?:remove|delete|drop)\s+page(?:s)?\s*(\d+)\s*(?:to|-)\s*(\d+)/
  );
  if (rangeRemoveMatch) {
    const from = parseInt(rangeRemoveMatch[1], 10);
    const to = parseInt(rangeRemoveMatch[2], 10);
    return { action: "remove_pages", pageRange: { from, to }, confidence: 0.95, explanation: `Pages ${from} through ${to} will be removed.` };
  }

  // "remove pages N and M" (exactly 2 pages)
  const andRemoveMatch = lower.match(
    /(?:remove|delete|drop)\s+page(?:s)?\s*(\d+)\s+and\s+(\d+)/
  );
  if (andRemoveMatch) {
    const p1 = parseInt(andRemoveMatch[1], 10);
    const p2 = parseInt(andRemoveMatch[2], 10);
    return { action: "remove_pages", pages: [p1, p2], confidence: 0.95, explanation: `Pages ${p1} and ${p2} will be removed.` };
  }

  // "remove page N" / "delete pages N, M, K" (general list)
  if (/^(?:remove|delete|drop)\s+page/.test(lower)) {
    const pageStr = lower.replace(/^(?:remove|delete|drop)\s+pages?/, "").trim();
    const matches = pageStr.match(/\d+/g);
    if (matches && matches.length > 0) {
      const pages = matches.map((m) => parseInt(m, 10));
      return { action: "remove_pages", pages, confidence: 0.9, explanation: `Pages ${pages.join(", ")} will be removed.` };
    }
  }

  // "keep only pages N to M" → extract those pages
  const keepOnlyMatch = lower.match(
    /keep\s+(?:only\s+)?pages?\s+(\d+)\s*(?:to|-|through)\s*(\d+)/
  );
  if (keepOnlyMatch) {
    const from = parseInt(keepOnlyMatch[1], 10);
    const to = parseInt(keepOnlyMatch[2], 10);
    return { action: "extract_pages", pageRange: { from, to }, confidence: 0.9, explanation: `Only pages ${from} through ${to} will be kept (others removed).` };
  }

  // "keep only page N" → extract single page
  const keepSingleMatch = lower.match(/keep\s+(?:only\s+)?page\s+(\d+)/);
  if (keepSingleMatch) {
    const page = parseInt(keepSingleMatch[1], 10);
    return { action: "extract_pages", pages: [page], confidence: 0.9, explanation: `Only page ${page} will be kept.` };
  }

  // ─── EXTRACT PAGES ────────────────────────────────────────────────────────

  if (lower.includes("extract") || lower.includes("save pages") || lower.includes("get pages")) {
    // "extract pages N to M" / "extract pages N-M"
    const rangeMatch = lower.match(
      /(?:extract|save|get)\s+page(?:s)?\s*(\d+)\s*(?:to|-)\s*(\d+)/
    );
    if (rangeMatch) {
      const from = parseInt(rangeMatch[1], 10);
      const to = parseInt(rangeMatch[2], 10);
      return { action: "extract_pages", pageRange: { from, to }, confidence: 0.95, explanation: `Pages ${from} through ${to} will be extracted.` };
    }
    // "extract page N and M" or just numbers
    const numMatches = lower.match(/\d+/g);
    if (numMatches && numMatches.length > 0) {
      const pages = numMatches.map((m) => parseInt(m, 10));
      return { action: "extract_pages", pages, confidence: 0.85, explanation: `Pages ${pages.join(", ")} will be extracted.` };
    }
  }

  // ─── ROTATE PAGES ─────────────────────────────────────────────────────────

  if (lower.includes("rotate") || lower.includes("turn page") || lower.includes("flip page")) {
    const degreesMatch = lower.match(/(90|180|270)/);
    const rotationDegrees = degreesMatch
      ? (parseInt(degreesMatch[1], 10) as 90 | 180 | 270)
      : 90;
    // "clockwise" without degree → 90; "counter-clockwise" / "counterclockwise" → 270
    let finalDegrees = rotationDegrees;
    if (!degreesMatch) {
      if (lower.includes("counter") || lower.includes("ccw") || lower.includes("anti")) {
        finalDegrees = 270;
      } else if (lower.includes("upside down") || lower.includes("180")) {
        finalDegrees = 180;
      }
    }
    const pageMatch = lower.match(/page(?:s)?\s*(\d+)/);
    const allMatch = lower.includes("all page") || lower.includes("every page") || !pageMatch;
    if (pageMatch && !allMatch) {
      const pages = [parseInt(pageMatch[1], 10)];
      return { action: "rotate_pages", pages, rotationDegrees: finalDegrees, confidence: 0.9, explanation: `Page ${pages[0]} will be rotated by ${finalDegrees} degrees clockwise.` };
    }
    return { action: "rotate_pages", rotationDegrees: finalDegrees, confidence: 0.8, explanation: `All pages will be rotated by ${finalDegrees} degrees clockwise.` };
  }

  // ─── SPLIT PDF ────────────────────────────────────────────────────────────

  if (lower.includes("split") || lower.includes("divide") || lower.includes("cut pdf")) {
    const splitMatch = lower.match(/(?:split|divide|cut)\s+(?:after|at)?\s*page\s*(\d+)/);
    if (splitMatch) {
      const splitAfterPage = parseInt(splitMatch[1], 10);
      return { action: "split", splitAfterPage, confidence: 0.9, explanation: `PDF will be split after page ${splitAfterPage}.` };
    }
    // "split in half" → split at middle
    if (lower.includes("half") || lower.includes("middle")) {
      const splitAfterPage = Math.floor(totalPages / 2);
      return { action: "split", splitAfterPage, confidence: 0.8, explanation: `PDF will be split in half after page ${splitAfterPage}.` };
    }
  }

  // ─── MERGE ────────────────────────────────────────────────────────────────

  if (lower.includes("merge") || lower.includes("combine") || lower.includes("append") || lower.includes("join pdf")) {
    return { action: "merge", confidence: 0.9, explanation: "The PDFs will be merged together into a single document." };
  }

  // ─── COMPRESS ─────────────────────────────────────────────────────────────

  if (
    lower.includes("compress") ||
    lower.includes("reduce size") ||
    lower.includes("reduce file size") ||
    lower.includes("make smaller") ||
    lower.includes("shrink") ||
    lower.includes("optimize pdf") ||
    lower.includes("lower quality")
  ) {
    return { action: "compress", confidence: 0.95, explanation: "PDF file size will be reduced using medium quality compression." };
  }

  // ─── WATERMARK ────────────────────────────────────────────────────────────

  if (lower.includes("watermark") || lower.includes("stamp")) {
    const textMatch =
      command.match(/(?:watermark|stamp)\s+(?:that\s+says\s+|says\s+|with\s+(?:text\s+)?)?["']?([a-zA-Z0-9\s_-]+?)["']?(?:\s+on\s+|\s*$)/i) ||
      command.match(/add\s+(?:a\s+)?(?:watermark|stamp)\s+["']?([a-zA-Z0-9\s_-]+)["']?/i) ||
      command.match(/(?:watermark|stamp)\s+["']([^"']+)["']/i);
    const watermarkText = textMatch ? textMatch[1].trim() : "CONFIDENTIAL";
    return {
      action: "watermark",
      watermarkText,
      watermarkPosition: "center",
      watermarkOpacity: 0.3,
      confidence: 0.9,
      explanation: `Watermark "${watermarkText}" will be added to the center of all pages.`,
    };
  }

  // ─── ENCRYPT ──────────────────────────────────────────────────────────────

  if (lower.includes("encrypt") || lower.includes("protect") || (lower.includes("lock") && !lower.includes("unlock"))) {
    const pwMatch =
      command.match(/password[:\s]\s*([a-zA-Z0-9@#$!%^&*()_+\-=]+)/i) ||
      command.match(/encrypt\s+with\s+(?:password\s+)?([a-zA-Z0-9@#$!%^&*()_+\-=]+)/i) ||
      command.match(/lock\s+with\s+(?:password\s+)?([a-zA-Z0-9@#$!%^&*()_+\-=]+)/i) ||
      command.match(/password\s+is\s+([a-zA-Z0-9@#$!%^&*()_+\-=]+)/i) ||
      command.match(/set\s+password\s+(?:to\s+)?([a-zA-Z0-9@#$!%^&*()_+\-=]+)/i);
    if (pwMatch) {
      const password = pwMatch[1].trim();
      return { action: "encrypt", password, confidence: 0.95, explanation: `PDF will be encrypted and password-protected with the specified password.` };
    }
  }

  // ─── DECRYPT ──────────────────────────────────────────────────────────────

  if (lower.includes("decrypt") || lower.includes("unlock") || lower.includes("remove password") || lower.includes("unprotect")) {
    const pwMatch = command.match(/password[:\s]\s*([a-zA-Z0-9@#$!%^&*()_+\-=]+)/i);
    const password = pwMatch ? pwMatch[1].trim() : "";
    return { action: "decrypt", password: password || undefined, confidence: 0.9, explanation: "Password protection will be removed from the PDF." };
  }

  // ─── ADD PAGE NUMBERS ─────────────────────────────────────────────────────

  if (
    lower.includes("page number") ||
    lower.includes("add numbers") ||
    lower.includes("numbered pages") ||
    lower.includes("number the pages") ||
    lower.includes("insert page number")
  ) {
    return { action: "add_page_numbers", confidence: 0.95, explanation: "Page numbers will be added in 'Page X of Y' format at the bottom footer of all pages." };
  }

  // ─── CONVERT TO WORD ──────────────────────────────────────────────────────

  if (
    lower.includes("convert to word") ||
    lower.includes("pdf to docx") ||
    lower.includes("pdf to word") ||
    lower.includes("convert to docx") ||
    lower.includes("export to word") ||
    lower.includes("save as word")
  ) {
    return { action: "convert_to_word", confidence: 0.95, explanation: "PDF will be converted to editable Microsoft Word document (.docx)." };
  }

  // ─── DELETE BLANK PAGES ───────────────────────────────────────────────────

  if (
    lower.includes("delete blank") ||
    lower.includes("remove blank") ||
    lower.includes("delete all blank") ||
    lower.includes("clean empty") ||
    lower.includes("remove empty pages") ||
    lower.includes("delete empty pages")
  ) {
    return { action: "delete_blank_pages", confidence: 0.95, explanation: "All blank pages will be automatically detected and removed." };
  }

  // ─── RESIZE PAGES ─────────────────────────────────────────────────────────

  if (
    lower.includes("resize") ||
    lower.includes("scale to a4") ||
    lower.includes("make all pages a4") ||
    lower.includes("convert to a4") ||
    lower.includes("a4 format") ||
    lower.includes("fit to a4")
  ) {
    return { action: "resize_pages", confidence: 0.95, explanation: "All pages will be resized and scaled to fit standard A4 dimensions." };
  }

  // ─── REORDER PAGES ────────────────────────────────────────────────────────

  if (lower.includes("reorder") || lower.includes("rearrange") || lower.includes("move page") || lower.includes("swap page") || lower.includes("make page")) {
    // "move page N to position M" / "make page N the first page"
    const moveToFirstMatch = lower.match(/(?:make|move)\s+page\s+(\d+)\s+(?:the\s+)?first/);
    if (moveToFirstMatch) {
      const page = parseInt(moveToFirstMatch[1], 10);
      const rest = Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p !== page);
      return { action: "reorder_pages", reorderMap: [page, ...rest], confidence: 0.85, explanation: `Page ${page} will be moved to the first position.` };
    }
    // "move page N to the end / last"
    const moveToLastMatch = lower.match(/(?:move)\s+page\s+(\d+)\s+(?:to\s+(?:the\s+)?(?:end|last))/);
    if (moveToLastMatch) {
      const page = parseInt(moveToLastMatch[1], 10);
      const rest = Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p !== page);
      return { action: "reorder_pages", reorderMap: [...rest, page], confidence: 0.85, explanation: `Page ${page} will be moved to the last position.` };
    }
    // "reorder to [3, 1, 2]" or "rearrange to 3 1 2"
    const listMatch = lower.match(/(?:reorder|rearrange|order|to)\s+\[?([\d\s,]+)\]?/);
    if (listMatch) {
      const numbers = listMatch[1].match(/\d+/g);
      if (numbers && numbers.length > 0) {
        const reorderMap = numbers.map(n => parseInt(n, 10));
        return { action: "reorder_pages", reorderMap, confidence: 0.9, explanation: `Pages will be reordered to: ${reorderMap.join(", ")}.` };
      }
    }
  }

  return null;
}
