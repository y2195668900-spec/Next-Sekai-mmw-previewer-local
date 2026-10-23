/**
 * 一致性断言（parity checks）。
 *
 * 这些断言不依赖渲染，只针对「时间轴内核」。它们回答一个问题：
 * 新版本的视觉时钟，是否满足上游定义的那些恒等式与边界？
 *
 * 理想情况下还应与上游 Python 引擎逐 tick 对拍 —— 见 README 的 Phase 2 待办。
 */

import type { Chart } from '../data/types'
import { EaseType, easeValue, integrateNumeric, integrateTimes, isStepEase } from '../time/ease'
import { TempoMap } from '../time/bpm'
import { TimescaleTrack } from '../time/timescale'

export type CheckResult = { name: string; ok: boolean; detail: string }

/** 缓动的端点值：IN 型 0→1，STEP 型在端点保持阶跃 */
export function checkEaseEndpoints(): CheckResult[] {
  const results: CheckResult[] = []
  const bad: string[] = []
  for (let ease = 0; ease <= 41; ease += 1) {
    if (ease === EaseType.NONE || ease >= EaseType.IN_STEP) continue
    const family = Math.floor((ease - 2) / 4)
    // EXPO 族从 2^-10 起步（上游也是如此），端点必然差这一点；BACK/ELASTIC 会过冲
    const tolerance = family === 5 ? 2 ** -10 + 1e-6 : family === 7 || family === 8 ? 0.11 : 1e-6
    const start = easeValue(ease, 0)
    const end = easeValue(ease, 1)
    if (start < -tolerance || start > tolerance || Math.abs(end - 1) > tolerance) {
      bad.push(`${ease}: (${start.toFixed(4)}, ${end.toFixed(4)})`)
    }
  }
  results.push({
    name: 'ease 端点',
    ok: bad.length === 0,
    detail: bad.length === 0 ? '0→1 成立（EXPO 的 2^-10 偏差与上游一致）' : bad.join(' / '),
  })
  return results
}

/** 积分实现 vs 数值积分：覆盖平滑 / 组合 / 阶跃 / 高次 */
export function checkIntegration(): CheckResult[] {
  const cases: Array<[number, number, EaseType, string]> = [
    [1, 3, EaseType.LINEAR, 'linear 1→3'],
    [1, 3, EaseType.IN_QUAD, 'in_quad 1→3'],
    [3, 1, EaseType.OUT_QUAD, 'out_quad 3→1（降速）'],
    [1, 3, EaseType.IN_OUT_QUAD, 'in_out_quad 1→3'],
    [3, 1, EaseType.OUT_IN_CIRC, 'out_in_circ 3→1'],
    [2, 2, EaseType.IN_OUT_SINE, 'in_out_sine 2→2（恒速）'],
    [1, 5, EaseType.IN_QUART, 'in_quart 1→5'],
    [5, 0, EaseType.OUT_EXPO, 'out_expo 5→0'],
    [1, 3, EaseType.LINEAR, 'linear 1→3（长段）'],
    [1, 3, EaseType.IN_STEP, 'in_step 1→3'],
    [1, 3, EaseType.OUT_STEP, 'out_step 1→3'],
    [1, 3, EaseType.IN_OUT_STEP, 'in_out_step 1→3'],
  ]
  let worst = 0
  let worstName = ''
  for (const [v0, v1, ease, name] of cases) {
    const start = 10
    const end = 12
    for (const [left, right] of [
      [10, 12],
      [10.3, 11.7],
      [11.999, 12],
      [10, 10.001],
    ] as const) {
      const closed = integrateTimes(v0, v1, ease, start, end, left, right)
      const numeric = integrateNumeric(v0, v1, ease, start, end, left, right)
      const error = Math.abs(closed - numeric)
      if (error > worst) {
        worst = error
        worstName = `${name} [${left},${right}]`
      }
    }
  }
  return [
    {
      name: '积分实现 vs 数值积分',
      ok: worst < 2e-3,
      detail: `最大偏差 ${worst.toExponential(2)}（${worstName}）`,
    },
  ]
}

/** 阶跃缓动必须产出精确的阶跃积分（上游 step 分支是解析的） */
export function checkStepEase(): CheckResult[] {
  const v0 = 1
  const v1 = 3
  const okIn = Math.abs(integrateTimes(v0, v1, EaseType.IN_STEP, 0, 2, 0, 2) - 2 * v0) < 1e-9
  const okOut = Math.abs(integrateTimes(v0, v1, EaseType.OUT_STEP, 0, 2, 0, 2) - 2 * v1) < 1e-9
  const okInOut = Math.abs(integrateTimes(v0, v1, EaseType.IN_OUT_STEP, 0, 2, 0, 2) - (v0 + v1)) < 1e-9
  return [
    {
      name: '阶跃缓动积分',
      ok: okIn && okOut && okInOut,
      detail: `in_step=${okIn} out_step=${okOut} in_out_step=${okInOut}`,
    },
  ]
}

/** 变速轨迹：skip 必须在 marker 处产生精确位移跳变 */
export function checkSkip(chart: Chart): CheckResult[] {
  const results: CheckResult[] = []
  for (const [index, group] of chart.groups.entries()) {
    const markers = group.track.markers
    for (let i = 1; i < markers.length; i += 1) {
      const marker = markers[i]
      if (Math.abs(marker.skip) < 1e-9) continue
      const epsilon = 1e-6
      const before = group.track.positionAt(marker.time - epsilon)
      const at = group.track.positionAt(marker.time)
      const delta = at - before
      // 跳变 + 这一小段的积分（ε 内积分贡献可忽略）
      const expected = marker.skip
      if (Math.abs(delta - expected) > 1e-3) {
        results.push({
          name: `group ${index} skip @${marker.time.toFixed(2)}s`,
          ok: false,
          detail: `实测 ${delta.toFixed(4)}s，期望 ${expected.toFixed(4)}s`,
        })
      }
    }
  }
  if (results.length === 0) {
    results.push({ name: 'skip 位移跳变', ok: true, detail: '所有 marker 的 skip 都产生精确位移' })
  }
  return results
}

/**
 * position 与 speed 必须互为微积分：positionAt 的数值导数 ≈ speedAt。
 * 这是唯一能同时验证「积分正确」和「速度正确」的恒等式（跳过 skip 点）。
 */
export function checkPositionVsSpeed(chart: Chart): CheckResult[] {
  const results: CheckResult[] = []
  for (const [index, group] of chart.groups.entries()) {
    const track = group.track
    const end = Math.max(track.markers[track.markers.length - 1].time, 1)
    const h = 1e-4
    let worst = 0
    let worstAt = 0
    for (let t = h * 4; t < end; t += Math.max(0.05, end / 400)) {
      const nearSkip = track.markers.some((marker) => Math.abs(marker.time - t) < 1e-2)
      if (nearSkip) continue
      const derivative = (track.positionAt(t + h) - track.positionAt(t - h)) / (2 * h)
      const speed = track.speedAt(t)
      const error = Math.abs(derivative - speed)
      if (error > worst) {
        worst = error
        worstAt = t
      }
    }
    results.push({
      name: `group ${index} position↔speed`,
      ok: worst < 5e-2,
      detail: `最大偏差 ${worst.toExponential(2)} @${worstAt.toFixed(2)}s`,
    })
  }
  return results
}

/** BPM 往返 */
export function checkTempo(): CheckResult[] {
  const tempo = new TempoMap([
    { beat: 0, bpm: 150 },
    { beat: 4, bpm: 200 },
    { beat: 12, bpm: 90 },
  ])
  let worst = 0
  for (let beat = 0; beat <= 24; beat += 0.25) {
    const round = tempo.beatAt(tempo.timeAt(beat))
    worst = Math.max(worst, Math.abs(round - beat))
  }
  return [{ name: 'BPM 往返', ok: worst < 1e-9, detail: `最大误差 ${worst.toExponential(2)} beats` }]
}

/** 轨迹连续性：除 skip 点外，位置函数必须连续 */
export function checkContinuity(chart: Chart): CheckResult[] {
  const results: CheckResult[] = []
  for (const [index, group] of chart.groups.entries()) {
    const markers = group.track.markers
    let worst = 0
    let worstAt = 0
    for (let i = 1; i < markers.length; i += 1) {
      const t = markers[i].time
      if (Math.abs(markers[i].skip) > 1e-9) continue
      const before = group.track.positionAt(t - 1e-7)
      const at = group.track.positionAt(t)
      if (Math.abs(at - before) > worst) {
        worst = Math.abs(at - before)
        worstAt = t
      }
    }
    results.push({
      name: `group ${index} 连续性`,
      ok: worst < 1e-3,
      detail: `无 skip 的 marker 处最大跳变 ${worst.toExponential(2)} @${worstAt.toFixed(2)}s`,
    })
  }
  return results
}

export function runParity(chart: Chart): CheckResult[] {
  return [
    ...checkEaseEndpoints(),
    ...checkIntegration(),
    ...checkStepEase(),
    ...checkTempo(),
    ...checkSkip(chart),
    ...checkContinuity(chart),
    ...checkPositionVsSpeed(chart),
    ...chart.warnings.map((warning) => ({ name: '解析告警', ok: false, detail: warning })),
  ]
}

/** 供 main 面板显示：某组在给定时间的速度 */
export function speedOf(track: TimescaleTrack, time: number): number {
  return track.speedAt(time)
}

/** 供调试：是否存在阶跃缓动 */
export function hasStepEase(chart: Chart): boolean {
  return chart.groups.some((group) => group.track.markers.some((marker) => isStepEase(marker.ease)))
}
