var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/time/bpm.ts
var TempoMap = class {
  constructor(points) {
    __publicField(this, "beats", []);
    __publicField(this, "bpms", []);
    __publicField(this, "times", []);
    const sorted = [...points].filter((p) => Number.isFinite(p.beat) && Number.isFinite(p.bpm) && p.bpm > 0);
    if (sorted.length === 0) sorted.push({ beat: 0, bpm: 120 });
    sorted.sort((a, b) => a.beat - b.beat);
    let time = 0;
    for (let i = 0; i < sorted.length; i += 1) {
      const point = sorted[i];
      if (i > 0) {
        const prev = sorted[i - 1];
        time += (point.beat - prev.beat) * 60 / prev.bpm;
      } else if (point.beat !== 0) {
        time = point.beat * 60 / point.bpm;
      }
      this.beats.push(point.beat);
      this.bpms.push(point.bpm);
      this.times.push(time);
    }
  }
  /** beat -> 秒 */
  timeAt(beat) {
    const index = this.indexFor(this.beats, beat);
    const base = this.times[index];
    return base + (beat - this.beats[index]) * 60 / this.bpms[index];
  }
  /** 秒 -> beat */
  beatAt(time) {
    const index = this.indexFor(this.times, time);
    return this.beats[index] + (time - this.times[index]) * this.bpms[index] / 60;
  }
  bpmAtBeat(beat) {
    return this.bpms[this.indexFor(this.beats, beat)];
  }
  bpmAtTime(time) {
    return this.bpms[this.indexFor(this.times, time)];
  }
  indexFor(values, value) {
    let low = 0;
    let high = values.length - 1;
    while (low < high) {
      const mid = low + high + 1 >> 1;
      if (values[mid] <= value) low = mid;
      else high = mid - 1;
    }
    return low;
  }
};

// src/time/ease.ts
var EaseType = {
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
  OUT_IN_STEP: 41
};
var EaseFamily = {
  QUAD: 0,
  SINE: 1,
  CUBIC: 2,
  QUART: 3,
  QUINT: 4,
  EXPO: 5,
  CIRC: 6,
  BACK: 7,
  ELASTIC: 8,
  STEP: 9
};
var EaseMode = { IN: 0, OUT: 1, IN_OUT: 2, OUT_IN: 3 };
function easeFamily(ease) {
  return Math.floor((ease - 2) / 4);
}
function easeMode(ease) {
  return ((ease - 2) % 4 + 4) % 4;
}
function isStepEase(ease) {
  return ease === EaseType.NONE || ease >= EaseType.IN_STEP;
}
function isInStepEase(ease) {
  return ease === EaseType.NONE || ease === EaseType.IN_STEP;
}
function easeComplement(ease) {
  if (ease === EaseType.NONE) return EaseType.OUT_STEP;
  if (ease >= EaseType.IN_QUAD) {
    const mode = easeMode(ease);
    if (mode === EaseMode.IN) return ease + 1;
    if (mode === EaseMode.OUT) return ease - 1;
  }
  return ease;
}
function inBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * x * x * x - c1 * x * x;
}
function inElastic(x) {
  if (x === 0 || x === 1) return x;
  const c4 = 2 * Math.PI / 3;
  return -Math.pow(2, 10 * x - 10) * Math.sin((x * 10 - 10.75) * c4);
}
function inCurve(family, x) {
  switch (family) {
    case EaseFamily.QUAD:
      return x * x;
    case EaseFamily.SINE:
      return 1 - Math.cos(x * Math.PI / 2);
    case EaseFamily.CUBIC:
      return x * x * x;
    case EaseFamily.QUART:
      return x ** 4;
    case EaseFamily.QUINT:
      return x ** 5;
    case EaseFamily.EXPO:
      return Math.pow(2, 10 * x - 10);
    case EaseFamily.CIRC:
      return 1 - Math.sqrt(Math.max(0, 1 - x * x));
    case EaseFamily.BACK:
      return inBack(x);
    case EaseFamily.ELASTIC:
      return inElastic(x);
    default:
      return 0;
  }
}
function easeValue(ease, x) {
  if (ease === EaseType.LINEAR) return x < 0 ? 0 : x > 1 ? 1 : x;
  if (isStepEase(ease)) {
    if (x < 0) return 0;
    if (x > 1) return 1;
    if (ease === EaseType.OUT_STEP) return 1;
    if (ease === EaseType.IN_OUT_STEP) return x < 0.5 ? 0 : 1;
    if (ease === EaseType.OUT_IN_STEP) return 0.5;
    return 0;
  }
  const family = easeFamily(ease);
  const mode = easeMode(ease);
  if (mode === EaseMode.IN) return inCurve(family, x);
  if (mode === EaseMode.OUT) return 1 - inCurve(family, 1 - x);
  if (mode === EaseMode.IN_OUT) {
    return x < 0.5 ? inCurve(family, 2 * x) / 2 : 1 - inCurve(family, 2 - 2 * x) / 2;
  }
  return x < 0.5 ? (1 - inCurve(family, 1 - 2 * x)) / 2 : (1 + inCurve(family, 2 * x - 1)) / 2;
}
var INTEGRAL_TOTALS = [
  1 / 3,
  1 - 2 / Math.PI,
  1 / 4,
  1 / 5,
  1 / 6,
  (1 - 2 ** -10) / (10 * Math.log(2)),
  1 - Math.PI / 4,
  0,
  0,
  0
];
function inIntegral(family, y) {
  switch (family) {
    case EaseFamily.QUAD:
      return y ** 3 / 3;
    case EaseFamily.SINE:
      return y - Math.sin(y * Math.PI / 2) * 2 / Math.PI;
    case EaseFamily.CUBIC:
      return y ** 4 / 4;
    case EaseFamily.QUART:
      return y ** 5 / 5;
    case EaseFamily.QUINT:
      return y ** 6 / 6;
    case EaseFamily.EXPO:
      return (Math.pow(2, 10 * y - 10) - 2 ** -10) / (10 * Math.log(2));
    case EaseFamily.CIRC:
      return y - (y * Math.sqrt(Math.max(0, 1 - y * y)) + Math.asin(Math.min(1, Math.max(-1, y)))) / 2;
    default:
      return 0;
  }
}
function easeIntegralClosed(ease, u) {
  const extra = Math.max(0, u - 1);
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  if (ease === EaseType.LINEAR) return u * u / 2 + extra;
  if (ease === EaseType.NONE) return extra;
  const family = easeFamily(ease);
  const mode = easeMode(ease);
  let base = 0;
  let scale = 1;
  let y = u;
  if (mode === EaseMode.OUT) {
    base = u - INTEGRAL_TOTALS[family];
    scale = 1;
    y = 1 - u;
  } else if (mode === EaseMode.IN_OUT) {
    if (u <= 0.5) {
      base = 0;
      scale = 0.25;
      y = 2 * u;
    } else {
      base = u - 0.5;
      scale = 0.25;
      y = 2 - 2 * u;
    }
  } else if (mode === EaseMode.OUT_IN) {
    if (u <= 0.5) {
      base = u / 2 - INTEGRAL_TOTALS[family] / 4;
      scale = 0.25;
      y = 1 - 2 * u;
    } else {
      base = 0.25 - INTEGRAL_TOTALS[family] / 4 + (u - 0.5) / 2;
      scale = 0.25;
      y = 2 * u - 1;
    }
  }
  return base + scale * inIntegral(family, y) + extra;
}
function speedAt(v0, v1, ease, start, end, t) {
  if (isInStepEase(ease) || t <= start) return v0;
  if (t >= end) return v1;
  const span = end - start;
  if (span <= 0) return v1;
  let u = (t - start) / span;
  let a = v0;
  let b = v1;
  let e = ease;
  if (b < a && u !== 0.5) {
    a = v1;
    b = v0;
    e = easeComplement(ease);
    u = (end - t) / span;
  }
  return a + (b - a) * easeValue(e, u);
}
var SIMPSON_WEIGHTS = [1 / 6, 4 / 6, 1 / 6];
var QUADRATURE_WIDTH = 2 ** -6;
function quadraticEase(ease, u) {
  return easeValue(ease, u);
}
function quadraticPiece(v0, v1, ease, span, left, right, width) {
  let a = v0;
  let b = v1;
  let e = ease;
  let lo = left;
  let hi = right;
  if (b < a) {
    a = v1;
    b = v0;
    e = easeComplement(ease);
    lo = span - right;
    hi = span - left;
  }
  const first = lo / span;
  const middle = first + width / span * 0.5;
  const last = hi / span;
  const average = (quadraticEase(e, first) + 4 * quadraticEase(e, middle) + quadraticEase(e, last)) / 6;
  return width * (a + (b - a) * average);
}
function piece(v0, v1, ease, span, left, right, width) {
  let a = v0;
  let b = v1;
  let e = ease;
  let lo = left;
  let hi = right;
  if (b < a) {
    a = v1;
    b = v0;
    e = easeComplement(ease);
    lo = span - right;
    hi = span - left;
  }
  const first = lo / span;
  const last = hi / span;
  let average = 0;
  const useSimpson = e <= EaseType.OUT_IN_QUAD || EaseType.IN_CUBIC <= e && e <= EaseType.OUT_IN_CUBIC || width <= span * QUADRATURE_WIDTH;
  if (useSimpson) {
    const half = (last - first) * 0.5;
    for (let i = 0; i < 3; i += 1) average += SIMPSON_WEIGHTS[i] * easeValue(e, first + half * i);
  } else {
    average = (easeIntegralClosed(e, last) - easeIntegralClosed(e, first)) * (span / width);
  }
  return width * (a + (b - a) * average);
}
function integrateTimes(v0, v1, ease, start, end, left, right) {
  if (ease === EaseType.NONE || !(EaseType.LINEAR <= ease && ease <= EaseType.OUT_IN_QUAD)) {
    return integrateEasedTimes(v0, v1, ease, start, end, left, right);
  }
  if (start === end || left === right) return 0;
  let lo = left;
  let hi = right;
  let orientation = 1;
  if (lo > hi) {
    const t = lo;
    lo = hi;
    hi = t;
    orientation = -1;
  }
  const span = end - start;
  const a = lo - start;
  const b = hi - start;
  const midpoint = span * 0.5;
  if ((ease === EaseType.IN_OUT_QUAD || ease === EaseType.OUT_IN_QUAD) && a < midpoint && midpoint < b) {
    const first = quadraticPiece(v0, v1, ease, span, a, midpoint, midpoint - a);
    const last = quadraticPiece(v0, v1, ease, span, midpoint, b, b - midpoint);
    return orientation * (first + last);
  }
  return orientation * quadraticPiece(v0, v1, ease, span, a, b, b - a);
}
function integrateEasedTimes(v0, v1, ease, start, end, left, right) {
  if (start === end || left === right) return 0;
  let lo = left;
  let hi = right;
  let orientation = 1;
  if (lo > hi) {
    const t = lo;
    lo = hi;
    hi = t;
    orientation = -1;
  }
  const width = hi - lo;
  const span = end - start;
  const a = lo - start;
  const b = hi - start;
  const midpoint = span * 0.5;
  if (isStepEase(ease)) {
    if (ease === EaseType.OUT_STEP) return orientation * width * v1;
    if (ease === EaseType.OUT_IN_STEP) return orientation * width * (v0 + v1) * 0.5;
    if (ease === EaseType.IN_OUT_STEP) {
      const before = Math.max(0, Math.min(b, midpoint) - a);
      return orientation * (before * v0 + (width - before) * v1);
    }
    return orientation * width * v0;
  }
  const split = easeMode(ease) >= EaseMode.IN_OUT && ease !== EaseType.LINEAR && a < midpoint && midpoint < b;
  let total = 0;
  for (let p = 0; p < (split ? 2 : 1); p += 1) {
    const pieceLo = p === 1 ? midpoint : a;
    const pieceHi = split && p === 0 ? midpoint : b;
    total += piece(v0, v1, ease, span, pieceLo, pieceHi, pieceHi - pieceLo);
  }
  return orientation * total;
}
function integrateNumeric(v0, v1, ease, start, end, left, right, steps = 4096) {
  if (right <= left) return -integrateNumeric(v0, v1, ease, start, end, right, left, steps);
  const span = end - start;
  if (span <= 0) return (right - left) * v1;
  let total = 0;
  for (let i = 0; i < steps; i += 1) {
    const t = left + (right - left) * (i + 0.5) / steps;
    total += speedAt(v0, v1, ease, start, end, t);
  }
  return total * (right - left) / steps;
}

// src/time/timescale.ts
var TimescaleTrack = class {
  constructor(markers) {
    __publicField(this, "markers");
    __publicField(this, "positions");
    this.markers = [...markers].sort((a, b) => a.time - b.time);
    this.positions = new Array(this.markers.length).fill(0);
    for (let i = 0; i < this.markers.length; i += 1) {
      const marker = this.markers[i];
      if (i === 0) {
        this.positions[i] = marker.time + marker.skip;
        continue;
      }
      const prev = this.markers[i - 1];
      const area = integrateTimes(
        prev.timescale,
        marker.timescale,
        prev.ease,
        prev.time,
        marker.time,
        prev.time,
        marker.time
      );
      this.positions[i] = this.positions[i - 1] + area + marker.skip;
    }
  }
  /** 视觉时钟（scaled time）在 chart 时间 t 的取值。 */
  positionAt(t) {
    const markers = this.markers;
    if (markers.length === 0) return t;
    if (t < markers[0].time) return t;
    if (markers.length === 1 || t >= markers[markers.length - 1].time) {
      const last = markers.length - 1;
      const marker2 = markers[last];
      return this.positions[last] + (t - marker2.time) * marker2.timescale;
    }
    const index = this.indexFor(t);
    const marker = markers[index];
    if (t === marker.time) return this.positions[index];
    const next = markers[index + 1];
    const area = integrateTimes(marker.timescale, next.timescale, marker.ease, marker.time, next.time, marker.time, t);
    return this.positions[index] + area;
  }
  /** 瞬时速度（音符接近速度）。 */
  speedAt(t) {
    const markers = this.markers;
    if (markers.length === 0) return 1;
    if (t <= markers[0].time) return markers[0].timescale;
    const index = this.indexFor(Math.min(t, markers[markers.length - 1].time));
    const marker = markers[index];
    if (index + 1 >= markers.length) return marker.timescale;
    const next = markers[index + 1];
    return speedAt(marker.timescale, next.timescale, marker.ease, marker.time, next.time, t);
  }
  /** 从 now 到 target 还有多少「视觉秒」。正值 = 未来。 */
  distanceBetween(now, target) {
    return this.positionAt(target) - this.positionAt(now);
  }
  /** 该时刻落在第几个 marker 之后（用于 hideNotes 之类的区间属性）。 */
  markerIndexAt(t) {
    if (this.markers.length === 0) return -1;
    return this.indexFor(t);
  }
  indexFor(t) {
    const markers = this.markers;
    let low = 0;
    let high = markers.length - 1;
    while (low < high) {
      const mid = low + high + 1 >> 1;
      if (markers[mid].time <= t) low = mid;
      else high = mid - 1;
    }
    return low;
  }
};

// src/data/leveldata.ts
function readNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}
function valuesOf(entity) {
  const map = /* @__PURE__ */ new Map();
  if (!Array.isArray(entity.data)) return map;
  for (const entry of entity.data) {
    if (!entry || typeof entry.name !== "string") continue;
    if (entry.ref !== void 0) map.set(entry.name, entry.ref);
    else if (entry.value !== void 0) map.set(entry.name, entry.value);
  }
  return map;
}
function traitsOf(archetype) {
  return {
    anchor: archetype === "AnchorNote",
    transient: archetype === "TransientHiddenTickNote",
    critical: archetype.startsWith("Critical"),
    head: archetype.includes("Head"),
    tail: archetype.includes("Tail"),
    trace: archetype.includes("Trace"),
    flick: archetype.includes("Flick"),
    damage: archetype.includes("Damage"),
    tick: archetype.includes("Tick")
  };
}
function kindOf(traits) {
  if (traits.transient) return null;
  if (traits.anchor) return "anchor";
  if (traits.head) return "holdHead";
  if (traits.tail) return "holdTail";
  if (traits.tick) return "holdTick";
  if (traits.flick) return "flick";
  if (traits.trace) return "trace";
  return "tap";
}
function parseLevelData(text) {
  const root = JSON.parse(text);
  const entities = Array.isArray(root.entities) ? root.entities : [];
  const warnings = [];
  const byName = /* @__PURE__ */ new Map();
  entities.forEach((entity, index) => {
    if (typeof entity.name === "string" && !byName.has(entity.name)) byName.set(entity.name, index);
  });
  const resolve = (ref) => {
    if (typeof ref === "number" && Number.isInteger(ref) && ref >= 0 && ref < entities.length) return ref;
    if (typeof ref === "string") {
      const named = byName.get(ref);
      if (named !== void 0) return named;
      const parsed = Number.parseInt(ref, 16);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed < entities.length) return parsed;
    }
    return -1;
  };
  const bpmPoints = [];
  for (const entity of entities) {
    if (entity.archetype !== "#BPM_CHANGE") continue;
    const values = valuesOf(entity);
    bpmPoints.push({ beat: readNumber(values.get("#BEAT")), bpm: readNumber(values.get("#BPM"), 120) });
  }
  const tempo = new TempoMap(bpmPoints.length > 0 ? bpmPoints : [{ beat: 0, bpm: 120 }]);
  const groupNames = [];
  const groupFirst = /* @__PURE__ */ new Map();
  entities.forEach((entity, index) => {
    if (entity.archetype !== "#TIMESCALE_GROUP") return;
    const name = typeof entity.name === "string" ? entity.name : `${groupNames.length}`;
    groupNames.push(name);
    groupFirst.set(name, resolve(valuesOf(entity).get("first")));
  });
  const groups = [];
  let scrollNoop = 0;
  let scrollWithSkip = 0;
  for (const name of groupNames) {
    const markers = [];
    const hidden = [];
    let cursor = groupFirst.get(name) ?? -1;
    const guard = /* @__PURE__ */ new Set();
    while (cursor >= 0 && entities[cursor]?.archetype === "#TIMESCALE_CHANGE" && !guard.has(cursor)) {
      guard.add(cursor);
      const values = valuesOf(entities[cursor]);
      const beat = readNumber(values.get("#BEAT"), Number.NaN);
      const timescale = readNumber(values.get("#TIMESCALE"), Number.NaN);
      if (!Number.isFinite(beat) || !Number.isFinite(timescale)) {
        warnings.push(`timescale marker ${cursor} \u7F3A\u5B57\u6BB5`);
        cursor = resolve(values.get("next"));
        continue;
      }
      const time = tempo.timeAt(beat);
      const skipBeats = readNumber(values.get("#TIMESCALE_SKIP"), 0);
      const skip = skipBeats === 0 ? 0 : skipBeats * 60 / tempo.bpmAtBeat(beat);
      const ease = Math.trunc(readNumber(values.get("#TIMESCALE_EASE"), 0));
      const transitionStyle = Math.trunc(readNumber(values.get("transitionStyle"), 0));
      const hideNotes = readNumber(values.get("hideNotes"), 0) !== 0;
      if (transitionStyle !== 0) {
        if (skip !== 0) {
          scrollWithSkip += 1;
          warnings.push(`group ${name}: transitionStyle=${transitionStyle} \u4E14 skip=${skipBeats} \u62CD\uFF08SCROLL \u8BED\u4E49\u672A\u5B9E\u73B0\uFF0C\u4F4D\u7F6E\u4F1A\u77AC\u79FB\uFF09`);
        } else {
          scrollNoop += 1;
        }
      }
      markers.push({ time, timescale, skip, ease });
      hidden.push(hideNotes);
      cursor = resolve(values.get("next"));
    }
    if (markers.length === 0) markers.push({ time: 0, timescale: 1, skip: 0, ease: 0 });
    groups.push({ name, track: new TimescaleTrack(markers), hidden });
  }
  if (scrollNoop > 0) {
    warnings.push(`${scrollNoop} \u4E2A SCROLL marker \u7684 skip \u4E3A 0\uFF08\u4E0E\u666E\u901A\u6A21\u5F0F\u7B49\u4EF7\uFF0C\u5DF2\u5FFD\u7565\uFF09`);
  }
  const notes = [];
  const indexToId = /* @__PURE__ */ new Map();
  const pendingLinks = [];
  entities.forEach((entity, index) => {
    const archetype = entity.archetype ?? "";
    if (archetype.startsWith("#") || archetype === "Initialization") return;
    if (archetype === "SimLine" || archetype === "Connector") return;
    const traits = traitsOf(archetype);
    const kind = kindOf(traits);
    if (kind === null) return;
    const values = valuesOf(entity);
    const beat = readNumber(values.get("#BEAT"), Number.NaN);
    if (!Number.isFinite(beat)) return;
    const segmentKind = readNumber(values.get("segmentKind"), 0);
    const resolvedKind = segmentKind >= 101 ? "guide" : kind;
    const critical = segmentKind > 0 ? segmentKind % 50 === 2 || segmentKind > 50 ? segmentKind % 50 === 2 : traits.critical : traits.critical;
    const damage = traits.damage || segmentKind > 0 && (segmentKind % 50 === 3 || segmentKind - 50 === 3);
    const groupRef = resolve(values.get("#TIMESCALE_GROUP"));
    const group = groupRef >= 0 ? groupNames.indexOf(entities[groupRef]?.name ?? "") : -1;
    const id = notes.length;
    const note = {
      id,
      index,
      archetype,
      kind: resolvedKind,
      beat,
      time: tempo.timeAt(beat),
      lane: readNumber(values.get("lane"), 0),
      size: readNumber(values.get("size"), 0.5),
      group: group >= 0 ? group : -1,
      critical,
      damage,
      direction: Math.trunc(readNumber(values.get("direction"), 0)),
      next: -1,
      prev: -1,
      chainRole: "none",
      endTime: tempo.timeAt(beat)
    };
    notes.push(note);
    indexToId.set(index, id);
    const nextIndex = resolve(values.get("next"));
    if (nextIndex >= 0) pendingLinks.push({ id, next: nextIndex });
  });
  for (const link of pendingLinks) {
    const target = indexToId.get(link.next);
    if (target === void 0) continue;
    notes[link.id].next = target;
    notes[target].prev = link.id;
  }
  const holds = [];
  for (const note of notes) {
    if (note.kind !== "holdHead" || note.prev !== -1) continue;
    const tickIds = [];
    let cursor = note.next;
    let tailId = -1;
    const guard = /* @__PURE__ */ new Set();
    while (cursor !== -1 && !guard.has(cursor)) {
      guard.add(cursor);
      const current = notes[cursor];
      if (current.kind === "holdTail") {
        tailId = cursor;
        break;
      }
      tickIds.push(cursor);
      cursor = current.next;
    }
    if (tailId === -1) continue;
    note.chainRole = "head";
    notes[tailId].chainRole = "tail";
    for (const tickId of tickIds) notes[tickId].chainRole = "mid";
    note.endTime = notes[tailId].time;
    holds.push({ headId: note.id, tailId, tickIds });
  }
  const simLines = [];
  for (const entity of entities) {
    if (entity.archetype !== "SimLine") continue;
    const values = valuesOf(entity);
    const left = indexToId.get(resolve(values.get("left")));
    const right = indexToId.get(resolve(values.get("right")));
    if (left === void 0 || right === void 0 || left === right) continue;
    simLines.push({ left, right });
  }
  let duration = 0;
  for (const note of notes) duration = Math.max(duration, note.time, note.endTime);
  if (notes.length === 0) warnings.push("\u6CA1\u6709\u89E3\u6790\u5230\u4EFB\u4F55\u97F3\u7B26");
  if (groups.length === 0) warnings.push("\u6CA1\u6709 timescale group\uFF0C\u56DE\u9000\u4E3A\u6052\u901F 1\xD7");
  return {
    bgmOffset: readNumber(root.bgmOffset, 0),
    tempo,
    groups: groups.length > 0 ? groups : [{ name: "0", track: new TimescaleTrack([{ time: 0, timescale: 1, skip: 0, ease: 0 }]), hidden: [false] }],
    notes,
    holds,
    simLines,
    duration,
    warnings
  };
}
function trackOf(chart, note) {
  return chart.groups[note.group]?.track ?? chart.groups[0].track;
}
function describeGroup(chart, index) {
  const group = chart.groups[index];
  if (!group) return "\u2014";
  const markers = group.track.markers;
  return `${group.name}: ${markers.length} markers, ${markers.slice(0, 4).map((m) => `${m.time.toFixed(2)}s\u2192${m.timescale}${m.skip ? `(+${m.skip.toFixed(2)}s)` : ""}`).join(", ")}${markers.length > 4 ? " \u2026" : ""}`;
}

// src/parity/checks.ts
function checkEaseEndpoints() {
  const results = [];
  const bad = [];
  for (let ease = 0; ease <= 41; ease += 1) {
    if (ease === EaseType.NONE || ease >= EaseType.IN_STEP) continue;
    const family = Math.floor((ease - 2) / 4);
    const tolerance = family === 5 ? 2 ** -10 + 1e-6 : family === 7 || family === 8 ? 0.11 : 1e-6;
    const start = easeValue(ease, 0);
    const end = easeValue(ease, 1);
    if (start < -tolerance || start > tolerance || Math.abs(end - 1) > tolerance) {
      bad.push(`${ease}: (${start.toFixed(4)}, ${end.toFixed(4)})`);
    }
  }
  results.push({
    name: "ease \u7AEF\u70B9",
    ok: bad.length === 0,
    detail: bad.length === 0 ? "0\u21921 \u6210\u7ACB\uFF08EXPO \u7684 2^-10 \u504F\u5DEE\u4E0E\u4E0A\u6E38\u4E00\u81F4\uFF09" : bad.join(" / ")
  });
  return results;
}
function checkIntegration() {
  const cases = [
    [1, 3, EaseType.LINEAR, "linear 1\u21923"],
    [1, 3, EaseType.IN_QUAD, "in_quad 1\u21923"],
    [3, 1, EaseType.OUT_QUAD, "out_quad 3\u21921\uFF08\u964D\u901F\uFF09"],
    [1, 3, EaseType.IN_OUT_QUAD, "in_out_quad 1\u21923"],
    [3, 1, EaseType.OUT_IN_CIRC, "out_in_circ 3\u21921"],
    [2, 2, EaseType.IN_OUT_SINE, "in_out_sine 2\u21922\uFF08\u6052\u901F\uFF09"],
    [1, 5, EaseType.IN_QUART, "in_quart 1\u21925"],
    [5, 0, EaseType.OUT_EXPO, "out_expo 5\u21920"],
    [1, 3, EaseType.LINEAR, "linear 1\u21923\uFF08\u957F\u6BB5\uFF09"],
    [1, 3, EaseType.IN_STEP, "in_step 1\u21923"],
    [1, 3, EaseType.OUT_STEP, "out_step 1\u21923"],
    [1, 3, EaseType.IN_OUT_STEP, "in_out_step 1\u21923"]
  ];
  let worst = 0;
  let worstName = "";
  for (const [v0, v1, ease, name] of cases) {
    const start = 10;
    const end = 12;
    for (const [left, right] of [
      [10, 12],
      [10.3, 11.7],
      [11.999, 12],
      [10, 10.001]
    ]) {
      const closed = integrateTimes(v0, v1, ease, start, end, left, right);
      const numeric = integrateNumeric(v0, v1, ease, start, end, left, right);
      const error = Math.abs(closed - numeric);
      if (error > worst) {
        worst = error;
        worstName = `${name} [${left},${right}]`;
      }
    }
  }
  return [
    {
      name: "\u79EF\u5206\u5B9E\u73B0 vs \u6570\u503C\u79EF\u5206",
      ok: worst < 2e-3,
      detail: `\u6700\u5927\u504F\u5DEE ${worst.toExponential(2)}\uFF08${worstName}\uFF09`
    }
  ];
}
function checkStepEase() {
  const v0 = 1;
  const v1 = 3;
  const okIn = Math.abs(integrateTimes(v0, v1, EaseType.IN_STEP, 0, 2, 0, 2) - 2 * v0) < 1e-9;
  const okOut = Math.abs(integrateTimes(v0, v1, EaseType.OUT_STEP, 0, 2, 0, 2) - 2 * v1) < 1e-9;
  const okInOut = Math.abs(integrateTimes(v0, v1, EaseType.IN_OUT_STEP, 0, 2, 0, 2) - (v0 + v1)) < 1e-9;
  return [
    {
      name: "\u9636\u8DC3\u7F13\u52A8\u79EF\u5206",
      ok: okIn && okOut && okInOut,
      detail: `in_step=${okIn} out_step=${okOut} in_out_step=${okInOut}`
    }
  ];
}
function checkSkip(chart) {
  const results = [];
  for (const [index, group] of chart.groups.entries()) {
    const markers = group.track.markers;
    for (let i = 1; i < markers.length; i += 1) {
      const marker = markers[i];
      if (Math.abs(marker.skip) < 1e-9) continue;
      const epsilon = 1e-6;
      const before = group.track.positionAt(marker.time - epsilon);
      const at = group.track.positionAt(marker.time);
      const delta = at - before;
      const expected = marker.skip;
      if (Math.abs(delta - expected) > 1e-3) {
        results.push({
          name: `group ${index} skip @${marker.time.toFixed(2)}s`,
          ok: false,
          detail: `\u5B9E\u6D4B ${delta.toFixed(4)}s\uFF0C\u671F\u671B ${expected.toFixed(4)}s`
        });
      }
    }
  }
  if (results.length === 0) {
    results.push({ name: "skip \u4F4D\u79FB\u8DF3\u53D8", ok: true, detail: "\u6240\u6709 marker \u7684 skip \u90FD\u4EA7\u751F\u7CBE\u786E\u4F4D\u79FB" });
  }
  return results;
}
function checkPositionVsSpeed(chart) {
  const results = [];
  for (const [index, group] of chart.groups.entries()) {
    const track = group.track;
    const end = Math.max(track.markers[track.markers.length - 1].time, 1);
    const h = 1e-4;
    let worst = 0;
    let worstAt = 0;
    for (let t = h * 4; t < end; t += Math.max(0.05, end / 400)) {
      const nearSkip = track.markers.some((marker) => Math.abs(marker.time - t) < 0.01);
      if (nearSkip) continue;
      const derivative = (track.positionAt(t + h) - track.positionAt(t - h)) / (2 * h);
      const speed = track.speedAt(t);
      const error = Math.abs(derivative - speed);
      if (error > worst) {
        worst = error;
        worstAt = t;
      }
    }
    results.push({
      name: `group ${index} position\u2194speed`,
      ok: worst < 0.05,
      detail: `\u6700\u5927\u504F\u5DEE ${worst.toExponential(2)} @${worstAt.toFixed(2)}s`
    });
  }
  return results;
}
function checkTempo() {
  const tempo = new TempoMap([
    { beat: 0, bpm: 150 },
    { beat: 4, bpm: 200 },
    { beat: 12, bpm: 90 }
  ]);
  let worst = 0;
  for (let beat = 0; beat <= 24; beat += 0.25) {
    const round = tempo.beatAt(tempo.timeAt(beat));
    worst = Math.max(worst, Math.abs(round - beat));
  }
  return [{ name: "BPM \u5F80\u8FD4", ok: worst < 1e-9, detail: `\u6700\u5927\u8BEF\u5DEE ${worst.toExponential(2)} beats` }];
}
function checkContinuity(chart) {
  const results = [];
  for (const [index, group] of chart.groups.entries()) {
    const markers = group.track.markers;
    let worst = 0;
    let worstAt = 0;
    for (let i = 1; i < markers.length; i += 1) {
      const t = markers[i].time;
      if (Math.abs(markers[i].skip) > 1e-9) continue;
      const before = group.track.positionAt(t - 1e-7);
      const at = group.track.positionAt(t);
      if (Math.abs(at - before) > worst) {
        worst = Math.abs(at - before);
        worstAt = t;
      }
    }
    results.push({
      name: `group ${index} \u8FDE\u7EED\u6027`,
      ok: worst < 1e-3,
      detail: `\u65E0 skip \u7684 marker \u5904\u6700\u5927\u8DF3\u53D8 ${worst.toExponential(2)} @${worstAt.toFixed(2)}s`
    });
  }
  return results;
}
function runParity(chart) {
  return [
    ...checkEaseEndpoints(),
    ...checkIntegration(),
    ...checkStepEase(),
    ...checkTempo(),
    ...checkSkip(chart),
    ...checkContinuity(chart),
    ...checkPositionVsSpeed(chart),
    ...chart.warnings.map((warning) => ({ name: "\u89E3\u6790\u544A\u8B66", ok: false, detail: warning }))
  ];
}

// ../src/lib/customScore.ts
var TICKS_PER_BEAT = 480;
var STAGE_EDGE = 6;
var MIN_LANE_SIZE = 0.05;
var MAX_LANE_SIZE = STAGE_EDGE;
var COORDINATE_PRECISION = 8192;
var EventType = {
  Bpm: 0,
  HiSpeed: 1,
  SeVolume: 2
};
var BaseType = {
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
  Damage: 15
};
var Category = {
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
  Damage: 10
};
var LineType = {
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
  EaseOutIn: 4
};
function noteSortKey(note) {
  return [
    note.ticks,
    Math.round(note.laneCenter * 4096),
    Math.round(note.laneSize * 4096),
    note.category,
    note.noteBaseType,
    note.type ? 1 : 0,
    note.direction,
    note.flickDirection ?? 0,
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
    note.reverse ? 1 : 0
  ];
}
function canonicalizeNotes(notes) {
  const byId = /* @__PURE__ */ new Map();
  for (const note of notes) {
    byId.set(note.id, note);
  }
  const keyOf = /* @__PURE__ */ new Map();
  for (const note of notes) {
    keyOf.set(note.id, noteSortKey(note).join(","));
  }
  const chainOf = /* @__PURE__ */ new Map();
  const positionOf = /* @__PURE__ */ new Map();
  const chains = [];
  for (const note of notes) {
    if (note.previousConnectionId !== -1 || note.nextConnectionId === -1) {
      continue;
    }
    const chain = [];
    let current = note;
    const guard = /* @__PURE__ */ new Set();
    while (current && !guard.has(current.id)) {
      guard.add(current.id);
      chain.push(current.id);
      chainOf.set(current.id, chains.length);
      positionOf.set(current.id, chain.length - 1);
      current = current.nextConnectionId === -1 ? void 0 : byId.get(current.nextConnectionId);
    }
    chains.push(chain);
  }
  for (const note of notes) {
    if (chainOf.has(note.id)) {
      continue;
    }
    chainOf.set(note.id, chains.length);
    positionOf.set(note.id, 0);
    chains.push([note.id]);
  }
  const chainKeys = chains.map((chain) => chain.map((id) => keyOf.get(id) ?? "").join(" > "));
  const order = chains.map((_, index) => index);
  order.sort((left, right) => {
    if (chainKeys[left] !== chainKeys[right]) {
      return chainKeys[left] < chainKeys[right] ? -1 : 1;
    }
    if (chains[left].length !== chains[right].length) {
      return chains[left].length - chains[right].length;
    }
    return left - right;
  });
  const idMap = /* @__PURE__ */ new Map();
  const ordered = [];
  for (const chainIndex of order) {
    for (const id of chains[chainIndex]) {
      idMap.set(id, ordered.length + 1);
      ordered.push(id);
    }
  }
  return ordered.map((id, index) => {
    const note = byId.get(id);
    return {
      ...note,
      id: index + 1,
      previousConnectionId: note.previousConnectionId === -1 ? -1 : idMap.get(note.previousConnectionId) ?? -1,
      nextConnectionId: note.nextConnectionId === -1 ? -1 : idMap.get(note.nextConnectionId) ?? -1
    };
  });
}
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}
function snapCoordinate(value) {
  return Math.round(value * COORDINATE_PRECISION) / COORDINATE_PRECISION;
}
function normalizeGeometry(geometry) {
  const laneCenter = snapCoordinate(finiteOr(geometry.laneCenter, 0));
  return {
    laneCenter,
    laneSize: clamp(snapCoordinate(finiteOr(geometry.laneSize, 0.5)), MIN_LANE_SIZE, MAX_LANE_SIZE)
  };
}
function quantizeLane(geometry) {
  const normalized = normalizeGeometry(geometry);
  const left = normalized.laneCenter - normalized.laneSize;
  const right = normalized.laneCenter + normalized.laneSize;
  const laneStart = clamp(Math.round(left + STAGE_EDGE), 0, 11);
  const laneEnd = clamp(Math.round(right + STAGE_EDGE) - 1, laneStart, 11);
  return { laneStart, laneEnd, ...normalized };
}
function lineTypeFromEase(ease) {
  if (typeof ease !== "string") {
    return LineType.Linear;
  }
  switch (ease.trim().toLowerCase()) {
    case "in":
    case "easein":
    case "ease-in":
      return LineType.EaseIn;
    case "out":
    case "easeout":
    case "ease-out":
      return LineType.EaseOut;
    // "Easy in out" / "easy out in" are their own curve types: both halves of
    // the connection use a different ease, they are NOT the same as a plain
    // ease-in / ease-out.
    case "inout":
    case "in-out":
    case "easeinout":
    case "ease-in-out":
      return LineType.EaseInOut;
    case "outin":
    case "out-in":
    case "easeoutin":
    case "ease-out-in":
      return LineType.EaseOutIn;
    default:
      return LineType.Linear;
  }
}
function lineTypeFromConnectorEase(ease) {
  switch (ease) {
    case 2:
      return LineType.EaseIn;
    case 3:
      return LineType.EaseOut;
    case 4:
      return LineType.EaseInOut;
    case 5:
      return LineType.EaseOutIn;
    default:
      return LineType.Linear;
  }
}
function holdStartBaseType(hidden, trace) {
  if (hidden) {
    return BaseType.FrictionHideLong;
  }
  return trace ? BaseType.FrictionLong : BaseType.Long;
}
function holdEndBaseType(hidden, trace, flick) {
  if (hidden) {
    return BaseType.FrictionHide;
  }
  if (flick) {
    return trace ? BaseType.FrictionFlick : BaseType.Flick;
  }
  return trace ? BaseType.Friction : BaseType.Normal;
}
function holdMidBaseType(hidden) {
  return hidden ? BaseType.HiddenConnection : BaseType.Base;
}
function directionFromName(direction) {
  if (typeof direction !== "string") {
    return 0;
  }
  switch (direction.trim().toLowerCase()) {
    case "left":
      return 1;
    case "right":
      return 2;
    default:
      return 0;
  }
}
function guideColorFromName(color) {
  if (typeof color !== "string") {
    return -1;
  }
  switch (color.trim().toLowerCase()) {
    case "neutral":
      return 0;
    case "red":
      return 1;
    case "green":
      return 2;
    case "blue":
      return 3;
    case "yellow":
      return 4;
    case "purple":
      return 5;
    case "cyan":
      return 6;
    case "black":
      return 7;
    default:
      return -1;
  }
}
function guideFadeFromName(fade) {
  if (typeof fade !== "string") {
    return 0;
  }
  switch (fade.trim().toLowerCase()) {
    case "none":
      return 1;
    case "in":
      return 2;
    default:
      return 0;
  }
}
function directionFromNumber(direction) {
  if (direction === 1) {
    return 1;
  }
  if (direction === 2) {
    return 2;
  }
  return 0;
}
var CustomScoreBuilder = class {
  constructor() {
    __publicField(this, "events", []);
    __publicField(this, "notes", []);
    __publicField(this, "speedLayers", []);
    __publicField(this, "nextId", 1);
  }
  /** True once at least one note has been emitted. */
  get noteCount() {
    return this.notes.length;
  }
  /**
   * 注册全部 version 曲线；下标即音符的 `speedLayer`。
   *
   * 没有关键帧的 version 归一成「恒定 1.0」——MMW 里没有变速事件的 version 就是
   * 1 倍速，不能让它退回别的 version 的曲线。
   */
  setSpeedLayers(layers) {
    this.speedLayers = layers.map(
      (layer) => (
        // JSON 字段名必须是 `ticks`：与 MusicScoreEventDataList 一致，wasm 的
        // `custom_score_json` 解析也按这个键读。
        //
        // 只做 1/96 拍量化，**不再**改写任何关键帧的值 —— 见下方
        // 「负向闪断尖峰不做改写」的说明。
        (layer.length === 0 ? [{ tick: 0, value: 1 }] : quantizeSpeedSegments(layer)).map((change) => ({
          ticks: change.tick,
          value: change.value
        }))
      )
    );
  }
  addEvent(eventType, ticks, changeValue) {
    if (!Number.isFinite(ticks) || !Number.isFinite(changeValue)) {
      return;
    }
    this.events.push({
      eventType,
      ticks: Math.round(ticks),
      changeValue
    });
  }
  addTap(step) {
    this.notes.push(this.buildNote(step, -1, -1, step.baseType));
  }
  /**
   * Emit one connected slide chain. The wasm splits chains back into rendered
   * holds by looking for a "start" element followed by an "end" element, so the
   * first step must classify as a start (`Long`, `FrictionLong`,
   * `FrictionHideLong`) and the last one as an end (`Normal`, `Flick`,
   * `Friction`, `FrictionHide`).
   */
  addChain(steps) {
    if (steps.length === 0) {
      return;
    }
    if (steps.length === 1) {
      this.addTap(steps[0]);
      return;
    }
    const ids = steps.map(() => this.nextId++);
    steps.forEach((step, index) => {
      const previous = index === 0 ? -1 : ids[index - 1];
      const next = index + 1 === steps.length ? -1 : ids[index + 1];
      this.notes.push(this.buildNote(step, previous, next, step.baseType, ids[index]));
    });
  }
  /** Emit a guide path: an invisible "TouchLine" trail with no judged notes. */
  addGuidePath(steps) {
    if (steps.length < 2) {
      return;
    }
    const guides = steps.map((step, index) => ({
      ...step,
      category: Category.Guide,
      noteBaseType: index === 0 ? BaseType.Long : index + 1 === steps.length ? BaseType.Normal : BaseType.HiddenConnection,
      isSkip: false
    }));
    this.addChain(guides);
  }
  build() {
    const events = [...this.events];
    if (!events.some((event) => event.eventType === EventType.Bpm)) {
      events.unshift({ eventType: EventType.Bpm, ticks: 0, changeValue: 120 });
    }
    events.sort((left, right) => left.ticks - right.ticks);
    return { MusicScoreEventDataList: events, NoteList: canonicalizeNotes(this.notes), SpeedLayers: this.speedLayers };
  }
  buildJson() {
    return JSON.stringify(this.build());
  }
  buildNote(step, previousConnectionId, nextConnectionId, baseType, forcedId) {
    const geometry = quantizeLane(step);
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
      ...step.flickDirection ? { flickDirection: step.flickDirection } : {},
      noteLineType: step.lineType ?? LineType.Linear,
      speedLayer: step.speedLayer ?? -1,
      speedRatio: Number.isFinite(step.speedRatio) && step.speedRatio > 0 ? step.speedRatio : 1,
      type: step.critical,
      isSkip: step.isSkip === true,
      laneCenter: geometry.laneCenter,
      laneSize: geometry.laneSize,
      style: step.style ?? 0,
      guideColor: step.guideColor ?? -1,
      guideFade: step.guideFade ?? -1,
      damage: step.damage === true,
      reverse: step.reverse === true
    };
  }
};
function sortChanges(changes) {
  return [...changes].sort((left, right) => left.tick - right.tick);
}
function valueAt(changes, tick) {
  let value = 1;
  for (const change of changes) {
    if (change.tick > tick) {
      break;
    }
    value = change.value;
  }
  return value;
}
var MIN_SPEED_SEGMENT_TICKS = TICKS_PER_BEAT / 96;
function quantizeSpeedSegments(timeline) {
  const sorted = sortChanges(
    timeline.filter((change) => Number.isFinite(change.tick) && Number.isFinite(change.value)).map((change) => ({ tick: Math.round(change.tick), value: change.value }))
  );
  const quantized = [];
  let shift = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    const tick = sorted[index].tick + shift;
    quantized.push({ tick, value: sorted[index].value });
    const nextTick = index + 1 < sorted.length ? sorted[index + 1].tick + shift : void 0;
    if (nextTick !== void 0 && nextTick > tick && nextTick - tick < MIN_SPEED_SEGMENT_TICKS) {
      shift += MIN_SPEED_SEGMENT_TICKS - (nextTick - tick);
    }
  }
  return quantized;
}
function relativeSpeedRatio(referenceSpeed, layerSpeed) {
  if (!Number.isFinite(referenceSpeed) || !Number.isFinite(layerSpeed) || referenceSpeed <= 0) {
    return 1;
  }
  const ratio = Math.abs(layerSpeed) / referenceSpeed;
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return 1;
  }
  if (ratio < 0.05 || ratio > 20) {
    return 1;
  }
  return Math.abs(ratio - 1) < 1e-4 ? 1 : ratio;
}

// ../src/lib/levelDataParser.ts
var EASE_LINEAR = 1;
var GUIDE_COLOR_BASE = 101;
function readNumber2(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}
function entityValues(entity) {
  const values = /* @__PURE__ */ new Map();
  if (!Array.isArray(entity.data)) {
    return values;
  }
  for (const entry of entity.data) {
    if (!entry || typeof entry.name !== "string") {
      continue;
    }
    if (entry.ref !== void 0) {
      values.set(entry.name, entry.ref);
    } else if (entry.value !== void 0) {
      values.set(entry.name, entry.value);
    }
  }
  return values;
}
function isGuideSegmentKind(kind) {
  return kind >= GUIDE_COLOR_BASE && kind < GUIDE_COLOR_BASE + 8;
}
function segmentCritical(kind, fallback) {
  if (kind <= 0) {
    return fallback;
  }
  if (isGuideSegmentKind(kind)) {
    return false;
  }
  const base = kind > 50 ? kind - 50 : kind;
  if (base === 1) {
    return false;
  }
  if (base === 2) {
    return true;
  }
  return fallback;
}
function isDamageKind(kind) {
  if (kind <= 0) {
    return false;
  }
  const base = kind > 50 ? kind - 50 : kind;
  return base === 3;
}
function classifyArchetype(archetype) {
  return {
    anchor: archetype === "AnchorNote",
    transient: archetype === "TransientHiddenTickNote",
    critical: archetype.startsWith("Critical"),
    head: archetype.includes("Head"),
    tail: archetype.includes("Tail"),
    trace: archetype.includes("Trace"),
    flick: archetype.includes("Flick"),
    damage: archetype.includes("Damage"),
    tick: archetype.includes("Tick")
  };
}
function parseLevelData2(text) {
  let root;
  try {
    root = JSON.parse(text);
  } catch {
    throw new Error("LevelData \u6587\u4EF6\u4E0D\u662F\u5408\u6CD5\u7684 JSON\u3002");
  }
  if (!root || typeof root !== "object" || Array.isArray(root)) {
    throw new Error("LevelData \u6587\u4EF6\u6839\u8282\u70B9\u5FC5\u987B\u662F\u5BF9\u8C61\u3002");
  }
  const document = root;
  if (!Array.isArray(document.entities)) {
    throw new Error("LevelData \u6587\u4EF6\u7F3A\u5C11 entities \u6570\u7EC4\u3002");
  }
  const entities = document.entities.filter(
    (entity) => !!entity && typeof entity === "object" && typeof entity.archetype === "string"
  );
  const offsetSeconds = readNumber2(document.bgmOffset, 0);
  const values = entities.map(entityValues);
  const byName = /* @__PURE__ */ new Map();
  entities.forEach((entity, index) => {
    if (typeof entity.name === "string" && entity.name && !byName.has(entity.name)) {
      byName.set(entity.name, index);
    }
  });
  const resolve = (ref) => {
    if (typeof ref === "number" && Number.isInteger(ref) && ref >= 0 && ref < entities.length) {
      return ref;
    }
    if (typeof ref === "string") {
      const byEntityName = byName.get(ref);
      if (byEntityName !== void 0) {
        return byEntityName;
      }
      const parsed = Number.parseInt(ref, 16);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed < entities.length) {
        return parsed;
      }
    }
    return -1;
  };
  const valueOf = (index, key) => index >= 0 ? values[index]?.get(key) : void 0;
  const tempoChanges = [];
  const groupOrder = [];
  const groupTimelines = /* @__PURE__ */ new Map();
  const groupIndexByName = /* @__PURE__ */ new Map();
  for (let index = 0; index < entities.length; index += 1) {
    const archetype = entities[index].archetype;
    if (archetype === "#BPM_CHANGE") {
      const beat = readNumber2(valueOf(index, "#BEAT"), Number.NaN);
      const bpm2 = readNumber2(valueOf(index, "#BPM"), Number.NaN);
      if (Number.isFinite(beat) && Number.isFinite(bpm2) && bpm2 > 0) {
        tempoChanges.push({ tick: Math.round(beat * TICKS_PER_BEAT), value: bpm2 });
      }
    } else if (archetype === "#TIMESCALE_GROUP") {
      const name = entities[index].name;
      if (typeof name === "string" && !groupTimelines.has(name)) {
        groupTimelines.set(name, []);
        groupIndexByName.set(name, index);
        groupOrder.push(name);
      }
    }
  }
  if (tempoChanges.length === 0) {
    tempoChanges.push({ tick: 0, value: 120 });
  }
  tempoChanges.sort((left, right) => left.tick - right.tick);
  const bpm = tempoChanges[0].value;
  for (const name of groupOrder) {
    const timeline = groupTimelines.get(name);
    const groupIndex = groupIndexByName.get(name);
    let cursor = resolve(valueOf(groupIndex, "first"));
    const guard = /* @__PURE__ */ new Set();
    while (cursor >= 0 && entities[cursor].archetype === "#TIMESCALE_CHANGE" && !guard.has(cursor)) {
      guard.add(cursor);
      const beat = readNumber2(valueOf(cursor, "#BEAT"), Number.NaN);
      const timeScale = readNumber2(valueOf(cursor, "#TIMESCALE"), Number.NaN);
      if (Number.isFinite(beat) && Number.isFinite(timeScale)) {
        timeline.push({ tick: Math.round(beat * TICKS_PER_BEAT), value: timeScale });
      }
      cursor = resolve(valueOf(cursor, "next"));
    }
    timeline.sort((left, right) => left.tick - right.tick);
  }
  const speedLayers = groupOrder.map((name) => quantizeSpeedSegments(groupTimelines.get(name) ?? []));
  const groupIndexOfRef = (ref) => {
    const index = resolve(ref);
    if (index < 0) {
      return -1;
    }
    const name = entities[index].name;
    return typeof name === "string" ? groupOrder.indexOf(name) : -1;
  };
  const referenceTimeline = speedLayers.find((timeline) => timeline.length > 0) ?? [];
  const speedFor = (groupRef, tick) => {
    const layer = groupIndexOfRef(groupRef);
    if (layer < 0) {
      return { layer: -1, ratio: 1 };
    }
    return { layer, ratio: relativeSpeedRatio(valueAt(referenceTimeline, tick), valueAt(speedLayers[layer], tick)) };
  };
  const isNoteArchetype = (index) => entities[index].archetype.endsWith("Note");
  const isTransient = (index) => entities[index].archetype.includes("Transient");
  const realNotes = [];
  for (let index = 0; index < entities.length; index += 1) {
    if (isNoteArchetype(index) && !isTransient(index)) {
      realNotes.push(index);
    }
  }
  const nextOf = /* @__PURE__ */ new Map();
  for (const index of realNotes) {
    const target = resolve(valueOf(index, "next"));
    if (target >= 0 && isNoteArchetype(target) && !isTransient(target)) {
      nextOf.set(index, target);
    }
  }
  const isChainTarget = new Set(nextOf.values());
  const heads = realNotes.filter((index) => !isChainTarget.has(index));
  const chains = [];
  const chainOf = /* @__PURE__ */ new Map();
  for (const head of heads) {
    const chain = [];
    let cursor = head;
    while (cursor !== void 0 && cursor >= 0 && !chainOf.has(cursor)) {
      chain.push(cursor);
      chainOf.set(cursor, chains.length);
      cursor = nextOf.get(cursor);
    }
    chains.push(chain);
  }
  const builder = new CustomScoreBuilder();
  builder.setSpeedLayers(speedLayers);
  for (const change of tempoChanges) {
    builder.addEvent(EventType.Bpm, change.tick, change.value);
  }
  for (const change of referenceTimeline) {
    builder.addEvent(EventType.HiSpeed, change.tick, change.value);
  }
  const beatOf = (index) => readNumber2(valueOf(index, "#BEAT"), 0);
  const laneOf = (index) => readNumber2(valueOf(index, "lane"), 0);
  const sizeOf = (index) => readNumber2(valueOf(index, "size"), 0.5);
  const kindOf3 = (index) => Math.trunc(readNumber2(valueOf(index, "segmentKind"), 0));
  const styleOf = (index) => Math.trunc(readNumber2(valueOf(index, "style"), 0));
  const guideColorOf = (index) => {
    const kind = kindOf3(index);
    return isGuideSegmentKind(kind) ? kind - GUIDE_COLOR_BASE : -1;
  };
  const guideFadeOf = (chain) => {
    if (chain.length < 2) {
      return 1;
    }
    const first = readNumber2(valueOf(chain[0], "segmentAlpha"), 1);
    const last = readNumber2(valueOf(chain[chain.length - 1], "segmentAlpha"), 1);
    if (Math.abs(first - last) < 1e-3) {
      return 1;
    }
    return last < first ? 0 : 2;
  };
  const easeOf = (index) => Math.trunc(readNumber2(valueOf(index, "connectorEase"), EASE_LINEAR));
  const groupRefOf = (index) => valueOf(index, "#TIMESCALE_GROUP");
  const absoluteDirectionFromNumber = (value) => {
    const direction = Math.trunc(readNumber2(value, 0));
    return direction >= 1 && direction <= 5 ? direction : 0;
  };
  const stepOf = (index, baseType, critical, direction = 0, flickDirection = 0) => {
    const tick = Math.round(beatOf(index) * TICKS_PER_BEAT);
    const speed = speedFor(groupRefOf(index), tick);
    return {
      laneCenter: laneOf(index),
      laneSize: sizeOf(index),
      tick,
      critical,
      baseType,
      direction,
      flickDirection,
      lineType: lineTypeFromConnectorEase(easeOf(index)),
      speedLayer: speed.layer,
      speedRatio: speed.ratio,
      style: styleOf(index)
    };
  };
  const tapBaseType = (archetype) => {
    const info = classifyArchetype(archetype);
    if (info.trace) {
      return info.flick ? BaseType.FrictionFlick : BaseType.Friction;
    }
    return info.flick ? BaseType.Flick : BaseType.Normal;
  };
  for (let chainIndex = 0; chainIndex < chains.length; chainIndex += 1) {
    const chain = chains[chainIndex];
    if (chain.length === 1) {
      const index = chain[0];
      const archetype = entities[index].archetype;
      const info = classifyArchetype(archetype);
      if (info.anchor) {
        continue;
      }
      if (info.damage) {
        builder.addTap({
          ...stepOf(index, BaseType.Damage, false),
          category: Category.Damage,
          damage: true
        });
        continue;
      }
      const kind = kindOf3(index);
      builder.addTap(
        stepOf(
          index,
          tapBaseType(archetype),
          isDamageKind(kind) ? false : segmentCritical(kind, info.critical),
          info.flick ? directionFromNumber(valueOf(index, "direction")) : 0,
          info.flick ? absoluteDirectionFromNumber(valueOf(index, "direction")) : 0
        )
      );
      continue;
    }
    if (chain.some((index) => isGuideSegmentKind(kindOf3(index)))) {
      const guideHead = chain.find((index) => isGuideSegmentKind(kindOf3(index))) ?? chain[0];
      const guideColor = guideColorOf(guideHead);
      const guideFade = guideFadeOf(chain);
      builder.addGuidePath(
        chain.map((index) => ({
          ...stepOf(index, BaseType.Guide, false),
          guideColor,
          guideFade
        }))
      );
      continue;
    }
    const steps = [];
    for (let position = 0; position < chain.length; position += 1) {
      const index = chain[position];
      const info = classifyArchetype(entities[index].archetype);
      const kind = kindOf3(index);
      const critical = segmentCritical(kind, info.critical);
      const isFirst = position === 0;
      const isLast = position + 1 === chain.length;
      const direction = info.flick ? directionFromNumber(valueOf(index, "direction")) : 0;
      const flickDirection = info.flick ? absoluteDirectionFromNumber(valueOf(index, "direction")) : 0;
      let baseType;
      if (isFirst) {
        baseType = info.anchor ? BaseType.FrictionHideLong : info.trace ? BaseType.FrictionLong : BaseType.Long;
      } else if (isLast) {
        if (info.anchor) {
          baseType = BaseType.FrictionHide;
        } else if (info.trace && info.flick) {
          baseType = BaseType.FrictionFlick;
        } else if (info.flick) {
          baseType = BaseType.Flick;
        } else if (info.trace) {
          baseType = BaseType.Friction;
        } else {
          baseType = BaseType.Normal;
        }
      } else {
        baseType = info.anchor ? BaseType.HiddenConnection : BaseType.Base;
      }
      steps.push(stepOf(index, baseType, critical, direction, flickDirection));
    }
    if (steps.length >= 2) {
      builder.addChain(steps);
    } else if (steps.length === 1) {
      builder.addTap(steps[0]);
    }
  }
  return {
    json: builder.buildJson(),
    offsetSeconds,
    bpm,
    noteCount: builder.noteCount
  };
}

// src/bridge/clock.ts
var TICKS_PER_BEAT2 = 480;
function readTempoEvents(json) {
  const list = Array.isArray(json.MusicScoreEventDataList) ? json.MusicScoreEventDataList : [];
  const events = [];
  for (const item of list) {
    const event = item;
    if (Number(event.eventType) !== 0) continue;
    const tick = Number(event.ticks);
    const bpm = Number(event.changeValue);
    if (!Number.isFinite(tick) || !Number.isFinite(bpm) || bpm <= 0) continue;
    events.push({ ticks: Math.max(0, tick), bpm });
  }
  events.sort((left, right) => left.ticks - right.ticks);
  return events.length > 0 ? events : [{ ticks: 0, bpm: 120 }];
}
function createTickClock(input) {
  const tempos = input.length > 0 ? [...input] : [{ ticks: 0, bpm: 120 }];
  tempos.sort((left, right) => left.ticks - right.ticks);
  if (tempos[0].ticks > 0) {
    tempos.unshift({ ticks: 0, bpm: tempos[0].bpm });
  }
  const secondsPerTick = (bpm) => 60 / bpm / TICKS_PER_BEAT2;
  const starts = [0];
  for (let i = 1; i < tempos.length; i += 1) {
    const step = tempos[i].ticks - tempos[i - 1].ticks;
    starts.push(starts[i - 1] + step * secondsPerTick(tempos[i - 1].bpm));
  }
  function segmentAtTick(tick) {
    let index = tempos.length - 1;
    while (index > 0 && tempos[index].ticks > tick) index -= 1;
    return index;
  }
  function segmentAtSeconds(seconds) {
    let index = tempos.length - 1;
    while (index > 0 && starts[index] > seconds) index -= 1;
    return index;
  }
  return {
    tempos,
    secondsPerTick,
    secondsAtTick(tick) {
      const index = segmentAtTick(tick);
      return starts[index] + (tick - tempos[index].ticks) * secondsPerTick(tempos[index].bpm);
    },
    tickAtSeconds(seconds) {
      const index = segmentAtSeconds(seconds);
      return tempos[index].ticks + (seconds - starts[index]) / secondsPerTick(tempos[index].bpm);
    }
  };
}

// src/bridge/speed.ts
var MAX_VALUE = 1e6;
function buildSpeedLayers(chart, clock, options = {}) {
  const beatsPerSample = Math.max(1 / 32, options.beatsPerSample ?? 1 / 8);
  const anchorNotes = options.anchorNotes !== false;
  return chart.groups.map(
    (group, index) => buildLayer(chart, index, clock, beatsPerSample, anchorNotes, group)
  );
}
function buildLayer(chart, groupIndex, clock, beatsPerSample, anchorNotes, group) {
  const track = group.track;
  const markers = track.markers;
  if (markers.length === 0) {
    return [{ ticks: 0, value: 1 }];
  }
  const position = (seconds) => track.positionAt(seconds);
  const bounds = /* @__PURE__ */ new Set();
  const add = (tick) => {
    if (Number.isFinite(tick)) bounds.add(Math.max(0, Math.round(tick)));
  };
  add(0);
  const markerTicks = markers.map((marker) => Math.round(clock.tickAtSeconds(marker.time)));
  for (const tick of markerTicks) {
    add(tick - 1);
    add(tick);
  }
  const stepTicks = Math.max(1, Math.round(beatsPerSample * TICKS_PER_BEAT2));
  for (let i = 0; i < markerTicks.length; i += 1) {
    const from = markerTicks[i];
    const to = i + 1 < markerTicks.length ? markerTicks[i + 1] : from;
    for (let tick = from; tick < to; tick += stepTicks) add(tick);
  }
  if (anchorNotes) {
    for (const note of chart.notes) {
      if (note.group !== groupIndex) continue;
      add(Math.round(note.beat * TICKS_PER_BEAT2));
    }
  }
  const sorted = [...bounds].sort((left, right) => left - right);
  const keys = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (b <= a) continue;
    const ta = clock.secondsAtTick(a);
    const tb = clock.secondsAtTick(b);
    const dt = tb - ta;
    if (!(dt > 0)) continue;
    keys.push({ ticks: a, value: clampValue((position(tb) - position(ta)) / dt) });
  }
  if (keys.length === 0) {
    return [{ ticks: 0, value: 1 }];
  }
  const tailTick = sorted[sorted.length - 1];
  const tailValue = keys[keys.length - 1].value;
  keys.push({ ticks: tailTick, value: clampValue(tailValue) });
  return keys;
}
function valueAtKeys(keys, tick) {
  if (keys.length === 0) return 1;
  let value = keys[0].value;
  for (const key of keys) {
    if (key.ticks > tick) break;
    value = key.value;
  }
  return value;
}
function clampValue(value) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(-MAX_VALUE, Math.min(MAX_VALUE, value));
}

// src/bridge/customScore.ts
function normalizeTimescaleGroups(text) {
  let document;
  try {
    document = JSON.parse(text);
  } catch {
    return { text, renamed: 0 };
  }
  if (!document || !Array.isArray(document.entities)) {
    return { text, renamed: 0 };
  }
  const used = /* @__PURE__ */ new Set();
  let renamed = 0;
  document.entities.forEach((entity, index) => {
    if (!entity || entity.archetype !== "#TIMESCALE_GROUP") return;
    const name = entity.name;
    if (typeof name === "string" && name.length > 0 && !used.has(name)) {
      used.add(name);
      return;
    }
    let candidate = "";
    let suffix = 0;
    do {
      candidate = `__tsg_${index}_${suffix++}`;
    } while (used.has(candidate));
    entity.name = candidate;
    used.add(candidate);
    renamed += 1;
  });
  return renamed > 0 ? { text: JSON.stringify(document), renamed } : { text, renamed: 0 };
}
function buildCustomScore(levelDataText, chart, options = {}) {
  const normalized = normalizeTimescaleGroups(levelDataText);
  const legacy = parseLevelData2(normalized.text);
  const document = JSON.parse(legacy.json);
  return finishBridge(document, chart, options, normalized.renamed);
}
function bridgeFromDocument(document, chart, options = {}) {
  const copy = JSON.parse(JSON.stringify(document));
  return finishBridge(copy, chart, options, 0);
}
function finishBridge(document, chart, options, normalizedGroups) {
  const tempos = readTempoEvents(document);
  const clock = createTickClock(tempos);
  const layers = buildSpeedLayers(chart, clock, options);
  const legacyLayers = document.SpeedLayers ?? [];
  document.SpeedLayers = layers;
  const warnings = [];
  if (layers.length !== chart.groups.length) {
    warnings.push(`\u901F\u5EA6\u5C42 ${layers.length} \u6761 \u2260 \u65F6\u5E8F\u7EC4 ${chart.groups.length} \u4E2A`);
  }
  let fixed = 0;
  for (const note of document.NoteList) {
    const layer = Number(note.speedLayer);
    if (!Number.isInteger(layer) || layer < 0) continue;
    if (layer >= layers.length) {
      note.speedLayer = layers.length - 1;
      fixed += 1;
    }
  }
  const reference = layers.find((layer) => layer.length > 0) ?? [];
  let ratioChanged = 0;
  for (const note of document.NoteList) {
    const layer = Number(note.speedLayer);
    if (!Number.isInteger(layer) || layer < 0 || layer >= layers.length) continue;
    const tick = Number(note.ticks);
    if (!Number.isFinite(tick)) continue;
    const ratio = relativeSpeedRatio(valueAtKeys(reference, tick), valueAtKeys(layers[layer], tick));
    if (Math.abs(ratio - Number(note.speedRatio ?? 1)) > 1e-4) ratioChanged += 1;
    note.speedRatio = ratio;
  }
  if (fixed > 0) {
    warnings.push(`${fixed} \u4E2A\u97F3\u7B26\u7684 speedLayer \u8D8A\u754C\uFF0C\u5DF2\u6536\u655B\u5230\u6700\u540E\u4E00\u5C42`);
  }
  let keys = 0;
  let maxValue = -Infinity;
  let minValue = Infinity;
  for (const layer of layers) {
    keys += layer.length;
    for (const key of layer) {
      if (key.value > maxValue) maxValue = key.value;
      if (key.value < minValue) minValue = key.value;
    }
  }
  return {
    scoreText: JSON.stringify(document),
    clock,
    tempos,
    legacyLayers,
    stats: {
      notes: document.NoteList.length,
      groups: layers.length,
      keys,
      maxValue: Number.isFinite(maxValue) ? maxValue : 1,
      minValue: Number.isFinite(minValue) ? minValue : 1,
      normalizedGroups,
      ratioChanged
    },
    warnings
  };
}
function clockFromSpeedLayer(keys, clock, tick) {
  if (keys.length === 0 || tick <= 0) {
    return clock.secondsAtTick(Math.max(0, tick));
  }
  let total = 0;
  for (let i = 0; i < keys.length; i += 1) {
    const from = Math.max(0, keys[i].ticks);
    if (from >= tick) break;
    const next = i + 1 < keys.length ? keys[i + 1].ticks : Number.POSITIVE_INFINITY;
    const to = Math.min(next, tick);
    if (to <= from) continue;
    total += (clock.secondsAtTick(to) - clock.secondsAtTick(from)) * keys[i].value;
  }
  return total;
}

// ../src/lib/uscParser.ts
var CHART_TYPE = ["single", "slide", "guide", "timescalegroup", "bpm", "damage"];
function readNumber3(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}
function readBoolean(value) {
  return value === true || value === 1;
}
function readType(object) {
  const type = object.type;
  if (typeof type !== "string") {
    return null;
  }
  const normalized = type.trim().toLowerCase();
  return CHART_TYPE.includes(normalized) ? normalized : null;
}
function readObjects(root) {
  if (!root || typeof root !== "object" || Array.isArray(root)) {
    throw new Error("USC \u6587\u4EF6\u6839\u8282\u70B9\u5FC5\u987B\u662F\u5BF9\u8C61\u3002");
  }
  const document = root;
  const version = readNumber3(document.version, 0);
  if (version !== 2) {
    throw new Error(`\u4E0D\u652F\u6301\u7684 USC \u7248\u672C\uFF1A${version === 0 ? "\u672A\u77E5" : version}\uFF08\u4EC5\u652F\u6301\u7248\u672C 2\uFF09\u3002`);
  }
  const usc = document.usc;
  if (!usc || typeof usc !== "object" || Array.isArray(usc)) {
    throw new Error("USC \u6587\u4EF6\u7F3A\u5C11 usc \u5B57\u6BB5\u3002");
  }
  const body = usc;
  const rawObjects = body.objects;
  if (!Array.isArray(rawObjects)) {
    throw new Error("USC \u6587\u4EF6\u7684 usc.objects \u5FC5\u987B\u662F\u6570\u7EC4\u3002");
  }
  const objects = rawObjects.filter((item) => !!item && typeof item === "object" && !Array.isArray(item));
  return { objects, offsetSeconds: readNumber3(body.offset, 0), version };
}
function readChanges(object) {
  const rawChanges = object.changes;
  if (!Array.isArray(rawChanges)) {
    return [];
  }
  const changes = [];
  for (const raw of rawChanges) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    const change = raw;
    const beat = readNumber3(change.beat, Number.NaN);
    const timeScale = readNumber3(change.timeScale, Number.NaN);
    if (Number.isFinite(beat) && Number.isFinite(timeScale)) {
      changes.push({ beat, timeScale });
    }
  }
  return changes.sort((left, right) => left.beat - right.beat);
}
function tickFromBeat(beat) {
  return Math.round(finiteBeat(beat) * TICKS_PER_BEAT);
}
function finiteBeat(beat) {
  return Number.isFinite(beat) ? beat : 0;
}
function endpointBaseType(connection, fallbackCritical, role) {
  const judgeType = typeof connection.judgeType === "string" ? connection.judgeType.trim().toLowerCase() : "";
  const hidden = judgeType === "none";
  const trace = judgeType === "trace";
  const ownCritical = "critical" in connection && readBoolean(connection.critical);
  const critical = role === "start" ? ownCritical || fallbackCritical : fallbackCritical || ownCritical;
  if (role === "start") {
    return { baseType: holdStartBaseType(hidden, trace), critical };
  }
  const flick = "direction" in connection;
  return { baseType: holdEndBaseType(hidden, trace, flick), critical };
}
function geometryOf(step) {
  return {
    laneCenter: readNumber3(step.lane, 0),
    laneSize: readNumber3(step.size, 0.5)
  };
}
function parseUsc(text) {
  let root;
  try {
    root = JSON.parse(text);
  } catch {
    throw new Error("USC \u6587\u4EF6\u4E0D\u662F\u5408\u6CD5\u7684 JSON\u3002");
  }
  const { objects, offsetSeconds } = readObjects(root);
  const tempoChanges = [];
  const timelines = [];
  let bpm = 120;
  for (const object of objects) {
    const type = readType(object);
    if (type === "bpm") {
      const beat = readNumber3(object.beat, Number.NaN);
      const value = readNumber3(object.bpm, Number.NaN);
      if (Number.isFinite(beat) && Number.isFinite(value) && value > 0) {
        tempoChanges.push({ tick: tickFromBeat(beat), value });
      }
    } else if (type === "timescalegroup") {
      const changes = readChanges(object).map((change) => ({ tick: tickFromBeat(change.beat), value: change.timeScale })).sort((left, right) => left.tick - right.tick);
      timelines.push(changes);
    }
  }
  if (tempoChanges.length === 0) {
    tempoChanges.push({ tick: 0, value: 120 });
  }
  tempoChanges.sort((left, right) => left.tick - right.tick);
  bpm = tempoChanges[0].value;
  const speedLayers = timelines.map((timeline) => quantizeSpeedSegments(timeline));
  const layerIndexOf = (group) => {
    const index = Math.trunc(readNumber3(group, 0));
    return index >= 0 && index < speedLayers.length ? index : -1;
  };
  const referenceTimeline = speedLayers.find((timeline) => timeline.length > 0) ?? [];
  const speedRatioOf = (group, tick) => {
    const index = layerIndexOf(group);
    return index < 0 ? 1 : relativeSpeedRatio(valueAt(referenceTimeline, tick), valueAt(speedLayers[index], tick));
  };
  const speedOf = (group, tick) => ({ layer: layerIndexOf(group), ratio: speedRatioOf(group, tick) });
  const builder = new CustomScoreBuilder();
  builder.setSpeedLayers(speedLayers);
  for (const change of tempoChanges) {
    builder.addEvent(EventType.Bpm, change.tick, change.value);
  }
  for (const change of referenceTimeline) {
    builder.addEvent(EventType.HiSpeed, change.tick, change.value);
  }
  const singles = [];
  const slides = [];
  const guides = [];
  const damages = [];
  for (const object of objects) {
    const type = readType(object);
    if (type === "single") {
      singles.push(object);
    } else if (type === "slide") {
      slides.push(object);
    } else if (type === "guide") {
      guides.push(object);
    } else if (type === "damage") {
      damages.push(object);
    }
  }
  for (const single of singles) {
    const geometry = geometryOf(single);
    const tick = tickFromBeat(readNumber3(single.beat, 0));
    const critical = readBoolean(single.critical);
    const trace = readBoolean(single.trace);
    const direction = directionFromName(single.direction);
    const flick = direction !== 0 || "direction" in single;
    const baseType = trace ? flick ? BaseType.FrictionFlick : BaseType.Friction : flick ? BaseType.Flick : BaseType.Normal;
    const speed = speedOf(single.timeScaleGroup, tick);
    builder.addTap({
      ...geometry,
      tick,
      critical,
      baseType,
      direction,
      speedLayer: speed.layer,
      speedRatio: speed.ratio
    });
  }
  for (const slide of slides) {
    const connections = Array.isArray(slide.connections) ? slide.connections : [];
    const steps = buildSlideSteps(connections, readBoolean(slide.critical), speedOf);
    if (steps.length >= 2) {
      builder.addChain(steps);
    }
  }
  for (const damage of damages) {
    const tick = tickFromBeat(readNumber3(damage.beat, 0));
    const speed = speedOf(damage.timeScaleGroup, tick);
    builder.addTap({
      ...geometryOf(damage),
      tick,
      critical: false,
      baseType: BaseType.Damage,
      category: Category.Damage,
      damage: true,
      speedLayer: speed.layer,
      speedRatio: speed.ratio
    });
  }
  for (const guide of guides) {
    const midpoints = Array.isArray(guide.midpoints) ? guide.midpoints : [];
    const steps = [];
    for (const raw of midpoints) {
      if (!raw || typeof raw !== "object") {
        continue;
      }
      const point = raw;
      const tick = tickFromBeat(readNumber3(point.beat, 0));
      const speed = speedOf(point.timeScaleGroup, tick);
      steps.push({
        ...geometryOf(point),
        tick,
        critical: false,
        baseType: BaseType.Guide,
        lineType: lineTypeFromEase(point.ease),
        speedLayer: speed.layer,
        speedRatio: speed.ratio,
        guideColor: guideColorFromName(guide.color),
        guideFade: guideFadeFromName(guide.fade)
      });
    }
    steps.sort((left, right) => left.tick - right.tick);
    builder.addGuidePath(steps);
  }
  return {
    json: builder.buildJson(),
    offsetSeconds,
    bpm,
    noteCount: builder.noteCount
  };
}
function buildSlideSteps(connections, slideCritical, speedOf) {
  const starts = [];
  const ticks = [];
  const attaches = [];
  const ends = [];
  for (const connection of connections) {
    const type = typeof connection.type === "string" ? connection.type.trim().toLowerCase() : "";
    if (type === "start") {
      starts.push(connection);
    } else if (type === "end") {
      ends.push(connection);
    } else if (type === "attach") {
      attaches.push(connection);
    } else {
      ticks.push(connection);
    }
  }
  const byBeat = (left, right) => readNumber3(left.beat, 0) - readNumber3(right.beat, 0);
  ticks.sort(byBeat);
  attaches.sort(byBeat);
  const steps = [];
  const head = starts[0];
  if (!head) {
    return steps;
  }
  {
    const tick = tickFromBeat(readNumber3(head.beat, 0));
    const { baseType, critical } = endpointBaseType(head, slideCritical, "start");
    const speed = speedOf(head.timeScaleGroup, tick);
    steps.push({
      ...geometryOf(head),
      tick,
      critical,
      baseType,
      lineType: lineTypeFromEase(head.ease),
      speedLayer: speed.layer,
      speedRatio: speed.ratio
    });
  }
  for (const connection of [...attaches, ...ticks].sort(byBeat)) {
    const tick = tickFromBeat(readNumber3(connection.beat, 0));
    const judgeType = typeof connection.judgeType === "string" ? connection.judgeType.trim().toLowerCase() : "";
    const connectionType = typeof connection.type === "string" ? connection.type.trim().toLowerCase() : "";
    const speed = speedOf(connection.timeScaleGroup, tick);
    if (judgeType === "none") {
      steps.push({
        ...geometryOf(connection),
        tick,
        critical: false,
        baseType: holdMidBaseType(true),
        lineType: lineTypeFromEase(connection.ease),
        speedLayer: speed.layer,
        speedRatio: speed.ratio
      });
      continue;
    }
    if (judgeType === "trace" || readBoolean(connection.trace)) {
      steps.push({
        ...geometryOf(connection),
        tick,
        critical: false,
        baseType: BaseType.FrictionLong,
        lineType: lineTypeFromEase(connection.ease),
        speedLayer: speed.layer,
        speedRatio: speed.ratio
      });
      continue;
    }
    if (connectionType === "attach") {
      steps.push({
        ...geometryOf(connection),
        tick,
        critical: "critical" in connection ? readBoolean(connection.critical) : false,
        baseType: BaseType.Connection,
        category: Category.Connection,
        lineType: lineTypeFromEase(connection.ease),
        isSkip: true,
        speedLayer: speed.layer,
        speedRatio: speed.ratio
      });
      continue;
    }
    const hasCritical = "critical" in connection;
    steps.push({
      ...geometryOf(connection),
      tick,
      critical: hasCritical ? readBoolean(connection.critical) : false,
      baseType: holdMidBaseType(!hasCritical),
      lineType: lineTypeFromEase(connection.ease),
      speedLayer: speed.layer,
      speedRatio: speed.ratio
    });
  }
  const tail = ends[0];
  if (tail) {
    const tick = tickFromBeat(readNumber3(tail.beat, 0));
    const { baseType, critical } = endpointBaseType(tail, slideCritical, "end");
    const direction = directionFromName(tail.direction);
    const speed = speedOf(tail.timeScaleGroup, tick);
    steps.push({
      ...geometryOf(tail),
      tick,
      critical,
      baseType,
      direction,
      lineType: LineType.Linear,
      speedLayer: speed.layer,
      speedRatio: speed.ratio
    });
  }
  return steps;
}

// src/data/usc.ts
var CHAIN_TYPES = /* @__PURE__ */ new Set([2, 5, 6, 7, 8, 9]);
var GUIDE_TYPES = /* @__PURE__ */ new Set([10, 13, 14]);
var FLICK_TYPES = /* @__PURE__ */ new Set([3, 4]);
var TRACE_TYPES = /* @__PURE__ */ new Set([11, 12]);
function kindOf2(note) {
  if (note.damage) return "tap";
  if (note.category === 9 || GUIDE_TYPES.has(note.noteBaseType)) return "guide";
  const hasPrev = note.previousConnectionId !== -1;
  const hasNext = note.nextConnectionId !== -1;
  if (hasPrev && hasNext) return "holdTick";
  if (hasPrev && !hasNext) return "holdTail";
  if (!hasPrev && hasNext && CHAIN_TYPES.has(note.noteBaseType)) return "holdHead";
  if (FLICK_TYPES.has(note.noteBaseType)) return "flick";
  if (TRACE_TYPES.has(note.noteBaseType)) return "trace";
  return "tap";
}
function deriveSimLines(notes) {
  const byTick = /* @__PURE__ */ new Map();
  for (const note of notes) {
    if (note.damage || note.kind === "anchor" || note.kind === "guide" || note.kind === "holdTick") continue;
    const center = note.lane + note.size / 2;
    const key = Math.round(note.beat * 480);
    const entry = byTick.get(key);
    if (!entry) {
      byTick.set(key, { min: note, max: note, minCenter: center, maxCenter: center });
      continue;
    }
    if (center < entry.minCenter) {
      entry.min = note;
      entry.minCenter = center;
    }
    if (center > entry.maxCenter) {
      entry.max = note;
      entry.maxCenter = center;
    }
  }
  const lines = [];
  for (const entry of byTick.values()) {
    if (entry.maxCenter === entry.minCenter) continue;
    lines.push({ left: entry.min.id, right: entry.max.id });
  }
  return lines;
}
function parseUscChart(text) {
  const parsed = parseUsc(text);
  const document = JSON.parse(parsed.json);
  const raw = JSON.parse(text);
  const objects = raw.usc?.objects ?? [];
  const bpmPoints = [];
  for (const event of document.MusicScoreEventDataList) {
    if (event.eventType !== 0) continue;
    if (!Number.isFinite(event.ticks) || !Number.isFinite(event.changeValue)) continue;
    bpmPoints.push({ beat: event.ticks / 480, bpm: event.changeValue });
  }
  const tempo = new TempoMap(bpmPoints.length > 0 ? bpmPoints : [{ beat: 0, bpm: parsed.bpm || 120 }]);
  const groups = [];
  let markerCount = 0;
  for (const object of objects) {
    if (object.type !== "timeScaleGroup") continue;
    const markers = [];
    const hidden = [];
    for (const change of object.changes ?? []) {
      const beat = Number(change.beat);
      const timescale = Number(change.timeScale);
      if (!Number.isFinite(beat) || !Number.isFinite(timescale)) continue;
      markers.push({ time: tempo.timeAt(beat), timescale, skip: 0, ease: 0 });
      hidden.push(false);
    }
    if (markers.length === 0) {
      markers.push({ time: 0, timescale: 1, skip: 0, ease: 0 });
      hidden.push(false);
    }
    markers.sort((left, right) => left.time - right.time);
    markerCount += markers.length;
    groups.push({ name: `${groups.length}`, track: new TimescaleTrack(markers), hidden });
  }
  const notes = document.NoteList.map((note, index) => {
    const beat = note.ticks / 480;
    const kind = kindOf2(note);
    const lane = note.laneCenter - note.laneSize / 2;
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
      chainRole: "none",
      endTime: tempo.timeAt(beat)
    };
  });
  const holds = [];
  for (const note of notes) {
    if (note.kind !== "holdHead") continue;
    const tickIds = [];
    let cursor = note.next;
    let tailId = -1;
    const guard = /* @__PURE__ */ new Set();
    while (cursor !== -1 && !guard.has(cursor)) {
      guard.add(cursor);
      const current = notes[cursor];
      if (current.kind === "holdTail") {
        tailId = cursor;
        break;
      }
      tickIds.push(cursor);
      cursor = current.next;
    }
    if (tailId === -1) continue;
    note.chainRole = "head";
    notes[tailId].chainRole = "tail";
    for (const tickId of tickIds) notes[tickId].chainRole = "mid";
    note.endTime = notes[tailId].time;
    holds.push({ headId: note.id, tailId, tickIds });
  }
  let duration = 0;
  for (const note of notes) duration = Math.max(duration, note.time, note.endTime);
  const warnings = [];
  if (notes.length === 0) warnings.push("USC \u91CC\u6CA1\u6709\u89E3\u6790\u5230\u97F3\u7B26");
  if (groups.length === 0) warnings.push("USC \u91CC\u6CA1\u6709 timeScaleGroup\uFF0C\u56DE\u9000\u4E3A\u6052\u901F 1\xD7");
  const chart = {
    bgmOffset: Number(raw.usc?.offset ?? parsed.offsetSeconds ?? 0),
    tempo,
    groups: groups.length > 0 ? groups : [{ name: "0", track: new TimescaleTrack([{ time: 0, timescale: 1, skip: 0, ease: 0 }]), hidden: [false] }],
    notes,
    holds,
    simLines: deriveSimLines(notes),
    duration,
    warnings
  };
  const count = (type) => objects.filter((object) => object.type === type).length;
  return {
    chart,
    document,
    scoreText: parsed.json,
    offsetSeconds: parsed.offsetSeconds,
    stats: {
      notes: notes.length,
      groups: chart.groups.length,
      markers: markerCount,
      guides: notes.filter((note) => note.kind === "guide").length,
      holds: holds.length,
      singles: count("single"),
      slides: count("slide")
    }
  };
}
function looksLikeUsc(text) {
  const head = text.slice(0, 4096);
  if (!/"usc"\s*:/.test(head)) return false;
  try {
    const root = JSON.parse(text);
    return !!root && typeof root === "object" && root.usc !== void 0;
  } catch {
    return false;
  }
}
export {
  EaseType,
  TICKS_PER_BEAT2 as TICKS_PER_BEAT,
  TempoMap,
  TimescaleTrack,
  bridgeFromDocument,
  buildCustomScore,
  buildSpeedLayers,
  clockFromSpeedLayer,
  createTickClock,
  describeGroup,
  easeValue,
  integrateNumeric,
  integrateTimes,
  looksLikeUsc,
  normalizeTimescaleGroups,
  parseLevelData,
  parseUscChart,
  readTempoEvents,
  runParity,
  trackOf
};
