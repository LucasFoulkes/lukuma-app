import { Metadata } from '@/lib/context/metadata-context'
import { DataTableConfig, Filters } from '@/lib/hooks/use-data-table'

// --- Types ---
export type CamaRow = {
    key: string
    cama: string
    id_cama: string
    cantidad: number
    tipo: string
}

export type PincheRow = {
    key: string
    fecha: string
    finca: string
    bloque: string
    variedad: string
    camas: string
    cantidad: number
    tipo: string
    _camaRows: CamaRow[]
}

// --- Constants ---
export const PINCHE_TIPOS = ['pinche programado', 'pinche apertura', 'pinche sanitario']

// --- Config ---
export const pinchesConfig: DataTableConfig<any, PincheRow> = {
    table: 'pinche',
    dateColumn: 'created_at',
    defaultDays: 60, // Pinches data is sparse
    filterKeys: ['finca', 'bloque', 'variedad', 'cama', 'tipo'],
    staticFilterOptions: { tipo: PINCHE_TIPOS },
    colSpan: 7,

    buildQueryFilters: (query, filters, metadata) => {
        // Filter by beds (if cama is not null in pinche)
        const hasBedFilters = ['finca', 'bloque', 'variedad', 'cama'].some(k => filters[k]?.size > 0)
        if (hasBedFilters) {
            const bedIds = Array.from(metadata.beds.entries())
                .filter(([_, bed]) =>
                    (!filters.finca?.size || filters.finca.has(bed.finca)) &&
                    (!filters.bloque?.size || filters.bloque.has(bed.bloque)) &&
                    (!filters.variedad?.size || filters.variedad.has(bed.variedad)) &&
                    (!filters.cama?.size || filters.cama.has(bed.cama))
                )
                .map(([id]) => id)
            query = query.in('cama', bedIds)
        }

        // Filter by tipo
        if (filters.tipo?.size > 0) {
            query = query.in('tipo', Array.from(filters.tipo))
        }

        return query
    },

    processRows: (raw: any[], metadata: Metadata): PincheRow[] => {
        const consolidatedMap = new Map<string, {
            row: Omit<PincheRow, 'camas' | '_camaRows'>
            camaMap: Map<string, CamaRow>
            camaNames: Set<string>
        }>()

        raw.forEach(pinche => {
            let finca: string, bloque: string, variedad: string, camaName: string, camaId: string

            if (pinche.cama) {
                // Has cama reference
                const bed = metadata.beds.get(pinche.cama)
                if (!bed) return
                finca = bed.finca
                bloque = bed.bloque
                variedad = bed.variedad
                camaName = bed.cama
                camaId = String(pinche.cama)
            } else {
                // Has bloque + variedad reference (most pinches use this)
                const bloqueData = metadata.bloques.get(pinche.bloque)
                const variedadData = metadata.variedades.get(pinche.variedad)
                if (!bloqueData || !variedadData) return
                finca = bloqueData.finca
                bloque = bloqueData.nombre
                variedad = variedadData
                camaName = '-'
                camaId = `${pinche.bloque}-${pinche.variedad}`
            }

            const fecha = new Date(pinche.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
            const tipo = pinche.tipo || '-'
            const consolidatedKey = `${fecha}-${bloque}-${variedad}-${tipo}`
            const camaKey = `${consolidatedKey}-${camaId}`

            let entry = consolidatedMap.get(consolidatedKey)
            if (!entry) {
                entry = {
                    row: { key: consolidatedKey, fecha, finca, bloque, variedad, cantidad: 0, tipo },
                    camaMap: new Map(),
                    camaNames: new Set()
                }
                consolidatedMap.set(consolidatedKey, entry)
            }

            if (camaName !== '-') entry.camaNames.add(camaName)

            let camaRow = entry.camaMap.get(camaKey)
            if (!camaRow) {
                camaRow = { key: camaKey, cama: camaName, id_cama: camaId, cantidad: 0, tipo }
                entry.camaMap.set(camaKey, camaRow)
            }

            entry.row.cantidad += pinche.cantidad || 0
            camaRow.cantidad += pinche.cantidad || 0
        })

        return Array.from(consolidatedMap.values())
            .map(({ row, camaMap, camaNames }) => ({
                ...row,
                camas: camaNames.size > 0 ? Array.from(camaNames).sort().join(', ') : '-',
                _camaRows: Array.from(camaMap.values()).sort((a, b) => a.cama.localeCompare(b.cama))
            }))
            .sort((a, b) =>
                new Date(b.fecha).getTime() - new Date(a.fecha).getTime() ||
                a.finca.localeCompare(b.finca) ||
                a.bloque.localeCompare(b.bloque)
            )
    }
}
