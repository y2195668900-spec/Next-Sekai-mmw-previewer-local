/**
 * 「谱面转图片」页面。
 *
 * 交互与输出照搬 watagashi-uni/Uni-PJSK-Viewer-Frontend 的 `Sus2ImgView.vue`：
 * 粘贴内容或上传文件 → 点「开始转换」→ 新标签页展示生成的谱面图，同时给出
 * SVG / PNG 下载按钮。
 *
 * SUS / 自制 JSON / USC / Sonolus LevelData 走同一个入口：格式由
 * `detectFormatFromText` 按内容识别，再由 `toCustomScoreJson` 各自转换后汇入
 * 同一条渲染管线，因此不存在「某个格式专属页面」的重复代码。
 */
import { decodeChartSource, decodeChartText } from './lib/chartSource'
import {
  chartImageFileName,
  generateRebaseJson,
  inlineSvgImages,
  normalizePixel,
  renderChartImageSvg,
  svgToBlob,
  svgToPngBlob,
  triggerBlobDownload,
} from './lib/chartImage'
import type { ChartImageOutputFormat, ChartImageSkin } from './lib/chartImage'
import { buildCustomScore, bridgeFromDocument } from '../bridge/customScore'
import { parseLevelData } from '../data/leveldata'
import { parseUscChart } from '../data/usc'

type ScoreTextFormat = 'sus' | 'custom-score-json' | 'usc' | 'level-data'

/** 单一入口接受的谱面格式，顺序只影响提示文案。 */
const CHART_IMAGE_ACCEPTS: ScoreTextFormat[] = ['custom-score-json', 'usc', 'level-data']

/** 上传控件允许的后缀：四种格式（含 gzip LevelData）一次覆盖。 */
const CHART_IMAGE_ACCEPT = '.usc,.json,.gz,.lvdata,.leveldata,.txt,text/plain,application/json,application/gzip'

const CHART_IMAGE_PAGE = {
  title: '谱面转图片',
  description:
    '粘贴谱面内容或上传文件，支持谱面 Maker 自制 JSON、USC 与 Sonolus LevelData（.gz 可直接上传），渲染成速览长图并导出 SVG / PNG。输入会先经新版桥接统一变速曲线，与预览器一致。',
  accept: CHART_IMAGE_ACCEPT,
  textLabel: '谱面内容（自制 JSON / USC / LevelData）',
  placeholder: '在此粘贴谱面 Maker 自制 JSON、USC 或 Sonolus LevelData 内容',
  mismatchHint: '无法识别这段内容的格式，支持 自制 JSON / USC / LevelData',
}

const STORAGE_KEY = 'chart-image-form-data'

type StoredForm = {
  rebase: string
  title: string
  artist: string
  author: string
  difficulty: string
  playlevel: string
  pixel: string
  jacketUrl: string
  condenseSpeedTrend: boolean
  skin: ChartImageSkin
  outputFormat: ChartImageOutputFormat
}

const defaultForm: StoredForm = {
  rebase: '',
  title: '',
  artist: '',
  author: '',
  difficulty: '',
  playlevel: '',
  pixel: '',
  jacketUrl: '',
  condenseSpeedTrend: true,
  skin: 'custom01',
  outputFormat: 'png',
}

function readStoredForm(): StoredForm {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { ...defaultForm }
    }
    const parsed = JSON.parse(raw) as Partial<StoredForm>
    return {
      rebase: typeof parsed.rebase === 'string' ? parsed.rebase : '',
      title: typeof parsed.title === 'string' ? parsed.title : '',
      artist: typeof parsed.artist === 'string' ? parsed.artist : '',
      author: typeof parsed.author === 'string' ? parsed.author : '',
      difficulty: typeof parsed.difficulty === 'string' ? parsed.difficulty : '',
      playlevel: typeof parsed.playlevel === 'string' ? parsed.playlevel : '',
      pixel: typeof parsed.pixel === 'string' ? parsed.pixel : '',
      jacketUrl: typeof parsed.jacketUrl === 'string' ? parsed.jacketUrl : '',
      condenseSpeedTrend: parsed.condenseSpeedTrend !== false,
      skin: parsed.skin === 'custom02' ? 'custom02' : 'custom01',
      outputFormat: parsed.outputFormat === 'svg' ? 'svg' : 'png',
    }
  } catch {
    return { ...defaultForm }
  }
}

function persistForm(form: StoredForm): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
  } catch {
    // 忽略写入失败（隐私模式等）
  }
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&#39;'
    }
  })

export function renderChartToImageMarkup(): string {
  const page = CHART_IMAGE_PAGE
  return `
    <section class="upload-card chart-image-card">
      <h1 class="upload-title">${escapeHtml(page.title)}</h1>
      <p class="upload-text">${escapeHtml(page.description)}</p>

      <form class="upload-form" id="img-form" novalidate>
        <div class="upload-row wide">
          <label for="img-chart">${escapeHtml(page.textLabel)}</label>
          <textarea id="img-chart" class="img-textarea" rows="10" spellcheck="false" placeholder="${escapeHtml(page.placeholder)}"></textarea>
        </div>

        <div class="upload-row wide">
          <label for="img-file">上传文件（可选，与上方内容二选一）</label>
          <input id="img-file" type="file" accept="${page.accept}" />
          <p class="img-hint" id="img-file-name">未选择文件</p>
        </div>

        <details class="img-options" id="img-options">
          <summary>可选设置（曲名 / 难度 / 定数 / 每秒长度 / 曲绘 / rebase）</summary>
          <div class="upload-grid">
            <div class="upload-row">
              <label for="img-title">曲名（可省略）</label>
              <input id="img-title" type="text" placeholder="曲名" />
            </div>
            <div class="upload-row">
              <label for="img-artist">作曲作词编曲（可省略）</label>
              <input id="img-artist" type="text" placeholder="作曲作词编曲" />
            </div>
            <div class="upload-row">
              <label for="img-author">谱面作者（可省略）</label>
              <input id="img-author" type="text" placeholder="谱面作者" />
            </div>
            <div class="upload-row">
              <label for="img-difficulty">难度（可省略）</label>
              <input id="img-difficulty" type="text" placeholder="例如 MASTER" />
            </div>
            <div class="upload-row">
              <label for="img-playlevel">定数（可省略）</label>
              <input id="img-playlevel" type="text" placeholder="例如 32" />
            </div>
            <div class="upload-row">
              <label for="img-pixel">每秒长度（默认 240，上限 600）</label>
              <input id="img-pixel" type="text" inputmode="numeric" placeholder="240" />
            </div>
            <div class="upload-row wide">
              <label for="img-jacket-url">曲绘 URL（可省略，留空用内置占位图）</label>
              <input id="img-jacket-url" type="text" placeholder="可填 data: / http(s): / 绝对路径" />
            </div>
            <div class="upload-row wide">
              <label for="img-jacket-file">上传曲绘（可省略）</label>
              <input id="img-jacket-file" type="file" accept="image/*" />
            </div>
            <div class="upload-row wide">
              <label for="img-rebase">rebase.json（可省略，用来重排时间轴）</label>
              <button type="button" class="img-inline-button" id="img-rebase-generate">根据当前谱面生成</button>
              <textarea id="img-rebase" class="img-textarea img-textarea--short" rows="5" spellcheck="false" placeholder="在此粘贴 rebase.json 内容"></textarea>
              <p class="img-hint" id="img-rebase-message"></p>
            </div>
            <div class="upload-row wide">
              <label class="upload-toggle">
                <input id="img-condense" type="checkbox" checked />
                <span>highspeed 短时间密集变化折叠为趋势箭头</span>
              </label>
            </div>
          </div>
        </details>

        <div class="upload-grid">
          <div class="upload-row">
            <label>皮肤</label>
            <div class="img-radio-row" role="radiogroup" aria-label="皮肤">
              <label class="img-radio"><input type="radio" name="img-skin" value="custom01" checked /><span>默认</span></label>
              <label class="img-radio"><input type="radio" name="img-skin" value="custom02" /><span>3 周年新增</span></label>
            </div>
          </div>
          <div class="upload-row">
            <label>输出格式</label>
            <div class="img-radio-row" role="radiogroup" aria-label="输出格式">
              <label class="img-radio"><input type="radio" name="img-format" value="png" checked /><span>PNG</span></label>
              <label class="img-radio"><input type="radio" name="img-format" value="svg" /><span>SVG</span></label>
            </div>
          </div>
        </div>

        <p class="img-error" id="img-error" hidden></p>

        <div class="upload-actions">
          <button type="button" class="is-secondary" id="img-reset">清空</button>
          <button type="submit" id="img-submit">开始转换</button>
        </div>
      </form>
    </section>

    <section class="upload-card chart-image-result" id="img-result" hidden>
      <h2 class="upload-title">生成结果下载</h2>
      <p class="upload-text" id="img-result-desc"></p>
      <div class="img-download-row">
        <button type="button" class="action-button secondary" id="img-download-svg">下载 SVG</button>
        <button type="button" class="action-button" id="img-download-png">下载 PNG</button>
      </div>
      <p class="img-message" id="img-download-message" hidden></p>
      <p class="img-error" id="img-download-error" hidden></p>
    </section>
  `
}

function showGeneratingHint(previewTab: Window | null): void {
  if (!previewTab || previewTab.closed) {
    return
  }
  try {
    previewTab.document.title = '正在生成谱面预览...'
    previewTab.document.documentElement.style.margin = '0'
    previewTab.document.documentElement.style.height = '100%'
    previewTab.document.body.style.margin = '0'
    previewTab.document.body.style.height = '100%'
    previewTab.document.body.innerHTML = `
      <div style="min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 20% 20%, #f8fafc 0%, #eef2ff 45%, #e2e8f0 100%);color:#1e293b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="width:min(92vw,520px);padding:clamp(18px,3vw,28px);border-radius:16px;background:#ffffffcc;backdrop-filter:blur(8px);box-shadow:0 16px 40px rgba(15,23,42,.12);border:1px solid #cbd5e1;text-align:center;">
          <div style="font-size:clamp(18px,2.4vw,24px);font-weight:700;letter-spacing:.01em;margin-bottom:8px;">正在生成谱面预览</div>
          <div style="font-size:clamp(13px,1.8vw,15px);color:#475569;">请稍候，生成完成后将自动跳转...</div>
        </div>
      </div>
    `
  } catch {
    // 跨域或 document 不可写时忽略
  }
}

/** 把任意一种输入格式统一成渲染器要的 CustomScoreJson。 */
/**
 * 汇入静态渲染器前统一成 `CustomScoreJson`。
 *
 * USC / LevelData 都走新版桥接（`buildCustomScore` / `bridgeFromDocument`）：
 * 这样导出的图片与预览器用的是同一条变速曲线，不会出现「预览对、图片不对」。
 * SUS 不再支持（旧版的 sus→json wasm 没有一起搬过来）。
 */
async function toCustomScoreJson(text: string, format: ScoreTextFormat): Promise<unknown> {
  switch (format) {
    case 'usc': {
      const imported = parseUscChart(text)
      return JSON.parse(bridgeCustomScore(imported))
    }
    case 'level-data': {
      const chart = parseLevelData(text)
      return JSON.parse(buildCustomScore(text, chart).scoreText)
    }
    case 'custom-score-json':
    default:
      return JSON.parse(text)
  }
}

function bridgeCustomScore(imported: ReturnType<typeof parseUscChart>): string {
  return bridgeFromDocument(imported.document as never, imported.chart).scoreText
}

export function mountChartToImage(root: HTMLElement): void {
  const page = CHART_IMAGE_PAGE
  const form = readStoredForm()

  const formEl = root.querySelector<HTMLFormElement>('#img-form')!
  const chartInput = root.querySelector<HTMLTextAreaElement>('#img-chart')!
  const fileInput = root.querySelector<HTMLInputElement>('#img-file')!
  const fileNameNode = root.querySelector<HTMLParagraphElement>('#img-file-name')!
  const rebaseInput = root.querySelector<HTMLTextAreaElement>('#img-rebase')!
  const titleInput = root.querySelector<HTMLInputElement>('#img-title')!
  const artistInput = root.querySelector<HTMLInputElement>('#img-artist')!
  const authorInput = root.querySelector<HTMLInputElement>('#img-author')!
  const difficultyInput = root.querySelector<HTMLInputElement>('#img-difficulty')!
  const playlevelInput = root.querySelector<HTMLInputElement>('#img-playlevel')!
  const pixelInput = root.querySelector<HTMLInputElement>('#img-pixel')!
  const jacketUrlInput = root.querySelector<HTMLInputElement>('#img-jacket-url')!
  const jacketFileInput = root.querySelector<HTMLInputElement>('#img-jacket-file')!
  const condenseInput = root.querySelector<HTMLInputElement>('#img-condense')!
  const rebaseGenerateButton = root.querySelector<HTMLButtonElement>('#img-rebase-generate')!
  const rebaseMessage = root.querySelector<HTMLParagraphElement>('#img-rebase-message')!
  const errorNode = root.querySelector<HTMLParagraphElement>('#img-error')!
  const submitButton = root.querySelector<HTMLButtonElement>('#img-submit')!
  const resetButton = root.querySelector<HTMLButtonElement>('#img-reset')!
  const resultSection = root.querySelector<HTMLElement>('#img-result')!
  const resultDesc = root.querySelector<HTMLParagraphElement>('#img-result-desc')!
  const downloadSvgButton = root.querySelector<HTMLButtonElement>('#img-download-svg')!
  const downloadPngButton = root.querySelector<HTMLButtonElement>('#img-download-png')!
  const downloadMessage = root.querySelector<HTMLParagraphElement>('#img-download-message')!
  const downloadError = root.querySelector<HTMLParagraphElement>('#img-download-error')!

  const skinInputs = [...root.querySelectorAll<HTMLInputElement>('input[name="img-skin"]')]
  const formatInputs = [...root.querySelectorAll<HTMLInputElement>('input[name="img-format"]')]

  type ResultState = { svgText: string; width: number; height: number; format: ChartImageOutputFormat }
  let result: ResultState | null = null
  let jacketDataUrl = ''
  let busy = false

  const syncStored = () => {
    const stored: StoredForm = {
      rebase: rebaseInput.value,
      title: titleInput.value,
      artist: artistInput.value,
      author: authorInput.value,
      difficulty: difficultyInput.value,
      playlevel: playlevelInput.value,
      pixel: pixelInput.value,
      jacketUrl: jacketUrlInput.value,
      condenseSpeedTrend: condenseInput.checked,
      skin: (skinInputs.find((item) => item.checked)?.value as ChartImageSkin) ?? 'custom01',
      outputFormat: (formatInputs.find((item) => item.checked)?.value as ChartImageOutputFormat) ?? 'png',
    }
    persistForm(stored)
  }

  // 回填上次填写的内容
  rebaseInput.value = form.rebase
  titleInput.value = form.title
  artistInput.value = form.artist
  authorInput.value = form.author
  difficultyInput.value = form.difficulty
  playlevelInput.value = form.playlevel
  pixelInput.value = form.pixel
  jacketUrlInput.value = form.jacketUrl
  condenseInput.checked = form.condenseSpeedTrend
  skinInputs.forEach((input) => {
    input.checked = input.value === form.skin
  })
  formatInputs.forEach((input) => {
    input.checked = input.value === form.outputFormat
  })

  const setError = (message: string | null) => {
    if (!message) {
      errorNode.hidden = true
      errorNode.textContent = ''
      return
    }
    errorNode.hidden = false
    errorNode.textContent = message
  }

  const setDownloadFeedback = (message: string | null, error: string | null) => {
    downloadMessage.hidden = !message
    downloadMessage.textContent = message ?? ''
    downloadError.hidden = !error
    downloadError.textContent = error ?? ''
  }

  const resetResult = () => {
    result = null
    resultSection.hidden = true
    resultDesc.textContent = ''
    setDownloadFeedback(null, null)
  }

  const readChartText = async (): Promise<string> => {
    const typed = chartInput.value.trim()
    if (typed) {
      return chartInput.value
    }
    const file = fileInput.files?.[0]
    if (!file) {
      throw new Error('请提供谱面内容或上传文件')
    }
    const decoded = await decodeChartSource({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) })
    return decoded.text
  }

  /** 统一入口：格式完全由内容决定，四种格式共用后续的渲染管线。 */
  const resolveFormat = (text: string, fileName?: string): ScoreTextFormat => {
    const { format } = decodeChartText(text, fileName)
    if (!CHART_IMAGE_ACCEPTS.includes(format)) {
      throw new Error(`${page.mismatchHint}，识别结果为「${format}」。`)
    }
    return format
  }

  const resolveJacket = (): string => {
    if (jacketDataUrl) {
      return jacketDataUrl
    }
    return jacketUrlInput.value.trim()
  }

  resetButton.addEventListener('click', () => {
    chartInput.value = ''
    fileInput.value = ''
    fileNameNode.textContent = '未选择文件'
    jacketFileInput.value = ''
    jacketDataUrl = ''
    setError(null)
    resetResult()
  })

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]
    fileNameNode.textContent = file ? file.name : '未选择文件'
    if (file) {
      chartInput.value = ''
    }
  })

  jacketFileInput.addEventListener('change', () => {
    const file = jacketFileInput.files?.[0]
    if (!file) {
      jacketDataUrl = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      jacketDataUrl = String(reader.result ?? '')
    }
    reader.onerror = () => {
      jacketDataUrl = ''
      setError('读取曲绘失败')
    }
    reader.readAsDataURL(file)
  })

  rebaseGenerateButton.addEventListener('click', async () => {
    rebaseMessage.textContent = ''
    rebaseGenerateButton.disabled = true
    const label = rebaseGenerateButton.textContent
    rebaseGenerateButton.textContent = '生成中...'
    try {
      const text = await readChartText()
      const format = resolveFormat(text, fileInput.files?.[0]?.name)
      const scoreJson = await toCustomScoreJson(text, format)
      if (rebaseInput.value.trim() && !window.confirm('这会覆盖文本框中现有的 rebase.json 内容，是否继续？')) {
        return
      }
      rebaseInput.value = generateRebaseJson(scoreJson, {
        title: titleInput.value,
        artist: artistInput.value,
        author: authorInput.value,
        difficulty: difficultyInput.value,
        playlevel: playlevelInput.value,
      })
      rebaseMessage.textContent = '已根据当前谱面填入；只有理解 rebase 时间轴时才需要修改。'
      syncStored()
    } catch (reason) {
      rebaseMessage.textContent = reason instanceof Error ? reason.message : '生成 rebase.json 失败'
    } finally {
      rebaseGenerateButton.disabled = false
      rebaseGenerateButton.textContent = label
    }
  })

  ;[rebaseInput, titleInput, artistInput, authorInput, difficultyInput, playlevelInput, pixelInput, jacketUrlInput].forEach(
    (input) => input.addEventListener('change', syncStored),
  )
  condenseInput.addEventListener('change', syncStored)
  skinInputs.concat(formatInputs).forEach((input) => input.addEventListener('change', syncStored))

  formEl.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (busy) {
      return
    }
    busy = true
    setError(null)
    setDownloadFeedback(null, null)
    submitButton.disabled = true
    submitButton.textContent = '转换中...'

    const previewTab = window.open('', '_blank')
    showGeneratingHint(previewTab)

    try {
      const text = await readChartText()
      const format = resolveFormat(text, fileInput.files?.[0]?.name)
      const scoreJson = await toCustomScoreJson(text, format)

      const rendered = renderChartImageSvg({
        scoreJson,
        rebase: rebaseInput.value,
        title: titleInput.value,
        artist: artistInput.value,
        author: authorInput.value,
        difficulty: difficultyInput.value,
        playlevel: playlevelInput.value,
        pixel: pixelInput.value,
        skin: (skinInputs.find((item) => item.checked)?.value as ChartImageSkin) ?? 'custom01',
        jacket: resolveJacket(),
        condenseSpeedTrend: condenseInput.checked,
      })

      const svgText = await inlineSvgImages(rendered.svgText)
      const outputFormat = (formatInputs.find((item) => item.checked)?.value as ChartImageOutputFormat) ?? 'png'
      const blob = outputFormat === 'png' ? await svgToPngBlob(svgText, rendered.width, rendered.height) : svgToBlob(svgText)
      const url = URL.createObjectURL(blob)

      if (previewTab && !previewTab.closed) {
        previewTab.location.href = url
      } else {
        window.open(url, '_blank')
      }

      result = { svgText, width: rendered.width, height: rendered.height, format: outputFormat }
      resultSection.hidden = false
      resultDesc.textContent = `最近一次生成：${rendered.width} × ${rendered.height} px，输出格式为 ${outputFormat.toUpperCase()}。`
      syncStored()
    } catch (reason) {
      if (previewTab && !previewTab.closed) {
        previewTab.close()
      }
      setError(reason instanceof Error ? reason.message : '转换失败')
    } finally {
      busy = false
      submitButton.disabled = false
      submitButton.textContent = '开始转换'
    }
  })

  downloadSvgButton.addEventListener('click', () => {
    if (!result) {
      return
    }
    setDownloadFeedback(null, null)
    try {
      triggerBlobDownload(svgToBlob(result.svgText), `${chartImageFileName(titleInput.value)}.svg`)
      setDownloadFeedback('SVG 下载已开始', null)
    } catch (reason) {
      setDownloadFeedback(null, reason instanceof Error ? reason.message : 'SVG 下载失败')
    }
  })

  downloadPngButton.addEventListener('click', async () => {
    if (!result) {
      return
    }
    setDownloadFeedback(null, null)
    downloadPngButton.disabled = true
    const label = downloadPngButton.textContent
    downloadPngButton.textContent = '正在生成 PNG...'
    try {
      const blob = await svgToPngBlob(result.svgText, result.width, result.height)
      triggerBlobDownload(blob, `${chartImageFileName(titleInput.value)}.png`)
      setDownloadFeedback('PNG 下载已开始', null)
    } catch (reason) {
      setDownloadFeedback(null, reason instanceof Error ? reason.message : 'PNG 下载失败')
    } finally {
      downloadPngButton.disabled = false
      downloadPngButton.textContent = label
    }
  })

  // 每秒长度是唯一会在转换前就撞到的校验，提前给出提示
  pixelInput.addEventListener('blur', () => {
    try {
      normalizePixel(pixelInput.value)
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '每秒长度不合法')
    }
  })
}
