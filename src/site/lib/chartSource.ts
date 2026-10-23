/**
 * Chart source decoding.
 *
 * The preview only ever hands the wasm a SUS text or a chart-Maker JSON text.
 * Everything else has to be recognised here and decoded into one of those two
 * shapes, covering:
 *
 *   - `.sus`                         Plain text, converted by the sus2json wasm.
 *   - chart-Maker `.json`            Already the wasm's native input.
 *   - `.usc` (Universal Sekai Chart) JSON, converted by `uscParser`.
 *   - Sonolus LevelData JSON, converted by `levelDataParser`. LevelData files
 *     are frequently stored gzipped (`.gz` or no extension at all), so the
 *     decompression lives here too.
 *
 * Detection has to work without trusting the file name: LevelData exports are
 * commonly named after the song id with no extension, and the same JSON
 * container may be gzipped. We therefore sniff the leading bytes, gunzip when
 * the gzip magic is present, and only then look at the JSON structure.
 */

type ScoreTextFormat = 'sus' | 'custom-score-json' | 'usc' | 'level-data'

/** gzip magic number, the first two bytes of every gzip stream. */
const GZIP_MAGIC_FIRST = 0x1f
const GZIP_MAGIC_SECOND = 0x8b

/** Encodings that may be attached to a chart file by the browser. */
const TEXT_DECODER = new TextDecoder('utf-8')

export type ChartSourceFile = {
  name?: string
  bytes: Uint8Array
}

export type DecodedChartSource = {
  format: ScoreTextFormat
  /** Decoded chart text, ready for the per-format adapter. */
  text: string
  /** True when the bytes had to be gunzipped before they could be parsed. */
  gzipped: boolean
}

function hasGzipMagic(bytes: Uint8Array) {
  return bytes.length >= 2 && bytes[0] === GZIP_MAGIC_FIRST && bytes[1] === GZIP_MAGIC_SECOND
}

/**
 * Inflate a gzip stream with the platform decompressor.
 *
 * `DecompressionStream` is available in every browser that can run this
 * preview (Chrome 80+, Firefox 113+, Safari 16.4+) and avoids shipping a
 * JavaScript inflate implementation for what is only ever one file at a time.
 */
async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前浏览器不支持 gzip 解压，请直接上传解压后的谱面文件。')
  }
  // `Blob.stream()` hands the decompressor a byte stream without copying the
  // payload through a script-visible buffer first.
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Strip a UTF-8 BOM and surrounding whitespace; JSON.parse rejects the BOM. */
function normalizeText(text: string) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

function isJsonText(text: string) {
  const head = text.trimStart()
  return head.startsWith('{') || head.startsWith('[')
}

/**
 * Identify the chart format from its decoded text.
 *
 * Order matters: LevelData and USC are both plain JSON objects, so each needs
 * a structural probe that cannot collide with the chart-Maker output.
 */
function detectFormatFromText(text: string, name?: string): ScoreTextFormat {
  if (!isJsonText(text)) {
    return 'sus'
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // Malformed JSON that still looked like JSON: let the adapter report it
    // with a useful message instead of silently treating it as SUS.
    return guessJsonFormatFromName(name)
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return 'sus'
  }
  const root = parsed as Record<string, unknown>

  // Chart-Maker output: the wasm reads these two arrays directly.
  if (Array.isArray(root.MusicScoreEventDataList) || Array.isArray(root.NoteList)) {
    return 'custom-score-json'
  }
  // USC: `{ "usc": { "objects": [...] }, "version": 2 }`.
  if (root.usc && typeof root.usc === 'object') {
    return 'usc'
  }
  // Some editors write the USC body without the wrapper.
  if (Array.isArray(root.objects) && typeof root.version === 'number') {
    return 'usc'
  }
  // Sonolus LevelData: `{ "bgmOffset": seconds, "entities": [...] }`.
  if (Array.isArray(root.entities)) {
    return 'level-data'
  }

  return guessJsonFormatFromName(name)
}

/** Fall back to the file name when the payload could not be recognised. */
function guessJsonFormatFromName(name?: string): ScoreTextFormat {
  const lower = (name ?? '').toLowerCase()
  if (lower.endsWith('.usc')) {
    return 'usc'
  }
  if (lower.endsWith('.lvdata') || lower.endsWith('.leveldata')) {
    return 'level-data'
  }
  return 'custom-score-json'
}

/**
 * Decode a chart file into text plus the format a caller should parse it as.
 *
 * Accepts either raw bytes (preferred, so gzip works) or already-decoded text
 * for the postMessage path, which transports strings.
 */
export async function decodeChartSource(source: ChartSourceFile): Promise<DecodedChartSource> {
  const gzipped = hasGzipMagic(source.bytes)
  const bytes = gzipped ? await gunzip(source.bytes) : source.bytes
  const text = normalizeText(TEXT_DECODER.decode(bytes))
  return {
    format: detectFormatFromText(text, source.name),
    text,
    gzipped,
  }
}

/** Decode chart text that is already a string (postMessage payloads). */
export function decodeChartText(text: string, name?: string): DecodedChartSource {
  const normalized = normalizeText(text)
  return {
    format: detectFormatFromText(normalized, name),
    text: normalized,
    gzipped: false,
  }
}

export { detectFormatFromText }
