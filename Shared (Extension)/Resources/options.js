// The options page is another client of the background settings broker.
(function () {
    "use strict";
    var saveTimer;
    function field(id) { return document.getElementById(id); }

    function updateModeUI() {
        var onDemand = field("ondemandstate").checked;
        field("aktiv").disabled = onDemand;
        field("skipvis").style.visibility = onDemand ? "hidden" : "visible";
        field("aktiv-description").textContent = onDemand ?
            "Filterung aktiv (Filtermodus „Nur bei Bedarf filtern“ ist ausgewählt)" : "Filterung aktiv";
        field("aktiv-description").style.color = onDemand ? "grey" : "inherit";
    }

    function render(settings) {
        ["aktiv", "counter", "invertiert", "doppelformen", "partizip", "skip_topic"].forEach(function (key) {
            field(key).checked = settings[key] === true;
        });
        field("allowlist").value = settings.allowlist || "";
        field("blocklist").value = settings.blocklist || "";
        var modes = { Keine: "none", Blocklist: "blockliststate", Allowlist: "allowliststate", "Bei Bedarf": "ondemandstate" };
        field(modes[settings.filterliste] || "blockliststate").checked = true;
        updateModeUI();
    }

    function values() {
        var settings = {};
        ["aktiv", "counter", "invertiert", "doppelformen", "partizip", "skip_topic"].forEach(function (key) {
            settings[key] = field(key).checked;
        });
        settings.filterliste = document.querySelector('input[name="filterstate"]:checked').value;
        settings.allowlist = field("allowlist").value.trim();
        settings.blocklist = field("blocklist").value.trim();
        return settings;
    }

    function save() {
        clearTimeout(saveTimer);
        updateModeUI();
        chrome.runtime.sendMessage({ type: "setSettings", settings: values() });
    }

    document.addEventListener("DOMContentLoaded", function () {
        var form = document.querySelector("form");
        form.querySelectorAll("input, textarea").forEach(function (control) { control.disabled = true; });
        chrome.runtime.sendMessage({ type: "getSettings" }, function (response) {
            if (response && response.settings) {
                render(response.settings);
                form.querySelectorAll("input, textarea").forEach(function (control) { control.disabled = false; });
                updateModeUI();
            }
        });
        document.querySelectorAll('input').forEach(function (input) {
            input.addEventListener("change", save);
        });
        document.querySelectorAll('textarea').forEach(function (input) {
            input.addEventListener("input", function () {
                clearTimeout(saveTimer);
                saveTimer = setTimeout(save, 400);
            });
        });
        if (navigator.userAgent.toLowerCase().indexOf("chrome") > -1) {
            var link = document.createElement("link");
            link.href = "./css/chrome.css";
            link.rel = "stylesheet";
            document.head.appendChild(link);
        }
    });
}());
