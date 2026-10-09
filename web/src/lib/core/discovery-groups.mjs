// Keep group failures independent. The full ATS scanner may emit an error with
// no summary at all; that absence is an incomplete result, never a clean zero.
export async function runDiscoveryGroups({ directories, german, web, runDirectory, runGerman, runWeb, onEvent }) {
  const offers = [];
  const seen = new Set();
  const emit = (event) => {
    if (event.kind === "offer") {
      if (seen.has(event.offer.url)) return;
      seen.add(event.offer.url);
      offers.push(event.offer);
    }
    onEvent(event);
  };

  let directorySummary;
  const directoryRun = (async () => {
    if (!directories.length) return;
    try {
      const returned = await runDirectory((event) => {
        if (event.kind === "summary") directorySummary = event;
        else emit(event);
      });
      for (const offer of returned || []) emit({ kind: "offer", offer });
    } catch (error) {
      emit({ kind: "error", message: error instanceof Error ? error.message : "ATS directory scan failed" });
    }
  })();
  let germanRun = { offers: [], companiesScanned: 0, unreachable: 0, incomplete: [], datasetStatus: {} };
  const germanTask = (async () => {
    if (!german.length) return;
    try {
      germanRun = await runGerman(emit);
      for (const offer of germanRun.offers || []) emit({ kind: "offer", offer });
    } catch (error) {
      emit({ kind: "error", message: error instanceof Error ? error.message : "German provider scan failed" });
      germanRun = { offers: [], companiesScanned: 0, unreachable: german.length, incomplete: german, datasetStatus: Object.fromEntries(german.map((source) => [source, "empty"])) };
    }
  })();
  const webStatus = {};
  const webIncomplete = [];
  let webScanned = 0;
  let webUnreachable = 0;
  const webTask = (async () => {
    for (const source of web) {
      emit({ kind: "atsStart", ats: source, companies: 1 });
      let result;
      try {
        result = await runWeb(source);
      } catch (error) {
        result = { offers: [], searched: 0, unreachable: 1, error: error instanceof Error ? error.message : "search failed" };
      }
      webScanned += result.searched || 0;
      webUnreachable += result.unreachable || 0;
      webStatus[source] = result.unreachable ? "empty" : "ok";
      if (result.unreachable) {
        webIncomplete.push(source);
        emit({ kind: "log", line: `${source}: ${result.error || "search unavailable"}` });
      }
      for (const offer of result.offers || []) emit({ kind: "offer", offer });
      emit({ kind: "progress", ats: source, scanned: result.searched || 0, total: 1, matches: result.offers?.length || 0 });
      emit({ kind: "atsDone", ats: source, unreachable: result.unreachable || 0 });
    }
  })();
  await Promise.all([directoryRun, germanTask, webTask]);

  const missingDirectorySummary = directories.length > 0 && !directorySummary;
  const incomplete = [...(directorySummary?.incomplete || []), ...(missingDirectorySummary ? directories : []), ...germanRun.incomplete, ...webIncomplete];
  const directoryStatus = missingDirectorySummary ? Object.fromEntries(directories.map((source) => [source, "empty"])) : directorySummary?.datasetStatus || {};
  emit({
    kind: "summary",
    companiesScanned: (directorySummary?.companiesScanned || 0) + germanRun.companiesScanned + webScanned,
    unreachable: (directorySummary?.unreachable || (missingDirectorySummary ? directories.length : 0)) + germanRun.unreachable + webUnreachable,
    matches: offers.length,
    companiesAvailable: (directorySummary?.companiesAvailable ?? directorySummary?.companiesScanned ?? directories.length) + german.length + web.length,
    capHit: Boolean(directorySummary?.capHit || germanRun.capHit),
    datasetStatus: { ...directoryStatus, ...germanRun.datasetStatus, ...webStatus },
    postingsDroppedNoDate: directorySummary?.postingsDroppedNoDate || 0,
    ...(incomplete.length ? { incomplete: [...new Set(incomplete)] } : {}),
  });
  return offers;
}
