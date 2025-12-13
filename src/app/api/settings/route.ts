import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "data/settings.ini");

// Helper to parse INI to JSON
const parseIni = (content: string) => {
    const config: Record<string, Record<string, boolean>> = {};
    let currentSection = "";

    content.split("\n").forEach((line) => {
        line = line.trim();
        if (!line || line.startsWith(";")) return;

        if (line.startsWith("[") && line.endsWith("]")) {
            currentSection = line.slice(1, -1);
            config[currentSection] = {};
        } else if (currentSection && line.includes("=")) {
            const [key, val] = line.split("=");
            // Convert "true"/"false" string to boolean
            config[currentSection][key.trim()] = val.trim() === "true";
        }
    });
    return config;
};

// Helper to stringify JSON to INI
const stringifyIni = (config: any) => {
    let content = "";
    for (const section in config) {
        content += `[${section}]\n`;
        for (const key in config[section]) {
            content += `${key}=${config[section][key]}\n`;
        }
        content += "\n";
    }
    return content;
};

export async function GET() {
    if (!fs.existsSync(SETTINGS_FILE)) {
        // Return default settings if file doesn't exist
        return NextResponse.json({
            kdrama: {
                cover: true,
                title: true,
                nativeTitle: true,
                type: true,
                format: true,
                country: true,
                episodes: true,
                airedStart: true,
                airedEnd: true,
                airedOn: true,
                originalNetwork: true,
                duration: true,
                contentRating: true,
                synopsis: true,
                directors: true,
                screenwriters: true,
                genres: true,
                tags: true,
                score: true,
                scoredBy: true,
                ranked: true,
                popularity: true,
                watchers: true,
                personalScore: true,
                review: true,
            },
        });
    }
    const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return NextResponse.json(parseIni(content));
}

export async function POST(req: Request) {
    try {
        const newSettings = await req.json();
        const iniContent = stringifyIni(newSettings);

        // Ensure data dir exists
        const dir = path.dirname(SETTINGS_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(SETTINGS_FILE, iniContent);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
