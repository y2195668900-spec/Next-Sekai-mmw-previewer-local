#!/usr/bin/env node
/**
 * 把旧版的 wasm 渲染器与美术资源接到本工程，不做任何复制式修改。
 *
 *   node scripts/sync-renderer.mjs
 *
 * 做三件事：
 *  1. 从 `../src/generated` + `../public/wasm` 取 wasm 产物（只读），放到 `vendor/wasm/`；
 *  2. 扫描 `../public/assets/mmw` 生成 `vendor/manifest.json`（key = 相对路径）；
 *  3. 旧版的 `public/` 不复制 —— `serve.mjs` 直接把 `/assets/mmw/*` 挂到那里。
 *
 * `vendor/` 与 `assets/` 一样进 .gitignore：产物可重建，且美术资源不在代码许可内。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')
const legacy = path.join(root, '..')
const vendor = path.join(root, 'vendor')

function copy(from, to) {
  if (!fs.existsSync(from)) {
    return false
  }
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(from, to)
  return fs.statSync(to).size
}

// 1. wasm 产物
const jsSize = copy(path.join(legacy, 'src/generated/mmw-preview.js'), path.join(vendor, 'wasm/mmw-preview.js'))
const wasmSize = copy(path.join(legacy, 'public/wasm/mmw-preview.wasm'), path.join(vendor, 'wasm/mmw-preview.wasm'))
if (!jsSize || !wasmSize) {
  console.error('找不到旧版 wasm 产物，请先在旧版仓库跑 `npm run build:wasm`。')
  process.exit(1)
}
console.log(`  wasm  ${(wasmSize / 1048576).toFixed(2)} MB → vendor/wasm/`)
console.log(`  glue  ${(jsSize / 1024).toFixed(0)} KB → vendor/wasm/mmw-preview.js`)

// 2. 资源清单（key 就是 wasm 侧的 preload 键）
const assetRoot = path.join(legacy, 'public/assets/mmw')
if (!fs.existsSync(assetRoot)) {
  console.error('找不到旧版资源目录 public/assets/mmw。')
  process.exit(1)
}

const files = []
function walk(dir, prefix) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      walk(path.join(dir, entry.name), rel)
    } else if (/\.(png|jpe?g|webp|ttf|otf|mp3|m4a|ogg|wav|json)$/i.test(entry.name)) {
      files.push(rel)
    }
  }
}
walk(assetRoot, '')
files.sort()

const fonts = ['font/FOT-RodinNTLGPro-DB.ttf', 'font/FOT-RodinNTLG Pro EB.otf', 'font/NotoSansCJKSC-Black.ttf']
const sounds = {
  perfect: 'sound/se_live_perfect.mp3',
  criticalTap: 'sound/se_live_critical.mp3',
  flick: 'sound/se_live_flick.mp3',
  flickCritical: 'sound/se_live_flick_critical.mp3',
  trace: 'sound/se_live_trace.mp3',
  traceCritical: 'sound/se_live_trace_critical.mp3',
  tick: 'sound/se_live_connect.mp3',
  tickCritical: 'sound/se_live_connect_critical.mp3',
  holdLoop: 'sound/se_live_long.mp3',
  holdLoopCritical: 'sound/se_live_long_critical.mp3',
  allPerfect: 'overlay/ap-native/all-perfect.m4a',
}

const soundFiles = new Set(Object.values(sounds))
const fontFiles = new Set(fonts)
const assets = files.filter((f) => !soundFiles.has(f) && !fontFiles.has(f))

fs.mkdirSync(vendor, { recursive: true })
fs.writeFileSync(
  path.join(vendor, 'manifest.json'),
  JSON.stringify(
    {
      base: '/assets/mmw/',
      assets,
      fonts: [...fontFiles],
      sounds,
    },
    null,
    2,
  ) + '\n',
)
console.log(`  清单  ${assets.length} 个贴图 / ${fontFiles.size} 个字体 / ${soundFiles.size} 个音效 → vendor/manifest.json`)
