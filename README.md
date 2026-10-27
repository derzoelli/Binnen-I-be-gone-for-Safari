# Binnen-I be gone for Safari

Die Safari Web Extension filtert bestimmte Formen gegenderter Schreibweisen direkt auf besuchten Webseiten und stellt den Text in einer konventionellen Form dar. Für Safari auf iPhone, iPad und Mac.

![Plattformen: iOS, iPadOS und macOS](https://img.shields.io/badge/Plattformen-iOS%20%7C%20iPadOS%20%7C%20macOS-lightgrey)
![Safari Web Extension](https://img.shields.io/badge/Safari-Web%20Extension-blue)
[![Lizenz: GPL-3.0](https://img.shields.io/badge/Lizenz-GPL--3.0-green)](LICENSE)

## Was ist Binnen-I be gone?

Binnen-I be gone passt die Darstellung von Texten im Browser an. Beispielsweise wird aus `Mitarbeiter*innen` der Text `Mitarbeiter` und aus `Ärzt:innen` der Text `Ärzte`. Der ursprüngliche Inhalt auf dem Webserver wird nicht verändert.

Die Ersetzung erfolgt regelbasiert und ist keine vollständige Sprachanalyse. Nicht jede Formulierung lässt sich zuverlässig erkennen oder grammatikalisch korrekt umwandeln. Gewöhnliche feminine Formen wie `Mitarbeiterinnen`, `Nutzerin` und `Ärztinnen` bleiben als eigenständige Wörter unverändert.

## Funktionen

- Filterung von Binnen-I, Genderstern, Doppelpunkt, Unterstrich, Schrägstrich- und Klammerformen sowie weiteren von der Engine unterstützten Varianten.
- Zuschaltbare Ersetzung von Doppelformen, etwa `Bürgerinnen und Bürger` → `Bürger`.
- Optionale Partizip-Filterung, etwa `Studierende` → `Studenten`; diese Funktion ist als Beta gekennzeichnet.
- Filtermodi **Überall**, **Blocklist**, **Allowlist** und **Bei Bedarf**.
- Aktivieren und Deaktivieren über die Safari-Symbolleiste; im Bei-Bedarf-Modus filtert ein Klick oder Tippen einmalig die aktuelle Seite.
- Native Einstellungen für iOS, iPadOS und macOS sowie eine Options Page in Safari.
- Lokale Statistik der gefilterten Ausdrücke, aufgeteilt nach Schreibweisen, Doppelformen und Partizipformen; die Zähler lassen sich zurücksetzen.
- Optionaler Zähler im Toolbar-Icon.

## Installation

### App Store

Die App ist kostenlos im [App Store](https://apps.apple.com/de/app/binnen-i-be-gone/id1591455415) erhältlich.

[![Laden im App Store](https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/de-de?size=250x83)](https://apps.apple.com/de/app/binnen-i-be-gone/id1591455415)

### TestFlight

Über [TestFlight](https://testflight.apple.com/join/CVIYsv2P) können verfügbare Beta-Versionen getestet werden. Die Teilnahme hängt von freien Plätzen und einer aktuell verfügbaren Beta ab.

Die veröffentlichte App-Store-Version und eine TestFlight-Beta können vom hier dokumentierten Entwicklungsstand abweichen.

## Verwendung

1. App installieren und die Safari-Erweiterung in den Erweiterungseinstellungen von Safari bzw. den Systemeinstellungen aktivieren. Den Zugriff auf die gewünschten Webseiten erlauben.
2. Safari mit aktivierter Erweiterung einmal öffnen, damit vorhandene Einstellungen übernommen werden können. Anschließend die App öffnen.
3. In der App den gewünschten Filtermodus auswählen: überall, außer auf der Blocklist, nur auf der Allowlist oder nur bei Bedarf.
4. Bei Bedarf die Allowlist bzw. Blocklist anpassen; eine Domain pro Zeile.

In **Bei Bedarf** bleibt die automatische Filterung ausgeschaltet. Ein Klick oder Tippen auf das Erweiterungssymbol filtert die aktuelle Seite. In den anderen Modi schaltet das Symbol die Filterung ein oder aus.

## Datenschutz

Binnen-I be gone enthält keine Tracker und überträgt keine Browser- oder Nutzungsdaten an externe Server. Die Textverarbeitung findet lokal im Browser statt.

Die Statistik wird ausschließlich lokal gespeichert und enthält aggregierte Zähler der gefilterten Ausdrücke sowie den Zeitpunkt des letzten Zurücksetzens bzw. des Beginns der Zählung. In der Statistik werden keine URLs, Seitentitel, Browser-Verläufe oder gefilterten Textinhalte gespeichert.

Einstellungen einschließlich selbst eingetragener Allowlist- und Blocklist-Einträge werden gespeichert. Sie sind keine Aufzeichnung besuchter Webseiten. Die Anzeige des Toolbar-Zählers ist optional; die lokale Statistik ist davon unabhängig.

## Support

App und Sourcecode stehen kostenlos zur Verfügung. Das Projekt wird privat entwickelt und gepflegt. Freiwillige Unterstützung hilft beispielsweise bei den laufenden Kosten des Apple Developer Program und bei der weiteren Entwicklung.

Wenn du das Projekt finanziell unterstützen möchtest, kannst du dies über [PayPal](https://www.paypal.me/robinzoellner) tun.

Eine Unterstützung ist vollständig freiwillig und hat keinen Einfluss auf den Funktionsumfang der App. Eine Spende schaltet keine zusätzlichen Funktionen, digitalen Inhalte oder In-App-Vorteile frei. Alle Funktionen bleiben unabhängig von einer Unterstützung kostenlos verfügbar.

Bei Problemen oder Fragen nutze bitte die [GitHub Issues](https://github.com/derzoelli/Binnen-I-be-gone-for-Safari/issues).

## Entwicklung

### Voraussetzungen

- macOS mit einem aktuellen Xcode einschließlich Icon-Composer-Unterstützung und den iOS-/macOS-SDKs.
- Python 3 für die vorhandenen Hilfs- und Testskripte; die JavaScript-Tests verwenden das unter macOS verfügbare `osascript`.
- Für die Neuerzeugung von PNG-Assets zusätzlich librsvg mit `rsvg-convert`. Die erzeugten Assets sind eingecheckt; ein normaler Xcode-Build benötigt librsvg nicht.

Das Projekt lässt sich über `Binnen-I be gone.xcodeproj` in Xcode öffnen. Die Deployment Targets des aktuellen Quellcodes sind iOS/iPadOS 15 und macOS 12. Signierte Builds benötigen passende App-Group-Entitlements und Provisioning Profiles für App und Erweiterung.

### Tests

Zentraler lokaler Testlauf aus dem Repository-Verzeichnis:

```sh
sh scripts/run_tests.sh
```

Er prüft den gemeinsamen Korpus mit 123 Filterfällen sowie Broker, Options-Modus, öffentliche Testseite und Icon-Assets. Die iOS- und macOS-Schemes enthalten zusätzlich XCTest-Suites für Filter-Engine, DOM-Integration, Einstellungen, Statistik und About/Support; sie können in Xcode mit **⌘U** ausgeführt werden.

Die statische [Testseite](https://derzoelli.github.io/Binnen-I-be-gone-for-Safari/test/) unterscheidet den Engine-Self-Test vom Live-Test mit installierter Safari-Erweiterung. Ihr Quellcode liegt unter [`docs/test`](docs/test); Fixture-Corpus und Engine werden daraus nicht unabhängig ein zweites Mal gepflegt.

### Projektstruktur / Architektur

- `Shared (App)`: gemeinsame SwiftUI-Oberfläche für Einstellungen, Statistik und About/Support.
- `Shared (Extension)`: Safari Web Extension mit DOM-Verarbeitung, Options Page und nativem Nachrichtenhandler; die reine JavaScript-Filter-Engine liegt in `Resources/filter-engine.js`.
- `Shared (Settings)` und `Shared (Statistics)`: gemeinsame Datenmodelle und App-Group-Speicherung für App und Erweiterung.
- `Tests`: XCTest-Suites und zentraler Fixture-Corpus in `Fixtures/gender-cases.json`.

Unsigned Builds und Simulator-Tests ersetzen keinen signierten Safari-/App-Group-Roundtrip auf Mac oder Gerät.

Vor TestFlight bzw. einer Veröffentlichung muss der neue README-Abschnitt **Support** auch auf dem öffentlichen Default-/Release-Branch vorhanden sein. Der App-Link zeigt bewusst dauerhaft auf die [Projektseite mit `#support`](https://github.com/derzoelli/Binnen-I-be-gone-for-Safari#support), nicht auf einen Entwicklungsbranch.

## Mitwirken

Fehlerberichte, konkrete Textbeispiele und Pull Requests sind willkommen. Bitte gib bei Filterproblemen den Eingabetext, das erwartete Ergebnis, die aktiven Filteroptionen sowie Safari- und Betriebssystemversion an. Entferne dabei persönliche oder vertrauliche Inhalte.

Neue Ersetzungsregeln sollten durch positive Fälle und False-Positive-Tests im gemeinsamen Fixture-Corpus abgesichert werden. Bitte führe vor einem Pull Request die vorhandenen Tests aus.

## Credits

Die Safari-Version basiert ursprünglich auf der Arbeit der Entwickler der Chrome- und Firefox-Version und wurde mit deren freundlicher Genehmigung für Safari portiert. Bitte richte Probleme und Anregungen zur Safari-Version an dieses Repository, nicht an die Entwickler der ursprünglichen Versionen.

## Lizenz

Das Projekt steht unter der [GNU General Public License v3.0 (GPL-3.0)](LICENSE).
