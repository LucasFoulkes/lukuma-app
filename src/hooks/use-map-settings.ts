import { useState, useEffect } from 'react'
import { MapSettings, DEFAULT_MAP_SETTINGS } from '@/lib/map-settings'

const STORAGE_KEY = 'bloqueMapSettings'

export function useMapSettings() {
    const [settings, setSettings] = useState<MapSettings>(DEFAULT_MAP_SETTINGS)

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedSettings = localStorage.getItem(STORAGE_KEY)
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings)
                setSettings({ ...DEFAULT_MAP_SETTINGS, ...parsed })
            } catch (e) {
                console.error('Failed to load map settings:', e)
            }
        }
    }, [])

    // Save settings to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    }, [settings])

    return [settings, setSettings] as const
}
