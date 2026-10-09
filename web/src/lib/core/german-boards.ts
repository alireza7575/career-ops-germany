import { spawn } from "node:child_process";
import path from "node:path";
import { rootScript, careerOpsRoot } from "@/lib/career-ops";
import { writeTempPortals, cleanupTempPortals } from "./portals";
import type { DiscoveredOffer, ExploreFilters, ScanEvent } from "@/lib/explore";

export type GermanSource = "arbeitsagentur" | "arbeitnow";
export type GermanRun = {
  offers: DiscoveredOffer[];
  companiesScanned: number;
  unreachable: number;
  incomplete: string[];
  datasetStatus: Record<string, "ok" | "empty">;
};

function runOne(source: GermanSource, filters: ExploreFilters, onEvent: (event: ScanEvent) => void): Promise<GermanRun> {
  const tempPortals = writeTempPortals(filters);
  const codeRoot = path.dirname(rootScript("scan"));
  const runner = path.join(codeRoot, "web", "src", "lib", "core", "german-board-runner.mjs");
  onEvent({ kind: "atsStart", ats: source, companies: 1 });
  return new Promise((resolve) => {
    const offers: DiscoveredOffer[] = [];
    let output = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    let scanned = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (failed: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanupTempPortals(tempPortals);
      if (output.trim()) handleLine(output);
      if (failed) onEvent({ kind: "log", line: `${source}: ${timedOut ? "scan timed out" : stderr.trim() || "provider failed"}` });
      onEvent({ kind: "atsDone", ats: source, unreachable: failed ? 1 : 0 });
      resolve({
        offers,
        companiesScanned: scanned,
        unreachable: failed ? 1 : 0,
        incomplete: failed ? [source] : [],
        datasetStatus: { [source]: failed ? "empty" : "ok" },
      });
    };
    const handleLine = (line: string) => {
      try {
        const row = JSON.parse(line) as { kind: string; offer?: DiscoveredOffer; scanned?: number };
        if (row.kind === "offer" && row.offer?.url) {
          const offer = { ...row.offer, ats: source };
          offers.push(offer);
          onEvent({ kind: "offer", offer });
          onEvent({ kind: "progress", ats: source, scanned: 1, total: 1, matches: offers.length });
        } else if (row.kind === "summary") scanned = row.scanned ?? 1;
      } catch {
        // A malformed line cannot discard already streamed offers.
      }
    };
    let child;
    try {
      child = spawn(process.execPath, [runner, codeRoot, source, tempPortals, String(filters.sinceDays), String(filters.limitPerAts)], {
        cwd: codeRoot,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      stderr = error instanceof Error ? error.message : "provider failed to start";
      finish(true);
      return;
    }
    timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 90_000);
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      const lines = output.split(/\r?\n/);
      output = lines.pop() ?? "";
      for (const line of lines) if (line.trim()) handleLine(line);
    });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("error", (error) => { stderr = error.message; finish(true); });
    child.on("close", (code) => finish(code !== 0 || timedOut));
  });
}

export async function runGermanDiscovery(sources: GermanSource[], filters: ExploreFilters, onEvent: (event: ScanEvent) => void): Promise<GermanRun> {
  const runs = await Promise.all(sources.map((source) => runOne(source, filters, onEvent)));
  return {
    offers: runs.flatMap((run) => run.offers),
    companiesScanned: runs.reduce((n, run) => n + run.companiesScanned, 0),
    unreachable: runs.reduce((n, run) => n + run.unreachable, 0),
    incomplete: runs.flatMap((run) => run.incomplete),
    datasetStatus: Object.assign({}, ...runs.map((run) => run.datasetStatus)),
  };
}
