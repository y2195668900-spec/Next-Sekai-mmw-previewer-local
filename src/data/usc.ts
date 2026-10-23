/**
 * USC（Universal Sekai Chart）→ 新版内部模型。
 *
 * 音符语义不自己重写一遍：直接复用旧版 `src/lib/uscParser.ts`（只读 import），
 * 它已经处理了 `judgeType` / `trace` / `direction` / 长条链 / guide 颜色这些细节，
 * 输出的 `CustomScoreJson` 也正是 wasm 渲染器要的格式。
 *
 * 本文件只做两件事：
 *   1. 把 `CustomScoreJson` 翻译成 `Chart`（给参考渲染器、自检、变速内核用）；
 *   2. 把 USC 的 `timeScaleGroup.changes` 变成 marker（时间由 BPM 映射换算）。
 *
 * 为什么不在 USC 上做 LevelData 转换再走同一条链：
 * 那需要重新发明 archetype 与 `segmentKind` 的编码规则，而这里已经有可信的解析器输出。
 * 代价是 `Chart` 是从 `CustomScoreJson` 反推出来的，`holdTick`/`guide` 只能靠 baseType 判断。
 */

import { parseUsc } from '../../../src/lib/uscParser'
import type { BpmPoint } from '../time/bpm'
import { TempoMap } from '../time/bpm'
import { TimescaleTrack, type Marker } from '../time/timescale'
import type { Chart, ChartNote, HoldSpan, NoteKind, SimLine } from './types'

type CustomNote = {
  id: number
  ticks: number
  laneCenter: number
  laneSize: number
  category: number
  noteBaseType: number
  previousConnectionId: number
  nextConnectionId: number
  direction: number
  type: boolean
  style: number
  damage: boolean
  speedLayer: number
}

type CustomEvent = { eventType: number; ticks: number; changeValue: number }

export type CustomScoreDocument = {
  MusicScoreEventDataList: CustomEvent[]
  NoteList: CustomNote[]
  SpeedLayers: { ticks: number; value: number }[][]
}

type UscRaw = {
  usc?: {
    offset?: number
    objects?: {
      type?: string
      beat?: number
      bpm?: number
      changes?: { beat?: number; timeScale?: number; skip?: number; ease?: number }[]
    }[]
  }
}

export type UscImport = {
  chart: Chart
  document: CustomScoreDocument
  scoreText: string
  offsetSeconds: number
  stats: {
    notes: number
    groups: number
    markers: number
    guides: number
    holds: number
    singles: number
    slides: number
  }
}

/** baseType 的语义见旧版 `BaseType`。这里只关心「长条 / 划键 / 摩擦 / guide」。 */
const CHAIN_TYPES = new Set([2, 5, 6, 7, 8, 9])
const GUIDE_TYPES = new Set([10, 13, 14])
const FLICK_TYPES = new Set([3, 4])
const TRACE_TYPES = new Set([11, 12])

function kindOf(note: CustomNote): NoteKind {
  if (note.damage) return 'tap'
  if (note.category === 9 || GUIDE_TYPES.has(note.noteBaseType)) return 'guide'
  const hasPrev = note.previousConnectionId !== -1
  const hasNext = note.nextConnectionId !== -1
  // 链条角色只看拓扑，不看 baseType：长条的尾巴可能是 `Friction`(11) / `Flick`(3)
  // / `FrictionHide`(12) 这些「外观类型」，它们本身不在 CHAIN_TYPES 里。
  // 头结点必须能开链（Long / FrictionLong / FrictionHideLong），否则就是普通单键。
  if (hasPrev && hasNext) return 'holdTick'
  if (hasPrev && !hasNext) return 'holdTail'
  if (!hasPrev && hasNext && CHAIN_TYPES.has(note.noteBaseType)) return 'holdHead'
  if (FLICK_TYPES.has(note.noteBaseType)) return 'flick'
  if (TRACE_TYPES.has(note.noteBaseType)) return 'trace'
  return 'tap'
}

/** 同 tick 的 min/max 中心 → 一条连线。口径与 wasm 渲染器的推导一致。 */
function deriveSimLines(notes: ChartNote[]): SimLine[] {
  const byTick = new Map<number, { min: ChartNote; max: ChartNote; minCenter: number; maxCenter: number }>()
  for (const note of notes) {
    if (note.damage || note.kind === 'anchor' || note.kind === 'guide' || note.kind === 'holdTick') continue
    const center = note.lane + note.size / 2
    const key = Math.round(note.beat * 480)
    const entry = byTick.get(key)
    if (!entry) {
      byTick.set(key, { min: note, max: note, minCenter: center, maxCenter: center })
      continue
    }
    if (center < entry.minCenter) {
      entry.min = note
      entry.minCenter = center
    }
    if (center > entry.maxCenter) {
      entry.max = note
      entry.maxCenter = center
    }
  }
  const lines: SimLine[] = []
  for (const entry of byTick.values()) {
    if (entry.maxCenter === entry.minCenter) continue
    lines.push({ left: entry.min.id, right: entry.max.id })
  }
  return lines
}

export function parseUscChart(text: string): UscImport {
  const parsed = parseUsc(text)
  const document = JSON.parse(parsed.json) as CustomScoreDocument
  const raw = JSON.parse(text) as UscRaw
  const objects = raw.usc?.objects ?? []

  const bpmPoints: BpmPoint[] = []
  for (const event of document.MusicScoreEventDataList) {
    if (event.eventType !== 0) continue
    if (!Number.isFinite(event.ticks) || !Number.isFinite(event.changeValue)) continue
    bpmPoints.push({ beat: event.ticks / 480, bpm: event.changeValue })
  }
  const tempo = new TempoMap(bpmPoints.length > 0 ? bpmPoints : [{ beat: 0, bpm: parsed.bpm || 120 }])

  // USC 的 timeScaleGroup 顺序 == 旧解析器 speedLayer 的下标顺序（都按 objects 顺序）。
  const groups: Chart['groups'] = []
  let markerCount = 0
  for (const object of objects) {
    if (object.type !== 'timeScaleGroup') continue
    const markers: Marker[] = []
    const hidden: boolean[] = []
    for (const change of object.changes ?? []) {
      const beat = Number(change.beat)
      const timescale = Number(change.timeScale)
      if (!Number.isFinite(beat) || !Number.isFinite(timescale)) continue
      // USC v2 的 change 只带 beat/timeScale：skip 与 ease 恒为 0。
      // （上游的 `#TIMESCALE_SKIP` / `#TIMESCALE_EASE` 只在 LevelData 里出现。）
      markers.push({ time: tempo.timeAt(beat), timescale, skip: 0, ease: 0 })
      hidden.push(false)
    }
    if (markers.length === 0) {
      markers.push({ time: 0, timescale: 1, skip: 0, ease: 0 })
      hidden.push(false)
    }
    markers.sort((left, right) => left.time - right.time)
    markerCount += markers.length
    groups.push({ name: `${groups.length}`, track: new TimescaleTrack(markers), hidden })
  }

  const notes: ChartNote[] = document.NoteList.map((note, index) => {
    const beat = note.ticks / 480
    const kind = kindOf(note)
    const lane = note.laneCenter - note.laneSize / 2
    return {
      id: index,
      index,
      archetype: `usc:${note.noteBaseType}`,
      kind,
      beat,
      time: tempo.timeAt(beat),
      lane,
      size: note.laneSize,
      group: note.speedLayer >= 0 && note.speedLayer < groups.length ? note.speedLayer : -1,
      critical: note.type === true,
      damage: note.damage === true,
      direction: note.direction,
      next: note.nextConnectionId === -1 ? -1 : document.NoteList.findIndex((n) => n.id === note.nextConnectionId),
      prev: note.previousConnectionId === -1 ? -1 : document.NoteList.findIndex((n) => n.id === note.previousConnectionId),
      chainRole: 'none',
      endTime: tempo.timeAt(beat),
    }
  })

  const holds: HoldSpan[] = []
  for (const note of notes) {
    if (note.kind !== 'holdHead') continue
    const tickIds: number[] = []
    let cursor = note.next
    let tailId = -1
    const guard = new Set<number>()
    while (cursor !== -1 && !guard.has(cursor)) {
      guard.add(cursor)
      const current = notes[cursor]
      if (current.kind === 'holdTail') {
        tailId = cursor
        break
      }
      tickIds.push(cursor)
      cursor = current.next
    }
    if (tailId === -1) continue
    note.chainRole = 'head'
    notes[tailId].chainRole = 'tail'
    for (const tickId of tickIds) notes[tickId].chainRole = 'mid'
    note.endTime = notes[tailId].time
    holds.push({ headId: note.id, tailId, tickIds })
  }

  let duration = 0
  for (const note of notes) duration = Math.max(duration, note.time, note.endTime)

  const warnings: string[] = []
  if (notes.length === 0) warnings.push('USC 里没有解析到音符')
  if (groups.length === 0) warnings.push('USC 里没有 timeScaleGroup，回退为恒速 1×')

  const chart: Chart = {
    bgmOffset: Number(raw.usc?.offset ?? parsed.offsetSeconds ?? 0),
    tempo,
    groups: groups.length > 0 ? groups : [{ name: '0', track: new TimescaleTrack([{ time: 0, timescale: 1, skip: 0, ease: 0 }]), hidden: [false] }],
    notes,
    holds,
    simLines: deriveSimLines(notes),
    duration,
    warnings,
  }

  const count = (type: string) => objects.filter((object) => object.type === type).length

  return {
    chart,
    document,
    scoreText: parsed.json,
    offsetSeconds: parsed.offsetSeconds,
    stats: {
      notes: notes.length,
      groups: chart.groups.length,
      markers: markerCount,
      guides: notes.filter((note) => note.kind === 'guide').length,
      holds: holds.length,
      singles: count('single'),
      slides: count('slide'),
    },
  }
}

/** 粗判一段文本是不是 USC：根节点带 `usc` 键。 */
export function looksLikeUsc(text: string): boolean {
  const head = text.slice(0, 4096)
  if (!/"usc"\s*:/.test(head)) return false
  try {
    const root = JSON.parse(text) as { usc?: unknown }
    return !!root && typeof root === 'object' && root.usc !== undefined
  } catch {
    return false
  }
}
