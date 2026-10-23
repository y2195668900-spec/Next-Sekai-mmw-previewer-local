/**
 * 时序组（timescale group）—— 与上游 `sekai/lib/timescale.py` 的 marker 模型对齐。
 *
 * 每个 `#TIMESCALE_CHANGE` 是一个 marker：
 *   { 时间 t_i, 速度 v_i, 位移跳变 skip_i（秒）, 缓动 ease_i }
 *
 * 位置的定义（上游 `initialize_timescale_group` 346-351 行）：
 *   pos[0] = t_0 + skip_0
 *   pos[i] = pos[i-1] + ∫_{t_{i-1}}^{t_i} v(u) du + skip_i
 *
 * 段内速度不是常数：`ease_{i}` 把 v_i 过渡到 v_{i+1}（上游 `_integral` 205-221 行）。
 * 这正是旧版缺失的部分 —— 旧版把每段当阶跃，再靠量化补丁凑闪现。
 */

import { EaseType, integrateTimes, speedAt } from './ease'

export type Marker = {
  /** chart 时间（秒） */
  time: number
  /** 该段的起始速度 */
  timescale: number
  /** 到达该 marker 时的位置跳变（秒）＝ timescale_skip × 60 / bpm */
  skip: number
  /** 本段到下一 marker 的缓动 */
  ease: EaseType
}

export class TimescaleTrack {
  readonly markers: Marker[]
  private readonly positions: number[]

  constructor(markers: Marker[]) {
    this.markers = [...markers].sort((a, b) => a.time - b.time)
    this.positions = new Array(this.markers.length).fill(0)
    for (let i = 0; i < this.markers.length; i += 1) {
      const marker = this.markers[i]
      if (i === 0) {
        this.positions[i] = marker.time + marker.skip
        continue
      }
      const prev = this.markers[i - 1]
      const area = integrateTimes(
        prev.timescale,
        marker.timescale,
        prev.ease,
        prev.time,
        marker.time,
        prev.time,
        marker.time,
      )
      this.positions[i] = this.positions[i - 1] + area + marker.skip
    }
  }

  /** 视觉时钟（scaled time）在 chart 时间 t 的取值。 */
  positionAt(t: number): number {
    const markers = this.markers
    if (markers.length === 0) return t
    if (t < markers[0].time) return t
    if (markers.length === 1 || t >= markers[markers.length - 1].time) {
      const last = markers.length - 1
      const marker = markers[last]
      return this.positions[last] + (t - marker.time) * marker.timescale
    }
    const index = this.indexFor(t)
    const marker = markers[index]
    if (t === marker.time) return this.positions[index]
    const next = markers[index + 1]
    const area = integrateTimes(marker.timescale, next.timescale, marker.ease, marker.time, next.time, marker.time, t)
    return this.positions[index] + area
  }

  /** 瞬时速度（音符接近速度）。 */
  speedAt(t: number): number {
    const markers = this.markers
    if (markers.length === 0) return 1
    if (t <= markers[0].time) return markers[0].timescale
    const index = this.indexFor(Math.min(t, markers[markers.length - 1].time))
    const marker = markers[index]
    if (index + 1 >= markers.length) return marker.timescale
    const next = markers[index + 1]
    return speedAt(marker.timescale, next.timescale, marker.ease, marker.time, next.time, t)
  }

  /** 从 now 到 target 还有多少「视觉秒」。正值 = 未来。 */
  distanceBetween(now: number, target: number): number {
    return this.positionAt(target) - this.positionAt(now)
  }

  /** 该时刻落在第几个 marker 之后（用于 hideNotes 之类的区间属性）。 */
  markerIndexAt(t: number): number {
    if (this.markers.length === 0) return -1
    return this.indexFor(t)
  }

  private indexFor(t: number): number {
    const markers = this.markers
    let low = 0
    let high = markers.length - 1
    while (low < high) {
      const mid = (low + high + 1) >> 1
      if (markers[mid].time <= t) low = mid
      else high = mid - 1
    }
    return low
  }
}

/** 没有 timing 事件时的默认组：恒速 1×。 */
export function constantTrack(): TimescaleTrack {
  return new TimescaleTrack([{ time: 0, timescale: 1, skip: 0, ease: EaseType.LINEAR }])
}
