import SwiftUI
#if os(macOS)
import SafariServices
#endif

final class SettingsModel: ObservableObject {
    @Published var settings: AppSettings
    @Published var isReady: Bool
    private let store: SettingsStore?

    init(store: SettingsStore? = SettingsStore()) {
        self.store = store
        self.settings = store?.load() ?? AppSettings()
        self.isReady = store?.isInitialized ?? false
    }

    func reload() {
        settings = store?.load() ?? AppSettings()
        isReady = store?.isInitialized ?? false
    }
    func save() { store?.save(settings) }
}

struct SettingsView: View {
    @StateObject private var model = SettingsModel()
    @Environment(\.scenePhase) private var scenePhase
#if os(macOS)
    @State private var extensionEnabled: Bool?
#endif

    private func binding<Value>(_ keyPath: WritableKeyPath<AppSettings, Value>) -> Binding<Value> {
        Binding(get: { model.settings[keyPath: keyPath] }, set: {
            model.settings[keyPath: keyPath] = $0
            model.save()
        })
    }

    var body: some View {
        NavigationView {
            Form {
                Section("Safari-Erweiterung") {
                    Label("Binnen-I be gone für Safari", systemImage: "safari")
                    if !model.isReady {
                        Text("Öffne Safari mit aktivierter Erweiterung einmal, damit bestehende Einstellungen sicher übernommen werden. Danach die App erneut öffnen.")
                            .foregroundColor(.secondary)
                    }
#if os(macOS)
                    if let extensionEnabled = extensionEnabled {
                        Label(extensionEnabled ? "Erweiterung aktiviert" : "Erweiterung deaktiviert",
                              systemImage: extensionEnabled ? "checkmark.circle.fill" : "exclamationmark.circle")
                    } else {
                        Text("Status der Erweiterung nicht verfügbar")
                            .foregroundColor(.secondary)
                    }
                    Button("Safari-Erweiterungseinstellungen öffnen") {
                        SFSafariApplication.showPreferencesForExtension(withIdentifier: "com.robinzoellner.Binnen-I-be-gone.Extension") { _ in }
                    }
#else
                    Text("Aktiviere die Erweiterung in Safari unter Einstellungen → Erweiterungen.")
                        .foregroundColor(.secondary)
#endif
                }
                Section("Filterung") {
                    Toggle("Filterung aktiv", isOn: binding(\.isActive))
                    Toggle("Doppelformen ersetzen", isOn: binding(\.replacesDoubleForms))
                    Toggle(isOn: binding(\.replacesParticiples)) {
                        HStack { Text("Partizipformen ersetzen"); Text("Beta").font(.caption).foregroundColor(.secondary) }
                    }
                }.disabled(!model.isReady)
                Section("Anzeige") {
                    Toggle("Zähler im Toolbar-Icon", isOn: binding(\.showsCounter))
                    Toggle("Alternatives dunkles Toolbar-Icon", isOn: binding(\.usesDarkIcon))
                }.disabled(!model.isReady)
                Section("Filtermodus") {
                    Picker("Auf welchen Seiten filtern?", selection: binding(\.filterMode)) {
                        Text("Überall").tag("Keine")
                        Text("Außer Blocklist").tag("Blocklist")
                        Text("Nur Allowlist").tag("Allowlist")
                        Text("Nur bei Bedarf").tag("Bei Bedarf")
                    }
                    Toggle("Seiten zum Thema „Binnen-I“ aussetzen", isOn: binding(\.skipsTopicPages))
                        .disabled(model.settings.filterMode == "Bei Bedarf")
                }.disabled(!model.isReady)
                Section(header: Text("Blocklist"), footer: Text("Eine Domain pro Zeile. Auf diesen Seiten wird nicht gefiltert.")) {
                    TextEditor(text: binding(\.blocklist))
                        .frame(minHeight: 110)
                        .accessibilityLabel("Blocklist")
                }.disabled(!model.isReady)
                Section(header: Text("Allowlist"), footer: Text("Eine Domain pro Zeile. Nur auf diesen Seiten wird gefiltert, wenn Allowlist gewählt ist.")) {
                    TextEditor(text: binding(\.allowlist))
                        .frame(minHeight: 110)
                        .accessibilityLabel("Allowlist")
                }.disabled(!model.isReady)
            }
            .navigationTitle("Binnen-I be gone")
            .frame(minWidth: 350, idealWidth: 580)
        }
#if os(iOS)
        .navigationViewStyle(.stack)
#endif
        .onAppear { refresh() }
        .onChange(of: scenePhase) { phase in if phase == .active { refresh() } }
    }

    private func refresh() {
        model.reload()
#if os(macOS)
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: "com.robinzoellner.Binnen-I-be-gone.Extension") { state, _ in
            DispatchQueue.main.async { extensionEnabled = state?.isEnabled }
        }
#endif
    }
}
