import { getKDramaById } from '@/lib/db';
import { notFound } from 'next/navigation';
import KdramaDetailsView from '@/components/layout/KdramaDetailsView';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function KdramaDetailsPage({ params }: PageProps) {
    const { id } = await params;
    const entry = await getKDramaById(id);

    if (!entry) return notFound();

    return (
        <KdramaDetailsView
            data={entry.manualData}
            tmdbScore={entry.tmdbData?.vote_average}
        />
    );
}