import { type Metadata } from '@/lib/context/metadata-context'

export type PincheRow = {
    id: number
    fecha: Date
    finca: string
    fincaId: number
    bloque: string
    bloqueId: number
    cama: string | null
    variedad: string
    variedadId: number
    cantidad: number
    tipo: string
}

export type PincheData = {
    id: number
    created_at: string
    bloque: number
    cama: number | null
    variedad: number
    cantidad: number
    tipo: string
}

export function transformPinches(rows: PincheData[], metadata: Metadata): PincheRow[] {
    const { bloques, variedades, fincas } = metadata

    return rows.map(r => {
        const bloque = bloques.get(r.bloque)
        const variedad = variedades.get(r.variedad)
        const fincaName = bloque ? fincas.get(bloque.id_finca) : undefined

        return {
            id: r.id,
            fecha: new Date(r.created_at),
            finca: fincaName || 'Unknown',
            fincaId: bloque?.id_finca || 0,
            bloque: bloque?.nombre || `Bloque ${r.bloque}`,
            bloqueId: r.bloque,
            cama: r.cama ? String(r.cama) : null,
            variedad: variedad || `Variedad ${r.variedad}`,
            variedadId: r.variedad,
            cantidad: r.cantidad,
            tipo: r.tipo
        }
    })
}
