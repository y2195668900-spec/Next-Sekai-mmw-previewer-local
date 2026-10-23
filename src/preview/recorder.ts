/**
 * Preview canvas recorder（回退路径）。
 *
 * 优先使用 `codecsRecorder.ts` 里的 WebCodecs 实现（视频时间戳按帧号生成，文件是
 * 严格 CFR）。这个文件保留 MediaRecorder 实现，给没有 WebCodecs 的浏览器兜底；
 * 它的时间戳由浏览器按「帧到达时间」决定，帧率会跟着渲染速度漂。
 *
 * The preview is drawn by the wasm player into a WebGL canvas whose backing
 * store follows the CSS panel size. To record at a fixed 720p / 1080p the
 * player is temporarily resized to the requested resolution (see
 * `applyRenderSize` in previewApp.ts) and every rendered frame is copied into an
 * offscreen 2D canvas that feeds `MediaRecorder` through `captureStream(0)` +
 * `requestFrame()`.
 *
 * Frame pacing: the canvas copy happens in the render loop (the WebGL drawing
 * buffer is only readable inside that task), but the `requestFrame()` calls are
 * driven by a dedicated 60 Hz clock, NOT by `requestAnimationFrame`. MediaRecorder
 * timestamps every captured frame with the wall clock at capture time, so a
 * capture loop that follows the display ends up writing a variable frame rate:
 * a 54 fps render loop or a 120/144 Hz display both produce uneven sample
 * durations, and every skipped slot shows up as a 33 ms hole. The clock keeps
 * the media timeline at exactly 60 samples per second and re-captures the last
 * canvas content when the renderer could not deliver a new one, so slow frames
 * become duplicated frames instead of gaps.
 *
 * Audio comes from the wasm audio transport. That transport creates its own
 * `AudioContext` and routes every source into `context.destination`; we patch
 * `AudioNode.prototype.connect` so destination connections are redirected into
 * a tap gain node that feeds both the speakers and a
 * `MediaStreamAudioDestinationNode`. The patch is installed when this module is
 * imported, which happens before the wasm engine creates its first audio node.
 *
 * 移植自旧版 `src/lib/recorder.ts`；唯一差别是保存方式——旧版 POST 给 Vite 插件
 * 写进 `video/`，新版没有该端点，直接下载到浏览器默认目录。
 */

export type RecordingResolution = 720 | 1080

/**
 * 录制帧率。文件属性里显示的帧率就是这个数，所以它必须由用户显式选，
 * 不能跟着渲染循环的实际速度漂（那正是「录出来只有 53 帧」的原因）。
 */
export type RecordingFps = 30 | 60

export const RECORDING_FPS_OPTIONS: RecordingFps[] = [60, 30]

export const DEFAULT_RECORDING_FPS: RecordingFps = 60

export type RecordingState = 'idle' | 'recording' | 'paused'

export type RecordingTarget = {
  width: number
  height: number
  videoBitsPerSecond: number
  label: string
}

export const RECORDING_TARGETS: Record<RecordingResolution, RecordingTarget> = {
  720: { width: 1280, height: 720, videoBitsPerSecond: 6_000_000, label: '720p' },
  1080: { width: 1920, height: 1080, videoBitsPerSecond: 12_000_000, label: '1080p' },
}

export type RecordingResult = {
  blob: Blob
  extension: 'mp4' | 'webm'
  durationMs: number
  resolution: RecordingResolution
  fps: RecordingFps
}

export type SavedRecording = {
  fileName: string
  path: string | null
  bytes: number
  savedToWorkspace: boolean
}

type MimeSelection = {
  mimeType: string
  extension: 'mp4' | 'webm'
}

const AUDIO_BITS_PER_SECOND = 128_000

/**
 * Chrome's MP4 muxer does not emit a decodable video track for recordings
 * shorter than about a second: the resulting file has audio only and reports
 * `videoWidth = 0`, so the clip cannot be replayed as a video at all. Refuse
 * those instead of writing a broken file; the caller turns the thrown message
 * into a status hint. `MIN_RECORDING_DURATION_MS` is the fast path for
 * obviously too-short takes, `probeRecordedVideo` is the authoritative check.
 */
const MIN_RECORDING_DURATION_MS = 500
const RECORDING_PROBE_TIMEOUT_MS = 5000

/**
 * 录制期间把画面拷进录制画布的节拍上限：按帧间隔的 80% 控制。
 * 高刷屏（120 / 144 Hz）不该每帧都做一次全分辨率 blit，编码器本来也只按
 * frameInterval 取样。
 */
const RECORDING_BLIT_INTERVAL_FACTOR = 0.8

/**
 * 一次节拍最多补发多少帧。
 *
 * MediaRecorder 按「帧到达时间」写时间戳（自己塞 VideoFrame 时间戳也会被改写，
 * 见 .t-rec/probe3 的实测），所以文件里每秒有多少个采样点，完全取决于我们每秒
 * 真正调用 `requestFrame()` 多少次。主线程被渲染循环占满时定时器每秒只能被唤醒
 * 50 次上下 —— 这正是「文件属性显示 53 帧」的成因。因此每次唤醒都要把欠下的帧
 * 全部补发（内容没更新就重复上一帧），把每秒采样点补满 fps 个。
 *
 * 落后太多（后台标签页节流、长任务）时不再补发，而是把网格重新对到当前时刻，
 * 免得一口气推上千帧。
 */
const RECORDING_MAX_CATCHUP_FRAMES = 10

// MP4/H.264 + AAC first: the required container, and Chrome supports it.
// WebM stays as a fallback for browsers without MP4 encoder support.
const MIME_CANDIDATES: MimeSelection[] = [
  { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', extension: 'mp4' },
  { mimeType: 'video/mp4;codecs=avc1.4D401F,mp4a.40.2', extension: 'mp4' },
  { mimeType: 'video/mp4;codecs=avc1.640028,mp4a.40.2', extension: 'mp4' },
  { mimeType: 'video/mp4', extension: 'mp4' },
  { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
  { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
  { mimeType: 'video/webm', extension: 'webm' },
]

type AudioTap = {
  input: GainNode
  destination: MediaStreamAudioDestinationNode
}

const audioTaps = new WeakMap<AudioContext, AudioTap>()
let originalAudioNodeConnect: ((this: AudioNode, ...args: never[]) => unknown) | null = null
let insideTapSetup = false
let connectPatchInstalled = false

function installAudioTapPatch() {
  if (connectPatchInstalled) {
    return
  }
  if (typeof AudioNode === 'undefined' || typeof AudioDestinationNode === 'undefined') {
    return
  }
  connectPatchInstalled = true
  const prototype = AudioNode.prototype as unknown as { connect: (...args: never[]) => unknown }
  const originalConnect = prototype.connect
  originalAudioNodeConnect = originalConnect
  prototype.connect = function patchedConnect(this: AudioNode, ...args: never[]) {
    if (!insideTapSetup) {
      const target: unknown = args[0]
      if (target instanceof AudioDestinationNode) {
        const tap = ensureAudioTap(target.context as AudioContext)
        if (tap) {
          return originalConnect.apply(this, [tap.input, ...args.slice(1)] as unknown as never[])
        }
      }
    }
    return originalConnect.apply(this, args)
  } as typeof prototype.connect
}

export function ensureAudioTap(context: AudioContext): AudioTap | null {
  const cached = audioTaps.get(context)
  if (cached) {
    return cached
  }
  try {
    const input = context.createGain()
    input.gain.value = 1
    const destination = context.createMediaStreamDestination()
    // Bypass the patched connect while wiring the tap itself, otherwise
    // `input.connect(context.destination)` would recurse into this function.
    insideTapSetup = true
    try {
      input.connect(context.destination)
      input.connect(destination)
    } finally {
      insideTapSetup = false
    }
    const tap: AudioTap = { input, destination }
    audioTaps.set(context, tap)
    return tap
  } catch {
    insideTapSetup = false
    return null
  }
}

installAudioTapPatch()

function pickMimeSelection(): MimeSelection | null {
  if (typeof MediaRecorder === 'undefined') {
    return null
  }
  for (const candidate of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate
    }
  }
  return null
}

export function isRecordingSupported(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    pickMimeSelection() !== null
  )
}

function formatTimestamp(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}${hours}${minutes}${seconds}`
}

/**
 * Shares its shape with `buildFileName` in scripts/recording-plugin.mjs:
 * `pjsk-viewer-<resolution>-<YYYYMMDDhhmmss>.<ext>`, e.g.
 * `pjsk-viewer-1080p-20261019194630.mp4`. Used for the browser-download fallback
 * (the server assigns the real name when the workspace write succeeds).
 */
function buildRecordingFileName(resolution: RecordingResolution, extension: 'mp4' | 'webm') {
  return `pjsk-viewer-${RECORDING_TARGETS[resolution].label}-${formatTimestamp(new Date())}.${extension}`
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * 保存录制结果：直接交给浏览器下载。
 *
 * 旧版把文件 POST 到 Vite 插件的 `/__mmw/recording` 写进 `<project>/video`；
 * 新版是静态服务器（serve.mjs / exe），没有写入端点，所以统一走下载
 * —— 文件名保持旧版格式 `pjsk-viewer-<720p|1080p>-<时间戳>.<mp4|webm>`。
 */
export async function saveRecording(result: RecordingResult): Promise<SavedRecording> {
  const fileName = buildRecordingFileName(result.resolution, result.extension)
  downloadBlob(result.blob, fileName)
  return { fileName, path: null, bytes: result.blob.size, savedToWorkspace: false }
}

/**
 * Loads the finished blob back into a detached `<video>` and checks that the
 * container really carries a decodable video track. Chrome happily produces an
 * audio-only MP4 when the clip is very short, and such a file looks fine to the
 * user until they try to play it; catching it here keeps broken files out of
 * `video/`.
 */
function probeRecordedVideo(blob: Blob): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const video = document.createElement('video')
    let settled = false
    const finish = (result: boolean) => {
      if (settled) {
        return
      }
      settled = true
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      resolve(result)
    }
    video.muted = true
    video.preload = 'metadata'
    video.addEventListener('loadedmetadata', () => finish(video.videoWidth > 0 && video.videoHeight > 0), {
      once: true,
    })
    video.addEventListener('error', () => finish(false), { once: true })
    window.setTimeout(() => finish(false), RECORDING_PROBE_TIMEOUT_MS)
    video.src = url
  })
}

export class PreviewRecorder {
  private stateValue: RecordingState = 'idle'

  private resolutionValue: RecordingResolution = 720

  /** 本次录制选定的帧率（30 / 60），决定采集网格的间隔。 */
  private fpsValue: RecordingFps = DEFAULT_RECORDING_FPS

  /** 一帧在采集网格上的间隔（毫秒）：1000 / fps。 */
  private frameIntervalMs = 1000 / DEFAULT_RECORDING_FPS

  private extensionValue: 'mp4' | 'webm' = 'mp4'

  private mimeTypeValue = ''

  private sourceCanvas: HTMLCanvasElement | null = null

  private outputCanvas: HTMLCanvasElement | null = null

  private outputContext: CanvasRenderingContext2D | null = null

  private videoTrack: CanvasCaptureMediaStreamTrack | null = null

  private stream: MediaStream | null = null

  private audioTrack: MediaStreamTrack | null = null

  private recorder: MediaRecorder | null = null

  private chunks: Blob[] = []

  private accumulatedMs = 0

  private activeSinceMs = 0

  /** Wall-clock anchor of the 60 Hz capture clock; frame n is due at start + n/60. */
  private captureClockStartMs = 0

  /** Index of the next frame on the capture clock. */
  private captureFrameIndex = 0

  private captureTimer: number | null = null

  /** 本次录制累计送进编码器的帧数（暂停后不清零，用于帧率读数）。 */
  private capturedFramesTotal = 0

  private lastBlitMs = 0

  get state(): RecordingState {
    return this.stateValue
  }

  get resolution(): RecordingResolution {
    return this.resolutionValue
  }

  get fps(): RecordingFps {
    return this.fpsValue
  }

  get extension(): 'mp4' | 'webm' {
    return this.extensionValue
  }

  /** 已经交给编码器的帧数，用来在 UI 上显示真实录制帧率。 */
  get capturedFrames(): number {
    return this.capturedFramesTotal
  }

  get elapsedMs(): number {
    if (this.stateValue !== 'recording') {
      return this.accumulatedMs
    }
    return this.accumulatedMs + (performance.now() - this.activeSinceMs)
  }

  async start(options: {
    resolution: RecordingResolution
    fps?: RecordingFps
    canvas: HTMLCanvasElement
    audioContext: AudioContext | null
  }): Promise<void> {
    if (this.stateValue !== 'idle') {
      throw new Error('录制已在进行中。')
    }
    const selection = pickMimeSelection()
    if (!selection || typeof HTMLCanvasElement.prototype.captureStream !== 'function') {
      throw new Error('当前浏览器不支持画布录制。')
    }

    const target = RECORDING_TARGETS[options.resolution]
    const output = document.createElement('canvas')
    output.width = target.width
    output.height = target.height
    const outputContext = output.getContext('2d', { alpha: false })
    if (!outputContext) {
      throw new Error('无法创建录制画布。')
    }
    outputContext.fillStyle = '#000000'
    outputContext.fillRect(0, 0, target.width, target.height)

    const stream = output.captureStream(0)
    const videoTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined
    if (!videoTrack || typeof videoTrack.requestFrame !== 'function') {
      throw new Error('无法创建视频轨道。')
    }

    let audioTrack: MediaStreamTrack | null = null
    if (options.audioContext) {
      const tap = ensureAudioTap(options.audioContext)
      audioTrack = tap?.destination.stream.getAudioTracks()[0] ?? null
      if (audioTrack) {
        stream.addTrack(audioTrack)
      }
    }

    const recorder = new MediaRecorder(stream, {
      mimeType: selection.mimeType,
      videoBitsPerSecond: target.videoBitsPerSecond,
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    })
    const chunks: Blob[] = []
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    })

    this.sourceCanvas = options.canvas
    this.outputCanvas = output
    this.outputContext = outputContext
    this.videoTrack = videoTrack
    this.stream = stream
    this.audioTrack = audioTrack
    this.recorder = recorder
    this.chunks = chunks
    this.extensionValue = selection.extension
    this.mimeTypeValue = selection.mimeType
    this.resolutionValue = options.resolution
    this.fpsValue = options.fps === 30 ? 30 : DEFAULT_RECORDING_FPS
    this.frameIntervalMs = 1000 / this.fpsValue
    this.accumulatedMs = 0
    this.capturedFramesTotal = 0
    this.activeSinceMs = performance.now()
    this.stateValue = 'recording'
    // No timeslice: MediaRecorder then emits exactly one cluster per file. With
    // a timeslice the very first chunk is only finalised after the interval has
    // elapsed, so a recording shorter than the interval loses its opening
    // fragment and the saved file has no decodable video track at all.
    recorder.start()
    this.resetCaptureClock()
  }

  /**
   * 重启采集时钟：第 n 帧在 `start + n / fps` 到期，所以节拍本身不会累积漂移，
   * 定时器只决定「什么时候把当前画面交给编码器」。
   */
  private resetCaptureClock() {
    this.clearCaptureTimer()
    this.captureClockStartMs = performance.now()
    this.captureFrameIndex = 0
    // Force the first render loop iteration to blit.
    this.lastBlitMs = Number.NEGATIVE_INFINITY
    this.scheduleCaptureTick()
  }

  private scheduleCaptureTick() {
    const dueAt = this.captureClockStartMs + this.captureFrameIndex * this.frameIntervalMs
    const delay = Math.max(0, dueAt - performance.now())
    this.captureTimer = window.setTimeout(() => this.onCaptureTick(), delay)
  }

  private onCaptureTick() {
    this.captureTimer = null
    const track = this.videoTrack
    if (this.stateValue !== 'recording' || !track) {
      return
    }
    const now = performance.now()
    const output = this.outputCanvas
    const context = this.outputContext
    // 补帧：把网格上所有已到期的帧一次发完。主线程被渲染循环占满时定时器每秒
    // 只能唤醒约 50 次，若每次只发一帧，文件里每秒就只有 50 个采样点（旧版本
    // 录出来 53 帧就是这么来的）；这里把欠下的帧全部补上，采样点密度才对得上
    // 用户选的 fps。
    for (let emitted = 0; emitted < RECORDING_MAX_CATCHUP_FRAMES; emitted += 1) {
      const dueAt = this.captureClockStartMs + this.captureFrameIndex * this.frameIntervalMs
      if (dueAt > now + this.frameIntervalMs * 0.5) {
        break
      }
      // 取出画布当前内容；渲染循环没来得及更新时就是重复上一帧。
      //
      // 这 1×1 自我拷贝是必需的：Chrome 会丢掉「不会改变画布」的 requestFrame，
      // 重复帧因此根本不会进编码器 —— 渲染一慢就直接变成缺帧 + 可变帧率。
      // 把 1 个像素画到自己身上视觉上等于没动，但会给画布一个 damage 矩形，
      // 让补出来的重复帧真的被编码。
      if (output && context) {
        context.drawImage(output, 0, 0, 1, 1, 0, 0, 1, 1)
      }
      track.requestFrame()
      this.captureFrameIndex += 1
      this.capturedFramesTotal += 1
    }
    // 落后太多（后台标签页节流 / 长任务）时不硬补，直接把网格对到当前时刻。
    const behindMs = now - (this.captureClockStartMs + this.captureFrameIndex * this.frameIntervalMs)
    if (behindMs > this.frameIntervalMs * RECORDING_MAX_CATCHUP_FRAMES) {
      this.captureClockStartMs = now - this.captureFrameIndex * this.frameIntervalMs
    }
    this.scheduleCaptureTick()
  }

  private clearCaptureTimer() {
    if (this.captureTimer !== null) {
      window.clearTimeout(this.captureTimer)
      this.captureTimer = null
    }
  }

  /**
   * True when the renderer should draw this frame.
   *
   * 录制时只需要每秒 fps 张画面，120 / 144 Hz 的屏幕没必要每一帧都渲染 + 拷贝。
   * 不在录制中时调用方总是渲染。
   */
  frameDue(): boolean {
    if (this.stateValue !== 'recording') {
      return true
    }
    return performance.now() - this.lastBlitMs >= this.frameIntervalMs * RECORDING_BLIT_INTERVAL_FACTOR
  }

  /**
   * Copies the current preview frame into the recording canvas. Must be called
   * synchronously after the player renders, while the WebGL drawing buffer is
   * still valid (the preview canvas has no `preserveDrawingBuffer`).
   *
   * This only stages pixels; handing them to the encoder is the capture clock's
   * job (`onCaptureTick`). The copy itself is capped to ~60 per second so a high
   * refresh display does not pay for a full-resolution blit it will never use.
   */
  capture() {
    if (this.stateValue !== 'recording') {
      return
    }
    const now = performance.now()
    if (now - this.lastBlitMs < this.frameIntervalMs * RECORDING_BLIT_INTERVAL_FACTOR) {
      return
    }
    const source = this.sourceCanvas
    const output = this.outputCanvas
    const outputContext = this.outputContext
    if (!source || !output || !outputContext || source.width < 1 || source.height < 1) {
      return
    }
    this.lastBlitMs = now
    outputContext.drawImage(source, 0, 0, output.width, output.height)
  }

  pause() {
    if (this.stateValue !== 'recording' || !this.recorder) {
      return
    }
    this.accumulatedMs += performance.now() - this.activeSinceMs
    this.clearCaptureTimer()
    this.recorder.pause()
    this.stateValue = 'paused'
  }

  resume() {
    if (this.stateValue !== 'paused' || !this.recorder) {
      return
    }
    this.activeSinceMs = performance.now()
    this.recorder.resume()
    this.stateValue = 'recording'
    // MediaRecorder freezes the media timeline while paused, so the clock is
    // simply re-anchored to "now" instead of trying to make up the pause.
    this.resetCaptureClock()
  }

  async stop(): Promise<RecordingResult> {
    const recorder = this.recorder
    if (!recorder || this.stateValue === 'idle') {
      throw new Error('当前没有进行中的录制。')
    }
    if (this.stateValue === 'recording') {
      this.accumulatedMs += performance.now() - this.activeSinceMs
    }
    this.clearCaptureTimer()
    const durationMs = this.accumulatedMs
    const extension = this.extensionValue
    const resolution = this.resolutionValue
    const fps = this.fpsValue
    const mimeType = this.mimeTypeValue || 'video/mp4'

    const blob = await new Promise<Blob>((resolve, reject) => {
      const onStop = () => {
        recorder.removeEventListener('stop', onStop)
        resolve(new Blob(this.chunks, { type: mimeType }))
      }
      recorder.addEventListener('stop', onStop)
      recorder.addEventListener(
        'error',
        () => {
          recorder.removeEventListener('stop', onStop)
          reject(new Error('录制失败。'))
        },
        { once: true },
      )
      try {
        recorder.stop()
      } catch (error) {
        recorder.removeEventListener('stop', onStop)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })

    this.release()
    if (durationMs < MIN_RECORDING_DURATION_MS) {
      throw new Error('录制时间太短，未保存文件。请录制 2 秒以上。')
    }
    if (!(await probeRecordedVideo(blob))) {
      throw new Error('录制文件过短，浏览器未能写出有效的视频轨，未保存文件。请录制 2 秒以上。')
    }
    return { blob, extension, durationMs, resolution, fps }
  }

  /** Stops without producing a file, used when the page is being unloaded. */
  abort() {
    if (this.recorder && this.stateValue !== 'idle') {
      try {
        this.recorder.stop()
      } catch {
        // Ignore: the page is going away.
      }
    }
    this.release()
  }

  private release() {
    this.clearCaptureTimer()
    const stream = this.stream
    if (stream) {
      if (this.audioTrack && this.audioTrack.readyState === 'live') {
        stream.removeTrack(this.audioTrack)
      }
      stream.getTracks().forEach((track) => {
        if (track !== this.audioTrack) {
          track.stop()
        }
      })
    }
    this.stateValue = 'idle'
    this.sourceCanvas = null
    this.outputCanvas = null
    this.outputContext = null
    this.videoTrack = null
    this.stream = null
    this.audioTrack = null
    this.recorder = null
    this.chunks = []
    this.accumulatedMs = 0
    this.activeSinceMs = 0
  }
}
