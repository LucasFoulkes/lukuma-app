import { useState, useEffect, useCallback, useMemo } from 'react'
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { query } from '@/lib/services/database.service'
import { useMetadata } from '@/lib/context/metadata-context'
import { transformPinches, type PincheData, type PincheRow } from '@/lib/transforms/pinches'

const PAGE_SIZE = 200

export function usePinches(
    date?: DateRange, 
    bloqueId?: number,
    variedadId?: number,
    tipo?: string
) {
    const [rows, setRows] = useState<PincheData[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const metadata = useMetadata()

    const fetchPage = useCallback((offset: number) => {
        const where: Record<string, string | number | boolean | null> = {}
        if (date?.from) {
            const fromStr = format(date.from, 'yyyy-MM-dd')
            const toStr = date.to ? format(date.to, 'yyyy-MM-dd') : fromStr

            // created_at is timestamp, so we need to be careful. 
            // Supabase/Postgrest gte/lte works with timestamps if we provide ISO strings.
            // But here we are comparing date part.
            // Ideally we should use >= start of day and <= end of day.
            // But let's try simple string comparison first, it usually works if format matches.
            // Actually, for timestamp, '2025-01-01' becomes '2025-01-01 00:00:00'.
            // So lte '2025-01-01' will miss records later in that day.
            // We should probably use next day for lte or append time.
            
            where.created_at_gte = `${fromStr}T00:00:00`
            where.created_at_lte = `${toStr}T23:59:59`
        }
        if (bloqueId) where.bloque = bloqueId
        if (variedadId) where.variedad = variedadId
        if (tipo) where.tipo = tipo

        return query<PincheData>('pinche', {
            orderBy: 'created_at',
            ascending: false, // Newest first usually
            limit: PAGE_SIZE,
            offset,
            where
        })
    }, [date, bloqueId, variedadId, tipo])

    useEffect(() => {
        let active = true
        setLoading(true)
        fetchPage(0).then(res => {
            if (active) setRows(res)
        }).finally(() => {
            if (active) setLoading(false)
        })
        return () => { active = false }
    }, [fetchPage])

    const loadMore = useCallback(async () => {
        if (loadingMore) return true
        setLoadingMore(true)
        const newRows = await fetchPage(rows.length)
        setRows(prev => [...prev, ...newRows])
        setLoadingMore(false)
        return newRows.length === PAGE_SIZE
    }, [fetchPage, rows.length, loadingMore])

    const data = useMemo(() => transformPinches(rows, metadata), [rows, metadata])

    return {
        data,
        loading: loading || metadata.loading,
        loadMore,
        loadingMore
    }
}

export type { PincheRow }
