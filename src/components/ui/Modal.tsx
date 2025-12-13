'use client';
import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: ReactNode }) {
    const [mounted, setMounted] = useState(false);

    // Effect 1: Handle Hydration
    // We use setTimeout to avoid the "synchronous setState" lint error.
    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    // Effect 2: Handle Body Scroll Locking
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        // Cleanup function to reset overflow when component unmounts or closes
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    // Logic:
    // 1. If not mounted yet (server-side), return null.
    // 2. If mounted but closed, return null.
    if (!mounted || !isOpen) return null;

    // 3. If mounted AND open, render via Portal.
    // We can safely access 'document.body' here because 'mounted' ensures we are on the client.
    return createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/60 backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center p-4">
                {/* Modal Content */}
                <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-xl shadow-2xl relative">

                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-900 rounded-t-xl sticky top-0 z-10">
                        <h2 className="text-xl font-bold text-white">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        {children}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}