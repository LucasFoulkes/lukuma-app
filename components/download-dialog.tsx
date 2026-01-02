'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'
import * as XLSX from 'xlsx'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { useMetadata } from '@/lib/context/metadata-context'
import { queryAll } from '@/lib/services/database.service'
import { transformObservaciones, type ViewObservacionCama } from '@/lib/transforms/observaciones'
import { formatDate } from '@/lib/utils/format'

interface DownloadDialogProps {
    date?: DateRange
    fincaId?: number
    bloqueId?: number
    variedadId?: number
    usuarioId?: string
}

export function DownloadDialog({
    date,
    fincaId,
    bloqueId,
    variedadId,
    usuarioId
}: DownloadDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const metadata = useMetadata()
    const { fincas, bloques, variedades, users } = metadata

    const handleDownload = async () => {
        try {
            setLoading(true)
            
            // 1. Build Query
            const where: Record<string, any> = {}
            if (date?.from) {
                const fromStr = format(date.from, 'yyyy-MM-dd')
                const toStr = date.to ? format(date.to, 'yyyy-MM-dd') : fromStr
                where.fecha_gte = fromStr
                where.fecha_lte = toStr
            }
            if (fincaId) where.id_finca = fincaId
            if (bloqueId) where.id_bloque = bloqueId
            if (variedadId) where.id_variedad = variedadId
            if (usuarioId) where.usuario_ids_cs = `{${usuarioId}}`

            // 2. Fetch Data
            const rawData = await queryAll<ViewObservacionCama>('v_observacion_cama', {
                orderBy: 'primera_hora',
                where
            })

            // 3. Transform Data
            const rows = transformObservaciones(rawData, metadata)

            // 4. Format for Excel
            const excelRows = rows.map(r => {
                // Calculate sums
                const sum = (key: keyof typeof r.camas[0]) => 
                    r.camas.reduce((acc, c) => acc + (typeof c[key] === 'number' ? c[key] as number : 0), 0)
                
                const users = [...new Set(r.camas.flatMap(c => c.usuarios))].join(', ')

                return {
                    Fecha: formatDate(r.camas[0].primeraHora),
                    Finca: r.finca,
                    Bloque: r.bloque,
                    Variedad: r.variedad,
                    Estado: r.estado,
                    'Camas': r.camas.map(c => c.cama).join(', '),
                    'Arroz': sum('arroz'),
                    'Arveja': sum('arveja'),
                    'Garbanzo': sum('garbanzo'),
                    'Rayando Color': sum('rayando_color'),
                    'Sépalos Abiertos': sum('sepalos_abiertos'),
                    '%': (sum('pct') / 100), // Raw number for Excel percentage formatting if possible, or string
                    'Usuarios': users
                }
            })

            // 5. Generate File
            const ws = XLSX.utils.json_to_sheet(excelRows)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Observaciones")
            
            const fileName = `Observaciones_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`
            XLSX.writeFile(wb, fileName)

            setOpen(false)
        } catch (error) {
            console.error("Download failed", error)
        } finally {
            setLoading(false)
        }
    }

    // Filter descriptions
    const filters = [
        { label: 'Fecha', value: date?.from ? `${formatDate(date.from)} - ${date.to ? formatDate(date.to) : ''}` : 'Todas' },
        { label: 'Finca', value: fincaId ? fincas.get(fincaId) : 'Todas' },
        { label: 'Bloque', value: bloqueId ? bloques.get(bloqueId)?.nombre : 'Todos' },
        { label: 'Variedad', value: variedadId ? variedades.get(variedadId) : 'Todas' },
        { label: 'Usuario', value: usuarioId ? users.get(usuarioId) : 'Todos' },
    ]

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                    <Download className="size-4" />
                    Exportar Excel
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Exportar Observaciones</DialogTitle>
                    <DialogDescription>
                        Se descargará un archivo Excel con todas las observaciones que coincidan con los filtros actuales.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-2">
                    <h4 className="text-sm font-medium">Filtros Activos:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm border rounded-lg p-3 bg-muted/20">
                        {filters.map((f, i) => (
                            <div key={i} className="flex flex-col">
                                <span className="text-muted-foreground text-xs uppercase tracking-wider">{f.label}</span>
                                <span className="font-medium truncate" title={f.value}>{f.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleDownload} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {loading && <Spinner className="mr-2 size-4" />}
                        {loading ? 'Generando...' : 'Descargar Excel'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
