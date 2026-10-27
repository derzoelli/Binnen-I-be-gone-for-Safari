import SwiftUI

struct TestView: View {
    var body: some View {
        AppForm("Test") {
            Section("Filter testen") {
                Text("Auf der öffentlichen Testseite kannst du die Filter-Engine und die installierte Safari-Erweiterung getrennt prüfen.")
                Link("Testseite öffnen", destination: AppLinks.testPage)
                Text("Öffne die Seite in Safari, damit der Live-Test die Erweiterung prüfen kann.")
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct RootView: View {
    var body: some View {
        TabView {
            SettingsView().tabItem { Label("Einstellungen", systemImage: "gearshape") }
            TestView().tabItem { Label("Test", systemImage: "checkmark.circle") }
            AboutView().tabItem { Label("Über & Support", systemImage: "info.circle") }
        }
#if os(macOS)
        .frame(minWidth: 580, minHeight: 540)
#endif
    }
}
