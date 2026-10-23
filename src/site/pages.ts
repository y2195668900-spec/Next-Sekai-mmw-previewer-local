/**
 * 站点页面：主页 / 加载自制谱 / 关于。
 *
 * 结构与文案对齐旧版 `src/main.ts`（`renderHomePage` / `renderUploadPage` / `renderAboutPage`），
 * 差别只有两个：
 *  - 品牌名换成 Sonolus Version；
 *  - 关于页补上 Next SEKAI 引擎与旧版项目的致谢。
 */

import { renderShell } from './shell'

export type UploadPayload = {
  file: File
  bgmFile: File | null
  coverFile: File | null
  offsetMs: number | null
  difficulty: string | null
  title: string | null
  lyricist: string | null
  composer: string | null
  arranger: string | null
  vocal: string | null
  customScoreInfo: boolean
  scoreTitle: string | null
  scoreCreator: string | null
  showLockControlsButton: boolean
}

const readOptionalText = (input: HTMLInputElement): string | null => {
  const trimmed = input.value.trim()
  return trimmed === '' ? null : trimmed
}

const readOptionalOffset = (input: HTMLInputElement): number | null => {
  const trimmed = input.value.trim()
  if (trimmed === '') return null
  const parsed = Number.parseFloat(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function renderHome(root: HTMLElement): void {
  renderShell(
    root,
    `
    <section class="hero">
      <img src="/assets/landing/chart.webp" alt="chart preview" />
      <div class="hero-body">
        <h1 class="hero-title">Next SEKAI 音游谱面预览工具</h1>
        <p class="hero-text">支持 USC 与 Sonolus LevelData 解析、完整 HUD、开场信息与特效。变速使用上游 marker 时间轴（缓动 + 位移跳变），画面由 Next SEKAI 的 wasm 渲染器绘制，全部处理都在浏览器内完成。</p>
        <div class="home-actions">
          <a class="action-button" href="/upload">加载自制谱</a>
          <a class="action-button secondary" href="/preview">打开预览页</a>
        </div>
      </div>
    </section>
  `,
    '/',
  )
}

export function renderUpload(root: HTMLElement, onStart: (payload: UploadPayload) => void): void {
  renderShell(
    root,
    `
    <section class="upload-card">
      <h1 class="upload-title">加载自制谱</h1>
      <p class="upload-text">选择本地 USC 或 Sonolus LevelData 文件并填写基础信息，然后直接进入预览页。上传只在本地浏览器中处理，不会上传到服务器。</p>
      <form class="upload-form" id="upload-form">
        <div class="upload-grid">
          <div class="upload-row file">
            <label for="upload-sus">谱面文件（USC / LevelData / 自制 JSON，必填）</label>
            <input id="upload-sus" type="file" accept=".usc,.json,.gz,.lvdata,.leveldata,text/plain,application/json,application/gzip" required />
          </div>
          <div class="upload-row file">
            <label for="upload-bgm">BGM（可选）</label>
            <input id="upload-bgm" type="file" accept="audio/*,.mp3,.ogg,.wav,.m4a,.aac,.flac" />
          </div>
          <div class="upload-row file">
            <label for="upload-cover">曲绘（可选）</label>
            <input id="upload-cover" type="file" accept="image/*" />
          </div>
          <div class="upload-row">
            <label for="upload-offset">offset(ms)</label>
            <input id="upload-offset" type="text" inputmode="decimal" placeholder="例如 9000" />
          </div>
          <div class="upload-row">
            <label for="upload-diff">难度</label>
            <select id="upload-diff">
              <option value="0">EASY</option>
              <option value="1">NORMAL</option>
              <option value="2">HARD</option>
              <option value="3">EXPERT</option>
              <option value="4" selected>MASTER</option>
              <option value="5">APPEND</option>
            </select>
          </div>
          <div class="upload-row wide">
            <label for="upload-title">曲名</label>
            <input id="upload-title" type="text" />
          </div>
          <div class="upload-row">
            <label for="upload-lyricist">作词</label>
            <input id="upload-lyricist" type="text" />
          </div>
          <div class="upload-row">
            <label for="upload-composer">作曲</label>
            <input id="upload-composer" type="text" />
          </div>
          <div class="upload-row">
            <label for="upload-arranger">编曲</label>
            <input id="upload-arranger" type="text" />
          </div>
          <div class="upload-row">
            <label for="upload-vocal">演唱</label>
            <input id="upload-vocal" type="text" />
          </div>
          <div class="upload-row wide">
            <label class="upload-toggle">
              <input id="upload-custom-score-info" type="checkbox" checked />
              <span>开场显示自制谱图标和谱面信息</span>
            </label>
          </div>
          <div class="upload-row">
            <label for="upload-score-title">谱面标题</label>
            <input id="upload-score-title" type="text" placeholder="默认使用曲名" />
          </div>
          <div class="upload-row">
            <label for="upload-score-creator">谱面作者</label>
            <input id="upload-score-creator" type="text" />
          </div>
          <div class="upload-row wide">
            <label class="upload-toggle">
              <input id="upload-show-lock" type="checkbox" checked />
              <span>全屏显示锁屏组件（录屏建议关闭）</span>
            </label>
          </div>
        </div>
        <div class="upload-error" id="upload-error"></div>
        <div class="upload-actions">
          <a href="/preview">仅打开预览页</a>
          <button id="upload-submit" type="submit">开始预览</button>
        </div>
      </form>
    </section>
  `,
    '/upload',
  )

  const form = root.querySelector<HTMLFormElement>('#upload-form')
  if (!form) return

  const field = <T extends HTMLElement>(id: string) => root.querySelector<T>(id)!
  const susInput = field<HTMLInputElement>('#upload-sus')
  const errorNode = field<HTMLDivElement>('#upload-error')
  const submitButton = field<HTMLButtonElement>('#upload-submit')

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const file = susInput.files?.[0]
    if (!file) {
      errorNode.textContent = '请选择 USC、LevelData 或自制 JSON 谱面文件。'
      return
    }
    errorNode.textContent = ''
    submitButton.disabled = true
    submitButton.textContent = '正在进入预览…'

    onStart({
      file,
      bgmFile: field<HTMLInputElement>('#upload-bgm').files?.[0] ?? null,
      coverFile: field<HTMLInputElement>('#upload-cover').files?.[0] ?? null,
      offsetMs: readOptionalOffset(field<HTMLInputElement>('#upload-offset')),
      difficulty: field<HTMLSelectElement>('#upload-diff').value || null,
      title: readOptionalText(field<HTMLInputElement>('#upload-title')),
      lyricist: readOptionalText(field<HTMLInputElement>('#upload-lyricist')),
      composer: readOptionalText(field<HTMLInputElement>('#upload-composer')),
      arranger: readOptionalText(field<HTMLInputElement>('#upload-arranger')),
      vocal: readOptionalText(field<HTMLInputElement>('#upload-vocal')),
      customScoreInfo: field<HTMLInputElement>('#upload-custom-score-info').checked,
      scoreTitle: readOptionalText(field<HTMLInputElement>('#upload-score-title')),
      scoreCreator: readOptionalText(field<HTMLInputElement>('#upload-score-creator')),
      showLockControlsButton: field<HTMLInputElement>('#upload-show-lock').checked,
    })

    submitButton.disabled = false
    submitButton.textContent = '开始预览'
  })
}

export function renderAbout(root: HTMLElement): void {
  renderShell(
    root,
    `
    <section class="preview-about">
      <h1>关于本预览器</h1>
      <p>这是一个在本地运行的 Project Sekai 自制谱预览器：选一份自己做的谱面，
        就能看到接近实机的音符、长条、判定线、HUD 与打击音，并且可以调速度、换皮肤、录屏导出视频。</p>
      <p>所有文件都在你自己的浏览器里解析，<strong>不会上传到任何服务器</strong>；
        除了首次准备素材，使用过程不需要联网。</p>

      <h2>支持哪些谱面</h2>
      <ul class="about-list">
        <li><strong>USC</strong>（<code>.usc</code>）：MikuMikuWorld 等制谱器导出的自制谱。</li>
        <li><strong>Sonolus LevelData</strong>（<code>.json</code> / <code>.lvdata</code> /
          <code>.leveldata</code> / <code>.gz</code> / 无扩展名）：压缩包会自动解压。</li>
        <li><strong>自制 JSON</strong> 与 <strong>SUS</strong>（<code>.sus</code>）：会自动转换成同一种内部结构。</li>
      </ul>

      <h2>引用与致谢</h2>
      <ul class="about-list">
        <li><a href="https://github.com/Next-SEKAI/sonolus-next-sekai-engine" target="_blank" rel="noreferrer">Next-SEKAI/sonolus-next-sekai-engine</a>（MIT，时序语义与渲染器来源）</li>
        <li><a href="https://github.com/crash5band/MikuMikuWorld" target="_blank" rel="noreferrer">crash5band/MikuMikuWorld</a>（MIT，USC 格式与编辑器）</li>
        <li><a href="https://github.com/watagashi-uni/Uni-PJSK-Viewer-Frontend" target="_blank" rel="noreferrer">watagashi-uni/Uni-PJSK-Viewer-Frontend</a>（GPL-3.0，谱面转图片渲染器）</li>
        <li><a href="https://gitlab.com/pjsekai/musics" target="_blank" rel="noreferrer">pjsekai/musics</a>（谱面转图片的原始算法与素材）</li>
        <li><a href="https://github.com/crash5band/MikuMikuWorld/blob/master/LICENSE" target="_blank" rel="noreferrer">MikuMikuWorld MIT License</a></li>
        <li><a href="https://github.com/TootieJin/pjsekai-overlay-APPEND" target="_blank" rel="noreferrer">TootieJin/pjsekai-overlay-APPEND</a>（AGPL）</li>
      </ul>
      <p>左侧「谱面转图片」可以把一份谱面导出成长图，适合发预览图或者比对谱面；
        它和预览页共用同一条变速曲线，所以两边的时间轴一致。这个渲染器同样来自
        <a href="https://github.com/watagashi-uni/Uni-PJSK-Viewer-Frontend" target="_blank" rel="noreferrer">Uni-PJSK-Viewer-Frontend</a>（GPL-3.0），
        上游为
        <a href="https://gitlab.com/pjsekai/musics" target="_blank" rel="noreferrer">pjsekai/musics</a>。</p>
    </section>
  `,
    '/about',
  )
}
