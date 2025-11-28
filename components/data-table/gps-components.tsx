'use client'

import { lazy, Suspense, useState, useCallback } from 'react'
import { Map as MapIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load the map component (Leaflet is heavy)
const GpsMap = lazy(() => import('./gps-map').then(m => ({ default: m.GpsMap })))

export type GpsPoint = {
    id: string
    latitud: number
    longitud: number
    precision: number
    altitud?: number
}

interface GpsButtonProps {
    gpsIds: Set<string>
    onShowMap: (ids: string[]) => void
}

export function GpsButton({ gpsIds, onShowMap }: GpsButtonProps) {
    if (gpsIds.size === 0) return <span className="text-xs text-muted-foreground">-</span>

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={(e) => { e.stopPropagation(); onShowMap(Array.from(gpsIds)) }}
        >
            <MapIcon className="h-4 w-4" />
            <span className="sr-only">{gpsIds.size} puntos GPS</span>
        </Button>
    )
}

interface GpsMapDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    points: GpsPoint[]
    loading: boolean
}

export function GpsMapDialog({ open, onOpenChange, points, loading }: GpsMapDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[500px] p-0 flex flex-col">
                <DialogHeader className="p-4 pb-2 shrink-0">
                    <DialogTitle>Ubicación GPS ({points.length} puntos)</DialogTitle>
                </DialogHeader>
                <div className="flex-1 p-4 pt-0 min-h-0">
                    {loading ? (
                        <Skeleton className="h-full w-full rounded-lg" />
                    ) : (
                        <Suspense fallback={<Skeleton className="h-full w-full rounded-lg" />}>
                            <GpsMap points={points} className="h-full w-full" />
                        </Suspense>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// Hook to manage GPS state
export function useGpsDialog(fetchGpsPoints: (ids: string[]) => Promise<GpsPoint[]>) {
    const [mapOpen, setMapOpen] = useState(false)
    const [gpsPoints, setGpsPoints] = useState<GpsPoint[]>([])
    const [loadingGps, setLoadingGps] = useState(false)

    const handleShowMap = useCallback(async (ids: string[]) => {
        setMapOpen(true)
        setLoadingGps(true)
        const points = await fetchGpsPoints(ids)
        setGpsPoints(points)
        setLoadingGps(false)
    }, [fetchGpsPoints])

    return {
        mapOpen, setMapOpen,
        gpsPoints, loadingGps,
        handleShowMap
    }
}
