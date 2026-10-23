# Next-Sekai MMW Previewer（本地版）

一款运行在本地浏览器里的 Project Sekai 自制谱预览器：选择 `.usc` / Sonolus LevelData / 自制 JSON / `.sus` 谱面，
就能看到接近实机的音符、长条、判定线、HUD 与打击音，可以调速度、换皮肤、录屏导出 MP4。

- **全程离线**：渲染器、皮肤、音效、字体、录屏编码全部本地，运行时不访问网络，也不需要 Node.js 或 ffmpeg。
- **一套时间轴**：变速（含缓动积分与 `#TIMESCALE_SKIP` 位移跳变）按 Next SEKAI 引擎的 marker 模型实现，预览与「谱面转图片」共用同一条曲线。
- **解压即用**：Release 里的绿色版自带 .NET 运行时，双击 exe 就能用。

---

## 特别感谢

**本项目大量借鉴并受益于 [watagashi-uni（わたがし）](https://github.com/watagashi-uni) 的
[sekai-mmw-preview-web](https://github.com/watagashi-uni/sekai-mmw-preview-web)。**

侧栏导航、加载自制谱、谱面转图片、关于页这些站点结构与交互流程都来自那个项目；
这个预览器的「外壳」基本上是照着它做的。**如果这个项目对你有帮助，请先去给原项目点一个 star。**

同样感谢这些开源项目：

| 项目 | 用途 | 许可 |
| --- | --- | --- |
| [Next-SEKAI/sonolus-next-sekai-engine](https://github.com/Next-SEKAI/sonolus-next-sekai-engine) | 时序语义与 wasm 渲染器 | MIT |
| [crash5band/MikuMikuWorld](https://github.com/crash5band/MikuMikuWorld) | USC 格式与制谱器 | MIT |
| [watagashi-uni/Uni-PJSK-Viewer-Frontend](https://github.com/watagashi-uni/Uni-PJSK-Viewer-Frontend) | 谱面转图片渲染器（`src/site/vendor/sus2img`） | GPL-3.0 |
| [pjsekai/musics](https://gitlab.com/pjsekai/musics) | 谱面转图片的原始算法与素材 | — |
| [TootieJin/pjsekai-overlay-APPEND](https://github.com/TootieJin/pjsekai-overlay-APPEND) | 部分素材参考 | AGPL |

第三方组件的完整说明见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。

---

## 快速开始

### 方式一：绿色版（推荐给使用者）

1. 到 Releases 下载 `Sonolus预览器-*.zip`。
2. 解压到任意目录，双击 `Sonolus 预览器.exe`。
3. 左侧「加载自制谱」选谱面文件 → 点「开始预览」。

自带运行时，目标机器不需要安装 .NET 或 Node；关掉网页后启动器约 6 秒自动退出。

### 方式二：源码运行（推荐给开发者）

```bash
git clone https://github.com/<owner>/Next-Sekai-mmw-previewer-local.git
cd Next-Sekai-mmw-previewer-local
node serve.mjs            # 默认 5181 端口，需要 Node 20+
```

`dist/`、`vendor/`、`assets/` 都已入库，clone 下来即可运行，不需要先构建。

---

## 功能

- **谱面**：USC（`.usc`）、Sonolus LevelData（`.json` / `.lvdata` / `.leveldata` / `.gz` / 无扩展名，自动 gunzip）、
  自制 JSON、SUS；都可搭配自选 BGM 与曲绘。
- **渲染**：Next SEKAI 引擎的 wasm 渲染器；长条本体、引导线、判定线、HUD 与实机一致；
  滑键支持上 / 下 / 左 / 右 / 左下 / 右下六个方向。
- **皮肤**：Notes 01 / Notes 02 / Next SEKAI 01 / Next SEKAI 02 四套，另可强制 8 种音符颜色。
- **读谱辅助**：速度 0.25x–2x、noteSpeed 微调、背景亮度、Guide 浓度、长条透明度、上隐、Mirror、双押线、低特效、低分辨率。
- **录屏**：720p / 1080p、30 / 60 fps，导出**恒定帧率** MP4（H.264 + AAC）；编码走浏览器 WebCodecs，封装 MP4 由本项目完成，不需要 ffmpeg。
- **谱面转图片**：把一份谱面导出成长图，和预览共用同一条变速曲线。
- **诊断**：帧时间读数（rAF 间隔 / CPU / GPU）、谱面信息、一致性自检、内置样例。

### 键盘快捷键

| 按键 | 作用 |
| --- | --- |
| `空格` | 播放 / 暂停 |
| `←` / `→` | 后退 / 前进 0.1 秒 |
| `Shift` + `←` / `→` | 后退 / 前进 1 秒 |

### 右上角三个数字

| 显示 | 含义 |
| --- | --- |
| **物量** | 打完这份谱的最终 combo（= 累计判定事件数）。 |
| **时长** | 谱面本身的长度（不含前导）。 |
| **时序组** | BPM / 变速组的数量。 |

---

## 浏览器要求

Chrome / Edge 等现代浏览器：需要 **WebGL2**（wasm 渲染器）；**录屏**还需要 **WebCodecs**
（Chrome 94+ / Edge 94+）。Firefox 可预览但录屏不可用。

---

## 目录结构

```
index.html              站点入口
build.mjs               esbuild 打包脚本（dist/app.js、dist/core.mjs）
serve.mjs               本地静态服务器（开发用）
src/
  bridge/               marker 时间轴 → SpeedLayers → CustomScoreJson 的桥接
  preview/              wasm 宿主、录制器、帧时间探针
  site/                 站点页面（首页 / 上传 / 谱面转图片 / 关于）
  data/                 USC、LevelData 解析
  view/                 wasm 渲染器绑定、皮肤、资源加载
scripts/
  sync-renderer.mjs     从上游拷贝 wasm 渲染器 + 生成 vendor/manifest.json
  package-portable.mjs  打绿色版（自带运行时的 exe + 资源 + zip）
test/                   parity / 性能 / 绿色版离线验收脚本
vendor/                 wasm 渲染器与资源清单（入库，免构建）
assets/                 皮肤图集、音效；assets/mmw/ 为清单里的渲染资源
data/                   内置样例谱面
launcher/               启动器源码（C# / WinForms，托盘 + 静态服务器）
```

---

## 构建

```bash
node build.mjs                     # 打包 dist/
node scripts/sync-renderer.mjs     # 换了 wasm 之后：同步 vendor/ + manifest
node test/parity.mjs               # 时间轴一致性自检

# 启动器（需要 .NET 8 SDK）
launcher/build-launcher.cmd        # 框架依赖版（约 160 KB，需要 .NET 8 Desktop Runtime）
# 自带运行时版（约 66 MB，绿色版用这个）
dotnet publish launcher/SonolusPreview.csproj -c Release -r win-x64 --self-contained true \
  -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o launcher/dist-portable

# 打绿色版 zip
node scripts/package-portable.mjs
```

`wasm` 源码不在本仓库（来自 Next SEKAI 引擎的构建产物）；`vendor/wasm/` 里的二进制已入库，
需要重新编译时请参考上游仓库。

---

## 许可

本项目以 **AGPL-3.0-only** 发布，见 [LICENSE](LICENSE)。

其中 `src/site/vendor/sus2img/` 派生自 GPL-3.0 的
[watagashi-uni/Uni-PJSK-Viewer-Frontend](https://github.com/watagashi-uni/Uni-PJSK-Viewer-Frontend)，
该部分仍遵循 GPL-3.0；AGPL-3.0 与 GPL-3.0 可组合分发，详见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。

渲染器二进制、皮肤与音效素材来自上表列出的上游项目，版权归各自作者所有。
本项目仅用于自制谱的本地预览，与 Project Sekai 官方无关。
