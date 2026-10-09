import { NextRequest } from "next/server";
import fs from "node:fs";
import { runDiscovery } from "@/lib/core/scan";
import { rootScript } from "@/lib/career-ops";
import { parseExplorePatch, DEFAULT_FILTERS, WEB_SEARCH_SOURCES, DIRECTORY_SOURCES, type DiscoveredOffer, type ScanEvent } from "@/lib/explore";
import { scannerMissingBody, SCANNER_MISSING_STATUS } from "@/lib/explore-error.mjs";

// Discovery is HTTP-bound across many sources; give it room. Structured sources
// use no paid search service; selected web-index sources can consume credits.
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* empty body → defaults */
  }

  const filters = parseExplorePatch(body, DEFAULT_FILTERS);

  // Guard: a data-only checkout (or pre-onboarding) has no scanner. Fail soft.
  // The body carries an explicit code because 400 is a shared channel: the
  // client cannot tell this apart from a malformed request by status alone.
  if (filters.ats.every((source) => DIRECTORY_SOURCES.includes(source)) && !fs.existsSync(rootScript("scan-ats-full"))) {
    return Response.json(scannerMissingBody(), { status: SCANNER_MISSING_STATUS });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          /* stream closed */
        }
      };
      send({ kind: "start", ats: filters.ats, sinceDays: filters.sinceDays, limit: filters.limitPerAts,
        free: !filters.ats.some((source) => WEB_SEARCH_SOURCES.includes(source)) } satisfies ScanEvent);
      let offers: DiscoveredOffer[] = [];
      try {
        offers = await runDiscovery(filters, (e: ScanEvent) => send(e));
      } catch (err) {
        send({ kind: "error", message: err instanceof Error ? err.message : "discovery failed" } satisfies ScanEvent);
      }
      send({ kind: "done", count: offers.length, offers, cost: { tokens: 0, usd: 0 } } satisfies ScanEvent);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
