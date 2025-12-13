'use client';
import { useSettings } from '@/context/SettingsContext';
import Modal from '@/components/ui/Modal';
import { useState } from 'react';

// Friendly names for the toggle list
const FIELD_LABELS: Record<string, string> = {
    cover: 'Cover Image',
    title: 'Title',
    nativeTitle: 'Native Title',
    type: 'Media Type',
    format: 'Format',
    country: 'Country',
    episodes: 'Episode Count',
    airedStart: 'Start Date',
    airedEnd: 'End Date',
    airedOn: 'Aired On',
    originalNetwork: 'Network',
    duration: 'Duration',
    contentRating: 'Content Rating',
    synopsis: 'Synopsis',
    directors: 'Directors',
    screenwriters: 'Screenwriters',
    genres: 'Genres',
    tags: 'Tags',
    score: 'Public Score',
    scoredBy: 'Scored By Count',
    ranked: 'Rank',
    popularity: 'Popularity',
    watchers: 'Watchers Count',
    personalScore: 'My Personal Score',
    review: 'My Review'
};

export default function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { kdrama, updateSetting } = useSettings();
    const [activeTab, setActiveTab] = useState('kdrama');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Settings">
            <div className="flex flex-col h-[60vh]">

                {/* Top Tabs (Customization vs Others) */}
                <div className="flex border-b border-slate-700 mb-4">
                    <button className="px-4 py-2 text-blue-400 border-b-2 border-blue-400 font-medium">Customization</button>
                    <button className="px-4 py-2 text-slate-500 cursor-not-allowed">Account (Soon)</button>
                </div>

                {/* Sub Tabs (Media Type) */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('kdrama')}
                        className={`px-3 py-1 rounded text-sm transition ${activeTab === 'kdrama' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        KDrama
                    </button>
                    <button disabled className="px-3 py-1 rounded text-sm text-slate-600 cursor-not-allowed">Books</button>
                </div>

                {/* Toggles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2">
                    {Object.entries(FIELD_LABELS).map(([key, label]) => (
                        <label key={key} className="flex items-center justify-between bg-slate-800 p-3 rounded border border-slate-700 hover:border-slate-500 transition cursor-pointer group">
                            <span className="text-slate-300 text-sm group-hover:text-white">{label}</span>

                            <div className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={kdrama[key] ?? true} // Default to true if undefined
                                    onChange={(e) => updateSetting('kdrama', key, e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </div>
                        </label>
                    ))}
                </div>

            </div>
        </Modal>
    );
}