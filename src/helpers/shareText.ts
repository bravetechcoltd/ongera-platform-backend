/**
 * Plain-text sanitization for share payloads.
 * Strips chars that render as U+FFFD on WhatsApp / Twitter / FB.
 * Built with RegExp constructor so the source stays pure ASCII.
 */

const RE_REPLACEMENT = new RegExp("\uFFFD", "g");
const RE_SURROGATES = new RegExp("[\uD800-\uDFFF]", "g");
const RE_INVISIBLE = new RegExp(
  "[\u200B-\u200F\u2028-\u202E\u2060-\u206F\u00AD\uFEFF]",
  "g"
);
const RE_C0 = new RegExp(
  "[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]",
  "g"
);

export function sanitizeShareText(input: string | null | undefined): string {
  if (!input) return "";
  let s = String(input);
  try {
    s = s.normalize("NFC");
  } catch {
    /* older node - skip */
  }
  s = s
    .replace(RE_REPLACEMENT, "")
    .replace(RE_SURROGATES, "")
    .replace(RE_INVISIBLE, "")
    .replace(RE_C0, "")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

export function truncateForShare(input: string, max: number): string {
  const clean = sanitizeShareText(input);
  if (clean.length <= max) return clean;
  const trimmed = clean.slice(0, max);
  const lastSpace = trimmed.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? trimmed.slice(0, lastSpace) : trimmed) + "...";
}

export function buildEmailBody(lines: string[]): string {
  return lines
    .map((l) => sanitizeShareText(l))
    .filter((l) => l.length > 0)
    .join("\r\n\r\n");
}
