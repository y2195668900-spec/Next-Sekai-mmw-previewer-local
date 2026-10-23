/** 预览器的内部谱面模型。字段名刻意贴近上游 LevelData，便于对照。 */

import type { TempoMap } from '../time/bpm'
import type { TimescaleTrack } from '../time/timescale'

export type NoteKind =
  | 'tap' // 普通点按
  | 'flick' // 划键
  | 'trace' // 摩擦（trace）判定
  | 'holdHead' // 长条头
  | 'holdTick' // 长条中继
  | 'holdTail' // 长条尾
  | 'guide' // 引导路径（TouchLine），只画线不判定
  | 'anchor' // 编辑器的形状顶点，不出现、不判定

export type ChartNote = {
  id: number
  index: number
  archetype: string
  kind: NoteKind
  beat: number
  /** chart 时间（秒），由 BPM 映射得到 */
  time: number
  lane: number
  size: number
  /** 所属 timescale group 的下标；-1 表示没有 group */
  group: number
  critical: boolean
  damage: boolean
  direction: number
  /** 链式关系（`next` / `prev`），-1 表示没有 */
  next: number
  prev: number
  /** 该音符在链条里的角色：头/中继/尾 */
  chainRole: 'none' | 'head' | 'mid' | 'tail'
  /** 长条头指向尾的时间（秒）；其它情况等于 time */
  endTime: number
}

export type HoldSpan = { headId: number; tailId: number; tickIds: number[] }

export type SimLine = { left: number; right: number }

export type Chart = {
  bgmOffset: number
  tempo: TempoMap
  groups: { name: string; track: TimescaleTrack; hidden: boolean[] }[]
  notes: ChartNote[]
  holds: HoldSpan[]
  simLines: SimLine[]
  /** 最后一个音符的 chart 时间 */
  duration: number
  /** 解析过程中的告警，用于和上游对账 */
  warnings: string[]
}
