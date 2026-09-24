import Darwin
import Foundation

enum StatisticsError: Error {
    case invalidDelta
    case countOverflow
    case storageUnavailable
}

/// Only aggregate counts and the beginning of the current counting period.
struct FilterStatistics: Codable, Equatable {
    let genderForms: Int
    let doubleForms: Int
    let participles: Int
    let resetDate: Date

    var total: Int { genderForms + doubleForms + participles }

    init(resetDate: Date = Date()) {
        genderForms = 0
        doubleForms = 0
        participles = 0
        self.resetDate = resetDate
    }

    private init(genderForms: Int, doubleForms: Int, participles: Int, resetDate: Date) throws {
        guard genderForms >= 0, doubleForms >= 0, participles >= 0 else { throw StatisticsError.invalidDelta }
        let (partial, firstOverflow) = genderForms.addingReportingOverflow(doubleForms)
        let (_, secondOverflow) = partial.addingReportingOverflow(participles)
        guard !firstOverflow, !secondOverflow else { throw StatisticsError.countOverflow }
        self.genderForms = genderForms
        self.doubleForms = doubleForms
        self.participles = participles
        self.resetDate = resetDate
    }

    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        try self.init(genderForms: values.decode(Int.self, forKey: .genderForms),
                      doubleForms: values.decode(Int.self, forKey: .doubleForms),
                      participles: values.decode(Int.self, forKey: .participles),
                      resetDate: values.decode(Date.self, forKey: .resetDate))
    }

    func adding(_ delta: StatisticsDelta) throws -> FilterStatistics {
        let (gender, genderOverflow) = genderForms.addingReportingOverflow(delta.genderForms)
        let (double, doubleOverflow) = doubleForms.addingReportingOverflow(delta.doubleForms)
        let (participle, participleOverflow) = participles.addingReportingOverflow(delta.participles)
        guard !genderOverflow, !doubleOverflow, !participleOverflow else { throw StatisticsError.countOverflow }
        return try FilterStatistics(genderForms: gender, doubleForms: double,
                                    participles: participle, resetDate: resetDate)
    }

    var dictionary: [String: Any] {
        ["genderForms": genderForms, "doubleForms": doubleForms,
         "participles": participles, "total": total,
         "resetDate": resetDate.timeIntervalSince1970]
    }
}

struct StatisticsDelta {
    let genderForms: Int
    let doubleForms: Int
    let participles: Int

    init(dictionary: [String: Any]) throws {
        let allowed: Set<String> = ["genderForms", "doubleForms", "participles"]
        guard !dictionary.isEmpty, Set(dictionary.keys).isSubset(of: allowed) else { throw StatisticsError.invalidDelta }
        func count(_ key: String) throws -> Int {
            guard let value = dictionary[key] else { return 0 }
            guard let number = value as? NSNumber,
                  CFGetTypeID(number) != CFBooleanGetTypeID(),
                  let integer = value as? Int, integer >= 0 else { throw StatisticsError.invalidDelta }
            return integer
        }
        genderForms = try count("genderForms")
        doubleForms = try count("doubleForms")
        participles = try count("participles")
    }

    var isZero: Bool { genderForms == 0 && doubleForms == 0 && participles == 0 }
}

/// A locked App Group file makes increments atomic across the app and extension processes.
final class StatsStore {
    private let fileURL: URL
    private let lockURL: URL
    private let now: () -> Date

    convenience init?(groupIdentifier: String = AppSettings.appGroupIdentifier) {
        guard let directory = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupIdentifier) else { return nil }
        self.init(directoryURL: directory)
    }

    init(directoryURL: URL, now: @escaping () -> Date = Date.init) {
        fileURL = directoryURL.appendingPathComponent("filter-statistics.json")
        lockURL = directoryURL.appendingPathComponent("filter-statistics.lock")
        self.now = now
    }

    func load() throws -> FilterStatistics {
        try withLock { try loadUnlocked() }
    }

    @discardableResult
    func increment(_ delta: StatisticsDelta) throws -> FilterStatistics {
        try withLock {
            let current = try loadUnlocked()
            if delta.isZero { return current }
            let updated = try current.adding(delta)
            try saveUnlocked(updated)
            return updated
        }
    }

    @discardableResult
    func reset() throws -> FilterStatistics {
        try withLock {
            let cleared = FilterStatistics(resetDate: now())
            try saveUnlocked(cleared)
            return cleared
        }
    }

    private func loadUnlocked() throws -> FilterStatistics {
        if FileManager.default.fileExists(atPath: fileURL.path) {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .secondsSince1970
            return try decoder.decode(FilterStatistics.self, from: Data(contentsOf: fileURL))
        }
        let initial = FilterStatistics(resetDate: now())
        try saveUnlocked(initial)
        return initial
    }

    private func saveUnlocked(_ value: FilterStatistics) throws {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .secondsSince1970
        try encoder.encode(value).write(to: fileURL, options: .atomic)
    }

    private func withLock<T>(_ body: () throws -> T) throws -> T {
        let descriptor = lockURL.path.withCString { open($0, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR) }
        guard descriptor >= 0 else { throw StatisticsError.storageUnavailable }
        defer { close(descriptor) }
        guard flock(descriptor, LOCK_EX) == 0 else { throw StatisticsError.storageUnavailable }
        defer { flock(descriptor, LOCK_UN) }
        return try body()
    }
}
