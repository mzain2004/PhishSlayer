import dns from "node:dns/promises";
import net from "node:net";

const PRIVATE_IPV4_RANGES: Array<[number, number]> = [
  [0x0a000000, 0x0affffff],
  [0xac100000, 0xac1fffff],
  [0xc0a80000, 0xc0a8ffff],
  [0x7f000000, 0x7fffffff],
  [0xa9fe0000, 0xa9feffff],
];

function ipv4ToInt(ip: string): number {
  return (
    ip
      .split(".")
      .map((octet) => parseInt(octet, 10))
      .reduce((acc, octet) => (acc << 8) + (octet & 0xff), 0) >>> 0
  );
}

export function isPrivateIp(address: string): boolean {
  const ipType = net.isIP(address);
  if (ipType === 4) {
    const value = ipv4ToInt(address);
    return PRIVATE_IPV4_RANGES.some(
      ([start, end]) => value >= start && value <= end,
    );
  }

  if (ipType === 6) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd")
    );
  }

  return false;
}

export async function ensurePublicHostname(hostname: string): Promise<void> {
  const records = await dns.lookup(hostname, { all: true });
  if (!records.length) {
    throw new Error("Hostname resolution failed");
  }

  const hasPrivate = records.some((record) => isPrivateIp(record.address));
  if (hasPrivate) {
    throw new Error("Private IP ranges are not allowed");
  }
}
