import type { Metadata } from '@/lib/context/metadata-context'

/** Cama observation (individual bed) */
export type CamaDetail = {
    idCama: number
    cama: string
    ancho: number
    largo: number
    area: number
    primeraHora: Date
    ultimaHora: Date
    usuarios: string[]
    pct: number
    arroz: number
    arveja: number
    garbanzo: number
    rayando_color: number
    sepalos_abiertos: number
}

/** Grouped observation row (by location/day) */
export type ObservacionRow = {
    fecha: string
    finca: string
    bloque: string
    variedad: string
    estado: string
    camas: CamaDetail[]
}

/** Row from v_observacion_cama view */
type ViewRow = {
    id_cama: number
    id_finca: number
    id_bloque: number
    id_variedad: number
    estado: string
    ancho: number
    largo: number
    fecha: string
    primera_hora: string
    ultima_hora: string
    usuario_ids: string[]
    arroz: number
    arveja: number
    garbanzo: number
    rayando_color: number
    sepalos_abiertos: number
}

export type { ViewRow as ViewObservacionCama }

export function transformObservaciones(rows: ViewRow[], metadata: Metadata): ObservacionRow[] {
    if (metadata.loading || !rows.length) return []
    const { beds, users, fincas, bloques, variedades, bloqueActiveAreas } = metadata

    const groups = new Map<string, ViewRow[]>()
    for (const row of rows) {
        // Use the 'fecha' from the view to ensure we group by day
        const key = `${row.fecha}|${row.id_finca}|${row.id_bloque}|${row.id_variedad}`
        const group = groups.get(key)
        if (group) group.push(row)
        else groups.set(key, [row])
    }

    return Array.from(groups.values()).map(group => {
        const { id_finca, id_bloque, id_variedad, fecha, estado } = group[0]
        const finca = fincas.get(id_finca) || `Finca ${id_finca}`
        const bloque = bloques.get(id_bloque)?.nombre || `Bloque ${id_bloque}`
        const variedad = variedades.get(id_variedad) || `Variedad ${id_variedad}`
        const totalArea = bloqueActiveAreas.get(`${id_finca}|${id_bloque}|${id_variedad}`) || 1

        type CamaAgg = Omit<CamaDetail, 'usuarios'> & { usuariosSet: Set<string> }
        const camasById = new Map<number, CamaAgg>()

        for (const r of group) {
            const idCama = r.id_cama
            const area = r.ancho * r.largo
            const primeraHora = new Date(r.primera_hora)
            const ultimaHora = new Date(r.ultima_hora)
            const usuarioNames = r.usuario_ids.map(id => users.get(id) || id)

            const existing = camasById.get(idCama)
            if (!existing) {
                camasById.set(idCama, {
                    idCama,
                    cama: beds.get(idCama)?.cama || `Cama ${idCama}`,
                    ancho: r.ancho,
                    largo: r.largo,
                    area,
                    primeraHora,
                    ultimaHora,
                    usuariosSet: new Set(usuarioNames),
                    pct: (area / totalArea) * 100,
                    arroz: r.arroz || 0,
                    arveja: r.arveja || 0,
                    garbanzo: r.garbanzo || 0,
                    rayando_color: r.rayando_color || 0,
                    sepalos_abiertos: r.sepalos_abiertos || 0
                })
                continue
            }

            if (primeraHora.getTime() < existing.primeraHora.getTime()) existing.primeraHora = primeraHora
            if (ultimaHora.getTime() > existing.ultimaHora.getTime()) existing.ultimaHora = ultimaHora
            for (const name of usuarioNames) existing.usuariosSet.add(name)

            existing.arroz += r.arroz || 0
            existing.arveja += r.arveja || 0
            existing.garbanzo += r.garbanzo || 0
            existing.rayando_color += r.rayando_color || 0
            existing.sepalos_abiertos += r.sepalos_abiertos || 0
        }

        const camas: CamaDetail[] = Array.from(camasById.values()).map(c => {
            const { usuariosSet, ...rest } = c
            return { ...rest, usuarios: Array.from(usuariosSet) }
        })

        return { fecha, finca, bloque, variedad, estado, camas }
    })
}
