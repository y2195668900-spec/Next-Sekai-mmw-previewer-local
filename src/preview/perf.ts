/**
 * 帧时间探针（Phase 0 / 性能量化）。
 *
 * 只做测量，不改渲染路径：
 * - `onFrame(now)`：用 `requestAnimationFrame` 的时间戳算真实帧间隔；
 * - `timeRender(fn)`：包住一次 `renderPlayerFrame()`，量 JS 侧的提交耗时；
 * - 同时用 `EXT_disjoint_timer_query_webgl2` 量这几帧的 GPU 时间（异步取回，
 *   落后 1~3 帧，统计上是无偏的），拿不到扩展时 GPU 相关字段为 null。
 *
 * 结果按滚动窗口保存，`snapshot()` 给出 p50 / p95 / max，供诊断面板与
 * 自动化测量脚本读取。
 */

const MAX_SAMPLES = 600

/** 只看性能的帧时间里，超过这个值就算一次卡顿。 */
const STUTTER_FRAME_MS = 20

export interface PerfSnapshot {
  /** 采样帧数（不含第一帧，因为没有前一帧间隔）。 */
  frames: number
  /** 平均帧率（按采样时长算）。 */
  fps: number
  /** 帧间隔 p50 / p95 / max（毫秒）。 */
  frameP50: number
  frameP95: number
  frameMax: number
  /** 卡顿帧数（间隔 > 20 ms）。 */
  stutters: number
  /** `renderPlayerFrame()` 的 JS 侧耗时 p50 / p95（毫秒）。 */
  cpuP50: number
  cpuP95: number
  /** GPU 时间 p50 / p95（毫秒），拿不到计时扩展时为 null。 */
  gpuP50: number | null
  gpuP95: number | null
  gpuSamples: number
  /** 画布尺寸与设备像素比。 */
  width: number
  height: number
  dpr: number
  /** WebGL 报告的后端名称。 */
  glRenderer: string
}

interface PendingQuery {
  query: WebGLQuery
  frame: number
}

function percentile(values: readonly number[], ratio: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * ratio)))
  return sorted[index]!
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export class FrameProfiler {
  private gl: WebGL2RenderingContext | null = null
  private timerExt: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null = null
  private canvas: HTMLCanvasElement | null = null
  private readonly frameTimes: number[] = []
  private readonly cpuTimes: number[] = []
  private readonly gpuTimes: number[] = []
  private readonly pending: PendingQuery[] = []
  private readonly freeQueries: WebGLQuery[] = []
  private lastFrameAt = 0
  private frames = 0
  private stutters = 0
  private activeQuery: WebGLQuery | null = null
  private glRenderer = 'unknown'

  /** 绑定画布并取回它已经在用的 WebGL2 上下文（同一个对象，不会重建）。 */
  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    const gl = (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ?? null
    this.gl = gl
    if (!gl) return
    this.timerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2') as
      | { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }
      | null
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info') as
      | { UNMASKED_RENDERER_WEBGL: number }
      | null
    if (debugInfo) {
      const name = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      if (typeof name === 'string') this.glRenderer = name
    }
  }

  /** 每帧开头调用，参数是 rAF 的时间戳。 */
  onFrame(now: number): void {
    if (this.lastFrameAt > 0) {
      const interval = now - this.lastFrameAt
      if (interval > 0 && interval < 5000) {
        push(this.frameTimes, interval)
        this.frames += 1
        if (interval > STUTTER_FRAME_MS) this.stutters += 1
      }
    }
    this.lastFrameAt = now
    this.pollQueries()
  }

  /** 在这里面调用 `renderPlayerFrame()`：同时量 CPU 耗时并包一层 GPU 计时查询。 */
  timeRender(render: () => void): void {
    const gl = this.gl
    const ext = this.timerExt
    let query: WebGLQuery | null = null
    if (gl && ext) {
      query = this.freeQueries.pop() ?? gl.createQuery()
      if (query) {
        try {
          gl.beginQuery(ext.TIME_ELAPSED_EXT, query)
          this.activeQuery = query
        } catch {
          query = null
          this.activeQuery = null
        }
      }
    }
    const started = performance.now()
    try {
      render()
    } finally {
      const elapsed = performance.now() - started
      push(this.cpuTimes, elapsed)
      if (gl && ext && query && this.activeQuery === query) {
        gl.endQuery(ext.TIME_ELAPSED_EXT)
        this.pending.push({ query, frame: this.frames })
        this.activeQuery = null
      }
    }
  }

  /** 画布尺寸变化后调用，保证报告里的分辨率是最新的。 */
  noteViewport(dpr: number): void {
    if (this.canvas) this.canvas.dataset.perfDpr = String(dpr)
  }

  reset(): void {
    this.frameTimes.length = 0
    this.cpuTimes.length = 0
    this.gpuTimes.length = 0
    this.frames = 0
    this.stutters = 0
    this.lastFrameAt = 0
  }

  snapshot(): PerfSnapshot {
    const canvas = this.canvas
    const dprValue = canvas?.dataset.perfDpr
    return {
      frames: this.frames,
      fps: this.frameTimes.length > 0 ? 1000 / mean(this.frameTimes) : 0,
      frameP50: percentile(this.frameTimes, 0.5),
      frameP95: percentile(this.frameTimes, 0.95),
      frameMax: this.frameTimes.length > 0 ? Math.max(...this.frameTimes) : 0,
      stutters: this.stutters,
      cpuP50: percentile(this.cpuTimes, 0.5),
      cpuP95: percentile(this.cpuTimes, 0.95),
      gpuP50: this.gpuTimes.length > 0 ? percentile(this.gpuTimes, 0.5) : null,
      gpuP95: this.gpuTimes.length > 0 ? percentile(this.gpuTimes, 0.95) : null,
      gpuSamples: this.gpuTimes.length,
      width: canvas?.width ?? 0,
      height: canvas?.height ?? 0,
      dpr: dprValue ? Number(dprValue) : Number(window.devicePixelRatio || 1),
      glRenderer: this.glRenderer,
    }
  }

  /** 诊断面板上的一行文字。 */
  describe(): string {
    const snap = this.snapshot()
    if (snap.frames === 0) return '性能      等待采样…'
    const gpu =
      snap.gpuP50 === null
        ? ' GPU 计时不可用'
        : ` GPU p50 ${snap.gpuP50.toFixed(2)} / p95 ${snap.gpuP95!.toFixed(2)} ms（${snap.gpuSamples} 帧）`
    return (
      `性能      ${snap.fps.toFixed(1)} fps · 帧间隔 p50 ${snap.frameP50.toFixed(1)} / p95 ${snap.frameP95.toFixed(1)} / max ${snap.frameMax.toFixed(1)} ms · 卡顿 ${snap.stutters}\n` +
      `          CPU 提交 p50 ${snap.cpuP50.toFixed(2)} / p95 ${snap.cpuP95.toFixed(2)} ms${gpu}\n` +
      `          画布 ${snap.width}×${snap.height} @${snap.dpr} · ${snap.glRenderer}`
    )
  }

  private pollQueries(): void {
    const gl = this.gl
    const ext = this.timerExt
    if (!gl || !ext) return
    const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT) as boolean
    for (let i = this.pending.length - 1; i >= 0; i -= 1) {
      const item = this.pending[i]!
      const available = gl.getQueryParameter(item.query, gl.QUERY_RESULT_AVAILABLE) as boolean
      if (!available) continue
      const elapsedNs = gl.getQueryParameter(item.query, gl.QUERY_RESULT) as number
      this.pending.splice(i, 1)
      this.freeQueries.push(item.query)
      if (disjoint) continue // GPU 时钟被别的进程打断，这一帧的数字不可信
      const ms = elapsedNs / 1e6
      if (ms > 0 && ms < 1000) push(this.gpuTimes, ms)
    }
  }
}

function push(list: number[], value: number): void {
  list.push(value)
  if (list.length > MAX_SAMPLES) list.shift()
}
