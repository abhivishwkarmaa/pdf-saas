import {
  formatJson,
  encodeBase64,
  decodeBase64,
  encodeUrl,
  decodeUrl,
  generateHashes,
} from "../dev-tools";

async function runTests() {
  console.log("=========================================");
  console.log("   RUNNING DEVELOPER TOOLS TEST SUITE   ");
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

  // ─────────────────────────────────────────────────────────────
  // 1. JSON Formatter Tests
  // ─────────────────────────────────────────────────────────────
  console.log("--- 1. JSON Formatter Tests ---");

  // Edge case: empty string
  const r1 = formatJson("");
  assert(r1.success && r1.output === "", "Empty string returns empty output");

  // Valid object (2-space format)
  const r2 = formatJson('{"a":1,"b":"hello"}', { mode: "format-2" });
  assert(
    r2.success && r2.output === '{\n  "a": 1,\n  "b": "hello"\n}',
    "Valid object 2-space format"
  );

  // Minify mode
  const r3 = formatJson('{\n  "a": 1,\n  "b": "hello"\n}', { mode: "minify" });
  assert(r3.success && r3.output === '{"a":1,"b":"hello"}', "Minify mode");

  // Primitives
  const r4 = formatJson("12345");
  assert(r4.success && r4.output === "12345", "Primitive number formatting");

  // Unicode & Emojis
  const r5 = formatJson('{"emoji": "🚀", "city": "Tokyo 🗼"}');
  assert(
    r5.success && r5.output.includes("🚀") && r5.output.includes("Tokyo 🗼"),
    "Unicode and Emoji JSON formatting"
  );

  // Invalid JSON (trailing comma)
  const r6 = formatJson('{"a": 1,}');
  assert(!r6.success && Boolean(r6.error?.message), "Invalid JSON detected with error message");

  // ─────────────────────────────────────────────────────────────
  // 2. Base64 Encode Tests
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 2. Base64 Encode Tests ---");

  assert(encodeBase64("") === "", "Base64 encode empty string");

  assert(encodeBase64("Hello World") === "SGVsbG8gV29ybGQ=", "Base64 encode plain ASCII");

  // Emoji / UTF-8 multi-byte
  const b64Emoji = encodeBase64("Hello 🚀 World");
  assert(Boolean(b64Emoji), "Base64 encode string with emoji");

  // URL-safe Base64
  const b64UrlSafe = encodeBase64("Hello 🚀 World", { urlSafe: true });
  assert(
    !b64UrlSafe.includes("+") && !b64UrlSafe.includes("/") && !b64UrlSafe.includes("="),
    "URL-safe Base64 encoding strips +, /, ="
  );

  // Line wrap
  const longStr = "A".repeat(100);
  const wrapped = encodeBase64(longStr, { lineWrap: true });
  assert(wrapped.includes("\n"), "Line wrapping at 76 characters");

  // ─────────────────────────────────────────────────────────────
  // 3. Base64 Decode Tests
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 3. Base64 Decode Tests ---");

  const d1 = decodeBase64("");
  assert(d1.success && d1.output === "", "Base64 decode empty string");

  const d2 = decodeBase64("SGVsbG8gV29ybGQ=");
  assert(d2.success && d2.output === "Hello World", "Base64 decode plain ASCII");

  // UTF-8 Emoji decoding
  const d3 = decodeBase64(b64Emoji);
  assert(d3.success && d3.output === "Hello 🚀 World", "Base64 decode UTF-8 emoji string");

  // URL-safe Base64 decoding
  const d4 = decodeBase64(b64UrlSafe);
  assert(d4.success && d4.output === "Hello 🚀 World", "Base64 decode URL-safe string");

  // Multiline & whitespace Base64
  const d5 = decodeBase64("  SGVsbG8g\n  V29ybGQ=  ");
  assert(d5.success && d5.output === "Hello World", "Base64 decode multiline with whitespace");

  // Missing padding
  const d6 = decodeBase64("SGVsbG8gV29ybGQ");
  assert(d6.success && d6.output === "Hello World", "Base64 decode unpadded input");

  // Non-text Binary Base64 (PNG header)
  const binaryB64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const d7 = decodeBase64(binaryB64);
  assert(
    d7.success && Boolean(d7.isBinary) && d7.output.includes("HEX:"),
    "Base64 decode binary blob returns Hex without URIError crash"
  );

  // Invalid Base64 characters
  const d8 = decodeBase64("???InvalidBase64!!!");
  assert(!d8.success && Boolean(d8.error), "Base64 decode invalid string returns error");

  // ─────────────────────────────────────────────────────────────
  // 4. URL Encode Tests
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 4. URL Encode Tests ---");

  assert(encodeUrl("") === "", "URL encode empty string");

  assert(encodeUrl("hello world") === "hello%20world", "URL encode space to %20");

  assert(
    encodeUrl("hello world", { spaceAsPlus: true }) === "hello+world",
    "URL encode space to +"
  );

  assert(
    encodeUrl("https://example.com/path?a=1&b=2", { mode: "uri" }) ===
      "https://example.com/path?a=1&b=2",
    "URL encode mode URI preserves url structure"
  );

  assert(
    encodeUrl("https://example.com/tag/🚀") ===
      "https%3A%2F%2Fexample.com%2Ftag%2F%F0%9F%9A%80",
    "URL encode emoji component"
  );

  // ─────────────────────────────────────────────────────────────
  // 5. URL Decode Tests
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 5. URL Decode Tests ---");

  const ud1 = decodeUrl("");
  assert(ud1.success && ud1.output === "", "URL decode empty string");

  const ud2 = decodeUrl("hello%20world");
  assert(ud2.success && ud2.output === "hello world", "URL decode %20 to space");

  const ud3 = decodeUrl("hello+world", { plusAsSpace: true });
  assert(ud3.success && ud3.output === "hello world", "URL decode + to space when enabled");

  const ud4 = decodeUrl("%F0%9F%9A%80");
  assert(ud4.success && ud4.output === "🚀", "URL decode emoji %F0%9F%9A%80");

  // Malformed percent-encoding ("50% off", "%2")
  const ud5 = decodeUrl("50% off & 10%2 discount");
  assert(
    ud5.success && ud5.output.includes("50% off") && Boolean(ud5.error),
    "URL decode malformed percent sequence safely preserved without URIError crash"
  );

  // ─────────────────────────────────────────────────────────────
  // 6. Hash Generator Tests
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 6. Hash Generator Tests ---");

  // Empty string standard hashes
  const hEmpty = await generateHashes("");
  assert(
    hEmpty.md5 === "d41d8cd98f00b204e9800998ecf8427e",
    "MD5 hash of empty string matches standard RFC spec"
  );
  assert(
    hEmpty.sha256 ===
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "SHA-256 hash of empty string matches standard spec"
  );
  assert(
    hEmpty.sha1 === "da39a3ee5e6b4b0d3255bfef95601890afd80709",
    "SHA-1 hash of empty string matches standard spec"
  );

  // Known string: "The quick brown fox jumps over the lazy dog"
  const hFox = await generateHashes(
    "The quick brown fox jumps over the lazy dog"
  );
  assert(
    hFox.md5 === "9e107d9d372bb6826bd81d3542a419d6",
    "MD5 of quick brown fox"
  );
  assert(
    hFox.sha256 ===
      "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
    "SHA-256 of quick brown fox"
  );

  // Uppercase toggle
  const hUpper = await generateHashes("hello", { uppercase: true });
  assert(
    hUpper.md5 === hUpper.md5.toUpperCase() &&
      hUpper.sha256 === hUpper.sha256.toUpperCase(),
    "Uppercase hash output toggle"
  );

  console.log("\n=========================================");
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED   `);
  console.log("=========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

void runTests();
