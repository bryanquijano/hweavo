'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { parseDetailsBlock, parseStatsBlock, parseAdditionalBlock } from '@/lib/parser';
import { KDramaContent, KDramaEntry } from '@/types/media';

interface KDramaFormValues extends Omit<KDramaContent, 'directors' | 'screenwriters' | 'genres' | 'tags' | 'synopsis' | 'personalScore'> {
    synopsis: string;
    directors: string;
    screenwriters: string;
    genres: string;
    tags: string;
    // New Fields (Inputs are always strings initially)
    personalScore: string;
    review: string;
}

interface BulkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onParse: (text: string) => void;
    title: string;
}

const BulkModal = ({ isOpen, onClose, onParse, title }: BulkModalProps) => {
    const [text, setText] = useState('');
    if (!isOpen) return null;
    return (
        <div className="absolute inset-0 z-20 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-800 p-6 rounded-lg w-full max-w-lg border border-slate-600">
                <h3 className="text-white font-bold mb-2">Paste {title} Block</h3>
                <textarea
                    className="w-full h-48 bg-slate-900 text-slate-200 p-2 rounded border border-slate-700 text-xs font-mono"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-slate-300">Cancel</button>
                    <button type="button" onClick={() => { onParse(text); onClose(); setText(''); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded">Parse</button>
                </div>
            </div>
        </div>
    );
};

export default function KdramaForm({ onSuccess }: { onSuccess: () => void }) {
    const { register, handleSubmit, setValue, reset } = useForm<KDramaFormValues>();

    const [coverType, setCoverType] = useState<'url' | 'upload'>('upload');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [bulkMode, setBulkMode] = useState<'details' | 'stats' | 'additional' | null>(null);

    // TMDB States
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [tmdbData, setTmdbData] = useState<any | null>(null);
    const [tmdbUrl, setTmdbUrl] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [tmdbId, setTmdbId] = useState<string>('');

    // --- 1. UPDATED IMPORT LOGIC ---
    const handleImport = async () => {
        if (!tmdbUrl) return;
        setIsImporting(true);
        try {
            const res = await fetch('/api/tmdb/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: tmdbUrl })
            });
            const result = await res.json();

            if (result.success && result.rawData) {
                // Just store the data. DO NOT FILL THE FORM.
                setTmdbData(result.rawData);
                setTmdbId(result.tmdbId);
            } else {
                alert('Could not find series on TMDB');
            }
        } catch (e) {
            console.error(e);
            alert('Import failed');
        } finally {
            setIsImporting(false);
        }
    };

    const onSubmit = async (formData: KDramaFormValues) => {
        const manualData: KDramaContent = {
            ...formData,
            synopsis: formData.synopsis ? formData.synopsis.split('\n\n').filter(Boolean) : [],
            directors: formData.directors ? formData.directors.split(',').map(s => s.trim()).filter(Boolean) : [],
            screenwriters: formData.screenwriters ? formData.screenwriters.split(',').map(s => s.trim()).filter(Boolean) : [],
            genres: formData.genres ? formData.genres.split(',').map(s => s.trim()).filter(Boolean) : [],
            tags: formData.tags ? formData.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
            episodes: Number(formData.episodes),
            score: Number(formData.score),
            scoredBy: Number(formData.scoredBy),
            ranked: Number(formData.ranked),
            popularity: Number(formData.popularity),
            watchers: Number(formData.watchers),
            personalScore: formData.personalScore ? Number(formData.personalScore) : 0,
            review: formData.review || ''
        };

        const finalEntry: Partial<KDramaEntry> = {
            manualData: manualData,
            tmdbData: tmdbData, // This contains the huge raw dump
            tmdbId: tmdbId
        };

        const payload = new FormData();
        payload.append('data', JSON.stringify(finalEntry));
        if (imageFile && coverType === 'upload') {
            payload.append('imageFile', imageFile);
        }

        await fetch('/api/kdramas', { method: 'POST', body: payload });

        reset();
        setTmdbData(null);
        setTmdbUrl('');
        setTmdbId('');
        setImageFile(null);
        onSuccess();
    };

    const handleBulkDetails = (text: string) => {
        const d = parseDetailsBlock(text);
        (Object.keys(d) as Array<keyof typeof d>).forEach((k) => {
            const val = d[k];
            if (val !== undefined && k !== 'synopsis' && k !== 'directors' && k !== 'screenwriters' && k !== 'genres' && k !== 'tags') {
                // @ts-expect-error: Complex union mapping
                setValue(k, val);
            }
        });
    };

    const handleBulkStats = (text: string) => {
        const d = parseStatsBlock(text);
        if (d.score !== undefined) setValue('score', d.score);
        if (d.scoredBy !== undefined) setValue('scoredBy', d.scoredBy);
        if (d.ranked !== undefined) setValue('ranked', d.ranked);
        if (d.popularity !== undefined) setValue('popularity', d.popularity);
        if (d.watchers !== undefined) setValue('watchers', d.watchers);
    };

    const handleBulkAdditional = (text: string) => {
        const d = parseAdditionalBlock(text);
        if (d.directors) setValue('directors', d.directors.join(', '));
        if (d.screenwriters) setValue('screenwriters', d.screenwriters.join(', '));
        if (d.genres) setValue('genres', d.genres.join(', '));
        if (d.tags) setValue('tags', d.tags.join(', '));
    };

    return (
        <div className="space-y-6">
            {/* Import Section */}
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-2">
                <div className="flex gap-2 items-center">
                    <input
                        type="text"
                        placeholder="Paste TMDB URL (e.g. https://www.themoviedb.org/tv/12345...)"
                        className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        value={tmdbUrl}
                        onChange={(e) => setTmdbUrl(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={handleImport}
                        disabled={isImporting}
                        className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded text-sm transition disabled:opacity-50"
                    >
                        {isImporting ? 'Importing...' : 'Fetch Metadata'}
                    </button>
                </div>

                {/* Success Indicator */}
                {tmdbData && (
                    <div className="text-xs flex items-center gap-2 text-green-400 bg-green-900/20 p-2 rounded border border-green-900/50">
                        <span className="text-lg">✓</span>
                        <span>
                            <strong>Successfully Linked:</strong> {tmdbData.name || tmdbData.title} ({tmdbData.original_name || tmdbData.original_title})
                            <br />
                            <span className="opacity-70">Metadata (Cast, Seasons, Images) is ready to be archived.</span>
                        </span>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 relative text-sm">
                <BulkModal isOpen={bulkMode === 'details'} onClose={() => setBulkMode(null)} onParse={handleBulkDetails} title="Details" />
                <BulkModal isOpen={bulkMode === 'stats'} onClose={() => setBulkMode(null)} onParse={handleBulkStats} title="Statistics" />
                <BulkModal isOpen={bulkMode === 'additional'} onClose={() => setBulkMode(null)} onParse={handleBulkAdditional} title="Add. Details" />

                {/* --- Details --- */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                        <h3 className="text-lg font-bold text-blue-400">Details</h3>
                        <button type="button" onClick={() => setBulkMode('details')} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded">Paste Bulk Data</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <label className="block mb-2 font-medium text-slate-300">Cover Image</label>
                            <div className="flex gap-2 mb-2">
                                <button type="button" onClick={() => setCoverType('upload')} className={`text-xs px-2 py-1 rounded ${coverType === 'upload' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>Upload</button>
                                <button type="button" onClick={() => setCoverType('url')} className={`text-xs px-2 py-1 rounded ${coverType === 'url' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>URL</button>
                            </div>
                            {coverType === 'upload' ? (
                                <div
                                    className="border-2 border-dashed border-slate-600 rounded-lg h-48 flex items-center justify-center text-slate-500 hover:border-slate-400 hover:text-slate-300 transition cursor-pointer relative"
                                >
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                                    {imageFile ? <span className="px-4 text-center text-xs break-all">{imageFile.name}</span> : <span>Drag or Click</span>}
                                </div>
                            ) : (
                                <input {...register('cover')} placeholder="https://..." className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white" />
                            )}
                        </div>

                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input {...register('title')} placeholder="Title" className="col-span-2 bg-slate-800 border-slate-700 rounded p-2 text-white" />
                            <input {...register('nativeTitle')} placeholder="Native Title (Korean)" className="col-span-2 bg-slate-800 border-slate-700 rounded p-2 text-white" />

                            <div className="space-y-2">
                                <label className="text-slate-400 block text-xs uppercase tracking-wide">Type</label>
                                <div className="flex gap-3">
                                    {['Drama', 'Movie', 'TV Show'].map(v => (
                                        <label key={v} className="flex items-center gap-1 text-slate-300"><input type="radio" value={v} {...register('type')} /> {v}</label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-slate-400 block text-xs uppercase tracking-wide">Format</label>
                                <select {...register('format')} className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white">
                                    <option value="Standard Series">Standard Series</option>
                                    <option value="Web Series">Web Series</option>
                                    <option value="Vertical">Vertical</option>
                                    <option value="Special">Special</option>
                                </select>
                            </div>

                            <input {...register('episodes')} type="number" placeholder="Episodes" className="bg-slate-800 border-slate-700 rounded p-2 text-white" />
                            <input {...register('duration')} placeholder="Duration (e.g. 1 hr. 20 min)" className="bg-slate-800 border-slate-700 rounded p-2 text-white" />

                            <div className="col-span-2 grid grid-cols-2 gap-2">
                                <input {...register('airedStart')} placeholder="Start Date" className="bg-slate-800 border-slate-700 rounded p-2 text-white" />
                                <input {...register('airedEnd')} placeholder="End Date" className="bg-slate-800 border-slate-700 rounded p-2 text-white" />
                            </div>

                            <input {...register('airedOn')} placeholder="Aired On (e.g. Mon, Tue)" className="bg-slate-800 border-slate-700 rounded p-2 text-white" />
                            <input {...register('originalNetwork')} placeholder="Network" className="bg-slate-800 border-slate-700 rounded p-2 text-white" />
                            <input {...register('contentRating')} placeholder="Rating (e.g. 15+)" className="bg-slate-800 border-slate-700 rounded p-2 text-white" />

                            <div className="col-span-2 space-y-2">
                                <label className="text-slate-400 block text-xs uppercase tracking-wide">Country</label>
                                <div className="flex flex-wrap gap-3">
                                    {['South Korea', 'China', 'Japan', 'Taiwan', 'Thailand', 'Philippines'].map(v => (
                                        <label key={v} className="flex items-center gap-1 text-slate-300 text-xs"><input type="radio" value={v} {...register('country')} /> {v}</label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Additional Details --- */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                        <h3 className="text-lg font-bold text-purple-400">Additional Details</h3>
                        <button type="button" onClick={() => setBulkMode('additional')} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded">Paste Bulk Data</button>
                    </div>

                    <textarea {...register('synopsis')} placeholder="Synopsis (Double line break for new paragraph)" className="w-full h-32 bg-slate-800 border-slate-700 rounded p-2 text-white" />

                    <input {...register('directors')} placeholder="Directors (comma separated)" className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white" />
                    <input {...register('screenwriters')} placeholder="Screenwriters (comma separated)" className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white" />
                    <input {...register('genres')} placeholder="Genres (comma separated)" className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white" />
                    <input {...register('tags')} placeholder="Tags (comma separated)" className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white" />
                </div>

                {/* --- Statistics --- */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                        <h3 className="text-lg font-bold text-green-400">Statistics</h3>
                        <button type="button" onClick={() => setBulkMode('stats')} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded">Paste Bulk Data</button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="space-y-1"><label className="text-xs text-slate-400">Score</label><input step="0.1" type="number" {...register('score')} className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white" /></div>
                        <div className="space-y-1"><label className="text-xs text-slate-400">Scored By</label><input type="number" {...register('scoredBy')} className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white" /></div>
                        <div className="space-y-1"><label className="text-xs text-slate-400">Ranked</label><input type="number" {...register('ranked')} className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white" /></div>
                        <div className="space-y-1"><label className="text-xs text-slate-400">Popularity</label><input type="number" {...register('popularity')} className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white" /></div>
                        <div className="space-y-1"><label className="text-xs text-slate-400">Watchers</label><input type="number" {...register('watchers')} className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white" /></div>
                    </div>
                </div>

                {/* --- NEW: Personal Review Section --- */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                        <h3 className="text-lg font-bold text-pink-400">Personal Review</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-1 space-y-1">
                            <label className="text-xs text-slate-400 uppercase tracking-wide">My Score (0-10)</label>
                            <input step="0.1" type="number" max="10" placeholder="-" {...register('personalScore')} className="w-full bg-slate-800 border-slate-700 rounded p-2 text-white font-bold text-lg" />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                            <label className="text-xs text-slate-400 uppercase tracking-wide">My Review (Optional)</label>
                            <textarea {...register('review')} placeholder="Write your thoughts..." className="w-full h-24 bg-slate-800 border-slate-700 rounded p-2 text-white" />
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-700 flex justify-end">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg transform active:scale-95 transition">
                        Add KDrama
                    </button>
                </div>
            </form>
        </div>
    );
}