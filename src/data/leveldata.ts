/**
 * Sonolus LevelData 解析（全字段保真）。
 *
 * 与旧版 `src/lib/levelDataParser.ts` 的关键差别：**不再丢弃**
 *   - `#TIMESCALE_SKIP`（位移跳变，单位拍）
 *   - `#TIMESCALE_EASE`（段内缓动，决定 v_i → v_{i+1} 的过渡）
 *   - `transitionStyle`（SCROLL 走另一套滚动偏移）
 *   - `hideNotes`（音符可见区间）
 *   - `SimLine`（同时押连线，作者显式指定）
 *
 * ref 解析沿用已验证的语义：先按实体 `name` 查，再退回 base-16 下标。
 */

import { TempoMap, type BpmPoint } from '../time/bpm'
import { TimescaleTrack, type Marker } from '../time/timescale'
import type { Chart, ChartNote, HoldSpan, NoteKind, SimLine } from './types'

type DataEntry = { name?: string; value?: number | string; ref?: string }
type Entity = { archetype?: string; name?: string; data?: DataEntry[] }

const GUIDE_BASE = 101

function readNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function valuesOf(entity: Entity): Map<string, number | string> {
  const map = new Map<string, number | string>()
  if (!Array.isArray(entity.data)) return map
  for (const entry of entity.data) {
    if (!entry || typeof entry.name !== 'string') continue
    if (entry.ref !== undefined) map.set(entry.name, entry.ref)
    else if (entry.value !== undefined) map.set(entry.name, entry.value)
  }
  return map
}

/** Archetype 文法：`[Fake] (Anchor | (Critical|Normal) [Head][Tail] [Trace][Flick] (Tap|Release|Tick|Damage)) Note` */
type Traits = {
  anchor: boolean
  transient: boolean
  critical: boolean
  head: boolean
  tail: boolean
  trace: boolean
  flick: boolean
  damage: boolean
  tick: boolean
}

function traitsOf(archetype: string): Traits {
  return {
    anchor: archetype === 'AnchorNote',
    transient: archetype === 'TransientHiddenTickNote',
    critical: archetype.startsWith('Critical'),
    head: archetype.includes('Head'),
    tail: archetype.includes('Tail'),
    trace: archetype.includes('Trace'),
    flick: archetype.includes('Flick'),
    damage: archetype.includes('Damage'),
    tick: archetype.includes('Tick'),
  }
}

function kindOf(traits: Traits): NoteKind | null {
  if (traits.transient) return null
  if (traits.anchor) return 'anchor'
  if (traits.head) return 'holdHead'
  if (traits.tail) return 'holdTail'
  if (traits.tick) return 'holdTick'
  if (traits.flick) return 'flick'
  if (traits.trace) return 'trace'
  return 'tap'
}

export function parseLevelData(text: string): Chart {
  const root = JSON.parse(text) as { bgmOffset?: number; entities?: Entity[] }
  const entities: Entity[] = Array.isArray(root.entities) ? root.entities : []
  const warnings: string[] = []

  const byName = new Map<string, number>()
  entities.forEach((entity, index) => {
    if (typeof entity.name === 'string' && !byName.has(entity.name)) byName.set(entity.name, index)
  })

  const resolve = (ref: unknown): number => {
    if (typeof ref === 'number' && Number.isInteger(ref) && ref >= 0 && ref < entities.length) return ref
    if (typeof ref === 'string') {
      const named = byName.get(ref)
      if (named !== undefined) return named
      const parsed = Number.parseInt(ref, 16)
      if (Number.isInteger(parsed) && parsed >= 0 && parsed < entities.length) return parsed
    }
    return -1
  }

  /* ── 1. BPM ─────────────────────────────────────────────────── */
  const bpmPoints: BpmPoint[] = []
  for (const entity of entities) {
    if (entity.archetype !== '#BPM_CHANGE') continue
    const values = valuesOf(entity)
    bpmPoints.push({ beat: readNumber(values.get('#BEAT')), bpm: readNumber(values.get('#BPM'), 120) })
  }
  const tempo = new TempoMap(bpmPoints.length > 0 ? bpmPoints : [{ beat: 0, bpm: 120 }])

  /* ── 2. timescale groups（marker 链）───────────────────────── */
  const groupNames: string[] = []
  const groupFirst = new Map<string, number>()
  entities.forEach((entity, index) => {
    if (entity.archetype !== '#TIMESCALE_GROUP') return
    const name = typeof entity.name === 'string' ? entity.name : `${groupNames.length}`
    groupNames.push(name)
    groupFirst.set(name, resolve(valuesOf(entity).get('first')))
  })

  const groups: Chart['groups'] = []
  let scrollNoop = 0
  let scrollWithSkip = 0
  for (const name of groupNames) {
    const markers: Marker[] = []
    const hidden: boolean[] = []
    let cursor = groupFirst.get(name) ?? -1
    const guard = new Set<number>()
    while (cursor >= 0 && entities[cursor]?.archetype === '#TIMESCALE_CHANGE' && !guard.has(cursor)) {
      guard.add(cursor)
      const values = valuesOf(entities[cursor])
      const beat = readNumber(values.get('#BEAT'), Number.NaN)
      const timescale = readNumber(values.get('#TIMESCALE'), Number.NaN)
      if (!Number.isFinite(beat) || !Number.isFinite(timescale)) {
        warnings.push(`timescale marker ${cursor} 缺字段`)
        cursor = resolve(values.get('next'))
        continue
      }
      const time = tempo.timeAt(beat)
      const skipBeats = readNumber(values.get('#TIMESCALE_SKIP'), 0)
      // 上游：converted_skip = timescale_skip * (60 / bpm)
      const skip = skipBeats === 0 ? 0 : (skipBeats * 60) / tempo.bpmAtBeat(beat)
      const ease = Math.trunc(readNumber(values.get('#TIMESCALE_EASE'), 0))
      const transitionStyle = Math.trunc(readNumber(values.get('transitionStyle'), 0))
      const hideNotes = readNumber(values.get('hideNotes'), 0) !== 0
      // SCROLL 只把 skip 从「瞬移」改成「滚过去」：它对位置的唯一影响是
      // `_scroll_width = (end - now) + (scrollSkip(end) - scrollSkip(now))`，
      // 而 scrollSkip 只由 converted_skip 累加。skip == 0 时它与普通模式逐值相等，
      // 所以只有「SCROLL 且 skip ≠ 0」才是需要实现语义的情况。
      if (transitionStyle !== 0) {
        if (skip !== 0) {
          scrollWithSkip += 1
          warnings.push(`group ${name}: transitionStyle=${transitionStyle} 且 skip=${skipBeats} 拍（SCROLL 语义未实现，位置会瞬移）`)
        } else {
          scrollNoop += 1
        }
      }
      markers.push({ time, timescale, skip, ease })
      hidden.push(hideNotes)
      cursor = resolve(values.get('next'))
    }
    if (markers.length === 0) markers.push({ time: 0, timescale: 1, skip: 0, ease: 0 })
    groups.push({ name, track: new TimescaleTrack(markers), hidden })
  }

  if (scrollNoop > 0) {
    warnings.push(`${scrollNoop} 个 SCROLL marker 的 skip 为 0（与普通模式等价，已忽略）`)
  }

  /* ── 3. 音符 ────────────────────────────────────────────────── */
  const notes: ChartNote[] = []
  const indexToId = new Map<number, number>()
  const pendingLinks: { id: number; next: number }[] = []

  entities.forEach((entity, index) => {
    const archetype = entity.archetype ?? ''
    if (archetype.startsWith('#') || archetype === 'Initialization') return
    if (archetype === 'SimLine' || archetype === 'Connector') return

    const traits = traitsOf(archetype)
    const kind = kindOf(traits)
    if (kind === null) return

    const values = valuesOf(entity)
    const beat = readNumber(values.get('#BEAT'), Number.NaN)
    if (!Number.isFinite(beat)) return

    const segmentKind = readNumber(values.get('segmentKind'), 0)
    // `segmentKind` 101..108 是 guide 路径（TouchLine）：旧解析器按 `kind - 101`
    // 取颜色。它没有判定、不该画成普通音符，所以在这里就改判成 guide。
    const resolvedKind: NoteKind = segmentKind >= 101 ? 'guide' : kind
    const critical = segmentKind > 0 ? (segmentKind % 50 === 2 || segmentKind > 50 ? segmentKind % 50 === 2 : traits.critical) : traits.critical
    const damage = traits.damage || (segmentKind > 0 && (segmentKind % 50 === 3 || segmentKind - 50 === 3))
    const groupRef = resolve(values.get('#TIMESCALE_GROUP'))
    const group = groupRef >= 0 ? groupNames.indexOf(entities[groupRef]?.name ?? '') : -1

    const id = notes.length
    const note: ChartNote = {
      id,
      index,
      archetype,
      kind: resolvedKind,
      beat,
      time: tempo.timeAt(beat),
      lane: readNumber(values.get('lane'), 0),
      size: readNumber(values.get('size'), 0.5),
      group: group >= 0 ? group : -1,
      critical,
      damage,
      direction: Math.trunc(readNumber(values.get('direction'), 0)),
      next: -1,
      prev: -1,
      chainRole: 'none',
      endTime: tempo.timeAt(beat),
    }
    notes.push(note)
    indexToId.set(index, id)
    const nextIndex = resolve(values.get('next'))
    if (nextIndex >= 0) pendingLinks.push({ id, next: nextIndex })
  })

  for (const link of pendingLinks) {
    const target = indexToId.get(link.next)
    if (target === undefined) continue
    notes[link.id].next = target
    notes[target].prev = link.id
  }

  /* ── 4. 长条（沿 next 链）───────────────────────────────────── */
  const holds: HoldSpan[] = []
  for (const note of notes) {
    if (note.kind !== 'holdHead' || note.prev !== -1) continue
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

  /* ── 5. SimLine ─────────────────────────────────────────────── */
  const simLines: SimLine[] = []
  for (const entity of entities) {
    if (entity.archetype !== 'SimLine') continue
    const values = valuesOf(entity)
    const left = indexToId.get(resolve(values.get('left')))
    const right = indexToId.get(resolve(values.get('right')))
    if (left === undefined || right === undefined || left === right) continue
    simLines.push({ left, right })
  }

  let duration = 0
  for (const note of notes) duration = Math.max(duration, note.time, note.endTime)
  if (notes.length === 0) warnings.push('没有解析到任何音符')
  if (groups.length === 0) warnings.push('没有 timescale group，回退为恒速 1×')

  return {
    bgmOffset: readNumber(root.bgmOffset, 0),
    tempo,
    groups: groups.length > 0 ? groups : [{ name: '0', track: new TimescaleTrack([{ time: 0, timescale: 1, skip: 0, ease: 0 }]), hidden: [false] }],
    notes,
    holds,
    simLines,
    duration,
    warnings,
  }
}

/**
 * `hideNotes` 可见性：marker 的 hideNotes 覆盖「该 marker 到下一个 marker」这段区间。
 * 上游用 `note_visibility_end` 做同样的事（`timescale.py:298-301`）。
 */
export function isNoteHidden(chart: Chart, note: ChartNote): boolean {
  const group = chart.groups[note.group] ?? chart.groups[0]
  if (!group || group.hidden.length === 0) return false
  const index = group.track.markerIndexAt(note.time)
  return index >= 0 && group.hidden[index] === true
}

export function trackOf(chart: Chart, note: ChartNote): TimescaleTrack {
  return chart.groups[note.group]?.track ?? chart.groups[0].track
}

/** 供调试面板显示：某组的 marker 摘要 */
export function describeGroup(chart: Chart, index: number): string {
  const group = chart.groups[index]
  if (!group) return '—'
  const markers = group.track.markers
  return `${group.name}: ${markers.length} markers, ${markers
    .slice(0, 4)
    .map((m) => `${m.time.toFixed(2)}s→${m.timescale}${m.skip ? `(+${m.skip.toFixed(2)}s)` : ''}`)
    .join(', ')}${markers.length > 4 ? ' …' : ''}`
}

export const GUIDE_COLOR_BASE = GUIDE_BASE
