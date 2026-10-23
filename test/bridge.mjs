#!/usr/bin/env node
/**
 * 桥接一致性：**旧版渲染器的视觉时钟** 是否等于 **新版内核的位置函数**。
 *
 *   node build.mjs && node test/bridge.mjs [file...]
 *
 * 四条判据：
 *   1. 组下标对齐：旧版解析器给出的层数 == 时序组数，且每层首帧 tick 对得上；
 *   2. 关键帧上，旧格式曲线的积分 == `track.positionAt(secondsAtTick(tick))`；
 *   3. 每个音符的落点误差 < 1ms（渲染器就是用它决定「什么时候压线」）；
 *   4. `speedLayer` 不越界。
 *
 * 退出码 0 = 全部通过。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  parseLevelData,
  parseUscChart,
  buildCustomScore,
  bridgeFromDocument,
  clockFromSpeedLayer,
  TICKS_PER_BEAT,
} from '../dist/core.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')
const files =
  process.argv.length > 2
    ? process.argv.slice(2)
    : fs
        .readdirSync(path.join(root, 'data'))
        .filter((name) => name.endsWith('.leveldata.json') || name.endsWith('.usc'))
        .map((name) => path.join(root, 'data', name))

let failedTotal = 0

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  const isUsc = /\.usc$/i.test(file)
  let chart
  let result
  if (isUsc) {
    const imported = parseUscChart(text)
    chart = imported.chart
    result = bridgeFromDocument(imported.document, chart)
  } else {
    chart = parseLevelData(text)
    result = buildCustomScore(text, chart)
  }
  const { clock, stats, scoreText, legacyLayers } = result
  const document = JSON.parse(scoreText)

  console.log(`\n=== ${path.basename(file)}${isUsc ? '  [USC]' : ''} ===`)
  console.log(
    `  ${stats.notes} 音符 / ${stats.groups} 组 / ${stats.keys} 关键帧  曲线值域 ${stats.minValue.toFixed(2)} .. ${stats.maxValue.toFixed(2)}`,
  )
  if (stats.normalizedGroups > 0) console.log(`  补名 ${stats.normalizedGroups} 个 #TIMESCALE_GROUP`)
  for (const warning of result.warnings) console.log(`  ! ${warning}`)

  let failed = 0
  const fail = (name, detail) => {
    failed += 1
    console.log(`  FAIL  ${name} — ${detail}`)
  }
  const pass = (name, detail) => console.log(`  PASS  ${name} — ${detail}`)

  /* 1. 组下标对齐 */
  const mismatched = []
  for (let group = 0; group < chart.groups.length; group += 1) {
    const markers = chart.groups[group].track.markers
    const legacy = legacyLayers[group] ?? []
    if (legacy.length === 0) continue
    const expectedFirst = Math.round(clock.tickAtSeconds(markers[0].time))
    if (legacy[0].ticks !== expectedFirst) {
      mismatched.push(`g${group}: 旧层首帧 ${legacy[0].ticks} ≠ marker ${expectedFirst}`)
    }
  }
  if (legacyLayers.length === chart.groups.length && mismatched.length === 0) {
    pass('组下标对齐', `旧版 ${legacyLayers.length} 层 == 新内核 ${chart.groups.length} 组`)
  } else {
    fail(
      '组下标对齐',
      `旧版 ${legacyLayers.length} 层 vs 新内核 ${chart.groups.length} 组${mismatched.length ? '；' + mismatched.slice(0, 3).join('；') : ''}`,
    )
  }

  /* 2. 关键帧积分 */
  let worstKey = 0
  let worstKeyAt = ''
  for (let group = 0; group < chart.groups.length; group += 1) {
    const track = chart.groups[group].track
    const keys = document.SpeedLayers[group] ?? []
    for (const key of keys) {
      const expected = track.positionAt(clock.secondsAtTick(key.ticks))
      const actual = clockFromSpeedLayer(keys, clock, key.ticks)
      const error = Math.abs(actual - expected)
      if (error > worstKey) {
        worstKey = error
        worstKeyAt = `g${group}@${key.ticks}`
      }
    }
  }
  if (worstKey <= 1e-6) {
    pass('关键帧积分', `最大偏差 ${worstKey.toExponential(2)}s（${worstKeyAt || 'n/a'}）`)
  } else {
    fail('关键帧积分', `最大偏差 ${worstKey.toExponential(3)}s @ ${worstKeyAt}`)
  }

  /* 3. 音符落点：用「该音符所在组的曲线」算，检验渲染器将看到的时钟 */
  let worstNote = 0
  let worstNoteAt = ''
  for (const note of chart.notes) {
    const group = note.group >= 0 ? note.group : 0
    const track = chart.groups[group]?.track
    if (!track) continue
    const keys = document.SpeedLayers[group] ?? []
    const tick = Math.round(note.beat * TICKS_PER_BEAT)
    const expected = track.positionAt(clock.secondsAtTick(tick))
    const error = Math.abs(clockFromSpeedLayer(keys, clock, tick) - expected)
    if (error > worstNote) {
      worstNote = error
      worstNoteAt = `note#${note.id} beat ${note.beat.toFixed(2)}`
    }
  }
  if (worstNote <= 1e-3) {
    pass('音符落点', `${chart.notes.length} 个音符，最大偏差 ${(worstNote * 1000).toFixed(3)}ms（${worstNoteAt || 'n/a'}）`)
  } else {
    fail('音符落点', `最大偏差 ${(worstNote * 1000).toFixed(2)}ms @ ${worstNoteAt}`)
  }

  /* 4. speedLayer 越界 */
  const badLayer = document.NoteList.filter(
    (note) => Number(note.speedLayer) >= document.SpeedLayers.length || Number(note.speedLayer) < -1,
  ).length
  if (badLayer === 0) {
    pass('speedLayer 越界', `0 个（共 ${document.NoteList.length} 音符 / ${document.SpeedLayers.length} 层）`)
  } else {
    fail('speedLayer 越界', `${badLayer} 个音符越界`)
  }

  failedTotal += failed
  console.log(failed === 0 ? '  → 通过' : `  → ${failed} 项失败`)
}

console.log(failedTotal === 0 ? '\n桥接一致' : `\n共 ${failedTotal} 项失败`)
process.exit(failedTotal === 0 ? 0 : 1)
