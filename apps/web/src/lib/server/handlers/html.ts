import { existsSync } from "fs";
import { join } from "path";
import { run, exists } from "../exec";
import puppeteer, { Browser } from "puppeteer-core";

/**
 * CONVERSION PIPELINE DOCUMENTATION
 * 
 * HTML Input / URL
 *   ↓
 * Headless Chrome / Edge (Blink Engine)
 *   ↓ [Loads fonts, executes CSS layouts & renders scripts]
 * CSS & JavaScript Execution
 *   ↓ [Awaits networkidle0 to ensure all dynamic images, scripts, & assets load]
 * Chrome Print-to-PDF Engine
 *   ↓ [Applies orientation, layout settings, backgrounds, & margin configurations]
 * Final PDF Output
 * 
 * Similarity to Modern PDF SaaS platforms (e.g., iLovePDF):
 * Platforms like iLovePDF run enterprise-grade Chromium browsers in headless pools 
 * on their servers to capture HTML and URLs. This approach ensures 100% layout fidelity,
 * support for modern CSS features (Flexbox, Grid), custom fonts, and web assets by using
 * the same engine that users use to browse the web daily.
 */

interface HtmlToPdfOptions {
  pageSize?: "A4" | "Letter";
  orientation?: "portrait" | "landscape";
  margin?: "default" | "none" | "minimum";
}

let cachedBrowser: Browser | null = null;

async function getBrowser(browserPath: string): Promise<Browser> {
  if (cachedBrowser) {
    try {
      // Verify browser instance is responsive
      await cachedBrowser.version();
      return cachedBrowser;
    } catch {
      try {
        await cachedBrowser.close();
      } catch {}
      cachedBrowser = null;
    }
  }

  cachedBrowser = await puppeteer.launch({
    executablePath: browserPath,
    args: [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ]
  });

  return cachedBrowser;
}

export async function htmlToPdf(
  html: string,
  url?: string,
  options: HtmlToPdfOptions = {}
): Promise<Buffer> {
  const isWin = process.platform === "win32";
  let browserPath: string | null = null;

  if (isWin) {
    const localAppData = process.env.LOCALAPPDATA || "";
    const programFiles = process.env.ProgramFiles || "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";

    const browsers = [
      join(programFilesX86, "Microsoft\\Edge\\Application\\msedge.exe"),
      join(programFiles, "Microsoft\\Edge\\Application\\msedge.exe"),
      join(programFiles, "Google\\Chrome\\Application\\chrome.exe"),
      join(programFilesX86, "Google\\Chrome\\Application\\chrome.exe"),
      join(localAppData, "Microsoft\\Edge\\Application\\msedge.exe"),
      join(localAppData, "Google\\Chrome\\Application\\chrome.exe"),
    ];
    
    for (const p of browsers) {
      if (existsSync(p)) {
        browserPath = p;
        break;
      }
    }
  } else {
    // Check if running in WSL
    const isWSL = existsSync("/mnt/c");
    const linuxBrowsers = [
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/google-chrome",
      "/usr/bin/chrome",
      "chromium-browser",
      "chromium",
      "google-chrome-stable",
      "google-chrome",
      "chrome"
    ];
    
    if (isWSL) {
      linuxBrowsers.unshift(
        "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        "/mnt/c/Program Files/Microsoft/Edge/Application/msedge.exe",
        "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
        "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"
      );
    }

    for (const cmd of linuxBrowsers) {
      const isPath = cmd.startsWith("/");
      const ok = isPath ? existsSync(cmd) : await exists(cmd);
      if (ok) {
        browserPath = cmd;
        break;
      }
    }
  }

  // Fallback to LibreOffice ONLY for HTML files (if Edge/Chrome is unavailable)
  if (!browserPath) {
    if (!url && (await exists("soffice"))) {
      const { mkdtemp, writeFile, readFile, rm } = require("fs/promises");
      const { tmpdir } = require("os");
      const dir = await mkdtemp(join(tmpdir(), "html-"));
      const input = join(dir, "input.html");
      try {
        await writeFile(input, html);
        await run(
          "soffice",
          [
            "--headless",
            "--norestore",
            "--nofirststartwizard",
            `-env:UserInstallation=file://${join(dir, "profile").replace(/\\/g, "/")}`,
            "--convert-to",
            "pdf",
            "--outdir",
            dir,
            input,
          ],
          dir
        );
        return await readFile(join(dir, "input.pdf"));
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }
    throw new Error(
      "No browser or conversion tool (like Edge, Chrome, or LibreOffice) found to generate PDF."
    );
  }

  const browser = await getBrowser(browserPath);
  const page = await browser.newPage();

  try {
    if (url) {
      await page.goto(url, {
        waitUntil: "networkidle0",
        timeout: 60000,
      });
    } else {
      await page.setContent(html, {
        waitUntil: "load",
        timeout: 60000,
      });
    }

    const marginOption = options.margin || "default";
    let margin = { top: "1cm", bottom: "1cm", left: "1cm", right: "1cm" };
    if (marginOption === "none") {
      margin = { top: "0", bottom: "0", left: "0", right: "0" };
    } else if (marginOption === "minimum") {
      margin = { top: "10px", bottom: "10px", left: "10px", right: "10px" };
    }

    const pdfBuffer = await page.pdf({
      format: (options.pageSize || "A4") as any,
      landscape: options.orientation === "landscape",
      printBackground: true,
      margin,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    // Proper page cleanup to prevent memory leaks
    await page.close();
  }
}

/**
 * Renders raw Markdown text into a fully styled HTML document.
 */
export function renderMarkdownToHtml(markdownText: string, title = "Document"): string {
  const lines = markdownText.split(/\r?\n/);
  let htmlBody = "";
  let inCodeBlock = false;
  let inList = false;
  let listType: "ul" | "ol" | null = null;
  let inTable = false;

  function formatInline(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/_([^_]+)_/g, "<em>$1</em>")
      .replace(/~~([^~]+)~~/g, "<del>$1</del>")
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;" />')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced Code Blocks (```)
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        htmlBody += "</code></pre>\n";
        inCodeBlock = false;
      } else {
        if (inList) {
          htmlBody += listType === "ul" ? "</ul>\n" : "</ol>\n";
          inList = false;
          listType = null;
        }
        if (inTable) {
          htmlBody += "</tbody></table>\n";
          inTable = false;
        }
        const lang = line.trim().slice(3).trim();
        htmlBody += `<pre><code class="${lang ? "language-" + lang : ""}">`;
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      htmlBody += line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "\n";
      continue;
    }

    const trimmed = line.trim();

    // Table rows
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (inList) {
        htmlBody += listType === "ul" ? "</ul>\n" : "</ol>\n";
        inList = false;
        listType = null;
      }

      // Check if divider line like |---|---|
      if (/^\|[\s-:]+(\|[\s-:]+)+\|$/.test(trimmed)) {
        continue;
      }

      const cells = trimmed.slice(1, -1).split("|").map((c) => c.trim());
      if (!inTable) {
        htmlBody += "<table><thead><tr>";
        cells.forEach((cell) => {
          htmlBody += `<th>${formatInline(cell)}</th>`;
        });
        htmlBody += "</tr></thead><tbody>\n";
        inTable = true;
      } else {
        htmlBody += "<tr>";
        cells.forEach((cell) => {
          htmlBody += `<td>${formatInline(cell)}</td>`;
        });
        htmlBody += "</tr>\n";
      }
      continue;
    } else if (inTable) {
      htmlBody += "</tbody></table>\n";
      inTable = false;
    }

    if (!trimmed) {
      if (inList) {
        htmlBody += listType === "ul" ? "</ul>\n" : "</ol>\n";
        inList = false;
        listType = null;
      }
      continue;
    }

    // Headings
    if (trimmed.startsWith("#")) {
      if (inList) {
        htmlBody += listType === "ul" ? "</ul>\n" : "</ol>\n";
        inList = false;
        listType = null;
      }
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        htmlBody += `<h${level}>${formatInline(text)}</h${level}>\n`;
        continue;
      }
    }

    // Horizontal Rules
    if (/^---$|^\*\*\*$|^___$/.test(trimmed)) {
      if (inList) {
        htmlBody += listType === "ul" ? "</ul>\n" : "</ol>\n";
        inList = false;
        listType = null;
      }
      htmlBody += "<hr />\n";
      continue;
    }

    // Blockquotes
    if (trimmed.startsWith(">")) {
      if (inList) {
        htmlBody += listType === "ul" ? "</ul>\n" : "</ol>\n";
        inList = false;
        listType = null;
      }
      const text = trimmed.replace(/^>\s*/, "");
      htmlBody += `<blockquote><p>${formatInline(text)}</p></blockquote>\n`;
      continue;
    }

    // Unordered Lists
    if (/^[-*+]\s+/.test(trimmed)) {
      if (!inList || listType !== "ul") {
        if (inList) htmlBody += listType === "ul" ? "</ul>\n" : "</ol>\n";
        htmlBody += "<ul>\n";
        inList = true;
        listType = "ul";
      }
      const itemText = trimmed.replace(/^[-*+]\s+/, "");
      htmlBody += `  <li>${formatInline(itemText)}</li>\n`;
      continue;
    }

    // Ordered Lists
    if (/^\d+\.\s+/.test(trimmed)) {
      if (!inList || listType !== "ol") {
        if (inList) htmlBody += listType === "ul" ? "</ul>\n" : "</ol>\n";
        htmlBody += "<ol>\n";
        inList = true;
        listType = "ol";
      }
      const itemText = trimmed.replace(/^\d+\.\s+/, "");
      htmlBody += `  <li>${formatInline(itemText)}</li>\n`;
      continue;
    }

    // Paragraph
    if (inList) {
      htmlBody += listType === "ul" ? "</ul>\n" : "</ol>\n";
      inList = false;
      listType = null;
    }
    htmlBody += `<p>${formatInline(trimmed)}</p>\n`;
  }

  if (inCodeBlock) htmlBody += "</code></pre>\n";
  if (inList) htmlBody += listType === "ul" ? "</ul>\n" : "</ol>\n";
  if (inTable) htmlBody += "</tbody></table>\n";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 800px;
      margin: 0 auto;
      padding: 30px 20px;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #111827;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 700;
      line-height: 1.25;
    }
    h1 { font-size: 2em; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #f3f4f6; padding-bottom: 0.2em; }
    h3 { font-size: 1.25em; }
    p { margin-top: 0; margin-bottom: 1em; }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background-color: #f3f4f6;
      padding: 0.2em 0.4em;
      border-radius: 4px;
      font-size: 0.875em;
    }
    pre {
      background-color: #1f2937;
      color: #f9fafb;
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1em 0;
    }
    pre code {
      background-color: transparent;
      padding: 0;
      color: inherit;
    }
    blockquote {
      border-left: 4px solid #3b82f6;
      padding-left: 1rem;
      margin: 1em 0;
      color: #4b5563;
      background: #f8fafc;
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;
    }
    ul, ol { padding-left: 2rem; margin-bottom: 1em; }
    li { margin-bottom: 0.3em; }
    hr { border: 0; height: 1px; background: #e5e7eb; margin: 2em 0; }
    a { color: #2563eb; text-decoration: underline; }
    table { width: 100%; border-collapse: collapse; margin: 1em 0; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
    th { background: #f9fafb; font-weight: 600; }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>`;
}

export async function markdownToPdf(
  markdownBuffer: Buffer,
  originalFileName?: string
): Promise<Buffer> {
  const mdText = markdownBuffer.toString("utf-8");
  const title = originalFileName ? originalFileName.replace(/\.[^/.]+$/, "") : "Document";
  const html = renderMarkdownToHtml(mdText, title);
  return htmlToPdf(html);
}
