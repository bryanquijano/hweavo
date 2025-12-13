'use client';
import { KDramaContent } from '@/types/media';
import { useSettings } from '@/context/SettingsContext';
import Image from 'next/image';
import Link from 'next/link';

export default function KdramaDetailsView({ data, tmdbScore }: { data: KDramaContent; tmdbScore?: number }) {
    const { kdrama, isLoading } = useSettings();

    // Helper to check if a field is visible (default to true if loading or undefined)
    const isVisible = (field: string) => isLoading || (kdrama[field] ?? true);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20">
            <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center">
                <Link href="/" className="text-slate-400 hover:text-white transition flex items-center gap-2 text-sm">
                    ← Back to Collection
                </Link>
            </nav>

            <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-10">

                {/* Left Column */}
                <div className="md:col-span-3 space-y-6">
                    {isVisible('cover') && (
                        <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 aspect-[2/3] relative">
                            <Image src={data.cover} alt={data.title} fill className="object-cover" unoptimized />
                        </div>
                    )}

                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 space-y-4">
                        <div className="border-b border-slate-800 pb-4 space-y-3">
                            {isVisible('score') && (
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-sm">Public Score</span>
                                    <span className="text-lg font-bold text-yellow-400">★ {data.score}</span>
                                </div>
                            )}
                            {tmdbScore && (
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-sm">TMDB</span>
                                    <span className="text-sm font-bold text-teal-400">★ {tmdbScore.toFixed(1)}</span>
                                </div>
                            )}
                            {isVisible('personalScore') && (data.personalScore ?? 0) > 0 && (
                                <div className="flex justify-between items-center pt-2 border-t border-slate-800/50">
                                    <span className="text-pink-400 text-sm font-semibold">My Score</span>
                                    <span className="text-xl font-black text-pink-400">★ {data.personalScore}</span>
                                </div>
                            )}
                        </div>

                        {isVisible('ranked') && (
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                <span className="text-slate-400 text-sm">Ranked</span>
                                <span className="text-white font-mono">#{data.ranked}</span>
                            </div>
                        )}
                        {isVisible('popularity') && (
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                <span className="text-slate-400 text-sm">Popularity</span>
                                <span className="text-white font-mono">#{data.popularity}</span>
                            </div>
                        )}
                        {isVisible('watchers') && (
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">Watchers</span>
                                <span className="text-white font-mono">{data.watchers.toLocaleString()}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <h4 className="text-slate-500 uppercase text-xs font-bold tracking-wider">Information</h4>
                        <div className="text-sm space-y-2 text-slate-300">
                            {isVisible('type') && <p><span className="text-slate-500">Type:</span> {data.type}</p>}
                            {isVisible('episodes') && <p><span className="text-slate-500">Episodes:</span> {data.episodes}</p>}
                            {isVisible('airedStart') && <p><span className="text-slate-500">Aired:</span> {data.airedStart} - {isVisible('airedEnd') ? data.airedEnd : ''}</p>}
                            {isVisible('airedOn') && <p><span className="text-slate-500">Aired On:</span> {data.airedOn}</p>}
                            {isVisible('originalNetwork') && <p><span className="text-slate-500">Network:</span> {data.originalNetwork}</p>}
                            {isVisible('duration') && <p><span className="text-slate-500">Duration:</span> {data.duration}</p>}
                            {isVisible('contentRating') && <p><span className="text-slate-500">Rating:</span> {data.contentRating}</p>}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="md:col-span-9 space-y-8">
                    <div>
                        {isVisible('title') && <h1 className="text-4xl md:text-5xl font-black text-white mb-2">{data.title}</h1>}
                        {isVisible('nativeTitle') && <h2 className="text-xl text-slate-400 font-medium">{data.nativeTitle}</h2>}
                    </div>

                    {isVisible('genres') && (
                        <div className="flex flex-wrap gap-2">
                            {data.genres.map((g: string) => (
                                <span key={g} className="px-3 py-1 bg-blue-900/30 text-blue-300 border border-blue-800 rounded-full text-xs font-medium">
                                    {g}
                                </span>
                            ))}
                        </div>
                    )}

                    {isVisible('synopsis') && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white border-l-4 border-blue-500 pl-3">Synopsis</h3>
                            <div className="text-slate-300 leading-relaxed space-y-4">
                                {data.synopsis.map((p: string, i: number) => <p key={i}>{p}</p>)}
                            </div>
                        </div>
                    )}

                    {isVisible('review') && data.review && (
                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-bold text-pink-400 border-l-4 border-pink-500 pl-3">My Review</h3>
                            <div className="bg-slate-900/40 p-6 rounded-lg border border-slate-800 text-slate-200 italic leading-relaxed">
                                &quot;{data.review}&quot;
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-800">
                        {isVisible('directors') && (
                            <div>
                                <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Directors</h3>
                                <div className="flex flex-wrap gap-2">
                                    {data.directors.map((p: string) => (
                                        <span key={p} className="text-slate-300 bg-slate-800 px-2 py-1 rounded text-sm">{p}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {isVisible('screenwriters') && (
                            <div>
                                <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Screenwriters</h3>
                                <div className="flex flex-wrap gap-2">
                                    {data.screenwriters.map((p: string) => (
                                        <span key={p} className="text-slate-300 bg-slate-800 px-2 py-1 rounded text-sm">{p}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {isVisible('tags') && (
                        <div className="pt-6 border-t border-slate-800">
                            <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Tags</h3>
                            <div className="flex flex-wrap gap-x-3 gap-y-2 text-sm text-slate-400">
                                {data.tags.map((t: string) => <span key={t} className="hover:text-blue-400 transition cursor-pointer">#{t}</span>)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}