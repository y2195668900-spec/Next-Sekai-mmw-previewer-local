// 打包「解压即用」的绿色版：把运行需要的文件复制到 release/<名字>/，再用系统工具压成 zip。
//
// 打包进去的东西（全部是静态文件，不需要 Node、不需要联网）：
//   Sonolus 预览器.exe   本地静态服务器 + 托盘 + 自动开浏览器（.NET Framework 4.x，Windows 10/11 自带）
//   index.html           站点入口
//   dist/                前端打包产物（app.js / app.css / core.mjs）
//   vendor/              wasm 渲染器与资产清单
//   assets/              皮肤图集、音效
//   data/                内置样例谱面（诊断面板里的「内置样例」）
//   README.md            使用说明
//
// 用法：
//   node scripts/package-portable.mjs            # 生成 release/Sonolus预览器-<日期>/ 并打 zip
//   node scripts/package-portable.mjs --no-zip   # 只生成目录

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const EXE = 'Sonolus 预览器.exe'
const FILES = ['index.html', 'README.md', EXE]
const DIRS = ['dist', 'vendor', 'assets', 'data']

const stamp = (() => {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
})()

const releaseDir = join(root, 'release')
const target = join(releaseDir, `Sonolus预览器-${stamp}`)

if (!existsSync(join(root, 'dist', 'app.js'))) {
  console.error('[pack] 缺少 dist/app.js —— 先执行 node build.mjs')
  process.exit(1)
}
// 绿色版优先用 self-contained 的那个 exe（目标机器不用装 .NET 8 Desktop Runtime）。
const portableExe = join(root, 'launcher', 'dist-portable', 'SonolusPreview.exe')
const exeSource = existsSync(portableExe) ? portableExe : join(root, EXE)
if (!existsSync(exeSource)) {
  console.error('[pack] 找不到启动器 exe —— 先跑 launcher/build-launcher.cmd，')
  console.error('       再执行 dotnet publish launcher/SonolusPreview.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o launcher/dist-portable')
  process.exit(1)
}
for (const dir of DIRS) {
  if (!existsSync(join(root, dir))) {
    console.error(`[pack] 缺少目录 ${dir}/`)
    process.exit(1)
  }
}

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })

for (const file of FILES) {
  if (file === EXE) cpSync(exeSource, join(target, file))
  else cpSync(join(root, file), join(target, file))
}
for (const dir of DIRS) cpSync(join(root, dir), join(target, dir), { recursive: true })

// wasm 渲染器要的 376 张贴图 / 3 个字体 / 11 个音效都在旧仓库的 public/assets/mmw 下，
// 由 vendor/manifest.json 的 "base": "/assets/mmw/" 定位。绿色版必须把它们一起带上，
// 否则解压后打开预览会「资源未载入」。这里按清单逐个复制，只带清单里列出的文件。
const manifest = JSON.parse(readFileSync(join(root, 'vendor', 'manifest.json'), 'utf8'))
const legacyAssets = resolve(root, '..', 'public', 'assets', 'mmw')
const wanted = [
  ...manifest.assets,
  ...(manifest.fonts ?? []),
  ...Object.values(manifest.sounds ?? {}),
]
const missing = []
for (const name of wanted) {
  const from = join(legacyAssets, name)
  if (!existsSync(from)) {
    missing.push(name)
    continue
  }
  const to = join(target, 'assets', 'mmw', name)
  mkdirSync(dirname(to), { recursive: true })
  cpSync(from, to)
}
if (missing.length > 0) {
  console.error(`[pack] public/assets/mmw 缺 ${missing.length} 个清单文件，例如：${missing.slice(0, 3).join(', ')}`)
  process.exit(1)
}

// 首页配图（/assets/landing/chart.webp）与「谱面转图片」的素材（/static/notes_new、/static/logo.png）
// 在旧仓库里分别位于 public/assets/landing 与 public/static。绿色版没有 public/ 兄弟目录，
// 启动器的 FindSiblingAssets() 会回退到包内 assets/<name>，所以这里统一放到 assets/ 下。
for (const [fromRel, toRel] of [
  [['..', 'public', 'assets', 'landing'], ['assets', 'landing']],
  [['..', 'public', 'static'], ['assets', 'static']],
]) {
  const from = resolve(root, ...fromRel)
  if (!existsSync(from)) {
    console.warn(`[pack] 缺少 ${fromRel.join('/')}，绿色版里对应的图会显示不出来`)
    continue
  }
  const to = join(target, ...toRel)
  cpSync(from, to, { recursive: true })
  console.log(`[pack] 带上 ${toRel.join('/')}`)
}
console.log(`[pack] 按清单带上 ${wanted.length} 个渲染资源（${manifest.base}）`)

// 目录里放一份「先看这里」，避免接收方找不到入口
const guide = [
  'Sonolus 预览器（绿色版）',
  '',
  '1. 解压到任意目录（路径里有中文、空格都没关系）。',
  '2. 双击 “Sonolus 预览器.exe”。',
  '   右下角会出现托盘图标，浏览器会自动打开预览器。',
  '3. 左侧「加载自制谱」选一个 .usc / LevelData 文件即可开始。',
  '4. 关掉网页后，启动器会在约 6 秒后自动退出（托盘图标消失）。',
  '',
  '不需要安装 Node.js，不需要联网（皮肤、音效、渲染器都在 dist / vendor / assets 里）。',
  '浏览器要求：Chrome / Edge 等支持 WebGL2 的现代浏览器；录屏功能还需要 WebCodecs。',
  '',
  '详细说明见 README.md。',
  '',
].join('\r\n')
writeFileSync(join(target, '先看这里.txt'), '\ufeff' + guide, 'utf8')

// 统计体积
let bytes = 0
let files = 0
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else {
      bytes += statSync(full).size
      files += 1
    }
  }
}
walk(target)
console.log(`[pack] 启动器: ${exeSource === portableExe ? 'self-contained（无需装 .NET）' : '框架依赖（需 .NET 8 Desktop Runtime）'}`)
console.log(`[pack] 目录: ${target}`)
console.log(`[pack] ${files} 个文件, ${(bytes / 1024 / 1024).toFixed(1)} MB`)

if (!process.argv.includes('--no-zip')) {
  const zip = `${target}.zip`
  rmSync(zip, { force: true })
  execFileSync(
    'powershell',
    ['-NoProfile', '-Command', `Compress-Archive -Path '${target}\\*' -DestinationPath '${zip}' -CompressionLevel Optimal`],
    { stdio: 'inherit' },
  )
  console.log(`[pack] zip: ${zip} (${(statSync(zip).size / 1024 / 1024).toFixed(1)} MB)`)
}
