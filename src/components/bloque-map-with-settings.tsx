"use client"

import { BloqueMap } from './bloque-map'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useMapSettings } from '@/hooks/use-map-settings'
import { MapSettings, CamaLabelInterval } from '@/lib/map-settings'
import { MoreVertical } from 'lucide-react'

interface BloqueMapWithSettingsProps {
    bloqueId: number
    bloqueName: string
    fincaName?: string
    camas?: any[]
    grupos?: any[]
    disableInteraction?: boolean
}

const CAMA_INTERVAL_LABELS: Record<CamaLabelInterval, string> = {
    all: 'All',
    'start+intervals': '1,2,5,6...',
    every5: 'Every 5',
    every10: 'Every 10',
    both: '5 & 10',
    none: 'None'
}

export function BloqueMapWithSettings({ bloqueId, bloqueName, fincaName, camas = [], grupos = [], disableInteraction = false }: BloqueMapWithSettingsProps) {
    const [settings, setSettings] = useMapSettings()

    const updateSetting = <K extends keyof MapSettings>(key: K, value: MapSettings[K]) => {
        setSettings({ ...settings, [key]: value })
    }

    const cycleCamaInterval = () => {
        const order: CamaLabelInterval[] = ['all', 'start+intervals', 'every5', 'every10', 'both', 'none']
        const currentIndex = order.indexOf(settings.camaLabelInterval)
        const nextIndex = (currentIndex + 1) % order.length
        updateSetting('camaLabelInterval', order[nextIndex])
    }

    const ToggleSetting = ({ label, settingKey }: { label: string; settingKey: keyof MapSettings }) => (
        <div className="flex items-center justify-between">
            <span className="text-sm">{label}</span>
            <Button
                variant={settings[settingKey] ? "default" : "outline"}
                size="sm"
                onClick={() => updateSetting(settingKey, !settings[settingKey])}
            >
                {settings[settingKey] ? 'On' : 'Off'}
            </Button>
        </div>
    )

    return (
        <div className="relative w-full h-full">
            {/* Three dots menu button */}
            <Dialog>
                <DialogTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon"
                        className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-white"
                    >
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Map Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* Labels & Numbers Section */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold">Labels & Numbers</h3>
                            
                            <ToggleSetting label="Length labels" settingKey="showLabels" />
                            <ToggleSetting label="Variedad labels" settingKey="showVariedadLabels" />
                            <ToggleSetting label="Colored cama numbers" settingKey="coloredCamaLabels" />

                            <div className="flex items-center justify-between">
                                <span className="text-sm">Cama numbers</span>
                                <Button variant="outline" size="sm" onClick={cycleCamaInterval}>
                                    {CAMA_INTERVAL_LABELS[settings.camaLabelInterval]}
                                </Button>
                            </div>
                        </div>

                        {/* Layout Section */}
                        <div className="space-y-3 pt-3 border-t">
                            <h3 className="text-sm font-semibold">Layout</h3>
                            
                            <ToggleSetting label="Compact view" settingKey="compactView" />
                            <ToggleSetting label="Column gap" settingKey="noGap" />

                            {settings.noGap && (
                                <ToggleSetting label="White center line" settingKey="whiteCenter" />
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Map */}
            <BloqueMap
                bloqueId={bloqueId}
                bloqueName={bloqueName}
                fincaName={fincaName}
                camas={camas}
                grupos={grupos}
                settings={settings}
                disableInteraction={disableInteraction}
            />
        </div>
    )
}
