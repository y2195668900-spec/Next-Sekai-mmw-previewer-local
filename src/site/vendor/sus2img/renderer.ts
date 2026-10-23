// @ts-nocheck
import { Fraction } from './fraction'
import { getNoteJudgment, JUDGMENT_FPS } from './judgmentTiming'
import {
    Directional,
    DirectionalType,
    Event,
    Score,
    Slide,
    SlideType,
    Tap,
} from './model'

const DEFAULT_STYLE = `.bar-line {
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
`

const WHITE_STYLE = `.bar-line {
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
`

import type { CrashMarkerRender } from './ghostNote'

export interface RenderOptions {
    noteHost: string
    styleSheet?: string
    laneWidth?: number
    lanePadding?: number
    timePadding?: number
    noteSize?: number
    timeHeight?: number
    flickHeight?: number
    slidePathPadding?: number
    metaSize?: number
    tickLength?: number
    tick2Length?: number
    nLanes?: number
    ghostNotes?: (Tap | Directional | Slide)[]
    crashMarkers?: CrashMarkerRender[]
    focusAnchors?: CrashMarkerRender[]
    /** 密集 highspeed 变化折叠为趋势箭头展示，默认开启；关闭后逐条展示每个变化 */
    condenseSpeedTrend?: boolean
    /** Only official inline previews opt into note hit targets; exports stay plain SVG. */
    interactiveJudgment?: boolean
}

export interface RenderedSvg {
    svg: string
    width: number
    height: number
}

type Point = [number, number]
type Bezier = [Point, Point, Point, Point]
type SpeedRenderPoint = {
    event: Event
    y: number
}

const SPEED_DENSE_MAX_GAP = 16

/**
 * 舞台左右各留 2 轨用来画越界音符（与 customScoreJson 的 GUTTER_LANES 必须一致）。
 * 留白宽度本来就有 `lanePadding = 40px`（laneWidth 16 时 = 2.5 轨），所以画布不需要变宽。
 */
const LANE_GUTTER = 2

/**
 * guide 8 色，直接取自皮肤图集 `Sekai Guide <Colour>` 的 1×1 采样点
 * （public/assets/mmw/skins/next-sekai-01/texture.png）。
 * 顺序与谱面的 `guideColor`（0 = neutral … 7 = black）一致。
 */
const GUIDE_COLORS = [
    '#EDEDED', // 0 neutral
    '#D6737B', // 1 red
    '#73D69D', // 2 green
    '#737BD6', // 3 blue
    '#D6B362', // 4 yellow
    '#D673CD', // 5 purple
    '#73ACD6', // 6 cyan
    '#000000', // 7 black
] as const
const SPEED_DENSE_MIN_POINTS = 4

const escapeXml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')

const r = (value: number): number => Math.round(value)

const fmt = (value: number): string => {
    if (Math.abs(value - Math.round(value)) < 1e-6) {
        return `${Math.round(value)}`
    }
    return `${Number(value.toFixed(3))}`
}

const formatBar = (bar: Fraction): string => {
    const n = bar.toNumber()
    if (Math.abs(n - Math.round(n)) < 1e-9) {
        return `${Math.round(n)}`
    }
    return `${Number(n.toFixed(4))}`
}

const formatSpeedRatio = (speedRatio: number): string => `${fmt(speedRatio)}x`

const getNoteSpeedRatio = (note: Tap | Directional | Slide): number | null => {
    if (note.speed) {
        return note.speed
    }
    if (note instanceof Directional) {
        return note.tap?.speed ?? null
    }
    if (note instanceof Slide) {
        return note.tap?.speed ?? note.directional?.speed ?? note.directional?.tap?.speed ?? null
    }
    return null
}

const getRhythmTickState = (note: Tap | Directional | Slide): boolean | null => {
    if (!(note instanceof Slide)) {
        return note.isTick()
    }
    if (note.decoration) {
        return null
    }

    const isChainHead = note.head === note
    const isChainTail = note.next === null
    if (!isChainHead && !isChainTail) {
        return null
    }
    if (note.type !== SlideType.START && note.type !== SlideType.END) {
        return null
    }

    return note.isTick()
}

const cloneEvent = (event: Event): Event =>
    new Event({
        bar: event.bar,
        bpm: event.bpm,
        barLength: event.barLength,
        sentenceLength: event.sentenceLength,
        speed: event.speed,
        seVolume: event.seVolume,
        section: event.section,
        text: event.text,
    })

class SentenceRenderer {
    private readonly drawing: DrawingRenderer
    private readonly barStart: number
    private readonly barStop: number

    private slidePaths: string[] = []
    private amongImages: string[] = []
    private noteImages: string[] = []
    private flickImages: string[] = []
    private noteSpeedTexts: string[] = []
    private tickTexts: string[] = []
    private crashMarkerElements: string[] = []

    private readonly sentenceGhostNotes: (Tap | Directional | Slide)[]
    private readonly sentenceCrashMarkers: CrashMarkerRender[]
    private readonly sentenceFocusAnchors: CrashMarkerRender[]

    constructor(
        drawing: DrawingRenderer,
        barStart: number,
        barStop: number,
        sentenceGhostNotes?: (Tap | Directional | Slide)[],
        sentenceCrashMarkers?: CrashMarkerRender[],
        sentenceFocusAnchors?: CrashMarkerRender[],
    ) {
        this.drawing = drawing
        this.barStart = barStart
        this.barStop = barStop
        this.sentenceGhostNotes = sentenceGhostNotes ?? []
        this.sentenceCrashMarkers = sentenceCrashMarkers ?? []
        this.sentenceFocusAnchors = sentenceFocusAnchors ?? []
    }

    private get yBaseTop(): number {
        return this.drawing.timePadding
    }

    private getRelativeY(bar: Fraction): number {
        return this.drawing.timeHeight * this.drawing.score.getTimeDelta(bar, new Fraction(this.barStop)) + this.yBaseTop
    }

    private renderJudgmentTargets(height: number): string {
        if (!this.drawing.interactiveJudgment) return ''
        const bottom = height + this.drawing.timePadding * 2
        const parts: string[] = []
        const stopTime = this.drawing.score.getTime(this.barStop)
        const earliest = stopTime - (height + this.drawing.timePadding) / this.drawing.timeHeight
        const latest = stopTime + this.drawing.timePadding / this.drawing.timeHeight
        const notes = this.drawing.judgmentNotes
        let low = 0
        let high = notes.length
        while (low < high) {
            const mid = (low + high) >>> 1
            if (notes[mid].time < earliest) low = mid + 1
            else high = mid
        }
        for (let index = low; index < notes.length && notes[index].time <= latest; index += 1) {
            const { note, profile, id, time } = notes[index]
            const y = (stopTime - time) * this.drawing.timeHeight + this.yBaseTop
            const x = this.drawing.laneWidth * (note.lane - 2) + this.drawing.lanePadding - 3
            const width = this.drawing.laneWidth * note.width + 6
            const flick = note instanceof Directional || (note instanceof Slide && note.type === SlideType.END && note.directional)
            const top = Math.max(0, y - (flick ? this.drawing.flickHeight : 7))
            const label = this.drawing.judgmentProfiles[profile].label
            parts.push(`<rect data-judge-note="${id}" data-profile="${profile}" data-center="${fmt(y)}" x="${fmt(x)}" y="${fmt(top)}" width="${fmt(width)}" height="${fmt(Math.min(bottom, y + 7) - top)}" fill="transparent" tabindex="0" role="button" aria-label="${escapeXml(label)}判定区间" aria-pressed="false" style="cursor:pointer" />`)
        }
        return `<g data-judge-targets="" data-pixels-per-frame="${this.drawing.timeHeight / JUDGMENT_FPS}" data-bottom="${fmt(bottom)}">${parts.join('')}</g>`
    }

    private getBezierCoordinates(slide0: Slide, slide1: Slide): [Bezier, Bezier] {
        const y0 = this.getRelativeY(slide0.bar)
        const y1 = this.getRelativeY(slide1.bar)

        const easeIn =
            Boolean(slide0.directional) && slide0.directional?.type === DirectionalType.DOWN
        const easeOut =
            Boolean(slide0.directional) &&
            (slide0.directional?.type === DirectionalType.LOWER_LEFT ||
                slide0.directional?.type === DirectionalType.LOWER_RIGHT)

        const slidePathPadding = slide0.decoration ? 0 : this.drawing.slidePathPadding

        return [
            [
                [this.drawing.laneWidth * (slide0.lane - 2) + this.drawing.lanePadding - slidePathPadding, y0],
                [
                    this.drawing.laneWidth * (slide0.lane - 2) + this.drawing.lanePadding - slidePathPadding,
                    easeIn ? (y0 + y1) / 2 : y0,
                ],
                [
                    this.drawing.laneWidth * (slide1.lane - 2) + this.drawing.lanePadding - slidePathPadding,
                    easeOut ? (y0 + y1) / 2 : y1,
                ],
                [this.drawing.laneWidth * (slide1.lane - 2) + this.drawing.lanePadding - slidePathPadding, y1],
            ],
            [
                [
                    this.drawing.laneWidth * (slide0.lane - 2 + slide0.width) +
                        this.drawing.lanePadding +
                        slidePathPadding,
                    y0,
                ],
                [
                    this.drawing.laneWidth * (slide0.lane - 2 + slide0.width) +
                        this.drawing.lanePadding +
                        slidePathPadding,
                    easeIn ? (y0 + y1) / 2 : y0,
                ],
                [
                    this.drawing.laneWidth * (slide1.lane - 2 + slide1.width) +
                        this.drawing.lanePadding +
                        slidePathPadding,
                    easeOut ? (y0 + y1) / 2 : y1,
                ],
                [
                    this.drawing.laneWidth * (slide1.lane - 2 + slide1.width) +
                        this.drawing.lanePadding +
                        slidePathPadding,
                    y1,
                ],
            ],
        ]
    }

    private binarySolutionForX(y: number, curve: Bezier): number {
        let start = 0
        let end = 1

        for (let i = 0; i < 60; i += 1) {
            const t = (start + end) / 2
            const p = this.bezierPoint(curve, t)
            if (Math.abs(p[1] - y) < 0.1) {
                return p[0]
            }
            if (p[1] > y) {
                start = t
            } else {
                end = t
            }
        }

        return this.bezierPoint(curve, (start + end) / 2)[0]
    }

    private bezierPoint(curve: Bezier, t: number): Point {
        const inv = 1 - t
        const x =
            curve[0][0] * inv ** 3 +
            curve[1][0] * 3 * inv ** 2 * t +
            curve[2][0] * 3 * inv * t ** 2 +
            curve[3][0] * t ** 3
        const y =
            curve[0][1] * inv ** 3 +
            curve[1][1] * 3 * inv ** 2 * t +
            curve[2][1] * 3 * inv * t ** 2 +
            curve[3][1] * t ** 3
        return [x, y]
    }

    private addFrictionAmongImage(note: Tap | Directional | Slide) {
        const y = this.getRelativeY(note.bar)
        const x =
            this.drawing.laneWidth * (note.lane + note.width / 2 - 2) + this.drawing.lanePadding

        const w = this.drawing.laneWidth * 0.75
        const h = this.drawing.laneWidth * 0.75

        const suffix = note.isCritical() ? '_crtcl' : note instanceof Directional ? '_flick' : '_long'

        this.amongImages.push(
            `<image href="${escapeXml(`${this.drawing.noteHost}/notes_friction_among${suffix}.png`)}" x="${fmt(
                r(x - w / 2),
            )}" y="${fmt(r(y - h / 2))}" width="${fmt(r(w))}" height="${fmt(r(h))}"${this.noteTint(note)} />`,
        )
    }

    private addAmongImage(note: Slide, leftCurve: Bezier, rightCurve: Bezier) {
        const y = this.getRelativeY(note.bar)
        const xl = this.binarySolutionForX(y, leftCurve)
        const xr = this.binarySolutionForX(y, rightCurve)
        const x = (xl + xr) / 2

        const w = this.drawing.laneWidth
        const h = this.drawing.laneWidth

        this.amongImages.push(
            `<image href="${escapeXml(
                `${this.drawing.noteHost}/notes_long_among${note.isCritical() ? '_crtcl' : ''}.png`,
            )}" x="${fmt(r(x - w / 2))}" y="${fmt(r(y - h / 2))}" width="${fmt(r(w))}" height="${fmt(
                r(h),
            )}" />`,
        )
    }

    /**
     * 沿贝塞尔曲线按 y 找参数并做 De Casteljau 拆分。
     * keepFirst=true 返回靠起点的一半（裁掉越过上边界的部分），
     * keepFirst=false 返回靠终点的一半（从下边界开始画到终点）。
     */
    private clipBezierAtY(curve: Bezier, yBoundary: number, keepFirst: boolean): Bezier | null {
        const y0 = curve[0][1]
        const y1 = curve[3][1]
        if ((y0 - yBoundary) * (y1 - yBoundary) >= 0) {
            return null
        }
        let low = 0
        let high = 1
        let found = (low + high) / 2
        for (let i = 0; i < 40; i += 1) {
            const t = (low + high) / 2
            const y = this.bezierPoint(curve, t)[1]
            if (Math.abs(y - yBoundary) < 0.01) {
                found = t
                break
            }
            if ((y - yBoundary) * (y0 - yBoundary) > 0) {
                low = t
            } else {
                high = t
            }
            found = t
        }
        return this.splitBezier(curve, found, keepFirst)
    }

    /** De Casteljau 拆分：first=true 返回靠 p0 的一半，否则靠 p3 的一半。 */
    private splitBezier(curve: Bezier, t: number, first: boolean): Bezier {
        const lerp = (a: Point, b: Point): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
        const [p0, p1, p2, p3] = curve
        const p01 = lerp(p0, p1)
        const p12 = lerp(p1, p2)
        const p23 = lerp(p2, p3)
        const p012 = lerp(p01, p12)
        const p123 = lerp(p12, p23)
        const p0123 = lerp(p012, p123)
        return first ? [p0, p01, p012, p0123] : [p0123, p123, p23, p3]
    }

    /**
     * 链头是否在别的列。跨列的长条 body 只有 START 所在列画得出「自己那一段」，
     * 后续列里的 relay 必须自己接力画，否则每列边界处会断（比如 4 小节起的长 hold
     * 只画到第 8 小节）。
     */
    private isChainContinuation(note: Slide): boolean {
        const head = note.head
        if (!head) {
            return false
        }
        return head.bar.toNumber() < this.barStart - 1
    }

    private addSlidePath(slide: Slide) {
        const lefts: Bezier[] = []
        const rights: Bezier[] = []

        const boundaryBar = this.barStop + 1
        let slide0: Slide | null = slide
        while (slide0 && slide0.type !== SlideType.END) {
            const amongs: Slide[] = []
            let slide1: Slide | null = slide0.next
            while (slide1) {
                if (slide1.type === SlideType.RELAY) {
                    amongs.push(slide1)
                }
                if (slide1.isPath()) {
                    break
                }
                slide1 = slide1.next
            }

            if (!slide1) {
                break
            }

            const [fullLeft, fullRight] = this.getBezierCoordinates(slide0, slide1)

            // 段的终点在别的列：把贝塞尔裁在本列上边界，剩下的交给下一列接力。
            if (slide1.bar.toNumber() >= boundaryBar) {
                const yBoundary = this.getRelativeY(new Fraction(boundaryBar))
                const clippedLeft = this.clipBezierAtY(fullLeft, yBoundary, true)
                const clippedRight = this.clipBezierAtY(fullRight, yBoundary, true)
                if (clippedLeft && clippedRight) {
                    lefts.push(clippedLeft)
                    rights.push(clippedRight)
                }
                break
            }

            lefts.push(fullLeft)
            rights.push(fullRight)

            for (const among of amongs) {
                this.addAmongImage(among, fullLeft, fullRight)
            }

            slide0 = slide1
        }

        if (!lefts.length) {
            return
        }

        this.emitSlidePath(slide, lefts, rights)
    }

    /**
     * END 所在列的「收尾段」：链条跨列且前一节点在别的列时，把 prev→END 的段
     * 裁在本列下边界以内，保证尾巴接得上。
     */
    private addSlidePathTail(end: Slide) {
        const head = end.head
        if (!head) {
            return
        }
        let prev: Slide | null = null
        let cursor: Slide | null = head
        while (cursor && cursor !== end) {
            if (cursor.isPath()) {
                prev = cursor
            }
            cursor = cursor.next
        }
        if (!prev || prev.bar.toNumber() >= this.barStart - 1) {
            return
        }

        const [fullLeft, fullRight] = this.getBezierCoordinates(prev, end)
        const yBoundary = this.getRelativeY(new Fraction(this.barStart - 1))
        // keepFirst=false：整段是 prev(下方)→end(上方)，本列只要「边界→end」的下半段。
        const clippedLeft = this.clipBezierAtY(fullLeft, yBoundary, false)
        const clippedRight = this.clipBezierAtY(fullRight, yBoundary, false)
        if (!clippedLeft || !clippedRight) {
            return
        }
        this.emitSlidePath(end, [clippedLeft], [clippedRight])
    }

    /** 把 lefts/rights 一串贝塞尔拼成闭合 path 发出去（样式沿用链首的属性）。 */
    private emitSlidePath(slide: Slide, lefts: Bezier[], rights: Bezier[]): void {
        if (!lefts.length) {
            return
        }
        const commands: string[] = []
        for (let i = 0; i < lefts.length; i += 1) {
            const l = lefts[i]
            if (i === 0) {
                commands.push(`M ${fmt(r(l[0][0]))} ${fmt(r(l[0][1]))}`)
            }
            commands.push(
                `C ${fmt(r(l[1][0]))} ${fmt(r(l[1][1]))} ${fmt(r(l[2][0]))} ${fmt(r(l[2][1]))} ${fmt(
                    r(l[3][0]),
                )} ${fmt(r(l[3][1]))}`,
            )
        }

        for (let i = rights.length - 1; i >= 0; i -= 1) {
            const rr = rights[i]
            if (i === rights.length - 1) {
                commands.push(`L ${fmt(r(rr[3][0]))} ${fmt(r(rr[3][1]))}`)
            }
            commands.push(
                `C ${fmt(r(rr[2][0]))} ${fmt(r(rr[2][1]))} ${fmt(r(rr[1][0]))} ${fmt(r(rr[1][1]))} ${fmt(
                    r(rr[0][0]),
                )} ${fmt(r(rr[0][1]))}`,
            )
        }

        commands.push('Z')

        const className = slide.decoration
            ? slide.isCritical()
                ? 'decoration-critical'
                : 'decoration'
            : slide.isCritical()
              ? 'slide-critical'
              : 'slide'

        // 配色优先级：guide 用 `guideColor` 的渐变，其它音符用 `style` 的纯色，
        // 都没有就沿用 class 里的默认 fill。inline style 才能压过 class。
        let pathStyle = ''
        if (slide.decoration && !slide.isCritical() && slide.guideColor !== null && slide.guideColor >= 0) {
            const index = Math.min(slide.guideColor, GUIDE_COLORS.length - 1)
            pathStyle = ` style="fill:url(#decoration-gradient-${index})"`
        } else if (!slide.decoration && !slide.isCritical() && slide.noteColor !== null) {
            const index = Math.min(Math.max(slide.noteColor, 0), GUIDE_COLORS.length - 1)
            pathStyle = ` style="fill:${GUIDE_COLORS[index]}cc"`
        }
        this.slidePaths.push(`<path d="${commands.join(' ')}" class="${className}"${pathStyle} />`)
    }

    /**
     * damage（危险条）：换用 Next SEKAI 图集自带的 damage 皮肤
     * （`Sekai Damage Note Basic <Colour>`，已抽到 notes_new/<skin>/damage_<colour>.png）。
     * 不走 note-tint 滤镜，也不吃 critical 金色 —— 危险条永远只有这 8 个变体。
     */
    private addDamageImage(note: Tap | Directional | Slide, opacity = 1) {
        const y = this.getRelativeY(note.bar)
        const x = this.drawing.laneWidth * (note.lane - 2) + this.drawing.lanePadding
        const w = this.drawing.laneWidth * note.width
        const h = (this.drawing.laneWidth / 64) * 56 * 2
        const colors = ['neutral', 'red', 'green', 'blue', 'yellow', 'purple', 'cyan', 'black']
        const index =
            note.noteColor !== null ? Math.min(Math.max(note.noteColor, 0), colors.length - 1) : 0
        const src = `${this.drawing.noteHost}/damage_${colors[index]}.png`
        const tag = `<image href="${escapeXml(src)}" x="${fmt(r(x))}" y="${fmt(
            r(y - h / 2),
        )}" width="${fmt(r(w))}" height="${fmt(r(h))}" />`
        this.noteImages.push(opacity < 1 ? `<g opacity="${fmt(opacity)}">${tag}</g>` : tag)
    }

    /**
     * 音符颜色变体的统一入口：critical 保持金色精灵，没写 `style` 的保持默认配色。
     * 所有类型（tap / flick / trace / hold）都走这一条判断，避免各画各的。
     */
    private noteTint(note: Tap | Directional | Slide): string {
        if (note.isCritical() || note.noteColor === null || note.damage) {
            return ''
        }
        const index = Math.min(Math.max(note.noteColor, 0), GUIDE_COLORS.length - 1)
        return ` filter="url(#note-tint-${index})"`
    }

    private addNoteImage(note: Tap | Directional | Slide, opacity = 1) {
        if (note.damage) {
            this.addDamageImage(note, opacity)
            return
        }
        const y = this.getRelativeY(note.bar)
        const x = this.drawing.laneWidth * (note.lane - 2.5) + this.drawing.lanePadding

        const w = this.drawing.laneWidth * (note.width + 1)
        const h = (this.drawing.laneWidth / 64) * 56 * 2

        let noteNumber = 2

        if (note.isNone()) {
            return
        }

        if (note.isTrend()) {
            if (opacity >= 1) {
                this.addFrictionAmongImage(note)
            }
            if (note.isCritical()) {
                noteNumber = 5
            } else if (note instanceof Directional) {
                noteNumber = 6
            } else {
                noteNumber = 4
            }
        } else if (note.isCritical()) {
            noteNumber = 0
        } else if (note instanceof Directional) {
            noteNumber = 3
        } else if (note instanceof Slide) {
            if (note.type === SlideType.END && note.directional) {
                noteNumber = 3
            } else {
                noteNumber = 1
            }
        }

        // 精灵是按「整数轨宽」预先定义的（`#notes-<类型>-<n>`，n = 1..nLanes），
        // 但 USC / LevelData 的宽度是连续的（0.75、1.5、2.25…）。用四舍五入后的
        // 整数宽度选符号，绘制尺寸仍用连续宽度 w —— 两边不留空白，音符大小才和谱面一致。
        const spriteWidth = Math.min(this.drawing.nLanes, Math.max(1, Math.round(note.width)))
        const tint = this.noteTint(note)
        const useTag = `<use href="#notes-${noteNumber}-${spriteWidth}" x="${fmt(r(x))}" y="${fmt(
            r(y - h / 2),
        )}" width="${fmt(r(w))}" height="${fmt(r(h))}"${tint} />`

        if (opacity < 1) {
            this.noteImages.push(`<g opacity="${fmt(opacity)}">${useTag}</g>`)
            return
        }

        this.noteImages.push(useTag)
    }

    private addNoteSpeedText(note: Tap | Directional | Slide) {
        if (note.isNone() && !(note instanceof Slide)) {
            return
        }
        if (note instanceof Slide && note.head !== note) {
            return
        }

        const speedRatio = getNoteSpeedRatio(note)
        if (!speedRatio) {
            return
        }

        const y = this.getRelativeY(note.bar)
        const x =
            this.drawing.laneWidth * (note.lane - 2 + note.width / 2) +
            this.drawing.lanePadding
        const text = formatSpeedRatio(speedRatio)
        this.noteSpeedTexts.push(
            `<text x="${fmt(r(x))}" y="${fmt(r(y))}" class="note-speed-text">${escapeXml(
                text,
            )}</text>`,
        )
    }

    private addFlickImage(note: Directional | Slide) {
        if (note.isNone()) {
            return
        }

        let type: DirectionalType | null = DirectionalType.UP

        if (note instanceof Directional) {
            if (note.type === DirectionalType.UPPER_LEFT) {
                type = DirectionalType.UPPER_LEFT
            } else if (note.type === DirectionalType.UPPER_RIGHT) {
                type = DirectionalType.UPPER_RIGHT
            }
        } else if (note.directional) {
            if (note.directional.type === DirectionalType.UPPER_LEFT) {
                type = DirectionalType.UPPER_LEFT
            } else if (note.directional.type === DirectionalType.UPPER_RIGHT) {
                type = DirectionalType.UPPER_RIGHT
            } else if (note.directional.type === DirectionalType.UP) {
                type = DirectionalType.UP
            } else {
                type = null
            }
        } else {
            type = null
        }

        if (type === null) {
            return
        }

        const width = note.width < 6 ? note.width : 6
        // 箭头贴图按整数轨宽命名（`notes_flick_arrow_02.png`），连续宽度只能决定缩放，
        // 不能进文件名 —— 否则会去请求 `_02.25.png` 这种不存在的资源。
        const arrowSpriteWidth = Math.max(1, Math.min(6, Math.round(width)))
        const y = this.getRelativeY(note.bar)

        const h0 = this.drawing.flickHeight
        const h = h0 * ((width + 3) / 3) ** 0.75
        const w = h0 * 1.5 * ((width + 0.5) / 3) ** 0.75
        const x = this.drawing.laneWidth * (note.lane - 2 + note.width / 2) + this.drawing.lanePadding
        const bias =
            type === DirectionalType.UPPER_LEFT
                ? -this.drawing.noteSize / 4
                : type === DirectionalType.UPPER_RIGHT
                  ? this.drawing.noteSize / 4
                  : 0

        const src = `${this.drawing.noteHost}/notes_flick_arrow${note.isCritical() ? '_crtcl' : ''}_0${arrowSpriteWidth}${
            type === DirectionalType.UPPER_LEFT || type === DirectionalType.UPPER_RIGHT ? '_diagonal' : ''
        }.png`

        const transform =
            type === DirectionalType.UPPER_RIGHT
                ? ` transform="translate(${fmt(r((x + bias) * 2))} 0) scale(-1 1)"`
                : ''

        this.flickImages.push(
            `<image href="${escapeXml(src)}" x="${fmt(r(x - w / 2 + bias))}" y="${fmt(
                r(y + this.drawing.noteSize / 4 - h),
            )}" width="${fmt(r(w))}" height="${fmt(r(h))}"${transform}${this.noteTint(note)} />`,
        )
    }

    private addTickText(note: Tap | Directional | Slide, next: Tap | Directional | Slide | null) {
        const y = this.getRelativeY(note.bar)

        if (next === null) {
            this.tickTexts.push(
                `<line x1="${fmt(r(this.drawing.lanePadding - this.drawing.tick2Length))}" y1="${fmt(
                    r(y),
                )}" x2="${fmt(r(this.drawing.lanePadding))}" y2="${fmt(r(y))}" class="tick-line" />`,
            )
            return
        }

        let interval: Fraction
        const noteBar = note.bar
        const nextBar = next.bar

        if (
            next === note ||
            nextBar.equals(noteBar) ||
            nextBar.sub(noteBar).compare(1) > 0 ||
            (nextBar.sub(noteBar).compare(0.5) > 0 && Math.floor(nextBar.toNumber()) !== Math.floor(noteBar.toNumber()))
        ) {
            interval = new Fraction(Math.floor(noteBar.toNumber() + 1)).sub(noteBar)
        } else {
            interval = nextBar.sub(noteBar)
        }

        interval = interval.mul(this.drawing.score.getEvent(note.bar).barLength ?? new Fraction(4)).div(4)
        interval = interval.limitDenominator(100)

        if (interval.compare(0) === 0) {
            return
        }

        const numerator = Number(interval.numerator)
        const denominator = Number(interval.denominator)
        const text = numerator !== 1 ? `${numerator}/${denominator}` : `/${denominator}`

        this.tickTexts.push(
            `<line x1="${fmt(r(this.drawing.lanePadding - this.drawing.tickLength))}" y1="${fmt(
                r(y),
            )}" x2="${fmt(r(this.drawing.lanePadding))}" y2="${fmt(r(y))}" class="tick-line" />`,
        )
        this.tickTexts.push(
            `<text x="${fmt(r(this.drawing.lanePadding - 4))}" y="${fmt(r(y - 2))}" class="tick-text">${escapeXml(
                text,
            )}</text>`,
        )
    }

    private renderGhostNotes() {
        for (const ghostNote of this.sentenceGhostNotes) {
            if (ghostNote instanceof Tap) {
                this.addNoteImage(ghostNote, 0.35)
            } else if (ghostNote instanceof Directional) {
                this.addGhostFlickImage(ghostNote)
                this.addNoteImage(ghostNote, 0.35)
            } else if (ghostNote instanceof Slide) {
                // Ghost slide: note image only, no path, no flick
                this.addNoteImage(ghostNote, 0.35)
            }
        }
    }

    private addGhostFlickImage(note: Directional) {
        if (note.isNone()) {
            return
        }

        let type: DirectionalType | null = DirectionalType.UP

        if (note.type === DirectionalType.UPPER_LEFT) {
            type = DirectionalType.UPPER_LEFT
        } else if (note.type === DirectionalType.UPPER_RIGHT) {
            type = DirectionalType.UPPER_RIGHT
        }

        if (type === null) {
            return
        }

        const width = note.width < 6 ? note.width : 6
        // 箭头贴图按整数轨宽命名（`notes_flick_arrow_02.png`），连续宽度只能决定缩放，
        // 不能进文件名 —— 否则会去请求 `_02.25.png` 这种不存在的资源。
        const arrowSpriteWidth = Math.max(1, Math.min(6, Math.round(width)))
        const y = this.getRelativeY(note.bar)

        const h0 = this.drawing.flickHeight
        const h = h0 * ((width + 3) / 3) ** 0.75
        const w = h0 * 1.5 * ((width + 0.5) / 3) ** 0.75
        const x = this.drawing.laneWidth * (note.lane - 2 + note.width / 2) + this.drawing.lanePadding
        const bias =
            type === DirectionalType.UPPER_LEFT
                ? -this.drawing.noteSize / 4
                : type === DirectionalType.UPPER_RIGHT
                  ? this.drawing.noteSize / 4
                  : 0

        const src = `${this.drawing.noteHost}/notes_flick_arrow${note.isCritical() ? '_crtcl' : ''}_0${arrowSpriteWidth}${
            type === DirectionalType.UPPER_LEFT || type === DirectionalType.UPPER_RIGHT ? '_diagonal' : ''
        }.png`

        const transform =
            type === DirectionalType.UPPER_RIGHT
                ? ` transform="translate(${fmt(r((x + bias) * 2))} 0) scale(-1 1)"`
                : ''

        this.flickImages.push(
            `<g opacity="0.35"><image href="${escapeXml(src)}" x="${fmt(r(x - w / 2 + bias))}" y="${fmt(
                r(y + this.drawing.noteSize / 4 - h),
            )}" width="${fmt(r(w))}" height="${fmt(r(h))}"${transform} /></g>`,
        )
    }

    private renderCrashMarkers() {
        for (const marker of this.sentenceCrashMarkers) {
            const y = this.getRelativeY(marker.bar)
            const cx = this.drawing.laneWidth * (marker.lane + marker.width / 2) + this.drawing.lanePadding
            const r = Math.max(10, 8 + marker.width * 2)
            const labelY = y - 18 - marker.markerIndex * 18

            this.crashMarkerElements.push(
                `<circle cx="${fmt(cx)}" cy="${fmt(y)}" r="${fmt(r)}" fill="${marker.color}" fill-opacity="0.16" stroke="${marker.color}" stroke-width="3" />`,
            )
            this.crashMarkerElements.push(
                `<circle cx="${fmt(cx)}" cy="${fmt(y)}" r="4" fill="${marker.color}" />`,
            )
            this.crashMarkerElements.push(
                `<line x1="${fmt(cx)}" y1="${fmt(y)}" x2="${fmt(cx)}" y2="${fmt(labelY)}" stroke="${marker.color}" stroke-width="2" stroke-dasharray="4 3" />`,
            )
            this.crashMarkerElements.push(
                `<text x="${fmt(cx)}" y="${fmt(labelY)}" text-anchor="middle" font-size="16" font-weight="700" fill="${marker.color}" stroke="#ffffff" stroke-width="4" paint-order="stroke fill">${escapeXml(marker.label)}</text>`,
            )
        }
    }

    private renderFocusAnchors(): string {
        const anchors: string[] = []

        for (const anchor of this.sentenceFocusAnchors) {
            const y = this.getRelativeY(anchor.bar)
            const cx = this.drawing.laneWidth * (anchor.lane + anchor.width / 2) + this.drawing.lanePadding
            anchors.push(
                `<circle id="sus-conflict-focus-${anchor.diagnosticId}" cx="${fmt(cx)}" cy="${fmt(y)}" r="1" fill="transparent" />`,
            )
        }

        return anchors.join('\n')
    }

    private renderSpeedPoint(point: SpeedRenderPoint, condensed = false): string[] {
        const laneStart = this.drawing.lanePadding
        const laneEnd = this.drawing.laneWidth * this.drawing.nLanes + laneStart
        return [
            `<line x1="${fmt(r(laneStart))}" y1="${fmt(r(point.y))}" x2="${fmt(r(laneEnd))}" y2="${fmt(r(point.y))}" class="${condensed ? 'speed-line-condensed' : 'speed-line'}" />`,
            `<text x="${fmt(r(laneEnd - 2))}" y="${fmt(r(point.y - 2))}" class="speed-text">${escapeXml(
                formatSpeedRatio(point.event.speed),
            )}</text>`,
        ]
    }

    private renderDenseSpeedGroup(points: SpeedRenderPoint[], visibleTop: number, visibleBottom: number): string[] {
        const head = points[0]
        const tail = points[points.length - 1]
        const parts: string[] = []
        if (visibleTop <= head.y && head.y <= visibleBottom) {
            parts.push(...this.renderSpeedPoint(head, true))
        }
        if (tail !== head && visibleTop <= tail.y && tail.y <= visibleBottom) {
            parts.push(...this.renderSpeedPoint(tail, true))
        }

        const arrowStartY = Math.max(visibleTop, Math.min(visibleBottom, head.y))
        const arrowEndY = Math.max(visibleTop, Math.min(visibleBottom, tail.y))
        const arrowX =
            this.drawing.laneWidth * this.drawing.nLanes +
            this.drawing.lanePadding * 1.5
        if (Math.abs(arrowStartY - arrowEndY) >= 12) {
            const direction = Math.sign(arrowEndY - arrowStartY)
            const lineEndY = arrowEndY - direction * 7
            const arrowBaseY = arrowEndY - direction * 8
            parts.push(
                `<line x1="${fmt(r(arrowX))}" y1="${fmt(r(arrowStartY))}" x2="${fmt(r(arrowX))}" y2="${fmt(r(lineEndY))}" class="speed-trend-line" />`,
                `<polygon points="${fmt(r(arrowX))},${fmt(r(arrowEndY))} ${fmt(r(arrowX - 4))},${fmt(r(arrowBaseY))} ${fmt(r(arrowX + 4))},${fmt(r(arrowBaseY))}" class="speed-trend-head" />`,
            )
        }

        return parts
    }

    private renderSpeedEvents(): string[] {
        const visibleTop = 0
        const visibleBottom =
            this.drawing.timeHeight * this.drawing.score.getTimeDelta(this.barStart, this.barStop) +
            this.drawing.timePadding * 2
        const margin = SPEED_DENSE_MAX_GAP * SPEED_DENSE_MIN_POINTS
        const points = this.drawing.score.events
            .filter((event) => event.speed !== null)
            .map((event): SpeedRenderPoint => ({
                event,
                y:
                    this.drawing.timeHeight * this.drawing.score.getTimeDelta(event.bar, this.barStop) +
                    this.drawing.timePadding,
            }))
            .filter((point) => visibleTop - margin <= point.y && point.y <= visibleBottom + margin)

        const parts: string[] = []
        for (let start = 0; start < points.length;) {
            let end = start + 1
            while (
                end < points.length &&
                Math.abs(points[end].y - points[end - 1].y) <= SPEED_DENSE_MAX_GAP
            ) {
                end += 1
            }

            const group = points.slice(start, end)
            if (this.drawing.condenseSpeedTrend && group.length >= SPEED_DENSE_MIN_POINTS) {
                parts.push(...this.renderDenseSpeedGroup(group, visibleTop, visibleBottom))
            } else {
                for (const point of group) {
                    if (visibleTop <= point.y && point.y <= visibleBottom) {
                        parts.push(...this.renderSpeedPoint(point))
                    }
                }
            }
            start = end
        }

        return parts
    }

    private renderEvents(): string[] {
        const parts: string[] = []

        for (let bar = this.barStart; bar <= this.barStop; bar += 1) {
            parts.push(
                `<line x1="${fmt(r(this.drawing.lanePadding))}" y1="${fmt(
                    r(this.drawing.timeHeight * this.drawing.score.getTimeDelta(bar, this.barStop) + this.drawing.timePadding),
                )}" x2="${fmt(r(this.drawing.laneWidth * this.drawing.nLanes + this.drawing.lanePadding))}" y2="${fmt(
                    r(this.drawing.timeHeight * this.drawing.score.getTimeDelta(bar, this.barStop) + this.drawing.timePadding),
                )}" class="bar-line" />`,
            )

            const event = this.drawing.score.getEvent(bar)
            const eventBarLength = event.barLength ?? new Fraction(4)
            for (let i = 1; i < Math.ceil(eventBarLength.toNumber()); i += 1) {
                const t = this.drawing.score.getTimeDelta(
                    new Fraction(bar).add(new Fraction(i, eventBarLength)),
                    this.barStop,
                )
                const y = this.drawing.timeHeight * t + this.drawing.timePadding
                parts.push(
                    `<line x1="${fmt(r(this.drawing.lanePadding))}" y1="${fmt(r(y))}" x2="${fmt(
                        r(this.drawing.laneWidth * this.drawing.nLanes + this.drawing.lanePadding),
                    )}" y2="${fmt(r(y))}" class="beat-line" />`,
                )
            }
        }

        const printEvents: Event[] = []
        const mergedEvents = [
            ...Array.from({ length: this.barStop - this.barStart + 1 }, (_, i) =>
                new Event({ bar: this.barStart + i }),
            ),
            ...this.drawing.score.events,
        ].sort((a, b) => a.bar.compare(b.bar))

        parts.push(...this.renderSpeedEvents())

        for (const event of mergedEvents) {
            const eventY =
                this.drawing.timeHeight * this.drawing.score.getTimeDelta(event.bar, this.barStop) +
                this.drawing.timePadding

            const hasEventText = Boolean(
                event.bpm ||
                    event.barLength ||
                    event.section ||
                    event.text ||
                    event.seVolume !== null,
            )
            if (event.speed !== null && !hasEventText) {
                continue
            }

            const last = printEvents[printEvents.length - 1]
            if (last && event.bar.sub(last.bar).compare(new Fraction(1, 16)) <= 0) {
                printEvents[printEvents.length - 1] = last.merge(event)
            } else {
                printEvents.push(cloneEvent(event))
            }

            const special = Boolean(
                event.bpm ||
                    event.barLength ||
                    event.speed ||
                    event.seVolume !== null ||
                    event.section ||
                    event.text,
            )
            parts.push(
                `<line x1="${fmt(r(0))}" y1="${fmt(r(eventY))}" x2="${fmt(r(this.drawing.lanePadding))}" y2="${fmt(
                    r(eventY),
                )}" class="${special ? 'event-flag' : 'bar-count-flag'}" />`,
            )
        }

        for (const event of printEvents) {
            if (!(this.barStart - 1 <= event.bar.toNumber() && event.bar.toNumber() < this.barStop + 1)) {
                continue
            }

            const text = [
                Math.abs(event.bar.toNumber() - Math.round(event.bar.toNumber())) < 1e-9
                    ? `#${formatBar(event.bar)}`
                    : null,
                event.bpm ? `${fmt(event.bpm.toNumber())} BPM` : null,
                event.barLength ? `${fmt(event.barLength.toNumber())}/4` : null,
                event.seVolume !== null ? `SE ${fmt(event.seVolume)}` : null,
                event.section,
                event.text,
            ]
                .filter((v) => Boolean(v))
                .join(', ')

            if (!text.length) {
                continue
            }

            const special = Boolean(
                event.bpm ||
                    event.barLength ||
                    event.speed ||
                    event.seVolume !== null ||
                    event.section ||
                    event.text,
            )
            const y =
                this.drawing.timeHeight * this.drawing.score.getTimeDelta(event.bar, this.barStop) +
                this.drawing.timePadding

            parts.push(
                `<text x="${fmt(r(this.drawing.lanePadding + 8))}" y="${fmt(r(y - this.drawing.laneWidth * 1.5))}" transform="rotate(-90 ${fmt(
                    r(this.drawing.lanePadding),
                )} ${fmt(r(y))})" class="${special ? 'event-text' : 'bar-count-text'}">${escapeXml(
                    text,
                )}</text>`,
            )
        }

        return parts
    }

    render(): { content: string; width: number; height: number } {
        for (let i = 0; i < this.drawing.score.notes.length; i += 1) {
            const note = this.drawing.score.notes[i]

            if (note instanceof Slide) {
                let slide: Slide | null = note.head
                let before = false

                while (slide) {
                    while (slide && !slide.isPath()) {
                        slide = slide.next
                    }

                    if (!slide) {
                        break
                    }

                    const bar = slide.bar.toNumber()
                    if (this.barStart - 1 <= bar && bar < this.barStop + 1) {
                        break
                    }
                    if (bar < this.barStart - 1) {
                        before = true
                    } else if (before && this.barStop + 1 < bar) {
                        slide = null
                        break
                    }

                    slide = slide.next
                }

                if (!slide) {
                    continue
                }
            } else {
                const bar = note.bar.toNumber()
                if (!(this.barStart - 1 <= bar && bar < this.barStop + 1)) {
                    continue
                }
            }

            const rhythmTickState = getRhythmTickState(note)
            if (rhythmTickState !== null) {
                let nextTick: Tap | Directional | Slide | null = null
                if (rhythmTickState) {
                    nextTick = note
                    for (let j = i; j < this.drawing.score.notes.length; j += 1) {
                        const candidate = this.drawing.score.notes[j]
                        if (getRhythmTickState(candidate) && candidate.bar.compare(note.bar) > 0) {
                            nextTick = candidate
                            break
                        }
                    }
                }

                this.addTickText(note, nextTick)
            }

            this.addNoteSpeedText(note)

            if (note instanceof Tap) {
                this.addNoteImage(note)
            } else if (note instanceof Directional) {
                this.addFlickImage(note)
                this.addNoteImage(note)
            } else if (!note.decoration) {
                if (note.type === SlideType.START) {
                    this.addSlidePath(note)
                    this.addNoteImage(note)
                } else if (note.type === SlideType.END) {
                    if (note.directional) {
                        this.addFlickImage(note)
                    }
                    this.addNoteImage(note)
                    // 长条跨列且链头在别的列：本列补「边界→尾巴」的收尾段。
                    if (this.isChainContinuation(note)) {
                        this.addSlidePathTail(note)
                    }
                } else if (this.isChainContinuation(note)) {
                    // 长条跨列：本列里的 relay 接力画自己负责的那一段。
                    this.addSlidePath(note)
                }
            } else {
                if (note.type === SlideType.START) {
                    this.addSlidePath(note)
                } else if (note.type === SlideType.END) {
                    if (this.isChainContinuation(note)) {
                        this.addSlidePathTail(note)
                    }
                } else if (this.isChainContinuation(note)) {
                    this.addSlidePath(note)
                }
                if (note.tap) {
                    this.addNoteImage(note.tap)
                    if (note.directional) {
                        this.addFlickImage(note)
                    }
                }
            }
        }

        // Render ghost notes (suppressed/deduped notes with reduced opacity)
        this.renderGhostNotes()

        // Render crash markers (for crash/render_bug diagnostics)
        this.renderCrashMarkers()

        const height = this.drawing.timeHeight * this.drawing.score.getTimeDelta(this.barStart, this.barStop)

        const parts: string[] = []
        parts.push(
            `<rect x="0" y="0" width="${fmt(r(this.drawing.laneWidth * this.drawing.nLanes + this.drawing.lanePadding * 2))}" height="${fmt(
                r(height + this.drawing.timePadding * 2),
            )}" class="background" />`,
        )
        parts.push(
            `<rect x="${fmt(r(this.drawing.lanePadding))}" y="0" width="${fmt(
                r(this.drawing.laneWidth * this.drawing.nLanes),
            )}" height="${fmt(r(height + this.drawing.timePadding * 2))}" class="lane" />`,
        )

        for (let lane = 0; lane <= this.drawing.nLanes; lane += 2) {
            const x = this.drawing.laneWidth * lane + this.drawing.lanePadding
            parts.push(
                `<line x1="${fmt(r(x))}" y1="0" x2="${fmt(r(x))}" y2="${fmt(r(
                    height + this.drawing.timePadding * 2,
                ))}" class="lane-line" />`,
            )
        }

        parts.push(...this.renderEvents())
        // 越界音符允许画到左右各 2 轨的留白里，超出部分由 clipPath 裁掉；
        // 拍号文字（tickTexts）在这之后绘制，始终压在音符上方。
        parts.push('<g clip-path="url(#lane-clip)">')
        parts.push(...this.slidePaths)
        parts.push(...this.noteImages)
        parts.push(...this.amongImages)
        parts.push(...this.flickImages.slice().reverse())
        parts.push('</g>')
        parts.push(...this.noteSpeedTexts)
        parts.push(...this.crashMarkerElements)
        parts.push(...this.tickTexts)
        parts.push(this.renderJudgmentTargets(height))

        const focusAnchors = this.renderFocusAnchors()
        if (focusAnchors) {
            parts.push(focusAnchors)
        }

        return {
            content: parts.join('\n'),
            width: Math.round(this.drawing.laneWidth * this.drawing.nLanes + this.drawing.lanePadding * 2),
            height: Math.round(height + this.drawing.timePadding * 2),
        }
    }
}

class DrawingRenderer {
    readonly score: Score
    readonly nLanes: number
    readonly laneWidth: number
    readonly timeHeight: number
    readonly noteSize: number
    readonly flickHeight: number
    readonly lanePadding: number
    readonly timePadding: number
    readonly slidePathPadding: number
    readonly metaSize: number
    readonly tickLength: number
    readonly tick2Length: number
    readonly noteHost: string
    readonly styleSheet: string
    readonly ghostNotes: (Tap | Directional | Slide)[]
    readonly crashMarkers: CrashMarkerRender[]
    readonly focusAnchors: CrashMarkerRender[]
    readonly condenseSpeedTrend: boolean
    readonly interactiveJudgment: boolean
    readonly judgmentProfiles: NonNullable<ReturnType<typeof getNoteJudgment>>[] = []
    readonly judgmentNotes: Array<{ note: Tap | Directional | Slide; profile: number; id: number; time: number }>

    constructor(score: Score, options: RenderOptions) {
        this.score = score
        this.nLanes = options.nLanes ?? 12
        this.noteHost = options.noteHost

        this.laneWidth = options.laneWidth ?? 16
        this.timeHeight = options.timeHeight ?? 360
        this.noteSize = options.noteSize ?? 16
        this.flickHeight = options.flickHeight ?? 24

        this.lanePadding = options.lanePadding ?? 40
        this.timePadding = options.timePadding ?? 32
        this.slidePathPadding = options.slidePathPadding ?? -1
        this.metaSize = options.metaSize ?? 192

        this.tickLength = options.tickLength ?? 24
        this.tick2Length = options.tick2Length ?? 8

        this.ghostNotes = options.ghostNotes ?? []
        this.crashMarkers = options.crashMarkers ?? []
        this.focusAnchors = options.focusAnchors ?? []
        this.condenseSpeedTrend = options.condenseSpeedTrend ?? true
        this.interactiveJudgment = options.interactiveJudgment ?? false
        const profiles = new Map<string, number>()
        this.judgmentNotes = this.interactiveJudgment ? score.notes.flatMap((note, id) => {
            const judgment = getNoteJudgment(note)
            if (!judgment) return []
            const key = JSON.stringify(judgment)
            let profile = profiles.get(key)
            if (profile === undefined) {
                profile = this.judgmentProfiles.length
                profiles.set(key, profile)
                this.judgmentProfiles.push(judgment)
            }
            return [{ note, profile, id, time: score.getTime(note.bar) }]
        }).sort((a, b) => a.time - b.time) : []

        this.styleSheet = `${DEFAULT_STYLE}\n${WHITE_STYLE}${options.styleSheet ? `\n${options.styleSheet}` : ''}`
    }

    private renderNoteDefinitions(): string {
        const ratio = 1200
        const defs: string[] = []

        for (let noteNumber = 0; noteNumber <= 6; noteNumber += 1) {
            defs.push(
                `<symbol id="notes-${noteNumber}" viewBox="0 0 112 56"><image href="${escapeXml(
                    `${this.noteHost}/notes_${noteNumber}.png`,
                )}" x="-3" y="-3" width="118" height="62" /></symbol>`,
            )

            defs.push(
                `<symbol id="notes-${noteNumber}-middle" viewBox="0 0 ${112 * ratio} 56"><image href="${escapeXml(
                    `${this.noteHost}/notes_${noteNumber}.png`,
                )}" x="${fmt(-(3 + 28) * ratio)}" y="-3" width="${fmt(118 * ratio)}" height="62" preserveAspectRatio="none" /></symbol>`,
            )

            for (let i = 1; i <= this.nLanes; i += 1) {
                const noteHeight = this.noteSize
                const noteWidth = this.laneWidth * (i + 1)
                const noteInnerWidth = this.laneWidth * i
                const noteLWidth = (noteHeight / 56) * 32
                const noteRWidth = noteLWidth
                const noteMWidth = noteInnerWidth - (noteLWidth + noteRWidth) / 2 - 2
                const notePaddingX =
                    (noteWidth - noteLWidth - noteMWidth - noteRWidth) / 2

                defs.push(
                    `<symbol id="notes-${noteNumber}-${i}" viewBox="0 0 ${fmt(noteWidth)} ${fmt(noteHeight)}">` +
                        `<clipPath id="notes-${noteNumber}-${i}-left"><rect x="0" y="0" width="${fmt(
                            noteLWidth,
                        )}" height="${fmt(noteHeight)}" /></clipPath>` +
                        `<clipPath id="notes-${noteNumber}-${i}-middle"><rect x="0" y="0" width="${fmt(
                            noteMWidth,
                        )}" height="${fmt(noteHeight)}" /></clipPath>` +
                        `<clipPath id="notes-${noteNumber}-${i}-right"><rect x="${fmt(
                            (noteHeight / 56) * 80,
                        )}" y="0" width="${fmt(noteRWidth)}" height="${fmt(noteHeight)}" /></clipPath>` +
                        `<use href="#notes-${noteNumber}" x="${fmt(notePaddingX)}" y="0" width="${fmt(
                            noteHeight * 2,
                        )}" height="${fmt(noteHeight)}" clip-path="url(#notes-${noteNumber}-${i}-left)" />` +
                        `<use href="#notes-${noteNumber}-middle" x="${fmt(
                            notePaddingX + noteLWidth,
                        )}" y="0" width="${fmt(noteHeight * ratio * 2)}" height="${fmt(
                            noteHeight,
                        )}" clip-path="url(#notes-${noteNumber}-${i}-middle)" />` +
                        `<use href="#notes-${noteNumber}" x="${fmt(
                            notePaddingX + noteLWidth + noteMWidth + noteRWidth - noteHeight * 2,
                        )}" y="0" width="${fmt(noteHeight * 2)}" height="${fmt(
                            noteHeight,
                        )}" clip-path="url(#notes-${noteNumber}-${i}-right)" />` +
                        `</symbol>`,
                )
            }
        }

        // Damage 音符（危险条）：Next SEKAI 图集自带 8 色皮肤，已抽成
        // `notes_new/<skin>/damage_<colour>.png`，与普通音符同一套三段切片布局。
        const damageVariants = ['neutral', 'red', 'green', 'blue', 'yellow', 'purple', 'cyan', 'black']
        for (let variant = 0; variant < damageVariants.length; variant += 1) {
            const base = `notes-damage-${variant}`
            const image = `${this.noteHost}/damage_${damageVariants[variant]}.png`
            defs.push(
                `<symbol id="${base}" viewBox="0 0 112 56"><image href="${escapeXml(image)}" x="-3" y="-3" width="118" height="62" /></symbol>`,
            )
            defs.push(
                `<symbol id="${base}-middle" viewBox="0 0 ${112 * ratio} 56"><image href="${escapeXml(image)}" x="${fmt(-(3 + 28) * ratio)}" y="-3" width="${fmt(118 * ratio)}" height="62" preserveAspectRatio="none" /></symbol>`,
            )
            for (let i = 1; i <= this.nLanes; i += 1) {
                const noteHeight = this.noteSize
                const noteWidth = this.laneWidth * (i + 1)
                const noteInnerWidth = this.laneWidth * i
                const noteLWidth = (noteHeight / 56) * 32
                const noteRWidth = noteLWidth
                const noteMWidth = noteInnerWidth - (noteLWidth + noteRWidth) / 2 - 2
                const notePaddingX = (noteWidth - noteLWidth - noteMWidth - noteRWidth) / 2

                defs.push(
                    `<symbol id="${base}-${i}" viewBox="0 0 ${fmt(noteWidth)} ${fmt(noteHeight)}">` +
                        `<clipPath id="${base}-${i}-left"><rect x="0" y="0" width="${fmt(noteLWidth)}" height="${fmt(noteHeight)}" /></clipPath>` +
                        `<clipPath id="${base}-${i}-middle"><rect x="0" y="0" width="${fmt(noteMWidth)}" height="${fmt(noteHeight)}" /></clipPath>` +
                        `<clipPath id="${base}-${i}-right"><rect x="${fmt((noteHeight / 56) * 80)}" y="0" width="${fmt(noteRWidth)}" height="${fmt(noteHeight)}" /></clipPath>` +
                        `<use href="#${base}" x="${fmt(notePaddingX)}" y="0" width="${fmt(noteHeight * 2)}" height="${fmt(noteHeight)}" clip-path="url(#${base}-${i}-left)" />` +
                        `<use href="#${base}-middle" x="${fmt(notePaddingX + noteLWidth)}" y="0" width="${fmt(noteHeight * ratio * 2)}" height="${fmt(noteHeight)}" clip-path="url(#${base}-${i}-middle)" />` +
                        `<use href="#${base}" x="${fmt(notePaddingX + noteLWidth + noteMWidth + noteRWidth - noteHeight * 2)}" y="0" width="${fmt(noteHeight * 2)}" height="${fmt(noteHeight)}" clip-path="url(#${base}-${i}-right)" />` +
                        `</symbol>`,
                )
            }
        }

        return defs.join('\n')
    }

    render(): RenderedSvg {
        if (!this.score.notes.length) {
            throw new Error('谱面中没有可渲染的音符')
        }

        const nBars = Math.ceil(this.score.notes[this.score.notes.length - 1].bar.toNumber())

        const drawings: Array<{ content: string; width: number; height: number }> = []
        let totalWidth = 0
        let totalHeight = 0

        let bar = 0
        let event = new Event({
            bar: 0,
            bpm: 120,
            barLength: 4,
            sentenceLength: 4,
        })

        for (let i = 0; i <= nBars; i += 1) {
            const currentEvent = this.score.getEvent(i)
            const currentSentenceLength = currentEvent.sentenceLength || 4
            const previousSentenceLength = event.sentenceLength || 4

            if (
                bar !== i &&
                (currentEvent.section !== event.section ||
                    currentSentenceLength !== previousSentenceLength ||
                    i === bar + previousSentenceLength ||
                    i === nBars)
            ) {
                // Filter ghost notes for this sentence's bar range
                const sentenceGhosts = this.ghostNotes.filter((note) => {
                    const noteBar = note.bar.toNumber()
                    return noteBar >= bar - 1 && noteBar < i + 1
                })
                // Filter crash markers for this sentence's bar range
                const sentenceCrash = this.crashMarkers.filter((marker) => {
                    const markerBar = marker.bar.toNumber()
                    return markerBar >= bar - 1 && markerBar < i + 1
                })
                // Filter focus anchors for this sentence's bar range
                const sentenceFocus = this.focusAnchors.filter((anchor) => {
                    const anchorBar = anchor.bar.toNumber()
                    return anchorBar >= bar - 1 && anchorBar < i + 1
                })
                const sentence = new SentenceRenderer(
                    this, bar, i,
                    sentenceGhosts.length ? sentenceGhosts : undefined,
                    sentenceCrash.length ? sentenceCrash : undefined,
                    sentenceFocus.length ? sentenceFocus : undefined,
                ).render()
                drawings.push(sentence)
                totalWidth += sentence.width
                if (totalHeight < sentence.height) {
                    totalHeight = sentence.height
                }
                bar = i
            }

            event = event.merge(currentEvent)
        }

        const width = totalWidth + this.lanePadding * 2
        const height = totalHeight + this.timePadding * 2 + this.metaSize + this.timePadding * 2

        const parts: string[] = []
        parts.push(`<?xml version="1.0" encoding="UTF-8"?>`)
        parts.push(
            `<svg xmlns="http://www.w3.org/2000/svg"${this.interactiveJudgment ? ' data-judge-preview=""' : ''} width="${fmt(width)}" height="${fmt(
                height,
            )}" viewBox="0 0 ${fmt(width)} ${fmt(height)}">`,
        )
        if (this.interactiveJudgment) parts.push(`<metadata data-judge-profiles="">${escapeXml(JSON.stringify(this.judgmentProfiles))}</metadata>`)
        parts.push('<defs>')
        parts.push(`<style><![CDATA[${this.styleSheet}]]></style>`)

        parts.push(
            `<linearGradient id="decoration-gradient" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--color-start)" /><stop offset="1" stop-color="var(--color-stop)" /></linearGradient>`,
        )
        parts.push(
            `<linearGradient id="decoration-critical-gradient" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--color-start)" /><stop offset="1" stop-color="var(--color-stop)" /></linearGradient>`,
        )
        // 每条 guide 自己的颜色变体：谱面 `guideColor` 0..7 → GUIDE_COLORS。
        GUIDE_COLORS.forEach((color, index) => {
            parts.push(
                `<linearGradient id="decoration-gradient-${index}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${color}99" /><stop offset="1" stop-color="${color}33" /></linearGradient>`,
            )
            // 音符精灵是预着色 PNG，只能靠 multiply 染色把色相拉过去；
            // `color-interpolation-filters="sRGB"` 是必须的，否则会在线性空间里算，颜色发灰。
            //
            // `feComposite operator="in"` 不能省：feFlood 会把整个滤镜区域（元素的
            // bounding box + 默认 10% 外扩）涂满纯色，直接与 SourceGraphic 相乘时，
            // 精灵透明的地方会被保留成**实心色块**——宽音符看起来就是一条铺满舞台
            // 的紫色底。先用 SourceAlpha 把 flood 裁成音符的轮廓，再相乘，颜色就只
            // 落在音符本体上。
            parts.push(
                `<filter id="note-tint-${index}" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0" result="gray" /><feFlood flood-color="${color}" result="tint" /><feComposite in="tint" in2="SourceAlpha" operator="in" result="tintMasked" /><feBlend in="gray" in2="tintMasked" mode="multiply" /></filter>`,
            )
        })
        parts.push(this.renderNoteDefinitions())
        const clipLeft = this.lanePadding - LANE_GUTTER * this.laneWidth
        const clipWidth = (this.nLanes + LANE_GUTTER * 2) * this.laneWidth
        parts.push(
            `<clipPath id="lane-clip" clipPathUnits="userSpaceOnUse"><rect x="${fmt(clipLeft)}" y="-100000" width="${fmt(
                clipWidth,
            )}" height="200000" /></clipPath>`,
        )
        parts.push('</defs>')

        parts.push(
            `<rect x="0" y="0" width="${fmt(width)}" height="${fmt(
                totalHeight + this.timePadding * 2,
            )}" class="background" />`,
        )
        parts.push(
            `<rect x="0" y="${fmt(totalHeight + this.timePadding * 2)}" width="${fmt(width)}" height="${fmt(
                this.metaSize + this.timePadding * 2,
            )}" class="meta" />`,
        )
        parts.push(
            `<line x1="0" y1="${fmt(totalHeight + this.timePadding * 2)}" x2="${fmt(width)}" y2="${fmt(
                totalHeight + this.timePadding * 2,
            )}" class="meta-line" />`,
        )

        parts.push(
            `<image href="${escapeXml(
                this.score.meta.jacket || `${this.noteHost}/../../logo.png`,
            )}" x="${fmt(this.lanePadding * 2)}" y="${fmt(
                totalHeight + this.timePadding * 3,
            )}" width="${fmt(this.metaSize)}" height="${fmt(this.metaSize)}" />`,
        )

        const title = [this.score.meta.title, this.score.meta.artist].filter((x) => x).join(' - ') || 'Untitled'
        parts.push(
            `<text x="${fmt(this.metaSize + this.lanePadding * 4)}" y="${fmt(
                this.metaSize + totalHeight + this.timePadding * 3 - 16,
            )}" class="title">${escapeXml(title)}</text>`,
        )

        const subtitle = [
            this.score.meta.difficulty ? String(this.score.meta.difficulty).toUpperCase() : null,
            this.score.meta.playlevel,
            '譜面確認',
        ]
            .filter((x) => x)
            .join(' ')

        parts.push(
            `<text x="${fmt(this.metaSize + this.lanePadding * 4)}" y="${fmt(
                this.metaSize / 3 + totalHeight + this.timePadding * 3 - 8,
            )}" class="subtitle">${escapeXml(subtitle)}</text>`,
        )

        let x = 0
        for (const drawing of drawings) {
            const tx = x + this.lanePadding
            const ty = totalHeight - drawing.height + this.timePadding
            // Use nested SVG viewport to clip overflow notes at sentence boundaries.
            parts.push(
                `<svg x="${fmt(tx)}" y="${fmt(ty)}" width="${fmt(drawing.width)}" height="${fmt(
                    drawing.height,
                )}" viewBox="0 0 ${fmt(drawing.width)} ${fmt(drawing.height)}" style="overflow:hidden">${drawing.content}</svg>`,
            )
            x += drawing.width
        }

        parts.push('</svg>')

        return {
            svg: parts.join('\n'),
            width: Math.round(width),
            height: Math.round(height),
        }
    }
}

export const renderScoreToSvg = (score: Score, options: RenderOptions): RenderedSvg => {
    const renderer = new DrawingRenderer(score, options)
    return renderer.render()
}

export const defaultSus2ImgStyleSheet = `${DEFAULT_STYLE}\n${WHITE_STYLE}`
