'use client'

import { TableCell, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

interface LoadingRowProps {
    colSpan: number
}

export function LoadingRow({ colSpan }: LoadingRowProps) {
    return (
        <TableRow>
            <TableCell colSpan={colSpan} className="h-12">
                <Skeleton className="h-6 w-full" />
            </TableCell>
        </TableRow>
    )
}

interface EmptyRowProps {
    colSpan: number
    message?: string
}

export function EmptyRow({ colSpan, message = "No hay datos para mostrar" }: EmptyRowProps) {
    return (
        <TableRow>
            <TableCell colSpan={colSpan} className="h-32 text-center text-muted-foreground">
                {message}
            </TableCell>
        </TableRow>
    )
}

interface LoadingMoreRowProps {
    colSpan: number
}

export function LoadingMoreRow({ colSpan }: LoadingMoreRowProps) {
    return (
        <TableRow>
            <TableCell colSpan={colSpan} className="text-center h-12 animate-pulse">
                Cargando...
            </TableCell>
        </TableRow>
    )
}
