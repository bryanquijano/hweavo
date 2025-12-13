'use client';
import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import KdramaForm from '@/components/forms/KdramaForm';
import { useRouter } from 'next/navigation';

export default function AddMediaButton() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const handleSuccess = () => {
        setIsOpen(false);
        router.refresh(); // Refresh the page to show new data
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="bg-white text-black hover:bg-slate-200 font-semibold px-4 py-2 rounded-full transition"
            >
                + Add Media
            </button>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add New Entry">
                <KdramaForm onSuccess={handleSuccess} />
            </Modal>
        </>
    );
}