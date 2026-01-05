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
import { transformPinches, type PincheData } from '@/lib/transforms/pinches'
import { formatDate, formatTime } from '@/lib/utils/format'

interface DownloadPinchesDialogProps {
    date?: DateRange
    fincaId?: number
    bloqueId?: number
    variedadId?: number
    tipo?: string
}

export function DownloadPinchesDialog({
    date,
    fincaId,
    bloqueId,
    variedadId,
    tipo
}: DownloadPinchesDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const metadata = useMetadata()
    const { bloques } = metadata

    const handleDownload = async () => {
        try {
            setLoading(true)

            // 1. Build Query
            const where: Record<string, any> = {}
            if (date?.from) {
                const fromStr = format(date.from, 'yyyy-MM-dd')
                const toStr = date.to ? format(date.to, 'yyyy-MM-dd') : fromStr
                where.created_at_gte = `${fromStr}T00:00:00`
                where.created_at_lte = `${toStr}T23:59:59`
            }

            if (fincaId) {
                const blockIds: number[] = []
                for (const [id, b] of bloques.entries()) {
                    if (b.id_finca === fincaId) {
                        blockIds.push(id)
                    }
                }
                if (blockIds.length > 0) {
                    where.bloque_in = blockIds
                } else {
                    where.bloque = -1 
                }
            }

            if (bloqueId) where.bloque = bloqueId
            if (variedadId) where.variedad = variedadId
            if (tipo) where.tipo = tipo

            // 2. Fetch Data
            const rawData = await queryAll<PincheData>('pinche', {
                orderBy: 'created_at',
                ascending: false,
                where
            })

            // 3. Transform Data
            const rows = transformPinches(rawData, metadata)

            // 4. Format for Excel
            const excelRows = rows.map(r => ({
                Fecha: formatDate(r.fecha),
                Hora: formatTime(r.fecha),
                Finca: r.finca,
                Bloque: r.bloque,
                Variedad: r.variedad,
                Tipo: r.tipo,
                Cantidad: r.cantidad
            }))

            // 5. Generate File
            const ws = XLSX.utils.json_to_sheet(excelRows)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Pinches")

            XLSX.writeFile(wb, `pinches_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
            setOpen(false)
        } catch (error) {
            console.error('Failed to download', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white hover:text-white border-0 gap-2"
                >
                    <Download className="size-4" />
                    Excel
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Descargar Reporte de Pinches</DialogTitle>
                    <DialogDescription>
                        Se descargará un archivo Excel con todos los registros que coincidan con los filtros actuales.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleDownload} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {loading && <Spinner className="mr-2 size-4" />}
                        Descargar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
