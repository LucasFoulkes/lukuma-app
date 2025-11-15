'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dot } from 'lucide-react'
import { getMultipleTables } from '@/lib/services/database.service'
import { useEffect, useState } from 'react'

export default function MapaPage() {
    const [data, setData] = useState<any[][]>([])
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getMultipleTables('finca', 'bloque', 'grupo_cama', 'variedad')
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-muted-foreground">Cargando...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-red-500">Error: {error}</div>
            </div>
        )
    }

    const [fincaData, bloqueData, grupoCamasData, variedadData] = data
    return (
        <div className="flex-1 overflow-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 auto-rows-fr">
            {fincaData.map((finca) => {
                const fincaBloques = bloqueData
                    .filter(b => b.id_finca === finca.id_finca)
                    .sort((a, b) => {
                        // Natural sort for names like "1", "2", "3a", "3b"
                        return a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' })
                    })

                return (
                    <Card className='h-full overflow-hidden flex flex-col gap-0' key={finca.id_finca} >
                        <CardHeader className="flex-shrink-0">
                            <h1 className="text-lg font-semibold text-center">{finca.nombre}</h1>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-0">
                            {fincaBloques.length > 0 ? (
                                <ScrollArea className="h-full">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className='text-center'>Bloque</TableHead>
                                                <TableHead className='text-center'>Variedades</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fincaBloques.map((bloque) => {
                                                const bloqueGrupoCamas = grupoCamasData.filter(gc => gc.id_bloque === bloque.id_bloque)
                                                const uniqueVariedadIds = [...new Set(bloqueGrupoCamas.map(gc => gc.id_variedad).filter(Boolean))]
                                                const variedadNames = uniqueVariedadIds
                                                    .map(id => variedadData.find(v => v.id_variedad === id)?.nombre)
                                                    .filter(Boolean)

                                                return (
                                                    <TableRow key={bloque.id_bloque}>
                                                        <TableCell className='text-center text-lg font-medium'>{bloque.nombre || 'Sin nombre'}</TableCell>
                                                        <TableCell>
                                                            {variedadNames.length > 0
                                                                ? (
                                                                    <div className="flex items-center flex-wrap">
                                                                        {variedadNames.map((name, idx) => (
                                                                            <div key={idx} className="flex items-center">
                                                                                {idx > 0 && <Dot className="h-4 w-4" />}
                                                                                <span>{name}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )
                                                                : '-'}
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            ) : (
                                <div className="p-4 text-sm text-muted-foreground text-center">
                                    No hay bloques
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}