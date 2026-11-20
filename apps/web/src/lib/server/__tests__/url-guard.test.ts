import { isPrivateIp, isSyntacticallySafeUrl, validateSafeUrl } from "../url-guard";

async function runUrlGuardTests() {
  console.log("=========================================");
  console.log("    RUNNING SSRF URL GUARD TEST SUITE    ");
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

  // 1. Private IPv4 tests
  console.log("--- 1. Private & Loopback IPv4 Detection ---");
  assert(isPrivateIp("127.0.0.1"), "Detects 127.0.0.1 as private");
  assert(isPrivateIp("127.1.2.3"), "Detects 127.1.2.3 as private");
  assert(isPrivateIp("10.0.0.1"), "Detects 10.0.0.1 as private");
  assert(isPrivateIp("172.16.0.1"), "Detects 172.16.0.1 as private");
  assert(isPrivateIp("172.31.255.255"), "Detects 172.31.255.255 as private");
  assert(isPrivateIp("192.168.1.1"), "Detects 192.168.1.1 as private");
  assert(isPrivateIp("169.254.169.254"), "Detects AWS metadata 169.254.169.254 as private");
  assert(isPrivateIp("0.0.0.0"), "Detects 0.0.0.0 as private");
  assert(!isPrivateIp("8.8.8.8"), "Allows Google DNS 8.8.8.8 as public");
  assert(!isPrivateIp("1.1.1.1"), "Allows Cloudflare DNS 1.1.1.1 as public");

  // 2. Private IPv6 tests
  console.log("\n--- 2. Private & Loopback IPv6 Detection ---");
  assert(isPrivateIp("::1"), "Detects ::1 as private");
  assert(isPrivateIp("::"), "Detects :: as private");
  assert(isPrivateIp("fe80::1"), "Detects Link-local fe80::1 as private");
  assert(isPrivateIp("fc00::1"), "Detects ULA fc00::1 as private");
  assert(isPrivateIp("::ffff:127.0.0.1"), "Detects IPv4-mapped loopback as private");
  assert(isPrivateIp("::ffff:169.254.169.254"), "Detects IPv4-mapped metadata as private");
  assert(!isPrivateIp("2606:4700:4700::1111"), "Allows Cloudflare public IPv6");

  // 3. Syntax and Protocol checks
  console.log("\n--- 3. URL Syntax & Protocol Validation ---");
  assert(!isSyntacticallySafeUrl("file:///etc/passwd").valid, "Rejects file:// protocol");
  assert(!isSyntacticallySafeUrl("ftp://example.com/file").valid, "Rejects ftp:// protocol");
  assert(!isSyntacticallySafeUrl("gopher://example.com").valid, "Rejects gopher:// protocol");
  assert(!isSyntacticallySafeUrl("javascript:alert(1)").valid, "Rejects javascript: scheme");
  assert(!isSyntacticallySafeUrl("data:text/html,test").valid, "Rejects data: scheme");
  assert(!isSyntacticallySafeUrl("http://user:pass@example.com").valid, "Rejects embedded credentials");
  assert(!isSyntacticallySafeUrl("http://localhost:3000").valid, "Rejects localhost");
  assert(!isSyntacticallySafeUrl("http://service.internal/api").valid, "Rejects .internal domains");
  assert(!isSyntacticallySafeUrl("http://my-nas.local").valid, "Rejects .local domains");
  assert(!isSyntacticallySafeUrl("http://127.0.0.1:5000").valid, "Rejects direct 127.0.0.1 IP");
  assert(!isSyntacticallySafeUrl("http://169.254.169.254/latest/meta-data").valid, "Rejects AWS metadata IP");
  assert(isSyntacticallySafeUrl("https://example.com/page").valid, "Allows https://example.com/page");

  // 4. Asynchronous DNS Resolution checks
  console.log("\n--- 4. DNS Resolution Checks ---");
  const rLocal = await validateSafeUrl("http://localhost:8080");
  assert(!rLocal.valid, "validateSafeUrl blocks localhost");

  const rMeta = await validateSafeUrl("http://169.254.169.254/secret");
  assert(!rMeta.valid, "validateSafeUrl blocks metadata IP");

  const rBadProto = await validateSafeUrl("file:///C:/Windows/win.ini");
  assert(!rBadProto.valid, "validateSafeUrl blocks file:// scheme");

  console.log(`\n=========================================`);
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`=========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runUrlGuardTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

