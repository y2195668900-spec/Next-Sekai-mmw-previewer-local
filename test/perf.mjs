// Phase 0 性能量化：载入谱面 → 跳到谱面中段 → 播放 N 秒 → 读页面内的帧时间剖面
// 与 C++ 分阶段计时，打印成 JSON。
//
// 用法：
//   node test/perf.mjs <chart 路径> [秒数=8] [控件 JSON=[]] [seek 秒=60]
//   HEADLESS=1 node test/perf.mjs ...   # swiftshader 软件渲染对照
//   BASE=http://127.0.0.1:5181          # 指定服务地址
//
// 注意：必须跳到谱面中段再测。时间轴 0 处还在前导（前 9 s）里，画面上没有音符，
// 量到的只是空场景的帧率——踩过这个坑，写在这里免得后来人重踩。
import { chromium } from 'playwright-core'

const chart = process.argv[2]
const seconds = Number(process.argv[3] || 8)
const tweaks = process.argv[4] ? JSON.parse(process.argv[4]) : []
const seekTo = Number(process.argv[5] || process.env.SEEK || 60)
const BASE = process.env.BASE || 'http://127.0.0.1:5181'
const HEADLESS = process.env.HEADLESS === '1'

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: HEADLESS,
  args: HEADLESS
    ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']
    : ['--autoplay-policy=no-user-gesture-required'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

await page.goto(`${BASE}/upload`, { waitUntil: 'domcontentloaded' })
await page.setInputFiles('#upload-sus', chart)
await page.click('#upload-form button[type=submit]')
await page.waitForSelector('#page-preview:not([hidden])', { timeout: 40000 })
await page.waitForFunction(() => {
  const el = document.querySelector('#time-total')
  return el && el.textContent && !el.textContent.includes('00:00')
}, null, { timeout: 60000 })

for (const [selector, value] of tweaks) {
  await page.evaluate(({ selector: sel, value: val }) => {
    const el = document.querySelector(sel)
    if (!el) return
    if (el.type === 'checkbox') {
      el.checked = Boolean(val)
    } else {
      el.value = String(val)
    }
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, { selector, value })
}
await page.waitForTimeout(400)

// 必须跳到谱面中段再测：时间轴 0 处还在前导里，画面上一个音符都没有，
// 那样量到的只是「空场景」的帧率。
const isPlaying = async () => (await page.getAttribute('#play', 'aria-label')) === '暂停'
if (await isPlaying()) await page.click('#play')
await page.waitForTimeout(250)
for (let attempt = 0; attempt < 4; attempt += 1) {
  await page.evaluate(({ value }) => {
    const el = document.querySelector('#timeline')
    el.value = String(value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, { value: seekTo })
  await page.waitForTimeout(500)
  const now = (await page.textContent('#time-now'))?.trim() || ''
  const [mm, ss] = now.split(':')
  const parsed = Number(mm) * 60 + Number(ss)
  if (Math.abs(parsed - seekTo) < 0.6) break
}
await page.click('#play')
await page.waitForTimeout(1200)

// 有的谱面加载慢，前面的 seek 会被随后的 mount 复位；播放中再对齐一次。
for (let attempt = 0; attempt < 6; attempt += 1) {
  const now = (await page.textContent('#time-now'))?.trim() || ''
  const [mm, ss] = now.split(':')
  const parsed = Number(mm) * 60 + Number(ss)
  if (Math.abs(parsed - seekTo) < 0.8) break
  await page.evaluate(({ value }) => {
    const el = document.querySelector('#timeline')
    el.value = String(value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, { value: seekTo })
  await page.waitForTimeout(450)
}
await page.evaluate(() => window.__pvPerfReset?.())
await page.waitForTimeout(seconds * 1000)
const snap = await page.evaluate(() => window.__pvPerf?.())
const cpp = await page.evaluate(() => window.__pvCppTimings?.())
const now = (await page.textContent('#time-now'))?.trim()
console.log(JSON.stringify({ chart: String(chart).split(/[\/]/).pop(), seconds, tweaks, now, errors, snap, cpp }, null, 2))
await browser.close()
