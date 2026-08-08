import {
  validateFileSecurity,
  isDangerousExtension,
  verifyMagicBytes,
} from "../file-security";

async function runSecurityTests() {
  console.log("=========================================");
  console.log("    RUNNING FILE SECURITY TEST SUITE    ");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${detail ? `: ${detail}` : ""}`);
      failed++;
    }
  }

  // 1. Dangerous Extension Tests
  console.log("--- 1. Executable & Script Extension Rejection ---");
  assert(isDangerousExtension("malware.exe"), "Rejects .exe file extension");
  assert(isDangerousExtension("script.js"), "Rejects .js file extension");
  assert(isDangerousExtension("payload.bat"), "Rejects .bat file extension");
  assert(isDangerousExtension("cmd.cmd"), "Rejects .cmd file extension");
  assert(isDangerousExtension("bash.sh"), "Rejects .sh file extension");
  assert(isDangerousExtension("virus.vbs"), "Rejects .vbs file extension");
  assert(isDangerousExtension("powershell.ps1"), "Rejects .ps1 file extension");
  assert(isDangerousExtension("installer.msi"), "Rejects .msi file extension");
  assert(isDangerousExtension("backdoor.dll"), "Rejects .dll file extension");
  assert(!isDangerousExtension("document.pdf"), "Allows .pdf file extension");
  assert(!isDangerousExtension("photo.jpg"), "Allows .jpg file extension");

  // 2. Magic Byte Executable Spoofing Tests
  console.log("\n--- 2. Magic Byte Spoofing Rejection ---");

  // Fake PDF that starts with 'MZ' (Windows executable binary)
  const exeSpoofedAsPdf = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
  const r1 = verifyMagicBytes(new Uint8Array(exeSpoofedAsPdf), "fake_doc.pdf");
  assert(!r1.valid && Boolean(r1.error?.includes("Executable")), "Rejects .exe binary disguised as fake_doc.pdf");

  // Fake JPG that starts with '\x7F ELF' (Linux binary)
  const elfSpoofedAsJpg = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01]);
  const r2 = verifyMagicBytes(new Uint8Array(elfSpoofedAsJpg), "fake_photo.jpg");
  assert(!r2.valid && Boolean(r2.error?.includes("Executable")), "Rejects Linux ELF binary disguised as fake_photo.jpg");

  // Corrupt fake PDF file (doesn't start with %PDF-)
  const corruptPdf = Buffer.from("THIS IS RANDOM CORRUPTED DATA NOT A PDF");
  const r3 = verifyMagicBytes(new Uint8Array(corruptPdf), "corrupt.pdf");
  assert(!r3.valid && Boolean(r3.error?.includes("PDF")), "Rejects corrupted PDF file missing %PDF- header");

  // Corrupt fake PNG file
  const corruptPng = Buffer.from("NOT A PNG IMAGE DATA");
  const r4 = verifyMagicBytes(new Uint8Array(corruptPng), "corrupt.png");
  assert(!r4.valid && Boolean(r4.error?.includes("PNG")), "Rejects corrupted PNG file missing PNG header");

  // 3. Valid Magic Byte Tests
  console.log("\n--- 3. Valid File Magic Header Verification ---");

  // Valid PDF magic header
  const validPdfHeader = Buffer.from("%PDF-1.7 valid pdf header data");
  const r5 = verifyMagicBytes(new Uint8Array(validPdfHeader), "sample.pdf");
  assert(Boolean(r5.valid), "Valid PDF magic bytes verified successfully");

  // Valid PNG magic header
  const validPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const r6 = verifyMagicBytes(new Uint8Array(validPngHeader), "sample.png");
  assert(Boolean(r6.valid), "Valid PNG magic bytes verified successfully");

  // Valid JPG magic header
  const validJpgHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  const r7 = verifyMagicBytes(new Uint8Array(validJpgHeader), "sample.jpg");
  assert(Boolean(r7.valid), "Valid JPEG magic bytes verified successfully");

  // 4. Empty File Rejection Tests
  console.log("\n--- 4. Empty (0-Byte) File Rejection ---");

  const emptyBuf = Buffer.from([]);
  const r8 = await validateFileSecurity(emptyBuf, "empty.pdf", [".pdf"]);
  assert(!r8.valid && Boolean(r8.error?.includes("empty")), "Rejects 0-byte empty file");

  // 5. Full Validation Integration Tests
  console.log("\n--- 5. Full Security Pipeline Tests ---");

  const exeFile = await validateFileSecurity(Buffer.from([0x4d, 0x5a]), "malware.exe");
  assert(!exeFile.valid, "Pipeline blocks malware.exe");

  const jsFile = await validateFileSecurity(Buffer.from("alert(1)"), "script.js");
  assert(!jsFile.valid, "Pipeline blocks script.js");

  const batFile = await validateFileSecurity(Buffer.from("echo hello"), "payload.bat");
  assert(!batFile.valid, "Pipeline blocks payload.bat");

  // 6. Markdown & All Tool Accept List Verification
  console.log("\n--- 6. All Tool Accept List Verification ---");
  const mdBuf = Buffer.from("# Hello World\nThis is markdown text.");
  const mdRes = await validateFileSecurity(mdBuf, "notes.md", ["text/markdown", "text/plain"]);
  assert(mdRes.valid, "Allows .md file with ['text/markdown', 'text/plain'] accept list");

  const markdownExtRes = await validateFileSecurity(mdBuf, "document.markdown", [".md", ".markdown", "text/markdown"]);
  assert(markdownExtRes.valid, "Allows .markdown file with explicit extension accept list");

  // Valid Zip magic for DOCX/XLSX/PPTX/EPUB
  const zipMagicBuf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);
  
  const docxRes = await validateFileSecurity(zipMagicBuf, "report.docx", [".docx", ".doc", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
  assert(docxRes.valid, "Allows .docx file for Word to PDF tool");

  const xlsxRes = await validateFileSecurity(zipMagicBuf, "sheet.xlsx", [".xlsx", ".xls", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
  assert(xlsxRes.valid, "Allows .xlsx file for Excel to PDF tool");

  const pptxRes = await validateFileSecurity(zipMagicBuf, "slides.pptx", [".pptx", ".ppt", "application/vnd.openxmlformats-officedocument.presentationml.presentation"]);
  assert(pptxRes.valid, "Allows .pptx file for PowerPoint to PDF tool");

  const epubRes = await validateFileSecurity(zipMagicBuf, "book.epub", [".epub", "application/epub+zip"]);
  assert(epubRes.valid, "Allows .epub file for EPUB to PDF tool");

  const jpgMagicBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const jpgRes = await validateFileSecurity(jpgMagicBuf, "photo.jpg", [".jpg", ".jpeg", "image/jpeg", "image/jpg"]);
  assert(jpgRes.valid, "Allows .jpg file for JPG to PDF / Image tools");

  const pngMagicBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const pngRes = await validateFileSecurity(pngMagicBuf, "graphic.png", [".png", "image/png"]);
  assert(pngRes.valid, "Allows .png file for PNG tools");

  const htmlBuf = Buffer.from("<!DOCTYPE html><html><body><h1>Test</h1></body></html>");
  const htmlRes = await validateFileSecurity(htmlBuf, "page.html", [".html", ".htm", "text/html"]);
  assert(htmlRes.valid, "Allows .html file for HTML to PDF tool");

  console.log("\n=========================================");
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED   `);
  console.log("=========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

void runSecurityTests();
