import dns from "dns/promises";
import net from "net";

/**
 * Checks if an IPv4 address string falls into private, loopback, link-local,
 * carrier-grade NAT, or multicast ranges.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((n) => parseInt(n, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 is treated as unsafe
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network / "this" network)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private-Use Networks, RFC 1918)
  if (a === 10) return true;

  // 100.64.0.0/10 (Shared Address Space / Carrier-Grade NAT, RFC 6598: 100.64.0.0 - 100.127.255.255)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 127.0.0.0/8 (Loopback Addresses, RFC 1122)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-Local / Cloud Provider Metadata like AWS/GCP 169.254.169.254, RFC 3927)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private-Use Networks, RFC 1918: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments, RFC 6890)
  if (a === 192 && b === 0 && parts[2] === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1, RFC 5737)
  if (a === 192 && b === 0 && parts[2] === 2) return true;

  // 192.88.99.0/24 (6to4 Relay Anycast, RFC 3068)
  if (a === 192 && b === 88 && parts[2] === 99) return true;

  // 192.168.0.0/16 (Private-Use Networks, RFC 1918)
  if (a === 192 && b === 168) return true;

  // 198.18.0.0/15 (Network Interconnect Benchmark Testing, RFC 2544: 198.18.0.0 - 198.19.255.255)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 198.51.100.0/24 (TEST-NET-2, RFC 5737)
  if (a === 198 && b === 51 && parts[2] === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3, RFC 5737)
  if (a === 203 && b === 0 && parts[2] === 113) return true;

  // 224.0.0.0/4 (Multicast, RFC 5771: 224.0.0.0 - 239.255.255.255)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved for Future Use, RFC 1112)
  if (a >= 240) return true;

  return false;
}

/**
 * Checks if an IPv6 address string falls into private, loopback, link-local,
 * or mapped IPv4 ranges.
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim();

  // Loopback (::1) and Unspecified (::)
  if (normalized === "::1" || normalized === "::" || normalized === "0:0:0:0:0:0:0:1") {
    return true;
  }

  // IPv4-mapped IPv6 (::ffff:192.0.2.128 or ::ffff:c000:0280)
  if (normalized.startsWith("::ffff:")) {
    const rawIpv4 = normalized.replace("::ffff:", "");
    if (net.isIPv4(rawIpv4)) {
      return isPrivateIPv4(rawIpv4);
    }
    return true; // Unknown/malformed mapped IPv4
  }

  // Unique Local Addresses (fc00::/7 -> fc00:: to fdff::)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  // Link-Local Unicast (fe80::/10 -> fe80:: to febf::)
  if (/^fe[89ab]/.test(normalized)) {
    return true;
  }

  // Multicast (ff00::/8)
  if (normalized.startsWith("ff")) {
    return true;
  }

  // Documentation prefix (2001:db8::/32)
  if (normalized.startsWith("2001:db8:") || normalized.startsWith("2001:0db8:")) {
    return true;
  }

  return false;
}

/**
 * Universal IP private address check.
 */
export function isPrivateIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) {
    return isPrivateIPv4(ip);
  }
  if (family === 6) {
    return isPrivateIPv6(ip);
  }
  return true; // Not a valid IP format, treated as unsafe
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "ip6-localhost",
  "ip6-loopback",
  "metadata.google.internal",
  "instance-data",
]);

const BLOCKED_SUFFIXES = [
  ".local",
  ".internal",
  ".localhost",
  ".corp",
  ".lan",
  ".home",
  ".arpa",
  ".invalid",
  ".test",
  ".example",
];

export interface SafeUrlResult {
  valid: boolean;
  error?: string;
  url?: URL;
}

/**
 * Synchronous preliminary check for protocols, credentials, and obvious hostnames.
 */
export function isSyntacticallySafeUrl(urlString: string): SafeUrlResult {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, error: "Invalid URL format." };
  }

  // 1. Whitelist protocol: Only HTTP and HTTPS are permitted
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      valid: false,
      error: `Disallowed protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`,
    };
  }

  // 2. Disallow embedded credentials (http://user:pass@example.com)
  if (parsed.username || parsed.password) {
    return {
      valid: false,
      error: "URLs with embedded authentication credentials are not permitted.",
    };
  }

  // 3. Reject empty hostname
  const hostname = parsed.hostname.toLowerCase().trim();
  if (!hostname) {
    return { valid: false, error: "URL hostname cannot be empty." };
  }

  // 4. Reject dangerous specific hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return {
      valid: false,
      error: "Access to loopback, localhost, and cloud metadata is blocked.",
    };
  }

  // 5. Reject dangerous internal domain suffixes
  for (const suffix of BLOCKED_SUFFIXES) {
    if (hostname.endsWith(suffix)) {
      return {
        valid: false,
        error: `Access to internal domain suffix "${suffix}" is blocked.`,
      };
    }
  }

  // 6. Direct IP check (if hostname is already an IP address)
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      return {
        valid: false,
        error: `Access to private IP address "${hostname}" is blocked.`,
      };
    }
  }

  return { valid: true, url: parsed };
}

/**
 * Full asynchronous URL validation with DNS resolution check to prevent SSRF and DNS rebinding.
 */
export async function validateSafeUrl(urlString: string): Promise<SafeUrlResult> {
  const syncCheck = isSyntacticallySafeUrl(urlString);
  if (!syncCheck.valid || !syncCheck.url) {
    return syncCheck;
  }

  const hostname = syncCheck.url.hostname.toLowerCase().trim();

  // If already verified as a public IP address, resolution is not required
  if (net.isIP(hostname)) {
    return syncCheck;
  }

  try {
    // Resolve both IPv4 and IPv6 addresses for the hostname
    const addresses = await dns.lookup(hostname, { all: true });

    if (!addresses || addresses.length === 0) {
      return {
        valid: false,
        error: `Could not resolve hostname "${hostname}".`,
      };
    }

    // Ensure NONE of the resolved IP addresses are private, loopback, or metadata
    for (const record of addresses) {
      if (isPrivateIp(record.address)) {
        return {
          valid: false,
          error: `Hostname "${hostname}" resolved to a forbidden private/internal IP address (${record.address}).`,
        };
      }
    }

    return syncCheck;
  } catch (err: any) {
    return {
      valid: false,
      error: err?.message || `Failed to resolve hostname "${hostname}".`,
    };
  }
}

