'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icon issue with Next.js
const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})
L.Marker.prototype.options.icon = defaultIcon

type GpsPoint = { id: string; latitud: number; longitud: number; precision: number; altitud?: number }

// Component to fit bounds when points change
function FitBounds({ points }: { points: GpsPoint[] }) {
    const map = useMap()

    useEffect(() => {
        if (points.length > 0) {
            const bounds = L.latLngBounds(points.map(p => [p.latitud, p.longitud]))
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 })
        }
    }, [points, map])

    return null
}

export function GpsMap({ points, className }: { points: GpsPoint[]; className?: string }) {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) {
        return <div className={className}>Cargando mapa...</div>
    }

    if (points.length === 0) {
        return <div className={className}>No hay puntos GPS</div>
    }

    const center: [number, number] = [
        points.reduce((sum, p) => sum + p.latitud, 0) / points.length,
        points.reduce((sum, p) => sum + p.longitud, 0) / points.length
    ]

    return (
        <MapContainer
            center={center}
            zoom={16}
            className={className}
            style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds points={points} />
            {points.map((point, i) => (
                <Marker key={point.id} position={[point.latitud, point.longitud]}>
                    <Popup>
                        <div className="text-xs space-y-1">
                            <div><strong>Punto {i + 1}</strong></div>
                            <div>Lat: {point.latitud.toFixed(6)}</div>
                            <div>Lng: {point.longitud.toFixed(6)}</div>
                            <div>Precisión: ±{point.precision.toFixed(1)}m</div>
                            {point.altitud && <div>Altitud: {point.altitud.toFixed(1)}m</div>}
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    )
}
