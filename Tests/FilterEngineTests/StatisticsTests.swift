import Foundation
import XCTest

final class StatisticsTests: XCTestCase {
    private func temporaryStore(now: @escaping () -> Date = Date.init) throws -> (StatsStore, URL) {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("StatisticsTests-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return (StatsStore(directoryURL: directory, now: now), directory)
    }

    func testDefaultsAndPersistedDataContainOnlyAggregates() throws {
        let start = Date(timeIntervalSince1970: 1_000)
        let (store, directory) = try temporaryStore(now: { start })
        defer { try? FileManager.default.removeItem(at: directory) }
        let statistics = try store.load()
        XCTAssertEqual(statistics.genderForms, 0)
        XCTAssertEqual(statistics.doubleForms, 0)
        XCTAssertEqual(statistics.participles, 0)
        XCTAssertEqual(statistics.total, 0)
        XCTAssertEqual(statistics.resetDate, start)
        let data = try Data(contentsOf: directory.appendingPathComponent("filter-statistics.json"))
        let stored = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertEqual(Set(stored.keys), Set(["genderForms", "doubleForms", "participles", "resetDate"]))
    }

    func testIncrementMultipleTimesAndPersistence() throws {
        let (store, directory) = try temporaryStore()
        defer { try? FileManager.default.removeItem(at: directory) }
        let first = try store.increment(StatisticsDelta(dictionary: ["genderForms": 2, "doubleForms": 1, "participles": 3]))
        XCTAssertEqual([first.genderForms, first.doubleForms, first.participles, first.total], [2, 1, 3, 6])
        let second = try store.increment(StatisticsDelta(dictionary: ["genderForms": 4]))
        XCTAssertEqual([second.genderForms, second.doubleForms, second.participles, second.total], [6, 1, 3, 10])
        let reloaded = try StatsStore(directoryURL: directory).load()
        XCTAssertEqual(reloaded, second)
    }

    func testResetChangesDateAndClearsCounts() throws {
        var clock = Date(timeIntervalSince1970: 1_000)
        let (store, directory) = try temporaryStore(now: { clock })
        defer { try? FileManager.default.removeItem(at: directory) }
        _ = try store.increment(StatisticsDelta(dictionary: ["genderForms": 2]))
        clock = Date(timeIntervalSince1970: 2_000)
        let cleared = try store.reset()
        XCTAssertEqual(cleared.total, 0)
        XCTAssertEqual(cleared.resetDate, clock)
        XCTAssertEqual(try store.load(), cleared)
    }

    func testInvalidDeltasAndOverflowCannotReduceOrCorruptCounts() throws {
        let (store, directory) = try temporaryStore()
        defer { try? FileManager.default.removeItem(at: directory) }
        let invalidPayloads: [[String: Any]] = [["genderForms": -1], ["genderForms": true],
                                                ["genderForms": 1.5], ["total": 7], ["url": "private.example"]]
        for payload in invalidPayloads {
            XCTAssertThrowsError(try StatisticsDelta(dictionary: payload))
        }
        XCTAssertEqual(try store.load().total, 0)
        _ = try store.increment(StatisticsDelta(dictionary: ["genderForms": Int.max]))
        XCTAssertThrowsError(try store.increment(StatisticsDelta(dictionary: ["doubleForms": 1])))
        XCTAssertEqual(try store.load().total, Int.max)
    }

    func testNativeStatisticsCommands() throws {
        let (statsStore, directory) = try temporaryStore()
        defer { try? FileManager.default.removeItem(at: directory) }
        let suite = "StatisticsMessageTests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let processor = SettingsMessageProcessor(store: SettingsStore(defaults: defaults), statsStore: statsStore)

        let initial = try XCTUnwrap(processor.process(["type": "getStatistics"])["statistics"] as? [String: Any])
        XCTAssertEqual(initial["total"] as? Int, 0)
        let updated = try XCTUnwrap(processor.process(["type": "incrementStatistics", "changes":
            ["genderForms": 2, "doubleForms": 1, "participles": 3]])["statistics"] as? [String: Any])
        XCTAssertEqual(updated["total"] as? Int, 6)
        XCTAssertEqual(try statsStore.load().total, 6)
        XCTAssertNotNil(processor.process(["type": "incrementStatistics", "changes": ["genderForms": -1]])["error"])
        XCTAssertNotNil(processor.process(["type": "setStatistics", "statistics": [:]])["error"])
        let reset = try XCTUnwrap(processor.process(["type": "resetStatistics"])["statistics"] as? [String: Any])
        XCTAssertEqual(reset["total"] as? Int, 0)
        XCTAssertNotNil(reset["resetDate"] as? Double)
    }

    func testConcurrentIncrementsAreAtomic() throws {
        let (store, directory) = try temporaryStore()
        defer { try? FileManager.default.removeItem(at: directory) }
        let delta = try StatisticsDelta(dictionary: ["genderForms": 1])
        let errorLock = NSLock()
        var failures = 0
        DispatchQueue.concurrentPerform(iterations: 40) { _ in
            do { _ = try store.increment(delta) }
            catch { errorLock.lock(); failures += 1; errorLock.unlock() }
        }
        XCTAssertEqual(failures, 0)
        XCTAssertEqual(try store.load().genderForms, 40)
    }
}
