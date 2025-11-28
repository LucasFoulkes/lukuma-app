'use client'

import { memo, useState, useCallback, useMemo } from 'react'
import { Pencil } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from '@/lib/utils'
import { ColumnFilter, DateFilter, GpsButton, GpsMapDialog, useGpsDialog, LoadingRow, EmptyRow, LoadingMoreRow, GpsPoint } from '@/components/data-table'
import { useDataTable } from '@/lib/hooks/use-data-table'
import { observacionesConfig, ObservacionRow, CamaRow, OBS_COLUMNS } from './config'

// --- Row Components ---
const ObservationRow = memo(({ row, className, onShowMap, onRowClick }: {
    row: ObservacionRow; className?: string; onShowMap: (ids: string[]) => void; onRowClick: (row: ObservacionRow) => void
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
        <TableCell className="p-1">
            <div className="flex flex-wrap gap-1 max-w-[200px] justify-center">
                {row.camas.split(', ').slice(0, 3).map(cama => (
                    <Badge key={cama} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">{cama}</Badge>
                ))}
                {row.camas.split(', ').length > 3 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground">+{row.camas.split(', ').length - 3}</Badge>
                )}
            </div>
        </TableCell>
        {OBS_COLUMNS.map(col => (
            <TableCell key={col} className="text-center">{row.tipos[col] || '-'}</TableCell>
        ))}
        <TableCell className="text-xs text-muted-foreground truncate max-w-[150px] text-center" title={row.users}>{row.users || '-'}</TableCell>
        <TableCell className="p-0">
            <div className="flex items-center justify-center w-full h-full py-2">
                <GpsButton gpsIds={row.gpsIds} onShowMap={onShowMap} />
            </div>
        </TableCell>
    </TableRow>
), (prev, next) => prev.row.key === next.row.key && prev.className === next.className)
ObservationRow.displayName = 'ObservationRow'

const CamaDetailRow = ({ camaRow, onShowMap, onEdit }: { camaRow: CamaRow; onShowMap: (ids: string[]) => void; onEdit: (c: CamaRow) => void }) => (
    <TableRow className="hover:bg-muted/50">
        <TableCell className="font-medium text-center">{camaRow.cama}</TableCell>
        {OBS_COLUMNS.map(col => (<TableCell key={col} className="text-center">{camaRow.tipos[col] || '-'}</TableCell>))}
        <TableCell className="text-xs text-muted-foreground text-center">{camaRow.users || '-'}</TableCell>
        <TableCell className="p-0"><div className="flex items-center justify-center"><GpsButton gpsIds={camaRow.gpsIds} onShowMap={onShowMap} /></div></TableCell>
        <TableCell className="p-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => onEdit(camaRow)}><Pencil className="h-4 w-4" /></Button>
        </TableCell>
    </TableRow>
)

// --- Main Component ---
export default function ObservacionesPage() {
    const state = useDataTable(observacionesConfig)
    const { rows, filterOptions, isLoading, loadingMore, colSpan, filters, setFilters, dateRange, setDateRange, tempDateRange, setTempDateRange, isCalendarOpen, setIsCalendarOpen, onScroll, getBorderClass, metadata, supabase, refresh } = state

    // GPS
    const fetchGpsPoints = async (ids: string[]): Promise<GpsPoint[]> => {
        if (ids.length === 0) return []
        const { data } = await supabase.from('punto_gps').select('id, latitud, longitud, precision, altitud').in('id', ids)
        return data || []
    }
    const { mapOpen, setMapOpen, gpsPoints, loadingGps, handleShowMap } = useGpsDialog(fetchGpsPoints)

    // Detail Dialog
    const [detailRow, setDetailRow] = useState<ObservacionRow | null>(null)
    const handleRowClick = useCallback((row: ObservacionRow) => setDetailRow(row), [])

    // Edit Cama
    const [editingCama, setEditingCama] = useState<CamaRow | null>(null)
    const [selectedFinca, setSelectedFinca] = useState('')
    const [selectedBloque, setSelectedBloque] = useState('')
    const [selectedNewCamaId, setSelectedNewCamaId] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)

    const camaOptions = useMemo(() => {
        if (metadata.loading) return []
        return Array.from(metadata.beds.entries()).map(([id, bed]) => ({
            id: String(id), cama: bed.cama, bloque: bed.bloque, finca: bed.finca, variedad: bed.variedad
        })).sort((a, b) => a.finca.localeCompare(b.finca) || a.bloque.localeCompare(b.bloque) || a.cama.localeCompare(b.cama))
    }, [metadata])

    const editFincaOptions = useMemo(() => [...new Set(camaOptions.map(c => c.finca))].sort(), [camaOptions])
    const editBloqueOptions = useMemo(() => [...new Set(camaOptions.filter(c => c.finca === selectedFinca).map(c => c.bloque))].sort(), [camaOptions, selectedFinca])
    const editCamaOptions = useMemo(() => camaOptions.filter(c => c.finca === selectedFinca && c.bloque === selectedBloque), [camaOptions, selectedFinca, selectedBloque])

    const handleEditCama = useCallback((camaRow: CamaRow) => {
        setEditingCama(camaRow)
        // Pre-fill with current values
        const currentCama = camaOptions.find(c => c.id === String(camaRow.id_cama))
        if (currentCama) {
            setSelectedFinca(currentCama.finca)
            setSelectedBloque(currentCama.bloque)
            setSelectedNewCamaId(currentCama.id)
        } else {
            setSelectedFinca('')
            setSelectedBloque('')
            setSelectedNewCamaId('')
        }
    }, [camaOptions])
    const handleFincaChange = (v: string) => { setSelectedFinca(v); setSelectedBloque(''); setSelectedNewCamaId('') }
    const handleBloqueChange = (v: string) => { setSelectedBloque(v); setSelectedNewCamaId('') }

    const handleUpdateCama = useCallback(async () => {
        if (!editingCama || !selectedNewCamaId) return
        setIsUpdating(true)
        try {
            await supabase.from('observacion').update({ id_cama: selectedNewCamaId }).in('id_observacion', editingCama.obsIds)
            setEditingCama(null)
            setDetailRow(null)
            refresh()
        } catch (e) { console.error(e) }
        setIsUpdating(false)
    }, [editingCama, selectedNewCamaId, supabase, refresh])

    return (
        <TooltipProvider delayDuration={100}>
            <GpsMapDialog open={mapOpen} onOpenChange={setMapOpen} points={gpsPoints} loading={loadingGps} />

            {/* Detail Dialog */}
            <Dialog open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
                <DialogContent className="w-fit !max-w-[95vw] max-h-[85vh] p-0 flex flex-col overflow-hidden">
                    <DialogHeader className="p-4 pb-2 shrink-0 border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <span>{detailRow?.fecha}</span><span className="text-muted-foreground">•</span>
                            <span>{detailRow?.finca}</span><span className="text-muted-foreground">•</span>
                            <span>{detailRow?.bloque}</span><span className="text-muted-foreground">•</span>
                            <span className="text-primary">{detailRow?.variedad}</span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                    <TableHead className="text-center font-bold">Cama</TableHead>
                                    {OBS_COLUMNS.map(c => <TableHead key={c} className="text-center font-bold capitalize">{c.replace('_', ' ')}</TableHead>)}
                                    <TableHead className="text-center font-bold">Usuario</TableHead>
                                    <TableHead className="text-center font-bold">GPS</TableHead>
                                    <TableHead className="text-center font-bold">Editar</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {detailRow?._camaRows.map(cr => <CamaDetailRow key={cr.key} camaRow={cr} onShowMap={handleShowMap} onEdit={handleEditCama} />)}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Cama Dialog */}
            <Dialog open={!!editingCama} onOpenChange={(o) => !o && setEditingCama(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Mover observaciones de cama {editingCama?.cama}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">Selecciona la nueva ubicación para las {editingCama?.obsIds.length} observaciones.</p>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Finca</label>
                            <Select value={selectedFinca} onValueChange={handleFincaChange}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar finca..." /></SelectTrigger>
                                <SelectContent>{editFincaOptions.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Bloque</label>
                            <Select value={selectedBloque} onValueChange={handleBloqueChange} disabled={!selectedFinca}>
                                <SelectTrigger><SelectValue placeholder={selectedFinca ? "Seleccionar bloque..." : "Primero selecciona finca"} /></SelectTrigger>
                                <SelectContent>{editBloqueOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Cama</label>
                            <Select value={selectedNewCamaId} onValueChange={setSelectedNewCamaId} disabled={!selectedBloque}>
                                <SelectTrigger><SelectValue placeholder={selectedBloque ? "Seleccionar cama..." : "Primero selecciona bloque"} /></SelectTrigger>
                                <SelectContent>{editCamaOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.cama} <span className="text-muted-foreground">({c.variedad})</span></SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setEditingCama(null)}>Cancelar</Button>
                            <Button onClick={handleUpdateCama} disabled={!selectedNewCamaId || isUpdating}>{isUpdating ? 'Guardando...' : 'Guardar'}</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Main Table */}
            <div className="flex-1 h-full overflow-hidden border bg-background">
                <ScrollArea className="h-full w-full" onScrollCapture={onScroll}>
                    <div className="min-w-max">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                                <TableRow className="hover:bg-background border-b">
                                    <TableHead className="text-center font-bold text-primary border-b">
                                        <DateFilter dateRange={dateRange} setDateRange={setDateRange} tempDateRange={tempDateRange} setTempDateRange={setTempDateRange} isCalendarOpen={isCalendarOpen} setIsCalendarOpen={setIsCalendarOpen} />
                                    </TableHead>
                                    <TableHead className="text-center font-bold text-primary border-b">
                                        <ColumnFilter title="Finca" options={filterOptions.finca || []} selected={filters.finca} onChange={s => setFilters(f => ({ ...f, finca: s }))} />
                                    </TableHead>
                                    <TableHead className="text-center font-bold text-primary border-b">
                                        <ColumnFilter title="Bloque" options={filterOptions.bloque || []} selected={filters.bloque} onChange={s => setFilters(f => ({ ...f, bloque: s }))} />
                                    </TableHead>
                                    <TableHead className="w-[140px] text-center font-bold text-primary border-b">
                                        <ColumnFilter title="Variedad" options={filterOptions.variedad || []} selected={filters.variedad} onChange={s => setFilters(f => ({ ...f, variedad: s }))} />
                                    </TableHead>
                                    <TableHead className="w-[120px] text-center font-bold text-primary border-b">
                                        <ColumnFilter title="Camas" options={filterOptions.cama || []} selected={filters.cama} onChange={s => setFilters(f => ({ ...f, cama: s }))} />
                                    </TableHead>
                                    {OBS_COLUMNS.map(c => <TableHead key={c} className="text-center font-bold border-b bg-slate-50/30 capitalize">{c.replace('_', ' ')}</TableHead>)}
                                    <TableHead className="text-center font-bold border-b">
                                        <ColumnFilter title="Usuario" options={filterOptions.usuario || []} selected={filters.usuario} onChange={s => setFilters(f => ({ ...f, usuario: s }))} />
                                    </TableHead>
                                    <TableHead className="text-center font-bold border-b">GPS</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? <LoadingRow colSpan={colSpan} /> : rows.length === 0 ? <EmptyRow colSpan={colSpan} message="No hay observaciones para mostrar" /> : (
                                    <>
                                        {rows.map((row, i) => <ObservationRow key={row.key} row={row} className={getBorderClass(row, rows[i + 1])} onShowMap={handleShowMap} onRowClick={handleRowClick} />)}
                                        {loadingMore && <LoadingMoreRow colSpan={colSpan} />}
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
