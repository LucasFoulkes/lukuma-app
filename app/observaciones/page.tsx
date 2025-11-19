'use client'

import { useEffect, useState, useRef, memo, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getTableData } from '@/lib/services/database.service'

// --- Configuration ---
const OBS_COLUMNS = ['arroz', 'arveja', 'garbanzo', 'rayando_color', 'sepalos_abiertos']

// --- 1. Optimized Row ---
const ObservationRow = memo(({ row }: { row: any }) => (
    <TableRow className="border-b hover:bg-muted/50">
        {/* Fixed Left Columns */}
        <TableCell className="whitespace-nowrap font-medium">{row.fecha}</TableCell>
        <TableCell>{row.finca}</TableCell>
        <TableCell>{row.bloque}</TableCell>
        <TableCell>{row.cama}</TableCell>

        {/* Variedad: STRICT width constraint */}
        <TableCell className="p-0"> {/* Remove default padding to control width exactly */}
            <div className="w-[140px] px-4 py-2"> {/* Container defines the real cell size */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="truncate w-full cursor-help text-muted-foreground hover:text-foreground transition-colors text-left">
                            {row.variedad}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-foreground text-background">
                        <p>{row.variedad}</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TableCell>

        {/* Specific Observation Columns */}
        {OBS_COLUMNS.map(col => (
            <TableCell key={col} className="text-center">
                {row.tipos[col] || '-'}
            </TableCell>
        ))}

        {/* Fixed Right Columns */}
        <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]" title={row.users}>
            {row.users || '-'}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground truncate max-w-[100px]" title={row.gps}>
            {row.gps || '-'}
        </TableCell>
    </TableRow>
))
ObservationRow.displayName = 'ObservationRow'

export default function ObservacionesPage() {
    // --- State ---
    const [rows, setRows] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)

    // --- Refs ---
    const rowsMap = useRef(new Map<string, any>())
    const metaCache = useRef<any>(null)
    const cursor = useRef(new Date())
    const hasMore = useRef(true)
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    // --- 2. Setup Metadata ---
    useEffect(() => {
        const init = async () => {
            try {
                const [c, g, b, f, v, u] = await Promise.all(['cama', 'grupo_cama', 'bloque', 'finca', 'variedad', 'usuario'].map(t => getTableData(t as any)))

                const fMap = new Map(f.map((i: any) => [i.id_finca, i.nombre]))
                const vMap = new Map(v.map((i: any) => [i.id_variedad, i.nombre]))
                const uMap = new Map(u.map((i: any) => [i.id_usuario, `${i.nombres} ${i.apellidos || ''}`.trim()]))
                const bMap = new Map(b.map((i: any) => [i.id_bloque, { name: i.nombre, fId: i.id_finca }]))
                const gMap = new Map(g.map((i: any) => [i.id_grupo, { bId: i.id_bloque, vId: i.id_variedad }]))

                const bedMap = new Map()
                c.forEach((bed: any) => {
                    const grp = gMap.get(bed.id_grupo)
                    const blk = grp && bMap.get(grp.bId)
                    if (blk) bedMap.set(bed.id_cama, {
                        cama: bed.nombre,
                        bloque: blk.name,
                        finca: fMap.get(blk.fId),
                        variedad: vMap.get(grp.vId)
                    })
                })

                metaCache.current = { beds: bedMap, users: uMap }
                await loadBatch(7)
            } catch (e) { console.error(e) } finally { setLoading(false) }
        }
        init()
    }, [])

    // --- 3. Processing Logic ---
    const processNewData = (observations: any[]) => {
        const meta = metaCache.current
        if (!meta) return

        observations.forEach(o => {
            if (!o.id_cama) return
            const m = meta.beds.get(o.id_cama)
            if (!m) return

            const date = new Date(o.creado_en).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
            const key = `${date}-${o.id_cama}`

            let row = rowsMap.current.get(key)
            if (!row) {
                row = { key, fecha: date, ...m, tipos: {}, _u: new Set(), _g: new Set() }
            } else {
                row = { ...row }
            }

            if (o.tipo_observacion) {
                row.tipos[o.tipo_observacion] = (row.tipos[o.tipo_observacion] || 0) + (o.cantidad || 0)
            }

            if (o.id_usuario) row._u.add(meta.users.get(o.id_usuario))
            if (o.id_punto_gps) row._g.add(o.id_punto_gps)

            row.users = Array.from(row._u).join(', ')
            row.gps = Array.from(row._g).join(', ')

            rowsMap.current.set(key, row)
        })

        setRows(Array.from(rowsMap.current.values())
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime() || a.finca.localeCompare(b.finca))
        )
    }

    const loadBatch = async (days: number) => {
        const end = new Date(cursor.current)
        const start = new Date(end); start.setDate(start.getDate() - days); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999)

        const { data } = await supabase.from('observacion').select('*')
            .lte('creado_en', end.toISOString()).gte('creado_en', start.toISOString())
            .order('creado_en', { ascending: false })

        if (data && data.length > 0) {
            processNewData(data)
            start.setDate(start.getDate() - 1)
            cursor.current = start
        } else if (days === 1) {
            hasMore.current = false
        }
        setLoadingMore(false)
    }

    const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const t = e.currentTarget
        if (t.scrollHeight - t.scrollTop - t.clientHeight < 200 && hasMore.current && !loadingMore && !loading) {
            setLoadingMore(true)
            loadBatch(1)
        }
    }, [loading, loadingMore])

    if (loading) return <div className="p-2"><Skeleton className="h-10 w-full mb-2" /><Skeleton className="h-96 w-full" /></div>

    return (
        <TooltipProvider delayDuration={100}>
            <div className="flex-1 h-full overflow-hidden border bg-background">
                <ScrollArea className="h-full w-full" onScrollCapture={onScroll}>
                    <div className="min-w-max">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                                <TableRow className="hover:bg-background border-b">
                                    {['Fecha', 'Finca', 'Bloque', 'Cama'].map(h =>
                                        <TableHead key={h} className="font-bold text-primary border-b">{h}</TableHead>
                                    )}

                                    {/* STRICT Header Width matching the Row Cell */}
                                    <TableHead className="w-[140px] font-bold text-primary border-b">Variedad</TableHead>

                                    {OBS_COLUMNS.map(c => (
                                        <TableHead key={c} className="text-center font-bold border-b bg-slate-50/30 capitalize">
                                            {c.replace('_', ' ')}
                                        </TableHead>
                                    ))}
                                    <TableHead className="font-bold border-b">Usuario</TableHead>
                                    <TableHead className="font-bold border-b">GPS</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map(row => (
                                    <ObservationRow key={row.key} row={row} />
                                ))}
                                {loadingMore && (
                                    <TableRow><TableCell colSpan={99} className="text-center h-12 animate-pulse">Cargando...</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>
            </div>
        </TooltipProvider>
    )
}