'use client'

import { memo, useState, useCallback, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from '@/lib/utils'
import { ColumnFilter, LoadingRow, EmptyRow } from '@/components/data-table'
import { useMetadata } from '@/lib/context/metadata-context'
import { processProjections, PrediccionRow, TimelineRow, SourceInfo, OBS_COLUMNS, FULL_STAGE_ORDER, EstadoFenologico } from './config'

// --- Row Components ---
const PrediccionRowComponent = memo(({ row, className, onRowClick }: {
    row: PrediccionRow; className?: string; onRowClick: (row: PrediccionRow) => void
}) => (
    <TableRow className={cn("hover:bg-muted/50 transition-colors cursor-pointer", className)} onClick={() => onRowClick(row)}>
        <TableCell className="whitespace-nowrap font-medium text-center">{row.fecha}</TableCell>
        <TableCell className="text-center">{row.finca}</TableCell>
        <TableCell className="text-center">{row.bloque}</TableCell>
        <TableCell className="p-0">
            <div className="w-[140px] px-4 py-2 mx-auto">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="truncate w-full cursor-help text-muted-foreground hover:text-foreground transition-colors text-center">{row.variedad}</div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-foreground text-background"><p>{row.variedad}</p></TooltipContent>
                </Tooltip>
            </div>
        </TableCell>
        {OBS_COLUMNS.map(col => (
            <TableCell key={col} className="text-center">{row.tipos[col] || '-'}</TableCell>
        ))}
        <TableCell className="text-center font-medium">{row.cosechaDisponible || '-'}</TableCell>
    </TableRow>
), (prev, next) => prev.row.key === next.row.key && prev.className === next.className)
PrediccionRowComponent.displayName = 'PrediccionRow'

const TimelineRowComponent = ({ row, isToday, onRowClick }: { row: TimelineRow; isToday: boolean; onRowClick: (row: TimelineRow) => void }) => (
    <TableRow
        className={cn("hover:bg-muted/50 cursor-pointer", isToday && "bg-primary/10 font-medium")}
        onClick={() => onRowClick(row)}
    >
        <TableCell className="whitespace-nowrap text-center">{row.fecha}</TableCell>
        {OBS_COLUMNS.map(col => (
            <TableCell key={col} className="text-center">{row.tipos[col] || '-'}</TableCell>
        ))}
        <TableCell className="text-center font-medium">{row.cosechaDisponible || '-'}</TableCell>
    </TableRow>
)

// --- Main Component ---
export default function PrediccionesPage() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const metadata = useMetadata()

    // Data state
    const [rows, setRows] = useState<PrediccionRow[]>([])
    const [estadosMap, setEstadosMap] = useState<Map<string, EstadoFenologico>>(new Map())
    const [isLoading, setIsLoading] = useState(true)
    const [filters, setFilters] = useState<Record<string, Set<string>>>({
        finca: new Set(),
        bloque: new Set(),
        variedad: new Set()
    })

    // Detail Dialog
    const [detailRow, setDetailRow] = useState<PrediccionRow | null>(null)
    const [selectedTimelineRow, setSelectedTimelineRow] = useState<TimelineRow | null>(null)
    const handleRowClick = useCallback((row: PrediccionRow) => setDetailRow(row), [])
    const handleTimelineRowClick = useCallback((row: TimelineRow) => setSelectedTimelineRow(row), [])

    // Fetch all data
    useEffect(() => {
        if (metadata.loading) return

        async function fetchData() {
            setIsLoading(true)

            // Calculate date range: 100 days back to capture full cycle
            const endDate = new Date()
            endDate.setHours(23, 59, 59, 999)
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - 100)
            startDate.setHours(0, 0, 0, 0)

            // Fetch observations, pinches, estado_fenologico, and produccion in parallel
            // Note: Use range to get more than the default 1000 limit
            const [obsResult, pincheResult, estadoResult, prodResult] = await Promise.all([
                supabase
                    .from('observacion')
                    .select('*')
                    .gte('creado_en', startDate.toISOString())
                    .lte('creado_en', endDate.toISOString())
                    .range(0, 9999),  // Get up to 10000 observations
                supabase
                    .from('pinche')
                    .select('*')
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString())
                    .range(0, 9999),  // Get up to 10000 pinches
                supabase
                    .from('estado_fenologico')
                    .select('id_bloque, id_variedad, dias_brotacion, dias_cincuenta_mm, dias_quince_cm, dias_veinte_cm, dias_primera_hoja, dias_espiga, dias_arroz, dias_arveja, dias_garbanzo, dias_uva, dias_rayando_color, dias_sepalos_abiertos, dias_cosecha'),
                supabase
                    .from('produccion')
                    .select('*')
                    .gte('created_at', startDate.toISOString())
            ])

            const observaciones = obsResult.data || []
            const pinches = pincheResult.data || []
            const estadosFenologicos = estadoResult.data || []
            const producciones = prodResult.data || []

            // Build estados map for dialog display
            const estadoMap = new Map<string, EstadoFenologico>()
            estadosFenologicos.forEach((e: EstadoFenologico) => {
                estadoMap.set(`${e.id_bloque}-${e.id_variedad}`, e)
            })
            setEstadosMap(estadoMap)

            // Process projections
            const projectedRows = processProjections(
                observaciones,
                pinches,
                estadosFenologicos,
                producciones,
                metadata
            )

            setRows(projectedRows)
            setIsLoading(false)
        }

        fetchData()
    }, [metadata.loading, metadata, supabase])

    // Filter rows
    const filteredRows = useMemo(() => {
        return rows.filter(row => {
            if (filters.finca.size > 0 && !filters.finca.has(row.finca)) return false
            if (filters.bloque.size > 0 && !filters.bloque.has(row.bloque)) return false
            if (filters.variedad.size > 0 && !filters.variedad.has(row.variedad)) return false
            return true
        })
    }, [rows, filters])

    // Filter options
    const filterOptions = useMemo(() => {
        const allBeds = Array.from(metadata.beds.values())
        return {
            finca: [...new Set(allBeds.map(b => b.finca))].filter(Boolean).sort(),
            bloque: [...new Set(allBeds.filter(b => !filters.finca.size || filters.finca.has(b.finca)).map(b => b.bloque))].filter(Boolean).sort(),
            variedad: [...new Set(allBeds.filter(b =>
                (!filters.finca.size || filters.finca.has(b.finca)) &&
                (!filters.bloque.size || filters.bloque.has(b.bloque))
            ).map(b => b.variedad))].filter(Boolean).sort()
        }
    }, [metadata.beds, filters])

    // Border class for grouping
    const getBorderClass = (curr: PrediccionRow, next?: PrediccionRow) => {
        if (!next) return ''
        if (curr.finca !== next.finca) return 'border-b-2 border-primary/30'
        if (curr.bloque !== next.bloque) return 'border-b border-muted-foreground/20'
        return ''
    }

    // Today's date string for highlighting
    const todayStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

    const colSpan = 4 + OBS_COLUMNS.length + 1  // fecha + finca + bloque + variedad + stages + cosecha

    return (
        <TooltipProvider delayDuration={100}>
            {/* Sources Dialog - Shows which observations contributed to a timeline row */}
            <Dialog open={!!selectedTimelineRow} onOpenChange={(o) => !o && setSelectedTimelineRow(null)}>
                <DialogContent className="w-fit !max-w-[90vw] max-h-[70vh] p-0 flex flex-col overflow-hidden">
                    <DialogHeader className="p-4 pb-2 shrink-0 border-b">
                        <DialogTitle className="flex items-center gap-2 flex-wrap">
                            <span>Fuentes para</span>
                            <span className="text-primary">{selectedTimelineRow?.fecha}</span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 overflow-auto">
                        {selectedTimelineRow?.sources && selectedTimelineRow.sources.length > 0 ? (() => {
                            // Group sources by original observation (id + type + fecha)
                            const byObservation = new Map<string, {
                                type: string
                                id: number
                                fecha: string
                                camas: Set<string>
                                stages: Record<string, number>
                            }>()

                            selectedTimelineRow.sources.forEach(src => {
                                const key = `${src.type}-${src.id}-${src.fecha}`
                                if (!byObservation.has(key)) {
                                    byObservation.set(key, {
                                        type: src.type,
                                        id: src.id,
                                        fecha: src.fecha,
                                        camas: new Set(),
                                        stages: {}
                                    })
                                }
                                const entry = byObservation.get(key)!
                                if (src.cama) entry.camas.add(src.cama)
                                const stage = src.originalStage || 'otros'
                                entry.stages[stage] = (entry.stages[stage] || 0) + src.cantidad
                            })

                            // All stages to show (OBS_COLUMNS)
                            const stageColumns = [...OBS_COLUMNS] as const

                            return (
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10">
                                        <TableRow>
                                            <TableHead className="text-center font-bold">Fecha</TableHead>
                                            <TableHead className="text-center font-bold">Tipo</TableHead>
                                            <TableHead className="text-center font-bold">Camas</TableHead>
                                            {stageColumns.map(col => (
                                                <TableHead key={col} className="text-center font-bold capitalize">{col.replace('_', ' ')}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Array.from(byObservation.values()).map((obs) => (
                                            <TableRow key={`${obs.type}-${obs.id}`} className="hover:bg-muted/50">
                                                <TableCell className="text-center whitespace-nowrap">
                                                    {new Date(obs.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </TableCell>
                                                <TableCell className="text-center capitalize text-xs">{obs.type}</TableCell>
                                                <TableCell className="text-center font-medium">{obs.camas.size}</TableCell>
                                                {stageColumns.map(stage => {
                                                    const val = obs.stages[stage] || 0
                                                    return (
                                                        <TableCell key={stage} className="text-center">
                                                            {val > 0 ? <span className="font-medium">{val}</span> : '-'}
                                                        </TableCell>
                                                    )
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )
                        })() : (
                            <div className="text-center text-muted-foreground py-8">
                                No hay fuentes para esta fecha
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Detail Dialog - Timeline for selected finca/bloque/variedad */}
            <Dialog open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
                <DialogContent className="w-fit !max-w-[95vw] max-h-[85vh] p-0 flex flex-col overflow-hidden">
                    <DialogHeader className="p-4 pb-2 shrink-0 border-b">
                        <DialogTitle className="flex items-center gap-2 flex-wrap">
                            <span>{detailRow?.finca}</span><span className="text-muted-foreground">•</span>
                            <span>{detailRow?.bloque}</span><span className="text-muted-foreground">•</span>
                            <span className="text-primary">{detailRow?.variedad}</span>
                        </DialogTitle>
                    </DialogHeader>
                    {/* Estado Fenológico Duration Table */}
                    {detailRow && (() => {
                        const estado = estadosMap.get(`${detailRow.id_bloque}-${detailRow.id_variedad}`)
                        const defaultDurations: Record<string, number> = {
                            brotacion: 14, cincuenta_mm: 7, quince_cm: 7, veinte_cm: 7, primera_hoja: 7,
                            espiga: 7, arroz: 7, arveja: 5, garbanzo: 4, uva: 3, rayando_color: 3,
                            sepalos_abiertos: 2, cosecha: 1
                        }
                        const stageLabels: Record<string, string> = {
                            brotacion: 'brotación', cincuenta_mm: '50mm', quince_cm: '15cm', veinte_cm: '20cm',
                            primera_hoja: 'hoja', espiga: 'espiga', arroz: 'arroz', arveja: 'arveja',
                            garbanzo: 'garbanzo', uva: 'uva', rayando_color: 'color', sepalos_abiertos: 'abiertos', cosecha: 'cosecha'
                        }
                        return (
                            <div className="px-3 py-2 bg-muted/30 border-b overflow-x-auto shrink-0">
                                <div className="text-[10px] text-muted-foreground mb-1">Días por etapa:</div>
                                <div className="flex text-xs">
                                    {FULL_STAGE_ORDER.map((stage, i) => {
                                        const diasKey = `dias_${stage}` as keyof EstadoFenologico
                                        const days = estado?.[diasKey] as number ?? defaultDurations[stage] ?? 0
                                        return (
                                            <div key={stage} className={`text-center px-2 ${i < FULL_STAGE_ORDER.length - 1 ? 'border-r' : ''}`}>
                                                <div className="font-medium text-muted-foreground">{stageLabels[stage] || stage}</div>
                                                <div className="font-bold">{days || '-'}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })()}
                    <div className="flex-1 min-h-0 overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                    <TableHead className="text-center font-bold">Fecha</TableHead>
                                    {OBS_COLUMNS.map(c => <TableHead key={c} className="text-center font-bold capitalize">{c.replace('_', ' ')}</TableHead>)}
                                    <TableHead className="text-center font-bold">Cosecha</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {detailRow?._timeline.map(tl => (
                                    <TimelineRowComponent key={tl.key} row={tl} isToday={tl.fecha === todayStr} onRowClick={handleTimelineRowClick} />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Main Table */}
            <div className="flex-1 h-full overflow-hidden border bg-background">
                <ScrollArea className="h-full w-full">
                    <div className="min-w-max">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                                <TableRow className="hover:bg-background border-b">
                                    <TableHead className="text-center font-bold text-primary border-b">Fecha</TableHead>
                                    <TableHead className="text-center font-bold text-primary border-b">
                                        <ColumnFilter title="Finca" options={filterOptions.finca || []} selected={filters.finca} onChange={s => setFilters(f => ({ ...f, finca: s }))} />
                                    </TableHead>
                                    <TableHead className="text-center font-bold text-primary border-b">
                                        <ColumnFilter title="Bloque" options={filterOptions.bloque || []} selected={filters.bloque} onChange={s => setFilters(f => ({ ...f, bloque: s }))} />
                                    </TableHead>
                                    <TableHead className="w-[140px] text-center font-bold text-primary border-b">
                                        <ColumnFilter title="Variedad" options={filterOptions.variedad || []} selected={filters.variedad} onChange={s => setFilters(f => ({ ...f, variedad: s }))} />
                                    </TableHead>
                                    {OBS_COLUMNS.map(c => <TableHead key={c} className="text-center font-bold border-b bg-slate-50/30 capitalize">{c.replace('_', ' ')}</TableHead>)}
                                    <TableHead className="text-center font-bold border-b bg-green-50/50">Cosecha</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? <LoadingRow colSpan={colSpan} /> : filteredRows.length === 0 ? <EmptyRow colSpan={colSpan} message="No hay predicciones para mostrar" /> : (
                                    <>
                                        {filteredRows.map((row, i) => (
                                            <PrediccionRowComponent
                                                key={row.key}
                                                row={row}
                                                className={getBorderClass(row, filteredRows[i + 1])}
                                                onRowClick={handleRowClick}
                                            />
                                        ))}
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>
            </div>
        </TooltipProvider>
    )
}
