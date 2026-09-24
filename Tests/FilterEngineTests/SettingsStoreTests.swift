import Foundation
import JavaScriptCore
import XCTest

final class SettingsStoreTests: XCTestCase {
    private func temporaryStore() -> (SettingsStore, UserDefaults, String) {
        let suite = "SettingsStoreTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        return (SettingsStore(defaults: defaults), defaults, suite)
    }

    func testDefaultsAndDictionaryRoundtrip() {
        let defaults = AppSettings()
        XCTAssertTrue(defaults.isActive)
        XCTAssertTrue(defaults.replacesDoubleForms)
        XCTAssertFalse(defaults.showsCounter)
        XCTAssertEqual(defaults.filterMode, "Blocklist")
        XCTAssertEqual(AppSettings(dictionary: defaults.dictionary), defaults)
        XCTAssertEqual(Set(defaults.dictionary.keys), Set(AppSettings.keys))
        XCTAssertEqual(AppSettings.appGroupIdentifier, "group.com.robinzoellner.Binnen-I-be-gone")
    }

    func testMigrationPreservesListsAndFillsMissingValues() {
        let (store, defaults, suite) = temporaryStore()
        defer { defaults.removePersistentDomain(forName: suite) }
        let settings = store.migrateIfNeeded(legacy: ["aktiv": false, "allowlist": "example.org", "blocklist": "private.example"])
        XCTAssertFalse(settings.isActive)
        XCTAssertEqual(settings.allowlist, "example.org")
        XCTAssertEqual(settings.blocklist, "private.example")
        XCTAssertTrue(settings.replacesDoubleForms)
        XCTAssertEqual(defaults.integer(forKey: "settingsSchemaVersion"), 1)
        XCTAssertEqual(store.migrateIfNeeded(legacy: ["allowlist": "overwrite.example"]), settings)
    }

    func testUnknownAndInvalidLegacyValuesAreIgnored() {
        let settings = AppSettings(dictionary: ["futureKey": 123, "filterliste": "Future mode", "blocklist": "undefined", "counter": true])
        XCTAssertEqual(settings.filterMode, "Blocklist")
        XCTAssertEqual(settings.blocklist, AppSettings().blocklist)
        XCTAssertTrue(settings.showsCounter)
        XCTAssertNil(settings.dictionary["futureKey"])
    }

    func testStoreReadWriteAndPartialUpdate() {
        let (store, defaults, suite) = temporaryStore()
        defer { defaults.removePersistentDomain(forName: suite) }
        var settings = AppSettings()
        settings.blocklist = "own.example"
        store.save(settings)
        XCTAssertEqual(store.load(), settings)
        let updated = store.update(["counter": true, "futureKey": "ignored"])
        XCTAssertTrue(updated.showsCounter)
        XCTAssertEqual(updated.blocklist, "own.example")
        XCTAssertEqual(store.load(), updated)
    }

    func testOnDemandModeTransitionsAndDisabledActivation() {
        let (store, defaults, suite) = temporaryStore()
        defer { defaults.removePersistentDomain(forName: suite) }
        store.save(AppSettings())
        let model = SettingsModel(store: store)

        XCTAssertEqual(model.settings.filterMode, "Blocklist")
        XCTAssertTrue(model.settings.isActive)
        model.setFilterMode("Bei Bedarf")
        XCTAssertEqual(store.load().filterMode, "Bei Bedarf")
        XCTAssertFalse(store.load().isActive)
        XCTAssertFalse(model.canEditActive)

        model.setActive(true)
        XCTAssertFalse(store.load().isActive, "The disabled toggle must not persist activation")
        model.setFilterMode("Blocklist")
        XCTAssertEqual(store.load().filterMode, "Blocklist")
        XCTAssertTrue(store.load().isActive)
        XCTAssertTrue(model.canEditActive)

        for mode in ["Keine", "Allowlist"] {
            model.setFilterMode("Bei Bedarf")
            model.setFilterMode(mode)
            XCTAssertEqual(store.load().filterMode, mode)
            XCTAssertTrue(store.load().isActive, mode)
        }
    }

    func testGetSetMessagesAndSwiftJavaScriptRoundtrip() throws {
        let (store, defaults, suite) = temporaryStore()
        defer { defaults.removePersistentDomain(forName: suite) }
        let processor = SettingsMessageProcessor(store: store)
        let first = processor.process(["type": "getSettings", "legacySettings": ["allowlist": "legacy.example", "aktiv": false]])
        let firstSettings = try XCTUnwrap(first["settings"] as? [String: Any])
        XCTAssertEqual(firstSettings["allowlist"] as? String, "legacy.example")
        XCTAssertEqual(firstSettings["aktiv"] as? Bool, false)

        // Exercise the JSON-compatible native message payload through JavaScriptCore.
        let context = JSContext()!
        context.setObject(firstSettings, forKeyedSubscript: "swiftSettings" as NSString)
        let wire = try XCTUnwrap(context.evaluateScript("JSON.stringify(Object.assign({}, swiftSettings, {counter:true}))")?.toString())
        let fromJS = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(wire.utf8)) as? [String: Any])
        let reply = processor.process(["type": "setSettings", "settings": fromJS])
        let saved = try XCTUnwrap(reply["settings"] as? [String: Any])
        XCTAssertEqual(saved["counter"] as? Bool, true)
        XCTAssertEqual(saved["allowlist"] as? String, "legacy.example")
        XCTAssertEqual(store.load().allowlist, "legacy.example")
        XCTAssertNotNil(processor.process(["type": "unknown"])["error"])
        XCTAssertNotNil(processor.process(["type": "setSettings"])["error"])
    }
}
