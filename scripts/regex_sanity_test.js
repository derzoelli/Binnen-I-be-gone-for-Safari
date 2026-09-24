ObjC.import("Foundation");
function read(path) { return $.NSString.alloc.initWithContentsOfFileEncodingError($(path), $.NSUTF8StringEncoding, null).js; }
var root = $.NSFileManager.defaultManager.currentDirectoryPath.js;
eval(read(root + "/Shared (Extension)/Resources/filter-engine.js"));
var cases = JSON.parse(read(root + "/Tests/Fixtures/gender-cases.json"));
var failures = [];
cases.forEach(function (testCase, index) {
    var actual = BinnenIBegoneFilterEngine.transformText(testCase.input, testCase.settings).text;
    if (actual !== testCase.expected) failures.push((index + 1) + " [" + testCase.category + "]: expected '" + testCase.expected + "', got '" + actual + "'");
});
if (failures.length) throw new Error(failures.join("\n"));
console.log("Passed " + cases.length + " filter-engine fixture assertions.");
