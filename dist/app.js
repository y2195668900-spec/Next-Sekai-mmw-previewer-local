var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/site/shell.ts
var shell_exports = {};
__export(shell_exports, {
  NAV_ITEMS: () => NAV_ITEMS,
  renderShell: () => renderShell
});
function renderShell(root, content, currentPath) {
  const links = NAV_ITEMS.map((item) => {
    const activeClass = !item.external && item.href === currentPath ? "is-active" : "";
    const externalAttrs = item.external ? ' target="_blank" rel="noreferrer"' : "";
    return `<a href="${item.href}" class="nav-link ${activeClass}"${externalAttrs}>${item.label}</a>`;
  }).join("");
  root.innerHTML = `
    <div class="app-layout">
      <aside class="app-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-brand">Sonolus Version</div>
          <button class="mobile-menu-toggle" id="mobile-menu-toggle" aria-label="Toggle Menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
        <nav class="sidebar-nav" id="sidebar-nav">
          ${links}
        </nav>
      </aside>
      <main class="app-main">
        ${content}
      </main>
    </div>
  `;
  root.querySelector("#mobile-menu-toggle")?.addEventListener("click", () => {
    root.querySelector("#sidebar-nav")?.classList.toggle("is-open");
  });
}
var NAV_ITEMS;
var init_shell = __esm({
  "src/site/shell.ts"() {
    "use strict";
    NAV_ITEMS = [
      { href: "/", label: "\u4E3B\u9875" },
      { href: "/upload", label: "\u52A0\u8F7D\u81EA\u5236\u8C31" },
      { href: "/preview", label: "\u9884\u89C8\u9875" },
      { href: "/chart-to-image", label: "\u8C31\u9762\u8F6C\u56FE\u7247" },
      { href: "/about", label: "\u5173\u4E8E" }
    ];
  }
});

// src/time/bpm.ts
var TempoMap;
var init_bpm = __esm({
  "src/time/bpm.ts"() {
    "use strict";
    TempoMap = class {
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
  }
});

// src/time/ease.ts
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
    const mode2 = easeMode(ease);
    if (mode2 === EaseMode.IN) return ease + 1;
    if (mode2 === EaseMode.OUT) return ease - 1;
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
  const mode2 = easeMode(ease);
  if (mode2 === EaseMode.IN) return inCurve(family, x);
  if (mode2 === EaseMode.OUT) return 1 - inCurve(family, 1 - x);
  if (mode2 === EaseMode.IN_OUT) {
    return x < 0.5 ? inCurve(family, 2 * x) / 2 : 1 - inCurve(family, 2 - 2 * x) / 2;
  }
  return x < 0.5 ? (1 - inCurve(family, 1 - 2 * x)) / 2 : (1 + inCurve(family, 2 * x - 1)) / 2;
}
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
  const mode2 = easeMode(ease);
  let base = 0;
  let scale = 1;
  let y = u;
  if (mode2 === EaseMode.OUT) {
    base = u - INTEGRAL_TOTALS[family];
    scale = 1;
    y = 1 - u;
  } else if (mode2 === EaseMode.IN_OUT) {
    if (u <= 0.5) {
      base = 0;
      scale = 0.25;
      y = 2 * u;
    } else {
      base = u - 0.5;
      scale = 0.25;
      y = 2 - 2 * u;
    }
  } else if (mode2 === EaseMode.OUT_IN) {
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
  const last2 = hi / span;
  const average = (quadraticEase(e, first) + 4 * quadraticEase(e, middle) + quadraticEase(e, last2)) / 6;
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
  const last2 = hi / span;
  let average = 0;
  const useSimpson = e <= EaseType.OUT_IN_QUAD || EaseType.IN_CUBIC <= e && e <= EaseType.OUT_IN_CUBIC || width <= span * QUADRATURE_WIDTH;
  if (useSimpson) {
    const half = (last2 - first) * 0.5;
    for (let i = 0; i < 3; i += 1) average += SIMPSON_WEIGHTS[i] * easeValue(e, first + half * i);
  } else {
    average = (easeIntegralClosed(e, last2) - easeIntegralClosed(e, first)) * (span / width);
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
    const last2 = quadraticPiece(v0, v1, ease, span, midpoint, b, b - midpoint);
    return orientation * (first + last2);
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
var EaseType, EaseFamily, EaseMode, INTEGRAL_TOTALS, SIMPSON_WEIGHTS, QUADRATURE_WIDTH;
var init_ease = __esm({
  "src/time/ease.ts"() {
    "use strict";
    EaseType = {
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
    EaseFamily = {
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
    EaseMode = { IN: 0, OUT: 1, IN_OUT: 2, OUT_IN: 3 };
    INTEGRAL_TOTALS = [
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
    SIMPSON_WEIGHTS = [1 / 6, 4 / 6, 1 / 6];
    QUADRATURE_WIDTH = 2 ** -6;
  }
});

// src/time/timescale.ts
var TimescaleTrack;
var init_timescale = __esm({
  "src/time/timescale.ts"() {
    "use strict";
    init_ease();
    TimescaleTrack = class {
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
          const last2 = markers.length - 1;
          const marker2 = markers[last2];
          return this.positions[last2] + (t - marker2.time) * marker2.timescale;
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
  }
});

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
function isNoteHidden(chart2, note) {
  const group = chart2.groups[note.group] ?? chart2.groups[0];
  if (!group || group.hidden.length === 0) return false;
  const index = group.track.markerIndexAt(note.time);
  return index >= 0 && group.hidden[index] === true;
}
function trackOf(chart2, note) {
  return chart2.groups[note.group]?.track ?? chart2.groups[0].track;
}
function describeGroup(chart2, index) {
  const group = chart2.groups[index];
  if (!group) return "\u2014";
  const markers = group.track.markers;
  return `${group.name}: ${markers.length} markers, ${markers.slice(0, 4).map((m) => `${m.time.toFixed(2)}s\u2192${m.timescale}${m.skip ? `(+${m.skip.toFixed(2)}s)` : ""}`).join(", ")}${markers.length > 4 ? " \u2026" : ""}`;
}
var init_leveldata = __esm({
  "src/data/leveldata.ts"() {
    "use strict";
    init_bpm();
    init_timescale();
  }
});

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
function checkSkip(chart2) {
  const results = [];
  for (const [index, group] of chart2.groups.entries()) {
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
function checkPositionVsSpeed(chart2) {
  const results = [];
  for (const [index, group] of chart2.groups.entries()) {
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
function checkContinuity(chart2) {
  const results = [];
  for (const [index, group] of chart2.groups.entries()) {
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
function runParity(chart2) {
  return [
    ...checkEaseEndpoints(),
    ...checkIntegration(),
    ...checkStepEase(),
    ...checkTempo(),
    ...checkSkip(chart2),
    ...checkContinuity(chart2),
    ...checkPositionVsSpeed(chart2),
    ...chart2.warnings.map((warning) => ({ name: "\u89E3\u6790\u544A\u8B66", ok: false, detail: warning }))
  ];
}
var init_checks = __esm({
  "src/parity/checks.ts"() {
    "use strict";
    init_ease();
    init_bpm();
  }
});

// src/audio/hit.ts
var FILES, HitSound;
var init_hit = __esm({
  "src/audio/hit.ts"() {
    "use strict";
    FILES = {
      tap: "se_live_perfect.mp3",
      critical: "se_live_critical.mp3",
      flick: "se_live_flick.mp3",
      trace: "se_live_trace.mp3"
    };
    HitSound = class {
      constructor() {
        __publicField(this, "context", null);
        __publicField(this, "buffers", /* @__PURE__ */ new Map());
        __publicField(this, "enabled", true);
        __publicField(this, "volume", 0.6);
        __publicField(this, "lastPlayed", /* @__PURE__ */ new Map());
      }
      get isReady() {
        return this.buffers.size > 0;
      }
      setVolume(volume) {
        this.volume = Math.min(1, Math.max(0, volume));
      }
      setEnabled(enabled) {
        this.enabled = enabled;
      }
      async load(base = "./assets/sound/") {
        const Ctx = window.AudioContext ?? window.webkitAudioContext;
        if (!Ctx) return;
        this.context ?? (this.context = new Ctx());
        await Promise.all(
          Object.entries(FILES).map(async ([kind, file]) => {
            try {
              const response = await fetch(base + file);
              if (!response.ok) return;
              const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
              this.buffers.set(kind, buffer);
            } catch {
            }
          })
        );
      }
      /** 同一音效 30ms 内不叠放，避免和弦炸音。 */
      play(kind, nowMs = performance.now()) {
        if (!this.enabled || !this.context) return;
        const buffer = this.buffers.get(kind);
        if (!buffer) return;
        const last2 = this.lastPlayed.get(kind) ?? -Infinity;
        if (nowMs - last2 < 30) return;
        this.lastPlayed.set(kind, nowMs);
        const source = this.context.createBufferSource();
        const gain = this.context.createGain();
        source.buffer = buffer;
        gain.gain.value = this.volume;
        source.connect(gain);
        gain.connect(this.context.destination);
        source.start();
      }
      /** 浏览器要求用户手势后才能出声。 */
      async unlock() {
        if (this.context?.state === "suspended") await this.context.resume();
      }
    };
  }
});

// src/view/skin.ts
var Skin;
var init_skin = __esm({
  "src/view/skin.ts"() {
    "use strict";
    Skin = class _Skin {
      constructor(image, sprites, width, height) {
        __publicField(this, "image");
        __publicField(this, "sprites");
        __publicField(this, "width");
        __publicField(this, "height");
        this.image = image;
        this.sprites = sprites;
        this.width = width;
        this.height = height;
      }
      static async load(base = "./assets/") {
        const [table, image] = await Promise.all([
          fetch(`${base}sprites.json`).then((response) => {
            if (!response.ok) throw new Error(`sprites.json \u2192 HTTP ${response.status}`);
            return response.json();
          }),
          new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("skin.png \u8F7D\u5165\u5931\u8D25"));
            img.src = `${base}skin.png`;
          })
        ]);
        const map = /* @__PURE__ */ new Map();
        for (const sprite of table.sprites) map.set(sprite.name, sprite);
        return new _Skin(image, map, table.width, table.height);
      }
      has(name) {
        return this.sprites.has(name);
      }
      draw(ctx, name, x, y, w, h) {
        const sprite = this.sprites.get(name);
        if (!sprite) return false;
        ctx.drawImage(this.image, sprite.x, sprite.y, sprite.w, sprite.h, x, y, w, h);
        return true;
      }
      /** 水平三段切片：两端按原始比例，中间拉伸。 */
      drawSlice(ctx, left, middle, right, x, y, w, h) {
        const l = this.sprites.get(left);
        const m = this.sprites.get(middle);
        const r2 = this.sprites.get(right);
        if (!l || !m || !r2) return false;
        const capLeft = l.w / l.h * h;
        const capRight = r2.w / r2.h * h;
        const middleWidth = Math.max(0, w - capLeft - capRight);
        ctx.drawImage(this.image, l.x, l.y, l.w, l.h, x, y, capLeft, h);
        if (middleWidth > 0) {
          ctx.drawImage(this.image, m.x, m.y, m.w, m.h, x + capLeft, y, middleWidth, h);
        } else {
          const total = capLeft + capRight;
          const scale = total > 0 ? w / total : 0;
          ctx.drawImage(this.image, r2.x, r2.y, r2.w, r2.h, x + w - capRight * scale, y, capRight * scale, h);
          return true;
        }
        ctx.drawImage(this.image, r2.x, r2.y, r2.w, r2.h, x + w - capRight, y, capRight, h);
        return true;
      }
      /** 图集里这张贴图的宽高比（用于由宽度推高度）。 */
      aspect(name, fallback = 354 / 186) {
        const sprite = this.sprites.get(name);
        if (!sprite || sprite.h === 0) return fallback;
        return sprite.w / sprite.h;
      }
    };
  }
});

// src/view/layout.ts
function setNoteSpeed(speed) {
  const clamped = Math.min(12, Math.max(1, speed));
  LAYOUT.preemptSec = 12 / clamped;
}
function progressToY(progress) {
  const p = Math.min(1, Math.max(0, progress));
  const normalized = 1 - Math.pow(1 - p, LAYOUT.perspective);
  return LAYOUT.horizonY + (LAYOUT.judgementY - LAYOUT.horizonY) * Math.min(1, Math.max(0, normalized));
}
function halfWidthAtProgress(progress) {
  const p = Math.min(1, Math.max(0, progress));
  const normalized = 1 - Math.pow(1 - p, LAYOUT.perspective);
  return LAYOUT.baseHalfWidth * (0.34 + 0.66 * Math.min(1, Math.max(0, normalized)));
}
function laneToX(lane, progress, mirror = false) {
  const normalized = lane / LAYOUT.laneSpan;
  return 0.5 + (mirror ? -normalized : normalized) * halfWidthAtProgress(progress) * 2;
}
function widthToScreen(size, progress) {
  return size / LAYOUT.laneSpan * halfWidthAtProgress(progress) * 2;
}
function progressFromDistance(distance) {
  return 1 - distance / LAYOUT.preemptSec;
}
var APPROACH_SCALE, NOTE_H, LAYOUT;
var init_layout = __esm({
  "src/view/layout.ts"() {
    "use strict";
    APPROACH_SCALE = 1.06 ** -45;
    NOTE_H = 75 / 850 / 2;
    LAYOUT = {
      /** 判定线在画面中的 y（0=顶部，1=底部） */
      judgementY: 0.84,
      /** 地平线 y */
      horizonY: 0.08,
      /** 透视指数（近似上游 approach 曲线的观感） */
      perspective: 2.1,
      /** 判定线处的半宽（占画面宽度比例） */
      baseHalfWidth: 0.43,
      /** 1× 下从出生到判定线的视觉时长（秒）；noteSpeed 会改它 */
      preemptSec: 12 / 10.5,
      /** 出生点对应的 travel 值（progress=0） */
      spawnTravel: APPROACH_SCALE,
      laneSpan: 12
    };
  }
});

// src/view/renderer.ts
var FALLBACK, Renderer;
var init_renderer = __esm({
  "src/view/renderer.ts"() {
    "use strict";
    init_leveldata();
    init_layout();
    FALLBACK = {
      note: "#5ee0c0",
      critical: "#ffd25e",
      trace: "rgba(120,220,255,0.6)",
      hold: "rgba(94,224,192,0.28)",
      holdEdge: "rgba(94,224,192,0.85)",
      sim: "rgba(255,255,255,0.75)"
    };
    Renderer = class {
      constructor(canvas2, skin2) {
        __publicField(this, "canvas");
        __publicField(this, "ctx");
        __publicField(this, "skin");
        __publicField(this, "dpr", 1);
        __publicField(this, "pulse", 0);
        this.canvas = canvas2;
        this.skin = skin2;
        const ctx = canvas2.getContext("2d");
        if (!ctx) throw new Error("canvas2d \u4E0D\u53EF\u7528");
        this.ctx = ctx;
      }
      setSkin(skin2) {
        this.skin = skin2;
      }
      setPulse(value) {
        this.pulse = Math.min(1, Math.max(0, value));
      }
      resize(width, height, dpr2) {
        this.dpr = dpr2;
        this.canvas.width = Math.round(width * dpr2);
        this.canvas.height = Math.round(height * dpr2);
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
      }
      draw(chart2, time, options) {
        const ctx = this.ctx;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const w = this.canvas.width / this.dpr;
        const h = this.canvas.height / this.dpr;
        this.drawStageLines(w, h, options);
        this.drawSimLines(chart2, time, w, h, options);
        this.drawHolds(chart2, time, w, h, options);
        this.drawNotes(chart2, time, w, h, options);
        this.drawJudgeLine(w, h, options);
        this.drawPulse(w, h);
      }
      /* ── 舞台 ───────────────────────────────────────────── */
      drawStageLines(w, h, options) {
        const ctx = this.ctx;
        const topY = progressToY(0) * h;
        const bottomY = progressToY(1) * h;
        ctx.save();
        for (let lane = -6; lane <= 6; lane += 1) {
          const xTop = laneToX(lane, 0, options.mirror) * w;
          const xBottom = laneToX(lane, 1, options.mirror) * w;
          ctx.strokeStyle = lane === 0 ? "rgba(125,211,252,0.22)" : "rgba(148,163,184,0.12)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(xTop, topY);
          ctx.lineTo(xBottom, bottomY);
          ctx.stroke();
        }
        ctx.strokeStyle = "rgba(148,163,184,0.16)";
        ctx.beginPath();
        ctx.moveTo(laneToX(-6, 0, options.mirror) * w, topY);
        ctx.lineTo(laneToX(6, 0, options.mirror) * w, topY);
        ctx.stroke();
        ctx.restore();
      }
      drawJudgeLine(w, h, options) {
        const ctx = this.ctx;
        const y = progressToY(1) * h;
        const left = laneToX(-6, 1, options.mirror) * w;
        const right = laneToX(6, 1, options.mirror) * w;
        const thickness = Math.max(6, h * 0.014);
        const drawn = options.useSkin && this.skin ? this.skin.draw(ctx, "#JUDGMENT_LINE", left, y - thickness / 2, right - left, thickness) : false;
        if (!drawn) {
          ctx.save();
          ctx.strokeStyle = "rgba(226,232,240,0.9)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(left, y);
          ctx.lineTo(right, y);
          ctx.stroke();
          ctx.restore();
        }
      }
      drawPulse(w, h) {
        if (this.pulse <= 0.01) return;
        const ctx = this.ctx;
        const y = progressToY(1) * h;
        const band = h * 0.045 * this.pulse;
        const gradient = ctx.createLinearGradient(0, y - band, 0, y + band);
        gradient.addColorStop(0, "rgba(255,255,255,0)");
        gradient.addColorStop(0.5, `rgba(255,255,255,${0.3 * this.pulse})`);
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.fillRect(0, y - band, w, band * 2);
        ctx.restore();
      }
      /* ── 音符 ───────────────────────────────────────────── */
      geometry(chart2, note, time) {
        const track = trackOf(chart2, note);
        const distance = track.positionAt(note.time) - track.positionAt(time);
        const progress = progressFromDistance(distance);
        return { progress, y: progressToY(progress), distance };
      }
      spriteFamily(note) {
        const color = "Neutral";
        if (note.damage) {
          return {
            left: `Sekai Damage Note Left ${color}`,
            middle: `Sekai Damage Note Middle ${color}`,
            right: `Sekai Damage Note Right ${color}`
          };
        }
        const critical = note.critical ? "Critical" : "Normal";
        if (note.kind === "trace") {
          return {
            left: `Sekai ${critical} Trace Note Left ${color}`,
            middle: `Sekai ${critical} Trace Note Middle ${color}`,
            right: `Sekai ${critical} Trace Note Right ${color}`
          };
        }
        if (note.kind === "flick") {
          return {
            left: `Sekai Flick Note Left ${color}`,
            middle: `Sekai Flick Note Middle ${color}`,
            right: `Sekai Flick Note Right ${color}`
          };
        }
        return {
          left: `Sekai ${critical} Note Left ${color}`,
          middle: `Sekai ${critical} Note Middle ${color}`,
          right: `Sekai ${critical} Note Right ${color}`
        };
      }
      drawNotes(chart2, time, w, h, options) {
        const ctx = this.ctx;
        const skin2 = options.useSkin ? this.skin : null;
        for (const note of chart2.notes) {
          if (note.kind === "holdTick" || note.kind === "holdTail" || note.kind === "guide") continue;
          if (note.kind === "anchor" && !options.showAnchors) continue;
          if (isNoteHidden(chart2, note)) continue;
          const { progress, y } = this.geometry(chart2, note, time);
          if (progress < -0.1 || progress > 1.12) continue;
          const yPx = y * h;
          const center = laneToX(note.lane + note.size / 2, progress, options.mirror) * w;
          const width = widthToScreen(note.size, progress) * w;
          const family = this.spriteFamily(note);
          const aspect = skin2?.aspect(family.middle) ?? 354 / 186;
          const height = width / aspect;
          ctx.save();
          let drawn = false;
          if (skin2 && note.kind !== "anchor") {
            drawn = skin2.drawSlice(ctx, family.left, family.middle, family.right, center - width / 2, yPx - height / 2, width, height);
          }
          if (!drawn) {
            ctx.fillStyle = note.critical ? FALLBACK.critical : note.kind === "trace" ? FALLBACK.trace : FALLBACK.note;
            if (note.kind === "anchor") {
              ctx.globalAlpha = 0.45;
              ctx.beginPath();
              ctx.arc(center, yPx, 3, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.beginPath();
              ctx.ellipse(center, yPx, width / 2, height / 2, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          if (note.kind === "flick") this.drawFlickArrow(ctx, note, center, yPx, width, height, time, skin2);
          ctx.restore();
        }
      }
      drawFlickArrow(ctx, note, center, y, width, height, time, skin2) {
        if (!skin2) return;
        const direction = note.direction === 2 ? "Down" : "Up";
        const color = note.critical ? "Yellow" : "Red";
        const frame = Math.floor(time * 30) % 6 + 1;
        const name = `Sekai Flick Arrow ${color} ${direction} ${frame}`;
        if (!skin2.has(name)) return;
        const arrowWidth = width * 0.7;
        const arrowHeight = arrowWidth * 0.85;
        const offset = height * 0.62;
        ctx.save();
        ctx.globalAlpha = 0.95;
        skin2.draw(ctx, name, center - arrowWidth / 2, y + (direction === "Down" ? offset : -offset) - arrowHeight / 2, arrowWidth, arrowHeight);
        ctx.restore();
      }
      /* ── 长条 ───────────────────────────────────────────── */
      drawHolds(chart2, time, w, h, options) {
        const ctx = this.ctx;
        for (const hold of chart2.holds) {
          const head = chart2.notes[hold.headId];
          const tail = chart2.notes[hold.tailId];
          if (isNoteHidden(chart2, head)) continue;
          const headGeom = this.geometry(chart2, head, time);
          const tailGeom = this.geometry(chart2, tail, time);
          if (headGeom.progress > 1.15 || tailGeom.progress < -0.1) continue;
          const topIsHead = headGeom.progress >= tailGeom.progress;
          const top = topIsHead ? head : tail;
          const bottom = topIsHead ? tail : head;
          const topProgress = topIsHead ? headGeom.progress : tailGeom.progress;
          const bottomProgress = topIsHead ? tailGeom.progress : headGeom.progress;
          const topY = progressToY(topProgress) * h;
          const bottomY = progressToY(bottomProgress) * h;
          const quad = [
            [laneToX(top.lane, topProgress, options.mirror) * w, topY],
            [laneToX(top.lane + top.size, topProgress, options.mirror) * w, topY],
            [laneToX(bottom.lane + bottom.size, bottomProgress, options.mirror) * w, bottomY],
            [laneToX(bottom.lane, bottomProgress, options.mirror) * w, bottomY]
          ];
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(quad[0][0], quad[0][1]);
          for (let i = 1; i < quad.length; i += 1) ctx.lineTo(quad[i][0], quad[i][1]);
          ctx.closePath();
          ctx.fillStyle = head.critical ? "rgba(255,210,94,0.26)" : FALLBACK.hold;
          ctx.fill();
          ctx.strokeStyle = head.critical ? "rgba(255,210,94,0.85)" : FALLBACK.holdEdge;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          for (const tickId of hold.tickIds) {
            const tick = chart2.notes[tickId];
            if (isNoteHidden(chart2, tick)) continue;
            const g = this.geometry(chart2, tick, time);
            if (g.progress < -0.1 || g.progress > 1.12) continue;
            const cx = laneToX(tick.lane, g.progress, options.mirror) * w;
            const size = widthToScreen(tick.size, g.progress) * w * 0.42;
            ctx.save();
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = head.critical ? FALLBACK.critical : FALLBACK.note;
            ctx.beginPath();
            ctx.ellipse(cx, progressToY(g.progress) * h, size / 2, size / 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();
        }
      }
      /* ── 连线 ───────────────────────────────────────────── */
      drawSimLines(chart2, time, w, h, options) {
        if (!options.showSimLines) return;
        const ctx = this.ctx;
        const skin2 = options.useSkin ? this.skin : null;
        for (const line of chart2.simLines) {
          const left = chart2.notes[line.left];
          const right = chart2.notes[line.right];
          if (isNoteHidden(chart2, left)) continue;
          const a = this.geometry(chart2, left, time);
          const b = this.geometry(chart2, right, time);
          const progress = Math.min(a.progress, b.progress);
          if (progress < -0.1 || progress > 1.12) continue;
          const y = progressToY(progress) * h;
          const x1 = laneToX(Math.min(left.lane - left.size / 2, right.lane - right.size / 2), progress, options.mirror) * w;
          const x2 = laneToX(Math.max(left.lane + left.size / 2, right.lane + right.size / 2), progress, options.mirror) * w;
          const thickness = Math.max(2, h * 4e-3 * (0.3 + progress));
          ctx.save();
          const drawn = skin2?.draw(ctx, "#SIMULTANEOUS_CONNECTION_NEUTRAL", x1, y - thickness / 2, x2 - x1, thickness) ?? false;
          if (!drawn) {
            ctx.strokeStyle = FALLBACK.sim;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    };
  }
});

// src/view/playfield.ts
var Playfield;
var init_playfield = __esm({
  "src/view/playfield.ts"() {
    "use strict";
    init_renderer();
    Playfield = class {
      constructor(canvas2, chart2, skin2) {
        __publicField(this, "chart");
        __publicField(this, "renderer");
        __publicField(this, "time", 0);
        __publicField(this, "playing", false);
        __publicField(this, "rate", 1);
        __publicField(this, "lastStamp", 0);
        __publicField(this, "frame", 0);
        __publicField(this, "options", { mirror: false, showSimLines: true, showAnchors: false, useSkin: true });
        __publicField(this, "onTick");
        __publicField(this, "loop", () => {
          if (!this.playing) return;
          const now = performance.now();
          const delta = (now - this.lastStamp) / 1e3;
          this.lastStamp = now;
          this.time += delta * this.rate;
          if (this.time >= this.chart.duration) {
            this.time = this.chart.duration;
            this.playing = false;
          }
          this.render();
          this.onTick?.(this.time);
          if (this.playing) this.frame = requestAnimationFrame(this.loop);
        });
        this.renderer = new Renderer(canvas2, skin2);
        this.chart = chart2;
      }
      setPulse(value) {
        this.renderer.setPulse(value);
      }
      setSkin(skin2) {
        this.renderer.setSkin(skin2);
        this.render();
      }
      setChart(chart2) {
        this.chart = chart2;
        this.time = 0;
        this.render();
      }
      setOptions(options) {
        this.options = { ...this.options, ...options };
        this.render();
      }
      get duration() {
        return this.chart.duration;
      }
      get currentTime() {
        return this.time;
      }
      seek(time) {
        this.time = Math.max(0, Math.min(this.chart.duration, time));
        this.render();
      }
      play() {
        if (this.playing) return;
        this.playing = true;
        this.lastStamp = performance.now();
        this.loop();
      }
      pause() {
        this.playing = false;
        cancelAnimationFrame(this.frame);
      }
      get isPlaying() {
        return this.playing;
      }
      setRate(rate) {
        this.rate = rate;
      }
      resize(width, height, dpr2) {
        this.renderer.resize(width, height, dpr2);
        this.render();
      }
      render() {
        this.renderer.draw(this.chart, this.time, this.options);
      }
    };
  }
});

// vendor/wasm/mmw-preview.js
async function Module(moduleArg = {}) {
  var Module2 = moduleArg;
  (function() {
    function humanReadableVersionToPacked(str) {
      str = str.split("-")[0];
      var vers = str.split(".").slice(0, 3);
      while (vers.length < 3) vers.push("00");
      vers = vers.map((n, i, arr) => n.padStart(2, "0"));
      return vers.join("");
    }
    var packedVersionToHumanReadable = (n) => [n / 1e4 | 0, (n / 100 | 0) % 100, n % 100].join(".");
    var TARGET_NOT_SUPPORTED = 2147483647;
    if (typeof process !== "undefined" && !process.versions?.bun && typeof Deno == "undefined") {
      var currentNodeVersion = process.versions?.node ? humanReadableVersionToPacked(process.versions.node) : TARGET_NOT_SUPPORTED;
      if (currentNodeVersion < TARGET_NOT_SUPPORTED) {
        throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
      }
      if (currentNodeVersion < 2147483647) {
        throw new Error(`This emscripten-generated code requires node v${packedVersionToHumanReadable(2147483647)} (detected v${packedVersionToHumanReadable(currentNodeVersion)})`);
      }
    }
    var userAgent = typeof navigator !== "undefined" && navigator.userAgent;
    if (!userAgent) {
      return;
    }
    var currentSafariVersion = userAgent.includes("Safari/") && !userAgent.includes("Chrome/") && userAgent.match(/Version\/(\d+\.?\d*\.?\d*)/) ? humanReadableVersionToPacked(userAgent.match(/Version\/(\d+\.?\d*\.?\d*)/)[1]) : TARGET_NOT_SUPPORTED;
    if (currentSafariVersion < 15e4) {
      throw new Error(`This emscripten-generated code requires Safari v${packedVersionToHumanReadable(15e4)} (detected v${currentSafariVersion})`);
    }
    var currentFirefoxVersion = userAgent.match(/Firefox\/(\d+(?:\.\d+)?)/) ? parseFloat(userAgent.match(/Firefox\/(\d+(?:\.\d+)?)/)[1]) : TARGET_NOT_SUPPORTED;
    if (currentFirefoxVersion < 79) {
      throw new Error(`This emscripten-generated code requires Firefox v79 (detected v${currentFirefoxVersion})`);
    }
    var currentChromeVersion = userAgent.match(/Chrome\/(\d+(?:\.\d+)?)/) ? parseFloat(userAgent.match(/Chrome\/(\d+(?:\.\d+)?)/)[1]) : TARGET_NOT_SUPPORTED;
    if (currentChromeVersion < 85) {
      throw new Error(`This emscripten-generated code requires Chrome v85 (detected v${currentChromeVersion})`);
    }
  })();
  var ENVIRONMENT_IS_WEB = !!globalThis.window;
  var ENVIRONMENT_IS_WORKER = !!globalThis.WorkerGlobalScope;
  var ENVIRONMENT_IS_NODE = globalThis.process?.versions?.node && globalThis.process?.type != "renderer";
  var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
  var programArgs = [];
  var thisProgram = "./this.program";
  var quit_ = (status, toThrow) => {
    throw toThrow;
  };
  var _scriptName = import.meta.url;
  var scriptDirectory = "";
  function locateFile(path) {
    if (Module2["locateFile"]) {
      return Module2["locateFile"](path, scriptDirectory);
    }
    return scriptDirectory + path;
  }
  var readAsync, readBinary;
  if (ENVIRONMENT_IS_SHELL) {
  } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    try {
      scriptDirectory = new URL(".", _scriptName).href;
    } catch {
    }
    if (!(globalThis.window || globalThis.WorkerGlobalScope)) throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
    {
      readAsync = async (url2) => {
        assert(!isFileURI(url2), "readAsync does not work with file:// URLs");
        var response = await fetch(url2, { credentials: "same-origin" });
        if (response.ok) {
          return response.arrayBuffer();
        }
        throw new Error(response.status + " : " + response.url);
      };
    }
  } else {
    throw new Error("environment detection error");
  }
  var out = console.log.bind(console);
  var err = console.error.bind(console);
  assert(!ENVIRONMENT_IS_WORKER, "worker environment detected but not enabled at build time (add `worker` to `-sENVIRONMENT` to enable)");
  assert(!ENVIRONMENT_IS_NODE, "node environment detected but not enabled at build time (add `node` to `-sENVIRONMENT` to enable)");
  assert(!ENVIRONMENT_IS_SHELL, "shell environment detected but not enabled at build time (add `shell` to `-sENVIRONMENT` to enable)");
  var wasmBinary;
  if (!globalThis.WebAssembly) {
    err("no native wasm support detected");
  }
  var ABORT = false;
  var EXITSTATUS;
  function assert(condition, text) {
    if (!condition) {
      abort("Assertion failed" + (text ? ": " + text : ""));
    }
  }
  var isFileURI = (filename) => filename.startsWith("file://");
  class EmscriptenEH extends Error {
  }
  class EmscriptenSjLj extends EmscriptenEH {
  }
  class CppException extends EmscriptenEH {
    constructor(excPtr) {
      super(excPtr);
      this.excPtr = excPtr;
      const excInfo = getExceptionMessage(this);
      this.name = excInfo[0];
      this.message = excInfo[1];
    }
  }
  var runtimeDebug = true;
  function dbg(...args) {
    if (!runtimeDebug && typeof runtimeDebug != "undefined") return;
    console.warn(...args);
  }
  (() => {
    var h16 = new Int16Array(1);
    var h8 = new Int8Array(h16.buffer);
    h16[0] = 25459;
    if (h8[0] !== 115 || h8[1] !== 99) abort("Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)");
  })();
  function consumedModuleProp(prop) {
    var value = Module2[prop];
    var msg = `Attempt to modify \`Module.${prop}\` after it has already been processed.  This can happen, for example, when code is injected via '--post-js' rather than '--pre-js'`;
    if (Array.isArray(value)) {
      value = new Proxy(value, { set(target, key, val) {
        abort(msg);
        return false;
      }, defineProperty(target, key, descriptor) {
        abort(msg);
        return false;
      }, deleteProperty(target, key) {
        abort(msg);
        return false;
      } });
    }
    Object.defineProperty(Module2, prop, { configurable: true, get() {
      return value;
    }, set() {
      abort(msg);
    } });
  }
  function makeInvalidEarlyAccess(name) {
    return () => assert(false, `call to '${name}' via reference taken before Wasm module initialization`);
  }
  function ignoredModuleProp(prop) {
    if (Object.getOwnPropertyDescriptor(Module2, prop)) {
      abort(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
    }
  }
  function isExportedByForceFilesystem(name) {
    return name === "FS_createPath" || name === "FS_createDataFile" || name === "FS_createPreloadedFile" || name === "FS_preloadFile" || name === "FS_unlink" || name === "addRunDependency" || name === "FS_createLazyFile" || name === "FS_createDevice" || name === "removeRunDependency";
  }
  function missingLibrarySymbol(sym) {
    unexportedRuntimeSymbol(sym);
  }
  function unexportedRuntimeSymbol(sym) {
    if (!Object.getOwnPropertyDescriptor(Module2, sym)) {
      Object.defineProperty(Module2, sym, { configurable: true, get() {
        var msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
        if (isExportedByForceFilesystem(sym)) {
          msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
        }
        abort(msg);
      } });
    }
  }
  var MAX_UINT8 = 2 ** 8 - 1;
  var MAX_UINT16 = 2 ** 16 - 1;
  var MAX_UINT32 = 2 ** 32 - 1;
  var MAX_UINT53 = 2 ** 53 - 1;
  var MAX_UINT64 = 2 ** 64 - 1;
  var MIN_INT8 = -(2 ** (8 - 1));
  var MIN_INT16 = -(2 ** (16 - 1));
  var MIN_INT32 = -(2 ** (32 - 1));
  var MIN_INT53 = -(2 ** (53 - 1));
  var MIN_INT64 = -(2 ** (64 - 1));
  function checkInt(value, bits, min, max) {
    assert(Number.isInteger(Number(value)), `attempt to write non-integer (${value}) into integer heap`);
    assert(value <= max, `value (${value}) too large to write as ${bits}-bit value`);
    assert(value >= min, `value (${value}) too small to write as ${bits}-bit value`);
  }
  var checkInt8 = (value) => checkInt(value, 8, MIN_INT8, MAX_UINT8);
  var checkInt16 = (value) => checkInt(value, 16, MIN_INT16, MAX_UINT16);
  var checkInt32 = (value) => checkInt(value, 32, MIN_INT32, MAX_UINT32);
  var checkInt64 = (value) => checkInt(value, 64, MIN_INT64, MAX_UINT64);
  const stackCookie1 = 34821223;
  const stackCookie2 = 2310721022;
  function writeStackCookie() {
    var max = _emscripten_stack_get_end();
    assert((max & 3) == 0);
    if (max == 0) {
      max += 4;
    }
    HEAPU32[max >> 2] = stackCookie1;
    checkInt32(stackCookie1);
    HEAPU32[max + 4 >> 2] = stackCookie2;
    checkInt32(stackCookie2);
    HEAPU32[0 >> 2] = 1668509029;
    checkInt32(1668509029);
  }
  function u32ToHexString(num) {
    return "0x" + (num >>> 0).toString(16).padStart(8, "0");
  }
  function checkStackCookie() {
    if (ABORT) return;
    var max = _emscripten_stack_get_end();
    if (max == 0) {
      max += 4;
    }
    var val1 = HEAPU32[max >> 2];
    var val2 = HEAPU32[max + 4 >> 2];
    if (val1 != stackCookie1 || val2 != stackCookie2) {
      abort(`Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords ${u32ToHexString(stackCookie2)} and ${u32ToHexString(stackCookie1)}, but received ${u32ToHexString(val2)} ${u32ToHexString(val1)}`);
    }
    if (HEAPU32[0 >> 2] != 1668509029) {
      abort("Runtime error: The application has corrupted its heap memory area (address zero)!");
    }
  }
  var runtimeInitialized = false;
  function getMemoryBuffer() {
    return wasmMemory.buffer;
  }
  function updateMemoryViews() {
    if (HEAP8?.buffer?.resizable) return;
    var b = getMemoryBuffer();
    HEAP8 = new Int8Array(b);
    HEAP16 = new Int16Array(b);
    Module2["HEAPU8"] = HEAPU8 = new Uint8Array(b);
    HEAPU16 = new Uint16Array(b);
    Module2["HEAP32"] = HEAP32 = new Int32Array(b);
    HEAPU32 = new Uint32Array(b);
    Module2["HEAPF32"] = HEAPF32 = new Float32Array(b);
    HEAP64 = new BigInt64Array(b);
  }
  assert(globalThis.Int32Array && globalThis.Float64Array && Int32Array.prototype.subarray && Int32Array.prototype.set, "JS engine does not provide full typed array support");
  function preRun() {
    var preRun2 = Module2["preRun"];
    if (preRun2) {
      if (typeof preRun2 == "function") preRun2 = [preRun2];
      onPreRuns.push(...preRun2);
    }
    consumedModuleProp("preRun");
    callRuntimeCallbacks(onPreRuns);
  }
  function initRuntime() {
    assert(!runtimeInitialized);
    runtimeInitialized = true;
    setStackLimits();
    checkStackCookie();
    if (!Module2["noFSInit"] && !FS.initialized) FS.init();
    TTY.init();
    wasmExports["__wasm_call_ctors"]();
    FS.ignorePermissions = false;
    checkStackCookie();
  }
  function postRun() {
    checkStackCookie();
    var postRun2 = Module2["postRun"];
    if (postRun2) {
      if (typeof postRun2 == "function") postRun2 = [postRun2];
      onPostRuns.push(...postRun2);
    }
    consumedModuleProp("postRun");
    callRuntimeCallbacks(onPostRuns);
  }
  function abort(what) {
    Module2["onAbort"]?.(what);
    what = `Aborted(${what})`;
    err(what);
    ABORT = true;
    if (what.search(/RuntimeError: [Uu]nreachable/) >= 0) {
      what += '. "unreachable" may be due to ASYNCIFY_STACK_SIZE not being large enough (try increasing it)';
    }
    var e = new WebAssembly.RuntimeError(what);
    throw e;
  }
  function createExportWrapper(name, func, nargs) {
    assert(func);
    return (...args) => {
      assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
      assert(args.length <= nargs, `native function \`${name}\` called with ${args.length} args but expects ${nargs}`);
      return func(...args);
    };
  }
  var wasmBinaryFile;
  function findWasmBinary() {
    if (Module2["locateFile"]) {
      return locateFile("mmw-preview.wasm");
    }
    return new URL("mmw-preview.wasm", import.meta.url).href;
  }
  function getBinarySync(file) {
    if (readBinary) {
      return readBinary(file);
    }
    throw "both async and sync fetching of the wasm failed";
  }
  async function getWasmBinary(binaryFile) {
    if (!wasmBinary) {
      try {
        var response = await readAsync(binaryFile);
        return new Uint8Array(response);
      } catch {
      }
    }
    return getBinarySync(binaryFile);
  }
  async function instantiateArrayBuffer(binaryFile, imports) {
    try {
      var binary = await getWasmBinary(binaryFile);
      var instance = await WebAssembly.instantiate(binary, imports);
      return instance;
    } catch (reason) {
      err(`failed to asynchronously prepare wasm: ${reason}`);
      if (isFileURI(binaryFile)) {
        err(`warning: Loading from a file URI (${binaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`);
      }
      abort(reason);
    }
  }
  async function instantiateAsync(binary, binaryFile, imports) {
    if (!binary) {
      try {
        var response = fetch(binaryFile, { credentials: "same-origin" });
        var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
        return instantiationResult;
      } catch (reason) {
        err(`wasm streaming compile failed: ${reason}`);
        err("falling back to ArrayBuffer instantiation");
      }
    }
    return instantiateArrayBuffer(binaryFile, imports);
  }
  function getWasmImports() {
    Asyncify.instrumentWasmImports(wasmImports);
    var imports = { env: wasmImports, wasi_snapshot_preview1: wasmImports };
    return imports;
  }
  async function createWasm() {
    function receiveInstance(instance) {
      wasmExports = instance.exports;
      wasmExports = Asyncify.instrumentWasmExports(wasmExports);
      assignWasmExports(wasmExports);
      updateMemoryViews();
      return wasmExports;
    }
    var trueModule = Module2;
    function receiveInstantiationResult(result2) {
      assert(Module2 === trueModule, "the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?");
      trueModule = null;
      return receiveInstance(result2["instance"]);
    }
    var info = getWasmImports();
    var instantiateWasm = Module2["instantiateWasm"];
    if (instantiateWasm) {
      return new Promise((resolve) => {
        try {
          instantiateWasm(info, (inst) => resolve(receiveInstance(inst)));
        } catch (e) {
          err(`Module.instantiateWasm callback failed with error: ${e}`);
          throw e;
        }
      });
    }
    wasmBinaryFile ?? (wasmBinaryFile = findWasmBinary());
    var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
    var exports = receiveInstantiationResult(result);
    return exports;
  }
  class ExitStatus {
    constructor(status) {
      __publicField(this, "name", "ExitStatus");
      this.message = `Program terminated with exit(${status})`;
      this.status = status;
    }
  }
  var HEAP32;
  var HEAP8;
  var HEAPU32;
  var callRuntimeCallbacks = (callbacks) => {
    while (callbacks.length > 0) {
      callbacks.shift()(Module2);
    }
  };
  var onPostRuns = [];
  var onPreRuns = [];
  var dynCalls = {};
  var dynCallLegacy = (sig, ptr, args) => {
    sig = sig.replace(/p/g, "i");
    assert(sig in dynCalls, `bad function pointer type - sig is not in dynCalls: '${sig}'`);
    if (args?.length) {
      assert(args.length === sig.length - 1);
    } else {
      assert(sig.length == 1);
    }
    var f = dynCalls[sig];
    return f(ptr, ...args);
  };
  var noExitRuntime = true;
  function ptrToString(ptr) {
    assert(typeof ptr === "number", `ptrToString expects a number, got ${typeof ptr}`);
    ptr >>>= 0;
    return "0x" + ptr.toString(16).padStart(8, "0");
  }
  var setStackLimits = () => {
    var stackLow = _emscripten_stack_get_base();
    var stackHigh = _emscripten_stack_get_end();
    ___set_stack_limits(stackLow, stackHigh);
  };
  var stackRestore = (val) => __emscripten_stack_restore(val);
  var stackSave = () => _emscripten_stack_get_current();
  var warnOnce = (text) => {
    warnOnce.shown || (warnOnce.shown = {});
    if (!warnOnce.shown[text]) {
      warnOnce.shown[text] = 1;
      err(text);
    }
  };
  var UTF8Decoder = globalThis.TextDecoder && new TextDecoder();
  var findStringEnd = (heapOrArray, idx, maxBytesToRead, ignoreNul) => {
    var maxIdx = idx + maxBytesToRead;
    if (ignoreNul) return maxIdx;
    while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
    return idx;
  };
  var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
    var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
    if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
      return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
    }
    var str = "";
    while (idx < endPtr) {
      var u0 = heapOrArray[idx++];
      if (!(u0 & 128)) {
        str += String.fromCharCode(u0);
        continue;
      }
      var u1 = heapOrArray[idx++] & 63;
      if ((u0 & 224) == 192) {
        str += String.fromCharCode((u0 & 31) << 6 | u1);
        continue;
      }
      var u2 = heapOrArray[idx++] & 63;
      if ((u0 & 240) == 224) {
        u0 = (u0 & 15) << 12 | u1 << 6 | u2;
      } else {
        if ((u0 & 248) != 240) warnOnce(`Invalid UTF-8 leading byte ${ptrToString(u0)} encountered when deserializing a UTF-8 string in wasm memory to a JS string!`);
        u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
      }
      if (u0 < 65536) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 65536;
        str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
      }
    }
    return str;
  };
  var HEAPU8;
  var UTF8ToString = (ptr, maxBytesToRead, ignoreNul) => {
    assert(typeof ptr == "number", `UTF8ToString expects a number (got ${typeof ptr})`);
    return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead, ignoreNul) : "";
  };
  var ___assert_fail = (condition, filename, line, func) => abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function"]);
  var exceptionCaught = [];
  var uncaughtExceptionCount = 0;
  class ExceptionInfo {
    constructor(excPtr) {
      this.excPtr = excPtr;
      this.ptr = excPtr - 24;
    }
    set_type(type) {
      HEAPU32[this.ptr + 4 >> 2] = type;
    }
    get_type() {
      return HEAPU32[this.ptr + 4 >> 2];
    }
    set_destructor(destructor) {
      HEAPU32[this.ptr + 8 >> 2] = destructor;
    }
    get_destructor() {
      return HEAPU32[this.ptr + 8 >> 2];
    }
    set_caught(caught) {
      caught = caught ? 1 : 0;
      HEAP8[this.ptr + 12] = caught;
      checkInt8(caught);
    }
    get_caught() {
      return HEAP8[this.ptr + 12] != 0;
    }
    set_rethrown(rethrown) {
      rethrown = rethrown ? 1 : 0;
      HEAP8[this.ptr + 13] = rethrown;
      checkInt8(rethrown);
    }
    get_rethrown() {
      return HEAP8[this.ptr + 13] != 0;
    }
    init(type, destructor) {
      this.set_adjusted_ptr(0);
      this.set_type(type);
      this.set_destructor(destructor);
    }
    set_adjusted_ptr(adjustedPtr) {
      HEAPU32[this.ptr + 16 >> 2] = adjustedPtr;
    }
    get_adjusted_ptr() {
      return HEAPU32[this.ptr + 16 >> 2];
    }
  }
  var ___cxa_begin_catch = (ptr) => {
    var info = new ExceptionInfo(ptr);
    if (!info.get_caught()) {
      info.set_caught(true);
      uncaughtExceptionCount--;
    }
    info.set_rethrown(false);
    exceptionCaught.push(info);
    return ___cxa_get_exception_ptr(ptr);
  };
  var exceptionLast = null;
  var ___cxa_end_catch = () => {
    _setThrew(0, 0);
    assert(exceptionCaught.length > 0);
    var info = exceptionCaught.pop();
    ___cxa_decrement_exception_refcount(info.excPtr);
    exceptionLast = null;
  };
  var setTempRet0 = (val) => __emscripten_tempret_set(val);
  var findMatchingCatch = (args) => {
    var thrown = exceptionLast?.excPtr;
    if (!thrown) {
      setTempRet0(0);
      return 0;
    }
    var info = new ExceptionInfo(thrown);
    info.set_adjusted_ptr(thrown);
    var thrownType = info.get_type();
    if (!thrownType) {
      setTempRet0(0);
      return thrown;
    }
    for (var caughtType of args) {
      if (!caughtType || caughtType === thrownType) {
        break;
      }
      var adjusted_ptr_addr = info.ptr + 16;
      if (___cxa_can_catch(caughtType, thrownType, adjusted_ptr_addr)) {
        setTempRet0(caughtType);
        return thrown;
      }
    }
    setTempRet0(thrownType);
    return thrown;
  };
  var ___cxa_find_matching_catch_2 = () => findMatchingCatch([]);
  var ___cxa_find_matching_catch_3 = (arg0) => findMatchingCatch([arg0]);
  var __Unwind_RaiseException = (ex) => {
    throw ex;
  };
  var ___cxa_rethrow = () => {
    if (!exceptionCaught.length) {
      abort("no exception to throw");
    }
    var info = exceptionCaught.at(-1);
    var ptr = info.excPtr;
    info.set_rethrown(true);
    info.set_caught(false);
    uncaughtExceptionCount++;
    ___cxa_increment_exception_refcount(ptr);
    ptr = exceptionLast = new CppException(ptr);
    __Unwind_RaiseException(ptr);
  };
  var stackAlloc = (sz) => __emscripten_stack_alloc(sz);
  var getExceptionMessageCommon = (ptr) => {
    var sp = stackSave();
    var type_addr_addr = stackAlloc(4);
    var message_addr_addr = stackAlloc(4);
    ___get_exception_message(ptr, type_addr_addr, message_addr_addr);
    var type_addr = HEAPU32[type_addr_addr >> 2];
    var message_addr = HEAPU32[message_addr_addr >> 2];
    var type = UTF8ToString(type_addr);
    _free(type_addr);
    var message;
    if (message_addr) {
      message = UTF8ToString(message_addr);
      _free(message_addr);
    }
    stackRestore(sp);
    return [type, message];
  };
  var getExceptionMessage = (exn) => getExceptionMessageCommon(exn.excPtr);
  var ___cxa_throw = (ptr, type, destructor) => {
    var info = new ExceptionInfo(ptr);
    info.init(type, destructor);
    ___cxa_increment_exception_refcount(ptr);
    ptr = exceptionLast = new CppException(ptr);
    uncaughtExceptionCount++;
    __Unwind_RaiseException(ptr);
  };
  var ___cxa_uncaught_exceptions = () => uncaughtExceptionCount;
  var ___handle_stack_overflow = (requested) => {
    var base = _emscripten_stack_get_base();
    var end = _emscripten_stack_get_end();
    abort(`stack overflow (Attempt to set SP to ${ptrToString(requested)}, with stack limits [${ptrToString(end)} - ${ptrToString(base)}]). If you require more stack space build with -sSTACK_SIZE=<bytes>`);
  };
  var __Unwind_Resume = (ex) => {
    throw ex;
  };
  var ___resumeException = (ptr) => {
    ptr = exceptionLast ?? (exceptionLast = new CppException(ptr));
    __Unwind_Resume(ptr);
  };
  var syscallGetVarargI = () => {
    assert(SYSCALLS.varargs != void 0);
    var ret = HEAP32[+SYSCALLS.varargs >> 2];
    SYSCALLS.varargs += 4;
    return ret;
  };
  var syscallGetVarargP = syscallGetVarargI;
  var PATH = { isAbs: (path) => path.charAt(0) === "/", splitPath: (filename) => {
    var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
    return splitPathRe.exec(filename).slice(1);
  }, normalizeArray: (parts, allowAboveRoot) => {
    var up = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
      var last2 = parts[i];
      if (last2 === ".") {
        parts.splice(i, 1);
      } else if (last2 === "..") {
        parts.splice(i, 1);
        up++;
      } else if (up) {
        parts.splice(i, 1);
        up--;
      }
    }
    if (allowAboveRoot) {
      for (; up; up--) {
        parts.unshift("..");
      }
    }
    return parts;
  }, normalize: (path) => {
    var isAbsolute = PATH.isAbs(path), trailingSlash = path.slice(-1) === "/";
    path = PATH.normalizeArray(path.split("/").filter((p) => !!p), !isAbsolute).join("/");
    if (!path && !isAbsolute) {
      path = ".";
    }
    if (path && trailingSlash) {
      path += "/";
    }
    return (isAbsolute ? "/" : "") + path;
  }, dirname: (path) => {
    var result = PATH.splitPath(path), root = result[0], dir = result[1];
    if (!root && !dir) {
      return ".";
    }
    if (dir) {
      dir = dir.slice(0, -1);
    }
    return root + dir;
  }, basename: (path) => path && path.match(/([^\/]+|\/)\/*$/)[1], join: (...paths) => PATH.normalize(paths.join("/")), join2: (l, r2) => PATH.normalize(l + "/" + r2) };
  var initRandomFill = () => (view2) => (crypto.getRandomValues(view2), 0);
  var randomFill = (view2) => (randomFill = initRandomFill())(view2);
  var PATH_FS = { resolve: (...args) => {
    var resolvedPath = "", resolvedAbsolute = false;
    for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path = i >= 0 ? args[i] : FS.cwd();
      if (typeof path != "string") {
        throw new TypeError("Arguments to path.resolve must be strings");
      } else if (!path) {
        return "";
      }
      resolvedPath = path + "/" + resolvedPath;
      resolvedAbsolute = PATH.isAbs(path);
    }
    resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((p) => !!p), !resolvedAbsolute).join("/");
    return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
  }, relative: (from, to) => {
    from = PATH_FS.resolve(from).slice(1);
    to = PATH_FS.resolve(to).slice(1);
    function trim(arr) {
      var start = 0;
      for (; start < arr.length; start++) {
        if (arr[start] !== "") break;
      }
      var end = arr.length - 1;
      for (; end >= 0; end--) {
        if (arr[end] !== "") break;
      }
      if (start > end) return [];
      return arr.slice(start, end - start + 1);
    }
    var fromParts = trim(from.split("/"));
    var toParts = trim(to.split("/"));
    var length = Math.min(fromParts.length, toParts.length);
    var samePartsLength = length;
    for (var i = 0; i < length; i++) {
      if (fromParts[i] !== toParts[i]) {
        samePartsLength = i;
        break;
      }
    }
    var outputParts = [];
    for (var i = samePartsLength; i < fromParts.length; i++) {
      outputParts.push("..");
    }
    outputParts = outputParts.concat(toParts.slice(samePartsLength));
    return outputParts.join("/");
  } };
  var FS_stdin_getChar_buffer = [];
  var lengthBytesUTF8 = (str) => {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
      var c = str.charCodeAt(i);
      if (c <= 127) {
        len++;
      } else if (c <= 2047) {
        len += 2;
      } else if (c >= 55296 && c <= 57343) {
        len += 4;
        ++i;
      } else {
        len += 3;
      }
    }
    return len;
  };
  var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
    assert(typeof str === "string", `stringToUTF8Array expects a string (got ${typeof str})`);
    if (!(maxBytesToWrite > 0)) return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
      var u = str.codePointAt(i);
      if (u <= 127) {
        if (outIdx >= endIdx) break;
        heap[outIdx++] = u;
      } else if (u <= 2047) {
        if (outIdx + 1 >= endIdx) break;
        heap[outIdx++] = 192 | u >> 6;
        heap[outIdx++] = 128 | u & 63;
      } else if (u <= 65535) {
        if (outIdx + 2 >= endIdx) break;
        heap[outIdx++] = 224 | u >> 12;
        heap[outIdx++] = 128 | u >> 6 & 63;
        heap[outIdx++] = 128 | u & 63;
      } else {
        if (outIdx + 3 >= endIdx) break;
        if (u > 1114111) warnOnce(`Invalid Unicode code point ${ptrToString(u)} encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).`);
        heap[outIdx++] = 240 | u >> 18;
        heap[outIdx++] = 128 | u >> 12 & 63;
        heap[outIdx++] = 128 | u >> 6 & 63;
        heap[outIdx++] = 128 | u & 63;
        i++;
      }
    }
    heap[outIdx] = 0;
    return outIdx - startIdx;
  };
  var intArrayFromString = (stringy, dontAddNull, length) => {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array;
  };
  var FS_stdin_getChar = () => {
    if (!FS_stdin_getChar_buffer.length) {
      var result = null;
      if (globalThis.window?.prompt) {
        result = window.prompt("Input: ");
        if (result !== null) {
          result += "\n";
        }
      } else {
      }
      if (!result) {
        return null;
      }
      FS_stdin_getChar_buffer = intArrayFromString(result, true);
    }
    return FS_stdin_getChar_buffer.shift();
  };
  var TTY = { ttys: [], init() {
  }, shutdown() {
  }, register(dev, ops) {
    TTY.ttys[dev] = { input: [], output: [], ops };
    FS.registerDevice(dev, TTY.stream_ops);
  }, stream_ops: { open(stream) {
    var tty = TTY.ttys[stream.node.rdev];
    if (!tty) {
      throw new FS.ErrnoError(43);
    }
    stream.tty = tty;
    stream.seekable = false;
  }, close(stream) {
    stream.tty.ops.fsync(stream.tty);
  }, fsync(stream) {
    stream.tty.ops.fsync(stream.tty);
  }, read(stream, buffer, offset, length, pos) {
    if (!stream.tty || !stream.tty.ops.get_char) {
      throw new FS.ErrnoError(60);
    }
    var bytesRead = 0;
    for (var i = 0; i < length; i++) {
      var result;
      try {
        result = stream.tty.ops.get_char(stream.tty);
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
      if (result === void 0 && !bytesRead) {
        throw new FS.ErrnoError(6);
      }
      if (result === null || result === void 0) break;
      bytesRead++;
      buffer[offset + i] = result;
      if (result === 10) break;
    }
    if (bytesRead) {
      stream.node.atime = Date.now();
    }
    return bytesRead;
  }, write(stream, buffer, offset, length, pos) {
    if (!stream.tty || !stream.tty.ops.put_char) {
      throw new FS.ErrnoError(60);
    }
    try {
      for (var i = 0; i < length; i++) {
        stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
      }
    } catch (e) {
      throw new FS.ErrnoError(29);
    }
    if (length) {
      stream.node.mtime = stream.node.ctime = Date.now();
    }
    return i;
  } }, default_tty_ops: { get_char(tty) {
    return FS_stdin_getChar();
  }, put_char(tty, val) {
    if (val === null || val === 10) {
      out(UTF8ArrayToString(tty.output));
      tty.output = [];
    } else {
      if (val != 0) tty.output.push(val);
    }
  }, fsync(tty) {
    if (tty.output?.length > 0) {
      out(UTF8ArrayToString(tty.output));
      tty.output = [];
    }
  }, ioctl_tcgets(tty) {
    return { c_iflag: 25856, c_oflag: 5, c_cflag: 191, c_lflag: 35387, c_cc: [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
  }, ioctl_tcsets(tty, optional_actions, data) {
    return 0;
  }, ioctl_tiocgwinsz(tty) {
    return [24, 80];
  } }, default_tty1_ops: { put_char(tty, val) {
    if (val === null || val === 10) {
      err(UTF8ArrayToString(tty.output));
      tty.output = [];
    } else {
      if (val != 0) tty.output.push(val);
    }
  }, fsync(tty) {
    if (tty.output?.length > 0) {
      err(UTF8ArrayToString(tty.output));
      tty.output = [];
    }
  } } };
  var mmapAlloc = (size) => {
    abort("internal error: mmapAlloc called but `emscripten_builtin_memalign` native symbol not exported");
  };
  var MEMFS = { ops_table: null, mount(mount) {
    return MEMFS.createNode(null, "/", 16895, 0);
  }, createNode(parent, name, mode2, dev) {
    if (FS.isBlkdev(mode2) || FS.isFIFO(mode2)) {
      throw new FS.ErrnoError(63);
    }
    MEMFS.ops_table || (MEMFS.ops_table = { dir: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr, lookup: MEMFS.node_ops.lookup, mknod: MEMFS.node_ops.mknod, rename: MEMFS.node_ops.rename, unlink: MEMFS.node_ops.unlink, rmdir: MEMFS.node_ops.rmdir, readdir: MEMFS.node_ops.readdir, symlink: MEMFS.node_ops.symlink }, stream: { llseek: MEMFS.stream_ops.llseek } }, file: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr }, stream: { llseek: MEMFS.stream_ops.llseek, read: MEMFS.stream_ops.read, write: MEMFS.stream_ops.write, mmap: MEMFS.stream_ops.mmap, msync: MEMFS.stream_ops.msync } }, link: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr, readlink: MEMFS.node_ops.readlink }, stream: {} }, chrdev: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr }, stream: FS.chrdev_stream_ops } });
    var node = FS.createNode(parent, name, mode2, dev);
    if (FS.isDir(node.mode)) {
      node.node_ops = MEMFS.ops_table.dir.node;
      node.stream_ops = MEMFS.ops_table.dir.stream;
      node.contents = {};
    } else if (FS.isFile(node.mode)) {
      node.node_ops = MEMFS.ops_table.file.node;
      node.stream_ops = MEMFS.ops_table.file.stream;
      node.usedBytes = 0;
      node.contents = MEMFS.emptyFileContents ?? (MEMFS.emptyFileContents = new Uint8Array(0));
    } else if (FS.isLink(node.mode)) {
      node.node_ops = MEMFS.ops_table.link.node;
      node.stream_ops = MEMFS.ops_table.link.stream;
    } else if (FS.isChrdev(node.mode)) {
      node.node_ops = MEMFS.ops_table.chrdev.node;
      node.stream_ops = MEMFS.ops_table.chrdev.stream;
    }
    node.atime = node.mtime = node.ctime = Date.now();
    if (parent) {
      parent.contents[name] = node;
      parent.atime = parent.mtime = parent.ctime = node.atime;
    }
    return node;
  }, getFileDataAsTypedArray(node) {
    assert(FS.isFile(node.mode), "getFileDataAsTypedArray called on non-file");
    return node.contents.subarray(0, node.usedBytes);
  }, expandFileStorage(node, newCapacity) {
    var prevCapacity = node.contents.length;
    if (prevCapacity >= newCapacity) return;
    var CAPACITY_DOUBLING_MAX = 1024 * 1024;
    newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
    if (prevCapacity) newCapacity = Math.max(newCapacity, 256);
    var oldContents = MEMFS.getFileDataAsTypedArray(node);
    node.contents = new Uint8Array(newCapacity);
    node.contents.set(oldContents);
  }, resizeFileStorage(node, newSize) {
    if (node.usedBytes == newSize) return;
    var oldContents = node.contents;
    node.contents = new Uint8Array(newSize);
    node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
    node.usedBytes = newSize;
  }, node_ops: { getattr(node) {
    var attr = {};
    attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
    attr.ino = node.id;
    attr.mode = node.mode;
    attr.nlink = 1;
    attr.uid = 0;
    attr.gid = 0;
    attr.rdev = node.rdev;
    if (FS.isDir(node.mode)) {
      attr.size = 4096;
    } else if (FS.isFile(node.mode)) {
      attr.size = node.usedBytes;
    } else if (FS.isLink(node.mode)) {
      attr.size = node.link.length;
    } else {
      attr.size = 0;
    }
    attr.atime = new Date(node.atime);
    attr.mtime = new Date(node.mtime);
    attr.ctime = new Date(node.ctime);
    attr.atimeMs = node.atime;
    attr.mtimeMs = node.mtime;
    attr.ctimeMs = node.ctime;
    attr.blksize = 4096;
    attr.blocks = Math.ceil(attr.size / attr.blksize);
    return attr;
  }, setattr(node, attr) {
    for (const key of ["mode", "atime", "mtime", "ctime"]) {
      if (attr[key] != null) {
        node[key] = attr[key];
      }
    }
    if (attr.size !== void 0) {
      MEMFS.resizeFileStorage(node, attr.size);
    }
  }, lookup(parent, name) {
    throw new FS.ErrnoError(44);
  }, mknod(parent, name, mode2, dev) {
    return MEMFS.createNode(parent, name, mode2, dev);
  }, rename(old_node, new_dir, new_name) {
    var new_node;
    try {
      new_node = FS.lookupNode(new_dir, new_name);
    } catch (e) {
    }
    if (new_node && FS.isDir(old_node.mode)) {
      for (var i in new_node.contents) {
        throw new FS.ErrnoError(55);
      }
    }
    delete old_node.parent.contents[old_node.name];
    new_dir.contents[new_name] = old_node;
    old_node.name = new_name;
    new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
  }, unlink(parent, name) {
    delete parent.contents[name];
    parent.ctime = parent.mtime = Date.now();
  }, rmdir(parent, name) {
    var node = FS.lookupNode(parent, name);
    for (var i in node.contents) {
      throw new FS.ErrnoError(55);
    }
    delete parent.contents[name];
    parent.ctime = parent.mtime = Date.now();
  }, readdir(node) {
    return [".", "..", ...Object.keys(node.contents)];
  }, symlink(parent, newname, oldpath) {
    var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
    node.link = oldpath;
    return node;
  }, readlink(node) {
    if (!FS.isLink(node.mode)) {
      throw new FS.ErrnoError(28);
    }
    return node.link;
  } }, stream_ops: { read(stream, buffer, offset, length, position) {
    var contents = stream.node.contents;
    if (position >= stream.node.usedBytes) return 0;
    var size = Math.min(stream.node.usedBytes - position, length);
    assert(size >= 0);
    buffer.set(contents.subarray(position, position + size), offset);
    return size;
  }, write(stream, buffer, offset, length, position, canOwn) {
    assert(buffer.subarray, "FS.write expects a TypedArray");
    if (buffer.buffer === HEAP8.buffer) {
      canOwn = false;
    }
    if (!length) return 0;
    var node = stream.node;
    node.mtime = node.ctime = Date.now();
    if (canOwn) {
      assert(!position, "canOwn must imply no weird position inside the file");
      node.contents = buffer.subarray(offset, offset + length);
      node.usedBytes = length;
    } else if (!node.usedBytes && !position) {
      node.contents = buffer.slice(offset, offset + length);
      node.usedBytes = length;
    } else {
      MEMFS.expandFileStorage(node, position + length);
      node.contents.set(buffer.subarray(offset, offset + length), position);
      node.usedBytes = Math.max(node.usedBytes, position + length);
    }
    return length;
  }, llseek(stream, offset, whence) {
    var position = offset;
    if (whence === 1) {
      position += stream.position;
    } else if (whence === 2) {
      if (FS.isFile(stream.node.mode)) {
        position += stream.node.usedBytes;
      }
    }
    if (position < 0) {
      throw new FS.ErrnoError(28);
    }
    return position;
  }, mmap(stream, length, position, prot, flags) {
    if (!FS.isFile(stream.node.mode)) {
      throw new FS.ErrnoError(43);
    }
    var ptr;
    var allocated;
    var contents = stream.node.contents;
    if (!(flags & 2) && contents.buffer === HEAP8.buffer) {
      allocated = false;
      ptr = contents.byteOffset;
    } else {
      allocated = true;
      ptr = mmapAlloc(length);
      if (!ptr) {
        throw new FS.ErrnoError(48);
      }
      if (contents) {
        if (position > 0 || position + length < contents.length) {
          if (contents.subarray) {
            contents = contents.subarray(position, position + length);
          } else {
            contents = Array.prototype.slice.call(contents, position, position + length);
          }
        }
        HEAP8.set(contents, ptr);
      }
    }
    return { ptr, allocated };
  }, msync(stream, buffer, offset, length, mmapFlags) {
    MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
    return 0;
  } } };
  var FS_modeStringToFlags = (str) => {
    if (typeof str != "string") return str;
    var flagModes = { r: 0, "r+": 2, w: 512 | 64 | 1, "w+": 512 | 64 | 2, a: 1024 | 64 | 1, "a+": 1024 | 64 | 2 };
    var flags = flagModes[str];
    if (typeof flags == "undefined") {
      throw new Error(`Unknown file open mode: ${str}`);
    }
    return flags;
  };
  var FS_fileDataToTypedArray = (data) => {
    if (typeof data == "string") {
      data = intArrayFromString(data, true);
    }
    if (!data.subarray) {
      data = new Uint8Array(data);
    }
    return data;
  };
  var FS_getMode = (canRead, canWrite) => {
    var mode2 = 0;
    if (canRead) mode2 |= 292 | 73;
    if (canWrite) mode2 |= 146;
    return mode2;
  };
  var strError = (errno) => UTF8ToString(_strerror(errno));
  var ERRNO_CODES = { EPERM: 63, ENOENT: 44, ESRCH: 71, EINTR: 27, EIO: 29, ENXIO: 60, E2BIG: 1, ENOEXEC: 45, EBADF: 8, ECHILD: 12, EAGAIN: 6, EWOULDBLOCK: 6, ENOMEM: 48, EACCES: 2, EFAULT: 21, ENOTBLK: 105, EBUSY: 10, EEXIST: 20, EXDEV: 75, ENODEV: 43, ENOTDIR: 54, EISDIR: 31, EINVAL: 28, ENFILE: 41, EMFILE: 33, ENOTTY: 59, ETXTBSY: 74, EFBIG: 22, ENOSPC: 51, ESPIPE: 70, EROFS: 69, EMLINK: 34, EPIPE: 64, EDOM: 18, ERANGE: 68, ENOMSG: 49, EIDRM: 24, ECHRNG: 106, EL2NSYNC: 156, EL3HLT: 107, EL3RST: 108, ELNRNG: 109, EUNATCH: 110, ENOCSI: 111, EL2HLT: 112, EDEADLK: 16, ENOLCK: 46, EBADE: 113, EBADR: 114, EXFULL: 115, ENOANO: 104, EBADRQC: 103, EBADSLT: 102, EDEADLOCK: 16, EBFONT: 101, ENOSTR: 100, ENODATA: 116, ETIME: 117, ENOSR: 118, ENONET: 119, ENOPKG: 120, EREMOTE: 121, ENOLINK: 47, EADV: 122, ESRMNT: 123, ECOMM: 124, EPROTO: 65, EMULTIHOP: 36, EDOTDOT: 125, EBADMSG: 9, ENOTUNIQ: 126, EBADFD: 127, EREMCHG: 128, ELIBACC: 129, ELIBBAD: 130, ELIBSCN: 131, ELIBMAX: 132, ELIBEXEC: 133, ENOSYS: 52, ENOTEMPTY: 55, ENAMETOOLONG: 37, ELOOP: 32, EOPNOTSUPP: 138, EPFNOSUPPORT: 139, ECONNRESET: 15, ENOBUFS: 42, EAFNOSUPPORT: 5, EPROTOTYPE: 67, ENOTSOCK: 57, ENOPROTOOPT: 50, ESHUTDOWN: 140, ECONNREFUSED: 14, EADDRINUSE: 3, ECONNABORTED: 13, ENETUNREACH: 40, ENETDOWN: 38, ETIMEDOUT: 73, EHOSTDOWN: 142, EHOSTUNREACH: 23, EINPROGRESS: 26, EALREADY: 7, EDESTADDRREQ: 17, EMSGSIZE: 35, EPROTONOSUPPORT: 66, ESOCKTNOSUPPORT: 137, EADDRNOTAVAIL: 4, ENETRESET: 39, EISCONN: 30, ENOTCONN: 53, ETOOMANYREFS: 141, EUSERS: 136, EDQUOT: 19, ESTALE: 72, ENOTSUP: 138, ENOMEDIUM: 148, EILSEQ: 25, EOVERFLOW: 61, ECANCELED: 11, ENOTRECOVERABLE: 56, EOWNERDEAD: 62, ESTRPIPE: 135 };
  var asyncLoad = async (url2) => {
    var arrayBuffer = await readAsync(url2);
    assert(arrayBuffer, `Loading data file "${url2}" failed (no arrayBuffer).`);
    return new Uint8Array(arrayBuffer);
  };
  var FS_createDataFile = (...args) => FS.createDataFile(...args);
  var getUniqueRunDependency = (id) => {
    var orig = id;
    while (1) {
      if (!runDependencyTracking[id]) return id;
      id = orig + Math.random();
    }
  };
  var dependenciesPromise = null;
  var resolveRunDependencies = async () => dependenciesPromise;
  var runDependencies = 0;
  var dependenciesPromiseResolve = null;
  var runDependencyTracking = {};
  var runDependencyWatcher = null;
  var removeRunDependency = (id) => {
    runDependencies--;
    Module2["monitorRunDependencies"]?.(runDependencies);
    assert(id, "removeRunDependency requires an ID");
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
    if (!runDependencies) {
      if (runDependencyWatcher !== null) {
        clearInterval(runDependencyWatcher);
        runDependencyWatcher = null;
      }
      dependenciesPromiseResolve();
    }
  };
  var addRunDependency = (id) => {
    if (!runDependencies) {
      dependenciesPromise = new Promise((resolve) => dependenciesPromiseResolve = resolve);
    }
    runDependencies++;
    Module2["monitorRunDependencies"]?.(runDependencies);
    assert(id, "addRunDependency requires an ID");
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (!runDependencyWatcher && globalThis.setInterval) {
      runDependencyWatcher = setInterval(() => {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            err("still waiting on run dependencies:");
          }
          err(`dependency: ${dep}`);
        }
        if (shown) {
          err("(end of list)");
        }
      }, 1e4);
    }
  };
  var preloadPlugins = [];
  var FS_handledByPreloadPlugin = async (byteArray, fullname) => {
    if (typeof Browser != "undefined") Browser.init();
    for (var plugin of preloadPlugins) {
      if (plugin["canHandle"](fullname)) {
        assert(plugin["handle"].constructor.name === "AsyncFunction", "Filesystem plugin handlers must be async functions (See #24914)");
        return plugin["handle"](byteArray, fullname);
      }
    }
    return byteArray;
  };
  var FS_preloadFile = async (parent, name, url2, canRead, canWrite, dontCreateFile, canOwn, preFinish) => {
    var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
    var dep = getUniqueRunDependency(`cp ${fullname}`);
    addRunDependency(dep);
    try {
      var byteArray = url2;
      if (typeof url2 == "string") {
        byteArray = await asyncLoad(url2);
      }
      byteArray = await FS_handledByPreloadPlugin(byteArray, fullname);
      preFinish?.();
      if (!dontCreateFile) {
        FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
      }
    } finally {
      removeRunDependency(dep);
    }
  };
  var FS_createPreloadedFile = (parent, name, url2, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
    FS_preloadFile(parent, name, url2, canRead, canWrite, dontCreateFile, canOwn, preFinish).then(onload).catch(onerror);
  };
  var FS = { root: null, mounts: [], devices: {}, streams: [], nextInode: 1, nameTable: [], currentPath: "/", initialized: false, ignorePermissions: true, filesystems: null, syncFSRequests: 0, ErrnoError: class extends Error {
    constructor(errno) {
      super(runtimeInitialized ? strError(errno) : "");
      __publicField(this, "name", "ErrnoError");
      this.errno = errno;
      for (var key in ERRNO_CODES) {
        if (ERRNO_CODES[key] === errno) {
          this.code = key;
          break;
        }
      }
    }
  }, FSStream: class {
    constructor() {
      __publicField(this, "shared", {});
    }
    get object() {
      return this.node;
    }
    set object(val) {
      this.node = val;
    }
    get isRead() {
      return (this.flags & 2097155) !== 1;
    }
    get isWrite() {
      return (this.flags & 2097155) !== 0;
    }
    get isAppend() {
      return this.flags & 1024;
    }
    get flags() {
      return this.shared.flags;
    }
    set flags(val) {
      this.shared.flags = val;
    }
    get position() {
      return this.shared.position;
    }
    set position(val) {
      this.shared.position = val;
    }
  }, FSNode: class {
    constructor(parent, name, mode2, rdev) {
      __publicField(this, "node_ops", {});
      __publicField(this, "stream_ops", {});
      __publicField(this, "readMode", 292 | 73);
      __publicField(this, "writeMode", 146);
      __publicField(this, "mounted", null);
      if (!parent) {
        parent = this;
      }
      this.parent = parent;
      this.mount = parent.mount;
      this.id = FS.nextInode++;
      this.name = name;
      this.mode = mode2;
      this.rdev = rdev;
      this.atime = this.mtime = this.ctime = Date.now();
    }
    get read() {
      return (this.mode & this.readMode) === this.readMode;
    }
    set read(val) {
      val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
    }
    get write() {
      return (this.mode & this.writeMode) === this.writeMode;
    }
    set write(val) {
      val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
    }
    get isFolder() {
      return FS.isDir(this.mode);
    }
    get isDevice() {
      return FS.isChrdev(this.mode);
    }
    addListener(cb, exclusive = false) {
      var entry = { cb, exclusive };
      var listeners = this.listeners ?? (this.listeners = /* @__PURE__ */ new Set());
      listeners.add(entry);
      return { listeners, entry };
    }
    notifyListeners(flags) {
      if (!this.listeners) return;
      var excl;
      for (var entry of this.listeners) {
        if (entry.exclusive) (excl || (excl = [])).push(entry);
        else entry.cb(flags);
      }
      if (excl) {
        var i = (this.exclTurn || 0) % excl.length;
        this.exclTurn = i + 1;
        excl[i].cb(flags);
      }
    }
  }, lookupPath(path, opts = {}) {
    if (!path) {
      throw new FS.ErrnoError(44);
    }
    opts.follow_mount ?? (opts.follow_mount = true);
    if (!PATH.isAbs(path)) {
      path = FS.cwd() + "/" + path;
    }
    linkloop: for (var nlinks = 0; nlinks < 40; nlinks++) {
      var parts = path.split("/").filter((p) => !!p);
      var current = FS.root;
      var current_path = "/";
      for (var i = 0; i < parts.length; i++) {
        var islast = i === parts.length - 1;
        if (islast && opts.parent) {
          break;
        }
        if (parts[i] === ".") {
          continue;
        }
        if (parts[i] === "..") {
          current_path = PATH.dirname(current_path);
          if (FS.isRoot(current)) {
            path = current_path + "/" + parts.slice(i + 1).join("/");
            nlinks--;
            continue linkloop;
          } else {
            current = current.parent;
          }
          continue;
        }
        current_path = PATH.join2(current_path, parts[i]);
        try {
          current = FS.lookupNode(current, parts[i]);
        } catch (e) {
          if (e?.errno === 44 && islast && opts.noent_okay) {
            return { path: current_path };
          }
          throw e;
        }
        if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) {
          current = current.mounted.root;
        }
        if (FS.isLink(current.mode) && (!islast || opts.follow)) {
          if (!current.node_ops.readlink) {
            throw new FS.ErrnoError(52);
          }
          var link = current.node_ops.readlink(current);
          if (!PATH.isAbs(link)) {
            link = PATH.dirname(current_path) + "/" + link;
          }
          path = link + "/" + parts.slice(i + 1).join("/");
          continue linkloop;
        }
      }
      return { path: current_path, node: current };
    }
    throw new FS.ErrnoError(32);
  }, getPath(node) {
    var path;
    while (true) {
      if (FS.isRoot(node)) {
        var mount = node.mount.mountpoint;
        if (!path) return mount;
        return mount[mount.length - 1] !== "/" ? `${mount}/${path}` : mount + path;
      }
      path = path ? `${node.name}/${path}` : node.name;
      node = node.parent;
    }
  }, hashName(parentid, name) {
    var hash = 0;
    for (var i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
    }
    return (parentid + hash >>> 0) % FS.nameTable.length;
  }, hashAddNode(node) {
    var hash = FS.hashName(node.parent.id, node.name);
    node.name_next = FS.nameTable[hash];
    FS.nameTable[hash] = node;
  }, hashRemoveNode(node) {
    var hash = FS.hashName(node.parent.id, node.name);
    if (FS.nameTable[hash] === node) {
      FS.nameTable[hash] = node.name_next;
    } else {
      var current = FS.nameTable[hash];
      while (current) {
        if (current.name_next === node) {
          current.name_next = node.name_next;
          break;
        }
        current = current.name_next;
      }
    }
  }, lookupNode(parent, name) {
    var errCode = FS.mayLookup(parent);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    var hash = FS.hashName(parent.id, name);
    for (var node = FS.nameTable[hash]; node; node = node.name_next) {
      var nodeName = node.name;
      if (node.parent.id === parent.id && nodeName === name) {
        return node;
      }
    }
    return FS.lookup(parent, name);
  }, createNode(parent, name, mode2, rdev) {
    assert(typeof parent == "object");
    var node = new FS.FSNode(parent, name, mode2, rdev);
    FS.hashAddNode(node);
    return node;
  }, destroyNode(node) {
    FS.hashRemoveNode(node);
  }, isRoot(node) {
    return node === node.parent;
  }, isMountpoint(node) {
    return !!node.mounted;
  }, isFile(mode2) {
    return (mode2 & 61440) === 32768;
  }, isDir(mode2) {
    return (mode2 & 61440) === 16384;
  }, isLink(mode2) {
    return (mode2 & 61440) === 40960;
  }, isChrdev(mode2) {
    return (mode2 & 61440) === 8192;
  }, isBlkdev(mode2) {
    return (mode2 & 61440) === 24576;
  }, isFIFO(mode2) {
    return (mode2 & 61440) === 4096;
  }, isSocket(mode2) {
    return (mode2 & 49152) === 49152;
  }, flagsToPermissionString(flag) {
    var perms = ["r", "w", "rw"][flag & 3];
    if (flag & 512) {
      perms += "w";
    }
    return perms;
  }, nodePermissions(node, perms) {
    if (FS.ignorePermissions) {
      return 0;
    }
    if (perms.includes("r") && !(node.mode & 292)) {
      return 2;
    }
    if (perms.includes("w") && !(node.mode & 146)) {
      return 2;
    }
    if (perms.includes("x") && !(node.mode & 73)) {
      return 2;
    }
    return 0;
  }, mayLookup(dir) {
    if (!FS.isDir(dir.mode)) return 54;
    var errCode = FS.nodePermissions(dir, "x");
    if (errCode) return errCode;
    if (!dir.node_ops.lookup) return 2;
    return 0;
  }, mayCreate(dir, name) {
    if (!FS.isDir(dir.mode)) {
      return 54;
    }
    try {
      var node = FS.lookupNode(dir, name);
      return 20;
    } catch (e) {
    }
    return FS.nodePermissions(dir, "wx");
  }, mayDelete(dir, name, isdir) {
    var node;
    try {
      node = FS.lookupNode(dir, name);
    } catch (e) {
      return e.errno;
    }
    var errCode = FS.nodePermissions(dir, "wx");
    if (errCode) {
      return errCode;
    }
    if (isdir) {
      if (!FS.isDir(node.mode)) {
        return 54;
      }
      if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
        return 10;
      }
    } else if (FS.isDir(node.mode)) {
      return 31;
    }
    return 0;
  }, mayOpen(node, flags) {
    if (!node) {
      return 44;
    }
    if (FS.isLink(node.mode)) {
      return 32;
    }
    var mode2 = FS.flagsToPermissionString(flags);
    if (FS.isDir(node.mode)) {
      if (mode2 !== "r" || flags & (512 | 64)) {
        return 31;
      }
    }
    return FS.nodePermissions(node, mode2);
  }, checkOpExists(op, err2) {
    if (!op) {
      throw new FS.ErrnoError(err2);
    }
    return op;
  }, MAX_OPEN_FDS: 4096, nextfd() {
    for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
      if (!FS.streams[fd]) {
        return fd;
      }
    }
    throw new FS.ErrnoError(33);
  }, getStreamChecked(fd) {
    var stream = FS.getStream(fd);
    if (!stream) {
      throw new FS.ErrnoError(8);
    }
    return stream;
  }, getStream: (fd) => FS.streams[fd], createStream(stream, fd = -1) {
    assert(fd >= -1);
    stream = Object.assign(new FS.FSStream(), stream);
    if (fd == -1) {
      fd = FS.nextfd();
    }
    stream.fd = fd;
    FS.streams[fd] = stream;
    return stream;
  }, closeStream(fd) {
    FS.streams[fd] = null;
  }, dupStream(origStream, fd = -1) {
    var stream = FS.createStream(origStream, fd);
    stream.stream_ops?.dup?.(stream);
    return stream;
  }, doSetAttr(stream, node, attr) {
    var setattr = stream?.stream_ops.setattr;
    var arg = setattr ? stream : node;
    setattr ?? (setattr = node.node_ops.setattr);
    FS.checkOpExists(setattr, 63);
    try {
      setattr(arg, attr);
    } catch (e) {
      if (e instanceof RangeError) {
        throw new FS.ErrnoError(22);
      }
      throw e;
    }
  }, chrdev_stream_ops: { open(stream) {
    var device = FS.getDevice(stream.node.rdev);
    stream.stream_ops = device.stream_ops;
    stream.stream_ops.open?.(stream);
  }, llseek() {
    throw new FS.ErrnoError(70);
  } }, major: (dev) => dev >> 8, minor: (dev) => dev & 255, makedev: (ma, mi) => ma << 8 | mi, registerDevice(dev, ops) {
    FS.devices[dev] = { stream_ops: ops };
  }, getDevice: (dev) => FS.devices[dev], getMounts(mount) {
    var mounts = [];
    var check = [mount];
    while (check.length) {
      var m = check.pop();
      mounts.push(m);
      check.push(...m.mounts);
    }
    return mounts;
  }, syncfs(populate, callback) {
    if (typeof populate == "function") {
      callback = populate;
      populate = false;
    }
    FS.syncFSRequests++;
    if (FS.syncFSRequests > 1) {
      err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
    }
    var mounts = FS.getMounts(FS.root.mount);
    var completed = 0;
    function doCallback(errCode) {
      assert(FS.syncFSRequests > 0);
      FS.syncFSRequests--;
      return callback(errCode);
    }
    function done(errCode) {
      if (errCode) {
        if (!done.errored) {
          done.errored = true;
          return doCallback(errCode);
        }
        return;
      }
      if (++completed >= mounts.length) {
        doCallback(null);
      }
    }
    for (var mount of mounts) {
      if (mount.type.syncfs) {
        mount.type.syncfs(mount, populate, done);
      } else {
        done(null);
      }
    }
  }, mount(type, opts, mountpoint) {
    if (typeof type == "string") {
      throw type;
    }
    var root = mountpoint === "/";
    var pseudo = !mountpoint;
    var node;
    if (root && FS.root) {
      throw new FS.ErrnoError(10);
    } else if (!root && !pseudo) {
      var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
      mountpoint = lookup.path;
      node = lookup.node;
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(10);
      }
      if (!FS.isDir(node.mode)) {
        throw new FS.ErrnoError(54);
      }
    }
    var mount = { type, opts, mountpoint, mounts: [] };
    var mountRoot = type.mount(mount);
    mountRoot.mount = mount;
    mount.root = mountRoot;
    if (root) {
      FS.root = mountRoot;
    } else if (node) {
      node.mounted = mount;
      if (node.mount) {
        node.mount.mounts.push(mount);
      }
    }
    return mountRoot;
  }, unmount(mountpoint) {
    var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
    if (!FS.isMountpoint(lookup.node)) {
      throw new FS.ErrnoError(28);
    }
    var node = lookup.node;
    var mount = node.mounted;
    var mounts = FS.getMounts(mount);
    for (var [hash, current] of Object.entries(FS.nameTable)) {
      while (current) {
        var next = current.name_next;
        if (mounts.includes(current.mount)) {
          FS.destroyNode(current);
        }
        current = next;
      }
    }
    node.mounted = null;
    var idx = node.mount.mounts.indexOf(mount);
    assert(idx !== -1);
    node.mount.mounts.splice(idx, 1);
  }, lookup(parent, name) {
    return parent.node_ops.lookup(parent, name);
  }, mknod(path, mode2, dev) {
    var lookup = FS.lookupPath(path, { parent: true });
    var parent = lookup.node;
    var name = PATH.basename(path);
    if (!name) {
      throw new FS.ErrnoError(28);
    }
    if (name === "." || name === "..") {
      throw new FS.ErrnoError(20);
    }
    var errCode = FS.mayCreate(parent, name);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.mknod) {
      throw new FS.ErrnoError(63);
    }
    return parent.node_ops.mknod(parent, name, mode2, dev);
  }, statfs(path) {
    return FS.statfsNode(FS.lookupPath(path, { follow: true }).node);
  }, statfsStream(stream) {
    return FS.statfsNode(stream.node);
  }, statfsNode(node) {
    var rtn = { bsize: 4096, frsize: 4096, blocks: 1e6, bfree: 5e5, bavail: 5e5, files: FS.nextInode, ffree: FS.nextInode - 1, fsid: 42, flags: 2, namelen: 255 };
    if (node.node_ops.statfs) {
      Object.assign(rtn, node.node_ops.statfs(node.mount.opts.root));
    }
    return rtn;
  }, create(path, mode2 = 438) {
    mode2 &= 4095;
    mode2 |= 32768;
    return FS.mknod(path, mode2, 0);
  }, mkdir(path, mode2 = 511) {
    mode2 &= 511 | 512;
    mode2 |= 16384;
    return FS.mknod(path, mode2, 0);
  }, mkdirTree(path, mode2 = 511) {
    var dirs = path.split("/");
    var d = "";
    for (var dir of dirs) {
      if (!dir) continue;
      if (d || PATH.isAbs(path)) d += "/";
      d += dir;
      try {
        FS.mkdir(d, mode2);
      } catch (e) {
        if (e.errno != 20) throw e;
      }
    }
  }, mkdev(path, mode2, dev) {
    if (typeof dev == "undefined") {
      dev = mode2;
      mode2 = 438;
    }
    mode2 |= 8192;
    return FS.mknod(path, mode2, dev);
  }, symlink(oldpath, newpath) {
    if (!PATH_FS.resolve(oldpath)) {
      throw new FS.ErrnoError(44);
    }
    var lookup = FS.lookupPath(newpath, { parent: true });
    var parent = lookup.node;
    if (!parent) {
      throw new FS.ErrnoError(44);
    }
    var newname = PATH.basename(newpath);
    var errCode = FS.mayCreate(parent, newname);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.symlink) {
      throw new FS.ErrnoError(63);
    }
    return parent.node_ops.symlink(parent, newname, oldpath);
  }, link(oldpath, newpath, flags) {
    var lookup = FS.lookupPath(newpath, { parent: true });
    var parent = lookup.node;
    if (!parent) {
      throw new FS.ErrnoError(44);
    }
    var newname = PATH.basename(newpath);
    var errCode = FS.mayCreate(parent, newname);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.link) {
      throw new FS.ErrnoError(34);
    }
    return parent.node_ops.link(parent, newname, oldpath, flags);
  }, rename(old_path, new_path) {
    var old_dirname = PATH.dirname(old_path);
    var new_dirname = PATH.dirname(new_path);
    var old_name = PATH.basename(old_path);
    var new_name = PATH.basename(new_path);
    var lookup, old_dir, new_dir;
    lookup = FS.lookupPath(old_path, { parent: true });
    old_dir = lookup.node;
    lookup = FS.lookupPath(new_path, { parent: true });
    new_dir = lookup.node;
    if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
    if (old_dir.mount !== new_dir.mount) {
      throw new FS.ErrnoError(75);
    }
    var old_node = FS.lookupNode(old_dir, old_name);
    var relative = PATH_FS.relative(old_path, new_dirname);
    if (relative.charAt(0) !== ".") {
      throw new FS.ErrnoError(28);
    }
    relative = PATH_FS.relative(new_path, old_dirname);
    if (relative.charAt(0) !== ".") {
      throw new FS.ErrnoError(55);
    }
    var new_node;
    try {
      new_node = FS.lookupNode(new_dir, new_name);
    } catch (e) {
    }
    if (old_node === new_node) {
      return;
    }
    var isdir = FS.isDir(old_node.mode);
    var errCode = FS.mayDelete(old_dir, old_name, isdir);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!old_dir.node_ops.rename) {
      throw new FS.ErrnoError(63);
    }
    if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
      throw new FS.ErrnoError(10);
    }
    if (new_dir !== old_dir) {
      errCode = FS.nodePermissions(old_dir, "w");
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
    }
    FS.hashRemoveNode(old_node);
    try {
      old_dir.node_ops.rename(old_node, new_dir, new_name);
      if (new_node) {
        FS.hashRemoveNode(new_node);
      }
      old_node.parent = new_dir;
    } catch (e) {
      throw e;
    } finally {
      FS.hashAddNode(old_node);
    }
  }, rmdir(path) {
    var lookup = FS.lookupPath(path, { parent: true });
    var parent = lookup.node;
    var name = PATH.basename(path);
    var node = FS.lookupNode(parent, name);
    var errCode = FS.mayDelete(parent, name, true);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.rmdir) {
      throw new FS.ErrnoError(63);
    }
    if (FS.isMountpoint(node)) {
      throw new FS.ErrnoError(10);
    }
    parent.node_ops.rmdir(parent, name);
    FS.destroyNode(node);
  }, readdir(path) {
    var lookup = FS.lookupPath(path, { follow: true });
    var node = lookup.node;
    var readdir = FS.checkOpExists(node.node_ops.readdir, 54);
    return readdir(node);
  }, unlink(path) {
    var lookup = FS.lookupPath(path, { parent: true });
    var parent = lookup.node;
    if (!parent) {
      throw new FS.ErrnoError(44);
    }
    var name = PATH.basename(path);
    var node = FS.lookupNode(parent, name);
    var errCode = FS.mayDelete(parent, name, false);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.unlink) {
      throw new FS.ErrnoError(63);
    }
    if (FS.isMountpoint(node)) {
      throw new FS.ErrnoError(10);
    }
    parent.node_ops.unlink(parent, name);
    FS.destroyNode(node);
  }, readlink(path) {
    var lookup = FS.lookupPath(path);
    var link = lookup.node;
    if (!link) {
      throw new FS.ErrnoError(44);
    }
    if (!link.node_ops.readlink) {
      throw new FS.ErrnoError(28);
    }
    return link.node_ops.readlink(link);
  }, stat(path, dontFollow = false) {
    var lookup = FS.lookupPath(path, { follow: !dontFollow });
    var node = lookup.node;
    var getattr = FS.checkOpExists(node.node_ops.getattr, 63);
    return getattr(node);
  }, fstat(fd) {
    var stream = FS.getStreamChecked(fd);
    var node = stream.node;
    var getattr = stream.stream_ops.getattr;
    var arg = getattr ? stream : node;
    getattr ?? (getattr = node.node_ops.getattr);
    FS.checkOpExists(getattr, 63);
    return getattr(arg);
  }, lstat(path) {
    return FS.stat(path, true);
  }, doChmod(stream, node, mode2, dontFollow = false) {
    FS.doSetAttr(stream, node, { mode: mode2 & 4095 | node.mode & ~4095, ctime: Date.now(), dontFollow });
  }, chmod(path, mode2, dontFollow = false) {
    var node;
    if (typeof path == "string") {
      var lookup = FS.lookupPath(path, { follow: !dontFollow });
      node = lookup.node;
    } else {
      node = path;
    }
    FS.doChmod(null, node, mode2, dontFollow);
  }, lchmod(path, mode2) {
    FS.chmod(path, mode2, true);
  }, fchmod(fd, mode2) {
    var stream = FS.getStreamChecked(fd);
    FS.doChmod(stream, stream.node, mode2, false);
  }, doChown(stream, node, dontFollow = false) {
    FS.doSetAttr(stream, node, { timestamp: Date.now(), dontFollow });
  }, chown(path, uid, gid, dontFollow = false) {
    var node;
    if (typeof path == "string") {
      var lookup = FS.lookupPath(path, { follow: !dontFollow });
      node = lookup.node;
    } else {
      node = path;
    }
    FS.doChown(null, node, dontFollow);
  }, lchown(path, uid, gid) {
    FS.chown(path, uid, gid, true);
  }, fchown(fd, uid, gid) {
    var stream = FS.getStreamChecked(fd);
    FS.doChown(stream, stream.node, false);
  }, doTruncate(stream, node, len) {
    if (FS.isDir(node.mode)) {
      throw new FS.ErrnoError(31);
    }
    if (!FS.isFile(node.mode)) {
      throw new FS.ErrnoError(28);
    }
    var errCode = FS.nodePermissions(node, "w");
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    FS.doSetAttr(stream, node, { size: len, timestamp: Date.now() });
  }, truncate(path, len) {
    if (len < 0) {
      throw new FS.ErrnoError(28);
    }
    var node;
    if (typeof path == "string") {
      var lookup = FS.lookupPath(path, { follow: true });
      node = lookup.node;
    } else {
      node = path;
    }
    FS.doTruncate(null, node, len);
  }, ftruncate(fd, len) {
    var stream = FS.getStreamChecked(fd);
    if (len < 0 || (stream.flags & 2097155) === 0) {
      throw new FS.ErrnoError(28);
    }
    FS.doTruncate(stream, stream.node, len);
  }, utime(path, atime, mtime, dontFollow = false) {
    var lookup = FS.lookupPath(path, { follow: !dontFollow });
    FS.doSetAttr(null, lookup.node, { atime, mtime, dontFollow });
  }, open(path, flags, mode2 = 438) {
    if (path === "") {
      throw new FS.ErrnoError(44);
    }
    flags = FS_modeStringToFlags(flags);
    if (flags & 64) {
      mode2 = mode2 & 4095 | 32768;
    } else {
      mode2 = 0;
    }
    var node;
    var isDirPath;
    if (typeof path == "object") {
      node = path;
    } else {
      isDirPath = path.endsWith("/");
      var lookup = FS.lookupPath(path, { follow: !(flags & 131072), noent_okay: true });
      node = lookup.node;
      path = lookup.path;
    }
    var created = false;
    if (flags & 64) {
      if (node) {
        if (flags & 128) {
          throw new FS.ErrnoError(20);
        }
      } else if (isDirPath) {
        throw new FS.ErrnoError(31);
      } else {
        node = FS.mknod(path, mode2 | 511, 0);
        created = true;
      }
    }
    if (!node) {
      throw new FS.ErrnoError(44);
    }
    if (FS.isChrdev(node.mode)) {
      flags &= ~512;
    }
    if (flags & 65536 && !FS.isDir(node.mode)) {
      throw new FS.ErrnoError(54);
    }
    if (!created) {
      var errCode = FS.mayOpen(node, flags);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
    }
    if (flags & 512 && !created) {
      FS.truncate(node, 0);
    }
    flags &= ~(128 | 512 | 131072);
    var stream = FS.createStream({ node, path: FS.getPath(node), flags, seekable: true, position: 0, stream_ops: node.stream_ops, ungotten: [], error: false });
    if (stream.stream_ops.open) {
      stream.stream_ops.open(stream);
    }
    if (created) {
      FS.chmod(node, mode2 & 511);
    }
    return stream;
  }, close(stream) {
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if (stream.getdents) stream.getdents = null;
    stream.node?.notifyListeners(32);
    try {
      if (stream.stream_ops.close) {
        stream.stream_ops.close(stream);
      }
    } catch (e) {
      throw e;
    } finally {
      FS.closeStream(stream.fd);
    }
    stream.fd = null;
  }, isClosed(stream) {
    return stream.fd === null;
  }, llseek(stream, offset, whence) {
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if (!stream.seekable || !stream.stream_ops.llseek) {
      throw new FS.ErrnoError(70);
    }
    if (whence != 0 && whence != 1 && whence != 2) {
      throw new FS.ErrnoError(28);
    }
    stream.position = stream.stream_ops.llseek(stream, offset, whence);
    stream.ungotten = [];
    return stream.position;
  }, read(stream, buffer, offset, length, position) {
    assert(offset >= 0);
    if (length < 0 || position < 0) {
      throw new FS.ErrnoError(28);
    }
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if ((stream.flags & 2097155) === 1) {
      throw new FS.ErrnoError(8);
    }
    if (FS.isDir(stream.node.mode)) {
      throw new FS.ErrnoError(31);
    }
    if (!stream.stream_ops.read) {
      throw new FS.ErrnoError(28);
    }
    var seeking = typeof position != "undefined";
    if (!seeking) {
      position = stream.position;
    } else if (!stream.seekable) {
      throw new FS.ErrnoError(70);
    }
    var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
    if (!seeking) stream.position += bytesRead;
    return bytesRead;
  }, write(stream, buffer, offset, length, position, canOwn) {
    assert(offset >= 0);
    assert(buffer.subarray, "FS.write expects a TypedArray");
    if (length < 0 || position < 0) {
      throw new FS.ErrnoError(28);
    }
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if ((stream.flags & 2097155) === 0) {
      throw new FS.ErrnoError(8);
    }
    if (FS.isDir(stream.node.mode)) {
      throw new FS.ErrnoError(31);
    }
    if (!stream.stream_ops.write) {
      throw new FS.ErrnoError(28);
    }
    if (stream.seekable && stream.flags & 1024) {
      FS.llseek(stream, 0, 2);
    }
    var seeking = typeof position != "undefined";
    if (!seeking) {
      position = stream.position;
    } else if (!stream.seekable) {
      throw new FS.ErrnoError(70);
    }
    var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
    if (!seeking) stream.position += bytesWritten;
    return bytesWritten;
  }, mmap(stream, length, position, prot, flags) {
    if (prot & 2 && !(flags & 2) && (stream.flags & 2097155) !== 2) {
      throw new FS.ErrnoError(2);
    }
    if ((stream.flags & 2097155) === 1) {
      throw new FS.ErrnoError(2);
    }
    if (!stream.stream_ops.mmap) {
      throw new FS.ErrnoError(43);
    }
    if (!length) {
      throw new FS.ErrnoError(28);
    }
    return stream.stream_ops.mmap(stream, length, position, prot, flags);
  }, msync(stream, buffer, offset, length, mmapFlags) {
    assert(offset >= 0);
    if (!stream.stream_ops.msync) {
      return 0;
    }
    return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
  }, ioctl(stream, cmd, arg) {
    if (!stream.stream_ops.ioctl) {
      throw new FS.ErrnoError(59);
    }
    return stream.stream_ops.ioctl(stream, cmd, arg);
  }, readFile(path, opts = {}) {
    opts.flags ?? (opts.flags = 0);
    opts.encoding ?? (opts.encoding = "binary");
    if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
      abort(`Invalid encoding type "${opts.encoding}"`);
    }
    var stream = FS.open(path, opts.flags);
    var stat = FS.stat(path);
    var length = stat.size;
    var buf = new Uint8Array(length);
    FS.read(stream, buf, 0, length, 0);
    if (opts.encoding === "utf8") {
      buf = UTF8ArrayToString(buf);
    }
    FS.close(stream);
    return buf;
  }, writeFile(path, data, opts = {}) {
    opts.flags ?? (opts.flags = 577);
    var stream = FS.open(path, opts.flags, opts.mode);
    data = FS_fileDataToTypedArray(data);
    FS.write(stream, data, 0, data.byteLength, void 0, opts.canOwn);
    FS.close(stream);
  }, cwd: () => FS.currentPath, chdir(path) {
    var lookup = FS.lookupPath(path, { follow: true });
    if (lookup.node === null) {
      throw new FS.ErrnoError(44);
    }
    if (!FS.isDir(lookup.node.mode)) {
      throw new FS.ErrnoError(54);
    }
    var errCode = FS.nodePermissions(lookup.node, "x");
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    FS.currentPath = lookup.path;
  }, createDefaultDirectories() {
    FS.mkdir("/tmp");
    FS.mkdir("/home");
    FS.mkdir("/home/web_user");
  }, createDefaultDevices() {
    FS.mkdir("/dev");
    FS.registerDevice(FS.makedev(1, 3), { read: () => 0, write: (stream, buffer, offset, length, pos) => length, llseek: () => 0 });
    FS.mkdev("/dev/null", FS.makedev(1, 3));
    TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
    TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
    FS.mkdev("/dev/tty", FS.makedev(5, 0));
    FS.mkdev("/dev/tty1", FS.makedev(6, 0));
    var randomBuffer = new Uint8Array(1024), randomLeft = 0;
    var randomByte = () => {
      if (!randomLeft) {
        randomFill(randomBuffer);
        randomLeft = randomBuffer.byteLength;
      }
      return randomBuffer[--randomLeft];
    };
    FS.createDevice("/dev", "random", randomByte);
    FS.createDevice("/dev", "urandom", randomByte);
    FS.mkdir("/dev/shm");
    FS.mkdir("/dev/shm/tmp");
  }, createSpecialDirectories() {
    FS.mkdir("/proc");
    var proc_self = FS.mkdir("/proc/self");
    FS.mkdir("/proc/self/fd");
    FS.mount({ mount() {
      var node = FS.createNode(proc_self, "fd", 16895, 73);
      node.stream_ops = { llseek: MEMFS.stream_ops.llseek };
      node.node_ops = { lookup(parent, name) {
        var fd = +name;
        var stream = FS.getStreamChecked(fd);
        var ret = { parent: null, mount: { mountpoint: "fake" }, node_ops: { readlink: () => stream.path }, id: fd + 1 };
        ret.parent = ret;
        return ret;
      }, readdir() {
        return Array.from(FS.streams.entries()).filter(([k, v]) => v).map(([k, v]) => k.toString());
      } };
      return node;
    } }, {}, "/proc/self/fd");
  }, createStandardStreams(input, output, error) {
    if (input) {
      FS.createDevice("/dev", "stdin", input);
    } else {
      FS.symlink("/dev/tty", "/dev/stdin");
    }
    if (output) {
      FS.createDevice("/dev", "stdout", null, output);
    } else {
      FS.symlink("/dev/tty", "/dev/stdout");
    }
    if (error) {
      FS.createDevice("/dev", "stderr", null, error);
    } else {
      FS.symlink("/dev/tty1", "/dev/stderr");
    }
    var stdin = FS.open("/dev/stdin", 0);
    var stdout = FS.open("/dev/stdout", 1);
    var stderr = FS.open("/dev/stderr", 1);
    assert(stdin.fd === 0, `invalid handle for stdin (${stdin.fd})`);
    assert(stdout.fd === 1, `invalid handle for stdout (${stdout.fd})`);
    assert(stderr.fd === 2, `invalid handle for stderr (${stderr.fd})`);
  }, staticInit() {
    FS.nameTable.length = 4096;
    FS.mount(MEMFS, {}, "/");
    FS.createDefaultDirectories();
    FS.createDefaultDevices();
    FS.createSpecialDirectories();
    FS.filesystems = { MEMFS };
  }, init(input, output, error) {
    assert(!FS.initialized, "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");
    FS.initialized = true;
    input ?? (input = Module2["stdin"]);
    output ?? (output = Module2["stdout"]);
    error ?? (error = Module2["stderr"]);
    FS.createStandardStreams(input, output, error);
  }, quit() {
    FS.initialized = false;
    _fflush(0);
    for (var stream of FS.streams) {
      if (stream) {
        FS.close(stream);
      }
    }
  }, analyzePath(path, dontResolveLastLink = false) {
    warnOnce("FS.analyzePath is deprecated; use FS.lookupPath or FS.stat instead");
    try {
      var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
      path = lookup.path;
    } catch (e) {
    }
    var ret = { isRoot: false, exists: false, error: 0, name: null, path: null, object: null, parentExists: false, parentPath: null, parentObject: null };
    try {
      var lookup = FS.lookupPath(path, { parent: true });
      ret.parentExists = true;
      ret.parentPath = lookup.path;
      ret.parentObject = lookup.node;
      ret.name = PATH.basename(path);
      lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
      ret.exists = true;
      ret.path = lookup.path;
      ret.object = lookup.node;
      ret.name = lookup.node.name;
      ret.isRoot = lookup.path === "/";
    } catch (e) {
      ret.error = e.errno;
    }
    return ret;
  }, createPath(parent, path, canRead, canWrite) {
    parent = typeof parent == "string" ? parent : FS.getPath(parent);
    var parts = path.split("/").reverse();
    while (parts.length) {
      var part = parts.pop();
      if (!part) continue;
      var current = PATH.join2(parent, part);
      try {
        FS.mkdir(current);
      } catch (e) {
        if (e.errno != 20) throw e;
      }
      parent = current;
    }
    return current;
  }, createFile(parent, name, properties, canRead, canWrite) {
    var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
    var mode2 = FS_getMode(canRead, canWrite);
    return FS.create(path, mode2);
  }, createDataFile(parent, name, data, canRead, canWrite, canOwn) {
    var path = name;
    if (parent) {
      parent = typeof parent == "string" ? parent : FS.getPath(parent);
      path = name ? PATH.join2(parent, name) : parent;
    }
    var mode2 = FS_getMode(canRead, canWrite);
    var node = FS.create(path, mode2);
    if (data) {
      data = FS_fileDataToTypedArray(data);
      FS.chmod(node, mode2 | 146);
      var stream = FS.open(node, 577);
      FS.write(stream, data, 0, data.length, 0, canOwn);
      FS.close(stream);
      FS.chmod(node, mode2);
    }
  }, createDevice(parent, name, input, output) {
    var _a;
    var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
    var mode2 = FS_getMode(!!input, !!output);
    (_a = FS.createDevice).major ?? (_a.major = 64);
    var dev = FS.makedev(FS.createDevice.major++, 0);
    FS.registerDevice(dev, { open(stream) {
      stream.seekable = false;
    }, close(stream) {
      if (output?.buffer?.length) {
        output(10);
      }
    }, read(stream, buffer, offset, length, pos) {
      var bytesRead = 0;
      for (var i = 0; i < length; i++) {
        var result;
        try {
          result = input();
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
        if (result === void 0 && !bytesRead) {
          throw new FS.ErrnoError(6);
        }
        if (result === null || result === void 0) break;
        bytesRead++;
        buffer[offset + i] = result;
      }
      if (bytesRead) {
        stream.node.atime = Date.now();
      }
      return bytesRead;
    }, write(stream, buffer, offset, length, pos) {
      for (var i = 0; i < length; i++) {
        try {
          output(buffer[offset + i]);
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
      }
      if (length) {
        stream.node.mtime = stream.node.ctime = Date.now();
      }
      return i;
    } });
    return FS.mkdev(path, mode2, dev);
  }, forceLoadFile(obj) {
    if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
    if (globalThis.XMLHttpRequest) {
      abort("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
    } else {
      try {
        obj.contents = readBinary(obj.url);
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
    }
  }, createLazyFile(parent, name, url2, canRead, canWrite) {
    class LazyUint8Array {
      constructor() {
        __publicField(this, "lengthKnown", false);
        __publicField(this, "chunks", []);
      }
      get(idx) {
        if (idx > this.length - 1 || idx < 0) {
          return void 0;
        }
        var chunkOffset = idx % this.chunkSize;
        var chunkNum = idx / this.chunkSize | 0;
        return this.getter(chunkNum)[chunkOffset];
      }
      setDataGetter(getter) {
        this.getter = getter;
      }
      cacheLength() {
        var xhr = new XMLHttpRequest();
        xhr.open("HEAD", url2, false);
        xhr.send(null);
        if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort(`Couldn't load ${url2}. Status: ${xhr.status}`);
        var datalength = Number(xhr.getResponseHeader("Content-length"));
        var header;
        var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
        var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
        var chunkSize = 1024 * 1024;
        if (!hasByteServing) chunkSize = datalength;
        var doXHR = (from, to) => {
          if (from > to) abort(`invalid range (${from}, ${to}) or no bytes requested!`);
          if (to > datalength - 1) abort(`only ${datalength} bytes available! programmer error!`);
          var xhr2 = new XMLHttpRequest();
          xhr2.open("GET", url2, false);
          if (datalength !== chunkSize) xhr2.setRequestHeader("Range", `bytes=${from}-${to}`);
          xhr2.responseType = "arraybuffer";
          if (xhr2.overrideMimeType) {
            xhr2.overrideMimeType("text/plain; charset=x-user-defined");
          }
          xhr2.send(null);
          if (!(xhr2.status >= 200 && xhr2.status < 300 || xhr2.status === 304)) abort(`Couldn't load ${url2}. Status: ${xhr2.status}`);
          if (xhr2.response !== void 0) {
            return new Uint8Array(xhr2.response || []);
          }
          return intArrayFromString(xhr2.responseText ?? "", true);
        };
        var lazyArray2 = this;
        lazyArray2.setDataGetter((chunkNum) => {
          var start = chunkNum * chunkSize;
          var end = (chunkNum + 1) * chunkSize - 1;
          end = Math.min(end, datalength - 1);
          if (typeof lazyArray2.chunks[chunkNum] == "undefined") {
            lazyArray2.chunks[chunkNum] = doXHR(start, end);
          }
          if (typeof lazyArray2.chunks[chunkNum] == "undefined") abort("doXHR failed!");
          return lazyArray2.chunks[chunkNum];
        });
        if (usesGzip || !datalength) {
          chunkSize = datalength = 1;
          datalength = this.getter(0).length;
          chunkSize = datalength;
          out("LazyFiles on gzip forces download of the whole file when length is accessed");
        }
        this._length = datalength;
        this._chunkSize = chunkSize;
        this.lengthKnown = true;
      }
      get length() {
        if (!this.lengthKnown) {
          this.cacheLength();
        }
        return this._length;
      }
      get chunkSize() {
        if (!this.lengthKnown) {
          this.cacheLength();
        }
        return this._chunkSize;
      }
    }
    if (globalThis.XMLHttpRequest) {
      if (!ENVIRONMENT_IS_WORKER) abort("Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc");
      var lazyArray = new LazyUint8Array();
      var properties = { isDevice: false, contents: lazyArray };
    } else {
      var properties = { isDevice: false, url: url2 };
    }
    var node = FS.createFile(parent, name, properties, canRead, canWrite);
    if (properties.contents) {
      node.contents = properties.contents;
    } else if (properties.url) {
      node.contents = null;
      node.url = properties.url;
    }
    Object.defineProperties(node, { usedBytes: { get: function() {
      return this.contents.length;
    } } });
    var stream_ops = {};
    for (const [key, fn] of Object.entries(node.stream_ops)) {
      stream_ops[key] = (...args) => {
        FS.forceLoadFile(node);
        return fn(...args);
      };
    }
    function writeChunks(stream, buffer, offset, length, position) {
      var contents = stream.node.contents;
      if (position >= contents.length) return 0;
      var size = Math.min(contents.length - position, length);
      assert(size >= 0);
      if (contents.slice) {
        for (var i = 0; i < size; i++) {
          buffer[offset + i] = contents[position + i];
        }
      } else {
        for (var i = 0; i < size; i++) {
          buffer[offset + i] = contents.get(position + i);
        }
      }
      return size;
    }
    stream_ops.read = (stream, buffer, offset, length, position) => {
      FS.forceLoadFile(node);
      return writeChunks(stream, buffer, offset, length, position);
    };
    stream_ops.mmap = (stream, length, position, prot, flags) => {
      FS.forceLoadFile(node);
      var ptr = mmapAlloc(length);
      if (!ptr) {
        throw new FS.ErrnoError(48);
      }
      writeChunks(stream, HEAP8, ptr, length, position);
      return { ptr, allocated: true };
    };
    node.stream_ops = stream_ops;
    return node;
  } };
  var HEAP64;
  var SYSCALLS = { currentUmask: 18, calculateAt(dirfd, path, allowEmpty = false) {
    if (PATH.isAbs(path)) {
      return path;
    }
    var dir;
    if (dirfd === -100) {
      dir = FS.cwd();
    } else {
      var dirstream = SYSCALLS.getStreamFromFD(dirfd);
      dir = dirstream.path;
    }
    if (path.length == 0) {
      if (!allowEmpty) {
        throw new FS.ErrnoError(44);
      }
      return dir;
    }
    return dir + "/" + path;
  }, writeStat(buf, stat) {
    HEAPU32[buf >> 2] = stat.dev;
    checkInt32(stat.dev);
    HEAPU32[buf + 4 >> 2] = stat.mode;
    checkInt32(stat.mode);
    HEAPU32[buf + 8 >> 2] = stat.nlink;
    checkInt32(stat.nlink);
    HEAPU32[buf + 12 >> 2] = stat.uid;
    checkInt32(stat.uid);
    HEAPU32[buf + 16 >> 2] = stat.gid;
    checkInt32(stat.gid);
    HEAPU32[buf + 20 >> 2] = stat.rdev;
    checkInt32(stat.rdev);
    HEAP64[buf + 24 >> 3] = BigInt(stat.size);
    checkInt64(stat.size);
    HEAP32[buf + 32 >> 2] = 4096;
    checkInt32(4096);
    HEAP32[buf + 36 >> 2] = stat.blocks;
    checkInt32(stat.blocks);
    var atime = stat.atimeMs ?? stat.atime.getTime();
    var mtime = stat.mtimeMs ?? stat.mtime.getTime();
    var ctime = stat.ctimeMs ?? stat.ctime.getTime();
    HEAP64[buf + 40 >> 3] = BigInt(Math.floor(atime / 1e3));
    checkInt64(Math.floor(atime / 1e3));
    HEAPU32[buf + 48 >> 2] = Math.floor(atime % 1e3 * 1e6);
    checkInt32(Math.floor(atime % 1e3 * 1e6));
    HEAP64[buf + 56 >> 3] = BigInt(Math.floor(mtime / 1e3));
    checkInt64(Math.floor(mtime / 1e3));
    HEAPU32[buf + 64 >> 2] = Math.floor(mtime % 1e3 * 1e6);
    checkInt32(Math.floor(mtime % 1e3 * 1e6));
    HEAP64[buf + 72 >> 3] = BigInt(Math.floor(ctime / 1e3));
    checkInt64(Math.floor(ctime / 1e3));
    HEAPU32[buf + 80 >> 2] = Math.floor(ctime % 1e3 * 1e6);
    checkInt32(Math.floor(ctime % 1e3 * 1e6));
    HEAP64[buf + 88 >> 3] = BigInt(stat.ino);
    checkInt64(stat.ino);
    return 0;
  }, writeStatFs(buf, stats) {
    HEAPU32[buf + 4 >> 2] = stats.bsize;
    checkInt32(stats.bsize);
    HEAPU32[buf + 60 >> 2] = stats.bsize;
    checkInt32(stats.bsize);
    HEAP64[buf + 8 >> 3] = BigInt(stats.blocks);
    checkInt64(stats.blocks);
    HEAP64[buf + 16 >> 3] = BigInt(stats.bfree);
    checkInt64(stats.bfree);
    HEAP64[buf + 24 >> 3] = BigInt(stats.bavail);
    checkInt64(stats.bavail);
    HEAP64[buf + 32 >> 3] = BigInt(stats.files);
    checkInt64(stats.files);
    HEAP64[buf + 40 >> 3] = BigInt(stats.ffree);
    checkInt64(stats.ffree);
    HEAPU32[buf + 48 >> 2] = stats.fsid;
    checkInt32(stats.fsid);
    HEAPU32[buf + 64 >> 2] = stats.flags;
    checkInt32(stats.flags);
    HEAPU32[buf + 56 >> 2] = stats.namelen;
    checkInt32(stats.namelen);
  }, doMsync(addr, stream, len, flags, offset) {
    if (!FS.isFile(stream.node.mode)) {
      throw new FS.ErrnoError(43);
    }
    if (flags & 2) {
      return 0;
    }
    var buffer = HEAPU8.subarray(addr, addr + len);
    FS.msync(stream, buffer, offset, len, flags);
  }, getStreamFromFD(fd) {
    var stream = FS.getStreamChecked(fd);
    return stream;
  }, varargs: void 0, getStr(ptr) {
    var ret = UTF8ToString(ptr);
    return ret;
  } };
  var HEAP16;
  function ___syscall_fcntl64(fd, cmd, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (cmd) {
        case 0: {
          var arg = syscallGetVarargI();
          if (arg < 0) {
            return -28;
          }
          while (FS.streams[arg]) {
            arg++;
          }
          var newStream;
          newStream = FS.dupStream(stream, arg);
          return newStream.fd;
        }
        case 1:
        case 2:
          return 0;
        case 3:
          return stream.flags;
        case 4: {
          var arg = syscallGetVarargI();
          var mask = 289792;
          stream.flags = stream.flags & ~mask | arg & mask;
          return 0;
        }
        case 12: {
          var arg = syscallGetVarargP();
          var offset = 0;
          HEAP16[arg + offset >> 1] = 2;
          checkInt16(2);
          return 0;
        }
        case 13:
        case 14:
          return 0;
      }
      return -28;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_ioctl(fd, op, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (op) {
        case 21509: {
          if (!stream.tty) return -59;
          return 0;
        }
        case 21505: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcgets) {
            var termios = stream.tty.ops.ioctl_tcgets(stream);
            var argp = syscallGetVarargP();
            HEAP32[argp >> 2] = termios.c_iflag || 0;
            checkInt32(termios.c_iflag || 0);
            HEAP32[argp + 4 >> 2] = termios.c_oflag || 0;
            checkInt32(termios.c_oflag || 0);
            HEAP32[argp + 8 >> 2] = termios.c_cflag || 0;
            checkInt32(termios.c_cflag || 0);
            HEAP32[argp + 12 >> 2] = termios.c_lflag || 0;
            checkInt32(termios.c_lflag || 0);
            for (var i = 0; i < 32; i++) {
              HEAP8[argp + i + 17] = termios.c_cc[i] || 0;
              checkInt8(termios.c_cc[i] || 0);
            }
            return 0;
          }
          return 0;
        }
        case 21510:
        case 21511:
        case 21512: {
          if (!stream.tty) return -59;
          return 0;
        }
        case 21506:
        case 21507:
        case 21508: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcsets) {
            var argp = syscallGetVarargP();
            var c_iflag = HEAP32[argp >> 2];
            var c_oflag = HEAP32[argp + 4 >> 2];
            var c_cflag = HEAP32[argp + 8 >> 2];
            var c_lflag = HEAP32[argp + 12 >> 2];
            var c_cc = [];
            for (var i = 0; i < 32; i++) {
              c_cc.push(HEAP8[argp + i + 17]);
            }
            return stream.tty.ops.ioctl_tcsets(stream.tty, op, { c_iflag, c_oflag, c_cflag, c_lflag, c_cc });
          }
          return 0;
        }
        case 21519: {
          if (!stream.tty) return -59;
          var argp = syscallGetVarargP();
          HEAP32[argp >> 2] = 0;
          checkInt32(0);
          return 0;
        }
        case 21520: {
          if (!stream.tty) return -59;
          return -28;
        }
        case 21537:
        case 21531: {
          var argp = syscallGetVarargP();
          return FS.ioctl(stream, op, argp);
        }
        case 21523: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tiocgwinsz) {
            var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
            var argp = syscallGetVarargP();
            HEAP16[argp >> 1] = winsize[0];
            checkInt16(winsize[0]);
            HEAP16[argp + 2 >> 1] = winsize[1];
            checkInt16(winsize[1]);
          }
          return 0;
        }
        case 21524: {
          if (!stream.tty) return -59;
          return 0;
        }
        case 21515: {
          if (!stream.tty) return -59;
          return 0;
        }
        default:
          return -28;
      }
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_openat(dirfd, path, flags, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      var mode2 = varargs ? syscallGetVarargI() : 0;
      if (flags & 64) {
        mode2 &= ~SYSCALLS.currentUmask;
      }
      return FS.open(path, flags, mode2).fd;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  var __abort_js = () => abort("native code called abort()");
  var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
    assert(typeof maxBytesToWrite == "number", "stringToUTF8 requires a third parameter that specifies the length of the output buffer");
    return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
  };
  var __tzset_js = (timezone, daylight, std_name, dst_name) => {
    var currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    var winter = new Date(currentYear, 0, 1);
    var summer = new Date(currentYear, 6, 1);
    var winterOffset = winter.getTimezoneOffset();
    var summerOffset = summer.getTimezoneOffset();
    var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
    HEAPU32[timezone >> 2] = stdTimezoneOffset * 60;
    HEAP32[daylight >> 2] = Number(winterOffset != summerOffset);
    checkInt32(Number(winterOffset != summerOffset));
    var extractZone = (timezoneOffset) => {
      var sign = timezoneOffset >= 0 ? "-" : "+";
      var absOffset = Math.abs(timezoneOffset);
      var hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
      var minutes = String(absOffset % 60).padStart(2, "0");
      return `UTC${sign}${hours}${minutes}`;
    };
    var winterName = extractZone(winterOffset);
    var summerName = extractZone(summerOffset);
    assert(winterName);
    assert(summerName);
    assert(lengthBytesUTF8(winterName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${winterName})`);
    assert(lengthBytesUTF8(summerName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${summerName})`);
    if (summerOffset < winterOffset) {
      stringToUTF8(winterName, std_name, 17);
      stringToUTF8(summerName, dst_name, 17);
    } else {
      stringToUTF8(winterName, dst_name, 17);
      stringToUTF8(summerName, std_name, 17);
    }
  };
  var _emscripten_get_now = () => performance.now();
  var _emscripten_date_now = () => Date.now();
  var nowIsMonotonic = 1;
  var checkWasiClock = (clock_id) => clock_id >= 0 && clock_id <= 3;
  var INT53_MAX = 9007199254740992;
  var INT53_MIN = -9007199254740992;
  var bigintToI53Checked = (num) => num < INT53_MIN || num > INT53_MAX ? NaN : Number(num);
  function _clock_time_get(clk_id, ignored_precision, ptime) {
    ignored_precision = bigintToI53Checked(ignored_precision);
    if (!checkWasiClock(clk_id)) {
      return 28;
    }
    var now;
    if (clk_id === 0) {
      now = _emscripten_date_now();
    } else if (nowIsMonotonic) {
      now = _emscripten_get_now();
    } else {
      return 52;
    }
    var nsec = Math.round(now * 1e6);
    HEAP64[ptime >> 3] = BigInt(nsec);
    checkInt64(nsec);
    return 0;
  }
  var _emscripten_err = (str) => err(UTF8ToString(str));
  var getHeapMax = () => 1073741824;
  var alignMemory = (size, alignment) => {
    assert(alignment, "alignment argument is required");
    return Math.ceil(size / alignment) * alignment;
  };
  var growMemory = (size) => {
    var oldHeapSize = wasmMemory.buffer.byteLength;
    var pages = (size - oldHeapSize + 65535) / 65536 | 0;
    try {
      wasmMemory.grow(pages);
      updateMemoryViews();
      return 1;
    } catch (e) {
      err(`growMemory: Attempted to grow heap from ${oldHeapSize} bytes to ${size} bytes, but got error: ${e}`);
    }
  };
  var _emscripten_resize_heap = (requestedSize) => {
    var oldSize = HEAPU8.length;
    requestedSize >>>= 0;
    assert(requestedSize > oldSize);
    var maxHeapSize = getHeapMax();
    if (requestedSize > maxHeapSize) {
      err(`Cannot enlarge memory, requested ${requestedSize} bytes, but the limit is ${maxHeapSize} bytes!`);
      return false;
    }
    for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
      var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
      overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
      var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
      var t0 = _emscripten_get_now();
      var replacement = growMemory(newSize);
      var t1 = _emscripten_get_now();
      dbg(`Heap resize call from ${oldSize} to ${newSize} took ${t1 - t0} msecs. Success: ${!!replacement}`);
      if (replacement) {
        return true;
      }
    }
    err(`Failed to grow the heap from ${oldSize} bytes to ${newSize} bytes, not enough memory!`);
    return false;
  };
  var maybeCStringToJsString = (cString) => cString > 2 ? UTF8ToString(cString) : cString;
  var specialHTMLTargets = [0, document, window];
  var findEventTarget = (target) => {
    target = maybeCStringToJsString(target);
    var domElement = specialHTMLTargets[target] || document.querySelector(target);
    return domElement;
  };
  var findCanvasEventTarget = findEventTarget;
  var _emscripten_set_canvas_element_size = (target, width, height) => {
    var canvas2 = findCanvasEventTarget(target);
    if (!canvas2) return -4;
    canvas2.width = width;
    canvas2.height = height;
    return 0;
  };
  var GLctx;
  var webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance = (ctx) => !!(ctx.dibvbi = ctx.getExtension("WEBGL_draw_instanced_base_vertex_base_instance"));
  var webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance = (ctx) => !!(ctx.mdibvbi = ctx.getExtension("WEBGL_multi_draw_instanced_base_vertex_base_instance"));
  var webgl_enable_EXT_polygon_offset_clamp = (ctx) => !!(ctx.extPolygonOffsetClamp = ctx.getExtension("EXT_polygon_offset_clamp"));
  var webgl_enable_EXT_clip_control = (ctx) => !!(ctx.extClipControl = ctx.getExtension("EXT_clip_control"));
  var webgl_enable_WEBGL_polygon_mode = (ctx) => !!(ctx.webglPolygonMode = ctx.getExtension("WEBGL_polygon_mode"));
  var webgl_enable_WEBGL_multi_draw = (ctx) => !!(ctx.multiDrawWebgl = ctx.getExtension("WEBGL_multi_draw"));
  var getEmscriptenSupportedExtensions = (ctx) => {
    var supportedExtensions = ["EXT_color_buffer_float", "EXT_conservative_depth", "EXT_disjoint_timer_query_webgl2", "EXT_texture_norm16", "NV_shader_noperspective_interpolation", "WEBGL_clip_cull_distance", "EXT_clip_control", "EXT_color_buffer_half_float", "EXT_depth_clamp", "EXT_float_blend", "EXT_polygon_offset_clamp", "EXT_texture_compression_bptc", "EXT_texture_compression_rgtc", "EXT_texture_filter_anisotropic", "KHR_parallel_shader_compile", "OES_texture_float_linear", "WEBGL_blend_func_extended", "WEBGL_compressed_texture_astc", "WEBGL_compressed_texture_etc", "WEBGL_compressed_texture_etc1", "WEBGL_compressed_texture_s3tc", "WEBGL_compressed_texture_s3tc_srgb", "WEBGL_debug_renderer_info", "WEBGL_debug_shaders", "WEBGL_lose_context", "WEBGL_multi_draw", "WEBGL_polygon_mode"];
    return ctx.getSupportedExtensions()?.filter((ext) => supportedExtensions.includes(ext)) ?? [];
  };
  var registerPreMainLoop = (f) => {
    typeof MainLoop != "undefined" && MainLoop && MainLoop.preMainLoop && MainLoop.preMainLoop.push(f);
  };
  var webglBufferSubData = (target, offset, size, data, src = HEAPU8) => {
    if (true) {
      size && GLctx.bufferSubData(target, offset, src, data, size);
      return;
    }
  };
  var GL = { counter: 1, buffers: [], mappedBuffers: {}, programs: [], framebuffers: [], renderbuffers: [], textures: [], shaders: [], vaos: [], contexts: [], offscreenCanvases: {}, queries: [], samplers: [], transformFeedbacks: [], syncs: [], byteSizeByTypeRoot: 5120, byteSizeByType: [1, 1, 2, 2, 4, 4, 4, 2, 3, 4, 8], stringCache: {}, stringiCache: {}, unpackAlignment: 4, unpackRowLength: 0, recordError: (errorCode) => {
    if (!GL.lastError) {
      GL.lastError = errorCode;
    }
  }, getNewId: (table) => {
    var ret = GL.counter++;
    for (var i = table.length; i < ret; i++) {
      table[i] = null;
    }
    while (table[ret]) {
      ret = GL.counter++;
    }
    return ret;
  }, genObject: (n, buffers, createFunction, objectTable) => {
    for (var i = 0; i < n; i++) {
      var buffer = GLctx[createFunction]();
      var id = buffer && GL.getNewId(objectTable);
      if (buffer) {
        buffer.name = id;
        objectTable[id] = buffer;
      } else {
        GL.recordError(1282);
      }
      HEAP32[buffers + i * 4 >> 2] = id;
      checkInt32(id);
    }
  }, MAX_TEMP_BUFFER_SIZE: 2097152, numTempVertexBuffersPerSize: 64, log2ceilLookup: (i) => 32 - Math.clz32(i ? i - 1 : 0), generateTempBuffers: (quads, context) => {
    var largestIndex = GL.log2ceilLookup(GL.MAX_TEMP_BUFFER_SIZE);
    context.tempVertexBufferCounters1 = [];
    context.tempVertexBufferCounters2 = [];
    context.tempVertexBufferCounters1.length = context.tempVertexBufferCounters2.length = largestIndex + 1;
    context.tempVertexBuffers1 = [];
    context.tempVertexBuffers2 = [];
    context.tempVertexBuffers1.length = context.tempVertexBuffers2.length = largestIndex + 1;
    context.tempIndexBuffers = [];
    context.tempIndexBuffers.length = largestIndex + 1;
    for (var i = 0; i <= largestIndex; ++i) {
      context.tempIndexBuffers[i] = null;
      context.tempVertexBufferCounters1[i] = context.tempVertexBufferCounters2[i] = 0;
      var ringbufferLength = GL.numTempVertexBuffersPerSize;
      context.tempVertexBuffers1[i] = [];
      context.tempVertexBuffers2[i] = [];
      var ringbuffer1 = context.tempVertexBuffers1[i];
      var ringbuffer2 = context.tempVertexBuffers2[i];
      ringbuffer1.length = ringbuffer2.length = ringbufferLength;
      for (var j = 0; j < ringbufferLength; ++j) {
        ringbuffer1[j] = ringbuffer2[j] = null;
      }
    }
    if (quads) {
      context.tempQuadIndexBuffer = GLctx.createBuffer();
      context.GLctx.bindBuffer(34963, context.tempQuadIndexBuffer);
      var numIndexes = GL.MAX_TEMP_BUFFER_SIZE >> 1;
      var quadIndexes = new Uint16Array(numIndexes);
      var i = 0, v = 0;
      while (1) {
        quadIndexes[i++] = v;
        if (i >= numIndexes) break;
        quadIndexes[i++] = v + 1;
        if (i >= numIndexes) break;
        quadIndexes[i++] = v + 2;
        if (i >= numIndexes) break;
        quadIndexes[i++] = v;
        if (i >= numIndexes) break;
        quadIndexes[i++] = v + 2;
        if (i >= numIndexes) break;
        quadIndexes[i++] = v + 3;
        if (i >= numIndexes) break;
        v += 4;
      }
      context.GLctx.bufferData(34963, quadIndexes, 35044);
      context.GLctx.bindBuffer(34963, null);
    }
  }, getTempVertexBuffer: (sizeBytes) => {
    var idx = GL.log2ceilLookup(sizeBytes);
    var ringbuffer = GL.currentContext.tempVertexBuffers1[idx];
    var nextFreeBufferIndex = GL.currentContext.tempVertexBufferCounters1[idx];
    GL.currentContext.tempVertexBufferCounters1[idx] = GL.currentContext.tempVertexBufferCounters1[idx] + 1 & GL.numTempVertexBuffersPerSize - 1;
    var vbo = ringbuffer[nextFreeBufferIndex];
    if (vbo) {
      return vbo;
    }
    var prevVBO = GLctx.getParameter(34964);
    ringbuffer[nextFreeBufferIndex] = GLctx.createBuffer();
    GLctx.bindBuffer(34962, ringbuffer[nextFreeBufferIndex]);
    GLctx.bufferData(34962, 1 << idx, 35048);
    GLctx.bindBuffer(34962, prevVBO);
    return ringbuffer[nextFreeBufferIndex];
  }, getTempIndexBuffer: (sizeBytes) => {
    var idx = GL.log2ceilLookup(sizeBytes);
    var ibo = GL.currentContext.tempIndexBuffers[idx];
    if (ibo) {
      return ibo;
    }
    var prevIBO = GLctx.getParameter(34965);
    GL.currentContext.tempIndexBuffers[idx] = GLctx.createBuffer();
    GLctx.bindBuffer(34963, GL.currentContext.tempIndexBuffers[idx]);
    GLctx.bufferData(34963, 1 << idx, 35048);
    GLctx.bindBuffer(34963, prevIBO);
    return GL.currentContext.tempIndexBuffers[idx];
  }, newRenderingFrameStarted: () => {
    if (!GL.currentContext) {
      return;
    }
    var vb = GL.currentContext.tempVertexBuffers1;
    GL.currentContext.tempVertexBuffers1 = GL.currentContext.tempVertexBuffers2;
    GL.currentContext.tempVertexBuffers2 = vb;
    vb = GL.currentContext.tempVertexBufferCounters1;
    GL.currentContext.tempVertexBufferCounters1 = GL.currentContext.tempVertexBufferCounters2;
    GL.currentContext.tempVertexBufferCounters2 = vb;
    var largestIndex = GL.log2ceilLookup(GL.MAX_TEMP_BUFFER_SIZE);
    for (var i = 0; i <= largestIndex; ++i) {
      GL.currentContext.tempVertexBufferCounters1[i] = 0;
    }
  }, getSource: (shader, count, string, length) => {
    var source = "";
    for (var i = 0; i < count; ++i) {
      var len = length ? HEAPU32[length + i * 4 >> 2] : void 0;
      source += UTF8ToString(HEAPU32[string + i * 4 >> 2], len);
    }
    return source;
  }, calcBufLength: (size, type, stride, count) => {
    if (stride > 0) {
      return count * stride;
    }
    var typeSize = GL.byteSizeByType[type - GL.byteSizeByTypeRoot];
    return size * typeSize * count;
  }, preDrawHandleClientVertexAttribBindings: (count) => {
    GL.resetBufferBinding = false;
    for (var i = 0; i < GL.currentContext.maxVertexAttribs; ++i) {
      var cb = GL.currentContext.clientBuffers[i];
      if (!cb.clientside || !cb.enabled) continue;
      assert(count || !GLctx.currentElementArrayBufferBinding, "must use array buffers when using element buffer");
      GL.resetBufferBinding = true;
      var size = GL.calcBufLength(cb.size, cb.type, cb.stride, count);
      var buf = GL.getTempVertexBuffer(size);
      GLctx.bindBuffer(34962, buf);
      webglBufferSubData(34962, 0, size, cb.ptr);
      cb.vertexAttribPointerAdaptor.call(GLctx, i, cb.size, cb.type, cb.normalized, cb.stride, 0);
    }
  }, postDrawHandleClientVertexAttribBindings: () => {
    if (GL.resetBufferBinding) {
      GLctx.bindBuffer(34962, GL.buffers[GLctx.currentArrayBufferBinding]);
    }
  }, createContext: (canvas2, webGLContextAttributes) => {
    if (!canvas2.getContextSafariWebGL2Fixed) {
      let fixedGetContext2 = function(ver, attrs) {
        var gl = canvas2.getContextSafariWebGL2Fixed(ver, attrs);
        return ver == "webgl" == gl instanceof WebGLRenderingContext ? gl : null;
      };
      var fixedGetContext = fixedGetContext2;
      canvas2.getContextSafariWebGL2Fixed = canvas2.getContext;
      canvas2.getContext = fixedGetContext2;
    }
    var ctx = canvas2.getContext("webgl2", webGLContextAttributes);
    if (!ctx) return 0;
    var handle = GL.registerContext(ctx, webGLContextAttributes);
    return handle;
  }, registerContext: (ctx, webGLContextAttributes) => {
    var handle = GL.getNewId(GL.contexts);
    var context = { handle, attributes: webGLContextAttributes, version: webGLContextAttributes.majorVersion, GLctx: ctx };
    if (ctx.canvas) ctx.canvas.GLctxObject = context;
    GL.contexts[handle] = context;
    if (typeof webGLContextAttributes.enableExtensionsByDefault == "undefined" || webGLContextAttributes.enableExtensionsByDefault) {
      GL.initExtensions(context);
    }
    context.maxVertexAttribs = context.GLctx.getParameter(34921);
    context.clientBuffers = [];
    for (var i = 0; i < context.maxVertexAttribs; i++) {
      context.clientBuffers[i] = { enabled: false, clientside: false, size: 0, type: 0, normalized: 0, stride: 0, ptr: 0, vertexAttribPointerAdaptor: null };
    }
    GL.generateTempBuffers(false, context);
    return handle;
  }, makeContextCurrent: (contextHandle) => {
    GL.currentContext = GL.contexts[contextHandle];
    Module2["ctx"] = GLctx = GL.currentContext?.GLctx;
    return !(contextHandle && !GLctx);
  }, getContext: (contextHandle) => GL.contexts[contextHandle], deleteContext: (contextHandle) => {
    if (GL.currentContext === GL.contexts[contextHandle]) {
      GL.currentContext = null;
    }
    if (typeof JSEvents == "object") {
      JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas);
    }
    if (GL.contexts[contextHandle]?.GLctx.canvas) {
      GL.contexts[contextHandle].GLctx.canvas.GLctxObject = void 0;
    }
    GL.contexts[contextHandle] = null;
  }, initExtensions: (context) => {
    context || (context = GL.currentContext);
    if (context.initExtensionsDone) return;
    context.initExtensionsDone = true;
    var GLctx2 = context.GLctx;
    webgl_enable_WEBGL_multi_draw(GLctx2);
    webgl_enable_EXT_polygon_offset_clamp(GLctx2);
    webgl_enable_EXT_clip_control(GLctx2);
    webgl_enable_WEBGL_polygon_mode(GLctx2);
    webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance(GLctx2);
    webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance(GLctx2);
    if (context.version >= 2) {
      GLctx2.disjointTimerQueryExt = GLctx2.getExtension("EXT_disjoint_timer_query_webgl2");
    }
    if (context.version < 2 || !GLctx2.disjointTimerQueryExt) {
      GLctx2.disjointTimerQueryExt = GLctx2.getExtension("EXT_disjoint_timer_query");
    }
    for (var ext of getEmscriptenSupportedExtensions(GLctx2)) {
      if (!ext.includes("lose_context") && !ext.includes("debug")) {
        GLctx2.getExtension(ext);
      }
    }
  } };
  var webglPowerPreferences = ["default", "low-power", "high-performance"];
  var _emscripten_webgl_do_create_context = (target, attributes) => {
    assert(attributes);
    var attr32 = attributes >> 2;
    var powerPreference = HEAP32[attr32 + (8 >> 2)];
    var contextAttributes = { alpha: !!HEAP8[attributes + 0], depth: !!HEAP8[attributes + 1], stencil: !!HEAP8[attributes + 2], antialias: !!HEAP8[attributes + 3], premultipliedAlpha: !!HEAP8[attributes + 4], preserveDrawingBuffer: !!HEAP8[attributes + 5], powerPreference: webglPowerPreferences[powerPreference], failIfMajorPerformanceCaveat: !!HEAP8[attributes + 12], desynchronized: !!HEAP8[attributes + 33], majorVersion: HEAP32[attr32 + (16 >> 2)], minorVersion: HEAP32[attr32 + (20 >> 2)], enableExtensionsByDefault: HEAP8[attributes + 24], explicitSwapControl: HEAP8[attributes + 25], proxyContextToMainThread: HEAP32[attr32 + (28 >> 2)], renderViaOffscreenBackBuffer: HEAP8[attributes + 32] };
    if (contextAttributes.majorVersion !== 1 && contextAttributes.majorVersion !== 2) {
      err(`Invalid WebGL version requested: ${contextAttributes.majorVersion}`);
    }
    if (contextAttributes.majorVersion !== 2) {
      err("WebGL 1 requested but only WebGL 2 is supported (MIN_WEBGL_VERSION is 2)");
    }
    var canvas2 = findCanvasEventTarget(target);
    if (!canvas2) {
      return 0;
    }
    if (contextAttributes.explicitSwapControl) {
      return 0;
    }
    var contextHandle = GL.createContext(canvas2, contextAttributes);
    return contextHandle;
  };
  var _emscripten_webgl_create_context = _emscripten_webgl_do_create_context;
  var _emscripten_webgl_destroy_context = (contextHandle) => {
    if (GL.currentContext == contextHandle) GL.currentContext = 0;
    GL.deleteContext(contextHandle);
  };
  var _emscripten_webgl_make_context_current = (contextHandle) => {
    var success = GL.makeContextCurrent(contextHandle);
    return success ? 0 : -5;
  };
  var ENV = {};
  var getExecutableName = () => thisProgram;
  var getEnvStrings = () => {
    if (!getEnvStrings.strings) {
      var lang = (globalThis.navigator?.language ?? "C").replace("-", "_") + ".UTF-8";
      var env = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: lang, _: getExecutableName() };
      for (var x in ENV) {
        if (ENV[x] === void 0) delete env[x];
        else env[x] = ENV[x];
      }
      var strings = [];
      for (var x in env) {
        strings.push(`${x}=${env[x]}`);
      }
      getEnvStrings.strings = strings;
    }
    return getEnvStrings.strings;
  };
  var _environ_get = (__environ, environ_buf) => {
    var bufSize = 0;
    var envp = 0;
    for (var string of getEnvStrings()) {
      var ptr = environ_buf + bufSize;
      HEAPU32[__environ + envp >> 2] = ptr;
      bufSize += stringToUTF8(string, ptr, Infinity) + 1;
      envp += 4;
    }
    return 0;
  };
  var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
    var strings = getEnvStrings();
    HEAPU32[penviron_count >> 2] = strings.length;
    checkInt32(strings.length);
    var bufSize = 0;
    for (var string of strings) {
      bufSize += lengthBytesUTF8(string) + 1;
    }
    HEAPU32[penviron_buf_size >> 2] = bufSize;
    checkInt32(bufSize);
    return 0;
  };
  var runtimeKeepaliveCounter = 0;
  var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
  var _proc_exit = (code) => {
    EXITSTATUS = code;
    if (!keepRuntimeAlive()) {
      Module2["onExit"]?.(code);
      ABORT = true;
    }
    quit_(code, new ExitStatus(code));
  };
  var exitJS = (status, implicit) => {
    EXITSTATUS = status;
    checkUnflushedContent();
    if (keepRuntimeAlive() && !implicit) {
      var msg = `program exited (with status: ${status}), but keepRuntimeAlive() is set (counter=${runtimeKeepaliveCounter}) due to an async operation, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)`;
      err(msg);
    }
    _proc_exit(status);
  };
  var _exit = exitJS;
  function _fd_close(fd) {
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.close(stream);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  var doReadv = (stream, iov, iovcnt, offset) => {
    var ret = 0;
    for (var i = 0; i < iovcnt; i++) {
      var ptr = HEAPU32[iov >> 2];
      var len = HEAPU32[iov + 4 >> 2];
      iov += 8;
      try {
        var curr = FS.read(stream, HEAP8, ptr, len, offset);
      } catch (e) {
        if (ret > 0 && e instanceof FS.ErrnoError && (e.errno == 6 || e.errno == 6)) {
          break;
        }
        throw e;
      }
      if (curr < 0) return -1;
      ret += curr;
      if (curr < len) break;
      if (typeof offset != "undefined") {
        offset += curr;
      }
    }
    return ret;
  };
  function _fd_read(fd, iov, iovcnt, pnum) {
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doReadv(stream, iov, iovcnt);
      HEAPU32[pnum >> 2] = num;
      checkInt32(num);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  function _fd_seek(fd, offset, whence, newOffset) {
    offset = bigintToI53Checked(offset);
    try {
      if (isNaN(offset)) return 22;
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.llseek(stream, offset, whence);
      HEAP64[newOffset >> 3] = BigInt(stream.position);
      checkInt64(stream.position);
      if (stream.getdents && !offset && whence === 0) stream.getdents = null;
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  var doWritev = (stream, iov, iovcnt, offset) => {
    if (iovcnt == 1) {
      return FS.write(stream, HEAP8, HEAPU32[iov >> 2], HEAPU32[iov + 4 >> 2], offset);
    }
    var total = 0;
    for (var i = 0, p = iov; i < iovcnt; i++, p += 8) {
      total += HEAPU32[p + 4 >> 2];
    }
    var view2 = new Uint8Array(total);
    var voff = 0;
    for (var i = 0; i < iovcnt; i++, iov += 8) {
      var ptr = HEAPU32[iov >> 2];
      var len = HEAPU32[iov + 4 >> 2];
      view2.set(HEAPU8.subarray(ptr, ptr + len), voff);
      voff += len;
    }
    return FS.write(stream, view2, 0, total, offset);
  };
  function _fd_write(fd, iov, iovcnt, pnum) {
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doWritev(stream, iov, iovcnt);
      HEAPU32[pnum >> 2] = num;
      checkInt32(num);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  var _emscripten_glActiveTexture = (x0) => GLctx.activeTexture(x0);
  var _glActiveTexture = _emscripten_glActiveTexture;
  var _emscripten_glAttachShader = (program, shader) => {
    GLctx.attachShader(GL.programs[program], GL.shaders[shader]);
  };
  var _glAttachShader = _emscripten_glAttachShader;
  var _emscripten_glBindBuffer = (target, buffer) => {
    if (buffer && !GL.buffers[buffer]) {
      var b = GLctx.createBuffer();
      b.name = buffer;
      GL.buffers[buffer] = b;
    }
    if (target == 34962) {
      GLctx.currentArrayBufferBinding = buffer;
    } else if (target == 34963) {
      GLctx.currentElementArrayBufferBinding = buffer;
    }
    if (target == 35051) {
      GLctx.currentPixelPackBufferBinding = buffer;
    } else if (target == 35052) {
      GLctx.currentPixelUnpackBufferBinding = buffer;
    }
    GLctx.bindBuffer(target, GL.buffers[buffer]);
  };
  var _glBindBuffer = _emscripten_glBindBuffer;
  var _emscripten_glBindSampler = (unit, sampler) => {
    GLctx.bindSampler(unit, GL.samplers[sampler]);
  };
  var _glBindSampler = _emscripten_glBindSampler;
  var _emscripten_glBindTexture = (target, texture) => {
    GLctx.bindTexture(target, GL.textures[texture]);
  };
  var _glBindTexture = _emscripten_glBindTexture;
  var _emscripten_glBindVertexArray = (vao) => {
    GLctx.bindVertexArray(GL.vaos[vao]);
    var ibo = GLctx.getParameter(34965);
    GLctx.currentElementArrayBufferBinding = ibo ? ibo.name | 0 : 0;
  };
  var _glBindVertexArray = _emscripten_glBindVertexArray;
  var _emscripten_glBlendEquation = (x0) => GLctx.blendEquation(x0);
  var _glBlendEquation = _emscripten_glBlendEquation;
  var _emscripten_glBlendFunc = (x0, x1) => GLctx.blendFunc(x0, x1);
  var _glBlendFunc = _emscripten_glBlendFunc;
  var _emscripten_glBlendFuncSeparate = (x0, x1, x2, x3) => GLctx.blendFuncSeparate(x0, x1, x2, x3);
  var _glBlendFuncSeparate = _emscripten_glBlendFuncSeparate;
  var _emscripten_glBufferData = (target, size, data, usage) => {
    if (true) {
      if (data && size) {
        GLctx.bufferData(target, HEAPU8, usage, data, size);
      } else {
        GLctx.bufferData(target, size, usage);
      }
      return;
    }
  };
  var _glBufferData = _emscripten_glBufferData;
  var _emscripten_glBufferSubData = (target, offset, size, data) => webglBufferSubData(target, offset, size, data);
  var _glBufferSubData = _emscripten_glBufferSubData;
  var _emscripten_glClear = (x0) => GLctx.clear(x0);
  var _glClear = _emscripten_glClear;
  var _emscripten_glClearColor = (x0, x1, x2, x3) => GLctx.clearColor(x0, x1, x2, x3);
  var _glClearColor = _emscripten_glClearColor;
  var _emscripten_glCompileShader = (shader) => {
    GLctx.compileShader(GL.shaders[shader]);
  };
  var _glCompileShader = _emscripten_glCompileShader;
  var _emscripten_glCreateProgram = () => {
    var id = GL.getNewId(GL.programs);
    var program = GLctx.createProgram();
    program.name = id;
    program.maxUniformLength = program.maxAttributeLength = program.maxUniformBlockNameLength = 0;
    program.uniformIdCounter = 1;
    GL.programs[id] = program;
    return id;
  };
  var _glCreateProgram = _emscripten_glCreateProgram;
  var _emscripten_glCreateShader = (shaderType) => {
    var id = GL.getNewId(GL.shaders);
    GL.shaders[id] = GLctx.createShader(shaderType);
    return id;
  };
  var _glCreateShader = _emscripten_glCreateShader;
  var _emscripten_glDeleteBuffers = (n, buffers) => {
    for (var i = 0; i < n; i++) {
      var id = HEAP32[buffers + i * 4 >> 2];
      var buffer = GL.buffers[id];
      if (!buffer) continue;
      GLctx.deleteBuffer(buffer);
      buffer.name = 0;
      GL.buffers[id] = null;
      if (id == GLctx.currentArrayBufferBinding) GLctx.currentArrayBufferBinding = 0;
      if (id == GLctx.currentElementArrayBufferBinding) GLctx.currentElementArrayBufferBinding = 0;
      if (id == GLctx.currentPixelPackBufferBinding) GLctx.currentPixelPackBufferBinding = 0;
      if (id == GLctx.currentPixelUnpackBufferBinding) GLctx.currentPixelUnpackBufferBinding = 0;
    }
  };
  var _glDeleteBuffers = _emscripten_glDeleteBuffers;
  var _emscripten_glDeleteProgram = (id) => {
    if (!id) return;
    var program = GL.programs[id];
    if (!program) {
      GL.recordError(1281);
      return;
    }
    GLctx.deleteProgram(program);
    program.name = 0;
    GL.programs[id] = null;
  };
  var _glDeleteProgram = _emscripten_glDeleteProgram;
  var _emscripten_glDeleteShader = (id) => {
    if (!id) return;
    var shader = GL.shaders[id];
    if (!shader) {
      GL.recordError(1281);
      return;
    }
    GLctx.deleteShader(shader);
    GL.shaders[id] = null;
  };
  var _glDeleteShader = _emscripten_glDeleteShader;
  var _emscripten_glDeleteTextures = (n, textures) => {
    for (var i = 0; i < n; i++) {
      var id = HEAP32[textures + i * 4 >> 2];
      var texture = GL.textures[id];
      if (!texture) continue;
      GLctx.deleteTexture(texture);
      texture.name = 0;
      GL.textures[id] = null;
    }
  };
  var _glDeleteTextures = _emscripten_glDeleteTextures;
  var _emscripten_glDeleteVertexArrays = (n, vaos) => {
    for (var i = 0; i < n; i++) {
      var id = HEAP32[vaos + i * 4 >> 2];
      GLctx.deleteVertexArray(GL.vaos[id]);
      GL.vaos[id] = null;
    }
  };
  var _glDeleteVertexArrays = _emscripten_glDeleteVertexArrays;
  var _emscripten_glDetachShader = (program, shader) => {
    GLctx.detachShader(GL.programs[program], GL.shaders[shader]);
  };
  var _glDetachShader = _emscripten_glDetachShader;
  var _emscripten_glDisable = (x0) => GLctx.disable(x0);
  var _glDisable = _emscripten_glDisable;
  var _emscripten_glDrawArrays = (mode2, first, count) => {
    GL.preDrawHandleClientVertexAttribBindings(first + count);
    GLctx.drawArrays(mode2, first, count);
    GL.postDrawHandleClientVertexAttribBindings();
  };
  var _glDrawArrays = _emscripten_glDrawArrays;
  var _emscripten_glDrawElements = (mode2, count, type, indices) => {
    var buf;
    var vertexes = 0;
    if (!GLctx.currentElementArrayBufferBinding) {
      var size = GL.calcBufLength(1, type, 0, count);
      buf = GL.getTempIndexBuffer(size);
      GLctx.bindBuffer(34963, buf);
      webglBufferSubData(34963, 0, size, indices);
      if (count > 0) {
        for (var i = 0; i < GL.currentContext.maxVertexAttribs; ++i) {
          var cb = GL.currentContext.clientBuffers[i];
          if (cb.clientside && cb.enabled) {
            let arrayClass;
            switch (type) {
              case 5121:
                arrayClass = Uint8Array;
                break;
              case 5123:
                arrayClass = Uint16Array;
                break;
              case 5125:
                arrayClass = Uint32Array;
                break;
              default:
                GL.recordError(1282);
                return;
            }
            vertexes = new arrayClass(HEAPU8.buffer, indices, count).reduce((max, current) => Math.max(max, current)) + 1;
            break;
          }
        }
      }
      indices = 0;
    }
    GL.preDrawHandleClientVertexAttribBindings(vertexes);
    GLctx.drawElements(mode2, count, type, indices);
    GL.postDrawHandleClientVertexAttribBindings();
    if (!GLctx.currentElementArrayBufferBinding) {
      GLctx.bindBuffer(34963, null);
    }
  };
  var _glDrawElements = _emscripten_glDrawElements;
  var _emscripten_glEnable = (x0) => GLctx.enable(x0);
  var _glEnable = _emscripten_glEnable;
  var _emscripten_glEnableVertexAttribArray = (index) => {
    var cb = GL.currentContext.clientBuffers[index];
    cb.enabled = true;
    GLctx.enableVertexAttribArray(index);
  };
  var _glEnableVertexAttribArray = _emscripten_glEnableVertexAttribArray;
  var _emscripten_glFlush = () => GLctx.flush();
  var _glFlush = _emscripten_glFlush;
  var _emscripten_glGenBuffers = (n, buffers) => {
    GL.genObject(n, buffers, "createBuffer", GL.buffers);
  };
  var _glGenBuffers = _emscripten_glGenBuffers;
  var _emscripten_glGenTextures = (n, textures) => {
    GL.genObject(n, textures, "createTexture", GL.textures);
  };
  var _glGenTextures = _emscripten_glGenTextures;
  var _emscripten_glGenVertexArrays = (n, arrays) => {
    GL.genObject(n, arrays, "createVertexArray", GL.vaos);
  };
  var _glGenVertexArrays = _emscripten_glGenVertexArrays;
  var _emscripten_glGetAttribLocation = (program, name) => GLctx.getAttribLocation(GL.programs[program], UTF8ToString(name));
  var _glGetAttribLocation = _emscripten_glGetAttribLocation;
  var readI53FromI64 = (ptr) => HEAPU32[ptr >> 2] + HEAP32[ptr + 4 >> 2] * 4294967296;
  var readI53FromU64 = (ptr) => HEAPU32[ptr >> 2] + HEAPU32[ptr + 4 >> 2] * 4294967296;
  var writeI53ToI64 = (ptr, num) => {
    HEAPU32[ptr >> 2] = num;
    checkInt32(num);
    var lower = HEAPU32[ptr >> 2];
    HEAPU32[ptr + 4 >> 2] = (num - lower) / 4294967296;
    checkInt32((num - lower) / 4294967296);
    var deserialized = num >= 0 ? readI53FromU64(ptr) : readI53FromI64(ptr);
    var offset = ptr >> 2;
    if (deserialized != num) warnOnce(`writeI53ToI64() out of range: serialized JS Number ${num} to Wasm heap as bytes lo=${ptrToString(HEAPU32[offset])}, hi=${ptrToString(HEAPU32[offset + 1])}, which deserializes back to ${deserialized} instead!`);
  };
  var webglGetExtensions = () => {
    var exts = getEmscriptenSupportedExtensions(GLctx);
    exts = exts.concat(exts.map((e) => "GL_" + e));
    return exts;
  };
  var HEAPF32;
  var emscriptenWebGLGet = (name_, p, type) => {
    if (!p) {
      GL.recordError(1281);
      return;
    }
    var ret = void 0;
    switch (name_) {
      case 36346:
        ret = 1;
        break;
      case 36344:
        if (type != 0 && type != 1) {
          GL.recordError(1280);
        }
        return;
      case 34814:
      case 36345:
        ret = 0;
        break;
      case 34466:
        var formats = GLctx.getParameter(34467);
        ret = formats ? formats.length : 0;
        break;
      case 33309:
        if (GL.currentContext.version < 2) {
          GL.recordError(1282);
          return;
        }
        ret = webglGetExtensions().length;
        break;
      case 33307:
      case 33308:
        if (GL.currentContext.version < 2) {
          GL.recordError(1280);
          return;
        }
        ret = name_ == 33307 ? 3 : 0;
        break;
    }
    if (ret === void 0) {
      var result = GLctx.getParameter(name_);
      switch (typeof result) {
        case "number":
          ret = result;
          break;
        case "boolean":
          ret = result ? 1 : 0;
          break;
        case "string":
          GL.recordError(1280);
          return;
        case "object":
          if (result === null) {
            switch (name_) {
              case 34964:
              case 35725:
              case 34965:
              case 36006:
              case 36007:
              case 32873:
              case 34229:
              case 36662:
              case 36663:
              case 35053:
              case 35055:
              case 36010:
              case 35097:
              case 35869:
              case 32874:
              case 36389:
              case 35983:
              case 35368:
              case 34068: {
                ret = 0;
                break;
              }
              default: {
                GL.recordError(1280);
                return;
              }
            }
          } else if (result instanceof Float32Array || result instanceof Uint32Array || result instanceof Int32Array || result instanceof Array) {
            for (var i = 0; i < result.length; ++i) {
              switch (type) {
                case 0:
                  HEAP32[p + i * 4 >> 2] = result[i];
                  checkInt32(result[i]);
                  break;
                case 2:
                  HEAPF32[p + i * 4 >> 2] = result[i];
                  break;
                case 4:
                  HEAP8[p + i] = result[i] ? 1 : 0;
                  checkInt8(result[i] ? 1 : 0);
                  break;
              }
            }
            return;
          } else {
            try {
              ret = result.name | 0;
            } catch (e) {
              GL.recordError(1280);
              err(`GL_INVALID_ENUM in glGet${type}v: Unknown object returned from WebGL getParameter(${name_})! (error: ${e})`);
              return;
            }
          }
          break;
        default:
          GL.recordError(1280);
          err(`GL_INVALID_ENUM in glGet${type}v: Native code calling glGet${type}v(${name_}) and it returns ${result} of type ${typeof result}!`);
          return;
      }
    }
    switch (type) {
      case 1:
        writeI53ToI64(p, ret);
        break;
      case 0:
        HEAP32[p >> 2] = ret;
        checkInt32(ret);
        break;
      case 2:
        HEAPF32[p >> 2] = ret;
        break;
      case 4:
        HEAP8[p] = ret ? 1 : 0;
        checkInt8(ret ? 1 : 0);
        break;
    }
  };
  var _emscripten_glGetIntegerv = (name_, p) => emscriptenWebGLGet(name_, p, 0);
  var _glGetIntegerv = _emscripten_glGetIntegerv;
  var _emscripten_glGetProgramInfoLog = (program, maxLength, length, infoLog) => {
    var log = GLctx.getProgramInfoLog(GL.programs[program]);
    if (log === null) log = "(unknown error)";
    var numBytesWrittenExclNull = maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
    if (length) HEAP32[length >> 2] = numBytesWrittenExclNull;
    checkInt32(numBytesWrittenExclNull);
  };
  var _glGetProgramInfoLog = _emscripten_glGetProgramInfoLog;
  var _emscripten_glGetProgramiv = (program, pname, p) => {
    if (!p) {
      GL.recordError(1281);
      return;
    }
    if (program >= GL.counter) {
      GL.recordError(1281);
      return;
    }
    program = GL.programs[program];
    if (pname == 35716) {
      var log = GLctx.getProgramInfoLog(program);
      if (log === null) log = "(unknown error)";
      HEAP32[p >> 2] = log.length + 1;
      checkInt32(log.length + 1);
    } else if (pname == 35719) {
      if (!program.maxUniformLength) {
        var numActiveUniforms = GLctx.getProgramParameter(program, 35718);
        for (var i = 0; i < numActiveUniforms; ++i) {
          program.maxUniformLength = Math.max(program.maxUniformLength, GLctx.getActiveUniform(program, i).name.length + 1);
        }
      }
      HEAP32[p >> 2] = program.maxUniformLength;
      checkInt32(program.maxUniformLength);
    } else if (pname == 35722) {
      if (!program.maxAttributeLength) {
        var numActiveAttributes = GLctx.getProgramParameter(program, 35721);
        for (var i = 0; i < numActiveAttributes; ++i) {
          program.maxAttributeLength = Math.max(program.maxAttributeLength, GLctx.getActiveAttrib(program, i).name.length + 1);
        }
      }
      HEAP32[p >> 2] = program.maxAttributeLength;
      checkInt32(program.maxAttributeLength);
    } else if (pname == 35381) {
      if (!program.maxUniformBlockNameLength) {
        var numActiveUniformBlocks = GLctx.getProgramParameter(program, 35382);
        for (var i = 0; i < numActiveUniformBlocks; ++i) {
          program.maxUniformBlockNameLength = Math.max(program.maxUniformBlockNameLength, GLctx.getActiveUniformBlockName(program, i).length + 1);
        }
      }
      HEAP32[p >> 2] = program.maxUniformBlockNameLength;
      checkInt32(program.maxUniformBlockNameLength);
    } else {
      HEAP32[p >> 2] = GLctx.getProgramParameter(program, pname);
      checkInt32(GLctx.getProgramParameter(program, pname));
    }
  };
  var _glGetProgramiv = _emscripten_glGetProgramiv;
  var _emscripten_glGetShaderInfoLog = (shader, maxLength, length, infoLog) => {
    var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
    if (log === null) log = "(unknown error)";
    var numBytesWrittenExclNull = maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
    if (length) HEAP32[length >> 2] = numBytesWrittenExclNull;
    checkInt32(numBytesWrittenExclNull);
  };
  var _glGetShaderInfoLog = _emscripten_glGetShaderInfoLog;
  var _emscripten_glGetShaderiv = (shader, pname, p) => {
    if (!p) {
      GL.recordError(1281);
      return;
    }
    if (pname == 35716) {
      var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
      if (log === null) log = "(unknown error)";
      var logLength = log ? log.length + 1 : 0;
      HEAP32[p >> 2] = logLength;
      checkInt32(logLength);
    } else if (pname == 35720) {
      var source = GLctx.getShaderSource(GL.shaders[shader]);
      var sourceLength = source ? source.length + 1 : 0;
      HEAP32[p >> 2] = sourceLength;
      checkInt32(sourceLength);
    } else {
      HEAP32[p >> 2] = GLctx.getShaderParameter(GL.shaders[shader], pname);
      checkInt32(GLctx.getShaderParameter(GL.shaders[shader], pname));
    }
  };
  var _glGetShaderiv = _emscripten_glGetShaderiv;
  var stringToNewUTF8 = (str) => {
    var size = lengthBytesUTF8(str) + 1;
    var ret = _malloc(size);
    if (ret) stringToUTF8(str, ret, size);
    return ret;
  };
  var _emscripten_glGetString = (name_) => {
    var ret = GL.stringCache[name_];
    if (!ret) {
      switch (name_) {
        case 7939:
          ret = stringToNewUTF8(webglGetExtensions().join(" "));
          break;
        case 7936:
        case 7937:
        case 37445:
        case 37446:
          var s = GLctx.getParameter(name_);
          if (!s) {
            GL.recordError(1280);
          }
          ret = s ? stringToNewUTF8(s) : 0;
          break;
        case 7938:
          var webGLVersion = GLctx.getParameter(7938);
          var glVersion = `OpenGL ES 2.0 (${webGLVersion})`;
          if (true) glVersion = `OpenGL ES 3.0 (${webGLVersion})`;
          ret = stringToNewUTF8(glVersion);
          break;
        case 35724:
          var glslVersion = GLctx.getParameter(35724);
          var ver_re = /^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/;
          var ver_num = glslVersion.match(ver_re);
          if (ver_num !== null) {
            if (ver_num[1].length == 3) ver_num[1] = ver_num[1] + "0";
            glslVersion = `OpenGL ES GLSL ES ${ver_num[1]} (${glslVersion})`;
          }
          ret = stringToNewUTF8(glslVersion);
          break;
        default:
          GL.recordError(1280);
      }
      GL.stringCache[name_] = ret;
    }
    return ret;
  };
  var _glGetString = _emscripten_glGetString;
  var jstoi_q = (str) => parseInt(str);
  var webglGetLeftBracePos = (name) => name.slice(-1) == "]" && name.lastIndexOf("[");
  var webglPrepareUniformLocationsBeforeFirstUse = (program) => {
    var uniformLocsById = program.uniformLocsById, uniformSizeAndIdsByName = program.uniformSizeAndIdsByName, i, j;
    if (!uniformLocsById) {
      program.uniformLocsById = uniformLocsById = {};
      program.uniformArrayNamesById = {};
      var numActiveUniforms = GLctx.getProgramParameter(program, 35718);
      for (i = 0; i < numActiveUniforms; ++i) {
        var u = GLctx.getActiveUniform(program, i);
        var nm = u.name;
        var sz = u.size;
        var lb = webglGetLeftBracePos(nm);
        var arrayName = lb > 0 ? nm.slice(0, lb) : nm;
        var id = program.uniformIdCounter;
        program.uniformIdCounter += sz;
        uniformSizeAndIdsByName[arrayName] = [sz, id];
        for (j = 0; j < sz; ++j) {
          uniformLocsById[id] = j;
          program.uniformArrayNamesById[id++] = arrayName;
        }
      }
    }
  };
  var _emscripten_glGetUniformLocation = (program, name) => {
    name = UTF8ToString(name);
    if (program = GL.programs[program]) {
      webglPrepareUniformLocationsBeforeFirstUse(program);
      var uniformLocsById = program.uniformLocsById;
      var arrayIndex = 0;
      var uniformBaseName = name;
      var leftBrace = webglGetLeftBracePos(name);
      if (leftBrace > 0) {
        arrayIndex = jstoi_q(name.slice(leftBrace + 1)) >>> 0;
        uniformBaseName = name.slice(0, leftBrace);
      }
      var sizeAndId = program.uniformSizeAndIdsByName[uniformBaseName];
      if (sizeAndId && arrayIndex < sizeAndId[0]) {
        arrayIndex += sizeAndId[1];
        if (uniformLocsById[arrayIndex] = uniformLocsById[arrayIndex] || GLctx.getUniformLocation(program, name)) {
          return arrayIndex;
        }
      }
    } else {
      GL.recordError(1281);
    }
    return -1;
  };
  var _glGetUniformLocation = _emscripten_glGetUniformLocation;
  var _emscripten_glLinkProgram = (program) => {
    program = GL.programs[program];
    GLctx.linkProgram(program);
    program.uniformLocsById = 0;
    program.uniformSizeAndIdsByName = {};
  };
  var _glLinkProgram = _emscripten_glLinkProgram;
  var _emscripten_glPixelStorei = (pname, param) => {
    if (pname == 3317) {
      GL.unpackAlignment = param;
    } else if (pname == 3314) {
      GL.unpackRowLength = param;
    }
    GLctx.pixelStorei(pname, param);
  };
  var _glPixelStorei = _emscripten_glPixelStorei;
  var _emscripten_glScissor = (x0, x1, x2, x3) => GLctx.scissor(x0, x1, x2, x3);
  var _glScissor = _emscripten_glScissor;
  var _emscripten_glShaderSource = (shader, count, string, length) => {
    var source = GL.getSource(shader, count, string, length);
    GLctx.shaderSource(GL.shaders[shader], source);
  };
  var _glShaderSource = _emscripten_glShaderSource;
  var computeUnpackAlignedImageSize = (width, height, sizePerPixel) => {
    function roundedToNextMultipleOf(x, y) {
      return x + y - 1 & -y;
    }
    var plainRowSize = (GL.unpackRowLength || width) * sizePerPixel;
    var alignedRowSize = roundedToNextMultipleOf(plainRowSize, GL.unpackAlignment);
    return height * alignedRowSize;
  };
  var colorChannelsInGlTextureFormat = (format) => {
    var colorChannels = { 5: 3, 6: 4, 8: 2, 29502: 3, 29504: 4, 26917: 2, 26918: 2, 29846: 3, 29847: 4 };
    return colorChannels[format - 6402] || 1;
  };
  var HEAPU16;
  var heapObjectForWebGLType = (type) => {
    type -= 5120;
    if (type == 0) return HEAP8;
    if (type == 1) return HEAPU8;
    if (type == 2) return HEAP16;
    if (type == 4) return HEAP32;
    if (type == 6) return HEAPF32;
    if (type == 5 || type == 28922 || type == 28520 || type == 30779 || type == 30782) return HEAPU32;
    return HEAPU16;
  };
  var toTypedArrayIndex = (pointer, heap) => pointer >>> 31 - Math.clz32(heap.BYTES_PER_ELEMENT);
  var emscriptenWebGLGetTexPixelData = (type, format, width, height, pixels) => {
    var heap = heapObjectForWebGLType(type);
    var sizePerPixel = colorChannelsInGlTextureFormat(format) * heap.BYTES_PER_ELEMENT;
    var bytes2 = computeUnpackAlignedImageSize(width, height, sizePerPixel);
    return heap.subarray(toTypedArrayIndex(pixels, heap), toTypedArrayIndex(pixels + bytes2, heap));
  };
  var _emscripten_glTexImage2D = (target, level, internalFormat, width, height, border, format, type, pixels) => {
    if (true) {
      if (GLctx.currentPixelUnpackBufferBinding) {
        GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels);
        return;
      }
      if (pixels) {
        var heap = heapObjectForWebGLType(type);
        var index = toTypedArrayIndex(pixels, heap);
        GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, heap, index);
        return;
      }
    }
    var pixelData = pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels) : null;
    GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixelData);
  };
  var _glTexImage2D = _emscripten_glTexImage2D;
  var _emscripten_glTexParameteri = (x0, x1, x2) => GLctx.texParameteri(x0, x1, x2);
  var _glTexParameteri = _emscripten_glTexParameteri;
  var _emscripten_glTexSubImage2D = (target, level, xoffset, yoffset, width, height, format, type, pixels) => {
    if (true) {
      if (GLctx.currentPixelUnpackBufferBinding) {
        GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels);
        return;
      }
      if (pixels) {
        var heap = heapObjectForWebGLType(type);
        GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, heap, toTypedArrayIndex(pixels, heap));
        return;
      }
    }
    var pixelData = pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels) : null;
    GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixelData);
  };
  var _glTexSubImage2D = _emscripten_glTexSubImage2D;
  var webglGetProgramUniformLocation = (program, location2) => {
    if (program) {
      var webglLoc = program.uniformLocsById[location2];
      if (typeof webglLoc == "number") {
        program.uniformLocsById[location2] = webglLoc = GLctx.getUniformLocation(program, program.uniformArrayNamesById[location2] + (webglLoc > 0 ? `[${webglLoc}]` : ""));
      }
      return webglLoc;
    } else {
      GL.recordError(1282);
    }
  };
  var webglGetUniformLocation = (location2) => webglGetProgramUniformLocation(GLctx.currentProgram, location2);
  var _emscripten_glUniform1i = (location2, v0) => {
    GLctx.uniform1i(webglGetUniformLocation(location2), v0);
  };
  var _glUniform1i = _emscripten_glUniform1i;
  var _emscripten_glUniformMatrix4fv = (location2, count, transpose, value) => {
    count && GLctx.uniformMatrix4fv(webglGetUniformLocation(location2), !!transpose, HEAPF32, value >> 2, count * 16);
  };
  var _glUniformMatrix4fv = _emscripten_glUniformMatrix4fv;
  var _emscripten_glUseProgram = (program) => {
    program = GL.programs[program];
    GLctx.useProgram(program);
    GLctx.currentProgram = program;
  };
  var _glUseProgram = _emscripten_glUseProgram;
  var _emscripten_glVertexAttribPointer = (index, size, type, normalized, stride, ptr) => {
    var cb = GL.currentContext.clientBuffers[index];
    if (!GLctx.currentArrayBufferBinding) {
      cb.size = size;
      cb.type = type;
      cb.normalized = normalized;
      cb.stride = stride;
      cb.ptr = ptr;
      cb.clientside = true;
      cb.vertexAttribPointerAdaptor = function(index2, size2, type2, normalized2, stride2, ptr2) {
        this.vertexAttribPointer(index2, size2, type2, normalized2, stride2, ptr2);
      };
      return;
    }
    cb.clientside = false;
    GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr);
  };
  var _glVertexAttribPointer = _emscripten_glVertexAttribPointer;
  var _emscripten_glViewport = (x0, x1, x2, x3) => GLctx.viewport(x0, x1, x2, x3);
  var _glViewport = _emscripten_glViewport;
  var _llvm_eh_typeid_for = (type) => type;
  var wasmTableMirror = [];
  var runAndAbortIfError = (func) => {
    try {
      return func();
    } catch (e) {
      abort(e);
    }
  };
  var handleException = (e) => {
    if (e instanceof ExitStatus || e == "unwind") {
      return EXITSTATUS;
    }
    checkStackCookie();
    if (e instanceof WebAssembly.RuntimeError) {
      if (_emscripten_stack_get_current() <= 0) {
        err("Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to 1048576)");
      }
    }
    quit_(1, e);
  };
  var maybeExit = () => {
    if (!keepRuntimeAlive()) {
      try {
        _exit(EXITSTATUS);
      } catch (e) {
        handleException(e);
      }
    }
  };
  var callUserCallback = (func, ...args) => {
    if (ABORT) {
      err("user callback triggered after runtime exited or application aborted.  Ignoring.");
      return;
    }
    try {
      return func(...args);
    } catch (e) {
      handleException(e);
    } finally {
      maybeExit();
    }
  };
  var createNamedFunction = (name, func) => Object.defineProperty(func, "name", { value: name });
  var runtimeKeepalivePush = () => {
    runtimeKeepaliveCounter += 1;
  };
  var runtimeKeepalivePop = () => {
    assert(runtimeKeepaliveCounter > 0);
    runtimeKeepaliveCounter -= 1;
  };
  var Asyncify = { instrumentWasmImports(imports) {
    var importPattern = /^(invoke_.*|__asyncjs__.*)$/;
    for (let [x, original] of Object.entries(imports)) {
      if (typeof original == "function") {
        let isAsyncifyImport = original.isAsync || importPattern.test(x);
        imports[x] = (...args) => {
          var originalAsyncifyState = Asyncify.state;
          try {
            return original(...args);
          } finally {
            var changedToDisabled = originalAsyncifyState === Asyncify.State.Normal && Asyncify.state === Asyncify.State.Disabled;
            var ignoredInvoke = x.startsWith("invoke_") && true;
            if (Asyncify.state !== originalAsyncifyState && !isAsyncifyImport && !changedToDisabled && !ignoredInvoke) {
              abort(`import ${x} was not in ASYNCIFY_IMPORTS, but changed the state`);
            }
          }
        };
      }
    }
  }, instrumentFunction(original) {
    var wrapper = (...args) => {
      Asyncify.exportCallStack.push(original);
      try {
        return original(...args);
      } finally {
        if (!ABORT) {
          var top = Asyncify.exportCallStack.pop();
          assert(top === original);
          Asyncify.maybeStopUnwind();
        }
      }
    };
    Asyncify.funcWrappers.set(original, wrapper);
    wrapper = createNamedFunction(`__asyncify_wrapper_${original.name}`, wrapper);
    return wrapper;
  }, instrumentWasmExports(exports) {
    var ret = {};
    for (let [x, original] of Object.entries(exports)) {
      if (typeof original == "function") {
        var wrapper = Asyncify.instrumentFunction(original);
        ret[x] = wrapper;
      } else {
        ret[x] = original;
      }
    }
    return ret;
  }, State: { Normal: 0, Unwinding: 1, Rewinding: 2, Disabled: 3 }, state: 0, StackSize: 4096, currData: null, handleSleepReturnValue: 0, exportCallStack: [], callstackFuncToId: /* @__PURE__ */ new Map(), callStackIdToFunc: /* @__PURE__ */ new Map(), funcWrappers: /* @__PURE__ */ new Map(), callStackId: 0, asyncPromiseHandlers: null, sleepCallbacks: [], getCallStackId(func) {
    assert(func);
    if (!Asyncify.callstackFuncToId.has(func)) {
      var id = Asyncify.callStackId++;
      Asyncify.callstackFuncToId.set(func, id);
      Asyncify.callStackIdToFunc.set(id, func);
    }
    return Asyncify.callstackFuncToId.get(func);
  }, maybeStopUnwind() {
    if (Asyncify.currData && Asyncify.state === Asyncify.State.Unwinding && !Asyncify.exportCallStack.length) {
      Asyncify.state = Asyncify.State.Normal;
      runAndAbortIfError(_asyncify_stop_unwind);
      if (typeof Fibers != "undefined") {
        Fibers.trampoline();
      }
    }
  }, whenDone() {
    assert(Asyncify.currData, "tried to wait for an async operation when none is in progress");
    assert(!Asyncify.asyncPromiseHandlers, "cannot have multiple async operations in flight at once");
    return new Promise((resolve, reject) => {
      Asyncify.asyncPromiseHandlers = { resolve, reject };
    });
  }, allocateData() {
    var ptr = _malloc(12 + Asyncify.StackSize);
    Asyncify.setDataHeader(ptr, ptr + 12, Asyncify.StackSize);
    Asyncify.setDataRewindFunc(ptr);
    return ptr;
  }, setDataHeader(ptr, stack, stackSize) {
    HEAPU32[ptr >> 2] = stack;
    HEAPU32[ptr + 4 >> 2] = stack + stackSize;
  }, setDataRewindFunc(ptr) {
    var bottomOfCallStack = Asyncify.exportCallStack[0];
    assert(bottomOfCallStack, "exportCallStack is empty");
    var rewindId = Asyncify.getCallStackId(bottomOfCallStack);
    HEAP32[ptr + 8 >> 2] = rewindId;
    checkInt32(rewindId);
  }, getDataRewindFunc(ptr) {
    var id = HEAP32[ptr + 8 >> 2];
    var func = Asyncify.callStackIdToFunc.get(id);
    assert(func, `id ${id} not found in callStackIdToFunc`);
    return func;
  }, doRewind(ptr) {
    var original = Asyncify.getDataRewindFunc(ptr);
    var func = Asyncify.funcWrappers.get(original);
    assert(original);
    assert(func);
    return callUserCallback(func);
  }, handleSleep(startAsync) {
    assert(Asyncify.state !== Asyncify.State.Disabled, "handleSleep called after Asyncify was shut down");
    if (ABORT) return;
    if (Asyncify.state === Asyncify.State.Normal) {
      var reachedCallback = false;
      var reachedAfterCallback = false;
      startAsync((handleSleepReturnValue = 0) => {
        assert(["undefined", "number", "boolean", "bigint"].includes(typeof handleSleepReturnValue), `invalid type for handleSleepReturnValue: '${typeof handleSleepReturnValue}'`);
        if (ABORT) return;
        Asyncify.handleSleepReturnValue = handleSleepReturnValue;
        reachedCallback = true;
        if (!reachedAfterCallback) {
          return;
        }
        assert(!Asyncify.exportCallStack.length, "waking up (starting to rewind) must be done from JS, without compiled code on the stack");
        Asyncify.state = Asyncify.State.Rewinding;
        runAndAbortIfError(() => _asyncify_start_rewind(Asyncify.currData));
        if (typeof MainLoop != "undefined" && MainLoop && MainLoop.func) {
          MainLoop.resume();
        }
        var asyncWasmReturnValue, isError = false;
        try {
          asyncWasmReturnValue = Asyncify.doRewind(Asyncify.currData);
        } catch (err2) {
          asyncWasmReturnValue = err2;
          isError = true;
        }
        var handled = false;
        if (!Asyncify.currData) {
          var asyncPromiseHandlers = Asyncify.asyncPromiseHandlers;
          if (asyncPromiseHandlers) {
            Asyncify.asyncPromiseHandlers = null;
            (isError ? asyncPromiseHandlers.reject : asyncPromiseHandlers.resolve)(asyncWasmReturnValue);
            handled = true;
          }
        }
        if (isError && !handled) {
          throw asyncWasmReturnValue;
        }
      });
      reachedAfterCallback = true;
      if (!reachedCallback) {
        Asyncify.state = Asyncify.State.Unwinding;
        Asyncify.currData = Asyncify.allocateData();
        if (typeof MainLoop != "undefined" && MainLoop && MainLoop.func) {
          MainLoop.pause();
        }
        runAndAbortIfError(() => _asyncify_start_unwind(Asyncify.currData));
      }
    } else if (Asyncify.state === Asyncify.State.Rewinding) {
      Asyncify.state = Asyncify.State.Normal;
      runAndAbortIfError(_asyncify_stop_rewind);
      _free(Asyncify.currData);
      Asyncify.currData = null;
      for (var cb of Asyncify.sleepCallbacks) {
        callUserCallback(cb);
      }
    } else {
      abort(`invalid state: ${Asyncify.state}`);
    }
    return Asyncify.handleSleepReturnValue;
  }, handleAsync: (startAsync) => Asyncify.handleSleep(async (wakeUp) => {
    wakeUp(await startAsync());
  }) };
  var getCFunc = (ident) => {
    var func = Module2["_" + ident];
    assert(func, `Cannot call unknown function ${ident}, make sure it is exported`);
    return func;
  };
  var writeArrayToMemory = (array, buffer) => {
    assert(array.length >= 0, "writeArrayToMemory array must have a length (should be an array or typed array)");
    HEAP8.set(array, buffer);
  };
  var stringToUTF8OnStack = (str) => {
    var size = lengthBytesUTF8(str) + 1;
    var ret = stackAlloc(size);
    stringToUTF8(str, ret, size);
    return ret;
  };
  var ccall = (ident, returnType, argTypes, args, opts) => {
    var toC = { string: (str) => {
      var ret2 = 0;
      if (str !== null && str !== void 0 && str !== 0) {
        ret2 = stringToUTF8OnStack(str);
      }
      return ret2;
    }, array: (arr) => {
      var ret2 = stackAlloc(arr.length);
      writeArrayToMemory(arr, ret2);
      return ret2;
    } };
    function convertReturnValue(ret2) {
      if (returnType === "string") {
        return UTF8ToString(ret2);
      }
      if (returnType === "boolean") return Boolean(ret2);
      return ret2;
    }
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    assert(returnType !== "array", 'return type should not be "array"');
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (!stack) stack = stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var previousAsync = Asyncify.currData;
    var ret = func(...cArgs);
    function onDone(ret2) {
      runtimeKeepalivePop();
      if (stack) stackRestore(stack);
      return convertReturnValue(ret2);
    }
    var asyncMode = opts?.async;
    runtimeKeepalivePush();
    if (Asyncify.currData != previousAsync) {
      assert(!(previousAsync && Asyncify.currData), "We cannot start an async operation when one is already in flight");
      assert(!(previousAsync && !Asyncify.currData), "We cannot stop an async operation in flight");
      assert(asyncMode, `The call to ${ident} is running asynchronously. If this was intended, add the async option to the ccall/cwrap call.`);
      return Asyncify.whenDone().then(onDone);
    }
    ret = onDone(ret);
    if (asyncMode) return Promise.resolve(ret);
    return ret;
  };
  var cwrap = (ident, returnType, argTypes, opts) => (...args) => ccall(ident, returnType, argTypes, args, opts);
  FS.createPreloadedFile = FS_createPreloadedFile;
  FS.preloadFile = FS_preloadFile;
  FS.staticInit();
  registerPreMainLoop(() => GL.newRenderingFrameStarted());
  {
    if (Module2["noExitRuntime"]) noExitRuntime = Module2["noExitRuntime"];
    if (Module2["print"]) out = Module2["print"];
    if (Module2["printErr"]) err = Module2["printErr"];
    checkIncomingModuleAPI();
    if (Module2["arguments"]) programArgs = Module2["arguments"];
    if (Module2["thisProgram"]) thisProgram = Module2["thisProgram"];
    assert(typeof Module2["memoryInitializerPrefixURL"] == "undefined", "Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead");
    assert(typeof Module2["pthreadMainPrefixURL"] == "undefined", "Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead");
    assert(typeof Module2["cdInitializerPrefixURL"] == "undefined", "Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead");
    assert(typeof Module2["filePackagePrefixURL"] == "undefined", "Module.filePackagePrefixURL option was removed, use Module.locateFile instead");
    assert(typeof Module2["read"] == "undefined", "Module.read option was removed");
    assert(typeof Module2["readAsync"] == "undefined", "Module.readAsync option was removed (modify readAsync in JS)");
    assert(typeof Module2["readBinary"] == "undefined", "Module.readBinary option was removed (modify readBinary in JS)");
    assert(typeof Module2["setWindowTitle"] == "undefined", "Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)");
    assert(typeof Module2["TOTAL_MEMORY"] == "undefined", "Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY");
    assert(typeof Module2["ENVIRONMENT"] == "undefined", "Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)");
    assert(typeof Module2["STACK_SIZE"] == "undefined", "STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time");
    assert(typeof Module2["wasmMemory"] == "undefined", "Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally");
    assert(typeof Module2["INITIAL_MEMORY"] == "undefined", "Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically");
    var preInit = Module2["preInit"];
    if (preInit) {
      if (typeof preInit == "function") Module2["preInit"] = preInit = [preInit];
      while (preInit.length > 0) {
        preInit.shift()();
      }
    }
    consumedModuleProp("preInit");
  }
  Module2["ccall"] = ccall;
  Module2["cwrap"] = cwrap;
  Module2["UTF8ToString"] = UTF8ToString;
  var missingLibrarySymbols = ["writeI53ToI64Clamped", "writeI53ToI64Signaling", "writeI53ToU64Clamped", "writeI53ToU64Signaling", "convertI32PairToI53", "convertI32PairToI53Checked", "convertU32PairToI53", "getTempRet0", "zeroMemory", "withStackSave", "inetPton4", "inetNtop4", "inetPton6", "inetNtop6", "readSockaddr", "writeSockaddr", "readEmAsmArgs", "autoResumeAudioContext", "getDynCaller", "asmjsMangle", "HandleAllocator", "addOnInit", "addOnPostCtor", "addOnPreMain", "addOnExit", "STACK_SIZE", "STACK_ALIGN", "POINTER_SIZE", "ASSERTIONS", "convertJsFunctionToWasm", "getEmptyTableSlot", "updateTableMap", "getFunctionAddress", "addFunction", "removeFunction", "setValue", "getValue", "intArrayToString", "AsciiToString", "stringToAscii", "UTF16ToString", "stringToUTF16", "lengthBytesUTF16", "UTF32ToString", "stringToUTF32", "lengthBytesUTF32", "registerKeyEventCallback", "getBoundingClientRect", "fillMouseEventData", "registerMouseEventCallback", "registerWheelEventCallback", "registerUiEventCallback", "registerFocusEventCallback", "fillDeviceOrientationEventData", "registerDeviceOrientationEventCallback", "fillDeviceMotionEventData", "registerDeviceMotionEventCallback", "screenOrientation", "fillOrientationChangeEventData", "registerOrientationChangeEventCallback", "fillFullscreenChangeEventData", "registerFullscreenChangeEventCallback", "callCanvasResizedCallback", "JSEvents_requestFullscreen", "JSEvents_resizeCanvasForFullscreen", "registerRestoreOldStyle", "hideEverythingExceptGivenElement", "restoreHiddenElements", "setLetterbox", "currentFullscreenStrategy", "softFullscreenResizeWebGLRenderTarget", "doRequestFullscreen", "fillPointerlockChangeEventData", "registerPointerlockChangeEventCallback", "registerPointerlockErrorEventCallback", "requestPointerLock", "fillVisibilityChangeEventData", "registerVisibilityChangeEventCallback", "registerTouchEventCallback", "fillGamepadEventData", "registerGamepadEventCallback", "registerBeforeUnloadEventCallback", "fillBatteryEventData", "registerBatteryEventCallback", "setCanvasElementSize", "getCanvasElementSize", "jsStackTrace", "getCallstack", "convertPCtoSourceLocation", "wasiRightsToMuslOFlags", "wasiOFlagsToMuslOFlags", "safeSetTimeout", "safeClearTimeout", "setImmediateWrapped", "safeRequestAnimationFrame", "clearImmediateWrapped", "registerPostMainLoop", "getPromise", "makePromise", "addPromise", "idsToPromises", "makePromiseCallback", "incrementUncaughtExceptionCount", "decrementUncaughtExceptionCount", "Browser_asyncPrepareDataCounter", "isLeapYear", "ydayFromDate", "arraySum", "addDays", "getSocketFromFD", "getSocketAddress", "FS_mkdirTree", "_setNetworkCallback", "emscriptenWebGLGetUniform", "emscriptenWebGLGetVertexAttrib", "__glGetActiveAttribOrUniform", "emscriptenWebGLGetBufferBinding", "emscriptenWebGLValidateMapBufferTarget", "writeGLArray", "registerWebGlEventCallback", "emscriptenWebGLGetIndexed", "writeStringToMemory", "writeAsciiToMemory", "allocateUTF8", "allocateUTF8OnStack", "demangle", "stackTrace", "getNativeTypeSize"];
  missingLibrarySymbols.forEach(missingLibrarySymbol);
  var unexportedSymbols = ["run", "out", "err", "callMain", "abort", "wasmExports", "writeStackCookie", "checkStackCookie", "writeI53ToI64", "readI53FromI64", "readI53FromU64", "INT53_MAX", "INT53_MIN", "bigintToI53Checked", "HEAP8", "HEAP16", "HEAPU16", "HEAPU32", "HEAPF64", "HEAP64", "HEAPU64", "stackSave", "stackRestore", "stackAlloc", "setTempRet0", "createNamedFunction", "ptrToString", "exitJS", "getHeapMax", "growMemory", "ENV", "setStackLimits", "ERRNO_CODES", "strError", "DNS", "Protocols", "timers", "warnOnce", "readEmAsmArgsArray", "jstoi_q", "getExecutableName", "dynCallLegacy", "dynCall", "handleException", "keepRuntimeAlive", "runtimeKeepalivePush", "runtimeKeepalivePop", "callUserCallback", "maybeExit", "asyncLoad", "alignMemory", "mmapAlloc", "wasmTable", "wasmMemory", "getUniqueRunDependency", "noExitRuntime", "addRunDependency", "removeRunDependency", "addOnPreRun", "addOnPostRun", "freeTableIndexes", "functionsInTableMap", "PATH", "PATH_FS", "UTF8Decoder", "UTF8ArrayToString", "stringToUTF8Array", "stringToUTF8", "lengthBytesUTF8", "intArrayFromString", "UTF16Decoder", "stringToNewUTF8", "stringToUTF8OnStack", "writeArrayToMemory", "JSEvents", "specialHTMLTargets", "maybeCStringToJsString", "findEventTarget", "findCanvasEventTarget", "restoreOldWindowedStyle", "UNWIND_CACHE", "ExitStatus", "getEnvStrings", "checkWasiClock", "doReadv", "doWritev", "initRandomFill", "randomFill", "emSetImmediate", "emClearImmediate", "registerPreMainLoop", "promiseMap", "uncaughtExceptionCount", "exceptionLast", "exceptionCaught", "ExceptionInfo", "findMatchingCatch", "getExceptionMessageCommon", "incrementExceptionRefcount", "decrementExceptionRefcount", "getExceptionMessage", "Browser", "requestFullscreen", "setCanvasSize", "createContext", "wget", "MONTH_DAYS_REGULAR", "MONTH_DAYS_LEAP", "MONTH_DAYS_REGULAR_CUMULATIVE", "MONTH_DAYS_LEAP_CUMULATIVE", "SYSCALLS", "preloadPlugins", "FS_createPreloadedFile", "FS_preloadFile", "FS_modeStringToFlags", "FS_getMode", "FS_fileDataToTypedArray", "FS_stdin_getChar_buffer", "FS_stdin_getChar", "FS_unlink", "FS_createPath", "FS_createDevice", "FS_readFile", "FS", "FS_root", "FS_mounts", "FS_devices", "FS_streams", "FS_nextInode", "FS_nameTable", "FS_currentPath", "FS_initialized", "FS_ignorePermissions", "FS_filesystems", "FS_syncFSRequests", "FS_lookupPath", "FS_getPath", "FS_hashName", "FS_hashAddNode", "FS_hashRemoveNode", "FS_lookupNode", "FS_createNode", "FS_destroyNode", "FS_isRoot", "FS_isMountpoint", "FS_isFile", "FS_isDir", "FS_isLink", "FS_isChrdev", "FS_isBlkdev", "FS_isFIFO", "FS_isSocket", "FS_flagsToPermissionString", "FS_nodePermissions", "FS_mayLookup", "FS_mayCreate", "FS_mayDelete", "FS_mayOpen", "FS_checkOpExists", "FS_nextfd", "FS_getStreamChecked", "FS_getStream", "FS_createStream", "FS_closeStream", "FS_dupStream", "FS_doSetAttr", "FS_chrdev_stream_ops", "FS_major", "FS_minor", "FS_makedev", "FS_registerDevice", "FS_getDevice", "FS_getMounts", "FS_syncfs", "FS_mount", "FS_unmount", "FS_lookup", "FS_mknod", "FS_statfs", "FS_statfsStream", "FS_statfsNode", "FS_create", "FS_mkdir", "FS_mkdev", "FS_symlink", "FS_link", "FS_rename", "FS_rmdir", "FS_readdir", "FS_readlink", "FS_stat", "FS_fstat", "FS_lstat", "FS_doChmod", "FS_chmod", "FS_lchmod", "FS_fchmod", "FS_doChown", "FS_chown", "FS_lchown", "FS_fchown", "FS_doTruncate", "FS_truncate", "FS_ftruncate", "FS_utime", "FS_open", "FS_close", "FS_isClosed", "FS_llseek", "FS_read", "FS_write", "FS_mmap", "FS_msync", "FS_ioctl", "FS_writeFile", "FS_cwd", "FS_chdir", "FS_createDefaultDirectories", "FS_createDefaultDevices", "FS_createSpecialDirectories", "FS_createStandardStreams", "FS_staticInit", "FS_init", "FS_quit", "FS_analyzePath", "FS_createFile", "FS_createDataFile", "FS_forceLoadFile", "FS_createLazyFile", "MEMFS", "TTY", "PIPEFS", "SOCKFS", "tempFixedLengthArray", "miniTempWebGLFloatBuffers", "miniTempWebGLIntBuffers", "heapObjectForWebGLType", "toTypedArrayIndex", "webgl_enable_WEBGL_multi_draw", "webgl_enable_EXT_polygon_offset_clamp", "webgl_enable_EXT_clip_control", "webgl_enable_WEBGL_polygon_mode", "GL", "emscriptenWebGLGet", "computeUnpackAlignedImageSize", "colorChannelsInGlTextureFormat", "emscriptenWebGLGetTexPixelData", "webglGetProgramUniformLocation", "webglGetUniformLocation", "webglPrepareUniformLocationsBeforeFirstUse", "webglGetLeftBracePos", "AL", "GLUT", "EGL", "GLEW", "IDBStore", "runAndAbortIfError", "Asyncify", "Fibers", "SDL", "SDL_gfx", "webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance", "webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance", "print", "printErr", "jstoi_s"];
  unexportedSymbols.forEach(unexportedRuntimeSymbol);
  function checkIncomingModuleAPI() {
    ignoredModuleProp("fetchSettings");
    ignoredModuleProp("logReadFiles");
    ignoredModuleProp("loadSplitModule");
    ignoredModuleProp("onMalloc");
    ignoredModuleProp("onRealloc");
    ignoredModuleProp("onFree");
    ignoredModuleProp("onSbrkGrow");
    ignoredModuleProp("onCOSCacheHit");
    ignoredModuleProp("onCOSCacheMiss");
    ignoredModuleProp("onCOSStore");
    ignoredModuleProp("GL_MAX_TEXTURE_IMAGE_UNITS");
    ignoredModuleProp("SDL_canPlayWithWebAudio");
    ignoredModuleProp("SDL_numSimultaneouslyQueuedBuffers");
    ignoredModuleProp("freePreloadedMediaOnUse");
    ignoredModuleProp("preinitializedWebGLContext");
    ignoredModuleProp("keyboardListeningElement");
    ignoredModuleProp("doNotCaptureKeyboard");
    ignoredModuleProp("extraStackTrace");
    ignoredModuleProp("preloadPlugins");
    ignoredModuleProp("preMainLoop");
    ignoredModuleProp("postMainLoop");
    ignoredModuleProp("forcedAspectRatio");
    ignoredModuleProp("mainScriptUrlOrBlob");
    ignoredModuleProp("onFullScreen");
    ignoredModuleProp("INITIAL_MEMORY");
    ignoredModuleProp("wasmMemory");
    ignoredModuleProp("wasmBinary");
  }
  function jsAudioEnsureEngine() {
    if (Module2.__mmwAudio) {
      return;
    }
    class WasmAudioTransport {
      constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.soundBuffers = /* @__PURE__ */ new Map();
        this.source = null;
        this.gainNode = null;
        this.bgmVolume = 1;
        this.soundVolume = 1;
        this.oneShots = /* @__PURE__ */ new Set();
        this.extendableSources = /* @__PURE__ */ new Map();
        this.state = 0;
        this.playbackRate = 1;
        this.baseTimeSec = 0;
        this.startedAtAudioTime = 0;
        this.startedAtWallTime = 0;
        this.durationSec = 0;
        this.audioStartOffsetSec = 0;
        this.pendingGestureStart = false;
        this.lastError = "";
      }
      ensureAudioContext() {
        if (!this.audioContext) {
          const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
          if (!Ctx) {
            throw new Error("AudioContext unavailable");
          }
          this.audioContext = new Ctx();
        }
        return this.audioContext;
      }
      clampTime(timeSec) {
        return this.durationSec > 0 ? Math.min(Math.max(timeSec, 0), this.durationSec) : Math.max(timeSec, 0);
      }
      getCurrentTimeSec() {
        if (this.state !== 3) {
          return this.baseTimeSec;
        }
        let current = this.baseTimeSec;
        if (this.audioBuffer && this.audioContext) {
          current += (this.audioContext.currentTime - this.startedAtAudioTime) * this.playbackRate;
        } else {
          current += (performance.now() - this.startedAtWallTime) / 1e3 * this.playbackRate;
        }
        if (current >= this.durationSec && this.durationSec > 0) {
          this.baseTimeSec = this.durationSec;
          this.stopSource();
          this.state = 4;
          return this.baseTimeSec;
        }
        return current;
      }
      stopSource() {
        if (!this.source) {
          return;
        }
        this.source.onended = null;
        try {
          this.source.stop();
        } catch {
        }
        this.source.disconnect();
        this.source = null;
      }
      clearOneShots() {
        for (const node of this.oneShots) {
          try {
            node.stop();
          } catch {
          }
          try {
            node.disconnect();
          } catch {
          }
        }
        this.oneShots.clear();
        for (const [_, entry] of this.extendableSources) {
          try {
            entry.source.onended = null;
            entry.source.stop();
          } catch {
          }
          try {
            entry.source.disconnect();
            entry.gainNode.disconnect();
          } catch {
          }
        }
        this.extendableSources.clear();
      }
      startPlayback() {
        this.baseTimeSec = this.clampTime(this.baseTimeSec);
        this.startedAtWallTime = performance.now();
        this.startedAtAudioTime = this.audioContext?.currentTime ?? 0;
        this.stopSource();
        if (this.audioBuffer && this.audioContext) {
          const audioTimeSec = this.baseTimeSec - this.audioStartOffsetSec;
          const sourceOffsetSec = Math.max(audioTimeSec, 0);
          const startDelaySec = audioTimeSec < 0 ? -audioTimeSec / this.playbackRate : 0;
          if (sourceOffsetSec < this.audioBuffer.duration) {
            const source = this.audioContext.createBufferSource();
            source.buffer = this.audioBuffer;
            source.playbackRate.value = this.playbackRate;
            if (!this.gainNode) {
              this.gainNode = this.audioContext.createGain();
            }
            this.gainNode.gain.value = this.bgmVolume;
            source.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);
            source.onended = () => {
              if (this.source === source && this.state === 3) {
                const currentTimeSec = Math.min(this.durationSec, this.getCurrentTimeSec());
                this.source = null;
                this.baseTimeSec = currentTimeSec;
                if (currentTimeSec < this.durationSec) {
                  this.startedAtWallTime = performance.now();
                  this.startedAtAudioTime = this.audioContext?.currentTime ?? 0;
                  return;
                }
                this.state = 4;
              }
            };
            source.start(this.audioContext.currentTime + startDelaySec, sourceOffsetSec);
            this.source = source;
            this.startedAtAudioTime = this.audioContext.currentTime;
          }
        }
        this.state = 3;
      }
      setDuration(durationSec) {
        this.durationSec = Math.max(Number(durationSec) || 0, 0);
        this.baseTimeSec = Math.min(this.baseTimeSec, this.durationSec);
      }
      setAudioStartOffset(offsetSec) {
        this.audioStartOffsetSec = Math.max(Number(offsetSec) || 0, 0);
        if (this.audioBuffer) {
          this.durationSec = Math.max(this.durationSec, this.audioStartOffsetSec + this.audioBuffer.duration);
        }
        if (this.state === 3) {
          this.baseTimeSec = this.getCurrentTimeSec();
          this.stopSource();
          this.startPlayback();
          return;
        }
        this.baseTimeSec = this.clampTime(this.baseTimeSec);
      }
      async loadBgm(bytes2) {
        if (!bytes2 || !bytes2.byteLength) {
          this.audioBuffer = null;
          if (this.state !== 3) {
            this.state = 2;
          }
          return;
        }
        const context = this.ensureAudioContext();
        this.audioBuffer = await context.decodeAudioData(bytes2.slice(0));
        this.durationSec = Math.max(this.durationSec, this.audioStartOffsetSec + this.audioBuffer.duration);
        if (this.state !== 3) {
          this.state = 2;
        }
      }
      async loadSound(name, bytes2) {
        if (!name || !bytes2 || !bytes2.byteLength) {
          return;
        }
        const context = this.ensureAudioContext();
        const buffer = await context.decodeAudioData(bytes2.slice(0));
        this.soundBuffers.set(name, buffer);
      }
      async unlock() {
        const context = this.ensureAudioContext();
        await context.resume();
        if (this.pendingGestureStart) {
          this.pendingGestureStart = false;
          this.startPlayback();
        }
        return true;
      }
      async play() {
        if (this.state === 3) {
          return true;
        }
        if (this.audioBuffer) {
          const context = this.ensureAudioContext();
          if (context.state !== "running") {
            try {
              await context.resume();
            } catch {
              this.pendingGestureStart = true;
              return false;
            }
          }
        }
        this.startPlayback();
        return true;
      }
      pause() {
        if (this.state !== 3) {
          return;
        }
        this.baseTimeSec = this.getCurrentTimeSec();
        this.stopSource();
        this.state = 4;
      }
      seek(timeSec) {
        const clamped = this.clampTime(timeSec);
        const wasPlaying = this.state === 3;
        this.baseTimeSec = clamped;
        if (wasPlaying) {
          this.stopSource();
          this.startPlayback();
        }
      }
      setPlaybackRate(rate) {
        const nextRate = Math.max(0.05, Number(rate) || 1);
        this.playbackRate = nextRate;
        if (this.state === 3) {
          this.baseTimeSec = this.getCurrentTimeSec();
          this.stopSource();
          this.startPlayback();
        }
      }
      setAudioVolumes(bgmVolume2, soundVolume) {
        this.bgmVolume = Math.min(1, Math.max(0, Number(bgmVolume2)));
        if (!Number.isFinite(this.bgmVolume)) {
          this.bgmVolume = 1;
        }
        this.soundVolume = Math.min(1, Math.max(0, Number(soundVolume)));
        if (!Number.isFinite(this.soundVolume)) {
          this.soundVolume = 1;
        }
        if (this.gainNode) {
          this.gainNode.gain.value = this.bgmVolume;
        }
        for (const entry of this.extendableSources.values()) {
          entry.gainNode.gain.value = entry.baseGain * this.soundVolume;
        }
      }
      trigger(name, gain, delaySec, offsetSec = 0) {
        if (!name) {
          return;
        }
        const context = this.audioContext;
        const buffer = this.soundBuffers.get(name);
        if (!context || !buffer) {
          return;
        }
        const source = context.createBufferSource();
        const gainNode = context.createGain();
        source.buffer = buffer;
        source.playbackRate.value = this.playbackRate;
        gainNode.gain.value = Math.max(0, Number(gain) || 0) * this.soundVolume;
        source.connect(gainNode);
        gainNode.connect(context.destination);
        source.onended = () => {
          this.oneShots.delete(source);
          try {
            source.disconnect();
            gainNode.disconnect();
          } catch {
          }
        };
        const offset = Math.min(Math.max(0, Number(offsetSec) || 0), Math.max(0, buffer.duration - 1e-3));
        source.start(context.currentTime + Math.max(0, Number(delaySec) || 0), offset);
        this.oneShots.add(source);
      }
      triggerExtendable(name, gain, currentOutputTimeSec, endOutputTimeSec, delaySec) {
        if (!name) {
          return;
        }
        const context = this.audioContext;
        const buffer = this.soundBuffers.get(name);
        if (!context || !buffer) {
          return;
        }
        const currentOutput = Math.max(0, Number(currentOutputTimeSec) || 0);
        const nextEndTimeSec = Math.max(0, Number(endOutputTimeSec) || 0);
        if (nextEndTimeSec - currentOutput <= 1e-4) {
          return;
        }
        const existing = this.extendableSources.get(name);
        if (existing) {
          if (currentOutput > existing.endTimeSec + 1e-4) {
            this.stopExtendable(name);
          } else {
            if (nextEndTimeSec <= existing.endTimeSec + 1e-4) {
              return;
            }
            existing.endTimeSec = nextEndTimeSec;
            return;
          }
        }
        const source = context.createBufferSource();
        const gainNode = context.createGain();
        const baseGain = Math.max(0, Number(gain) || 0);
        source.buffer = buffer;
        source.loop = true;
        if (buffer.length > 6e3) {
          const guardFrames = 3e3;
          source.loopStart = guardFrames / buffer.sampleRate;
          source.loopEnd = (buffer.length - guardFrames) / buffer.sampleRate;
        }
        source.playbackRate.value = this.playbackRate;
        gainNode.gain.value = baseGain * this.soundVolume;
        source.connect(gainNode);
        gainNode.connect(context.destination);
        source.onended = () => {
          const current = this.extendableSources.get(name);
          if (current && current.source === source) {
            this.extendableSources.delete(name);
          }
          try {
            source.disconnect();
            gainNode.disconnect();
          } catch {
          }
        };
        source.start(context.currentTime + Math.max(0, Number(delaySec) || 0));
        this.extendableSources.set(name, { source, gainNode, baseGain, endTimeSec: nextEndTimeSec });
      }
      stopExtendable(name) {
        const entry = this.extendableSources.get(name);
        if (!entry) {
          return;
        }
        this.extendableSources.delete(name);
        try {
          entry.source.onended = null;
          entry.source.stop();
        } catch {
        }
        try {
          entry.source.disconnect();
          entry.gainNode.disconnect();
        } catch {
        }
      }
      cleanupExtendables(currentOutputTimeSec) {
        const currentOutput = Math.max(0, Number(currentOutputTimeSec) || 0);
        for (const [name, entry] of this.extendableSources) {
          if (currentOutput <= entry.endTimeSec + 1e-4) {
            continue;
          }
          this.stopExtendable(name);
        }
      }
      getStateCode() {
        return this.state;
      }
    }
    Module2.__mmwAudio = new WasmAudioTransport();
  }
  function __asyncjs__jsAudioLoadBgm(dataPtr, length) {
    return Asyncify.handleAsync(async () => {
      jsAudioEnsureEngine();
      try {
        const bytes2 = HEAPU8.slice(dataPtr, dataPtr + length).buffer;
        await Module2.__mmwAudio.loadBgm(bytes2);
        return 1;
      } catch (error) {
        Module2.__mmwAudio.lastError = String(error && error.message ? error.message : error);
        return 0;
      }
    });
  }
  function __asyncjs__jsAudioLoadSound(keyPtr, dataPtr, length) {
    return Asyncify.handleAsync(async () => {
      jsAudioEnsureEngine();
      try {
        const key = UTF8ToString(keyPtr);
        const bytes2 = HEAPU8.slice(dataPtr, dataPtr + length).buffer;
        await Module2.__mmwAudio.loadSound(key, bytes2);
        return 1;
      } catch (error) {
        Module2.__mmwAudio.lastError = String(error && error.message ? error.message : error);
        return 0;
      }
    });
  }
  function __asyncjs__jsAudioUnlock() {
    return Asyncify.handleAsync(async () => {
      jsAudioEnsureEngine();
      try {
        await Module2.__mmwAudio.unlock();
        return 1;
      } catch (error) {
        Module2.__mmwAudio.lastError = String(error && error.message ? error.message : error);
        return 0;
      }
    });
  }
  function __asyncjs__jsAudioPlay() {
    return Asyncify.handleAsync(async () => {
      jsAudioEnsureEngine();
      try {
        return await Module2.__mmwAudio.play() ? 1 : 0;
      } catch (error) {
        Module2.__mmwAudio.lastError = String(error && error.message ? error.message : error);
        return 0;
      }
    });
  }
  function jsAudioPause() {
    jsAudioEnsureEngine();
    Module2.__mmwAudio.pause();
  }
  function jsAudioSeek(timeSec) {
    jsAudioEnsureEngine();
    Module2.__mmwAudio.seek(timeSec);
  }
  function jsAudioSetPlaybackRate(rate) {
    jsAudioEnsureEngine();
    Module2.__mmwAudio.setPlaybackRate(rate);
  }
  function jsAudioSetVolumes(bgmVolume2, soundVolume) {
    jsAudioEnsureEngine();
    Module2.__mmwAudio.setAudioVolumes(bgmVolume2, soundVolume);
  }
  function jsAudioSetDuration(durationSec) {
    jsAudioEnsureEngine();
    Module2.__mmwAudio.setDuration(durationSec);
  }
  function jsAudioSetStartOffset(offsetSec) {
    jsAudioEnsureEngine();
    Module2.__mmwAudio.setAudioStartOffset(offsetSec);
  }
  function jsAudioGetCurrentTime() {
    jsAudioEnsureEngine();
    return Module2.__mmwAudio.getCurrentTimeSec();
  }
  function jsAudioGetStateCode() {
    jsAudioEnsureEngine();
    return Module2.__mmwAudio.getStateCode();
  }
  function jsAudioRequiresGesture() {
    jsAudioEnsureEngine();
    return Module2.__mmwAudio.pendingGestureStart ? 1 : 0;
  }
  function jsAudioHasAudio() {
    jsAudioEnsureEngine();
    return Module2.__mmwAudio.audioBuffer ? 1 : 0;
  }
  function jsAudioTriggerOneShot(keyPtr, gain, delaySec) {
    jsAudioEnsureEngine();
    Module2.__mmwAudio.trigger(UTF8ToString(keyPtr), gain, delaySec);
  }
  function jsAudioTriggerOneShotAtOffset(keyPtr, gain, offsetSec) {
    jsAudioEnsureEngine();
    Module2.__mmwAudio.trigger(UTF8ToString(keyPtr), gain, 0, offsetSec);
  }
  function jsAudioTriggerExtendable(keyPtr, gain, currentOutputTimeSec, endTimeSec, delaySec) {
    jsAudioEnsureEngine();
    Module2.__mmwAudio.triggerExtendable(UTF8ToString(keyPtr), gain, currentOutputTimeSec, endTimeSec, delaySec);
  }
  function jsAudioCleanupExtendables(currentOutputTimeSec) {
    jsAudioEnsureEngine();
    Module2.__mmwAudio.cleanupExtendables(currentOutputTimeSec);
  }
  function jsAudioClearOneShots() {
    jsAudioEnsureEngine();
    Module2.__mmwAudio.clearOneShots();
  }
  function jsAudioGetLastError() {
    jsAudioEnsureEngine();
    const text = Module2.__mmwAudio.lastError || "";
    const length = lengthBytesUTF8(text) + 1;
    if (Module2.__mmwAudio.lastErrorPtr) {
      _free(Module2.__mmwAudio.lastErrorPtr);
      Module2.__mmwAudio.lastErrorPtr = 0;
    }
    Module2.__mmwAudio.lastErrorPtr = _malloc(length);
    stringToUTF8(text, Module2.__mmwAudio.lastErrorPtr, length);
    return Module2.__mmwAudio.lastErrorPtr;
  }
  function jsReadGpuRenderer(buffer, length) {
    var text = "unknown";
    try {
      var nodes = document.querySelectorAll("canvas");
      for (var i = 0; i < nodes.length; i++) {
        var gl = null;
        try {
          gl = nodes[i].getContext("webgl2") || nodes[i].getContext("webgl");
        } catch (error) {
          gl = null;
        }
        if (!gl) {
          continue;
        }
        var ext = gl.getExtension("WEBGL_debug_renderer_info");
        text = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
        break;
      }
    } catch (error) {
      text = "unknown";
    }
    stringToUTF8(text, buffer, length);
    return 1;
  }
  var _init = Module2["_init"] = makeInvalidEarlyAccess("_init");
  var _resize = Module2["_resize"] = makeInvalidEarlyAccess("_resize");
  var _loadSusText = Module2["_loadSusText"] = makeInvalidEarlyAccess("_loadSusText");
  var _loadSusTextPrecise = Module2["_loadSusTextPrecise"] = makeInvalidEarlyAccess("_loadSusTextPrecise");
  var _loadCustomScoreJsonTextPrecise = Module2["_loadCustomScoreJsonTextPrecise"] = makeInvalidEarlyAccess("_loadCustomScoreJsonTextPrecise");
  var _setPreviewConfig = Module2["_setPreviewConfig"] = makeInvalidEarlyAccess("_setPreviewConfig");
  var _render = Module2["_render"] = makeInvalidEarlyAccess("_render");
  var _getLastError = Module2["_getLastError"] = makeInvalidEarlyAccess("_getLastError");
  var _getQuadBufferPointer = Module2["_getQuadBufferPointer"] = makeInvalidEarlyAccess("_getQuadBufferPointer");
  var _getFramePhaseTimingJson = Module2["_getFramePhaseTimingJson"] = makeInvalidEarlyAccess("_getFramePhaseTimingJson");
  var _getQuadCount = Module2["_getQuadCount"] = makeInvalidEarlyAccess("_getQuadCount");
  var _getChartEndTimeSec = Module2["_getChartEndTimeSec"] = makeInvalidEarlyAccess("_getChartEndTimeSec");
  var _getHitEventBufferPointer = Module2["_getHitEventBufferPointer"] = makeInvalidEarlyAccess("_getHitEventBufferPointer");
  var _getHitEventCount = Module2["_getHitEventCount"] = makeInvalidEarlyAccess("_getHitEventCount");
  var _getMetadataTitle = Module2["_getMetadataTitle"] = makeInvalidEarlyAccess("_getMetadataTitle");
  var _getMetadataArtist = Module2["_getMetadataArtist"] = makeInvalidEarlyAccess("_getMetadataArtist");
  var _getMetadataDesigner = Module2["_getMetadataDesigner"] = makeInvalidEarlyAccess("_getMetadataDesigner");
  var _getHudEventBufferPointer = Module2["_getHudEventBufferPointer"] = makeInvalidEarlyAccess("_getHudEventBufferPointer");
  var _getHudEventCount = Module2["_getHudEventCount"] = makeInvalidEarlyAccess("_getHudEventCount");
  var _dispose = Module2["_dispose"] = makeInvalidEarlyAccess("_dispose");
  var _free = Module2["_free"] = makeInvalidEarlyAccess("_free");
  var _malloc = Module2["_malloc"] = makeInvalidEarlyAccess("_malloc");
  var _initPlayer = Module2["_initPlayer"] = makeInvalidEarlyAccess("_initPlayer");
  var _getGpuRenderer = Module2["_getGpuRenderer"] = makeInvalidEarlyAccess("_getGpuRenderer");
  var _resizePlayer = Module2["_resizePlayer"] = makeInvalidEarlyAccess("_resizePlayer");
  var _preloadAssetData = Module2["_preloadAssetData"] = makeInvalidEarlyAccess("_preloadAssetData");
  var _preloadFontData = Module2["_preloadFontData"] = makeInvalidEarlyAccess("_preloadFontData");
  var _preloadSoundData = Module2["_preloadSoundData"] = makeInvalidEarlyAccess("_preloadSoundData");
  var _loadSession = Module2["_loadSession"] = makeInvalidEarlyAccess("_loadSession");
  var _loadCustomScoreJsonSession = Module2["_loadCustomScoreJsonSession"] = makeInvalidEarlyAccess("_loadCustomScoreJsonSession");
  var _playPlayer = Module2["_playPlayer"] = makeInvalidEarlyAccess("_playPlayer");
  var _unlockPlayerAudio = Module2["_unlockPlayerAudio"] = makeInvalidEarlyAccess("_unlockPlayerAudio");
  var _pausePlayer = Module2["_pausePlayer"] = makeInvalidEarlyAccess("_pausePlayer");
  var _seekPlayer = Module2["_seekPlayer"] = makeInvalidEarlyAccess("_seekPlayer");
  var _setPlayerPlaybackRate = Module2["_setPlayerPlaybackRate"] = makeInvalidEarlyAccess("_setPlayerPlaybackRate");
  var _setPlayerAudioVolumes = Module2["_setPlayerAudioVolumes"] = makeInvalidEarlyAccess("_setPlayerAudioVolumes");
  var _setPlayerPreviewConfig = Module2["_setPlayerPreviewConfig"] = makeInvalidEarlyAccess("_setPlayerPreviewConfig");
  var _renderPlayerFrame = Module2["_renderPlayerFrame"] = makeInvalidEarlyAccess("_renderPlayerFrame");
  var _getPlayerFrameTimingJson = Module2["_getPlayerFrameTimingJson"] = makeInvalidEarlyAccess("_getPlayerFrameTimingJson");
  var _getPlayerCurrentTimeSec = Module2["_getPlayerCurrentTimeSec"] = makeInvalidEarlyAccess("_getPlayerCurrentTimeSec");
  var _getPlayerDurationSec = Module2["_getPlayerDurationSec"] = makeInvalidEarlyAccess("_getPlayerDurationSec");
  var _getPlayerChartEndSec = Module2["_getPlayerChartEndSec"] = makeInvalidEarlyAccess("_getPlayerChartEndSec");
  var _getPlayerSourceOffsetSec = Module2["_getPlayerSourceOffsetSec"] = makeInvalidEarlyAccess("_getPlayerSourceOffsetSec");
  var _getPlayerEffectiveLeadInSec = Module2["_getPlayerEffectiveLeadInSec"] = makeInvalidEarlyAccess("_getPlayerEffectiveLeadInSec");
  var _getPlayerAudioStartDelaySec = Module2["_getPlayerAudioStartDelaySec"] = makeInvalidEarlyAccess("_getPlayerAudioStartDelaySec");
  var _getPlayerApStartSec = Module2["_getPlayerApStartSec"] = makeInvalidEarlyAccess("_getPlayerApStartSec");
  var _getPlayerTransportState = Module2["_getPlayerTransportState"] = makeInvalidEarlyAccess("_getPlayerTransportState");
  var _getPlayerRequiresGesture = Module2["_getPlayerRequiresGesture"] = makeInvalidEarlyAccess("_getPlayerRequiresGesture");
  var _getPlayerHasAudio = Module2["_getPlayerHasAudio"] = makeInvalidEarlyAccess("_getPlayerHasAudio");
  var _getPlayerWarningText = Module2["_getPlayerWarningText"] = makeInvalidEarlyAccess("_getPlayerWarningText");
  var _disposePlayer = Module2["_disposePlayer"] = makeInvalidEarlyAccess("_disposePlayer");
  var _fflush = makeInvalidEarlyAccess("_fflush");
  var _emscripten_stack_get_end = makeInvalidEarlyAccess("_emscripten_stack_get_end");
  var _emscripten_stack_get_base = makeInvalidEarlyAccess("_emscripten_stack_get_base");
  var _strerror = makeInvalidEarlyAccess("_strerror");
  var _setThrew = makeInvalidEarlyAccess("_setThrew");
  var __emscripten_tempret_set = makeInvalidEarlyAccess("__emscripten_tempret_set");
  var _emscripten_stack_init = makeInvalidEarlyAccess("_emscripten_stack_init");
  var _emscripten_stack_get_free = makeInvalidEarlyAccess("_emscripten_stack_get_free");
  var __emscripten_stack_restore = makeInvalidEarlyAccess("__emscripten_stack_restore");
  var __emscripten_stack_alloc = makeInvalidEarlyAccess("__emscripten_stack_alloc");
  var _emscripten_stack_get_current = makeInvalidEarlyAccess("_emscripten_stack_get_current");
  var ___cxa_decrement_exception_refcount = makeInvalidEarlyAccess("___cxa_decrement_exception_refcount");
  var ___cxa_increment_exception_refcount = makeInvalidEarlyAccess("___cxa_increment_exception_refcount");
  var ___get_exception_message = makeInvalidEarlyAccess("___get_exception_message");
  var ___cxa_can_catch = makeInvalidEarlyAccess("___cxa_can_catch");
  var ___cxa_get_exception_ptr = makeInvalidEarlyAccess("___cxa_get_exception_ptr");
  var ___set_stack_limits = Module2["___set_stack_limits"] = makeInvalidEarlyAccess("___set_stack_limits");
  var dynCall_vii = makeInvalidEarlyAccess("dynCall_vii");
  var dynCall_iii = makeInvalidEarlyAccess("dynCall_iii");
  var dynCall_ii = makeInvalidEarlyAccess("dynCall_ii");
  var dynCall_v = makeInvalidEarlyAccess("dynCall_v");
  var dynCall_iiii = makeInvalidEarlyAccess("dynCall_iiii");
  var dynCall_viii = makeInvalidEarlyAccess("dynCall_viii");
  var dynCall_vi = makeInvalidEarlyAccess("dynCall_vi");
  var dynCall_viiiiiiii = makeInvalidEarlyAccess("dynCall_viiiiiiii");
  var dynCall_iiif = makeInvalidEarlyAccess("dynCall_iiif");
  var dynCall_viiii = makeInvalidEarlyAccess("dynCall_viiii");
  var dynCall_viiiii = makeInvalidEarlyAccess("dynCall_viiiii");
  var dynCall_viiiiii = makeInvalidEarlyAccess("dynCall_viiiiii");
  var dynCall_fiif = makeInvalidEarlyAccess("dynCall_fiif");
  var dynCall_iiiiiii = makeInvalidEarlyAccess("dynCall_iiiiiii");
  var dynCall_i = makeInvalidEarlyAccess("dynCall_i");
  var dynCall_iiiiii = makeInvalidEarlyAccess("dynCall_iiiiii");
  var dynCall_ffff = makeInvalidEarlyAccess("dynCall_ffff");
  var dynCall_viif = makeInvalidEarlyAccess("dynCall_viif");
  var dynCall_iiiii = makeInvalidEarlyAccess("dynCall_iiiii");
  var dynCall_viiiiiii = makeInvalidEarlyAccess("dynCall_viiiiiii");
  var dynCall_viiiiiiiiffffffi = makeInvalidEarlyAccess("dynCall_viiiiiiiiffffffi");
  var dynCall_iid = makeInvalidEarlyAccess("dynCall_iid");
  var dynCall_d = makeInvalidEarlyAccess("dynCall_d");
  var dynCall_vd = makeInvalidEarlyAccess("dynCall_vd");
  var dynCall_viiiiiiiii = makeInvalidEarlyAccess("dynCall_viiiiiiiii");
  var dynCall_viiiif = makeInvalidEarlyAccess("dynCall_viiiif");
  var dynCall_vffiiiiii = makeInvalidEarlyAccess("dynCall_vffiiiiii");
  var dynCall_viiiifi = makeInvalidEarlyAccess("dynCall_viiiifi");
  var dynCall_viifiiiifi = makeInvalidEarlyAccess("dynCall_viifiiiifi");
  var dynCall_viifffiii = makeInvalidEarlyAccess("dynCall_viifffiii");
  var dynCall_fiiii = makeInvalidEarlyAccess("dynCall_fiiii");
  var dynCall_fiii = makeInvalidEarlyAccess("dynCall_fiii");
  var dynCall_viiif = makeInvalidEarlyAccess("dynCall_viiif");
  var dynCall_viiiiifi = makeInvalidEarlyAccess("dynCall_viiiiifi");
  var dynCall_iiiiiiffffi = makeInvalidEarlyAccess("dynCall_iiiiiiffffi");
  var dynCall_vijii = makeInvalidEarlyAccess("dynCall_vijii");
  var dynCall_iiiiiiii = makeInvalidEarlyAccess("dynCall_iiiiiiii");
  var dynCall_jiji = makeInvalidEarlyAccess("dynCall_jiji");
  var dynCall_iidiiiii = makeInvalidEarlyAccess("dynCall_iidiiiii");
  var dynCall_viijii = makeInvalidEarlyAccess("dynCall_viijii");
  var dynCall_iiiiiiiiiiiii = makeInvalidEarlyAccess("dynCall_iiiiiiiiiiiii");
  var dynCall_diii = makeInvalidEarlyAccess("dynCall_diii");
  var dynCall_iiiiiiiiiiii = makeInvalidEarlyAccess("dynCall_iiiiiiiiiiii");
  var dynCall_viiiiiiiiii = makeInvalidEarlyAccess("dynCall_viiiiiiiiii");
  var dynCall_viiiiiiiiiiiiiii = makeInvalidEarlyAccess("dynCall_viiiiiiiiiiiiiii");
  var dynCall_iiiiiiiii = makeInvalidEarlyAccess("dynCall_iiiiiiiii");
  var dynCall_iiiiij = makeInvalidEarlyAccess("dynCall_iiiiij");
  var dynCall_iiiiid = makeInvalidEarlyAccess("dynCall_iiiiid");
  var dynCall_iiiiijj = makeInvalidEarlyAccess("dynCall_iiiiijj");
  var dynCall_iiiiiijj = makeInvalidEarlyAccess("dynCall_iiiiiijj");
  var _asyncify_start_unwind = makeInvalidEarlyAccess("_asyncify_start_unwind");
  var _asyncify_stop_unwind = makeInvalidEarlyAccess("_asyncify_stop_unwind");
  var _asyncify_start_rewind = makeInvalidEarlyAccess("_asyncify_start_rewind");
  var _asyncify_stop_rewind = makeInvalidEarlyAccess("_asyncify_stop_rewind");
  var memory = makeInvalidEarlyAccess("memory");
  var __indirect_function_table = makeInvalidEarlyAccess("__indirect_function_table");
  var wasmMemory = makeInvalidEarlyAccess("wasmMemory");
  var wasmTable = makeInvalidEarlyAccess("wasmTable");
  function assignWasmExports(wasmExports2) {
    assert(typeof wasmExports2["init"] != "undefined", "missing Wasm export: init");
    assert(typeof wasmExports2["resize"] != "undefined", "missing Wasm export: resize");
    assert(typeof wasmExports2["loadSusText"] != "undefined", "missing Wasm export: loadSusText");
    assert(typeof wasmExports2["loadSusTextPrecise"] != "undefined", "missing Wasm export: loadSusTextPrecise");
    assert(typeof wasmExports2["loadCustomScoreJsonTextPrecise"] != "undefined", "missing Wasm export: loadCustomScoreJsonTextPrecise");
    assert(typeof wasmExports2["setPreviewConfig"] != "undefined", "missing Wasm export: setPreviewConfig");
    assert(typeof wasmExports2["render"] != "undefined", "missing Wasm export: render");
    assert(typeof wasmExports2["getLastError"] != "undefined", "missing Wasm export: getLastError");
    assert(typeof wasmExports2["getQuadBufferPointer"] != "undefined", "missing Wasm export: getQuadBufferPointer");
    assert(typeof wasmExports2["getFramePhaseTimingJson"] != "undefined", "missing Wasm export: getFramePhaseTimingJson");
    assert(typeof wasmExports2["getQuadCount"] != "undefined", "missing Wasm export: getQuadCount");
    assert(typeof wasmExports2["getChartEndTimeSec"] != "undefined", "missing Wasm export: getChartEndTimeSec");
    assert(typeof wasmExports2["getHitEventBufferPointer"] != "undefined", "missing Wasm export: getHitEventBufferPointer");
    assert(typeof wasmExports2["getHitEventCount"] != "undefined", "missing Wasm export: getHitEventCount");
    assert(typeof wasmExports2["getMetadataTitle"] != "undefined", "missing Wasm export: getMetadataTitle");
    assert(typeof wasmExports2["getMetadataArtist"] != "undefined", "missing Wasm export: getMetadataArtist");
    assert(typeof wasmExports2["getMetadataDesigner"] != "undefined", "missing Wasm export: getMetadataDesigner");
    assert(typeof wasmExports2["getHudEventBufferPointer"] != "undefined", "missing Wasm export: getHudEventBufferPointer");
    assert(typeof wasmExports2["getHudEventCount"] != "undefined", "missing Wasm export: getHudEventCount");
    assert(typeof wasmExports2["dispose"] != "undefined", "missing Wasm export: dispose");
    assert(typeof wasmExports2["free"] != "undefined", "missing Wasm export: free");
    assert(typeof wasmExports2["malloc"] != "undefined", "missing Wasm export: malloc");
    assert(typeof wasmExports2["initPlayer"] != "undefined", "missing Wasm export: initPlayer");
    assert(typeof wasmExports2["getGpuRenderer"] != "undefined", "missing Wasm export: getGpuRenderer");
    assert(typeof wasmExports2["resizePlayer"] != "undefined", "missing Wasm export: resizePlayer");
    assert(typeof wasmExports2["preloadAssetData"] != "undefined", "missing Wasm export: preloadAssetData");
    assert(typeof wasmExports2["preloadFontData"] != "undefined", "missing Wasm export: preloadFontData");
    assert(typeof wasmExports2["preloadSoundData"] != "undefined", "missing Wasm export: preloadSoundData");
    assert(typeof wasmExports2["loadSession"] != "undefined", "missing Wasm export: loadSession");
    assert(typeof wasmExports2["loadCustomScoreJsonSession"] != "undefined", "missing Wasm export: loadCustomScoreJsonSession");
    assert(typeof wasmExports2["playPlayer"] != "undefined", "missing Wasm export: playPlayer");
    assert(typeof wasmExports2["unlockPlayerAudio"] != "undefined", "missing Wasm export: unlockPlayerAudio");
    assert(typeof wasmExports2["pausePlayer"] != "undefined", "missing Wasm export: pausePlayer");
    assert(typeof wasmExports2["seekPlayer"] != "undefined", "missing Wasm export: seekPlayer");
    assert(typeof wasmExports2["setPlayerPlaybackRate"] != "undefined", "missing Wasm export: setPlayerPlaybackRate");
    assert(typeof wasmExports2["setPlayerAudioVolumes"] != "undefined", "missing Wasm export: setPlayerAudioVolumes");
    assert(typeof wasmExports2["setPlayerPreviewConfig"] != "undefined", "missing Wasm export: setPlayerPreviewConfig");
    assert(typeof wasmExports2["renderPlayerFrame"] != "undefined", "missing Wasm export: renderPlayerFrame");
    assert(typeof wasmExports2["getPlayerFrameTimingJson"] != "undefined", "missing Wasm export: getPlayerFrameTimingJson");
    assert(typeof wasmExports2["getPlayerCurrentTimeSec"] != "undefined", "missing Wasm export: getPlayerCurrentTimeSec");
    assert(typeof wasmExports2["getPlayerDurationSec"] != "undefined", "missing Wasm export: getPlayerDurationSec");
    assert(typeof wasmExports2["getPlayerChartEndSec"] != "undefined", "missing Wasm export: getPlayerChartEndSec");
    assert(typeof wasmExports2["getPlayerSourceOffsetSec"] != "undefined", "missing Wasm export: getPlayerSourceOffsetSec");
    assert(typeof wasmExports2["getPlayerEffectiveLeadInSec"] != "undefined", "missing Wasm export: getPlayerEffectiveLeadInSec");
    assert(typeof wasmExports2["getPlayerAudioStartDelaySec"] != "undefined", "missing Wasm export: getPlayerAudioStartDelaySec");
    assert(typeof wasmExports2["getPlayerApStartSec"] != "undefined", "missing Wasm export: getPlayerApStartSec");
    assert(typeof wasmExports2["getPlayerTransportState"] != "undefined", "missing Wasm export: getPlayerTransportState");
    assert(typeof wasmExports2["getPlayerRequiresGesture"] != "undefined", "missing Wasm export: getPlayerRequiresGesture");
    assert(typeof wasmExports2["getPlayerHasAudio"] != "undefined", "missing Wasm export: getPlayerHasAudio");
    assert(typeof wasmExports2["getPlayerWarningText"] != "undefined", "missing Wasm export: getPlayerWarningText");
    assert(typeof wasmExports2["disposePlayer"] != "undefined", "missing Wasm export: disposePlayer");
    assert(typeof wasmExports2["fflush"] != "undefined", "missing Wasm export: fflush");
    assert(typeof wasmExports2["emscripten_stack_get_end"] != "undefined", "missing Wasm export: emscripten_stack_get_end");
    assert(typeof wasmExports2["emscripten_stack_get_base"] != "undefined", "missing Wasm export: emscripten_stack_get_base");
    assert(typeof wasmExports2["strerror"] != "undefined", "missing Wasm export: strerror");
    assert(typeof wasmExports2["setThrew"] != "undefined", "missing Wasm export: setThrew");
    assert(typeof wasmExports2["_emscripten_tempret_set"] != "undefined", "missing Wasm export: _emscripten_tempret_set");
    assert(typeof wasmExports2["emscripten_stack_init"] != "undefined", "missing Wasm export: emscripten_stack_init");
    assert(typeof wasmExports2["emscripten_stack_get_free"] != "undefined", "missing Wasm export: emscripten_stack_get_free");
    assert(typeof wasmExports2["_emscripten_stack_restore"] != "undefined", "missing Wasm export: _emscripten_stack_restore");
    assert(typeof wasmExports2["_emscripten_stack_alloc"] != "undefined", "missing Wasm export: _emscripten_stack_alloc");
    assert(typeof wasmExports2["emscripten_stack_get_current"] != "undefined", "missing Wasm export: emscripten_stack_get_current");
    assert(typeof wasmExports2["__cxa_decrement_exception_refcount"] != "undefined", "missing Wasm export: __cxa_decrement_exception_refcount");
    assert(typeof wasmExports2["__cxa_increment_exception_refcount"] != "undefined", "missing Wasm export: __cxa_increment_exception_refcount");
    assert(typeof wasmExports2["__get_exception_message"] != "undefined", "missing Wasm export: __get_exception_message");
    assert(typeof wasmExports2["__cxa_can_catch"] != "undefined", "missing Wasm export: __cxa_can_catch");
    assert(typeof wasmExports2["__cxa_get_exception_ptr"] != "undefined", "missing Wasm export: __cxa_get_exception_ptr");
    assert(typeof wasmExports2["__set_stack_limits"] != "undefined", "missing Wasm export: __set_stack_limits");
    assert(typeof wasmExports2["dynCall_vii"] != "undefined", "missing Wasm export: dynCall_vii");
    assert(typeof wasmExports2["dynCall_iii"] != "undefined", "missing Wasm export: dynCall_iii");
    assert(typeof wasmExports2["dynCall_ii"] != "undefined", "missing Wasm export: dynCall_ii");
    assert(typeof wasmExports2["dynCall_v"] != "undefined", "missing Wasm export: dynCall_v");
    assert(typeof wasmExports2["dynCall_iiii"] != "undefined", "missing Wasm export: dynCall_iiii");
    assert(typeof wasmExports2["dynCall_viii"] != "undefined", "missing Wasm export: dynCall_viii");
    assert(typeof wasmExports2["dynCall_vi"] != "undefined", "missing Wasm export: dynCall_vi");
    assert(typeof wasmExports2["dynCall_viiiiiiii"] != "undefined", "missing Wasm export: dynCall_viiiiiiii");
    assert(typeof wasmExports2["dynCall_iiif"] != "undefined", "missing Wasm export: dynCall_iiif");
    assert(typeof wasmExports2["dynCall_viiii"] != "undefined", "missing Wasm export: dynCall_viiii");
    assert(typeof wasmExports2["dynCall_viiiii"] != "undefined", "missing Wasm export: dynCall_viiiii");
    assert(typeof wasmExports2["dynCall_viiiiii"] != "undefined", "missing Wasm export: dynCall_viiiiii");
    assert(typeof wasmExports2["dynCall_fiif"] != "undefined", "missing Wasm export: dynCall_fiif");
    assert(typeof wasmExports2["dynCall_iiiiiii"] != "undefined", "missing Wasm export: dynCall_iiiiiii");
    assert(typeof wasmExports2["dynCall_i"] != "undefined", "missing Wasm export: dynCall_i");
    assert(typeof wasmExports2["dynCall_iiiiii"] != "undefined", "missing Wasm export: dynCall_iiiiii");
    assert(typeof wasmExports2["dynCall_ffff"] != "undefined", "missing Wasm export: dynCall_ffff");
    assert(typeof wasmExports2["dynCall_viif"] != "undefined", "missing Wasm export: dynCall_viif");
    assert(typeof wasmExports2["dynCall_iiiii"] != "undefined", "missing Wasm export: dynCall_iiiii");
    assert(typeof wasmExports2["dynCall_viiiiiii"] != "undefined", "missing Wasm export: dynCall_viiiiiii");
    assert(typeof wasmExports2["dynCall_viiiiiiiiffffffi"] != "undefined", "missing Wasm export: dynCall_viiiiiiiiffffffi");
    assert(typeof wasmExports2["dynCall_iid"] != "undefined", "missing Wasm export: dynCall_iid");
    assert(typeof wasmExports2["dynCall_d"] != "undefined", "missing Wasm export: dynCall_d");
    assert(typeof wasmExports2["dynCall_vd"] != "undefined", "missing Wasm export: dynCall_vd");
    assert(typeof wasmExports2["dynCall_viiiiiiiii"] != "undefined", "missing Wasm export: dynCall_viiiiiiiii");
    assert(typeof wasmExports2["dynCall_viiiif"] != "undefined", "missing Wasm export: dynCall_viiiif");
    assert(typeof wasmExports2["dynCall_vffiiiiii"] != "undefined", "missing Wasm export: dynCall_vffiiiiii");
    assert(typeof wasmExports2["dynCall_viiiifi"] != "undefined", "missing Wasm export: dynCall_viiiifi");
    assert(typeof wasmExports2["dynCall_viifiiiifi"] != "undefined", "missing Wasm export: dynCall_viifiiiifi");
    assert(typeof wasmExports2["dynCall_viifffiii"] != "undefined", "missing Wasm export: dynCall_viifffiii");
    assert(typeof wasmExports2["dynCall_fiiii"] != "undefined", "missing Wasm export: dynCall_fiiii");
    assert(typeof wasmExports2["dynCall_fiii"] != "undefined", "missing Wasm export: dynCall_fiii");
    assert(typeof wasmExports2["dynCall_viiif"] != "undefined", "missing Wasm export: dynCall_viiif");
    assert(typeof wasmExports2["dynCall_viiiiifi"] != "undefined", "missing Wasm export: dynCall_viiiiifi");
    assert(typeof wasmExports2["dynCall_iiiiiiffffi"] != "undefined", "missing Wasm export: dynCall_iiiiiiffffi");
    assert(typeof wasmExports2["dynCall_vijii"] != "undefined", "missing Wasm export: dynCall_vijii");
    assert(typeof wasmExports2["dynCall_iiiiiiii"] != "undefined", "missing Wasm export: dynCall_iiiiiiii");
    assert(typeof wasmExports2["dynCall_jiji"] != "undefined", "missing Wasm export: dynCall_jiji");
    assert(typeof wasmExports2["dynCall_iidiiiii"] != "undefined", "missing Wasm export: dynCall_iidiiiii");
    assert(typeof wasmExports2["dynCall_viijii"] != "undefined", "missing Wasm export: dynCall_viijii");
    assert(typeof wasmExports2["dynCall_iiiiiiiiiiiii"] != "undefined", "missing Wasm export: dynCall_iiiiiiiiiiiii");
    assert(typeof wasmExports2["dynCall_diii"] != "undefined", "missing Wasm export: dynCall_diii");
    assert(typeof wasmExports2["dynCall_iiiiiiiiiiii"] != "undefined", "missing Wasm export: dynCall_iiiiiiiiiiii");
    assert(typeof wasmExports2["dynCall_viiiiiiiiii"] != "undefined", "missing Wasm export: dynCall_viiiiiiiiii");
    assert(typeof wasmExports2["dynCall_viiiiiiiiiiiiiii"] != "undefined", "missing Wasm export: dynCall_viiiiiiiiiiiiiii");
    assert(typeof wasmExports2["dynCall_iiiiiiiii"] != "undefined", "missing Wasm export: dynCall_iiiiiiiii");
    assert(typeof wasmExports2["dynCall_iiiiij"] != "undefined", "missing Wasm export: dynCall_iiiiij");
    assert(typeof wasmExports2["dynCall_iiiiid"] != "undefined", "missing Wasm export: dynCall_iiiiid");
    assert(typeof wasmExports2["dynCall_iiiiijj"] != "undefined", "missing Wasm export: dynCall_iiiiijj");
    assert(typeof wasmExports2["dynCall_iiiiiijj"] != "undefined", "missing Wasm export: dynCall_iiiiiijj");
    assert(typeof wasmExports2["asyncify_start_unwind"] != "undefined", "missing Wasm export: asyncify_start_unwind");
    assert(typeof wasmExports2["asyncify_stop_unwind"] != "undefined", "missing Wasm export: asyncify_stop_unwind");
    assert(typeof wasmExports2["asyncify_start_rewind"] != "undefined", "missing Wasm export: asyncify_start_rewind");
    assert(typeof wasmExports2["asyncify_stop_rewind"] != "undefined", "missing Wasm export: asyncify_stop_rewind");
    assert(typeof wasmExports2["memory"] != "undefined", "missing Wasm export: memory");
    assert(typeof wasmExports2["__indirect_function_table"] != "undefined", "missing Wasm export: __indirect_function_table");
    _init = Module2["_init"] = createExportWrapper("init", wasmExports2["init"], 1);
    _resize = Module2["_resize"] = createExportWrapper("resize", wasmExports2["resize"], 3);
    _loadSusText = Module2["_loadSusText"] = createExportWrapper("loadSusText", wasmExports2["loadSusText"], 2);
    _loadSusTextPrecise = Module2["_loadSusTextPrecise"] = createExportWrapper("loadSusTextPrecise", wasmExports2["loadSusTextPrecise"], 2);
    _loadCustomScoreJsonTextPrecise = Module2["_loadCustomScoreJsonTextPrecise"] = createExportWrapper("loadCustomScoreJsonTextPrecise", wasmExports2["loadCustomScoreJsonTextPrecise"], 2);
    _setPreviewConfig = Module2["_setPreviewConfig"] = createExportWrapper("setPreviewConfig", wasmExports2["setPreviewConfig"], 15);
    _render = Module2["_render"] = createExportWrapper("render", wasmExports2["render"], 1);
    _getLastError = Module2["_getLastError"] = createExportWrapper("getLastError", wasmExports2["getLastError"], 0);
    _getQuadBufferPointer = Module2["_getQuadBufferPointer"] = createExportWrapper("getQuadBufferPointer", wasmExports2["getQuadBufferPointer"], 0);
    _getFramePhaseTimingJson = Module2["_getFramePhaseTimingJson"] = createExportWrapper("getFramePhaseTimingJson", wasmExports2["getFramePhaseTimingJson"], 0);
    _getQuadCount = Module2["_getQuadCount"] = createExportWrapper("getQuadCount", wasmExports2["getQuadCount"], 0);
    _getChartEndTimeSec = Module2["_getChartEndTimeSec"] = createExportWrapper("getChartEndTimeSec", wasmExports2["getChartEndTimeSec"], 0);
    _getHitEventBufferPointer = Module2["_getHitEventBufferPointer"] = createExportWrapper("getHitEventBufferPointer", wasmExports2["getHitEventBufferPointer"], 0);
    _getHitEventCount = Module2["_getHitEventCount"] = createExportWrapper("getHitEventCount", wasmExports2["getHitEventCount"], 0);
    _getMetadataTitle = Module2["_getMetadataTitle"] = createExportWrapper("getMetadataTitle", wasmExports2["getMetadataTitle"], 0);
    _getMetadataArtist = Module2["_getMetadataArtist"] = createExportWrapper("getMetadataArtist", wasmExports2["getMetadataArtist"], 0);
    _getMetadataDesigner = Module2["_getMetadataDesigner"] = createExportWrapper("getMetadataDesigner", wasmExports2["getMetadataDesigner"], 0);
    _getHudEventBufferPointer = Module2["_getHudEventBufferPointer"] = createExportWrapper("getHudEventBufferPointer", wasmExports2["getHudEventBufferPointer"], 0);
    _getHudEventCount = Module2["_getHudEventCount"] = createExportWrapper("getHudEventCount", wasmExports2["getHudEventCount"], 0);
    _dispose = Module2["_dispose"] = createExportWrapper("dispose", wasmExports2["dispose"], 0);
    _free = Module2["_free"] = createExportWrapper("free", wasmExports2["free"], 1);
    _malloc = Module2["_malloc"] = createExportWrapper("malloc", wasmExports2["malloc"], 1);
    _initPlayer = Module2["_initPlayer"] = createExportWrapper("initPlayer", wasmExports2["initPlayer"], 4);
    _getGpuRenderer = Module2["_getGpuRenderer"] = createExportWrapper("getGpuRenderer", wasmExports2["getGpuRenderer"], 0);
    _resizePlayer = Module2["_resizePlayer"] = createExportWrapper("resizePlayer", wasmExports2["resizePlayer"], 3);
    _preloadAssetData = Module2["_preloadAssetData"] = createExportWrapper("preloadAssetData", wasmExports2["preloadAssetData"], 3);
    _preloadFontData = Module2["_preloadFontData"] = createExportWrapper("preloadFontData", wasmExports2["preloadFontData"], 3);
    _preloadSoundData = Module2["_preloadSoundData"] = createExportWrapper("preloadSoundData", wasmExports2["preloadSoundData"], 3);
    _loadSession = Module2["_loadSession"] = createExportWrapper("loadSession", wasmExports2["loadSession"], 16);
    _loadCustomScoreJsonSession = Module2["_loadCustomScoreJsonSession"] = createExportWrapper("loadCustomScoreJsonSession", wasmExports2["loadCustomScoreJsonSession"], 16);
    _playPlayer = Module2["_playPlayer"] = createExportWrapper("playPlayer", wasmExports2["playPlayer"], 0);
    _unlockPlayerAudio = Module2["_unlockPlayerAudio"] = createExportWrapper("unlockPlayerAudio", wasmExports2["unlockPlayerAudio"], 0);
    _pausePlayer = Module2["_pausePlayer"] = createExportWrapper("pausePlayer", wasmExports2["pausePlayer"], 0);
    _seekPlayer = Module2["_seekPlayer"] = createExportWrapper("seekPlayer", wasmExports2["seekPlayer"], 1);
    _setPlayerPlaybackRate = Module2["_setPlayerPlaybackRate"] = createExportWrapper("setPlayerPlaybackRate", wasmExports2["setPlayerPlaybackRate"], 1);
    _setPlayerAudioVolumes = Module2["_setPlayerAudioVolumes"] = createExportWrapper("setPlayerAudioVolumes", wasmExports2["setPlayerAudioVolumes"], 2);
    _setPlayerPreviewConfig = Module2["_setPlayerPreviewConfig"] = createExportWrapper("setPlayerPreviewConfig", wasmExports2["setPlayerPreviewConfig"], 16);
    _renderPlayerFrame = Module2["_renderPlayerFrame"] = createExportWrapper("renderPlayerFrame", wasmExports2["renderPlayerFrame"], 0);
    _getPlayerFrameTimingJson = Module2["_getPlayerFrameTimingJson"] = createExportWrapper("getPlayerFrameTimingJson", wasmExports2["getPlayerFrameTimingJson"], 0);
    _getPlayerCurrentTimeSec = Module2["_getPlayerCurrentTimeSec"] = createExportWrapper("getPlayerCurrentTimeSec", wasmExports2["getPlayerCurrentTimeSec"], 0);
    _getPlayerDurationSec = Module2["_getPlayerDurationSec"] = createExportWrapper("getPlayerDurationSec", wasmExports2["getPlayerDurationSec"], 0);
    _getPlayerChartEndSec = Module2["_getPlayerChartEndSec"] = createExportWrapper("getPlayerChartEndSec", wasmExports2["getPlayerChartEndSec"], 0);
    _getPlayerSourceOffsetSec = Module2["_getPlayerSourceOffsetSec"] = createExportWrapper("getPlayerSourceOffsetSec", wasmExports2["getPlayerSourceOffsetSec"], 0);
    _getPlayerEffectiveLeadInSec = Module2["_getPlayerEffectiveLeadInSec"] = createExportWrapper("getPlayerEffectiveLeadInSec", wasmExports2["getPlayerEffectiveLeadInSec"], 0);
    _getPlayerAudioStartDelaySec = Module2["_getPlayerAudioStartDelaySec"] = createExportWrapper("getPlayerAudioStartDelaySec", wasmExports2["getPlayerAudioStartDelaySec"], 0);
    _getPlayerApStartSec = Module2["_getPlayerApStartSec"] = createExportWrapper("getPlayerApStartSec", wasmExports2["getPlayerApStartSec"], 0);
    _getPlayerTransportState = Module2["_getPlayerTransportState"] = createExportWrapper("getPlayerTransportState", wasmExports2["getPlayerTransportState"], 0);
    _getPlayerRequiresGesture = Module2["_getPlayerRequiresGesture"] = createExportWrapper("getPlayerRequiresGesture", wasmExports2["getPlayerRequiresGesture"], 0);
    _getPlayerHasAudio = Module2["_getPlayerHasAudio"] = createExportWrapper("getPlayerHasAudio", wasmExports2["getPlayerHasAudio"], 0);
    _getPlayerWarningText = Module2["_getPlayerWarningText"] = createExportWrapper("getPlayerWarningText", wasmExports2["getPlayerWarningText"], 0);
    _disposePlayer = Module2["_disposePlayer"] = createExportWrapper("disposePlayer", wasmExports2["disposePlayer"], 0);
    _fflush = createExportWrapper("fflush", wasmExports2["fflush"], 1);
    _emscripten_stack_get_end = wasmExports2["emscripten_stack_get_end"];
    _emscripten_stack_get_base = wasmExports2["emscripten_stack_get_base"];
    _strerror = createExportWrapper("strerror", wasmExports2["strerror"], 1);
    _setThrew = createExportWrapper("setThrew", wasmExports2["setThrew"], 2);
    __emscripten_tempret_set = createExportWrapper("_emscripten_tempret_set", wasmExports2["_emscripten_tempret_set"], 1);
    _emscripten_stack_init = wasmExports2["emscripten_stack_init"];
    _emscripten_stack_get_free = wasmExports2["emscripten_stack_get_free"];
    __emscripten_stack_restore = wasmExports2["_emscripten_stack_restore"];
    __emscripten_stack_alloc = wasmExports2["_emscripten_stack_alloc"];
    _emscripten_stack_get_current = wasmExports2["emscripten_stack_get_current"];
    ___cxa_decrement_exception_refcount = createExportWrapper("__cxa_decrement_exception_refcount", wasmExports2["__cxa_decrement_exception_refcount"], 1);
    ___cxa_increment_exception_refcount = createExportWrapper("__cxa_increment_exception_refcount", wasmExports2["__cxa_increment_exception_refcount"], 1);
    ___get_exception_message = createExportWrapper("__get_exception_message", wasmExports2["__get_exception_message"], 3);
    ___cxa_can_catch = createExportWrapper("__cxa_can_catch", wasmExports2["__cxa_can_catch"], 3);
    ___cxa_get_exception_ptr = createExportWrapper("__cxa_get_exception_ptr", wasmExports2["__cxa_get_exception_ptr"], 1);
    ___set_stack_limits = Module2["___set_stack_limits"] = createExportWrapper("__set_stack_limits", wasmExports2["__set_stack_limits"], 2);
    dynCall_vii = dynCalls["vii"] = createExportWrapper("dynCall_vii", wasmExports2["dynCall_vii"], 3);
    dynCall_iii = dynCalls["iii"] = createExportWrapper("dynCall_iii", wasmExports2["dynCall_iii"], 3);
    dynCall_ii = dynCalls["ii"] = createExportWrapper("dynCall_ii", wasmExports2["dynCall_ii"], 2);
    dynCall_v = dynCalls["v"] = createExportWrapper("dynCall_v", wasmExports2["dynCall_v"], 1);
    dynCall_iiii = dynCalls["iiii"] = createExportWrapper("dynCall_iiii", wasmExports2["dynCall_iiii"], 4);
    dynCall_viii = dynCalls["viii"] = createExportWrapper("dynCall_viii", wasmExports2["dynCall_viii"], 4);
    dynCall_vi = dynCalls["vi"] = createExportWrapper("dynCall_vi", wasmExports2["dynCall_vi"], 2);
    dynCall_viiiiiiii = dynCalls["viiiiiiii"] = createExportWrapper("dynCall_viiiiiiii", wasmExports2["dynCall_viiiiiiii"], 9);
    dynCall_iiif = dynCalls["iiif"] = createExportWrapper("dynCall_iiif", wasmExports2["dynCall_iiif"], 4);
    dynCall_viiii = dynCalls["viiii"] = createExportWrapper("dynCall_viiii", wasmExports2["dynCall_viiii"], 5);
    dynCall_viiiii = dynCalls["viiiii"] = createExportWrapper("dynCall_viiiii", wasmExports2["dynCall_viiiii"], 6);
    dynCall_viiiiii = dynCalls["viiiiii"] = createExportWrapper("dynCall_viiiiii", wasmExports2["dynCall_viiiiii"], 7);
    dynCall_fiif = dynCalls["fiif"] = createExportWrapper("dynCall_fiif", wasmExports2["dynCall_fiif"], 4);
    dynCall_iiiiiii = dynCalls["iiiiiii"] = createExportWrapper("dynCall_iiiiiii", wasmExports2["dynCall_iiiiiii"], 7);
    dynCall_i = dynCalls["i"] = createExportWrapper("dynCall_i", wasmExports2["dynCall_i"], 1);
    dynCall_iiiiii = dynCalls["iiiiii"] = createExportWrapper("dynCall_iiiiii", wasmExports2["dynCall_iiiiii"], 6);
    dynCall_ffff = dynCalls["ffff"] = createExportWrapper("dynCall_ffff", wasmExports2["dynCall_ffff"], 4);
    dynCall_viif = dynCalls["viif"] = createExportWrapper("dynCall_viif", wasmExports2["dynCall_viif"], 4);
    dynCall_iiiii = dynCalls["iiiii"] = createExportWrapper("dynCall_iiiii", wasmExports2["dynCall_iiiii"], 5);
    dynCall_viiiiiii = dynCalls["viiiiiii"] = createExportWrapper("dynCall_viiiiiii", wasmExports2["dynCall_viiiiiii"], 8);
    dynCall_viiiiiiiiffffffi = dynCalls["viiiiiiiiffffffi"] = createExportWrapper("dynCall_viiiiiiiiffffffi", wasmExports2["dynCall_viiiiiiiiffffffi"], 16);
    dynCall_iid = dynCalls["iid"] = createExportWrapper("dynCall_iid", wasmExports2["dynCall_iid"], 3);
    dynCall_d = dynCalls["d"] = createExportWrapper("dynCall_d", wasmExports2["dynCall_d"], 1);
    dynCall_vd = dynCalls["vd"] = createExportWrapper("dynCall_vd", wasmExports2["dynCall_vd"], 2);
    dynCall_viiiiiiiii = dynCalls["viiiiiiiii"] = createExportWrapper("dynCall_viiiiiiiii", wasmExports2["dynCall_viiiiiiiii"], 10);
    dynCall_viiiif = dynCalls["viiiif"] = createExportWrapper("dynCall_viiiif", wasmExports2["dynCall_viiiif"], 6);
    dynCall_vffiiiiii = dynCalls["vffiiiiii"] = createExportWrapper("dynCall_vffiiiiii", wasmExports2["dynCall_vffiiiiii"], 9);
    dynCall_viiiifi = dynCalls["viiiifi"] = createExportWrapper("dynCall_viiiifi", wasmExports2["dynCall_viiiifi"], 7);
    dynCall_viifiiiifi = dynCalls["viifiiiifi"] = createExportWrapper("dynCall_viifiiiifi", wasmExports2["dynCall_viifiiiifi"], 10);
    dynCall_viifffiii = dynCalls["viifffiii"] = createExportWrapper("dynCall_viifffiii", wasmExports2["dynCall_viifffiii"], 9);
    dynCall_fiiii = dynCalls["fiiii"] = createExportWrapper("dynCall_fiiii", wasmExports2["dynCall_fiiii"], 5);
    dynCall_fiii = dynCalls["fiii"] = createExportWrapper("dynCall_fiii", wasmExports2["dynCall_fiii"], 4);
    dynCall_viiif = dynCalls["viiif"] = createExportWrapper("dynCall_viiif", wasmExports2["dynCall_viiif"], 5);
    dynCall_viiiiifi = dynCalls["viiiiifi"] = createExportWrapper("dynCall_viiiiifi", wasmExports2["dynCall_viiiiifi"], 8);
    dynCall_iiiiiiffffi = dynCalls["iiiiiiffffi"] = createExportWrapper("dynCall_iiiiiiffffi", wasmExports2["dynCall_iiiiiiffffi"], 11);
    dynCall_vijii = dynCalls["vijii"] = createExportWrapper("dynCall_vijii", wasmExports2["dynCall_vijii"], 5);
    dynCall_iiiiiiii = dynCalls["iiiiiiii"] = createExportWrapper("dynCall_iiiiiiii", wasmExports2["dynCall_iiiiiiii"], 8);
    dynCall_jiji = dynCalls["jiji"] = createExportWrapper("dynCall_jiji", wasmExports2["dynCall_jiji"], 4);
    dynCall_iidiiiii = dynCalls["iidiiiii"] = createExportWrapper("dynCall_iidiiiii", wasmExports2["dynCall_iidiiiii"], 8);
    dynCall_viijii = dynCalls["viijii"] = createExportWrapper("dynCall_viijii", wasmExports2["dynCall_viijii"], 6);
    dynCall_iiiiiiiiiiiii = dynCalls["iiiiiiiiiiiii"] = createExportWrapper("dynCall_iiiiiiiiiiiii", wasmExports2["dynCall_iiiiiiiiiiiii"], 13);
    dynCall_diii = dynCalls["diii"] = createExportWrapper("dynCall_diii", wasmExports2["dynCall_diii"], 4);
    dynCall_iiiiiiiiiiii = dynCalls["iiiiiiiiiiii"] = createExportWrapper("dynCall_iiiiiiiiiiii", wasmExports2["dynCall_iiiiiiiiiiii"], 12);
    dynCall_viiiiiiiiii = dynCalls["viiiiiiiiii"] = createExportWrapper("dynCall_viiiiiiiiii", wasmExports2["dynCall_viiiiiiiiii"], 11);
    dynCall_viiiiiiiiiiiiiii = dynCalls["viiiiiiiiiiiiiii"] = createExportWrapper("dynCall_viiiiiiiiiiiiiii", wasmExports2["dynCall_viiiiiiiiiiiiiii"], 16);
    dynCall_iiiiiiiii = dynCalls["iiiiiiiii"] = createExportWrapper("dynCall_iiiiiiiii", wasmExports2["dynCall_iiiiiiiii"], 9);
    dynCall_iiiiij = dynCalls["iiiiij"] = createExportWrapper("dynCall_iiiiij", wasmExports2["dynCall_iiiiij"], 6);
    dynCall_iiiiid = dynCalls["iiiiid"] = createExportWrapper("dynCall_iiiiid", wasmExports2["dynCall_iiiiid"], 6);
    dynCall_iiiiijj = dynCalls["iiiiijj"] = createExportWrapper("dynCall_iiiiijj", wasmExports2["dynCall_iiiiijj"], 7);
    dynCall_iiiiiijj = dynCalls["iiiiiijj"] = createExportWrapper("dynCall_iiiiiijj", wasmExports2["dynCall_iiiiiijj"], 8);
    _asyncify_start_unwind = createExportWrapper("asyncify_start_unwind", wasmExports2["asyncify_start_unwind"], 1);
    _asyncify_stop_unwind = createExportWrapper("asyncify_stop_unwind", wasmExports2["asyncify_stop_unwind"], 0);
    _asyncify_start_rewind = createExportWrapper("asyncify_start_rewind", wasmExports2["asyncify_start_rewind"], 1);
    _asyncify_stop_rewind = createExportWrapper("asyncify_stop_rewind", wasmExports2["asyncify_stop_rewind"], 0);
    memory = wasmMemory = wasmExports2["memory"];
    __indirect_function_table = wasmTable = wasmExports2["__indirect_function_table"];
  }
  var wasmImports = { __assert_fail: ___assert_fail, __asyncjs__jsAudioLoadBgm, __asyncjs__jsAudioLoadSound, __asyncjs__jsAudioPlay, __asyncjs__jsAudioUnlock, __cxa_begin_catch: ___cxa_begin_catch, __cxa_end_catch: ___cxa_end_catch, __cxa_find_matching_catch_2: ___cxa_find_matching_catch_2, __cxa_find_matching_catch_3: ___cxa_find_matching_catch_3, __cxa_rethrow: ___cxa_rethrow, __cxa_throw: ___cxa_throw, __cxa_uncaught_exceptions: ___cxa_uncaught_exceptions, __handle_stack_overflow: ___handle_stack_overflow, __resumeException: ___resumeException, __syscall_fcntl64: ___syscall_fcntl64, __syscall_ioctl: ___syscall_ioctl, __syscall_openat: ___syscall_openat, _abort_js: __abort_js, _tzset_js: __tzset_js, clock_time_get: _clock_time_get, emscripten_err: _emscripten_err, emscripten_resize_heap: _emscripten_resize_heap, emscripten_set_canvas_element_size: _emscripten_set_canvas_element_size, emscripten_webgl_create_context: _emscripten_webgl_create_context, emscripten_webgl_destroy_context: _emscripten_webgl_destroy_context, emscripten_webgl_make_context_current: _emscripten_webgl_make_context_current, environ_get: _environ_get, environ_sizes_get: _environ_sizes_get, exit: _exit, fd_close: _fd_close, fd_read: _fd_read, fd_seek: _fd_seek, fd_write: _fd_write, glActiveTexture: _glActiveTexture, glAttachShader: _glAttachShader, glBindBuffer: _glBindBuffer, glBindSampler: _glBindSampler, glBindTexture: _glBindTexture, glBindVertexArray: _glBindVertexArray, glBlendEquation: _glBlendEquation, glBlendFunc: _glBlendFunc, glBlendFuncSeparate: _glBlendFuncSeparate, glBufferData: _glBufferData, glBufferSubData: _glBufferSubData, glClear: _glClear, glClearColor: _glClearColor, glCompileShader: _glCompileShader, glCreateProgram: _glCreateProgram, glCreateShader: _glCreateShader, glDeleteBuffers: _glDeleteBuffers, glDeleteProgram: _glDeleteProgram, glDeleteShader: _glDeleteShader, glDeleteTextures: _glDeleteTextures, glDeleteVertexArrays: _glDeleteVertexArrays, glDetachShader: _glDetachShader, glDisable: _glDisable, glDrawArrays: _glDrawArrays, glDrawElements: _glDrawElements, glEnable: _glEnable, glEnableVertexAttribArray: _glEnableVertexAttribArray, glFlush: _glFlush, glGenBuffers: _glGenBuffers, glGenTextures: _glGenTextures, glGenVertexArrays: _glGenVertexArrays, glGetAttribLocation: _glGetAttribLocation, glGetIntegerv: _glGetIntegerv, glGetProgramInfoLog: _glGetProgramInfoLog, glGetProgramiv: _glGetProgramiv, glGetShaderInfoLog: _glGetShaderInfoLog, glGetShaderiv: _glGetShaderiv, glGetString: _glGetString, glGetUniformLocation: _glGetUniformLocation, glLinkProgram: _glLinkProgram, glPixelStorei: _glPixelStorei, glScissor: _glScissor, glShaderSource: _glShaderSource, glTexImage2D: _glTexImage2D, glTexParameteri: _glTexParameteri, glTexSubImage2D: _glTexSubImage2D, glUniform1i: _glUniform1i, glUniformMatrix4fv: _glUniformMatrix4fv, glUseProgram: _glUseProgram, glVertexAttribPointer: _glVertexAttribPointer, glViewport: _glViewport, invoke_d, invoke_diii, invoke_ffff, invoke_fiif, invoke_fiii, invoke_fiiii, invoke_i, invoke_ii, invoke_iid, invoke_iii, invoke_iiif, invoke_iiii, invoke_iiiii, invoke_iiiiii, invoke_iiiiiiffffi, invoke_iiiiiii, invoke_iiiiiiii, invoke_iiiiiiiiiiii, invoke_iiiiiiiiiiiii, invoke_v, invoke_vd, invoke_vffiiiiii, invoke_vi, invoke_vii, invoke_viif, invoke_viifffiii, invoke_viifiiiifi, invoke_viii, invoke_viiif, invoke_viiii, invoke_viiiif, invoke_viiiifi, invoke_viiiii, invoke_viiiiifi, invoke_viiiiii, invoke_viiiiiii, invoke_viiiiiiii, invoke_viiiiiiiiffffffi, invoke_viiiiiiiii, invoke_viiiiiiiiii, invoke_viiiiiiiiiiiiiii, invoke_vijii, jsAudioCleanupExtendables, jsAudioClearOneShots, jsAudioEnsureEngine, jsAudioGetCurrentTime, jsAudioGetLastError, jsAudioGetStateCode, jsAudioHasAudio, jsAudioPause, jsAudioRequiresGesture, jsAudioSeek, jsAudioSetDuration, jsAudioSetPlaybackRate, jsAudioSetStartOffset, jsAudioSetVolumes, jsAudioTriggerExtendable, jsAudioTriggerOneShot, jsAudioTriggerOneShotAtOffset, jsReadGpuRenderer, llvm_eh_typeid_for: _llvm_eh_typeid_for };
  function invoke_vii(index, a1, a2) {
    var sp = stackSave();
    try {
      dynCall_vii(index, a1, a2);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_v(index) {
    var sp = stackSave();
    try {
      dynCall_v(index);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_ii(index, a1) {
    var sp = stackSave();
    try {
      return dynCall_ii(index, a1);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiii(index, a1, a2, a3) {
    var sp = stackSave();
    try {
      return dynCall_iiii(index, a1, a2, a3);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viii(index, a1, a2, a3) {
    var sp = stackSave();
    try {
      dynCall_viii(index, a1, a2, a3);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iii(index, a1, a2) {
    var sp = stackSave();
    try {
      return dynCall_iii(index, a1, a2);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_vi(index, a1) {
    var sp = stackSave();
    try {
      dynCall_vi(index, a1);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
    var sp = stackSave();
    try {
      dynCall_viiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiif(index, a1, a2, a3) {
    var sp = stackSave();
    try {
      return dynCall_iiif(index, a1, a2, a3);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiii(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
      dynCall_viiii(index, a1, a2, a3, a4);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiiii(index, a1, a2, a3, a4, a5) {
    var sp = stackSave();
    try {
      dynCall_viiiii(index, a1, a2, a3, a4, a5);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiiiii(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
      dynCall_viiiiii(index, a1, a2, a3, a4, a5, a6);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_fiif(index, a1, a2, a3) {
    var sp = stackSave();
    try {
      return dynCall_fiif(index, a1, a2, a3);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiiiiii(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
      return dynCall_iiiiiii(index, a1, a2, a3, a4, a5, a6);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viif(index, a1, a2, a3) {
    var sp = stackSave();
    try {
      dynCall_viif(index, a1, a2, a3);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiiiii(index, a1, a2, a3, a4, a5) {
    var sp = stackSave();
    try {
      return dynCall_iiiiii(index, a1, a2, a3, a4, a5);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiiii(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
      return dynCall_iiiii(index, a1, a2, a3, a4);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_i(index) {
    var sp = stackSave();
    try {
      return dynCall_i(index);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
    var sp = stackSave();
    try {
      dynCall_viiiiiii(index, a1, a2, a3, a4, a5, a6, a7);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiiiiiiiffffffi(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15) {
    var sp = stackSave();
    try {
      dynCall_viiiiiiiiffffffi(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iid(index, a1, a2) {
    var sp = stackSave();
    try {
      return dynCall_iid(index, a1, a2);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_d(index) {
    var sp = stackSave();
    try {
      return dynCall_d(index);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_vd(index, a1) {
    var sp = stackSave();
    try {
      dynCall_vd(index, a1);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
    var sp = stackSave();
    try {
      dynCall_viiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiiif(index, a1, a2, a3, a4, a5) {
    var sp = stackSave();
    try {
      dynCall_viiiif(index, a1, a2, a3, a4, a5);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_vffiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
    var sp = stackSave();
    try {
      dynCall_vffiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiiifi(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
      dynCall_viiiifi(index, a1, a2, a3, a4, a5, a6);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viifiiiifi(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
    var sp = stackSave();
    try {
      dynCall_viifiiiifi(index, a1, a2, a3, a4, a5, a6, a7, a8, a9);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viifffiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
    var sp = stackSave();
    try {
      dynCall_viifffiii(index, a1, a2, a3, a4, a5, a6, a7, a8);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_fiii(index, a1, a2, a3) {
    var sp = stackSave();
    try {
      return dynCall_fiii(index, a1, a2, a3);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_ffff(index, a1, a2, a3) {
    var sp = stackSave();
    try {
      return dynCall_ffff(index, a1, a2, a3);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_fiiii(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
      return dynCall_fiiii(index, a1, a2, a3, a4);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiif(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
      dynCall_viiif(index, a1, a2, a3, a4);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiiiifi(index, a1, a2, a3, a4, a5, a6, a7) {
    var sp = stackSave();
    try {
      dynCall_viiiiifi(index, a1, a2, a3, a4, a5, a6, a7);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiiiiiffffi(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
    var sp = stackSave();
    try {
      return dynCall_iiiiiiffffi(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_vijii(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
      dynCall_vijii(index, a1, a2, a3, a4);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
    var sp = stackSave();
    try {
      return dynCall_iiiiiiii(index, a1, a2, a3, a4, a5, a6, a7);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) {
    var sp = stackSave();
    try {
      return dynCall_iiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_diii(index, a1, a2, a3) {
    var sp = stackSave();
    try {
      return dynCall_diii(index, a1, a2, a3);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
    var sp = stackSave();
    try {
      return dynCall_iiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
    var sp = stackSave();
    try {
      dynCall_viiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiiiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15) {
    var sp = stackSave();
    try {
      dynCall_viiiiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15);
    } catch (e) {
      stackRestore(sp);
      if (!(e instanceof EmscriptenEH)) throw e;
      _setThrew(1, 0);
    }
  }
  var calledRun;
  function stackCheckInit() {
    _emscripten_stack_init();
    writeStackCookie();
  }
  async function run() {
    assert(!calledRun);
    calledRun = true;
    stackCheckInit();
    preRun();
    if (runDependencies) {
      await resolveRunDependencies();
    }
    var setStatus = Module2["setStatus"];
    if (setStatus) {
      setStatus("Running...");
      await new Promise((resolve) => setTimeout(resolve, 1));
      setTimeout(setStatus, 1, "");
    }
    if (ABORT) return;
    initRuntime();
    Module2["onRuntimeInitialized"]?.();
    consumedModuleProp("onRuntimeInitialized");
    assert(!Module2["_main"], 'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');
    postRun();
  }
  function checkUnflushedContent() {
    var oldOut = out;
    var oldErr = err;
    var has = false;
    out = err = (x) => {
      has = true;
    };
    try {
      _fflush(0);
      for (var tty of Object.values(TTY.ttys)) {
        if (tty.output.length) {
          has = true;
        }
      }
    } catch (e) {
    }
    out = oldOut;
    err = oldErr;
    if (has) {
      warnOnce("stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the Emscripten FAQ), or make sure to emit a newline when you printf etc.");
    }
  }
  var wasmExports;
  wasmExports = await createWasm();
  await run();
  for (const prop of Object.keys(Module2)) {
    if (!(prop in moduleArg)) {
      Object.defineProperty(moduleArg, prop, { configurable: true, get() {
        abort(`Access to module property ('${prop}') is no longer possible via the module constructor argument; Instead, use the result of the module constructor.`);
      } });
    }
  }
  ;
  return Module2;
}
var mmw_preview_default;
var init_mmw_preview = __esm({
  "vendor/wasm/mmw-preview.js"() {
    "use strict";
    mmw_preview_default = Module;
  }
});

// src/view/wasmStage.ts
var DEFAULT_STAGE_CONFIG, TRANSPORT_STATES, WasmStage;
var init_wasmStage = __esm({
  "src/view/wasmStage.ts"() {
    "use strict";
    init_mmw_preview();
    DEFAULT_STAGE_CONFIG = {
      mirror: false,
      flickAnimation: true,
      holdAnimation: true,
      simultaneousLine: true,
      effectProfile: 0,
      noteSkin: 0,
      noteColor: 0,
      specialNoteColors: false,
      damageSound: false,
      noteSpeed: 10.5,
      holdAlpha: 0.74,
      guideAlpha: 0.5,
      stageCover: 0,
      stageOpacity: 1,
      backgroundBrightness: 1,
      effectOpacity: 1
    };
    TRANSPORT_STATES = [
      "idle",
      "loading",
      "ready",
      "playing",
      "paused",
      "error"
    ];
    WasmStage = class {
      constructor() {
        __publicField(this, "module", null);
        __publicField(this, "canvasSelector", "#stage");
        __publicField(this, "loading", null);
        /**
         * Asyncify 一次只能挂起一个导出调用：`loadScore` / `unlockAudio` / `play`
         * 都走 EM_ASYNC_JS，必须串行，否则第二次调用会在模块仍挂起时进入而失败。
         */
        __publicField(this, "asyncQueue", Promise.resolve());
      }
      async init(canvas2, width, height, dpr2) {
        if (!canvas2.id) canvas2.id = "stage";
        this.canvasSelector = `#${canvas2.id}`;
        const module = await this.loadModule();
        const ok = Number(
          module.ccall("initPlayer", "number", ["string", "number", "number", "number"], [
            this.canvasSelector,
            Math.max(1, Math.round(width)),
            Math.max(1, Math.round(height)),
            Math.max(0.1, dpr2)
          ])
        );
        if (ok !== 1) {
          throw new Error(this.warnings() || "wasm \u6E32\u67D3\u5668\u521D\u59CB\u5316\u5931\u8D25");
        }
        console.info("[mmw] GPU renderer:", this.gpuRenderer());
      }
      /** 实际承担光栅化的后端名称（未掩码），软件渲染时会包含 SwiftShader / llvmpipe。 */
      gpuRenderer() {
        if (!this.module) return "unknown";
        return String(this.module.ccall("getGpuRenderer", "string", [], []) || "unknown");
      }
      loadModule() {
        if (this.module) return Promise.resolve(this.module);
        if (!this.loading) {
          const factory = mmw_preview_default;
          this.loading = factory({
            locateFile: (file) => file.endsWith(".wasm") ? "/vendor/wasm/mmw-preview.wasm" : `/vendor/wasm/${file}`,
            print: (message) => console.info("[wasm]", message),
            printErr: (message) => console.warn("[wasm]", message)
          }).then((module) => {
            this.module = module;
            return module;
          });
        }
        return this.loading;
      }
      get isReady() {
        return this.module !== null;
      }
      /** 调试用：拿到 emscripten 模块本身（浏览器控制台 / 探针脚本）。 */
      get raw() {
        return this.module;
      }
      /** 预加载贴图 / 字体 / 音效。返回成功与失败的条数。 */
      async preload(manifest2, onProgress) {
        const jobs = [];
        for (const name of manifest2.assets) {
          jobs.push({ kind: "asset", key: name, url: manifest2.base + encodeURI(name) });
        }
        for (const name of manifest2.fonts) {
          jobs.push({ kind: "font", key: name, url: manifest2.base + encodeURI(name) });
        }
        for (const [key, relative] of Object.entries(manifest2.sounds)) {
          jobs.push({ kind: "sound", key, url: manifest2.base + encodeURI(relative) });
        }
        let done = 0;
        const failed = [];
        const total = jobs.length;
        const concurrency = 8;
        let cursor = 0;
        const worker = async () => {
          while (cursor < jobs.length) {
            const job = jobs[cursor];
            cursor += 1;
            try {
              const response = await fetch(job.url);
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const bytes2 = new Uint8Array(await response.arrayBuffer());
              await this.upload(job.kind, job.key, bytes2);
            } catch (error) {
              failed.push(`${job.key}: ${error.message}`);
            }
            done += 1;
            onProgress?.(done, total);
          }
        };
        await Promise.all(Array.from({ length: concurrency }, () => worker()));
        return { loaded: done - failed.length, failed };
      }
      async upload(kind, key, bytes2) {
        const name = kind === "asset" ? "preloadAssetData" : kind === "font" ? "preloadFontData" : "preloadSoundData";
        const async = kind === "sound";
        const keyPtr = this.allocString(key);
        const data = this.allocBytes(bytes2);
        try {
          const result = await this.call(name, "number", ["number", "number", "number"], [keyPtr, data.ptr, data.length], async);
          if (Number(result) !== 1) {
            throw new Error(this.warnings() || `${name} \u5931\u8D25`);
          }
        } finally {
          this.freePtr(keyPtr);
          this.freePtr(data.ptr);
        }
      }
      loadScore(scoreText, options) {
        return this.enqueue(() => this.loadScoreNow(scoreText, options));
      }
      async loadScoreNow(scoreText, options = {}) {
        const text = (value) => this.allocString(value ?? "");
        const scorePtr = this.allocString(scoreText);
        const titlePtr = text(options.title);
        const lyricistPtr = text(options.lyricist);
        const composerPtr = text(options.composer);
        const arrangerPtr = text(options.arranger);
        const vocalPtr = text(options.vocal);
        const difficultyPtr = text(options.difficulty);
        const scoreTitlePtr = text(options.scoreTitle);
        const scoreCreatorPtr = text(options.scoreCreator);
        const bgm = this.allocBytes(options.bgm ?? null);
        const cover = this.allocBytes(options.cover ?? null);
        try {
          const result = await this.call(
            "loadCustomScoreJsonSession",
            "number",
            [
              "number",
              "number",
              "number",
              "number",
              "number",
              "number",
              "number",
              "number",
              "number",
              "number",
              "number",
              "number",
              "number",
              "number",
              "number",
              "number"
            ],
            [
              scorePtr,
              Math.round(options.offsetMs ?? 0),
              Math.round(options.leadInMs ?? 0),
              bgm.ptr,
              bgm.length,
              cover.ptr,
              cover.length,
              titlePtr,
              lyricistPtr,
              composerPtr,
              arrangerPtr,
              vocalPtr,
              difficultyPtr,
              options.customScoreInfo === false ? 0 : 1,
              scoreTitlePtr,
              scoreCreatorPtr
            ],
            true
          );
          if (Number(result) !== 1) {
            throw new Error(this.warnings() || "\u8F7D\u5165\u8C31\u9762\u5931\u8D25");
          }
        } finally {
          for (const ptr of [
            scorePtr,
            titlePtr,
            lyricistPtr,
            composerPtr,
            arrangerPtr,
            vocalPtr,
            difficultyPtr,
            scoreTitlePtr,
            scoreCreatorPtr,
            bgm.ptr,
            cover.ptr
          ]) {
            this.freePtr(ptr);
          }
        }
      }
      setConfig(config) {
        if (!this.module) return;
        this.module.ccall(
          "setPlayerPreviewConfig",
          null,
          [
            "number",
            "number",
            "number",
            "number",
            "number",
            "number",
            "number",
            "number",
            "number",
            "number",
            "number",
            "number",
            "number",
            "number",
            "number",
            "number"
          ],
          [
            config.mirror ? 1 : 0,
            config.flickAnimation ? 1 : 0,
            config.holdAnimation ? 1 : 0,
            config.simultaneousLine ? 1 : 0,
            config.effectProfile,
            config.noteSkin,
            config.noteColor,
            config.specialNoteColors ? 1 : 0,
            config.noteSpeed,
            config.holdAlpha,
            config.guideAlpha,
            config.stageCover,
            config.stageOpacity,
            config.backgroundBrightness,
            config.effectOpacity,
            config.damageSound ? 1 : 0
          ]
        );
      }
      setVolumes(bgm, sound) {
        if (!this.module) return;
        this.module.ccall("setPlayerAudioVolumes", null, ["number", "number"], [bgm, sound]);
      }
      /** 只做「解锁音频」，不开始播放；用于页面首次用户手势时预热 AudioContext。 */
      unlockAudio() {
        return this.enqueue(async () => {
          const result = await this.call("unlockPlayerAudio", "number", [], [], true);
          return Number(result) === 1;
        });
      }
      /** wasm 音频传输层的 AudioContext（录制音频轨要用）。 */
      getAudioContext() {
        if (!this.module) return null;
        const transport = this.module.__mmwAudio;
        return transport?.audioContext ?? null;
      }
      play() {
        return this.enqueue(async () => {
          await this.call("unlockPlayerAudio", "number", [], [], true);
          const ok = await this.call("playPlayer", "number", [], [], true);
          return Number(ok) === 1;
        });
      }
      pause() {
        if (!this.module) return;
        this.module.ccall("pausePlayer", null, [], []);
      }
      seek(seconds) {
        if (!this.module) return;
        this.module.ccall("seekPlayer", null, ["number"], [Math.max(0, seconds)]);
      }
      setRate(rate) {
        if (!this.module) return;
        this.module.ccall("setPlayerPlaybackRate", null, ["number"], [rate]);
      }
      resize(width, height, dpr2) {
        if (!this.module) return;
        this.module.ccall(
          "resizePlayer",
          null,
          ["number", "number", "number"],
          [Math.max(1, Math.round(width)), Math.max(1, Math.round(height)), Math.max(0.1, dpr2)]
        );
      }
      render() {
        if (!this.module) return;
        this.module.ccall("renderPlayerFrame", null, [], []);
      }
      /** Phase 0 量化：C++ 侧每帧各阶段耗时（JSON 字符串，原样透传）。 */
      framePhaseTimings() {
        if (!this.module) return "";
        try {
          return String(this.module.ccall("getFramePhaseTimingJson", "string", [], []) || "");
        } catch {
          return "";
        }
      }
      /** Phase 0 量化：C++ 建四边形 / 上传提交 两段耗时（JSON 字符串）。 */
      playerFrameTimings() {
        if (!this.module) return "";
        try {
          return String(this.module.ccall("getPlayerFrameTimingJson", "string", [], []) || "");
        } catch {
          return "";
        }
      }
      snapshot() {
        if (!this.module) {
          return {
            currentTimeSec: 0,
            durationSec: 0,
            chartEndSec: 0,
            effectiveLeadInSec: 0,
            transportState: "idle",
            requiresGesture: false,
            hasAudio: false,
            warnings: ""
          };
        }
        const module = this.module;
        const code = Number(module.ccall("getPlayerTransportState", "number", [], []));
        return {
          currentTimeSec: Number(module.ccall("getPlayerCurrentTimeSec", "number", [], [])),
          durationSec: Number(module.ccall("getPlayerDurationSec", "number", [], [])),
          chartEndSec: Number(module.ccall("getPlayerChartEndSec", "number", [], [])),
          effectiveLeadInSec: Number(module.ccall("getPlayerEffectiveLeadInSec", "number", [], [])),
          transportState: TRANSPORT_STATES[code] ?? "idle",
          requiresGesture: Number(module.ccall("getPlayerRequiresGesture", "number", [], [])) === 1,
          hasAudio: Number(module.ccall("getPlayerHasAudio", "number", [], [])) === 1,
          warnings: this.warnings()
        };
      }
      /**
       * 物量：谱面结束时的总 combo。
       *
       * wasm 侧把每一次判定记成一条 HUD 事件（打击音/长条中继/长条半拍…），HUD 里的
       * COMBO 就是按事件条数累加的，所以事件条数就等于打完这份谱的最终 combo。
       * 这里直接向已加载的会话要这个数，避免在 TS 侧重复实现一遍判定规则。
       */
      comboEventCount() {
        if (!this.module) return 0;
        try {
          return Number(this.module.ccall("getHudEventCount", "number", [], []) || 0);
        } catch {
          return 0;
        }
      }
      dispose() {
        if (!this.module) return;
        this.module.ccall("disposePlayer", null, [], []);
        this.module = null;
        this.loading = null;
      }
      warnings() {
        if (!this.module) return "";
        return String(this.module.ccall("getPlayerWarningText", "string", [], []) || "");
      }
      enqueue(task) {
        const run = this.asyncQueue.then(task, task);
        this.asyncQueue = run.then(
          () => void 0,
          () => void 0
        );
        return run;
      }
      async call(name, returnType, argTypes, args, async = false) {
        const module = this.require();
        const value = module.ccall(name, returnType, argTypes, args, async ? { async: true } : void 0);
        return async ? await value : value;
      }
      allocString(value) {
        const module = this.require();
        const encoded = new TextEncoder().encode(value);
        const ptr = module._malloc(encoded.length + 1);
        module.HEAPU8.set(encoded, ptr);
        module.HEAPU8[ptr + encoded.length] = 0;
        return ptr;
      }
      allocBytes(bytes2) {
        const module = this.require();
        if (!bytes2 || bytes2.length === 0) return { ptr: 0, length: 0 };
        const ptr = module._malloc(bytes2.length);
        module.HEAPU8.set(bytes2, ptr);
        return { ptr, length: bytes2.length };
      }
      freePtr(ptr) {
        if (!this.module || !ptr) return;
        this.module._free(ptr);
      }
      require() {
        if (!this.module) throw new Error("wasm \u6E32\u67D3\u5668\u5C1A\u672A\u521D\u59CB\u5316");
        return this.module;
      }
    };
  }
});

// ../src/lib/customScore.ts
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
function quantizeSpeedSegments(timeline2) {
  const sorted = sortChanges(
    timeline2.filter((change) => Number.isFinite(change.tick) && Number.isFinite(change.value)).map((change) => ({ tick: Math.round(change.tick), value: change.value }))
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
var TICKS_PER_BEAT, STAGE_EDGE, MIN_LANE_SIZE, MAX_LANE_SIZE, COORDINATE_PRECISION, EventType, BaseType, Category, LineType, CustomScoreBuilder, MIN_SPEED_SEGMENT_TICKS;
var init_customScore = __esm({
  "../src/lib/customScore.ts"() {
    "use strict";
    TICKS_PER_BEAT = 480;
    STAGE_EDGE = 6;
    MIN_LANE_SIZE = 0.05;
    MAX_LANE_SIZE = STAGE_EDGE;
    COORDINATE_PRECISION = 8192;
    EventType = {
      Bpm: 0,
      HiSpeed: 1,
      SeVolume: 2
    };
    BaseType = {
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
    Category = {
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
    LineType = {
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
    CustomScoreBuilder = class {
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
    MIN_SPEED_SEGMENT_TICKS = TICKS_PER_BEAT / 96;
  }
});

// ../src/lib/levelDataParser.ts
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
  const document2 = root;
  if (!Array.isArray(document2.entities)) {
    throw new Error("LevelData \u6587\u4EF6\u7F3A\u5C11 entities \u6570\u7EC4\u3002");
  }
  const entities = document2.entities.filter(
    (entity) => !!entity && typeof entity === "object" && typeof entity.archetype === "string"
  );
  const offsetSeconds = readNumber2(document2.bgmOffset, 0);
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
    const timeline2 = groupTimelines.get(name);
    const groupIndex = groupIndexByName.get(name);
    let cursor = resolve(valueOf(groupIndex, "first"));
    const guard = /* @__PURE__ */ new Set();
    while (cursor >= 0 && entities[cursor].archetype === "#TIMESCALE_CHANGE" && !guard.has(cursor)) {
      guard.add(cursor);
      const beat = readNumber2(valueOf(cursor, "#BEAT"), Number.NaN);
      const timeScale = readNumber2(valueOf(cursor, "#TIMESCALE"), Number.NaN);
      if (Number.isFinite(beat) && Number.isFinite(timeScale)) {
        timeline2.push({ tick: Math.round(beat * TICKS_PER_BEAT), value: timeScale });
      }
      cursor = resolve(valueOf(cursor, "next"));
    }
    timeline2.sort((left, right) => left.tick - right.tick);
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
  const referenceTimeline = speedLayers.find((timeline2) => timeline2.length > 0) ?? [];
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
    const last2 = readNumber2(valueOf(chain[chain.length - 1], "segmentAlpha"), 1);
    if (Math.abs(first - last2) < 1e-3) {
      return 1;
    }
    return last2 < first ? 0 : 2;
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
var EASE_LINEAR, GUIDE_COLOR_BASE;
var init_levelDataParser = __esm({
  "../src/lib/levelDataParser.ts"() {
    "use strict";
    init_customScore();
    EASE_LINEAR = 1;
    GUIDE_COLOR_BASE = 101;
  }
});

// src/bridge/clock.ts
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
var TICKS_PER_BEAT2;
var init_clock = __esm({
  "src/bridge/clock.ts"() {
    "use strict";
    TICKS_PER_BEAT2 = 480;
  }
});

// src/bridge/speed.ts
function buildSpeedLayers(chart2, clock, options = {}) {
  const beatsPerSample = Math.max(1 / 32, options.beatsPerSample ?? 1 / 8);
  const anchorNotes = options.anchorNotes !== false;
  return chart2.groups.map(
    (group, index) => buildLayer(chart2, index, clock, beatsPerSample, anchorNotes, group)
  );
}
function buildLayer(chart2, groupIndex, clock, beatsPerSample, anchorNotes, group) {
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
    for (const note of chart2.notes) {
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
var MAX_VALUE;
var init_speed = __esm({
  "src/bridge/speed.ts"() {
    "use strict";
    init_clock();
    MAX_VALUE = 1e6;
  }
});

// src/bridge/customScore.ts
function normalizeTimescaleGroups(text) {
  let document2;
  try {
    document2 = JSON.parse(text);
  } catch {
    return { text, renamed: 0 };
  }
  if (!document2 || !Array.isArray(document2.entities)) {
    return { text, renamed: 0 };
  }
  const used = /* @__PURE__ */ new Set();
  let renamed = 0;
  document2.entities.forEach((entity, index) => {
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
  return renamed > 0 ? { text: JSON.stringify(document2), renamed } : { text, renamed: 0 };
}
function buildCustomScore(levelDataText, chart2, options = {}) {
  const normalized = normalizeTimescaleGroups(levelDataText);
  const legacy = parseLevelData2(normalized.text);
  const document2 = JSON.parse(legacy.json);
  return finishBridge(document2, chart2, options, normalized.renamed);
}
function bridgeFromDocument(document2, chart2, options = {}) {
  const copy = JSON.parse(JSON.stringify(document2));
  return finishBridge(copy, chart2, options, 0);
}
function finishBridge(document2, chart2, options, normalizedGroups) {
  const tempos = readTempoEvents(document2);
  const clock = createTickClock(tempos);
  const layers = buildSpeedLayers(chart2, clock, options);
  const legacyLayers = document2.SpeedLayers ?? [];
  document2.SpeedLayers = layers;
  const warnings = [];
  if (layers.length !== chart2.groups.length) {
    warnings.push(`\u901F\u5EA6\u5C42 ${layers.length} \u6761 \u2260 \u65F6\u5E8F\u7EC4 ${chart2.groups.length} \u4E2A`);
  }
  let fixed = 0;
  for (const note of document2.NoteList) {
    const layer = Number(note.speedLayer);
    if (!Number.isInteger(layer) || layer < 0) continue;
    if (layer >= layers.length) {
      note.speedLayer = layers.length - 1;
      fixed += 1;
    }
  }
  const reference = layers.find((layer) => layer.length > 0) ?? [];
  let ratioChanged = 0;
  for (const note of document2.NoteList) {
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
    scoreText: JSON.stringify(document2),
    clock,
    tempos,
    legacyLayers,
    stats: {
      notes: document2.NoteList.length,
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
var init_customScore2 = __esm({
  "src/bridge/customScore.ts"() {
    "use strict";
    init_levelDataParser();
    init_customScore();
    init_clock();
    init_speed();
  }
});

// ../src/lib/uscParser.ts
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
  const document2 = root;
  const version = readNumber3(document2.version, 0);
  if (version !== 2) {
    throw new Error(`\u4E0D\u652F\u6301\u7684 USC \u7248\u672C\uFF1A${version === 0 ? "\u672A\u77E5" : version}\uFF08\u4EC5\u652F\u6301\u7248\u672C 2\uFF09\u3002`);
  }
  const usc2 = document2.usc;
  if (!usc2 || typeof usc2 !== "object" || Array.isArray(usc2)) {
    throw new Error("USC \u6587\u4EF6\u7F3A\u5C11 usc \u5B57\u6BB5\u3002");
  }
  const body = usc2;
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
  const speedLayers = timelines.map((timeline2) => quantizeSpeedSegments(timeline2));
  const layerIndexOf = (group) => {
    const index = Math.trunc(readNumber3(group, 0));
    return index >= 0 && index < speedLayers.length ? index : -1;
  };
  const referenceTimeline = speedLayers.find((timeline2) => timeline2.length > 0) ?? [];
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
var CHART_TYPE;
var init_uscParser = __esm({
  "../src/lib/uscParser.ts"() {
    "use strict";
    init_customScore();
    CHART_TYPE = ["single", "slide", "guide", "timescalegroup", "bpm", "damage"];
  }
});

// src/data/usc.ts
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
  const document2 = JSON.parse(parsed.json);
  const raw = JSON.parse(text);
  const objects = raw.usc?.objects ?? [];
  const bpmPoints = [];
  for (const event of document2.MusicScoreEventDataList) {
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
  const notes = document2.NoteList.map((note, index) => {
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
      next: note.nextConnectionId === -1 ? -1 : document2.NoteList.findIndex((n) => n.id === note.nextConnectionId),
      prev: note.previousConnectionId === -1 ? -1 : document2.NoteList.findIndex((n) => n.id === note.previousConnectionId),
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
  const chart2 = {
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
    chart: chart2,
    document: document2,
    scoreText: parsed.json,
    offsetSeconds: parsed.offsetSeconds,
    stats: {
      notes: notes.length,
      groups: chart2.groups.length,
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
var CHAIN_TYPES, GUIDE_TYPES, FLICK_TYPES, TRACE_TYPES;
var init_usc = __esm({
  "src/data/usc.ts"() {
    "use strict";
    init_uscParser();
    init_bpm();
    init_timescale();
    CHAIN_TYPES = /* @__PURE__ */ new Set([2, 5, 6, 7, 8, 9]);
    GUIDE_TYPES = /* @__PURE__ */ new Set([10, 13, 14]);
    FLICK_TYPES = /* @__PURE__ */ new Set([3, 4]);
    TRACE_TYPES = /* @__PURE__ */ new Set([11, 12]);
  }
});

// src/data/chartSource.ts
function hasGzipMagic(bytes2) {
  return bytes2.length >= 2 && bytes2[0] === GZIP_MAGIC_FIRST && bytes2[1] === GZIP_MAGIC_SECOND;
}
async function gunzip(bytes2) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301 gzip \u89E3\u538B\uFF0C\u8BF7\u5148\u89E3\u538B\u540E\u518D\u5BFC\u5165\u3002");
  }
  const stream = new Blob([bytes2]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
function normalizeText(text) {
  return text.charCodeAt(0) === 65279 ? text.slice(1) : text;
}
function isJsonText(text) {
  const head = text.trimStart();
  return head.startsWith("{") || head.startsWith("[");
}
function guessFormatFromName(name) {
  const lower = (name ?? "").toLowerCase();
  if (lower.endsWith(".usc")) return "usc";
  if (lower.endsWith(".lvdata") || lower.endsWith(".leveldata")) return "level-data";
  if (lower.endsWith(".sus")) return "sus";
  return "custom-score-json";
}
function detectFormatFromText(text, name) {
  if (!isJsonText(text)) return "sus";
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return guessFormatFromName(name);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "sus";
  const root = parsed;
  if (Array.isArray(root.MusicScoreEventDataList) || Array.isArray(root.NoteList)) return "custom-score-json";
  if (root.usc && typeof root.usc === "object") return "usc";
  if (Array.isArray(root.objects) && typeof root.version === "number") return "usc";
  if (Array.isArray(root.entities)) return "level-data";
  return guessFormatFromName(name);
}
async function decodeChartSource(source) {
  const gzipped = hasGzipMagic(source.bytes);
  const bytes2 = gzipped ? await gunzip(source.bytes) : source.bytes;
  const text = normalizeText(TEXT_DECODER.decode(bytes2));
  return { format: detectFormatFromText(text, source.name), text, gzipped };
}
var GZIP_MAGIC_FIRST, GZIP_MAGIC_SECOND, TEXT_DECODER;
var init_chartSource = __esm({
  "src/data/chartSource.ts"() {
    "use strict";
    GZIP_MAGIC_FIRST = 31;
    GZIP_MAGIC_SECOND = 139;
    TEXT_DECODER = new TextDecoder("utf-8");
  }
});

// src/preview/recorder.ts
function installAudioTapPatch() {
  if (connectPatchInstalled) {
    return;
  }
  if (typeof AudioNode === "undefined" || typeof AudioDestinationNode === "undefined") {
    return;
  }
  connectPatchInstalled = true;
  const prototype = AudioNode.prototype;
  const originalConnect = prototype.connect;
  originalAudioNodeConnect = originalConnect;
  prototype.connect = function patchedConnect(...args) {
    if (!insideTapSetup) {
      const target = args[0];
      if (target instanceof AudioDestinationNode) {
        const tap = ensureAudioTap(target.context);
        if (tap) {
          return originalConnect.apply(this, [tap.input, ...args.slice(1)]);
        }
      }
    }
    return originalConnect.apply(this, args);
  };
}
function ensureAudioTap(context) {
  const cached = audioTaps.get(context);
  if (cached) {
    return cached;
  }
  try {
    const input = context.createGain();
    input.gain.value = 1;
    const destination = context.createMediaStreamDestination();
    insideTapSetup = true;
    try {
      input.connect(context.destination);
      input.connect(destination);
    } finally {
      insideTapSetup = false;
    }
    const tap = { input, destination };
    audioTaps.set(context, tap);
    return tap;
  } catch {
    insideTapSetup = false;
    return null;
  }
}
function pickMimeSelection() {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }
  for (const candidate of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate;
    }
  }
  return null;
}
function isRecordingSupported() {
  return typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function" && pickMimeSelection() !== null;
}
function formatTimestamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}
function buildRecordingFileName(resolution, extension) {
  return `pjsk-viewer-${RECORDING_TARGETS[resolution].label}-${formatTimestamp(/* @__PURE__ */ new Date())}.${extension}`;
}
function downloadBlob(blob, fileName) {
  const url2 = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url2;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url2), 1e4);
}
async function saveRecording(result) {
  const fileName = buildRecordingFileName(result.resolution, result.extension);
  downloadBlob(result.blob, fileName);
  return { fileName, path: null, bytes: result.blob.size, savedToWorkspace: false };
}
function probeRecordedVideo(blob) {
  return new Promise((resolve) => {
    const url2 = URL.createObjectURL(blob);
    const video = document.createElement("video");
    let settled = false;
    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      URL.revokeObjectURL(url2);
      video.removeAttribute("src");
      resolve(result);
    };
    video.muted = true;
    video.preload = "metadata";
    video.addEventListener("loadedmetadata", () => finish(video.videoWidth > 0 && video.videoHeight > 0), {
      once: true
    });
    video.addEventListener("error", () => finish(false), { once: true });
    window.setTimeout(() => finish(false), RECORDING_PROBE_TIMEOUT_MS);
    video.src = url2;
  });
}
var DEFAULT_RECORDING_FPS, RECORDING_TARGETS, AUDIO_BITS_PER_SECOND, MIN_RECORDING_DURATION_MS, RECORDING_PROBE_TIMEOUT_MS, RECORDING_BLIT_INTERVAL_FACTOR, RECORDING_MAX_CATCHUP_FRAMES, MIME_CANDIDATES, audioTaps, originalAudioNodeConnect, insideTapSetup, connectPatchInstalled, PreviewRecorder;
var init_recorder = __esm({
  "src/preview/recorder.ts"() {
    "use strict";
    DEFAULT_RECORDING_FPS = 60;
    RECORDING_TARGETS = {
      720: { width: 1280, height: 720, videoBitsPerSecond: 6e6, label: "720p" },
      1080: { width: 1920, height: 1080, videoBitsPerSecond: 12e6, label: "1080p" }
    };
    AUDIO_BITS_PER_SECOND = 128e3;
    MIN_RECORDING_DURATION_MS = 500;
    RECORDING_PROBE_TIMEOUT_MS = 5e3;
    RECORDING_BLIT_INTERVAL_FACTOR = 0.8;
    RECORDING_MAX_CATCHUP_FRAMES = 10;
    MIME_CANDIDATES = [
      { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", extension: "mp4" },
      { mimeType: "video/mp4;codecs=avc1.4D401F,mp4a.40.2", extension: "mp4" },
      { mimeType: "video/mp4;codecs=avc1.640028,mp4a.40.2", extension: "mp4" },
      { mimeType: "video/mp4", extension: "mp4" },
      { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
      { mimeType: "video/webm;codecs=vp8,opus", extension: "webm" },
      { mimeType: "video/webm", extension: "webm" }
    ];
    audioTaps = /* @__PURE__ */ new WeakMap();
    originalAudioNodeConnect = null;
    insideTapSetup = false;
    connectPatchInstalled = false;
    installAudioTapPatch();
    PreviewRecorder = class {
      constructor() {
        __publicField(this, "stateValue", "idle");
        __publicField(this, "resolutionValue", 720);
        /** 本次录制选定的帧率（30 / 60），决定采集网格的间隔。 */
        __publicField(this, "fpsValue", DEFAULT_RECORDING_FPS);
        /** 一帧在采集网格上的间隔（毫秒）：1000 / fps。 */
        __publicField(this, "frameIntervalMs", 1e3 / DEFAULT_RECORDING_FPS);
        __publicField(this, "extensionValue", "mp4");
        __publicField(this, "mimeTypeValue", "");
        __publicField(this, "sourceCanvas", null);
        __publicField(this, "outputCanvas", null);
        __publicField(this, "outputContext", null);
        __publicField(this, "videoTrack", null);
        __publicField(this, "stream", null);
        __publicField(this, "audioTrack", null);
        __publicField(this, "recorder", null);
        __publicField(this, "chunks", []);
        __publicField(this, "accumulatedMs", 0);
        __publicField(this, "activeSinceMs", 0);
        /** Wall-clock anchor of the 60 Hz capture clock; frame n is due at start + n/60. */
        __publicField(this, "captureClockStartMs", 0);
        /** Index of the next frame on the capture clock. */
        __publicField(this, "captureFrameIndex", 0);
        __publicField(this, "captureTimer", null);
        /** 本次录制累计送进编码器的帧数（暂停后不清零，用于帧率读数）。 */
        __publicField(this, "capturedFramesTotal", 0);
        __publicField(this, "lastBlitMs", 0);
      }
      get state() {
        return this.stateValue;
      }
      get resolution() {
        return this.resolutionValue;
      }
      get fps() {
        return this.fpsValue;
      }
      get extension() {
        return this.extensionValue;
      }
      /** 已经交给编码器的帧数，用来在 UI 上显示真实录制帧率。 */
      get capturedFrames() {
        return this.capturedFramesTotal;
      }
      get elapsedMs() {
        if (this.stateValue !== "recording") {
          return this.accumulatedMs;
        }
        return this.accumulatedMs + (performance.now() - this.activeSinceMs);
      }
      async start(options) {
        if (this.stateValue !== "idle") {
          throw new Error("\u5F55\u5236\u5DF2\u5728\u8FDB\u884C\u4E2D\u3002");
        }
        const selection = pickMimeSelection();
        if (!selection || typeof HTMLCanvasElement.prototype.captureStream !== "function") {
          throw new Error("\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u753B\u5E03\u5F55\u5236\u3002");
        }
        const target = RECORDING_TARGETS[options.resolution];
        const output = document.createElement("canvas");
        output.width = target.width;
        output.height = target.height;
        const outputContext = output.getContext("2d", { alpha: false });
        if (!outputContext) {
          throw new Error("\u65E0\u6CD5\u521B\u5EFA\u5F55\u5236\u753B\u5E03\u3002");
        }
        outputContext.fillStyle = "#000000";
        outputContext.fillRect(0, 0, target.width, target.height);
        const stream = output.captureStream(0);
        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack || typeof videoTrack.requestFrame !== "function") {
          throw new Error("\u65E0\u6CD5\u521B\u5EFA\u89C6\u9891\u8F68\u9053\u3002");
        }
        let audioTrack = null;
        if (options.audioContext) {
          const tap = ensureAudioTap(options.audioContext);
          audioTrack = tap?.destination.stream.getAudioTracks()[0] ?? null;
          if (audioTrack) {
            stream.addTrack(audioTrack);
          }
        }
        const recorder2 = new MediaRecorder(stream, {
          mimeType: selection.mimeType,
          videoBitsPerSecond: target.videoBitsPerSecond,
          audioBitsPerSecond: AUDIO_BITS_PER_SECOND
        });
        const chunks = [];
        recorder2.addEventListener("dataavailable", (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        });
        this.sourceCanvas = options.canvas;
        this.outputCanvas = output;
        this.outputContext = outputContext;
        this.videoTrack = videoTrack;
        this.stream = stream;
        this.audioTrack = audioTrack;
        this.recorder = recorder2;
        this.chunks = chunks;
        this.extensionValue = selection.extension;
        this.mimeTypeValue = selection.mimeType;
        this.resolutionValue = options.resolution;
        this.fpsValue = options.fps === 30 ? 30 : DEFAULT_RECORDING_FPS;
        this.frameIntervalMs = 1e3 / this.fpsValue;
        this.accumulatedMs = 0;
        this.capturedFramesTotal = 0;
        this.activeSinceMs = performance.now();
        this.stateValue = "recording";
        recorder2.start();
        this.resetCaptureClock();
      }
      /**
       * 重启采集时钟：第 n 帧在 `start + n / fps` 到期，所以节拍本身不会累积漂移，
       * 定时器只决定「什么时候把当前画面交给编码器」。
       */
      resetCaptureClock() {
        this.clearCaptureTimer();
        this.captureClockStartMs = performance.now();
        this.captureFrameIndex = 0;
        this.lastBlitMs = Number.NEGATIVE_INFINITY;
        this.scheduleCaptureTick();
      }
      scheduleCaptureTick() {
        const dueAt = this.captureClockStartMs + this.captureFrameIndex * this.frameIntervalMs;
        const delay = Math.max(0, dueAt - performance.now());
        this.captureTimer = window.setTimeout(() => this.onCaptureTick(), delay);
      }
      onCaptureTick() {
        this.captureTimer = null;
        const track = this.videoTrack;
        if (this.stateValue !== "recording" || !track) {
          return;
        }
        const now = performance.now();
        const output = this.outputCanvas;
        const context = this.outputContext;
        for (let emitted = 0; emitted < RECORDING_MAX_CATCHUP_FRAMES; emitted += 1) {
          const dueAt = this.captureClockStartMs + this.captureFrameIndex * this.frameIntervalMs;
          if (dueAt > now + this.frameIntervalMs * 0.5) {
            break;
          }
          if (output && context) {
            context.drawImage(output, 0, 0, 1, 1, 0, 0, 1, 1);
          }
          track.requestFrame();
          this.captureFrameIndex += 1;
          this.capturedFramesTotal += 1;
        }
        const behindMs = now - (this.captureClockStartMs + this.captureFrameIndex * this.frameIntervalMs);
        if (behindMs > this.frameIntervalMs * RECORDING_MAX_CATCHUP_FRAMES) {
          this.captureClockStartMs = now - this.captureFrameIndex * this.frameIntervalMs;
        }
        this.scheduleCaptureTick();
      }
      clearCaptureTimer() {
        if (this.captureTimer !== null) {
          window.clearTimeout(this.captureTimer);
          this.captureTimer = null;
        }
      }
      /**
       * True when the renderer should draw this frame.
       *
       * 录制时只需要每秒 fps 张画面，120 / 144 Hz 的屏幕没必要每一帧都渲染 + 拷贝。
       * 不在录制中时调用方总是渲染。
       */
      frameDue() {
        if (this.stateValue !== "recording") {
          return true;
        }
        return performance.now() - this.lastBlitMs >= this.frameIntervalMs * RECORDING_BLIT_INTERVAL_FACTOR;
      }
      /**
       * Copies the current preview frame into the recording canvas. Must be called
       * synchronously after the player renders, while the WebGL drawing buffer is
       * still valid (the preview canvas has no `preserveDrawingBuffer`).
       *
       * This only stages pixels; handing them to the encoder is the capture clock's
       * job (`onCaptureTick`). The copy itself is capped to ~60 per second so a high
       * refresh display does not pay for a full-resolution blit it will never use.
       */
      capture() {
        if (this.stateValue !== "recording") {
          return;
        }
        const now = performance.now();
        if (now - this.lastBlitMs < this.frameIntervalMs * RECORDING_BLIT_INTERVAL_FACTOR) {
          return;
        }
        const source = this.sourceCanvas;
        const output = this.outputCanvas;
        const outputContext = this.outputContext;
        if (!source || !output || !outputContext || source.width < 1 || source.height < 1) {
          return;
        }
        this.lastBlitMs = now;
        outputContext.drawImage(source, 0, 0, output.width, output.height);
      }
      pause() {
        if (this.stateValue !== "recording" || !this.recorder) {
          return;
        }
        this.accumulatedMs += performance.now() - this.activeSinceMs;
        this.clearCaptureTimer();
        this.recorder.pause();
        this.stateValue = "paused";
      }
      resume() {
        if (this.stateValue !== "paused" || !this.recorder) {
          return;
        }
        this.activeSinceMs = performance.now();
        this.recorder.resume();
        this.stateValue = "recording";
        this.resetCaptureClock();
      }
      async stop() {
        const recorder2 = this.recorder;
        if (!recorder2 || this.stateValue === "idle") {
          throw new Error("\u5F53\u524D\u6CA1\u6709\u8FDB\u884C\u4E2D\u7684\u5F55\u5236\u3002");
        }
        if (this.stateValue === "recording") {
          this.accumulatedMs += performance.now() - this.activeSinceMs;
        }
        this.clearCaptureTimer();
        const durationMs = this.accumulatedMs;
        const extension = this.extensionValue;
        const resolution = this.resolutionValue;
        const fps = this.fpsValue;
        const mimeType = this.mimeTypeValue || "video/mp4";
        const blob = await new Promise((resolve, reject) => {
          const onStop = () => {
            recorder2.removeEventListener("stop", onStop);
            resolve(new Blob(this.chunks, { type: mimeType }));
          };
          recorder2.addEventListener("stop", onStop);
          recorder2.addEventListener(
            "error",
            () => {
              recorder2.removeEventListener("stop", onStop);
              reject(new Error("\u5F55\u5236\u5931\u8D25\u3002"));
            },
            { once: true }
          );
          try {
            recorder2.stop();
          } catch (error) {
            recorder2.removeEventListener("stop", onStop);
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        });
        this.release();
        if (durationMs < MIN_RECORDING_DURATION_MS) {
          throw new Error("\u5F55\u5236\u65F6\u95F4\u592A\u77ED\uFF0C\u672A\u4FDD\u5B58\u6587\u4EF6\u3002\u8BF7\u5F55\u5236 2 \u79D2\u4EE5\u4E0A\u3002");
        }
        if (!await probeRecordedVideo(blob)) {
          throw new Error("\u5F55\u5236\u6587\u4EF6\u8FC7\u77ED\uFF0C\u6D4F\u89C8\u5668\u672A\u80FD\u5199\u51FA\u6709\u6548\u7684\u89C6\u9891\u8F68\uFF0C\u672A\u4FDD\u5B58\u6587\u4EF6\u3002\u8BF7\u5F55\u5236 2 \u79D2\u4EE5\u4E0A\u3002");
        }
        return { blob, extension, durationMs, resolution, fps };
      }
      /** Stops without producing a file, used when the page is being unloaded. */
      abort() {
        if (this.recorder && this.stateValue !== "idle") {
          try {
            this.recorder.stop();
          } catch {
          }
        }
        this.release();
      }
      release() {
        this.clearCaptureTimer();
        const stream = this.stream;
        if (stream) {
          if (this.audioTrack && this.audioTrack.readyState === "live") {
            stream.removeTrack(this.audioTrack);
          }
          stream.getTracks().forEach((track) => {
            if (track !== this.audioTrack) {
              track.stop();
            }
          });
        }
        this.stateValue = "idle";
        this.sourceCanvas = null;
        this.outputCanvas = null;
        this.outputContext = null;
        this.videoTrack = null;
        this.stream = null;
        this.audioTrack = null;
        this.recorder = null;
        this.chunks = [];
        this.accumulatedMs = 0;
        this.activeSinceMs = 0;
      }
    };
  }
});

// node_modules/mp4-muxer/build/mp4-muxer.mjs
var __accessCheck, __privateGet, __privateAdd, __privateSet, __privateWrapper, __privateMethod, bytes, view, u8, u16, i16, u24, u32, i32, u64, fixed_8_8, fixed_16_16, fixed_2_30, ascii, last, lastPresentedSample, intoTimescale, rotationMatrix, IDENTITY_MATRIX, matrixToBytes, deepClone, isU32, box, fullBox, ftyp, mdat, free, moov, mvhd, trak, tkhd, mdia, mdhd, hdlr, minf, vmhd, smhd, dinf, dref, url, stbl, stsd, videoSampleDescription, COLOR_PRIMARIES_MAP, TRANSFER_CHARACTERISTICS_MAP, MATRIX_COEFFICIENTS_MAP, colr, avcC, hvcC, vpcC, av1C, soundSampleDescription, esds, dOps, stts, stss, stsc, stsz, stco, ctts, mvex, trex, moof, mfhd, fragmentSampleFlags, traf, tfhd, tfdt, trun, mfra, tfra, mfro, VIDEO_CODEC_TO_BOX_NAME, VIDEO_CODEC_TO_CONFIGURATION_BOX, AUDIO_CODEC_TO_BOX_NAME, AUDIO_CODEC_TO_CONFIGURATION_BOX, Target, ArrayBufferTarget, StreamTarget, FileSystemWritableFileStreamTarget, _helper, _helperView, Writer, _target, _buffer, _bytes, _maxPos, _ensureSize, ensureSize_fn, ArrayBufferTargetWriter, DEFAULT_CHUNK_SIZE, MAX_CHUNKS_AT_ONCE, _target2, _sections, _chunked, _chunkSize, _chunks, _writeDataIntoChunks, writeDataIntoChunks_fn, _insertSectionIntoChunk, insertSectionIntoChunk_fn, _createChunk, createChunk_fn, _flushChunks, flushChunks_fn, StreamTargetWriter, FileSystemWritableFileStreamTargetWriter, GLOBAL_TIMESCALE, SUPPORTED_VIDEO_CODECS, SUPPORTED_AUDIO_CODECS, TIMESTAMP_OFFSET, FIRST_TIMESTAMP_BEHAVIORS, _options, _writer, _ftypSize, _mdat, _videoTrack, _audioTrack, _creationTime, _finalizedChunks, _nextFragmentNumber, _videoSampleQueue, _audioSampleQueue, _finalized, _validateOptions, validateOptions_fn, _writeHeader, writeHeader_fn, _computeMoovSizeUpperBound, computeMoovSizeUpperBound_fn, _prepareTracks, prepareTracks_fn, _generateMpeg4AudioSpecificConfig, generateMpeg4AudioSpecificConfig_fn, _createSampleForTrack, createSampleForTrack_fn, _addSampleToTrack, addSampleToTrack_fn, _validateTimestamp, validateTimestamp_fn, _finalizeCurrentChunk, finalizeCurrentChunk_fn, _finalizeFragment, finalizeFragment_fn, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn, _ensureNotFinalized, ensureNotFinalized_fn, Muxer;
var init_mp4_muxer = __esm({
  "node_modules/mp4-muxer/build/mp4-muxer.mjs"() {
    __accessCheck = (obj, member, msg) => {
      if (!member.has(obj))
        throw TypeError("Cannot " + msg);
    };
    __privateGet = (obj, member, getter) => {
      __accessCheck(obj, member, "read from private field");
      return getter ? getter.call(obj) : member.get(obj);
    };
    __privateAdd = (obj, member, value) => {
      if (member.has(obj))
        throw TypeError("Cannot add the same private member more than once");
      member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
    };
    __privateSet = (obj, member, value, setter) => {
      __accessCheck(obj, member, "write to private field");
      setter ? setter.call(obj, value) : member.set(obj, value);
      return value;
    };
    __privateWrapper = (obj, member, setter, getter) => ({
      set _(value) {
        __privateSet(obj, member, value, setter);
      },
      get _() {
        return __privateGet(obj, member, getter);
      }
    });
    __privateMethod = (obj, member, method) => {
      __accessCheck(obj, member, "access private method");
      return method;
    };
    bytes = new Uint8Array(8);
    view = new DataView(bytes.buffer);
    u8 = (value) => {
      return [(value % 256 + 256) % 256];
    };
    u16 = (value) => {
      view.setUint16(0, value, false);
      return [bytes[0], bytes[1]];
    };
    i16 = (value) => {
      view.setInt16(0, value, false);
      return [bytes[0], bytes[1]];
    };
    u24 = (value) => {
      view.setUint32(0, value, false);
      return [bytes[1], bytes[2], bytes[3]];
    };
    u32 = (value) => {
      view.setUint32(0, value, false);
      return [bytes[0], bytes[1], bytes[2], bytes[3]];
    };
    i32 = (value) => {
      view.setInt32(0, value, false);
      return [bytes[0], bytes[1], bytes[2], bytes[3]];
    };
    u64 = (value) => {
      view.setUint32(0, Math.floor(value / 2 ** 32), false);
      view.setUint32(4, value, false);
      return [bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7]];
    };
    fixed_8_8 = (value) => {
      view.setInt16(0, 2 ** 8 * value, false);
      return [bytes[0], bytes[1]];
    };
    fixed_16_16 = (value) => {
      view.setInt32(0, 2 ** 16 * value, false);
      return [bytes[0], bytes[1], bytes[2], bytes[3]];
    };
    fixed_2_30 = (value) => {
      view.setInt32(0, 2 ** 30 * value, false);
      return [bytes[0], bytes[1], bytes[2], bytes[3]];
    };
    ascii = (text, nullTerminated = false) => {
      let bytes2 = Array(text.length).fill(null).map((_, i) => text.charCodeAt(i));
      if (nullTerminated)
        bytes2.push(0);
      return bytes2;
    };
    last = (arr) => {
      return arr && arr[arr.length - 1];
    };
    lastPresentedSample = (samples) => {
      let result = void 0;
      for (let sample of samples) {
        if (!result || sample.presentationTimestamp > result.presentationTimestamp) {
          result = sample;
        }
      }
      return result;
    };
    intoTimescale = (timeInSeconds, timescale, round = true) => {
      let value = timeInSeconds * timescale;
      return round ? Math.round(value) : value;
    };
    rotationMatrix = (rotationInDegrees) => {
      let theta = rotationInDegrees * (Math.PI / 180);
      let cosTheta = Math.cos(theta);
      let sinTheta = Math.sin(theta);
      return [
        cosTheta,
        sinTheta,
        0,
        -sinTheta,
        cosTheta,
        0,
        0,
        0,
        1
      ];
    };
    IDENTITY_MATRIX = rotationMatrix(0);
    matrixToBytes = (matrix) => {
      return [
        fixed_16_16(matrix[0]),
        fixed_16_16(matrix[1]),
        fixed_2_30(matrix[2]),
        fixed_16_16(matrix[3]),
        fixed_16_16(matrix[4]),
        fixed_2_30(matrix[5]),
        fixed_16_16(matrix[6]),
        fixed_16_16(matrix[7]),
        fixed_2_30(matrix[8])
      ];
    };
    deepClone = (x) => {
      if (!x)
        return x;
      if (typeof x !== "object")
        return x;
      if (Array.isArray(x))
        return x.map(deepClone);
      return Object.fromEntries(Object.entries(x).map(([key, value]) => [key, deepClone(value)]));
    };
    isU32 = (value) => {
      return value >= 0 && value < 2 ** 32;
    };
    box = (type, contents, children) => ({
      type,
      contents: contents && new Uint8Array(contents.flat(10)),
      children
    });
    fullBox = (type, version, flags, contents, children) => box(
      type,
      [u8(version), u24(flags), contents ?? []],
      children
    );
    ftyp = (details) => {
      let minorVersion = 512;
      if (details.fragmented)
        return box("ftyp", [
          ascii("iso5"),
          // Major brand
          u32(minorVersion),
          // Minor version
          // Compatible brands
          ascii("iso5"),
          ascii("iso6"),
          ascii("mp41")
        ]);
      return box("ftyp", [
        ascii("isom"),
        // Major brand
        u32(minorVersion),
        // Minor version
        // Compatible brands
        ascii("isom"),
        details.holdsAvc ? ascii("avc1") : [],
        ascii("mp41")
      ]);
    };
    mdat = (reserveLargeSize) => ({ type: "mdat", largeSize: reserveLargeSize });
    free = (size) => ({ type: "free", size });
    moov = (tracks, creationTime, fragmented = false) => box("moov", null, [
      mvhd(creationTime, tracks),
      ...tracks.map((x) => trak(x, creationTime)),
      fragmented ? mvex(tracks) : null
    ]);
    mvhd = (creationTime, tracks) => {
      let duration = intoTimescale(Math.max(
        0,
        ...tracks.filter((x) => x.samples.length > 0).map((x) => {
          const lastSample = lastPresentedSample(x.samples);
          return lastSample.presentationTimestamp + lastSample.duration;
        })
      ), GLOBAL_TIMESCALE);
      let nextTrackId = Math.max(...tracks.map((x) => x.id)) + 1;
      let needsU64 = !isU32(creationTime) || !isU32(duration);
      let u32OrU64 = needsU64 ? u64 : u32;
      return fullBox("mvhd", +needsU64, 0, [
        u32OrU64(creationTime),
        // Creation time
        u32OrU64(creationTime),
        // Modification time
        u32(GLOBAL_TIMESCALE),
        // Timescale
        u32OrU64(duration),
        // Duration
        fixed_16_16(1),
        // Preferred rate
        fixed_8_8(1),
        // Preferred volume
        Array(10).fill(0),
        // Reserved
        matrixToBytes(IDENTITY_MATRIX),
        // Matrix
        Array(24).fill(0),
        // Pre-defined
        u32(nextTrackId)
        // Next track ID
      ]);
    };
    trak = (track, creationTime) => box("trak", null, [
      tkhd(track, creationTime),
      mdia(track, creationTime)
    ]);
    tkhd = (track, creationTime) => {
      let lastSample = lastPresentedSample(track.samples);
      let durationInGlobalTimescale = intoTimescale(
        lastSample ? lastSample.presentationTimestamp + lastSample.duration : 0,
        GLOBAL_TIMESCALE
      );
      let needsU64 = !isU32(creationTime) || !isU32(durationInGlobalTimescale);
      let u32OrU64 = needsU64 ? u64 : u32;
      let matrix;
      if (track.info.type === "video") {
        matrix = typeof track.info.rotation === "number" ? rotationMatrix(track.info.rotation) : track.info.rotation;
      } else {
        matrix = IDENTITY_MATRIX;
      }
      return fullBox("tkhd", +needsU64, 3, [
        u32OrU64(creationTime),
        // Creation time
        u32OrU64(creationTime),
        // Modification time
        u32(track.id),
        // Track ID
        u32(0),
        // Reserved
        u32OrU64(durationInGlobalTimescale),
        // Duration
        Array(8).fill(0),
        // Reserved
        u16(0),
        // Layer
        u16(0),
        // Alternate group
        fixed_8_8(track.info.type === "audio" ? 1 : 0),
        // Volume
        u16(0),
        // Reserved
        matrixToBytes(matrix),
        // Matrix
        fixed_16_16(track.info.type === "video" ? track.info.width : 0),
        // Track width
        fixed_16_16(track.info.type === "video" ? track.info.height : 0)
        // Track height
      ]);
    };
    mdia = (track, creationTime) => box("mdia", null, [
      mdhd(track, creationTime),
      hdlr(track.info.type === "video" ? "vide" : "soun"),
      minf(track)
    ]);
    mdhd = (track, creationTime) => {
      let lastSample = lastPresentedSample(track.samples);
      let localDuration = intoTimescale(
        lastSample ? lastSample.presentationTimestamp + lastSample.duration : 0,
        track.timescale
      );
      let needsU64 = !isU32(creationTime) || !isU32(localDuration);
      let u32OrU64 = needsU64 ? u64 : u32;
      return fullBox("mdhd", +needsU64, 0, [
        u32OrU64(creationTime),
        // Creation time
        u32OrU64(creationTime),
        // Modification time
        u32(track.timescale),
        // Timescale
        u32OrU64(localDuration),
        // Duration
        u16(21956),
        // Language ("und", undetermined)
        u16(0)
        // Quality
      ]);
    };
    hdlr = (componentSubtype) => fullBox("hdlr", 0, 0, [
      ascii("mhlr"),
      // Component type
      ascii(componentSubtype),
      // Component subtype
      u32(0),
      // Component manufacturer
      u32(0),
      // Component flags
      u32(0),
      // Component flags mask
      ascii("mp4-muxer-hdlr", true)
      // Component name
    ]);
    minf = (track) => box("minf", null, [
      track.info.type === "video" ? vmhd() : smhd(),
      dinf(),
      stbl(track)
    ]);
    vmhd = () => fullBox("vmhd", 0, 1, [
      u16(0),
      // Graphics mode
      u16(0),
      // Opcolor R
      u16(0),
      // Opcolor G
      u16(0)
      // Opcolor B
    ]);
    smhd = () => fullBox("smhd", 0, 0, [
      u16(0),
      // Balance
      u16(0)
      // Reserved
    ]);
    dinf = () => box("dinf", null, [
      dref()
    ]);
    dref = () => fullBox("dref", 0, 0, [
      u32(1)
      // Entry count
    ], [
      url()
    ]);
    url = () => fullBox("url ", 0, 1);
    stbl = (track) => {
      const needsCtts = track.compositionTimeOffsetTable.length > 1 || track.compositionTimeOffsetTable.some((x) => x.sampleCompositionTimeOffset !== 0);
      return box("stbl", null, [
        stsd(track),
        stts(track),
        stss(track),
        stsc(track),
        stsz(track),
        stco(track),
        needsCtts ? ctts(track) : null
      ]);
    };
    stsd = (track) => fullBox("stsd", 0, 0, [
      u32(1)
      // Entry count
    ], [
      track.info.type === "video" ? videoSampleDescription(
        VIDEO_CODEC_TO_BOX_NAME[track.info.codec],
        track
      ) : soundSampleDescription(
        AUDIO_CODEC_TO_BOX_NAME[track.info.codec],
        track
      )
    ]);
    videoSampleDescription = (compressionType, track) => box(compressionType, [
      Array(6).fill(0),
      // Reserved
      u16(1),
      // Data reference index
      u16(0),
      // Pre-defined
      u16(0),
      // Reserved
      Array(12).fill(0),
      // Pre-defined
      u16(track.info.width),
      // Width
      u16(track.info.height),
      // Height
      u32(4718592),
      // Horizontal resolution
      u32(4718592),
      // Vertical resolution
      u32(0),
      // Reserved
      u16(1),
      // Frame count
      Array(32).fill(0),
      // Compressor name
      u16(24),
      // Depth
      i16(65535)
      // Pre-defined
    ], [
      VIDEO_CODEC_TO_CONFIGURATION_BOX[track.info.codec](track),
      track.info.decoderConfig.colorSpace ? colr(track) : null
    ]);
    COLOR_PRIMARIES_MAP = {
      "bt709": 1,
      // ITU-R BT.709
      "bt470bg": 5,
      // ITU-R BT.470BG
      "smpte170m": 6
      // ITU-R BT.601 525 - SMPTE 170M
    };
    TRANSFER_CHARACTERISTICS_MAP = {
      "bt709": 1,
      // ITU-R BT.709
      "smpte170m": 6,
      // SMPTE 170M
      "iec61966-2-1": 13
      // IEC 61966-2-1
    };
    MATRIX_COEFFICIENTS_MAP = {
      "rgb": 0,
      // Identity
      "bt709": 1,
      // ITU-R BT.709
      "bt470bg": 5,
      // ITU-R BT.470BG
      "smpte170m": 6
      // SMPTE 170M
    };
    colr = (track) => box("colr", [
      ascii("nclx"),
      // Colour type
      u16(COLOR_PRIMARIES_MAP[track.info.decoderConfig.colorSpace.primaries]),
      // Colour primaries
      u16(TRANSFER_CHARACTERISTICS_MAP[track.info.decoderConfig.colorSpace.transfer]),
      // Transfer characteristics
      u16(MATRIX_COEFFICIENTS_MAP[track.info.decoderConfig.colorSpace.matrix]),
      // Matrix coefficients
      u8((track.info.decoderConfig.colorSpace.fullRange ? 1 : 0) << 7)
      // Full range flag
    ]);
    avcC = (track) => track.info.decoderConfig && box("avcC", [
      // For AVC, description is an AVCDecoderConfigurationRecord, so nothing else to do here
      ...new Uint8Array(track.info.decoderConfig.description)
    ]);
    hvcC = (track) => track.info.decoderConfig && box("hvcC", [
      // For HEVC, description is a HEVCDecoderConfigurationRecord, so nothing else to do here
      ...new Uint8Array(track.info.decoderConfig.description)
    ]);
    vpcC = (track) => {
      if (!track.info.decoderConfig) {
        return null;
      }
      let decoderConfig = track.info.decoderConfig;
      if (!decoderConfig.colorSpace) {
        throw new Error(`'colorSpace' is required in the decoder config for VP9.`);
      }
      let parts = decoderConfig.codec.split(".");
      let profile = Number(parts[1]);
      let level = Number(parts[2]);
      let bitDepth = Number(parts[3]);
      let chromaSubsampling = 0;
      let thirdByte = (bitDepth << 4) + (chromaSubsampling << 1) + Number(decoderConfig.colorSpace.fullRange);
      let colourPrimaries = 2;
      let transferCharacteristics = 2;
      let matrixCoefficients = 2;
      return fullBox("vpcC", 1, 0, [
        u8(profile),
        // Profile
        u8(level),
        // Level
        u8(thirdByte),
        // Bit depth, chroma subsampling, full range
        u8(colourPrimaries),
        // Colour primaries
        u8(transferCharacteristics),
        // Transfer characteristics
        u8(matrixCoefficients),
        // Matrix coefficients
        u16(0)
        // Codec initialization data size
      ]);
    };
    av1C = () => {
      let marker = 1;
      let version = 1;
      let firstByte = (marker << 7) + version;
      return box("av1C", [
        firstByte,
        0,
        0,
        0
      ]);
    };
    soundSampleDescription = (compressionType, track) => box(compressionType, [
      Array(6).fill(0),
      // Reserved
      u16(1),
      // Data reference index
      u16(0),
      // Version
      u16(0),
      // Revision level
      u32(0),
      // Vendor
      u16(track.info.numberOfChannels),
      // Number of channels
      u16(16),
      // Sample size (bits)
      u16(0),
      // Compression ID
      u16(0),
      // Packet size
      fixed_16_16(track.info.sampleRate)
      // Sample rate
    ], [
      AUDIO_CODEC_TO_CONFIGURATION_BOX[track.info.codec](track)
    ]);
    esds = (track) => {
      let description = new Uint8Array(track.info.decoderConfig.description);
      return fullBox("esds", 0, 0, [
        // https://stackoverflow.com/a/54803118
        u32(58753152),
        // TAG(3) = Object Descriptor ([2])
        u8(32 + description.byteLength),
        // length of this OD (which includes the next 2 tags)
        u16(1),
        // ES_ID = 1
        u8(0),
        // flags etc = 0
        u32(75530368),
        // TAG(4) = ES Descriptor ([2]) embedded in above OD
        u8(18 + description.byteLength),
        // length of this ESD
        u8(64),
        // MPEG-4 Audio
        u8(21),
        // stream type(6bits)=5 audio, flags(2bits)=1
        u24(0),
        // 24bit buffer size
        u32(130071),
        // max bitrate
        u32(130071),
        // avg bitrate
        u32(92307584),
        // TAG(5) = ASC ([2],[3]) embedded in above OD
        u8(description.byteLength),
        // length
        ...description,
        u32(109084800),
        // TAG(6)
        u8(1),
        // length
        u8(2)
        // data
      ]);
    };
    dOps = (track) => {
      let preskip = 3840;
      let gain = 0;
      const description = track.info.decoderConfig?.description;
      if (description) {
        if (description.byteLength < 18) {
          throw new TypeError("Invalid decoder description provided for Opus; must be at least 18 bytes long.");
        }
        const view2 = ArrayBuffer.isView(description) ? new DataView(description.buffer, description.byteOffset, description.byteLength) : new DataView(description);
        preskip = view2.getUint16(10, true);
        gain = view2.getInt16(14, true);
      }
      return box("dOps", [
        u8(0),
        // Version
        u8(track.info.numberOfChannels),
        // OutputChannelCount
        u16(preskip),
        u32(track.info.sampleRate),
        // InputSampleRate
        fixed_8_8(gain),
        // OutputGain
        u8(0)
        // ChannelMappingFamily
      ]);
    };
    stts = (track) => {
      return fullBox("stts", 0, 0, [
        u32(track.timeToSampleTable.length),
        // Number of entries
        track.timeToSampleTable.map((x) => [
          // Time-to-sample table
          u32(x.sampleCount),
          // Sample count
          u32(x.sampleDelta)
          // Sample duration
        ])
      ]);
    };
    stss = (track) => {
      if (track.samples.every((x) => x.type === "key"))
        return null;
      let keySamples = [...track.samples.entries()].filter(([, sample]) => sample.type === "key");
      return fullBox("stss", 0, 0, [
        u32(keySamples.length),
        // Number of entries
        keySamples.map(([index]) => u32(index + 1))
        // Sync sample table
      ]);
    };
    stsc = (track) => {
      return fullBox("stsc", 0, 0, [
        u32(track.compactlyCodedChunkTable.length),
        // Number of entries
        track.compactlyCodedChunkTable.map((x) => [
          // Sample-to-chunk table
          u32(x.firstChunk),
          // First chunk
          u32(x.samplesPerChunk),
          // Samples per chunk
          u32(1)
          // Sample description index
        ])
      ]);
    };
    stsz = (track) => fullBox("stsz", 0, 0, [
      u32(0),
      // Sample size (0 means non-constant size)
      u32(track.samples.length),
      // Number of entries
      track.samples.map((x) => u32(x.size))
      // Sample size table
    ]);
    stco = (track) => {
      if (track.finalizedChunks.length > 0 && last(track.finalizedChunks).offset >= 2 ** 32) {
        return fullBox("co64", 0, 0, [
          u32(track.finalizedChunks.length),
          // Number of entries
          track.finalizedChunks.map((x) => u64(x.offset))
          // Chunk offset table
        ]);
      }
      return fullBox("stco", 0, 0, [
        u32(track.finalizedChunks.length),
        // Number of entries
        track.finalizedChunks.map((x) => u32(x.offset))
        // Chunk offset table
      ]);
    };
    ctts = (track) => {
      return fullBox("ctts", 0, 0, [
        u32(track.compositionTimeOffsetTable.length),
        // Number of entries
        track.compositionTimeOffsetTable.map((x) => [
          // Time-to-sample table
          u32(x.sampleCount),
          // Sample count
          u32(x.sampleCompositionTimeOffset)
          // Sample offset
        ])
      ]);
    };
    mvex = (tracks) => {
      return box("mvex", null, tracks.map(trex));
    };
    trex = (track) => {
      return fullBox("trex", 0, 0, [
        u32(track.id),
        // Track ID
        u32(1),
        // Default sample description index
        u32(0),
        // Default sample duration
        u32(0),
        // Default sample size
        u32(0)
        // Default sample flags
      ]);
    };
    moof = (sequenceNumber, tracks) => {
      return box("moof", null, [
        mfhd(sequenceNumber),
        ...tracks.map(traf)
      ]);
    };
    mfhd = (sequenceNumber) => {
      return fullBox("mfhd", 0, 0, [
        u32(sequenceNumber)
        // Sequence number
      ]);
    };
    fragmentSampleFlags = (sample) => {
      let byte1 = 0;
      let byte2 = 0;
      let byte3 = 0;
      let byte4 = 0;
      let sampleIsDifferenceSample = sample.type === "delta";
      byte2 |= +sampleIsDifferenceSample;
      if (sampleIsDifferenceSample) {
        byte1 |= 1;
      } else {
        byte1 |= 2;
      }
      return byte1 << 24 | byte2 << 16 | byte3 << 8 | byte4;
    };
    traf = (track) => {
      return box("traf", null, [
        tfhd(track),
        tfdt(track),
        trun(track)
      ]);
    };
    tfhd = (track) => {
      let tfFlags = 0;
      tfFlags |= 8;
      tfFlags |= 16;
      tfFlags |= 32;
      tfFlags |= 131072;
      let referenceSample = track.currentChunk.samples[1] ?? track.currentChunk.samples[0];
      let referenceSampleInfo = {
        duration: referenceSample.timescaleUnitsToNextSample,
        size: referenceSample.size,
        flags: fragmentSampleFlags(referenceSample)
      };
      return fullBox("tfhd", 0, tfFlags, [
        u32(track.id),
        // Track ID
        u32(referenceSampleInfo.duration),
        // Default sample duration
        u32(referenceSampleInfo.size),
        // Default sample size
        u32(referenceSampleInfo.flags)
        // Default sample flags
      ]);
    };
    tfdt = (track) => {
      return fullBox("tfdt", 1, 0, [
        u64(intoTimescale(track.currentChunk.startTimestamp, track.timescale))
        // Base Media Decode Time
      ]);
    };
    trun = (track) => {
      let allSampleDurations = track.currentChunk.samples.map((x) => x.timescaleUnitsToNextSample);
      let allSampleSizes = track.currentChunk.samples.map((x) => x.size);
      let allSampleFlags = track.currentChunk.samples.map(fragmentSampleFlags);
      let allSampleCompositionTimeOffsets = track.currentChunk.samples.map((x) => intoTimescale(x.presentationTimestamp - x.decodeTimestamp, track.timescale));
      let uniqueSampleDurations = new Set(allSampleDurations);
      let uniqueSampleSizes = new Set(allSampleSizes);
      let uniqueSampleFlags = new Set(allSampleFlags);
      let uniqueSampleCompositionTimeOffsets = new Set(allSampleCompositionTimeOffsets);
      let firstSampleFlagsPresent = uniqueSampleFlags.size === 2 && allSampleFlags[0] !== allSampleFlags[1];
      let sampleDurationPresent = uniqueSampleDurations.size > 1;
      let sampleSizePresent = uniqueSampleSizes.size > 1;
      let sampleFlagsPresent = !firstSampleFlagsPresent && uniqueSampleFlags.size > 1;
      let sampleCompositionTimeOffsetsPresent = uniqueSampleCompositionTimeOffsets.size > 1 || [...uniqueSampleCompositionTimeOffsets].some((x) => x !== 0);
      let flags = 0;
      flags |= 1;
      flags |= 4 * +firstSampleFlagsPresent;
      flags |= 256 * +sampleDurationPresent;
      flags |= 512 * +sampleSizePresent;
      flags |= 1024 * +sampleFlagsPresent;
      flags |= 2048 * +sampleCompositionTimeOffsetsPresent;
      return fullBox("trun", 1, flags, [
        u32(track.currentChunk.samples.length),
        // Sample count
        u32(track.currentChunk.offset - track.currentChunk.moofOffset || 0),
        // Data offset
        firstSampleFlagsPresent ? u32(allSampleFlags[0]) : [],
        track.currentChunk.samples.map((_, i) => [
          sampleDurationPresent ? u32(allSampleDurations[i]) : [],
          // Sample duration
          sampleSizePresent ? u32(allSampleSizes[i]) : [],
          // Sample size
          sampleFlagsPresent ? u32(allSampleFlags[i]) : [],
          // Sample flags
          // Sample composition time offsets
          sampleCompositionTimeOffsetsPresent ? i32(allSampleCompositionTimeOffsets[i]) : []
        ])
      ]);
    };
    mfra = (tracks) => {
      return box("mfra", null, [
        ...tracks.map(tfra),
        mfro()
      ]);
    };
    tfra = (track, trackIndex) => {
      let version = 1;
      return fullBox("tfra", version, 0, [
        u32(track.id),
        // Track ID
        u32(63),
        // This specifies that traf number, trun number and sample number are 32-bit ints
        u32(track.finalizedChunks.length),
        // Number of entries
        track.finalizedChunks.map((chunk) => [
          u64(intoTimescale(chunk.startTimestamp, track.timescale)),
          // Time
          u64(chunk.moofOffset),
          // moof offset
          u32(trackIndex + 1),
          // traf number
          u32(1),
          // trun number
          u32(1)
          // Sample number
        ])
      ]);
    };
    mfro = () => {
      return fullBox("mfro", 0, 0, [
        // This value needs to be overwritten manually from the outside, where the actual size of the enclosing mfra box
        // is known
        u32(0)
        // Size
      ]);
    };
    VIDEO_CODEC_TO_BOX_NAME = {
      "avc": "avc1",
      "hevc": "hvc1",
      "vp9": "vp09",
      "av1": "av01"
    };
    VIDEO_CODEC_TO_CONFIGURATION_BOX = {
      "avc": avcC,
      "hevc": hvcC,
      "vp9": vpcC,
      "av1": av1C
    };
    AUDIO_CODEC_TO_BOX_NAME = {
      "aac": "mp4a",
      "opus": "Opus"
    };
    AUDIO_CODEC_TO_CONFIGURATION_BOX = {
      "aac": esds,
      "opus": dOps
    };
    Target = class {
    };
    ArrayBufferTarget = class extends Target {
      constructor() {
        super(...arguments);
        this.buffer = null;
      }
    };
    StreamTarget = class extends Target {
      constructor(options) {
        super();
        this.options = options;
        if (typeof options !== "object") {
          throw new TypeError("StreamTarget requires an options object to be passed to its constructor.");
        }
        if (options.onData) {
          if (typeof options.onData !== "function") {
            throw new TypeError("options.onData, when provided, must be a function.");
          }
          if (options.onData.length < 2) {
            throw new TypeError(
              "options.onData, when provided, must be a function that takes in at least two arguments (data and position). Ignoring the position argument, which specifies the byte offset at which the data is to be written, can lead to broken outputs."
            );
          }
        }
        if (options.chunked !== void 0 && typeof options.chunked !== "boolean") {
          throw new TypeError("options.chunked, when provided, must be a boolean.");
        }
        if (options.chunkSize !== void 0 && (!Number.isInteger(options.chunkSize) || options.chunkSize < 1024)) {
          throw new TypeError("options.chunkSize, when provided, must be an integer and not smaller than 1024.");
        }
      }
    };
    FileSystemWritableFileStreamTarget = class extends Target {
      constructor(stream, options) {
        super();
        this.stream = stream;
        this.options = options;
        if (!(stream instanceof FileSystemWritableFileStream)) {
          throw new TypeError("FileSystemWritableFileStreamTarget requires a FileSystemWritableFileStream instance.");
        }
        if (options !== void 0 && typeof options !== "object") {
          throw new TypeError("FileSystemWritableFileStreamTarget's options, when provided, must be an object.");
        }
        if (options) {
          if (options.chunkSize !== void 0 && (!Number.isInteger(options.chunkSize) || options.chunkSize <= 0)) {
            throw new TypeError("options.chunkSize, when provided, must be a positive integer");
          }
        }
      }
    };
    Writer = class {
      constructor() {
        this.pos = 0;
        __privateAdd(this, _helper, new Uint8Array(8));
        __privateAdd(this, _helperView, new DataView(__privateGet(this, _helper).buffer));
        this.offsets = /* @__PURE__ */ new WeakMap();
      }
      /** Sets the current position for future writes to a new one. */
      seek(newPos) {
        this.pos = newPos;
      }
      writeU32(value) {
        __privateGet(this, _helperView).setUint32(0, value, false);
        this.write(__privateGet(this, _helper).subarray(0, 4));
      }
      writeU64(value) {
        __privateGet(this, _helperView).setUint32(0, Math.floor(value / 2 ** 32), false);
        __privateGet(this, _helperView).setUint32(4, value, false);
        this.write(__privateGet(this, _helper).subarray(0, 8));
      }
      writeAscii(text) {
        for (let i = 0; i < text.length; i++) {
          __privateGet(this, _helperView).setUint8(i % 8, text.charCodeAt(i));
          if (i % 8 === 7)
            this.write(__privateGet(this, _helper));
        }
        if (text.length % 8 !== 0) {
          this.write(__privateGet(this, _helper).subarray(0, text.length % 8));
        }
      }
      writeBox(box2) {
        this.offsets.set(box2, this.pos);
        if (box2.contents && !box2.children) {
          this.writeBoxHeader(box2, box2.size ?? box2.contents.byteLength + 8);
          this.write(box2.contents);
        } else {
          let startPos = this.pos;
          this.writeBoxHeader(box2, 0);
          if (box2.contents)
            this.write(box2.contents);
          if (box2.children) {
            for (let child of box2.children)
              if (child)
                this.writeBox(child);
          }
          let endPos = this.pos;
          let size = box2.size ?? endPos - startPos;
          this.seek(startPos);
          this.writeBoxHeader(box2, size);
          this.seek(endPos);
        }
      }
      writeBoxHeader(box2, size) {
        this.writeU32(box2.largeSize ? 1 : size);
        this.writeAscii(box2.type);
        if (box2.largeSize)
          this.writeU64(size);
      }
      measureBoxHeader(box2) {
        return 8 + (box2.largeSize ? 8 : 0);
      }
      patchBox(box2) {
        let endPos = this.pos;
        this.seek(this.offsets.get(box2));
        this.writeBox(box2);
        this.seek(endPos);
      }
      measureBox(box2) {
        if (box2.contents && !box2.children) {
          let headerSize = this.measureBoxHeader(box2);
          return headerSize + box2.contents.byteLength;
        } else {
          let result = this.measureBoxHeader(box2);
          if (box2.contents)
            result += box2.contents.byteLength;
          if (box2.children) {
            for (let child of box2.children)
              if (child)
                result += this.measureBox(child);
          }
          return result;
        }
      }
    };
    _helper = /* @__PURE__ */ new WeakMap();
    _helperView = /* @__PURE__ */ new WeakMap();
    ArrayBufferTargetWriter = class extends Writer {
      constructor(target) {
        super();
        __privateAdd(this, _ensureSize);
        __privateAdd(this, _target, void 0);
        __privateAdd(this, _buffer, new ArrayBuffer(2 ** 16));
        __privateAdd(this, _bytes, new Uint8Array(__privateGet(this, _buffer)));
        __privateAdd(this, _maxPos, 0);
        __privateSet(this, _target, target);
      }
      write(data) {
        __privateMethod(this, _ensureSize, ensureSize_fn).call(this, this.pos + data.byteLength);
        __privateGet(this, _bytes).set(data, this.pos);
        this.pos += data.byteLength;
        __privateSet(this, _maxPos, Math.max(__privateGet(this, _maxPos), this.pos));
      }
      finalize() {
        __privateMethod(this, _ensureSize, ensureSize_fn).call(this, this.pos);
        __privateGet(this, _target).buffer = __privateGet(this, _buffer).slice(0, Math.max(__privateGet(this, _maxPos), this.pos));
      }
    };
    _target = /* @__PURE__ */ new WeakMap();
    _buffer = /* @__PURE__ */ new WeakMap();
    _bytes = /* @__PURE__ */ new WeakMap();
    _maxPos = /* @__PURE__ */ new WeakMap();
    _ensureSize = /* @__PURE__ */ new WeakSet();
    ensureSize_fn = function(size) {
      let newLength = __privateGet(this, _buffer).byteLength;
      while (newLength < size)
        newLength *= 2;
      if (newLength === __privateGet(this, _buffer).byteLength)
        return;
      let newBuffer = new ArrayBuffer(newLength);
      let newBytes = new Uint8Array(newBuffer);
      newBytes.set(__privateGet(this, _bytes), 0);
      __privateSet(this, _buffer, newBuffer);
      __privateSet(this, _bytes, newBytes);
    };
    DEFAULT_CHUNK_SIZE = 2 ** 24;
    MAX_CHUNKS_AT_ONCE = 2;
    StreamTargetWriter = class extends Writer {
      constructor(target) {
        super();
        __privateAdd(this, _writeDataIntoChunks);
        __privateAdd(this, _insertSectionIntoChunk);
        __privateAdd(this, _createChunk);
        __privateAdd(this, _flushChunks);
        __privateAdd(this, _target2, void 0);
        __privateAdd(this, _sections, []);
        __privateAdd(this, _chunked, void 0);
        __privateAdd(this, _chunkSize, void 0);
        __privateAdd(this, _chunks, []);
        __privateSet(this, _target2, target);
        __privateSet(this, _chunked, target.options?.chunked ?? false);
        __privateSet(this, _chunkSize, target.options?.chunkSize ?? DEFAULT_CHUNK_SIZE);
      }
      write(data) {
        __privateGet(this, _sections).push({
          data: data.slice(),
          start: this.pos
        });
        this.pos += data.byteLength;
      }
      flush() {
        if (__privateGet(this, _sections).length === 0)
          return;
        let chunks = [];
        let sorted = [...__privateGet(this, _sections)].sort((a, b) => a.start - b.start);
        chunks.push({
          start: sorted[0].start,
          size: sorted[0].data.byteLength
        });
        for (let i = 1; i < sorted.length; i++) {
          let lastChunk = chunks[chunks.length - 1];
          let section = sorted[i];
          if (section.start <= lastChunk.start + lastChunk.size) {
            lastChunk.size = Math.max(lastChunk.size, section.start + section.data.byteLength - lastChunk.start);
          } else {
            chunks.push({
              start: section.start,
              size: section.data.byteLength
            });
          }
        }
        for (let chunk of chunks) {
          chunk.data = new Uint8Array(chunk.size);
          for (let section of __privateGet(this, _sections)) {
            if (chunk.start <= section.start && section.start < chunk.start + chunk.size) {
              chunk.data.set(section.data, section.start - chunk.start);
            }
          }
          if (__privateGet(this, _chunked)) {
            __privateMethod(this, _writeDataIntoChunks, writeDataIntoChunks_fn).call(this, chunk.data, chunk.start);
            __privateMethod(this, _flushChunks, flushChunks_fn).call(this);
          } else {
            __privateGet(this, _target2).options.onData?.(chunk.data, chunk.start);
          }
        }
        __privateGet(this, _sections).length = 0;
      }
      finalize() {
        if (__privateGet(this, _chunked)) {
          __privateMethod(this, _flushChunks, flushChunks_fn).call(this, true);
        }
      }
    };
    _target2 = /* @__PURE__ */ new WeakMap();
    _sections = /* @__PURE__ */ new WeakMap();
    _chunked = /* @__PURE__ */ new WeakMap();
    _chunkSize = /* @__PURE__ */ new WeakMap();
    _chunks = /* @__PURE__ */ new WeakMap();
    _writeDataIntoChunks = /* @__PURE__ */ new WeakSet();
    writeDataIntoChunks_fn = function(data, position) {
      let chunkIndex = __privateGet(this, _chunks).findIndex((x) => x.start <= position && position < x.start + __privateGet(this, _chunkSize));
      if (chunkIndex === -1)
        chunkIndex = __privateMethod(this, _createChunk, createChunk_fn).call(this, position);
      let chunk = __privateGet(this, _chunks)[chunkIndex];
      let relativePosition = position - chunk.start;
      let toWrite = data.subarray(0, Math.min(__privateGet(this, _chunkSize) - relativePosition, data.byteLength));
      chunk.data.set(toWrite, relativePosition);
      let section = {
        start: relativePosition,
        end: relativePosition + toWrite.byteLength
      };
      __privateMethod(this, _insertSectionIntoChunk, insertSectionIntoChunk_fn).call(this, chunk, section);
      if (chunk.written[0].start === 0 && chunk.written[0].end === __privateGet(this, _chunkSize)) {
        chunk.shouldFlush = true;
      }
      if (__privateGet(this, _chunks).length > MAX_CHUNKS_AT_ONCE) {
        for (let i = 0; i < __privateGet(this, _chunks).length - 1; i++) {
          __privateGet(this, _chunks)[i].shouldFlush = true;
        }
        __privateMethod(this, _flushChunks, flushChunks_fn).call(this);
      }
      if (toWrite.byteLength < data.byteLength) {
        __privateMethod(this, _writeDataIntoChunks, writeDataIntoChunks_fn).call(this, data.subarray(toWrite.byteLength), position + toWrite.byteLength);
      }
    };
    _insertSectionIntoChunk = /* @__PURE__ */ new WeakSet();
    insertSectionIntoChunk_fn = function(chunk, section) {
      let low = 0;
      let high = chunk.written.length - 1;
      let index = -1;
      while (low <= high) {
        let mid = Math.floor(low + (high - low + 1) / 2);
        if (chunk.written[mid].start <= section.start) {
          low = mid + 1;
          index = mid;
        } else {
          high = mid - 1;
        }
      }
      chunk.written.splice(index + 1, 0, section);
      if (index === -1 || chunk.written[index].end < section.start)
        index++;
      while (index < chunk.written.length - 1 && chunk.written[index].end >= chunk.written[index + 1].start) {
        chunk.written[index].end = Math.max(chunk.written[index].end, chunk.written[index + 1].end);
        chunk.written.splice(index + 1, 1);
      }
    };
    _createChunk = /* @__PURE__ */ new WeakSet();
    createChunk_fn = function(includesPosition) {
      let start = Math.floor(includesPosition / __privateGet(this, _chunkSize)) * __privateGet(this, _chunkSize);
      let chunk = {
        start,
        data: new Uint8Array(__privateGet(this, _chunkSize)),
        written: [],
        shouldFlush: false
      };
      __privateGet(this, _chunks).push(chunk);
      __privateGet(this, _chunks).sort((a, b) => a.start - b.start);
      return __privateGet(this, _chunks).indexOf(chunk);
    };
    _flushChunks = /* @__PURE__ */ new WeakSet();
    flushChunks_fn = function(force = false) {
      for (let i = 0; i < __privateGet(this, _chunks).length; i++) {
        let chunk = __privateGet(this, _chunks)[i];
        if (!chunk.shouldFlush && !force)
          continue;
        for (let section of chunk.written) {
          __privateGet(this, _target2).options.onData?.(
            chunk.data.subarray(section.start, section.end),
            chunk.start + section.start
          );
        }
        __privateGet(this, _chunks).splice(i--, 1);
      }
    };
    FileSystemWritableFileStreamTargetWriter = class extends StreamTargetWriter {
      constructor(target) {
        super(new StreamTarget({
          onData: (data, position) => target.stream.write({
            type: "write",
            data,
            position
          }),
          chunked: true,
          chunkSize: target.options?.chunkSize
        }));
      }
    };
    GLOBAL_TIMESCALE = 1e3;
    SUPPORTED_VIDEO_CODECS = ["avc", "hevc", "vp9", "av1"];
    SUPPORTED_AUDIO_CODECS = ["aac", "opus"];
    TIMESTAMP_OFFSET = 2082844800;
    FIRST_TIMESTAMP_BEHAVIORS = ["strict", "offset", "cross-track-offset"];
    Muxer = class {
      constructor(options) {
        __privateAdd(this, _validateOptions);
        __privateAdd(this, _writeHeader);
        __privateAdd(this, _computeMoovSizeUpperBound);
        __privateAdd(this, _prepareTracks);
        __privateAdd(this, _generateMpeg4AudioSpecificConfig);
        __privateAdd(this, _createSampleForTrack);
        __privateAdd(this, _addSampleToTrack);
        __privateAdd(this, _validateTimestamp);
        __privateAdd(this, _finalizeCurrentChunk);
        __privateAdd(this, _finalizeFragment);
        __privateAdd(this, _maybeFlushStreamingTargetWriter);
        __privateAdd(this, _ensureNotFinalized);
        __privateAdd(this, _options, void 0);
        __privateAdd(this, _writer, void 0);
        __privateAdd(this, _ftypSize, void 0);
        __privateAdd(this, _mdat, void 0);
        __privateAdd(this, _videoTrack, null);
        __privateAdd(this, _audioTrack, null);
        __privateAdd(this, _creationTime, Math.floor(Date.now() / 1e3) + TIMESTAMP_OFFSET);
        __privateAdd(this, _finalizedChunks, []);
        __privateAdd(this, _nextFragmentNumber, 1);
        __privateAdd(this, _videoSampleQueue, []);
        __privateAdd(this, _audioSampleQueue, []);
        __privateAdd(this, _finalized, false);
        __privateMethod(this, _validateOptions, validateOptions_fn).call(this, options);
        options.video = deepClone(options.video);
        options.audio = deepClone(options.audio);
        options.fastStart = deepClone(options.fastStart);
        this.target = options.target;
        __privateSet(this, _options, {
          firstTimestampBehavior: "strict",
          ...options
        });
        if (options.target instanceof ArrayBufferTarget) {
          __privateSet(this, _writer, new ArrayBufferTargetWriter(options.target));
        } else if (options.target instanceof StreamTarget) {
          __privateSet(this, _writer, new StreamTargetWriter(options.target));
        } else if (options.target instanceof FileSystemWritableFileStreamTarget) {
          __privateSet(this, _writer, new FileSystemWritableFileStreamTargetWriter(options.target));
        } else {
          throw new Error(`Invalid target: ${options.target}`);
        }
        __privateMethod(this, _prepareTracks, prepareTracks_fn).call(this);
        __privateMethod(this, _writeHeader, writeHeader_fn).call(this);
      }
      addVideoChunk(sample, meta, timestamp, compositionTimeOffset) {
        if (!(sample instanceof EncodedVideoChunk)) {
          throw new TypeError("addVideoChunk's first argument (sample) must be of type EncodedVideoChunk.");
        }
        if (meta && typeof meta !== "object") {
          throw new TypeError("addVideoChunk's second argument (meta), when provided, must be an object.");
        }
        if (timestamp !== void 0 && (!Number.isFinite(timestamp) || timestamp < 0)) {
          throw new TypeError(
            "addVideoChunk's third argument (timestamp), when provided, must be a non-negative real number."
          );
        }
        if (compositionTimeOffset !== void 0 && !Number.isFinite(compositionTimeOffset)) {
          throw new TypeError(
            "addVideoChunk's fourth argument (compositionTimeOffset), when provided, must be a real number."
          );
        }
        let data = new Uint8Array(sample.byteLength);
        sample.copyTo(data);
        this.addVideoChunkRaw(
          data,
          sample.type,
          timestamp ?? sample.timestamp,
          sample.duration,
          meta,
          compositionTimeOffset
        );
      }
      addVideoChunkRaw(data, type, timestamp, duration, meta, compositionTimeOffset) {
        if (!(data instanceof Uint8Array)) {
          throw new TypeError("addVideoChunkRaw's first argument (data) must be an instance of Uint8Array.");
        }
        if (type !== "key" && type !== "delta") {
          throw new TypeError("addVideoChunkRaw's second argument (type) must be either 'key' or 'delta'.");
        }
        if (!Number.isFinite(timestamp) || timestamp < 0) {
          throw new TypeError("addVideoChunkRaw's third argument (timestamp) must be a non-negative real number.");
        }
        if (!Number.isFinite(duration) || duration < 0) {
          throw new TypeError("addVideoChunkRaw's fourth argument (duration) must be a non-negative real number.");
        }
        if (meta && typeof meta !== "object") {
          throw new TypeError("addVideoChunkRaw's fifth argument (meta), when provided, must be an object.");
        }
        if (compositionTimeOffset !== void 0 && !Number.isFinite(compositionTimeOffset)) {
          throw new TypeError(
            "addVideoChunkRaw's sixth argument (compositionTimeOffset), when provided, must be a real number."
          );
        }
        __privateMethod(this, _ensureNotFinalized, ensureNotFinalized_fn).call(this);
        if (!__privateGet(this, _options).video)
          throw new Error("No video track declared.");
        if (typeof __privateGet(this, _options).fastStart === "object" && __privateGet(this, _videoTrack).samples.length === __privateGet(this, _options).fastStart.expectedVideoChunks) {
          throw new Error(`Cannot add more video chunks than specified in 'fastStart' (${__privateGet(this, _options).fastStart.expectedVideoChunks}).`);
        }
        let videoSample = __privateMethod(this, _createSampleForTrack, createSampleForTrack_fn).call(this, __privateGet(this, _videoTrack), data, type, timestamp, duration, meta, compositionTimeOffset);
        if (__privateGet(this, _options).fastStart === "fragmented" && __privateGet(this, _audioTrack)) {
          while (__privateGet(this, _audioSampleQueue).length > 0 && __privateGet(this, _audioSampleQueue)[0].decodeTimestamp <= videoSample.decodeTimestamp) {
            let audioSample = __privateGet(this, _audioSampleQueue).shift();
            __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _audioTrack), audioSample);
          }
          if (videoSample.decodeTimestamp <= __privateGet(this, _audioTrack).lastDecodeTimestamp) {
            __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _videoTrack), videoSample);
          } else {
            __privateGet(this, _videoSampleQueue).push(videoSample);
          }
        } else {
          __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _videoTrack), videoSample);
        }
      }
      addAudioChunk(sample, meta, timestamp) {
        if (!(sample instanceof EncodedAudioChunk)) {
          throw new TypeError("addAudioChunk's first argument (sample) must be of type EncodedAudioChunk.");
        }
        if (meta && typeof meta !== "object") {
          throw new TypeError("addAudioChunk's second argument (meta), when provided, must be an object.");
        }
        if (timestamp !== void 0 && (!Number.isFinite(timestamp) || timestamp < 0)) {
          throw new TypeError(
            "addAudioChunk's third argument (timestamp), when provided, must be a non-negative real number."
          );
        }
        let data = new Uint8Array(sample.byteLength);
        sample.copyTo(data);
        this.addAudioChunkRaw(data, sample.type, timestamp ?? sample.timestamp, sample.duration, meta);
      }
      addAudioChunkRaw(data, type, timestamp, duration, meta) {
        if (!(data instanceof Uint8Array)) {
          throw new TypeError("addAudioChunkRaw's first argument (data) must be an instance of Uint8Array.");
        }
        if (type !== "key" && type !== "delta") {
          throw new TypeError("addAudioChunkRaw's second argument (type) must be either 'key' or 'delta'.");
        }
        if (!Number.isFinite(timestamp) || timestamp < 0) {
          throw new TypeError("addAudioChunkRaw's third argument (timestamp) must be a non-negative real number.");
        }
        if (!Number.isFinite(duration) || duration < 0) {
          throw new TypeError("addAudioChunkRaw's fourth argument (duration) must be a non-negative real number.");
        }
        if (meta && typeof meta !== "object") {
          throw new TypeError("addAudioChunkRaw's fifth argument (meta), when provided, must be an object.");
        }
        __privateMethod(this, _ensureNotFinalized, ensureNotFinalized_fn).call(this);
        if (!__privateGet(this, _options).audio)
          throw new Error("No audio track declared.");
        if (typeof __privateGet(this, _options).fastStart === "object" && __privateGet(this, _audioTrack).samples.length === __privateGet(this, _options).fastStart.expectedAudioChunks) {
          throw new Error(`Cannot add more audio chunks than specified in 'fastStart' (${__privateGet(this, _options).fastStart.expectedAudioChunks}).`);
        }
        let audioSample = __privateMethod(this, _createSampleForTrack, createSampleForTrack_fn).call(this, __privateGet(this, _audioTrack), data, type, timestamp, duration, meta);
        if (__privateGet(this, _options).fastStart === "fragmented" && __privateGet(this, _videoTrack)) {
          while (__privateGet(this, _videoSampleQueue).length > 0 && __privateGet(this, _videoSampleQueue)[0].decodeTimestamp <= audioSample.decodeTimestamp) {
            let videoSample = __privateGet(this, _videoSampleQueue).shift();
            __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _videoTrack), videoSample);
          }
          if (audioSample.decodeTimestamp <= __privateGet(this, _videoTrack).lastDecodeTimestamp) {
            __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _audioTrack), audioSample);
          } else {
            __privateGet(this, _audioSampleQueue).push(audioSample);
          }
        } else {
          __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _audioTrack), audioSample);
        }
      }
      /** Finalizes the file, making it ready for use. Must be called after all video and audio chunks have been added. */
      finalize() {
        if (__privateGet(this, _finalized)) {
          throw new Error("Cannot finalize a muxer more than once.");
        }
        if (__privateGet(this, _options).fastStart === "fragmented") {
          for (let videoSample of __privateGet(this, _videoSampleQueue))
            __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _videoTrack), videoSample);
          for (let audioSample of __privateGet(this, _audioSampleQueue))
            __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _audioTrack), audioSample);
          __privateMethod(this, _finalizeFragment, finalizeFragment_fn).call(this, false);
        } else {
          if (__privateGet(this, _videoTrack))
            __privateMethod(this, _finalizeCurrentChunk, finalizeCurrentChunk_fn).call(this, __privateGet(this, _videoTrack));
          if (__privateGet(this, _audioTrack))
            __privateMethod(this, _finalizeCurrentChunk, finalizeCurrentChunk_fn).call(this, __privateGet(this, _audioTrack));
        }
        let tracks = [__privateGet(this, _videoTrack), __privateGet(this, _audioTrack)].filter(Boolean);
        if (__privateGet(this, _options).fastStart === "in-memory") {
          let mdatSize;
          for (let i = 0; i < 2; i++) {
            let movieBox2 = moov(tracks, __privateGet(this, _creationTime));
            let movieBoxSize = __privateGet(this, _writer).measureBox(movieBox2);
            mdatSize = __privateGet(this, _writer).measureBox(__privateGet(this, _mdat));
            let currentChunkPos = __privateGet(this, _writer).pos + movieBoxSize + mdatSize;
            for (let chunk of __privateGet(this, _finalizedChunks)) {
              chunk.offset = currentChunkPos;
              for (let { data } of chunk.samples) {
                currentChunkPos += data.byteLength;
                mdatSize += data.byteLength;
              }
            }
            if (currentChunkPos < 2 ** 32)
              break;
            if (mdatSize >= 2 ** 32)
              __privateGet(this, _mdat).largeSize = true;
          }
          let movieBox = moov(tracks, __privateGet(this, _creationTime));
          __privateGet(this, _writer).writeBox(movieBox);
          __privateGet(this, _mdat).size = mdatSize;
          __privateGet(this, _writer).writeBox(__privateGet(this, _mdat));
          for (let chunk of __privateGet(this, _finalizedChunks)) {
            for (let sample of chunk.samples) {
              __privateGet(this, _writer).write(sample.data);
              sample.data = null;
            }
          }
        } else if (__privateGet(this, _options).fastStart === "fragmented") {
          let startPos = __privateGet(this, _writer).pos;
          let mfraBox = mfra(tracks);
          __privateGet(this, _writer).writeBox(mfraBox);
          let mfraBoxSize = __privateGet(this, _writer).pos - startPos;
          __privateGet(this, _writer).seek(__privateGet(this, _writer).pos - 4);
          __privateGet(this, _writer).writeU32(mfraBoxSize);
        } else {
          let mdatPos = __privateGet(this, _writer).offsets.get(__privateGet(this, _mdat));
          let mdatSize = __privateGet(this, _writer).pos - mdatPos;
          __privateGet(this, _mdat).size = mdatSize;
          __privateGet(this, _mdat).largeSize = mdatSize >= 2 ** 32;
          __privateGet(this, _writer).patchBox(__privateGet(this, _mdat));
          let movieBox = moov(tracks, __privateGet(this, _creationTime));
          if (typeof __privateGet(this, _options).fastStart === "object") {
            __privateGet(this, _writer).seek(__privateGet(this, _ftypSize));
            __privateGet(this, _writer).writeBox(movieBox);
            let remainingBytes = mdatPos - __privateGet(this, _writer).pos;
            __privateGet(this, _writer).writeBox(free(remainingBytes));
          } else {
            __privateGet(this, _writer).writeBox(movieBox);
          }
        }
        __privateMethod(this, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn).call(this);
        __privateGet(this, _writer).finalize();
        __privateSet(this, _finalized, true);
      }
    };
    _options = /* @__PURE__ */ new WeakMap();
    _writer = /* @__PURE__ */ new WeakMap();
    _ftypSize = /* @__PURE__ */ new WeakMap();
    _mdat = /* @__PURE__ */ new WeakMap();
    _videoTrack = /* @__PURE__ */ new WeakMap();
    _audioTrack = /* @__PURE__ */ new WeakMap();
    _creationTime = /* @__PURE__ */ new WeakMap();
    _finalizedChunks = /* @__PURE__ */ new WeakMap();
    _nextFragmentNumber = /* @__PURE__ */ new WeakMap();
    _videoSampleQueue = /* @__PURE__ */ new WeakMap();
    _audioSampleQueue = /* @__PURE__ */ new WeakMap();
    _finalized = /* @__PURE__ */ new WeakMap();
    _validateOptions = /* @__PURE__ */ new WeakSet();
    validateOptions_fn = function(options) {
      if (typeof options !== "object") {
        throw new TypeError("The muxer requires an options object to be passed to its constructor.");
      }
      if (!(options.target instanceof Target)) {
        throw new TypeError("The target must be provided and an instance of Target.");
      }
      if (options.video) {
        if (!SUPPORTED_VIDEO_CODECS.includes(options.video.codec)) {
          throw new TypeError(`Unsupported video codec: ${options.video.codec}`);
        }
        if (!Number.isInteger(options.video.width) || options.video.width <= 0) {
          throw new TypeError(`Invalid video width: ${options.video.width}. Must be a positive integer.`);
        }
        if (!Number.isInteger(options.video.height) || options.video.height <= 0) {
          throw new TypeError(`Invalid video height: ${options.video.height}. Must be a positive integer.`);
        }
        const videoRotation = options.video.rotation;
        if (typeof videoRotation === "number" && ![0, 90, 180, 270].includes(videoRotation)) {
          throw new TypeError(`Invalid video rotation: ${videoRotation}. Has to be 0, 90, 180 or 270.`);
        } else if (Array.isArray(videoRotation) && (videoRotation.length !== 9 || videoRotation.some((value) => typeof value !== "number"))) {
          throw new TypeError(`Invalid video transformation matrix: ${videoRotation.join()}`);
        }
        if (options.video.frameRate !== void 0 && (!Number.isInteger(options.video.frameRate) || options.video.frameRate <= 0)) {
          throw new TypeError(
            `Invalid video frame rate: ${options.video.frameRate}. Must be a positive integer.`
          );
        }
      }
      if (options.audio) {
        if (!SUPPORTED_AUDIO_CODECS.includes(options.audio.codec)) {
          throw new TypeError(`Unsupported audio codec: ${options.audio.codec}`);
        }
        if (!Number.isInteger(options.audio.numberOfChannels) || options.audio.numberOfChannels <= 0) {
          throw new TypeError(
            `Invalid number of audio channels: ${options.audio.numberOfChannels}. Must be a positive integer.`
          );
        }
        if (!Number.isInteger(options.audio.sampleRate) || options.audio.sampleRate <= 0) {
          throw new TypeError(
            `Invalid audio sample rate: ${options.audio.sampleRate}. Must be a positive integer.`
          );
        }
      }
      if (options.firstTimestampBehavior && !FIRST_TIMESTAMP_BEHAVIORS.includes(options.firstTimestampBehavior)) {
        throw new TypeError(`Invalid first timestamp behavior: ${options.firstTimestampBehavior}`);
      }
      if (typeof options.fastStart === "object") {
        if (options.video) {
          if (options.fastStart.expectedVideoChunks === void 0) {
            throw new TypeError(`'fastStart' is an object but is missing property 'expectedVideoChunks'.`);
          } else if (!Number.isInteger(options.fastStart.expectedVideoChunks) || options.fastStart.expectedVideoChunks < 0) {
            throw new TypeError(`'expectedVideoChunks' must be a non-negative integer.`);
          }
        }
        if (options.audio) {
          if (options.fastStart.expectedAudioChunks === void 0) {
            throw new TypeError(`'fastStart' is an object but is missing property 'expectedAudioChunks'.`);
          } else if (!Number.isInteger(options.fastStart.expectedAudioChunks) || options.fastStart.expectedAudioChunks < 0) {
            throw new TypeError(`'expectedAudioChunks' must be a non-negative integer.`);
          }
        }
      } else if (![false, "in-memory", "fragmented"].includes(options.fastStart)) {
        throw new TypeError(`'fastStart' option must be false, 'in-memory', 'fragmented' or an object.`);
      }
      if (options.minFragmentDuration !== void 0 && (!Number.isFinite(options.minFragmentDuration) || options.minFragmentDuration < 0)) {
        throw new TypeError(`'minFragmentDuration' must be a non-negative number.`);
      }
    };
    _writeHeader = /* @__PURE__ */ new WeakSet();
    writeHeader_fn = function() {
      __privateGet(this, _writer).writeBox(ftyp({
        holdsAvc: __privateGet(this, _options).video?.codec === "avc",
        fragmented: __privateGet(this, _options).fastStart === "fragmented"
      }));
      __privateSet(this, _ftypSize, __privateGet(this, _writer).pos);
      if (__privateGet(this, _options).fastStart === "in-memory") {
        __privateSet(this, _mdat, mdat(false));
      } else if (__privateGet(this, _options).fastStart === "fragmented") {
      } else {
        if (typeof __privateGet(this, _options).fastStart === "object") {
          let moovSizeUpperBound = __privateMethod(this, _computeMoovSizeUpperBound, computeMoovSizeUpperBound_fn).call(this);
          __privateGet(this, _writer).seek(__privateGet(this, _writer).pos + moovSizeUpperBound);
        }
        __privateSet(this, _mdat, mdat(true));
        __privateGet(this, _writer).writeBox(__privateGet(this, _mdat));
      }
      __privateMethod(this, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn).call(this);
    };
    _computeMoovSizeUpperBound = /* @__PURE__ */ new WeakSet();
    computeMoovSizeUpperBound_fn = function() {
      if (typeof __privateGet(this, _options).fastStart !== "object")
        return;
      let upperBound = 0;
      let sampleCounts = [
        __privateGet(this, _options).fastStart.expectedVideoChunks,
        __privateGet(this, _options).fastStart.expectedAudioChunks
      ];
      for (let n of sampleCounts) {
        if (!n)
          continue;
        upperBound += (4 + 4) * Math.ceil(2 / 3 * n);
        upperBound += 4 * n;
        upperBound += (4 + 4 + 4) * Math.ceil(2 / 3 * n);
        upperBound += 4 * n;
        upperBound += 8 * n;
      }
      upperBound += 4096;
      return upperBound;
    };
    _prepareTracks = /* @__PURE__ */ new WeakSet();
    prepareTracks_fn = function() {
      if (__privateGet(this, _options).video) {
        __privateSet(this, _videoTrack, {
          id: 1,
          info: {
            type: "video",
            codec: __privateGet(this, _options).video.codec,
            width: __privateGet(this, _options).video.width,
            height: __privateGet(this, _options).video.height,
            rotation: __privateGet(this, _options).video.rotation ?? 0,
            decoderConfig: null
          },
          // The fallback contains many common frame rates as factors
          timescale: __privateGet(this, _options).video.frameRate ?? 57600,
          samples: [],
          finalizedChunks: [],
          currentChunk: null,
          firstDecodeTimestamp: void 0,
          lastDecodeTimestamp: -1,
          timeToSampleTable: [],
          compositionTimeOffsetTable: [],
          lastTimescaleUnits: null,
          lastSample: null,
          compactlyCodedChunkTable: []
        });
      }
      if (__privateGet(this, _options).audio) {
        __privateSet(this, _audioTrack, {
          id: __privateGet(this, _options).video ? 2 : 1,
          info: {
            type: "audio",
            codec: __privateGet(this, _options).audio.codec,
            numberOfChannels: __privateGet(this, _options).audio.numberOfChannels,
            sampleRate: __privateGet(this, _options).audio.sampleRate,
            decoderConfig: null
          },
          timescale: __privateGet(this, _options).audio.sampleRate,
          samples: [],
          finalizedChunks: [],
          currentChunk: null,
          firstDecodeTimestamp: void 0,
          lastDecodeTimestamp: -1,
          timeToSampleTable: [],
          compositionTimeOffsetTable: [],
          lastTimescaleUnits: null,
          lastSample: null,
          compactlyCodedChunkTable: []
        });
        if (__privateGet(this, _options).audio.codec === "aac") {
          let guessedCodecPrivate = __privateMethod(this, _generateMpeg4AudioSpecificConfig, generateMpeg4AudioSpecificConfig_fn).call(
            this,
            2,
            // Object type for AAC-LC, since it's the most common
            __privateGet(this, _options).audio.sampleRate,
            __privateGet(this, _options).audio.numberOfChannels
          );
          __privateGet(this, _audioTrack).info.decoderConfig = {
            codec: __privateGet(this, _options).audio.codec,
            description: guessedCodecPrivate,
            numberOfChannels: __privateGet(this, _options).audio.numberOfChannels,
            sampleRate: __privateGet(this, _options).audio.sampleRate
          };
        }
      }
    };
    _generateMpeg4AudioSpecificConfig = /* @__PURE__ */ new WeakSet();
    generateMpeg4AudioSpecificConfig_fn = function(objectType, sampleRate, numberOfChannels) {
      let frequencyIndices = [96e3, 88200, 64e3, 48e3, 44100, 32e3, 24e3, 22050, 16e3, 12e3, 11025, 8e3, 7350];
      let frequencyIndex = frequencyIndices.indexOf(sampleRate);
      let channelConfig = numberOfChannels;
      let configBits = "";
      configBits += objectType.toString(2).padStart(5, "0");
      configBits += frequencyIndex.toString(2).padStart(4, "0");
      if (frequencyIndex === 15)
        configBits += sampleRate.toString(2).padStart(24, "0");
      configBits += channelConfig.toString(2).padStart(4, "0");
      let paddingLength = Math.ceil(configBits.length / 8) * 8;
      configBits = configBits.padEnd(paddingLength, "0");
      let configBytes = new Uint8Array(configBits.length / 8);
      for (let i = 0; i < configBits.length; i += 8) {
        configBytes[i / 8] = parseInt(configBits.slice(i, i + 8), 2);
      }
      return configBytes;
    };
    _createSampleForTrack = /* @__PURE__ */ new WeakSet();
    createSampleForTrack_fn = function(track, data, type, timestamp, duration, meta, compositionTimeOffset) {
      let presentationTimestampInSeconds = timestamp / 1e6;
      let decodeTimestampInSeconds = (timestamp - (compositionTimeOffset ?? 0)) / 1e6;
      let durationInSeconds = duration / 1e6;
      let adjusted = __privateMethod(this, _validateTimestamp, validateTimestamp_fn).call(this, presentationTimestampInSeconds, decodeTimestampInSeconds, track);
      presentationTimestampInSeconds = adjusted.presentationTimestamp;
      decodeTimestampInSeconds = adjusted.decodeTimestamp;
      if (meta?.decoderConfig) {
        if (track.info.decoderConfig === null) {
          track.info.decoderConfig = meta.decoderConfig;
        } else {
          Object.assign(track.info.decoderConfig, meta.decoderConfig);
        }
      }
      let sample = {
        presentationTimestamp: presentationTimestampInSeconds,
        decodeTimestamp: decodeTimestampInSeconds,
        duration: durationInSeconds,
        data,
        size: data.byteLength,
        type,
        // Will be refined once the next sample comes in
        timescaleUnitsToNextSample: intoTimescale(durationInSeconds, track.timescale)
      };
      return sample;
    };
    _addSampleToTrack = /* @__PURE__ */ new WeakSet();
    addSampleToTrack_fn = function(track, sample) {
      if (__privateGet(this, _options).fastStart !== "fragmented") {
        track.samples.push(sample);
      }
      const sampleCompositionTimeOffset = intoTimescale(sample.presentationTimestamp - sample.decodeTimestamp, track.timescale);
      if (track.lastTimescaleUnits !== null) {
        let timescaleUnits = intoTimescale(sample.decodeTimestamp, track.timescale, false);
        let delta = Math.round(timescaleUnits - track.lastTimescaleUnits);
        track.lastTimescaleUnits += delta;
        track.lastSample.timescaleUnitsToNextSample = delta;
        if (__privateGet(this, _options).fastStart !== "fragmented") {
          let lastTableEntry = last(track.timeToSampleTable);
          if (lastTableEntry.sampleCount === 1) {
            lastTableEntry.sampleDelta = delta;
            lastTableEntry.sampleCount++;
          } else if (lastTableEntry.sampleDelta === delta) {
            lastTableEntry.sampleCount++;
          } else {
            lastTableEntry.sampleCount--;
            track.timeToSampleTable.push({
              sampleCount: 2,
              sampleDelta: delta
            });
          }
          const lastCompositionTimeOffsetTableEntry = last(track.compositionTimeOffsetTable);
          if (lastCompositionTimeOffsetTableEntry.sampleCompositionTimeOffset === sampleCompositionTimeOffset) {
            lastCompositionTimeOffsetTableEntry.sampleCount++;
          } else {
            track.compositionTimeOffsetTable.push({
              sampleCount: 1,
              sampleCompositionTimeOffset
            });
          }
        }
      } else {
        track.lastTimescaleUnits = 0;
        if (__privateGet(this, _options).fastStart !== "fragmented") {
          track.timeToSampleTable.push({
            sampleCount: 1,
            sampleDelta: intoTimescale(sample.duration, track.timescale)
          });
          track.compositionTimeOffsetTable.push({
            sampleCount: 1,
            sampleCompositionTimeOffset
          });
        }
      }
      track.lastSample = sample;
      let beginNewChunk = false;
      if (!track.currentChunk) {
        beginNewChunk = true;
      } else {
        let currentChunkDuration = sample.presentationTimestamp - track.currentChunk.startTimestamp;
        if (__privateGet(this, _options).fastStart === "fragmented") {
          let mostImportantTrack = __privateGet(this, _videoTrack) ?? __privateGet(this, _audioTrack);
          const chunkDuration = __privateGet(this, _options).minFragmentDuration ?? 1;
          if (track === mostImportantTrack && sample.type === "key" && currentChunkDuration >= chunkDuration) {
            beginNewChunk = true;
            __privateMethod(this, _finalizeFragment, finalizeFragment_fn).call(this);
          }
        } else {
          beginNewChunk = currentChunkDuration >= 0.5;
        }
      }
      if (beginNewChunk) {
        if (track.currentChunk) {
          __privateMethod(this, _finalizeCurrentChunk, finalizeCurrentChunk_fn).call(this, track);
        }
        track.currentChunk = {
          startTimestamp: sample.presentationTimestamp,
          samples: []
        };
      }
      track.currentChunk.samples.push(sample);
    };
    _validateTimestamp = /* @__PURE__ */ new WeakSet();
    validateTimestamp_fn = function(presentationTimestamp, decodeTimestamp, track) {
      const strictTimestampBehavior = __privateGet(this, _options).firstTimestampBehavior === "strict";
      const noLastDecodeTimestamp = track.lastDecodeTimestamp === -1;
      const timestampNonZero = decodeTimestamp !== 0;
      if (strictTimestampBehavior && noLastDecodeTimestamp && timestampNonZero) {
        throw new Error(
          `The first chunk for your media track must have a timestamp of 0 (received DTS=${decodeTimestamp}).Non-zero first timestamps are often caused by directly piping frames or audio data from a MediaStreamTrack into the encoder. Their timestamps are typically relative to the age of thedocument, which is probably what you want.

If you want to offset all timestamps of a track such that the first one is zero, set firstTimestampBehavior: 'offset' in the options.
`
        );
      } else if (__privateGet(this, _options).firstTimestampBehavior === "offset" || __privateGet(this, _options).firstTimestampBehavior === "cross-track-offset") {
        if (track.firstDecodeTimestamp === void 0) {
          track.firstDecodeTimestamp = decodeTimestamp;
        }
        let baseDecodeTimestamp;
        if (__privateGet(this, _options).firstTimestampBehavior === "offset") {
          baseDecodeTimestamp = track.firstDecodeTimestamp;
        } else {
          baseDecodeTimestamp = Math.min(
            __privateGet(this, _videoTrack)?.firstDecodeTimestamp ?? Infinity,
            __privateGet(this, _audioTrack)?.firstDecodeTimestamp ?? Infinity
          );
        }
        decodeTimestamp -= baseDecodeTimestamp;
        presentationTimestamp -= baseDecodeTimestamp;
      }
      if (decodeTimestamp < track.lastDecodeTimestamp) {
        throw new Error(
          `Timestamps must be monotonically increasing (DTS went from ${track.lastDecodeTimestamp * 1e6} to ${decodeTimestamp * 1e6}).`
        );
      }
      track.lastDecodeTimestamp = decodeTimestamp;
      return { presentationTimestamp, decodeTimestamp };
    };
    _finalizeCurrentChunk = /* @__PURE__ */ new WeakSet();
    finalizeCurrentChunk_fn = function(track) {
      if (__privateGet(this, _options).fastStart === "fragmented") {
        throw new Error("Can't finalize individual chunks if 'fastStart' is set to 'fragmented'.");
      }
      if (!track.currentChunk)
        return;
      track.finalizedChunks.push(track.currentChunk);
      __privateGet(this, _finalizedChunks).push(track.currentChunk);
      if (track.compactlyCodedChunkTable.length === 0 || last(track.compactlyCodedChunkTable).samplesPerChunk !== track.currentChunk.samples.length) {
        track.compactlyCodedChunkTable.push({
          firstChunk: track.finalizedChunks.length,
          // 1-indexed
          samplesPerChunk: track.currentChunk.samples.length
        });
      }
      if (__privateGet(this, _options).fastStart === "in-memory") {
        track.currentChunk.offset = 0;
        return;
      }
      track.currentChunk.offset = __privateGet(this, _writer).pos;
      for (let sample of track.currentChunk.samples) {
        __privateGet(this, _writer).write(sample.data);
        sample.data = null;
      }
      __privateMethod(this, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn).call(this);
    };
    _finalizeFragment = /* @__PURE__ */ new WeakSet();
    finalizeFragment_fn = function(flushStreamingWriter = true) {
      if (__privateGet(this, _options).fastStart !== "fragmented") {
        throw new Error("Can't finalize a fragment unless 'fastStart' is set to 'fragmented'.");
      }
      let tracks = [__privateGet(this, _videoTrack), __privateGet(this, _audioTrack)].filter((track) => track && track.currentChunk);
      if (tracks.length === 0)
        return;
      let fragmentNumber = __privateWrapper(this, _nextFragmentNumber)._++;
      if (fragmentNumber === 1) {
        let movieBox = moov(tracks, __privateGet(this, _creationTime), true);
        __privateGet(this, _writer).writeBox(movieBox);
      }
      let moofOffset = __privateGet(this, _writer).pos;
      let moofBox = moof(fragmentNumber, tracks);
      __privateGet(this, _writer).writeBox(moofBox);
      {
        let mdatBox = mdat(false);
        let totalTrackSampleSize = 0;
        for (let track of tracks) {
          for (let sample of track.currentChunk.samples) {
            totalTrackSampleSize += sample.size;
          }
        }
        let mdatSize = __privateGet(this, _writer).measureBox(mdatBox) + totalTrackSampleSize;
        if (mdatSize >= 2 ** 32) {
          mdatBox.largeSize = true;
          mdatSize = __privateGet(this, _writer).measureBox(mdatBox) + totalTrackSampleSize;
        }
        mdatBox.size = mdatSize;
        __privateGet(this, _writer).writeBox(mdatBox);
      }
      for (let track of tracks) {
        track.currentChunk.offset = __privateGet(this, _writer).pos;
        track.currentChunk.moofOffset = moofOffset;
        for (let sample of track.currentChunk.samples) {
          __privateGet(this, _writer).write(sample.data);
          sample.data = null;
        }
      }
      let endPos = __privateGet(this, _writer).pos;
      __privateGet(this, _writer).seek(__privateGet(this, _writer).offsets.get(moofBox));
      let newMoofBox = moof(fragmentNumber, tracks);
      __privateGet(this, _writer).writeBox(newMoofBox);
      __privateGet(this, _writer).seek(endPos);
      for (let track of tracks) {
        track.finalizedChunks.push(track.currentChunk);
        __privateGet(this, _finalizedChunks).push(track.currentChunk);
        track.currentChunk = null;
      }
      if (flushStreamingWriter) {
        __privateMethod(this, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn).call(this);
      }
    };
    _maybeFlushStreamingTargetWriter = /* @__PURE__ */ new WeakSet();
    maybeFlushStreamingTargetWriter_fn = function() {
      if (__privateGet(this, _writer) instanceof StreamTargetWriter) {
        __privateGet(this, _writer).flush();
      }
    };
    _ensureNotFinalized = /* @__PURE__ */ new WeakSet();
    ensureNotFinalized_fn = function() {
      if (__privateGet(this, _finalized)) {
        throw new Error("Cannot add new video or audio chunks after the file has been finalized.");
      }
    };
  }
});

// src/preview/codecsRecorder.ts
function isCodecsRecordingSupported() {
  return typeof VideoEncoder !== "undefined" && typeof VideoFrame !== "undefined" && typeof AudioEncoder !== "undefined";
}
function codecKey(target) {
  return `${target.width}x${target.height}@${target.framerate}`;
}
function probeVideoCodec(target) {
  const key = codecKey(target);
  const cached = codecCache.get(key);
  if (cached) {
    return cached;
  }
  const probe = (async () => {
    for (const codec of VIDEO_CODEC_CANDIDATES) {
      try {
        const support = await VideoEncoder.isConfigSupported({
          codec,
          width: target.width,
          height: target.height,
          bitrate: target.bitrate,
          framerate: target.framerate,
          avc: { format: "avc" }
        });
        if (support.supported) {
          return codec;
        }
      } catch {
      }
    }
    throw new Error("\u5F53\u524D\u6D4F\u89C8\u5668\u6CA1\u6709\u53EF\u7528\u7684 H.264 \u7F16\u7801\u5668\u3002");
  })();
  codecCache.set(key, probe);
  probe.catch(() => codecCache.delete(key));
  return probe;
}
function pickVideoCodec(target) {
  return probeVideoCodec(target);
}
function prewarmCodecsRecording() {
  if (!isCodecsRecordingSupported()) {
    return;
  }
  for (const target of Object.values(RECORDING_TARGETS)) {
    for (const fps of [60, 30]) {
      void probeVideoCodec({
        codec: "",
        width: target.width,
        height: target.height,
        bitrate: target.videoBitsPerSecond,
        framerate: fps
      }).catch(() => void 0);
    }
  }
}
var AUDIO_BITS_PER_SECOND2, KEYFRAME_INTERVAL_SECONDS, MAX_CATCHUP_FRAMES, VIDEO_CODEC_CANDIDATES, codecCache, CodecsPreviewRecorder;
var init_codecsRecorder = __esm({
  "src/preview/codecsRecorder.ts"() {
    "use strict";
    init_mp4_muxer();
    init_recorder();
    AUDIO_BITS_PER_SECOND2 = 128e3;
    KEYFRAME_INTERVAL_SECONDS = 2;
    MAX_CATCHUP_FRAMES = 8;
    VIDEO_CODEC_CANDIDATES = ["avc1.64002a", "avc1.640028", "avc1.4d0028"];
    codecCache = /* @__PURE__ */ new Map();
    CodecsPreviewRecorder = class {
      constructor() {
        __publicField(this, "stateValue", "idle");
        __publicField(this, "resolutionValue", 720);
        __publicField(this, "fpsValue", DEFAULT_RECORDING_FPS);
        __publicField(this, "frameIntervalMs", 1e3 / DEFAULT_RECORDING_FPS);
        __publicField(this, "sourceCanvas", null);
        __publicField(this, "outputCanvas", null);
        __publicField(this, "outputContext", null);
        /** 录制目标尺寸（`RECORDING_TARGETS`），渲染画布已被 resize 到同一尺寸。 */
        __publicField(this, "targetWidth", 0);
        __publicField(this, "targetHeight", 0);
        __publicField(this, "videoEncoder", null);
        __publicField(this, "audioEncoder", null);
        __publicField(this, "muxer", null);
        __publicField(this, "audioReader", null);
        __publicField(this, "audioPump", null);
        __publicField(this, "audioOutUs", 0);
        __publicField(this, "accumulatedMs", 0);
        __publicField(this, "activeSinceMs", 0);
        __publicField(this, "captureClockStartMs", 0);
        __publicField(this, "captureFrameIndex", 0);
        __publicField(this, "capturedFramesTotal", 0);
        __publicField(this, "failure", null);
      }
      get state() {
        return this.stateValue;
      }
      get resolution() {
        return this.resolutionValue;
      }
      get fps() {
        return this.fpsValue;
      }
      get extension() {
        return "mp4";
      }
      get capturedFrames() {
        return this.capturedFramesTotal;
      }
      get elapsedMs() {
        if (this.stateValue !== "recording") {
          return this.accumulatedMs;
        }
        return this.accumulatedMs + (performance.now() - this.activeSinceMs);
      }
      async start(options) {
        if (this.stateValue !== "idle") {
          throw new Error("\u5F55\u5236\u5DF2\u5728\u8FDB\u884C\u4E2D\u3002");
        }
        if (!isCodecsRecordingSupported()) {
          throw new Error("\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301 WebCodecs \u5F55\u5236\u3002");
        }
        const target = RECORDING_TARGETS[options.resolution];
        const fps = options.fps === 30 ? 30 : DEFAULT_RECORDING_FPS;
        const frameIntervalMs = 1e3 / fps;
        const output = document.createElement("canvas");
        output.width = target.width;
        output.height = target.height;
        const outputContext = output.getContext("2d", { alpha: false });
        if (!outputContext) {
          throw new Error("\u65E0\u6CD5\u521B\u5EFA\u5F55\u5236\u753B\u5E03\u3002");
        }
        outputContext.fillStyle = "#000000";
        outputContext.fillRect(0, 0, target.width, target.height);
        const codec = await pickVideoCodec({
          codec: "",
          width: target.width,
          height: target.height,
          bitrate: target.videoBitsPerSecond,
          framerate: fps
        });
        const tap = options.audioContext ? ensureAudioTap(options.audioContext) : null;
        const audioTrack = tap?.destination.stream.getAudioTracks()[0] ?? null;
        const sampleRate = options.audioContext?.sampleRate ?? 48e3;
        const channels = 2;
        const muxer = new Muxer({
          target: new ArrayBufferTarget(),
          video: { codec: "avc", width: target.width, height: target.height, frameRate: fps },
          audio: audioTrack ? { codec: "aac", numberOfChannels: channels, sampleRate } : void 0,
          fastStart: "in-memory"
        });
        const videoEncoder = new VideoEncoder({
          output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
          error: (error) => {
            this.failure = error.message || "\u89C6\u9891\u7F16\u7801\u5668\u51FA\u9519\u3002";
          }
        });
        videoEncoder.configure({
          codec,
          width: target.width,
          height: target.height,
          bitrate: target.videoBitsPerSecond,
          framerate: fps,
          avc: { format: "avc" },
          latencyMode: "quality"
        });
        let audioEncoder = null;
        if (audioTrack && typeof MediaStreamTrackProcessor !== "undefined") {
          try {
            audioEncoder = new AudioEncoder({
              output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
              error: (error) => {
                this.failure = error.message || "\u97F3\u9891\u7F16\u7801\u5668\u51FA\u9519\u3002";
              }
            });
            audioEncoder.configure({
              codec: "mp4a.40.2",
              sampleRate,
              numberOfChannels: channels,
              bitrate: AUDIO_BITS_PER_SECOND2
            });
          } catch {
            audioEncoder = null;
          }
        }
        this.sourceCanvas = options.canvas;
        this.outputCanvas = output;
        this.outputContext = outputContext;
        this.targetWidth = target.width;
        this.targetHeight = target.height;
        this.videoEncoder = videoEncoder;
        this.audioEncoder = audioEncoder;
        this.muxer = muxer;
        this.audioOutUs = 0;
        this.failure = null;
        this.resolutionValue = options.resolution;
        this.fpsValue = fps;
        this.frameIntervalMs = frameIntervalMs;
        this.accumulatedMs = 0;
        this.captureFrameIndex = 0;
        this.capturedFramesTotal = 0;
        this.activeSinceMs = performance.now();
        this.captureClockStartMs = this.activeSinceMs;
        this.stateValue = "recording";
        if (audioTrack && audioEncoder && typeof MediaStreamTrackProcessor !== "undefined") {
          const processor = new MediaStreamTrackProcessor({ track: audioTrack });
          const reader = processor.readable.getReader();
          this.audioReader = reader;
          this.audioPump = this.runAudioPump(reader, audioEncoder);
        }
      }
      /**
       * 音频泵：每块 PCM 按「已写入采样数」重新打时间戳，暂停期间整块丢弃，
       * 这样音轨始终连续，不会因为暂停在文件里留下静音空洞。
       */
      async runAudioPump(reader, encoder) {
        try {
          for (; ; ) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            if (this.stateValue === "idle" || !this.audioEncoder) {
              value.close();
              break;
            }
            if (this.stateValue === "paused") {
              value.close();
              continue;
            }
            const frames = value.numberOfFrames;
            const channels = value.numberOfChannels;
            const rate = value.sampleRate;
            const pcm = new Float32Array(frames * channels);
            try {
              value.copyTo(pcm, { planeIndex: 0, format: "f32" });
            } catch {
              value.close();
              continue;
            }
            const stamp = this.audioOutUs;
            this.audioOutUs += Math.round(frames / rate * 1e6);
            const data = new AudioData({
              format: "f32",
              sampleRate: rate,
              numberOfFrames: frames,
              numberOfChannels: channels,
              timestamp: stamp,
              data: pcm
            });
            try {
              encoder.encode(data);
            } catch {
            } finally {
              data.close();
              value.close();
            }
          }
        } catch {
        }
      }
      /**
       * 渲染循环每帧调用一次：把录制画布刷成当前画面，并把网格上所有到期的帧
       * 都编码出去（欠几帧就补几帧重复画面）。
       */
      capture() {
        if (this.stateValue !== "recording") {
          return;
        }
        const now = performance.now();
        let pending = 0;
        while (pending < MAX_CATCHUP_FRAMES) {
          const due = this.captureClockStartMs + (this.captureFrameIndex + pending) * this.frameIntervalMs;
          if (due > now + this.frameIntervalMs * 0.5) {
            break;
          }
          pending += 1;
        }
        if (pending === 0) {
          return;
        }
        const source = this.sourceCanvas;
        const output = this.outputCanvas;
        const context = this.outputContext;
        const encoder = this.videoEncoder;
        if (!source || !output || !context || !encoder) {
          return;
        }
        const firstIndex = this.captureFrameIndex;
        const firstStamp = Math.round(firstIndex * 1e6 / this.fpsValue);
        const duration = Math.round(1e6 / this.fpsValue);
        let baseFrame = null;
        if (source.width === this.targetWidth && source.height === this.targetHeight) {
          try {
            baseFrame = new VideoFrame(source, { timestamp: firstStamp, duration });
          } catch {
            baseFrame = null;
          }
        }
        if (!baseFrame) {
          context.drawImage(source, 0, 0, output.width, output.height);
          try {
            baseFrame = new VideoFrame(output, { timestamp: firstStamp, duration });
          } catch {
            baseFrame = null;
          }
        }
        if (!baseFrame) {
          return;
        }
        try {
          for (let i = 0; i < pending; i += 1) {
            const index = firstIndex + i;
            const stamp = Math.round(index * 1e6 / this.fpsValue);
            const frame = i === 0 ? baseFrame : new VideoFrame(baseFrame, { timestamp: stamp, duration });
            try {
              const keyFrame = index % Math.max(1, Math.round(this.fpsValue * KEYFRAME_INTERVAL_SECONDS)) === 0;
              encoder.encode(frame, { keyFrame });
            } catch {
              this.failure = "\u89C6\u9891\u7F16\u7801\u5668\u5DF2\u5173\u95ED\u3002";
              break;
            } finally {
              if (i > 0) {
                frame.close();
              }
            }
            this.captureFrameIndex = index + 1;
            this.capturedFramesTotal = this.captureFrameIndex;
          }
        } finally {
          baseFrame.close();
        }
        if (pending >= MAX_CATCHUP_FRAMES) {
          this.captureClockStartMs = now - this.captureFrameIndex * this.frameIntervalMs;
        }
      }
      pause() {
        if (this.stateValue !== "recording") {
          return;
        }
        this.accumulatedMs += performance.now() - this.activeSinceMs;
        this.stateValue = "paused";
      }
      resume() {
        if (this.stateValue !== "paused") {
          return;
        }
        const now = performance.now();
        this.captureClockStartMs = now - this.captureFrameIndex * this.frameIntervalMs;
        this.activeSinceMs = now;
        this.stateValue = "recording";
      }
      async stop() {
        if (this.stateValue === "idle") {
          throw new Error("\u5F53\u524D\u6CA1\u6709\u5728\u5F55\u5236\u3002");
        }
        if (this.stateValue === "recording") {
          this.accumulatedMs += performance.now() - this.activeSinceMs;
        }
        const durationMs = this.accumulatedMs;
        const resolution = this.resolutionValue;
        const fps = this.fpsValue;
        this.stateValue = "idle";
        const videoEncoder = this.videoEncoder;
        const audioEncoder = this.audioEncoder;
        const muxer = this.muxer;
        const reader = this.audioReader;
        const pump = this.audioPump;
        this.videoEncoder = null;
        this.audioEncoder = null;
        this.muxer = null;
        this.audioReader = null;
        this.audioPump = null;
        try {
          if (reader) {
            try {
              await reader.cancel();
            } catch {
            }
          }
          if (pump) {
            await pump;
          }
          if (audioEncoder) {
            if (audioEncoder.state !== "closed") {
              await audioEncoder.flush();
              audioEncoder.close();
            }
          }
          if (videoEncoder) {
            if (videoEncoder.state !== "closed") {
              await videoEncoder.flush();
              videoEncoder.close();
            }
          }
          muxer?.finalize();
        } catch (error) {
          this.resetSession();
          throw new Error(error.message || "\u5F55\u5236\u6536\u5C3E\u5931\u8D25\u3002");
        }
        const failure = this.failure;
        this.resetSession();
        if (failure) {
          throw new Error(failure);
        }
        const buffer = muxer?.target.buffer;
        const bytes2 = buffer ? buffer.byteLength : 0;
        if (!bytes2) {
          throw new Error("\u5F55\u5236\u5931\u8D25\uFF1A\u6CA1\u6709\u5F97\u5230\u4EFB\u4F55\u89C6\u9891\u6570\u636E\u3002");
        }
        if (this.capturedFramesTotal < Math.max(2, fps / 10)) {
          throw new Error("\u5F55\u5236\u65F6\u95F4\u592A\u77ED\u4E86\uFF0C\u8BF7\u5F55\u5236 1 \u79D2\u4EE5\u4E0A\u3002");
        }
        return {
          blob: new Blob([buffer], { type: "video/mp4" }),
          extension: "mp4",
          durationMs,
          resolution,
          fps
        };
      }
      abort() {
        this.stateValue = "idle";
        void this.teardown();
        this.resetSession();
      }
      async teardown() {
        try {
          await this.audioReader?.cancel();
        } catch {
        }
        try {
          if (this.audioEncoder && this.audioEncoder.state !== "closed") {
            this.audioEncoder.close();
          }
        } catch {
        }
        try {
          if (this.videoEncoder && this.videoEncoder.state !== "closed") {
            this.videoEncoder.close();
          }
        } catch {
        }
      }
      resetSession() {
        this.sourceCanvas = null;
        this.outputCanvas = null;
        this.outputContext = null;
        this.captureFrameIndex = 0;
        this.accumulatedMs = 0;
        this.activeSinceMs = 0;
        this.audioOutUs = 0;
        this.failure = null;
        this.stateValue = "idle";
      }
    };
  }
});

// src/preview/perf.ts
function percentile(values, ratio) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * ratio)));
  return sorted[index];
}
function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function push(list, value) {
  list.push(value);
  if (list.length > MAX_SAMPLES) list.shift();
}
var MAX_SAMPLES, STUTTER_FRAME_MS, FrameProfiler;
var init_perf = __esm({
  "src/preview/perf.ts"() {
    "use strict";
    MAX_SAMPLES = 600;
    STUTTER_FRAME_MS = 20;
    FrameProfiler = class {
      constructor() {
        __publicField(this, "gl", null);
        __publicField(this, "timerExt", null);
        __publicField(this, "canvas", null);
        __publicField(this, "frameTimes", []);
        __publicField(this, "cpuTimes", []);
        __publicField(this, "gpuTimes", []);
        __publicField(this, "pending", []);
        __publicField(this, "freeQueries", []);
        __publicField(this, "lastFrameAt", 0);
        __publicField(this, "frames", 0);
        __publicField(this, "stutters", 0);
        __publicField(this, "activeQuery", null);
        __publicField(this, "glRenderer", "unknown");
      }
      /** 绑定画布并取回它已经在用的 WebGL2 上下文（同一个对象，不会重建）。 */
      attach(canvas2) {
        this.canvas = canvas2;
        const gl = canvas2.getContext("webgl2") ?? null;
        this.gl = gl;
        if (!gl) return;
        this.timerExt = gl.getExtension("EXT_disjoint_timer_query_webgl2");
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          const name = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          if (typeof name === "string") this.glRenderer = name;
        }
      }
      /** 每帧开头调用，参数是 rAF 的时间戳。 */
      onFrame(now) {
        if (this.lastFrameAt > 0) {
          const interval = now - this.lastFrameAt;
          if (interval > 0 && interval < 5e3) {
            push(this.frameTimes, interval);
            this.frames += 1;
            if (interval > STUTTER_FRAME_MS) this.stutters += 1;
          }
        }
        this.lastFrameAt = now;
        this.pollQueries();
      }
      /** 在这里面调用 `renderPlayerFrame()`：同时量 CPU 耗时并包一层 GPU 计时查询。 */
      timeRender(render) {
        const gl = this.gl;
        const ext = this.timerExt;
        let query = null;
        if (gl && ext) {
          query = this.freeQueries.pop() ?? gl.createQuery();
          if (query) {
            try {
              gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
              this.activeQuery = query;
            } catch {
              query = null;
              this.activeQuery = null;
            }
          }
        }
        const started = performance.now();
        try {
          render();
        } finally {
          const elapsed = performance.now() - started;
          push(this.cpuTimes, elapsed);
          if (gl && ext && query && this.activeQuery === query) {
            gl.endQuery(ext.TIME_ELAPSED_EXT);
            this.pending.push({ query, frame: this.frames });
            this.activeQuery = null;
          }
        }
      }
      /** 画布尺寸变化后调用，保证报告里的分辨率是最新的。 */
      noteViewport(dpr2) {
        if (this.canvas) this.canvas.dataset.perfDpr = String(dpr2);
      }
      reset() {
        this.frameTimes.length = 0;
        this.cpuTimes.length = 0;
        this.gpuTimes.length = 0;
        this.frames = 0;
        this.stutters = 0;
        this.lastFrameAt = 0;
      }
      snapshot() {
        const canvas2 = this.canvas;
        const dprValue = canvas2?.dataset.perfDpr;
        return {
          frames: this.frames,
          fps: this.frameTimes.length > 0 ? 1e3 / mean(this.frameTimes) : 0,
          frameP50: percentile(this.frameTimes, 0.5),
          frameP95: percentile(this.frameTimes, 0.95),
          frameMax: this.frameTimes.length > 0 ? Math.max(...this.frameTimes) : 0,
          stutters: this.stutters,
          cpuP50: percentile(this.cpuTimes, 0.5),
          cpuP95: percentile(this.cpuTimes, 0.95),
          gpuP50: this.gpuTimes.length > 0 ? percentile(this.gpuTimes, 0.5) : null,
          gpuP95: this.gpuTimes.length > 0 ? percentile(this.gpuTimes, 0.95) : null,
          gpuSamples: this.gpuTimes.length,
          width: canvas2?.width ?? 0,
          height: canvas2?.height ?? 0,
          dpr: dprValue ? Number(dprValue) : Number(window.devicePixelRatio || 1),
          glRenderer: this.glRenderer
        };
      }
      /** 诊断面板上的一行文字。 */
      describe() {
        const snap = this.snapshot();
        if (snap.frames === 0) return "\u6027\u80FD      \u7B49\u5F85\u91C7\u6837\u2026";
        const gpu = snap.gpuP50 === null ? " GPU \u8BA1\u65F6\u4E0D\u53EF\u7528" : ` GPU p50 ${snap.gpuP50.toFixed(2)} / p95 ${snap.gpuP95.toFixed(2)} ms\uFF08${snap.gpuSamples} \u5E27\uFF09`;
        return `\u6027\u80FD      ${snap.fps.toFixed(1)} fps \xB7 \u5E27\u95F4\u9694 p50 ${snap.frameP50.toFixed(1)} / p95 ${snap.frameP95.toFixed(1)} / max ${snap.frameMax.toFixed(1)} ms \xB7 \u5361\u987F ${snap.stutters}
          CPU \u63D0\u4EA4 p50 ${snap.cpuP50.toFixed(2)} / p95 ${snap.cpuP95.toFixed(2)} ms${gpu}
          \u753B\u5E03 ${snap.width}\xD7${snap.height} @${snap.dpr} \xB7 ${snap.glRenderer}`;
      }
      pollQueries() {
        const gl = this.gl;
        const ext = this.timerExt;
        if (!gl || !ext) return;
        const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
        for (let i = this.pending.length - 1; i >= 0; i -= 1) {
          const item = this.pending[i];
          const available = gl.getQueryParameter(item.query, gl.QUERY_RESULT_AVAILABLE);
          if (!available) continue;
          const elapsedNs = gl.getQueryParameter(item.query, gl.QUERY_RESULT);
          this.pending.splice(i, 1);
          this.freeQueries.push(item.query);
          if (disjoint) continue;
          const ms = elapsedNs / 1e6;
          if (ms > 0 && ms < 1e3) push(this.gpuTimes, ms);
        }
      }
    };
  }
});

// src/preview/mount.ts
var mount_exports = {};
__export(mount_exports, {
  mountPreview: () => mountPreview,
  pausePreview: () => pausePreview
});
function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}
function clearSession() {
  sessionMeta = {};
  sessionBgm = null;
  sessionCover = null;
}
async function loadBytes(bytes2, name) {
  let decoded;
  try {
    decoded = await decodeChartSource({ bytes: bytes2, name });
  } catch (error) {
    notify(`\u89E3\u6790\u5931\u8D25\uFF1A${name} \u2014 ${error.message}`);
    return;
  }
  if (decoded.format === "sus") {
    notify(`\u6682\u4E0D\u652F\u6301 SUS\uFF1A${name}\uFF08\u8BF7\u5BFC\u5165 USC \u6216 LevelData\uFF09`);
    return;
  }
  if (decoded.format === "custom-score-json") {
    notify(`\u6682\u4E0D\u652F\u6301\u81EA\u5236\u8C31 JSON\uFF1A${name}\uFF08\u8BF7\u5BFC\u5165 USC \u6216 LevelData\uFF09`);
    return;
  }
  load(decoded.text, name, decoded.format);
}
function load(text, label, format) {
  const started = performance.now();
  const resolved = format === "usc" || format === void 0 && looksLikeUsc(text) ? "usc" : "level-data";
  try {
    if (resolved === "usc") {
      usc = parseUscChart(text);
      chart = usc.chart;
      sourceKind = "usc";
    } else {
      usc = null;
      chart = parseLevelData(text);
      sourceKind = "leveldata";
    }
  } catch (error) {
    notify(`\u89E3\u6790\u5931\u8D25\uFF1A${label} \u2014 ${error.message}`);
    return;
  }
  try {
    stage?.pause();
  } catch {
  }
  wasmBroken = false;
  const elapsed = performance.now() - started;
  if (!field) {
    field = new Playfield(canvas, chart, skin);
    field.onTick = (time) => {
      advanceHits(time);
      if (recorder.state === "recording") recorder.capture();
      syncTransport(time);
      renderDebug(time);
    };
  } else {
    field.setChart(chart);
  }
  field.setOptions({
    mirror: $("#mirror").checked,
    showSimLines: $("#sim").checked
  });
  parity = runParity(chart);
  rebuildHits();
  resize();
  timeline.max = String(chart.duration);
  timeline.value = "0";
  renderChecks();
  renderChartInfo();
  renderDebug(0);
  syncTransport(0);
  syncNoteColorAvailability();
  $("#chip-notes").textContent = "\u2014";
  $("#chip-duration").textContent = formatTime(chart.duration);
  $("#chip-groups").textContent = String(chart.groups.length);
  const formatLabel = sourceKind === "usc" ? "USC" : "LevelData";
  notify(`${label} \xB7 ${formatLabel} \xB7 ${chart.notes.length} \u97F3\u7B26 \xB7 \u89E3\u6790 ${elapsed.toFixed(0)} ms`);
  lastText = text;
  lastLabel = label;
  if (mode === "wasm") void mountWasm();
}
function renderChartInfo() {
  if (!chart) return;
  const rows = [
    ["\u683C\u5F0F", sourceKind === "usc" ? "USC" : "LevelData"],
    ["\u97F3\u7B26", String(chart.notes.length)],
    ["\u957F\u6761", String(chart.holds.length)],
    ["\u8FDE\u7EBF", String(chart.simLines.length)],
    ["\u65F6\u5E8F\u7EC4", String(chart.groups.length)],
    ["\u521D\u59CB BPM", chart.tempo.bpmAtTime(0).toFixed(2)],
    ["\u65F6\u957F", `${chart.duration.toFixed(2)} s`],
    ["\u544A\u8B66", chart.warnings.length === 0 ? "\u65E0" : String(chart.warnings.length)]
  ];
  if (usc) {
    rows.push(["USC \u5355\u952E", String(usc.stats.singles)]);
    rows.push(["USC \u6ED1\u6761", String(usc.stats.slides)]);
    rows.push(["USC \u5F15\u5BFC", String(usc.stats.guides)]);
    rows.push(["marker", String(usc.stats.markers)]);
  }
  chartInfo.innerHTML = rows.map(([key, value]) => `<dt>${key}</dt><dd>${value}</dd>`).join("");
}
function renderChecks() {
  const failed = parity.filter((check) => !check.ok).length;
  checksEl.innerHTML = parity.map(
    (check) => `<li class="${check.ok ? "ok" : "bad"}"><b>${check.ok ? "PASS" : "FAIL"}</b>${check.name} \u2014 ${check.detail}</li>`
  ).join("");
  if (failed > 0) notify(`${failed} \u9879\u81EA\u68C0\u5931\u8D25\uFF0C\u89C1\u300C\u8BCA\u65AD / \u81EA\u68C0\u300D`);
}
function renderDebug(time) {
  if (!chart) return;
  const lines = [];
  lines.push(`chart time   ${time.toFixed(3)} s`);
  lines.push(`bpm          ${chart.tempo.bpmAtTime(time).toFixed(2)}`);
  for (let index = 0; index < chart.groups.length; index += 1) {
    const track = chart.groups[index].track;
    lines.push(
      `group ${index}      clock ${track.positionAt(time).toFixed(3)} s   speed ${track.speedAt(time).toFixed(3)}\xD7   markers ${track.markers.length}`
    );
  }
  if (chart.groups[0]) lines.push(`detail       ${describeGroup(chart, 0)}`);
  if (bridge) {
    lines.push(
      `bridge       ${bridge.stats.groups} \u5C42 / ${bridge.stats.keys} \u5173\u952E\u5E27 / \u503C\u57DF ${bridge.stats.minValue.toFixed(1)} .. ${bridge.stats.maxValue.toFixed(1)}`
    );
  }
  debug.textContent = lines.join("\n");
  hud.innerHTML = [
    `<span class="hud-pill">${formatTime(time)}</span>`,
    `<span class="hud-pill">${chart.tempo.bpmAtTime(time).toFixed(1)} BPM</span>`,
    `<span class="hud-pill">groups ${chart.groups.length}</span>`
  ].join("");
}
function rebuildHits() {
  if (!chart) return;
  hitNotes = chart.notes.filter((note) => note.kind === "tap" || note.kind === "flick" || note.kind === "trace" || note.kind === "holdHead").filter((note) => !note.damage).map((note) => ({
    time: note.time,
    kind: note.kind === "flick" ? "flick" : note.kind === "trace" ? "trace" : note.critical ? "critical" : "tap"
  })).sort((a, b) => a.time - b.time);
  hitCursor = 0;
}
function advanceHits(time) {
  if (time < lastTick) {
    hitCursor = hitNotes.findIndex((note) => note.time >= time);
    if (hitCursor < 0) hitCursor = hitNotes.length;
  } else {
    while (hitCursor < hitNotes.length && hitNotes[hitCursor].time <= time) {
      hitSound.play(hitNotes[hitCursor].kind);
      pulse = 1;
      hitCursor += 1;
    }
  }
  lastTick = time;
  pulse = Math.max(0, pulse - 0.08);
  field?.setPulse(pulse);
}
function stageSize() {
  return { width: 1400, height: 788 };
}
function readStageConfig() {
  const num = (id) => Number($(id).value);
  const on = (id) => $(id).checked;
  return {
    ...DEFAULT_STAGE_CONFIG,
    mirror: on("#mirror"),
    simultaneousLine: on("#sim"),
    // 低特效 = 高档位以外的精简档（旧版 applyLowEffects：enabled → effectProfile 1）
    effectProfile: on("#low-effects") ? 1 : 0,
    noteSkin: Number($("#note-skin").value),
    noteColor: Number($("#note-color").value),
    specialNoteColors: sourceKind === "leveldata",
    noteSpeed: noteSpeedValue,
    holdAlpha: num("#hold-alpha") / 100,
    guideAlpha: num("#guide-alpha") / 100,
    backgroundBrightness: num("#bg-brightness") / 100,
    stageCover: num("#stage-cover") / 100,
    effectOpacity: 1,
    damageSound: on("#damage-sound")
  };
}
function applyStageConfig() {
  if (!stage) return;
  try {
    stage.setConfig(readStageConfig());
    stage.setVolumes(bgmVolume, seVolume);
  } catch (error) {
    console.warn("[stage] \u914D\u7F6E\u4E0B\u53D1\u5931\u8D25", error);
    return;
  }
  renderStageOnce();
}
function renderStageOnce() {
  if (!stage || mode !== "wasm" || wasmBusy || wasmBroken) return;
  if (recorder.state === "recording") return;
  const snap = stage.snapshot();
  if (snap.transportState === "playing" || snap.transportState === "loading") return;
  try {
    stage.render();
  } catch (error) {
    console.warn("[stage] \u5355\u5E27\u91CD\u7ED8\u5931\u8D25", error);
  }
}
async function ensureStage() {
  if (stage) return;
  stage = new WasmStage();
  globalThis.__stage = stage;
  profiler.attach(wasmCanvas);
  globalThis.__pvPerf = () => profiler.snapshot();
  globalThis.__pvPerfReset = () => profiler.reset();
  globalThis.__pvCppTimings = () => ({
    phase: stage?.framePhaseTimings() ?? "",
    player: stage?.playerFrameTimings() ?? ""
  });
  const { width, height } = measureStage();
  await stage.init(wasmCanvas, width, height, renderScale());
  if (!manifest) {
    const response = await fetch("./vendor/manifest.json");
    if (!response.ok) {
      throw new Error("\u7F3A\u5C11 vendor/manifest.json\uFF08\u5148\u8DD1 node scripts/sync-renderer.mjs\uFF09");
    }
    manifest = await response.json();
  }
  const result = await stage.preload(manifest, (done, total) => {
    rendererState.textContent = `\u8D44\u6E90 ${Math.round(done / total * 100)}%`;
  });
  if (result.failed.length > 0) {
    console.warn("[stage] \u8D44\u6E90\u672A\u8F7D\u5165", result.failed);
    notify(`${result.failed.length} \u4E2A\u8D44\u6E90\u672A\u8F7D\u5165\uFF08\u8BE6\u89C1\u63A7\u5236\u53F0\uFF09`);
  }
}
async function mountWasm(seekTo) {
  if (!chart || !lastText) return;
  if (wasmBusy) {
    pendingRemount = true;
    return;
  }
  wasmBusy = true;
  try {
    rendererState.textContent = "\u521D\u59CB\u5316\u2026";
    prewarmCodecsRecording();
    await ensureStage();
    bridge = usc ? bridgeFromDocument(usc.document, chart) : buildCustomScore(lastText, chart);
    if (bridge.warnings.length > 0) console.warn("[bridge]", bridge.warnings);
    const offsetMs = Math.round(sessionMeta.offsetMs ?? 0);
    await stage.loadScore(bridge.scoreText, {
      // 与旧版一致：实际 lead-in = max(谱面 offset, 9s)，开场动画在这段时间里播放。
      leadInMs: Math.max(offsetMs, LEAD_IN_MS),
      offsetMs,
      title: sessionMeta.title ?? lastLabel,
      lyricist: sessionMeta.lyricist ?? void 0,
      composer: sessionMeta.composer ?? void 0,
      arranger: sessionMeta.arranger ?? void 0,
      vocal: sessionMeta.vocal ?? void 0,
      difficulty: difficultyName(sessionMeta.difficulty) ?? void 0,
      customScoreInfo: sessionMeta.customScoreInfo !== false,
      scoreTitle: sessionMeta.scoreTitle ?? void 0,
      scoreCreator: sessionMeta.scoreCreator ?? void 0,
      bgm: sessionBgm,
      cover: sessionCover
    });
    applyStageConfig();
    $("#chip-notes").textContent = String(stage.comboEventCount());
    stage.seek(seekTo ?? 0);
    stage.render();
    rendererState.textContent = `\u5C31\u7EEA \xB7 ${bridge.stats.keys} \u5173\u952E\u5E27`;
    const snap = stage.snapshot();
    syncTransport(snap.currentTimeSec);
    updateRecordingUi();
    startWasmLoop();
  } catch (error) {
    wasmBroken = true;
    rendererState.textContent = "\u4E0D\u53EF\u7528";
    notify(`wasm \u6E32\u67D3\u5668\u4E0D\u53EF\u7528\uFF0C\u5DF2\u56DE\u9000\u5230\u53C2\u8003\u5B9E\u73B0\uFF1A${error.message}`);
    console.error(error);
    rendererSelect.value = "reference";
    setMode("reference");
  } finally {
    wasmBusy = false;
    if (pendingRemount) {
      pendingRemount = false;
      void mountWasm();
    }
  }
}
function startWasmLoop() {
  if (wasmFrame) return;
  let lastDebugAt = 0;
  let lastTransport = "";
  const step = (now) => {
    if (mode !== "wasm" || !stage) {
      wasmFrame = 0;
      return;
    }
    const snap = stage.snapshot();
    const animating = snap.transportState === "playing" || snap.transportState === "loading";
    const stateChanged = snap.transportState !== lastTransport;
    lastTransport = snap.transportState;
    if (animating || stateChanged || recorder.state === "recording") {
      profiler.onFrame(now);
      profiler.timeRender(() => stage.render());
      if (recorder.state === "recording") recorder.capture();
      syncTransport(snap.currentTimeSec);
    }
    if (now - lastDebugAt > 120) {
      lastDebugAt = now;
      renderDebug(Math.max(0, snap.currentTimeSec - snap.effectiveLeadInSec));
      if (perfReadout) {
        const cppPhase = stage.framePhaseTimings();
        const cppPlayer = stage.playerFrameTimings();
        perfReadout.textContent = `${profiler.describe()}
          C++ \u9636\u6BB5 ${cppPhase}
          C++ \u63D0\u4EA4 ${cppPlayer}`;
      }
    }
    wasmFrame = requestAnimationFrame(step);
  };
  wasmFrame = requestAnimationFrame(step);
}
function stopWasmLoop() {
  if (wasmFrame) cancelAnimationFrame(wasmFrame);
  wasmFrame = 0;
}
function currentTime() {
  if (mode === "wasm" && stage) return stage.snapshot().currentTimeSec;
  return field?.currentTime ?? 0;
}
function setMode(next) {
  const raw = currentTime();
  const leadIn = mode === "wasm" && stage ? stage.snapshot().effectiveLeadInSec : LEAD_IN_MS / 1e3;
  const chartTime = Math.max(0, raw - leadIn);
  mode = next;
  stageArea.dataset.renderer = next;
  lastTick = chartTime;
  if (next === "wasm") {
    if (wasmBroken) {
      notify("wasm \u6E32\u67D3\u5668\u521D\u59CB\u5316\u5931\u8D25\u8FC7\uFF0C\u5148\u4FEE\u597D vendor/ \u518D\u5207\u56DE");
      return;
    }
    void mountWasm(chartTime + leadIn).then(() => syncTransport(chartTime + leadIn));
    return;
  }
  stopWasmLoop();
  field?.seek(chartTime);
  field?.render();
  renderDebug(chartTime);
  syncTransport(chartTime);
}
function syncTransport(time) {
  const duration = mode === "wasm" && stage ? stage.snapshot().durationSec : field?.duration ?? 0;
  if (Number(timeline.max) !== duration) timeline.max = String(duration);
  if (!timelineDragging) timeline.value = String(time);
  const nowAt = performance.now();
  const timeText = formatTime(time);
  if (timeText !== lastSyncedTimeText && nowAt - lastTimeTextAt > 33) {
    lastSyncedTimeText = timeText;
    lastTimeTextAt = nowAt;
    $("#time-now").textContent = timeText;
  }
  const totalText = formatTime(duration);
  if (totalText !== lastSyncedTotalText) {
    lastSyncedTotalText = totalText;
    $("#time-total").textContent = totalText;
  }
  const playing = isPlaying();
  if (playing !== lastSyncedPlaying) {
    lastSyncedPlaying = playing;
    playButton.textContent = playing ? "\u275A\u275A" : "\u25B6";
    playButton.setAttribute("aria-label", playing ? "\u6682\u505C" : "\u64AD\u653E");
    $("#live-dot").classList.toggle("live", playing);
  }
}
function isPlaying() {
  if (mode === "wasm" && stage) return stage.snapshot().transportState === "playing";
  return Boolean(field?.isPlaying);
}
function showUnlockLayer() {
  unlockLayer.hidden = false;
}
function hideUnlockLayer() {
  unlockLayer.hidden = true;
}
async function ensureAudioRunning() {
  const context = stage?.getAudioContext() ?? null;
  if (!context) return true;
  if (context.state === "running") return true;
  const resumed = context.resume().then(() => context.state === "running").catch(() => false);
  const timeout = new Promise((resolve) => {
    window.setTimeout(() => resolve(context.state === "running"), 600);
  });
  return Promise.race([resumed, timeout]);
}
function requestPlay() {
  if (!stage) return;
  void ensureAudioRunning().then((running) => {
    if (!running) {
      showUnlockLayer();
      return;
    }
    const attempt = stage.play().catch(() => false);
    const timeout = new Promise((resolve) => {
      window.setTimeout(() => resolve("timeout"), 3e3);
    });
    void Promise.race([attempt, timeout]).then((result) => {
      startWasmLoop();
      if (result === true) {
        audioUnlocked = true;
        hideUnlockLayer();
      } else if (result === false || result === "timeout") {
        showUnlockLayer();
      }
      syncTransport(stage.snapshot().currentTimeSec);
    });
  });
}
async function unlockAndPlay() {
  if (!stage) return;
  const running = await ensureAudioRunning();
  if (!running) {
    notify("\u97F3\u9891\u4ECD\u88AB\u6D4F\u89C8\u5668\u62E6\u622A\uFF1A\u8BF7\u5728\u9875\u9762\u4E0A\u70B9\u4E00\u4E0B\u518D\u8BD5");
    return;
  }
  const ok = await stage.play();
  if (ok) {
    audioUnlocked = true;
    hideUnlockLayer();
    startWasmLoop();
  } else {
    notify("\u97F3\u9891\u4ECD\u88AB\u6D4F\u89C8\u5668\u62E6\u622A\uFF1A\u70B9\u4E00\u4E0B\u753B\u9762\u518D\u8BD5\u4E00\u6B21");
  }
  syncTransport(stage.snapshot().currentTimeSec);
}
function unlockAudioOnGesture() {
  if (audioUnlocked || !stage || mode !== "wasm") return;
  void ensureAudioRunning().then((ok) => {
    if (ok) audioUnlocked = true;
  });
}
function updateNoteSpeed(value) {
  noteSpeedValue = Math.min(16, Math.max(1, Math.round(value * 10) / 10));
  $("#note-speed-out").textContent = noteSpeedValue.toFixed(1);
  setNoteSpeed(noteSpeedValue);
  field?.render();
  applyStageConfig();
}
function bindStageSlider(id, output) {
  const input = $(id);
  const sync = () => {
    $(output).textContent = `${input.value}%`;
    applyStageConfig();
  };
  input.addEventListener("input", sync);
}
function syncNoteColorAvailability() {
  const allowed = sourceKind === "leveldata";
  const select = $("#note-color");
  select.disabled = !allowed;
  const label = select.closest("label.compact-select");
  label?.classList.toggle("is-disabled", !allowed);
  if (label instanceof HTMLElement) {
    label.title = allowed ? "\u9ED8\u8BA4\u6309\u97F3\u7B26\u7C7B\u578B\u4E0A\u8272\uFF08\u5E76\u8DDF\u968F LevelData \u7684\u9010\u97F3\u7B26\u989C\u8272\uFF09\uFF1B\u5176\u4F59\u9009\u9879\u5F3A\u5236\u5355\u4E00\u989C\u8272\u3002" : "\u7279\u6B8A\u989C\u8272\u53D8\u4F53\u4EC5\u5728\u8BFB\u53D6 LevelData \u8C31\u9762\u65F6\u751F\u6548\u3002";
  }
}
function formatRecordingClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1e3));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
function setRecordingStatus(message, tone = "info") {
  recStatus.textContent = message;
  recStatus.dataset.tone = message && tone === "error" ? "error" : "";
}
function updateRecordingUi() {
  const state = recorder.state;
  const busy = recordingStartPending || recordingSavePending;
  recResolution.disabled = state !== "idle" || busy;
  recFps.disabled = state !== "idle" || busy;
  rendererSelect.disabled = state !== "idle" || busy;
  recStartButton.disabled = state !== "idle" || busy || !stage;
  recPauseButton.disabled = state === "idle" || busy;
  recPauseButton.textContent = state === "paused" ? "\u7EE7\u7EED" : "\u6682\u505C";
  recStopButton.disabled = state === "idle" || busy;
  if (recordingTimer) {
    window.clearInterval(recordingTimer);
    recordingTimer = 0;
  }
  if (state === "recording") {
    recElapsed.textContent = formatRecordingClock(recorder.elapsedMs);
    recordingTimer = window.setInterval(() => {
      recElapsed.textContent = formatRecordingClock(recorder.elapsedMs);
    }, 250);
  }
}
function applyRenderTarget(width, height) {
  if (mode === "wasm" && stage) {
    stage.resize(width, height, 1);
    stage.render();
    return;
  }
  field?.resize(width, height, 1);
  field?.render();
}
async function startRecording() {
  if (recordingStartPending || recordingSavePending || recorder.state !== "idle") return;
  if (!stage) {
    setRecordingStatus("\u8BF7\u5148\u8F7D\u5165\u8C31\u9762\u518D\u5F00\u59CB\u5F55\u5236\u3002", "error");
    return;
  }
  if (!isCodecsRecordingSupported() && !isRecordingSupported()) {
    setRecordingStatus("\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u5F55\u5236\uFF08\u9700\u8981 WebCodecs \u6216 MediaRecorder\uFF09\u3002", "error");
    return;
  }
  const resolution = recResolution.value === "1080" ? 1080 : 720;
  const fps = recFps.value === "30" ? 30 : DEFAULT_RECORDING_FPS;
  const target = RECORDING_TARGETS[resolution];
  recordingStartPending = true;
  updateRecordingUi();
  try {
    setRecordingStatus("\u6B63\u5728\u51C6\u5907\u5F55\u5236\u2026");
    applyRenderTarget(target.width, target.height);
    const audioContext = stage.getAudioContext();
    if (audioContext && audioContext.state === "suspended") {
      try {
        await audioContext.resume();
      } catch {
      }
    }
    await recorder.start({
      resolution,
      fps,
      canvas: mode === "wasm" ? wasmCanvas : canvas,
      audioContext
    });
    setRecordingStatus(`\u6B63\u5728\u5F55\u5236 ${target.label} ${fps} fps\uFF08${target.width}\xD7${target.height}\uFF09`);
  } catch (error) {
    setRecordingStatus(error.message || "\u65E0\u6CD5\u5F00\u59CB\u5F55\u5236\u3002", "error");
    resize();
  } finally {
    recordingStartPending = false;
    updateRecordingUi();
  }
}
function toggleRecordingPause() {
  if (recorder.state === "recording") {
    recorder.pause();
    setRecordingStatus("\u5DF2\u6682\u505C\u5F55\u5236");
  } else if (recorder.state === "paused") {
    recorder.resume();
    setRecordingStatus("\u7EE7\u7EED\u5F55\u5236");
  }
  updateRecordingUi();
}
async function stopRecording() {
  if (recorder.state === "idle") return;
  recordingSavePending = true;
  updateRecordingUi();
  try {
    const result = await recorder.stop();
    const saved = await saveRecording(result);
    const megabytes = Math.max(0.1, Math.round(saved.bytes / 1024 / 1024 * 10) / 10);
    setRecordingStatus(`\u5DF2\u4FDD\u5B58 ${saved.fileName}\uFF08${megabytes} MB\uFF0C${result.fps} fps\uFF09`);
  } catch (error) {
    setRecordingStatus(error.message || "\u5F55\u5236\u5931\u8D25\u3002", "error");
  } finally {
    recordingSavePending = false;
    resize();
    updateRecordingUi();
  }
}
function measureStage() {
  const rect = stageArea.getBoundingClientRect();
  if (rect.width >= 2 && rect.height >= 2) {
    return { width: Math.floor(rect.width), height: Math.floor(rect.height) };
  }
  return stageSize();
}
function resize() {
  const { width, height } = measureStage();
  field?.resize(width, height, renderScale());
  if (stage) {
    stage.resize(width, height, renderScale());
    if (mode === "wasm") stage.render();
  }
}
async function fetchLevelData(url2) {
  try {
    const response = await fetch(url2);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    clearSession();
    await loadBytes(new Uint8Array(await response.arrayBuffer()), url2.split("/").pop() ?? url2);
  } catch (error) {
    notify(`\u8F7D\u5165\u5931\u8D25\uFF1A${error.message}`);
  }
}
async function bootOnce() {
  stageArea.dataset.renderer = mode;
  try {
    skin = await Skin.load();
    field?.setSkin(skin);
  } catch {
    notify("\u672A\u627E\u5230 assets/\uFF0C\u5148\u8FD0\u884C node scripts/fetch-assets.mjs\uFF08\u5DF2\u56DE\u9000\u51E0\u4F55\u6E32\u67D3\uFF09");
  }
  try {
    await hitSound.load();
    hitSound.setVolume(seVolume);
  } catch {
    notify("\u6253\u51FB\u97F3\u8F7D\u5165\u5931\u8D25\uFF0C\u4EC5\u753B\u9762");
  }
  resize();
  updateRecordingUi();
}
function currentSource() {
  const fromUrl = new URLSearchParams(location.search).get("src");
  if (fromUrl) {
    if (fromUrl !== sampleSelect.value) {
      sampleSelect.insertAdjacentHTML("afterbegin", `<option value="${fromUrl}">${fromUrl}</option>`);
      sampleSelect.value = fromUrl;
    }
    return fromUrl;
  }
  return sampleSelect.value;
}
function renderSessionMeta() {
  if (!chart) return;
  const rows = [];
  const push2 = (label, value) => {
    if (value && value.trim() !== "") rows.push([label, value.trim()]);
  };
  push2("\u66F2\u540D", sessionMeta.title);
  push2("\u4F5C\u8BCD", sessionMeta.lyricist);
  push2("\u4F5C\u66F2", sessionMeta.composer);
  push2("\u7F16\u66F2", sessionMeta.arranger);
  push2("\u6F14\u5531", sessionMeta.vocal);
  push2("\u96BE\u5EA6", difficultyName(sessionMeta.difficulty));
  push2("\u8C31\u9762\u6807\u9898", sessionMeta.scoreTitle);
  push2("\u8C31\u9762\u4F5C\u8005", sessionMeta.scoreCreator);
  rows.push(["BGM", sessionBgm ? `${Math.round(sessionBgm.byteLength / 1024)} KB` : "\u65E0"]);
  rows.push(["\u66F2\u7ED8", sessionCover ? "\u5DF2\u8F7D\u5165" : "\u65E0"]);
  if (rows.length === 0) return;
  chartInfo.insertAdjacentHTML(
    "beforeend",
    rows.map(([key, value]) => `<dt>${key}</dt><dd>${value}</dd>`).join("")
  );
}
function difficultyName(value) {
  const names = ["EASY", "NORMAL", "HARD", "EXPERT", "MASTER", "APPEND"];
  if (value === null || value === void 0 || value === "") return null;
  const index = Number(value);
  return Number.isInteger(index) && names[index] ? names[index] : String(value);
}
async function applyPayload(payload) {
  sessionMeta = {
    offsetMs: payload.offsetMs ?? null,
    difficulty: payload.difficulty ?? null,
    title: payload.title,
    lyricist: payload.lyricist,
    composer: payload.composer,
    arranger: payload.arranger,
    vocal: payload.vocal,
    scoreTitle: payload.scoreTitle,
    scoreCreator: payload.scoreCreator,
    customScoreInfo: payload.customScoreInfo
  };
  sessionBgm = payload.bgmFile ? new Uint8Array(await payload.bgmFile.arrayBuffer()) : null;
  sessionCover = payload.coverFile ? new Uint8Array(await payload.coverFile.arrayBuffer()) : null;
  await loadBytes(new Uint8Array(await payload.file.arrayBuffer()), payload.file.name);
  renderSessionMeta();
}
async function mountPreview(payload) {
  if (!booted) {
    booted = true;
    booting = bootOnce();
  }
  await booting;
  resize();
  if (payload) {
    await applyPayload(payload);
    return;
  }
  if (!chart) {
    const params = new URLSearchParams(location.search);
    const remoteBgm = params.get("bgm");
    const remoteCover = params.get("cover");
    if (remoteBgm && remoteBgm !== "none") {
      try {
        const response = await fetch(remoteBgm);
        if (response.ok) sessionBgm = new Uint8Array(await response.arrayBuffer());
      } catch {
      }
    }
    if (remoteCover && remoteCover !== "none") {
      try {
        const response = await fetch(remoteCover);
        if (response.ok) sessionCover = new Uint8Array(await response.arrayBuffer());
      } catch {
      }
    }
    await fetchLevelData(currentSource());
    renderSessionMeta();
  }
}
function pausePreview() {
  recorder.abort();
  stopWasmLoop();
  try {
    stage?.pause();
  } catch {
  }
  field?.pause();
}
var $, canvas, wasmCanvas, stageArea, rendererSelect, rendererState, timeline, playButton, rateSelect, fileInput, dropZone, sampleSelect, toast, debug, perfReadout, profiler, checksEl, hud, chartInfo, diagToggle, diag, unlockLayer, unlockButton, recResolution, recFps, recStartButton, recPauseButton, recStopButton, recElapsed, recStatus, chart, field, skin, parity, mode, stage, manifest, bridge, lastText, lastLabel, sourceKind, usc, wasmFrame, wasmBusy, pendingRemount, audioUnlocked, sessionMeta, sessionBgm, sessionCover, booted, booting, wasmBroken, hitSound, recorder, recordingStartPending, recordingSavePending, recordingTimer, hitNotes, hitCursor, pulse, lastTick, noteSpeedValue, bgmVolume, seVolume, lowResolution, toastTimer, formatTime, LEAD_IN_MS, dpr, renderScale, timelineDragging, lastSyncedTimeText, lastSyncedTotalText, lastSyncedPlaying, lastTimeTextAt;
var init_mount = __esm({
  "src/preview/mount.ts"() {
    "use strict";
    init_leveldata();
    init_checks();
    init_hit();
    init_skin();
    init_playfield();
    init_layout();
    init_wasmStage();
    init_customScore2();
    init_usc();
    init_chartSource();
    init_recorder();
    init_codecsRecorder();
    init_perf();
    $ = (selector) => document.querySelector(selector);
    canvas = $("#stage");
    wasmCanvas = $("#stage-wasm");
    stageArea = $("#stage-area");
    rendererSelect = $("#renderer");
    rendererState = $("#renderer-state");
    timeline = $("#timeline");
    playButton = $("#play");
    rateSelect = $("#rate");
    fileInput = $("#file");
    dropZone = $("#drop-zone");
    sampleSelect = $("#sample");
    toast = $("#toast");
    debug = $("#debug");
    perfReadout = document.querySelector("#perf-readout");
    profiler = new FrameProfiler();
    checksEl = $("#checks");
    hud = $("#hud");
    chartInfo = $("#chart-info");
    diagToggle = $("#diag-toggle");
    diag = $("#diag");
    unlockLayer = $("#unlock-layer");
    unlockButton = $("#unlock-button");
    recResolution = $("#rec-resolution");
    recFps = $("#rec-fps");
    recStartButton = $("#rec-start");
    recPauseButton = $("#rec-pause");
    recStopButton = $("#rec-stop");
    recElapsed = $("#rec-elapsed");
    recStatus = $("#rec-status");
    chart = null;
    field = null;
    skin = null;
    parity = [];
    mode = "wasm";
    stage = null;
    manifest = null;
    bridge = null;
    lastText = "";
    lastLabel = "";
    sourceKind = "leveldata";
    usc = null;
    wasmFrame = 0;
    wasmBusy = false;
    pendingRemount = false;
    audioUnlocked = false;
    sessionMeta = {};
    sessionBgm = null;
    sessionCover = null;
    booted = false;
    booting = null;
    wasmBroken = false;
    hitSound = new HitSound();
    recorder = isCodecsRecordingSupported() ? new CodecsPreviewRecorder() : new PreviewRecorder();
    recordingStartPending = false;
    recordingSavePending = false;
    recordingTimer = 0;
    hitNotes = [];
    hitCursor = 0;
    pulse = 0;
    lastTick = 0;
    noteSpeedValue = 10.5;
    bgmVolume = 1;
    seVolume = 1;
    lowResolution = false;
    toastTimer = 0;
    formatTime = (seconds) => {
      const total = Math.max(0, seconds);
      const minutes = Math.floor(total / 60);
      const rest = total - minutes * 60;
      return `${String(minutes).padStart(2, "0")}:${rest.toFixed(3).padStart(6, "0")}`;
    };
    LEAD_IN_MS = 9e3;
    dpr = () => Math.min(2, window.devicePixelRatio || 1);
    renderScale = () => dpr() * (lowResolution ? 0.5 : 1);
    rendererSelect.addEventListener("change", () => {
      setMode(rendererSelect.value === "reference" ? "reference" : "wasm");
    });
    diagToggle.addEventListener("click", () => {
      diag.hidden = !diag.hidden;
      diagToggle.classList.toggle("active", !diag.hidden);
      if (!diag.hidden) diag.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    timelineDragging = false;
    lastSyncedTimeText = "";
    lastSyncedTotalText = "";
    lastSyncedPlaying = null;
    lastTimeTextAt = 0;
    unlockButton.addEventListener("click", () => {
      void unlockAndPlay();
    });
    document.addEventListener("pointerdown", unlockAudioOnGesture, true);
    document.addEventListener("keydown", unlockAudioOnGesture, true);
    playButton.addEventListener("click", () => {
      if (mode === "wasm") {
        if (!stage) return;
        const snap = stage.snapshot();
        if (snap.transportState === "playing") {
          stage.pause();
          syncTransport(stage.snapshot().currentTimeSec);
        } else {
          if (snap.durationSec > 0 && snap.currentTimeSec >= snap.durationSec - 0.01) {
            stage.seek(0);
            stage.render();
          }
          requestPlay();
          startWasmLoop();
        }
        return;
      }
      if (!field) return;
      void hitSound.unlock();
      if (field.isPlaying) {
        field.pause();
      } else {
        if (field.currentTime >= field.duration) field.seek(0);
        field.play();
      }
      syncTransport(field.currentTime);
    });
    timeline.addEventListener("pointerdown", () => {
      timelineDragging = true;
    });
    timeline.addEventListener("pointerup", () => {
      timelineDragging = false;
    });
    timeline.addEventListener("pointercancel", () => {
      timelineDragging = false;
    });
    timeline.addEventListener("blur", () => {
      timelineDragging = false;
    });
    window.addEventListener("pointerup", () => {
      timelineDragging = false;
    });
    timeline.addEventListener("input", () => {
      const time = Number(timeline.value);
      if (mode === "wasm") {
        if (!stage) return;
        stage.seek(time);
        stage.render();
        lastTick = time;
        renderDebug(time);
        syncTransport(time);
        return;
      }
      field?.seek(time);
      lastTick = time;
      renderDebug(time);
      syncTransport(time);
    });
    rateSelect.addEventListener("change", () => {
      const rate = Number(rateSelect.value);
      field?.setRate(rate);
      stage?.setRate(rate);
    });
    $("#fullscreen").addEventListener("click", () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void stageArea.requestFullscreen?.();
    });
    document.addEventListener("keydown", (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      if (event.code === "Space") {
        event.preventDefault();
        playButton.click();
      } else if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
        event.preventDefault();
        const step = event.shiftKey ? 1 : 0.1;
        const next = Math.max(0, currentTime() + (event.code === "ArrowRight" ? step : -step));
        if (mode === "wasm") {
          if (!stage) return;
          stage.seek(next);
          stage.render();
        } else {
          if (!field) return;
          field.seek(next);
        }
        lastTick = next;
        syncTransport(next);
        renderDebug(next);
      }
    });
    for (const [id, delta] of [
      ["#note-speed-minus-one", -1],
      ["#note-speed-minus-point-one", -0.1],
      ["#note-speed-plus-point-one", 0.1],
      ["#note-speed-plus-one", 1]
    ]) {
      $(id).addEventListener("click", () => updateNoteSpeed(noteSpeedValue + delta));
    }
    $("#mirror").addEventListener("change", (event) => {
      field?.setOptions({ mirror: event.target.checked });
      applyStageConfig();
    });
    $("#sim").addEventListener("change", (event) => {
      field?.setOptions({ showSimLines: event.target.checked });
      applyStageConfig();
    });
    $("#low-effects").addEventListener("change", () => applyStageConfig());
    $("#damage-sound").addEventListener("change", () => applyStageConfig());
    $("#note-skin").addEventListener("change", () => applyStageConfig());
    $("#note-color").addEventListener("change", () => applyStageConfig());
    $("#low-resolution").addEventListener("change", (event) => {
      lowResolution = event.target.checked;
      resize();
    });
    bindStageSlider("#hold-alpha", "#hold-out");
    bindStageSlider("#guide-alpha", "#guide-out");
    bindStageSlider("#bg-brightness", "#bg-out");
    bindStageSlider("#stage-cover", "#cover-out");
    $("#bgm-volume").addEventListener("input", (event) => {
      const value = Number(event.target.value);
      bgmVolume = value / 100;
      $("#bgm-out").textContent = `${value}%`;
      stage?.setVolumes(bgmVolume, seVolume);
    });
    $("#se-volume").addEventListener("input", (event) => {
      const value = Number(event.target.value);
      seVolume = value / 100;
      $("#se-out").textContent = `${value}%`;
      hitSound.setVolume(seVolume);
      stage?.setVolumes(bgmVolume, seVolume);
    });
    recStartButton.addEventListener("click", () => {
      void startRecording();
    });
    recPauseButton.addEventListener("click", toggleRecordingPause);
    recStopButton.addEventListener("click", () => {
      void stopRecording();
    });
    dropZone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      clearSession();
      await loadBytes(new Uint8Array(await file.arrayBuffer()), file.name);
    });
    for (const type of ["dragenter", "dragover"]) {
      stageArea.addEventListener(type, (event) => {
        event.preventDefault();
        stageArea.classList.add("dragging");
      });
    }
    for (const type of ["dragleave", "drop"]) {
      stageArea.addEventListener(type, (event) => {
        event.preventDefault();
        stageArea.classList.remove("dragging");
      });
    }
    stageArea.addEventListener("drop", async (event) => {
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      clearSession();
      await loadBytes(new Uint8Array(await file.arrayBuffer()), file.name);
    });
    sampleSelect.addEventListener("change", () => {
      void fetchLevelData(sampleSelect.value);
    });
    window.addEventListener("resize", resize);
  }
});

// src/site/lib/chartSource.ts
function hasGzipMagic2(bytes2) {
  return bytes2.length >= 2 && bytes2[0] === GZIP_MAGIC_FIRST2 && bytes2[1] === GZIP_MAGIC_SECOND2;
}
async function gunzip2(bytes2) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301 gzip \u89E3\u538B\uFF0C\u8BF7\u76F4\u63A5\u4E0A\u4F20\u89E3\u538B\u540E\u7684\u8C31\u9762\u6587\u4EF6\u3002");
  }
  const stream = new Blob([bytes2]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
function normalizeText2(text) {
  return text.charCodeAt(0) === 65279 ? text.slice(1) : text;
}
function isJsonText2(text) {
  const head = text.trimStart();
  return head.startsWith("{") || head.startsWith("[");
}
function detectFormatFromText2(text, name) {
  if (!isJsonText2(text)) {
    return "sus";
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return guessJsonFormatFromName(name);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return "sus";
  }
  const root = parsed;
  if (Array.isArray(root.MusicScoreEventDataList) || Array.isArray(root.NoteList)) {
    return "custom-score-json";
  }
  if (root.usc && typeof root.usc === "object") {
    return "usc";
  }
  if (Array.isArray(root.objects) && typeof root.version === "number") {
    return "usc";
  }
  if (Array.isArray(root.entities)) {
    return "level-data";
  }
  return guessJsonFormatFromName(name);
}
function guessJsonFormatFromName(name) {
  const lower = (name ?? "").toLowerCase();
  if (lower.endsWith(".usc")) {
    return "usc";
  }
  if (lower.endsWith(".lvdata") || lower.endsWith(".leveldata")) {
    return "level-data";
  }
  return "custom-score-json";
}
async function decodeChartSource2(source) {
  const gzipped = hasGzipMagic2(source.bytes);
  const bytes2 = gzipped ? await gunzip2(source.bytes) : source.bytes;
  const text = normalizeText2(TEXT_DECODER2.decode(bytes2));
  return {
    format: detectFormatFromText2(text, source.name),
    text,
    gzipped
  };
}
function decodeChartText(text, name) {
  const normalized = normalizeText2(text);
  return {
    format: detectFormatFromText2(normalized, name),
    text: normalized,
    gzipped: false
  };
}
var GZIP_MAGIC_FIRST2, GZIP_MAGIC_SECOND2, TEXT_DECODER2;
var init_chartSource2 = __esm({
  "src/site/lib/chartSource.ts"() {
    "use strict";
    GZIP_MAGIC_FIRST2 = 31;
    GZIP_MAGIC_SECOND2 = 139;
    TEXT_DECODER2 = new TextDecoder("utf-8");
  }
});

// src/site/vendor/sus2img/fraction.ts
var FRACTION_RE, DECIMAL_RE, bigintAbs, gcd, normalize, parseDecimalString, fromNumber, Fraction;
var init_fraction = __esm({
  "src/site/vendor/sus2img/fraction.ts"() {
    "use strict";
    FRACTION_RE = /^([+-]?\d+)\/(\d+)$/;
    DECIMAL_RE = /^([+-]?\d+)(?:\.(\d+))?$/;
    bigintAbs = (value) => value < 0n ? -value : value;
    gcd = (a, b) => {
      let x = bigintAbs(a);
      let y = bigintAbs(b);
      while (y !== 0n) {
        const t = x % y;
        x = y;
        y = t;
      }
      return x || 1n;
    };
    normalize = (numerator, denominator) => {
      if (denominator === 0n) {
        throw new Error("Denominator cannot be zero");
      }
      if (denominator < 0n) {
        numerator = -numerator;
        denominator = -denominator;
      }
      const g = gcd(numerator, denominator);
      return [numerator / g, denominator / g];
    };
    parseDecimalString = (value) => {
      const trimmed = value.trim();
      if (!trimmed.length) {
        throw new Error("Empty number string");
      }
      const fractionMatch = trimmed.match(FRACTION_RE);
      if (fractionMatch) {
        const numerator = BigInt(fractionMatch[1]);
        const denominator = BigInt(fractionMatch[2]);
        return normalize(numerator, denominator);
      }
      const decimalMatch = trimmed.match(DECIMAL_RE);
      if (decimalMatch) {
        const integerPart = decimalMatch[1];
        const decimalPart = decimalMatch[2] ?? "";
        const scale = 10n ** BigInt(decimalPart.length);
        const whole = BigInt(integerPart);
        const sign = whole < 0n || integerPart.startsWith("-") ? -1n : 1n;
        const absWhole = bigintAbs(whole);
        const absNumber = BigInt(`${absWhole}${decimalPart}`);
        return normalize(sign * absNumber, scale);
      }
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid number: ${value}`);
      }
      return fromNumber(parsed);
    };
    fromNumber = (value, maxDenominator = 1000000n) => {
      if (!Number.isFinite(value)) {
        throw new Error(`Invalid number: ${value}`);
      }
      const sign = value < 0 ? -1n : 1n;
      const abs = Math.abs(value);
      const whole = Math.floor(abs);
      const fractional = abs - whole;
      if (fractional === 0) {
        return [sign * BigInt(whole), 1n];
      }
      let h1 = 1n;
      let h0 = 0n;
      let k1 = 0n;
      let k0 = 1n;
      let b = fractional;
      let a = Math.floor(b);
      for (let i = 0; i < 64; i += 1) {
        const h2 = BigInt(a) * h1 + h0;
        const k2 = BigInt(a) * k1 + k0;
        if (k2 > maxDenominator) {
          break;
        }
        h0 = h1;
        h1 = h2;
        k0 = k1;
        k1 = k2;
        const fracPart = b - a;
        if (Math.abs(fracPart) < 1e-12) {
          break;
        }
        b = 1 / fracPart;
        a = Math.floor(b);
      }
      const numerator = sign * (BigInt(whole) * k1 + h1);
      const denominator = k1;
      return normalize(numerator, denominator);
    };
    Fraction = class _Fraction {
      constructor(value = 0, denominator) {
        __publicField(this, "numerator");
        __publicField(this, "denominator");
        if (denominator !== void 0) {
          const left = _Fraction.from(value);
          const right = _Fraction.from(denominator);
          const [n2, d2] = normalize(
            left.numerator * right.denominator,
            left.denominator * right.numerator
          );
          this.numerator = n2;
          this.denominator = d2;
          return;
        }
        if (value instanceof _Fraction) {
          this.numerator = value.numerator;
          this.denominator = value.denominator;
          return;
        }
        if (typeof value === "bigint") {
          this.numerator = value;
          this.denominator = 1n;
          return;
        }
        if (typeof value === "number") {
          const [n2, d2] = fromNumber(value);
          this.numerator = n2;
          this.denominator = d2;
          return;
        }
        const [n, d] = parseDecimalString(value);
        this.numerator = n;
        this.denominator = d;
      }
      static from(value) {
        return value instanceof _Fraction ? value : new _Fraction(value);
      }
      static zero() {
        return new _Fraction(0);
      }
      static one() {
        return new _Fraction(1);
      }
      add(value) {
        const other = _Fraction.from(value);
        return new _Fraction(
          this.numerator * other.denominator + other.numerator * this.denominator,
          this.denominator * other.denominator
        );
      }
      sub(value) {
        const other = _Fraction.from(value);
        return new _Fraction(
          this.numerator * other.denominator - other.numerator * this.denominator,
          this.denominator * other.denominator
        );
      }
      mul(value) {
        const other = _Fraction.from(value);
        return new _Fraction(this.numerator * other.numerator, this.denominator * other.denominator);
      }
      div(value) {
        const other = _Fraction.from(value);
        return new _Fraction(this.numerator * other.denominator, this.denominator * other.numerator);
      }
      neg() {
        return new _Fraction(-this.numerator, this.denominator);
      }
      abs() {
        return new _Fraction(bigintAbs(this.numerator), this.denominator);
      }
      floor() {
        if (this.numerator >= 0n) {
          return this.numerator / this.denominator;
        }
        return -((-this.numerator + this.denominator - 1n) / this.denominator);
      }
      ceil() {
        if (this.numerator >= 0n) {
          return (this.numerator + this.denominator - 1n) / this.denominator;
        }
        return -(-this.numerator / this.denominator);
      }
      limitDenominator(maxDenominator) {
        if (maxDenominator <= 0) {
          return new _Fraction(this);
        }
        return new _Fraction(this.toNumber());
      }
      compare(value) {
        const other = _Fraction.from(value);
        const left = this.numerator * other.denominator;
        const right = other.numerator * this.denominator;
        if (left < right) return -1;
        if (left > right) return 1;
        return 0;
      }
      equals(value) {
        return this.compare(value) === 0;
      }
      toNumber() {
        return Number(this.numerator) / Number(this.denominator);
      }
      isInteger() {
        return this.denominator === 1n;
      }
      key() {
        return `${this.numerator}/${this.denominator}`;
      }
      toString() {
        if (this.denominator === 1n) {
          return this.numerator.toString();
        }
        return `${this.numerator}/${this.denominator}`;
      }
    };
  }
});

// src/site/vendor/sus2img/model.ts
var prefer, fractionOrNull, fractionToNumber, Meta, Event, Note, TapType, Tap, DirectionalType, Directional, SlideType, Slide, Score;
var init_model = __esm({
  "src/site/vendor/sus2img/model.ts"() {
    "use strict";
    init_fraction();
    prefer = (current, incoming) => current ? current : incoming ?? current;
    fractionOrNull = (value) => {
      if (value === void 0 || value === null) {
        return null;
      }
      return value instanceof Fraction ? value : new Fraction(value);
    };
    fractionToNumber = (value, fallback) => value ? value.toNumber() : fallback;
    Meta = class _Meta {
      constructor(values) {
        __publicField(this, "title", null);
        __publicField(this, "subtitle", null);
        __publicField(this, "artist", null);
        __publicField(this, "genre", null);
        __publicField(this, "designer", null);
        __publicField(this, "difficulty", null);
        __publicField(this, "playlevel", null);
        __publicField(this, "songid", null);
        __publicField(this, "wave", null);
        __publicField(this, "waveoffset", null);
        __publicField(this, "jacket", null);
        __publicField(this, "background", null);
        __publicField(this, "movie", null);
        __publicField(this, "movieoffset", null);
        __publicField(this, "basebpm", null);
        if (values) {
          Object.assign(this, values);
        }
      }
      merge(other) {
        return new _Meta({
          title: prefer(this.title, other.title) ?? null,
          subtitle: prefer(this.subtitle, other.subtitle) ?? null,
          artist: prefer(this.artist, other.artist) ?? null,
          genre: prefer(this.genre, other.genre) ?? null,
          designer: prefer(this.designer, other.designer) ?? null,
          difficulty: prefer(this.difficulty, other.difficulty) ?? null,
          playlevel: prefer(this.playlevel, other.playlevel) ?? null,
          songid: prefer(this.songid, other.songid) ?? null,
          wave: prefer(this.wave, other.wave) ?? null,
          waveoffset: prefer(this.waveoffset, other.waveoffset) ?? null,
          jacket: prefer(this.jacket, other.jacket) ?? null,
          background: prefer(this.background, other.background) ?? null,
          movie: prefer(this.movie, other.movie) ?? null,
          movieoffset: prefer(this.movieoffset, other.movieoffset) ?? null,
          basebpm: prefer(this.basebpm, other.basebpm) ?? null
        });
      }
    };
    Event = class _Event {
      constructor(values) {
        __publicField(this, "bar");
        __publicField(this, "bpm");
        __publicField(this, "barLength");
        __publicField(this, "sentenceLength");
        __publicField(this, "speed");
        __publicField(this, "seVolume");
        __publicField(this, "section");
        __publicField(this, "text");
        this.bar = values.bar instanceof Fraction ? values.bar : new Fraction(values.bar);
        this.bpm = fractionOrNull(values.bpm);
        this.barLength = fractionOrNull(values.barLength);
        this.sentenceLength = values.sentenceLength ?? null;
        this.speed = values.speed ?? null;
        this.seVolume = values.seVolume ?? null;
        this.section = values.section ?? null;
        this.text = values.text ?? null;
      }
      merge(other) {
        return new _Event({
          bar: other.bar,
          bpm: other.bpm ?? this.bpm ?? null,
          barLength: other.barLength ?? this.barLength ?? null,
          sentenceLength: other.sentenceLength ?? this.sentenceLength ?? null,
          speed: other.speed ?? this.speed ?? null,
          seVolume: other.seVolume ?? this.seVolume ?? null,
          section: other.section ?? this.section ?? null,
          text: other.text ?? this.text ?? null
        });
      }
      clone() {
        return new _Event({
          bar: this.bar,
          bpm: this.bpm,
          barLength: this.barLength,
          sentenceLength: this.sentenceLength,
          speed: this.speed,
          seVolume: this.seVolume,
          section: this.section,
          text: this.text
        });
      }
    };
    Note = class {
      constructor(values) {
        __publicField(this, "bar");
        __publicField(this, "lane");
        __publicField(this, "width");
        __publicField(this, "type");
        __publicField(this, "speed");
        /**
         * guide 配色（0 = neutral，1..7 = red/green/blue/yellow/purple/cyan/black）。
         * `null` 表示谱面没写，走类里默认的渐变。
         */
        __publicField(this, "guideColor");
        /**
         * 音符配色（0 = neutral … 7 = black，来自 LevelData 的 `style` 1..8）。
         * `null` 表示没指定，用精灵自带的默认配色。
         */
        __publicField(this, "noteColor");
        /** damage（危险条）：渲染时换用图集里的 damage 皮肤。 */
        __publicField(this, "damage");
        this.bar = values.bar instanceof Fraction ? values.bar : new Fraction(values.bar);
        this.lane = values.lane;
        this.width = values.width;
        this.type = values.type;
        this.speed = values.speed ?? null;
        this.guideColor = values.guideColor ?? null;
        this.noteColor = values.noteColor ?? null;
        this.damage = values.damage ?? false;
      }
      isCritical() {
        return false;
      }
      isTrend() {
        return false;
      }
      isNone() {
        return false;
      }
      isTick() {
        return true;
      }
    };
    TapType = {
      TAP: 1,
      CRITICAL: 2,
      FLICK: 3,
      DAMAGE: 4,
      TREND: 5,
      CRITICAL_TREND: 6,
      CANCEL: 7,
      CRITICAL_CANCEL: 8
    };
    Tap = class _Tap extends Note {
      isCritical() {
        return this.type === TapType.CRITICAL || this.type === TapType.CRITICAL_TREND || this.type === TapType.CRITICAL_CANCEL;
      }
      isTrend() {
        return this.type === TapType.TREND || this.type === TapType.CRITICAL_TREND;
      }
      isNone() {
        return this.type === TapType.CANCEL || this.type === TapType.CRITICAL_CANCEL;
      }
      isTick() {
        if (this.isNone()) {
          return null;
        }
        if (this.isTrend()) {
          return false;
        }
        return true;
      }
      cloneWithBar(bar) {
        return new _Tap({
          bar,
          lane: this.lane,
          width: this.width,
          type: this.type,
          speed: this.speed
        });
      }
    };
    DirectionalType = {
      UP: 1,
      DOWN: 2,
      UPPER_LEFT: 3,
      UPPER_RIGHT: 4,
      LOWER_LEFT: 5,
      LOWER_RIGHT: 6
    };
    Directional = class _Directional extends Note {
      constructor(values) {
        super(values);
        __publicField(this, "tap");
        this.tap = values.tap ?? null;
      }
      isCritical() {
        return this.tap ? this.tap.isCritical() : false;
      }
      isTrend() {
        return this.tap ? this.tap.isTrend() : false;
      }
      isTick() {
        if (this.isNone()) {
          return null;
        }
        if (this.isTrend()) {
          return false;
        }
        return true;
      }
      cloneWithBar(bar) {
        return new _Directional({
          bar,
          lane: this.lane,
          width: this.width,
          type: this.type,
          speed: this.speed,
          tap: null
        });
      }
    };
    SlideType = {
      START: 1,
      END: 2,
      RELAY: 3,
      INVISIBLE: 5
    };
    Slide = class _Slide extends Note {
      constructor(values) {
        super(values);
        __publicField(this, "channel");
        __publicField(this, "decoration");
        __publicField(this, "tap");
        __publicField(this, "directional");
        __publicField(this, "next");
        __publicField(this, "head");
        this.channel = values.channel ?? 0;
        this.decoration = values.decoration ?? false;
        this.tap = values.tap ?? null;
        this.directional = values.directional ?? null;
        this.next = values.next ?? null;
        this.head = values.head ?? null;
      }
      isPath() {
        if (this.type === 0) {
          return false;
        }
        if (this.type !== SlideType.RELAY) {
          return true;
        }
        if (this.directional) {
          return true;
        }
        if (this.tap === null && this.directional === null) {
          return true;
        }
        return false;
      }
      isCritical() {
        if (this.tap && this.tap.isCritical()) {
          return true;
        }
        if (this.directional && this.directional.isCritical()) {
          return true;
        }
        if (this.head && this.head !== this && this.head.isCritical()) {
          return true;
        }
        return false;
      }
      isTrend() {
        if (this.tap && this.tap.isTrend()) {
          return true;
        }
        if (this.directional && this.directional.isTrend()) {
          return true;
        }
        return false;
      }
      isNone() {
        if (this.tap && this.tap.isNone()) {
          return true;
        }
        if (this.directional && this.directional.isNone()) {
          return true;
        }
        return false;
      }
      isTick() {
        if (this.isNone()) {
          return null;
        }
        if (this.decoration) {
          const tapTick = this.tap ? this.tap.isTick() : null;
          if (tapTick) {
            return tapTick;
          }
          const directionalTick = this.directional ? this.directional.isTick() : null;
          if (directionalTick) {
            return directionalTick;
          }
          if (tapTick !== null || directionalTick !== null) {
            return false;
          }
          return null;
        }
        if (this.type === SlideType.INVISIBLE) {
          return null;
        }
        if (this.isTrend()) {
          return false;
        }
        if (this.type === SlideType.RELAY) {
          return false;
        }
        return true;
      }
      cloneWithBar(bar) {
        return new _Slide({
          bar,
          lane: this.lane,
          width: this.width,
          type: this.type,
          speed: this.speed,
          channel: this.channel,
          decoration: this.decoration,
          tap: null,
          directional: null,
          next: null,
          head: null
        });
      }
    };
    Score = class {
      constructor() {
        __publicField(this, "meta", new Meta());
        __publicField(this, "notes", []);
        __publicField(this, "events", []);
        __publicField(this, "ticksPerBeat", 480);
        __publicField(this, "timedEventsCache", null);
      }
      invalidateCache() {
        this.timedEventsCache = null;
      }
      sortNotes() {
        this.notes.sort((a, b) => {
          const cmp = a.bar.compare(b.bar);
          if (cmp !== 0) {
            return cmp;
          }
          return a.lane - b.lane;
        });
      }
      initNotes() {
        this.sortNotes();
        const noteDeleted = new Array(this.notes.length).fill(false);
        const noteIndexes = /* @__PURE__ */ new Map();
        for (let i = 0; i < this.notes.length; i += 1) {
          const note = this.notes[i];
          if (!(0 <= note.lane - 2 && note.lane - 2 < 12)) {
            noteDeleted[i] = true;
            this.events.push(
              new Event({
                bar: note.bar,
                text: note.lane === 0 ? "SKILL" : note.type === 1 ? "FEVER CHANCE!" : "SUPER FEVER!!"
              })
            );
            continue;
          }
          const key = note.bar.key();
          const indexes = noteIndexes.get(key);
          if (indexes) {
            indexes.push(i);
          } else {
            noteIndexes.set(key, [i]);
          }
        }
        for (let i = 0; i < this.notes.length; i += 1) {
          const directional = this.notes[i];
          if (noteDeleted[i] || !(directional instanceof Directional)) {
            continue;
          }
          const indexes = noteIndexes.get(directional.bar.key());
          if (!indexes) {
            continue;
          }
          for (const j of indexes) {
            const tap = this.notes[j];
            if (noteDeleted[j] || !(tap instanceof Tap)) {
              continue;
            }
            if (tap.bar.equals(directional.bar) && tap.lane === directional.lane && tap.width === directional.width) {
              noteDeleted[j] = true;
              directional.tap = tap;
            }
          }
        }
        for (let i = 0; i < this.notes.length; i += 1) {
          const slide = this.notes[i];
          if (noteDeleted[i] || !(slide instanceof Slide)) {
            continue;
          }
          if (slide.head === null) {
            slide.head = slide;
          }
          const indexes = noteIndexes.get(slide.bar.key());
          if (indexes) {
            for (const j of indexes) {
              const tap = this.notes[j];
              if (noteDeleted[j] || !(tap instanceof Tap)) {
                continue;
              }
              if (tap.bar.equals(slide.bar) && tap.lane === slide.lane && tap.width === slide.width) {
                noteDeleted[j] = true;
                slide.tap = tap;
              }
            }
            for (const j of indexes) {
              const directional = this.notes[j];
              if (noteDeleted[j] || !(directional instanceof Directional)) {
                continue;
              }
              if (directional.bar.equals(slide.bar) && directional.lane === slide.lane && directional.width === slide.width) {
                noteDeleted[j] = true;
                slide.directional = directional;
                if (directional.tap) {
                  slide.tap = directional.tap;
                }
              }
            }
          }
          if (slide.type !== SlideType.END) {
            for (let j = i + 1; j < this.notes.length; j += 1) {
              const next = this.notes[j];
              if (noteDeleted[j] || !(next instanceof Slide) || next.channel !== slide.channel || next.decoration !== slide.decoration) {
                continue;
              }
              slide.next = next;
              next.head = slide.head;
              break;
            }
          }
        }
        this.notes = this.notes.filter((_, idx) => !noteDeleted[idx]);
        this.sortNotes();
      }
      initEvents() {
        this.events.sort((a, b) => a.bar.compare(b.bar));
        const merged = [];
        for (const event of this.events) {
          const last2 = merged[merged.length - 1];
          if (last2 && event.bar.equals(last2.bar)) {
            merged[merged.length - 1] = last2.merge(event);
          } else {
            merged.push(event.clone());
          }
        }
        this.events = merged;
        this.invalidateCache();
      }
      getTimedEvents() {
        if (this.timedEventsCache) {
          return this.timedEventsCache;
        }
        const timedEvents = [];
        let t = 0;
        let current = new Event({
          bar: 0,
          bpm: 120,
          barLength: 4,
          sentenceLength: 4
        });
        for (const event of this.events) {
          t += event.bar.sub(current.bar).toNumber() * fractionToNumber(current.barLength, 4) * 60 / fractionToNumber(current.bpm, 120);
          current = current.merge(event);
          timedEvents.push([t, current]);
        }
        if (!timedEvents.length) {
          timedEvents.push([0, current]);
        }
        this.timedEventsCache = timedEvents;
        return timedEvents;
      }
      getTimedEvent(barInput) {
        const bar = barInput instanceof Fraction ? barInput : new Fraction(barInput);
        const timedEvents = this.getTimedEvents();
        let index = 0;
        let low = 0;
        let high = timedEvents.length - 1;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const cmp = timedEvents[mid][1].bar.compare(bar);
          if (cmp <= 0) {
            index = mid;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
        const [baseTime, event] = timedEvents[index];
        const delta = fractionToNumber(event.barLength, 4) * 60 / fractionToNumber(event.bpm, 120);
        const time = baseTime + delta * bar.sub(event.bar).toNumber();
        return [time, event];
      }
      getTime(bar) {
        return this.getTimedEvent(bar)[0];
      }
      getEvent(bar) {
        return this.getTimedEvent(bar)[1];
      }
      getTimeDelta(barFrom, barTo) {
        return this.getTime(barTo) - this.getTime(barFrom);
      }
      getBarByTime(time) {
        let t = 0;
        let event = new Event({
          bar: 0,
          bpm: 120,
          barLength: 4,
          sentenceLength: 4
        });
        for (let i = 0; i < this.events.length; i += 1) {
          event = event.merge(this.events[i]);
          if (i + 1 === this.events.length) {
            break;
          }
          const next = this.events[i + 1];
          const eventTime = fractionToNumber(event.barLength, 4) * 60 / fractionToNumber(event.bpm, 120) * next.bar.sub(event.bar).toNumber();
          if (t + eventTime > time) {
            break;
          }
          t += eventTime;
        }
        const bar = event.bar.toNumber() + (time - t) / (fractionToNumber(event.barLength, 4) * 60 / fractionToNumber(event.bpm, 120));
        return new Fraction(bar).limitDenominator(1e6);
      }
    };
  }
});

// src/site/vendor/sus2img/customScoreJson.ts
var DEFAULT_TICKS_PER_BEAT, DEFAULT_BEATS_PER_MEASURE, toNumber, sanitizeSpeedRatio, noteSpeedRatio, hasExactGeometry, EXACT_LANE_OFFSET, MIN_NOTE_WIDTH, noteLane, GUTTER_LANES, DRAWABLE_MIN_LANE, DRAWABLE_MAX_LANE, noteColorIndex, isDrawableNote, noteWidth, noteBar, timeSignatureToBeatLength, timeSignatureToTickLength, createTickToBarMapper, noteSlotKey, tapSlotKey, directionToDirectional, lineTypeToDirectional, tapTypeFromJson, downgradeCriticalTapType, isVisibleRelaySlideNote, chainHasCurveLine, shouldVisibleRelayAffectPath, isVisibleRelayAttachment, isDecorationSlideNote, makeTap, makeDirectional, getSlideType, buildChains, isHiddenHeadSlideChain, isDecorationSlideChain, connectedNoteAddsTap, standaloneTapType, withVisibleRelayAttachmentSlot, reserveTapSlot, addStandaloneNote, attachConnectedNote, removeAdjacentVisibleRelayDuplicates, isSkippedHiddenConnectionNote, normalizeRenderChain, isRenderableNote, scoreFromCustomScoreJson;
var init_customScoreJson = __esm({
  "src/site/vendor/sus2img/customScoreJson.ts"() {
    "use strict";
    init_fraction();
    init_model();
    DEFAULT_TICKS_PER_BEAT = 480;
    DEFAULT_BEATS_PER_MEASURE = 4;
    toNumber = (value, fallback = 0) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : fallback;
    };
    sanitizeSpeedRatio = (value) => {
      const speedRatio = Number(value);
      if (!Number.isFinite(speedRatio) || speedRatio <= 0) {
        return 1;
      }
      return speedRatio;
    };
    noteSpeedRatio = (note) => {
      const speedRatio = sanitizeSpeedRatio(note.speedRatio);
      return Math.abs(speedRatio - 1) > 1e-4 ? speedRatio : null;
    };
    hasExactGeometry = (note) => note.laneCenter !== void 0 && note.laneSize !== void 0 && Number.isFinite(Number(note.laneCenter)) && Number.isFinite(Number(note.laneSize));
    EXACT_LANE_OFFSET = 8;
    MIN_NOTE_WIDTH = 0.05;
    noteLane = (note) => hasExactGeometry(note) ? toNumber(note.laneCenter) - toNumber(note.laneSize) + EXACT_LANE_OFFSET : toNumber(note.laneStart) + 2;
    GUTTER_LANES = 2;
    DRAWABLE_MIN_LANE = 2 - GUTTER_LANES;
    DRAWABLE_MAX_LANE = 14 + GUTTER_LANES;
    noteColorIndex = (note) => {
      const style = Number(note.style ?? 0);
      return Number.isInteger(style) && style >= 1 && style <= 8 ? style - 1 : null;
    };
    isDrawableNote = (note) => {
      const lane = Number(note.lane);
      const width = Number(note.width);
      if (!Number.isFinite(lane) || !Number.isFinite(width)) {
        return false;
      }
      return lane + width > DRAWABLE_MIN_LANE && lane < DRAWABLE_MAX_LANE;
    };
    noteWidth = (note) => hasExactGeometry(note) ? Math.max(MIN_NOTE_WIDTH, toNumber(note.laneSize) * 2) : Math.max(1, toNumber(note.laneEnd) - toNumber(note.laneStart) + 1);
    noteBar = (note, tickToBar) => tickToBar(note.ticks);
    timeSignatureToBeatLength = (value) => {
      if (typeof value === "string") {
        const match = value.trim().match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
        if (match) {
          const numerator = Number(match[1]);
          const denominator = Number(match[2]);
          if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0) {
            return numerator * 4 / denominator;
          }
        }
      }
      return toNumber(value, DEFAULT_BEATS_PER_MEASURE);
    };
    timeSignatureToTickLength = (value, ticksPerBeat) => Math.max(1, Math.round(timeSignatureToBeatLength(value) * ticksPerBeat));
    createTickToBarMapper = (events, ticksPerBeat) => {
      const defaultTickLength = ticksPerBeat * DEFAULT_BEATS_PER_MEASURE;
      const signatureEvents = events.filter((event) => Number(event.eventType) === 3).sort((a, b) => toNumber(a.ticks) - toNumber(b.ticks) || toNumber(a.id) - toNumber(b.id));
      const segments = [
        { tick: 0, bar: new Fraction(0), tickLength: defaultTickLength }
      ];
      let currentTick = 0;
      let currentBar = new Fraction(0);
      let currentTickLength = defaultTickLength;
      for (const event of signatureEvents) {
        const tick = Math.round(toNumber(event.ticks));
        if (tick < currentTick) continue;
        currentBar = currentBar.add(new Fraction(tick - currentTick, currentTickLength));
        currentTick = tick;
        currentTickLength = timeSignatureToTickLength(event.changeValue, ticksPerBeat);
        const last2 = segments[segments.length - 1];
        if (last2 && last2.tick === tick) {
          last2.bar = currentBar;
          last2.tickLength = currentTickLength;
        } else {
          segments.push({ tick, bar: currentBar, tickLength: currentTickLength });
        }
      }
      return (ticks) => {
        const tick = Math.round(toNumber(ticks));
        let low = 0;
        let high = segments.length - 1;
        let index = 0;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          if (segments[mid].tick <= tick) {
            index = mid;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
        const segment = segments[index];
        return segment.bar.add(new Fraction(tick - segment.tick, segment.tickLength));
      };
    };
    noteSlotKey = (note) => `${Math.round(toNumber(note.ticks))}:${noteLane(note)}:${noteWidth(note)}`;
    tapSlotKey = (note) => `${Math.round(toNumber(note.ticks))}:${noteLane(note)}`;
    directionToDirectional = (direction) => {
      if (Number(direction) === 1) return DirectionalType.UPPER_LEFT;
      if (Number(direction) === 2) return DirectionalType.UPPER_RIGHT;
      return DirectionalType.UP;
    };
    lineTypeToDirectional = (lineType) => {
      if (Number(lineType) === 1) return DirectionalType.LOWER_LEFT;
      if (Number(lineType) === 2) return DirectionalType.DOWN;
      return 0;
    };
    tapTypeFromJson = (note, fallback = TapType.TAP) => {
      const base = Number(note.noteBaseType);
      const category = Number(note.category);
      if (category === 6) return note.type ? TapType.CRITICAL_TREND : TapType.TREND;
      if (base === 11) return note.type ? TapType.CRITICAL_TREND : TapType.TREND;
      if (base === 8) return note.type ? TapType.CRITICAL : TapType.TAP;
      if (base === 9 || base === 12) return note.type ? TapType.CRITICAL_CANCEL : TapType.CANCEL;
      if (base === 4) return note.type ? TapType.CRITICAL_TREND : TapType.TREND;
      if (base === 3) return note.type ? TapType.CRITICAL : TapType.TAP;
      if (base === 1 || base === 2) return note.type ? TapType.CRITICAL : TapType.TAP;
      return fallback;
    };
    downgradeCriticalTapType = (tapType) => {
      if (tapType === TapType.CRITICAL) return TapType.TAP;
      if (tapType === TapType.CRITICAL_TREND) return TapType.TREND;
      if (tapType === TapType.CRITICAL_CANCEL) return TapType.CANCEL;
      return tapType;
    };
    isVisibleRelaySlideNote = (note) => Number(note.noteBaseType) === 5 || Number(note.category) === 2;
    chainHasCurveLine = (chain) => chain.some((note) => Number(note.noteLineType || 0) !== 0);
    shouldVisibleRelayAffectPath = (note) => {
      if (!isVisibleRelaySlideNote(note)) return false;
      return note.isSkip === false;
    };
    isVisibleRelayAttachment = (note) => isVisibleRelaySlideNote(note) && !shouldVisibleRelayAffectPath(note);
    isDecorationSlideNote = (note) => {
      const base = Number(note.noteBaseType);
      return Number(note.category) === 9 || base === 10 || base === 13;
    };
    makeTap = (note, tickToBar, type, laneNote = note) => new Tap({
      bar: noteBar(note, tickToBar),
      lane: noteLane(laneNote),
      width: noteWidth(laneNote),
      type,
      speed: noteSpeedRatio(note),
      noteColor: noteColorIndex(note),
      damage: note.damage === true
    });
    makeDirectional = (note, tickToBar, type, laneNote = note, tap = null) => new Directional({
      bar: noteBar(note, tickToBar),
      lane: noteLane(laneNote),
      width: noteWidth(laneNote),
      type,
      speed: noteSpeedRatio(note),
      noteColor: noteColorIndex(note),
      damage: note.damage === true,
      tap
    });
    getSlideType = (note, isLast) => {
      const base = Number(note.noteBaseType);
      if (isLast) return SlideType.END;
      if (base === 2 || base === 8 || base === 9 || base === 10) return SlideType.START;
      if (base === 1 || base === 3 || base === 11 || base === 12 || base === 13) return SlideType.END;
      if (base === 6 || base === 14 || Number(note.category) === 11) return SlideType.INVISIBLE;
      if (base === 5) return SlideType.RELAY;
      return SlideType.RELAY;
    };
    buildChains = (notes) => {
      const byId = new Map(notes.map((note) => [note.id, note]));
      const visited = /* @__PURE__ */ new Set();
      const chains = [];
      for (const note of notes) {
        if (visited.has(note.id)) continue;
        if (note.nextConnectionId === -1 && note.previousConnectionId === -1) continue;
        if (note.previousConnectionId !== -1) continue;
        const chain = [];
        let current = note;
        while (current && !visited.has(current.id)) {
          chain.push(current);
          visited.add(current.id);
          current = current.nextConnectionId === -1 ? null : byId.get(current.nextConnectionId);
        }
        if (chain.length) chains.push(chain);
      }
      for (const note of notes) {
        if (!visited.has(note.id) && (note.nextConnectionId !== -1 || note.previousConnectionId !== -1)) {
          chains.push([note]);
          visited.add(note.id);
        }
      }
      return { chains, connectedIds: visited };
    };
    isHiddenHeadSlideChain = (chain, standaloneTapSlots) => {
      const first = chain[0];
      const last2 = chain[chain.length - 1];
      if (!first || !last2) return false;
      return Number(first.noteBaseType) === 9 && Number(last2.noteBaseType) === 12 && Number(last2.category) === 5 && standaloneTapSlots.has(noteSlotKey(first));
    };
    isDecorationSlideChain = (chain) => chain.some(isDecorationSlideNote);
    connectedNoteAddsTap = (note, slideType, visibleRelayAsAttachment) => {
      const base = Number(note.noteBaseType);
      return slideType === SlideType.RELAY && visibleRelayAsAttachment && isVisibleRelaySlideNote(note) || base === 3 || Number(note.category) === 3 || base === 4 || Number(note.category) === 8 || base === 8 || base === 11 || base === 9 || base === 12 || note.type && (base === 1 || base === 2);
    };
    standaloneTapType = (note, connectedSlideSlots, decorationSlideSlots, _criticalSlideSlots, hiddenHeadSlideSlots) => {
      const tapType = tapTypeFromJson(note);
      if (tapType === TapType.TREND || tapType === TapType.CRITICAL_TREND) return tapType;
      if (hiddenHeadSlideSlots.has(noteSlotKey(note))) return tapType;
      if (connectedSlideSlots.has(noteSlotKey(note))) return downgradeCriticalTapType(tapType);
      if (decorationSlideSlots.has(noteSlotKey(note))) return tapType;
      return tapType;
    };
    withVisibleRelayAttachmentSlot = (note, occupiedTapSlots) => {
      if (!occupiedTapSlots.has(tapSlotKey(note))) {
        occupiedTapSlots.add(tapSlotKey(note));
        return note;
      }
      const width = noteWidth(note);
      const maxLaneStart = Math.max(0, 12 - width);
      const candidates = Array.from({ length: maxLaneStart + 1 }, (_, laneStart2) => laneStart2);
      candidates.sort((a, b) => Math.abs(a - Number(note.laneStart)) - Math.abs(b - Number(note.laneStart)));
      const laneStart = candidates.find((candidate) => !occupiedTapSlots.has(`${Math.round(toNumber(note.ticks))}:${candidate + 2}`));
      if (laneStart === void 0) return note;
      const placed = { ...note, laneStart, laneEnd: laneStart + width - 1 };
      occupiedTapSlots.add(tapSlotKey(placed));
      return placed;
    };
    reserveTapSlot = (occupiedTapSlots, note) => {
      occupiedTapSlots.add(tapSlotKey(note));
    };
    addStandaloneNote = (score, note, tickToBar, connectedSlideSlots, decorationSlideSlots, criticalSlideSlots, hiddenHeadSlideSlots) => {
      if (Number(note.noteBaseType) === 3 || Number(note.category) === 3) {
        const tap = makeTap(
          note,
          tickToBar,
          standaloneTapType(note, connectedSlideSlots, decorationSlideSlots, criticalSlideSlots, hiddenHeadSlideSlots)
        );
        score.notes.push(makeDirectional(note, tickToBar, directionToDirectional(note.direction), note, tap));
        return;
      }
      if (Number(note.noteBaseType) === 4 || Number(note.category) === 8) {
        const tapType = tapTypeFromJson(note);
        const tap = makeTap(note, tickToBar, tapType);
        if (Number(note.direction) === 1 || Number(note.direction) === 2 || tapType === TapType.TREND || tapType === TapType.CRITICAL_TREND) {
          score.notes.push(makeDirectional(note, tickToBar, directionToDirectional(note.direction), note, tap));
        } else {
          score.notes.push(tap);
        }
        return;
      }
      score.notes.push(
        makeTap(
          note,
          tickToBar,
          standaloneTapType(note, connectedSlideSlots, decorationSlideSlots, criticalSlideSlots, hiddenHeadSlideSlots)
        )
      );
    };
    attachConnectedNote = (slide, note, outputNote, chain, tickToBar, isHiddenHeadStart, deferredCriticalTaps, criticalSlideSlots) => {
      const base = Number(note.noteBaseType);
      if (slide.decoration && note.type && (base === 10 || base === 13)) {
        slide.tap = makeTap(note, tickToBar, TapType.CRITICAL_CANCEL, outputNote);
        deferredCriticalTaps.push(outputNote);
        criticalSlideSlots.add(noteSlotKey(outputNote));
      } else if (isHiddenHeadStart && (base === 9 || base === 12)) {
        slide.tap = makeTap(note, tickToBar, note.type ? TapType.CRITICAL_CANCEL : TapType.CANCEL, outputNote);
      } else if (slide.type === SlideType.RELAY && isVisibleRelayAttachment(note)) {
        slide.tap = makeTap(note, tickToBar, TapType.FLICK, outputNote);
      } else if (base === 3 || Number(note.category) === 3) {
        const tap = makeTap(note, tickToBar, tapTypeFromJson(note), outputNote);
        slide.directional = makeDirectional(note, tickToBar, directionToDirectional(note.direction), outputNote, tap);
        slide.tap = tap;
      } else if (base === 4 || Number(note.category) === 8) {
        const tap = makeTap(note, tickToBar, tapTypeFromJson(note), outputNote);
        slide.directional = makeDirectional(note, tickToBar, directionToDirectional(note.direction), outputNote, tap);
        slide.tap = tap;
      } else if (base === 8 || base === 11 || base === 9 || base === 12) {
        slide.tap = makeTap(note, tickToBar, tapTypeFromJson(note), outputNote);
      } else if (note.type && (base === 1 || base === 2)) {
        slide.tap = makeTap(note, tickToBar, TapType.CRITICAL, outputNote);
      }
      const directionalType = lineTypeToDirectional(note.noteLineType);
      if (directionalType) {
        slide.directional = makeDirectional(note, tickToBar, directionalType, outputNote, slide.tap);
      }
    };
    removeAdjacentVisibleRelayDuplicates = (chain) => {
      const filtered = [];
      for (let index = 0; index < chain.length; index += 1) {
        const note = chain[index];
        const next = chain[index + 1];
        if (next && isVisibleRelaySlideNote(note) && isVisibleRelaySlideNote(next) && Math.abs(toNumber(next.ticks) - toNumber(note.ticks)) <= 1) {
          continue;
        }
        filtered.push(note);
      }
      return filtered;
    };
    isSkippedHiddenConnectionNote = (note) => {
      const base = Number(note.noteBaseType);
      return note.isSkip === true && (base === 6 || base === 14 || Number(note.category) === 11) && note.previousConnectionId !== -1 && note.nextConnectionId !== -1;
    };
    normalizeRenderChain = (chain) => removeAdjacentVisibleRelayDuplicates(chain).filter((note) => !isSkippedHiddenConnectionNote(note));
    isRenderableNote = (note) => Number(note.noteBaseType) !== 7 && Number(note.category) !== 12;
    scoreFromCustomScoreJson = (scoreJson, meta = {}) => {
      const rawScore = typeof scoreJson === "string" ? JSON.parse(scoreJson) : scoreJson;
      const ticksPerBeat = Number(meta.ticksPerBeat ?? DEFAULT_TICKS_PER_BEAT);
      const score = new Score();
      score.ticksPerBeat = ticksPerBeat;
      score.meta.title = meta.title ?? "";
      score.meta.artist = meta.artist ?? "";
      score.meta.designer = meta.author ?? "";
      score.meta.difficulty = meta.difficulty ?? "";
      score.meta.playlevel = meta.playlevel ?? "";
      score.meta.songid = String(meta.songId ?? rawScore?.MusicId ?? "");
      const events = [...rawScore?.MusicScoreEventDataList || []].sort(
        (a, b) => toNumber(a.ticks) - toNumber(b.ticks) || toNumber(a.eventType) - toNumber(b.eventType)
      );
      const tickToBar = createTickToBarMapper(events, ticksPerBeat);
      for (const event of events) {
        const bar = tickToBar(event.ticks);
        if (Number(event.eventType) === 0) {
          score.events.push(new Event({ bar, bpm: toNumber(event.changeValue, 120) }));
        } else if (Number(event.eventType) === 1) {
          score.events.push(new Event({ bar, speed: toNumber(event.changeValue, 1) }));
        } else if (Number(event.eventType) === 2) {
          score.events.push(new Event({ bar, seVolume: toNumber(event.changeValue, 1) }));
        } else if (Number(event.eventType) === 3) {
          score.events.push(new Event({ bar, barLength: timeSignatureToBeatLength(event.changeValue) }));
        }
      }
      const notes = [...rawScore?.NoteList || []].filter(isRenderableNote).sort(
        (a, b) => toNumber(a.ticks) - toNumber(b.ticks) || toNumber(a.laneStart) - toNumber(b.laneStart) || toNumber(a.id) - toNumber(b.id)
      );
      const { chains, connectedIds } = buildChains(notes);
      const connectedSlideSlots = /* @__PURE__ */ new Set();
      const decorationSlideSlots = /* @__PURE__ */ new Set();
      const criticalSlideSlots = /* @__PURE__ */ new Set();
      const hiddenHeadSlideSlots = /* @__PURE__ */ new Set();
      const standaloneTapSlots = /* @__PURE__ */ new Set();
      const occupiedTapSlots = /* @__PURE__ */ new Set();
      for (const rawChain of chains) {
        const chain = normalizeRenderChain(rawChain);
        const slots = isDecorationSlideChain(chain) ? decorationSlideSlots : connectedSlideSlots;
        for (const note of chain) slots.add(noteSlotKey(note));
      }
      for (const rawChain of chains) {
        const chain = normalizeRenderChain(rawChain);
        if (chain.length < 2) continue;
        const visibleRelayAsAttachment = chainHasCurveLine(chain);
        for (let index = 0; index < chain.length; index += 1) {
          const note = chain[index];
          const slideType = getSlideType(note, index === chain.length - 1);
          if (!isVisibleRelayAttachment(note) && connectedNoteAddsTap(note, slideType, visibleRelayAsAttachment)) {
            reserveTapSlot(occupiedTapSlots, note);
          }
        }
      }
      for (const note of notes) {
        if (!connectedIds.has(note.id)) {
          reserveTapSlot(occupiedTapSlots, note);
          standaloneTapSlots.add(noteSlotKey(note));
        }
      }
      for (const chain of chains) {
        if (isHiddenHeadSlideChain(chain, standaloneTapSlots)) {
          hiddenHeadSlideSlots.add(noteSlotKey(chain[0]));
        }
      }
      const channelAvailableAt = new Array(36).fill(Number.NEGATIVE_INFINITY);
      for (const rawChain of chains) {
        const chain = normalizeRenderChain(rawChain);
        if (chain.length < 2) continue;
        const startTick = toNumber(chain[0]?.ticks);
        const endTick = toNumber(chain[chain.length - 1]?.ticks, startTick);
        let channel = channelAvailableAt.findIndex((availableAt) => availableAt < startTick);
        if (channel === -1) {
          channel = channelAvailableAt.reduce(
            (best, availableAt, index) => availableAt < channelAvailableAt[best] ? index : best,
            0
          );
        }
        channelAvailableAt[channel] = Math.max(channelAvailableAt[channel], endTick);
        const chainDecoration = isDecorationSlideChain(chain);
        const visibleRelayAsAttachment = chainHasCurveLine(chain);
        const isHiddenHead = isHiddenHeadSlideChain(chain, standaloneTapSlots);
        let previousSlide = null;
        let headSlide = null;
        const deferredCriticalTaps = [];
        for (let index = 0; index < chain.length; index += 1) {
          const note = chain[index];
          const base = Number(note.noteBaseType);
          const decoration = chainDecoration || isDecorationSlideNote(note);
          const slideType = getSlideType(note, index === chain.length - 1);
          const outputNote = slideType === SlideType.RELAY && isVisibleRelayAttachment(note) ? withVisibleRelayAttachmentSlot(note, occupiedTapSlots) : note;
          const slide = new Slide({
            bar: noteBar(note, tickToBar),
            lane: noteLane(outputNote),
            width: noteWidth(outputNote),
            type: slideType,
            speed: noteSpeedRatio(note),
            channel,
            decoration,
            // guide 的 8 色变体由 `guideColor` 决定（0 = neutral … 7 = black）；
            // `-1`/缺失表示谱面没指定，保持默认渐变。
            guideColor: Number.isInteger(Number(note.guideColor)) && Number(note.guideColor) >= 0 ? Number(note.guideColor) : null,
            noteColor: noteColorIndex(note),
            damage: note.damage === true
          });
          if (!headSlide) headSlide = slide;
          slide.head = headSlide;
          if (previousSlide) {
            previousSlide.next = slide;
          }
          attachConnectedNote(
            slide,
            note,
            outputNote,
            chain,
            tickToBar,
            isHiddenHead && index === 0 && (base === 9 || base === 12),
            deferredCriticalTaps,
            criticalSlideSlots
          );
          score.notes.push(slide);
          previousSlide = slide;
        }
        for (const note of deferredCriticalTaps) {
          if (!standaloneTapSlots.has(noteSlotKey(note))) {
            score.notes.push(makeTap(note, tickToBar, TapType.CRITICAL_CANCEL));
          }
        }
      }
      for (const note of notes) {
        if (!connectedIds.has(note.id)) {
          addStandaloneNote(
            score,
            note,
            tickToBar,
            connectedSlideSlots,
            decorationSlideSlots,
            criticalSlideSlots,
            hiddenHeadSlideSlots
          );
        }
      }
      score.notes = score.notes.filter(isDrawableNote);
      score.sortNotes();
      score.initEvents();
      return score;
    };
  }
});

// src/site/vendor/sus2img/rebase.ts
var rebaseMetaKeys, createRebaseInputFromScore, stringifyRebaseFromScore, loadMeta, loadRebase, rebaseBar, rebaseTap, rebaseDirectional, rebaseSlide, applyRebase;
var init_rebase = __esm({
  "src/site/vendor/sus2img/rebase.ts"() {
    "use strict";
    init_model();
    rebaseMetaKeys = [
      "title",
      "subtitle",
      "artist",
      "genre",
      "designer",
      "difficulty",
      "playlevel",
      "songid",
      "wave",
      "waveoffset",
      "jacket",
      "background",
      "movie",
      "movieoffset",
      "basebpm"
    ];
    createRebaseInputFromScore = (score) => {
      const meta = {};
      for (const key of rebaseMetaKeys) {
        const value = score.meta[key];
        if (value !== null && value !== void 0 && value !== "") {
          meta[key] = value;
        }
      }
      const events = score.events.flatMap((event) => {
        const serialized = { bar: event.bar.toNumber() };
        if (event.bpm !== null) serialized.bpm = event.bpm.toNumber();
        if (event.barLength !== null) serialized.barLength = event.barLength.toNumber();
        if (event.sentenceLength !== null) serialized.sentenceLength = event.sentenceLength;
        if (event.seVolume !== null) serialized.seVolume = event.seVolume;
        if (event.section !== null && event.section !== "") serialized.section = event.section;
        if (event.text !== null && event.text !== "") serialized.text = event.text;
        return Object.keys(serialized).length > 1 ? [serialized] : [];
      });
      return {
        offset: 0,
        events,
        meta
      };
    };
    stringifyRebaseFromScore = (score) => `${JSON.stringify(createRebaseInputFromScore(score), null, 2)}
`;
    loadMeta = (value) => {
      if (!value) {
        return new Meta();
      }
      return new Meta(value);
    };
    loadRebase = (value) => ({
      offset: value?.offset ?? 0,
      events: (value?.events ?? []).map(
        (event) => new Event({
          bar: event.bar ?? 0,
          bpm: event.bpm,
          barLength: event.barLength,
          sentenceLength: event.sentenceLength,
          seVolume: event.seVolume,
          section: event.section,
          text: event.text
        })
      ),
      meta: loadMeta(value?.meta)
    });
    rebaseBar = (source, target, bar, offset) => target.getBarByTime(source.getTime(bar) - offset);
    rebaseTap = (source, target, note, offset) => note.cloneWithBar(rebaseBar(source, target, note.bar, offset));
    rebaseDirectional = (source, target, note, offset) => note.cloneWithBar(rebaseBar(source, target, note.bar, offset));
    rebaseSlide = (source, target, note, offset) => note.cloneWithBar(rebaseBar(source, target, note.bar, offset));
    applyRebase = (source, input) => {
      const rebase = loadRebase(input);
      const score = new Score();
      score.meta = source.meta.merge(rebase.meta);
      score.events = rebase.events.map((event) => event.clone());
      for (const note of source.notes) {
        if (note instanceof Tap) {
          score.notes.push(rebaseTap(source, score, note, rebase.offset));
          continue;
        }
        if (note instanceof Directional) {
          score.notes.push(rebaseDirectional(source, score, note, rebase.offset));
          if (note.tap) {
            score.notes.push(rebaseTap(source, score, note.tap, rebase.offset));
          }
          continue;
        }
        if (note instanceof Slide) {
          score.notes.push(rebaseSlide(source, score, note, rebase.offset));
          if (note.tap) {
            score.notes.push(rebaseTap(source, score, note.tap, rebase.offset));
          }
          if (note.directional) {
            score.notes.push(rebaseDirectional(source, score, note.directional, rebase.offset));
            if (note.directional.tap && note.directional.tap !== note.tap) {
              score.notes.push(rebaseTap(source, score, note.directional.tap, rebase.offset));
            }
          }
        }
      }
      score.events = score.events.concat(
        source.events.filter((event) => Boolean(event.speed || event.seVolume !== null || event.text)).map(
          (event) => new Event({
            bar: rebaseBar(source, score, event.bar, rebase.offset),
            speed: event.speed,
            seVolume: event.seVolume,
            section: event.section,
            text: event.text
          })
        )
      );
      score.notes.sort((a, b) => a.bar.compare(b.bar));
      score.initNotes();
      score.initEvents();
      return score;
    };
  }
});

// src/site/vendor/sus2img/judgmentTiming.ts
function bandsFromThresholds(thresholds) {
  const grades = ["perfect", "great", "good", "bad"];
  const bands = [];
  let before = 0;
  let after = 0;
  grades.forEach((grade, i) => {
    const nextBefore = thresholds[i * 2];
    const nextAfter = thresholds[i * 2 + 1];
    if (grade === "perfect") {
      bands.push({ grade, from: -nextBefore, to: nextAfter });
    } else {
      if (nextBefore > before) bands.push({ grade, from: -nextBefore, to: -before });
      if (nextAfter > after) bands.push({ grade, from: after, to: nextAfter });
    }
    before = nextBefore;
    after = nextAfter;
  });
  return bands;
}
function getNoteJudgment(note) {
  if (note.isNone() || note instanceof Directional && note.tap?.isNone() || note instanceof Slide && note.decoration) return null;
  if (note instanceof Tap && note.type === TapType.DAMAGE) return null;
  const critical = note.isCritical();
  const gold = critical ? "\u91D1\u8272 " : "";
  const trace = note.isTrend();
  const flick = note instanceof Directional || note instanceof Slide && note.type === SlideType.END && Boolean(note.directional);
  if (note instanceof Slide) {
    if (note.type === SlideType.INVISIBLE) return null;
    if (note.type === SlideType.RELAY) {
      return {
        label: `${gold}\u957F\u6761\u4E2D\u7EE7\u70B9`,
        bands: [],
        checkpoint: true,
        explanation: "\u5230\u70B9\u68C0\u67E5\u6301\u6709\u72B6\u6001\uFF1B\u6210\u529F\u76F4\u63A5 Perfect\uFF0C\u5931\u8D25 Miss\u3002\u6CA1\u6709\u72EC\u7ACB\u7684\u56DB\u6863\u65F6\u95F4\u7A97\u3002\u7EC6\u7EBF\u53EA\u6807\u8BB0\u68C0\u67E5\u65F6\u523B\u3002"
      };
    }
    if (note.type === SlideType.START && trace) {
      return {
        label: `${gold}Trace \u957F\u6761\u8D77\u70B9`,
        bands: [
          { grade: "perfect", from: -5, to: 0, conditional: true },
          { grade: "perfect", from: 0, to: 7.5, conditional: true }
        ],
        explanation: "\u63D0\u524D 5f \u5185\u53EF\u8BB0\u5F55\u89E6\u6478\uFF1B\u5230\u70B9\u540E\u7531\u4E0B\u4E00\u6B21\u66F4\u65B0\u7ED3\u7B97 Perfect\u3002+7.5f \u662F\u72B6\u6001\u673A\u622A\u6B62\u7EBF\uFF0C\u4E0D\u662F\u4FDD\u8BC1\u53EF\u547D\u4E2D\u7684\u89E6\u6478\u65F6\u523B\uFF1A\u4E0B\u4E00\u6B21\u66F4\u65B0\u5FC5\u987B\u5C1A\u672A\u8D85\u65F6\uFF0C\u77ED\u6761\u8FD8\u53D7\u5C3E\u90E8\u9650\u5236\u3002\u8868\u4E2D after=5f \u4E0D\u662F\u8D77\u70B9\u7ED3\u7B97\u4E0A\u9650\u3002"
      };
    }
    if (note.type === SlideType.END && !flick && trace) {
      return {
        label: `${gold}Trace \u957F\u6761\u5C3E\u70B9`,
        bands: bufferedPerfect(8, 6.5),
        explanation: "\u76F4\u63A5 Perfect\uFF1B\u63D0\u524D\u89E6\u6478\u4F1A\u8BB0\u5F55\u5230\u6B63\u62CD\u3002\u8BE5\u5206\u652F\u628A\u201C\u5F53\u524D\u65F6\u95F4 \u2212 \u97F3\u7B26\u65F6\u95F4\u201D\u4F20\u5165\u5171\u7528\u95E8\u9650\uFF0C\u5B9E\u9645\u65E9\u4FA7 8f\u3001\u665A\u4FA7 6.5f\uFF08\u4E0E\u5B57\u6BB5 Before/After \u540D\u79F0\u76F8\u53CD\uFF09\u3002"
      };
    }
    if (note.type === SlideType.END && flick) {
      if (trace) {
        return {
          label: `${gold}Trace \u5C3E\u6ED1`,
          bands: bufferedPerfect(7.5, 7.5),
          explanation: "\u5C3E\u6ED1\u7684\u8F93\u5165\u95E8\u9650\u4F7F\u7528 long_end_flick\uFF0C\u63D0\u524D\u6700\u591A 7.5f \u53EF\u7F13\u5B58\uFF1B\u7ED3\u7B97\u4ECD\u4F7F\u7528 friction_flick\uFF0C\u665A\u4FA7 7.5f\u3002\u65B9\u5411\u6B63\u786E\u4E14\u6ED1\u52A8\u8DDD\u79BB\u8FBE\u6807\u65F6 Perfect\uFF1B\u9519\u5411\u53EF\u80FD Great\uFF0C\u6CA1\u6709\u72EC\u7ACB Good/Bad \u65F6\u95F4\u5E26\u3002"
        };
      }
      const late = bandsFromThresholds(JUDGMENT_FRAMES.long_end).filter((band) => band.to > 0).map((band) => ({ ...band, from: Math.max(0, band.from) }));
      return {
        label: `${gold}\u957F\u6761\u5C3E\u6ED1`,
        bands: [{ grade: "perfect", from: -7.5, to: 0, conditional: true }, ...late],
        explanation: "\u65E9\u4FA7\u5148\u7F13\u5B58\u6ED1\u52A8\uFF0C\u5230\u6B63\u62CD\u540E\u7ED3\u7B97\uFF0C\u65B9\u5411\u6B63\u786E\u65F6\u4E0D\u4EA7\u751F\u8868\u4E2D\u7684\u65E9\u4FA7 Great/Good\u3002\u665A\u4FA7\u6309\u7ED3\u7B97\u65F6\u95F4\u5206\u6863\uFF1BGood \u4E0E Bad \u95E8\u9650\u91CD\u5408\uFF0C\u6CA1\u6709 Bad \u65F6\u95F4\u5E26\u3002\u9519\u5411\u53EF\u964D\u4E3A Great\u3002"
      };
    }
    if (note.type === SlideType.END) {
      return {
        label: `${gold}\u957F\u6761\u5C3E\u70B9`,
        bands: bandsFromThresholds(JUDGMENT_FRAMES.long_end),
        explanation: "\u6309\u677E\u624B\u65F6\u95F4\u8BC4\u5206\uFF1BGood \u4E0E Bad \u95E8\u9650\u91CD\u5408\uFF0C\u6CA1\u6709\u72EC\u7ACB Bad \u65F6\u95F4\u5E26\u3002\u91D1\u8272\u4E0E\u666E\u901A\u5C3E\u70B9\u76F8\u540C\u3002"
      };
    }
  }
  if (flick && trace) {
    return {
      label: `${gold}Trace \u6ED1\u952E`,
      bands: bufferedPerfect(6.5, 7.5),
      explanation: "\u65E9\u4FA7\u7F13\u5B58\u6ED1\u52A8\uFF0C\u5230\u6B63\u62CD\u540E\u7ED3\u7B97\u3002\u65B9\u5411\u6B63\u786E\u4E14\u6ED1\u52A8\u8DDD\u79BB\u8FBE\u6807\u65F6\u53EA\u6709 Perfect/Miss\uFF1B\u65B9\u5411\u9519\u8BEF\u53EF\u5F97 Great\uFF0C\u4F46\u6CA1\u6709\u989D\u5916\u7684 Great/Good/Bad \u65F6\u95F4\u5E26\u3002"
    };
  }
  if (trace) {
    return {
      label: `${gold}Trace`,
      bands: bufferedPerfect(5, 5),
      explanation: "\xB15f \u5185\u89E6\u6478\u53EF\u8BB0\u5F55\uFF0C\u63D0\u524D\u89E6\u6478\u7B49\u5F85\u6B63\u62CD\uFF1B\u76F4\u63A5\u7ED3\u7B97 Perfect\uFF0C\u4E0D\u8FD0\u884C\u56DB\u6863\u8BC4\u5206\u3002"
    };
  }
  const directional = note instanceof Directional ? note : note instanceof Slide ? note.directional : null;
  const directed = directional && directional.type !== DirectionalType.UP;
  return {
    label: `${gold}${flick ? "\u6ED1\u952E" : note instanceof Slide ? "\u957F\u6761\u8D77\u70B9" : "Tap"}`,
    bands: bandsFromThresholds(flick ? critical ? JUDGMENT_FRAMES.flick_critical : JUDGMENT_FRAMES.flick : critical ? JUDGMENT_FRAMES.normal_critical : JUDGMENT_FRAMES.normal),
    explanation: flick ? `\u6309\u6ED1\u52A8\u5B8C\u6210\u65F6\u95F4\u8BC4\u5206\uFF0C\u9700\u8981\u8FBE\u5230\u6ED1\u52A8\u8DDD\u79BB\u3002${directed ? "\u65B9\u5411\u9519\u8BEF\u65F6 Perfect \u964D\u4E3A Great\u3002" : ""}` : "\u6309\u6309\u4E0B\u65F6\u95F4\u8BC4\u5206\uFF1B\u91D1\u8272\u4F7F\u7528\u72EC\u7ACB\u95E8\u9650\u3002"
  };
}
var JUDGMENT_FPS, JUDGMENT_FRAMES, bufferedPerfect;
var init_judgmentTiming = __esm({
  "src/site/vendor/sus2img/judgmentTiming.ts"() {
    "use strict";
    init_model();
    JUDGMENT_FPS = 60;
    JUDGMENT_FRAMES = {
      normal: [2.5, 2.5, 5, 5, 6.5, 6.5, 7.5, 7.5],
      normal_critical: [3.299999952316284, 3.299999952316284, 4.5, 4.5, 6.5, 6.5, 7.5, 7.5],
      flick: [2.5, 2.5, 6.5, 7.5, 7, 8, 7.5, 8.5],
      flick_critical: [3.5, 3.5, 6.5, 7.5, 7, 8, 7.5, 8.5],
      long_end: [3.5, 4, 6.5, 8, 7.5, 8.5, 7.5, 8.5],
      friction: [5, 5, 5, 5, 5, 5, 5, 5],
      friction_long_end: [6.5, 8, 6.5, 8, 6.5, 8, 6.5, 8],
      friction_flick: [6.5, 7.5, 6.5, 7.5, 6.5, 7.5, 6.5, 7.5]
    };
    bufferedPerfect = (before, after) => [
      { grade: "perfect", from: -before, to: 0, conditional: true },
      { grade: "perfect", from: 0, to: after }
    ];
  }
});

// src/site/vendor/sus2img/renderer.ts
var DEFAULT_STYLE, WHITE_STYLE, SPEED_DENSE_MAX_GAP, LANE_GUTTER, GUIDE_COLORS, SPEED_DENSE_MIN_POINTS, escapeXml, r, fmt, formatBar, formatSpeedRatio, getNoteSpeedRatio, getRhythmTickState, cloneEvent, SentenceRenderer, DrawingRenderer, renderScoreToSvg, defaultSus2ImgStyleSheet;
var init_renderer2 = __esm({
  "src/site/vendor/sus2img/renderer.ts"() {
    "use strict";
    init_fraction();
    init_judgmentTiming();
    init_model();
    DEFAULT_STYLE = `.bar-line {
    stroke: #e2e2e2;
    stroke-width: 4;
}

.bar-count-flag {
    stroke: #ffffff;
    stroke-width: 4;
}

.bar-count-text {
    font-size: 12px;
    font-weight: 900;
    font-family: Avenir;
    fill: #ffffff;
    text-anchor: start;
}

.beat-line {
    stroke: #e2e2e2;
    stroke-width: 1;
}

.lane-line {
    stroke: #e2e2e2;
    stroke-width: 1;
}

.event-flag {
    stroke: #fee300;
    stroke-width: 4;
}

.event-text {
    font-size: 12px;
    font-weight: 900;
    font-family: Avenir;
    fill: #fee300;
    text-anchor: start;
}

.speed-line {
    stroke: #ff33ff;
    stroke-width: 1;
}

.speed-line-condensed {
    stroke: #ff33ff;
    stroke-width: 1;
    stroke-dasharray: 5 4;
}

.speed-text {
    font-size: 12px;
    font-family: Avenir;
    fill: #ff33ff;
    text-anchor: end;
}

.speed-trend-line {
    stroke: #ff33ff;
    stroke-width: 1.5;
    stroke-opacity: 0.7;
}

.speed-trend-head {
    fill: #ff33ff;
    fill-opacity: 0.7;
}

.note-speed-text {
    font-size: 10px;
    font-family: Avenir;
    opacity: 0.5;
    fill: #e2e2e2;
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
}

.lyric-text {
    font-size: 12px;
    font-family: "Hiragino Kaku Gothic Pro", sans-serif;
    fill: #ffffff;
    text-anchor: start;
}

.slide {
    fill: #c9fce2cc
}

.slide-critical {
    fill: #fcf1c3cc
}

.decoration {
    fill: url(#decoration-gradient);
}

#decoration-gradient {
    --color-start: #c9fce299;
    --color-stop: #c9fce233;
}

.decoration-critical {
    fill: url(#decoration-critical-gradient);
}

#decoration-critical-gradient {
    --color-start: #fcf1c399;
    --color-stop: #fcf1c333;
}

.tick-text {
    font-size: 12px;
    font-family: Avenir;
    fill: #e2e2e2;
    text-anchor: end;
}

.tick-line {
    stroke: #e2e2e2;
    stroke-width: 1;
}

.meta-line {
    stroke: #e2e2e2;
    stroke-width: 2;
}

.title {
    font-size: 96px;
    font-weight: 900;
    font-family: "Hiragino Kaku Gothic Pro", sans-serif;
    fill: #ffffff;
    text-anchor: start;
}

.subtitle {
    font-size: 48px;
    font-weight: 700;
    font-family: "Hiragino Kaku Gothic Pro", sans-serif;
    fill: #ffffff;
    text-anchor: start;
}

.lane {
    fill: #d5bdef;
}

.background {
    fill: #ab7ed3;
}

.meta {
    fill: #ab7ed3;
}
`;
    WHITE_STYLE = `.bar-line {
    stroke: #eeeeee;
    stroke-width: 2;
}

.bar-count-flag {
    stroke: #606060;
    stroke-width: 4;
}

.bar-count-text {
    font-size: 12px;
    font-weight: 900;
    font-family: Avenir;
    fill: #606060;
    text-anchor: start;
}

.beat-line {
    stroke: #eeeeee;
    stroke-width: 1;
}

.lane-line {
    stroke: #ffffff;
    stroke-width: 1;
}

.event-flag {
    stroke: #7f0000;
    stroke-width: 4;
}

.event-text {
    font-size: 12px;
    font-weight: 900;
    font-family: Avenir;
    fill: #808080;
    text-anchor: start;
}

.speed-line {
    stroke: #ff33ff;
    stroke-width: 1;
}

.speed-line-condensed {
    stroke: #ff33ff;
    stroke-width: 1;
    stroke-dasharray: 5 4;
}

.speed-text {
    font-size: 12px;
    font-family: Avenir;
    fill: #ff33ff;
    text-anchor: end;
}

.speed-trend-line {
    stroke: #ff33ff;
    stroke-width: 1.5;
    stroke-opacity: 0.7;
}

.speed-trend-head {
    fill: #ff33ff;
    fill-opacity: 0.7;
}

.note-speed-text {
    font-size: 10px;
    font-family: Avenir;
    opacity: 0.5;
    fill: #000000;
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
}

.lyric-text {
    font-size: 12px;
    font-family: Avenir;
    fill: #606060;
    text-anchor: start;
}

.slide {
    fill: #d9fbeecc
}

.slide-critical {
    fill: #fcfacdcc
}

.decoration {
    fill: url(#decoration-gradient);
}

#decoration-gradient {
    --color-start: #c9fce299;
    --color-stop: #c9fce233;
}

.decoration-critical {
    fill: url(#decoration-critical-gradient);
}

#decoration-critical-gradient {
    --color-start: #fcf1c399;
    --color-stop: #fcf1c333;
}

.tick-text {
    font-size: 12px;
    font-family: Avenir;
    fill: #000000;
    text-anchor: end;
}

.tick-line {
    stroke: #808080;
    stroke-width: 1;
}

.meta-line {
    stroke: #e2e2e2;
    stroke-width: 2;
}

.title {
    font-size: 96px;
    font-weight: 900;
    font-family: Avenir;
    fill: #000000;
    text-anchor: start;
}

.subtitle {
    font-size: 48px;
    font-weight: 700;
    font-family: Avenir;
    fill: #000000;
    text-anchor: start;
}

.lane {
    fill: #cfd8db;
}

.background {
    fill: #FFFFFF;
}

.meta {
    fill: #FFFFFF;
}
`;
    SPEED_DENSE_MAX_GAP = 16;
    LANE_GUTTER = 2;
    GUIDE_COLORS = [
      "#EDEDED",
      // 0 neutral
      "#D6737B",
      // 1 red
      "#73D69D",
      // 2 green
      "#737BD6",
      // 3 blue
      "#D6B362",
      // 4 yellow
      "#D673CD",
      // 5 purple
      "#73ACD6",
      // 6 cyan
      "#000000"
      // 7 black
    ];
    SPEED_DENSE_MIN_POINTS = 4;
    escapeXml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    r = (value) => Math.round(value);
    fmt = (value) => {
      if (Math.abs(value - Math.round(value)) < 1e-6) {
        return `${Math.round(value)}`;
      }
      return `${Number(value.toFixed(3))}`;
    };
    formatBar = (bar) => {
      const n = bar.toNumber();
      if (Math.abs(n - Math.round(n)) < 1e-9) {
        return `${Math.round(n)}`;
      }
      return `${Number(n.toFixed(4))}`;
    };
    formatSpeedRatio = (speedRatio) => `${fmt(speedRatio)}x`;
    getNoteSpeedRatio = (note) => {
      if (note.speed) {
        return note.speed;
      }
      if (note instanceof Directional) {
        return note.tap?.speed ?? null;
      }
      if (note instanceof Slide) {
        return note.tap?.speed ?? note.directional?.speed ?? note.directional?.tap?.speed ?? null;
      }
      return null;
    };
    getRhythmTickState = (note) => {
      if (!(note instanceof Slide)) {
        return note.isTick();
      }
      if (note.decoration) {
        return null;
      }
      const isChainHead = note.head === note;
      const isChainTail = note.next === null;
      if (!isChainHead && !isChainTail) {
        return null;
      }
      if (note.type !== SlideType.START && note.type !== SlideType.END) {
        return null;
      }
      return note.isTick();
    };
    cloneEvent = (event) => new Event({
      bar: event.bar,
      bpm: event.bpm,
      barLength: event.barLength,
      sentenceLength: event.sentenceLength,
      speed: event.speed,
      seVolume: event.seVolume,
      section: event.section,
      text: event.text
    });
    SentenceRenderer = class {
      constructor(drawing, barStart, barStop, sentenceGhostNotes, sentenceCrashMarkers, sentenceFocusAnchors) {
        __publicField(this, "drawing");
        __publicField(this, "barStart");
        __publicField(this, "barStop");
        __publicField(this, "slidePaths", []);
        __publicField(this, "amongImages", []);
        __publicField(this, "noteImages", []);
        __publicField(this, "flickImages", []);
        __publicField(this, "noteSpeedTexts", []);
        __publicField(this, "tickTexts", []);
        __publicField(this, "crashMarkerElements", []);
        __publicField(this, "sentenceGhostNotes");
        __publicField(this, "sentenceCrashMarkers");
        __publicField(this, "sentenceFocusAnchors");
        this.drawing = drawing;
        this.barStart = barStart;
        this.barStop = barStop;
        this.sentenceGhostNotes = sentenceGhostNotes ?? [];
        this.sentenceCrashMarkers = sentenceCrashMarkers ?? [];
        this.sentenceFocusAnchors = sentenceFocusAnchors ?? [];
      }
      get yBaseTop() {
        return this.drawing.timePadding;
      }
      getRelativeY(bar) {
        return this.drawing.timeHeight * this.drawing.score.getTimeDelta(bar, new Fraction(this.barStop)) + this.yBaseTop;
      }
      renderJudgmentTargets(height) {
        if (!this.drawing.interactiveJudgment) return "";
        const bottom = height + this.drawing.timePadding * 2;
        const parts = [];
        const stopTime = this.drawing.score.getTime(this.barStop);
        const earliest = stopTime - (height + this.drawing.timePadding) / this.drawing.timeHeight;
        const latest = stopTime + this.drawing.timePadding / this.drawing.timeHeight;
        const notes = this.drawing.judgmentNotes;
        let low = 0;
        let high = notes.length;
        while (low < high) {
          const mid = low + high >>> 1;
          if (notes[mid].time < earliest) low = mid + 1;
          else high = mid;
        }
        for (let index = low; index < notes.length && notes[index].time <= latest; index += 1) {
          const { note, profile, id, time } = notes[index];
          const y = (stopTime - time) * this.drawing.timeHeight + this.yBaseTop;
          const x = this.drawing.laneWidth * (note.lane - 2) + this.drawing.lanePadding - 3;
          const width = this.drawing.laneWidth * note.width + 6;
          const flick = note instanceof Directional || note instanceof Slide && note.type === SlideType.END && note.directional;
          const top = Math.max(0, y - (flick ? this.drawing.flickHeight : 7));
          const label = this.drawing.judgmentProfiles[profile].label;
          parts.push(`<rect data-judge-note="${id}" data-profile="${profile}" data-center="${fmt(y)}" x="${fmt(x)}" y="${fmt(top)}" width="${fmt(width)}" height="${fmt(Math.min(bottom, y + 7) - top)}" fill="transparent" tabindex="0" role="button" aria-label="${escapeXml(label)}\u5224\u5B9A\u533A\u95F4" aria-pressed="false" style="cursor:pointer" />`);
        }
        return `<g data-judge-targets="" data-pixels-per-frame="${this.drawing.timeHeight / JUDGMENT_FPS}" data-bottom="${fmt(bottom)}">${parts.join("")}</g>`;
      }
      getBezierCoordinates(slide0, slide1) {
        const y0 = this.getRelativeY(slide0.bar);
        const y1 = this.getRelativeY(slide1.bar);
        const easeIn = Boolean(slide0.directional) && slide0.directional?.type === DirectionalType.DOWN;
        const easeOut = Boolean(slide0.directional) && (slide0.directional?.type === DirectionalType.LOWER_LEFT || slide0.directional?.type === DirectionalType.LOWER_RIGHT);
        const slidePathPadding = slide0.decoration ? 0 : this.drawing.slidePathPadding;
        return [
          [
            [this.drawing.laneWidth * (slide0.lane - 2) + this.drawing.lanePadding - slidePathPadding, y0],
            [
              this.drawing.laneWidth * (slide0.lane - 2) + this.drawing.lanePadding - slidePathPadding,
              easeIn ? (y0 + y1) / 2 : y0
            ],
            [
              this.drawing.laneWidth * (slide1.lane - 2) + this.drawing.lanePadding - slidePathPadding,
              easeOut ? (y0 + y1) / 2 : y1
            ],
            [this.drawing.laneWidth * (slide1.lane - 2) + this.drawing.lanePadding - slidePathPadding, y1]
          ],
          [
            [
              this.drawing.laneWidth * (slide0.lane - 2 + slide0.width) + this.drawing.lanePadding + slidePathPadding,
              y0
            ],
            [
              this.drawing.laneWidth * (slide0.lane - 2 + slide0.width) + this.drawing.lanePadding + slidePathPadding,
              easeIn ? (y0 + y1) / 2 : y0
            ],
            [
              this.drawing.laneWidth * (slide1.lane - 2 + slide1.width) + this.drawing.lanePadding + slidePathPadding,
              easeOut ? (y0 + y1) / 2 : y1
            ],
            [
              this.drawing.laneWidth * (slide1.lane - 2 + slide1.width) + this.drawing.lanePadding + slidePathPadding,
              y1
            ]
          ]
        ];
      }
      binarySolutionForX(y, curve) {
        let start = 0;
        let end = 1;
        for (let i = 0; i < 60; i += 1) {
          const t = (start + end) / 2;
          const p = this.bezierPoint(curve, t);
          if (Math.abs(p[1] - y) < 0.1) {
            return p[0];
          }
          if (p[1] > y) {
            start = t;
          } else {
            end = t;
          }
        }
        return this.bezierPoint(curve, (start + end) / 2)[0];
      }
      bezierPoint(curve, t) {
        const inv = 1 - t;
        const x = curve[0][0] * inv ** 3 + curve[1][0] * 3 * inv ** 2 * t + curve[2][0] * 3 * inv * t ** 2 + curve[3][0] * t ** 3;
        const y = curve[0][1] * inv ** 3 + curve[1][1] * 3 * inv ** 2 * t + curve[2][1] * 3 * inv * t ** 2 + curve[3][1] * t ** 3;
        return [x, y];
      }
      addFrictionAmongImage(note) {
        const y = this.getRelativeY(note.bar);
        const x = this.drawing.laneWidth * (note.lane + note.width / 2 - 2) + this.drawing.lanePadding;
        const w = this.drawing.laneWidth * 0.75;
        const h = this.drawing.laneWidth * 0.75;
        const suffix = note.isCritical() ? "_crtcl" : note instanceof Directional ? "_flick" : "_long";
        this.amongImages.push(
          `<image href="${escapeXml(`${this.drawing.noteHost}/notes_friction_among${suffix}.png`)}" x="${fmt(
            r(x - w / 2)
          )}" y="${fmt(r(y - h / 2))}" width="${fmt(r(w))}" height="${fmt(r(h))}"${this.noteTint(note)} />`
        );
      }
      addAmongImage(note, leftCurve, rightCurve) {
        const y = this.getRelativeY(note.bar);
        const xl = this.binarySolutionForX(y, leftCurve);
        const xr = this.binarySolutionForX(y, rightCurve);
        const x = (xl + xr) / 2;
        const w = this.drawing.laneWidth;
        const h = this.drawing.laneWidth;
        this.amongImages.push(
          `<image href="${escapeXml(
            `${this.drawing.noteHost}/notes_long_among${note.isCritical() ? "_crtcl" : ""}.png`
          )}" x="${fmt(r(x - w / 2))}" y="${fmt(r(y - h / 2))}" width="${fmt(r(w))}" height="${fmt(
            r(h)
          )}" />`
        );
      }
      /**
       * 沿贝塞尔曲线按 y 找参数并做 De Casteljau 拆分。
       * keepFirst=true 返回靠起点的一半（裁掉越过上边界的部分），
       * keepFirst=false 返回靠终点的一半（从下边界开始画到终点）。
       */
      clipBezierAtY(curve, yBoundary, keepFirst) {
        const y0 = curve[0][1];
        const y1 = curve[3][1];
        if ((y0 - yBoundary) * (y1 - yBoundary) >= 0) {
          return null;
        }
        let low = 0;
        let high = 1;
        let found = (low + high) / 2;
        for (let i = 0; i < 40; i += 1) {
          const t = (low + high) / 2;
          const y = this.bezierPoint(curve, t)[1];
          if (Math.abs(y - yBoundary) < 0.01) {
            found = t;
            break;
          }
          if ((y - yBoundary) * (y0 - yBoundary) > 0) {
            low = t;
          } else {
            high = t;
          }
          found = t;
        }
        return this.splitBezier(curve, found, keepFirst);
      }
      /** De Casteljau 拆分：first=true 返回靠 p0 的一半，否则靠 p3 的一半。 */
      splitBezier(curve, t, first) {
        const lerp = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        const [p0, p1, p2, p3] = curve;
        const p01 = lerp(p0, p1);
        const p12 = lerp(p1, p2);
        const p23 = lerp(p2, p3);
        const p012 = lerp(p01, p12);
        const p123 = lerp(p12, p23);
        const p0123 = lerp(p012, p123);
        return first ? [p0, p01, p012, p0123] : [p0123, p123, p23, p3];
      }
      /**
       * 链头是否在别的列。跨列的长条 body 只有 START 所在列画得出「自己那一段」，
       * 后续列里的 relay 必须自己接力画，否则每列边界处会断（比如 4 小节起的长 hold
       * 只画到第 8 小节）。
       */
      isChainContinuation(note) {
        const head = note.head;
        if (!head) {
          return false;
        }
        return head.bar.toNumber() < this.barStart - 1;
      }
      addSlidePath(slide) {
        const lefts = [];
        const rights = [];
        const boundaryBar = this.barStop + 1;
        let slide0 = slide;
        while (slide0 && slide0.type !== SlideType.END) {
          const amongs = [];
          let slide1 = slide0.next;
          while (slide1) {
            if (slide1.type === SlideType.RELAY) {
              amongs.push(slide1);
            }
            if (slide1.isPath()) {
              break;
            }
            slide1 = slide1.next;
          }
          if (!slide1) {
            break;
          }
          const [fullLeft, fullRight] = this.getBezierCoordinates(slide0, slide1);
          if (slide1.bar.toNumber() >= boundaryBar) {
            const yBoundary = this.getRelativeY(new Fraction(boundaryBar));
            const clippedLeft = this.clipBezierAtY(fullLeft, yBoundary, true);
            const clippedRight = this.clipBezierAtY(fullRight, yBoundary, true);
            if (clippedLeft && clippedRight) {
              lefts.push(clippedLeft);
              rights.push(clippedRight);
            }
            break;
          }
          lefts.push(fullLeft);
          rights.push(fullRight);
          for (const among of amongs) {
            this.addAmongImage(among, fullLeft, fullRight);
          }
          slide0 = slide1;
        }
        if (!lefts.length) {
          return;
        }
        this.emitSlidePath(slide, lefts, rights);
      }
      /**
       * END 所在列的「收尾段」：链条跨列且前一节点在别的列时，把 prev→END 的段
       * 裁在本列下边界以内，保证尾巴接得上。
       */
      addSlidePathTail(end) {
        const head = end.head;
        if (!head) {
          return;
        }
        let prev = null;
        let cursor = head;
        while (cursor && cursor !== end) {
          if (cursor.isPath()) {
            prev = cursor;
          }
          cursor = cursor.next;
        }
        if (!prev || prev.bar.toNumber() >= this.barStart - 1) {
          return;
        }
        const [fullLeft, fullRight] = this.getBezierCoordinates(prev, end);
        const yBoundary = this.getRelativeY(new Fraction(this.barStart - 1));
        const clippedLeft = this.clipBezierAtY(fullLeft, yBoundary, false);
        const clippedRight = this.clipBezierAtY(fullRight, yBoundary, false);
        if (!clippedLeft || !clippedRight) {
          return;
        }
        this.emitSlidePath(end, [clippedLeft], [clippedRight]);
      }
      /** 把 lefts/rights 一串贝塞尔拼成闭合 path 发出去（样式沿用链首的属性）。 */
      emitSlidePath(slide, lefts, rights) {
        if (!lefts.length) {
          return;
        }
        const commands = [];
        for (let i = 0; i < lefts.length; i += 1) {
          const l = lefts[i];
          if (i === 0) {
            commands.push(`M ${fmt(r(l[0][0]))} ${fmt(r(l[0][1]))}`);
          }
          commands.push(
            `C ${fmt(r(l[1][0]))} ${fmt(r(l[1][1]))} ${fmt(r(l[2][0]))} ${fmt(r(l[2][1]))} ${fmt(
              r(l[3][0])
            )} ${fmt(r(l[3][1]))}`
          );
        }
        for (let i = rights.length - 1; i >= 0; i -= 1) {
          const rr = rights[i];
          if (i === rights.length - 1) {
            commands.push(`L ${fmt(r(rr[3][0]))} ${fmt(r(rr[3][1]))}`);
          }
          commands.push(
            `C ${fmt(r(rr[2][0]))} ${fmt(r(rr[2][1]))} ${fmt(r(rr[1][0]))} ${fmt(r(rr[1][1]))} ${fmt(
              r(rr[0][0])
            )} ${fmt(r(rr[0][1]))}`
          );
        }
        commands.push("Z");
        const className = slide.decoration ? slide.isCritical() ? "decoration-critical" : "decoration" : slide.isCritical() ? "slide-critical" : "slide";
        let pathStyle = "";
        if (slide.decoration && !slide.isCritical() && slide.guideColor !== null && slide.guideColor >= 0) {
          const index = Math.min(slide.guideColor, GUIDE_COLORS.length - 1);
          pathStyle = ` style="fill:url(#decoration-gradient-${index})"`;
        } else if (!slide.decoration && !slide.isCritical() && slide.noteColor !== null) {
          const index = Math.min(Math.max(slide.noteColor, 0), GUIDE_COLORS.length - 1);
          pathStyle = ` style="fill:${GUIDE_COLORS[index]}cc"`;
        }
        this.slidePaths.push(`<path d="${commands.join(" ")}" class="${className}"${pathStyle} />`);
      }
      /**
       * damage（危险条）：换用 Next SEKAI 图集自带的 damage 皮肤
       * （`Sekai Damage Note Basic <Colour>`，已抽到 notes_new/<skin>/damage_<colour>.png）。
       * 不走 note-tint 滤镜，也不吃 critical 金色 —— 危险条永远只有这 8 个变体。
       */
      addDamageImage(note, opacity = 1) {
        const y = this.getRelativeY(note.bar);
        const x = this.drawing.laneWidth * (note.lane - 2) + this.drawing.lanePadding;
        const w = this.drawing.laneWidth * note.width;
        const h = this.drawing.laneWidth / 64 * 56 * 2;
        const colors = ["neutral", "red", "green", "blue", "yellow", "purple", "cyan", "black"];
        const index = note.noteColor !== null ? Math.min(Math.max(note.noteColor, 0), colors.length - 1) : 0;
        const src = `${this.drawing.noteHost}/damage_${colors[index]}.png`;
        const tag = `<image href="${escapeXml(src)}" x="${fmt(r(x))}" y="${fmt(
          r(y - h / 2)
        )}" width="${fmt(r(w))}" height="${fmt(r(h))}" />`;
        this.noteImages.push(opacity < 1 ? `<g opacity="${fmt(opacity)}">${tag}</g>` : tag);
      }
      /**
       * 音符颜色变体的统一入口：critical 保持金色精灵，没写 `style` 的保持默认配色。
       * 所有类型（tap / flick / trace / hold）都走这一条判断，避免各画各的。
       */
      noteTint(note) {
        if (note.isCritical() || note.noteColor === null || note.damage) {
          return "";
        }
        const index = Math.min(Math.max(note.noteColor, 0), GUIDE_COLORS.length - 1);
        return ` filter="url(#note-tint-${index})"`;
      }
      addNoteImage(note, opacity = 1) {
        if (note.damage) {
          this.addDamageImage(note, opacity);
          return;
        }
        const y = this.getRelativeY(note.bar);
        const x = this.drawing.laneWidth * (note.lane - 2.5) + this.drawing.lanePadding;
        const w = this.drawing.laneWidth * (note.width + 1);
        const h = this.drawing.laneWidth / 64 * 56 * 2;
        let noteNumber = 2;
        if (note.isNone()) {
          return;
        }
        if (note.isTrend()) {
          if (opacity >= 1) {
            this.addFrictionAmongImage(note);
          }
          if (note.isCritical()) {
            noteNumber = 5;
          } else if (note instanceof Directional) {
            noteNumber = 6;
          } else {
            noteNumber = 4;
          }
        } else if (note.isCritical()) {
          noteNumber = 0;
        } else if (note instanceof Directional) {
          noteNumber = 3;
        } else if (note instanceof Slide) {
          if (note.type === SlideType.END && note.directional) {
            noteNumber = 3;
          } else {
            noteNumber = 1;
          }
        }
        const spriteWidth = Math.min(this.drawing.nLanes, Math.max(1, Math.round(note.width)));
        const tint = this.noteTint(note);
        const useTag = `<use href="#notes-${noteNumber}-${spriteWidth}" x="${fmt(r(x))}" y="${fmt(
          r(y - h / 2)
        )}" width="${fmt(r(w))}" height="${fmt(r(h))}"${tint} />`;
        if (opacity < 1) {
          this.noteImages.push(`<g opacity="${fmt(opacity)}">${useTag}</g>`);
          return;
        }
        this.noteImages.push(useTag);
      }
      addNoteSpeedText(note) {
        if (note.isNone() && !(note instanceof Slide)) {
          return;
        }
        if (note instanceof Slide && note.head !== note) {
          return;
        }
        const speedRatio = getNoteSpeedRatio(note);
        if (!speedRatio) {
          return;
        }
        const y = this.getRelativeY(note.bar);
        const x = this.drawing.laneWidth * (note.lane - 2 + note.width / 2) + this.drawing.lanePadding;
        const text = formatSpeedRatio(speedRatio);
        this.noteSpeedTexts.push(
          `<text x="${fmt(r(x))}" y="${fmt(r(y))}" class="note-speed-text">${escapeXml(
            text
          )}</text>`
        );
      }
      addFlickImage(note) {
        if (note.isNone()) {
          return;
        }
        let type = DirectionalType.UP;
        if (note instanceof Directional) {
          if (note.type === DirectionalType.UPPER_LEFT) {
            type = DirectionalType.UPPER_LEFT;
          } else if (note.type === DirectionalType.UPPER_RIGHT) {
            type = DirectionalType.UPPER_RIGHT;
          }
        } else if (note.directional) {
          if (note.directional.type === DirectionalType.UPPER_LEFT) {
            type = DirectionalType.UPPER_LEFT;
          } else if (note.directional.type === DirectionalType.UPPER_RIGHT) {
            type = DirectionalType.UPPER_RIGHT;
          } else if (note.directional.type === DirectionalType.UP) {
            type = DirectionalType.UP;
          } else {
            type = null;
          }
        } else {
          type = null;
        }
        if (type === null) {
          return;
        }
        const width = note.width < 6 ? note.width : 6;
        const arrowSpriteWidth = Math.max(1, Math.min(6, Math.round(width)));
        const y = this.getRelativeY(note.bar);
        const h0 = this.drawing.flickHeight;
        const h = h0 * ((width + 3) / 3) ** 0.75;
        const w = h0 * 1.5 * ((width + 0.5) / 3) ** 0.75;
        const x = this.drawing.laneWidth * (note.lane - 2 + note.width / 2) + this.drawing.lanePadding;
        const bias = type === DirectionalType.UPPER_LEFT ? -this.drawing.noteSize / 4 : type === DirectionalType.UPPER_RIGHT ? this.drawing.noteSize / 4 : 0;
        const src = `${this.drawing.noteHost}/notes_flick_arrow${note.isCritical() ? "_crtcl" : ""}_0${arrowSpriteWidth}${type === DirectionalType.UPPER_LEFT || type === DirectionalType.UPPER_RIGHT ? "_diagonal" : ""}.png`;
        const transform = type === DirectionalType.UPPER_RIGHT ? ` transform="translate(${fmt(r((x + bias) * 2))} 0) scale(-1 1)"` : "";
        this.flickImages.push(
          `<image href="${escapeXml(src)}" x="${fmt(r(x - w / 2 + bias))}" y="${fmt(
            r(y + this.drawing.noteSize / 4 - h)
          )}" width="${fmt(r(w))}" height="${fmt(r(h))}"${transform}${this.noteTint(note)} />`
        );
      }
      addTickText(note, next) {
        const y = this.getRelativeY(note.bar);
        if (next === null) {
          this.tickTexts.push(
            `<line x1="${fmt(r(this.drawing.lanePadding - this.drawing.tick2Length))}" y1="${fmt(
              r(y)
            )}" x2="${fmt(r(this.drawing.lanePadding))}" y2="${fmt(r(y))}" class="tick-line" />`
          );
          return;
        }
        let interval;
        const noteBar2 = note.bar;
        const nextBar = next.bar;
        if (next === note || nextBar.equals(noteBar2) || nextBar.sub(noteBar2).compare(1) > 0 || nextBar.sub(noteBar2).compare(0.5) > 0 && Math.floor(nextBar.toNumber()) !== Math.floor(noteBar2.toNumber())) {
          interval = new Fraction(Math.floor(noteBar2.toNumber() + 1)).sub(noteBar2);
        } else {
          interval = nextBar.sub(noteBar2);
        }
        interval = interval.mul(this.drawing.score.getEvent(note.bar).barLength ?? new Fraction(4)).div(4);
        interval = interval.limitDenominator(100);
        if (interval.compare(0) === 0) {
          return;
        }
        const numerator = Number(interval.numerator);
        const denominator = Number(interval.denominator);
        const text = numerator !== 1 ? `${numerator}/${denominator}` : `/${denominator}`;
        this.tickTexts.push(
          `<line x1="${fmt(r(this.drawing.lanePadding - this.drawing.tickLength))}" y1="${fmt(
            r(y)
          )}" x2="${fmt(r(this.drawing.lanePadding))}" y2="${fmt(r(y))}" class="tick-line" />`
        );
        this.tickTexts.push(
          `<text x="${fmt(r(this.drawing.lanePadding - 4))}" y="${fmt(r(y - 2))}" class="tick-text">${escapeXml(
            text
          )}</text>`
        );
      }
      renderGhostNotes() {
        for (const ghostNote of this.sentenceGhostNotes) {
          if (ghostNote instanceof Tap) {
            this.addNoteImage(ghostNote, 0.35);
          } else if (ghostNote instanceof Directional) {
            this.addGhostFlickImage(ghostNote);
            this.addNoteImage(ghostNote, 0.35);
          } else if (ghostNote instanceof Slide) {
            this.addNoteImage(ghostNote, 0.35);
          }
        }
      }
      addGhostFlickImage(note) {
        if (note.isNone()) {
          return;
        }
        let type = DirectionalType.UP;
        if (note.type === DirectionalType.UPPER_LEFT) {
          type = DirectionalType.UPPER_LEFT;
        } else if (note.type === DirectionalType.UPPER_RIGHT) {
          type = DirectionalType.UPPER_RIGHT;
        }
        if (type === null) {
          return;
        }
        const width = note.width < 6 ? note.width : 6;
        const arrowSpriteWidth = Math.max(1, Math.min(6, Math.round(width)));
        const y = this.getRelativeY(note.bar);
        const h0 = this.drawing.flickHeight;
        const h = h0 * ((width + 3) / 3) ** 0.75;
        const w = h0 * 1.5 * ((width + 0.5) / 3) ** 0.75;
        const x = this.drawing.laneWidth * (note.lane - 2 + note.width / 2) + this.drawing.lanePadding;
        const bias = type === DirectionalType.UPPER_LEFT ? -this.drawing.noteSize / 4 : type === DirectionalType.UPPER_RIGHT ? this.drawing.noteSize / 4 : 0;
        const src = `${this.drawing.noteHost}/notes_flick_arrow${note.isCritical() ? "_crtcl" : ""}_0${arrowSpriteWidth}${type === DirectionalType.UPPER_LEFT || type === DirectionalType.UPPER_RIGHT ? "_diagonal" : ""}.png`;
        const transform = type === DirectionalType.UPPER_RIGHT ? ` transform="translate(${fmt(r((x + bias) * 2))} 0) scale(-1 1)"` : "";
        this.flickImages.push(
          `<g opacity="0.35"><image href="${escapeXml(src)}" x="${fmt(r(x - w / 2 + bias))}" y="${fmt(
            r(y + this.drawing.noteSize / 4 - h)
          )}" width="${fmt(r(w))}" height="${fmt(r(h))}"${transform} /></g>`
        );
      }
      renderCrashMarkers() {
        for (const marker of this.sentenceCrashMarkers) {
          const y = this.getRelativeY(marker.bar);
          const cx = this.drawing.laneWidth * (marker.lane + marker.width / 2) + this.drawing.lanePadding;
          const r2 = Math.max(10, 8 + marker.width * 2);
          const labelY = y - 18 - marker.markerIndex * 18;
          this.crashMarkerElements.push(
            `<circle cx="${fmt(cx)}" cy="${fmt(y)}" r="${fmt(r2)}" fill="${marker.color}" fill-opacity="0.16" stroke="${marker.color}" stroke-width="3" />`
          );
          this.crashMarkerElements.push(
            `<circle cx="${fmt(cx)}" cy="${fmt(y)}" r="4" fill="${marker.color}" />`
          );
          this.crashMarkerElements.push(
            `<line x1="${fmt(cx)}" y1="${fmt(y)}" x2="${fmt(cx)}" y2="${fmt(labelY)}" stroke="${marker.color}" stroke-width="2" stroke-dasharray="4 3" />`
          );
          this.crashMarkerElements.push(
            `<text x="${fmt(cx)}" y="${fmt(labelY)}" text-anchor="middle" font-size="16" font-weight="700" fill="${marker.color}" stroke="#ffffff" stroke-width="4" paint-order="stroke fill">${escapeXml(marker.label)}</text>`
          );
        }
      }
      renderFocusAnchors() {
        const anchors = [];
        for (const anchor of this.sentenceFocusAnchors) {
          const y = this.getRelativeY(anchor.bar);
          const cx = this.drawing.laneWidth * (anchor.lane + anchor.width / 2) + this.drawing.lanePadding;
          anchors.push(
            `<circle id="sus-conflict-focus-${anchor.diagnosticId}" cx="${fmt(cx)}" cy="${fmt(y)}" r="1" fill="transparent" />`
          );
        }
        return anchors.join("\n");
      }
      renderSpeedPoint(point, condensed = false) {
        const laneStart = this.drawing.lanePadding;
        const laneEnd = this.drawing.laneWidth * this.drawing.nLanes + laneStart;
        return [
          `<line x1="${fmt(r(laneStart))}" y1="${fmt(r(point.y))}" x2="${fmt(r(laneEnd))}" y2="${fmt(r(point.y))}" class="${condensed ? "speed-line-condensed" : "speed-line"}" />`,
          `<text x="${fmt(r(laneEnd - 2))}" y="${fmt(r(point.y - 2))}" class="speed-text">${escapeXml(
            formatSpeedRatio(point.event.speed)
          )}</text>`
        ];
      }
      renderDenseSpeedGroup(points, visibleTop, visibleBottom) {
        const head = points[0];
        const tail = points[points.length - 1];
        const parts = [];
        if (visibleTop <= head.y && head.y <= visibleBottom) {
          parts.push(...this.renderSpeedPoint(head, true));
        }
        if (tail !== head && visibleTop <= tail.y && tail.y <= visibleBottom) {
          parts.push(...this.renderSpeedPoint(tail, true));
        }
        const arrowStartY = Math.max(visibleTop, Math.min(visibleBottom, head.y));
        const arrowEndY = Math.max(visibleTop, Math.min(visibleBottom, tail.y));
        const arrowX = this.drawing.laneWidth * this.drawing.nLanes + this.drawing.lanePadding * 1.5;
        if (Math.abs(arrowStartY - arrowEndY) >= 12) {
          const direction = Math.sign(arrowEndY - arrowStartY);
          const lineEndY = arrowEndY - direction * 7;
          const arrowBaseY = arrowEndY - direction * 8;
          parts.push(
            `<line x1="${fmt(r(arrowX))}" y1="${fmt(r(arrowStartY))}" x2="${fmt(r(arrowX))}" y2="${fmt(r(lineEndY))}" class="speed-trend-line" />`,
            `<polygon points="${fmt(r(arrowX))},${fmt(r(arrowEndY))} ${fmt(r(arrowX - 4))},${fmt(r(arrowBaseY))} ${fmt(r(arrowX + 4))},${fmt(r(arrowBaseY))}" class="speed-trend-head" />`
          );
        }
        return parts;
      }
      renderSpeedEvents() {
        const visibleTop = 0;
        const visibleBottom = this.drawing.timeHeight * this.drawing.score.getTimeDelta(this.barStart, this.barStop) + this.drawing.timePadding * 2;
        const margin = SPEED_DENSE_MAX_GAP * SPEED_DENSE_MIN_POINTS;
        const points = this.drawing.score.events.filter((event) => event.speed !== null).map((event) => ({
          event,
          y: this.drawing.timeHeight * this.drawing.score.getTimeDelta(event.bar, this.barStop) + this.drawing.timePadding
        })).filter((point) => visibleTop - margin <= point.y && point.y <= visibleBottom + margin);
        const parts = [];
        for (let start = 0; start < points.length; ) {
          let end = start + 1;
          while (end < points.length && Math.abs(points[end].y - points[end - 1].y) <= SPEED_DENSE_MAX_GAP) {
            end += 1;
          }
          const group = points.slice(start, end);
          if (this.drawing.condenseSpeedTrend && group.length >= SPEED_DENSE_MIN_POINTS) {
            parts.push(...this.renderDenseSpeedGroup(group, visibleTop, visibleBottom));
          } else {
            for (const point of group) {
              if (visibleTop <= point.y && point.y <= visibleBottom) {
                parts.push(...this.renderSpeedPoint(point));
              }
            }
          }
          start = end;
        }
        return parts;
      }
      renderEvents() {
        const parts = [];
        for (let bar = this.barStart; bar <= this.barStop; bar += 1) {
          parts.push(
            `<line x1="${fmt(r(this.drawing.lanePadding))}" y1="${fmt(
              r(this.drawing.timeHeight * this.drawing.score.getTimeDelta(bar, this.barStop) + this.drawing.timePadding)
            )}" x2="${fmt(r(this.drawing.laneWidth * this.drawing.nLanes + this.drawing.lanePadding))}" y2="${fmt(
              r(this.drawing.timeHeight * this.drawing.score.getTimeDelta(bar, this.barStop) + this.drawing.timePadding)
            )}" class="bar-line" />`
          );
          const event = this.drawing.score.getEvent(bar);
          const eventBarLength = event.barLength ?? new Fraction(4);
          for (let i = 1; i < Math.ceil(eventBarLength.toNumber()); i += 1) {
            const t = this.drawing.score.getTimeDelta(
              new Fraction(bar).add(new Fraction(i, eventBarLength)),
              this.barStop
            );
            const y = this.drawing.timeHeight * t + this.drawing.timePadding;
            parts.push(
              `<line x1="${fmt(r(this.drawing.lanePadding))}" y1="${fmt(r(y))}" x2="${fmt(
                r(this.drawing.laneWidth * this.drawing.nLanes + this.drawing.lanePadding)
              )}" y2="${fmt(r(y))}" class="beat-line" />`
            );
          }
        }
        const printEvents = [];
        const mergedEvents = [
          ...Array.from(
            { length: this.barStop - this.barStart + 1 },
            (_, i) => new Event({ bar: this.barStart + i })
          ),
          ...this.drawing.score.events
        ].sort((a, b) => a.bar.compare(b.bar));
        parts.push(...this.renderSpeedEvents());
        for (const event of mergedEvents) {
          const eventY = this.drawing.timeHeight * this.drawing.score.getTimeDelta(event.bar, this.barStop) + this.drawing.timePadding;
          const hasEventText = Boolean(
            event.bpm || event.barLength || event.section || event.text || event.seVolume !== null
          );
          if (event.speed !== null && !hasEventText) {
            continue;
          }
          const last2 = printEvents[printEvents.length - 1];
          if (last2 && event.bar.sub(last2.bar).compare(new Fraction(1, 16)) <= 0) {
            printEvents[printEvents.length - 1] = last2.merge(event);
          } else {
            printEvents.push(cloneEvent(event));
          }
          const special = Boolean(
            event.bpm || event.barLength || event.speed || event.seVolume !== null || event.section || event.text
          );
          parts.push(
            `<line x1="${fmt(r(0))}" y1="${fmt(r(eventY))}" x2="${fmt(r(this.drawing.lanePadding))}" y2="${fmt(
              r(eventY)
            )}" class="${special ? "event-flag" : "bar-count-flag"}" />`
          );
        }
        for (const event of printEvents) {
          if (!(this.barStart - 1 <= event.bar.toNumber() && event.bar.toNumber() < this.barStop + 1)) {
            continue;
          }
          const text = [
            Math.abs(event.bar.toNumber() - Math.round(event.bar.toNumber())) < 1e-9 ? `#${formatBar(event.bar)}` : null,
            event.bpm ? `${fmt(event.bpm.toNumber())} BPM` : null,
            event.barLength ? `${fmt(event.barLength.toNumber())}/4` : null,
            event.seVolume !== null ? `SE ${fmt(event.seVolume)}` : null,
            event.section,
            event.text
          ].filter((v) => Boolean(v)).join(", ");
          if (!text.length) {
            continue;
          }
          const special = Boolean(
            event.bpm || event.barLength || event.speed || event.seVolume !== null || event.section || event.text
          );
          const y = this.drawing.timeHeight * this.drawing.score.getTimeDelta(event.bar, this.barStop) + this.drawing.timePadding;
          parts.push(
            `<text x="${fmt(r(this.drawing.lanePadding + 8))}" y="${fmt(r(y - this.drawing.laneWidth * 1.5))}" transform="rotate(-90 ${fmt(
              r(this.drawing.lanePadding)
            )} ${fmt(r(y))})" class="${special ? "event-text" : "bar-count-text"}">${escapeXml(
              text
            )}</text>`
          );
        }
        return parts;
      }
      render() {
        for (let i = 0; i < this.drawing.score.notes.length; i += 1) {
          const note = this.drawing.score.notes[i];
          if (note instanceof Slide) {
            let slide = note.head;
            let before = false;
            while (slide) {
              while (slide && !slide.isPath()) {
                slide = slide.next;
              }
              if (!slide) {
                break;
              }
              const bar = slide.bar.toNumber();
              if (this.barStart - 1 <= bar && bar < this.barStop + 1) {
                break;
              }
              if (bar < this.barStart - 1) {
                before = true;
              } else if (before && this.barStop + 1 < bar) {
                slide = null;
                break;
              }
              slide = slide.next;
            }
            if (!slide) {
              continue;
            }
          } else {
            const bar = note.bar.toNumber();
            if (!(this.barStart - 1 <= bar && bar < this.barStop + 1)) {
              continue;
            }
          }
          const rhythmTickState = getRhythmTickState(note);
          if (rhythmTickState !== null) {
            let nextTick = null;
            if (rhythmTickState) {
              nextTick = note;
              for (let j = i; j < this.drawing.score.notes.length; j += 1) {
                const candidate = this.drawing.score.notes[j];
                if (getRhythmTickState(candidate) && candidate.bar.compare(note.bar) > 0) {
                  nextTick = candidate;
                  break;
                }
              }
            }
            this.addTickText(note, nextTick);
          }
          this.addNoteSpeedText(note);
          if (note instanceof Tap) {
            this.addNoteImage(note);
          } else if (note instanceof Directional) {
            this.addFlickImage(note);
            this.addNoteImage(note);
          } else if (!note.decoration) {
            if (note.type === SlideType.START) {
              this.addSlidePath(note);
              this.addNoteImage(note);
            } else if (note.type === SlideType.END) {
              if (note.directional) {
                this.addFlickImage(note);
              }
              this.addNoteImage(note);
              if (this.isChainContinuation(note)) {
                this.addSlidePathTail(note);
              }
            } else if (this.isChainContinuation(note)) {
              this.addSlidePath(note);
            }
          } else {
            if (note.type === SlideType.START) {
              this.addSlidePath(note);
            } else if (note.type === SlideType.END) {
              if (this.isChainContinuation(note)) {
                this.addSlidePathTail(note);
              }
            } else if (this.isChainContinuation(note)) {
              this.addSlidePath(note);
            }
            if (note.tap) {
              this.addNoteImage(note.tap);
              if (note.directional) {
                this.addFlickImage(note);
              }
            }
          }
        }
        this.renderGhostNotes();
        this.renderCrashMarkers();
        const height = this.drawing.timeHeight * this.drawing.score.getTimeDelta(this.barStart, this.barStop);
        const parts = [];
        parts.push(
          `<rect x="0" y="0" width="${fmt(r(this.drawing.laneWidth * this.drawing.nLanes + this.drawing.lanePadding * 2))}" height="${fmt(
            r(height + this.drawing.timePadding * 2)
          )}" class="background" />`
        );
        parts.push(
          `<rect x="${fmt(r(this.drawing.lanePadding))}" y="0" width="${fmt(
            r(this.drawing.laneWidth * this.drawing.nLanes)
          )}" height="${fmt(r(height + this.drawing.timePadding * 2))}" class="lane" />`
        );
        for (let lane = 0; lane <= this.drawing.nLanes; lane += 2) {
          const x = this.drawing.laneWidth * lane + this.drawing.lanePadding;
          parts.push(
            `<line x1="${fmt(r(x))}" y1="0" x2="${fmt(r(x))}" y2="${fmt(r(
              height + this.drawing.timePadding * 2
            ))}" class="lane-line" />`
          );
        }
        parts.push(...this.renderEvents());
        parts.push('<g clip-path="url(#lane-clip)">');
        parts.push(...this.slidePaths);
        parts.push(...this.noteImages);
        parts.push(...this.amongImages);
        parts.push(...this.flickImages.slice().reverse());
        parts.push("</g>");
        parts.push(...this.noteSpeedTexts);
        parts.push(...this.crashMarkerElements);
        parts.push(...this.tickTexts);
        parts.push(this.renderJudgmentTargets(height));
        const focusAnchors = this.renderFocusAnchors();
        if (focusAnchors) {
          parts.push(focusAnchors);
        }
        return {
          content: parts.join("\n"),
          width: Math.round(this.drawing.laneWidth * this.drawing.nLanes + this.drawing.lanePadding * 2),
          height: Math.round(height + this.drawing.timePadding * 2)
        };
      }
    };
    DrawingRenderer = class {
      constructor(score, options) {
        __publicField(this, "score");
        __publicField(this, "nLanes");
        __publicField(this, "laneWidth");
        __publicField(this, "timeHeight");
        __publicField(this, "noteSize");
        __publicField(this, "flickHeight");
        __publicField(this, "lanePadding");
        __publicField(this, "timePadding");
        __publicField(this, "slidePathPadding");
        __publicField(this, "metaSize");
        __publicField(this, "tickLength");
        __publicField(this, "tick2Length");
        __publicField(this, "noteHost");
        __publicField(this, "styleSheet");
        __publicField(this, "ghostNotes");
        __publicField(this, "crashMarkers");
        __publicField(this, "focusAnchors");
        __publicField(this, "condenseSpeedTrend");
        __publicField(this, "interactiveJudgment");
        __publicField(this, "judgmentProfiles", []);
        __publicField(this, "judgmentNotes");
        this.score = score;
        this.nLanes = options.nLanes ?? 12;
        this.noteHost = options.noteHost;
        this.laneWidth = options.laneWidth ?? 16;
        this.timeHeight = options.timeHeight ?? 360;
        this.noteSize = options.noteSize ?? 16;
        this.flickHeight = options.flickHeight ?? 24;
        this.lanePadding = options.lanePadding ?? 40;
        this.timePadding = options.timePadding ?? 32;
        this.slidePathPadding = options.slidePathPadding ?? -1;
        this.metaSize = options.metaSize ?? 192;
        this.tickLength = options.tickLength ?? 24;
        this.tick2Length = options.tick2Length ?? 8;
        this.ghostNotes = options.ghostNotes ?? [];
        this.crashMarkers = options.crashMarkers ?? [];
        this.focusAnchors = options.focusAnchors ?? [];
        this.condenseSpeedTrend = options.condenseSpeedTrend ?? true;
        this.interactiveJudgment = options.interactiveJudgment ?? false;
        const profiles = /* @__PURE__ */ new Map();
        this.judgmentNotes = this.interactiveJudgment ? score.notes.flatMap((note, id) => {
          const judgment = getNoteJudgment(note);
          if (!judgment) return [];
          const key = JSON.stringify(judgment);
          let profile = profiles.get(key);
          if (profile === void 0) {
            profile = this.judgmentProfiles.length;
            profiles.set(key, profile);
            this.judgmentProfiles.push(judgment);
          }
          return [{ note, profile, id, time: score.getTime(note.bar) }];
        }).sort((a, b) => a.time - b.time) : [];
        this.styleSheet = `${DEFAULT_STYLE}
${WHITE_STYLE}${options.styleSheet ? `
${options.styleSheet}` : ""}`;
      }
      renderNoteDefinitions() {
        const ratio = 1200;
        const defs = [];
        for (let noteNumber = 0; noteNumber <= 6; noteNumber += 1) {
          defs.push(
            `<symbol id="notes-${noteNumber}" viewBox="0 0 112 56"><image href="${escapeXml(
              `${this.noteHost}/notes_${noteNumber}.png`
            )}" x="-3" y="-3" width="118" height="62" /></symbol>`
          );
          defs.push(
            `<symbol id="notes-${noteNumber}-middle" viewBox="0 0 ${112 * ratio} 56"><image href="${escapeXml(
              `${this.noteHost}/notes_${noteNumber}.png`
            )}" x="${fmt(-(3 + 28) * ratio)}" y="-3" width="${fmt(118 * ratio)}" height="62" preserveAspectRatio="none" /></symbol>`
          );
          for (let i = 1; i <= this.nLanes; i += 1) {
            const noteHeight = this.noteSize;
            const noteWidth2 = this.laneWidth * (i + 1);
            const noteInnerWidth = this.laneWidth * i;
            const noteLWidth = noteHeight / 56 * 32;
            const noteRWidth = noteLWidth;
            const noteMWidth = noteInnerWidth - (noteLWidth + noteRWidth) / 2 - 2;
            const notePaddingX = (noteWidth2 - noteLWidth - noteMWidth - noteRWidth) / 2;
            defs.push(
              `<symbol id="notes-${noteNumber}-${i}" viewBox="0 0 ${fmt(noteWidth2)} ${fmt(noteHeight)}"><clipPath id="notes-${noteNumber}-${i}-left"><rect x="0" y="0" width="${fmt(
                noteLWidth
              )}" height="${fmt(noteHeight)}" /></clipPath><clipPath id="notes-${noteNumber}-${i}-middle"><rect x="0" y="0" width="${fmt(
                noteMWidth
              )}" height="${fmt(noteHeight)}" /></clipPath><clipPath id="notes-${noteNumber}-${i}-right"><rect x="${fmt(
                noteHeight / 56 * 80
              )}" y="0" width="${fmt(noteRWidth)}" height="${fmt(noteHeight)}" /></clipPath><use href="#notes-${noteNumber}" x="${fmt(notePaddingX)}" y="0" width="${fmt(
                noteHeight * 2
              )}" height="${fmt(noteHeight)}" clip-path="url(#notes-${noteNumber}-${i}-left)" /><use href="#notes-${noteNumber}-middle" x="${fmt(
                notePaddingX + noteLWidth
              )}" y="0" width="${fmt(noteHeight * ratio * 2)}" height="${fmt(
                noteHeight
              )}" clip-path="url(#notes-${noteNumber}-${i}-middle)" /><use href="#notes-${noteNumber}" x="${fmt(
                notePaddingX + noteLWidth + noteMWidth + noteRWidth - noteHeight * 2
              )}" y="0" width="${fmt(noteHeight * 2)}" height="${fmt(
                noteHeight
              )}" clip-path="url(#notes-${noteNumber}-${i}-right)" /></symbol>`
            );
          }
        }
        const damageVariants = ["neutral", "red", "green", "blue", "yellow", "purple", "cyan", "black"];
        for (let variant = 0; variant < damageVariants.length; variant += 1) {
          const base = `notes-damage-${variant}`;
          const image = `${this.noteHost}/damage_${damageVariants[variant]}.png`;
          defs.push(
            `<symbol id="${base}" viewBox="0 0 112 56"><image href="${escapeXml(image)}" x="-3" y="-3" width="118" height="62" /></symbol>`
          );
          defs.push(
            `<symbol id="${base}-middle" viewBox="0 0 ${112 * ratio} 56"><image href="${escapeXml(image)}" x="${fmt(-(3 + 28) * ratio)}" y="-3" width="${fmt(118 * ratio)}" height="62" preserveAspectRatio="none" /></symbol>`
          );
          for (let i = 1; i <= this.nLanes; i += 1) {
            const noteHeight = this.noteSize;
            const noteWidth2 = this.laneWidth * (i + 1);
            const noteInnerWidth = this.laneWidth * i;
            const noteLWidth = noteHeight / 56 * 32;
            const noteRWidth = noteLWidth;
            const noteMWidth = noteInnerWidth - (noteLWidth + noteRWidth) / 2 - 2;
            const notePaddingX = (noteWidth2 - noteLWidth - noteMWidth - noteRWidth) / 2;
            defs.push(
              `<symbol id="${base}-${i}" viewBox="0 0 ${fmt(noteWidth2)} ${fmt(noteHeight)}"><clipPath id="${base}-${i}-left"><rect x="0" y="0" width="${fmt(noteLWidth)}" height="${fmt(noteHeight)}" /></clipPath><clipPath id="${base}-${i}-middle"><rect x="0" y="0" width="${fmt(noteMWidth)}" height="${fmt(noteHeight)}" /></clipPath><clipPath id="${base}-${i}-right"><rect x="${fmt(noteHeight / 56 * 80)}" y="0" width="${fmt(noteRWidth)}" height="${fmt(noteHeight)}" /></clipPath><use href="#${base}" x="${fmt(notePaddingX)}" y="0" width="${fmt(noteHeight * 2)}" height="${fmt(noteHeight)}" clip-path="url(#${base}-${i}-left)" /><use href="#${base}-middle" x="${fmt(notePaddingX + noteLWidth)}" y="0" width="${fmt(noteHeight * ratio * 2)}" height="${fmt(noteHeight)}" clip-path="url(#${base}-${i}-middle)" /><use href="#${base}" x="${fmt(notePaddingX + noteLWidth + noteMWidth + noteRWidth - noteHeight * 2)}" y="0" width="${fmt(noteHeight * 2)}" height="${fmt(noteHeight)}" clip-path="url(#${base}-${i}-right)" /></symbol>`
            );
          }
        }
        return defs.join("\n");
      }
      render() {
        if (!this.score.notes.length) {
          throw new Error("\u8C31\u9762\u4E2D\u6CA1\u6709\u53EF\u6E32\u67D3\u7684\u97F3\u7B26");
        }
        const nBars = Math.ceil(this.score.notes[this.score.notes.length - 1].bar.toNumber());
        const drawings = [];
        let totalWidth = 0;
        let totalHeight = 0;
        let bar = 0;
        let event = new Event({
          bar: 0,
          bpm: 120,
          barLength: 4,
          sentenceLength: 4
        });
        for (let i = 0; i <= nBars; i += 1) {
          const currentEvent = this.score.getEvent(i);
          const currentSentenceLength = currentEvent.sentenceLength || 4;
          const previousSentenceLength = event.sentenceLength || 4;
          if (bar !== i && (currentEvent.section !== event.section || currentSentenceLength !== previousSentenceLength || i === bar + previousSentenceLength || i === nBars)) {
            const sentenceGhosts = this.ghostNotes.filter((note) => {
              const noteBar2 = note.bar.toNumber();
              return noteBar2 >= bar - 1 && noteBar2 < i + 1;
            });
            const sentenceCrash = this.crashMarkers.filter((marker) => {
              const markerBar = marker.bar.toNumber();
              return markerBar >= bar - 1 && markerBar < i + 1;
            });
            const sentenceFocus = this.focusAnchors.filter((anchor) => {
              const anchorBar = anchor.bar.toNumber();
              return anchorBar >= bar - 1 && anchorBar < i + 1;
            });
            const sentence = new SentenceRenderer(
              this,
              bar,
              i,
              sentenceGhosts.length ? sentenceGhosts : void 0,
              sentenceCrash.length ? sentenceCrash : void 0,
              sentenceFocus.length ? sentenceFocus : void 0
            ).render();
            drawings.push(sentence);
            totalWidth += sentence.width;
            if (totalHeight < sentence.height) {
              totalHeight = sentence.height;
            }
            bar = i;
          }
          event = event.merge(currentEvent);
        }
        const width = totalWidth + this.lanePadding * 2;
        const height = totalHeight + this.timePadding * 2 + this.metaSize + this.timePadding * 2;
        const parts = [];
        parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
        parts.push(
          `<svg xmlns="http://www.w3.org/2000/svg"${this.interactiveJudgment ? ' data-judge-preview=""' : ""} width="${fmt(width)}" height="${fmt(
            height
          )}" viewBox="0 0 ${fmt(width)} ${fmt(height)}">`
        );
        if (this.interactiveJudgment) parts.push(`<metadata data-judge-profiles="">${escapeXml(JSON.stringify(this.judgmentProfiles))}</metadata>`);
        parts.push("<defs>");
        parts.push(`<style><![CDATA[${this.styleSheet}]]></style>`);
        parts.push(
          `<linearGradient id="decoration-gradient" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--color-start)" /><stop offset="1" stop-color="var(--color-stop)" /></linearGradient>`
        );
        parts.push(
          `<linearGradient id="decoration-critical-gradient" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--color-start)" /><stop offset="1" stop-color="var(--color-stop)" /></linearGradient>`
        );
        GUIDE_COLORS.forEach((color, index) => {
          parts.push(
            `<linearGradient id="decoration-gradient-${index}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${color}99" /><stop offset="1" stop-color="${color}33" /></linearGradient>`
          );
          parts.push(
            `<filter id="note-tint-${index}" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0" result="gray" /><feFlood flood-color="${color}" result="tint" /><feComposite in="tint" in2="SourceAlpha" operator="in" result="tintMasked" /><feBlend in="gray" in2="tintMasked" mode="multiply" /></filter>`
          );
        });
        parts.push(this.renderNoteDefinitions());
        const clipLeft = this.lanePadding - LANE_GUTTER * this.laneWidth;
        const clipWidth = (this.nLanes + LANE_GUTTER * 2) * this.laneWidth;
        parts.push(
          `<clipPath id="lane-clip" clipPathUnits="userSpaceOnUse"><rect x="${fmt(clipLeft)}" y="-100000" width="${fmt(
            clipWidth
          )}" height="200000" /></clipPath>`
        );
        parts.push("</defs>");
        parts.push(
          `<rect x="0" y="0" width="${fmt(width)}" height="${fmt(
            totalHeight + this.timePadding * 2
          )}" class="background" />`
        );
        parts.push(
          `<rect x="0" y="${fmt(totalHeight + this.timePadding * 2)}" width="${fmt(width)}" height="${fmt(
            this.metaSize + this.timePadding * 2
          )}" class="meta" />`
        );
        parts.push(
          `<line x1="0" y1="${fmt(totalHeight + this.timePadding * 2)}" x2="${fmt(width)}" y2="${fmt(
            totalHeight + this.timePadding * 2
          )}" class="meta-line" />`
        );
        parts.push(
          `<image href="${escapeXml(
            this.score.meta.jacket || `${this.noteHost}/../../logo.png`
          )}" x="${fmt(this.lanePadding * 2)}" y="${fmt(
            totalHeight + this.timePadding * 3
          )}" width="${fmt(this.metaSize)}" height="${fmt(this.metaSize)}" />`
        );
        const title = [this.score.meta.title, this.score.meta.artist].filter((x2) => x2).join(" - ") || "Untitled";
        parts.push(
          `<text x="${fmt(this.metaSize + this.lanePadding * 4)}" y="${fmt(
            this.metaSize + totalHeight + this.timePadding * 3 - 16
          )}" class="title">${escapeXml(title)}</text>`
        );
        const subtitle = [
          this.score.meta.difficulty ? String(this.score.meta.difficulty).toUpperCase() : null,
          this.score.meta.playlevel,
          "\u8B5C\u9762\u78BA\u8A8D"
        ].filter((x2) => x2).join(" ");
        parts.push(
          `<text x="${fmt(this.metaSize + this.lanePadding * 4)}" y="${fmt(
            this.metaSize / 3 + totalHeight + this.timePadding * 3 - 8
          )}" class="subtitle">${escapeXml(subtitle)}</text>`
        );
        let x = 0;
        for (const drawing of drawings) {
          const tx = x + this.lanePadding;
          const ty = totalHeight - drawing.height + this.timePadding;
          parts.push(
            `<svg x="${fmt(tx)}" y="${fmt(ty)}" width="${fmt(drawing.width)}" height="${fmt(
              drawing.height
            )}" viewBox="0 0 ${fmt(drawing.width)} ${fmt(drawing.height)}" style="overflow:hidden">${drawing.content}</svg>`
          );
          x += drawing.width;
        }
        parts.push("</svg>");
        return {
          svg: parts.join("\n"),
          width: Math.round(width),
          height: Math.round(height)
        };
      }
    };
    renderScoreToSvg = (score, options) => {
      const renderer = new DrawingRenderer(score, options);
      return renderer.render();
    };
    defaultSus2ImgStyleSheet = `${DEFAULT_STYLE}
${WHITE_STYLE}`;
  }
});

// src/site/vendor/sus2img/index.ts
var init_sus2img = __esm({
  "src/site/vendor/sus2img/index.ts"() {
    "use strict";
    init_fraction();
    init_customScoreJson();
    init_rebase();
    init_renderer2();
  }
});

// src/site/lib/chartImage.ts
function normalizePixel(pixel) {
  if (pixel === void 0 || pixel === "") {
    return DEFAULT_PIXEL;
  }
  const value = Number(pixel);
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    throw new Error("\u6BCF\u79D2\u957F\u5EA6\u5FC5\u987B\u662F\u6570\u5B57");
  }
  if (value > MAX_PIXEL) {
    throw new Error("\u6BCF\u79D2\u957F\u5EA6\u4E0D\u80FD\u8D85\u8FC7 600");
  }
  return Math.max(1, Math.floor(value));
}
function resolveJacketPath(jacket) {
  const trimmed = (jacket ?? "").trim();
  if (!trimmed) {
    return DEFAULT_JACKET;
  }
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:") || trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    return trimmed;
  }
  return `/${trimmed.replace(/^\/+/, "")}`;
}
function parseRebase(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("rebase.json \u4E0D\u662F\u5408\u6CD5 JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("rebase.json \u5FC5\u987B\u662F\u5BF9\u8C61");
  }
  return parsed;
}
function createScore(input) {
  const score = scoreFromCustomScoreJson(input.scoreJson, {
    title: input.title ?? "",
    artist: input.artist ?? "",
    author: input.author ?? "",
    difficulty: input.difficulty ?? "",
    playlevel: input.playlevel ?? "",
    songId: input.songId ?? ""
  });
  const rebaseText = (input.rebase ?? "").trim();
  const finalScore = rebaseText ? applyRebase(score, parseRebase(rebaseText)) : score;
  finalScore.meta.jacket = resolveJacketPath(input.jacket);
  let playlevel = `${input.playlevel ?? ""}`;
  if (!input.isOfficial) {
    playlevel += " \u5275\u4F5C\u8B5C\u9762";
  }
  if ((input.author ?? "").trim()) {
    playlevel += ` by ${input.author?.trim()}`;
  }
  finalScore.meta.playlevel = playlevel.trim();
  return finalScore;
}
function renderChartImageSvg(input) {
  const score = createScore(input);
  const rendered = renderScoreToSvg(score, {
    noteHost: `${NOTE_ASSET_ROOT}/${input.skin ?? "custom01"}`,
    noteSize: 18,
    timeHeight: normalizePixel(input.pixel),
    condenseSpeedTrend: input.condenseSpeedTrend,
    interactiveJudgment: input.interactiveJudgment
  });
  return {
    svgText: rendered.svg,
    width: rendered.width,
    height: rendered.height
  };
}
function generateRebaseJson(scoreJson, meta = {}) {
  return stringifyRebaseFromScore(
    scoreFromCustomScoreJson(scoreJson, {
      title: meta.title ?? "",
      artist: meta.artist ?? "",
      author: meta.author ?? "",
      difficulty: meta.difficulty ?? "",
      playlevel: meta.playlevel ?? ""
    })
  );
}
async function inlineSvgImages(svgText) {
  if (typeof window === "undefined" || typeof fetch === "undefined" || typeof FileReader === "undefined") {
    return svgText;
  }
  const hrefs = Array.from(
    new Set(
      [...svgText.matchAll(/href="([^"]+)"/g)].map((match) => match[1]).filter((href) => href && !href.startsWith("#") && !href.startsWith("data:") && !href.startsWith("blob:"))
    )
  );
  if (!hrefs.length) {
    return svgText;
  }
  const dataUrlMap = /* @__PURE__ */ new Map();
  await Promise.all(
    hrefs.map(async (href) => {
      try {
        const response = await fetch(resolveHrefForFetch(href));
        if (!response.ok) {
          return;
        }
        dataUrlMap.set(href, await blobToDataUrl(await response.blob()));
      } catch {
      }
    })
  );
  let inlined = svgText;
  for (const [href, dataUrl] of dataUrlMap) {
    inlined = inlined.replaceAll(`href="${href}"`, `href="${dataUrl}"`);
  }
  return inlined;
}
function svgToBlob(svgText) {
  return new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
}
async function svgToPngBlob(svgText, width, height) {
  if (typeof document === "undefined" || typeof Image === "undefined") {
    throw new Error("\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301\u524D\u7AEF PNG \u8F6C\u6362");
  }
  const svgUrl = URL.createObjectURL(svgToBlob(svgText));
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("SVG \u8F6C PNG \u65F6\u56FE\u7247\u8F7D\u5165\u5931\u8D25"));
      image.src = svgUrl;
    });
    const canvas2 = document.createElement("canvas");
    canvas2.width = Math.max(1, Math.ceil(width));
    canvas2.height = Math.max(1, Math.ceil(height));
    const context = canvas2.getContext("2d");
    if (!context) {
      throw new Error("\u6D4F\u89C8\u5668\u4E0D\u652F\u6301 Canvas \u5BFC\u51FA");
    }
    context.drawImage(image, 0, 0);
    return await new Promise((resolve, reject) => {
      canvas2.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("\u6D4F\u89C8\u5668\u5BFC\u51FA PNG \u5931\u8D25"));
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
function triggerBlobDownload(blob, fileName) {
  const url2 = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url2;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url2);
}
function chartImageFileName(title) {
  const raw = (title ?? "").trim() || "sus2img-chart";
  const normalized = raw.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
  return normalized || "sus2img-chart";
}
var DEFAULT_PIXEL, MAX_PIXEL, NOTE_ASSET_ROOT, DEFAULT_JACKET, blobToDataUrl, resolveHrefForFetch;
var init_chartImage = __esm({
  "src/site/lib/chartImage.ts"() {
    "use strict";
    init_sus2img();
    DEFAULT_PIXEL = 240;
    MAX_PIXEL = 600;
    NOTE_ASSET_ROOT = "/static/notes_new";
    DEFAULT_JACKET = "/static/logo.png";
    blobToDataUrl = (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("\u8BFB\u53D6\u56FE\u7247\u8D44\u6E90\u5931\u8D25"));
      reader.readAsDataURL(blob);
    });
    resolveHrefForFetch = (href) => {
      if (href.startsWith("http://") || href.startsWith("https://")) {
        return href;
      }
      if (href.startsWith("//")) {
        return `${window.location.protocol}${href}`;
      }
      return new URL(href, window.location.href).toString();
    };
  }
});

// src/site/chartImage.ts
var chartImage_exports = {};
__export(chartImage_exports, {
  mountChartToImage: () => mountChartToImage,
  renderChartToImageMarkup: () => renderChartToImageMarkup
});
function readStoredForm() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaultForm };
    }
    const parsed = JSON.parse(raw);
    return {
      rebase: typeof parsed.rebase === "string" ? parsed.rebase : "",
      title: typeof parsed.title === "string" ? parsed.title : "",
      artist: typeof parsed.artist === "string" ? parsed.artist : "",
      author: typeof parsed.author === "string" ? parsed.author : "",
      difficulty: typeof parsed.difficulty === "string" ? parsed.difficulty : "",
      playlevel: typeof parsed.playlevel === "string" ? parsed.playlevel : "",
      pixel: typeof parsed.pixel === "string" ? parsed.pixel : "",
      jacketUrl: typeof parsed.jacketUrl === "string" ? parsed.jacketUrl : "",
      condenseSpeedTrend: parsed.condenseSpeedTrend !== false,
      skin: parsed.skin === "custom02" ? "custom02" : "custom01",
      outputFormat: parsed.outputFormat === "svg" ? "svg" : "png"
    };
  } catch {
    return { ...defaultForm };
  }
}
function persistForm(form) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  } catch {
  }
}
function renderChartToImageMarkup() {
  const page = CHART_IMAGE_PAGE;
  return `
    <section class="upload-card chart-image-card">
      <h1 class="upload-title">${escapeHtml(page.title)}</h1>
      <p class="upload-text">${escapeHtml(page.description)}</p>

      <form class="upload-form" id="img-form" novalidate>
        <div class="upload-row wide">
          <label for="img-chart">${escapeHtml(page.textLabel)}</label>
          <textarea id="img-chart" class="img-textarea" rows="10" spellcheck="false" placeholder="${escapeHtml(page.placeholder)}"></textarea>
        </div>

        <div class="upload-row wide">
          <label for="img-file">\u4E0A\u4F20\u6587\u4EF6\uFF08\u53EF\u9009\uFF0C\u4E0E\u4E0A\u65B9\u5185\u5BB9\u4E8C\u9009\u4E00\uFF09</label>
          <input id="img-file" type="file" accept="${page.accept}" />
          <p class="img-hint" id="img-file-name">\u672A\u9009\u62E9\u6587\u4EF6</p>
        </div>

        <details class="img-options" id="img-options">
          <summary>\u53EF\u9009\u8BBE\u7F6E\uFF08\u66F2\u540D / \u96BE\u5EA6 / \u5B9A\u6570 / \u6BCF\u79D2\u957F\u5EA6 / \u66F2\u7ED8 / rebase\uFF09</summary>
          <div class="upload-grid">
            <div class="upload-row">
              <label for="img-title">\u66F2\u540D\uFF08\u53EF\u7701\u7565\uFF09</label>
              <input id="img-title" type="text" placeholder="\u66F2\u540D" />
            </div>
            <div class="upload-row">
              <label for="img-artist">\u4F5C\u66F2\u4F5C\u8BCD\u7F16\u66F2\uFF08\u53EF\u7701\u7565\uFF09</label>
              <input id="img-artist" type="text" placeholder="\u4F5C\u66F2\u4F5C\u8BCD\u7F16\u66F2" />
            </div>
            <div class="upload-row">
              <label for="img-author">\u8C31\u9762\u4F5C\u8005\uFF08\u53EF\u7701\u7565\uFF09</label>
              <input id="img-author" type="text" placeholder="\u8C31\u9762\u4F5C\u8005" />
            </div>
            <div class="upload-row">
              <label for="img-difficulty">\u96BE\u5EA6\uFF08\u53EF\u7701\u7565\uFF09</label>
              <input id="img-difficulty" type="text" placeholder="\u4F8B\u5982 MASTER" />
            </div>
            <div class="upload-row">
              <label for="img-playlevel">\u5B9A\u6570\uFF08\u53EF\u7701\u7565\uFF09</label>
              <input id="img-playlevel" type="text" placeholder="\u4F8B\u5982 32" />
            </div>
            <div class="upload-row">
              <label for="img-pixel">\u6BCF\u79D2\u957F\u5EA6\uFF08\u9ED8\u8BA4 240\uFF0C\u4E0A\u9650 600\uFF09</label>
              <input id="img-pixel" type="text" inputmode="numeric" placeholder="240" />
            </div>
            <div class="upload-row wide">
              <label for="img-jacket-url">\u66F2\u7ED8 URL\uFF08\u53EF\u7701\u7565\uFF0C\u7559\u7A7A\u7528\u5185\u7F6E\u5360\u4F4D\u56FE\uFF09</label>
              <input id="img-jacket-url" type="text" placeholder="\u53EF\u586B data: / http(s): / \u7EDD\u5BF9\u8DEF\u5F84" />
            </div>
            <div class="upload-row wide">
              <label for="img-jacket-file">\u4E0A\u4F20\u66F2\u7ED8\uFF08\u53EF\u7701\u7565\uFF09</label>
              <input id="img-jacket-file" type="file" accept="image/*" />
            </div>
            <div class="upload-row wide">
              <label for="img-rebase">rebase.json\uFF08\u53EF\u7701\u7565\uFF0C\u7528\u6765\u91CD\u6392\u65F6\u95F4\u8F74\uFF09</label>
              <button type="button" class="img-inline-button" id="img-rebase-generate">\u6839\u636E\u5F53\u524D\u8C31\u9762\u751F\u6210</button>
              <textarea id="img-rebase" class="img-textarea img-textarea--short" rows="5" spellcheck="false" placeholder="\u5728\u6B64\u7C98\u8D34 rebase.json \u5185\u5BB9"></textarea>
              <p class="img-hint" id="img-rebase-message"></p>
            </div>
            <div class="upload-row wide">
              <label class="upload-toggle">
                <input id="img-condense" type="checkbox" checked />
                <span>highspeed \u77ED\u65F6\u95F4\u5BC6\u96C6\u53D8\u5316\u6298\u53E0\u4E3A\u8D8B\u52BF\u7BAD\u5934</span>
              </label>
            </div>
          </div>
        </details>

        <div class="upload-grid">
          <div class="upload-row">
            <label>\u76AE\u80A4</label>
            <div class="img-radio-row" role="radiogroup" aria-label="\u76AE\u80A4">
              <label class="img-radio"><input type="radio" name="img-skin" value="custom01" checked /><span>\u9ED8\u8BA4</span></label>
              <label class="img-radio"><input type="radio" name="img-skin" value="custom02" /><span>3 \u5468\u5E74\u65B0\u589E</span></label>
            </div>
          </div>
          <div class="upload-row">
            <label>\u8F93\u51FA\u683C\u5F0F</label>
            <div class="img-radio-row" role="radiogroup" aria-label="\u8F93\u51FA\u683C\u5F0F">
              <label class="img-radio"><input type="radio" name="img-format" value="png" checked /><span>PNG</span></label>
              <label class="img-radio"><input type="radio" name="img-format" value="svg" /><span>SVG</span></label>
            </div>
          </div>
        </div>

        <p class="img-error" id="img-error" hidden></p>

        <div class="upload-actions">
          <button type="button" class="is-secondary" id="img-reset">\u6E05\u7A7A</button>
          <button type="submit" id="img-submit">\u5F00\u59CB\u8F6C\u6362</button>
        </div>
      </form>
    </section>

    <section class="upload-card chart-image-result" id="img-result" hidden>
      <h2 class="upload-title">\u751F\u6210\u7ED3\u679C\u4E0B\u8F7D</h2>
      <p class="upload-text" id="img-result-desc"></p>
      <div class="img-download-row">
        <button type="button" class="action-button secondary" id="img-download-svg">\u4E0B\u8F7D SVG</button>
        <button type="button" class="action-button" id="img-download-png">\u4E0B\u8F7D PNG</button>
      </div>
      <p class="img-message" id="img-download-message" hidden></p>
      <p class="img-error" id="img-download-error" hidden></p>
    </section>
  `;
}
function showGeneratingHint(previewTab) {
  if (!previewTab || previewTab.closed) {
    return;
  }
  try {
    previewTab.document.title = "\u6B63\u5728\u751F\u6210\u8C31\u9762\u9884\u89C8...";
    previewTab.document.documentElement.style.margin = "0";
    previewTab.document.documentElement.style.height = "100%";
    previewTab.document.body.style.margin = "0";
    previewTab.document.body.style.height = "100%";
    previewTab.document.body.innerHTML = `
      <div style="min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 20% 20%, #f8fafc 0%, #eef2ff 45%, #e2e8f0 100%);color:#1e293b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="width:min(92vw,520px);padding:clamp(18px,3vw,28px);border-radius:16px;background:#ffffffcc;backdrop-filter:blur(8px);box-shadow:0 16px 40px rgba(15,23,42,.12);border:1px solid #cbd5e1;text-align:center;">
          <div style="font-size:clamp(18px,2.4vw,24px);font-weight:700;letter-spacing:.01em;margin-bottom:8px;">\u6B63\u5728\u751F\u6210\u8C31\u9762\u9884\u89C8</div>
          <div style="font-size:clamp(13px,1.8vw,15px);color:#475569;">\u8BF7\u7A0D\u5019\uFF0C\u751F\u6210\u5B8C\u6210\u540E\u5C06\u81EA\u52A8\u8DF3\u8F6C...</div>
        </div>
      </div>
    `;
  } catch {
  }
}
async function toCustomScoreJson(text, format) {
  switch (format) {
    case "usc": {
      const imported = parseUscChart(text);
      return JSON.parse(bridgeCustomScore(imported));
    }
    case "level-data": {
      const chart2 = parseLevelData(text);
      return JSON.parse(buildCustomScore(text, chart2).scoreText);
    }
    case "custom-score-json":
    default:
      return JSON.parse(text);
  }
}
function bridgeCustomScore(imported) {
  return bridgeFromDocument(imported.document, imported.chart).scoreText;
}
function mountChartToImage(root) {
  const page = CHART_IMAGE_PAGE;
  const form = readStoredForm();
  const formEl = root.querySelector("#img-form");
  const chartInput = root.querySelector("#img-chart");
  const fileInput2 = root.querySelector("#img-file");
  const fileNameNode = root.querySelector("#img-file-name");
  const rebaseInput = root.querySelector("#img-rebase");
  const titleInput = root.querySelector("#img-title");
  const artistInput = root.querySelector("#img-artist");
  const authorInput = root.querySelector("#img-author");
  const difficultyInput = root.querySelector("#img-difficulty");
  const playlevelInput = root.querySelector("#img-playlevel");
  const pixelInput = root.querySelector("#img-pixel");
  const jacketUrlInput = root.querySelector("#img-jacket-url");
  const jacketFileInput = root.querySelector("#img-jacket-file");
  const condenseInput = root.querySelector("#img-condense");
  const rebaseGenerateButton = root.querySelector("#img-rebase-generate");
  const rebaseMessage = root.querySelector("#img-rebase-message");
  const errorNode = root.querySelector("#img-error");
  const submitButton = root.querySelector("#img-submit");
  const resetButton = root.querySelector("#img-reset");
  const resultSection = root.querySelector("#img-result");
  const resultDesc = root.querySelector("#img-result-desc");
  const downloadSvgButton = root.querySelector("#img-download-svg");
  const downloadPngButton = root.querySelector("#img-download-png");
  const downloadMessage = root.querySelector("#img-download-message");
  const downloadError = root.querySelector("#img-download-error");
  const skinInputs = [...root.querySelectorAll('input[name="img-skin"]')];
  const formatInputs = [...root.querySelectorAll('input[name="img-format"]')];
  let result = null;
  let jacketDataUrl = "";
  let busy = false;
  const syncStored = () => {
    const stored = {
      rebase: rebaseInput.value,
      title: titleInput.value,
      artist: artistInput.value,
      author: authorInput.value,
      difficulty: difficultyInput.value,
      playlevel: playlevelInput.value,
      pixel: pixelInput.value,
      jacketUrl: jacketUrlInput.value,
      condenseSpeedTrend: condenseInput.checked,
      skin: skinInputs.find((item) => item.checked)?.value ?? "custom01",
      outputFormat: formatInputs.find((item) => item.checked)?.value ?? "png"
    };
    persistForm(stored);
  };
  rebaseInput.value = form.rebase;
  titleInput.value = form.title;
  artistInput.value = form.artist;
  authorInput.value = form.author;
  difficultyInput.value = form.difficulty;
  playlevelInput.value = form.playlevel;
  pixelInput.value = form.pixel;
  jacketUrlInput.value = form.jacketUrl;
  condenseInput.checked = form.condenseSpeedTrend;
  skinInputs.forEach((input) => {
    input.checked = input.value === form.skin;
  });
  formatInputs.forEach((input) => {
    input.checked = input.value === form.outputFormat;
  });
  const setError = (message) => {
    if (!message) {
      errorNode.hidden = true;
      errorNode.textContent = "";
      return;
    }
    errorNode.hidden = false;
    errorNode.textContent = message;
  };
  const setDownloadFeedback = (message, error) => {
    downloadMessage.hidden = !message;
    downloadMessage.textContent = message ?? "";
    downloadError.hidden = !error;
    downloadError.textContent = error ?? "";
  };
  const resetResult = () => {
    result = null;
    resultSection.hidden = true;
    resultDesc.textContent = "";
    setDownloadFeedback(null, null);
  };
  const readChartText = async () => {
    const typed = chartInput.value.trim();
    if (typed) {
      return chartInput.value;
    }
    const file = fileInput2.files?.[0];
    if (!file) {
      throw new Error("\u8BF7\u63D0\u4F9B\u8C31\u9762\u5185\u5BB9\u6216\u4E0A\u4F20\u6587\u4EF6");
    }
    const decoded = await decodeChartSource2({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
    return decoded.text;
  };
  const resolveFormat = (text, fileName) => {
    const { format } = decodeChartText(text, fileName);
    if (!CHART_IMAGE_ACCEPTS.includes(format)) {
      throw new Error(`${page.mismatchHint}\uFF0C\u8BC6\u522B\u7ED3\u679C\u4E3A\u300C${format}\u300D\u3002`);
    }
    return format;
  };
  const resolveJacket = () => {
    if (jacketDataUrl) {
      return jacketDataUrl;
    }
    return jacketUrlInput.value.trim();
  };
  resetButton.addEventListener("click", () => {
    chartInput.value = "";
    fileInput2.value = "";
    fileNameNode.textContent = "\u672A\u9009\u62E9\u6587\u4EF6";
    jacketFileInput.value = "";
    jacketDataUrl = "";
    setError(null);
    resetResult();
  });
  fileInput2.addEventListener("change", () => {
    const file = fileInput2.files?.[0];
    fileNameNode.textContent = file ? file.name : "\u672A\u9009\u62E9\u6587\u4EF6";
    if (file) {
      chartInput.value = "";
    }
  });
  jacketFileInput.addEventListener("change", () => {
    const file = jacketFileInput.files?.[0];
    if (!file) {
      jacketDataUrl = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      jacketDataUrl = String(reader.result ?? "");
    };
    reader.onerror = () => {
      jacketDataUrl = "";
      setError("\u8BFB\u53D6\u66F2\u7ED8\u5931\u8D25");
    };
    reader.readAsDataURL(file);
  });
  rebaseGenerateButton.addEventListener("click", async () => {
    rebaseMessage.textContent = "";
    rebaseGenerateButton.disabled = true;
    const label = rebaseGenerateButton.textContent;
    rebaseGenerateButton.textContent = "\u751F\u6210\u4E2D...";
    try {
      const text = await readChartText();
      const format = resolveFormat(text, fileInput2.files?.[0]?.name);
      const scoreJson = await toCustomScoreJson(text, format);
      if (rebaseInput.value.trim() && !window.confirm("\u8FD9\u4F1A\u8986\u76D6\u6587\u672C\u6846\u4E2D\u73B0\u6709\u7684 rebase.json \u5185\u5BB9\uFF0C\u662F\u5426\u7EE7\u7EED\uFF1F")) {
        return;
      }
      rebaseInput.value = generateRebaseJson(scoreJson, {
        title: titleInput.value,
        artist: artistInput.value,
        author: authorInput.value,
        difficulty: difficultyInput.value,
        playlevel: playlevelInput.value
      });
      rebaseMessage.textContent = "\u5DF2\u6839\u636E\u5F53\u524D\u8C31\u9762\u586B\u5165\uFF1B\u53EA\u6709\u7406\u89E3 rebase \u65F6\u95F4\u8F74\u65F6\u624D\u9700\u8981\u4FEE\u6539\u3002";
      syncStored();
    } catch (reason) {
      rebaseMessage.textContent = reason instanceof Error ? reason.message : "\u751F\u6210 rebase.json \u5931\u8D25";
    } finally {
      rebaseGenerateButton.disabled = false;
      rebaseGenerateButton.textContent = label;
    }
  });
  [rebaseInput, titleInput, artistInput, authorInput, difficultyInput, playlevelInput, pixelInput, jacketUrlInput].forEach(
    (input) => input.addEventListener("change", syncStored)
  );
  condenseInput.addEventListener("change", syncStored);
  skinInputs.concat(formatInputs).forEach((input) => input.addEventListener("change", syncStored));
  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) {
      return;
    }
    busy = true;
    setError(null);
    setDownloadFeedback(null, null);
    submitButton.disabled = true;
    submitButton.textContent = "\u8F6C\u6362\u4E2D...";
    const previewTab = window.open("", "_blank");
    showGeneratingHint(previewTab);
    try {
      const text = await readChartText();
      const format = resolveFormat(text, fileInput2.files?.[0]?.name);
      const scoreJson = await toCustomScoreJson(text, format);
      const rendered = renderChartImageSvg({
        scoreJson,
        rebase: rebaseInput.value,
        title: titleInput.value,
        artist: artistInput.value,
        author: authorInput.value,
        difficulty: difficultyInput.value,
        playlevel: playlevelInput.value,
        pixel: pixelInput.value,
        skin: skinInputs.find((item) => item.checked)?.value ?? "custom01",
        jacket: resolveJacket(),
        condenseSpeedTrend: condenseInput.checked
      });
      const svgText = await inlineSvgImages(rendered.svgText);
      const outputFormat = formatInputs.find((item) => item.checked)?.value ?? "png";
      const blob = outputFormat === "png" ? await svgToPngBlob(svgText, rendered.width, rendered.height) : svgToBlob(svgText);
      const url2 = URL.createObjectURL(blob);
      if (previewTab && !previewTab.closed) {
        previewTab.location.href = url2;
      } else {
        window.open(url2, "_blank");
      }
      result = { svgText, width: rendered.width, height: rendered.height, format: outputFormat };
      resultSection.hidden = false;
      resultDesc.textContent = `\u6700\u8FD1\u4E00\u6B21\u751F\u6210\uFF1A${rendered.width} \xD7 ${rendered.height} px\uFF0C\u8F93\u51FA\u683C\u5F0F\u4E3A ${outputFormat.toUpperCase()}\u3002`;
      syncStored();
    } catch (reason) {
      if (previewTab && !previewTab.closed) {
        previewTab.close();
      }
      setError(reason instanceof Error ? reason.message : "\u8F6C\u6362\u5931\u8D25");
    } finally {
      busy = false;
      submitButton.disabled = false;
      submitButton.textContent = "\u5F00\u59CB\u8F6C\u6362";
    }
  });
  downloadSvgButton.addEventListener("click", () => {
    if (!result) {
      return;
    }
    setDownloadFeedback(null, null);
    try {
      triggerBlobDownload(svgToBlob(result.svgText), `${chartImageFileName(titleInput.value)}.svg`);
      setDownloadFeedback("SVG \u4E0B\u8F7D\u5DF2\u5F00\u59CB", null);
    } catch (reason) {
      setDownloadFeedback(null, reason instanceof Error ? reason.message : "SVG \u4E0B\u8F7D\u5931\u8D25");
    }
  });
  downloadPngButton.addEventListener("click", async () => {
    if (!result) {
      return;
    }
    setDownloadFeedback(null, null);
    downloadPngButton.disabled = true;
    const label = downloadPngButton.textContent;
    downloadPngButton.textContent = "\u6B63\u5728\u751F\u6210 PNG...";
    try {
      const blob = await svgToPngBlob(result.svgText, result.width, result.height);
      triggerBlobDownload(blob, `${chartImageFileName(titleInput.value)}.png`);
      setDownloadFeedback("PNG \u4E0B\u8F7D\u5DF2\u5F00\u59CB", null);
    } catch (reason) {
      setDownloadFeedback(null, reason instanceof Error ? reason.message : "PNG \u4E0B\u8F7D\u5931\u8D25");
    } finally {
      downloadPngButton.disabled = false;
      downloadPngButton.textContent = label;
    }
  });
  pixelInput.addEventListener("blur", () => {
    try {
      normalizePixel(pixelInput.value);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "\u6BCF\u79D2\u957F\u5EA6\u4E0D\u5408\u6CD5");
    }
  });
}
var CHART_IMAGE_ACCEPTS, CHART_IMAGE_ACCEPT, CHART_IMAGE_PAGE, STORAGE_KEY, defaultForm, escapeHtml;
var init_chartImage2 = __esm({
  "src/site/chartImage.ts"() {
    "use strict";
    init_chartSource2();
    init_chartImage();
    init_customScore2();
    init_leveldata();
    init_usc();
    CHART_IMAGE_ACCEPTS = ["custom-score-json", "usc", "level-data"];
    CHART_IMAGE_ACCEPT = ".usc,.json,.gz,.lvdata,.leveldata,.txt,text/plain,application/json,application/gzip";
    CHART_IMAGE_PAGE = {
      title: "\u8C31\u9762\u8F6C\u56FE\u7247",
      description: "\u7C98\u8D34\u8C31\u9762\u5185\u5BB9\u6216\u4E0A\u4F20\u6587\u4EF6\uFF0C\u652F\u6301\u8C31\u9762 Maker \u81EA\u5236 JSON\u3001USC \u4E0E Sonolus LevelData\uFF08.gz \u53EF\u76F4\u63A5\u4E0A\u4F20\uFF09\uFF0C\u6E32\u67D3\u6210\u901F\u89C8\u957F\u56FE\u5E76\u5BFC\u51FA SVG / PNG\u3002\u8F93\u5165\u4F1A\u5148\u7ECF\u65B0\u7248\u6865\u63A5\u7EDF\u4E00\u53D8\u901F\u66F2\u7EBF\uFF0C\u4E0E\u9884\u89C8\u5668\u4E00\u81F4\u3002",
      accept: CHART_IMAGE_ACCEPT,
      textLabel: "\u8C31\u9762\u5185\u5BB9\uFF08\u81EA\u5236 JSON / USC / LevelData\uFF09",
      placeholder: "\u5728\u6B64\u7C98\u8D34\u8C31\u9762 Maker \u81EA\u5236 JSON\u3001USC \u6216 Sonolus LevelData \u5185\u5BB9",
      mismatchHint: "\u65E0\u6CD5\u8BC6\u522B\u8FD9\u6BB5\u5185\u5BB9\u7684\u683C\u5F0F\uFF0C\u652F\u6301 \u81EA\u5236 JSON / USC / LevelData"
    };
    STORAGE_KEY = "chart-image-form-data";
    defaultForm = {
      rebase: "",
      title: "",
      artist: "",
      author: "",
      difficulty: "",
      playlevel: "",
      pixel: "",
      jacketUrl: "",
      condenseSpeedTrend: true,
      skin: "custom01",
      outputFormat: "png"
    };
    escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => {
      switch (char) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        default:
          return "&#39;";
      }
    });
  }
});

// src/site/pages.ts
init_shell();
var readOptionalText = (input) => {
  const trimmed = input.value.trim();
  return trimmed === "" ? null : trimmed;
};
var readOptionalOffset = (input) => {
  const trimmed = input.value.trim();
  if (trimmed === "") return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};
function renderHome(root) {
  renderShell(
    root,
    `
    <section class="hero">
      <img src="/assets/landing/chart.webp" alt="chart preview" />
      <div class="hero-body">
        <h1 class="hero-title">Next SEKAI \u97F3\u6E38\u8C31\u9762\u9884\u89C8\u5DE5\u5177</h1>
        <p class="hero-text">\u652F\u6301 USC \u4E0E Sonolus LevelData \u89E3\u6790\u3001\u5B8C\u6574 HUD\u3001\u5F00\u573A\u4FE1\u606F\u4E0E\u7279\u6548\u3002\u53D8\u901F\u4F7F\u7528\u4E0A\u6E38 marker \u65F6\u95F4\u8F74\uFF08\u7F13\u52A8 + \u4F4D\u79FB\u8DF3\u53D8\uFF09\uFF0C\u753B\u9762\u7531 Next SEKAI \u7684 wasm \u6E32\u67D3\u5668\u7ED8\u5236\uFF0C\u5168\u90E8\u5904\u7406\u90FD\u5728\u6D4F\u89C8\u5668\u5185\u5B8C\u6210\u3002</p>
        <div class="home-actions">
          <a class="action-button" href="/upload">\u52A0\u8F7D\u81EA\u5236\u8C31</a>
          <a class="action-button secondary" href="/preview">\u6253\u5F00\u9884\u89C8\u9875</a>
        </div>
      </div>
    </section>
  `,
    "/"
  );
}
function renderUpload(root, onStart) {
  renderShell(
    root,
    `
    <section class="upload-card">
      <h1 class="upload-title">\u52A0\u8F7D\u81EA\u5236\u8C31</h1>
      <p class="upload-text">\u9009\u62E9\u672C\u5730 USC \u6216 Sonolus LevelData \u6587\u4EF6\u5E76\u586B\u5199\u57FA\u7840\u4FE1\u606F\uFF0C\u7136\u540E\u76F4\u63A5\u8FDB\u5165\u9884\u89C8\u9875\u3002\u4E0A\u4F20\u53EA\u5728\u672C\u5730\u6D4F\u89C8\u5668\u4E2D\u5904\u7406\uFF0C\u4E0D\u4F1A\u4E0A\u4F20\u5230\u670D\u52A1\u5668\u3002</p>
      <form class="upload-form" id="upload-form">
        <div class="upload-grid">
          <div class="upload-row file">
            <label for="upload-sus">\u8C31\u9762\u6587\u4EF6\uFF08USC / LevelData / \u81EA\u5236 JSON\uFF0C\u5FC5\u586B\uFF09</label>
            <input id="upload-sus" type="file" accept=".usc,.json,.gz,.lvdata,.leveldata,text/plain,application/json,application/gzip" required />
          </div>
          <div class="upload-row file">
            <label for="upload-bgm">BGM\uFF08\u53EF\u9009\uFF09</label>
            <input id="upload-bgm" type="file" accept="audio/*,.mp3,.ogg,.wav,.m4a,.aac,.flac" />
          </div>
          <div class="upload-row file">
            <label for="upload-cover">\u66F2\u7ED8\uFF08\u53EF\u9009\uFF09</label>
            <input id="upload-cover" type="file" accept="image/*" />
          </div>
          <div class="upload-row">
            <label for="upload-offset">offset(ms)</label>
            <input id="upload-offset" type="text" inputmode="decimal" placeholder="\u4F8B\u5982 9000" />
          </div>
          <div class="upload-row">
            <label for="upload-diff">\u96BE\u5EA6</label>
            <select id="upload-diff">
              <option value="0">EASY</option>
              <option value="1">NORMAL</option>
              <option value="2">HARD</option>
              <option value="3">EXPERT</option>
              <option value="4" selected>MASTER</option>
              <option value="5">APPEND</option>
            </select>
          </div>
          <div class="upload-row wide">
            <label for="upload-title">\u66F2\u540D</label>
            <input id="upload-title" type="text" />
          </div>
          <div class="upload-row">
            <label for="upload-lyricist">\u4F5C\u8BCD</label>
            <input id="upload-lyricist" type="text" />
          </div>
          <div class="upload-row">
            <label for="upload-composer">\u4F5C\u66F2</label>
            <input id="upload-composer" type="text" />
          </div>
          <div class="upload-row">
            <label for="upload-arranger">\u7F16\u66F2</label>
            <input id="upload-arranger" type="text" />
          </div>
          <div class="upload-row">
            <label for="upload-vocal">\u6F14\u5531</label>
            <input id="upload-vocal" type="text" />
          </div>
          <div class="upload-row wide">
            <label class="upload-toggle">
              <input id="upload-custom-score-info" type="checkbox" checked />
              <span>\u5F00\u573A\u663E\u793A\u81EA\u5236\u8C31\u56FE\u6807\u548C\u8C31\u9762\u4FE1\u606F</span>
            </label>
          </div>
          <div class="upload-row">
            <label for="upload-score-title">\u8C31\u9762\u6807\u9898</label>
            <input id="upload-score-title" type="text" placeholder="\u9ED8\u8BA4\u4F7F\u7528\u66F2\u540D" />
          </div>
          <div class="upload-row">
            <label for="upload-score-creator">\u8C31\u9762\u4F5C\u8005</label>
            <input id="upload-score-creator" type="text" />
          </div>
          <div class="upload-row wide">
            <label class="upload-toggle">
              <input id="upload-show-lock" type="checkbox" checked />
              <span>\u5168\u5C4F\u663E\u793A\u9501\u5C4F\u7EC4\u4EF6\uFF08\u5F55\u5C4F\u5EFA\u8BAE\u5173\u95ED\uFF09</span>
            </label>
          </div>
        </div>
        <div class="upload-error" id="upload-error"></div>
        <div class="upload-actions">
          <a href="/preview">\u4EC5\u6253\u5F00\u9884\u89C8\u9875</a>
          <button id="upload-submit" type="submit">\u5F00\u59CB\u9884\u89C8</button>
        </div>
      </form>
    </section>
  `,
    "/upload"
  );
  const form = root.querySelector("#upload-form");
  if (!form) return;
  const field2 = (id) => root.querySelector(id);
  const susInput = field2("#upload-sus");
  const errorNode = field2("#upload-error");
  const submitButton = field2("#upload-submit");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const file = susInput.files?.[0];
    if (!file) {
      errorNode.textContent = "\u8BF7\u9009\u62E9 USC\u3001LevelData \u6216\u81EA\u5236 JSON \u8C31\u9762\u6587\u4EF6\u3002";
      return;
    }
    errorNode.textContent = "";
    submitButton.disabled = true;
    submitButton.textContent = "\u6B63\u5728\u8FDB\u5165\u9884\u89C8\u2026";
    onStart({
      file,
      bgmFile: field2("#upload-bgm").files?.[0] ?? null,
      coverFile: field2("#upload-cover").files?.[0] ?? null,
      offsetMs: readOptionalOffset(field2("#upload-offset")),
      difficulty: field2("#upload-diff").value || null,
      title: readOptionalText(field2("#upload-title")),
      lyricist: readOptionalText(field2("#upload-lyricist")),
      composer: readOptionalText(field2("#upload-composer")),
      arranger: readOptionalText(field2("#upload-arranger")),
      vocal: readOptionalText(field2("#upload-vocal")),
      customScoreInfo: field2("#upload-custom-score-info").checked,
      scoreTitle: readOptionalText(field2("#upload-score-title")),
      scoreCreator: readOptionalText(field2("#upload-score-creator")),
      showLockControlsButton: field2("#upload-show-lock").checked
    });
    submitButton.disabled = false;
    submitButton.textContent = "\u5F00\u59CB\u9884\u89C8";
  });
}
function renderAbout(root) {
  renderShell(
    root,
    `
    <section class="preview-about">
      <h1>\u5173\u4E8E\u672C\u9884\u89C8\u5668</h1>
      <p>\u8FD9\u662F\u4E00\u4E2A\u5728\u672C\u5730\u8FD0\u884C\u7684 Project Sekai \u81EA\u5236\u8C31\u9884\u89C8\u5668\uFF1A\u9009\u4E00\u4EFD\u81EA\u5DF1\u505A\u7684\u8C31\u9762\uFF0C
        \u5C31\u80FD\u770B\u5230\u63A5\u8FD1\u5B9E\u673A\u7684\u97F3\u7B26\u3001\u957F\u6761\u3001\u5224\u5B9A\u7EBF\u3001HUD \u4E0E\u6253\u51FB\u97F3\uFF0C\u5E76\u4E14\u53EF\u4EE5\u8C03\u901F\u5EA6\u3001\u6362\u76AE\u80A4\u3001\u5F55\u5C4F\u5BFC\u51FA\u89C6\u9891\u3002</p>
      <p>\u6240\u6709\u6587\u4EF6\u90FD\u5728\u4F60\u81EA\u5DF1\u7684\u6D4F\u89C8\u5668\u91CC\u89E3\u6790\uFF0C<strong>\u4E0D\u4F1A\u4E0A\u4F20\u5230\u4EFB\u4F55\u670D\u52A1\u5668</strong>\uFF1B
        \u9664\u4E86\u9996\u6B21\u51C6\u5907\u7D20\u6750\uFF0C\u4F7F\u7528\u8FC7\u7A0B\u4E0D\u9700\u8981\u8054\u7F51\u3002</p>

      <h2>\u652F\u6301\u54EA\u4E9B\u8C31\u9762</h2>
      <ul class="about-list">
        <li><strong>USC</strong>\uFF08<code>.usc</code>\uFF09\uFF1AMikuMikuWorld \u7B49\u5236\u8C31\u5668\u5BFC\u51FA\u7684\u81EA\u5236\u8C31\u3002</li>
        <li><strong>Sonolus LevelData</strong>\uFF08<code>.json</code> / <code>.lvdata</code> /
          <code>.leveldata</code> / <code>.gz</code> / \u65E0\u6269\u5C55\u540D\uFF09\uFF1A\u538B\u7F29\u5305\u4F1A\u81EA\u52A8\u89E3\u538B\u3002</li>
        <li><strong>\u81EA\u5236 JSON</strong> \u4E0E <strong>SUS</strong>\uFF08<code>.sus</code>\uFF09\uFF1A\u4F1A\u81EA\u52A8\u8F6C\u6362\u6210\u540C\u4E00\u79CD\u5185\u90E8\u7ED3\u6784\u3002</li>
      </ul>

      <h2>\u5F15\u7528\u4E0E\u81F4\u8C22</h2>
      <ul class="about-list">
        <li><a href="https://github.com/Next-SEKAI/sonolus-next-sekai-engine" target="_blank" rel="noreferrer">Next-SEKAI/sonolus-next-sekai-engine</a>\uFF08MIT\uFF0C\u65F6\u5E8F\u8BED\u4E49\u4E0E\u6E32\u67D3\u5668\u6765\u6E90\uFF09</li>
        <li><a href="https://github.com/crash5band/MikuMikuWorld" target="_blank" rel="noreferrer">crash5band/MikuMikuWorld</a>\uFF08MIT\uFF0CUSC \u683C\u5F0F\u4E0E\u7F16\u8F91\u5668\uFF09</li>
        <li><a href="https://github.com/watagashi-uni/Uni-PJSK-Viewer-Frontend" target="_blank" rel="noreferrer">watagashi-uni/Uni-PJSK-Viewer-Frontend</a>\uFF08GPL-3.0\uFF0C\u8C31\u9762\u8F6C\u56FE\u7247\u6E32\u67D3\u5668\uFF09</li>
        <li><a href="https://gitlab.com/pjsekai/musics" target="_blank" rel="noreferrer">pjsekai/musics</a>\uFF08\u8C31\u9762\u8F6C\u56FE\u7247\u7684\u539F\u59CB\u7B97\u6CD5\u4E0E\u7D20\u6750\uFF09</li>
        <li><a href="https://github.com/crash5band/MikuMikuWorld/blob/master/LICENSE" target="_blank" rel="noreferrer">MikuMikuWorld MIT License</a></li>
        <li><a href="https://github.com/TootieJin/pjsekai-overlay-APPEND" target="_blank" rel="noreferrer">TootieJin/pjsekai-overlay-APPEND</a>\uFF08AGPL\uFF09</li>
      </ul>
      <p>\u5DE6\u4FA7\u300C\u8C31\u9762\u8F6C\u56FE\u7247\u300D\u53EF\u4EE5\u628A\u4E00\u4EFD\u8C31\u9762\u5BFC\u51FA\u6210\u957F\u56FE\uFF0C\u9002\u5408\u53D1\u9884\u89C8\u56FE\u6216\u8005\u6BD4\u5BF9\u8C31\u9762\uFF1B
        \u5B83\u548C\u9884\u89C8\u9875\u5171\u7528\u540C\u4E00\u6761\u53D8\u901F\u66F2\u7EBF\uFF0C\u6240\u4EE5\u4E24\u8FB9\u7684\u65F6\u95F4\u8F74\u4E00\u81F4\u3002\u8FD9\u4E2A\u6E32\u67D3\u5668\u540C\u6837\u6765\u81EA
        <a href="https://github.com/watagashi-uni/Uni-PJSK-Viewer-Frontend" target="_blank" rel="noreferrer">Uni-PJSK-Viewer-Frontend</a>\uFF08GPL-3.0\uFF09\uFF0C
        \u4E0A\u6E38\u4E3A
        <a href="https://gitlab.com/pjsekai/musics" target="_blank" rel="noreferrer">pjsekai/musics</a>\u3002</p>
    </section>
  `,
    "/about"
  );
}

// src/view/keepAlive.ts
var ALIVE_PATH = "/__preview-alive";
var BYE_PATH = "/__preview-bye";
var INTERVAL_MS = 2e3;
var clientId = Math.random().toString(36).slice(2) + Date.now().toString(36);
function ping(path, keepalive) {
  const url2 = `${path}?id=${encodeURIComponent(clientId)}`;
  try {
    if (keepalive) {
      navigator.sendBeacon?.(url2);
      return;
    }
    void fetch(url2, { method: "POST", cache: "no-store", keepalive: true }).catch(() => {
    });
  } catch {
  }
}
function startKeepAlive() {
  if (typeof window === "undefined") return;
  if (location.protocol !== "http:" && location.protocol !== "https:") return;
  ping(ALIVE_PATH, false);
  window.setInterval(() => ping(ALIVE_PATH, false), INTERVAL_MS);
  window.addEventListener("pagehide", () => ping(BYE_PATH, true));
  window.addEventListener("beforeunload", () => ping(BYE_PATH, true));
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) ping(ALIVE_PATH, false);
  });
}

// src/main.ts
var siteRoot = document.querySelector("#page-site");
var previewRoot = document.querySelector("#page-preview");
if (!siteRoot || !previewRoot) {
  throw new Error("\u7F3A\u5C11 #page-site / #page-preview \u5BB9\u5668");
}
var previewModule = null;
var previewLoading = null;
var ROUTES = /* @__PURE__ */ new Set(["/", "/upload", "/preview", "/chart-to-image", "/about"]);
var LEGACY_CHART_IMAGE_ROUTES = /* @__PURE__ */ new Set(["/usc-to-image", "/leveldata-to-image"]);
function normalizePath(pathname) {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}
function hasPreviewQuery(url2) {
  const keys = ["src", "sus", "json", "customScoreJson", "scoreJson", "config", "cfg", "bgm", "cover", "offset", "post"];
  return keys.some((key) => url2.searchParams.has(key));
}
async function ensurePreview() {
  if (previewModule) return previewModule;
  if (!previewLoading) {
    previewLoading = Promise.resolve().then(() => (init_mount(), mount_exports)).then((module) => {
      previewModule = module;
      return module;
    });
  }
  return previewLoading;
}
async function showPreview(payload) {
  document.body.classList.remove("site-mode");
  siteRoot.hidden = true;
  previewRoot.hidden = false;
  const module = await ensurePreview();
  await module.mountPreview(payload);
}
function showSite() {
  if (!previewRoot.hidden) {
    previewRoot.hidden = true;
    void previewModule?.pausePreview();
  }
  siteRoot.hidden = false;
  document.body.classList.add("site-mode");
}
async function route(pathname, payload) {
  const path = LEGACY_CHART_IMAGE_ROUTES.has(pathname) ? "/chart-to-image" : pathname;
  if (path !== pathname) {
    history.replaceState({}, "", path + location.search + location.hash);
  }
  if (path === "/preview") {
    document.title = "Sonolus Version \xB7 \u9884\u89C8\u9875";
    await showPreview(payload);
    return;
  }
  showSite();
  if (path === "/upload") {
    document.title = "Sonolus Version \xB7 \u52A0\u8F7D\u81EA\u5236\u8C31";
    renderUpload(siteRoot, (upload) => {
      history.pushState({}, "", "/preview");
      void showPreview(upload);
    });
    return;
  }
  if (path === "/about") {
    document.title = "Sonolus Version \xB7 \u5173\u4E8E";
    renderAbout(siteRoot);
    return;
  }
  if (path === "/chart-to-image") {
    document.title = "Sonolus Version \xB7 \u8C31\u9762\u8F6C\u56FE\u7247";
    const [{ mountChartToImage: mountChartToImage2, renderChartToImageMarkup: renderChartToImageMarkup2 }, { renderShell: renderShell2 }] = await Promise.all([
      Promise.resolve().then(() => (init_chartImage2(), chartImage_exports)),
      Promise.resolve().then(() => (init_shell(), shell_exports))
    ]);
    renderShell2(siteRoot, renderChartToImageMarkup2(), "/chart-to-image");
    mountChartToImage2(siteRoot);
    return;
  }
  document.title = "Sonolus Version \xB7 \u4E3B\u9875";
  renderHome(siteRoot);
}
document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = event.target?.closest("a");
  if (!anchor) return;
  if (anchor.target && anchor.target !== "_self") return;
  if (anchor.hasAttribute("download")) return;
  const url2 = new URL(anchor.href, location.href);
  if (url2.origin !== location.origin) return;
  const path = normalizePath(url2.pathname);
  if (!ROUTES.has(path)) return;
  event.preventDefault();
  if (path === normalizePath(location.pathname) && !url2.search) return;
  history.pushState({}, "", path + url2.search + url2.hash);
  void route(path);
});
window.addEventListener("popstate", () => {
  void route(normalizePath(location.pathname));
});
startKeepAlive();
var bootUrl = new URL(location.href);
var bootPath = normalizePath(bootUrl.pathname);
if (bootPath === "/preview" || hasPreviewQuery(bootUrl)) {
  if (bootPath !== "/preview") {
    history.replaceState({}, "", `/preview${bootUrl.search}${bootUrl.hash}`);
  }
  void route("/preview");
} else {
  void route(bootPath);
}
