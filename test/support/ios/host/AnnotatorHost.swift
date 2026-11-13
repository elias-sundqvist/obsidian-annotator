// A minimal iOS host for the Annotator iOS WebKit harness. NOT Obsidian.
//
// It does what Obsidian for iOS (a Capacitor app) does for the web side, and nothing more:
// one full-screen WKWebView, the page served from a custom scheme at capacitor://localhost,
// content laid out under the notch and home indicator (viewport-fit=cover, no automatic insets),
// and the software keyboard's height handed to the page as --keyboard-height.
//
// Files:
//   bundle  www/                    the page, the plugin build, Obsidian's app.css and pdf.js (see build.mjs)
//   bundle  www/vault-seed/         the starting vault; copied to Documents/vault on first launch or on reset
//   Documents/vault/                the vault the page reads (capacitor://localhost/_vault/...) and writes (message 'write')
//   Documents/commands/NAME.js      a script the Mac drops in; it is run in the page (async function body) and removed
//   Documents/results/NAME.json     what that script returned (a string; the page returns JSON text)
//   Documents/log.jsonl             page logs, memory warnings, web content process terminations, keyboard frames
import UIKit
import WebKit
import UniformTypeIdentifiers

let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
let vaultDir = documents.appendingPathComponent("vault", isDirectory: true)
let commandsDir = documents.appendingPathComponent("commands", isDirectory: true)
let resultsDir = documents.appendingPathComponent("results", isDirectory: true)
let logFile = documents.appendingPathComponent("log.jsonl")
let wwwDir = Bundle.main.bundleURL.appendingPathComponent("www", isDirectory: true)

func log(_ entry: [String: Any]) {
    var row = entry; row["t"] = Date().timeIntervalSince1970
    guard let data = try? JSONSerialization.data(withJSONObject: row), var line = String(data: data, encoding: .utf8) else { return }
    line += "\n"
    if let handle = try? FileHandle(forWritingTo: logFile) { handle.seekToEndOfFile(); handle.write(line.data(using: .utf8)!); try? handle.close() }
    else { try? line.write(to: logFile, atomically: true, encoding: .utf8) }
}

func resetVault(force: Bool) {
    let fm = FileManager.default
    if force { try? fm.removeItem(at: vaultDir) }
    if !fm.fileExists(atPath: vaultDir.path) { try? fm.copyItem(at: wwwDir.appendingPathComponent("vault-seed"), to: vaultDir) }
    try? fm.createDirectory(at: commandsDir, withIntermediateDirectories: true)
    try? fm.createDirectory(at: resultsDir, withIntermediateDirectories: true)
}

/// Serves capacitor://localhost/... the way Capacitor does: the app's web assets, and vault files under /_vault/.
final class SchemeHandler: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        var path = url.path.removingPercentEncoding ?? url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        if path == "/_vault_index.json" {   // the vault's file list (Obsidian builds this from the file system)
            var rows: [[String: Any]] = []
            let base = vaultDir.standardizedFileURL.path + "/"
            if let walker = FileManager.default.enumerator(at: vaultDir, includingPropertiesForKeys: [.isRegularFileKey, .fileSizeKey, .contentModificationDateKey]) {
                for case let item as URL in walker {
                    guard let values = try? item.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey, .contentModificationDateKey]), values.isRegularFile == true else { continue }
                    let full = item.standardizedFileURL.path
                    rows.append(["path": full.hasPrefix(base) ? String(full.dropFirst(base.count)) : item.lastPathComponent, "size": values.fileSize ?? 0,
                                 "mtime": Int((values.contentModificationDate ?? Date()).timeIntervalSince1970 * 1000)])
                }
            }
            let data = (try? JSONSerialization.data(withJSONObject: rows)) ?? Data("[]".utf8)
            task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": "application/json", "Cache-Control": "no-store"])!)
            task.didReceive(data); task.didFinish(); return
        }
        let file: URL
        if path.hasPrefix("/_vault/") { file = vaultDir.appendingPathComponent(String(path.dropFirst("/_vault/".count))) }
        else if path.hasPrefix("/_capacitor_file_/") { file = URL(fileURLWithPath: String(path.dropFirst("/_capacitor_file_".count))) }
        else { file = wwwDir.appendingPathComponent(String(path.dropFirst())) }
        let standardized = file.standardizedFileURL.path
        guard standardized.hasPrefix(wwwDir.standardizedFileURL.path) || standardized.hasPrefix(documents.standardizedFileURL.path),
              let data = try? Data(contentsOf: file) else {
            let response = HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": "text/plain"])!
            task.didReceive(response); task.didReceive(Data("Not found".utf8)); task.didFinish(); return
        }
        let ext = file.pathExtension.lowercased()
        let types = ["html": "text/html", "js": "text/javascript", "mjs": "text/javascript", "css": "text/css", "json": "application/json",
                     "pdf": "application/pdf", "epub": "application/epub+zip", "md": "text/markdown", "wasm": "application/wasm",
                     "svg": "image/svg+xml", "png": "image/png", "bcmap": "application/octet-stream", "pfb": "application/octet-stream",
                     "ttf": "font/ttf", "mp4": "video/mp4", "webm": "video/webm", "vtt": "text/vtt"]
        let headers = ["Content-Type": types[ext] ?? (UTType(filenameExtension: ext)?.preferredMIMEType ?? "application/octet-stream"),
                       "Content-Length": String(data.count), "Cache-Control": "no-store"]
        let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!
        task.didReceive(response); task.didReceive(data); task.didFinish()
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

final class HostController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
    var webView: WKWebView!
    var timer: Timer?
    let handler = SchemeHandler()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(handler, forURLScheme: "capacitor")
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(self, name: "harness")
        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.scrollView.contentInsetAdjustmentBehavior = .never   // Capacitor's default: the page handles safe areas itself.
        webView.scrollView.bounces = false
        webView.isInspectable = true
        webView.navigationDelegate = self
        webView.uiDelegate = self
        view.addSubview(webView)
        NotificationCenter.default.addObserver(self, selector: #selector(memoryWarning), name: UIApplication.didReceiveMemoryWarningNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(keyboard(_:)), name: UIResponder.keyboardWillChangeFrameNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardHide(_:)), name: UIResponder.keyboardWillHideNotification, object: nil)
        load()
        timer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in self?.pollCommands() }
    }

    func load() {
        let device = UIDevice.current.userInterfaceIdiom == .pad ? "tablet" : "phone"
        webView.load(URLRequest(url: URL(string: "capacitor://localhost/index.html?device=\(device)")!))
    }

    @objc func memoryWarning() { log(["kind": "memory-warning"]) }
    @objc func keyboard(_ note: Notification) {
        guard let frame = (note.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? NSValue)?.cgRectValue else { return }
        let local = view.convert(frame, from: nil), height = max(0, view.bounds.maxY - local.minY)
        log(["kind": "keyboard", "height": height])
        webView.evaluateJavaScript("window.__harnessKeyboard && window.__harnessKeyboard(\(height))")
    }
    @objc func keyboardHide(_ note: Notification) {
        log(["kind": "keyboard", "height": 0])
        webView.evaluateJavaScript("window.__harnessKeyboard && window.__harnessKeyboard(0)")
    }

    func pollCommands() {
        let fm = FileManager.default
        guard let names = try? fm.contentsOfDirectory(atPath: commandsDir.path) else { return }
        for name in names.sorted() where name.hasSuffix(".js") {
            let file = commandsDir.appendingPathComponent(name)
            guard let body = try? String(contentsOf: file, encoding: .utf8) else { continue }
            try? fm.removeItem(at: file)
            let id = String(name.dropLast(3))
            if body.hasPrefix("//host:reload") { resetVault(force: body.contains("reset")); load(); write(id, "\"reloaded\""); continue }
            webView.callAsyncJavaScript(body, arguments: [:], in: nil, in: .page) { [weak self] result in
                switch result {
                case .success(let value): self?.write(id, value as? String ?? "null")
                case .failure(let error): self?.write(id, "{\"hostError\":\(Self.quote(String(describing: error)))}")
                }
            }
        }
    }
    static func quote(_ text: String) -> String { String(data: try! JSONSerialization.data(withJSONObject: [text]), encoding: .utf8)!.dropFirst().dropLast().description }
    func write(_ id: String, _ text: String) { try? text.write(to: resultsDir.appendingPathComponent(id + ".json"), atomically: true, encoding: .utf8) }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        switch type {
        case "write":
            guard let path = body["path"] as? String, !path.contains("..") else { return }
            let file = vaultDir.appendingPathComponent(path)
            try? FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
            if let text = body["text"] as? String { try? text.write(to: file, atomically: true, encoding: .utf8) }
            else if let base64 = body["base64"] as? String, let data = Data(base64Encoded: base64) { try? data.write(to: file, options: .atomic) }
        case "delete":
            guard let path = body["path"] as? String, !path.contains("..") else { return }
            try? FileManager.default.removeItem(at: vaultDir.appendingPathComponent(path))
        case "result":
            if let id = body["id"] as? String, let text = body["text"] as? String { write(id, text) }
        default:
            var entry = body; entry["kind"] = "page"; log(entry)
        }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { log(["kind": "web-content-terminated"]); load() }
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        log(["kind": "alert", "message": message]); completionHandler()
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        log(["kind": "confirm", "message": message]); completionHandler(true)
    }
    override var prefersHomeIndicatorAutoHidden: Bool { false }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        resetVault(force: ProcessInfo.processInfo.arguments.contains("-resetVault"))
        let window = UIWindow(windowScene: scene)
        window.rootViewController = HostController()
        window.makeKeyAndVisible()
        self.window = window
    }
}

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, configurationForConnecting session: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default", sessionRole: session.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
