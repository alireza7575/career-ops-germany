import { load, JSON_SCHEMA } from 'js-yaml';
import { splitSections } from './report-sections.mjs';

/** Project the existing assessment into a decision brief; never infer new claims.
 * @param {string} report */
export function reportDecision(report) {
  const section = splitSections(report).sections.find(s => /^machine summary$/i.test(s.heading));
  const block = section?.content.match(/```(?:ya?ml)?\s*\n([\s\S]*?)```/i)?.[1];
  let data;
  try { data = block ? load(block, { schema: JSON_SCHEMA }) : null; } catch { data = null; }
  const object = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const text = (key) => typeof object[key] === 'string' ? object[key].trim() : '';
  const list = (key) => Array.isArray(object[key]) ? object[key].filter(v => typeof v === 'string' && v.trim()).slice(0, 3) : [];
  return { decision: text('final_decision'), nextAction: text('next_action'), strengths: list('top_strengths'), concerns: list('hard_stops').concat(list('soft_gaps')).slice(0, 3), confidence: text('confidence') };
}

/** Accept a saved raw URL or Markdown link, never a script URL.
 * @param {...(string | null | undefined)} candidates
 * @returns {string | undefined} */
export function postingUrl(...candidates) {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    const href = value?.match(/^\[[^\]]*\]\(<?(https?:\/\/.*?)>?\)$/i)?.[1] ?? value;
    if (!href) continue;
    try {
      const parsed = new URL(href);
      if (['http:', 'https:'].includes(parsed.protocol)) return parsed.href;
    } catch { /* Try the next saved source. */ }
  }
  return undefined;
}
