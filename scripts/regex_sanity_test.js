const samples = [
    "Hacker'innen",
    "Hacker’innen",
    "Hacker*innen",
    "Hacker:innen",
    "Hacker_innen",
    "Hacker/innen",
    "Hacker/-innen",
    "HackerInnen",
    "HackerINNen",
    "Bürgerinnen und Bürger",
    "Bürgerinnen und Bürgern",
    "Studierende",
    "Lehrende",
    "Mitarbeitende",
    "Hackerinnen",
    "Hackerinnen und Hacker"
];

// From binnenibegone.js (probe / detection gate)
const probeBinnenI = /[a-zäöüß\u00AD\u200B]{2}((\/-?|_|\*|:|·|•|\.|'|’| und -)?In|(\/-?|_|\*|:|·|•|\.|'|’| und -)in(n[\*|\.]en)?|INNen|[ïÏ]n|\([Ii]n+(en\)|\)en)?|\/inne?)(?!(\w{1,2}\b)|[A-Z]|[cf]o|te[gr]|act|clu|dex|di|fin|line|ner|put|sert|stall|stan|stru|val|vent|v?it|voice)|[A-ZÄÖÜß\u00AD\u200B]{3}(\/-?|_|\*|:|·|•|\.|'|’)IN[\b|(NEN)]|[a-zäöüß]{2}\*nnen|[A-ZÄÖÜß]{2}\*NNEN/;

// Replacement check that gates Binnen-I replacements
const replaceCheck = /[a-zäöüß](\/-?|_|\*|:|·|•|\.|'|’| und -)in\b|[a-zäöüß](\/-?|_|\*|:|·|•|\.|'|’| und -)inn(\*|\.|\))?en|[a-zäöüß]\*nnen|[a-zäöüß](\(|\/)in|[a-zäöüß]INNen|[a-zäöüß]ïn/i;

function report(label, regex) {
    console.log(label);
    samples.forEach((s) => {
        console.log(`${regex.test(s) ? "✓" : "✗"} ${s}`);
    });
    console.log("");
}

report("probeBinnenI", probeBinnenI);
report("replaceCheck", replaceCheck);
