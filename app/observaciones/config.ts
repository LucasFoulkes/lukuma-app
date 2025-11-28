import { Metadata } from '@/lib/context/metadata-context'
import { DataTableConfig, Filters } from '@/lib/hooks/use-data-table'

// --- Types ---
export type CamaRow = {
    key: string
    cama: string
    id_cama: number
    tipos: Record<string, number>
    users: string
    gpsIds: Set<string>
    obsIds: number[]
}

export type ObservacionRow = {
    key: string
    fecha: string
    finca: string
    bloque: string
    variedad: string
    camas: string
    tipos: Record<string, number>
    users: string
    gpsIds: Set<string>
    _camaRows: CamaRow[]
}

// --- Constants ---
export const OBS_COLUMNS = ['arroz', 'arveja', 'garbanzo', 'rayando_color', 'sepalos_abiertos']

// --- Config ---
export const observacionesConfig: DataTableConfig<any, ObservacionRow> = {
    table: 'observacion',
    dateColumn: 'creado_en',
    defaultDays: 7,
    filterKeys: ['finca', 'bloque', 'variedad', 'cama', 'usuario'],
    colSpan: 12,

    buildQueryFilters: (query, filters, metadata) => {
        // Filter by beds
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
            query = query.in('id_cama', bedIds)
        }

        // Filter by users
        if (filters.usuario?.size) {
            const userIds = Array.from(metadata.users.entries())
                .filter(([_, name]) => filters.usuario.has(name))
                .map(([id]) => id)
            query = query.in('id_usuario', userIds)
        }

        return query
    },

    processRows: (raw: any[], metadata: Metadata): ObservacionRow[] => {
        const consolidatedMap = new Map<string, {
            row: Omit<ObservacionRow, 'camas' | 'users' | '_camaRows'>
            camaMap: Map<string, CamaRow>
            camaNames: Set<string>
            userNames: Set<string>
        }>()

        raw.forEach(obs => {
            const bed = metadata.beds.get(obs.id_cama)
            if (!bed) return

            const fecha = new Date(obs.creado_en).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
            const consolidatedKey = `${fecha}-${bed.id_bloque}-${bed.id_variedad}`
            const camaKey = `${consolidatedKey}-${obs.id_cama}`

            let entry = consolidatedMap.get(consolidatedKey)
            if (!entry) {
                entry = {
                    row: {
                        key: consolidatedKey, fecha,
                        finca: bed.finca, bloque: bed.bloque, variedad: bed.variedad,
                        tipos: {}, gpsIds: new Set()
                    },
                    camaMap: new Map(),
                    camaNames: new Set(),
                    userNames: new Set()
                }
                consolidatedMap.set(consolidatedKey, entry)
            }

            entry.camaNames.add(bed.cama)

            let camaRow = entry.camaMap.get(camaKey)
            if (!camaRow) {
                camaRow = { key: camaKey, cama: bed.cama, id_cama: obs.id_cama, tipos: {}, users: '', gpsIds: new Set(), obsIds: [] }
                entry.camaMap.set(camaKey, camaRow)
            }

            camaRow.obsIds.push(obs.id_observacion)

            if (obs.tipo_observacion) {
                entry.row.tipos[obs.tipo_observacion] = (entry.row.tipos[obs.tipo_observacion] || 0) + (obs.cantidad || 0)
                camaRow.tipos[obs.tipo_observacion] = (camaRow.tipos[obs.tipo_observacion] || 0) + (obs.cantidad || 0)
            }

            const userName = metadata.users.get(obs.id_usuario) || ''
            if (userName) {
                entry.userNames.add(userName)
            }

            if (obs.id_punto_gps) {
                entry.row.gpsIds.add(obs.id_punto_gps)
                camaRow.gpsIds.add(obs.id_punto_gps)
            }
        })

        return Array.from(consolidatedMap.values())
            .map(({ row, camaMap, camaNames, userNames }) => ({
                ...row,
                camas: Array.from(camaNames).sort().join(', '),
                users: Array.from(userNames).filter(Boolean).join(', '),
                _camaRows: Array.from(camaMap.values())
                    .map(cr => ({ ...cr, users: '' }))
                    .sort((a, b) => a.cama.localeCompare(b.cama))
            }))
            .sort((a, b) =>
                new Date(b.fecha).getTime() - new Date(a.fecha).getTime() ||
                a.finca.localeCompare(b.finca) ||
                a.bloque.localeCompare(b.bloque)
            )
    }
}
