/**
 * 谱面 → 图片（SVG / PNG）渲染管线。
 *
 * 移植自 watagashi-uni/Uni-PJSK-Viewer-Frontend：
 *   - `src/vendor/sekai-sus2img/index.ts`（渲染入口、jacket / pixel / playlevel 处理、
 *     SVG 内联图片、SVG→PNG 栅格化）
 *   - `src/vendor/sekai-sus2img/renderer.ts`（实际绘制，见 `src/vendor/sus2img/`）
 *
 * 只保留「谱面转图片」这一条链路；源仓库里的 SUS ⇄ JSON 互转、SUS 兼容性检查、
 * Rust WASM 引擎都不在本项目范围内。
 *
 * 所有资源走同源本地路径（`public/static/...`），保证脱网可用。
 */
import { applyRebase, renderScoreToSvg, scoreFromCustomScoreJson, stringifyRebaseFromScore } from '../vendor/sus2img'

export type ChartImageSkin = 'custom01' | 'custom02'
export type ChartImageOutputFormat = 'svg' | 'png'

export type ChartImageMeta = {
  title?: string
  artist?: string
  author?: string
  difficulty?: string
  playlevel?: string
  songId?: string | number
  /** 官方谱面不追加「創作譜面」标签 */
  isOfficial?: boolean
}

export type ChartImageInput = ChartImageMeta & {
  scoreJson: unknown
  rebase?: string
  pixel?: string | number
  skin?: ChartImageSkin
  jacket?: string
  condenseSpeedTrend?: boolean
  interactiveJudgment?: boolean
}

export type ChartImageSvg = {
  svgText: string
  width: number
  height: number
}

const DEFAULT_PIXEL = 240
const MAX_PIXEL = 600
/** 渲染器的音符素材根目录，对应源仓库 `public/static/notes_new/<skin>`。 */
const NOTE_ASSET_ROOT = '/static/notes_new'
/** 未填曲绘时使用的占位图，对应源仓库 `public/logo.png`。 */
const DEFAULT_JACKET = '/static/logo.png'

export function normalizePixel(pixel: string | number | undefined): number {
  if (pixel === undefined || pixel === '') {
    return DEFAULT_PIXEL
  }
  const value = Number(pixel)
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    throw new Error('每秒长度必须是数字')
  }
  if (value > MAX_PIXEL) {
    throw new Error('每秒长度不能超过 600')
  }
  return Math.max(1, Math.floor(value))
}

function resolveJacketPath(jacket?: string): string {
  const trimmed = (jacket ?? '').trim()
  if (!trimmed) {
    return DEFAULT_JACKET
  }
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/')
  ) {
    return trimmed
  }
  return `/${trimmed.replace(/^\/+/, '')}`
}

function parseRebase(text: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('rebase.json 不是合法 JSON')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('rebase.json 必须是对象')
  }
  return parsed as Record<string, unknown>
}

/** 组装 `Score`：自定义谱面 JSON →（可选 rebase）→ 补齐 meta。 */
function createScore(input: ChartImageInput) {
  const score = scoreFromCustomScoreJson(input.scoreJson, {
    title: input.title ?? '',
    artist: input.artist ?? '',
    author: input.author ?? '',
    difficulty: input.difficulty ?? '',
    playlevel: input.playlevel ?? '',
    songId: input.songId ?? '',
  })

  const rebaseText = (input.rebase ?? '').trim()
  const finalScore = rebaseText ? applyRebase(score, parseRebase(rebaseText)) : score

  finalScore.meta.jacket = resolveJacketPath(input.jacket)

  let playlevel = `${input.playlevel ?? ''}`
  if (!input.isOfficial) {
    playlevel += ' 創作譜面'
  }
  if ((input.author ?? '').trim()) {
    playlevel += ` by ${input.author?.trim()}`
  }
  finalScore.meta.playlevel = playlevel.trim()

  return finalScore
}

/** 生成谱面 SVG（尚未内联图片）。 */
export function renderChartImageSvg(input: ChartImageInput): ChartImageSvg {
  const score = createScore(input)
  const rendered = renderScoreToSvg(score, {
    noteHost: `${NOTE_ASSET_ROOT}/${input.skin ?? 'custom01'}`,
    noteSize: 18,
    timeHeight: normalizePixel(input.pixel),
    condenseSpeedTrend: input.condenseSpeedTrend,
    interactiveJudgment: input.interactiveJudgment,
  })
  return {
    svgText: rendered.svg,
    width: rendered.width,
    height: rendered.height,
  }
}

/** 由当前谱面导出一份可继续编辑的 rebase.json（源仓库「根据当前谱面生成」按钮）。 */
export function generateRebaseJson(scoreJson: unknown, meta: ChartImageMeta = {}): string {
  return stringifyRebaseFromScore(
    scoreFromCustomScoreJson(scoreJson, {
      title: meta.title ?? '',
      artist: meta.artist ?? '',
      author: meta.author ?? '',
      difficulty: meta.difficulty ?? '',
      playlevel: meta.playlevel ?? '',
    }),
  )
}

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('读取图片资源失败'))
    reader.readAsDataURL(blob)
  })

const resolveHrefForFetch = (href: string): string => {
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href
  }
  if (href.startsWith('//')) {
    return `${window.location.protocol}${href}`
  }
  return new URL(href, window.location.href).toString()
}

/**
 * 把 SVG 里引用的本地图片（音符素材、曲绘）转成 data URL。
 * 不内联的话 `<img>` 加载 SVG 时会因为跨资源限制画不出图片，导出的 PNG 会缺图。
 */
export async function inlineSvgImages(svgText: string): Promise<string> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined' || typeof FileReader === 'undefined') {
    return svgText
  }

  const hrefs = Array.from(
    new Set(
      [...svgText.matchAll(/href="([^"]+)"/g)]
        .map((match) => match[1])
        .filter((href) => href && !href.startsWith('#') && !href.startsWith('data:') && !href.startsWith('blob:')),
    ),
  )
  if (!hrefs.length) {
    return svgText
  }

  const dataUrlMap = new Map<string, string>()
  await Promise.all(
    hrefs.map(async (href) => {
      try {
        const response = await fetch(resolveHrefForFetch(href))
        if (!response.ok) {
          return
        }
        dataUrlMap.set(href, await blobToDataUrl(await response.blob()))
      } catch {
        // 取不到就保留原 href，和源仓库一致
      }
    }),
  )

  let inlined = svgText
  for (const [href, dataUrl] of dataUrlMap) {
    inlined = inlined.replaceAll(`href="${href}"`, `href="${dataUrl}"`)
  }
  return inlined
}

export function svgToBlob(svgText: string): Blob {
  return new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
}

/** 栅格化：把（已内联资源的）SVG 画到 canvas 再导出 PNG。 */
export async function svgToPngBlob(svgText: string, width: number, height: number): Promise<Blob> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    throw new Error('当前环境不支持前端 PNG 转换')
  }

  const svgUrl = URL.createObjectURL(svgToBlob(svgText))
  try {
    const image = new Image()
    image.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('SVG 转 PNG 时图片载入失败'))
      image.src = svgUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.ceil(width))
    canvas.height = Math.max(1, Math.ceil(height))
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('浏览器不支持 Canvas 导出')
    }
    context.drawImage(image, 0, 0)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
          return
        }
        reject(new Error('浏览器导出 PNG 失败'))
      }, 'image/png')
    })
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** 文件名取自曲名，非法字符替换成 `-`，与源仓库一致。 */
export function chartImageFileName(title: string | undefined): string {
  const raw = (title ?? '').trim() || 'sus2img-chart'
  const normalized = raw
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || 'sus2img-chart'
}
