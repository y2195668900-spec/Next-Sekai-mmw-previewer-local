/**
 * 打击音效（autoplay）。
 *
 * 预览器没有判定，所以「命中」= 播放头越过音符时刻。这不等于实机的判定窗口，
 * 但足以验证音频链路与时序；真正的判定一致性仍属 Phase 3 未完成项。
 */

export type SeKind = 'tap' | 'critical' | 'flick' | 'trace'

const FILES: Record<SeKind, string> = {
  tap: 'se_live_perfect.mp3',
  critical: 'se_live_critical.mp3',
  flick: 'se_live_flick.mp3',
  trace: 'se_live_trace.mp3',
}

export class HitSound {
  private context: AudioContext | null = null
  private buffers = new Map<SeKind, AudioBuffer>()
  private enabled = true
  private volume = 0.6
  private lastPlayed = new Map<SeKind, number>()

  get isReady(): boolean {
    return this.buffers.size > 0
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume))
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  async load(base = './assets/sound/'): Promise<void> {
    const Ctx = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    this.context ??= new Ctx()
    await Promise.all(
      (Object.entries(FILES) as [SeKind, string][]).map(async ([kind, file]) => {
        try {
          const response = await fetch(base + file)
          if (!response.ok) return
          const buffer = await this.context!.decodeAudioData(await response.arrayBuffer())
          this.buffers.set(kind, buffer)
        } catch {
          // 缺文件就静音，不影响画面
        }
      }),
    )
  }

  /** 同一音效 30ms 内不叠放，避免和弦炸音。 */
  play(kind: SeKind, nowMs = performance.now()): void {
    if (!this.enabled || !this.context) return
    const buffer = this.buffers.get(kind)
    if (!buffer) return
    const last = this.lastPlayed.get(kind) ?? -Infinity
    if (nowMs - last < 30) return
    this.lastPlayed.set(kind, nowMs)
    const source = this.context.createBufferSource()
    const gain = this.context.createGain()
    source.buffer = buffer
    gain.gain.value = this.volume
    source.connect(gain)
    gain.connect(this.context.destination)
    source.start()
  }

  /** 浏览器要求用户手势后才能出声。 */
  async unlock(): Promise<void> {
    if (this.context?.state === 'suspended') await this.context.resume()
  }
}
