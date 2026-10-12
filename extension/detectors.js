// Tier 1: regex + checksum + entropy. Fast, deterministic, no model needed.
// Tier 2 (fine-tuned NER for names/addresses) plugs in via detectNER() -- see README roadmap.

const PATTERNS = [
  { type: "PRIVATE_KEY", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { type: "AWS_KEY", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { type: "GITHUB_TOKEN", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g },
  { type: "API_KEY", re: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { type: "JWT", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { type: "EMAIL", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { type: "SSN", re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: "IBAN", re: /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,3})?\b/g },
  { type: "CREDIT_CARD", re: /\b(?:\d[ -]?){13,19}\b/g, validate: luhn },
];

function luhn(s) {
  const d = s.replace(/\D/g, "");
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = +d[i];
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
}

function entropy(s) {
  const f = {};
  for (const c of s) f[c] = (f[c] || 0) + 1;
  return -Object.values(f).reduce((a, n) => a + (n / s.length) * Math.log2(n / s.length), 0);
}

function detectTier1(text) {
  const out = [];
  for (const { type, re, validate } of PATTERNS) {
    for (const m of text.matchAll(re)) {
      if (validate && !validate(m[0])) continue;
      out.push({ start: m.index, end: m.index + m[0].length, type });
    }
  }
  // High-entropy tokens (generic secrets)
  for (const m of text.matchAll(/[A-Za-z0-9+\/_=-]{24,}/g)) {
    if (/[A-Z]/.test(m[0]) && /[a-z]/.test(m[0]) && /\d/.test(m[0]) && entropy(m[0]) > 4.0) {
      out.push({ start: m.index, end: m.index + m[0].length, type: "SECRET" });
    }
  }
  return mergeOverlaps(out);
}

function mergeOverlaps(dets) {
  dets.sort((a, b) => a.start - b.start || b.end - a.end);
  const res = [];
  for (const d of dets) {
    const last = res[res.length - 1];
    if (last && d.start < last.end) continue; // keep the earlier/longer span
    res.push(d);
  }
  return res;
}

function redactText(text, dets) {
  let out = text;
  for (const d of [...dets].sort((a, b) => b.start - a.start)) {
    const tok = out.slice(d.start, d.end);
    const mask =
      d.type === "CREDIT_CARD" ? `[CARD_****${tok.replace(/\D/g, "").slice(-4)}]` : `[${d.type}_REDACTED]`;
    out = out.slice(0, d.start) + mask + out.slice(d.end);
  }
  return out;
}
