// Safari's single settings broker. Defaults and validation live in AppSettings.swift.
(function () {
    "use strict";

    var applicationID = "com.robinzoellner.Binnen-I-be-gone";
    var action = chrome.runtime.getManifest().manifest_version === 3 ? chrome.action : chrome.browserAction;
    var currentSettings = null;

    function storageGet(callback) { chrome.storage.sync.get(callback); }
    function storageSet(settings, callback) {
        chrome.storage.sync.set(settings, function () { if (callback) callback(); });
    }

    function nativeRequest(message, callback) {
        try {
            chrome.runtime.sendNativeMessage(applicationID, message, function (response) {
                var error = chrome.runtime.lastError;
                if (error || !response || response.error || !response.settings) {
                    callback(null);
                    return;
                }
                callback(response.settings);
            });
        } catch (error) {
            callback(null);
        }
    }

    function cache(settings, callback) {
        var clearBadges = !settings.counter && (!currentSettings || currentSettings.counter);
        currentSettings = settings;
        if (clearBadges) {
            chrome.tabs.query({}, function (tabs) {
                (tabs || []).forEach(function (tab) { action.setBadgeText({ text: "", tabId: tab.id }); });
            });
        }
        storageSet(settings, function () {
            updateIcon(settings);
            if (callback) callback(settings);
        });
    }

    function getSettings(callback) {
        // Fetch on each page/settings request so changes made in the native app are seen.
        storageGet(function (legacy) {
            nativeRequest({ type: "getSettings", legacySettings: legacy }, function (settings) {
                if (settings) cache(settings, callback);
                else {
                    // The sync cache also keeps the extension usable outside Safari.
                    currentSettings = legacy;
                    updateIcon(legacy);
                    callback(legacy);
                }
            });
        });
    }

    function setSettings(changes, callback) {
        storageGet(function (legacy) {
            nativeRequest({ type: "setSettings", settings: changes, legacySettings: legacy }, function (settings) {
                if (settings) cache(settings, callback);
                else {
                    var fallback = Object.assign({}, legacy, changes);
                    cache(fallback, callback);
                }
            });
        });
    }

    function updateIcon(settings) {
        if (!settings || !action) return;
        var enabled = settings.aktiv === true && settings.filterliste !== "Bei Bedarf";
        var suffix = settings.invertiert === true ? "i" : "";
        action.setIcon({ path: "images/icon" + (enabled ? "On" : "Off") + suffix + ".png" });
        action.setTitle({ title: settings.filterliste === "Bei Bedarf" ?
            "Klick filtert Binnen-Is auf dieser Seite" :
            (enabled ? "Filterung aktiv" : "Filterung deaktiviert") });
    }

    function sendToActiveTab(message, callback) {
        chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
            if (tabs && tabs.length) {
                chrome.tabs.sendMessage(tabs[0].id, message);
                if (callback) callback(tabs[0].id);
            }
        });
    }

    function toolbarClick() {
        getSettings(function (settings) {
            if (settings.filterliste === "Bei Bedarf") {
                sendToActiveTab({ type: "ondemand" }, function (tabID) {
                    action.setIcon({ path: "images/iconOn" + (settings.invertiert ? "i" : "") + ".png", tabId: tabID });
                });
            } else {
                setSettings({ aktiv: !settings.aktiv }, function () {
                    sendToActiveTab({ type: "settingsChanged" });
                });
            }
        });
    }

    function handleCount(message, sender) {
        if (!sender.tab) return;
        var delta = message.delta;
        if (delta && ["genderForms", "doubleForms", "participles"].every(function (key) {
            return Number.isSafeInteger(delta[key]) && delta[key] >= 0;
        }) && delta.genderForms + delta.doubleForms + delta.participles > 0) {
            // Only aggregate counts cross the native boundary; no tab or page metadata.
            chrome.runtime.sendNativeMessage(applicationID, {
                type: "incrementStatistics",
                changes: { genderForms: delta.genderForms, doubleForms: delta.doubleForms,
                           participles: delta.participles }
            }, function () { void chrome.runtime.lastError; });
        }
        if (!currentSettings || !currentSettings.counter) {
            action.setBadgeText({ text: "", tabId: sender.tab.id });
            return;
        }
        var total = message.countBinnenIreplacements + message.countDoppelformreplacements + message.countPartizipreplacements;
        action.setBadgeText({ text: total > 0 ? String(total) : "", tabId: sender.tab.id });
        action.setTitle({ title: "Filterung aktiv\n\nGefilterte Ausdrücke auf dieser Seite\nBinnen-Is: " +
            message.countBinnenIreplacements + "\nDoppelformen: " + message.countDoppelformreplacements +
            "\nPartizipformen: " + message.countPartizipreplacements, tabId: sender.tab.id });
    }

    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        if (message.type === "getSettings") {
            getSettings(function (settings) { sendResponse({ settings: settings }); });
            return true;
        }
        if (message.type === "setSettings") {
            setSettings(message.settings || {}, function (settings) { sendResponse({ settings: settings }); });
            return true;
        }
        if (message.type === "count") handleCount(message, sender);
        return false;
    });

    action.onClicked.addListener(toolbarClick);
    chrome.storage.onChanged.addListener(function (changes, area) {
        if (area === "sync" && currentSettings) {
            // The sync store is only a cache. Native state wins at the next fetch.
            storageGet(updateIcon);
        }
    });
    getSettings(function () {});
}());
