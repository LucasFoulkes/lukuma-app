'use client'

import { useEffect, useState, useRef, memo, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Map as MapIcon, Calendar as CalendarIcon, X, Filter, Check } from 'lucide-react'
import { es } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { HeaderPortal } from '@/components/ui/header-portal'
import { getTableData } from '@/lib/services/database.service'
import { cn } from '@/lib/utils'

// --- Configuration ---
const OBS_COLUMNS = ['arroz', 'arveja', 'garbanzo', 'rayando_color', 'sepalos_abiertos']

// --- Types ---
type Metadata = {
    beds: Map<string, { cama: string; bloque: string; finca: string; variedad: string; id_bloque: string; id_variedad: string }>
    users: Map<string, string>
}

type Filters = {
    finca: Set<string>
    bloque: Set<string>
    variedad: Set<string>
    cama: Set<string>
    usuario: Set<string>
}

type ProcessedRow = {
    key: string
    fecha: string
    finca: string
    bloque: string
    cama: string
    variedad: string
    tipos: Record<string, number>
    users: string
    _u: Set<string>
    _g: Set<string>
}

// --- Components ---
const ColumnFilter = memo(({ title, options, selected, onChange }: {
    title: string
    options: string[]
    selected: Set<string>
    onChange: (s: Set<string>) => void
}) => (
    <Popover>
        <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className={cn("h-8 text-xs font-bold hover:bg-muted/50", selected.size > 0 ? "text-primary" : "text-muted-foreground")}>
                {title}
                {selected.size > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{selected.size}</Badge>}
                <Filter className="ml-1 h-3 w-3" />
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
                <CommandInput placeholder={`Buscar ${title}...`} className="h-8 text-xs" />
                <CommandList>
                    <CommandEmpty>No encontrado.</CommandEmpty>
                    <CommandGroup className="max-h-[200px] overflow-y-auto">
                        {options.map(option => (
                            <CommandItem
                                key={option}
                                onSelect={() => {
                                    const next = new Set(selected)
                                    selected.has(option) ? next.delete(option) : next.add(option)
                                    onChange(next)
                                }}
                                className="text-xs"
                            >
                                <div className={cn("mr-2 flex h-3 w-3 items-center justify-center rounded-sm border border-primary", selected.has(option) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                    <Check className="h-3 w-3" />
                                </div>
                                {option}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                    {selected.size > 0 && (
                        <>
                            <CommandSeparator />
                            <CommandGroup>
                                <CommandItem onSelect={() => onChange(new Set())} className="justify-center text-center text-xs font-medium">
                                    Limpiar filtros
                                </CommandItem>
                            </CommandGroup>
                        </>
                    )}
                </CommandList>
            </Command>
        </PopoverContent>
    </Popover>
))
ColumnFilter.displayName = 'ColumnFilter'

const ObservationRow = memo(({ row, showCama, className }: { row: ProcessedRow; showCama: boolean; className?: string }) => (
    <TableRow className={cn("hover:bg-muted/50 transition-colors", className)}>
        <TableCell className="whitespace-nowrap font-medium text-center">{row.fecha}</TableCell>
        <TableCell className="text-center">{row.finca}</TableCell>
        <TableCell className="text-center">{row.bloque}</TableCell>
        {showCama && <TableCell className="text-center">{row.cama}</TableCell>}
        <TableCell className="p-0">
            <div className="w-[140px] px-4 py-2 mx-auto">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="truncate w-full cursor-help text-muted-foreground hover:text-foreground transition-colors text-center">
                            {row.variedad}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-foreground text-background">
                        <p>{row.variedad}</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TableCell>
        {OBS_COLUMNS.map(col => (
            <TableCell key={col} className="text-center">{row.tipos[col] || '-'}</TableCell>
        ))}
        <TableCell className="text-xs text-muted-foreground truncate max-w-[150px] text-center" title={row.users}>
            {row.users || '-'}
        </TableCell>
        <TableCell className="p-0">
            <div className="flex items-center justify-center w-full h-full py-2">
                {row._g.size > 0 ? (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                <MapIcon className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-0">
                            <div className="text-sm font-medium py-2 px-3 border-b bg-muted/40">
                                Puntos GPS <span className="text-xs text-muted-foreground ml-1">({row._g.size})</span>
                            </div>
                            <ScrollArea className="h-48">
                                <div className="flex flex-col gap-1 p-2">
                                    {Array.from(row._g).map((gps, i) => (
                                        <div key={i} className="text-xs bg-muted p-1.5 rounded border font-mono text-center">{gps}</div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>
                ) : <span className="text-xs text-muted-foreground">-</span>}
            </div>
        </TableCell>
    </TableRow>
), (prev, next) => prev.row.key === next.row.key && prev.showCama === next.showCama && prev.className === next.className)
ObservationRow.displayName = 'ObservationRow'

// --- Main Component ---
export default function ObservacionesPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    // --- URL State ---
    const viewMode = (searchParams.get('view') as 'cama' | 'bloque') || 'cama'
    const setViewMode = (mode: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('view', mode)
        router.replace(`?${params.toString()}`, { scroll: false })
    }

    // --- Core State ---
    const [metadata, setMetadata] = useState<Metadata | null>(null)
    const [observations, setObservations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)

    // --- Filter State ---
    const [filters, setFilters] = useState<Filters>({
        finca: new Set(), bloque: new Set(), variedad: new Set(), cama: new Set(), usuario: new Set()
    })
    const [dateRange, setDateRange] = useState<DateRange | undefined>()
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>()
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)

    // --- Pagination ---
    const cursor = useRef(new Date())
    const hasMore = useRef(true)

    // ===================
    // 1. LOAD METADATA (once)
    // ===================
    useEffect(() => {
        const loadMetadata = async () => {
            const [camas, grupos, bloques, fincas, variedades, usuarios] = await Promise.all(
                ['cama', 'grupo_cama', 'bloque', 'finca', 'variedad', 'usuario'].map(t => getTableData(t as any))
            )

            const fincaMap = new Map(fincas.map((f: any) => [f.id_finca, f.nombre]))
            const variedadMap = new Map(variedades.map((v: any) => [v.id_variedad, v.nombre]))
            const bloqueMap = new Map(bloques.map((b: any) => [b.id_bloque, { nombre: b.nombre, id_finca: b.id_finca }]))
            const grupoMap = new Map(grupos.map((g: any) => [g.id_grupo, { id_bloque: g.id_bloque, id_variedad: g.id_variedad }]))

            const beds = new Map()
            camas.forEach((c: any) => {
                const grupo = grupoMap.get(c.id_grupo)
                const bloque = grupo && bloqueMap.get(grupo.id_bloque)
                if (bloque) {
                    beds.set(c.id_cama, {
                        cama: c.nombre,
                        bloque: bloque.nombre,
                        finca: fincaMap.get(bloque.id_finca),
                        variedad: variedadMap.get(grupo.id_variedad),
                        id_bloque: grupo.id_bloque,
                        id_variedad: grupo.id_variedad
                    })
                }
            })

            const users = new Map(usuarios.map((u: any) => [u.id_usuario, `${u.nombres} ${u.apellidos || ''}`.trim()]))
            setMetadata({ beds, users })
        }
        loadMetadata()
    }, [])

    // ===================
    // 2. FETCH DATA (when metadata ready or filters/dateRange change)
    // ===================
    useEffect(() => {
        if (!metadata) return

        const fetchData = async () => {
            setLoading(true)
            setObservations([])
            hasMore.current = true
            cursor.current = new Date()

            // Build query with filters
            let query = supabase.from('observacion').select('*')

            // Apply bed filters (server-side)
            const bedFilters = { finca: filters.finca, bloque: filters.bloque, variedad: filters.variedad, cama: filters.cama }
            const hasBedFilters = Object.values(bedFilters).some(s => s.size > 0)
            if (hasBedFilters) {
                const matchingBedIds = Array.from(metadata.beds.entries())
                    .filter(([_, bed]) => {
                        if (filters.finca.size > 0 && !filters.finca.has(bed.finca)) return false
                        if (filters.bloque.size > 0 && !filters.bloque.has(bed.bloque)) return false
                        if (filters.variedad.size > 0 && !filters.variedad.has(bed.variedad)) return false
                        if (filters.cama.size > 0 && !filters.cama.has(bed.cama)) return false
                        return true
                    })
                    .map(([id]) => id)
                query = query.in('id_cama', matchingBedIds)
            }

            // Apply user filter (server-side)
            if (filters.usuario.size > 0) {
                const matchingUserIds = Array.from(metadata.users.entries())
                    .filter(([_, name]) => filters.usuario.has(name))
                    .map(([id]) => id)
                query = query.in('id_usuario', matchingUserIds)
            }

            // Apply date filter
            if (dateRange?.from) {
                hasMore.current = false
                const start = new Date(dateRange.from); start.setHours(0, 0, 0, 0)
                const end = dateRange.to ? new Date(dateRange.to) : new Date(start); end.setHours(23, 59, 59, 999)
                query = query.gte('creado_en', start.toISOString()).lte('creado_en', end.toISOString())
            } else {
                // Default: last 7 days
                const end = new Date(); end.setHours(23, 59, 59, 999)
                const start = new Date(); start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0)
                query = query.gte('creado_en', start.toISOString()).lte('creado_en', end.toISOString())
                cursor.current = new Date(start); cursor.current.setDate(cursor.current.getDate() - 1)
            }

            const { data } = await query.order('creado_en', { ascending: false })
            setObservations(data || [])
            setLoading(false)
        }

        fetchData()
    }, [metadata, filters, dateRange])

    // ===================
    // 3. PROCESS DATA → ROWS (derived, memoized)
    // ===================
    const rows = useMemo(() => {
        if (!metadata || observations.length === 0) return []

        const rowMap = new Map<string, ProcessedRow>()

        observations.forEach(obs => {
            const bed = metadata.beds.get(obs.id_cama)
            if (!bed) return

            const fecha = new Date(obs.creado_en).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
            const key = viewMode === 'cama'
                ? `${fecha}-${obs.id_cama}`
                : `${fecha}-${bed.id_bloque}-${bed.id_variedad}`

            let row = rowMap.get(key)
            if (!row) {
                row = {
                    key, fecha,
                    finca: bed.finca,
                    bloque: bed.bloque,
                    cama: viewMode === 'cama' ? bed.cama : '-',
                    variedad: bed.variedad,
                    tipos: {},
                    users: '',
                    _u: new Set(),
                    _g: new Set()
                }
                rowMap.set(key, row)
            }

            if (obs.tipo_observacion) row.tipos[obs.tipo_observacion] = (row.tipos[obs.tipo_observacion] || 0) + (obs.cantidad || 0)
            if (obs.id_usuario) row._u.add(metadata.users.get(obs.id_usuario) || '')
            if (obs.id_punto_gps) row._g.add(obs.id_punto_gps)
        })

        // Finalize and sort
        return Array.from(rowMap.values())
            .map(row => ({ ...row, users: Array.from(row._u).filter(Boolean).join(', ') }))
            .sort((a, b) =>
                new Date(b.fecha).getTime() - new Date(a.fecha).getTime() ||
                a.finca.localeCompare(b.finca) ||
                a.bloque.localeCompare(b.bloque) ||
                a.cama.localeCompare(b.cama)
            )
    }, [observations, metadata, viewMode])

    // ===================
    // 4. FILTER OPTIONS (derived from loaded data - no extra queries!)
    // ===================
    const filterOptions = useMemo(() => {
        if (!metadata) return { finca: [], bloque: [], variedad: [], cama: [], usuario: [] }

        // Get unique values from the LOADED observations
        const activeBedIds = new Set(observations.map(o => o.id_cama))
        const activeUserIds = new Set(observations.map(o => o.id_usuario))

        const activeBeds = Array.from(metadata.beds.entries())
            .filter(([id]) => activeBedIds.has(id))
            .map(([_, bed]) => bed)

        const activeUsers = Array.from(metadata.users.entries())
            .filter(([id]) => activeUserIds.has(id))
            .map(([_, name]) => name)

        // Cascade: when a filter is applied, narrow down other options
        const getFilteredBeds = (exclude?: keyof Filters) => {
            return activeBeds.filter(bed => {
                if (exclude !== 'finca' && filters.finca.size > 0 && !filters.finca.has(bed.finca)) return false
                if (exclude !== 'bloque' && filters.bloque.size > 0 && !filters.bloque.has(bed.bloque)) return false
                if (exclude !== 'variedad' && filters.variedad.size > 0 && !filters.variedad.has(bed.variedad)) return false
                if (exclude !== 'cama' && filters.cama.size > 0 && !filters.cama.has(bed.cama)) return false
                return true
            })
        }

        return {
            finca: [...new Set(getFilteredBeds('finca').map(b => b.finca))].sort(),
            bloque: [...new Set(getFilteredBeds('bloque').map(b => b.bloque))].sort(),
            variedad: [...new Set(getFilteredBeds('variedad').map(b => b.variedad))].sort(),
            cama: [...new Set(getFilteredBeds('cama').map(b => b.cama))].sort(),
            usuario: [...new Set(activeUsers)].sort()
        }
    }, [metadata, observations, filters])

    // ===================
    // 5. INFINITE SCROLL
    // ===================
    const loadMore = async () => {
        if (!metadata || dateRange?.from || !hasMore.current || loadingMore) return

        setLoadingMore(true)
        const end = new Date(cursor.current); end.setHours(23, 59, 59, 999)
        const start = new Date(cursor.current); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0)

        let query = supabase.from('observacion').select('*')
            .gte('creado_en', start.toISOString())
            .lte('creado_en', end.toISOString())
            .order('creado_en', { ascending: false })

        // Apply same filters as main query
        const hasBedFilters = [filters.finca, filters.bloque, filters.variedad, filters.cama].some(s => s.size > 0)
        if (hasBedFilters) {
            const matchingBedIds = Array.from(metadata.beds.entries())
                .filter(([_, bed]) => {
                    if (filters.finca.size > 0 && !filters.finca.has(bed.finca)) return false
                    if (filters.bloque.size > 0 && !filters.bloque.has(bed.bloque)) return false
                    if (filters.variedad.size > 0 && !filters.variedad.has(bed.variedad)) return false
                    if (filters.cama.size > 0 && !filters.cama.has(bed.cama)) return false
                    return true
                })
                .map(([id]) => id)
            query = query.in('id_cama', matchingBedIds)
        }

        if (filters.usuario.size > 0) {
            const matchingUserIds = Array.from(metadata.users.entries())
                .filter(([_, name]) => filters.usuario.has(name))
                .map(([id]) => id)
            query = query.in('id_usuario', matchingUserIds)
        }

        const { data } = await query

        if (data && data.length > 0) {
            setObservations(prev => [...prev, ...data])
            cursor.current = new Date(start); cursor.current.setDate(cursor.current.getDate() - 1)
        } else {
            hasMore.current = false
        }
        setLoadingMore(false)
    }

    const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const t = e.currentTarget
        if (t.scrollHeight - t.scrollTop - t.clientHeight < 200) loadMore()
    }

    // ===================
    // 6. HELPERS
    // ===================
    const getBorderClass = (curr: ProcessedRow, next?: ProcessedRow) => {
        if (!next) return "border-b border-border"
        if (curr.fecha !== next.fecha) return "border-b-[8px] border-muted-foreground/40"
        if (curr.finca !== next.finca) return "border-b-[4px] border-muted-foreground/20"
        if (curr.bloque !== next.bloque) return "border-b-[2px] border-muted-foreground/20"
        return "border-b border-border"
    }

    const colSpan = viewMode === 'cama' ? 12 : 11
    const isLoading = !metadata || loading

    // ===================
    // RENDER
    // ===================
    return (
        <TooltipProvider delayDuration={100}>
            <HeaderPortal>
                <Tabs value={viewMode} onValueChange={setViewMode} className="h-8">
                    <TabsList className="h-8">
                        <TabsTrigger value="cama" className="h-6 text-xs" disabled={isLoading}>Por Cama</TabsTrigger>
                        <TabsTrigger value="bloque" className="h-6 text-xs" disabled={isLoading}>Consolidado</TabsTrigger>
                    </TabsList>
                </Tabs>
            </HeaderPortal>

            <div className="flex-1 h-full overflow-hidden border bg-background">
                <ScrollArea className="h-full w-full" onScrollCapture={onScroll}>
                    <div className="min-w-max">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                                <TableRow className="hover:bg-background border-b">
                                    <TableHead className="text-center font-bold text-primary border-b">
                                        <div className="flex items-center justify-center gap-2">
                                            Fecha
                                            <Popover open={isCalendarOpen} onOpenChange={(open) => {
                                                if (!open && dateRange?.from && !tempDateRange?.from) setDateRange(undefined)
                                                setIsCalendarOpen(open)
                                                if (open) setTempDateRange(dateRange)
                                            }}>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="icon" className={cn("h-6 w-6", dateRange?.from ? "text-primary" : "text-muted-foreground")}>
                                                        <CalendarIcon className="h-4 w-4" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <div className="p-3 border-b flex items-center justify-between">
                                                        <span className="text-sm font-medium">Filtrar por fecha</span>
                                                        {tempDateRange?.from && (
                                                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs hover:text-destructive" onClick={() => setTempDateRange(undefined)}>
                                                                <X className="h-3 w-3 mr-1" /> Limpiar
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <Calendar initialFocus mode="range" defaultMonth={tempDateRange?.from || dateRange?.from} selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={1} locale={es} />
                                                    <div className="p-3 border-t flex justify-end gap-2 bg-muted/10">
                                                        <Button variant="outline" size="sm" onClick={() => setIsCalendarOpen(false)}>Cancelar</Button>
                                                        <Button size="sm" onClick={() => { setDateRange(tempDateRange); setIsCalendarOpen(false) }}>Aplicar</Button>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-center font-bold text-primary border-b">
                                        <ColumnFilter title="Finca" options={filterOptions.finca} selected={filters.finca} onChange={s => setFilters(f => ({ ...f, finca: s }))} />
                                    </TableHead>
                                    <TableHead className="text-center font-bold text-primary border-b">
                                        <ColumnFilter title="Bloque" options={filterOptions.bloque} selected={filters.bloque} onChange={s => setFilters(f => ({ ...f, bloque: s }))} />
                                    </TableHead>
                                    {viewMode === 'cama' && (
                                        <TableHead className="text-center font-bold text-primary border-b">
                                            <ColumnFilter title="Cama" options={filterOptions.cama} selected={filters.cama} onChange={s => setFilters(f => ({ ...f, cama: s }))} />
                                        </TableHead>
                                    )}
                                    <TableHead className="w-[140px] text-center font-bold text-primary border-b">
                                        <ColumnFilter title="Variedad" options={filterOptions.variedad} selected={filters.variedad} onChange={s => setFilters(f => ({ ...f, variedad: s }))} />
                                    </TableHead>
                                    {OBS_COLUMNS.map(c => (
                                        <TableHead key={c} className="text-center font-bold border-b bg-slate-50/30 capitalize">{c.replace('_', ' ')}</TableHead>
                                    ))}
                                    <TableHead className="text-center font-bold border-b">
                                        <ColumnFilter title="Usuario" options={filterOptions.usuario} selected={filters.usuario} onChange={s => setFilters(f => ({ ...f, usuario: s }))} />
                                    </TableHead>
                                    <TableHead className="text-center font-bold border-b">GPS</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={colSpan} className="h-12">
                                            <Skeleton className="h-6 w-full" />
                                        </TableCell>
                                    </TableRow>
                                ) : rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={colSpan} className="h-32 text-center text-muted-foreground">
                                            No hay observaciones para mostrar
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {rows.map((row, i) => (
                                            <ObservationRow key={row.key} row={row} showCama={viewMode === 'cama'} className={getBorderClass(row, rows[i + 1])} />
                                        ))}
                                        {loadingMore && (
                                            <TableRow>
                                                <TableCell colSpan={colSpan} className="text-center h-12 animate-pulse">Cargando...</TableCell>
                                            </TableRow>
                                        )}
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
