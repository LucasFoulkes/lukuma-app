'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getRecentObservaciones, getTableData } from '@/lib/services/database.service'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export default function ObservacionesPage() {
    const [data, setData] = useState<any[]>([])
    const [camaData, setCamaData] = useState<any[]>([])
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            getRecentObservaciones(1000),
            getTableData('cama')
        ])
            .then(([observaciones, camas]) => {
                setData(observaciones)
                setCamaData(camas)
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false))
    }, [])

    const getCamaNombre = (idCama: number) => {
        const cama = camaData.find(c => c.id_cama === idCama)
        return cama?.nombre || idCama
    }

    return (
        <div className="flex-1 overflow-hidden p-4">
            <ScrollArea className="h-full">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cama</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Cantidad</TableHead>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Punto GPS</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-red-500">
                                    Error: {error}
                                </TableCell>
                            </TableRow>
                        ) : data.length > 0 ? (
                            data.map((obs) => (
                                <TableRow key={obs.id_observacion}>
                                    <TableCell>{obs.id_cama ? getCamaNombre(obs.id_cama) : '-'}</TableCell>
                                    <TableCell>{obs.tipo_observacion || '-'}</TableCell>
                                    <TableCell>{obs.cantidad ?? '-'}</TableCell>
                                    <TableCell>{obs.id_usuario || '-'}</TableCell>
                                    <TableCell>
                                        {obs.creado_en
                                            ? new Date(obs.creado_en).toLocaleDateString('es-ES', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })
                                            : '-'
                                        }
                                    </TableCell>
                                    <TableCell>{obs.id_punto_gps || '-'}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground">
                                    No hay observaciones
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    )
}
