/**
 * 舞台布局（Phase 2）：接入上游 `sekai/lib/layout.py` 的 approach 曲线。
 *
 * 已对齐的部分：
 *   - 纵向曲率：travel = APPROACH_SCALE^(1 - x)，APPROACH_SCALE = 1.06^-45（layout.py:38,736-743）
 *   - 横向宽度随深度收缩：tilt_width_factor(depth) ∝ depth（layout.py:923-924，tilt=1 时）
 *
 * 仍是近似的部分：
 *   - 相机变换（`DynamicLayout` 的 w_scale / h_scale / t / rotate）与 stage tilt、
 *     camera zoom 没有实现，等价于「固定正对、无倾斜」的相机。
 *   - 因此判定线在屏幕上的绝对位置是自定的，不是从 `CameraInfo` 推出来的。
 */

/** 上游常量：layout.py:38 */
export const APPROACH_SCALE = 1.06 ** -45
/** 上游常量：layout.py:25，音符半高（stage 单位） */
export const NOTE_H = 75 / 850 / 2

export const LAYOUT = {
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
  laneSpan: 12,
}

export function setNoteSpeed(speed: number): void {
  const clamped = Math.min(12, Math.max(1, speed))
  LAYOUT.preemptSec = 12 / clamped
}

export function getNoteSpeed(): number {
  return 12 / LAYOUT.preemptSec
}

/** 上游 approach 曲线：x∈[0,1] → travel∈[APPROACH_SCALE, 1] */
export function approachCurve(x: number): number {
  return Math.pow(APPROACH_SCALE, 1 - Math.min(1, Math.max(0, x)))
}

/**
 * 进度 → 屏幕 y。
 *
 * 注意：上游把 travel 直接喂给相机变换（`transform_vec`，layout.py:935-939），
 * 而相机参数（w_scale / h_scale / t / rotate）来自 CameraInfo，本实现还没接。
 * 所以这里用「等效透视指数」逼近同样的观感：越靠近判定线，屏幕位移越快。
 * 曲线形状与上游一致（指数 2.1 ≈ 1.06^45 在对数尺度的斜率），但不是同一套坐标。
 */
export function progressToY(progress: number): number {
  const p = Math.min(1, Math.max(0, progress))
  const normalized = 1 - Math.pow(1 - p, LAYOUT.perspective)
  return LAYOUT.horizonY + (LAYOUT.judgementY - LAYOUT.horizonY) * Math.min(1, Math.max(0, normalized))
}

/** 该进度处的半宽比例：上游 tilt_width_factor 里宽度正比于 depth */
export function halfWidthAtProgress(progress: number): number {
  const p = Math.min(1, Math.max(0, progress))
  const normalized = 1 - Math.pow(1 - p, LAYOUT.perspective)
  return LAYOUT.baseHalfWidth * (0.34 + 0.66 * Math.min(1, Math.max(0, normalized)))
}

/** lane 中心（-6..6）→ 屏幕 x（0..1） */
export function laneToX(lane: number, progress: number, mirror = false): number {
  const normalized = lane / LAYOUT.laneSpan
  return 0.5 + (mirror ? -normalized : normalized) * halfWidthAtProgress(progress) * 2
}

/** lane 宽度 → 屏幕宽度（0..1） */
export function widthToScreen(size: number, progress: number): number {
  return (size / LAYOUT.laneSpan) * halfWidthAtProgress(progress) * 2
}

/**
 * 视觉进度：1 = 正好在判定线上，0 = 刚出现。
 * `distance` 是「还有多少视觉秒」，正数表示还没到。
 */
export function progressFromDistance(distance: number): number {
  return 1 - distance / LAYOUT.preemptSec
}

/** 反解：给定 progress 求还剩多少视觉秒（用于剔除判定） */
export function distanceFromProgress(progress: number): number {
  return (1 - progress) * LAYOUT.preemptSec
}
