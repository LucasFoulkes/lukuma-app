import { Metadata } from '@/lib/context/metadata-context'
import { DataTableConfig, Filters, getMatchingBedIds } from '@/lib/hooks/use-data-table'

// --- Types ---
export type PincheRow = {
    key: string
    fecha: string
    fechaDate: Date
    finca: string
    bloque: string
    variedad: string
    cantidad: number
    tipo: string
}

// --- Constants ---
export const PINCHE_TIPOS = ['pinche programado', 'pinche apertura', 'pinche sanitario']

// --- Config ---
export const pinchesConfig: DataTableConfig<any, PincheRow> = {
    table: 'pinche',
    dateColumn: 'created_at',
    defaultDays: 60,
    filterKeys: ['finca', 'bloque', 'variedad', 'tipo'],
    staticFilterOptions: { tipo: PINCHE_TIPOS },
    colSpan: 6,

    buildQueryFilters: (query, filters, metadata) => {
        const bedIds = getMatchingBedIds(filters, metadata)
        if (bedIds) query = query.in('cama', bedIds)
        if (filters.tipo?.size > 0) query = query.in('tipo', Array.from(filters.tipo))
        return query
    },

    processRows: (raw: any[], metadata: Metadata): PincheRow[] => {
        const consolidatedMap = new Map<string, PincheRow>()

        raw.forEach(pinche => {
            let finca: string, bloque: string, variedad: string

            if (pinche.cama) {
                const bed = metadata.beds.get(pinche.cama)
                if (!bed) return
                finca = bed.finca
                bloque = bed.bloque
                variedad = bed.variedad
            } else {
                const bloqueData = metadata.bloques.get(pinche.bloque)
                const variedadData = metadata.variedades.get(pinche.variedad)
                if (!bloqueData || !variedadData) return
                finca = bloqueData.finca
                bloque = bloqueData.nombre
                variedad = variedadData
            }

            const fechaDate = new Date(pinche.created_at)
            const fecha = fechaDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
            const tipo = pinche.tipo || '-'
            const key = `${fecha}-${bloque}-${variedad}-${tipo}`

            let row = consolidatedMap.get(key)
            if (!row) {
                row = { key, fecha, fechaDate, finca, bloque, variedad, cantidad: 0, tipo }
                consolidatedMap.set(key, row)
            }

            row.cantidad += pinche.cantidad || 0
        })

        return Array.from(consolidatedMap.values())
            .sort((a, b) =>
                b.fechaDate.getTime() - a.fechaDate.getTime() ||
                a.finca.localeCompare(b.finca) ||
                a.bloque.localeCompare(b.bloque)
            )
    }
}