// --- GOODREADS ---
export function parseGoodreadsText(text, isSeries) {
    let lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l !== "");
    let cursor = 0;
    let result = {};

    if (isSeries) {
        const seriesLine = lines[cursor++];
        const seriesMatch = seriesLine.match(/^(.*) #(\d+)$/);
        if (seriesMatch) {
            result.seriesName = seriesMatch[1];
            result.seriesNum = seriesMatch[2];
            result.isSeries = true;
        } else {
            result.seriesName = seriesLine;
            result.isSeries = true;
        }
        result.title = lines[cursor++];
    } else {
        result.title = lines[cursor++];
        result.isSeries = false;
    }

    const authorLine = lines[cursor++];
    if (authorLine) result.authors = authorLine.split(",").map((a) => a.trim());
    result.score = lines[cursor++];

    const statsLine = lines[cursor++];
    if (statsLine) {
        const statsMatch = statsLine.match(/([\d,]+) ratings([\d,]+) reviews/);
        if (statsMatch) {
            result.ratings = statsMatch[1].replace(/,/g, "");
            result.reviews = statsMatch[2].replace(/,/g, "");
        }
    }

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

    const formatLine = lines[cursor++];
    if (formatLine) {
        const pageMatch = formatLine.match(/(\d+) pages/);
        if (pageMatch) result.pages = pageMatch[1];
        if (formatLine.includes(","))
            result.style = formatLine.split(",")[1].trim();
        else if (!pageMatch) result.style = formatLine;
    }

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
            if (line !== "Personalized" && line !== "Powered by AI (Beta)")
                aiSummary.push(line);
            cursor++;
        }
        result.aiSummary = aiSummary;
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
        if (
            line === "Submitted by users as part of their reviews" ||
            line === "View Summary" ||
            line === "Content Warnings"
        )
            continue;
        if (currentLevel) {
            const cleanLine = line.replace(/\s\([\d,]+\)$/, "").trim();
            if (cleanLine) warnings[currentLevel].push(cleanLine);
        }
    }
    result.warnings = warnings;
    return result;
}
