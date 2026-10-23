/**
 * tick ↔ 秒 的换算。
 *
 * 旧版渲染器（`native/src/mmw_preview.cpp`）的时间轴是「tick + BPM 事件」：
 * 秒数 = 对 `60 / bpm / 480` 逐 tick 积分。新版内核的时间轴是「chart 秒」。
 * 桥接必须能双向换算，否则速度曲线写不进旧格式。
 */

export const TICKS_PER_BEAT = 480

export type TempoEvent = { ticks: number; bpm: number }

type TempoJson = { MusicScoreEventDataList?: unknown }

/** 从旧格式 JSON 里取 BPM 事件（`eventType: 0`）。 */
export function readTempoEvents(json: TempoJson): TempoEvent[] {
  const list = Array.isArray(json.MusicScoreEventDataList) ? json.MusicScoreEventDataList : []
  const events: TempoEvent[] = []
  for (const item of list) {
    const event = item as { eventType?: unknown; ticks?: unknown; changeValue?: unknown }
    if (Number(event.eventType) !== 0) continue
    const tick = Number(event.ticks)
    const bpm = Number(event.changeValue)
    if (!Number.isFinite(tick) || !Number.isFinite(bpm) || bpm <= 0) continue
    events.push({ ticks: Math.max(0, tick), bpm })
  }
  events.sort((left, right) => left.ticks - right.ticks)
  return events.length > 0 ? events : [{ ticks: 0, bpm: 120 }]
}

export type TickClock = {
  tempos: TempoEvent[]
  secondsAtTick(tick: number): number
  tickAtSeconds(seconds: number): number
  secondsPerTick(bpm: number): number
}

export function createTickClock(input: TempoEvent[]): TickClock {
  const tempos = input.length > 0 ? [...input] : [{ ticks: 0, bpm: 120 }]
  tempos.sort((left, right) => left.ticks - right.ticks)
  if (tempos[0].ticks > 0) {
    tempos.unshift({ ticks: 0, bpm: tempos[0].bpm })
  }

  const secondsPerTick = (bpm: number) => 60 / bpm / TICKS_PER_BEAT

  // starts[i] = 第 i 个事件处的绝对秒数
  const starts: number[] = [0]
  for (let i = 1; i < tempos.length; i += 1) {
    const step = tempos[i].ticks - tempos[i - 1].ticks
    starts.push(starts[i - 1] + step * secondsPerTick(tempos[i - 1].bpm))
  }

  function segmentAtTick(tick: number) {
    let index = tempos.length - 1
    while (index > 0 && tempos[index].ticks > tick) index -= 1
    return index
  }

  function segmentAtSeconds(seconds: number) {
    let index = tempos.length - 1
    while (index > 0 && starts[index] > seconds) index -= 1
    return index
  }

  return {
    tempos,
    secondsPerTick,
    secondsAtTick(tick: number) {
      const index = segmentAtTick(tick)
      return starts[index] + (tick - tempos[index].ticks) * secondsPerTick(tempos[index].bpm)
    },
    tickAtSeconds(seconds: number) {
      const index = segmentAtSeconds(seconds)
      return tempos[index].ticks + (seconds - starts[index]) / secondsPerTick(tempos[index].bpm)
    },
  }
}
