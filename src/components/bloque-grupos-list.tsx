"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import { EditGrupoDialog } from './edit-grupo-dialog'

interface BloqueGruposListProps {
    gruposList: Array<{
        grupo: any
        variedad: any
        camas: any[]
        areaTotal: number
    }>
}

// Custom formatter: space for thousands, dot for decimals
function formatNumber(num: number, decimals = 0) {
    const [int, dec] = num.toFixed(decimals).split('.')
    const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return dec ? `${formattedInt}.${dec}` : formattedInt
}

export function BloqueGruposList({ gruposList }: BloqueGruposListProps) {
    const [editingGrupo, setEditingGrupo] = useState<any>(null)
    const [hoveredGrupoId, setHoveredGrupoId] = useState<number | null>(null)
    const [variedades, setVariedades] = useState<any[]>([])
    const [estados, setEstados] = useState<any[]>([])
    const [tiposPlanta, setTiposPlanta] = useState<any[]>([])
    const [patrones, setPatrones] = useState<any[]>([])

    // Fetch data when opening edit dialog
    const handleEditClick = async (grupo: any, variedad: any) => {
        try {
            // Fetch all necessary data
            const [variedadesRes, estadosRes, tiposPlantaRes, patronesRes] = await Promise.all([
                fetch('/api/variedades').then(r => r.json()),
                fetch('/api/estados').then(r => r.json()),
                fetch('/api/tipos-plantas').then(r => r.json()),
                fetch('/api/patrones').then(r => r.json())
            ])

            setVariedades(variedadesRes)
            setEstados(estadosRes)
            setTiposPlanta(tiposPlantaRes)
            setPatrones(patronesRes)
            setEditingGrupo({ ...grupo, variedad })
        } catch (error) {
            console.error('Error fetching data:', error)
            alert('Error al cargar datos')
        }
    }

    const handleSave = () => {
        setEditingGrupo(null)
        // Refresh the page to show updated data
        window.location.reload()
    }

    const handleDelete = async (grupoId: number) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este grupo? Todas las camas del grupo quedarán sin asignar.')) {
            return
        }

        try {
            // Soft delete by setting eliminado_en timestamp
            const response = await fetch('/api/grupos/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grupoId })
            })

            if (!response.ok) {
                throw new Error('Failed to delete grupo')
            }

            window.location.reload()
        } catch (error) {
            console.error('Error deleting grupo:', error)
            alert('Error al eliminar el grupo')
        }
    }

    return (
        <>
            <div className="w-fit min-w-64 max-w-80 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-3 p-3">
                    {gruposList.map(({ grupo, variedad, camas, areaTotal }, grupoListIndex) => {
                        const estado = grupo.estado?.toLowerCase()
                        let colorHex = estado === 'vegetativo'
                            ? '#555555'
                            : (variedad?.colorHex || '#999999')

                        return (
                            <div
                                key={grupo.id_grupo}
                                className="border rounded-lg overflow-hidden text-sm bg-card flex relative"
                                onMouseEnter={() => setHoveredGrupoId(grupo.id_grupo)}
                                onMouseLeave={() => setHoveredGrupoId(null)}
                            >
                                <div
                                    className="w-24 aspect-square flex-shrink-0"
                                    style={{ backgroundColor: colorHex }}
                                />
                                <div className="flex-1 p-3">
                                    {/* Action buttons - shown on hover */}
                                    {hoveredGrupoId === grupo.id_grupo && (
                                        <div className="absolute top-1 right-1 flex gap-1 bg-background/95 rounded p-0.5 shadow-md">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                onClick={() => handleEditClick(grupo, variedad)}
                                            >
                                                <Settings className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    )}

                                    <div className="font-semibold text-foreground mb-1">
                                        {grupo.nombre}
                                    </div>
                                    <div className="text-muted-foreground space-y-0.5 text-xs">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-semibold">{variedad?.nombre || 'Sin variedad'}</span>
                                            <span>•</span>
                                            <span>{grupo.estado || 'N/A'}</span>
                                        </div>
                                        <div>{formatNumber(camas.length)} camas</div>
                                        {grupo.fecha_siembra && (
                                            <div>Siembra: {new Date(grupo.fecha_siembra).toLocaleDateString()}</div>
                                        )}
                                        {grupo.tipo_planta && (
                                            <div>Tipo: {grupo.tipo_planta}</div>
                                        )}
                                        {grupo.patron && (
                                            <div>Patrón: {grupo.patron}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <EditGrupoDialog
                open={!!editingGrupo}
                onOpenChange={(open) => !open && setEditingGrupo(null)}
                grupo={editingGrupo}
                variedades={variedades}
                estados={estados}
                tiposPlanta={tiposPlanta}
                patrones={patrones}
                onSave={handleSave}
                onDelete={handleDelete}
            />
        </>
    )
}
