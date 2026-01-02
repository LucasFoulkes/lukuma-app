'use client'

import { useState, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { DataTable, Column } from '@/components/data-table/data-table'
import { DatePicker } from '@/components/date-picker'
import { SelectFilter } from '@/components/select-filter'
import { DownloadDialog } from '@/components/download-dialog'
import { HeaderActions } from '@/components/header-actions'
import { formatTime, formatDate, formatDuration, formatPct } from '@/lib/utils/format'
import { useObservaciones, type ObservacionRow } from '@/lib/hooks/use-observaciones'
import { type CamaDetail } from '@/lib/transforms/observaciones'
import { DateRange } from 'react-day-picker'
import { useMetadata } from '@/lib/context/metadata-context'

// Helpers to compute aggregates from camas
type NumericCamaKey = {
    [K in keyof CamaDetail]: CamaDetail[K] extends number ? K : never
}[keyof CamaDetail]

const sum = (r: ObservacionRow, key: NumericCamaKey) => r.camas.reduce((acc, c) => acc + c[key], 0)
const first = (r: ObservacionRow) => r.camas.reduce((best, c) => (c.primeraHora.getTime() < best.primeraHora.getTime() ? c : best), r.camas[0]!)
const usuarios = (r: ObservacionRow) => {
    const names = [...new Set(r.camas.flatMap(c => c.usuarios))]
    if (names.length <= 2) return names.join(', ')
    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`
}

const dialogColumns: Column<CamaDetail>[] = [
    { key: 'cama', label: 'Cama' },
    { key: 'primeraHora', label: 'Inicio', render: r => formatTime(r.primeraHora) },
    { key: 'duracion', label: 'Duración', render: r => formatDuration(r.primeraHora, r.ultimaHora) },
    { key: 'arroz', label: 'Arroz', className: 'text-center' },
    { key: 'arveja', label: 'Arveja', className: 'text-center' },
    { key: 'garbanzo', label: 'Garbanzo', className: 'text-center' },
    { key: 'rayando_color', label: 'Rayando Color', className: 'text-center' },
    { key: 'sepalos_abiertos', label: 'Sépalos Abiertos', className: 'text-center' },
    { key: 'pct', label: '%', className: 'text-center', render: r => formatPct(r.pct) },
    { key: 'usuarios', label: 'Usuarios', className: 'max-w-[150px] truncate', render: r => r.usuarios.join(', ') }
]

export default function ObservacionesPage() {
    const [date, setDate] = useState<DateRange | undefined>()
    const [fincaId, setFincaId] = useState<number | undefined>()
    const [bloqueId, setBloqueId] = useState<number | undefined>()
    const [variedadId, setVariedadId] = useState<number | undefined>()
    const [usuarioId, setUsuarioId] = useState<string | undefined>()

    const { fincas, bloques, variedades, users } = useMetadata()
    const { data, loading, loadMore, loadingMore } = useObservaciones(date, fincaId, bloqueId, variedadId, usuarioId)
    const [selected, setSelected] = useState<ObservacionRow | null>(null)

    // Prepare options for filters
    const fincaOptions = useMemo(() => 
        Array.from(fincas.entries()).map(([id, name]) => ({ value: id, label: name })), 
    [fincas])

    const bloqueOptions = useMemo(() => {
        const all = Array.from(bloques.entries()).map(([id, b]) => ({ value: id, label: b.nombre, fincaId: b.id_finca }))
        if (!fincaId) return all
        return all.filter(b => b.fincaId === fincaId)
    }, [bloques, fincaId])

    const variedadOptions = useMemo(() => 
        Array.from(variedades.entries()).map(([id, name]) => ({ value: id, label: name })), 
    [variedades])

    const usuarioOptions = useMemo(() => 
        Array.from(users.entries()).map(([id, name]) => ({ value: id, label: name })), 
    [users])

    const mainColumns = useMemo<Column<ObservacionRow>[]>(() => [
        {
            key: 'fecha',
            label: 'Fecha',
            header: () => <DatePicker date={date} onDateChange={setDate} placeholder="Fecha" />,
            className: 'text-center',
            render: r => formatDate(first(r).primeraHora)
        },
        { 
            key: 'finca', 
            label: 'Finca', 
            header: () => <SelectFilter title="Finca" value={fincaId} onChange={setFincaId} options={fincaOptions} />, 
            className: 'max-w-[100px] truncate text-center' 
        },
        { 
            key: 'bloque', 
            label: 'Bloque', 
            header: () => <SelectFilter title="Bloque" value={bloqueId} onChange={setBloqueId} options={bloqueOptions} />, 
            className: 'text-center' 
        },
        {
            key: 'camas',
            label: 'Camas',
            render: r => {
                const visible = r.camas.slice(0, 3)
                const remaining = r.camas.length - 3
                return (
                    <div className="flex flex-wrap gap-1">
                        {visible.map(c => <Badge key={`${c.idCama}`} variant="secondary">{c.cama}</Badge>)}
                        {remaining > 0 && <Badge variant="outline">+{remaining}</Badge>}
                    </div>
                )
            }
        },
        { 
            key: 'variedad', 
            label: 'Variedad', 
            header: () => <SelectFilter title="Variedad" value={variedadId} onChange={setVariedadId} options={variedadOptions} />, 
            className: 'max-w-[120px] truncate text-center' 
        },
        { key: 'estado', label: 'Estado', header: () => <div className="text-center w-full">Estado</div>, className: 'text-center' },
        { key: 'arroz', label: 'Arroz', className: 'text-center', render: r => sum(r, 'arroz') },
        { key: 'arveja', label: 'Arveja', className: 'text-center', render: r => sum(r, 'arveja') },
        { key: 'garbanzo', label: 'Garbanzo', className: 'text-center', render: r => sum(r, 'garbanzo') },
        { key: 'rayando_color', label: 'Rayando Color', className: 'text-center', render: r => sum(r, 'rayando_color') },
        { key: 'sepalos_abiertos', label: 'Sépalos Abiertos', className: 'text-center', render: r => sum(r, 'sepalos_abiertos') },
        { key: 'pct', label: '%', className: 'text-center', render: r => formatPct(sum(r, 'pct')) },
        { 
            key: 'usuarios', 
            label: 'Usuarios', 
            header: () => <SelectFilter title="Usuarios" value={usuarioId} onChange={setUsuarioId} options={usuarioOptions} />,
            className: 'max-w-[150px] truncate', 
            render: r => usuarios(r) 
        }
    ], [date, fincaId, bloqueId, variedadId, usuarioId, fincaOptions, bloqueOptions, variedadOptions, usuarioOptions])

    return (
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
            <HeaderActions>
                <DownloadDialog 
                    date={date}
                    fincaId={fincaId}
                    bloqueId={bloqueId}
                    variedadId={variedadId}
                    usuarioId={usuarioId}
                />
            </HeaderActions>
            {loading ? (
                <div className="flex items-center justify-center flex-1">
                    <Spinner className="size-5" />
                </div>
            ) : (
                <ScrollArea className="flex-1 min-h-0">
                    <DataTable
                        columns={mainColumns}
                        data={data}
                        getRowKey={r => `${r.fecha}|${r.finca}|${r.bloque}|${r.variedad}`}
                        getRowClassName={r => r.estado.toLowerCase() === 'vegetativo' ? 'bg-orange-100/80 hover:bg-orange-200/80 border-l-4 border-l-orange-400' : ''}
                        onRowClick={setSelected}
                        onLoadMore={loadMore}
                        isLoadingMore={loadingMore}
                    />
                </ScrollArea>
            )}

            <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
                <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="p-6 border-b bg-muted/30">
                        <div className="flex flex-col gap-1">
                            <DialogTitle className="text-xl">Detalle de Observaciones</DialogTitle>
                            <p className="text-sm text-muted-foreground">
                                {selected && `${formatDate(first(selected).primeraHora)} • ${selected.finca} • Bloque ${selected.bloque} • ${selected.variedad}`}
                            </p>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="p-6">
                                <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
                                    <DataTable
                                        columns={dialogColumns}
                                        data={selected?.camas || []}
                                        getRowKey={r => r.idCama}
                                    />
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
