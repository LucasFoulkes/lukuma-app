'use client'

import { memo, useState, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from '@/lib/utils'
import { ColumnFilter, DateFilter, LoadingRow, EmptyRow, LoadingMoreRow } from '@/components/data-table'
import { useDataTable } from '@/lib/hooks/use-data-table'
import { pinchesConfig, PincheRow, CamaRow } from './config'

const tipoBadgeVariant = (tipo: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (tipo) {
        case 'pinche programado': return 'default'
        case 'pinche apertura': return 'secondary'
        case 'pinche sanitario': return 'destructive'
        default: return 'outline'
    }
}

const PincheRowComponent = memo(({ row, className, onRowClick }: {
    row: PincheRow; className?: string; onRowClick: (row: PincheRow) => void
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
                {row.camas !== '-' ? (
                    <>
                        {row.camas.split(', ').slice(0, 3).map(cama => (
                            <Badge key={cama} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">{cama}</Badge>
                        ))}
                        {row.camas.split(', ').length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground">+{row.camas.split(', ').length - 3}</Badge>
                        )}
                    </>
                ) : <span className="text-xs text-muted-foreground">-</span>}
            </div>
        </TableCell>
        <TableCell className="text-center font-medium">{row.cantidad}</TableCell>
        <TableCell className="text-center"><Badge variant={tipoBadgeVariant(row.tipo)} className="text-xs">{row.tipo}</Badge></TableCell>
    </TableRow>
), (prev, next) => prev.row.key === next.row.key && prev.className === next.className)
PincheRowComponent.displayName = 'PincheRow'

const CamaDetailRow = ({ camaRow }: { camaRow: CamaRow }) => (
    <TableRow className="hover:bg-muted/50">
        <TableCell className="font-medium text-center">{camaRow.cama}</TableCell>
        <TableCell className="text-center font-medium">{camaRow.cantidad}</TableCell>
        <TableCell className="text-center"><Badge variant={tipoBadgeVariant(camaRow.tipo)} className="text-xs">{camaRow.tipo}</Badge></TableCell>
    </TableRow>
)

export default function PinchesPage() {
    const { rows, filterOptions, isLoading, loadingMore, colSpan, filters, setFilters, dateRange, setDateRange, tempDateRange, setTempDateRange, isCalendarOpen, setIsCalendarOpen, onScroll, getBorderClass } = useDataTable(pinchesConfig)

    const [detailRow, setDetailRow] = useState<PincheRow | null>(null)
    const handleRowClick = useCallback((row: PincheRow) => setDetailRow(row), [])

    return (
        <TooltipProvider delayDuration={100}>
            <Dialog open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
                <DialogContent className="w-fit !max-w-[95vw] max-h-[85vh] p-0 flex flex-col overflow-hidden">
                    <DialogHeader className="p-4 pb-2 shrink-0 border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <span>{detailRow?.fecha}</span><span className="text-muted-foreground">•</span>
                            <span>{detailRow?.finca}</span><span className="text-muted-foreground">•</span>
                            <span>{detailRow?.bloque}</span><span className="text-muted-foreground">•</span>
                            <span className="text-primary">{detailRow?.variedad}</span><span className="text-muted-foreground">•</span>
                            <Badge variant={tipoBadgeVariant(detailRow?.tipo || '')}>{detailRow?.tipo}</Badge>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                    <TableHead className="text-center font-bold">Cama</TableHead>
                                    <TableHead className="text-center font-bold">Cantidad</TableHead>
                                    <TableHead className="text-center font-bold">Tipo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {detailRow?._camaRows.map(cr => <CamaDetailRow key={cr.key} camaRow={cr} />)}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

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
                                    <TableHead className="text-center font-bold border-b bg-slate-50/30">Cantidad</TableHead>
                                    <TableHead className="text-center font-bold border-b">
                                        <ColumnFilter title="Tipo" options={filterOptions.tipo || []} selected={filters.tipo} onChange={s => setFilters(f => ({ ...f, tipo: s }))} />
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? <LoadingRow colSpan={colSpan} /> : rows.length === 0 ? <EmptyRow colSpan={colSpan} message="No hay pinches para mostrar" /> : (
                                    <>
                                        {rows.map((row, i) => <PincheRowComponent key={row.key} row={row} className={getBorderClass(row, rows[i + 1])} onRowClick={handleRowClick} />)}
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
