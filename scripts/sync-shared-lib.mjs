#!/usr/bin/env node
/**
 * 把根仓库 `src/lib` 里与谱面解析相关的模块拷进 `sonolus version/src/lib`。
 *
 * 这层目录是「独立仓库」形态需要的：单独发布 `sonolus version` 时，根仓库的
 * `src/lib` 并不在仓库里，而 esbuild 又无法引用仓库外的相对路径。开发时由本
 * 脚本每次构建前同步一份，保证两边不会悄悄分叉。
 *
 *   node scripts/sync-shared-lib.mjs          # 同步（根仓库不存在则跳过）
 *   node scripts/sync-shared-lib.mjs --check  # 只检查副本是否存在
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(here, '..')
const sourceDir = path.join(repoRoot, '..', 'src', 'lib')
const targetDir = path.join(repoRoot, 'src', 'lib')
const files = ['customScore.ts', 'levelDataParser.ts', 'uscParser.ts']
const checkOnly = process.argv.includes('--check')

if (!fs.existsSync(sourceDir)) {
  const missing = files.filter((file) => !fs.existsSync(path.join(targetDir, file)))
  if (missing.length > 0) {
    console.error(`缺少共享模块：${missing.join(', ')}（${targetDir}）`)
    process.exit(1)
  }
  console.log('共享模块：使用仓库内自带副本')
  process.exit(0)
}

if (checkOnly) {
  console.log('共享模块：源目录存在，构建前会自动同步')
  process.exit(0)
}

fs.mkdirSync(targetDir, { recursive: true })
for (const file of files) {
  fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, file))
}
console.log(`共享模块：已同步 ${files.length} 个文件 → src/lib/`)
