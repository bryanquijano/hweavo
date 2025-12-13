import Link from 'next/link';
import Image from 'next/image';
import { getKDramas } from '@/lib/db';
import AddMediaButton from '@/components/layout/AddMediaButton';
import Navbar from '@/components/layout/Navbar';

export default async function Home() {
  const kdramas = await getKDramas();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Navbar */}
      <Navbar />

      <div className="max-w-7xl mx-auto p-6">
        {/* Tabs Header */}
        <div className="flex gap-6 border-b border-slate-800 mb-8 pb-1">
          <button className="text-blue-400 border-b-2 border-blue-400 pb-3 font-medium">
            KDramas <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full ml-1 text-slate-300">{kdramas.length}</span>
          </button>
          <button className="text-slate-500 hover:text-slate-300 pb-3 font-medium transition" disabled>Books</button>
          <button className="text-slate-500 hover:text-slate-300 pb-3 font-medium transition" disabled>Anime</button>
        </div>

        {/* Content Grid */}
        {kdramas.length === 0 ? (
          <div className="p-12 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500">
            <p className="mb-4">Your collection is empty.</p>
            <p className="text-sm">Click &quot;Add Media&quot; to start tracking.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {kdramas.map((drama) => {
              // --- THIS IS THE FIX ---
              // We extract the manual data to use for display
              const display = drama.manualData;

              return (
                <Link key={drama.id} href={`/kdrama/${drama.id}`} className="group block">
                  <div className="relative aspect-[2/3] bg-slate-800 rounded-lg overflow-hidden shadow-lg border border-slate-800 group-hover:border-blue-500/50 transition-all duration-300">
                    <Image
                      src={display.cover}
                      alt={display.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                    <div className="absolute bottom-0 left-0 p-3 w-full">
                      <h3 className="font-bold text-white text-sm leading-tight line-clamp-2 drop-shadow-md">{display.title}</h3>
                      <p className="text-xs text-slate-300 mt-1">{display.airedStart?.split('-')[0] || 'Unknown'}</p>
                    </div>

                    {display.score > 0 && (
                      <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur text-yellow-400 text-xs font-bold px-1.5 py-0.5 rounded border border-slate-700">
                        ★ {display.score}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}