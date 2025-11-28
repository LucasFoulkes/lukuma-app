'use client'

import { memo } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ColumnFilter, DateFilter, LoadingRow, EmptyRow, LoadingMoreRow } from '@/components/data-table'
import { HeaderPortal } from '@/components/ui/header-portal'
import { useDataTable } from '@/lib/hooks/use-data-table'
import { produccionConfig, ProduccionRow } from './config'

const ProduccionRowComponent = memo(({ row, className }: { row: ProduccionRow; className?: string }) => (
    <TableRow className={cn("hover:bg-muted/50 transition-colors", className)}>
        <TableCell className="whitespace-nowrap font-medium text-center">{row.fecha}</TableCell>
        <TableCell className="text-center">{row.finca}</TableCell>
        <TableCell className="text-center">{row.bloque}</TableCell>
        <TableCell className="p-0">
            <div className="w-[160px] px-4 py-2 mx-auto">
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
        <TableCell className="text-center font-medium text-lg">{row.cantidad.toLocaleString('es-ES')}</TableCell>
    </TableRow>
), (prev, next) => prev.row.key === next.row.key && prev.className === next.className)
ProduccionRowComponent.displayName = 'ProduccionRow'

export default function ProduccionPage() {
    const {
        rows, filterOptions, isLoading, loadingMore, colSpan,
        filters, setFilters,
        dateRange, setDateRange, tempDateRange, setTempDateRange,
        isCalendarOpen, setIsCalendarOpen,
        onScroll, getBorderClass
    } = useDataTable(produccionConfig)

    return (
        <TooltipProvider delayDuration={100}>
            <HeaderPortal>
                <Button asChild size="sm">
                    <Link href="/produccion/nuevo">
                        <Plus className="w-4 h-4 mr-1" />
                        Nueva Producción
                    </Link>
                </Button>
            </HeaderPortal>

            <div className="flex-1 h-full overflow-hidden border bg-background">
                <ScrollArea className="h-full w-full" onScrollCapture={onScroll}>
                    <div className="min-w-max">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                                <TableRow className="hover:bg-background border-b">
                                    <TableHead className="text-center font-bold text-primary border-b">
                                        <DateFilter
                                            dateRange={dateRange} setDateRange={setDateRange}
                                            tempDateRange={tempDateRange} setTempDateRange={setTempDateRange}
                                            isCalendarOpen={isCalendarOpen} setIsCalendarOpen={setIsCalendarOpen}
                                        />
                                    </TableHead>
                                    <TableHead className="text-center font-bold text-primary border-b">
                                        <ColumnFilter title="Finca" options={filterOptions.finca || []} selected={filters.finca} onChange={s => setFilters(f => ({ ...f, finca: s }))} />
                                    </TableHead>
                                    <TableHead className="text-center font-bold text-primary border-b">
                                        <ColumnFilter title="Bloque" options={filterOptions.bloque || []} selected={filters.bloque} onChange={s => setFilters(f => ({ ...f, bloque: s }))} />
                                    </TableHead>
                                    <TableHead className="w-[160px] text-center font-bold text-primary border-b">
                                        <ColumnFilter title="Variedad" options={filterOptions.variedad || []} selected={filters.variedad} onChange={s => setFilters(f => ({ ...f, variedad: s }))} />
                                    </TableHead>
                                    <TableHead className="text-center font-bold border-b bg-green-50/50">Cantidad</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <LoadingRow colSpan={colSpan} />
                                ) : rows.length === 0 ? (
                                    <EmptyRow colSpan={colSpan} message="No hay producción para mostrar" />
                                ) : (
                                    <>
                                        {rows.map((row, i) => (
                                            <ProduccionRowComponent
                                                key={row.key}
                                                row={row}
                                                className={getBorderClass(row, rows[i + 1])}
                                            />
                                        ))}
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
