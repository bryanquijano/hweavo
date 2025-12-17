const EPub = require("epub");
const textReadability = require("text-readability");
const { convert } = require("html-to-text");

// Compatibility fix
const rs = textReadability.default || textReadability;

const IS_FICTION = true;
const IGNORED_TITLES = [
    "copyright",
    "dedication",
    "acknowledgment",
    "acknowledgement",
    "contents",
    "table of contents",
    "toc",
    "cover",
    "title",
    "preface",
    "intro",
    "introduction",
    "foreword",
    "prologue",
    "index",
    "glossary",
    "bibliography",
    "notes",
    "about the author",
];

// Lookups
function getAtosLabel(score) {
    if (score < 1.0) return "K";
    if (score < 2.0) return "Grade 1";
    if (score < 3.0) return "Grade 2";
    if (score < 4.0) return "Grade 3";
    if (score < 5.0) return "Grade 4";
    if (score < 6.0) return "Grade 5";
    if (score < 7.0) return "Grade 6";
    if (score < 8.0) return "Grade 7";
    if (score < 9.0) return "Grade 8";
    if (score < 10.0) return "Grade 9";
    if (score < 11.0) return "Grade 10";
    if (score < 12.0) return "Grade 11";
    return "Grade 12+";
}

function getFkLabel(score) {
    if (score <= 3) return "Kindergarten/Elementary";
    if (score <= 6) return "Elementary";
    if (score <= 9) return "Middle School";
    if (score <= 12) return "High School";
    if (score <= 15) return "College";
    return "Post-grad";
}

function getFleschEaseLabel(score) {
    if (score >= 90) return "Grade 5";
    if (score >= 80) return "Grade 6";
    if (score >= 70) return "Grade 7";
    if (score >= 60) return "Grade 8-9";
    if (score >= 50) return "Grade 10-12";
    if (score >= 30) return "College";
    return "College Grad";
}

function getFogLabel(score) {
    const s = Math.round(score);
    if (s <= 6) return "6th grade";
    if (s === 7) return "7th grade";
    if (s === 8) return "8th grade";
    if (s === 9) return "High school freshman";
    if (s === 10) return "High school sophomore";
    if (s === 11) return "High school junior";
    if (s === 12) return "High school senior";
    if (s >= 13) return "College";
    return "College";
}

function getColemanLiauLabel(score) {
    const s = Math.round(score);
    if (s <= 5) return "5th grade & below";
    if (s === 6) return "6th grade";
    if (s === 7) return "7th grade";
    if (s >= 8 && s <= 10) return "8th-10th grade";
    if (s >= 11 && s <= 12) return "11th-12th grade";
    if (s >= 13) return "College";
    return "Professional";
}

function getSmogLabel(score) {
    const s = Math.round(score);
    if (s <= 6) return "6th grade";
    if (s === 7) return "7th grade";
    if (s === 8) return "8th grade";
    if (s === 9) return "HS freshman";
    if (s === 10) return "HS sophomore";
    if (s === 11) return "HS junior";
    if (s === 12) return "HS senior";
    return "College";
}

function getAriLabel(score) {
    const s = Math.round(score);
    if (s <= 1) return "Kindergarten";
    if (s === 2) return "1st/2nd grade";
    if (s === 3) return "3rd grade";
    if (s === 4) return "4th grade";
    if (s === 5) return "5th grade";
    if (s === 6) return "6th grade";
    if (s === 7) return "7th grade";
    if (s === 8) return "8th grade";
    if (s === 9) return "9th grade";
    if (s === 10) return "10th grade";
    if (s === 11) return "11th grade";
    if (s === 12) return "12th grade";
    if (s === 13) return "College student";
    return "Professor";
}

exports.analyzeEpub = function (filePath) {
    return new Promise((resolve, reject) => {
        const epub = new EPub(filePath);

        epub.on("error", (err) => reject(err));

        epub.on("end", async () => {
            const chapterPromises = epub.flow.map((chapter) => {
                return new Promise((resolveChapter) => {
                    const titleLower = (
                        chapter.title || chapter.id
                    ).toLowerCase();
                    if (IGNORED_TITLES.some((k) => titleLower.includes(k)))
                        return resolveChapter("");

                    epub.getChapter(chapter.id, (err, text) => {
                        if (err || !text) return resolveChapter("");
                        let safeHtml = text
                            .replace(/<footer[^>]*>.*?<\/footer>/gs, "")
                            .replace(/<header[^>]*>.*?<\/header>/gs, "")
                            .replace(
                                /<\/(h[1-6]|p|div|blockquote|li)>/gi,
                                ". \n\n"
                            )
                            .replace(/<(br|hr)\s*\/?>/gi, ". \n\n");

                        let rawText = convert(safeHtml, {
                            wordwrap: false,
                            selectors: [
                                { selector: "img", format: "skip" },
                                {
                                    selector: "a",
                                    options: { ignoreHref: true },
                                },
                                { selector: "table", format: "skip" },
                                { selector: "sup", format: "skip" },
                            ],
                        });
                        resolveChapter(
                            rawText
                                .replace(/\.\s*\./g, ".")
                                .replace(/\s+/g, " ")
                                .trim()
                        );
                    });
                });
            });

            try {
                const chapters = await Promise.all(chapterPromises);
                const fullText = chapters
                    .filter((t) => t.length > 50)
                    .join(" ");

                if (fullText.length < 500)
                    return reject("Not enough text content found.");

                const fkGrade = rs.fleschKincaidGrade(fullText);
                const coleman = rs.colemanLiauIndex(fullText);
                const fog = rs.gunningFog(fullText);
                const ari = rs.automatedReadabilityIndex(fullText);
                const smog = rs.smogIndex(fullText);
                const fleschEase = rs.fleschReadingEase(fullText);

                const rawConsensus = (fkGrade + coleman + fog) / 3;
                let adjustedATOS = IS_FICTION
                    ? rawConsensus
                    : rawConsensus;
                if (adjustedATOS < 0) adjustedATOS = 0;
                let approxLexile = Math.round(adjustedATOS * 100 + 300);
                if (approxLexile < 0) approxLexile = 0;

                resolve({
                    lexile: `${approxLexile}L`,
                    atos: {
                        score: adjustedATOS.toFixed(1),
                        label: getAtosLabel(adjustedATOS),
                    },
                    fleschKincaid: {
                        score: fkGrade.toFixed(1),
                        label: getFkLabel(fkGrade),
                    },
                    fleschEase: {
                        score: fleschEase.toFixed(1),
                        label: getFleschEaseLabel(fleschEase),
                    },
                    fog: { score: fog.toFixed(1), label: getFogLabel(fog) },
                    coleman: {
                        score: coleman.toFixed(1),
                        label: getColemanLiauLabel(coleman),
                    },
                    smog: { score: smog.toFixed(1), label: getSmogLabel(smog) },
                    ari: { score: ari.toFixed(1), label: getAriLabel(ari) },
                });
            } catch (err) {
                reject(err);
            }
        });

        epub.parse();
    });
};
