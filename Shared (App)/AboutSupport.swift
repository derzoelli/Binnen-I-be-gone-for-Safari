import Foundation
import SwiftUI

struct AppVersionInfo: Equatable {
    let version: String
    let build: String

    init(version: String, build: String) {
        self.version = version
        self.build = build
    }

    init(bundle: Bundle = .main) {
        version = bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "–"
        build = bundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "–"
    }
}

struct Supporter: Identifiable, Equatable {
    let name: String
    let url: URL?
    var id: String { name }
}

enum SupporterCatalog {
    static func load(from data: Data) -> [Supporter] {
        guard let records = (try? JSONSerialization.jsonObject(with: data)) as? [[String: Any]] else { return [] }
        return records.compactMap { record in
            guard let name = record["name"] as? String,
                  !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
            var link: URL?
            if let rawURL = record["url"] as? String {
                guard let url = URL(string: rawURL), url.scheme == "https", url.host != nil else { return nil }
                link = url
            } else if record["url"] != nil { return nil }
            return Supporter(name: name, url: link)
        }
    }

    static func load(bundle: Bundle = .main) -> [Supporter] {
        guard let url = bundle.url(forResource: "Supporters", withExtension: "json"),
              let data = try? Data(contentsOf: url) else { return [] }
        return load(from: data)
    }
}

enum AppLinks {
    static let github = URL(string: "https://github.com/derzoelli/Binnen-I-be-gone-for-Safari")!
    static let license = URL(string: "https://github.com/derzoelli/Binnen-I-be-gone-for-Safari/blob/development/LICENSE")!
    static let appStore = URL(string: "https://apps.apple.com/de/app/binnen-i-be-gone/id1591455415")!
    static let testFlight = URL(string: "https://testflight.apple.com/join/CVIYsv2P")!
    static let payPal = URL(string: "https://www.paypal.me/robinzoellner")!
    static let testPage = URL(string: "https://derzoelli.github.io/Binnen-I-be-gone-for-Safari/test/")!
}

struct SupporterView: View {
    let supporters: [Supporter]

    var body: some View {
        if supporters.isEmpty {
            Text("Danke an alle, die das Projekt unterstützen.")
        } else {
            ForEach(supporters) { supporter in
                if let url = supporter.url { Link(supporter.name, destination: url) }
                else { Text(supporter.name) }
            }
        }
        Link("Projekt unterstützen", destination: AppLinks.payPal)
    }
}

struct AboutView: View {
    private let version = AppVersionInfo()
    private let supporters = SupporterCatalog.load()

    var body: some View {
        NavigationView {
            Form {
                Section("Binnen-I be gone") {
                    Text("Version \(version.version)")
                    Text("Build \(version.build)")
                }
                Section("Links & Support") {
                    Link("GitHub", destination: AppLinks.github)
                    Link("App Store", destination: AppLinks.appStore)
                    Link("TestFlight", destination: AppLinks.testFlight)
                }
                Section("Datenschutz") {
                    Text("Binnen-I be gone enthält keine Tracker und überträgt keine Browser- oder Nutzungsdaten an externe Server.")
                    Text("Die Statistik wird ausschließlich lokal gespeichert und enthält nur aggregierte Zähler.")
                }
                Section("Open Source") {
                    Text("Das Projekt ist Open Source und steht unter der GPL-3.0-Lizenz.")
                    Text("Die Safari-Version basiert ursprünglich auf der Arbeit an der Chrome- und Firefox-Version.")
                    Link("Quellcode ansehen", destination: AppLinks.github)
                    Link("Lizenz ansehen", destination: AppLinks.license)
                }
                Section("Unterstützer") { SupporterView(supporters: supporters) }
            }
            .navigationTitle("Über & Support")
            .frame(minWidth: 350, idealWidth: 580)
        }
#if os(iOS)
        .navigationViewStyle(.stack)
#endif
    }
}
