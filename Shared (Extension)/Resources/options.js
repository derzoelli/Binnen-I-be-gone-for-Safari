// The options page is another client of the background settings broker.
(function () {
    "use strict";
    var saveTimer;
    var previousMode;
    function field(id) { return document.getElementById(id); }
    function selectedMode() { return document.querySelector('input[name="filterstate"]:checked').value; }

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
        previousMode = selectedMode();
        updateModeUI();
    }

    function values() {
        var settings = {};
        ["aktiv", "counter", "invertiert", "doppelformen", "partizip", "skip_topic"].forEach(function (key) {
            settings[key] = field(key).checked;
        });
        settings.filterliste = selectedMode();
        settings.allowlist = field("allowlist").value.trim();
        settings.blocklist = field("blocklist").value.trim();
        return settings;
    }

    function save() {
        clearTimeout(saveTimer);
        if (selectedMode() === "Bei Bedarf") field("aktiv").checked = false;
        updateModeUI();
        chrome.runtime.sendMessage({ type: "setSettings", settings: values() });
    }

    function changed(event) {
        if (event.target.name === "filterstate") {
            var mode = selectedMode();
            if (mode === "Bei Bedarf") field("aktiv").checked = false;
            else if (previousMode === "Bei Bedarf") field("aktiv").checked = true;
            previousMode = mode;
        }
        save();
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
            input.addEventListener("change", changed);
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
