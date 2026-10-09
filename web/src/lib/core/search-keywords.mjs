// word:/stem: control local title matching; search APIs need the plain phrase.
export function searchPhrase(term) {
  return String(term || "").trim().replace(/^(?:word|stem):/i, "").trim();
}
