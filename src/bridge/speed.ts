/**
 * 把新版内核的 marker 时间轴翻译成旧版渲染器认识的 `SpeedLayers`。
 *
 * 旧版渲染器的视觉时钟是逐层积分：
 *
 *   clock(tick) = Σ_{段} (Δtick × 60 / bpm / 480 × value)
 *
 * 也就是说 `value` 就是「该段的视觉速度倍率」。新版内核的位置函数是
 *
 *   pos(t) = pos(t_prev) + ∫ v(u) du + skip
 *
 * 于是只要让每段的 `value` 等于 **该段在 pos 上的平均速度**
 *
 *   value = (pos(t_b) - pos(t_a)) / (t_b - t_a)
 *
 * 积分就在每个关键帧上精确等于 `pos(t)`，误差只剩段内的速度变化量。
 * `skip` 不需要单独建模：在 marker 时刻前后各放一个关键帧（间隔 1 tick），
 * 平均速度自然变成一个大数 —— 这正是旧版手工写的 ±5900 尖峰，
 * 区别是现在是**算出来的**，不再依赖作者的数值巧合。
 */

import type { Chart } from '../data/types'
import type { TickClock } from './clock'
import { TICKS_PER_BEAT } from './clock'

export type SpeedKey = { ticks: number; value: number }

export type SpeedBridgeOptions = {
  /** 段内采样密度（单位：拍）。越小越贴合连续缓动，曲线也越大。 */
  beatsPerSample?: number
  /** 把该组所有音符的 tick 也作为关键帧，保证音符落点逐点精确。默认开。 */
  anchorNotes?: boolean
}

/** 曲线值的安全上限：再大也只是「一帧内跳完」，没有必要真给 1e6。 */
const MAX_VALUE = 1e6

export function buildSpeedLayers(
  chart: Chart,
  clock: TickClock,
  options: SpeedBridgeOptions = {},
): SpeedKey[][] {
  const beatsPerSample = Math.max(1 / 32, options.beatsPerSample ?? 1 / 8)
  const anchorNotes = options.anchorNotes !== false

  return chart.groups.map((group, index) =>
    buildLayer(chart, index, clock, beatsPerSample, anchorNotes, group),
  )
}

function buildLayer(
  chart: Chart,
  groupIndex: number,
  clock: TickClock,
  beatsPerSample: number,
  anchorNotes: boolean,
  group: Chart['groups'][number],
): SpeedKey[] {
  const track = group.track
  const markers = track.markers
  if (markers.length === 0) {
    return [{ ticks: 0, value: 1 }]
  }

  const position = (seconds: number) => track.positionAt(seconds)
  const bounds = new Set<number>()
  const add = (tick: number) => {
    if (Number.isFinite(tick)) bounds.add(Math.max(0, Math.round(tick)))
  }

  add(0)
  const markerTicks = markers.map((marker) => Math.round(clock.tickAtSeconds(marker.time)))

  for (const tick of markerTicks) {
    // 跳变收进 1 tick 窗口：位置不连续，速度就必须是一个尖峰。
    add(tick - 1)
    add(tick)
  }

  // 段内细分，让缓动的曲率被采到
  const stepTicks = Math.max(1, Math.round(beatsPerSample * TICKS_PER_BEAT))
  for (let i = 0; i < markerTicks.length; i += 1) {
    const from = markerTicks[i]
    const to = i + 1 < markerTicks.length ? markerTicks[i + 1] : from
    for (let tick = from; tick < to; tick += stepTicks) add(tick)
  }

  if (anchorNotes) {
    for (const note of chart.notes) {
      if (note.group !== groupIndex) continue
      add(Math.round(note.beat * TICKS_PER_BEAT))
    }
  }

  const sorted = [...bounds].sort((left, right) => left - right)
  const keys: SpeedKey[] = []
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (b <= a) continue
    const ta = clock.secondsAtTick(a)
    const tb = clock.secondsAtTick(b)
    const dt = tb - ta
    if (!(dt > 0)) continue
    keys.push({ ticks: a, value: clampValue((position(tb) - position(ta)) / dt) })
  }

  if (keys.length === 0) {
    return [{ ticks: 0, value: 1 }]
  }

  // 末尾补一段，覆盖最后一个关键帧之后的区间（渲染器会一直用最后一个 value）
  const tailTick = sorted[sorted.length - 1]
  const tailValue = keys[keys.length - 1].value
  keys.push({ ticks: tailTick, value: clampValue(tailValue) })

  return keys
}

/** 关键帧的阶跃取值（与旧渲染器的 `valueAt` 同语义）。 */
export function valueAtKeys(keys: SpeedKey[], tick: number): number {
  if (keys.length === 0) return 1
  let value = keys[0].value
  for (const key of keys) {
    if (key.ticks > tick) break
    value = key.value
  }
  return value
}

function clampValue(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.max(-MAX_VALUE, Math.min(MAX_VALUE, value))
}
