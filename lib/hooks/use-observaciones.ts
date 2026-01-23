import { useState, useEffect, useCallback, useMemo } from 'react'
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { query } from '@/lib/services/database.service'
import { useMetadata } from '@/lib/context/metadata-context'
import { transformObservaciones, type ViewObservacionCama, type ObservacionRow } from '@/lib/transforms/observaciones'

const PAGE_SIZE = 200

export function useObservaciones(
    date?: DateRange,
    fincaId?: number,
    bloqueId?: number,
    variedadId?: number,
    usuarioId?: string
) {
    const [rows, setRows] = useState<ViewObservacionCama[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const metadata = useMetadata()

    const fetchPage = useCallback((offset: number) => {
        const where: Record<string, string | number | boolean | null> = {}
        if (date?.from) {
            const fromStr = format(date.from, 'yyyy-MM-dd')
            const toStr = date.to ? format(date.to, 'yyyy-MM-dd') : fromStr

            where.fecha_gte = fromStr
            where.fecha_lte = toStr
        }
        if (fincaId) where.id_finca = fincaId
        if (bloqueId) where.id_bloque = bloqueId
        if (variedadId) where.id_variedad = variedadId
        if (usuarioId) where.usuario_ids_cs = `{${usuarioId}}` // Postgres array contains syntax

        return query<ViewObservacionCama>('v_observacion_cama', {
            orderBy: 'primera_hora',
            limit: PAGE_SIZE,
            offset,
            where
        })
    }, [date, fincaId, bloqueId, variedadId, usuarioId])

    useEffect(() => {
        let active = true
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true)
        fetchPage(0).then(res => {
            if (active) setRows(res)
        }).finally(() => {
            if (active) setLoading(false)
        })
        return () => { active = false }
    }, [fetchPage])

    const refetch = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetchPage(0)
            setRows(res)
        } finally {
            setLoading(false)
        }
    }, [fetchPage])

    const loadMore = useCallback(async () => {
        if (loadingMore) return true
        setLoadingMore(true)
        const newRows = await fetchPage(rows.length)
        setRows(prev => [...prev, ...newRows])
        setLoadingMore(false)
        return newRows.length === PAGE_SIZE
    }, [fetchPage, rows.length, loadingMore])

    const data = useMemo(() => transformObservaciones(rows, metadata), [rows, metadata])

    return {
        data,
        loading: loading || metadata.loading,
        loadMore,
        loadingMore,
        refetch
    }
}

export type { ObservacionRow }
