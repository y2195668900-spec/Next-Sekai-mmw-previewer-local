// 绿色版离线验收：启动解压出来的 exe → 用 Chrome 跑完整流程（载谱 / 播放 / 录屏）→ 收尾关掉 exe。
// 用法：node test/portable.mjs "<解压目录>" [--record] [曲谱路径]
//
// 做三件事：启动解压出来的 Sonolus 预览器.exe → 用 Chrome 载谱 / 播放 /（可选）录屏 →
// 关掉 exe。全程拦掉所有非 127.0.0.1 的请求，用来验收「解压即用、无需联网」。
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import http from 'node:http'
import { createRequire } from 'node:module'
// playwright-core 装在旧仓库根目录（sonolus version 自己没有 node_modules）
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '../../node_modules/playwright-core')

const dir = process.argv[2] || join(process.env.TEMP, 'Sonolus 预览器 测试')
const withRecord = process.argv.includes('--record')
const exe = join(dir, 'Sonolus 预览器.exe')
if (!existsSync(exe)) throw new Error(`找不到 ${exe}`)

const BASE = 'http://127.0.0.1:5181'
const child = spawn(exe, ['--no-browser'], { cwd: dir, detached: true, stdio: 'ignore' })
child.unref()

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let up = false
for (let i = 0; i < 40; i += 1) {
  const ok = await new Promise((resolveOk) => {
    const req = http.get(`${BASE}/`, (res) => {
      res.resume()
      resolveOk(res.statusCode === 200)
    })
    req.on('error', () => resolveOk(false))
    req.setTimeout(1200, () => { req.destroy(); resolveOk(false) })
  })
  if (ok) { up = true; break }
  await sleep(500)
}
if (!up) throw new Error('启动器没有在 20 秒内开始监听 5181')

const errors = []
const bad = []
const blocked = []
const local = []
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: false,
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const page = await context.newPage()
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })
page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url().replace(BASE, '')}`) })
await page.route('**/*', (route) => {
  const url = route.request().url()
  if (url.startsWith(BASE) || url.startsWith('data:') || url.startsWith('blob:')) {
    local.push(url.replace(BASE, ''))
    return route.continue()
  }
  blocked.push(url)
  return route.abort()
})

await page.goto(`${BASE}/upload`, { waitUntil: 'domcontentloaded' })
await page.setInputFiles('#upload-sus', process.env.CHART || 'E:/杂物/project sekai make/谱面/ANU/1017_03.usc')
await page.click('#upload-form button[type=submit]')
await page.waitForSelector('#page-preview:not([hidden])', { timeout: 30000 })
await page.waitForFunction(() => (document.querySelector('#time-total')?.textContent || '').includes(':'), { timeout: 60000 })
const chipFilled = await page
  .waitForFunction(() => {
    const el = document.querySelector('#chip-notes')
    return el && el.textContent && el.textContent.trim() !== '—'
  }, { timeout: 60000 })
  .then(() => true)
  .catch(() => false)
const chip = (await page.textContent('.pv-chip'))?.replace(/\s+/g, ' ')
const rendererState = (await page.textContent('#renderer-state'))?.trim()

for (let i = 0; i < 4; i += 1) {
  await page.click('#play')
  await sleep(900)
  if ((await page.getAttribute('#play', 'aria-label')) === '暂停') break
  if (await page.isVisible('#unlock-button')) await page.click('#unlock-button')
}
const t0 = (await page.textContent('#time-now'))?.trim()
await sleep(1500)
const t1 = (await page.textContent('#time-now'))?.trim()

let recording = null
if (withRecord) {
  await page.selectOption('#rec-fps', '60')
  const canRecord = await page.evaluate(() => !document.querySelector('#rec-start')?.disabled)
  if (!canRecord) {
    recording = { canRecord: false }
  } else {
    await page.click('#rec-start')
    await sleep(2600)
    const waitDownload = page.waitForEvent('download', { timeout: 60000 })
    await page.click('#rec-stop')
    const download = await waitDownload
    const out = process.env.REC_OUT || join(process.env.TEMP || '.', 'portable-rec.mp4')
    await download.saveAs(out)
    recording = {
      canRecord: true,
      name: download.suggestedFilename(),
      bytes: statSync(out).size,
      status: (await page.textContent('#rec-status'))?.trim(),
    }
  }
}

console.log(JSON.stringify({
  up,
  chipFilled,
  chip,
  rendererState,
  playFrom: t0,
  playTo: t1,
  recording,
  localRequests: local.length,
  mmwAssetRequests: local.filter((u) => u.startsWith('/assets/mmw/')).length,
  badResponses: bad.slice(0, 10),
  badCount: bad.length,
  blockedExternal: blocked.slice(0, 5),
  errors: errors.slice(0, 6),
}, null, 1))

await browser.close()
await sleep(500)
spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
