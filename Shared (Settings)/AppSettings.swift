import Foundation

/// The single source of defaults and the wire format used by the Safari scripts.
struct AppSettings: Equatable {
    static let appGroupIdentifier = "group.com.robinzoellner.Binnen-I-be-gone"
    static let schemaVersion = 1
    static let keys = ["aktiv", "counter", "invertiert", "doppelformen", "partizip", "skip_topic", "filterliste", "allowlist", "blocklist"]

    var isActive = true
    var showsCounter = false
    var usesDarkIcon = false
    var replacesDoubleForms = true
    var replacesParticiples = false
    var skipsTopicPages = false
    var filterMode = "Blocklist"
    var allowlist = ".gv.at\n.ac.at\nderstandard.at\ndiestandard.at"
    var blocklist = "stackoverflow.com\ngithub.com\nhttps://developer"

    init() {}

    init(dictionary: [String: Any]) {
        self.init()
        if let value = dictionary["aktiv"] as? Bool { isActive = value }
        if let value = dictionary["counter"] as? Bool { showsCounter = value }
        if let value = dictionary["invertiert"] as? Bool { usesDarkIcon = value }
        if let value = dictionary["doppelformen"] as? Bool { replacesDoubleForms = value }
        if let value = dictionary["partizip"] as? Bool { replacesParticiples = value }
        if let value = dictionary["skip_topic"] as? Bool { skipsTopicPages = value }
        if let value = dictionary["filterliste"] as? String, ["Keine", "Blocklist", "Allowlist", "Bei Bedarf"].contains(value) { filterMode = value }
        if let value = dictionary["allowlist"] as? String, value != "undefined" { allowlist = value }
        if let value = dictionary["blocklist"] as? String, value != "undefined" { blocklist = value }
    }

    var dictionary: [String: Any] {
        ["aktiv": isActive, "counter": showsCounter, "invertiert": usesDarkIcon,
         "doppelformen": replacesDoubleForms, "partizip": replacesParticiples,
         "skip_topic": skipsTopicPages, "filterliste": filterMode,
         "allowlist": allowlist, "blocklist": blocklist]
    }

    mutating func merge(_ changes: [String: Any]) {
        var values = dictionary
        for key in Self.keys {
            if let value = changes[key] { values[key] = value }
        }
        self = Self(dictionary: values)
    }
}

final class SettingsStore {
    private let defaults: UserDefaults
    private let storageKey = "appSettings"
    private let versionKey = "settingsSchemaVersion"

    init?(suiteName: String = AppSettings.appGroupIdentifier) {
        guard let defaults = UserDefaults(suiteName: suiteName) else { return nil }
        self.defaults = defaults
    }

    /// Test-only injection and a way to verify persistence without a signed App Group.
    init(defaults: UserDefaults) { self.defaults = defaults }

    var isInitialized: Bool { defaults.integer(forKey: versionKey) >= AppSettings.schemaVersion && defaults.dictionary(forKey: storageKey) != nil }

    func load() -> AppSettings {
        AppSettings(dictionary: defaults.dictionary(forKey: storageKey) ?? [:])
    }

    @discardableResult
    func migrateIfNeeded(legacy: [String: Any]) -> AppSettings {
        if isInitialized { return load() }
        let settings = AppSettings(dictionary: legacy)
        save(settings)
        return settings
    }

    func save(_ settings: AppSettings) {
        defaults.set(settings.dictionary, forKey: storageKey)
        defaults.set(AppSettings.schemaVersion, forKey: versionKey)
    }

    @discardableResult
    func update(_ changes: [String: Any]) -> AppSettings {
        var settings = load()
        settings.merge(changes)
        save(settings)
        return settings
    }
}
