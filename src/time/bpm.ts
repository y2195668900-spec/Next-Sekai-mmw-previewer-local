/**
 * BPM 映射：beat <-> 秒。
 *
 * LevelData 的 `#BPM_CHANGE` 只给 beat 和 bpm，时间要自己积出来。
 * 与上游 `beat_to_time` / `time_to_beat` 同构，精度用 double。
 */

export type BpmPoint = { beat: number; bpm: number }

export class TempoMap {
  private readonly beats: number[] = []
  private readonly bpms: number[] = []
  private readonly times: number[] = []

  constructor(points: BpmPoint[]) {
    const sorted = [...points].filter((p) => Number.isFinite(p.beat) && Number.isFinite(p.bpm) && p.bpm > 0)
    if (sorted.length === 0) sorted.push({ beat: 0, bpm: 120 })
    sorted.sort((a, b) => a.beat - b.beat)
    let time = 0
    for (let i = 0; i < sorted.length; i += 1) {
      const point = sorted[i]
      if (i > 0) {
        const prev = sorted[i - 1]
        time += ((point.beat - prev.beat) * 60) / prev.bpm
      } else if (point.beat !== 0) {
        // 第一个 BPM 不在 0 时，往前按同一 BPM 补齐
        time = (point.beat * 60) / point.bpm
      }
      this.beats.push(point.beat)
      this.bpms.push(point.bpm)
      this.times.push(time)
    }
  }

  /** beat -> 秒 */
  timeAt(beat: number): number {
    const index = this.indexFor(this.beats, beat)
    const base = this.times[index]
    return base + ((beat - this.beats[index]) * 60) / this.bpms[index]
  }

  /** 秒 -> beat */
  beatAt(time: number): number {
    const index = this.indexFor(this.times, time)
    return this.beats[index] + ((time - this.times[index]) * this.bpms[index]) / 60
  }

  bpmAtBeat(beat: number): number {
    return this.bpms[this.indexFor(this.beats, beat)]
  }

  bpmAtTime(time: number): number {
    return this.bpms[this.indexFor(this.times, time)]
  }

  private indexFor(values: number[], value: number): number {
    let low = 0
    let high = values.length - 1
    while (low < high) {
      const mid = (low + high + 1) >> 1
      if (values[mid] <= value) low = mid
      else high = mid - 1
    }
    return low
  }
}
