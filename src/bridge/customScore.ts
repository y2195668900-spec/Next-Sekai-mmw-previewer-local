/**
 * LevelData → 旧版 wasm 渲染器能吃的 `CustomScoreJson`。
 *
 * 音符模型直接复用旧版 `src/lib/levelDataParser.ts`（只读引用，不复制、不修改）：
 * 那张表把 archetype 语法、长条链、guide、style、连线拼接都覆盖过了，
 * 重写一遍只会引入新的不一致。
 *
 * 本层只替换一件事：**变速**。旧版把 marker 当阶跃、再用 1/96 拍量化凑闪现；
 * 这里改用新版内核的 marker 时间轴（缓动 + 积分 + skip）反推 `SpeedLayers`。
 */

import { parseLevelData as parseLegacyLevelData } from '../../../src/lib/levelDataParser'
import { relativeSpeedRatio } from '../../../src/lib/customScore'
import type { Chart } from '../data/types'
import { createTickClock, readTempoEvents, type TempoEvent, type TickClock } from './clock'
import { buildSpeedLayers, valueAtKeys, type SpeedBridgeOptions, type SpeedKey } from './speed'

export type CustomScoreJsonShape = {
  MusicScoreEventDataList: { eventType: number; ticks: number; changeValue: number }[]
  NoteList: Record<string, unknown>[]
  SpeedLayers: SpeedKey[][]
}

export type BridgeResult = {
  /** 可以直接喂给 `loadCustomScoreJsonSession` 的 JSON 文本 */
  scoreText: string
  clock: TickClock
  tempos: TempoEvent[]
  /** 旧版解析器产出的曲线（替换之前），仅用于核对与 A/B */
  legacyLayers: SpeedKey[][]
  stats: {
    notes: number
    groups: number
    keys: number
    maxValue: number
    minValue: number
    normalizedGroups: number
    /** speedRatio 被改写的音符数（新曲线与旧曲线不一致时才会非 0） */
    ratioChanged: number
  }
  warnings: string[]
}

/**
 * 旧版解析器只认「有 name 的 `#TIMESCALE_GROUP`」，新版对匿名组也会建一条轨道。
 * 名字缺一个，后面所有下标就整体错位 —— 所以先把名字补齐，让两边的组序列一致。
 */
export function normalizeTimescaleGroups(text: string): { text: string; renamed: number } {
  let document: any
  try {
    document = JSON.parse(text)
  } catch {
    return { text, renamed: 0 }
  }
  if (!document || !Array.isArray(document.entities)) {
    return { text, renamed: 0 }
  }

  const used = new Set<string>()
  let renamed = 0
  document.entities.forEach((entity: any, index: number) => {
    if (!entity || entity.archetype !== '#TIMESCALE_GROUP') return
    const name = entity.name
    if (typeof name === 'string' && name.length > 0 && !used.has(name)) {
      used.add(name)
      return
    }
    let candidate = ''
    let suffix = 0
    do {
      candidate = `__tsg_${index}_${suffix++}`
    } while (used.has(candidate))
    entity.name = candidate
    used.add(candidate)
    renamed += 1
  })

  return renamed > 0 ? { text: JSON.stringify(document), renamed } : { text, renamed: 0 }
}

export function buildCustomScore(
  levelDataText: string,
  chart: Chart,
  options: SpeedBridgeOptions = {},
): BridgeResult {
  const normalized = normalizeTimescaleGroups(levelDataText)
  const legacy = parseLegacyLevelData(normalized.text)
  const document = JSON.parse(legacy.json) as CustomScoreJsonShape
  return finishBridge(document, chart, options, normalized.renamed)
}

/**
 * 已经拿到 `CustomScoreJson` 时走这条（USC 导入就是这样：旧版 USC 解析器直接
 * 产出了这个结构，不需要再经过 LevelData）。
 */
export function bridgeFromDocument(
  document: CustomScoreJsonShape,
  chart: Chart,
  options: SpeedBridgeOptions = {},
): BridgeResult {
  // 克隆一份：`finishBridge` 会就地改写 SpeedLayers / speedRatio，
  // 而 USC 的文档在页面里是复用的（重新挂载、切换渲染器都会再走一次）。
  const copy = JSON.parse(JSON.stringify(document)) as CustomScoreJsonShape
  return finishBridge(copy, chart, options, 0)
}

function finishBridge(
  document: CustomScoreJsonShape,
  chart: Chart,
  options: SpeedBridgeOptions,
  normalizedGroups: number,
): BridgeResult {
  const tempos = readTempoEvents(document)
  const clock = createTickClock(tempos)
  const layers = buildSpeedLayers(chart, clock, options)

  // 旧版自带的曲线（阶跃 + 1/96 拍量化）留一份：用来核对「组下标是否对齐」，
  // 也方便在界面上做 A/B。
  const legacyLayers = document.SpeedLayers ?? []
  document.SpeedLayers = layers

  const warnings: string[] = []
  if (layers.length !== chart.groups.length) {
    warnings.push(`速度层 ${layers.length} 条 ≠ 时序组 ${chart.groups.length} 个`)
  }
  let fixed = 0
  for (const note of document.NoteList) {
    const layer = Number(note.speedLayer)
    if (!Number.isInteger(layer) || layer < 0) continue
    if (layer >= layers.length) {
      note.speedLayer = layers.length - 1
      fixed += 1
    }
  }

  // `speedRatio` 决定「音符在屏幕上停留多久」（渲染器算 `visibleDuration = base / ratio`）。
  // 旧值是按被替换掉的阶跃曲线算的，必须按新曲线重算，否则同一颗音符的进场时长会和位移对不上。
  const reference = layers.find((layer) => layer.length > 0) ?? []
  let ratioChanged = 0
  for (const note of document.NoteList) {
    const layer = Number(note.speedLayer)
    if (!Number.isInteger(layer) || layer < 0 || layer >= layers.length) continue
    const tick = Number(note.ticks)
    if (!Number.isFinite(tick)) continue
    const ratio = relativeSpeedRatio(valueAtKeys(reference, tick), valueAtKeys(layers[layer], tick))
    if (Math.abs(ratio - Number(note.speedRatio ?? 1)) > 1e-4) ratioChanged += 1
    note.speedRatio = ratio
  }
  if (fixed > 0) {
    warnings.push(`${fixed} 个音符的 speedLayer 越界，已收敛到最后一层`)
  }

  let keys = 0
  let maxValue = -Infinity
  let minValue = Infinity
  for (const layer of layers) {
    keys += layer.length
    for (const key of layer) {
      if (key.value > maxValue) maxValue = key.value
      if (key.value < minValue) minValue = key.value
    }
  }

  return {
    scoreText: JSON.stringify(document),
    clock,
    tempos,
    legacyLayers: legacyLayers as SpeedKey[][],
    stats: {
      notes: document.NoteList.length,
      groups: layers.length,
      keys,
      maxValue: Number.isFinite(maxValue) ? maxValue : 1,
      minValue: Number.isFinite(minValue) ? minValue : 1,
      normalizedGroups,
      ratioChanged,
    },
    warnings,
  }
}

/** 用旧格式曲线复算视觉时钟，用来验证「桥接后的时钟 == 新内核时钟」。 */
export function clockFromSpeedLayer(keys: SpeedKey[], clock: TickClock, tick: number): number {
  if (keys.length === 0 || tick <= 0) {
    return clock.secondsAtTick(Math.max(0, tick))
  }
  let total = 0
  for (let i = 0; i < keys.length; i += 1) {
    const from = Math.max(0, keys[i].ticks)
    if (from >= tick) break
    const next = i + 1 < keys.length ? keys[i + 1].ticks : Number.POSITIVE_INFINITY
    const to = Math.min(next, tick)
    if (to <= from) continue
    total += (clock.secondsAtTick(to) - clock.secondsAtTick(from)) * keys[i].value
  }
  return total
}
