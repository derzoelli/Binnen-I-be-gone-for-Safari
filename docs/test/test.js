(function () {
    "use strict";

    function checkCase(testCase) {
        var actual = BinnenIBegoneFilterEngine.transformText(testCase.input, testCase.settings);
        var passed = actual.text === testCase.expected && (!testCase.expectedChanges ||
            Object.keys(testCase.expectedChanges).every(function (key) {
                return actual.changes[key] === testCase.expectedChanges[key];
            }));
        return { passed: passed, actual: actual };
    }

    function showFailure(testCase, actual, index) {
        var details = document.createElement("details");
        var summary = document.createElement("summary");
        var output = document.createElement("pre");
        summary.textContent = (index + 1) + ". " + testCase.category + ": " + testCase.input;
        output.textContent = "Input: " + testCase.input + "\nExpected: " + testCase.expected +
            "\nActual: " + actual.text + "\nSettings: " + JSON.stringify(testCase.settings || {}) +
            (testCase.expectedChanges ? "\nExpected changes: " + JSON.stringify(testCase.expectedChanges) +
                "\nActual changes: " + JSON.stringify(actual.changes) : "");
        details.appendChild(summary);
        details.appendChild(output);
        document.getElementById("engine-failures").appendChild(details);
    }

    function runEngineTests() {
        fetch("generated/gender-cases.json").then(function (response) {
            if (!response.ok) throw new Error("HTTP " + response.status);
            return response.json();
        }).then(function (cases) {
            if (!Array.isArray(cases) || cases.length === 0) throw new Error("Testkorpus fehlt oder ist leer");
            var categories = {};
            var passed = 0;
            cases.forEach(function (testCase, index) {
                var check = checkCase(testCase);
                if (!categories[testCase.category]) categories[testCase.category] = { passed: 0, total: 0 };
                categories[testCase.category].total++;
                if (check.passed) { passed++; categories[testCase.category].passed++; }
                else showFailure(testCase, check.actual, index);
            });
            var result = document.getElementById("engine-result");
            result.textContent = cases.length + " Tests · " + passed + " bestanden · " + (cases.length - passed) + " fehlgeschlagen";
            result.className = passed === cases.length ? "pass" : "fail";
            Object.keys(categories).forEach(function (category) {
                var row = document.createElement("div");
                row.textContent = category + ": " + categories[category].passed + "/" + categories[category].total;
                document.getElementById("engine-categories").appendChild(row);
            });
        }).catch(function (error) {
            var result = document.getElementById("engine-result");
            result.textContent = "Engine Self-Test konnte nicht geladen werden: " + error.message;
            result.className = "fail";
        });
    }

    function checkLiveExamples() {
        var examples = Array.prototype.slice.call(document.querySelectorAll(".live-example"));
        var passed = examples.filter(function (example) {
            return example.textContent.trim() === example.dataset.expected;
        }).length;
        var result = document.getElementById("live-result");
        result.textContent = passed === examples.length ?
            "Safari-Erweiterung erkannt ✓ · " + passed + "/" + examples.length + " Live-Beispiele korrekt gefiltert" :
            passed === 0 ? "Keine Filterung erkannt · 0/" + examples.length + " Live-Beispiele korrekt gefiltert" :
                "Teilweise gefiltert · " + passed + "/" + examples.length + " Live-Beispiele korrekt gefiltert";
        result.className = passed === examples.length ? "pass" : "fail";
    }

    document.getElementById("live-check").addEventListener("click", checkLiveExamples);
    setTimeout(checkLiveExamples, 1600);
    runEngineTests();
}());
