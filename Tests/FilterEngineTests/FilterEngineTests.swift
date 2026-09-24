import Foundation
import JavaScriptCore
import XCTest

final class FilterEngineTests: XCTestCase {
    func testSharedFixtureCorpus() throws {
        let bundle = Bundle(for: type(of: self))
        let engineURL = try XCTUnwrap(bundle.url(forResource: "filter-engine", withExtension: "js"))
        let fixturesURL = try XCTUnwrap(bundle.url(forResource: "gender-cases", withExtension: "json"))
        let context = JSContext()!
        context.exceptionHandler = { _, exception in XCTFail("JavaScript exception: \(exception?.toString() ?? "unknown")") }
        context.evaluateScript(try String(contentsOf: engineURL))
        let cases = try JSONSerialization.jsonObject(with: Data(contentsOf: fixturesURL)) as! [[String: Any]]
        for testCase in cases {
            context.setObject(testCase["input"] as! String, forKeyedSubscript: "fixtureInput" as NSString)
            context.setObject(testCase["settings"] ?? [:], forKeyedSubscript: "fixtureSettings" as NSString)
            let actual = context.evaluateScript("BinnenIBegoneFilterEngine.transformText(fixtureInput, fixtureSettings).text")?.toString()
            XCTAssertEqual(actual, testCase["expected"] as? String, "\(testCase["category"] as! String): \(testCase["input"] as! String)")
        }
    }
}
