/**
 * Shared helpers for building the "custom score JSON" that the native wasm
 * preview session consumes (`loadCustomScoreJsonSession`).
 *
 * The renderer only understands the note model below, so formats such as USC
 * (Universal Sekai Chart) and Sonolus LevelData are converted into it here
 * instead of teaching the C++ side every input format.
 *
 * Note semantics implemented by `native/src/custom_score_json.h`:
 *  - `laneStart` / `laneEnd` are an integer LEFT edge (0..11) plus an inclusive
 *    right edge; `width = laneEnd - laneStart + 1`.
 *  - `laneCenter` / `laneSize` are optional continuous overrides. They use the
 *    same convention as USC and LevelData: `laneCenter` is the note CENTER in
 *    the -6..6 stage range and `laneSize` is the half width. When both are
 *    present the renderer uses `lane = laneCenter - laneSize + 6` and
 *    `width = laneSize * 2`, which keeps fractional lane positions intact.
 *  - `type` is the CRITICAL flag (a confusing but fixed name in the wasm).
 *  - `direction`: 1 = flick left, 2 = flick right, anything else = straight.
 *  - `flickDirection`: absolute flick direction from Sonolus LevelData
 *    (1 = left, 2 = right, 3 = down, 4 = down-left, 5 = down-right). When set,
 *    the renderer turns / mirrors the arrow to point that way; `direction` keeps
 *    the legacy MMW diagonal meaning for USC charts.
 *  - `noteLineType`: 2 = ease in, 1 = ease out, 3 = ease in then out,
 *    4 = ease out then in, anything else = linear.
 *  - `speedLayer` indexes `SpeedLayers`: every version (USC `timeScaleGroup`,
 *    LevelData `#TIMESCALE_GROUP`) keeps its own hi-speed curve and the renderer
 *    integrates the note's own curve into a private visual clock. There is no
 *    merged/global curve any more, so notes with different speeds at the same
 *    tick each get their own approach speed while still landing on the
 *    judgement line at their tick.
 */

export const TICKS_PER_BEAT = 480
/** The stage spans lanes -6..6; USC and LevelData both use this axis. */
export const STAGE_EDGE = 6
export const MIN_LANE_SIZE = 0.05
export const MAX_LANE_SIZE = STAGE_EDGE
/**
 * Coordinate quantisation grid. USC and LevelData both place notes on a
 * 1/96-beat and 1/8-lane lattice, so 1/8192 of a lane is well below anything a
 * charter can express while still absorbing the ~1e-7 float noise that the two
 * exporters introduce.
 */
export const COORDINATE_PRECISION = 8192

export const EventType = {
  Bpm: 0,
  HiSpeed: 1,
  SeVolume: 2,
} as const

/** Note base types ("noteBaseType") recognised by the wasm parser. */
export const BaseType = {
  Base: 0,
  Normal: 1,
  Long: 2,
  Flick: 3,
  FrictionFlick: 4,
  Connection: 5,
  HiddenConnection: 6,
  LongHoldCombo: 7,
  FrictionLong: 8,
  FrictionHideLong: 9,
  Guide: 10,
  Friction: 11,
  FrictionHide: 12,
  GuideEnd: 13,
  GuideHiddenConnection: 14,
  /**
   * Hazard ("damage") note. It carries no judgement and no hit sound; the
   * renderer only draws it, on its own sprite slot. The value is opaque to the
   * wasm classifier (it falls through to "relay"), the `damage` flag on the
   * note is what actually marks it.
   */
  Damage: 15,
} as const

/** Note categories ("category") recognised by the wasm parser. */
export const Category = {
  Normal: 0,
  Long: 1,
  Connection: 2,
  Flick: 3,
  Friction: 4,
  FrictionHide: 5,
  FrictionLong: 6,
  FrictionHideLong: 7,
  FrictionFlick: 8,
  /** Marks a whole slide chain as a guide ("TouchLine") path. */
  Guide: 9,
  /** Hazard note (see `BaseType.Damage`); never part of a judged chain. */
  Damage: 10,
} as const

/** Note line types ("noteLineType"). */
export const LineType = {
  Linear: 0,
  EaseOut: 1,
  EaseIn: 2,
  /**
   * "Easy in out": the connection eases in for its first half and eases out for
   * its second half, i.e. it leaves the previous joint slowly, rushes through
   * the middle and settles into the next joint slowly.
   */
  EaseInOut: 3,
  /** "Easy out in": the mirror image - fast off the joint, slow through the middle, fast into the next one. */
  EaseOutIn: 4,
} as const

export type CustomScoreEvent = {
  eventType: number
  ticks: number
  changeValue: number
}

export type CustomScoreNote = {
  id: number
  ticks: number
  laneStart: number
  laneEnd: number
  category: number
  noteBaseType: number
  previousConnectionId: number
  nextConnectionId: number
  direction: number
  /**
   * Absolute flick direction from Sonolus LevelData: 1 = left, 2 = right,
   * 3 = down, 4 = down-left, 5 = down-right. Absent / 0 keeps the legacy
   * `direction` behaviour.
   */
  flickDirection?: number
  /** Per-note hit sound override (Sonolus LevelData `effectKind`, 0..10). */
  hitEffect?: number
  noteLineType: number
  speedRatio: number
  type: boolean
  isSkip: boolean
  laneCenter: number
  laneSize: number
  /** Sonolus LevelData note style; 0 keeps the default sprite colour. */
  style: number
  /** Guide colour index (0 neutral ... 7 black); -1 when unspecified. */
  guideColor: number
  /** Guide fade type: 0 = out, 1 = none, 2 = in, -1 = unspecified. */
  guideFade: number
  /** True for a hazard note (`damage` in USC, `DamageNote` in LevelData). */
  damage: boolean
  /**
   * 该音符所在 version 在 `SpeedLayers` 里的下标，渲染器用它选一条变速曲线
   * 独立积分视觉时钟。-1 表示这份输入没有 version 信息（SUS / 旧 ZIP 等），
   * 退回 `MusicScoreEventDataList` 里的单条曲线。
   */
  speedLayer: number
  /**
   * 旧式「反着进场」标记，只在没有 version 信息的输入（SUS）里使用。
   *
   * USC / LevelData 不再需要它：负流速 version 的时钟自己会倒退，音符自然在
   * 判定线上出现后向上退场。保留这个字段是为了让 SUS 那条渲染路径不变。
   */
  reverse: boolean
}

export type CustomScoreJson = {
  MusicScoreEventDataList: CustomScoreEvent[]
  NoteList: CustomScoreNote[]
  /**
   * 每个 version 各自的一条变速关键帧曲线，下标与音符的 `speedLayer` 对齐。
   * 条目形状与 `MusicScoreEventDataList` 一致（`ticks` / `value`）。
   *
   * 渲染器不再把多条曲线合成一条全局曲线：每颗音符都用自己的 version 曲线
   * 积分出视觉时钟，所以同一时刻存在不同速度的音符时，它们各自按自己的速度
   * 行进，互不干扰（详见 `native/src/mmw_preview.cpp` 的 `scaledTimeAt`）。
   */
  SpeedLayers: Array<Array<{ ticks: number; value: number }>>
}

/**
 * Content-derived ordering key for a note.
 *
 * The native session re-sorts notes by `(ticks, laneStart, id)` and then hands
 * out its own ids while walking the chains, so a renderer's draw order follows
 * the order the source file happened to list its notes in. Two adapters that
 * describe the same chart (e.g. the same song exported as USC and as Sonolus
 * LevelData) can therefore composite notes in a different order and produce
 * frames that differ by a few alpha levels.
 *
 * Sorting by note content instead makes the emitted ids, and with them the
 * draw order, depend only on what the chart contains. Geometry is rounded
 * because the two exporters carry slightly different float noise (the guide
 * midpoints of the reference samples differ by ~1e-7).
 */
function noteSortKey(note: CustomScoreNote): number[] {
  return [
    note.ticks,
    Math.round(note.laneCenter * 4096),
    Math.round(note.laneSize * 4096),
    note.category,
    note.noteBaseType,
    note.type ? 1 : 0,
    note.direction,
    note.flickDirection ?? 0,
    note.hitEffect ?? 0,
    note.noteLineType,
    note.speedLayer,
    Math.round(note.speedRatio * 4096),
    note.isSkip ? 1 : 0,
    note.laneStart,
    note.laneEnd,
    note.style,
    note.guideColor,
    note.guideFade,
    note.damage ? 1 : 0,
    note.reverse ? 1 : 0,
  ]
}

/**
 * Renumber the note list into a canonical order derived from the chart content.
 *
 * The native session re-sorts notes by `(ticks, laneStart, id)` and then hands
 * out its own ids while walking the chains, so a renderer's draw order follows
 * the order the source file happened to list its notes in. Two adapters that
 * describe the same chart (e.g. the same song exported as USC and as Sonolus
 * LevelData) list the very same notes in a different order, which makes them
 * composite in a different order and produce frames that differ by a few alpha
 * levels.
 *
 * Numbering the notes by chain-invariant content instead makes the emitted ids
 * — and with them the draw order — depend only on what the chart contains.
 * Chains are ordered by the sequence of their notes' content keys, so chains
 * that only differ in which end came first still compare equal and fall back to
 * their length and finally to their position in the source list.
 */
function canonicalizeNotes(notes: CustomScoreNote[]): CustomScoreNote[] {
  const byId = new Map<number, CustomScoreNote>()
  for (const note of notes) {
    byId.set(note.id, note)
  }

  const keyOf = new Map<number, string>()
  for (const note of notes) {
    keyOf.set(note.id, noteSortKey(note).join(','))
  }

  // Walk the chains once, recording each note's chain and its position in it.
  const chainOf = new Map<number, number>()
  const positionOf = new Map<number, number>()
  const chains: number[][] = []
  for (const note of notes) {
    if (note.previousConnectionId !== -1 || note.nextConnectionId === -1) {
      continue
    }
    const chain: number[] = []
    let current: CustomScoreNote | undefined = note
    const guard = new Set<number>()
    while (current && !guard.has(current.id)) {
      guard.add(current.id)
      chain.push(current.id)
      chainOf.set(current.id, chains.length)
      positionOf.set(current.id, chain.length - 1)
      current = current.nextConnectionId === -1 ? undefined : byId.get(current.nextConnectionId)
    }
    chains.push(chain)
  }
  // Notes that are not part of a chain (plain taps) form single-note chains.
  for (const note of notes) {
    if (chainOf.has(note.id)) {
      continue
    }
    chainOf.set(note.id, chains.length)
    positionOf.set(note.id, 0)
    chains.push([note.id])
  }

  const chainKeys = chains.map((chain) => chain.map((id) => keyOf.get(id) ?? '').join(' > '))
  const order = chains.map((_, index) => index)
  order.sort((left, right) => {
    if (chainKeys[left] !== chainKeys[right]) {
      return chainKeys[left] < chainKeys[right] ? -1 : 1
    }
    if (chains[left].length !== chains[right].length) {
      return chains[left].length - chains[right].length
    }
    return left - right
  })

  const idMap = new Map<number, number>()
  const ordered: number[] = []
  for (const chainIndex of order) {
    for (const id of chains[chainIndex]) {
      idMap.set(id, ordered.length + 1)
      ordered.push(id)
    }
  }

  return ordered.map((id, index) => {
    const note = byId.get(id) as CustomScoreNote
    return {
      ...note,
      id: index + 1,
      previousConnectionId: note.previousConnectionId === -1 ? -1 : (idMap.get(note.previousConnectionId) ?? -1),
      nextConnectionId: note.nextConnectionId === -1 ? -1 : (idMap.get(note.nextConnectionId) ?? -1),
    }
  })
}

export type StepGeometry = {
  /** Note centre on the -6..6 stage axis. */
  laneCenter: number
  /** Half of the note width, in lanes. */
  laneSize: number
}

export type ScoreStep = StepGeometry & {
  tick: number
  critical: boolean
  baseType: number
  category?: number
  direction?: number
  /** Absolute flick direction (Sonolus LevelData `direction`, 1..5). */
  flickDirection?: number
  lineType?: number
  /** Visual speed multiplier; HoldMid/HoldEnd inherit the head's value. */
  speedRatio?: number
  /**
   * 该音符所在 version 在 `SpeedLayers` 里的下标；-1 / 省略表示没有 version
   * 信息，渲染器退回单条曲线。
   */
  speedLayer?: number
  isSkip?: boolean
  /** Sonolus LevelData note style (0 = default, 1..8 = palette colours). */
  style?: number
  /** Guide colour index (0 neutral ... 7 black). */
  guideColor?: number
  /** Guide fade type: 0 = out, 1 = none, 2 = in. */
  guideFade?: number
  /** Hazard note (see `BaseType.Damage`); drawn on its own texture. */
  damage?: boolean
  /** 所在 version 流速 ≤ 0 → 这颗音符从判定线往上退场（反着进场）。 */
  reverse?: boolean
  /**
   * Per-note hit sound (Sonolus LevelData `effectKind`):
   * 0 = default (keep the note-kind sound), 1 = none, 2 = tap perfect,
   * 3 = flick, 4 = trace, 5 = tick, 6 = critical tap, 7 = critical flick,
   * 8 = critical trace, 9 = critical tick, 10 = damage.
   */
  hitEffect?: number
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback
}

/**
 * Round a coordinate to a precision that is far finer than any authored
 * position but coarse enough to erase float noise.
 *
 * The reference USC and LevelData exports of the same chart store the same
 * geometry with subtly different float rounding (`-4.499999903142452` vs
 * `-4.500000022351742`). Those positions are visually identical but would
 * otherwise make the two adapters emit different bytes, so both snap to the
 * same grid here.
 */
export function snapCoordinate(value: number): number {
  return Math.round(value * COORDINATE_PRECISION) / COORDINATE_PRECISION
}

/**
 * 归一化音符几何。
 *
 * 位置（`laneCenter`）**不做任何舞台范围夹紧**：真实谱面里音符可以出现在
 * ±6 以外很远处（damage 音符常驻 ±17..±24、gimmick 段整段在舞台外），
 * 预览器必须按原始坐标渲染，越界的部分自然落到画面之外。
 * 只有宽度仍限制在「最窄一点点、最宽铺满 12 轨」的合理区间。
 */
export function normalizeGeometry(geometry: StepGeometry): StepGeometry {
  const laneCenter = snapCoordinate(finiteOr(geometry.laneCenter, 0))
  return {
    laneCenter,
    laneSize: clamp(snapCoordinate(finiteOr(geometry.laneSize, 0.5)), MIN_LANE_SIZE, MAX_LANE_SIZE),
  }
}

/**
 * Quantise continuous geometry to the integer `laneStart`/`laneEnd` pair so the
 * note still sorts and dedups correctly on the native side, while
 * `laneCenter`/`laneSize` keep the exact position.
 *
 * The integer pair saturates at the stage edges — it is only a sorting key, the
 * rendered position always comes from `laneCenter`.
 */
export function quantizeLane(geometry: StepGeometry) {
  const normalized = normalizeGeometry(geometry)
  const left = normalized.laneCenter - normalized.laneSize
  const right = normalized.laneCenter + normalized.laneSize
  const laneStart = clamp(Math.round(left + STAGE_EDGE), 0, 11)
  const laneEnd = clamp(Math.round(right + STAGE_EDGE) - 1, laneStart, 11)
  return { laneStart, laneEnd, ...normalized }
}

/** Ease name (USC / LevelData vocabulary) to `noteLineType`. */
export function lineTypeFromEase(ease: unknown): number {
  if (typeof ease !== 'string') {
    return LineType.Linear
  }
  switch (ease.trim().toLowerCase()) {
    case 'in':
    case 'easein':
    case 'ease-in':
      return LineType.EaseIn
    case 'out':
    case 'easeout':
    case 'ease-out':
      return LineType.EaseOut
    // "Easy in out" / "easy out in" are their own curve types: both halves of
    // the connection use a different ease, they are NOT the same as a plain
    // ease-in / ease-out.
    case 'inout':
    case 'in-out':
    case 'easeinout':
    case 'ease-in-out':
      return LineType.EaseInOut
    case 'outin':
    case 'out-in':
    case 'easeoutin':
    case 'ease-out-in':
      return LineType.EaseOutIn
    default:
      return LineType.Linear
  }
}

/** Numerical LevelData `connectorEase` to `noteLineType`. */
export function lineTypeFromConnectorEase(ease: unknown): number {
  switch (ease) {
    case 2:
      return LineType.EaseIn
    case 3:
      return LineType.EaseOut
    case 4:
      return LineType.EaseInOut
    case 5:
      return LineType.EaseOutIn
    default:
      return LineType.Linear
  }
}

/**
 * Base type for the FIRST element of a hold chain.
 *
 * The wasm parser only opens a hold when the first element classifies as a
 * slide START, which limits the choice to `Long` (2), `FrictionLong` (8),
 * `FrictionHideLong` (9), `Guide` (10) or `category: 6`. `FrictionHideLong` is
 * also a "cancel" note, which is what turns the hold head into
 * `HoldNoteType::Hidden` — the encoding for a `judgeType: none` slide start.
 */
export function holdStartBaseType(hidden: boolean, trace: boolean): number {
  if (hidden) {
    return BaseType.FrictionHideLong
  }
  return trace ? BaseType.FrictionLong : BaseType.Long
}

/**
 * Base type for the LAST element of a hold chain.
 *
 * The last element is always classified as a slide END by position, so this
 * only has to carry the note's own appearance: `FrictionHide` (12) is a cancel
 * note and therefore hides the hold end, `Flick`/`FrictionFlick` draw a flick
 * arrow, `Friction` marks a trace end and `Normal` a plain judged one.
 */
export function holdEndBaseType(hidden: boolean, trace: boolean, flick: boolean): number {
  if (hidden) {
    return BaseType.FrictionHide
  }
  if (flick) {
    return trace ? BaseType.FrictionFlick : BaseType.Flick
  }
  return trace ? BaseType.Friction : BaseType.Normal
}

/**
 * Base type for an INTERMEDIATE element of a hold chain.
 *
 * `HiddenConnection` (6) classifies as an invisible step, so the renderer draws
 * the hold path through it without a note sprite; `Base` (0) is a plain relay
 * step and shows the usual tick sprite.
 */
export function holdMidBaseType(hidden: boolean): number {
  return hidden ? BaseType.HiddenConnection : BaseType.Base
}

/** Flick direction (1 = left, 2 = right, 0 = straight) from a USC string. */
export function directionFromName(direction: unknown): number {
  if (typeof direction !== 'string') {
    return 0
  }
  switch (direction.trim().toLowerCase()) {
    case 'left':
      return 1
    case 'right':
      return 2
    default:
      return 0
  }
}

/**
 * Guide colour index from a USC `color` string.
 *
 * The order matches the USC/Sonolus guide palette so the value can travel to the
 * renderer unchanged: 0 neutral, 1 red, 2 green, 3 blue, 4 yellow, 5 purple,
 * 6 cyan, 7 black. Unknown or missing colours return -1 (no tint).
 */
export function guideColorFromName(color: unknown): number {
  if (typeof color !== 'string') {
    return -1
  }
  switch (color.trim().toLowerCase()) {
    case 'neutral':
      return 0
    case 'red':
      return 1
    case 'green':
      return 2
    case 'blue':
      return 3
    case 'yellow':
      return 4
    case 'purple':
      return 5
    case 'cyan':
      return 6
    case 'black':
      return 7
    default:
      return -1
  }
}

/**
 * Guide fade type from a USC `fade` string: `out` -> 0, `none` -> 1, `in` -> 2.
 *
 * Mirrors MikuMikuWorld's `FadeType`, so an omitted field falls back to the
 * format's default of a fade-out (`0`).
 */
export function guideFadeFromName(fade: unknown): number {
  if (typeof fade !== 'string') {
    return 0
  }
  switch (fade.trim().toLowerCase()) {
    case 'none':
      return 1
    case 'in':
      return 2
    default:
      return 0
  }
}

/**
 * LevelData numeric direction handled by the wasm parser: the importer only
 * distinguishes left (1) / right (2) from everything else.
 */
export function directionFromNumber(direction: unknown): number {
  if (direction === 1) {
    return 1
  }
  if (direction === 2) {
    return 2
  }
  return 0
}

export class CustomScoreBuilder {
  private readonly events: CustomScoreEvent[] = []
  private readonly notes: CustomScoreNote[] = []
  private speedLayers: CustomScoreJson['SpeedLayers'] = []
  private nextId = 1

  /** True once at least one note has been emitted. */
  get noteCount() {
    return this.notes.length
  }

  /**
   * 注册全部 version 曲线；下标即音符的 `speedLayer`。
   *
   * 没有关键帧的 version 归一成「恒定 1.0」——MMW 里没有变速事件的 version 就是
   * 1 倍速，不能让它退回别的 version 的曲线。
   */
  setSpeedLayers(layers: SpeedLayer[]): void {
    this.speedLayers = layers.map((layer) =>
      // JSON 字段名必须是 `ticks`：与 MusicScoreEventDataList 一致，wasm 的
      // `custom_score_json` 解析也按这个键读。
      //
      // 只做 1/96 拍量化，**不再**改写任何关键帧的值 —— 见下方
      // 「负向闪断尖峰不做改写」的说明。
      (layer.length === 0 ? [{ tick: 0, value: 1 }] : quantizeSpeedSegments(layer)).map((change) => ({
        ticks: change.tick,
        value: change.value,
      })),
    )
  }

  addEvent(eventType: number, ticks: number, changeValue: number) {
    if (!Number.isFinite(ticks) || !Number.isFinite(changeValue)) {
      return
    }
    this.events.push({
      eventType,
      ticks: Math.round(ticks),
      changeValue,
    })
  }

  addTap(step: ScoreStep): void {
    this.notes.push(this.buildNote(step, -1, -1, step.baseType))
  }

  /**
   * Emit one connected slide chain. The wasm splits chains back into rendered
   * holds by looking for a "start" element followed by an "end" element, so the
   * first step must classify as a start (`Long`, `FrictionLong`,
   * `FrictionHideLong`) and the last one as an end (`Normal`, `Flick`,
   * `Friction`, `FrictionHide`).
   */
  addChain(steps: ScoreStep[]): void {
    if (steps.length === 0) {
      return
    }
    if (steps.length === 1) {
      this.addTap(steps[0])
      return
    }

    const ids = steps.map(() => this.nextId++)
    steps.forEach((step, index) => {
      const previous = index === 0 ? -1 : ids[index - 1]
      const next = index + 1 === steps.length ? -1 : ids[index + 1]
      this.notes.push(this.buildNote(step, previous, next, step.baseType, ids[index]))
    })
  }

  /** Emit a guide path: an invisible "TouchLine" trail with no judged notes. */
  addGuidePath(steps: ScoreStep[]): void {
    if (steps.length < 2) {
      return
    }
    const guides = steps.map((step, index) => ({
      ...step,
      category: Category.Guide,
      noteBaseType:
        index === 0
          ? BaseType.Long
          : index + 1 === steps.length
            ? BaseType.Normal
            : BaseType.HiddenConnection,
      isSkip: false,
    }))
    this.addChain(guides)
  }

  build(): CustomScoreJson {
    const events = [...this.events]
    if (!events.some((event) => event.eventType === EventType.Bpm)) {
      events.unshift({ eventType: EventType.Bpm, ticks: 0, changeValue: 120 })
    }
    events.sort((left, right) => left.ticks - right.ticks)
    return { MusicScoreEventDataList: events, NoteList: canonicalizeNotes(this.notes), SpeedLayers: this.speedLayers }
  }

  buildJson(): string {
    return JSON.stringify(this.build())
  }

  private buildNote(
    step: ScoreStep,
    previousConnectionId: number,
    nextConnectionId: number,
    baseType: number,
    forcedId?: number,
  ): CustomScoreNote {
    const geometry = quantizeLane(step)
    return {
      id: forcedId ?? this.nextId++,
      ticks: Math.round(step.tick),
      laneStart: geometry.laneStart,
      laneEnd: geometry.laneEnd,
      category: step.category ?? Category.Normal,
      noteBaseType: baseType,
      previousConnectionId,
      nextConnectionId,
      direction: step.direction ?? 0,
      ...(step.flickDirection ? { flickDirection: step.flickDirection } : {}),
      ...(step.hitEffect ? { hitEffect: step.hitEffect } : {}),
      noteLineType: step.lineType ?? LineType.Linear,
      speedLayer: step.speedLayer ?? -1,
      speedRatio: Number.isFinite(step.speedRatio) && (step.speedRatio as number) > 0 ? (step.speedRatio as number) : 1,
      type: step.critical,
      isSkip: step.isSkip === true,
      laneCenter: geometry.laneCenter,
      laneSize: geometry.laneSize,
      style: step.style ?? 0,
      guideColor: step.guideColor ?? -1,
      guideFade: step.guideFade ?? -1,
      damage: step.damage === true,
      reverse: step.reverse === true,
    }
  }
}

export type TempoChange = { tick: number; value: number }

export type SpeedChange = { tick: number; value: number }

export function sortChanges<T extends { tick: number }>(changes: T[]): T[] {
  return [...changes].sort((left, right) => left.tick - right.tick)
}

/** Value of a step timeline at `tick` (the last change at or before it). */
export function valueAt(changes: SpeedChange[], tick: number): number {
  let value = 1
  for (const change of changes) {
    if (change.tick > tick) {
      break
    }
    value = change.value
  }
  return value
}

/**
 * Per-version hi-speed curves.
 *
 * USC (`timeScaleGroup`) and LevelData (`#TIMESCALE_GROUP`) attach a *version*
 * to every note, and each version owns its own hi-speed keyframes. The preview
 * renderer therefore does **not** merge the versions into one global curve any
 * more: every note carries the index of its own version (`speedLayer`), and the
 * native side integrates that version's curve into a private visual clock
 * (`SpeedLayers` + `scaledTimeAt` in `native/src/mmw_preview.cpp`).
 *
 * This is what makes "different speeds at the same tick" work: two notes at the
 * same tick but in different versions are drawn with different approach speeds,
 * yet both reach the judgement line at exactly their tick, because every
 * version's clock passes through the note's own scaled timestamp at that time.
 * A negative version curve makes its own clock run backwards, so those notes
 * appear on the line and then retreat up the track - no global sign to agree on.
 */

/** A version's hi-speed curve, addressed by `CustomScoreNote.speedLayer`. */
export type SpeedLayer = SpeedChange[]

/**
 * 变速段的最小时长：1/96 拍。
 *
 * 谱面里常见「高流速闪现」写法：先打一个极短的高流速（例如 5900×，只持续
 * 0.0104 拍），紧接着切到 0（冻结）或回到 1×。这段时长只有几毫秒，短到一个
 * 渲染帧都装不下，但按 tick 精确积分会把它放大成几十秒的滚动量 ——
 * 例如 `Aether Crest Master` 的 248.5：5900× 持续 5 tick 会把视觉时钟推前
 * 20 秒（约 61 拍），画面直接被甩到几十拍之后，闪现看起来就是「整段空屏」。
 *
 * 把短于 1/96 拍的段统一按 1/96 拍计（后续关键帧整体后移，不改变其它段的时长），
 * 成对的正负尖峰（+5900 / -5900、+3000 / -3000）就会互相抵消，只剩作者真正想
 * 要的那一次推进。每次冻结因此落在谱面上真实存在的音符段落上，闪现才看得见。
 */
export const MIN_SPEED_SEGMENT_TICKS = TICKS_PER_BEAT / 96

/**
 * 负向「闪断」尖峰**不做改写** —— 这一条是踩过坑的结论，别再加回来。
 *
 * 谱面里 `+5900 → 0（冻结）→ -5900` 是成对写法：正向尖峰把视觉时钟前推
 * ~20s（画面闪到后面有音符的段落并定格），负向尖峰再把它拉回来。两段的积分
 * 必须同时存在才能抵消。曾经试过把「极短 + 极大负值」的段改成 0 速（只为消掉
 * 那 1~2 帧的音符回弹），结果是回拉没了、前冲留下：视觉时钟从该点起永久前移
 * 30.9s，闪现的落点与任何音符都对不上，定格帧整段空白，只剩同时押连线。
 * 那 26ms 的回弹是这段 gimmick 的固有代价，比落点漂移轻得多。
 *
 * 回归门禁：`node scripts/check-speed-clock.mjs <chart.usc>`。
 */

/**
 * 把每条 version 曲线里「短于 {@link MIN_SPEED_SEGMENT_TICKS}」的段拉长到该长度，
 * 后续关键帧整体顺延。幂等：已经满足最小时长的曲线原样返回。
 */
export function quantizeSpeedSegments(timeline: SpeedChange[]): SpeedChange[] {
  const sorted = sortChanges(
    timeline
      .filter((change) => Number.isFinite(change.tick) && Number.isFinite(change.value))
      .map((change) => ({ tick: Math.round(change.tick), value: change.value })),
  )
  const quantized: SpeedChange[] = []
  let shift = 0
  for (let index = 0; index < sorted.length; index += 1) {
    const tick = sorted[index].tick + shift
    quantized.push({ tick, value: sorted[index].value })
    const nextTick = index + 1 < sorted.length ? sorted[index + 1].tick + shift : undefined
    if (nextTick !== undefined && nextTick > tick && nextTick - tick < MIN_SPEED_SEGMENT_TICKS) {
      shift += MIN_SPEED_SEGMENT_TICKS - (nextTick - tick)
    }
  }
  return quantized
}

/**
 * `speedRatio` kept for the *static* chart renderer (`/chart-to-image`).
 *
 * `src/vendor/sus2img` has no per-version clock: it can only apply one speed
 * multiplier per note, so it needs a single reference curve to compare against.
 * The previewer ignores this value for layered notes (`getEffectiveSpeedRatio`
 * returns 1 when `speedLayer >= 0`), so it must never be used to position notes
 * there.
 *
 * Extreme ratios collapse to 1: charts commonly park a 6553.6 / -10000 version
 * on combo-filler damage notes, and approximating that per note would produce
 * absurd approach times in the diagram.
 */
export function relativeSpeedRatio(referenceSpeed: number, layerSpeed: number) {
  if (!Number.isFinite(referenceSpeed) || !Number.isFinite(layerSpeed) || referenceSpeed <= 0) {
    return 1
  }
  const ratio = Math.abs(layerSpeed) / referenceSpeed
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return 1
  }
  if (ratio < 0.05 || ratio > 20) {
    return 1
  }
  // Ignore floating point noise so ordinary notes keep speedRatio 1.
  return Math.abs(ratio - 1) < 1e-4 ? 1 : ratio
}
