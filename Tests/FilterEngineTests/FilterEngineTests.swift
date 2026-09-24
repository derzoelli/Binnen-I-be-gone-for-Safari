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
            let result = context.evaluateScript("JSON.stringify(BinnenIBegoneFilterEngine.transformText(fixtureInput, fixtureSettings))")?.toString()
            let data = try XCTUnwrap(result?.data(using: .utf8))
            let actual = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
            XCTAssertEqual(actual["text"] as? String, testCase["expected"] as? String, "\(testCase["category"] as! String): \(testCase["input"] as! String)")
            if let expectedChanges = testCase["expectedChanges"] as? [String: Int] {
                let changes = try XCTUnwrap(actual["changes"] as? [String: Int])
                for (key, expected) in expectedChanges {
                    XCTAssertEqual(changes[key], expected, "\(testCase["input"] as! String), \(key)")
                }
            }
        }
    }
}
