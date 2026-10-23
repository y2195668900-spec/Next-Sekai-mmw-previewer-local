#!/usr/bin/env node
/**
 * 从 Next SEKAI 服务器拉取皮肤资源（图集 + 精灵表）。
 *
 *   node scripts/fetch-assets.mjs
 *
 * 产物（都在 assets/，不进版本库：美术资源不属于 MIT 代码许可）：
 *   assets/skin.png      4096×4096 图集
 *   assets/sprites.json  [{ name, x, y, w, h }]
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const assets = path.join(here, '..', 'assets')
const SERVER = 'https://coconut.sonolus.com/next-sekai/sonolus'
const SKIN = 'coconut-next-sekai-1'

async function json(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`)
  return response.json()
}

async function binary(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

/** 皮肤包是 gzip 过的 JSON；Content-Encoding 不一定带，所以自己判断魔数。 */
function maybeGunzip(buffer) {
  return buffer[0] === 0x1f && buffer[1] === 0x8b ? zlib.gunzipSync(buffer) : buffer
}

fs.mkdirSync(assets, { recursive: true })

console.log(`拉取皮肤 ${SKIN} …`)
const item = await json(`${SERVER}/skins/${SKIN}`)
const data = JSON.parse(maybeGunzip(await binary(item.item.data.url)).toString('utf8'))
const texture = await binary(item.item.texture.url)

const sprites = (data.sprites ?? []).map((sprite) => ({
  name: sprite.name,
  x: sprite.x,
  y: sprite.y,
  w: sprite.w,
  h: sprite.h,
}))

fs.writeFileSync(path.join(assets, 'skin.png'), texture)
fs.writeFileSync(
  path.join(assets, 'sprites.json'),
  JSON.stringify({ width: data.width, height: data.height, sprites }, null, 0),
)

console.log(`  图集 ${(texture.length / 1048576).toFixed(1)} MB → assets/skin.png`)
console.log(`  精灵 ${sprites.length} 个 → assets/sprites.json`)

// 打击音：从同级旧工程 public/ 拷一份（Sonolus 皮肤包里没有 SE）
const seSource = path.join(here, '..', '..', 'public', 'assets', 'mmw', 'sound')
const seTarget = path.join(assets, 'sound')
if (fs.existsSync(seSource)) {
  fs.mkdirSync(seTarget, { recursive: true })
  let copied = 0
  for (const file of ['se_live_perfect.mp3', 'se_live_critical.mp3', 'se_live_flick.mp3', 'se_live_trace.mp3']) {
    const from = path.join(seSource, file)
    if (!fs.existsSync(from)) continue
    fs.copyFileSync(from, path.join(seTarget, file))
    copied += 1
  }
  console.log(`  打击音 ${copied} 个 → assets/sound/`)
}
