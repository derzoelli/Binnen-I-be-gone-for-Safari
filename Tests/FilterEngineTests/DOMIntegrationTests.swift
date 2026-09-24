import Foundation
import WebKit
import XCTest

final class DOMIntegrationTests: XCTestCase, WKNavigationDelegate {
    private var loaded: XCTestExpectation?

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        loaded?.fulfill()
    }

    private func page(_ html: String, settings: String) throws -> WKWebView {
        let webView = WKWebView(frame: .init(x: 0, y: 0, width: 640, height: 480))
        webView.navigationDelegate = self
        loaded = expectation(description: "HTML loaded")
        webView.loadHTMLString(html, baseURL: URL(string: "https://example.org/article"))
        wait(for: [loaded!], timeout: 10)
        loaded = nil

        let harness = """
        window.__messages = [];
        window.__settings = \(settings);
        window.chrome = {
          storage: {sync: {
            get: function(callback) { callback(Object.assign({}, window.__settings)); },
            set: function(values) { Object.assign(window.__settings, values); }
          }},
          runtime: {
            sendMessage: function(message, callback) {
              if (message.type === 'getSettings') { callback({settings: Object.assign({}, window.__settings)}); return; }
              window.__messages.push(message);
            },
            onMessage: {addListener: function(listener) { window.__filterListener = listener; }}
          }
        };
        window.__observerCount = 0;
        var NativeObserver = window.MutationObserver;
        window.MutationObserver = function(callback) {
          window.__observerCount++;
          return new NativeObserver(callback);
        };
        """
        let bundle = Bundle(for: type(of: self))
        let engine = try String(contentsOf: XCTUnwrap(bundle.url(forResource: "filter-engine", withExtension: "js")))
        let adapter = try String(contentsOf: XCTUnwrap(bundle.url(forResource: "binnenibegone", withExtension: "js")))
        _ = try evaluate(harness + "\n" + engine + "\n" + adapter, in: webView)
        return webView
    }

    private func evaluate(_ script: String, in webView: WKWebView) throws -> Any? {
        let done = expectation(description: "JavaScript evaluation")
        var value: Any?
        var failure: Error?
        webView.evaluateJavaScript(script) { result, error in
            value = result
            failure = error
            done.fulfill()
        }
        wait(for: [done], timeout: 10)
        if let failure { throw failure }
        return value
    }

    private func settled(_ webView: WKWebView) throws {
        let done = expectation(description: "MutationObserver delivery")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { done.fulfill() }
        wait(for: [done], timeout: 2)
    }

    func testExcludedElementsAndDynamicNodes() throws {
        let html = """
        <p id="normal">Mitarbeiter*innen</p>
        <code id="code">Mitarbeiter*innen</code>
        <textarea id="textarea">Mitarbeiter*innen</textarea>
        <input id="input" value="Mitarbeiter*innen">
        <script id="script" type="text/plain">Mitarbeiter*innen</script>
        <style id="style" type="text/plain">Mitarbeiter*innen</style>
        <noscript id="noscript">Mitarbeiter*innen</noscript>
        <div id="editable" contenteditable="true">Mitarbeiter*innen</div>
        <div id="textbox" role="textbox">Mitarbeiter*innen</div>
        """
        let webView = try page(html, settings: "{aktiv:true, filterliste:'Blocklist', blocklist:'', counter:true}")
        let values = try XCTUnwrap(evaluate("JSON.stringify(['normal','code','textarea','input','script','style','noscript','editable','textbox'].map(function(id){ var e=document.getElementById(id); return id==='input'?e.value:e.textContent; }))", in: webView) as? String)
        let texts = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(values.utf8)) as? [String])
        XCTAssertEqual(texts[0], "Mitarbeiter")
        XCTAssertEqual(Array(texts.dropFirst()), Array(repeating: "Mitarbeiter*innen", count: 8))

        _ = try evaluate("document.getElementById('normal').appendChild(document.createTextNode(' Nutzer:innen')); ['code','textarea','script','style','noscript','editable','textbox'].forEach(function(id) { document.getElementById(id).appendChild(document.createTextNode(' Nutzer:innen')); });", in: webView)
        try settled(webView)
        XCTAssertEqual(try evaluate("document.getElementById('normal').textContent", in: webView) as? String, "Mitarbeiter Nutzer")
        for id in ["code", "textarea", "script", "style", "noscript", "editable", "textbox"] {
            XCTAssertEqual(try evaluate("document.getElementById('\(id)').textContent", in: webView) as? String, "Mitarbeiter*innen Nutzer:innen", id)
        }
        XCTAssertEqual(try evaluate("window.__observerCount", in: webView) as? Int, 1)
        XCTAssertEqual(try evaluate("window.__messages[window.__messages.length - 1].countBinnenIreplacements", in: webView) as? Int, 2)
        _ = try evaluate("window.__filterListener({type:'ondemand'})", in: webView)
        XCTAssertEqual(try evaluate("window.__observerCount", in: webView) as? Int, 1)
        XCTAssertEqual(try evaluate("window.__messages[window.__messages.length - 1].countBinnenIreplacements", in: webView) as? Int, 2)
    }

    func testListsOnDemandSkipTopicAndOptions() throws {
        let html = "<p id='normal'>Mitarbeiter*innen</p>"
        let allow = try page(html, settings: "{aktiv:true, filterliste:'Allowlist', allowlist:'example.org', counter:true}")
        XCTAssertEqual(try evaluate("document.getElementById('normal').textContent", in: allow) as? String, "Mitarbeiter")
        let blocked = try page(html, settings: "{aktiv:true, filterliste:'Blocklist', blocklist:'example.org'}")
        XCTAssertEqual(try evaluate("document.getElementById('normal').textContent", in: blocked) as? String, "Mitarbeiter*innen")
        let demand = try page(html, settings: "{aktiv:false, filterliste:'Bei Bedarf'}")
        XCTAssertEqual(try evaluate("document.getElementById('normal').textContent", in: demand) as? String, "Mitarbeiter*innen")
        _ = try evaluate("window.__filterListener({type:'ondemand'})", in: demand)
        XCTAssertEqual(try evaluate("document.getElementById('normal').textContent", in: demand) as? String, "Mitarbeiter")
        let topic = try page("<p>Binnen-I</p>" + html, settings: "{aktiv:true, filterliste:'Blocklist', blocklist:'', skip_topic:true}")
        XCTAssertEqual(try evaluate("document.getElementById('normal').textContent", in: topic) as? String, "Mitarbeiter*innen")
        _ = try evaluate("window.__filterListener({type:'ondemand'})", in: topic)
        XCTAssertEqual(try evaluate("document.getElementById('normal').textContent", in: topic) as? String, "Mitarbeiter")

        let optional = try page("<p id='normal'>Bürgerinnen und Bürger; Studierende</p>", settings: "{aktiv:true, filterliste:'Blocklist', blocklist:'', doppelformen:false, partizip:false}")
        XCTAssertEqual(try evaluate("document.getElementById('normal').textContent", in: optional) as? String, "Bürgerinnen und Bürger; Studierende")
        _ = try evaluate("window.__settings.doppelformen=true; window.__settings.partizip=true; window.__filterListener({type:'ondemand'})", in: optional)
        XCTAssertEqual(try evaluate("document.getElementById('normal').textContent", in: optional) as? String, "Bürger; Studenten")
    }
}
