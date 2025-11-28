import { Metadata } from '@/lib/context/metadata-context'
import { DataTableConfig } from '@/lib/hooks/use-data-table'

// --- Types ---
export type ProduccionRow = {
    key: string
    fecha: string
    finca: string
    bloque: string
    variedad: string
    cantidad: number
}

// --- Config ---
export const produccionConfig: DataTableConfig<any, ProduccionRow> = {
    table: 'produccion',
    dateColumn: 'created_at',
    defaultDays: 30,
    filterKeys: ['finca', 'bloque', 'variedad'],
    colSpan: 5,

    buildQueryFilters: (query, filters, metadata) => {
        // Filter by finca
        if (filters.finca?.size > 0) {
            const fincaIds = Array.from(metadata.fincas.entries())
                .filter(([_, nombre]) => filters.finca!.has(nombre))
                .map(([id]) => id)
            query = query.in('finca', fincaIds)
        }

        // Filter by bloque
        if (filters.bloque?.size > 0) {
            const bloqueIds = Array.from(metadata.bloques.entries())
                .filter(([_, data]) => filters.bloque!.has(data.nombre))
                .map(([id]) => id)
            query = query.in('bloque', bloqueIds)
        }

        // Filter by variedad
        if (filters.variedad?.size > 0) {
            const variedadIds = Array.from(metadata.variedades.entries())
                .filter(([_, nombre]) => filters.variedad!.has(nombre))
                .map(([id]) => id)
            query = query.in('variedad', variedadIds)
        }

        return query
    },

    // Custom filter options since produccion doesn't use beds
    getFilterOptions: (metadata: Metadata, filters) => {
        const allFincas = Array.from(metadata.fincas.values()).sort()
        const allBloques = Array.from(metadata.bloques.values())
        const allVariedades = Array.from(metadata.variedades.values()).sort()

        // Cascading: bloque options depend on selected finca
        const filteredBloques = filters.finca?.size
            ? allBloques.filter(b => filters.finca!.has(b.finca))
            : allBloques

        return {
            finca: allFincas,
            bloque: [...new Set(filteredBloques.map(b => b.nombre))].sort(),
            variedad: allVariedades
        }
    },

    processRows: (raw: any[], metadata: Metadata): ProduccionRow[] => {
        // Group by fecha + finca + bloque + variedad
        const consolidatedMap = new Map<string, ProduccionRow>()

        raw.forEach(prod => {
            const fincaName = metadata.fincas.get(prod.finca)
            const bloqueData = metadata.bloques.get(prod.bloque)
            const variedadName = metadata.variedades.get(prod.variedad)

            if (!fincaName || !bloqueData || !variedadName) return

            const fecha = new Date(prod.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
            const key = `${fecha}-${prod.finca}-${prod.bloque}-${prod.variedad}`

            let row = consolidatedMap.get(key)
            if (!row) {
                row = {
                    key,
                    fecha,
                    finca: fincaName,
                    bloque: bloqueData.nombre,
                    variedad: variedadName,
                    cantidad: 0
                }
                consolidatedMap.set(key, row)
            }

            row.cantidad += prod.cantidad || 0
        })

        return Array.from(consolidatedMap.values())
            .sort((a, b) =>
                new Date(b.fecha).getTime() - new Date(a.fecha).getTime() ||
                a.finca.localeCompare(b.finca) ||
                a.bloque.localeCompare(b.bloque) ||
                a.variedad.localeCompare(b.variedad)
            )
    }
}
