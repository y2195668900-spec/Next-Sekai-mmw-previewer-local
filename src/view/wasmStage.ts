/**
 * 旧版 wasm 渲染器的宿主。
 *
 * 只做「装载 + 驱动」，不改渲染逻辑：谱面由 `bridge/customScore.ts` 转成
 * `CustomScoreJson` 后交给 `loadCustomScoreJsonSession`，之后每帧 `renderPlayerFrame()`。
 *
 * 为什么不用旧版 `src/lib/mmwWasm.ts`：
 *  - 它 `import('../generated/mmwWasmAsset')`，产物路径写死在旧仓库；
 *  - 它引用 `import.meta.env.DEV`，在 IIFE 包里没有意义。
 * 这里保留同样的 ccall 协议，接口收敛到本工程需要的那几个。
 */

import createModule from '../../vendor/wasm/mmw-preview.js'

type EmscriptenModule = {
  HEAPU8: Uint8Array
  ccall: (
    ident: string,
    returnType: string | null,
    argTypes: string[],
    args: unknown[],
    opts?: { async?: boolean },
  ) => unknown
  _malloc: (size: number) => number
  _free: (ptr: number) => void
}

type ModuleFactory = (options: {
  locateFile: (file: string) => string
  print?: (...args: unknown[]) => void
  printErr?: (...args: unknown[]) => void
}) => Promise<EmscriptenModule>

export type StageConfig = {
  mirror: boolean
  flickAnimation: boolean
  holdAnimation: boolean
  simultaneousLine: boolean
  effectProfile: 0 | 1
  noteSkin: number
  noteColor: number
  specialNoteColors: boolean
  damageSound: boolean
  noteSpeed: number
  holdAlpha: number
  guideAlpha: number
  stageCover: number
  stageOpacity: number
  backgroundBrightness: number
  effectOpacity: number
}

export const DEFAULT_STAGE_CONFIG: StageConfig = {
  mirror: false,
  flickAnimation: true,
  holdAnimation: true,
  simultaneousLine: true,
  effectProfile: 0,
  noteSkin: 0,
  noteColor: 0,
  specialNoteColors: false,
  damageSound: false,
  noteSpeed: 10.5,
  holdAlpha: 0.74,
  guideAlpha: 0.5,
  stageCover: 0,
  stageOpacity: 1,
  backgroundBrightness: 1,
  effectOpacity: 1,
}

export type StageSnapshot = {
  currentTimeSec: number
  durationSec: number
  chartEndSec: number
  effectiveLeadInSec: number
  transportState: 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error'
  requiresGesture: boolean
  hasAudio: boolean
  warnings: string
}

export type AudioManifest = {
  base: string
  assets: string[]
  fonts: string[]
  sounds: Record<string, string>
}

const TRANSPORT_STATES: StageSnapshot['transportState'][] = [
  'idle',
  'loading',
  'ready',
  'playing',
  'paused',
  'error',
]

export class WasmStage {
  private module: EmscriptenModule | null = null

  private canvasSelector = '#stage'

  private loading: Promise<EmscriptenModule> | null = null
  /**
   * Asyncify 一次只能挂起一个导出调用：`loadScore` / `unlockAudio` / `play`
   * 都走 EM_ASYNC_JS，必须串行，否则第二次调用会在模块仍挂起时进入而失败。
   */
  private asyncQueue: Promise<unknown> = Promise.resolve()

  async init(canvas: HTMLCanvasElement, width: number, height: number, dpr: number): Promise<void> {
    if (!canvas.id) canvas.id = 'stage'
    this.canvasSelector = `#${canvas.id}`
    const module = await this.loadModule()
    const ok = Number(
      module.ccall('initPlayer', 'number', ['string', 'number', 'number', 'number'], [
        this.canvasSelector,
        Math.max(1, Math.round(width)),
        Math.max(1, Math.round(height)),
        Math.max(0.1, dpr),
      ]),
    )
    if (ok !== 1) {
      throw new Error(this.warnings() || 'wasm 渲染器初始化失败')
    }
    // 一次性把实际光栅化后端打到控制台：这是判断「有没有真的用上硬件 GPU」
    // 的唯一可靠依据（浏览器禁用 GPU 时会静默回退到 SwiftShader）。
    console.info('[mmw] GPU renderer:', this.gpuRenderer())
  }

  /** 实际承担光栅化的后端名称（未掩码），软件渲染时会包含 SwiftShader / llvmpipe。 */
  gpuRenderer(): string {
    if (!this.module) return 'unknown'
    return String(this.module.ccall('getGpuRenderer', 'string', [], []) || 'unknown')
  }

  private loadModule(): Promise<EmscriptenModule> {
    if (this.module) return Promise.resolve(this.module)
    if (!this.loading) {
      const factory = createModule as unknown as ModuleFactory
      this.loading = factory({
        locateFile: (file: string) => (file.endsWith('.wasm') ? '/vendor/wasm/mmw-preview.wasm' : `/vendor/wasm/${file}`),
        print: (message?: unknown) => console.info('[wasm]', message),
        printErr: (message?: unknown) => console.warn('[wasm]', message),
      }).then((module) => {
        this.module = module
        return module
      })
    }
    return this.loading
  }

  get isReady(): boolean {
    return this.module !== null
  }

  /** 调试用：拿到 emscripten 模块本身（浏览器控制台 / 探针脚本）。 */
  get raw(): unknown {
    return this.module
  }

  /** 预加载贴图 / 字体 / 音效。返回成功与失败的条数。 */
  async preload(manifest: AudioManifest, onProgress?: (done: number, total: number) => void): Promise<{
    loaded: number
    failed: string[]
  }> {
    const jobs: { kind: 'asset' | 'font' | 'sound'; key: string; url: string }[] = []
    for (const name of manifest.assets) {
      jobs.push({ kind: 'asset', key: name, url: manifest.base + encodeURI(name) })
    }
    for (const name of manifest.fonts) {
      jobs.push({ kind: 'font', key: name, url: manifest.base + encodeURI(name) })
    }
    for (const [key, relative] of Object.entries(manifest.sounds)) {
      jobs.push({ kind: 'sound', key, url: manifest.base + encodeURI(relative) })
    }

    let done = 0
    const failed: string[] = []
    const total = jobs.length
    const concurrency = 8
    let cursor = 0

    const worker = async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor]
        cursor += 1
        try {
          const response = await fetch(job.url)
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const bytes = new Uint8Array(await response.arrayBuffer())
          await this.upload(job.kind, job.key, bytes)
        } catch (error) {
          failed.push(`${job.key}: ${(error as Error).message}`)
        }
        done += 1
        onProgress?.(done, total)
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()))
    return { loaded: done - failed.length, failed }
  }

  private async upload(kind: 'asset' | 'font' | 'sound', key: string, bytes: Uint8Array): Promise<void> {
    const name = kind === 'asset' ? 'preloadAssetData' : kind === 'font' ? 'preloadFontData' : 'preloadSoundData'
    const async = kind === 'sound'
    const keyPtr = this.allocString(key)
    const data = this.allocBytes(bytes)
    try {
      const result = await this.call<number>(name, 'number', ['number', 'number', 'number'], [keyPtr, data.ptr, data.length], async)
      if (Number(result) !== 1) {
        throw new Error(this.warnings() || `${name} 失败`)
      }
    } finally {
      this.freePtr(keyPtr)
      this.freePtr(data.ptr)
    }
  }

  loadScore(scoreText: string, options?: Parameters<WasmStage['loadScoreNow']>[1]): Promise<void> {
    return this.enqueue(() => this.loadScoreNow(scoreText, options))
  }

  private async loadScoreNow(
    scoreText: string,
    options: {
      leadInMs?: number
      offsetMs?: number
      title?: string
      lyricist?: string
      composer?: string
      arranger?: string
      vocal?: string
      difficulty?: string
      customScoreInfo?: boolean
      scoreTitle?: string
      scoreCreator?: string
      bgm?: Uint8Array | null
      cover?: Uint8Array | null
    } = {},
  ): Promise<void> {
    const text = (value?: string) => this.allocString(value ?? '')
    const scorePtr = this.allocString(scoreText)
    const titlePtr = text(options.title)
    const lyricistPtr = text(options.lyricist)
    const composerPtr = text(options.composer)
    const arrangerPtr = text(options.arranger)
    const vocalPtr = text(options.vocal)
    const difficultyPtr = text(options.difficulty)
    const scoreTitlePtr = text(options.scoreTitle)
    const scoreCreatorPtr = text(options.scoreCreator)
    const bgm = this.allocBytes(options.bgm ?? null)
    const cover = this.allocBytes(options.cover ?? null)

    try {
      // 参数表与 `loadSession` 一致（16 个）。
      // 给了 BGM 时 wasm 侧的 `hasAudio` 会变 true，播放头改由音频时钟驱动。
      const result = await this.call<number>(
        'loadCustomScoreJsonSession',
        'number',
        [
          'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number',
          'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number',
        ],
        [
          scorePtr,
          Math.round(options.offsetMs ?? 0),
          Math.round(options.leadInMs ?? 0),
          bgm.ptr,
          bgm.length,
          cover.ptr,
          cover.length,
          titlePtr,
          lyricistPtr,
          composerPtr,
          arrangerPtr,
          vocalPtr,
          difficultyPtr,
          options.customScoreInfo === false ? 0 : 1,
          scoreTitlePtr,
          scoreCreatorPtr,
        ],
        true,
      )
      if (Number(result) !== 1) {
        throw new Error(this.warnings() || '载入谱面失败')
      }
    } finally {
      for (const ptr of [
        scorePtr,
        titlePtr,
        lyricistPtr,
        composerPtr,
        arrangerPtr,
        vocalPtr,
        difficultyPtr,
        scoreTitlePtr,
        scoreCreatorPtr,
        bgm.ptr,
        cover.ptr,
      ]) {
        this.freePtr(ptr)
      }
    }
  }

  setConfig(config: StageConfig): void {
    if (!this.module) return
    this.module.ccall(
      'setPlayerPreviewConfig',
      null,
      [
        'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number',
        'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number',
      ],
      [
        config.mirror ? 1 : 0,
        config.flickAnimation ? 1 : 0,
        config.holdAnimation ? 1 : 0,
        config.simultaneousLine ? 1 : 0,
        config.effectProfile,
        config.noteSkin,
        config.noteColor,
        config.specialNoteColors ? 1 : 0,
        config.noteSpeed,
        config.holdAlpha,
        config.guideAlpha,
        config.stageCover,
        config.stageOpacity,
        config.backgroundBrightness,
        config.effectOpacity,
        config.damageSound ? 1 : 0,
      ],
    )
  }

  setVolumes(bgm: number, sound: number): void {
    if (!this.module) return
    this.module.ccall('setPlayerAudioVolumes', null, ['number', 'number'], [bgm, sound])
  }

  /** 只做「解锁音频」，不开始播放；用于页面首次用户手势时预热 AudioContext。 */
  unlockAudio(): Promise<boolean> {
    return this.enqueue(async () => {
      const result = await this.call<number>('unlockPlayerAudio', 'number', [], [], true)
      return Number(result) === 1
    })
  }

  /** wasm 音频传输层的 AudioContext（录制音频轨要用）。 */
  getAudioContext(): AudioContext | null {
    if (!this.module) return null
    const transport = (this.module as unknown as { __mmwAudio?: { audioContext?: AudioContext | null } }).__mmwAudio
    return transport?.audioContext ?? null
  }

  play(): Promise<boolean> {
    return this.enqueue(async () => {
      await this.call<number>('unlockPlayerAudio', 'number', [], [], true)
      const ok = await this.call<number>('playPlayer', 'number', [], [], true)
      return Number(ok) === 1
    })
  }

  pause(): void {
    if (!this.module) return
    this.module.ccall('pausePlayer', null, [], [])
  }

  seek(seconds: number): void {
    if (!this.module) return
    this.module.ccall('seekPlayer', null, ['number'], [Math.max(0, seconds)])
  }

  setRate(rate: number): void {
    if (!this.module) return
    this.module.ccall('setPlayerPlaybackRate', null, ['number'], [rate])
  }

  resize(width: number, height: number, dpr: number): void {
    if (!this.module) return
    this.module.ccall(
      'resizePlayer',
      null,
      ['number', 'number', 'number'],
      [Math.max(1, Math.round(width)), Math.max(1, Math.round(height)), Math.max(0.1, dpr)],
    )
  }

  render(): void {
    if (!this.module) return
    this.module.ccall('renderPlayerFrame', null, [], [])
  }

  /** Phase 0 量化：C++ 侧每帧各阶段耗时（JSON 字符串，原样透传）。 */
  framePhaseTimings(): string {
    if (!this.module) return ''
    try {
      return String(this.module.ccall('getFramePhaseTimingJson', 'string', [], []) || '')
    } catch {
      return ''
    }
  }

  /** Phase 0 量化：C++ 建四边形 / 上传提交 两段耗时（JSON 字符串）。 */
  playerFrameTimings(): string {
    if (!this.module) return ''
    try {
      return String(this.module.ccall('getPlayerFrameTimingJson', 'string', [], []) || '')
    } catch {
      return ''
    }
  }

  snapshot(): StageSnapshot {
    if (!this.module) {
      return {
        currentTimeSec: 0,
        durationSec: 0,
        chartEndSec: 0,
        effectiveLeadInSec: 0,
        transportState: 'idle',
        requiresGesture: false,
        hasAudio: false,
        warnings: '',
      }
    }
    const module = this.module
    const code = Number(module.ccall('getPlayerTransportState', 'number', [], []))
    return {
      currentTimeSec: Number(module.ccall('getPlayerCurrentTimeSec', 'number', [], [])),
      durationSec: Number(module.ccall('getPlayerDurationSec', 'number', [], [])),
      chartEndSec: Number(module.ccall('getPlayerChartEndSec', 'number', [], [])),
      effectiveLeadInSec: Number(module.ccall('getPlayerEffectiveLeadInSec', 'number', [], [])),
      transportState: TRANSPORT_STATES[code] ?? 'idle',
      requiresGesture: Number(module.ccall('getPlayerRequiresGesture', 'number', [], [])) === 1,
      hasAudio: Number(module.ccall('getPlayerHasAudio', 'number', [], [])) === 1,
      warnings: this.warnings(),
    }
  }

  /**
   * 物量：谱面结束时的总 combo。
   *
   * wasm 侧把每一次判定记成一条 HUD 事件（打击音/长条中继/长条半拍…），HUD 里的
   * COMBO 就是按事件条数累加的，所以事件条数就等于打完这份谱的最终 combo。
   * 这里直接向已加载的会话要这个数，避免在 TS 侧重复实现一遍判定规则。
   */
  comboEventCount(): number {
    if (!this.module) return 0
    try {
      return Number(this.module.ccall('getHudEventCount', 'number', [], []) || 0)
    } catch {
      return 0
    }
  }

  dispose(): void {
    if (!this.module) return
    this.module.ccall('disposePlayer', null, [], [])
    this.module = null
    this.loading = null
  }

  private warnings(): string {
    if (!this.module) return ''
    return String(this.module.ccall('getPlayerWarningText', 'string', [], []) || '')
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.asyncQueue.then(task, task)
    this.asyncQueue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  private async call<T>(
    name: string,
    returnType: string | null,
    argTypes: string[],
    args: unknown[],
    async = false,
  ): Promise<T> {
    const module = this.require()
    const value = module.ccall(name, returnType, argTypes, args, async ? { async: true } : undefined)
    return (async ? await (value as Promise<T>) : (value as T)) as T
  }

  private allocString(value: string): number {
    const module = this.require()
    const encoded = new TextEncoder().encode(value)
    const ptr = module._malloc(encoded.length + 1)
    module.HEAPU8.set(encoded, ptr)
    module.HEAPU8[ptr + encoded.length] = 0
    return ptr
  }

  private allocBytes(bytes: Uint8Array | null): { ptr: number; length: number } {
    const module = this.require()
    if (!bytes || bytes.length === 0) return { ptr: 0, length: 0 }
    const ptr = module._malloc(bytes.length)
    module.HEAPU8.set(bytes, ptr)
    return { ptr, length: bytes.length }
  }

  private freePtr(ptr: number): void {
    if (!this.module || !ptr) return
    this.module._free(ptr)
  }

  private require(): EmscriptenModule {
    if (!this.module) throw new Error('wasm 渲染器尚未初始化')
    return this.module
  }
}
