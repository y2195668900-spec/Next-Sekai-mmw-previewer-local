/**
 * 页面存活心跳 —— 让本地服务器知道「网页还开着」。
 *
 * 背景：预览器的后台（`Sonolus 预览器.exe` 的托盘进程 / `node serve.mjs`）在浏览器被关掉后
 * 原本会一直挂在右下角。现在页面每 2 s 发一次 `POST /__preview-alive?id=…`，服务器维护一个
 * 「还活着的标签页」集合；某个标签页 6 s 没心跳就从集合里删掉，集合空了就自己退出。
 *
 * 关闭页面时额外发一次 `POST /__preview-bye?id=…`（`sendBeacon`，页面卸载时也能发出去），
 * 只是把这个 id 提前摘掉，不直接让服务器退出 —— 这样「刷新页面」「同时开两个标签页」都不会
 * 误杀：新文档 1 s 内就会重新 ping 上来。
 */

const ALIVE_PATH = '/__preview-alive'
const BYE_PATH = '/__preview-bye'
const INTERVAL_MS = 2000

const clientId = Math.random().toString(36).slice(2) + Date.now().toString(36)

function ping(path: string, keepalive: boolean): void {
  const url = `${path}?id=${encodeURIComponent(clientId)}`
  try {
    if (keepalive) {
      // sendBeacon 天生是 POST；返回 false 说明浏览器拒绝排队，直接忽略。
      navigator.sendBeacon?.(url)
      return
    }
    void fetch(url, { method: 'POST', cache: 'no-store', keepalive: true }).catch(() => {
      /* 服务器不在（如 file:// 或别的宿主）时静默忽略 */
    })
  } catch {
    /* 忽略：心跳失败不该影响预览 */
  }
}

/** 在应用启动时调用一次。非 http(s) 环境（file://）直接跳过。 */
export function startKeepAlive(): void {
  if (typeof window === 'undefined') return
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return

  ping(ALIVE_PATH, false)
  window.setInterval(() => ping(ALIVE_PATH, false), INTERVAL_MS)

  window.addEventListener('pagehide', () => ping(BYE_PATH, true))
  window.addEventListener('beforeunload', () => ping(BYE_PATH, true))
  // 从 bfcache 里恢复时补一次心跳，免得后台已经按超时退出。
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) ping(ALIVE_PATH, false)
  })
}
