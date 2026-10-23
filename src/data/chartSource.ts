/**
 * 谱面解码：gzip 解压 + BOM 剥离 + 格式嗅探。
 *
 * 新版的 `load()` 之前直接 `file.text()`，于是 gzip 过的 LevelData（`.gz` 或
 * 无扩展名）会以 `Unexpected token '\u001f'` 失败 —— 旧版 `src/lib/chartSource.ts`
 * 正是为此存在。这里保留同样的嗅探顺序：
 *
 *   - `.usc` / USC JSON       → `usc`
 *   - Sonolus LevelData JSON  → `level-data`（常常是 gzip）
 *   - 自制谱 JSON             → `custom-score-json`（本版暂不支持）
 */

export type ChartFormat = 'usc' | 'level-data' | 'custom-score-json' | 'sus'

export type ChartSourceFile = {
  name?: string
  bytes: Uint8Array
}

export type DecodedChartSource = {
  format: ChartFormat
  text: string
  gzipped: boolean
}

const GZIP_MAGIC_FIRST = 0x1f
const GZIP_MAGIC_SECOND = 0x8b
const TEXT_DECODER = new TextDecoder('utf-8')

function hasGzipMagic(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === GZIP_MAGIC_FIRST && bytes[1] === GZIP_MAGIC_SECOND
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前浏览器不支持 gzip 解压，请先解压后再导入。')
  }
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** JSON.parse 不接受开头的 BOM。 */
function normalizeText(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

function isJsonText(text: string): boolean {
  const head = text.trimStart()
  return head.startsWith('{') || head.startsWith('[')
}

function guessFormatFromName(name?: string): ChartFormat {
  const lower = (name ?? '').toLowerCase()
  if (lower.endsWith('.usc')) return 'usc'
  if (lower.endsWith('.lvdata') || lower.endsWith('.leveldata')) return 'level-data'
  if (lower.endsWith('.sus')) return 'sus'
  return 'custom-score-json'
}

export function detectFormatFromText(text: string, name?: string): ChartFormat {
  if (!isJsonText(text)) return 'sus'

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return guessFormatFromName(name)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 'sus'

  const root = parsed as Record<string, unknown>
  if (Array.isArray(root.MusicScoreEventDataList) || Array.isArray(root.NoteList)) return 'custom-score-json'
  if (root.usc && typeof root.usc === 'object') return 'usc'
  if (Array.isArray(root.objects) && typeof root.version === 'number') return 'usc'
  if (Array.isArray(root.entities)) return 'level-data'
  return guessFormatFromName(name)
}

export async function decodeChartSource(source: ChartSourceFile): Promise<DecodedChartSource> {
  const gzipped = hasGzipMagic(source.bytes)
  const bytes = gzipped ? await gunzip(source.bytes) : source.bytes
  const text = normalizeText(TEXT_DECODER.decode(bytes))
  return { format: detectFormatFromText(text, source.name), text, gzipped }
}

/** 已经是字符串的谱面（例如 `?src=` 拉回来的文本）。 */
export function decodeChartText(text: string, name?: string): DecodedChartSource {
  const normalized = normalizeText(text)
  return { format: detectFormatFromText(normalized, name), text: normalized, gzipped: false }
}
