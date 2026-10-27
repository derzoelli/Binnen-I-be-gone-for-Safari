import Foundation
import XCTest

final class AboutSupportTests: XCTestCase {
    func testSupportLinkUsesPublicProjectReadmeAnchor() {
        XCTAssertEqual(AppLinks.support.scheme, "https")
        XCTAssertEqual(AppLinks.support.host, "github.com")
        XCTAssertEqual(AppLinks.support.path, "/derzoelli/Binnen-I-be-gone-for-Safari")
        XCTAssertEqual(AppLinks.support.fragment, "support")
        XCTAssertNil(AppLinks.support.query)
        XCTAssertEqual(AppLinks.support.absoluteString,
                       "https://github.com/derzoelli/Binnen-I-be-gone-for-Safari#support")
    }

    func testVersionAndBuildComeFromBundle() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("AboutSupportTests-\(UUID().uuidString).bundle")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let plist: [String: Any] = ["CFBundleIdentifier": "org.example.AboutSupportTests",
                                    "CFBundleShortVersionString": "9.8.7", "CFBundleVersion": "4321"]
        XCTAssertTrue((plist as NSDictionary).write(to: directory.appendingPathComponent("Info.plist"), atomically: true))
        let bundle = try XCTUnwrap(Bundle(url: directory))
        XCTAssertEqual(AppVersionInfo(bundle: bundle), AppVersionInfo(version: "9.8.7", build: "4321"))
    }

    func testEmptyBundledSupportersAreValid() throws {
        let url = try XCTUnwrap(Bundle(for: AboutSupportTests.self).url(forResource: "Supporters", withExtension: "json"))
        XCTAssertEqual(SupporterCatalog.load(from: try Data(contentsOf: url)), [])
    }

    func testInvalidSupportersAreIgnoredWithoutCrash() {
        let data = Data("[{\"name\":\"\"},{\"name\":42},{\"name\":\"Good\"},{\"name\":\"Bad URL\",\"url\":\"javascript:alert(1)\"}]".utf8)
        XCTAssertEqual(SupporterCatalog.load(from: data).map(\.name), ["Good"])
        XCTAssertEqual(SupporterCatalog.load(from: Data("broken".utf8)), [])
    }

    func testSupporterHTTPSLinksRemainSupported() throws {
        let data = Data("[{\"name\":\"Example\",\"url\":\"https://example.org/profile\"}]".utf8)
        let supporters = SupporterCatalog.load(from: data)
        XCTAssertEqual(supporters.count, 1)
        let supporter = try XCTUnwrap(supporters.first)
        XCTAssertEqual(supporter.name, "Example")
        XCTAssertEqual(supporter.url?.absoluteString, "https://example.org/profile")
    }
}
