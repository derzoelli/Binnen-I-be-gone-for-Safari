ObjC.import("Foundation");
function read(path) { return $.NSString.alloc.initWithContentsOfFileEncodingError($(path), $.NSUTF8StringEncoding, null).js; }
function assert(condition, message) { if (!condition) throw new Error(message); }
var root = $.NSFileManager.defaultManager.currentDirectoryPath.js;
var saved = {aktiv: true, counter: false, invertiert: false, doppelformen: true, partizip: false,
    skip_topic: false, filterliste: "Blocklist", allowlist: "a.example", blocklist: "b.example"};
var writes = [];
function clearTimeout() {}
function control(id, name, value) {
    return {id: id, name: name || "", value: value || "", checked: false, disabled: false,
        style: {}, listeners: {}, addEventListener: function (type, callback) { this.listeners[type] = callback; }};
}
var fields = {};
["aktiv", "counter", "invertiert", "doppelformen", "partizip", "skip_topic",
 "allowlist", "blocklist", "skipvis", "aktiv-description"].forEach(function (id) { fields[id] = control(id); });
fields.none = control("none", "filterstate", "Keine");
fields.blockliststate = control("blockliststate", "filterstate", "Blocklist");
fields.allowliststate = control("allowliststate", "filterstate", "Allowlist");
fields.ondemandstate = control("ondemandstate", "filterstate", "Bei Bedarf");
var inputs = ["aktiv", "counter", "invertiert", "doppelformen", "partizip", "skip_topic",
    "none", "blockliststate", "allowliststate", "ondemandstate"].map(function (id) { return fields[id]; });
var textareas = [fields.allowlist, fields.blocklist];
var onReady;
var document = {
    getElementById: function (id) { return fields[id]; },
    querySelector: function (selector) {
        if (selector === "form") return {querySelectorAll: function () { return inputs.concat(textareas); }};
        if (selector === 'input[name="filterstate"]:checked') {
            return inputs.filter(function (input) { return input.name === "filterstate" && input.checked; })[0];
        }
        throw new Error("Unexpected selector: " + selector);
    },
    querySelectorAll: function (selector) {
        return selector === "input" ? inputs : selector === "textarea" ? textareas : [];
    },
    addEventListener: function (type, callback) { if (type === "DOMContentLoaded") onReady = callback; }
};
var navigator = {userAgent: "Safari"};
var chrome = {runtime: {sendMessage: function (request, callback) {
    if (request.type === "getSettings") callback({settings: Object.assign({}, saved)});
    else if (request.type === "setSettings") {
        writes.push(Object.assign({}, request.settings));
        Object.assign(saved, request.settings);
    } else throw new Error("Unexpected message: " + request.type);
}}};
eval(read(root + "/Shared (Extension)/Resources/options.js"));
onReady();

function select(id) {
    ["none", "blockliststate", "allowliststate", "ondemandstate"].forEach(function (name) {
        fields[name].checked = name === id;
    });
    fields[id].listeners.change({target: fields[id]});
}

assert(fields.aktiv.checked && !fields.aktiv.disabled, "Blocklist initially active");
select("ondemandstate");
assert(saved.filterliste === "Bei Bedarf" && saved.aktiv === false, "entering on-demand saves both values");
assert(writes[writes.length - 1].filterliste === "Bei Bedarf" && writes[writes.length - 1].aktiv === false,
    "on-demand values are sent in one broker message");
assert(!fields.aktiv.checked && fields.aktiv.disabled, "active toggle disabled and unchecked in on-demand mode");
select("blockliststate");
assert(saved.filterliste === "Blocklist" && saved.aktiv === true, "leaving on-demand reactivates filtering");
assert(fields.aktiv.checked && !fields.aktiv.disabled, "active toggle enabled and checked after leaving on-demand");
console.log("Passed options on-demand mode assertions.");
