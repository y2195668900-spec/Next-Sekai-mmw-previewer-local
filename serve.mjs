#!/usr/bin/env node
/**
 * 零依赖静态服务器 —— 浏览器的 fetch 不能读 file://，而且 wasm 需要正确的 MIME。
 *   node serve.mjs [port]
 * 打开 http://127.0.0.1:5181/
 *
 * 额外挂两个目录：
 *   /vendor/*      → ./vendor            （wasm 产物，由 scripts/sync-renderer.mjs 生成）
 *   /assets/mmw/*  → ../public/assets/mmw（**直接读旧版仓库**，不复制、不改动）
 * 这样旧版的美术资源只有一份，改了旧版这边立刻生效。
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const port = Number(process.argv[2] ?? 5181)

/**
 * 资源目录先看本目录 `assets/`（独立仓库 / 绿色版都放这里），
 * 找不到再退回旧版仓库的 `../public`（开发时零拷贝）。
 * 这与 `launcher/Program.cs` 里 FindLegacyAssets / FindSiblingAssets 的候选顺序保持一致。
 */
function pickDir(localParts, legacyParts) {
  const local = path.join(here, ...localParts)
  if (fs.existsSync(local)) return local
  return path.join(here, '..', 'public', ...legacyParts)
}

const legacyAssets = pickDir(['assets', 'mmw'], ['assets', 'mmw'])
const landingAssets = pickDir(['assets', 'landing'], ['assets', 'landing'])
const staticAssets = pickDir(['assets', 'static'], ['static'])

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
}

/** 把 url 解析成磁盘路径，越界返回 null。 */
function resolveTarget(url) {
  const clean = decodeURIComponent(url.split('?')[0])
  const candidates = [
    { prefix: '/assets/mmw/', root: legacyAssets },
    { prefix: '/assets/landing/', root: landingAssets },
    { prefix: '/static/', root: staticAssets },
    { prefix: '/vendor/', root: path.join(here, 'vendor') },
    { prefix: '/', root: here },
  ]
  for (const { prefix, root } of candidates) {
    if (!clean.startsWith(prefix)) continue
    const relative = clean.slice(prefix.length) || 'index.html'
    const target = path.resolve(root, relative)
    if (target !== root && !target.startsWith(root + path.sep)) return null
    if (prefix !== '/') {
      try {
        if (fs.statSync(target).isDirectory()) continue
      } catch {
        continue
      }
    }
    return target
  }
  return null
}

/** 站内路由（/upload、/about…）没有对应文件，回落到 index.html 交给前端路由。 */
function looksLikeRoute(url) {
  const clean = url.split('?')[0]
  return !path.extname(clean)
}

/* ── 页面心跳：网页关掉后自动退出 ────────────────────────────────
 * 页面每 2 s POST 一次 /__preview-alive?id=…，关页面时发一次 /__preview-bye。
 * 超过 CLIENT_TIMEOUT_MS 没有活着的标签页就结束进程（`Sonolus 预览器.exe` 里是同一套逻辑）。
 * 启动时加 `--no-exit-on-close` 可以关掉这个行为（自动化测试/常驻调试用）。
 */
const CLIENT_TIMEOUT_MS = 6000
const exitOnClose = !process.argv.includes('--no-exit-on-close')
const clients = new Map()
let sawAlive = false

function heartbeat(url, res) {
  const query = url.split('?')[1] ?? ''
  const params = new URLSearchParams(query)
  const id = params.get('id') || 'default'
  if (url.startsWith('/__preview-alive')) {
    sawAlive = true
    clients.set(id, Date.now())
  } else {
    clients.delete(id)
  }
  res.writeHead(204).end()
}

if (exitOnClose) {
  setInterval(() => {
    if (!sawAlive) return
    const now = Date.now()
    for (const [id, seen] of clients) {
      if (now - seen > CLIENT_TIMEOUT_MS) clients.delete(id)
    }
    if (clients.size > 0) return
    console.log('网页已关闭，退出 serve.mjs。')
    process.exit(0)
  }, 1000).unref?.()
}

http
  .createServer((req, res) => {
    const requestUrl = req.url ?? '/'
    if (requestUrl.startsWith('/favicon.ico')) {
      res.writeHead(204).end()
      return
    }
    if (requestUrl.startsWith('/__preview-alive') || requestUrl.startsWith('/__preview-bye')) {
      heartbeat(requestUrl, res)
      return
    }
    const target = resolveTarget(requestUrl)
    if (!target) {
      res.writeHead(403).end('forbidden')
      return
    }
    fs.readFile(target, (error, data) => {
      if (error) {
        if (looksLikeRoute(req.url ?? '/')) {
          fs.readFile(path.join(here, 'index.html'), (fallbackError, html) => {
            if (fallbackError) {
              res.writeHead(404).end('not found')
              return
            }
            res.writeHead(200, { 'Content-Type': types['.html'], 'Cache-Control': 'no-cache' })
            res.end(html)
          })
          return
        }
        res.writeHead(404).end('not found')
        return
      }
      res.writeHead(200, {
        'Content-Type': types[path.extname(target)] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
      })
      res.end(data)
    })
  })
  .listen(port, '127.0.0.1', () => {
    console.log(`sonolus version → http://127.0.0.1:${port}/`)
    console.log(`  /assets/mmw/* → ${legacyAssets}`)
  })
