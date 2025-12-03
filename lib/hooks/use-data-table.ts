'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { DateRange } from 'react-day-picker'
import { useMetadata, Metadata } from '@/lib/context/metadata-context'

// --- Types ---
export type Filters = Record<string, Set<string>>

// --- Helpers ---
export function getMatchingBedIds(filters: Filters, metadata: Metadata): number[] | null {
    const hasBedFilters = ['finca', 'bloque', 'variedad', 'cama'].some(k => filters[k]?.size > 0)
    if (!hasBedFilters) return null
    return Array.from(metadata.beds.entries())
        .filter(([_, bed]) =>
            (!filters.finca?.size || filters.finca.has(bed.finca)) &&
            (!filters.bloque?.size || filters.bloque.has(bed.bloque)) &&
            (!filters.variedad?.size || filters.variedad.has(bed.variedad)) &&
            (!filters.cama?.size || filters.cama.has(bed.cama))
        )
        .map(([id]) => id)
}

export interface DataTableConfig<TRaw, TRow> {
    // Database
    table: string
    dateColumn: string
    defaultDays: number

    // Filters
    filterKeys: string[]  // e.g. ['finca', 'bloque', 'variedad', 'cama', 'tipo']
    staticFilterOptions?: Record<string, string[]>  // For fixed options like tipo

    // Processing
    processRows: (raw: TRaw[], metadata: Metadata) => TRow[]
    buildQueryFilters?: (query: any, filters: Filters, metadata: Metadata) => any
    getFilterOptions?: (metadata: Metadata, filters: Filters) => Record<string, string[]>  // Custom filter options

    // Display
    colSpan: number
    getBedFilters?: (filters: Filters) => string[] | null  // Get bed IDs for query
}

export interface DataTableState<TRow> {
    rows: TRow[]
    filterOptions: Record<string, string[]>
    isLoading: boolean
    loadingMore: boolean
    filters: Filters
    setFilters: React.Dispatch<React.SetStateAction<Filters>>
    dateRange: DateRange | undefined
    setDateRange: (range: DateRange | undefined) => void
    tempDateRange: DateRange | undefined
    setTempDateRange: (range: DateRange | undefined) => void
    isCalendarOpen: boolean
    setIsCalendarOpen: (open: boolean) => void
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void
    getBorderClass: (curr: TRow, next?: TRow) => string
    colSpan: number
    metadata: Metadata
    supabase: ReturnType<typeof createBrowserClient>
    refresh: () => Promise<void>
}

// --- Hook ---
export function useDataTable<TRaw, TRow extends { fecha: string; finca: string; bloque: string }>(
    config: DataTableConfig<TRaw, TRow>
): DataTableState<TRow> {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const metadata = useMetadata()

    // --- State ---
    const [rawData, setRawData] = useState<TRaw[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [filters, setFilters] = useState<Filters>(() =>
        Object.fromEntries(config.filterKeys.map(k => [k, new Set<string>()]))
    )
    const [dateRange, setDateRange] = useState<DateRange | undefined>()
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>()
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)

    // --- Pagination ---
    const cursor = useRef(new Date())
    const hasMore = useRef(true)

    // --- Helpers ---
    const getMatchingBedIds = useCallback(() => {
        const hasBedFilters = ['finca', 'bloque', 'variedad', 'cama']
            .some(k => filters[k]?.size > 0)
        if (!hasBedFilters) return null

        return Array.from(metadata.beds.entries())
            .filter(([_, bed]) =>
                (!filters.finca?.size || filters.finca.has(bed.finca)) &&
                (!filters.bloque?.size || filters.bloque.has(bed.bloque)) &&
                (!filters.variedad?.size || filters.variedad.has(bed.variedad)) &&
                (!filters.cama?.size || filters.cama.has(bed.cama))
            )
            .map(([id]) => id)
    }, [filters, metadata.beds])

    const buildQuery = useCallback((start: Date, end: Date) => {
        let query = supabase.from(config.table).select('*')
            .gte(config.dateColumn, start.toISOString())
            .lte(config.dateColumn, end.toISOString())
            .order(config.dateColumn, { ascending: false })

        // Apply custom query filters if provided
        if (config.buildQueryFilters) {
            query = config.buildQueryFilters(query, filters, metadata)
        }

        return query
    }, [config, filters, metadata, supabase])

    // --- Fetch Data ---
    const fetchData = useCallback(async () => {
        if (metadata.loading) return

        setLoading(true)
        setRawData([])
        hasMore.current = true
        cursor.current = new Date()

        let start: Date, end: Date
        if (dateRange?.from) {
            hasMore.current = false
            start = new Date(dateRange.from); start.setHours(0, 0, 0, 0)
            end = dateRange.to ? new Date(dateRange.to) : new Date(start); end.setHours(23, 59, 59, 999)
        } else {
            end = new Date(); end.setHours(23, 59, 59, 999)
            start = new Date(); start.setDate(start.getDate() - config.defaultDays); start.setHours(0, 0, 0, 0)
            cursor.current = new Date(start); cursor.current.setDate(cursor.current.getDate() - 1)
        }

        const { data } = await buildQuery(start, end)
        setRawData((data || []) as TRaw[])
        setLoading(false)
    }, [metadata.loading, dateRange, config.defaultDays, buildQuery])

    // Trigger fetch when dependencies change
    useMemo(() => {
        fetchData()
    }, [metadata.loading, filters, dateRange])

    // --- Process Rows ---
    const rows = useMemo(() => {
        if (metadata.loading || rawData.length === 0) return []
        return config.processRows(rawData, metadata)
    }, [rawData, metadata, config])

    // --- Filter Options ---
    const filterOptions = useMemo(() => {
        if (metadata.loading) {
            return Object.fromEntries(config.filterKeys.map(k => [k, [] as string[]]))
        }

        // Use custom filter options if provided
        if (config.getFilterOptions) {
            return config.getFilterOptions(metadata, filters)
        }

        const allBeds = Array.from(metadata.beds.values())
        const allUsers = Array.from(metadata.users.values()).filter(Boolean).sort()

        const getOptions = (field: string): string[] => {
            // Static options
            if (config.staticFilterOptions?.[field]) {
                return config.staticFilterOptions[field]
            }
            // User options
            if (field === 'usuario') return allUsers
            // Bed-based options with cascading
            return [...new Set(
                allBeds
                    .filter(bed =>
                        (field === 'finca' || !filters.finca?.size || filters.finca.has(bed.finca)) &&
                        (field === 'bloque' || !filters.bloque?.size || filters.bloque.has(bed.bloque)) &&
                        (field === 'variedad' || !filters.variedad?.size || filters.variedad.has(bed.variedad)) &&
                        (field === 'cama' || !filters.cama?.size || filters.cama.has(bed.cama))
                    )
                    .map(bed => (bed as any)[field] as string)
                    .filter(Boolean)
            )].sort()
        }

        return Object.fromEntries(config.filterKeys.map(k => [k, getOptions(k)]))
    }, [metadata, filters, config])

    // --- Infinite Scroll ---
    const loadMore = useCallback(async () => {
        if (metadata.loading || dateRange?.from || !hasMore.current || loadingMore) return

        setLoadingMore(true)
        const end = new Date(cursor.current); end.setHours(23, 59, 59, 999)
        const start = new Date(end); start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0)
        cursor.current = new Date(start); cursor.current.setDate(cursor.current.getDate() - 1)

        const { data } = await buildQuery(start, end)
        if (data && data.length > 0) {
            setRawData(prev => [...prev, ...(data as TRaw[])])
        } else {
            hasMore.current = false
        }
        setLoadingMore(false)
    }, [metadata.loading, dateRange, loadingMore, buildQuery])

    const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const t = e.currentTarget
        if (t.scrollHeight - t.scrollTop - t.clientHeight < 200) loadMore()
    }, [loadMore])

    // --- Border Classes ---
    const getBorderClass = useCallback((curr: TRow, next?: TRow) =>
        !next ? "border-b border-border"
            : curr.fecha !== next.fecha ? "border-b-[8px] border-muted-foreground/40"
                : curr.finca !== next.finca ? "border-b-[4px] border-muted-foreground/20"
                    : curr.bloque !== next.bloque ? "border-b-[2px] border-muted-foreground/20"
                        : "border-b border-border"
        , [])

    return {
        rows,
        filterOptions,
        isLoading: metadata.loading || loading,
        loadingMore,
        filters,
        setFilters,
        dateRange,
        setDateRange,
        tempDateRange,
        setTempDateRange,
        isCalendarOpen,
        setIsCalendarOpen,
        onScroll,
        getBorderClass,
        colSpan: config.colSpan,
        metadata,
        supabase,
        refresh: fetchData,
    }
}
