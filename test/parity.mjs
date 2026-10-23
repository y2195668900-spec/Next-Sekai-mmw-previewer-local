#!/usr/bin/env node
/**
 * 一致性自检（Node 侧）。
 *   node build.mjs && node test/parity.mjs [file...]
 *
 * 不给参数时跑 data/ 下所有 *.leveldata.json。
 * 退出码 0 = 全部通过；1 = 有失败项。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseLevelData, runParity } from '../dist/core.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')
const files =
  process.argv.length > 2
    ? process.argv.slice(2)
    : fs
        .readdirSync(path.join(root, 'data'))
        .filter((name) => name.endsWith('.leveldata.json'))
        .map((name) => path.join(root, 'data', name))

let failedTotal = 0
for (const file of files) {
  const chart = parseLevelData(fs.readFileSync(file, 'utf8'))
  console.log(`\n=== ${path.basename(file)} ===`)
  console.log(
    `  ${chart.notes.length} 音符 / ${chart.holds.length} 长条 / ${chart.simLines.length} 连线 / ${chart.groups.length} 时序组 / 时长 ${chart.duration.toFixed(2)}s`,
  )
  chart.groups.forEach((group, index) => {
    const markers = group.track.markers
    const skips = markers.filter((marker) => marker.skip !== 0).length
    console.log(`  group ${index}: ${markers.length} markers, ${skips} skip, 首个 marker ${markers[0]?.timescale ?? '-'}×`)
  })
  const results = runParity(chart)
  let failed = 0
  for (const result of results) {
    if (!result.ok) failed += 1
    console.log(`  ${result.ok ? 'PASS' : 'FAIL'}  ${result.name} — ${result.detail}`)
  }
  failedTotal += failed
  console.log(failed === 0 ? '  → 全部通过' : `  → ${failed} 项失败`)
}
console.log(failedTotal === 0 ? '\n全部文件通过' : `\n共 ${failedTotal} 项失败`)
process.exit(failedTotal === 0 ? 0 : 1)
