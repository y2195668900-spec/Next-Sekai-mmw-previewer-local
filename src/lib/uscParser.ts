/**
 * USC (Universal Sekai Chart) -> custom score JSON.
 *
 * USC is the chart format written by usctool / MikuMikuWorld4UC. Its shape is
 *
 *   { "usc": { "offset": seconds, "objects": [ ... ] }, "version": 2 }
 *
 * and its `objects` entries are treated as a flat, unordered list of:
 *   - `bpm`            { beat, bpm }
 *   - `timeScaleGroup` { changes: [{ beat, timeScale }] }
 *   - `single`         { beat, lane, size, critical, trace, direction?, timeScaleGroup }
 *   - `damage`         { beat, lane, size, timeScaleGroup }
 *   - `guide`          { color, fade, midpoints: [{ beat, lane, size, ease, timeScaleGroup }] }
 *   - `slide`          { critical, connections: [ start | tick | attach | end ] }
 *
 * Coordinates match the preview renderer's internal convention: `lane` is the
 * note CENTRE on a -6..6 axis and `size` is the HALF width, so no scaling is
 * needed (only the integer fallback pair has to be derived).
 */

import {
  BaseType,
  Category,
  CustomScoreBuilder,
  EventType,
  LineType,
  TICKS_PER_BEAT,
  directionFromName,
  guideColorFromName,
  guideFadeFromName,
  holdEndBaseType,
  holdMidBaseType,
  holdStartBaseType,
  lineTypeFromEase,
  relativeSpeedRatio,
  quantizeSpeedSegments,
  valueAt,
  type ScoreStep,
  type SpeedChange,
} from './customScore'

type UscObject = Record<string, unknown>
type UscChange = { beat: number; timeScale: number }
type UscConnection = Record<string, unknown>

export type UscParseResult = {
  json: string
  /** `usc.offset`: seconds the chart is shifted against the audio. */
  offsetSeconds: number
  bpm: number
  noteCount: number
}

const CHART_TYPE = ['single', 'slide', 'guide', 'timescalegroup', 'bpm', 'damage'] as const
type ChartType = (typeof CHART_TYPE)[number]

function readNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return fallback
}

function readBoolean(value: unknown) {
  return value === true || value === 1
}

function readType(object: UscObject): ChartType | null {
  const type = object.type
  if (typeof type !== 'string') {
    return null
  }
  const normalized = type.trim().toLowerCase()
  return (CHART_TYPE as readonly string[]).includes(normalized) ? (normalized as ChartType) : null
}

function readObjects(root: unknown): { objects: UscObject[]; offsetSeconds: number; version: number } {
  if (!root || typeof root !== 'object' || Array.isArray(root)) {
    throw new Error('USC 文件根节点必须是对象。')
  }
  const document = root as Record<string, unknown>
  const version = readNumber(document.version, 0)
  if (version !== 2) {
    throw new Error(`不支持的 USC 版本：${version === 0 ? '未知' : version}（仅支持版本 2）。`)
  }
  const usc = document.usc
  if (!usc || typeof usc !== 'object' || Array.isArray(usc)) {
    throw new Error('USC 文件缺少 usc 字段。')
  }
  const body = usc as Record<string, unknown>
  const rawObjects = body.objects
  if (!Array.isArray(rawObjects)) {
    throw new Error('USC 文件的 usc.objects 必须是数组。')
  }
  const objects = rawObjects.filter((item): item is UscObject => !!item && typeof item === 'object' && !Array.isArray(item))
  return { objects, offsetSeconds: readNumber(body.offset, 0), version }
}

function readChanges(object: UscObject): UscChange[] {
  const rawChanges = object.changes
  if (!Array.isArray(rawChanges)) {
    return []
  }
  const changes: UscChange[] = []
  for (const raw of rawChanges) {
    if (!raw || typeof raw !== 'object') {
      continue
    }
    const change = raw as Record<string, unknown>
    const beat = readNumber(change.beat, Number.NaN)
    const timeScale = readNumber(change.timeScale, Number.NaN)
    // 负/零流速必须保留：它属于这条 version 自己的曲线，渲染器按 version
    // 积分时钟，负值就是这颗音符的时钟往回走（见 customScore 的 SpeedLayers）。
    if (Number.isFinite(beat) && Number.isFinite(timeScale)) {
      changes.push({ beat, timeScale })
    }
  }
  return changes.sort((left, right) => left.beat - right.beat)
}

function tickFromBeat(beat: number) {
  return Math.round(finiteBeat(beat) * TICKS_PER_BEAT)
}

function finiteBeat(beat: number) {
  return Number.isFinite(beat) ? beat : 0
}

/** Judge state of a slide connection endpoint, mirroring MMW's importer. */
function endpointBaseType(connection: UscConnection, fallbackCritical: boolean, role: 'start' | 'end') {
  const judgeType = typeof connection.judgeType === 'string' ? connection.judgeType.trim().toLowerCase() : ''
  const hidden = judgeType === 'none'
  const trace = judgeType === 'trace'
  // A hidden endpoint still belongs to the slide, so it keeps the chain's
  // criticality: the native renderer uses it to pick the golden hold material
  // even though the joint itself is neither judged nor drawn.
  const ownCritical = 'critical' in connection && readBoolean(connection.critical)
  const critical = role === 'start' ? ownCritical || fallbackCritical : fallbackCritical || ownCritical
  if (role === 'start') {
    // A hidden start has to stay a valid slide START on the native side, which
    // rules out `HiddenConnection`; `FrictionHideLong` is both start-class and a
    // "cancel" note, i.e. `HoldNoteType::Hidden`.
    return { baseType: holdStartBaseType(hidden, trace), critical }
  }
  // A `direction` key on the end connection means the slide ends in a flick;
  // `up` is numerically the same as "no direction", so detect the key instead.
  const flick = 'direction' in connection
  return { baseType: holdEndBaseType(hidden, trace, flick), critical }
}

function geometryOf(step: Record<string, unknown>) {
  return {
    laneCenter: readNumber(step.lane, 0),
    laneSize: readNumber(step.size, 0.5),
  }
}

export function parseUsc(text: string): UscParseResult {
  let root: unknown
  try {
    root = JSON.parse(text)
  } catch {
    throw new Error('USC 文件不是合法的 JSON。')
  }

  const { objects, offsetSeconds } = readObjects(root)

  const tempoChanges: SpeedChange[] = []
  const timelines: SpeedChange[][] = []
  let bpm = 120

  for (const object of objects) {
    const type = readType(object)
    if (type === 'bpm') {
      const beat = readNumber(object.beat, Number.NaN)
      const value = readNumber(object.bpm, Number.NaN)
      if (Number.isFinite(beat) && Number.isFinite(value) && value > 0) {
        tempoChanges.push({ tick: tickFromBeat(beat), value })
      }
    } else if (type === 'timescalegroup') {
      // USC lists a group's keyframes in editor order, not by beat. Every
      // consumer (`valueAt`, the renderer's per-version clock) reads these as a
      // step timeline and stops at the first keyframe past the queried tick, so
      // they must be sorted or the version resolves to the wrong speed - a chart
      // whose group file happens to start with its last keyframe would report
      // that speed for the entire song.
      const changes = readChanges(object)
        .map((change) => ({ tick: tickFromBeat(change.beat), value: change.timeScale }))
        .sort((left, right) => left.tick - right.tick)
      timelines.push(changes)
    }
  }

  if (tempoChanges.length === 0) {
    tempoChanges.push({ tick: 0, value: 120 })
  }
  tempoChanges.sort((left, right) => left.tick - right.tick)
  bpm = tempoChanges[0].value

  // 每个 version 的曲线原样交给渲染器；下标就是音符的 `speedLayer`。
  // `timeScaleGroup` 是组在 objects 里的序号，越界时按「没有 version」处理。
  // 短于 1/96 拍的速度段会被拉长到 1/96 拍（见 `quantizeSpeedSegments`），
  // 好让成对的极短正负尖峰互相抵消，闪现不会把画面甩到几十拍之外。
  const speedLayers = timelines.map((timeline) => quantizeSpeedSegments(timeline))
  const layerIndexOf = (group: unknown): number => {
    const index = Math.trunc(readNumber(group, 0))
    return index >= 0 && index < speedLayers.length ? index : -1
  }
  // 参考曲线只服务静态图表渲染器（`speedRatio`）和没有 version 的输入；渲染器
  // 不再靠它给音符定位，所以取第一条非空曲线即可，不做任何投票合并。
  const referenceTimeline = speedLayers.find((timeline) => timeline.length > 0) ?? []
  const speedRatioOf = (group: unknown, tick: number): number => {
    const index = layerIndexOf(group)
    return index < 0 ? 1 : relativeSpeedRatio(valueAt(referenceTimeline, tick), valueAt(speedLayers[index], tick))
  }

  // 一个音符要同时带上「属于哪条曲线」和「图表近似倍率」。
  const speedOf = (group: unknown, tick: number) => ({ layer: layerIndexOf(group), ratio: speedRatioOf(group, tick) })

  const builder = new CustomScoreBuilder()
  builder.setSpeedLayers(speedLayers)
  for (const change of tempoChanges) {
    builder.addEvent(EventType.Bpm, change.tick, change.value)
  }
  // 参考曲线仍以 HiSpeed 事件下发：静态图表渲染器用它做时间轴，预览器的
  // 逐 version 时钟只在音符没有 `speedLayer` 时才回退到它。
  for (const change of referenceTimeline) {
    builder.addEvent(EventType.HiSpeed, change.tick, change.value)
  }

  const singles: UscObject[] = []
  const slides: UscObject[] = []
  const guides: UscObject[] = []
  const damages: UscObject[] = []

  for (const object of objects) {
    const type = readType(object)
    if (type === 'single') {
      singles.push(object)
    } else if (type === 'slide') {
      slides.push(object)
    } else if (type === 'guide') {
      guides.push(object)
    } else if (type === 'damage') {
      damages.push(object)
    }
  }

  for (const single of singles) {
    const geometry = geometryOf(single)
    const tick = tickFromBeat(readNumber(single.beat, 0))
    const critical = readBoolean(single.critical)
    const trace = readBoolean(single.trace)
    const direction = directionFromName(single.direction)
    // A USC `direction` of `up` means "flick straight up", which is numerically
    // the same as "no direction", so the flick flag has to come from the
    // presence of the key rather than from its value.
    const flick = direction !== 0 || 'direction' in single
    const baseType = trace
      ? flick
        ? BaseType.FrictionFlick
        : BaseType.Friction
      : flick
        ? BaseType.Flick
        : BaseType.Normal
    const speed = speedOf(single.timeScaleGroup, tick)
    builder.addTap({
      ...geometry,
      tick,
      critical,
      baseType,
      direction,
      speedLayer: speed.layer,
      speedRatio: speed.ratio,
    })
  }

  for (const slide of slides) {
    const connections = Array.isArray(slide.connections) ? (slide.connections as UscConnection[]) : []
    const steps = buildSlideSteps(connections, readBoolean(slide.critical), speedOf)
    if (steps.length >= 2) {
      builder.addChain(steps)
    }
  }

  // Damage notes: hazards that fly on their own track outside the stage. They
  // are drawn like a tap (same `lane` is the centre, same `size` is the half
  // width) but keep their own sprite slot, take no judgement and play no hit
  // sound. Their `timeScaleGroup` is resolved exactly like any other note, so
  // they approach at the speed their version authored.
  for (const damage of damages) {
    const tick = tickFromBeat(readNumber(damage.beat, 0))
    const speed = speedOf(damage.timeScaleGroup, tick)
    builder.addTap({
      ...geometryOf(damage),
      tick,
      critical: false,
      baseType: BaseType.Damage,
      category: Category.Damage,
      damage: true,
      speedLayer: speed.layer,
      speedRatio: speed.ratio,
    })
  }

  for (const guide of guides) {
    const midpoints = Array.isArray(guide.midpoints) ? guide.midpoints : []
    const steps: ScoreStep[] = []
    for (const raw of midpoints) {
      if (!raw || typeof raw !== 'object') {
        continue
      }
      const point = raw as Record<string, unknown>
      const tick = tickFromBeat(readNumber(point.beat, 0))
      const speed = speedOf(point.timeScaleGroup, tick)
      steps.push({
        ...geometryOf(point),
        tick,
        critical: false,
        baseType: BaseType.Guide,
        lineType: lineTypeFromEase(point.ease),
        speedLayer: speed.layer,
        speedRatio: speed.ratio,
        guideColor: guideColorFromName(guide.color),
        guideFade: guideFadeFromName(guide.fade),
      })
    }
    steps.sort((left, right) => left.tick - right.tick)
    builder.addGuidePath(steps)
  }

  return {
    json: builder.buildJson(),
    offsetSeconds,
    bpm,
    noteCount: builder.noteCount,
  }
}

function buildSlideSteps(
  connections: UscConnection[],
  slideCritical: boolean,
  speedOf: (group: unknown, tick: number) => { layer: number; ratio: number },
): ScoreStep[] {
  const starts: UscConnection[] = []
  const ticks: UscConnection[] = []
  const attaches: UscConnection[] = []
  const ends: UscConnection[] = []

  for (const connection of connections) {
    const type = typeof connection.type === 'string' ? connection.type.trim().toLowerCase() : ''
    if (type === 'start') {
      starts.push(connection)
    } else if (type === 'end') {
      ends.push(connection)
    } else if (type === 'attach') {
      attaches.push(connection)
    } else {
      // Anything else (normally `tick`) sorts by beat between start and end.
      ticks.push(connection)
    }
  }

  const byBeat = (left: UscConnection, right: UscConnection) =>
    readNumber(left.beat, 0) - readNumber(right.beat, 0)
  ticks.sort(byBeat)
  attaches.sort(byBeat)

  const steps: ScoreStep[] = []

  const head = starts[0]
  if (!head) {
    // A slide without a `start` connection cannot be rendered as a hold.
    return steps
  }
  {
    const tick = tickFromBeat(readNumber(head.beat, 0))
    const { baseType, critical } = endpointBaseType(head, slideCritical, 'start')
    const speed = speedOf(head.timeScaleGroup, tick)
    steps.push({
      ...geometryOf(head),
      tick,
      critical,
      baseType,
      lineType: lineTypeFromEase(head.ease),
      speedLayer: speed.layer,
      speedRatio: speed.ratio,
    })
  }

  for (const connection of [...attaches, ...ticks].sort(byBeat)) {
    const tick = tickFromBeat(readNumber(connection.beat, 0))
    const judgeType = typeof connection.judgeType === 'string' ? connection.judgeType.trim().toLowerCase() : ''
    const connectionType = typeof connection.type === 'string' ? connection.type.trim().toLowerCase() : ''
    const speed = speedOf(connection.timeScaleGroup, tick)
    if (judgeType === 'none') {
      // A hidden tick is only a shape point on the hold body.
      steps.push({
        ...geometryOf(connection),
        tick,
        critical: false,
        baseType: holdMidBaseType(true),
        lineType: lineTypeFromEase(connection.ease),
        speedLayer: speed.layer,
        speedRatio: speed.ratio,
      })
      continue
    }
    if (judgeType === 'trace' || readBoolean(connection.trace)) {
      steps.push({
        ...geometryOf(connection),
        tick,
        critical: false,
        baseType: BaseType.FrictionLong,
        lineType: lineTypeFromEase(connection.ease),
        speedLayer: speed.layer,
        speedRatio: speed.ratio,
      })
      continue
    }
    // `attach` = 可见中继附件（visible relay attachment）：它贴在 hold 路径上，
    // 只留一个判定点，**不参与判定、也不参与 hold 的形变**。必须发成
    // `BaseType.Connection` + `isSkip`，wasm 的 `isVisibleRelayAttachment()` 才会
    // 把它当成 `HoldStepType::Skip`；否则它会被当成普通中继，既画成完整菱形，
    // 又把 hold 的路径/宽度掰向自己的 lane/size。
    if (connectionType === 'attach') {
      steps.push({
        ...geometryOf(connection),
        tick,
        critical: 'critical' in connection ? readBoolean(connection.critical) : false,
        baseType: BaseType.Connection,
        category: Category.Connection,
        lineType: lineTypeFromEase(connection.ease),
        isSkip: true,
        speedLayer: speed.layer,
        speedRatio: speed.ratio,
      })
      continue
    }
    // A `tick` connection is only judged when it carries a `critical` key; a
    // tick without that key is a pure visual control point.
    const hasCritical = 'critical' in connection
    steps.push({
      ...geometryOf(connection),
      tick,
      critical: hasCritical ? readBoolean(connection.critical) : false,
      baseType: holdMidBaseType(!hasCritical),
      lineType: lineTypeFromEase(connection.ease),
      speedLayer: speed.layer,
      speedRatio: speed.ratio,
    })
  }

  const tail = ends[0]
  if (tail) {
    const tick = tickFromBeat(readNumber(tail.beat, 0))
    const { baseType, critical } = endpointBaseType(tail, slideCritical, 'end')
    const direction = directionFromName(tail.direction)
    const speed = speedOf(tail.timeScaleGroup, tick)
    steps.push({
      ...geometryOf(tail),
      tick,
      critical,
      baseType,
      direction,
      lineType: LineType.Linear,
      speedLayer: speed.layer,
      speedRatio: speed.ratio,
    })
  }

  return steps
}
