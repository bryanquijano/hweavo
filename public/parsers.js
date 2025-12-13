// --- GOODREADS ---
export function parseGoodreadsText(text, isSeries, hasAwards) {
    let lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l !== "");
    let cursor = 0;
    let result = {};

    // 1. Title / Series
    if (isSeries) {
        const seriesLine = lines[cursor++];
        // UPDATED REGEX: Matches "Series Name" + " # " + "Anything (decimals/text)"
        // This handles "#0.5", "#prologue for 1", etc.
        const seriesMatch = seriesLine.match(/^(.*)\s+#(.+)$/);

        if (seriesMatch) {
            result.seriesName = seriesMatch[1].trim();
            result.seriesNum = seriesMatch[2].trim();
            result.isSeries = true;
        } else {
            // Fallback: If checked but regex fails, assume whole line is series name (rare)
            result.seriesName = seriesLine;
            result.seriesNum = "";
            result.isSeries = true;
        }
        result.title = lines[cursor++];
    } else {
        result.title = lines[cursor++];
        result.isSeries = false;
    }

    // 2. Author
    const authorLine = lines[cursor++];
    if (authorLine) result.authors = authorLine.split(",").map((a) => a.trim());

    // 3. Score
    result.score = lines[cursor++];

    // 4. Ratings & Reviews
    const statsLine = lines[cursor++];
    if (statsLine) {
        const statsMatch = statsLine.match(/([\d,]+) ratings([\d,]+) reviews/);
        if (statsMatch) {
            result.ratings = statsMatch[1].replace(/,/g, "");
            result.reviews = statsMatch[2].replace(/,/g, "");
        }
    }

    // --- CHOICE AWARDS PARSING ---
    if (hasAwards) {
        if (lines[cursor] === "Goodreads Choice Award") {
            cursor++;
        }
        const awardsLine = lines[cursor++];
        if (awardsLine) {
            const parsedAwards = [];
            const rawEntries = awardsLine.split(/\), /);

            rawEntries.forEach((entry) => {
                if (!entry.endsWith(")")) entry += ")";
                const match = entry.match(
                    /^(Winner|Nominee)\s+for\s+(.+?)\s+\((\d{4})\)$/
                );
                if (match) {
                    parsedAwards.push({
                        status: match[1],
                        category: match[2],
                        date: match[3],
                    });
                }
            });
            result.goodreadsChoiceAward = parsedAwards;
        }
    }

    // 5. Synopsis
    let synopsisArr = [];
    let genreLineIndex = -1;
    for (let i = cursor; i < lines.length; i++) {
        if (lines[i].startsWith("Genres//")) {
            genreLineIndex = i;
            break;
        }
        synopsisArr.push(lines[i]);
    }
    result.synopsis = synopsisArr;

    if (genreLineIndex !== -1) {
        cursor = genreLineIndex;
        let genreRaw = lines[cursor]
            .replace("Genres//", "")
            .replace("...show all", "")
            .trim();
        let splitGenres = genreRaw.split(/(?<!\s)(?=[A-Z])/);
        result.genres = splitGenres
            .map((g) => g.trim())
            .filter((g) => g.length > 0);
        cursor++;
    }

    // 6. Format
    const formatLine = lines[cursor++];
    if (formatLine) {
        const pageMatch = formatLine.match(/(\d+) pages/);
        if (pageMatch) result.pages = pageMatch[1];
        if (formatLine.includes(","))
            result.style = formatLine.split(",")[1].trim();
        else if (!pageMatch) result.style = formatLine;
    }

    // 7. Metadata Loop
    const remainingText = lines.slice(cursor).join("\n");
    const extract = (label) => {
        const labels =
            "First published|Literary awards|Original title|Series|Setting|Characters|This edition|Format|Published|ISBN|ASIN|Language";
        const re = new RegExp(
            `(${label})\\s*([\\s\\S]*?)(?=\\n(?:${labels})|$)`,
            "i"
        );
        const match = remainingText.match(re);
        return match ? match[2].trim().replace(/\n/g, " ") : null;
    };

    for (let i = cursor; i < lines.length; i++) {
        if (lines[i].toLowerCase().startsWith("first published")) {
            result.firstPublished = lines[i]
                .replace(/^First published\s*/i, "")
                .trim();
            break;
        }
    }
    for (let i = cursor; i < lines.length; i++) {
        if (lines[i] === "Published") {
            if (lines[i + 1] && lines[i + 1].includes(" by "))
                result.publisher = lines[i + 1].split(" by ")[1].trim();
            break;
        }
    }

    const awardsRaw = extract("Literary awards");
    if (awardsRaw) result.awards = awardsRaw.split(",").map((s) => s.trim());
    result.originalTitle = extract("Original title");
    const settingRaw = extract("Setting");
    if (settingRaw) result.setting = settingRaw.split(",").map((s) => s.trim());
    const charsRaw = extract("Characters");
    if (charsRaw) result.characters = charsRaw.split(",").map((s) => s.trim());
    const isbnSection = extract("ISBN");
    if (isbnSection) {
        const parts = isbnSection.split("(");
        result.isbn = parts[0].trim();
        if (parts[1]) {
            const isbn10Match = parts[1].match(/ISBN10: (\w+)/);
            if (isbn10Match) result.isbn10 = isbn10Match[1];
        }
    }
    result.asin = extract("ASIN");
    result.language = extract("Language");
    return result;
}

// --- NEW HELPER: Detailed Score ---
export function parseDetailedScore(text) {
    if (!text) return null;
    const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l);
    const breakdown = {};

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const starMatch = line.match(/^(\d+)\s*stars?/i);

        if (starMatch && lines[i + 1]) {
            const stars = starMatch[1];
            const dataLine = lines[i + 1];
            const dataMatch = dataLine.match(/([\d,]+)\s*\((\d+)%\)/);

            if (dataMatch) {
                breakdown[stars] = {
                    count: dataMatch[1].replace(/,/g, ""),
                    percent: dataMatch[2],
                };
                i++;
            }
        }
    }
    return Object.keys(breakdown).length > 0 ? breakdown : null;
}

// --- STORYGRAPH ---
export function parseStoryGraphText(text) {
    let lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l !== "");
    let cursor = 0;
    let result = {};

    let aiStart = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("Who's It For?")) {
            aiStart = i + 1;
            break;
        }
    }
    if (aiStart !== -1) {
        cursor = aiStart;
        let aiSummary = [];
        while (cursor < lines.length) {
            const line = lines[cursor];
            if (line === "Description") break;

            // Filter out boilerplate text
            if (line !== "Personalized" && line !== "Powered by AI (Beta)") {
                aiSummary.push(line);
            }
            cursor++;
        }

        // NEW: Check for empty AI data placeholder
        const combinedAI = aiSummary.join(" ");
        if (
            combinedAI.includes(
                "Unfortunately, we don't have enough information"
            )
        ) {
            result.aiSummary = []; // Clear it
        } else {
            result.aiSummary = aiSummary;
        }
    }

    let descStart = -1;
    for (let i = cursor; i < lines.length; i++) {
        if (lines[i] === "Description") {
            descStart = i + 1;
            break;
        }
    }
    if (descStart !== -1) {
        cursor = descStart;
        let descArr = [];
        while (cursor < lines.length) {
            const line = lines[cursor];
            if (line === "Community Reviews") break;
            descArr.push(line);
            cursor++;
        }
        result.description = descArr;
    }

    for (let i = cursor; i < lines.length; i++) {
        if (lines[i] === "Community Reviews") {
            cursor = i + 1;
            break;
        }
    }
    if (lines[cursor] && /^\d+(\.\d+)?$/.test(lines[cursor])) {
        result.score = lines[cursor];
        cursor++;
    }
    if (lines[cursor] && lines[cursor].includes("based on")) {
        const revMatch = lines[cursor].match(/based on ([\d,]+) reviews/);
        if (revMatch) result.reviews = revMatch[1].replace(/,/g, "");
        cursor++;
    }

    let moodIndex = -1;
    for (let i = cursor; i < lines.length; i++) {
        if (lines[i] === "Moods") {
            moodIndex = i + 1;
            break;
        }
    }
    if (moodIndex !== -1) {
        cursor = moodIndex;
        let moods = [];
        while (cursor < lines.length && lines[cursor] !== "Pace") {
            const line = lines[cursor];
            if (line.includes(":")) {
                const [mName, mPerc] = line.split(":");
                if (mName && mPerc)
                    moods.push({
                        name: mName.trim(),
                        percent: mPerc.replace("%", "").trim(),
                    });
            }
            cursor++;
        }
        result.moods = moods;
    }

    const scales = {};
    const categories = [
        "Pace",
        "Plot or character driven?",
        "Strong character development?",
        "Loveable characters?",
        "Diverse cast of characters?",
        "Flaws of characters a main focus?",
    ];
    function parseBlock(startIdx) {
        let blockData = {};
        let idx = startIdx + 1;
        while (idx < lines.length) {
            const line = lines[idx];
            if (categories.includes(line) || line === "Content Warnings") break;
            const match = line.match(/^(\d+)%/);
            if (match) {
                const percent = match[1];
                const parts = line.split(" chose ");
                if (parts.length > 1) blockData[parts[1].trim()] = percent;
            }
            idx++;
        }
        return { data: blockData, nextIdx: idx };
    }
    for (let i = cursor; i < lines.length; i++) {
        if (categories.includes(lines[i])) {
            const catName = lines[i];
            const parseRes = parseBlock(i);
            scales[catName] = parseRes.data;
            i = parseRes.nextIdx - 1;
        }
        if (lines[i] === "Content Warnings") {
            cursor = i;
            break;
        }
    }
    result.scales = scales;

    const warnings = { graphic: [], moderate: [], minor: [] };
    let currentLevel = null;
    for (let i = cursor; i < lines.length; i++) {
        let line = lines[i];

        // Headers
        if (line === "Graphic") {
            currentLevel = "graphic";
            continue;
        }
        if (line === "Moderate") {
            currentLevel = "moderate";
            continue;
        }
        if (line === "Minor") {
            currentLevel = "minor";
            continue;
        }

        // Skip Boilerplate
        if (
            line === "Submitted by users as part of their reviews" ||
            line === "View Summary" ||
            line === "Content Warnings"
        )
            continue;

        // NEW: Check for empty warning placeholder
        if (line.includes("This book doesn't have any content warnings yet!")) {
            // Stop processing warnings entirely
            break;
        }

        if (currentLevel) {
            const cleanLine = line.replace(/\s\([\d,]+\)$/, "").trim();
            if (cleanLine) warnings[currentLevel].push(cleanLine);
        }
    }
    result.warnings = warnings;
    return result;
}
