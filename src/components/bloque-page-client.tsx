"use client"

import { useState } from 'react'
import { BloquePageHeader } from './bloque-page-header'
import { Card } from '@/components/ui/card'
import { BloqueMapWithSettings } from './bloque-map-with-settings'

interface BloquePageClientProps {
    bloque: any
    finca: any
    camasWithData: any[]
    gruposForMap: any[]
    gruposList: any[]
    children: React.ReactNode
}

export function BloquePageClient({ 
    bloque, 
    finca, 
    camasWithData, 
    gruposForMap,
    children 
}: BloquePageClientProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    return (
        <>
            <BloquePageHeader 
                currentFincaId={bloque.id_finca}
                currentBloqueId={bloque.id_bloque}
                currentFincaName={finca?.nombre || 'Finca'}
                currentBloqueName={bloque.nombre || `Bloque ${bloque.id_bloque}`}
                camas={camasWithData}
                onDialogOpenChange={setIsDialogOpen}
            />
            <div className="flex-1 flex gap-4 p-4 overflow-hidden">
                {/* Map Card */}
                <Card className="flex-1 overflow-hidden flex flex-col min-h-0 relative p-2">
                    <BloqueMapWithSettings
                        bloqueId={bloque.id_bloque}
                        bloqueName={bloque.nombre}
                        fincaName={finca?.nombre}
                        camas={camasWithData}
                        grupos={gruposForMap}
                        disableInteraction={isDialogOpen}
                    />
                </Card>

                {/* Grupos List - passed as children */}
                {children}
            </div>
        </>
    )
}
