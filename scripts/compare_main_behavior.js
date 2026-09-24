ObjC.import("Foundation");

function read(path) {
    return $.NSString.alloc.initWithContentsOfFileEncodingError($(path), $.NSUTF8StringEncoding, null).js;
}

function run(argv) {
    var root = $.NSFileManager.defaultManager.currentDirectoryPath.js;
    var source = read(argv[0]);
    var transformations = source.substring(source.indexOf("function entfernePartizip(nodes)"));
    var oldTransform = eval("(function () { var replacementsb = 0, replacementsd = 0, replacementsp = 0; " + transformations + " return function (input, settings) { var node = { data: input }; Object.defineProperty(node, 'nodeValue', { get: function () { return this.data; } }); if (settings.doubleForms !== false && settings.doppelformen !== false) entferneDoppelformen([node]); if (settings.participles === true || settings.partizip === true) entfernePartizip([node]); entferneBinnenIs([node]); return node.data; }; }())");
    eval(read(root + "/Shared (Extension)/Resources/filter-engine.js"));
    var cases = JSON.parse(read(root + "/Tests/Fixtures/gender-cases.json"));
    var differences = [];
    cases.forEach(function (testCase) {
        var settings = testCase.settings || {};
        var before = oldTransform(testCase.input, settings);
        var current = BinnenIBegoneFilterEngine.transformText(testCase.input, settings).text;
        if (before !== current) differences.push(testCase.input + " | main: " + before + " | branch: " + current);
    });
    console.log("Compared " + cases.length + " cases with main; " + differences.length + " intentional or pending differences:");
    differences.forEach(function (difference) { console.log(difference); });
}
