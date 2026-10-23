# 第三方组件与素材说明

本仓库以 **AGPL-3.0-only** 发布（见 [LICENSE](LICENSE)）。以下组件/素材来自其它项目，
版权归各自作者所有，按各自许可证使用。若你是权利人且认为此处使用不当，请开 issue，我们会尽快处理。

## 代码

| 位置 | 来源 | 许可 | 说明 |
| --- | --- | --- | --- |
| `src/site/vendor/sus2img/**` | [watagashi-uni/Uni-PJSK-Viewer-Frontend](https://github.com/watagashi-uni/Uni-PJSK-Viewer-Frontend)（上游算法源自 [pjsekai/musics](https://gitlab.com/pjsekai/musics)） | GPL-3.0 | 「谱面转图片」的 Canvas2D 渲染器。该目录整体仍为 GPL-3.0。 |
| `vendor/wasm/mmw-preview.wasm`、`vendor/wasm/mmw-preview.js` | [Next-SEKAI/sonolus-next-sekai-engine](https://github.com/Next-SEKAI/sonolus-next-sekai-engine) 的构建产物 | MIT | 预览器的实际渲染器（C++ → wasm）。源码不在本仓库。 |
| `src/view/wasmStage.ts` 等 wasm 绑定 | 本项目编写 | AGPL-3.0-only | 与上游 wasm 的胶水代码。 |
| `launcher/**` | 本项目编写 | AGPL-3.0-only | C# / WinForms 启动器（托盘 + 本地静态服务器 + 关网页退出）。 |
| npm 依赖：`esbuild`、`mp4-muxer` 等 | 见 `package.json` | MIT 等 | 仅构建期/打包期使用。 |

### 关于 AGPL-3.0 与 GPL-3.0 的组合

`src/site/vendor/sus2img` 为 GPL-3.0 代码。GPL-3.0 允许与 AGPL-3.0 组合分发
（FSF 的兼容性说明：GPLv3 代码可并入 AGPLv3 作品）。因此本仓库整体以 AGPL-3.0-only 分发，
而 `sus2img` 目录中的文件仍保留其 GPL-3.0 许可，其原始版权与许可声明以来源仓库为准。

## 美术与音频素材

| 位置 | 来源 | 说明 |
| --- | --- | --- |
| `assets/mmw/**`（贴图、字体、音效） | [Next-SEKAI/sonolus-next-sekai-engine](https://github.com/Next-SEKAI/sonolus-next-sekai-engine)、[crash5band/MikuMikuWorld](https://github.com/crash5band/MikuMikuWorld) 等上游资源包 | 预览渲染所需的贴图/字体/打击音；版权归各自作者。 |
| `assets/skin.png`、`assets/sprites.json`、`assets/mmw/skins/**` | Sonolus 皮肤服务器（`coconut.sonolus.com/next-sekai`）上的公开皮肤「Next SEKAI 01 / 02」 | 用于 4 套音符皮肤中的两套；版权归皮肤作者。 |
| 参考素材 | [TootieJin/pjsekai-overlay-APPEND](https://github.com/TootieJin/pjsekai-overlay-APPEND)（AGPL） | 部分 UI/HUD 素材参考。 |

## 站点结构与交互

站点外壳（侧栏、加载自制谱、谱面转图片、关于页）参考
**[watagashi-uni/sekai-mmw-preview-web](https://github.com/watagashi-uni/sekai-mmw-preview-web)**
（作者 **watagashi-uni（わたがし）**）。这是本项目最重要的参考来源，特此致谢。

## 免责声明

本项目仅用于**自制谱的本地预览与学习**，与 Project Sekai（プロジェクトセカイ）官方无关。
仓库内不包含任何官方歌曲音频或曲绘；预览所需的 BGM / 曲绘由使用者自行提供。
