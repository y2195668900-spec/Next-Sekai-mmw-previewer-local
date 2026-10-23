/**
 * WebCodecs 录屏（Phase 2）。
 *
 * 为什么不用 MediaRecorder：它把「帧到达的时间」当成帧的时间戳写进容器，
 * 渲染循环慢一点、定时器被挤晚一点，文件里的帧间隔就跟着抖，属性里看到的
 * 帧率只有 53 上下（详见 recorder.ts 顶部的说明）。要「文件恒为 60 帧」，
 * 时间戳就必须由我们自己按网格生成。
 *
 * 这条链路是：
 *
 *   WebGL 画布 ──drawImage──▶ 录制画布 ──VideoFrame(timestamp = n × 1e6/fps)──▶ VideoEncoder(H.264)
 *                                                                                   │
 *   wasm 音频 ──抽头──▶ MediaStreamTrackProcessor ──AudioData──▶ AudioEncoder(AAC)─┤
 *                                                                                   ▼
 *                                                                         mp4-muxer ──▶ .mp4
 *
 * 视频时间戳只由「第几帧」决定，所以文件是严格 CFR：渲染跟不上就复制上一帧
 * （同一张画布内容再取一次 VideoFrame），不会出现缺帧导致的 VFR。
 *
 * 音频时间戳不用音频轨道自己的时间戳，而是按「已写入多少采样」累加，这样
 * 暂停期间丢掉的采样不会在音轨里留下空洞，A/V 始终对齐。
 */

import { ArrayBufferTarget, Muxer } from 'mp4-muxer'

import {
  DEFAULT_RECORDING_FPS,
  RECORDING_TARGETS,
  ensureAudioTap,
  type RecordingFps,
  type RecordingResolution,
  type RecordingResult,
  type RecordingState,
} from './recorder'

/**
 * `MediaStreamTrackProcessor` 还没有进 TypeScript 的 DOM 类型库（Chrome 早就有实现），
 * 这里补一个最小声明，免得这个文件被单独类型检查时找不到名字。
 */
declare class MediaStreamTrackProcessor<T> {
  constructor(init: { track: MediaStreamTrack; maxBufferSize?: number })
  readonly readable: ReadableStream<T>
}

const AUDIO_BITS_PER_SECOND = 128_000

/** 关键帧间隔（秒）：2 秒一个 I 帧，拖动进度条时才不至于全程重解码。 */
const KEYFRAME_INTERVAL_SECONDS = 2

/**
 * 打包时允许一次补多少帧。主线程被长任务卡住时定时器会晚到，这里一次把欠下的
 * 帧都补上（同样的画面重复编码），超过上限就直接把网格对到当前时刻。
 */
const MAX_CATCHUP_FRAMES = 8

/** 按优先级尝试的 H.264 profile：High 4.2 覆盖 1080p60，其次 High 4.0 / Main 4.0。 */
const VIDEO_CODEC_CANDIDATES = ['avc1.64002a', 'avc1.640028', 'avc1.4d0028'] as const

export function isCodecsRecordingSupported(): boolean {
  return (
    typeof VideoEncoder !== 'undefined' &&
    typeof VideoFrame !== 'undefined' &&
    typeof AudioEncoder !== 'undefined'
  )
}

type VideoCodecChoice = {
  codec: string
  width: number
  height: number
  bitrate: number
  framerate: number
}

/**
 * 探测可用的 H.264 profile。
 *
 * `VideoEncoder.isConfigSupported()` 第一次调用要 2 秒上下（Chrome 会在这时初始化
 * 平台编码器），如果放在「开始录制」的点击路径上，用户点完要愣两秒才开始录。
 * 所以这里把结果缓存起来，并在进入预览页时提前预热（`prewarmCodecsRecording`）。
 */
const codecCache = new Map<string, Promise<string>>()

function codecKey(target: VideoCodecChoice): string {
  return `${target.width}x${target.height}@${target.framerate}`
}

function probeVideoCodec(target: VideoCodecChoice): Promise<string> {
  const key = codecKey(target)
  const cached = codecCache.get(key)
  if (cached) {
    return cached
  }
  const probe = (async () => {
    for (const codec of VIDEO_CODEC_CANDIDATES) {
      try {
        const support = await VideoEncoder.isConfigSupported({
          codec,
          width: target.width,
          height: target.height,
          bitrate: target.bitrate,
          framerate: target.framerate,
          avc: { format: 'avc' },
        })
        if (support.supported) {
          return codec
        }
      } catch {
        // 继续试下一个 profile
      }
    }
    throw new Error('当前浏览器没有可用的 H.264 编码器。')
  })()
  codecCache.set(key, probe)
  // 探测失败就把缓存清掉，下次点击还能重试。
  probe.catch(() => codecCache.delete(key))
  return probe
}

function pickVideoCodec(target: VideoCodecChoice): Promise<string> {
  return probeVideoCodec(target)
}

/**
 * 预热：进入预览页时先把 720p / 1080p 两个分辨率、60 / 30 两个帧率的编码器探测
 * 跑掉（并发，几十毫秒后完成）。这样点「开始录制」时只剩画布与编码器的实例化。
 */
export function prewarmCodecsRecording(): void {
  if (!isCodecsRecordingSupported()) {
    return
  }
  for (const target of Object.values(RECORDING_TARGETS)) {
    for (const fps of [60, 30] as RecordingFps[]) {
      void probeVideoCodec({
        codec: '',
        width: target.width,
        height: target.height,
        bitrate: target.videoBitsPerSecond,
        framerate: fps,
      }).catch(() => undefined)
    }
  }
}

export class CodecsPreviewRecorder {
  private stateValue: RecordingState = 'idle'

  private resolutionValue: RecordingResolution = 720

  private fpsValue: RecordingFps = DEFAULT_RECORDING_FPS

  private frameIntervalMs = 1000 / DEFAULT_RECORDING_FPS

  private sourceCanvas: HTMLCanvasElement | null = null

  private outputCanvas: HTMLCanvasElement | null = null

  private outputContext: CanvasRenderingContext2D | null = null

  /** 录制目标尺寸（`RECORDING_TARGETS`），渲染画布已被 resize 到同一尺寸。 */
  private targetWidth = 0

  private targetHeight = 0

  private videoEncoder: VideoEncoder | null = null

  private audioEncoder: AudioEncoder | null = null

  private muxer: Muxer<ArrayBufferTarget> | null = null

  private audioReader: ReadableStreamDefaultReader<AudioData> | null = null

  private audioPump: Promise<void> | null = null

  private audioOutUs = 0

  private accumulatedMs = 0

  private activeSinceMs = 0

  private captureClockStartMs = 0

  private captureFrameIndex = 0

  private capturedFramesTotal = 0

  private failure: string | null = null

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
    return 'mp4'
  }

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
    if (!isCodecsRecordingSupported()) {
      throw new Error('当前浏览器不支持 WebCodecs 录制。')
    }

    const target = RECORDING_TARGETS[options.resolution]
    const fps: RecordingFps = options.fps === 30 ? 30 : DEFAULT_RECORDING_FPS
    const frameIntervalMs = 1000 / fps

    const output = document.createElement('canvas')
    output.width = target.width
    output.height = target.height
    const outputContext = output.getContext('2d', { alpha: false })
    if (!outputContext) {
      throw new Error('无法创建录制画布。')
    }
    outputContext.fillStyle = '#000000'
    outputContext.fillRect(0, 0, target.width, target.height)

    const codec = await pickVideoCodec({
      codec: '',
      width: target.width,
      height: target.height,
      bitrate: target.videoBitsPerSecond,
      framerate: fps,
    })

    // 音频抽头：wasm 引擎自己建 AudioContext，录屏模块把 destination 连接改接到
    // 一个 tap GainNode，tap 同时喂扬声器和 MediaStreamAudioDestinationNode。
    const tap = options.audioContext ? ensureAudioTap(options.audioContext) : null
    const audioTrack = tap?.destination.stream.getAudioTracks()[0] ?? null
    const sampleRate = options.audioContext?.sampleRate ?? 48_000
    const channels = 2

    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: 'avc', width: target.width, height: target.height, frameRate: fps },
      audio: audioTrack ? { codec: 'aac', numberOfChannels: channels, sampleRate } : undefined,
      fastStart: 'in-memory',
    })

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (error) => {
        this.failure = error.message || '视频编码器出错。'
      },
    })
    videoEncoder.configure({
      codec,
      width: target.width,
      height: target.height,
      bitrate: target.videoBitsPerSecond,
      framerate: fps,
      avc: { format: 'avc' },
      latencyMode: 'quality',
    })

    let audioEncoder: AudioEncoder | null = null
    if (audioTrack && typeof MediaStreamTrackProcessor !== 'undefined') {
      try {
        audioEncoder = new AudioEncoder({
          output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
          error: (error) => {
            this.failure = error.message || '音频编码器出错。'
          },
        })
        audioEncoder.configure({
          codec: 'mp4a.40.2',
          sampleRate,
          numberOfChannels: channels,
          bitrate: AUDIO_BITS_PER_SECOND,
        })
      } catch {
        audioEncoder = null
      }
    }

    this.sourceCanvas = options.canvas
    this.outputCanvas = output
    this.outputContext = outputContext
    this.targetWidth = target.width
    this.targetHeight = target.height
    this.videoEncoder = videoEncoder
    this.audioEncoder = audioEncoder
    this.muxer = muxer
    this.audioOutUs = 0
    this.failure = null
    this.resolutionValue = options.resolution
    this.fpsValue = fps
    this.frameIntervalMs = frameIntervalMs
    this.accumulatedMs = 0
    this.captureFrameIndex = 0
    this.capturedFramesTotal = 0
    this.activeSinceMs = performance.now()
    this.captureClockStartMs = this.activeSinceMs
    this.stateValue = 'recording'

    if (audioTrack && audioEncoder && typeof MediaStreamTrackProcessor !== 'undefined') {
      const processor = new MediaStreamTrackProcessor<AudioData>({ track: audioTrack })
      const reader = processor.readable.getReader()
      this.audioReader = reader
      this.audioPump = this.runAudioPump(reader, audioEncoder)
    }
  }

  /**
   * 音频泵：每块 PCM 按「已写入采样数」重新打时间戳，暂停期间整块丢弃，
   * 这样音轨始终连续，不会因为暂停在文件里留下静音空洞。
   */
  private async runAudioPump(
    reader: ReadableStreamDefaultReader<AudioData>,
    encoder: AudioEncoder,
  ): Promise<void> {
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        if (this.stateValue === 'idle' || !this.audioEncoder) {
          value.close()
          break
        }
        if (this.stateValue === 'paused') {
          value.close()
          continue
        }
        const frames = value.numberOfFrames
        const channels = value.numberOfChannels
        const rate = value.sampleRate
        const pcm = new Float32Array(frames * channels)
        try {
          value.copyTo(pcm, { planeIndex: 0, format: 'f32' })
        } catch {
          value.close()
          continue
        }
        const stamp = this.audioOutUs
        this.audioOutUs += Math.round((frames / rate) * 1_000_000)
        const data = new AudioData({
          format: 'f32',
          sampleRate: rate,
          numberOfFrames: frames,
          numberOfChannels: channels,
          timestamp: stamp,
          data: pcm,
        })
        try {
          encoder.encode(data)
        } catch {
          // 编码器在 stop 之后可能已经关闭，忽略这一块即可。
        } finally {
          data.close()
          value.close()
        }
      }
    } catch {
      // 轨道结束时 read() 会抛，按正常收尾处理。
    }
  }

  /**
   * 渲染循环每帧调用一次：把录制画布刷成当前画面，并把网格上所有到期的帧
   * 都编码出去（欠几帧就补几帧重复画面）。
   */
  capture(): void {
    if (this.stateValue !== 'recording') {
      return
    }
    const now = performance.now()
    // 先数这一次要发几帧：渲染循环比 60 Hz 慢的时候，欠下的槽位用同一张画面补齐。
    let pending = 0
    while (pending < MAX_CATCHUP_FRAMES) {
      const due = this.captureClockStartMs + (this.captureFrameIndex + pending) * this.frameIntervalMs
      if (due > now + this.frameIntervalMs * 0.5) {
        break
      }
      pending += 1
    }
    if (pending === 0) {
      return
    }
    const source = this.sourceCanvas
    const output = this.outputCanvas
    const context = this.outputContext
    const encoder = this.videoEncoder
    if (!source || !output || !context || !encoder) {
      return
    }
    // 像素不搬家：补出来的帧用 VideoFrame 的元数据拷贝重新打时间戳。
    const firstIndex = this.captureFrameIndex
    const firstStamp = Math.round((firstIndex * 1_000_000) / this.fpsValue)
    const duration = Math.round(1_000_000 / this.fpsValue)
    // 首选直接从渲染画布取帧：渲染目标已被 resize 成录制尺寸，少一次整帧拷贝
    // （1080p 下 drawImage 本身就要几毫秒，整帧拷贝还会把主线程拖住）。
    // WebGL 画布没有 preserveDrawingBuffer，必须在渲染循环同一次任务里取。
    let baseFrame: VideoFrame | null = null
    if (source.width === this.targetWidth && source.height === this.targetHeight) {
      try {
        baseFrame = new VideoFrame(source, { timestamp: firstStamp, duration })
      } catch {
        baseFrame = null
      }
    }
    if (!baseFrame) {
      // 回退：先拷到 2D 画布再取帧（画布尺寸与录制目标不一致或浏览器拒绝直连时）。
      context.drawImage(source, 0, 0, output.width, output.height)
      try {
        baseFrame = new VideoFrame(output, { timestamp: firstStamp, duration })
      } catch {
        baseFrame = null
      }
    }
    if (!baseFrame) {
      return
    }
    try {
      for (let i = 0; i < pending; i += 1) {
        const index = firstIndex + i
        const stamp = Math.round((index * 1_000_000) / this.fpsValue)
        const frame = i === 0 ? baseFrame : new VideoFrame(baseFrame, { timestamp: stamp, duration })
        try {
          const keyFrame = index % Math.max(1, Math.round(this.fpsValue * KEYFRAME_INTERVAL_SECONDS)) === 0
          encoder.encode(frame, { keyFrame })
        } catch {
          this.failure = '视频编码器已关闭。'
          break
        } finally {
          if (i > 0) {
            frame.close()
          }
        }
        this.captureFrameIndex = index + 1
        this.capturedFramesTotal = this.captureFrameIndex
      }
    } finally {
      baseFrame.close()
    }
    if (pending >= MAX_CATCHUP_FRAMES) {
      // 仍然落后太多（后台标签页节流、长任务）：把网格对到当前时刻，不再无限补。
      this.captureClockStartMs = now - this.captureFrameIndex * this.frameIntervalMs
    }
  }

  pause(): void {
    if (this.stateValue !== 'recording') {
      return
    }
    this.accumulatedMs += performance.now() - this.activeSinceMs
    this.stateValue = 'paused'
  }

  resume(): void {
    if (this.stateValue !== 'paused') {
      return
    }
    const now = performance.now()
    // 视频时间戳只跟帧号走，所以恢复时把网格起点往后挪掉暂停的时长，
    // 下一帧立刻到期，文件里也不会出现时间跳变。
    this.captureClockStartMs = now - this.captureFrameIndex * this.frameIntervalMs
    this.activeSinceMs = now
    this.stateValue = 'recording'
  }

  async stop(): Promise<RecordingResult> {
    if (this.stateValue === 'idle') {
      throw new Error('当前没有在录制。')
    }
    if (this.stateValue === 'recording') {
      this.accumulatedMs += performance.now() - this.activeSinceMs
    }
    const durationMs = this.accumulatedMs
    const resolution = this.resolutionValue
    const fps = this.fpsValue
    this.stateValue = 'idle'

    const videoEncoder = this.videoEncoder
    const audioEncoder = this.audioEncoder
    const muxer = this.muxer
    const reader = this.audioReader
    const pump = this.audioPump
    this.videoEncoder = null
    this.audioEncoder = null
    this.muxer = null
    this.audioReader = null
    this.audioPump = null

    try {
      if (reader) {
        try {
          await reader.cancel()
        } catch {
          // 已经结束的轨道会抛，忽略。
        }
      }
      if (pump) {
        await pump
      }
      if (audioEncoder) {
        if (audioEncoder.state !== 'closed') {
          await audioEncoder.flush()
          audioEncoder.close()
        }
      }
      if (videoEncoder) {
        if (videoEncoder.state !== 'closed') {
          await videoEncoder.flush()
          videoEncoder.close()
        }
      }
      muxer?.finalize()
    } catch (error) {
      this.resetSession()
      throw new Error((error as Error).message || '录制收尾失败。')
    }

    const failure = this.failure
    this.resetSession()
    if (failure) {
      throw new Error(failure)
    }
    const buffer = muxer?.target.buffer
    const bytes = buffer ? buffer.byteLength : 0
    if (!bytes) {
      throw new Error('录制失败：没有得到任何视频数据。')
    }
    if (this.capturedFramesTotal < Math.max(2, fps / 10)) {
      throw new Error('录制时间太短了，请录制 1 秒以上。')
    }
    return {
      blob: new Blob([buffer as ArrayBuffer], { type: 'video/mp4' }),
      extension: 'mp4',
      durationMs,
      resolution,
      fps,
    }
  }

  abort(): void {
    this.stateValue = 'idle'
    void this.teardown()
    this.resetSession()
  }

  private async teardown(): Promise<void> {
    try {
      await this.audioReader?.cancel()
    } catch {
      // 忽略
    }
    try {
      if (this.audioEncoder && this.audioEncoder.state !== 'closed') {
        this.audioEncoder.close()
      }
    } catch {
      // 忽略
    }
    try {
      if (this.videoEncoder && this.videoEncoder.state !== 'closed') {
        this.videoEncoder.close()
      }
    } catch {
      // 忽略
    }
  }

  private resetSession(): void {
    this.sourceCanvas = null
    this.outputCanvas = null
    this.outputContext = null
    this.captureFrameIndex = 0
    this.accumulatedMs = 0
    this.activeSinceMs = 0
    this.audioOutUs = 0
    this.failure = null
    this.stateValue = 'idle'
  }
}
