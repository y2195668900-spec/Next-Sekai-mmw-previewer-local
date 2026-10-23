/**
 * 站点外壳：左侧导航 + 主内容区。
 *
 * 结构与旧版 `src/main.ts` 的 `renderShell()` 一致（侧栏 / 品牌 / 移动端折叠按钮），
 * 只是把内容写进 `#page-site` 而不是 `#app`，这样预览页可以独占整屏。
 */

export type NavItem = {
  href: string
  label: string
  external?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: '主页' },
  { href: '/upload', label: '加载自制谱' },
  { href: '/preview', label: '预览页' },
  { href: '/chart-to-image', label: '谱面转图片' },
  { href: '/about', label: '关于' },
]

export function renderShell(root: HTMLElement, content: string, currentPath: string): void {
  const links = NAV_ITEMS.map((item) => {
    const activeClass = !item.external && item.href === currentPath ? 'is-active' : ''
    const externalAttrs = item.external ? ' target="_blank" rel="noreferrer"' : ''
    return `<a href="${item.href}" class="nav-link ${activeClass}"${externalAttrs}>${item.label}</a>`
  }).join('')

  root.innerHTML = `
    <div class="app-layout">
      <aside class="app-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-brand">Sonolus Version</div>
          <button class="mobile-menu-toggle" id="mobile-menu-toggle" aria-label="Toggle Menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
        <nav class="sidebar-nav" id="sidebar-nav">
          ${links}
        </nav>
      </aside>
      <main class="app-main">
        ${content}
      </main>
    </div>
  `

  root.querySelector('#mobile-menu-toggle')?.addEventListener('click', () => {
    root.querySelector('#sidebar-nav')?.classList.toggle('is-open')
  })
}
