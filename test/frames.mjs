#!/usr/bin/env node
/**
 * 逐帧截图 / 回归对比（需求 4 的工具）。
 *
 *   node test/frames.mjs --url=http://127.0.0.1:5181/ --out=frames/base --times=10,20,30
 *   node test/frames.mjs --url=... --out=frames/new --times=... --diff=frames/base
 *
 * --diff 会逐像素比较两张同时间的截图，输出 mean/max 差异与差异像素占比。
 * 这是「同刻对比」的骨架：把 --url 换成官方客户端录屏的抽帧图（同分辨率）即可做像素差。
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=')
    return [key, value]
  }),
)

const url = args.url ?? 'http://127.0.0.1:5181/'
const outDir = args.out ?? 'frames/base'
const times = (args.times ?? '10,20,30').split(',').map(Number)
const diffDir = args.diff ?? ''

fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto(url, { waitUntil: 'load', timeout: 60000 })
await page.waitForFunction(() => document.querySelector('#chip-notes')?.textContent !== '—', { timeout: 60000 })
await page.waitForTimeout(800)

for (const time of times) {
  await page.evaluate((t) => {
    const slider = document.querySelector('#timeline')
    slider.value = String(t)
    slider.dispatchEvent(new Event('input', { bubbles: true }))
  }, time)
  await page.waitForTimeout(120)
  const file = path.join(outDir, `t${time.toFixed(2).padStart(6, '0')}.png`)
  await page.locator('#stage').screenshot({ path: file })
  console.log('shot', file)
}
await browser.close()

if (!diffDir) process.exit(0)

// 逐像素比较：在浏览器里用 canvas 解码，避免引入图像库
if (!diffDir) process.exit(0)

const diffBrowser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
})
const diffPage = await diffBrowser.newPage()
await diffPage.goto('about:blank')

let totalPixels = 0
let changedPixels = 0
let sumAbs = 0
let maxAbs = 0
for (const time of times) {
  const name = `t${time.toFixed(2).padStart(6, '0')}.png`
  const a = path.join(diffDir, name)
  const b = path.join(outDir, name)
  if (!fs.existsSync(a) || !fs.existsSync(b)) {
    console.log(`skip ${name}（缺文件）`)
    continue
  }
  const result = await diffPage.evaluate(
    async ([urlA, urlB]) => {
      const load = (src) =>
        new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = reject
          img.src = src
        })
      const [imgA, imgB] = await Promise.all([load(urlA), load(urlB)])
      if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
        return { error: `尺寸不同 ${imgA.width}x${imgA.height} vs ${imgB.width}x${imgB.height}` }
      }
      const canvas = document.createElement('canvas')
      canvas.width = imgA.width
      canvas.height = imgA.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(imgA, 0, 0)
      const da = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(imgB, 0, 0)
      const db = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let changed = 0
      let sum = 0
      let max = 0
      for (let i = 0; i < da.length; i += 4) {
        const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])
        if (d > 12) changed += 1
        sum += d
        if (d > max) max = d
      }
      return { pixels: da.length / 4, changed, sum, max }
    },
    ['data:image/png;base64,' + fs.readFileSync(a).toString('base64'), 'data:image/png;base64,' + fs.readFileSync(b).toString('base64')],
  )
  if (result.error) {
    console.log(`skip ${name}（${result.error}）`)
    continue
  }
  totalPixels += result.pixels
  changedPixels += result.changed
  sumAbs += result.sum
  maxAbs = Math.max(maxAbs, result.max)
  console.log(
    `${name}: 差异像素 ${((result.changed / result.pixels) * 100).toFixed(3)}%  平均 ${(result.sum / result.pixels / 3).toFixed(2)}/255  峰值 ${result.max}/765`,
  )
}
await diffBrowser.close()
if (totalPixels > 0) {
  console.log(
    `\n整体：差异像素 ${((changedPixels / totalPixels) * 100).toFixed(3)}%，平均色差 ${(sumAbs / totalPixels / 3).toFixed(2)}/255，峰值 ${maxAbs}/765`,
  )
}
