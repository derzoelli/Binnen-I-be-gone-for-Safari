ObjC.import("Foundation");
function read(path) { return $.NSString.alloc.initWithContentsOfFileEncodingError($(path), $.NSUTF8StringEncoding, null).js; }
var root = $.NSFileManager.defaultManager.currentDirectoryPath.js;
new Function(read(root + "/Shared (Extension)/Resources/options.js"));
var legacy = {aktiv: false, filterliste: "Blocklist", allowlist: "legacy.example", blocklist: "private.example", counter: true};
var nativeStore = null;
var statistics = {genderForms: 0, doubleForms: 0, participles: 0};
var nativeCalls = [];
var messages = [];
var listener, click;
var icons = [], badges = [];
var chrome = {
    runtime: {
        getManifest: function () { return {manifest_version: 2}; },
        onMessage: {addListener: function (fn) { listener = fn; }},
        sendNativeMessage: function (id, request, callback) {
            if (id !== "com.robinzoellner.Binnen-I-be-gone") throw new Error("wrong application ID");
            nativeCalls.push(request);
            if (request.type === "incrementStatistics") {
                ["genderForms", "doubleForms", "participles"].forEach(function (key) {
                    statistics[key] += request.changes[key];
                });
                callback({statistics: statistics});
                return;
            }
            if (!nativeStore) nativeStore = Object.assign({}, request.legacySettings);
            if (request.type === "setSettings") nativeStore = Object.assign({}, nativeStore, request.settings);
            callback({settings: Object.assign({}, nativeStore)});
        }
    },
    storage: {
        sync: {
            get: function (callback) { callback(Object.assign({}, legacy)); },
            set: function (settings, callback) { Object.assign(legacy, settings); if (callback) callback(); }
        },
        onChanged: {addListener: function () {}}
    },
    browserAction: {
        onClicked: {addListener: function (fn) { click = fn; }},
        setIcon: function (value) { icons.push(value); },
        setTitle: function () {},
        setBadgeText: function (value) { badges.push(value); }
    },
    tabs: {
        query: function (_, callback) { callback([{id: 42}]); },
        sendMessage: function (id, message) { messages.push({id: id, message: message}); }
    }
};
function assert(condition, message) { if (!condition) throw new Error(message); }
eval(read(root + "/Shared (Extension)/Resources/background.js"));
assert(nativeCalls.length === 1 && nativeCalls[0].legacySettings.allowlist === "legacy.example", "legacy migration payload");
assert(legacy.blocklist === "private.example", "legacy blocklist preserved");

var response;
listener({type: "getSettings"}, {}, function (value) { response = value; });
assert(response.settings.allowlist === "legacy.example", "getSettings response");
nativeStore.aktiv = true; // Simulate a setting changed in the native app.
listener({type: "getSettings"}, {}, function (value) { response = value; });
assert(response.settings.aktiv === true && legacy.aktiv === true, "native changes refresh the cache");

listener({type: "setSettings", settings: {filterliste: "Bei Bedarf", allowlist: "new.example"}}, {}, function (value) { response = value; });
assert(response.settings.allowlist === "new.example" && nativeStore.allowlist === "new.example", "options write reaches native store");
click();
assert(messages.length === 1 && messages[0].message.type === "ondemand", "toolbar on-demand message");
assert(icons[icons.length - 1].tabId === 42, "on-demand icon is tab-scoped");

listener({type: "setSettings", settings: {filterliste: "Blocklist", aktiv: true}}, {}, function () {});
click();
assert(nativeStore.aktiv === false, "toolbar toggle reaches native store");
assert(messages[messages.length - 1].message.type === "settingsChanged", "toolbar deactivation reaches content script");
listener({type: "count", countBinnenIreplacements: 2, countDoppelformreplacements: 1,
    countPartizipreplacements: 0, delta: {genderForms: 2, doubleForms: 1, participles: 0}},
    {tab: {id: 42, url: "https://private.example/path", title: "Private"}}, function () {});
assert(badges[badges.length - 1].text === "3", "counter badge");
assert(statistics.genderForms === 2 && statistics.doubleForms === 1, "positive delta increments statistics");
var statsMessage = nativeCalls[nativeCalls.length - 1];
assert(statsMessage.type === "incrementStatistics", "statistics native command");
assert(Object.keys(statsMessage).sort().join(",") === "changes,type", "no tab metadata in native payload");
assert(Object.keys(statsMessage.changes).sort().join(",") === "doubleForms,genderForms,participles", "only aggregate counts cross native boundary");

listener({type: "setSettings", settings: {counter: false}}, {}, function () {});
assert(badges[badges.length - 1].text === "", "disabling the counter clears an existing badge immediately");
var nativeCount = nativeCalls.length;
listener({type: "count", countBinnenIreplacements: 3, countDoppelformreplacements: 1,
    countPartizipreplacements: 0, delta: {genderForms: 1, doubleForms: 0, participles: 0}},
    {tab: {id: 42}}, function () {});
assert(statistics.genderForms === 3, "counter=false still persists the delta");
assert(badges[badges.length - 1].text === "", "counter=false clears the badge");
listener({type: "count", countBinnenIreplacements: 3, countDoppelformreplacements: 1,
    countPartizipreplacements: 0, delta: {genderForms: 0, doubleForms: 0, participles: 0}},
    {tab: {id: 42}}, function () {});
assert(nativeCalls.length === nativeCount + 1, "zero delta causes no native increment");

eval(read(root + "/Shared (Extension)/Resources/background.js")); // MV2 background restart.
listener({type: "count", countBinnenIreplacements: 4, countDoppelformreplacements: 1,
    countPartizipreplacements: 0, delta: {genderForms: 1, doubleForms: 0, participles: 0}},
    {tab: {id: 42}}, function () {});
assert(statistics.genderForms === 4, "background restart does not affect delta accounting");
console.log("Passed settings broker assertions.");
