# Sonolus 预览器 · 使用说明

一个本地运行的 Project Sekai 自制谱预览器：把 `.usc` 或 Sonolus LevelData 谱面选进来，
就能看到接近实机的音符、长条、判定线、HUD 与打击音；可以调速度、换皮肤、录屏导出 MP4。

**全程离线**：渲染器、皮肤、音效、字体、录屏编码全部在本地文件里，运行时不需要联网，也不需要用 Node.js 或 ffmpeg。

---

## 1. 绿色版：解压即用（推荐）

拿到 `Sonolus预览器-<日期>.zip`（在源码目录的 `release/` 下，或用 `node scripts/package-portable.mjs` 现做一份）：

1. 解压到任意目录（路径带中文、空格都没问题）。
2. 双击 **`Sonolus 预览器.exe`** —— 右下角出现托盘图标，浏览器自动打开预览器。
3. 左侧「加载自制谱」选谱面文件 → 点「开始预览」。

关掉网页后，启动器会在约 6 秒内自己退出（托盘图标消失），不需要手动关。

压缩包里有什么：

| 内容 | 说明 |
| --- | --- |
| `Sonolus 预览器.exe` | 本地静态服务器 + 托盘 + 自动开浏览器；**自带 .NET 运行时**，目标机器不用装任何东西 |
| `index.html`、`dist/` | 页面与前端打包产物 |
| `vendor/` | wasm 渲染器 + 资源清单 |
| `assets/` | 皮肤图集、音效，以及 `assets/mmw/` 下 390 个渲染资源（贴图 / 字体 / 音效） |
| `data/` | 内置样例谱面（诊断面板里的「内置样例」） |
| `README.md`、`先看这里.txt` | 你正在看的说明 |

**运行要求**：Windows 10 / 11 64 位 + Chrome / Edge（需要 WebGL2；录屏还需要 WebCodecs）。
不需要 .NET、不需要 Node.js、不需要联网。

---

## 2. 在源码目录里运行（开发用）

| 方式 | 做法 | 说明 |
| --- | --- | --- |
| 启动器 | 双击源码目录里的 `Sonolus 预览器.exe` | 这一份是**框架依赖**版（约 160 KB），需要装 .NET 8 Desktop Runtime |
| 命令行 | 在 `sonolus version` 目录执行 `node serve.mjs` | 默认端口 5181；换端口 `node serve.mjs 8080`；`--no-exit-on-close` 可关掉「关网页即退出」 |

源码目录下的美术资源走「旧仓库」路径（`../public/assets/mmw`），所以 `serve.mjs` 与这里的 exe 都能直接跑，不需要额外拷贝。

---

## 3. 导入谱面

左侧栏 → **加载自制谱**：

| 字段 | 说明 |
| --- | --- |
| 谱面文件（必填） | 见下方支持格式。 |
| BGM（可选） | 导入音频后预览页可以播放音乐；不导入则只有打击音。 |
| 曲绘（可选） | 预览页背景/信息区使用。 |
| offset(ms) | 谱面整体延后多少毫秒。留空时按 9000 ms 前导处理。 |
| 难度 / 曲名 | 只影响显示。 |

支持的谱面格式（扩展名不敏感，也会按文件内容自动识别）：

| 格式 | 常见扩展名 | 备注 |
| --- | --- | --- |
| USC | `.usc` | MikuMikuWorld 等制谱器导出的自制谱（JSON）。 |
| Sonolus LevelData | `.json`、`.lvdata`、`.leveldata`、`.gz`、无扩展名 | 支持 Gzip 压缩包，自动解压。 |

**不支持** `.sus`（旧版 SUS 谱面）与「自制谱 JSON」（CustomScoreJson）——
这两类文件能被识别出来，但导入时会提示「暂不支持」，请先转成 USC 或 LevelData 再导入。

> 想换谱面就再点一次左侧「加载自制谱」，不用刷新页面。

---

## 4. 预览页控件

| 控件 | 作用 |
| --- | --- |
| 播放 / 暂停 | 开始或暂停播放；进度条可拖动跳转。 |
| 速度 | 0.25x ~ 2x，谱面与 BGM 同步变速。 |
| noteSpeed | 音符下落速度，默认 10.5；`-1` / `-0.1` / `+0.1` / `+1` 微调。数值越大音符越"高"越慢。 |
| 背景亮度 | 舞台背景明暗（60%–100%）。 |
| Guide 浓度 | 引导（Guide）长条的透明度，默认 50%。 |
| 长条透明度 | 长条（Hold）本体透明度，默认 74%。 |
| BGM 音量 / 音效音量 | 分开控制。 |
| Note Skin | 音符皮肤：`Notes 01` / `Notes 02` / `Next SEKAI 01`（默认）/ `Next SEKAI 02`。 |
| 音符颜色 | 「默认（按类型）」按类型上色并遵循谱面里的逐音符颜色；其余 8 项强制单色。 |
| 上隐 | 顶部遮挡板高度（0%–100%）。 |
| 低特效 | 减少判定/粒子特效，低配机器更流畅。 |
| Mirror | 左右镜像。 |
| 双押线 | 同时押的音符之间画连线（默认开）。 |
| 低分辨率 | 画布按 0.5 倍分辨率渲染，降低 GPU 占用。 |
| damage 音效 | damage 音符默认无声，勾选后按 trace 音效播放。 |
| 诊断 / 自检 | 性能读数、重新载入、内置样例、渲染器切换、谱面信息、一致性自检。 |
| 全屏 | 预览区全屏。 |
| 录屏 | 见第 6 节。 |

### 快捷键

| 按键 | 作用 |
| --- | --- |
| `空格` | 播放 / 暂停 |
| `←` / `→` | 后退 / 前进 0.1 秒 |
| `Shift` + `←` / `→` | 后退 / 前进 1 秒 |

### 右上角三个数字

| 显示 | 含义 |
| --- | --- |
| **物量** | 谱面打完时的总 combo（= 这次演奏会累计的判定事件数）。 |
| **时长** | 谱面本身的长度（不含前导）。 |
| **时序组** | BPM / 变速组的数量，越多说明变速越复杂。 |

---

## 5. 谱面转图片

左侧栏 → **谱面转图片**：选一份谱面导出长图，适合发预览图或比对谱面。
它和预览页共用同一条变速曲线，两边时间轴一致。

这一页接受 **USC**、**Sonolus LevelData** 与**自制谱 JSON**（CustomScoreJson；
预览页不支持自制谱 JSON，但转图片可以），仍不支持 `.sus`。

---

## 6. 录屏

预览页控制栏 → **录屏** `[720p ▾] [60 fps ▾] [开始录制] [暂停] [停止]`。

- 分辨率 `720p`（1280×720）/ `1080p`（1920×1080）；帧率 `60 fps` / `30 fps`。
- 导出是**恒定帧率**的 MP4（H.264 + AAC）：编码用浏览器自带的 WebCodecs，封装 MP4 由预览器自己完成 —— 不需要装 ffmpeg，也不需要联网。
- 录制时临时把渲染尺寸切到目标分辨率，停止后恢复；播放进度和配置不受影响。
- **暂停**期间不入镜、不计时，恢复后接着录。
- 点 **停止** 后由浏览器下载（文件名形如 `pjsk-viewer-720p-20261023-221501.mp4`）；不足约 1 秒的录制会提示「录制时间太短」，不会产出空文件。
- 录的就是预览区画面：想录全屏效果，先点 **全屏** 再开始。

---

## 7. 常见问题

**双击 exe 没反应 / 被 SmartScreen 拦下？**
exe 没有数字签名，首次运行点「更多信息 → 仍要运行」。若杀软拦截，加白名单即可。

**端口被占用？**
启动器会依次尝试 5181–5192，全被占用才会报错。先关掉其它预览器实例再试。

**关掉网页后托盘图标还在？**
正常会在约 6 秒内退出。用 `node serve.mjs --no-exit-on-close` 启动的话不会自动退出。

**没有声音？**
浏览器要求先有用户操作才允许播放音频：先点一次 **播放**。只用谱面文件时只有打击音，要 BGM 就得在导入时选音频。

**卡顿 / 掉帧？**
先勾 **低特效**；还不够就勾 **低分辨率**；关掉 **上隐**、把 **noteSpeed** 调小也有帮助。确认浏览器用的是独立显卡（`chrome://gpu`）。

**录屏文件很大？**
60 fps + 1080p 约 12 Mbps，1 分钟约 90 MB。想小一点就选 720p / 30 fps。

**能在手机上用吗？**
预览页是桌面布局，触屏没有适配。

---

## 8. 源码、重新打包

```bash
# 在 sonolus version 目录
node build.mjs                     # 重新打包 dist/（改了 TS 之后）
node scripts/sync-renderer.mjs     # 拷贝 wasm 渲染器 + 生成 vendor/manifest.json（换了 wasm 之后）
node test/parity.mjs               # 一致性自检
node scripts/package-portable.mjs   # 生成 release/Sonolus预览器-<日期>/ 与同名 zip
```

- 启动器源码在 `launcher/`：`launcher/build-launcher.cmd` 出框架依赖版；
  想要「目标机器不用装 .NET」的版本，用
  `dotnet publish launcher/SonolusPreview.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o launcher/dist-portable`
  （`package-portable.mjs` 会优先用这份）。
- 目录结构：

```
index.html            站点入口
dist/                 打包产物（app.js / app.css / core.mjs）
vendor/               wasm 渲染器（mmw-preview.wasm + glue）、资产清单
assets/               皮肤图集、音效；绿色版另含 assets/mmw/（390 个渲染资源）
data/                 内置样例谱面
serve.mjs             本地静态服务器
Sonolus 预览器.exe     启动器
scripts/              资源同步、打包脚本
docs/                 版本快照、开发记录
```

开发过程、每次改动的原因与踩坑记录在 [docs/dev-notes.md](docs/dev-notes.md)。

---

## 9. 致谢与许可

| 项目 | 用途 | 许可 |
| --- | --- | --- |
| [Next-SEKAI/sonolus-next-sekai-engine](https://github.com/Next-SEKAI/sonolus-next-sekai-engine) | 时序语义与 wasm 渲染器 | MIT |
| [crash5band/MikuMikuWorld](https://github.com/crash5band/MikuMikuWorld) | USC 格式与制谱器 | MIT |
| [watagashi-uni/Uni-PJSK-Viewer-Frontend](https://github.com/watagashi-uni/Uni-PJSK-Viewer-Frontend) | 谱面转图片渲染器 | GPL-3.0 |
| [pjsekai/musics](https://gitlab.com/pjsekai/musics) | 谱面转图片的原始算法与素材 | — |
| [watagashi-uni/sekai-mmw-preview-web](https://github.com/watagashi-uni/sekai-mmw-preview-web) | 站点结构（侧栏、加载自制谱、谱面转图片、关于） | — |
| [TootieJin/pjsekai-overlay-APPEND](https://github.com/TootieJin/pjsekai-overlay-APPEND) | 部分素材参考 | AGPL |

本项目仅用于自制谱的本地预览，与 Project Sekai 官方无关。
