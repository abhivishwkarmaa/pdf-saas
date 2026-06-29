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
        await run("soffice", ["--headless", "--convert-to", "pdf", "--outdir", dir, input], dir);
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
