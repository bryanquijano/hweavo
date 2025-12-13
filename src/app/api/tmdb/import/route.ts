import { NextResponse } from "next/server";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export async function POST(req: Request) {
    try {
        const { url } = await req.json();

        // 1. Extract ID and Type
        const idMatch = url.match(/\/(tv|movie)\/(\d+)/);
        if (!idMatch)
            return NextResponse.json(
                { error: "Invalid TMDB URL" },
                { status: 400 }
            );

        const type = idMatch[1];
        const id = idMatch[2];

        const options = {
            method: "GET",
            headers: {
                accept: "application/json",
                Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
            },
        };

        // 2. Fetch "EVERYTHING" using append_to_response
        // - aggregate_credits: better for TV shows (groups cast across episodes)
        // - images/videos: raw urls
        // - recommendations/similar: for future features
        // - external_ids: IMDB/Instagram links
        const append =
            "aggregate_credits,credits,images,videos,recommendations,similar,keywords,content_ratings,release_dates,external_ids";

        const detailsRes = await fetch(
            `${TMDB_BASE_URL}/${type}/${id}?append_to_response=${append}`,
            options
        );
        const data = await detailsRes.json();

        if (!detailsRes.ok) throw new Error("Failed to fetch from TMDB");

        // 3. Return the RAW data. We do NOT map it here.
        return NextResponse.json({ success: true, rawData: data, tmdbId: id });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { success: false, error: "Import failed" },
            { status: 500 }
        );
    }
}
