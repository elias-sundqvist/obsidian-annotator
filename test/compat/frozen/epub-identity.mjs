// ../../submodules/hypothesis-client-annotator-fork/src/shared/epub-identity.js
var last = (values) => values?.[values.length - 1];
function dcFingerprint(dc) {
  const publication = last(dc?.["relation.ispartof"]);
  const section = last(dc?.identifier);
  return publication && section ? `urn:x-dc:${encodeURIComponent(publication)}/${encodeURIComponent(section)}` : void 0;
}
function splitFingerprint(value) {
  if (typeof value !== "string" || !value.startsWith("urn:x-dc:")) return null;
  const rest = value.slice(9), slash = rest.lastIndexOf("/");
  if (slash < 0) return null;
  try {
    return { publication: decodeURIComponent(rest.slice(0, slash)), section: decodeURIComponent(rest.slice(slash + 1)) };
  } catch {
    return null;
  }
}
function epubDC(document, idref, packageIdentifier) {
  const clone = (
    /** @type {Document} */
    document.cloneNode(true)
  ), head = clone.querySelector("head");
  if (!head) return {};
  const existing = head.querySelector("link[property='dc.identifier']");
  if (existing) existing.setAttribute("content", idref);
  else {
    const meta = clone.createElement("meta");
    meta.setAttribute("name", "dc.identifier");
    meta.setAttribute("content", idref);
    head.appendChild(meta);
  }
  const relation = clone.createElement("meta");
  relation.setAttribute("name", "dc.relation.ispartof");
  if (packageIdentifier) relation.setAttribute("content", packageIdentifier);
  head.appendChild(relation);
  const dc = {};
  for (const meta of clone.querySelectorAll("meta")) {
    const name = meta.getAttribute("name"), content = meta.getAttribute("content");
    const match = name?.match(/^dc.(.+)$/i);
    if (match && content) (dc[match[1].toLowerCase()] ??= []).push(content);
  }
  return dc;
}
function metadataFingerprints(metadata) {
  const values = [metadata?.documentFingerprint, ...(metadata?.link || []).map((link) => link.href)];
  const found = /* @__PURE__ */ new Set();
  for (const value of values) if (typeof value === "string" && splitFingerprint(value)) found.add(value);
  return [...found];
}
function publicationIds(metadata) {
  return [...new Set(metadataFingerprints(metadata).flatMap((value) => {
    const parsed = splitFingerprint(value);
    return parsed ? [parsed.publication] : [];
  }).concat(metadata?.dc?.["relation.ispartof"]?.slice(-1) || []))];
}
function chapterLoc(uri) {
  if (typeof uri !== "string") return null;
  try {
    return new URL(uri).searchParams.get("loc");
  } catch {
    return null;
  }
}
function isEpubAnnotation(annotation) {
  return chapterLoc(annotation?.uri) !== null || (annotation?.target || []).some((target) => chapterLoc(target.source) !== null);
}
function epubCandidates(annotation, sections, associatedIds = []) {
  const metadata = annotation.document || annotation.metadata || {};
  const publications = publicationIds(metadata), fingerprints = metadataFingerprints(metadata);
  const sources = [annotation.uri, ...(annotation.target || []).map((target) => target.source)].flatMap((value) => typeof value === "string" ? [value] : []);
  const known = new Set(associatedIds.concat(sections.flatMap((section) => publicationIds(section.document || section.metadata))));
  const mismatch = publications.length > 0 && known.size > 0 && !publications.some((value) => known.has(value));
  if (mismatch) return { identified: [], eligible: [], conflict: false, mismatch: true };
  const explicitlyScoped = publications.some((value) => associatedIds.includes(value));
  const eligible = sections.map((section, index) => ({ section, index })).filter(({ section }) => {
    const ids = publicationIds(section.document || section.metadata);
    return explicitlyScoped || publications.length === 0 || ids.length === 0 || publications.some((value) => ids.includes(value));
  }).map(({ index }) => index);
  const fingerprintMatches = eligible.filter((index) => metadataFingerprints(sections[index].document || sections[index].metadata).some((value) => fingerprints.includes(value)));
  const uriMatches = eligible.filter((index) => sources.some((source) => {
    const section = sections[index], aliases = [section.uri, section.href, section.path, ...((section.document || section.metadata)?.link || []).map((link) => link.href)].flatMap((value) => typeof value === "string" && !value.startsWith("urn:") ? [value] : []);
    const loc = chapterLoc(source);
    return aliases.includes(source) || loc !== null && aliases.some((alias) => alias === loc || chapterLoc(alias) === loc);
  }));
  const identified = [.../* @__PURE__ */ new Set([...fingerprintMatches, ...uriMatches])];
  const conflict = fingerprintMatches.length > 0 && uriMatches.length > 0 && !fingerprintMatches.every((index) => uriMatches.includes(index));
  return { identified, eligible, conflict, mismatch: false };
}
function epubFrame(frames, annotation) {
  const route = annotation.$epubRoute;
  if (route) {
    const matches = frames.filter((frame) => frame.uri === route.uri);
    return matches.length === 1 ? matches[0] : null;
  }
  const candidates = epubCandidates(annotation, frames);
  if (candidates.mismatch || candidates.conflict || candidates.identified.length !== 1) return null;
  return frames[candidates.identified[0]];
}
export {
  chapterLoc,
  dcFingerprint,
  epubCandidates,
  epubDC,
  epubFrame,
  isEpubAnnotation,
  metadataFingerprints,
  publicationIds,
  splitFingerprint
};
