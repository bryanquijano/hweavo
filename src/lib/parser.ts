import { KDramaContent } from "@/types/media";

export const parseDetailsBlock = (text: string): Partial<KDramaContent> => {
    const lines = text.split("\n");
    const data: Partial<KDramaContent> = {};

    lines.forEach((line) => {
        const splitIndex = line.indexOf(":");
        if (splitIndex === -1) return;

        const key = line.substring(0, splitIndex).trim().toLowerCase();
        const value = line.substring(splitIndex + 1).trim();

        if (!value) return;

        if (key === "title") data.title = value;
        // We cast strictly to expected union types
        if (key === "type") data.type = value as KDramaContent["type"];
        if (key === "format") data.format = value as KDramaContent["format"];
        if (key === "country") data.country = value;
        if (key === "episodes") data.episodes = parseInt(value, 10);
        if (key === "original network") data.originalNetwork = value;
        if (key === "duration") data.duration = value;
        if (key === "content rating") data.contentRating = value;
        if (key === "aired on") data.airedOn = value;

        if (key === "aired") {
            const parts = value.split("-").map((s) => s.trim());
            data.airedStart = parts[0] || "";
            data.airedEnd = parts[1] || "";
        }
    });
    return data;
};

export const parseStatsBlock = (text: string): Partial<KDramaContent> => {
    const data: Partial<KDramaContent> = {};

    const scoreMatch = text.match(
        /Score:\s*([\d.]+)\s*\(scored by\s*([\d,]+)\s*users\)/i
    );
    if (scoreMatch) {
        data.score = parseFloat(scoreMatch[1]);
        data.scoredBy = parseInt(scoreMatch[2].replace(/,/g, ""), 10);
    }

    const rankMatch = text.match(/Ranked:\s*#([\d,]+)/i);
    if (rankMatch) data.ranked = parseInt(rankMatch[1].replace(/,/g, ""), 10);

    const popMatch = text.match(/Popularity:\s*#([\d,]+)/i);
    if (popMatch) data.popularity = parseInt(popMatch[1].replace(/,/g, ""), 10);

    const watchMatch = text.match(/Watchers:\s*([\d,]+)/i);
    if (watchMatch)
        data.watchers = parseInt(watchMatch[1].replace(/,/g, ""), 10);

    return data;
};

export const parseAdditionalBlock = (text: string): Partial<KDramaContent> => {
    const lines = text.split("\n");
    const data: Partial<KDramaContent> = {};

    const arrayProcessor = (val: string) =>
        val
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

    lines.forEach((line) => {
        const splitIndex = line.indexOf(":");
        if (splitIndex === -1) return;

        const key = line.substring(0, splitIndex).trim().toLowerCase();
        const value = line.substring(splitIndex + 1).trim();

        if (key === "director") data.directors = arrayProcessor(value);
        if (key === "screenwriter") data.screenwriters = arrayProcessor(value);
        if (key === "genres") data.genres = arrayProcessor(value);
        if (key === "tags") data.tags = arrayProcessor(value);
    });
    return data;
};
