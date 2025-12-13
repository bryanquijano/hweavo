import fs from "fs";
import path from "path";
import { KDramaEntry } from "@/types/media";

const DATA_DIR = path.join(process.cwd(), "data");

export async function getKDramas(): Promise<KDramaEntry[]> {
    const filePath = path.join(DATA_DIR, "kdrama.jsonl");

    if (!fs.existsSync(filePath)) {
        return [];
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");

    const entries = fileContent
        .split("\n")
        .filter((line) => line.trim() !== "")
        .map((line) => {
            try {
                return JSON.parse(line);
            } catch (_) {
                // Fixed: using underscore implies "unused"
                return null;
            }
        })
        .filter(Boolean) as KDramaEntry[];

    return entries.reverse();
}

export async function getKDramaById(
    id: string
): Promise<KDramaEntry | undefined> {
    const all = await getKDramas();
    return all.find((item) => item.id === id);
}
