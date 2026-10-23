import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://127.0.0.1:5181/'
const out = process.argv[3] ?? '.workbuddy/tmp/sonolus-ui.png'
const seek = process.argv[4]

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))

await page.goto(url, { waitUntil: 'load', timeout: 60000 })
await page.waitForTimeout(1200)
// 等 wasm 渲染器（资源预加载 + 谱面装载）就绪
await page
  .waitForFunction(() => (document.querySelector('#renderer-state')?.textContent ?? '').startsWith('就绪'), {
    timeout: 90000,
  })
  .catch(() => console.log('warn: wasm 渲染器未就绪'))
console.log('renderer:', await page.textContent('#renderer-state'))
if (seek) {
  await page.evaluate((t) => {
    const slider = document.querySelector('#timeline')
    slider.value = String(t)
    slider.dispatchEvent(new Event('input', { bubbles: true }))
  }, Number(seek))
  await page.waitForTimeout(300)
}
if (process.argv[5] === 'play') {
  await page.evaluate(() => document.querySelector('#play').click())
  await page.waitForTimeout(Number(seek ?? 0) > 0 ? 900 : 900)
}
if (process.argv[6] === 'reference') {
  await page.evaluate(() => {
    const select = document.querySelector('#renderer')
    select.value = 'reference'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await page.waitForTimeout(500)
}
console.log('time-now:', await page.textContent('#time-now'), '| slider:', await page.inputValue('#timeline'))
console.log('snapshot:', JSON.stringify(await page.evaluate(() => globalThis.__stage?.snapshot?.())))
console.log('notes:', await page.textContent('#chip-notes'), '| duration:', await page.textContent('#chip-duration'))
console.log('checks:', (await page.$$eval('#checks li', (nodes) => nodes.map((n) => n.textContent))).length, '项')
console.log('debug:', (await page.textContent('#debug'))?.split('\n').slice(0, 3).join(' | '))
if (errors.length) console.log('errors:', errors.slice(0, 4))
await page.screenshot({ path: out, fullPage: false })
console.log('shot:', out)
await browser.close()
