ObjC.import("Foundation");
function read(path) { return $.NSString.alloc.initWithContentsOfFileEncodingError($(path), $.NSUTF8StringEncoding, null).js; }
function assert(condition, message) { if (!condition) throw new Error(message); }
var root = $.NSFileManager.defaultManager.currentDirectoryPath.js;
var sourceFixtures = read(root + "/Tests/Fixtures/gender-cases.json");
var publishedFixtures = read(root + "/docs/test/generated/gender-cases.json");
var sourceEngine = read(root + "/Shared (Extension)/Resources/filter-engine.js");
var publishedEngine = read(root + "/docs/test/generated/filter-engine.js");
assert(sourceFixtures === publishedFixtures, "Published fixtures differ from source");
assert(sourceEngine === publishedEngine, "Published engine differs from source");
var cases = JSON.parse(publishedFixtures);
assert(cases.length === 123, "Expected exactly 123 cases");
eval(publishedEngine);

var html = read(root + "/docs/test/index.html");
assert(read(root + "/docs/index.html").indexOf('href="test/"') >= 0, "GitHub Pages root entry point missing");
assert(html.indexOf('src="generated/filter-engine.js"') >= 0, "Published engine not loaded");
assert(html.indexOf('src="test.js"') >= 0, "Test code not loaded");
assert(html.indexOf("<iframe") < 0, "Live test must not use iframe");
assert(!/<(?:script|link)[^>]+(?:src|href)="https?:\/\//i.test(html), "External page dependency found");
assert(!/analytics|tracking|pixel|document\.cookie/i.test(html + read(root + "/docs/test/test.js")), "Tracking-related code found");
var live = [];
var tag = /<li class="live-example" data-input="([^"]+)" data-expected="([^"]+)">([^<]+)<\/li>/g;
var match;
while ((match = tag.exec(html)) !== null) {
    assert(match[1] === match[3], "Visible live input and data-input differ");
    var fixture = cases.filter(function (item) {
        return item.input === match[1] && item.expected === match[2] &&
            (!item.settings || (item.settings.doubleForms !== false && item.settings.participles !== true));
    });
    assert(fixture.length > 0, "Live case is not a default-compatible fixture: " + match[1]);
    var result = BinnenIBegoneFilterEngine.transformText(match[1]);
    assert(result.text === match[2] && result.text !== match[1], "Live case does not filter by default: " + match[1]);
    live.push({ dataset: { expected: match[2] }, textContent: match[1] });
}
assert(live.length === 6, "Expected six live examples");

function element() { return { textContent: "", className: "", children: [], appendChild: function (child) { this.children.push(child); }, addEventListener: function (_, handler) { this.handler = handler; } }; }
var elements = {};
["engine-result", "engine-categories", "engine-failures", "live-result", "live-check"].forEach(function (id) { elements[id] = element(); });
var document = {
    getElementById: function (id) { return elements[id]; },
    createElement: element,
    querySelectorAll: function () { return live; }
};
var timer;
function setTimeout(handler) { timer = handler; }
function fetch(path) {
    assert(path === "generated/gender-cases.json", "Wrong fixture URL");
    return {
        then: function (handler) { handler({ ok: true, json: function () { return cases; } });
            return { then: function (next) { next(cases); return { catch: function () {} }; } }; }
    };
}
eval(read(root + "/docs/test/test.js"));
assert(elements["engine-result"].textContent === "123 Tests · 123 bestanden · 0 fehlgeschlagen", "Page self-test did not pass all fixtures");
assert(elements["engine-failures"].children.length === 0, "Page self-test has failures");
timer();
assert(elements["live-result"].textContent.indexOf("Keine Filterung erkannt") === 0, "Unfiltered live status wrong");
live.forEach(function (item) { item.textContent = item.dataset.expected; });
elements["live-check"].handler();
assert(elements["live-result"].textContent.indexOf("6/6 Live-Beispiele") >= 0, "Filtered live status wrong");
console.log("Public test page: 123/123 self-tests, 6 default-compatible live cases, generated assets in sync.");
