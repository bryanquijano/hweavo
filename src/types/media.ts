// The core data fields for your MANUAL entry
export interface KDramaContent {
    cover: string;
    title: string;
    nativeTitle: string;
    type: "Drama" | "Movie" | "TV Show";
    format: "Standard Series" | "Web Series" | "Vertical" | "Special";
    country: string;
    episodes: number;
    airedStart: string;
    airedEnd: string;
    airedOn: string;
    originalNetwork: string;
    duration: string;
    contentRating: string;
    synopsis: string[];
    directors: string[];
    screenwriters: string[];
    genres: string[];
    tags: string[];
    // Stats
    score: number;
    scoredBy: number;
    ranked: number;
    popularity: number;
    watchers: number;
    personalScore?: number;
    review?: string;
}

// The database entry structure
export interface KDramaEntry {
    id: string;
    tmdbId?: string;
    manualData: KDramaContent;
    // We use 'any' here because we are dumping the entire raw TMDB response
    // (cast, seasons, images, videos, recommendations, etc.)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tmdbData?: any;
}
