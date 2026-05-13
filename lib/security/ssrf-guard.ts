/**
 * Server-side SSRF guard.
 *
 * Refuses to issue requests to private, loopback, link-local, or
 * cloud-metadata addresses. Resolves the hostname through DNS so a
 * user-supplied public domain cannot redirect us to RFC1918 / 169.254.169.254.
 *
 * Call assertExternalHost(url) BEFORE every fetch that targets a URL
 * influenced by user input. Pair with `redirect: "manual"` on the fetch
 * so a 302 cannot bypass the pre-flight check.
 */

import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

export class SsrfBlockedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "SsrfBlockedError";
  }
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) + v;
  }
  return n >>> 0;
}

export function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return false;
  if ((n & 0xff000000) === 0x0a000000) return true; // 10.0.0.0/8
  if ((n & 0xff000000) === 0x7f000000) return true; // 127.0.0.0/8
  if ((n & 0xffff0000) === 0xa9fe0000) return true; // 169.254.0.0/16
  if ((n & 0xfff00000) === 0xac100000) return true; // 172.16.0.0/12
  if ((n & 0xffff0000) === 0xc0a80000) return true; // 192.168.0.0/16
  if ((n & 0xff000000) === 0x00000000) return true; // 0.0.0.0/8
  if ((n & 0xff000000) === 0xe0000000) return true; // 224.0.0.0/4 multicast
  return false;
}

export function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA fc00::/7
  if (
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb")
  ) {
    return true; // link-local fe80::/10
  }
  if (lower.startsWith("::ffff:")) {
    return isPrivateIPv4(lower.slice("::ffff:".length));
  }
  return false;
}

export async function assertExternalHost(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedError("invalid_url");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new SsrfBlockedError("invalid_protocol");
  }
  const host = parsed.hostname;
  if (!host || host === "localhost") throw new SsrfBlockedError("internal_host");

  const ipVersion = isIP(host);
  if (ipVersion === 4) {
    if (isPrivateIPv4(host)) throw new SsrfBlockedError("internal_host");
    return;
  }
  if (ipVersion === 6) {
    if (isPrivateIPv6(host)) throw new SsrfBlockedError("internal_host");
    return;
  }

  const records = await dnsLookup(host, { all: true });
  for (const r of records) {
    if (r.family === 4 && isPrivateIPv4(r.address))
      throw new SsrfBlockedError("internal_host");
    if (r.family === 6 && isPrivateIPv6(r.address))
      throw new SsrfBlockedError("internal_host");
  }
}

/**
 * Wraps fetch with the SSRF pre-flight check and disables automatic redirects
 * (so a 302 cannot bypass the DNS check). Throws SsrfBlockedError on internal
 * hosts; all other failures behave like a normal fetch reject.
 */
export async function safeFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  await assertExternalHost(url);
  return fetch(url, { ...init, redirect: "manual" });
}
