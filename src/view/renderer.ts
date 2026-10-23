/**
 * Canvas2D 渲染器（Phase 2/3）。
 *
 * - 纵向位置走上游 approach 曲线（见 layout.ts）
 * - 音符/划键/摩擦用 Next SEKAI 官方图集三段切片
 * - 判定线、同时押连线用原图
 * - 铁律：渲染器不参与时间计算，位置全部来自 time 层 + layout
 */

import type { Chart, ChartNote } from '../data/types'
import { isNoteHidden, trackOf } from '../data/leveldata'
import { laneToX, progressToY, widthToScreen, progressFromDistance } from './layout'
import type { Skin } from './skin'

export type ViewOptions = {
  mirror: boolean
  showSimLines: boolean
  showAnchors: boolean
  useSkin: boolean
}

const FALLBACK = {
  note: '#5ee0c0',
  critical: '#ffd25e',
  trace: 'rgba(120,220,255,0.6)',
  hold: 'rgba(94,224,192,0.28)',
  holdEdge: 'rgba(94,224,192,0.85)',
  sim: 'rgba(255,255,255,0.75)',
}

type Geom = { progress: number; y: number; distance: number }

export class Renderer {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private skin: Skin | null
  private dpr = 1
  private pulse = 0

  constructor(canvas: HTMLCanvasElement, skin: Skin | null) {
    this.canvas = canvas
    this.skin = skin
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas2d 不可用')
    this.ctx = ctx
  }

  setSkin(skin: Skin | null): void {
    this.skin = skin
  }

  setPulse(value: number): void {
    this.pulse = Math.min(1, Math.max(0, value))
  }

  resize(width: number, height: number, dpr: number): void {
    this.dpr = dpr
    this.canvas.width = Math.round(width * dpr)
    this.canvas.height = Math.round(height * dpr)
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
  }

  draw(chart: Chart, time: number, options: ViewOptions): void {
    const ctx = this.ctx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    const w = this.canvas.width / this.dpr
    const h = this.canvas.height / this.dpr

    this.drawStageLines(w, h, options)
    this.drawSimLines(chart, time, w, h, options)
    this.drawHolds(chart, time, w, h, options)
    this.drawNotes(chart, time, w, h, options)
    this.drawJudgeLine(w, h, options)
    this.drawPulse(w, h)
  }

  /* ── 舞台 ───────────────────────────────────────────── */

  private drawStageLines(w: number, h: number, options: ViewOptions): void {
    const ctx = this.ctx
    const topY = progressToY(0) * h
    const bottomY = progressToY(1) * h
    ctx.save()
    for (let lane = -6; lane <= 6; lane += 1) {
      const xTop = laneToX(lane, 0, options.mirror) * w
      const xBottom = laneToX(lane, 1, options.mirror) * w
      ctx.strokeStyle = lane === 0 ? 'rgba(125,211,252,0.22)' : 'rgba(148,163,184,0.12)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(xTop, topY)
      ctx.lineTo(xBottom, bottomY)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(148,163,184,0.16)'
    ctx.beginPath()
    ctx.moveTo(laneToX(-6, 0, options.mirror) * w, topY)
    ctx.lineTo(laneToX(6, 0, options.mirror) * w, topY)
    ctx.stroke()
    ctx.restore()
  }

  private drawJudgeLine(w: number, h: number, options: ViewOptions): void {
    const ctx = this.ctx
    const y = progressToY(1) * h
    const left = laneToX(-6, 1, options.mirror) * w
    const right = laneToX(6, 1, options.mirror) * w
    const thickness = Math.max(6, h * 0.014)
    const drawn =
      options.useSkin && this.skin
        ? this.skin.draw(ctx, '#JUDGMENT_LINE', left, y - thickness / 2, right - left, thickness)
        : false
    if (!drawn) {
      ctx.save()
      ctx.strokeStyle = 'rgba(226,232,240,0.9)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(left, y)
      ctx.lineTo(right, y)
      ctx.stroke()
      ctx.restore()
    }
  }

  private drawPulse(w: number, h: number): void {
    if (this.pulse <= 0.01) return
    const ctx = this.ctx
    const y = progressToY(1) * h
    const band = h * 0.045 * this.pulse
    const gradient = ctx.createLinearGradient(0, y - band, 0, y + band)
    gradient.addColorStop(0, 'rgba(255,255,255,0)')
    gradient.addColorStop(0.5, `rgba(255,255,255,${0.3 * this.pulse})`)
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.save()
    ctx.fillStyle = gradient
    ctx.fillRect(0, y - band, w, band * 2)
    ctx.restore()
  }

  /* ── 音符 ───────────────────────────────────────────── */

  private geometry(chart: Chart, note: ChartNote, time: number): Geom {
    const track = trackOf(chart, note)
    const distance = track.positionAt(note.time) - track.positionAt(time)
    const progress = progressFromDistance(distance)
    return { progress, y: progressToY(progress), distance }
  }

  private spriteFamily(note: ChartNote): { left: string; middle: string; right: string } {
    const color = 'Neutral'
    if (note.damage) {
      return {
        left: `Sekai Damage Note Left ${color}`,
        middle: `Sekai Damage Note Middle ${color}`,
        right: `Sekai Damage Note Right ${color}`,
      }
    }
    const critical = note.critical ? 'Critical' : 'Normal'
    if (note.kind === 'trace') {
      return {
        left: `Sekai ${critical} Trace Note Left ${color}`,
        middle: `Sekai ${critical} Trace Note Middle ${color}`,
        right: `Sekai ${critical} Trace Note Right ${color}`,
      }
    }
    if (note.kind === 'flick') {
      return {
        left: `Sekai Flick Note Left ${color}`,
        middle: `Sekai Flick Note Middle ${color}`,
        right: `Sekai Flick Note Right ${color}`,
      }
    }
    return {
      left: `Sekai ${critical} Note Left ${color}`,
      middle: `Sekai ${critical} Note Middle ${color}`,
      right: `Sekai ${critical} Note Right ${color}`,
    }
  }

  private drawNotes(chart: Chart, time: number, w: number, h: number, options: ViewOptions): void {
    const ctx = this.ctx
    const skin = options.useSkin ? this.skin : null
    for (const note of chart.notes) {
      if (note.kind === 'holdTick' || note.kind === 'holdTail' || note.kind === 'guide') continue
      if (note.kind === 'anchor' && !options.showAnchors) continue
      if (isNoteHidden(chart, note)) continue

      const { progress, y } = this.geometry(chart, note, time)
      if (progress < -0.1 || progress > 1.12) continue
      const yPx = y * h

      // `lane` 是**左边缘**（LevelData 的 lane 约定），中心要加半个宽度。
      const center = laneToX(note.lane + note.size / 2, progress, options.mirror) * w
      const width = widthToScreen(note.size, progress) * w
      const family = this.spriteFamily(note)
      const aspect = skin?.aspect(family.middle) ?? 354 / 186
      const height = width / aspect

      ctx.save()
      let drawn = false
      if (skin && note.kind !== 'anchor') {
        drawn = skin.drawSlice(ctx, family.left, family.middle, family.right, center - width / 2, yPx - height / 2, width, height)
      }
      if (!drawn) {
        ctx.fillStyle = note.critical ? FALLBACK.critical : note.kind === 'trace' ? FALLBACK.trace : FALLBACK.note
        if (note.kind === 'anchor') {
          ctx.globalAlpha = 0.45
          ctx.beginPath()
          ctx.arc(center, yPx, 3, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.beginPath()
          ctx.ellipse(center, yPx, width / 2, height / 2, 0, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      if (note.kind === 'flick') this.drawFlickArrow(ctx, note, center, yPx, width, height, time, skin)
      ctx.restore()
    }
  }

  private drawFlickArrow(
    ctx: CanvasRenderingContext2D,
    note: ChartNote,
    center: number,
    y: number,
    width: number,
    height: number,
    time: number,
    skin: Skin | null,
  ): void {
    if (!skin) return
    const direction = note.direction === 2 ? 'Down' : 'Up'
    const color = note.critical ? 'Yellow' : 'Red'
    const frame = (Math.floor(time * 30) % 6) + 1
    const name = `Sekai Flick Arrow ${color} ${direction} ${frame}`
    if (!skin.has(name)) return
    const arrowWidth = width * 0.7
    const arrowHeight = arrowWidth * 0.85
    const offset = height * 0.62
    ctx.save()
    ctx.globalAlpha = 0.95
    skin.draw(ctx, name, center - arrowWidth / 2, y + (direction === 'Down' ? offset : -offset) - arrowHeight / 2, arrowWidth, arrowHeight)
    ctx.restore()
  }

  /* ── 长条 ───────────────────────────────────────────── */

  private drawHolds(chart: Chart, time: number, w: number, h: number, options: ViewOptions): void {
    const ctx = this.ctx
    for (const hold of chart.holds) {
      const head = chart.notes[hold.headId]
      const tail = chart.notes[hold.tailId]
      if (isNoteHidden(chart, head)) continue

      const headGeom = this.geometry(chart, head, time)
      const tailGeom = this.geometry(chart, tail, time)
      if (headGeom.progress > 1.15 || tailGeom.progress < -0.1) continue

      const topIsHead = headGeom.progress >= tailGeom.progress
      const top = topIsHead ? head : tail
      const bottom = topIsHead ? tail : head
      const topProgress = topIsHead ? headGeom.progress : tailGeom.progress
      const bottomProgress = topIsHead ? tailGeom.progress : headGeom.progress
      const topY = progressToY(topProgress) * h
      const bottomY = progressToY(bottomProgress) * h

      const quad = [
        [laneToX(top.lane, topProgress, options.mirror) * w, topY],
        [laneToX(top.lane + top.size, topProgress, options.mirror) * w, topY],
        [laneToX(bottom.lane + bottom.size, bottomProgress, options.mirror) * w, bottomY],
        [laneToX(bottom.lane, bottomProgress, options.mirror) * w, bottomY],
      ] as const

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(quad[0][0], quad[0][1])
      for (let i = 1; i < quad.length; i += 1) ctx.lineTo(quad[i][0], quad[i][1])
      ctx.closePath()
      ctx.fillStyle = head.critical ? 'rgba(255,210,94,0.26)' : FALLBACK.hold
      ctx.fill()
      ctx.strokeStyle = head.critical ? 'rgba(255,210,94,0.85)' : FALLBACK.holdEdge
      ctx.lineWidth = 1.2
      ctx.stroke()

      for (const tickId of hold.tickIds) {
        const tick = chart.notes[tickId]
        if (isNoteHidden(chart, tick)) continue
        const g = this.geometry(chart, tick, time)
        if (g.progress < -0.1 || g.progress > 1.12) continue
        const cx = laneToX(tick.lane, g.progress, options.mirror) * w
        const size = widthToScreen(tick.size, g.progress) * w * 0.42
        ctx.save()
        ctx.globalAlpha = 0.85
        ctx.fillStyle = head.critical ? FALLBACK.critical : FALLBACK.note
        ctx.beginPath()
        ctx.ellipse(cx, progressToY(g.progress) * h, size / 2, size / 6, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      ctx.restore()
    }
  }

  /* ── 连线 ───────────────────────────────────────────── */

  private drawSimLines(chart: Chart, time: number, w: number, h: number, options: ViewOptions): void {
    if (!options.showSimLines) return
    const ctx = this.ctx
    const skin = options.useSkin ? this.skin : null
    for (const line of chart.simLines) {
      const left = chart.notes[line.left]
      const right = chart.notes[line.right]
      if (isNoteHidden(chart, left)) continue
      const a = this.geometry(chart, left, time)
      const b = this.geometry(chart, right, time)
      const progress = Math.min(a.progress, b.progress)
      if (progress < -0.1 || progress > 1.12) continue
      const y = progressToY(progress) * h
      const x1 = laneToX(Math.min(left.lane - left.size / 2, right.lane - right.size / 2), progress, options.mirror) * w
      const x2 = laneToX(Math.max(left.lane + left.size / 2, right.lane + right.size / 2), progress, options.mirror) * w
      const thickness = Math.max(2, h * 0.004 * (0.3 + progress))
      ctx.save()
      const drawn = skin?.draw(ctx, '#SIMULTANEOUS_CONNECTION_NEUTRAL', x1, y - thickness / 2, x2 - x1, thickness) ?? false
      if (!drawn) {
        ctx.strokeStyle = FALLBACK.sim
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x1, y)
        ctx.lineTo(x2, y)
        ctx.stroke()
      }
      ctx.restore()
    }
  }
}
