/**
 * 站点入口 / 路由。
 *
 * 结构照搬旧版 `src/main.ts`：同一套导航（主页 / 加载自制谱 / 预览页 / 谱面转图片 / 关于），
 * 路径路由而非 hash，靠服务器把未知路径回落到 `index.html`。
 *
 * 与旧版的关键差别：**预览页不再是「另一个页面」，而是同一个文档里的另一块 DOM**
 * （`#page-preview`）。这样：
 *   - 站内跳转不刷新文档，wasm 上下文、已加载的资源只初始化一次；
 *   - 「加载自制谱」把 File 直接交给预览模块，不用 sessionStorage（File 无法序列化）。
 */

import './site/site.css'
import { renderAbout, renderHome, renderUpload, type UploadPayload } from './site/pages'
import { startKeepAlive } from './view/keepAlive'

const siteRoot = document.querySelector<HTMLElement>('#page-site')
const previewRoot = document.querySelector<HTMLElement>('#page-preview')
if (!siteRoot || !previewRoot) {
  throw new Error('缺少 #page-site / #page-preview 容器')
}

type PreviewModule = typeof import('./preview/mount')
type PreviewPayload = Parameters<PreviewModule['mountPreview']>[0]
let previewModule: PreviewModule | null = null
let previewLoading: Promise<PreviewModule> | null = null

const ROUTES = new Set(['/', '/upload', '/preview', '/chart-to-image', '/about'])
const LEGACY_CHART_IMAGE_ROUTES = new Set(['/usc-to-image', '/leveldata-to-image'])

function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

function hasPreviewQuery(url: URL): boolean {
  const keys = ['src', 'sus', 'json', 'customScoreJson', 'scoreJson', 'config', 'cfg', 'bgm', 'cover', 'offset', 'post']
  return keys.some((key) => url.searchParams.has(key))
}

async function ensurePreview(): Promise<PreviewModule> {
  if (previewModule) return previewModule
  if (!previewLoading) {
    previewLoading = import('./preview/mount').then((module) => {
      previewModule = module
      return module
    })
  }
  return previewLoading
}

async function showPreview(payload?: PreviewPayload): Promise<void> {
  document.body.classList.remove('site-mode')
  siteRoot!.hidden = true
  previewRoot!.hidden = false
  const module = await ensurePreview()
  await module.mountPreview(payload)
}

function showSite(): void {
  if (!previewRoot!.hidden) {
    previewRoot!.hidden = true
    void previewModule?.pausePreview()
  }
  siteRoot!.hidden = false
  document.body.classList.add('site-mode')
}

async function route(pathname: string, payload?: PreviewPayload): Promise<void> {
  const path = LEGACY_CHART_IMAGE_ROUTES.has(pathname) ? '/chart-to-image' : pathname
  if (path !== pathname) {
    history.replaceState({}, '', path + location.search + location.hash)
  }

  if (path === '/preview') {
    document.title = 'Sonolus Version · 预览页'
    await showPreview(payload)
    return
  }

  showSite()

  if (path === '/upload') {
    document.title = 'Sonolus Version · 加载自制谱'
    renderUpload(siteRoot!, (upload) => {
      history.pushState({}, '', '/preview')
      void showPreview(upload)
    })
    return
  }

  if (path === '/about') {
    document.title = 'Sonolus Version · 关于'
    renderAbout(siteRoot!)
    return
  }

  if (path === '/chart-to-image') {
    document.title = 'Sonolus Version · 谱面转图片'
    const [{ mountChartToImage, renderChartToImageMarkup }, { renderShell }] = await Promise.all([
      import('./site/chartImage'),
      import('./site/shell'),
    ])
    renderShell(siteRoot!, renderChartToImageMarkup(), '/chart-to-image')
    mountChartToImage(siteRoot!)
    return
  }

  document.title = 'Sonolus Version · 主页'
  renderHome(siteRoot!)
}

/* ── 站内链接拦截 ─────────────────────────────────────────── */

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const anchor = (event.target as HTMLElement | null)?.closest('a')
  if (!anchor) return
  if (anchor.target && anchor.target !== '_self') return
  if (anchor.hasAttribute('download')) return
  const url = new URL(anchor.href, location.href)
  if (url.origin !== location.origin) return
  const path = normalizePath(url.pathname)
  if (!ROUTES.has(path)) return
  event.preventDefault()
  if (path === normalizePath(location.pathname) && !url.search) return
  history.pushState({}, '', path + url.search + url.hash)
  void route(path)
})

window.addEventListener('popstate', () => {
  void route(normalizePath(location.pathname))
})

/* ── 启动 ─────────────────────────────────────────────────── */

// 告诉本地服务器「这个标签页还开着」：关掉页面后后台（托盘进程 / serve.mjs）会自动退出。
startKeepAlive()

const bootUrl = new URL(location.href)
const bootPath = normalizePath(bootUrl.pathname)

if (bootPath === '/preview' || hasPreviewQuery(bootUrl)) {
  if (bootPath !== '/preview') {
    history.replaceState({}, '', `/preview${bootUrl.search}${bootUrl.hash}`)
  }
  void route('/preview')
} else {
  void route(bootPath)
}
