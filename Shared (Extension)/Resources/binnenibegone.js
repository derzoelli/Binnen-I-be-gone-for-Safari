//v3.1.1
var redundancy;
var skip_topic;
var partizip;
var allowliststate;
var allowliststring;
var blockliststate;
var blockliststring;
var counter;
var counterSent = 0;
var settings;
var nodes;

var replacementsb = 0;
var replacementsd = 0;
var replacementsp = 0;

function textNodesUnder(el) {
    var n, a = [],
        walk = document.createTreeWalker(
            el,
            NodeFilter.SHOW_TEXT, {
                acceptNode: function(node) {
                    //Nodes mit weniger als 5 Zeichen nicht filtern
                    if (node.textContent.length < 5) {
                        return NodeFilter.FILTER_REJECT;
                    } else {
                        var isUntreatedElement = node.parentNode ? (node.parentNode instanceof HTMLInputElement || node.parentNode instanceof HTMLTextAreaElement || node.parentNode instanceof HTMLScriptElement || node.parentNode instanceof HTMLStyleElement || node.parentNode.nodeName == "CODE" || node.parentNode.nodeName == "NOSCRIPT") : false;
                        var isDivTextbox = (document.activeElement.getAttribute("role") == "textbox" || document.activeElement.getAttribute("contenteditable") == "true") && document.activeElement.contains(node);

                        //Eingabeelemente, <script>, <style>, <code>-Tags nicht filtern
                        if (isUntreatedElement || isDivTextbox) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        //Nur Nodes erfassen, deren Inhalt ungefähr zur späteren Verarbeitung passt
                        else if (/\b(und|oder|bzw)|[a-zA-ZäöüßÄÖÜ][\/\*.&_\(]-?[a-zA-ZäïöüßÄÏÖÜ]|[a-zäöüß\(_\*:·•\.'’][iIïÏ][nN]|nE\b|r[MS]\b|e[NR]\b|em?[\/\*.:&_\(]-?e?r\b|[a-z]ende|mensch/.test(node.textContent)) {
                            return NodeFilter.FILTER_ACCEPT;
                        }
                    }
                }
            },
            false);
    while (n = walk.nextNode()) a.push(n);
    return a;
}

var observer;

async function filter(mtype) {
	await chrome.storage.sync.get(function(res) {
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

    if (!settings.aktiv && settings.filterliste !== "Bei Bedarf" || settings.filterliste == "Bei Bedarf" && mtype !== "ondemand") return;

    counter = settings.counter;
    redundancy = settings.doppelformen;
    skip_topic = settings.skip_topic;
    partizip = settings.partizip;
    allowliststate = settings.filterliste == "Allowlist";
    allowliststring = settings.allowlist.replace(/(\r\n|\n|\r)/gm, "|");
    blockliststate = settings.filterliste == "Blocklist";
    blockliststring = settings.blocklist.replace(/(\r\n|\n|\r)/gm, "|");

    if (!allowliststate && !blockliststate || allowliststate && RegExp(allowliststring).test(document.URL) || blockliststate && !blockliststring || blockliststate && !RegExp(blockliststring).test(document.URL)){
			//Entfernen bei erstem Laden der Seite
			entferneInitial(nodes, mtype);

			//Entfernen bei Seitenänderungen
			if (!observer) {
				try {
					var observer = new MutationObserver(function(mutations) {
						var insertedNodes = [];
						mutations.forEach(function(mutation) {
							for (var i = 0; i < mutation.addedNodes.length; i++) {
								insertedNodes = insertedNodes.concat(textNodesUnder(mutation.addedNodes[i]));
							}
						});
						entferneInserted(insertedNodes, mtype);
					});
					observer.observe(document, {
						childList: true,
						subtree: true,
						attributes: false,
						characterData: false
					});
				} catch (e) {
					console.error(e);
					chrome.runtime.sendMessage({
						action: 'error',
						page: document.location.hostname,
						source: 'binnenibegone.js',
						error: e
					});
				}
			}
		}
	});
}

filter();

//On-demand Filterung
chrome.runtime.onMessage.addListener(message => {
    filter(message.type);
});

function sendCounttoBackgroundScript(e) {
    chrome.runtime.sendMessage({
        countBinnenIreplacements: replacementsb,
        countDoppelformreplacements: replacementsd,
        countPartizipreplacements: replacementsp,
        type: "count"
    });
}

function entferneInserted(nodes, mtype) {
    if (!skip_topic || (skip_topic && mtype=="ondemand") || (skip_topic && !/Binnen-I/.test(document.body.textContent))) {
            if (redundancy) {
                entferneDoppelformen(nodes);
            }
            if (partizip) {
                entfernePartizip(nodes);
            }
            entferneBinnenIs(nodes);
            if (counter && counter > counterSent) {
								counterSent = counter;
                sendCounttoBackgroundScript();
            }
    }
}

function entferneInitial(nodes, mtype) {
    if (!skip_topic || (skip_topic && mtype=="ondemand") || (skip_topic && !/Binnen-I/.test(document.body.textContent))) {
            var probeBinnenI = /[a-zäöüß]{2}((\/-?|_|\*|:|·|•|\.|'|’| und -)?In|(\/-?|_|\*|:|·|•|\.|'|’| und -)in(n[\*|\.]en)?|INNen|[ïÏ]n|\([Ii]n+(en\)|\)en)?|\/inne?)(?!(\w{1,2}\b)|[A-Z]|[cf]o|t|act|clu|dex|di|fin|line|ner|put|sert|stall|stan|stru|val|vent|v?it|voice)|[A-ZÄÖÜß]{3}(\/-?|_|\*|:|·|•|\.|'|’)IN[\b|(NEN)]|[a-zäöüß]{2}\*nnen|[A-ZÄÖÜß]{2}\*NNEN|(der|die|dessen|ein|sie|ihr|sein|zu[rm]|jede|frau|man|mensch|eR\b|em?[\/\*.:&_\(])/.test(document.body.textContent);
            var probeRedundancy;
            var probePartizip;

            if (redundancy) {
                probeRedundancy = /\b(und|oder|bzw)\b/.test(document.body.textContent);
            }
            if (partizip) {
                probePartizip = /[a-z]ende/.test(document.body.textContent);
            }

            if (probeBinnenI || redundancy && probeRedundancy || partizip && probePartizip) {
                nodes = textNodesUnder(document);
                if (redundancy && probeRedundancy) {
                    entferneDoppelformen(nodes);
                }
                if (partizip && probePartizip) {
                    entfernePartizip(nodes);
                }
                if (probeBinnenI) {
                    entferneBinnenIs(nodes);
                }
            }
            if (counter && counter > counterSent) {
								counterSent = counter;
                sendCounttoBackgroundScript();
            }

    }
}

function entfernePartizip(nodes) {
    var textnodes = nodes;
    for (var i = 0; i < textnodes.length; i++) {
        var node = textnodes[i];
        var s = node.data;

        if (/(ier|arbeit|orsch|schaff|fahr|wohn|nehm|geb|verdien|stell)ende/.test(node.nodeValue)) {
			s = s.replace(/der Studierende\b/g, function() {
                replacementsp++;
                return "der Student";
            });
			s = s.replace(/Studierende(\*?[rn])?/g, function() {
                replacementsp++;
                return "Studenten";
            });
            s = s.replace(/Dozierende(\*?[rn])?/g, function() {
                replacementsp++;
                return "Dozenten";
            });
            s = s.replace(/Assistierende(\*?[rn])?/g, function() {
                replacementsp++;
                return "Assistenten";
            });
            s = s.replace(/Mitarbeitende(\*?[rn])?/g, function() {
                replacementsp++;
                return "Mitarbeiter";
            });
            s = s.replace(/Forschende(\*?[rn])?/g, function() {
                replacementsp++;
                return "Forscher";
            });
			s = s.replace(/Kunstschaffende(\*?[rn])?/g, function() {
                replacementsp++;
                return "Künstler";
            });
			s = s.replace(/Musikschaffende(\*?[rn])?/g, function() {
                replacementsp++;
                return "Musiker";
            });
			s = s.replace(/([A-Z]+[a-zäöü]+)fahrende(\*?[rn])?/g, function(match, p1) {
                replacementsp++;
                return p1 + "fahrer";
            });
			s = s.replace(/([A-Z]+[a-zäöü]+)wohnende(\*?[rn])?/g, function(match, p1) {
                replacementsp++;
                return p1 + "wohner";
            });
			s = s.replace(/(Unter|Arbeit|Teil|Ver|Über)nehmende(\*?[rn])?/g, function(match, p1) {
                replacementsp++;
                return p1 + "nehmer";
            });
			s = s.replace(/(Arbeit|Über)gebende(\*?[rn])?/g, function(match, p1) {
                replacementsp++;
                return p1 + "geber";
            });
			s = s.replace(/([A-Z]+[a-zäöü]+)verdienende(\*?[rn])?/g, function(match, p1) {
                replacementsp++;
                return p1 + "verdiener";
            });
			s = s.replace(/([A-Z]+[a-zäöü]+)stellende(\*?[rn])?/g, function(match, p1) {
                replacementsp++;
                return p1 + "steller";
            });
        }

        if (node.data !== s) {
            node.data = s;
        }
    }
}

function entferneDoppelformen(nodes) {
    var textnodes = nodes;
    for (var i = 0; i < textnodes.length; i++) {
        var node = textnodes[i];
        var s = node.data;

        if (/\b(und|oder|bzw)|[a-zA-ZäöüßÄÖÜ\u00AD\u200B]{3,}[\/\*&_\(][a-zA-ZäöüßÄÖÜ\u00AD\u200B]/.test(node.nodeValue)) {
			s = s.replace(/[\u00AD\u200B]/g, ""); //entfernt soft hyphens
			
            s = s.replace(/\b((von |für |mit )?((d|jed|ein|ihr|zum|sein)(e[rn]?|ie) )?([a-zäöüß]{4,20} )?)([a-zäöüß]{3,})innen( und | oder | & | bzw\.? |[\/\*_\(-])\2?((d|jed|ein|ihr|zum|sein)(e[rmns]?|ie) )?\6?(\7(e?[nrs]?))\b(( oder )([a-zäöüß]{4,20} )?((von |für |mit )?(einer? )([a-zäöüß]{4,20} )?)\7in( und | & )\2?(eine[mns]? )?\6?(\7(e?[nrs]?))\b)?/ig, function(match, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12) {
                replacementsd++;
                if (p1) {
                    return p1 + p12;
                } else {
                    return p12;
                }
            }); //Bürgerinnen und Bürger (extra case: zwei Bürgerinnen oder zwei Bürger oder eine Bürgerin und ein Bürger)
            s = s.replace(/\b(von |für |mit |als )?(((zu )?d|jed|ein|ihr|zur|sein)(e|er|ie) )?(([a-zäöüß]{4,20}[enr]) )?([a-zäöüß]{3,})(en?|in)( und | oder | & | bzw\.? |[\/\*_\(-])(\1|vom )?((((zu )?d|jed|ein|ihr|zum|sein)(e[nrms])? )?(\7[nrms]? )?(\8(e?(s|n|r)?)))\b/ig, function(match, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15, p16, p17, p18) {
                replacementsd++;
                if (p1) {
					if (p6 && !p17){
						return p1 + p13 + p6 +p18;
					} else{
						return p1 + p12;
					}
                } else if (p6 && p13 && !p17){
					return p13 + p6 +p18;
				}	else if (p8 + p9 == p12){
                    replacementsd--;
					return match;
				}	else {
                    return p12;
                }
            }); //die Bürgerin und der Bürger
            s = s.replace(/\b(von |für |mit |als )?(((zu )?d|jed|ein|ihr|sein)(e|er|ie) |zur )?(([a-zäöüß]{4,20}[enr]) )?([a-zäöüß]{4,20})?(ärztin|anwältin|bäue?rin|rätin|fränkin|schwäbin|schwägerin)( und | oder | & | bzw\.? |[\/\*_\(-])(\1|vom )?((((zu )?d|jed|ein|ihr|zum|sein)(e[nrms])? )?(\7[nrms]? )?(\8(e?(s|n|r)?))(arzt|anwalt|bauer|rat|frank|schwab|schwager)(e(n|s)?)?)\b/ig, function(match, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12) {
                replacementsd++;
                if (p1) {
                    return p1 + p12;
                } else {
                    return p12;
                }
            }); //unregelmäßiger Singular: die Ärztin und der Arzt
            s = s.replace(/\b((von |für |mit |als )?(((zu )?d|jed|ein|ihr|zur|sein)(e|er|ie) )?((zur|[a-zäöüß]{4,20}[enr]) ))?([a-zäöüß]{4,20})?((bäue?r|jüd|fränk|schwäb)innen)( und | oder | & | bzw\.? |[\/\*_\(-])(\1|vom )?((((zu )?d|jed|ein|ihr|zum|sein)(e[nrms])? )?(\7[nrms]? )?(\8(e?(s|n|r)?))(bauer|jude|franke|schwabe)([ns])?)\b/ig, function(match, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14) {
                replacementsd++;
                if (p1) {
                    return p1 + p14;
                } else {
                    return p14;
                }
            }); //unregelmäßiger Plural: Bäuerinnen und Bauern
            s = s.replace(/\b((von |für |mit |als )?((d|jed|ein|ihr|zum|sein)(e[rnms]?|ie) )?([a-zäöüß]{4,20}[enr] )?(([a-zäöüß]{3,})(e?(n|s|r)?)))( und | oder | & | bzw\.? |[\/\*_\(-])(\2|von der )?(((von |zu )?d|jed|ein|ihr|zur|sein)(e[rn]?|ie) )?\6?(\8(in(nen)?|en?))\b/ig, function(match, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15, p16, p17) {
                if (p7 == p17) {
                    return match;
                } else {
                    replacementsd++;
					return p1;
                }
            }); //Bürger und Bürgerinnen, Bürger und Bürgerin
            s = s.replace(/\b((von |für |mit |als )?((d|jed|ein|ihr|sein)(e[rnms]?|ie) |zum )?([a-zäöüß]{4,20}[enr] )?([a-zäöüß]{4,20})?(arzt|anwalt|bauer|rat|frank|schwab|schwager)(e?(s)?))( und | oder | & | bzw\.? |[\/\*_\(-])(\2|von der )?(((von |zu )?d|jed|ein|ihr|sein)(e[rn]?|ie) |zur )?\6?\7(ärzt|anwält|bäue?rin|rät|fränk|schwäb|schwäger)(in(nen)?)\b/ig, function(match, p1) {
                replacementsd++;
                return p1;
            }); //unregelmäßiger Singular: der Arzt und die Ärztin
            s = s.replace(/\b((von |für |mit |als )?((d|jed|ein|ihr|zum|sein)(e[rnms]?|ie) )?([a-zäöüß]{4,20}[enr] )?([a-zäöüß]{4,20})?(bauer|jud|frank|schwab)(e?n)?)( und | oder | & | bzw\.? |[\/\*_\(-])(\2|von der )?(((von |zu )?d|jed|ein|ihr|zur|sein)(e[rn]?|ie) )?\6?\7(bäue?r|jüd|fränk|schwäb)(in(nen)?)\b/ig, function(match, p1) {
                replacementsd++;
                return p1;
            });//unregelmäßiger Plural: Bauern und Bäuerinnen
            s = s.replace(/\b([A-Z][a-zäöüß]{2,})([a-zäöüß]{2,})innen( und | oder | & | bzw\.? )-(\2(e?[ns]?)?)\b/g, function(match, p1, p2, p3, p4) {
                replacementsd++;
                return p1 + p4;
            }); //Bürgervertreterinnen und -vertreter
			s = s.replace(/\b(([A-Z][a-zäöüß]{2,})([a-zäöüß]{2,})(e?[ns]?)?)( und | oder | & | bzw\.? )-(\3innen)/g, function(match, p1, p2, p3, p4, p5, p6) {
                replacementsd++;
                return p1;
            }); //Bürgervertreter und -vertreterinnen
			s = s.replace(/\b([A-Z][a-zäöüß]{2,}chefs)( und | oder | & | bzw\.? )-chefinnen\b/g, function(match, p1) {
                replacementsd++;
                return p1;
            }); //Länderchefs und -chefinnen
        }

        if (node.data !== s) {
            node.data = s;
        }
    }
}

function entferneBinnenIs(nodes) {
    var textnodes = nodes;
    for (var i = 0; i < textnodes.length; i++) {
        var node = textnodes[i];
        var s = node.data;

        if (/[a-zA-ZäöüßÄÖÜ]([\/\*.:&_\(]-?| oder | bzw\.? )[a-zA-ZäöüßÄÖÜ]/.test(node.nodeValue) && /der|die|dessen|ein|sie|ih[mr]|sein|zu[rm]|jede|eR\b|em?[\/\*.:&_\(]-?e?r\b|em?\(e?r\)\b/.test(node.nodeValue)) {

            //Stuff
            if (/der|die|dessen|ein|sie|ih[rmn]|zu[rm]|jede/i.test(s)) {
                s = s.replace(/\b(d)(ie[\/\*:_\(-]+der|er[\/\*:_\(-]+die)\b/ig, function(match, p1) {
                    replacementsb++;
                    return p1 + "er";
                });
                s = s.replace(/\b(d)(en[\/\*:_\(-]+die|ie[\/\*:_\(-]+den)\b/ig, function(match, p1) {
                    replacementsb++;
                    return p1 + "en";
                });
                s = s.replace(/\b(d)(es[\/\*:_\(-]+der|er[\/\*:_\(-]+des)\b/ig, function(match, p1) {
                    replacementsb++;
                    return p1 + "es";
                });
                s = s.replace(/\b(d)(er[\/\*:_\(-]+dem|em[\/\*:_\(-]+der)\b/ig, function(match, p1) {
                    replacementsb++;
                    return p1 + "em";
                });
                s = s.replace(/\b(d)(eren[\/\*:_\(-]dessen|essen[\/\*:_\(-]deren)\b/ig, function(match, p1) {
                    replacementsb++;
                    return p1 + "essen";
                });
                s = s.replace(/\bdiese[r]?[\/\*:_\(-](diese[rnms])|(diese[rnms])[\/\*:_\(-]diese[r]?\b/ig, function(match, p1, p2) {
                    replacementsb++;
                    if (p1) {
                        return p1;
                    } else if (p2) {
                        return p2;
                    }
                });
                s = s.replace(/\b([DMSdms]?[Ee])in([\/\*:_\(-]+e |\(e\) |E )/g, function(match, p1) {
                    replacementsb++;
                    return p1 + "in ";
                });
                s = s.replace(/\b([DMSdms]?[Ee])ine([\/\*:_\(-]+r |\(r\) |R )/g, function(match, p1) {
                    replacementsb++;
                    return p1 + "iner ";
                });
                s = s.replace(/\b([DMSdms]?[Ee])iner([\/\*:_\(-]+s |\(S\) |S )/g, function(match, p1) {
                    replacementsb++;
                    return p1 + "ines ";
                });
                s = s.replace(/\b([DMSdms]?[Ee])ines([\/\*:_\(-]+r |\(R\) |R )/g, function(match, p1) {
                    replacementsb++;
                    return p1 + "ines ";
                });
                s = s.replace(/\b([DMSdms]?[Ee])iner([\/\*:_\(-]+m |\(m\) |M )/g, function(match, p1) {
                    replacementsb++;
                    return p1 + "inem ";
                });
                s = s.replace(/\b([DMSdms]?[Ee])inem([\/\*:_\(-]+r |\(r\) |R )/g, function(match, p1) {
                    replacementsb++;
                    return p1 + "inem ";
                });
                s = s.replace(/\b([DMSdms]?[Ee])ine([\/\*:_\(-]+n |\(n\) |N )/g, function(match, p1) {
                    replacementsb++;
                    return p1 + "inen ";
                });
                s = s.replace(/\bsie([\/\*:_\(-]| oder | bzw\.? )er|er([\/\*:_\(-]| oder | bzw\.? )sie\b/g, function() {
                    replacementsb++;
                    return "er";
                });
                s = s.replace(/\bSie([\/\*:_\(-]| oder | bzw\.? )[Ee]r|Er([\/\*:_\(-]| oder | bzw\.? )[Ss]ie\b/g, function() {
                    replacementsb++;
                    return "Er";
                });
                s = s.replace(/\b(i)(hr([\/\*:_\(-]| oder | bzw\.? )(ih)?m|hm([\/\*:_\(-]| oder | bzw\.? )(ih)?r)\b/ig, function(match, p1) {
                    replacementsb++;
                    return p1 + "hm";
                });
                s = s.replace(/\bsie([\/\*:_\(-]| oder | bzw\.? )ihn|ihn([\/\*:_\(-]| oder | bzw\.? )ie\b/g, function() {
                    replacementsb++;
                    return "ihn";
                });
                s = s.replace(/\bSie([\/\*:_\(-]| oder | bzw\.? )[Ii]hn|Ihn([\/\*:_\(-]| oder | bzw\.? )[Ss]ie\b/g, function() {
                    replacementsb++;
                    return "Ihn";
                });
                s = s.replace(/\bihr[\/\*:_\(-]e\b/ig, function() {
                    replacementsb++;
                    return "ihr";
                }); //ihr*e Partner*in
				s = s.replace(/\bihre[\/\*:_\(-]n\b/ig, function() {
                    replacementsb++;
                    return "ihren";
                }); //ihr*e Partner*in
                s = s.replace(/\bihre?[rnms]?([\/\*:_\(-]| oder | bzw\.? )(seine?[rnms]?)|(seine?[rnms]?)([\/\*:_\(-]| oder | bzw\.? )ihre?[rnms]?\b/ig, function(match, p1, p2, p3) {
                    replacementsb++;
                    if (p2) {
                        return p2;
                    } else if (p3) {
                        return p3;
                    }
                });
                s = s.replace(/\b(z)(um[\/\*:_\(-](zu)?r|ur[\/\*:_\(-](zu)?m)\b/ig, function(match, p1) {
                    replacementsb++;
                    return p1 + "um";
                });
                s = s.replace(/\jede[rnms]?[\/\*:_\(-](jede[rnms]?)\b/ig, function(match, p1) {
                    replacementsb++;
                    return p1;
                });
            }

            //extra Stuff				
            if (/e[NR]\b|em?[\/\*:_\(-]{1,2}e?[nr]\b|em?\(e?[nr]\)\b/.test(s)) {
                s = s.replace(/e\(r\)|e[\/\*:_\(-]+r|eR\b/g, function() {
                    replacementsb++;
                    return "er";
                }); //jede/r,jede(r),jedeR,
                s = s.replace(/em\(e?r\)|em[\/\*:_\(-]+r\b/g, function() {
                    replacementsb++;
                    return "em";
                }); //jedem/r
                s = s.replace(/er\(e?s\)|es[\/\*:_\(-]+r\b/g, function() {
                    replacementsb++;
                    return "es";
                }); //jedes/r
				s = s.replace(/e\(n\)|e[\/\*:_\(-]+n\b/g, function() {
                    replacementsb++;
                    return "en";
                }); //jede/n
            }
        }
		
		//man
		if (/(frau|man|mensch)/.test(s)) {
			s = s.replace(/\b(frau|man+|mensch)+[\/\*:_\(-](frau|man+|mensch|[\/\*:_\(-])*/g, function() {
				replacementsb++;
				return "man";
			});
			s = s.replace(/\b(je|nie)menschd?/ig, function(match, p1) {
				replacementsb++;
				return p1 + "mand";
			});
		}

        if (/[a-zäöüß\u00AD\u200B]{2}((\/-?|_|\*|:|·|•|\.|'|’| und -)?In|(\/-?|_|\*|:|·|•|\.|'|’| und -)in(n[\*|\.]en)?|INNen|[ïÏ]n|\([Ii]n+(en\)|\)en)?|\/inne?)(?!(\w{1,2}\b)|[A-Z]|[cf]o|te[gr]|act|clu|dex|di|fin|line|ner|put|sert|stall|stan|stru|val|vent|v?it|voice)|[A-ZÄÖÜß\u00AD\u200B]{3}(\/-?|_|\*|:|·|•|\.|'|’)IN[\b|(NEN)]|[a-zäöüß]{2}\*nnen|[A-ZÄÖÜß]{2}\*NNEN/.test(node.nodeValue)) {
			s = s.replace(/[\u00AD\u200B]/g, ""); //entfernt soft hyphens
			
            //Prüfung auf Ersetzung
            if (/[a-zäöüß](\/-?|_|\*|:|·|•|\.|'|’| und -)in\b/i.test(s) || /[a-zäöüß](\/-?|_|\*|:|·|•|\.|'|’| und -)inn(\*|\.|\))?en/i.test(s)  || /[a-zäöüß]\*nnen/i.test(s) || /[a-zäöüß](\(|\/)in/i.test(s) || /[a-zäöüß]INNen/.test(s) || /[a-zäöüß]ïn/i.test(s)) {
                s = s.replace(/(\/-?|_|\*|:|·|•|\.|'|’)inn(\*|\.|\/)?e(\*|\.|\/)?n/ig, "Innen"); //Schüler/innen
                s = s.replace(/([a-zäöüß])\(inn(en\)|\)en)/ig, "$1Innen"); //Schüler(innen)
                s = s.replace(/([a-zäöüß])INNen/g, "$1Innen"); //SchülerINNen
				s = s.replace(/([a-zäöüß])ïnnen/ig, "$1Innen"); //Schülerïnnen
				s = s.replace(/([a-zäöüß])\*nnen/ig, "$1Innen"); //Schüler*nnen
                s = s.replace(/ und -innen\b/ig, function() {
                    replacementsb++;
                    return "";
                }); //und -innen
                s = s.replace(/(\/-?|_|\*|:|·|•|'|’)in\b/ig, "In"); //Schüler/in
                s = s.replace(/([a-zäöüß])\(in\)/ig, "$1In"); //Schüler(in)
				s = s.replace(/([a-zäöüß][bcdfghjklmnpqrstvwxyzß])ïn\b/ig, "$1In"); //Schülerïn
				
				if (/[a-zäöüß]\.in\b/i.test(s) && !/((http|https):\/\/)(www.)?[a-zA-Z0-9\.]{2,254}.in\b/i.test(s)) {
				    s = s.replace(/\.in\b/ig, "In"); //Schüler.in
				}
            }

            //Plural
            if (/[a-zäöüß]Innen/i.test(s)) {
                //Prüfung auf Sonderfälle
                if (/(chef|fan|gött|verbesser|äue?r|äs)innen/i.test(s)) {
                    s = s.replace(/(C|c)hefInnen/g, function(match, p1) {
                        replacementsb++;
                        return p1 + "hefs";
                    });
                    s = s.replace(/(F|f)anInnen/g, function(match, p1) {
                        replacementsb++;
                        return p1 + "ans";
                    });
                    s = s.replace(/([Gg]ött|verbesser)(?=Innen)/g, function(match, p1) {
                        replacementsb++;
                        return p1 + "er";
                    });
                    s = s.replace(/äue?rInnen/g, function() {
                        replacementsb++;
                        return "auern";
                    });
                    s = s.replace(/äsInnen/g, function() {
                        replacementsb++;
                        return "asen";
                    });
                }
                s = s.replace(/\b(([Dd]en|[Aa]us|[Aa]ußer|[Bb]ei|[Dd]ank|[Gg]egenüber|[Ll]aut|[Mm]it(samt)?|[Nn]ach|[Ss]amt|[Vv]on|[Uu]nter|[Zz]u|[Ww]egen|[MmSsDd]?einen) ([ID]?[a-zäöüß]+en |[0-9.,]+ )?[A-ZÄÖÜ][a-zäöüß]+)erInnen\b/g, function(match, p1) {
                    replacementsb++;
                    return p1 + "ern";
                }); //unregelmäßiger Dativ bei Wörtern auf ...erInnen
                s = s.replace(/(er?|ER?)Innen/g, function(match, p1) {
                    replacementsb++;
                    return p1;
                });
				s = s.replace(/(bar)Innen/g, function(match, p1) {
                    replacementsb++;
                    return p1 + "n";
                });
                s = s.replace(/([Aa]nwält|[Ää]rzt|e[iu]nd|rät|amt|äst|würf|äus|[ai(eu)]r|irt)Innen/g, function(match, p1) {
                    replacementsb++;
                    return p1 + "e";
                });
                s = s.replace(/([nrtsmdfghpbklvw])Innen/g, function(match, p1) {
                    replacementsb++;
                    return p1 + "en";
                });
				s = s.replace(/([NRTSMDFGHPBKLVW])Innen/g, function(match, p1) {
                    replacementsb++;
                    return p1 + "EN";
                });
            }

            //Singular			
            if (/[a-zäöüß]In/.test(s) && !/([Pp]lug|Log|[Aa]dd|Linked)In\b/.test(s)) {
                //Prüfung auf Sonderfälle
                if (/amtIn|stIn\B|verbesser(?=In)/.test(s)) {
                    s = s.replace(/verbesser(?=In)/g, function() {
                        replacementsb++;
                        return "verbesserer";
                    });
                    s = s.replace(/amtIn/g, function() {
                        replacementsb++;
                        return "amter";
                    });
                    s = s.replace(/stIn\B(?!(\w{1,2}\b)|[A-Z]|[cf]o|te[gr]|act|clu|dex|di|fin|line|ner|put|sert|stall|stan|stru|val|vent|v?it|voice)/g, function() {
                        replacementsb++;
                        return "sten";
                    }); //JournalistInfrage
                }
                //Prüfung auf Umlaute
                if (/[äöüÄÖÜ][a-z]{0,3}In/.test(s)) {
                    s = s.replace(/ä(?=s(t)?In|tIn|ltIn|rztIn)/g, function() {
                        replacementsb++;
                        return "a";
                    });
                    s = s.replace(/ÄrztIn/g, function() {
                        replacementsb++;
                        return "Arzt";
                    });
                    s = s.replace(/ö(?=ttIn|chIn)/g, function() {
                        replacementsb++;
                        return "o";
                    });
                    s = s.replace(/ü(?=rfIn)/g, function() {
                        replacementsb++;
                        return "u";
                    });
                    s = s.replace(/ündIn/g, function() {
                        replacementsb++;
                        return "und";
                    });
                    s = s.replace(/äue?rIn/g, function() {
                        replacementsb++;
                        return "auer";
                    });
                }
                s = s.replace(/\b(([Dd]en|[Aa]us|[Aa]ußer|[Bb]ei|[Dd]ank|[Gg]egenüber|[Ll]aut|[Mm]it(samt)?|[Nn]ach|[Ss]amt|[Uu]nter|[Vv]on|[Zz]u|[Ww]egen|[MmSsDd]?eine[mnrs]) ([ID]?[a-zäöüß]+en)?[A-ZÄÖÜ][a-zäöüß]+)logIn\b/g, function(match, p1) {
                    replacementsb++;
                    return p1 + "logen";
                }); //unregelmäßiger Dativ bei eine/n Psycholog/in
                s = s.replace(/([skgvwzSKGVWZ]|ert|[Bb]rit|[Kk]und|ach)In(?!(\w{1,2}\b)|[A-Z]|[cf]o|te[gr]|act|clu|dex|di|fin|line|ner|put|sert|stall|stan|stru|val|vent|v?it|voice)/g, function(match, p1) {
                    replacementsb++;
                    return p1 + "e";
                }); //ExpertIn, BritIn, KundIn, WachIn
                s = s.replace(/([nrtmdbplhfcNRTMDBPLHFC])In(?!(\w{1,2}\b)|[A-Z]|[cf]o|te[gr]|act|clu|dex|di|fin|line|ner|put|sert|stall|stan|stru|val|vent|v?it|voice)/g, function(match, p1) {
                    replacementsb++;
                    return p1;
                });
            }

        }

        if (node.data !== s) {
            node.data = s;
        }
    }
}