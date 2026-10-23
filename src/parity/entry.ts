export { parseLevelData, describeGroup, trackOf } from '../data/leveldata'
export { runParity, type CheckResult } from './checks'
export { TimescaleTrack, type Marker } from '../time/timescale'
export { TempoMap } from '../time/bpm'
export { EaseType, easeValue, integrateTimes, integrateNumeric } from '../time/ease'
export type { Chart, ChartNote } from '../data/types'

/* ── 旧版渲染器桥接 ─────────────────────────────────────────── */
export { buildCustomScore, bridgeFromDocument, normalizeTimescaleGroups, clockFromSpeedLayer } from '../bridge/customScore'
export { parseUscChart, looksLikeUsc } from '../data/usc'
export { createTickClock, readTempoEvents, TICKS_PER_BEAT } from '../bridge/clock'
export { buildSpeedLayers } from '../bridge/speed'
export type { SpeedKey, SpeedBridgeOptions } from '../bridge/speed'
