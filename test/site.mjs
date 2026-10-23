#!/usr/bin/env node
/**
 * 站点冒烟测试：路由、页面渲染、上传 → 预览 的完整链路。
 *
 *   node test/site.mjs [baseUrl]
 *
 * 判据：
 *   1. 五个路由都能渲染出关键节点（侧栏导航 / hero / 表单 / 关于列表 / 转图片面板）；
 *   2. /preview 能挂上 wasm 渲染器（renderer-state 以「就绪」开头）；
 *   3. 在 /upload 里选一个 .usc 并提交，能跳到 /preview 且谱面载入成功；
 *   4. 从预览页点「← 站点」能回到主页，且预览停止。
 *
 * 退出码 0 = 全部通过。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')
const base = (process.argv[2] ?? 'http://127.0.0.1:5181').replace(/\/$/, '')
const shotDir = process.env.SHOT_DIR ?? ''

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
const missing = []
page.on('response', (response) => {
  if (response.status() >= 400) missing.push(`${response.status()} ${response.url()}`)
})
page.on('pageerror', (error) => errors.push(String(error).slice(0, 200)))
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().includes('favicon')) {
    errors.push(message.text().slice(0, 200))
  }
})

let failed = 0
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}
const shoot = async (name) => {
  if (!shotDir) return
  fs.mkdirSync(shotDir, { recursive: true })
  await page.screenshot({ path: path.join(shotDir, `${name}.png`) })
}

/* 1. 路由 */
const pages = [
  { path: '/', expect: '.hero-title', name: 'home' },
  { path: '/upload', expect: '#upload-form', name: 'upload' },
  { path: '/about', expect: '.about-list', name: 'about' },
  { path: '/chart-to-image', expect: '#img-form', name: 'chart-image' },
]

for (const item of pages) {
  await page.goto(base + item.path, { waitUntil: 'load', timeout: 60000 })
  await page.waitForTimeout(600)
  const found = await page.$(item.expect)
  check(`${item.path} 渲染 ${item.expect}`, Boolean(found))
  const nav = await page.$$eval('.nav-link', (nodes) => nodes.map((node) => node.textContent?.trim()))
  check(`${item.path} 侧栏导航`, nav.length === 5, nav.join(' / '))
  await shoot(item.name)
}

/* 1b. 谱面转图片：真跑一次 USC → SVG */
await page.goto(base + '/chart-to-image', { waitUntil: 'load', timeout: 60000 })
await page.waitForTimeout(400)
await page.evaluate(() => {
  // headless 里 window.open 会被拦，直接返回 null 让页面走「同页下载」分支
  window.open = () => null
})
const uscText = fs.readFileSync(path.join(root, 'data/sample.usc'), 'utf8')
await page.fill('#img-chart', uscText)
await page.click('#img-submit')
await page.waitForSelector('#img-result:not([hidden])', { timeout: 180000 }).catch(() => {})
const resultVisible = await page.isVisible('#img-result').catch(() => false)
const imgError = ((await page.textContent('#img-error').catch(() => '')) ?? '').trim()
check('谱面转图片出图', resultVisible && imgError === '', imgError || '已生成结果面板')
if (resultVisible) {
  const desc = ((await page.textContent('#img-result-desc')) ?? '').trim()
  check('结果含尺寸信息', /\d+\s*[×x]\s*\d+/.test(desc), desc.slice(0, 60))
}
await shoot('chart-image-result')

/* 2. 首页素材 */
await page.goto(base + '/', { waitUntil: 'load' })
await page.waitForTimeout(400)
const heroLoaded = await page.$eval('.hero img', (img) => img.complete && img.naturalWidth > 0).catch(() => false)
check('首页配图加载', heroLoaded)

/* 3. 上传 → 预览 */
await page.goto(base + '/upload', { waitUntil: 'load', timeout: 60000 })
await page.setInputFiles('#upload-sus', path.join(root, 'data/sample.usc'))
await page.fill('#upload-title', 'Ultimate Force')
await page.fill('#upload-composer', 'Sakuzyo')
await page.selectOption('#upload-diff', '4')
await shoot('upload-filled')
await page.click('#upload-submit')

await page
  .waitForFunction(() => (document.querySelector('#renderer-state')?.textContent ?? '').startsWith('就绪'), {
    timeout: 120000,
  })
  .catch(() => {})
await page.waitForTimeout(800)

check('提交后跳到 /preview', new URL(page.url()).pathname === '/preview', page.url())
const notes = (await page.textContent('#chip-notes').catch(() => '')) ?? ''
check('谱面已载入', /^\d+$/.test(notes.trim()) && Number(notes) > 0, `音符 ${notes}`)
const meta = await page.textContent('#chart-info')
check('表单信息进入面板', (meta ?? '').includes('Ultimate Force') && (meta ?? '').includes('MASTER'))
const renderer = (await page.textContent('#renderer-state')) ?? ''
check('wasm 渲染器就绪', renderer.startsWith('就绪'), renderer)
await shoot('preview-from-upload')

/* 4. 预览页设置与交互 */
await page.evaluate(() => {
  const slider = document.querySelector('#timeline')
  slider.value = '40'
  slider.dispatchEvent(new Event('input', { bubbles: true }))
})
await page.waitForTimeout(400)
const time = (await page.textContent('#time-now')) ?? ''
check('时间轴可拖动', time.includes('40'), time)
await shoot('preview-seek')

/* 5. 返回站点 */
await page.click('#page-preview a[href="/"]')
await page.waitForTimeout(600)
check('返回主页', new URL(page.url()).pathname === '/' && Boolean(await page.$('.hero-title')))
await shoot('back-home')

check('无 JS 异常', errors.length === 0, errors.slice(0, 3).join(' | '))
check('无 404 资源', missing.length === 0, missing.slice(0, 4).join(' | '))

await browser.close()
console.log(failed === 0 ? '\n站点冒烟通过' : `\n${failed} 项失败`)
process.exit(failed === 0 ? 0 : 1)
