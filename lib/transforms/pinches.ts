import { type Metadata } from '@/lib/context/metadata-context'

export type PincheRow = {
    id: number
    fecha: Date
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
    const { bloques, variedades } = metadata

    return rows.map(r => {
        const bloque = bloques.get(r.bloque)
        const variedad = variedades.get(r.variedad)

        return {
            id: r.id,
            fecha: new Date(r.created_at),
            bloque: bloque?.nombre || `Bloque ${r.bloque}`,
            bloqueId: r.bloque,
            cama: r.cama ? String(r.cama) : null, // We might need to look up cama name if it's an ID, but for now let's assume ID is fine or we don't have cama metadata loaded easily for all camas. Actually cama table exists.
            // For observacion we had cama names in the view. Here we have cama ID.
            // If we want cama names, we might need to fetch them or have them in metadata.
            // Metadata context currently has fincas, bloques, variedades, users. Not camas.
            // Let's just show ID for now or "Cama ID".
            variedad: variedad || `Variedad ${r.variedad}`,
            variedadId: r.variedad,
            cantidad: r.cantidad,
            tipo: r.tipo
        }
    })
}
