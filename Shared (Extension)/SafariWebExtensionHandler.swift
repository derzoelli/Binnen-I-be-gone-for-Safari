import Foundation
import SafariServices

let SFExtensionMessageKey = "message"

/// Kept separate from NSExtensionContext so message behavior is unit-testable.
struct SettingsMessageProcessor {
    let store: SettingsStore
    let statsStore: StatsStore?

    init(store: SettingsStore, statsStore: StatsStore? = nil) {
        self.store = store
        self.statsStore = statsStore
    }

    func process(_ message: [String: Any]) -> [String: Any] {
        guard let command = message["type"] as? String else { return ["error": "Missing message type"] }
        switch command {
        case "getSettings":
            let legacy = message["legacySettings"] as? [String: Any] ?? [:]
            return ["settings": store.migrateIfNeeded(legacy: legacy).dictionary,
                    "settingsSchemaVersion": AppSettings.schemaVersion]
        case "setSettings":
            guard let changes = message["settings"] as? [String: Any] else {
                return ["error": "Missing settings dictionary"]
            }
            _ = store.migrateIfNeeded(legacy: message["legacySettings"] as? [String: Any] ?? [:])
            return ["settings": store.update(changes).dictionary,
                    "settingsSchemaVersion": AppSettings.schemaVersion]
        case "getStatistics":
            guard let statsStore = statsStore else { return ["error": "Statistics store unavailable"] }
            do { return ["statistics": try statsStore.load().dictionary] }
            catch { return ["error": "Could not load statistics"] }
        case "incrementStatistics":
            guard let statsStore = statsStore else { return ["error": "Statistics store unavailable"] }
            guard let changes = message["changes"] as? [String: Any],
                  let delta = try? StatisticsDelta(dictionary: changes) else {
                return ["error": "Invalid statistics delta"]
            }
            do { return ["statistics": try statsStore.increment(delta).dictionary] }
            catch { return ["error": "Could not increment statistics"] }
        case "resetStatistics":
            guard let statsStore = statsStore else { return ["error": "Statistics store unavailable"] }
            do { return ["statistics": try statsStore.reset().dictionary] }
            catch { return ["error": "Could not reset statistics"] }
        default:
            return ["error": "Unsupported message type"]
        }
    }
}

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let message = (context.inputItems.first as? NSExtensionItem)?
            .userInfo?[SFExtensionMessageKey] as? [String: Any] ?? [:]
        let result: [String: Any]
        if let store = SettingsStore() {
            result = SettingsMessageProcessor(store: store, statsStore: StatsStore()).process(message)
        } else {
            result = ["error": "App Group settings are unavailable"]
        }
        let response = NSExtensionItem()
        response.userInfo = [SFExtensionMessageKey: result]
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
