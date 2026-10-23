/** 播放控制：只维护 chart 时间，不参与任何位置计算。 */

import type { Chart } from '../data/types'
import { Renderer, type ViewOptions } from './renderer'
import type { Skin } from './skin'

export class Playfield {
  private chart: Chart
  private renderer: Renderer
  private time = 0
  private playing = false
  private rate = 1
  private lastStamp = 0
  private frame = 0
  private options: ViewOptions = { mirror: false, showSimLines: true, showAnchors: false, useSkin: true }

  constructor(canvas: HTMLCanvasElement, chart: Chart, skin: Skin | null) {
    this.renderer = new Renderer(canvas, skin)
    this.chart = chart
  }

  setPulse(value: number): void {
    this.renderer.setPulse(value)
  }

  setSkin(skin: Skin | null): void {
    this.renderer.setSkin(skin)
    this.render()
  }

  setChart(chart: Chart): void {
    this.chart = chart
    this.time = 0
    this.render()
  }

  setOptions(options: Partial<ViewOptions>): void {
    this.options = { ...this.options, ...options }
    this.render()
  }

  get duration(): number {
    return this.chart.duration
  }

  get currentTime(): number {
    return this.time
  }

  seek(time: number): void {
    this.time = Math.max(0, Math.min(this.chart.duration, time))
    this.render()
  }

  play(): void {
    if (this.playing) return
    this.playing = true
    this.lastStamp = performance.now()
    this.loop()
  }

  pause(): void {
    this.playing = false
    cancelAnimationFrame(this.frame)
  }

  get isPlaying(): boolean {
    return this.playing
  }

  setRate(rate: number): void {
    this.rate = rate
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.resize(width, height, dpr)
    this.render()
  }

  render(): void {
    this.renderer.draw(this.chart, this.time, this.options)
  }

  onTick?: (time: number) => void

  private loop = (): void => {
    if (!this.playing) return
    const now = performance.now()
    const delta = (now - this.lastStamp) / 1000
    this.lastStamp = now
    this.time += delta * this.rate
    if (this.time >= this.chart.duration) {
      this.time = this.chart.duration
      this.playing = false
    }
    this.render()
    this.onTick?.(this.time)
    if (this.playing) this.frame = requestAnimationFrame(this.loop)
  }
}
