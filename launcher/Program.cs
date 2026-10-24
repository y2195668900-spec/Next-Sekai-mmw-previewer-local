// Sonolus Version 预览器 —— 一键启动器
//
// 作用：
//   1. 找到应用根目录（exe 同级或上一级，须含 index.html）
//   2. 起一个只监听 127.0.0.1 的静态服务器，路由与 serve.mjs 完全一致：
//        /assets/mmw/*  → 旧版 public/assets/mmw（或本目录的 public-assets/mmw）
//        /vendor/*      → wasm 产物
//        其它           → 应用根目录
//   3. 等端口可访问后自动打开默认浏览器
//   4. 托盘图标右键退出（`--console` 模式下按 Ctrl+C）
//   5. 网页关掉后自动退出：页面每 2 s 发一次心跳（`/__preview-alive`），
//      超过 6 s 没有任何活着的标签页就结束整个进程（托盘图标一起消失、
//      端口释放），不会留一个后台窗口在右下角。刷新页面不会误杀——
//      新文档 1 s 内就重新 ping 上来；多开标签页时任意一个活着就继续跑。
//
// 进程编译成 WinExe（GUI 子系统），双击**不会**出现控制台窗口：Windows 根本
// 不会给这个进程分配控制台。所有诊断输出在静默模式下被丢弃（写进 Stream.Null），
// 需要看日志就用 `Sonolus 预览器.exe --console` 启动，它会在父控制台里运行，
// 或者自己开一个。
//
// 不依赖 Node：wasm 与资源都由本进程直接发送（.wasm 用 application/wasm）。
// 因此“打包”只需要 dotnet publish，产物是单个 exe。

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using WinForms = System.Windows.Forms;

internal static class Program
{
    private const string Title = "Sonolus Version 预览器";
    private const int FirstPort = 5181;
    private const int PortTries = 12;

    /// <summary>页面心跳：浏览器每 2 s POST 一次，超过这个时长没心跳就认为标签页没了。</summary>
    private const int ClientTimeoutMs = 6000;

    private const string AlivePath = "/__preview-alive";
    private const string ByePath = "/__preview-bye";

    private static string root = ".";
    private static string legacyAssets = "";
    private static string landingAssets = "";
    private static string staticAssets = "";
    private static volatile bool running = true;

    /// <summary>还活着的标签页（id → 最后一次心跳的 TickCount64）。</summary>
    private static readonly ConcurrentDictionary<string, long> liveClients = new();

    /// <summary>至少有过一次心跳后才允许「集合空了就退出」，否则页面刚加载、JS 还没跑就会误退。</summary>
    private static volatile bool sawAlive;

    private static WinForms.Timer clientTimer;

    /// <summary>`--console` 启动：挂控制台、按 Ctrl+C 退出（原行为，用于排错）。</summary>
    private static bool consoleMode;

    private static string previewUrl = "";
    private static WinForms.NotifyIcon tray;

    [STAThread]
    private static int Main(string[] args)
    {
        consoleMode = HasFlag(args, "--console");
        if (consoleMode)
        {
            AttachOrCreateConsole();
        }

        EnableUtf8Console();
        PrintBanner();

        root = FindRoot();
        if (root == null)
        {
            return Fail("找不到 index.html —— 请把 exe 放在 sonolus version 目录里（或它的上一级）。");
        }
        Console.WriteLine("  应用目录  " + root);

        legacyAssets = FindLegacyAssets(root);
        if (legacyAssets == null)
        {
            Warn("没找到美术资源目录，wasm 渲染器会缺贴图。");
            Warn("期望其一：<应用目录>\\public-assets\\mmw、<应用目录>\\..\\public\\assets\\mmw、<应用目录>\\assets\\mmw");
        }
        else
        {
            Console.WriteLine("  美术资源  " + legacyAssets);
        }

        landingAssets = FindSiblingAssets("landing");
        staticAssets = FindSiblingAssets("static");

        var listener = Listen();
        if (listener == null)
        {
            return Fail("端口 " + FirstPort + ".." + (FirstPort + PortTries - 1) + " 都被占用。");
        }

        int port = ((IPEndPoint)listener.LocalEndpoint).Port;
        previewUrl = "http://127.0.0.1:" + port + "/";
        Console.WriteLine();
        Console.WriteLine("  已启动    " + previewUrl);
        Console.WriteLine("  退出      " + (consoleMode ? "按 Ctrl+C" : "右键托盘图标 → 退出"));
        Console.WriteLine();

        var acceptor = Task.Run(() => AcceptLoop(listener));

        if (!HasFlag(args, "--no-browser"))
        {
            TryOpenBrowser(previewUrl);
        }

        if (consoleMode)
        {
            Console.CancelKeyPress += delegate(object sender, ConsoleCancelEventArgs e)
            {
                e.Cancel = true;
                running = false;
            };

            // 主线程留在这里等 Ctrl+C；窗口被关掉时进程直接结束。
            while (running)
            {
                Thread.Sleep(200);
                CheckClients();
            }
        }
        else
        {
            // 静默模式：没有控制台，靠 WinForms 的消息循环让进程活着，
            // 同时承载托盘图标。Application.ExitThread() 会从这里返回。
            RunSilently();
        }

        try { listener.Stop(); } catch { }
        DisposeTray();
        Console.WriteLine("已停止。");
        return 0;
    }

    // ---------------------------------------------------------------- 静默模式

    private static void RunSilently()
    {
        try
        {
            CreateTray();
        }
        catch (Exception ex)
        {
            // 托盘建不起来（极少数 shell 异常）不该拖垮服务：进程继续在后台跑，
            // 浏览器照样能用，只是没有退出入口。
            Warn("托盘图标创建失败：" + ex.Message);
        }

        // 心跳看门狗走 WinForms 定时器，Tick 在 UI 线程上执行，退出时不用跨线程拆托盘。
        clientTimer = new WinForms.Timer { Interval = 1000 };
        clientTimer.Tick += delegate { CheckClients(); };
        clientTimer.Start();

        WinForms.Application.Run();
    }

    private static void CreateTray()
    {
        var menu = new WinForms.ContextMenuStrip();

        var open = new WinForms.ToolStripMenuItem("打开预览器");
        open.Click += delegate { TryOpenBrowser(previewUrl); };

        var quit = new WinForms.ToolStripMenuItem("退出");
        quit.Click += delegate { Quit(); };

        menu.Items.Add(open);
        menu.Items.Add(new WinForms.ToolStripSeparator());
        menu.Items.Add(quit);

        tray = new WinForms.NotifyIcon
        {
            Icon = LoadAppIcon(),
            Text = (Title + " — " + previewUrl).Length > 120
                ? (Title + " — " + previewUrl).Substring(0, 120)
                : Title + " — " + previewUrl,
            Visible = true,
            ContextMenuStrip = menu,
        };
        tray.DoubleClick += delegate { TryOpenBrowser(previewUrl); };
    }

    private static void Quit()
    {
        running = false;
        DisposeTray();
        WinForms.Application.ExitThread();
    }

    private static void DisposeTray()
    {
        if (clientTimer != null)
        {
            try { clientTimer.Stop(); clientTimer.Dispose(); } catch { }
            clientTimer = null;
        }
        if (tray == null) return;
        try
        {
            tray.Visible = false;
            tray.Dispose();
        }
        catch { }
        tray = null;
    }

    /// <summary>
    /// 看门狗：超时的心跳从集合里摘掉；集合空了（且曾经有过心跳）就退出整个进程，
    /// 于是「关掉网页」= 托盘图标消失、端口释放，不留后台。
    /// </summary>
    private static void CheckClients()
    {
        if (!running) return;
        if (!sawAlive) return;

        long now = Environment.TickCount64;
        foreach (var entry in liveClients)
        {
            if (now - entry.Value > ClientTimeoutMs)
            {
                liveClients.TryRemove(entry.Key, out _);
            }
        }

        if (!liveClients.IsEmpty) return;
        Info("  网页已关闭，退出预览器。");
        Quit();
    }

    private static Icon LoadAppIcon()
    {
        try
        {
            string path = Environment.ProcessPath;
            if (!string.IsNullOrEmpty(path))
            {
                var icon = Icon.ExtractAssociatedIcon(path);
                if (icon != null) return icon;
            }
        }
        catch { }
        return SystemIcons.Application;
    }

    // ---------------------------------------------------------------- 控制台

    private const uint AttachParentProcess = 0xFFFFFFFF;

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AttachConsole(uint processId);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AllocConsole();

    /// <summary>
    /// WinExe 进程默认没有控制台。`--console` 时优先附着到调用方的控制台
    /// （从 cmd / PowerShell 里启动），没有就自己开一个。
    /// </summary>
    private static void AttachOrCreateConsole()
    {
        if (!AttachConsole(AttachParentProcess))
        {
            AllocConsole();
        }

        try
        {
            var stdout = Console.OpenStandardOutput();
            Console.SetOut(new StreamWriter(stdout) { AutoFlush = true });
            var stderr = Console.OpenStandardError();
            Console.SetError(new StreamWriter(stderr) { AutoFlush = true });
        }
        catch { }
    }

    private static void EnableUtf8Console()
    {
        try { Console.OutputEncoding = Encoding.UTF8; } catch { }
    }

    // ---------------------------------------------------------------- 通用

    private static bool HasFlag(string[] args, string flag)
    {
        foreach (var arg in args)
        {
            if (string.Equals(arg, flag, StringComparison.OrdinalIgnoreCase)) return true;
        }
        return false;
    }

    private static void PrintBanner()
    {
        Console.WriteLine(Title);
        Console.WriteLine("--------------------------------------------");
    }

    /// <summary>致命错误：静默模式弹 MessageBox（否则用户完全看不到），控制台模式等回车。</summary>
    private static int Fail(string message)
    {
        Error(message);
        if (consoleMode)
        {
            WaitKey();
        }
        else
        {
            try
            {
                WinForms.MessageBox.Show(message, Title, WinForms.MessageBoxButtons.OK, WinForms.MessageBoxIcon.Error);
            }
            catch { }
        }
        return 1;
    }

    private static void WaitKey()
    {
        Console.WriteLine();
        Console.WriteLine("按 Enter 退出…");
        try { Console.ReadLine(); } catch { }
    }

    /// <summary>exe 同级若没有 index.html，就往上找两级（适配 launcher\bin\... 的调试输出）。</summary>
    private static string FindRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        for (int depth = 0; depth < 3 && dir != null; depth++)
        {
            if (File.Exists(Path.Combine(dir.FullName, "index.html")))
            {
                // FullName 可能带尾部分隔符，`SafeJoin` 的前缀校验会被它带偏。
                return dir.FullName.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            }
            dir = dir.Parent;
        }
        return null;
    }

    /// <summary>首页配图 / 转图片素材目录（旧版 public/assets/landing、public/static）。缺了只是那张图不显示。</summary>
    private static string FindSiblingAssets(string name)
    {
        var candidates = new[]
        {
            Path.Combine(root, "public-assets", name),
            Path.Combine(root, "..", "public", "assets", name),
            Path.Combine(root, "..", "public", name),
            // 绿色版：assets/landing、assets/static 直接躺在包内，没有旧仓库的 public/ 兄弟目录。
            Path.Combine(root, "assets", name),
        };
        foreach (var candidate in candidates)
        {
            var full = Path.GetFullPath(candidate);
            if (Directory.Exists(full)) return full;
        }
        return "";
    }

    private static string FindLegacyAssets(string appRoot)
    {
        var candidates = new[]
        {
            Path.Combine(appRoot, "public-assets", "mmw"),
            Path.Combine(appRoot, "..", "public", "assets", "mmw"),
            Path.Combine(appRoot, "assets", "mmw"),
            Path.Combine(appRoot, "assets"),
        };
        foreach (var candidate in candidates)
        {
            var full = Path.GetFullPath(candidate);
            if (Directory.Exists(full) && File.Exists(Path.Combine(full, "stage.png")))
            {
                return full;
            }
        }
        return null;
    }

    private static TcpListener Listen()
    {
        for (int offset = 0; offset < PortTries; offset++)
        {
            int port = FirstPort + offset;
            try
            {
                var listener = new TcpListener(IPAddress.Loopback, port);
                listener.Start();
                return listener;
            }
            catch (SocketException)
            {
                // 端口被占用，试下一个
            }
        }
        return null;
    }

    private static async Task AcceptLoop(TcpListener listener)
    {
        while (running)
        {
            TcpClient client;
            try
            {
                client = await listener.AcceptTcpClientAsync();
            }
            catch
            {
                return;
            }
            _ = Task.Run(() => Handle(client));
        }
    }

    private static void Handle(TcpClient client)
    {
        try
        {
            client.NoDelay = true;
            using (client)
            using (var stream = client.GetStream())
            {
                var request = ReadRequest(stream);
                if (request == null) return;

                string method = request.Value.Key;
                string rawPath = request.Value.Value;

                if (rawPath.StartsWith("/favicon.ico", StringComparison.Ordinal))
                {
                    WriteStatus(stream, "204 No Content", null, 0, false, method);
                    return;
                }

                // 页面心跳：不进静态资源解析，直接记账。
                string pathOnly = rawPath.Split('?')[0];
                if (pathOnly == AlivePath || pathOnly == ByePath)
                {
                    HandleHeartbeat(pathOnly == AlivePath, rawPath, stream, method);
                    return;
                }

                string target = Resolve(rawPath);
                // 站内路由（/upload、/about…）没有对应文件，回落到 index.html 交给前端路由
                if ((target == null || !File.Exists(target)) && !Path.HasExtension(rawPath.Split('?')[0]))
                {
                    target = Path.Combine(root, "index.html");
                }
                if (target == null || !File.Exists(target))
                {
                    var body = Encoding.UTF8.GetBytes("not found: " + rawPath);
                    WriteStatus(stream, "404 Not Found", "text/plain; charset=utf-8", body.Length, true, method, body);
                    return;
                }

                byte[] bytes;
                try
                {
                    bytes = File.ReadAllBytes(target);
                }
                catch (IOException)
                {
                    WriteStatus(stream, "500 Internal Server Error", "text/plain; charset=utf-8", 0, false, method);
                    return;
                }

                WriteStatus(stream, "200 OK", MimeOf(target), bytes.Length, true, method, bytes);
            }
        }
        catch
        {
            // 单个连接失败不影响服务
        }
    }

    /// <summary>
    /// 处理页面心跳：`/__preview-alive?id=…` 记一次在线，`/__preview-bye?id=…` 提前摘掉。
    /// 只回 204，不读请求体（`sendBeacon` 可能带一个空 body）。
    /// </summary>
    private static void HandleHeartbeat(bool alive, string rawPath, NetworkStream stream, string method)
    {
        string id = QueryValue(rawPath, "id");
        if (id.Length == 0) id = "default";

        if (alive)
        {
            sawAlive = true;
            liveClients[id] = Environment.TickCount64;
        }
        else
        {
            liveClients.TryRemove(id, out _);
        }

        WriteStatus(stream, "204 No Content", null, 0, false, method);
    }

    /// <summary>从原始请求行里取一个查询参数（只处理 `?a=1&amp;b=2` 这种简单形式）。</summary>
    private static string QueryValue(string rawPath, string key)
    {
        int question = rawPath.IndexOf('?');
        if (question < 0) return "";
        foreach (var pair in rawPath.Substring(question + 1).Split('&'))
        {
            int equals = pair.IndexOf('=');
            if (equals <= 0) continue;
            if (!string.Equals(pair.Substring(0, equals), key, StringComparison.Ordinal)) continue;
            try
            {
                return Uri.UnescapeDataString(pair.Substring(equals + 1));
            }
            catch
            {
                return "";
            }
        }
        return "";
    }

    /// <summary>读请求行 + 头部，直到空行（\r\n\r\n）。只支持 GET/HEAD，够用了。</summary>
    private static KeyValuePair<string, string>? ReadRequest(NetworkStream stream)
    {
        var buffer = new List<byte>(1024);
        while (buffer.Count < 16384)
        {
            int b = stream.ReadByte();
            if (b < 0) break;
            buffer.Add((byte)b);
            int n = buffer.Count;
            if (n >= 4 && buffer[n - 4] == 13 && buffer[n - 3] == 10 && buffer[n - 2] == 13 && buffer[n - 1] == 10)
            {
                break;
            }
        }
        if (buffer.Count == 0) return null;

        string text = Encoding.ASCII.GetString(buffer.ToArray());
        var lines = text.Split(new[] { "\r\n" }, StringSplitOptions.None);
        if (lines.Length == 0) return null;
        var parts = lines[0].Split(' ');
        if (parts.Length < 2) return null;
        return new KeyValuePair<string, string>(parts[0].ToUpperInvariant(), parts[1]);
    }

    private static void WriteStatus(
        NetworkStream stream,
        string status,
        string contentType,
        int length,
        bool hasBody,
        string method,
        byte[] body = null)
    {
        var head = new StringBuilder();
        head.Append("HTTP/1.1 ").Append(status).Append("\r\n");
        head.Append("Content-Length: ").Append(hasBody ? length : 0).Append("\r\n");
        if (contentType != null)
        {
            head.Append("Content-Type: ").Append(contentType).Append("\r\n");
        }
        head.Append("Cache-Control: no-cache\r\n");
        head.Append("Connection: close\r\n\r\n");
        var headBytes = Encoding.ASCII.GetBytes(head.ToString());
        stream.Write(headBytes, 0, headBytes.Length);
        if (body != null && method != "HEAD" && hasBody)
        {
            stream.Write(body, 0, body.Length);
        }
        stream.Flush();
    }

    /// <summary>路由：与 serve.mjs 一一对应。</summary>
    private static string Resolve(string rawPath)
    {
        string path = rawPath.Split('?')[0];
        try
        {
            path = Uri.UnescapeDataString(path);
        }
        catch
        {
            return null;
        }

        if (path == "/" || path.Length == 0) return Path.Combine(root, "index.html");

        if (path.StartsWith("/assets/mmw/", StringComparison.Ordinal))
        {
            if (legacyAssets == null) return null;
            return SafeJoin(legacyAssets, path.Substring("/assets/mmw/".Length));
        }

        if (path.StartsWith("/assets/landing/", StringComparison.Ordinal))
        {
            if (landingAssets.Length == 0) return null;
            return SafeJoin(landingAssets, path.Substring("/assets/landing/".Length));
        }

        if (path.StartsWith("/static/", StringComparison.Ordinal))
        {
            if (staticAssets.Length == 0) return null;
            return SafeJoin(staticAssets, path.Substring("/static/".Length));
        }

        if (path.StartsWith("/vendor/", StringComparison.Ordinal))
        {
            return SafeJoin(Path.Combine(root, "vendor"), path.Substring("/vendor/".Length));
        }

        return SafeJoin(root, path.TrimStart('/'));
    }

    /// <summary>拼路径并挡住 ../ 越界。</summary>
    private static string SafeJoin(string baseDir, string relative)
    {
        string rootFull = Path.GetFullPath(baseDir).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        string full = Path.GetFullPath(Path.Combine(rootFull, relative.Replace('/', Path.DirectorySeparatorChar)));
        if (full != rootFull && !full.StartsWith(rootFull + Path.DirectorySeparatorChar, StringComparison.Ordinal))
        {
            return null;
        }
        return full;
    }

    private static string MimeOf(string path)
    {
        switch (Path.GetExtension(path).ToLowerInvariant())
        {
            case ".html": return "text/html; charset=utf-8";
            case ".js":
            case ".mjs": return "text/javascript; charset=utf-8";
            case ".json": return "application/json; charset=utf-8";
            case ".css": return "text/css; charset=utf-8";
            case ".wasm": return "application/wasm";
            case ".png": return "image/png";
            case ".jpg":
            case ".jpeg": return "image/jpeg";
            case ".webp": return "image/webp";
            case ".svg": return "image/svg+xml";
            case ".mp3": return "audio/mpeg";
            case ".m4a": return "audio/mp4";
            case ".ogg": return "audio/ogg";
            case ".wav": return "audio/wav";
            case ".ttf": return "font/ttf";
            case ".otf": return "font/otf";
            default: return "application/octet-stream";
        }
    }

    private static void TryOpenBrowser(string url)
    {
        try
        {
            Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            Console.WriteLine("  已打开    " + url);
        }
        catch (Exception ex)
        {
            Warn("自动打开浏览器失败：" + ex.Message);
            Console.WriteLine("  请手动访问 " + url);
        }
    }

    private static void Info(string message)
    {
        Console.WriteLine(message);
    }

    private static void Warn(string message)
    {
        Console.WriteLine("  [警告] " + message);
    }

    private static void Error(string message)
    {
        Console.WriteLine("  [错误] " + message);
    }
}
