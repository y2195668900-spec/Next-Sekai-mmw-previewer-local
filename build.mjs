#!/usr/bin/env node
/**
 * 用根仓库的 esbuild 打包（不引入新的依赖树）。
 *   node build.mjs
 * 产出：
 *   dist/app.js    浏览器 IIFE（index.html 直接引用）
 *   dist/core.mjs  Node 侧 ESM（供 test/*.mjs 断言用）
 *
 * wasm 产物在 `vendor/wasm/`（由 `scripts/sync-renderer.mjs` 从旧版同步），
 * 构建前会自动检查；缺了就先跑同步脚本。
 */
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const esbuild = require('esbuild')
const here = path.dirname(fileURLToPath(import.meta.url))

const glue = path.join(here, 'vendor/wasm/mmw-preview.js')
if (!fs.existsSync(glue)) {
  console.log('vendor/wasm 缺失，先同步旧版渲染器…')
  execFileSync(process.execPath, [path.join(here, 'scripts/sync-renderer.mjs')], { stdio: 'inherit' })
}

const common = { bundle: true, logLevel: 'info', absWorkingDir: here, target: 'es2020' }

await esbuild.build({
  ...common,
  entryPoints: ['src/main.ts'],
  // index.html 用 `<script type="module">` 加载，所以产物就是 ESM。
  // emscripten glue 里的 `import.meta.url` 因此可以原样保留（实际取 wasm 仍走 locateFile）。
  format: 'esm',
  outfile: 'dist/app.js',
})

await esbuild.build({
  ...common,
  entryPoints: ['src/parity/entry.ts'],
  format: 'esm',
  platform: 'node',
  outfile: 'dist/core.mjs',
})
