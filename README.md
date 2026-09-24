# Binnen-I-be-gone-for-Safari

![Platforms](https://img.shields.io/badge/platform-iOS%20%7C%20macOS-lightgrey)
![Apple Silicon + Intel](https://img.shields.io/badge/Apple%20Silicon%20%2B%20Intel-Universal-blueviolet)
![Universal Binary](https://img.shields.io/badge/macOS-universal%20binary-blue)
![Safari Web Extension](https://img.shields.io/badge/Safari-Web%20Extension-blue)
![Swift](https://img.shields.io/badge/Swift-5.9-orange)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)
![License GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-green)
![Apple Native](https://img.shields.io/badge/Apple-Native-lightgrey?logo=apple)
![Xcode Required](https://img.shields.io/badge/Requires-Xcode%2015%2B-blue?logo=xcode)


New repository for Binnen‑I‑be‑gone, now provided as a universal binary with support across all Apple platforms.

-----------------------------------------------------------------------------------------------------------------------

Binnen-Is sind der Versuch Geschlechtergerechtigkeit in geschriebener Sprache auszudrücken, allerdings wirkt sich deren Verwendung in den Augen mancher negativ auf den Lesefluss von Texten aus. Dieses Add-on ermöglicht es, die meisten eingestreuten Binnen-Is auf besuchten Webseiten herauszufiltern um so eine bessere Lesbarkeit zu erreichen.

Über einen Button kann die Filterung durch Binnen-I be gone schnell aktiviert & deaktiviert werden. Zudem können Sie über die Einstellungen im Add-ons-Manager Webseiten festlegen, die von der Filterung ausgenommen sein sollen oder auch einstellen, dass Binnen-Is nur auf bestimmten Seiten entfernt werden sollen.

Diese Safari Erweiterung basiert auf der Arbeit der Entwickler der Chrome & Firefox Version und wurde mit freundlicher Genehmigung von ihnen für Safari portiert. Falls ihr auf Probleme stoßt oder Anregungen habt, kontaktiert bitte mich und nicht die Entwickler der Chrome & Firefox Version.

-----------------------------------------------------------------------------------------------------------------------

Die App ist im App Store verfügbar:

[![Laden im App Store](https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/de-de?size=250x83)](https://apps.apple.com/de/app/binnen-i-be-gone/id1591455415)

Als universal binary ist sie nun auf allen Plattformen verfügbar, für ARM Macs optimiert und natürlich auch auf Intel Macs weiterhin lauffähig.

Selbstverständlich bekommt ihr die App auch im AppStore weiterhin kostenlos.

Falls ihr mich dabei unterstützen wollt meinen 99€/Jahr Apple Developer Account zu finanzieren, könnt ihr mir gerne eine kleine Spende über PayPal zukommen lassen: https://www.paypal.me/robinzoellner

Wenn ihr am Betaprogramm in TestFlight teilnehmen wollt, könnt ihr hier beitreten: 

[![TestFlight Beta](https://img.shields.io/badge/TestFlight-Beta-blue?logo=apple)](https://testflight.apple.com/join/CVIYsv2P)


Datenschutz: Die App enthält keinerlei Tracker, sammelt keinerlei Daten und speichert keine Informationen über euch oder die besuchten Webseiten. Sie ist ein simpler Filter, der ausschließlich die Darstellung von Webseiten in eurem Browser anpasst.

## Einstellungen (Phase 2)

Die iOS-/iPadOS- und macOS-App zeigen dieselben nativen SwiftUI-Einstellungen. `Shared (Settings)/AppSettings.swift` enthält die typisierten Einstellungen und **alle Standardwerte**. App und Safari-Erweiterung lesen/schreiben über `UserDefaults(suiteName:)` in der App Group `group.com.robinzoellner.Binnen-I-be-gone`.

Beim ersten Start der Web-Extension liest `background.js` die bisherigen Werte aus `chrome.storage.sync` und übergibt sie mit `getSettings` an den nativen Handler. Dieser speichert sie einmalig mit `settingsSchemaVersion = 1` in der App Group; fehlende Werte erhalten die Defaults. Sobald der Store initialisiert ist, kann ein späterer Migrationsaufruf weder Allowlist noch Blocklist überschreiben. `chrome.storage.sync` bleibt als Laufzeit-/Legacy-Cache bestehen. Beim nächsten Seitenaufruf holt die Extension die aktuellen Werte erneut aus der App Group. Die App lässt Einstellungen vor Abschluss der Erst-Migration bewusst noch nicht bearbeiten, damit eine zuerst geöffnete App keine vorhandenen Listen verdrängt.

Der Nachrichtenweg ist `Content Script/Options → background.js → SafariWebExtensionHandler.swift → App Group`. Die JavaScript-API des Brokers ist `getSettings` und `setSettings`; der native Handler antwortet mit `{settings: …, settingsSchemaVersion: 1}`. Die alten JavaScript-Schlüssel (`aktiv`, `filterliste` usw.) bleiben erhalten. Bei einem vorübergehend nicht verfügbaren Native Handler nutzt die Extension ihren Sync-Cache.

Für signierte Builds müssen die App Group und die zugehörigen Provisioning Profiles im Apple-Developer-Account für **beide** Bundle IDs (`com.robinzoellner.Binnen-I-be-gone` und `.Extension`) auf iOS und macOS aktiviert sein. Die vier Entitlements-Dateien sind im Xcode-Projekt hinterlegt. Unsigned Simulator-/lokale Test-Builds prüfen die Kompilierung, nicht die reale Safari↔App-Group-Berechtigung; ein manueller Roundtrip auf einem signierten Gerät/Mac bleibt erforderlich.

Tests: `sh scripts/run_tests.sh` führt die 123 Filter-Fälle und Broker-Assertions aus. Die Xcode-Schemes für macOS und iOS enthalten Filter-, DOM- und Settings-XCTest-Fälle.
