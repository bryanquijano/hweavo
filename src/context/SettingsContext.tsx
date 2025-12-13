'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Define the shape of our settings
export type VisibilitySettings = Record<string, boolean>;

interface SettingsState {
    kdrama: VisibilitySettings;
    updateSetting: (section: 'kdrama', field: string, value: boolean) => void;
    isLoading: boolean;
}

const SettingsContext = createContext<SettingsState | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Record<string, VisibilitySettings>>({
        kdrama: {} // Will be populated by API
    });
    const [isLoading, setIsLoading] = useState(true);

    // Load settings on mount
    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                setSettings(data);
                setIsLoading(false);
            })
            .catch(err => console.error('Failed to load settings', err));
    }, []);

    // Update function
    const updateSetting = async (section: 'kdrama', field: string, value: boolean) => {
        const newSettings = {
            ...settings,
            [section]: {
                ...settings[section],
                [field]: value
            }
        };

        // Optimistic UI update
        setSettings(newSettings);

        // Save to server
        await fetch('/api/settings', {
            method: 'POST',
            body: JSON.stringify(newSettings)
        });
    };

    return (
        <SettingsContext.Provider value={{ kdrama: settings.kdrama || {}, updateSetting, isLoading }}>
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useSettings must be used within a SettingsProvider');
    return context;
};