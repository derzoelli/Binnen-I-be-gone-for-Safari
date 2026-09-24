import Foundation
import SafariServices

let SFExtensionMessageKey = "message"

/// Kept separate from NSExtensionContext so message behavior is unit-testable.
struct SettingsMessageProcessor {
    let store: SettingsStore

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
            result = SettingsMessageProcessor(store: store).process(message)
        } else {
            result = ["error": "App Group settings are unavailable"]
        }
        let response = NSExtensionItem()
        response.userInfo = [SFExtensionMessageKey: result]
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
