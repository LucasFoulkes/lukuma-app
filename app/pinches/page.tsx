'use client'

import { useState, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { DataTable, Column } from '@/components/data-table/data-table'
import { DatePicker } from '@/components/date-picker'
import { SelectFilter } from '@/components/select-filter'
import { DownloadPinchesDialog } from '@/components/download-pinches-dialog'
import { HeaderActions } from '@/components/header-actions'
import { formatDate, formatTime } from '@/lib/utils/format'
import { usePinches, type PincheRow } from '@/lib/hooks/use-pinches'
import { DateRange } from 'react-day-picker'
import { useMetadata } from '@/lib/context/metadata-context'

const PINCHE_TYPES = [
    'pinche programado',
    'pinche apertura',
    'pinche sanitario'
]

export default function PinchesPage() {
    const [date, setDate] = useState<DateRange | undefined>()
    const [bloqueId, setBloqueId] = useState<number | undefined>()
    const [variedadId, setVariedadId] = useState<number | undefined>()
    const [tipo, setTipo] = useState<string | undefined>()

    const { bloques, variedades } = useMetadata()
    const { data, loading, loadMore, loadingMore } = usePinches(date, bloqueId, variedadId, tipo)

    // Prepare options for filters
    const bloqueOptions = useMemo(() => 
        Array.from(bloques.entries()).map(([id, b]) => ({ value: id, label: b.nombre })), 
    [bloques])

    const variedadOptions = useMemo(() => 
        Array.from(variedades.entries()).map(([id, name]) => ({ value: id, label: name })), 
    [variedades])

    const tipoOptions = useMemo(() => 
        PINCHE_TYPES.map(t => ({ value: t, label: t })), 
    [])

    const columns = useMemo<Column<PincheRow>[]>(() => [
        {
            key: 'fecha',
            label: 'Fecha',
            header: () => <DatePicker date={date} onDateChange={setDate} placeholder="Fecha" />,
            className: 'text-center',
            render: r => (
                <div className="flex flex-col">
                    <span>{formatDate(r.fecha)}</span>
                    <span className="text-xs text-muted-foreground">{formatTime(r.fecha)}</span>
                </div>
            )
        },
        { 
            key: 'bloque', 
            label: 'Bloque', 
            header: () => <SelectFilter title="Bloque" value={bloqueId} onChange={setBloqueId} options={bloqueOptions} />, 
            className: 'text-center' 
        },
        { 
            key: 'variedad', 
            label: 'Variedad', 
            header: () => <SelectFilter title="Variedad" value={variedadId} onChange={setVariedadId} options={variedadOptions} />, 
            className: 'text-center' 
        },
        {
            key: 'cama',
            label: 'Cama',
            className: 'text-center',
            render: r => r.cama || '-'
        },
        { 
            key: 'tipo', 
            label: 'Tipo', 
            header: () => <SelectFilter title="Tipo" value={tipo} onChange={setTipo} options={tipoOptions} />, 
            className: 'text-center capitalize' 
        },
        { 
            key: 'cantidad', 
            label: 'Cantidad', 
            className: 'text-center font-medium' 
        }
    ], [date, bloqueId, variedadId, tipo, bloqueOptions, variedadOptions, tipoOptions])

    return (
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
            <HeaderActions>
                <DownloadPinchesDialog 
                    date={date}
                    bloqueId={bloqueId}
                    variedadId={variedadId}
                    tipo={tipo}
                />
            </HeaderActions>
            {loading ? (
                <div className="flex items-center justify-center flex-1">
                    <Spinner className="size-5" />
                </div>
            ) : (
                <ScrollArea className="flex-1 min-h-0">
                    <DataTable
                        columns={columns}
                        data={data}
                        getRowKey={r => r.id}
                        onLoadMore={loadMore}
                        isLoadingMore={loadingMore}
                    />
                </ScrollArea>
            )}
        </div>
    )
}
