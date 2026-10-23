/**
 * 缓动族 —— 与上游 `sekai/lib/ease.py`（MIT, Next-SEKAI）逐值对齐。
 *
 * 枚举数值必须与 Sonolus 的 `EaseType` 完全一致：`#TIMESCALE_EASE` 存的就是这个整数。
 *   0 NONE / 1 LINEAR / 2..37 各缓动族 × IN/OUT/IN_OUT/OUT_IN / 38..41 四型 STEP
 *
 * 族的推导与上游相同：`family = (ease - 2) / 4`，`mode = (ease - 2) % 4`。
 */

export const EaseType = {
  NONE: 0,
  LINEAR: 1,
  IN_QUAD: 2,
  OUT_QUAD: 3,
  IN_OUT_QUAD: 4,
  OUT_IN_QUAD: 5,
  IN_SINE: 6,
  OUT_SINE: 7,
  IN_OUT_SINE: 8,
  OUT_IN_SINE: 9,
  IN_CUBIC: 10,
  OUT_CUBIC: 11,
  IN_OUT_CUBIC: 12,
  OUT_IN_CUBIC: 13,
  IN_QUART: 14,
  OUT_QUART: 15,
  IN_OUT_QUART: 16,
  OUT_IN_QUART: 17,
  IN_QUINT: 18,
  OUT_QUINT: 19,
  IN_OUT_QUINT: 20,
  OUT_IN_QUINT: 21,
  IN_EXPO: 22,
  OUT_EXPO: 23,
  IN_OUT_EXPO: 24,
  OUT_IN_EXPO: 25,
  IN_CIRC: 26,
  OUT_CIRC: 27,
  IN_OUT_CIRC: 28,
  OUT_IN_CIRC: 29,
  IN_BACK: 30,
  OUT_BACK: 31,
  IN_OUT_BACK: 32,
  OUT_IN_BACK: 33,
  IN_ELASTIC: 34,
  OUT_ELASTIC: 35,
  IN_OUT_ELASTIC: 36,
  OUT_IN_ELASTIC: 37,
  IN_STEP: 38,
  OUT_STEP: 39,
  IN_OUT_STEP: 40,
  OUT_IN_STEP: 41,
} as const

export type EaseType = number

export const EaseFamily = {
  QUAD: 0,
  SINE: 1,
  CUBIC: 2,
  QUART: 3,
  QUINT: 4,
  EXPO: 5,
  CIRC: 6,
  BACK: 7,
  ELASTIC: 8,
  STEP: 9,
} as const

export const EaseMode = { IN: 0, OUT: 1, IN_OUT: 2, OUT_IN: 3 } as const

export function easeFamily(ease: EaseType): number {
  return Math.floor((ease - 2) / 4)
}

export function easeMode(ease: EaseType): number {
  return (((ease - 2) % 4) + 4) % 4
}

export function isStepEase(ease: EaseType): boolean {
  return ease === EaseType.NONE || ease >= EaseType.IN_STEP
}

export function isInStepEase(ease: EaseType): boolean {
  return ease === EaseType.NONE || ease === EaseType.IN_STEP
}

/** 反向端点时使用的等价缓动（上游 `ease_complement`）。 */
export function easeComplement(ease: EaseType): EaseType {
  if (ease === EaseType.NONE) return EaseType.OUT_STEP
  if (ease >= EaseType.IN_QUAD) {
    const mode = easeMode(ease)
    if (mode === EaseMode.IN) return ease + 1
    if (mode === EaseMode.OUT) return ease - 1
  }
  return ease
}

/* ── 各族 IN 型曲线：0→1 ─────────────────────────────────────────── */

function inBack(x: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return c3 * x * x * x - c1 * x * x
}

function inElastic(x: number): number {
  if (x === 0 || x === 1) return x
  const c4 = (2 * Math.PI) / 3
  return -Math.pow(2, 10 * x - 10) * Math.sin((x * 10 - 10.75) * c4)
}

function inCurve(family: number, x: number): number {
  switch (family) {
    case EaseFamily.QUAD:
      return x * x
    case EaseFamily.SINE:
      return 1 - Math.cos((x * Math.PI) / 2)
    case EaseFamily.CUBIC:
      return x * x * x
    case EaseFamily.QUART:
      return x ** 4
    case EaseFamily.QUINT:
      return x ** 5
    case EaseFamily.EXPO:
      // 与上游一致：起点是 2^-10 而不是严格 0
      return Math.pow(2, 10 * x - 10)
    case EaseFamily.CIRC:
      return 1 - Math.sqrt(Math.max(0, 1 - x * x))
    case EaseFamily.BACK:
      return inBack(x)
    case EaseFamily.ELASTIC:
      return inElastic(x)
    default:
      return 0
  }
}

/** `ease(type, x)`，对应上游 `sekai/lib/ease.py:ease`。 */
export function easeValue(ease: EaseType, x: number): number {
  if (ease === EaseType.LINEAR) return x < 0 ? 0 : x > 1 ? 1 : x
  if (isStepEase(ease)) {
    if (x < 0) return 0
    if (x > 1) return 1
    if (ease === EaseType.OUT_STEP) return 1
    if (ease === EaseType.IN_OUT_STEP) return x < 0.5 ? 0 : 1
    if (ease === EaseType.OUT_IN_STEP) return 0.5
    return 0
  }
  const family = easeFamily(ease)
  const mode = easeMode(ease)
  if (mode === EaseMode.IN) return inCurve(family, x)
  if (mode === EaseMode.OUT) return 1 - inCurve(family, 1 - x)
  if (mode === EaseMode.IN_OUT) {
    return x < 0.5 ? inCurve(family, 2 * x) / 2 : 1 - inCurve(family, 2 - 2 * x) / 2
  }
  return x < 0.5 ? (1 - inCurve(family, 1 - 2 * x)) / 2 : (1 + inCurve(family, 2 * x - 1)) / 2
}

/* ── 闭式积分（上游 `_in_integral` / `_ease_integral`）─────────────── */

const INTEGRAL_TOTALS = [
  1 / 3,
  1 - 2 / Math.PI,
  1 / 4,
  1 / 5,
  1 / 6,
  (1 - 2 ** -10) / (10 * Math.log(2)),
  1 - Math.PI / 4,
  0,
  0,
  0,
]

function inIntegral(family: number, y: number): number {
  switch (family) {
    case EaseFamily.QUAD:
      return y ** 3 / 3
    case EaseFamily.SINE:
      return y - (Math.sin((y * Math.PI) / 2) * 2) / Math.PI
    case EaseFamily.CUBIC:
      return y ** 4 / 4
    case EaseFamily.QUART:
      return y ** 5 / 5
    case EaseFamily.QUINT:
      return y ** 6 / 6
    case EaseFamily.EXPO:
      return (Math.pow(2, 10 * y - 10) - 2 ** -10) / (10 * Math.log(2))
    case EaseFamily.CIRC:
      return y - (y * Math.sqrt(Math.max(0, 1 - y * y)) + Math.asin(Math.min(1, Math.max(-1, y)))) / 2
    default:
      return 0
  }
}

function easeIntegralClosed(ease: EaseType, u: number): number {
  const extra = Math.max(0, u - 1)
  u = u < 0 ? 0 : u > 1 ? 1 : u
  if (ease === EaseType.LINEAR) return (u * u) / 2 + extra
  if (ease === EaseType.NONE) return extra
  const family = easeFamily(ease)
  const mode = easeMode(ease)
  let base = 0
  let scale = 1
  let y = u
  if (mode === EaseMode.OUT) {
    base = u - INTEGRAL_TOTALS[family]
    scale = 1
    y = 1 - u
  } else if (mode === EaseMode.IN_OUT) {
    if (u <= 0.5) {
      base = 0
      scale = 0.25
      y = 2 * u
    } else {
      base = u - 0.5
      scale = 0.25
      y = 2 - 2 * u
    }
  } else if (mode === EaseMode.OUT_IN) {
    if (u <= 0.5) {
      base = u / 2 - INTEGRAL_TOTALS[family] / 4
      scale = 0.25
      y = 1 - 2 * u
    } else {
      base = 0.25 - INTEGRAL_TOTALS[family] / 4 + (u - 0.5) / 2
      scale = 0.25
      y = 2 * u - 1
    }
  }
  return base + scale * inIntegral(family, y) + extra
}

/** 瞬时速度（上游 `speed_at`）。 */
export function speedAt(v0: number, v1: number, ease: EaseType, start: number, end: number, t: number): number {
  if (isInStepEase(ease) || t <= start) return v0
  if (t >= end) return v1
  const span = end - start
  if (span <= 0) return v1
  let u = (t - start) / span
  let a = v0
  let b = v1
  let e = ease
  if (b < a && u !== 0.5) {
    a = v1
    b = v0
    e = easeComplement(ease)
    u = (end - t) / span
  }
  return a + (b - a) * easeValue(e, u)
}

const SIMPSON_WEIGHTS = [1 / 6, 4 / 6, 1 / 6]
export const QUADRATURE_WIDTH = 2 ** -6

function quadraticEase(ease: EaseType, u: number): number {
  return easeValue(ease, u)
}

function quadraticPiece(v0: number, v1: number, ease: EaseType, span: number, left: number, right: number, width: number): number {
  let a = v0
  let b = v1
  let e = ease
  let lo = left
  let hi = right
  if (b < a) {
    a = v1
    b = v0
    e = easeComplement(ease)
    lo = span - right
    hi = span - left
  }
  const first = lo / span
  const middle = first + (width / span) * 0.5
  const last = hi / span
  const average = (quadraticEase(e, first) + 4 * quadraticEase(e, middle) + quadraticEase(e, last)) / 6
  return width * (a + (b - a) * average)
}

function piece(v0: number, v1: number, ease: EaseType, span: number, left: number, right: number, width: number): number {
  let a = v0
  let b = v1
  let e = ease
  let lo = left
  let hi = right
  if (b < a) {
    a = v1
    b = v0
    e = easeComplement(ease)
    lo = span - right
    hi = span - left
  }
  const first = lo / span
  const last = hi / span
  let average = 0
  const useSimpson =
    e <= EaseType.OUT_IN_QUAD ||
    (EaseType.IN_CUBIC <= e && e <= EaseType.OUT_IN_CUBIC) ||
    width <= span * QUADRATURE_WIDTH
  if (useSimpson) {
    const half = (last - first) * 0.5
    for (let i = 0; i < 3; i += 1) average += SIMPSON_WEIGHTS[i] * easeValue(e, first + half * i)
  } else {
    average = (easeIntegralClosed(e, last) - easeIntegralClosed(e, first)) * (span / width)
  }
  return width * (a + (b - a) * average)
}

/** 主流路径：二次及以下用 1:4:1 辛普森，其余用闭式差（上游 `integrate_times`）。 */
export function integrateTimes(v0: number, v1: number, ease: EaseType, start: number, end: number, left: number, right: number): number {
  if (ease === EaseType.NONE || !(EaseType.LINEAR <= ease && ease <= EaseType.OUT_IN_QUAD)) {
    return integrateEasedTimes(v0, v1, ease, start, end, left, right)
  }
  if (start === end || left === right) return 0
  let lo = left
  let hi = right
  let orientation = 1
  if (lo > hi) {
    const t = lo
    lo = hi
    hi = t
    orientation = -1
  }
  const span = end - start
  const a = lo - start
  const b = hi - start
  const midpoint = span * 0.5
  if ((ease === EaseType.IN_OUT_QUAD || ease === EaseType.OUT_IN_QUAD) && a < midpoint && midpoint < b) {
    const first = quadraticPiece(v0, v1, ease, span, a, midpoint, midpoint - a)
    const last = quadraticPiece(v0, v1, ease, span, midpoint, b, b - midpoint)
    return orientation * (first + last)
  }
  return orientation * quadraticPiece(v0, v1, ease, span, a, b, b - a)
}

/** 通用路径：分段 + 辛普森/闭式（上游 `integrate_eased_times`）。 */
export function integrateEasedTimes(v0: number, v1: number, ease: EaseType, start: number, end: number, left: number, right: number): number {
  if (start === end || left === right) return 0
  let lo = left
  let hi = right
  let orientation = 1
  if (lo > hi) {
    const t = lo
    lo = hi
    hi = t
    orientation = -1
  }
  const width = hi - lo
  const span = end - start
  const a = lo - start
  const b = hi - start
  const midpoint = span * 0.5
  if (isStepEase(ease)) {
    if (ease === EaseType.OUT_STEP) return orientation * width * v1
    if (ease === EaseType.OUT_IN_STEP) return orientation * width * (v0 + v1) * 0.5
    if (ease === EaseType.IN_OUT_STEP) {
      const before = Math.max(0, Math.min(b, midpoint) - a)
      return orientation * (before * v0 + (width - before) * v1)
    }
    return orientation * width * v0
  }
  const split = easeMode(ease) >= EaseMode.IN_OUT && ease !== EaseType.LINEAR && a < midpoint && midpoint < b
  let total = 0
  for (let p = 0; p < (split ? 2 : 1); p += 1) {
    const pieceLo = p === 1 ? midpoint : a
    const pieceHi = split && p === 0 ? midpoint : b
    total += piece(v0, v1, ease, span, pieceLo, pieceHi, pieceHi - pieceLo)
  }
  return orientation * total
}

/** 数值参照实现：仅用于自检（`test/parity.mjs` 用它验证闭式/辛普森分支）。 */
export function integrateNumeric(
  v0: number,
  v1: number,
  ease: EaseType,
  start: number,
  end: number,
  left: number,
  right: number,
  steps = 4096,
): number {
  if (right <= left) return -integrateNumeric(v0, v1, ease, start, end, right, left, steps)
  const span = end - start
  if (span <= 0) return (right - left) * v1
  let total = 0
  for (let i = 0; i < steps; i += 1) {
    const t = left + ((right - left) * (i + 0.5)) / steps
    total += speedAt(v0, v1, ease, start, end, t)
  }
  return (total * (right - left)) / steps
}
