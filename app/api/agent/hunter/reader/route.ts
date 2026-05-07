import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RawIoc = {
  type: string;
  value: string;
  threat: string | null;
  source: "urlhaus" | "threatfox" | "openphish";
  tags: string[];
  malware: string | null;
  date: string | null;
  raw_data: unknown;
};

function getAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function getCycleId(request: NextRequest): string | null {
  const value = request.headers.get("x-l3-cycle-id");
  return value && value.trim().length > 0 ? value.trim() : null;
}

function getOrganizationId(request: NextRequest): string | null {
  const value = request.nextUrl.searchParams.get("organization_id");
  if (!value || value.trim().length === 0) {
    return null;
  }

  const parsed = z.string().uuid().safeParse(value.trim());
  return parsed.success ? parsed.data : null;
}

function ensureStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);
}

function parseCsvQuotedRow(row: string): string[] {
  const trimmed = row.trim();
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) {
    return [];
  }

  return trimmed
    .slice(1, -1)
    .split('","')
    .map((value) => value.trim());
}

function parseCsvLooseQuotedRow(row: string): string[] {
  return row
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((value) => value.trim().replace(/^"|"$/g, ""));
}

async function fetchUrlhausCsvFallback(): Promise<RawIoc[]> {
  const url = "https://urlhaus.abuse.ch/downloads/csv_recent/";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(
      url,
      {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`URLhaus CSV request failed (${response.status})`);
    }

    const text = await response.text();
    const rows = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    const parsed: RawIoc[] = [];

    for (const row of rows) {
      const columns = parseCsvQuotedRow(row);
      if (columns.length < 7) {
        continue;
      }

      const iocValue = columns[2];
      if (!iocValue) {
        continue;
      }

      parsed.push({
        type: "url",
        value: iocValue,
        threat: columns[5] || null,
        source: "urlhaus",
        tags: columns[6]
          ? columns[6]
              .split(",")
              .map((value) => value.trim())
              .filter((value) => value.length > 0)
          : [],
        malware: null,
        date: columns[1] || null,
        raw_data: {
          row,
          source: "csv_recent",
        },
      });
    }

    return parsed.slice(0, 25);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`External API call timed out after 15 seconds: ${url}`);
    }
    throw error;
  }
}

async function fetchUrlhaus(): Promise<RawIoc[]> {
  const url = "https://urlhaus-api.abuse.ch/v1/urls/recent/limit/25/";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(
      url,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      return fetchUrlhausCsvFallback();
    }

    let payload: {
      urls?: Array<{
        url?: string;
        threat?: string;
        tags?: unknown;
        date_added?: string;
      }>;
    };

    try {
      payload = (await response.json()) as {
        urls?: Array<{
          url?: string;
          threat?: string;
          tags?: unknown;
          date_added?: string;
        }>;
      };
    } catch {
      return fetchUrlhausCsvFallback();
    }

    const rows = payload.urls || [];

    if (rows.length === 0) {
      return fetchUrlhausCsvFallback();
    }

    return rows
      .filter((row) => typeof row.url === "string" && row.url.trim().length > 0)
      .map((row) => ({
        type: "url",
        value: row.url!.trim(),
        threat: typeof row.threat === "string" ? row.threat : null,
        source: "urlhaus",
        tags: ensureStringArray(row.tags),
        malware: null,
        date: typeof row.date_added === "string" ? row.date_added : null,
        raw_data: row,
      }));
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`External API call timed out after 15 seconds: ${url}, falling back to CSV`);
      return fetchUrlhausCsvFallback();
    }
    return fetchUrlhausCsvFallback();
  }
}

async function fetchThreatFox(): Promise<RawIoc[]> {
  const url = "https://threatfox-api.abuse.ch/api/v1/";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "get_iocs", days: 1 }),
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return fetchThreatFoxCsvFallback();
    }

    let payload: {
      data?: Array<{
        ioc_value?: string;
        ioc_type?: string;
        threat_type?: string;
        malware?: string;
        tags?: unknown;
        first_seen?: string;
        last_seen?: string;
      }>;
    };

    try {
      payload = (await response.json()) as {
        data?: Array<{
          ioc_value?: string;
          ioc_type?: string;
          threat_type?: string;
          malware?: string;
          tags?: unknown;
          first_seen?: string;
          last_seen?: string;
        }>;
      };
    } catch {
      return fetchThreatFoxCsvFallback();
    }

    const rows = payload.data || [];

    if (rows.length === 0) {
      return fetchThreatFoxCsvFallback();
    }

    return rows
      .filter(
        (row) =>
          typeof row.ioc_value === "string" && row.ioc_value.trim().length > 0,
      )
      .map((row) => ({
        type: typeof row.ioc_type === "string" ? row.ioc_type : "unknown",
        value: row.ioc_value!.trim(),
        threat: typeof row.threat_type === "string" ? row.threat_type : null,
        source: "threatfox",
        tags: ensureStringArray(row.tags),
        malware: typeof row.malware === "string" ? row.malware : null,
        date:
          typeof row.last_seen === "string"
            ? row.last_seen
            : typeof row.first_seen === "string"
              ? row.first_seen
              : null,
        raw_data: row,
      }));
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`External API call timed out after 15 seconds: ${url}, falling back to CSV`);
      return fetchThreatFoxCsvFallback();
    }
    return fetchThreatFoxCsvFallback();
  }
}

async function fetchThreatFoxCsvFallback(): Promise<RawIoc[]> {
  const url = "https://threatfox.abuse.ch/export/csv/recent/";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(
      url,
      {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`ThreatFox CSV request failed (${response.status})`);
    }

    const text = await response.text();
    const rows = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    const parsed: RawIoc[] = [];

    for (const row of rows) {
      const columns = parseCsvLooseQuotedRow(row);
      if (columns.length < 15) {
        continue;
      }

      const iocValue = columns[2];
      if (!iocValue) {
        continue;
      }

      const tags = columns[12]
        ? columns[12]
            .split(",")
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
        : [];

      parsed.push({
        type: columns[3] || "unknown",
        value: iocValue,
        threat: columns[4] || null,
        source: "threatfox",
        tags,
        malware: columns[7] || null,
        date: columns[8] || columns[0] || null,
        raw_data: {
          row,
          source: "csv_recent",
        },
      });
    }

    return parsed.slice(0, 200);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`External API call timed out after 15 seconds: ${url}`);
    }
    throw error;
  }
}

async function fetchOpenPhish(): Promise<RawIoc[]> {
  const url = "https://openphish.com/feed.txt";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OpenPhish request failed (${response.status})`);
    }

    const text = await response.text();
    const urls = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, 25);

    return urls.map((url) => ({
      type: "url",
      value: url,
      threat: "phishing",
      source: "openphish",
      tags: ["phishing"],
      malware: null,
      date: null,
      raw_data: { url },
    }));
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`External API call timed out after 15 seconds: ${url}`);
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  const isCronAuthorized =
    Boolean(process.env.CRON_SECRET) &&
    request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;

  if (!userId && !isCronAuthorized) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const adminClient = getAdminClient();
  const cycleId = getCycleId(request);
  const organizationId = getOrganizationId(request);

  const settled = await Promise.allSettled([
    fetchUrlhaus(),
    fetchThreatFox(),
    fetchOpenPhish(),
  ]);

  const labels: Array<"urlhaus" | "threatfox" | "openphish"> = [
    "urlhaus",
    "threatfox",
    "openphish",
  ];

  const bySource = {
    urlhaus: 0,
    threatfox: 0,
    openphish: 0,
  };

  const allIocs: RawIoc[] = [];

  for (let i = 0; i < settled.length; i += 1) {
    const result = settled[i];
    const source = labels[i];

    if (result.status === "fulfilled") {
      const feedIocs = result.value;
      bySource[source] = feedIocs.length;
      allIocs.push(...feedIocs);

      await adminClient.from("audit_logs").insert({
        action: "L3_INTEL_INGESTED",
        severity: "low",
        organization_id: organizationId,
        metadata: {
          cycle_id: cycleId,
          organization_id: organizationId,
          source,
          status: "success",
          fetched: feedIocs.length,
        },
      });
    } else {
      await adminClient.from("audit_logs").insert({
        action: "L3_INTEL_INGESTED",
        severity: "medium",
        organization_id: organizationId,
        metadata: {
          cycle_id: cycleId,
          organization_id: organizationId,
          source,
          status: "failure",
          error: String(result.reason),
        },
      });

      await adminClient.from("audit_logs").insert({
        action: "L3_STAGE_FAILURE",
        severity: "medium",
        organization_id: organizationId,
        metadata: {
          stage: "reader",
          cycle_id: cycleId,
          organization_id: organizationId,
          source,
          error: String(result.reason),
        },
        created_at: new Date().toISOString(),
      });
    }
  }

  const dedupedMap = new Map<string, RawIoc>();
  for (const ioc of allIocs) {
    const key = ioc.value.trim().toLowerCase();
    if (!key) {
      continue;
    }
    if (!dedupedMap.has(key)) {
      dedupedMap.set(key, ioc);
    }
  }

  const dedupedIocs = Array.from(dedupedMap.values());
  const upsertRows = dedupedIocs.map((ioc) => ({
    ioc_type: ioc.type,
    ioc_value: ioc.value,
    threat_type: ioc.threat,
    source: ioc.source,
    tags: ioc.tags,
    malware: ioc.malware,
    raw_data: ioc.raw_data,
    ingested_at: ioc.date ? ioc.date : new Date().toISOString(),
    hunted: false,
  }));

  let inserted = 0;

  if (upsertRows.length > 0) {
    const { data, error } = await adminClient
      .from("threat_intel")
      .upsert(upsertRows, { onConflict: "ioc_value" })
      .select("id");

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "INTERNAL_SERVER_ERROR",
        },
        { status: 500 },
      );
    }

    inserted = data?.length || 0;
  }

  return NextResponse.json({
    success: true,
    total_iocs: allIocs.length,
    by_source: bySource,
    inserted,
    deduplicated: dedupedIocs.length,
  });
}
