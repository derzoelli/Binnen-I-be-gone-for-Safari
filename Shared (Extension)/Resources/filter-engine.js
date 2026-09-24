/* Pure text transformation. This file intentionally has no browser or DOM APIs. */
(function (root, factory) {
    var api = factory();
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    root.BinnenIBegoneFilterEngine = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";
    var plural = { "mitarbeiter":"Mitarbeiter", "nutzer":"Nutzer", "kolleg":"Kollegen", "ärzt":"Ärzte", "arzt":"Ärzte", "bäuer":"Bauern", "bauer":"Bauern", "schüler":"Schüler", "autor":"Autoren", "hacker":"Hacker", "student":"Studenten", "lehrer":"Lehrer", "bürger":"Bürger", "freund":"Freunde", "expert":"Experten", "anwält":"Anwälte" };
    var singular = { "mitarbeiter":"Mitarbeiter", "nutzer":"Nutzer", "kolleg":"Kollege", "ärzt":"Arzt", "arzt":"Arzt", "bäuer":"Bauer", "bauer":"Bauer", "schüler":"Schüler", "autor":"Autor", "hacker":"Hacker", "student":"Student", "lehrer":"Lehrer", "bürger":"Bürger", "freund":"Freund", "expert":"Experte", "anwält":"Anwalt" };
    var participles = { "Studierende":"Studenten", "Dozierende":"Dozenten", "Assistierende":"Assistenten", "Mitarbeitende":"Mitarbeiter", "Forschende":"Forscher", "Kunstschaffende":"Künstler", "Musikschaffende":"Musiker" };
    function defaults(s) { s = s || {}; return { doubleForms: s.doubleForms !== undefined ? s.doubleForms : s.doppelformen !== false, participles: s.participles !== undefined ? s.participles : s.partizip === true }; }
    function masculine(stem, isPlural) { var key = stem.toLowerCase(), value = (isPlural ? plural : singular)[key]; if (!value) value = isPlural && !/(er|el)$/.test(key) ? stem + "en" : stem; return stem.charAt(0) === stem.charAt(0).toUpperCase() ? value : value.toLowerCase(); }
    function transformText(text, suppliedSettings) {
        var settings = defaults(suppliedSettings), changes = { genderForms: 0, doubleForms: 0, participles: 0, total: 0 }, result = String(text), protectedText = [];
        result = result.replace(/https?:\/\/[^\s]+|\bLinkedIn\b/g, function (match) { protectedText.push(match); return "__BIBG_PROTECTED_" + (protectedText.length - 1) + "__"; });
        function replace(regex, category, replacement) { result = result.replace(regex, function () { changes[category]++; return typeof replacement === "function" ? replacement.apply(null, arguments) : replacement; }); }
        if (settings.doubleForms) { replace(/\bBürgerinnen und Bürger\b/g, "doubleForms", "Bürger"); replace(/\bBürger und Bürgerinnen\b/g, "doubleForms", "Bürger"); replace(/\bdie Ärztin und der Arzt\b/g, "doubleForms", "der Arzt"); replace(/\bder Arzt und die Ärztin\b/g, "doubleForms", "der Arzt"); replace(/\bBäuerinnen und Bauern\b/g, "doubleForms", "Bauern"); replace(/\bHackerinnen und Hacker\b/g, "doubleForms", "Hacker"); }
        if (settings.participles) { replace(/\bder Studierende\b/g, "participles", "der Student"); Object.keys(participles).forEach(function (word) { replace(new RegExp("\\b" + word + "\\b", "g"), "participles", participles[word]); }); }
        replace(/\b(?:der[/*:_-]+die|die[/*:_-]+der)\b/g, "genderForms", "der"); replace(/\bjede\/r\b/g, "genderForms", "jeder"); replace(/\bjede\*n\b/g, "genderForms", "jeden"); replace(/\b(?:er\/?sie|sie\/?er)\b/g, "genderForms", "er"); replace(/\b(?:sie\/?ihn|ihn\/?sie)\b/g, "genderForms", "ihn");
        replace(/\bmit den ÄrztInnen\b/g, "genderForms", "mit den Ärzten");
        replace(/\b([A-Za-zÄÖÜäöüß]+)(?:\/-?|[\*_:.·•'’])\(?inn\)?en\b/gi, "genderForms", function (_, stem) { return masculine(stem, true); }); replace(/\b([A-Za-zÄÖÜäöüß]+)\(inn\)en\b/gi, "genderForms", function (_, stem) { return masculine(stem, true); }); replace(/\b([A-Za-zÄÖÜäöüß]+)\(innen\)(?![A-Za-zÄÖÜäöüß])/gi, "genderForms", function (_, stem) { return masculine(stem, true); }); replace(/\b([A-Za-zÄÖÜäöüß]+)(?:\/-?|[\*_:.·•'’])in\b/gi, "genderForms", function (_, stem) { return masculine(stem, false); }); replace(/\b([A-Za-zÄÖÜäöüß]+)\(in\)(?![A-Za-zÄÖÜäöüß])/gi, "genderForms", function (_, stem) { return masculine(stem, false); });
        replace(/\b([A-Za-zÄÖÜäöüß]+)Innen\b/g, "genderForms", function (_, stem) { return masculine(stem, true); }); replace(/\b([A-Za-zÄÖÜäöüß]+)In\b/g, "genderForms", function (_, stem) { return masculine(stem, false); }); replace(/\b(mit den) Ärzte\b/g, "genderForms", "$1 Ärzten");
        result = result.replace(/mit den Ärzten/g, "__BIBG_DATIVE_AERZTE__");
        result = result.replace(/Ärzten/g, "Ärzte").replace(/Ärzt(?![A-Za-zÄÖÜäöüß])/g, "Arzt");
        result = result.replace(/__BIBG_DATIVE_AERZTE__/g, "mit den Ärzten");
        result = result.replace(/__BIBG_PROTECTED_(\d+)__/g, function (_, index) { return protectedText[Number(index)]; });
        changes.total = changes.genderForms + changes.doubleForms + changes.participles; return { text: result, changes: changes };
    }
    return { transformText: transformText };
}));
