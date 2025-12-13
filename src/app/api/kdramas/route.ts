import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { KDramaEntry } from "@/types/media";

const DATA_FILE = path.join(process.cwd(), "data/kdrama.jsonl");
const ASSETS_DIR = path.join(process.cwd(), "public/assets/kdrama/covers");

const ensureDir = (dir: string) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        // The form now sends the entire structure (manual + tmdb)
        const body = JSON.parse(formData.get("data") as string) as KDramaEntry;
        const imageFile = formData.get("imageFile") as File | null;

        body.id = crypto.randomUUID();

        ensureDir(path.dirname(DATA_FILE));

        // Handle Image for Manual Data
        if (imageFile) {
            ensureDir(ASSETS_DIR);
            const ext = imageFile.name.split(".").pop();
            const filename = `${body.id}.${ext}`;
            const buffer = Buffer.from(await imageFile.arrayBuffer());
            fs.writeFileSync(path.join(ASSETS_DIR, filename), buffer);

            // Update the manual cover path
            body.manualData.cover = `/assets/kdrama/covers/${filename}`;
        }

        // Append to JSONL
        const jsonLine = JSON.stringify(body) + "\n";
        fs.appendFileSync(DATA_FILE, jsonLine);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
