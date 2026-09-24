// Safari content script: settings, DOM traversal, observing and messaging only.
(function () {
    "use strict";

    var observer = null;
    var activeSettings = null;
    var activeMode = null;
    var counters = { genderForms: 0, doubleForms: 0, participles: 0, total: 0 };
    var reported = { genderForms: 0, doubleForms: 0, participles: 0 };
    var reportedCounterSetting = null;

    function isEligible(node) {
        var parent = node && node.parentElement;
        if (!parent || !node.data) return false;
        return !parent.closest("input, textarea, script, style, code, noscript, [contenteditable='true'], [contenteditable=''], [contenteditable='plaintext-only'], [role='textbox']");
    }

    function textNodesUnder(root) {
        if (root.nodeType === Node.TEXT_NODE) return isEligible(root) ? [root] : [];
        if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return [];
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) { return isEligible(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
        });
        var nodes = [], node;
        while ((node = walker.nextNode())) nodes.push(node);
        return nodes;
    }

    function matchesList(value) {
        if (!value || value === "undefined") return false;
        try { return new RegExp(value.replace(/(\r\n|\n|\r)/g, "|")).test(document.URL); }
        catch (error) { console.error("Invalid filter list:", error); return false; }
    }

    function shouldFilter(settings, mode) {
        if (settings.filterliste === "Bei Bedarf") {
            if (mode !== "ondemand") return false;
        } else if (!settings.aktiv) return false;
        if (settings.filterliste === "Allowlist" && !matchesList(settings.allowlist)) return false;
        if (settings.filterliste === "Blocklist" && matchesList(settings.blocklist)) return false;
        return true;
    }

    function skipTopic(settings, mode) {
        return settings.skip_topic && mode !== "ondemand" &&
            document.body && /Binnen-I/.test(document.body.textContent);
    }

    function reportCount() {
        var delta = {
            genderForms: counters.genderForms - reported.genderForms,
            doubleForms: counters.doubleForms - reported.doubleForms,
            participles: counters.participles - reported.participles
        };
        var hasDelta = delta.genderForms + delta.doubleForms + delta.participles > 0;
        var counterChanged = reportedCounterSetting !== activeSettings.counter;
        if (!hasDelta && (!counterChanged || counters.total === 0)) return;
        reported = { genderForms: counters.genderForms, doubleForms: counters.doubleForms,
                     participles: counters.participles };
        reportedCounterSetting = activeSettings.counter;
        chrome.runtime.sendMessage({
            countBinnenIreplacements: counters.genderForms,
            countDoppelformreplacements: counters.doubleForms,
            countPartizipreplacements: counters.participles,
            delta: delta,
            type: "count"
        });
    }

    function applyToNodes(nodes) {
        if (!activeSettings || skipTopic(activeSettings, activeMode)) return;
        nodes.forEach(function (node) {
            if (!isEligible(node)) return;
            var result = BinnenIBegoneFilterEngine.transformText(node.data, activeSettings);
            if (result.text !== node.data) node.data = result.text;
            counters.genderForms += result.changes.genderForms;
            counters.doubleForms += result.changes.doubleForms;
            counters.participles += result.changes.participles;
            counters.total += result.changes.total;
        });
        reportCount();
    }

    function observePage() {
        if (observer) return;
        observer = new MutationObserver(function (mutations) {
            var inserted = [];
            mutations.forEach(function (mutation) {
                Array.prototype.forEach.call(mutation.addedNodes, function (node) {
                    inserted = inserted.concat(textNodesUnder(node));
                });
            });
            applyToNodes(inserted);
        });
        observer.observe(document, { childList: true, subtree: true });
    }

    function filter(mode) {
        chrome.runtime.sendMessage({ type: "getSettings" }, function (response) {
            var settings = response && response.settings;
            if (!settings) return;
            if (!shouldFilter(settings, mode)) {
                activeSettings = null;
                return;
            }
            activeSettings = settings;
            activeMode = mode;
            applyToNodes(textNodesUnder(document));
            observePage();
        });
    }

    filter();
    chrome.runtime.onMessage.addListener(function (message) {
        if (message.type === "ondemand" || message.type === "settingsChanged") filter(message.type);
    });
}());
