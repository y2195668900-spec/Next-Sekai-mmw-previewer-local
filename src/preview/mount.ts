/**
 * 预览页（/preview）——载入 → 解析 → 播放 + 设置 + 自检。
 *
 * 界面布局对齐旧版 `src/previewApp.ts`：画布 16:9 + 下方多行控制栏
 * （播放/进度/速度/noteSpeed/亮度/浓度/透明度/音量/皮肤/配色/上隐/开关/全屏），
 * 谱面信息与自检收进「诊断 / 自检」折叠区。
 *
 * 时间轴语义也与旧版一致：范围是 `0 .. durationSec`，**包含 lead-in**。
 * 因此 `seek(0)` 会从开场动画（曲名/难度/自制谱信息）开始播，而不是直接跳到谱面第 0 秒。
 */

import { parseLevelData, describeGroup } from '../data/leveldata'
import type { Chart } from '../data/types'
import { runParity } from '../parity/checks'
import { HitSound, type SeKind } from '../audio/hit'
import { Skin } from '../view/skin'
import { Playfield } from '../view/playfield'
import { setNoteSpeed } from '../view/layout'
import { WasmStage, DEFAULT_STAGE_CONFIG, type AudioManifest, type StageConfig } from '../view/wasmStage'
import { buildCustomScore, bridgeFromDocument, type BridgeResult, type CustomScoreJsonShape } from '../bridge/customScore'
import { parseUscChart, looksLikeUsc, type UscImport } from '../data/usc'
import { decodeChartSource, type ChartFormat } from '../data/chartSource'
import { DEFAULT_RECORDING_FPS, PreviewRecorder, RECORDING_TARGETS, isRecordingSupported, saveRecording, type RecordingFps } from './recorder'
import { CodecsPreviewRecorder, isCodecsRecordingSupported, prewarmCodecsRecording } from './codecsRecorder'
import { FrameProfiler } from './perf'

const $ = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!

const canvas = $<HTMLCanvasElement>('#stage')
const wasmCanvas = $<HTMLCanvasElement>('#stage-wasm')
const stageArea = $('#stage-area')
const rendererSelect = $<HTMLSelectElement>('#renderer')
const rendererState = $('#renderer-state')
const timeline = $<HTMLInputElement>('#timeline')
const playButton = $<HTMLButtonElement>('#play')
const rateSelect = $<HTMLSelectElement>('#rate')
const fileInput = $<HTMLInputElement>('#file')
const dropZone = $('#drop-zone')
const sampleSelect = $<HTMLSelectElement>('#sample')
const toast = $('#toast')
const debug = $('#debug')
const perfReadout = document.querySelector<HTMLElement>('#perf-readout')
const profiler = new FrameProfiler()
const checksEl = $('#checks')
const hud = $('#hud')
const chartInfo = $<HTMLDListElement>('#chart-info')
const diagToggle = $<HTMLButtonElement>('#diag-toggle')
const diag = $('#diag')
const unlockLayer = $('#unlock-layer')
const unlockButton = $<HTMLButtonElement>('#unlock-button')
const recResolution = $<HTMLSelectElement>('#rec-resolution')
const recFps = $<HTMLSelectElement>('#rec-fps')
const recStartButton = $<HTMLButtonElement>('#rec-start')
const recPauseButton = $<HTMLButtonElement>('#rec-pause')
const recStopButton = $<HTMLButtonElement>('#rec-stop')
const recElapsed = $('#rec-elapsed')
const recStatus = $('#rec-status')

let chart: Chart | null = null
let field: Playfield | null = null
let skin: Skin | null = null
let parity: ReturnType<typeof runParity> = []

/* ── 旧版 wasm 渲染器 ─────────────────────────────────── */
type RendererKind = 'wasm' | 'reference'
let mode: RendererKind = 'wasm'
let stage: WasmStage | null = null
let manifest: AudioManifest | null = null
let bridge: BridgeResult | null = null
let lastText = ''
let lastLabel = ''
/** 导入格式：LevelData 与 USC 走不同的桥接入口。 */
let sourceKind: 'leveldata' | 'usc' = 'leveldata'
let usc: UscImport | null = null
let wasmFrame = 0
let wasmBusy = false
/** 载入期间又来了新谱面：等当前 mount 结束后重放一次，避免“再导入没反应”。 */
let pendingRemount = false
/** 页面级音频手势只争取一次。 */
let audioUnlocked = false

/* ── 会话信息（来自「加载自制谱」表单）──────────────────── */
export type PreviewPayload = {
  file: File
  bgmFile?: File | null
  coverFile?: File | null
  offsetMs?: number | null
  difficulty?: string | null
  title?: string | null
  lyricist?: string | null
  composer?: string | null
  arranger?: string | null
  vocal?: string | null
  scoreTitle?: string | null
  scoreCreator?: string | null
  customScoreInfo?: boolean
}

type SessionMeta = Omit<PreviewPayload, 'file' | 'bgmFile' | 'coverFile'>

let sessionMeta: SessionMeta = {}
let sessionBgm: Uint8Array | null = null
let sessionCover: Uint8Array | null = null
let booted = false
let booting: Promise<void> | null = null
let wasmBroken = false

const hitSound = new HitSound()
// 优先用 WebCodecs：它按「第几帧」写时间戳，文件才是严格 CFR；
// 不支持 WebCodecs 的浏览器退回 MediaRecorder（帧率会跟着渲染速度漂）。
const recorder = isCodecsRecordingSupported() ? new CodecsPreviewRecorder() : new PreviewRecorder()
let recordingStartPending = false
let recordingSavePending = false
let recordingTimer = 0
let hitNotes: { time: number; kind: SeKind }[] = []
let hitCursor = 0
let pulse = 0
let lastTick = 0

/* ── 播放设置（与旧版 defaultConfig 对齐）────────────────── */
let noteSpeedValue = 10.5
let bgmVolume = 1
let seVolume = 1
let lowResolution = false

/* ── 通用 UI ─────────────────────────────────────────── */

let toastTimer = 0
function notify(message: string): void {
  toast.textContent = message
  toast.classList.add('show')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2200)
}

const formatTime = (seconds: number): string => {
  const total = Math.max(0, seconds)
  const minutes = Math.floor(total / 60)
  const rest = total - minutes * 60
  return `${String(minutes).padStart(2, '0')}:${rest.toFixed(3).padStart(6, '0')}`
}

/* ── 载入 ────────────────────────────────────────────── */

/** 页面内换谱面（拖放 / 选择文件 / 内置样例）时，旧的 BGM 与元数据必须一起清掉。 */
function clearSession(): void {
  sessionMeta = {}
  sessionBgm = null
  sessionCover = null
}

/**
 * 从字节载入：先解 gzip / 去 BOM / 嗅探格式，再交给对应解析器。
 * 之前直接 `file.text()`，gzip 过的 LevelData 会以 `Unexpected token '\u001f'` 失败。
 */
async function loadBytes(bytes: Uint8Array, name: string): Promise<void> {
  let decoded
  try {
    decoded = await decodeChartSource({ bytes, name })
  } catch (error) {
    notify(`解析失败：${name} — ${(error as Error).message}`)
    return
  }
  if (decoded.format === 'sus') {
    notify(`暂不支持 SUS：${name}（请导入 USC 或 LevelData）`)
    return
  }
  if (decoded.format === 'custom-score-json') {
    notify(`暂不支持自制谱 JSON：${name}（请导入 USC 或 LevelData）`)
    return
  }
  load(decoded.text, name, decoded.format)
}

function load(text: string, label: string, format?: ChartFormat): void {
  const started = performance.now()
  const resolved: 'usc' | 'level-data' = format === 'usc' || (format === undefined && looksLikeUsc(text)) ? 'usc' : 'level-data'
  try {
    if (resolved === 'usc') {
      usc = parseUscChart(text)
      chart = usc.chart
      sourceKind = 'usc'
    } else {
      usc = null
      chart = parseLevelData(text)
      sourceKind = 'leveldata'
    }
  } catch (error) {
    notify(`解析失败：${label} — ${(error as Error).message}`)
    return
  }
  // 换谱面时先把旧会话停掉：播放中重载会让旧音频源与新会话抢时钟。
  try {
    stage?.pause()
  } catch {
    /* 尚未初始化 */
  }
  // 上一次载入失败不应该让后续导入永远退回参考渲染器。
  wasmBroken = false
  const elapsed = performance.now() - started

  if (!field) {
    field = new Playfield(canvas, chart, skin)
    field.onTick = (time) => {
      advanceHits(time)
      if (recorder.state === 'recording') recorder.capture()
      syncTransport(time)
      renderDebug(time)
    }
  } else {
    field.setChart(chart)
  }
  field.setOptions({
    mirror: $<HTMLInputElement>('#mirror').checked,
    showSimLines: $<HTMLInputElement>('#sim').checked,
  })

  parity = runParity(chart)
  rebuildHits()
  resize()
  timeline.max = String(chart.duration)
  timeline.value = '0'
  renderChecks()
  renderChartInfo()
  renderDebug(0)
  syncTransport(0)
  syncNoteColorAvailability()

  // 物量（总 combo）由 wasm 会话在加载完成后填（见 mountWasm）；参考实现没有判定
  // 事件，切过去时保持 '—'。
  $('#chip-notes').textContent = '—'
  $('#chip-duration').textContent = formatTime(chart.duration)
  $('#chip-groups').textContent = String(chart.groups.length)
  const formatLabel = sourceKind === 'usc' ? 'USC' : 'LevelData'
  notify(`${label} · ${formatLabel} · ${chart.notes.length} 音符 · 解析 ${elapsed.toFixed(0)} ms`)

  lastText = text
  lastLabel = label
  if (mode === 'wasm') void mountWasm()
}

function renderChartInfo(): void {
  if (!chart) return
  const rows: [string, string][] = [
    ['格式', sourceKind === 'usc' ? 'USC' : 'LevelData'],
    ['音符', String(chart.notes.length)],
    ['长条', String(chart.holds.length)],
    ['连线', String(chart.simLines.length)],
    ['时序组', String(chart.groups.length)],
    ['初始 BPM', chart.tempo.bpmAtTime(0).toFixed(2)],
    ['时长', `${chart.duration.toFixed(2)} s`],
    ['告警', chart.warnings.length === 0 ? '无' : String(chart.warnings.length)],
  ]
  if (usc) {
    rows.push(['USC 单键', String(usc.stats.singles)])
    rows.push(['USC 滑条', String(usc.stats.slides)])
    rows.push(['USC 引导', String(usc.stats.guides)])
    rows.push(['marker', String(usc.stats.markers)])
  }
  chartInfo.innerHTML = rows.map(([key, value]) => `<dt>${key}</dt><dd>${value}</dd>`).join('')
}

function renderChecks(): void {
  const failed = parity.filter((check) => !check.ok).length
  checksEl.innerHTML = parity
    .map(
      (check) =>
        `<li class="${check.ok ? 'ok' : 'bad'}"><b>${check.ok ? 'PASS' : 'FAIL'}</b>${check.name} — ${check.detail}</li>`,
    )
    .join('')
  if (failed > 0) notify(`${failed} 项自检失败，见「诊断 / 自检」`)
}

function renderDebug(time: number): void {
  if (!chart) return
  const lines: string[] = []
  lines.push(`chart time   ${time.toFixed(3)} s`)
  lines.push(`bpm          ${chart.tempo.bpmAtTime(time).toFixed(2)}`)
  for (let index = 0; index < chart.groups.length; index += 1) {
    const track = chart.groups[index].track
    lines.push(
      `group ${index}      clock ${track.positionAt(time).toFixed(3)} s   speed ${track.speedAt(time).toFixed(3)}×   markers ${track.markers.length}`,
    )
  }
  if (chart.groups[0]) lines.push(`detail       ${describeGroup(chart, 0)}`)
  if (bridge) {
    lines.push(
      `bridge       ${bridge.stats.groups} 层 / ${bridge.stats.keys} 关键帧 / 值域 ${bridge.stats.minValue.toFixed(1)} .. ${bridge.stats.maxValue.toFixed(1)}`,
    )
  }
  debug.textContent = lines.join('\n')

  hud.innerHTML = [
    `<span class="hud-pill">${formatTime(time)}</span>`,
    `<span class="hud-pill">${chart.tempo.bpmAtTime(time).toFixed(1)} BPM</span>`,
    `<span class="hud-pill">groups ${chart.groups.length}</span>`,
  ].join('')
}

/* ── 命中与音效 ──────────────────────────────────────── */

function rebuildHits(): void {
  if (!chart) return
  hitNotes = chart.notes
    .filter((note) => note.kind === 'tap' || note.kind === 'flick' || note.kind === 'trace' || note.kind === 'holdHead')
    .filter((note) => !note.damage)
    .map((note) => ({
      time: note.time,
      kind: (note.kind === 'flick' ? 'flick' : note.kind === 'trace' ? 'trace' : note.critical ? 'critical' : 'tap') as SeKind,
    }))
    .sort((a, b) => a.time - b.time)
  hitCursor = 0
}

function advanceHits(time: number): void {
  if (time < lastTick) {
    hitCursor = hitNotes.findIndex((note) => note.time >= time)
    if (hitCursor < 0) hitCursor = hitNotes.length
  } else {
    while (hitCursor < hitNotes.length && hitNotes[hitCursor].time <= time) {
      hitSound.play(hitNotes[hitCursor].kind)
      pulse = 1
      hitCursor += 1
    }
  }
  lastTick = time
  pulse = Math.max(0, pulse - 0.08)
  field?.setPulse(pulse)
}

/* ── 旧版 wasm 渲染器 ────────────────────────────────── */

const LEAD_IN_MS = 9000

const dpr = (): number => Math.min(2, window.devicePixelRatio || 1)
const renderScale = (): number => dpr() * (lowResolution ? 0.5 : 1)

function stageSize(): { width: number; height: number } {
  return { width: 1400, height: 788 }
}

function readStageConfig(): StageConfig {
  const num = (id: string) => Number($<HTMLInputElement>(id).value)
  const on = (id: string) => $<HTMLInputElement>(id).checked
  return {
    ...DEFAULT_STAGE_CONFIG,
    mirror: on('#mirror'),
    simultaneousLine: on('#sim'),
    // 低特效 = 高档位以外的精简档（旧版 applyLowEffects：enabled → effectProfile 1）
    effectProfile: on('#low-effects') ? 1 : 0,
    noteSkin: Number($<HTMLSelectElement>('#note-skin').value),
    noteColor: Number($<HTMLSelectElement>('#note-color').value),
    specialNoteColors: sourceKind === 'leveldata',
    noteSpeed: noteSpeedValue,
    holdAlpha: num('#hold-alpha') / 100,
    guideAlpha: num('#guide-alpha') / 100,
    backgroundBrightness: num('#bg-brightness') / 100,
    stageCover: num('#stage-cover') / 100,
    effectOpacity: 1,
    damageSound: on('#damage-sound'),
  }
}

function applyStageConfig(): void {
  if (!stage) return
  try {
    stage.setConfig(readStageConfig())
    stage.setVolumes(bgmVolume, seVolume)
  } catch (error) {
    console.warn('[stage] 配置下发失败', error)
    return
  }
  renderStageOnce()
}

/**
 * 暂停 / 就绪时画面是静止的，改配置（背景亮度、Guide 浓度、长条透明度、上隐、
 * 皮肤…）不会自己重画，得补一帧才能立刻看到效果。
 *
 * 播放中、加载中、录制中都有各自的每帧渲染循环，这里直接跳过，避免重复渲染。
 */
function renderStageOnce(): void {
  if (!stage || mode !== 'wasm' || wasmBusy || wasmBroken) return
  if (recorder.state === 'recording') return
  const snap = stage.snapshot()
  if (snap.transportState === 'playing' || snap.transportState === 'loading') return
  try {
    stage.render()
  } catch (error) {
    console.warn('[stage] 单帧重绘失败', error)
  }
}

async function ensureStage(): Promise<void> {
  if (stage) return
  stage = new WasmStage()
  ;(globalThis as { __stage?: WasmStage }).__stage = stage
  // Phase 0 性能量化：绑定画布上已有的 WebGL2 上下文（同一个对象，不重建）。
  profiler.attach(wasmCanvas)
  ;(globalThis as { __pvPerf?: () => unknown }).__pvPerf = () => profiler.snapshot()
  ;(globalThis as { __pvPerfReset?: () => void }).__pvPerfReset = () => profiler.reset()
  ;(globalThis as { __pvCppTimings?: () => unknown }).__pvCppTimings = () => ({
    phase: stage?.framePhaseTimings() ?? '',
    player: stage?.playerFrameTimings() ?? '',
  })
  const { width, height } = measureStage()
  await stage.init(wasmCanvas, width, height, renderScale())
  if (!manifest) {
    const response = await fetch('./vendor/manifest.json')
    if (!response.ok) {
      throw new Error('缺少 vendor/manifest.json（先跑 node scripts/sync-renderer.mjs）')
    }
    manifest = (await response.json()) as AudioManifest
  }
  const result = await stage.preload(manifest, (done, total) => {
    rendererState.textContent = `资源 ${Math.round((done / total) * 100)}%`
  })
  if (result.failed.length > 0) {
    console.warn('[stage] 资源未载入', result.failed)
    notify(`${result.failed.length} 个资源未载入（详见控制台）`)
  }
}

async function mountWasm(seekTo?: number): Promise<void> {
  if (!chart || !lastText) return
  // 载入过程中再导入：记住，等这次挂载结束立刻用最新谱面重来一次。
  if (wasmBusy) {
    pendingRemount = true
    return
  }
  wasmBusy = true
  try {
    rendererState.textContent = '初始化…'
    // 提前把 WebCodecs 编码器探测跑掉：首次探测要 2 秒左右，放在这里不占点击路径。
    prewarmCodecsRecording()
    await ensureStage()
    bridge = usc ? bridgeFromDocument(usc.document as CustomScoreJsonShape, chart) : buildCustomScore(lastText, chart)
    if (bridge.warnings.length > 0) console.warn('[bridge]', bridge.warnings)
    const offsetMs = Math.round(sessionMeta.offsetMs ?? 0)
    await stage!.loadScore(bridge.scoreText, {
      // 与旧版一致：实际 lead-in = max(谱面 offset, 9s)，开场动画在这段时间里播放。
      leadInMs: Math.max(offsetMs, LEAD_IN_MS),
      offsetMs,
      title: sessionMeta.title ?? lastLabel,
      lyricist: sessionMeta.lyricist ?? undefined,
      composer: sessionMeta.composer ?? undefined,
      arranger: sessionMeta.arranger ?? undefined,
      vocal: sessionMeta.vocal ?? undefined,
      difficulty: difficultyName(sessionMeta.difficulty) ?? undefined,
      customScoreInfo: sessionMeta.customScoreInfo !== false,
      scoreTitle: sessionMeta.scoreTitle ?? undefined,
      scoreCreator: sessionMeta.scoreCreator ?? undefined,
      bgm: sessionBgm,
      cover: sessionCover,
    })
    applyStageConfig()
    // 物量 = 谱面结束时的总 combo（wasm 侧判定事件条数，与 HUD 的 COMBO 同源）。
    $('#chip-notes').textContent = String(stage!.comboEventCount())
    // seek 到 0（含 lead-in）→ 首帧就是开场动画的起点，而不是谱面第 0 秒。
    stage!.seek(seekTo ?? 0)
    stage!.render()
    rendererState.textContent = `就绪 · ${bridge.stats.keys} 关键帧`
    const snap = stage!.snapshot()
    syncTransport(snap.currentTimeSec)
    // 录制按钮依赖 stage 是否就绪，挂载完成后要刷新一次。
    updateRecordingUi()
    startWasmLoop()
  } catch (error) {
    wasmBroken = true
    rendererState.textContent = '不可用'
    notify(`wasm 渲染器不可用，已回退到参考实现：${(error as Error).message}`)
    console.error(error)
    rendererSelect.value = 'reference'
    setMode('reference')
  } finally {
    wasmBusy = false
    if (pendingRemount) {
      pendingRemount = false
      void mountWasm()
    }
  }
}

function startWasmLoop(): void {
  if (wasmFrame) return
  let lastDebugAt = 0
  let lastTransport = ''
  const step = (now: number) => {
    if (mode !== 'wasm' || !stage) {
      wasmFrame = 0
      return
    }
    const snap = stage.snapshot()
    // 暂停 / 就绪时画面是静止的：不再每帧重画（165 Hz 屏上一秒会白烧 165 次
    // wasm 渲染 + 合批）。只有播放、录制、或传输状态刚变过的那一帧需要重画；
    // seek 自己调 stage.render()，改配置走 applyStageConfig() → renderStageOnce()。
    const animating = snap.transportState === 'playing' || snap.transportState === 'loading'
    const stateChanged = snap.transportState !== lastTransport
    lastTransport = snap.transportState
    if (animating || stateChanged || recorder.state === 'recording') {
      profiler.onFrame(now)
      profiler.timeRender(() => stage!.render())
      if (recorder.state === 'recording') recorder.capture()
      syncTransport(snap.currentTimeSec)
    }
    if (now - lastDebugAt > 120) {
      lastDebugAt = now
      renderDebug(Math.max(0, snap.currentTimeSec - snap.effectiveLeadInSec))
      if (perfReadout) {
        const cppPhase = stage!.framePhaseTimings()
        const cppPlayer = stage!.playerFrameTimings()
        perfReadout.textContent = `${profiler.describe()}
          C++ 阶段 ${cppPhase}
          C++ 提交 ${cppPlayer}`
      }
    }
    wasmFrame = requestAnimationFrame(step)
  }
  wasmFrame = requestAnimationFrame(step)
}

function stopWasmLoop(): void {
  if (wasmFrame) cancelAnimationFrame(wasmFrame)
  wasmFrame = 0
}

/** 时间轴上的当前位置（含 lead-in，与旧版一致）。 */
function currentTime(): number {
  if (mode === 'wasm' && stage) return stage.snapshot().currentTimeSec
  return field?.currentTime ?? 0
}

function setMode(next: RendererKind): void {
  // wasm 的时间轴含 lead-in，参考渲染器只有谱面时间——切换时换算一次，避免跳位。
  const raw = currentTime()
  const leadIn = mode === 'wasm' && stage ? stage.snapshot().effectiveLeadInSec : LEAD_IN_MS / 1000
  const chartTime = Math.max(0, raw - leadIn)
  mode = next
  stageArea.dataset.renderer = next
  lastTick = chartTime
  if (next === 'wasm') {
    if (wasmBroken) {
      notify('wasm 渲染器初始化失败过，先修好 vendor/ 再切回')
      return
    }
    void mountWasm(chartTime + leadIn).then(() => syncTransport(chartTime + leadIn))
    return
  }
  stopWasmLoop()
  field?.seek(chartTime)
  field?.render()
  renderDebug(chartTime)
  syncTransport(chartTime)
}

rendererSelect.addEventListener('change', () => {
  setMode(rendererSelect.value === 'reference' ? 'reference' : 'wasm')
})

diagToggle.addEventListener('click', () => {
  diag.hidden = !diag.hidden
  diagToggle.classList.toggle('active', !diag.hidden)
  if (!diag.hidden) diag.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
})

/* ── 播放控制 ────────────────────────────────────────── */

/**
 * 用户是否正按住时间轴拖动。
 *
 * 之前用 `document.activeElement !== timeline` 判断：range 输入在点击/拖动后会
 * 一直保持焦点，于是「拖过一次之后进度条再也不跟播放走」（第二次导入后再拖更明显，
 * 因为 focus 从未离开）。改成显式的拖动标志，松手/失焦即恢复。
 */
let timelineDragging = false

let lastSyncedTimeText = ''
let lastSyncedTotalText = ''
let lastSyncedPlaying: boolean | null = null
let lastTimeTextAt = 0

function syncTransport(time: number): void {
  const duration = mode === 'wasm' && stage ? stage.snapshot().durationSec : (field?.duration ?? 0)
  // 时间轴范围 = 总时长（含 lead-in），与旧版 updateUi 一致。
  if (Number(timeline.max) !== duration) timeline.max = String(duration)
  if (!timelineDragging) timeline.value = String(time)
  // HUD 文字每秒最多重排 30 次：165 Hz 屏上逐帧写 textContent 会让排版/绘制
  // 占掉大量主线程时间，而人眼分辨不出每秒 30 次以上的百毫秒位变化。
  const nowAt = performance.now()
  const timeText = formatTime(time)
  if (timeText !== lastSyncedTimeText && nowAt - lastTimeTextAt > 33) {
    lastSyncedTimeText = timeText
    lastTimeTextAt = nowAt
    $('#time-now').textContent = timeText
  }
  const totalText = formatTime(duration)
  if (totalText !== lastSyncedTotalText) {
    lastSyncedTotalText = totalText
    $('#time-total').textContent = totalText
  }
  const playing = isPlaying()
  if (playing !== lastSyncedPlaying) {
    lastSyncedPlaying = playing
    playButton.textContent = playing ? '❚❚' : '▶'
    playButton.setAttribute('aria-label', playing ? '暂停' : '播放')
    $('#live-dot').classList.toggle('live', playing)
  }
}

function isPlaying(): boolean {
  if (mode === 'wasm' && stage) return stage.snapshot().transportState === 'playing'
  return Boolean(field?.isPlaying)
}

/* ── 音频手势：浏览器拦截时的兜底（对齐旧版 unlock-layer） ── */

function showUnlockLayer(): void {
  unlockLayer.hidden = false
}

function hideUnlockLayer(): void {
  unlockLayer.hidden = true
}

/**
 * 发起播放，并处理「浏览器把 AudioContext 拦成 suspended」的两种情况：
 *  - `playPlayer` 明确返回 0（resume 被拒）；
 *  - `resume()` 的 Promise 一直挂着，`playPlayer` 永不返回。
 * 两种都弹出「启动音频」层，用户点击后在同一手势里解锁并续播。
 */
/**
 * 在 JS 侧把 AudioContext 拉起来，**不经过 wasm**。
 *
 * 这是修「提示浏览器拦截音频、刷新才恢复」的关键：wasm 的 `play()` 内部会
 * `await context.resume()`，一旦没有用户手势，这个 await 永远不返回，Asyncify
 * 就把整个模块挂死 —— 之后所有 wasm 调用（包括重新导入谱面）都会失败，只能刷新。
 * 现在先在点击事件里同步 resume，成功后再调用 wasm。
 */
async function ensureAudioRunning(): Promise<boolean> {
  const context = stage?.getAudioContext() ?? null
  if (!context) return true // 没有 BGM：没有需要解锁的音频
  if (context.state === 'running') return true
  const resumed = context
    .resume()
    .then(() => context.state === 'running')
    .catch(() => false)
  // 没有用户激活时 Chrome 会让 resume() 一直 pending。这里不能等它：等下去
  // 解锁层就永远不出现，用户只会看到“点了没反应”。
  const timeout = new Promise<boolean>((resolve) => {
    window.setTimeout(() => resolve(context.state === 'running'), 600)
  })
  return Promise.race([resumed, timeout])
}

function requestPlay(): void {
  if (!stage) return
  void ensureAudioRunning().then((running) => {
    if (!running) {
      // 绝不在未解锁时进入 wasm 的 play()：那会把模块挂死。
      showUnlockLayer()
      return
    }
    const attempt = stage!.play().catch(() => false)
    const timeout = new Promise<'timeout'>((resolve) => {
      window.setTimeout(() => resolve('timeout'), 3000)
    })
    void Promise.race([attempt, timeout]).then((result) => {
      startWasmLoop()
      if (result === true) {
        audioUnlocked = true
        hideUnlockLayer()
      } else if (result === false || result === 'timeout') {
        showUnlockLayer()
      }
      syncTransport(stage!.snapshot().currentTimeSec)
    })
  })
}

async function unlockAndPlay(): Promise<void> {
  if (!stage) return
  const running = await ensureAudioRunning()
  if (!running) {
    notify('音频仍被浏览器拦截：请在页面上点一下再试')
    return
  }
  const ok = await stage.play()
  if (ok) {
    audioUnlocked = true
    hideUnlockLayer()
    startWasmLoop()
  } else {
    notify('音频仍被浏览器拦截：点一下画面再试一次')
  }
  syncTransport(stage.snapshot().currentTimeSec)
}

unlockButton.addEventListener('click', () => {
  void unlockAndPlay()
})

/** 页面第一次手势就预热 AudioContext（只在 JS 侧 resume，不进入 wasm）。 */
function unlockAudioOnGesture(): void {
  if (audioUnlocked || !stage || mode !== 'wasm') return
  void ensureAudioRunning().then((ok) => {
    if (ok) audioUnlocked = true
  })
}

document.addEventListener('pointerdown', unlockAudioOnGesture, true)
document.addEventListener('keydown', unlockAudioOnGesture, true)

playButton.addEventListener('click', () => {
  if (mode === 'wasm') {
    if (!stage) return
    const snap = stage.snapshot()
    if (snap.transportState === 'playing') {
      stage.pause()
      syncTransport(stage.snapshot().currentTimeSec)
    } else {
      // 与旧版一致：播到结尾再点播放 → 从 0（开场动画）重新开始。
      if (snap.durationSec > 0 && snap.currentTimeSec >= snap.durationSec - 0.01) {
        stage.seek(0)
        stage.render()
      }
      requestPlay()
      startWasmLoop()
    }
    return
  }
  if (!field) return
  void hitSound.unlock()
  if (field.isPlaying) {
    field.pause()
  } else {
    if (field.currentTime >= field.duration) field.seek(0)
    field.play()
  }
  syncTransport(field.currentTime)
})

timeline.addEventListener('pointerdown', () => {
  timelineDragging = true
})
timeline.addEventListener('pointerup', () => {
  timelineDragging = false
})
timeline.addEventListener('pointercancel', () => {
  timelineDragging = false
})
timeline.addEventListener('blur', () => {
  timelineDragging = false
})
// 指针在滑块外松开（拖出去再松手）也要复位。
window.addEventListener('pointerup', () => {
  timelineDragging = false
})

timeline.addEventListener('input', () => {
  const time = Number(timeline.value)
  if (mode === 'wasm') {
    if (!stage) return
    stage.seek(time)
    stage.render()
    lastTick = time
    renderDebug(time)
    syncTransport(time)
    return
  }
  field?.seek(time)
  lastTick = time
  renderDebug(time)
  syncTransport(time)
})

rateSelect.addEventListener('change', () => {
  const rate = Number(rateSelect.value)
  field?.setRate(rate)
  stage?.setRate(rate)
})

$('#fullscreen').addEventListener('click', () => {
  if (document.fullscreenElement) void document.exitFullscreen()
  else void stageArea.requestFullscreen?.()
})

document.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return
  if (event.code === 'Space') {
    event.preventDefault()
    playButton.click()
  } else if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
    event.preventDefault()
    const step = event.shiftKey ? 1 : 0.1
    const next = Math.max(0, currentTime() + (event.code === 'ArrowRight' ? step : -step))
    if (mode === 'wasm') {
      if (!stage) return
      stage.seek(next)
      stage.render()
    } else {
      if (!field) return
      field.seek(next)
    }
    lastTick = next
    syncTransport(next)
    renderDebug(next)
  }
})

/* ── 显示设置 ────────────────────────────────────────── */

function updateNoteSpeed(value: number): void {
  noteSpeedValue = Math.min(16, Math.max(1, Math.round(value * 10) / 10))
  $('#note-speed-out').textContent = noteSpeedValue.toFixed(1)
  setNoteSpeed(noteSpeedValue)
  field?.render()
  applyStageConfig()
}

for (const [id, delta] of [
  ['#note-speed-minus-one', -1],
  ['#note-speed-minus-point-one', -0.1],
  ['#note-speed-plus-point-one', 0.1],
  ['#note-speed-plus-one', 1],
] as const) {
  $(id).addEventListener('click', () => updateNoteSpeed(noteSpeedValue + delta))
}

$('#mirror').addEventListener('change', (event) => {
  field?.setOptions({ mirror: (event.target as HTMLInputElement).checked })
  applyStageConfig()
})
$('#sim').addEventListener('change', (event) => {
  field?.setOptions({ showSimLines: (event.target as HTMLInputElement).checked })
  applyStageConfig()
})

$('#low-effects').addEventListener('change', () => applyStageConfig())
$('#damage-sound').addEventListener('change', () => applyStageConfig())
$('#note-skin').addEventListener('change', () => applyStageConfig())
$('#note-color').addEventListener('change', () => applyStageConfig())

$('#low-resolution').addEventListener('change', (event) => {
  lowResolution = (event.target as HTMLInputElement).checked
  resize()
})

/** 滑杆：更新读数 + 下发配置。 */
function bindStageSlider(id: string, output: string): void {
  const input = $<HTMLInputElement>(id)
  const sync = () => {
    $(output).textContent = `${input.value}%`
    applyStageConfig()
  }
  input.addEventListener('input', sync)
}

bindStageSlider('#hold-alpha', '#hold-out')
bindStageSlider('#guide-alpha', '#guide-out')
bindStageSlider('#bg-brightness', '#bg-out')
bindStageSlider('#stage-cover', '#cover-out')

$('#bgm-volume').addEventListener('input', (event) => {
  const value = Number((event.target as HTMLInputElement).value)
  bgmVolume = value / 100
  $('#bgm-out').textContent = `${value}%`
  stage?.setVolumes(bgmVolume, seVolume)
})

$('#se-volume').addEventListener('input', (event) => {
  const value = Number((event.target as HTMLInputElement).value)
  seVolume = value / 100
  $('#se-out').textContent = `${value}%`
  hitSound.setVolume(seVolume)
  stage?.setVolumes(bgmVolume, seVolume)
})

/** 音符颜色只在 LevelData 上生效（与旧版 applySpecialColorAvailability 一致）。 */
function syncNoteColorAvailability(): void {
  const allowed = sourceKind === 'leveldata'
  const select = $<HTMLSelectElement>('#note-color')
  select.disabled = !allowed
  const label = select.closest('label.compact-select')
  label?.classList.toggle('is-disabled', !allowed)
  if (label instanceof HTMLElement) {
    label.title = allowed
      ? '默认按音符类型上色（并跟随 LevelData 的逐音符颜色）；其余选项强制单一颜色。'
      : '特殊颜色变体仅在读取 LevelData 谱面时生效。'
  }
}

/* ── 录屏（移植自旧版 recorder）────────────────────────── */

function formatRecordingClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function setRecordingStatus(message: string, tone: 'info' | 'error' = 'info'): void {
  recStatus.textContent = message
  recStatus.dataset.tone = message && tone === 'error' ? 'error' : ''
}

function updateRecordingUi(): void {
  const state = recorder.state
  const busy = recordingStartPending || recordingSavePending
  recResolution.disabled = state !== 'idle' || busy
  recFps.disabled = state !== 'idle' || busy
  rendererSelect.disabled = state !== 'idle' || busy
  recStartButton.disabled = state !== 'idle' || busy || !stage
  recPauseButton.disabled = state === 'idle' || busy
  recPauseButton.textContent = state === 'paused' ? '继续' : '暂停'
  recStopButton.disabled = state === 'idle' || busy
  if (recordingTimer) {
    window.clearInterval(recordingTimer)
    recordingTimer = 0
  }
  if (state === 'recording') {
    recElapsed.textContent = formatRecordingClock(recorder.elapsedMs)
    recordingTimer = window.setInterval(() => {
      recElapsed.textContent = formatRecordingClock(recorder.elapsedMs)
    }, 250)
  }
}

/** 录制时把渲染尺寸钉到 720p / 1080p，结束后恢复面板尺寸。 */
function applyRenderTarget(width: number, height: number): void {
  if (mode === 'wasm' && stage) {
    stage.resize(width, height, 1)
    stage.render()
    return
  }
  field?.resize(width, height, 1)
  field?.render()
}

async function startRecording(): Promise<void> {
  if (recordingStartPending || recordingSavePending || recorder.state !== 'idle') return
  if (!stage) {
    setRecordingStatus('请先载入谱面再开始录制。', 'error')
    return
  }
  if (!isCodecsRecordingSupported() && !isRecordingSupported()) {
    setRecordingStatus('当前浏览器不支持录制（需要 WebCodecs 或 MediaRecorder）。', 'error')
    return
  }
  const resolution = recResolution.value === '1080' ? 1080 : 720
  // 帧率是用户显式选的：文件属性里显示的帧率就是它，不能跟着渲染循环漂。
  const fps: RecordingFps = recFps.value === '30' ? 30 : DEFAULT_RECORDING_FPS
  const target = RECORDING_TARGETS[resolution]
  recordingStartPending = true
  updateRecordingUi()
  try {
    setRecordingStatus('正在准备录制…')
    // 先钉分辨率再开始录，保证第一帧就是目标尺寸。
    applyRenderTarget(target.width, target.height)
    const audioContext = stage.getAudioContext()
    if (audioContext && audioContext.state === 'suspended') {
      try {
        await audioContext.resume()
      } catch {
        // 录成无声轨也比直接失败好。
      }
    }
    await recorder.start({
      resolution,
      fps,
      canvas: mode === 'wasm' ? wasmCanvas : canvas,
      audioContext,
    })
    setRecordingStatus(`正在录制 ${target.label} ${fps} fps（${target.width}×${target.height}）`)
  } catch (error) {
    setRecordingStatus((error as Error).message || '无法开始录制。', 'error')
    resize()
  } finally {
    recordingStartPending = false
    updateRecordingUi()
  }
}

function toggleRecordingPause(): void {
  if (recorder.state === 'recording') {
    recorder.pause()
    setRecordingStatus('已暂停录制')
  } else if (recorder.state === 'paused') {
    recorder.resume()
    setRecordingStatus('继续录制')
  }
  updateRecordingUi()
}

async function stopRecording(): Promise<void> {
  if (recorder.state === 'idle') return
  recordingSavePending = true
  updateRecordingUi()
  try {
    const result = await recorder.stop()
    const saved = await saveRecording(result)
    const megabytes = Math.max(0.1, Math.round((saved.bytes / 1024 / 1024) * 10) / 10)
    setRecordingStatus(`已保存 ${saved.fileName}（${megabytes} MB，${result.fps} fps）`)
  } catch (error) {
    setRecordingStatus((error as Error).message || '录制失败。', 'error')
  } finally {
    recordingSavePending = false
    resize()
    updateRecordingUi()
  }
}

recStartButton.addEventListener('click', () => {
  void startRecording()
})
recPauseButton.addEventListener('click', toggleRecordingPause)
recStopButton.addEventListener('click', () => {
  void stopRecording()
})

/* ── 文件与拖放 ──────────────────────────────────────── */

dropZone.addEventListener('click', () => fileInput.click())
fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0]
  if (!file) return
  clearSession()
  await loadBytes(new Uint8Array(await file.arrayBuffer()), file.name)
})

for (const type of ['dragenter', 'dragover']) {
  stageArea.addEventListener(type, (event) => {
    event.preventDefault()
    stageArea.classList.add('dragging')
  })
}
for (const type of ['dragleave', 'drop']) {
  stageArea.addEventListener(type, (event) => {
    event.preventDefault()
    stageArea.classList.remove('dragging')
  })
}
stageArea.addEventListener('drop', async (event) => {
  const file = (event as DragEvent).dataTransfer?.files?.[0]
  if (!file) return
  clearSession()
  await loadBytes(new Uint8Array(await file.arrayBuffer()), file.name)
})

sampleSelect.addEventListener('change', () => {
  void fetchLevelData(sampleSelect.value)
})

/* ── 启动 ────────────────────────────────────────────── */

function measureStage(): { width: number; height: number } {
  const rect = stageArea.getBoundingClientRect()
  if (rect.width >= 2 && rect.height >= 2) {
    return { width: Math.floor(rect.width), height: Math.floor(rect.height) }
  }
  return stageSize()
}

function resize(): void {
  const { width, height } = measureStage()
  field?.resize(width, height, renderScale())
  if (stage) {
    stage.resize(width, height, renderScale())
    if (mode === 'wasm') stage.render()
  }
}

window.addEventListener('resize', resize)

async function fetchLevelData(url: string): Promise<void> {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    clearSession()
    await loadBytes(new Uint8Array(await response.arrayBuffer()), url.split('/').pop() ?? url)
  } catch (error) {
    notify(`载入失败：${(error as Error).message}`)
  }
}

/** 一次性初始化（皮肤 / 打击音），与「载入哪张谱」无关。 */
async function bootOnce(): Promise<void> {
  stageArea.dataset.renderer = mode
  try {
    skin = await Skin.load()
    field?.setSkin(skin)
  } catch {
    notify('未找到 assets/，先运行 node scripts/fetch-assets.mjs（已回退几何渲染）')
  }
  try {
    await hitSound.load()
    hitSound.setVolume(seVolume)
  } catch {
    notify('打击音载入失败，仅画面')
  }
  resize()
  updateRecordingUi()
}

function currentSource(): string {
  const fromUrl = new URLSearchParams(location.search).get('src')
  if (fromUrl) {
    if (fromUrl !== sampleSelect.value) {
      sampleSelect.insertAdjacentHTML('afterbegin', `<option value="${fromUrl}">${fromUrl}</option>`)
      sampleSelect.value = fromUrl
    }
    return fromUrl
  }
  return sampleSelect.value
}

/** 把表单里的曲名 / 制作信息写进「谱面信息」面板。 */
function renderSessionMeta(): void {
  if (!chart) return
  const rows: [string, string][] = []
  const push = (label: string, value?: string | null) => {
    if (value && value.trim() !== '') rows.push([label, value.trim()])
  }
  push('曲名', sessionMeta.title)
  push('作词', sessionMeta.lyricist)
  push('作曲', sessionMeta.composer)
  push('编曲', sessionMeta.arranger)
  push('演唱', sessionMeta.vocal)
  push('难度', difficultyName(sessionMeta.difficulty))
  push('谱面标题', sessionMeta.scoreTitle)
  push('谱面作者', sessionMeta.scoreCreator)
  rows.push(['BGM', sessionBgm ? `${Math.round(sessionBgm.byteLength / 1024)} KB` : '无'])
  rows.push(['曲绘', sessionCover ? '已载入' : '无'])
  if (rows.length === 0) return
  chartInfo.insertAdjacentHTML(
    'beforeend',
    rows.map(([key, value]) => `<dt>${key}</dt><dd>${value}</dd>`).join(''),
  )
}

function difficultyName(value?: string | null): string | null {
  const names = ['EASY', 'NORMAL', 'HARD', 'EXPERT', 'MASTER', 'APPEND']
  if (value === null || value === undefined || value === '') return null
  const index = Number(value)
  return Number.isInteger(index) && names[index] ? names[index] : String(value)
}

async function applyPayload(payload: PreviewPayload): Promise<void> {
  sessionMeta = {
    offsetMs: payload.offsetMs ?? null,
    difficulty: payload.difficulty ?? null,
    title: payload.title,
    lyricist: payload.lyricist,
    composer: payload.composer,
    arranger: payload.arranger,
    vocal: payload.vocal,
    scoreTitle: payload.scoreTitle,
    scoreCreator: payload.scoreCreator,
    customScoreInfo: payload.customScoreInfo,
  }
  sessionBgm = payload.bgmFile ? new Uint8Array(await payload.bgmFile.arrayBuffer()) : null
  sessionCover = payload.coverFile ? new Uint8Array(await payload.coverFile.arrayBuffer()) : null
  await loadBytes(new Uint8Array(await payload.file.arrayBuffer()), payload.file.name)
  renderSessionMeta()
}

/**
 * 进入预览页。第一次调用做初始化，之后只负责「显示 + 载入新谱」。
 * 传 payload 时按表单载入；不传时按 `?src=` 或下拉框载入。
 */
export async function mountPreview(payload?: PreviewPayload): Promise<void> {
  if (!booted) {
    booted = true
    booting = bootOnce()
  }
  await booting
  resize()
  if (payload) {
    await applyPayload(payload)
    return
  }
  if (!chart) {
    // 与旧版一致：`?bgm=` / `?cover=` 也能把音频与曲绘带进预览。
    const params = new URLSearchParams(location.search)
    const remoteBgm = params.get('bgm')
    const remoteCover = params.get('cover')
    if (remoteBgm && remoteBgm !== 'none') {
      try {
        const response = await fetch(remoteBgm)
        if (response.ok) sessionBgm = new Uint8Array(await response.arrayBuffer())
      } catch {
        /* 取不到就当没有 BGM */
      }
    }
    if (remoteCover && remoteCover !== 'none') {
      try {
        const response = await fetch(remoteCover)
        if (response.ok) sessionCover = new Uint8Array(await response.arrayBuffer())
      } catch {
        /* 同上 */
      }
    }
    await fetchLevelData(currentSource())
    renderSessionMeta()
  }
}

/** 离开预览页：停掉时钟与音源，避免后台继续跑 rAF / 动画。 */
export function pausePreview(): void {
  recorder.abort()
  stopWasmLoop()
  try {
    stage?.pause()
  } catch {
    /* 尚未初始化 */
  }
  field?.pause()
}
