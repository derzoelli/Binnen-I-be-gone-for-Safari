import SwiftUI

struct TestView: View {
    var body: some View {
        NavigationView {
            Form {
                Section("Filter testen") {
                    Text("Auf der öffentlichen Testseite kannst du die Filter-Engine und die installierte Safari-Erweiterung getrennt prüfen.")
                    Link("Testseite öffnen", destination: AppLinks.testPage)
                    Text("Öffne die Seite in Safari, damit der Live-Test die Erweiterung prüfen kann.")
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Test")
            .frame(minWidth: 350, idealWidth: 580)
        }
#if os(iOS)
        .navigationViewStyle(.stack)
#endif
    }
}

struct RootView: View {
    var body: some View {
        TabView {
            SettingsView().tabItem { Label("Einstellungen", systemImage: "gearshape") }
            TestView().tabItem { Label("Test", systemImage: "checkmark.circle") }
            AboutView().tabItem { Label("Über & Support", systemImage: "info.circle") }
        }
    }
}
