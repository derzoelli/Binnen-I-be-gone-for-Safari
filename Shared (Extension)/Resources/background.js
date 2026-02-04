var settings = "";
let browserAction;

if (chrome.runtime.getManifest().manifest_version == 3) {
	browserAction = chrome.action; //Chrome manifest v3
}
else {
	browserAction = chrome.browserAction; //Firefox manifest v2
}

async function updateSettings() {
	chrome.storage.sync.get(function(res) {
		//Standardwerte bei der Initialisierung
		if (res.aktiv === undefined || res.invertiert === undefined || res.counter === undefined || res.doppelformen === undefined || res.partizip === undefined || res.skip_topic === undefined || res.filterliste === undefined || res.allowlist === undefined || res.allowlist == "undefined" || res.blocklist === undefined || res.blocklist == "undefined") {
				if (res.aktiv === undefined) {
						chrome.storage.sync.set({
								aktiv: true
						});
				}
				if (res.counter === undefined) {
						chrome.storage.sync.set({
								counter: false
						});
				}
				if (res.invertiert === undefined) {
						chrome.storage.sync.set({
								invertiert: false
						});
				}
				if (res.doppelformen === undefined) {
						chrome.storage.sync.set({
								doppelformen: true
						});
				}
				if (res.partizip === undefined) {
						chrome.storage.sync.set({
								partizip: false
						});
				}
				if (res.skip_topic === undefined) {
						chrome.storage.sync.set({
								skip_topic: false
						});
				}
				if (res.filterliste === undefined) {
						chrome.storage.sync.set({
								filterliste: "Blocklist"
						});
				}
				if (res.allowlist === undefined || res.allowlist == "undefined") {
						chrome.storage.sync.set({
								allowlist: ".gv.at\n.ac.at\nderstandard.at\ndiestandard.at"
						});
				}
				if (res.blocklist === undefined || res.blocklist == "undefined") {
						chrome.storage.sync.set({
								blocklist: "stackoverflow.com\ngithub.com\nhttps://developer"
						});
				}

				chrome.storage.sync.get(function(resagain) {
						settings = resagain;
				});
		} else {
				settings = res;
		}
		updateIcon();
	});
}

function handleMessage(request, sender, sendResponse) {
    if (request.type == "count" && request.countBinnenIreplacements + request.countDoppelformreplacements + request.countPartizipreplacements > 0) {
        var displayednumber = request.countBinnenIreplacements + request.countDoppelformreplacements + request.countPartizipreplacements;
        browserAction.setBadgeText({
            text: "" + displayednumber + "",
            tabId: sender.tab.id
        });
        /* Folgende Anzeige bereitet Probleme im Overflow-Menü von Firefox*/
        if (!settings.doppelformen && !settings.partizip) {
            browserAction.setTitle({
                title: "Filterung aktiv\n\nGefilterte Elemente auf dieser Seite\nBinnen-Is: " + request.countBinnenIreplacements,
                tabId: sender.tab.id
            });
        } else if (settings.doppelformen && !settings.partizip) {
            browserAction.setTitle({
                title: "Filterung aktiv\n\nGefilterte Elemente auf dieser Seite\nBinnen-Is: " + request.countBinnenIreplacements + "\nDoppelformen: " + request.countDoppelformreplacements,
                tabId: sender.tab.id
            });
        } else if (!settings.doppelformen && settings.partizip) {
            browserAction.setTitle({
                title: "Filterung aktiv\n\nGefilterte Elemente auf dieser Seite\nBinnen-Is: " + request.countBinnenIreplacements + "\nPartizipformen: " + request.countPartizipreplacements,
                tabId: sender.tab.id
            });
        } else if (settings.doppelformen && settings.partizip) {
            browserAction.setTitle({
                title: "Filterung aktiv\n\nGefilterte Elemente auf dieser Seite\nBinnen-Is: " + request.countBinnenIreplacements + "\nDoppelformen: " + request.countDoppelformreplacements + "\nPartizipformen: " + request.countPartizipreplacements,
                tabId: sender.tab.id
            });
        }
    }
}

function sendMessageToTabs(tabs) {
    for (let tab of tabs) {
        chrome.tabs.sendMessage(
            tab.id, {
                type: "ondemand"
            });
    }
}

function updateIcon() {
    chrome.storage.sync.get(function(res) {
        if (res.filterliste == "Bei Bedarf") {
            browserAction.setTitle({
                title: 'Klick filtert Binnen-Is auf dieser Seite'
            });
            if (res.invertiert !== true) {
                browserAction.setIcon({
                    path: 'images/iconOff.png'
                });
            } else if (res.invertiert === true) {
                browserAction.setIcon({
                    path: 'images/iconOffi.png'
                });
            }
        } else if (res.aktiv === true) {
            browserAction.setTitle({
                title: 'Filterung aktiv'
            });
            if (res.invertiert !== true) {
                browserAction.setIcon({
                    path: 'images/iconOn.png'
                });
            } else if (res.invertiert === true) {
                browserAction.setIcon({
                    path: 'images/iconOni.png'
                });
            }
        } else {
            browserAction.setTitle({
                title: 'Filterung deaktiviert'
            });
            if (res.invertiert !== true) {
                browserAction.setIcon({
                    path: 'images/iconOff.png'
                });
            } else if (res.invertiert === true) {
                browserAction.setIcon({
                    path: 'images/iconOffi.png'
                });
            }
        }
    });
}

function ButtonClickHandler() {
    chrome.storage.sync.get(function(res) {
        if (res.filterliste == "Bei Bedarf") {
            chrome.tabs.query({
                currentWindow: true,
                active: true
            }, function(tabs) {
                sendMessageToTabs(tabs);
                if (res.invertiert !== true) {
                    browserAction.setIcon({
                        path: 'images/iconOn.png',
                        tabId: tabs[0].id
                    });
                } else if (res.invertiert === true) {
                    browserAction.setIcon({
                        path: 'images/iconOni.png',
                        tabId: tabs[0].id
                    });
                }
            });
        } else if (res.aktiv === true) {
            chrome.storage.sync.set({
                aktiv: false
            });
        } else {
            chrome.storage.sync.set({
                aktiv: true
            });
            settings.aktiv = true;
            chrome.tabs.query({
                currentWindow: true,
                active: true
            }, function(tabs) {
                sendMessageToTabs(tabs);
            });
        }
    });
}

updateSettings();

//Kommunikation mit Content-Script
chrome.runtime.onMessage.addListener(handleMessage);

//Ein/aus bei Toolbar Klick
browserAction.onClicked.addListener(ButtonClickHandler);

//Icon aktualisieren bei Änderungen in Optionen
chrome.storage.onChanged.addListener(updateSettings);