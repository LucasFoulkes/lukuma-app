import { useState, useEffect, useCallback, useMemo } from 'react'
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { query } from '@/lib/services/database.service'
import { useMetadata } from '@/lib/context/metadata-context'
import { transformPinches, type PincheData, type PincheRow } from '@/lib/transforms/pinches'

const PAGE_SIZE = 200

export function usePinches(
    date?: DateRange,
    fincaId?: number,
    bloqueId?: number,
    variedadId?: number,
    tipo?: string
) {
    const [rows, setRows] = useState<PincheData[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const metadata = useMetadata()
    const { bloques } = metadata

    const fetchPage = useCallback((offset: number) => {
        const where: Record<string, any> = {}
        if (date?.from) {
            const fromStr = format(date.from, 'yyyy-MM-dd')
            const toStr = date.to ? format(date.to, 'yyyy-MM-dd') : fromStr
            where.created_at_gte = `${fromStr}T00:00:00`
            where.created_at_lte = `${toStr}T23:59:59`
        }

        if (fincaId) {
            // Find all blocks for this finca
            const blockIds: number[] = []
            for (const [id, b] of bloques.entries()) {
                if (b.id_finca === fincaId) {
                    blockIds.push(id)
                }
            }

            // If no blocks found for finca, we should probably return empty or handle it.
            // But if we pass empty array to _in, it might error or return nothing.
            if (blockIds.length > 0) {
                where.bloque_in = blockIds
            } else {
                // Force empty result if finca has no blocks
                where.bloque = -1
            }
        }

        if (bloqueId) where.bloque = bloqueId
        if (variedadId) where.variedad = variedadId
        if (tipo) where.tipo = tipo

        return query<PincheData>('pinche', {
            orderBy: 'created_at',
            ascending: false,
            limit: PAGE_SIZE,
            offset,
            where
        })
    }, [date, fincaId, bloqueId, variedadId, tipo, bloques])

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
