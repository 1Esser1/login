// Uses Google Translate's unofficial endpoint — no API key, no daily quota
const GTRANS  = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&dt=t';
const memCache = new Map();

// Separator used when joining multiple strings into one request.
// Chosen to be something Google Translate passes through unchanged.
const SEP = '\n';

// Max characters of joined text per GET request (conservative, URL-safe)
const MAX_CHARS = 1200;

async function gtFetch(text, targetLang) {
  try {
    const res = await fetch(`${GTRANS}&tl=${targetLang}&q=${encodeURIComponent(text)}`);
    if (!res.ok) return null;
    const json = await res.json();
    // json[0] is an array of [translatedSegment, originalSegment] pairs
    return json[0]?.map(x => x[0]).join('') || null;
  } catch {
    return null;
  }
}

export async function translateText(text, targetLang) {
  if (!text || targetLang === 'en') return text;

  const key = `${targetLang}:${text.slice(0, 80)}`;
  if (memCache.has(key)) return memCache.get(key);

  const translated = await gtFetch(text.slice(0, 500), targetLang);
  if (!translated || translated.trim().toLowerCase() === text.trim().toLowerCase()) return text;

  memCache.set(key, translated);
  return translated;
}

// Translates many strings with as few API calls as possible.
// Strings are joined (up to MAX_CHARS each) into single requests, split on return.
// Falls back to per-string calls only when the joined response splits incorrectly.
export async function translateBatch(texts, targetLang) {
  if (targetLang === 'en' || !texts.length) return [...texts];

  // Group texts into char-budget chunks
  const chunks = [];
  let chunk = [], len = 0;
  for (const t of texts) {
    if (chunk.length && len + t.length + 1 > MAX_CHARS) {
      chunks.push(chunk);
      chunk = [t];
      len   = t.length;
    } else {
      chunk.push(t);
      len += t.length + 1;
    }
  }
  if (chunk.length) chunks.push(chunk);

  const out = [];
  for (const ch of chunks) {
    const joined     = ch.join(SEP);
    const translated = await gtFetch(joined, targetLang);

    if (translated) {
      const parts = translated.split(SEP);
      if (parts.length === ch.length) {
        for (let j = 0; j < ch.length; j++) {
          const orig = ch[j];
          const t    = parts[j]?.trim() || '';
          const good = t && t.toLowerCase() !== orig.toLowerCase();
          if (good) memCache.set(`${targetLang}:${orig.slice(0, 80)}`, t);
          out.push(good ? t : orig);
        }
        continue;
      }
    }

    // Fallback — translate each string individually for this chunk
    for (const t of ch) {
      out.push(await translateText(t, targetLang));
    }
  }

  return out;
}

export function clearTranslationCache() { memCache.clear(); }
