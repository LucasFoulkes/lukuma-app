'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export type Column<T = unknown> = {
    key: string
    label: string
    className?: string
    render?: (row: T) => ReactNode
    header?: () => ReactNode
}

type Props<T> = {
    columns: Column<T>[]
    data: T[]
    onRowClick?: (row: T) => void
    getRowKey?: (row: T, index: number) => string | number
    getRowClassName?: (row: T) => string
    onLoadMore?: () => Promise<boolean>
    isLoadingMore?: boolean
}

export function DataTable<T extends Record<string, unknown>>({
    columns,
    data,
    onRowClick,
    getRowKey,
    getRowClassName,
    onLoadMore,
    isLoadingMore
}: Props<T>) {
    const [hasMore, setHasMore] = useState(true)
    const loaderRef = useRef<HTMLTableRowElement>(null)

    useEffect(() => {
        if (!onLoadMore || !hasMore || isLoadingMore) return
        const observer = new IntersectionObserver(
            entries => { if (entries[0].isIntersecting) onLoadMore().then(setHasMore) },
            { threshold: 0.1 }
        )
        if (loaderRef.current) observer.observe(loaderRef.current)
        return () => observer.disconnect()
    }, [onLoadMore, hasMore, isLoadingMore])

    return (
        <Table>
            <TableHeader className="sticky top-0 bg-background capitalize z-10 ring-1 ring-zinc-100">
                <TableRow>
                    {columns.map(col => (
                        <TableHead key={col.key} className={col.className}>
                            {col.header ? col.header() : col.label}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">No hay datos</TableCell>
                    </TableRow>
                ) : (
                    <>
                        {data.map((row, i) => (
                            <TableRow
                                key={getRowKey ? getRowKey(row, i) : i}
                                className={cn(
                                    onRowClick && 'cursor-pointer hover:bg-muted/50',
                                    getRowClassName?.(row)
                                )}
                                onClick={() => onRowClick?.(row)}
                            >
                                {columns.map(col => (
                                    <TableCell key={col.key} className={col.className}>
                                        {col.render ? col.render(row) : (row[col.key] as ReactNode)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                        {onLoadMore && hasMore && (
                            <TableRow ref={loaderRef}>
                                <TableCell colSpan={columns.length} className="h-16 text-center text-muted-foreground">
                                    {isLoadingMore && <><Loader2 className="inline-block h-4 w-4 animate-spin mr-2" />Cargando más...</>}
                                </TableCell>
                            </TableRow>
                        )}
                        {/* Spacer to ensure last row is visible */}
                        <TableRow className="hover:bg-transparent border-0">
                            <TableCell colSpan={columns.length} className="h-20" />
                        </TableRow>
                    </>
                )}
            </TableBody>
        </Table>
    )
}
