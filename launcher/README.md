# 一键启动器（Sonolus 预览器.exe）

把「起本地服务器 + 打开浏览器」这两步合成一个 exe。**运行时不需要 Node**——
wasm 与美术资源都由 exe 自己监听 127.0.0.1 发出去。

---

## 1. 前置条件

### 打包时
- .NET 8 SDK（`dotnet --version` 能看到 8.x）
- 已经跑过一次 `node build.mjs`（需要 `dist/app.js` 与 `vendor/`）

### 运行时
| 项 | 要求 | 说明 |
|---|---|---|
| .NET | **.NET 8 Desktop Runtime**（框架依赖版，exe 约 150 KB） | Win10/11 多数机器已有；没有就装一个，或改用下面的 self-contained |
| 浏览器 | Chrome / Edge / Firefox 任一 | 需要 WebGL2（wasm 渲染器用） |
| Node | **不需要** | 服务器逻辑已内置在 exe 里 |
| 目录 | exe 与 `index.html` 同级 | 否则启动器会向上找两级；找不到就报错退出 |

### 运行时目录结构

```
sonolus version/
├── Sonolus 预览器.exe      ← 双击这个
├── index.html
├── dist/app.js             ← node build.mjs 的产物
├── vendor/                 ← node scripts/sync-renderer.mjs 的产物（wasm + manifest.json）
├── data/                   ← 内置样例
└── (public-assets/mmw/ 或 ..\public\assets\mmw\)   ← 美术资源
```

美术资源按以下顺序找，命中第一个就停：

1. `<应用目录>\public-assets\mmw\`（想独立分发时把旧版 `public\assets\mmw` 拷到这里）
2. `<应用目录>\..\public\assets\mmw\`（留在旧版仓库旁边时直接复用，零拷贝）
3. `<应用目录>\assets\mmw\`（**绿色版走这条**：`scripts/package-portable.mjs` 会把清单里的资源放到这里）
4. `<应用目录>\assets\`（资源直接摊在 assets 根下时）

`landing`（首页配图）与 `static`（转图片素材）按同样的顺序找，但多一个候选
`<应用目录>\..\public\landing` / `..\public\static`——这两个目录在旧版里不在 `assets` 下。

缺了不会崩，但 wasm 渲染器会缺贴图（`--console` 模式会打印警告）。

---

## 2. 打包

```bat
cd "D:\mmwViewer\sonolus version"
launcher\build-launcher.cmd
```

脚本做两件事：

```bat
dotnet publish "launcher\SonolusPreview.csproj" -c Release -o "launcher\dist" -nologo
copy /y "launcher\dist\SonolusPreview.exe" "Sonolus 预览器.exe"
```

产物：`launcher\dist\SonolusPreview.exe`（约 150 KB，单文件）→ 复制到应用根目录改名。

### 想做成「不用装 .NET」的版本

产物约 66 MB，自带运行时，任何 Win10/11 x64 双击即用（`scripts/package-portable.mjs` 会优先用这一份）：

```bat
dotnet publish "launcher\SonolusPreview.csproj" -c Release -r win-x64 ^
  --self-contained true -p:PublishSingleFile=true ^
  -p:IncludeNativeLibrariesForSelfExtract=true -o "launcher\dist-portable" -nologo
```

注意：WinForms 不支持 `PublishTrimmed`（`NETSDK1175`），所以体积压不下去；
`EnableCompressionInSingleFile` 对这种带原生库的单文件也基本无效（实测仍是 65.8 MB）。

### 想改 exe 名字 / 图标

- 名字：改 `SonolusPreview.csproj` 里的 `<AssemblyName>`，或直接改复制时的目标文件名；
- 图标：加 `<ApplicationIcon>app.ico</ApplicationIcon>` 并放一个 ico 进去。

---

## 3. 运行

双击 `Sonolus 预览器.exe`：**不弹任何命令行窗口**，进程在后台静默起服务、
打开默认浏览器，只在任务栏托盘留一个图标。

```
托盘图标（右键）：
  ├─ 打开预览器      ← 需要时重新打开首页
  └─ 退出            ← 停止服务并结束进程
```

- 端口从 **5181** 开始，被占用就往后试 12 个；
- 自动调用默认浏览器打开首页；
- 进程没有控制台窗口（exe 是 WinExe / GUI 子系统，Windows 根本不会给它分配
  控制台），所以不会闪黑框；
- 退出走后托盘菜单，不驻留服务、不写注册表。

### 关掉网页 = 整个预览器退出

页面（`dist/app.js` 里的 `src/view/keepAlive.ts`）每 **2 秒**往
`POST /__preview-alive?id=…` 发一次心跳，关页面时再发一次 `/__preview-bye`。
启动器维护「还活着的标签页」集合，**超过 6 秒没有心跳就结束整个进程**：托盘图标消失、
端口释放，后台不会留窗口。

- 刷新页面不会误杀：旧文档发 bye，新文档 1 秒内就重新 ping 上来；
- 同时开多个标签页时，只要还有一个活着就继续跑；
- 反过来关托盘（或 `--console` 下 Ctrl+C）也是立刻停服务，两条路都收得干净。

命令行参数：

| 参数 | 作用 |
|---|---|
| `--no-browser` | 只起服务器，不打开浏览器（脚本/CI 用） |
| `--console` | 排错用：挂一个控制台，打印完整启动日志，Ctrl+C 退出（旧行为） |

`--console` 可以这样跑，日志会留在窗口里：

```bat
cd /d "<应用目录>"
"Sonolus 预览器.exe" --console
```

静默模式下如果起不来（找不到 index.html、端口全占），会弹一个 MessageBox
说明原因——否则用户什么都看不到。

---

## 4. 与 `serve.mjs` 的关系

exe 内置的是一个**等价实现**，路由与 `serve.mjs` 一一对应：

| 路径 | 目标 |
|---|---|
| `/assets/mmw/*` | 旧版 `public/assets/mmw`（或 `public-assets/mmw`） |
| `/assets/landing/*` | 旧版 `public/assets/landing`（首页配图） |
| `/static/*` | 旧版 `public/static`（谱面转图片的皮肤素材） |
| `/vendor/*` | `<应用目录>/vendor` |
| `/favicon.ico` | 204 |
| 其它 | `<应用目录>`；**没有扩展名且文件不存在时回落 `index.html`**（站点路由 `/upload`、`/about`…） |

MIME 表也一致（关键项：`.wasm → application/wasm`、`.mjs/.js → text/javascript`）。

⚠️ **改了一边要同步另一边**：以后新增挂载点或改路由，`serve.mjs` 与 `launcher/Program.cs`
的 `Resolve()` 都要改。不想维护两份就用 `node serve.mjs`（开发时用它更省事）。

已知未实现（当前用不到）：

- `Range` 请求：返回 200 全量，不返回 206。音频是整段 `fetch` 的，没有影响；
- `HEAD`：返回头部、不返回 body（已支持）；
- HTTP/2、keep-alive：一律 `Connection: close`，单请求单连接。

---

## 5. 常见问题

| 现象 | 原因 / 处理 |
|---|---|
| 双击没反应 | 没装 .NET 8 Desktop Runtime —— Windows 会弹「缺少运行时」对话框；用 `SelfContained=true` 重打包可免装 |
| 提示「找不到 index.html」 | exe 没放在 `sonolus version` 目录里（静默模式会弹 MessageBox） |
| 想看看它到底干了什么 | 用 `--console` 启动，日志会留在控制台窗口里 |
| 页面白屏、控制台 404 `dist/app.js` | 没跑 `node build.mjs` |
| 提示「没找到美术资源目录」 | 补 `public-assets/mmw`，或让 exe 留在旧版仓库旁边 |
| 端口全占 | 换机器或手动结束占用 5181–5192 的进程 |
| 音符不动 / WebGL 报错 | 浏览器不支持 WebGL2，或驱动被禁；换 Chrome/Edge 试 |
