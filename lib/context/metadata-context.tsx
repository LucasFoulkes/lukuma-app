'use client'

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react'
import { queryTables } from '@/lib/services/database.service'

// Raw table types from Supabase
type RawCama = { id_cama: number; nombre: string; ancho_metros: number; largo_metros: number }
type RawGrupo = {
    id_grupo: number;
    id_bloque: number;
    id_variedad: number;
    estado: string;
    cama: RawCama[]
}
type RawBloque = { id_bloque: number; nombre: string; id_finca: number }
type RawFinca = { id_finca: number; nombre: string }
type RawVariedad = { id_variedad: number; nombre: string }
type RawUsuario = { id_usuario: string; nombres: string; apellidos: string }

export type Bed = {
    cama: string
    bloque: string
    finca: string
    variedad: string
    id_bloque: number
    id_variedad: number
    id_finca: number
    id_grupo: number
    ancho: number
    largo: number
    estado: string
}

export type BloqueInfo = { nombre: string; finca: string; id_finca: number }

export interface Metadata {
    beds: Map<number, Bed>
    fincas: Map<number, string>
    bloques: Map<number, BloqueInfo>
    variedades: Map<number, string>
    users: Map<string, string>
    bloqueActiveAreas: Map<string, number>
    loading: boolean
}

type RawTables = {
    grupo_cama: RawGrupo[]
    bloque: RawBloque[]
    finca: RawFinca[]
    variedad: RawVariedad[]
    usuario: RawUsuario[]
}

function buildMetadata({ grupo_cama, bloque, finca, variedad, usuario }: RawTables): Omit<Metadata, 'loading'> {
    const fincas = new Map(finca.map(f => [f.id_finca, f.nombre]))
    const variedades = new Map(variedad.map(v => [v.id_variedad, v.nombre]))
    const bloqueMap = new Map(bloque.map(b => [b.id_bloque, b]))

    const beds = new Map<number, Bed>()
    const bloqueActiveAreas = new Map<string, number>()

    for (const g of grupo_cama) {
        const b = bloqueMap.get(g.id_bloque)
        if (!b) continue

        const fincaName = fincas.get(b.id_finca) || ''
        const variedadName = variedades.get(g.id_variedad) || ''
        const blockKey = `${b.id_finca}|${g.id_bloque}|${g.id_variedad}`

        let groupArea = 0

        for (const c of g.cama || []) {
            const area = (c.ancho_metros || 0) * (c.largo_metros || 0)
            groupArea += area

            beds.set(c.id_cama, {
                cama: c.nombre,
                bloque: b.nombre,
                finca: fincaName,
                variedad: variedadName,
                id_bloque: g.id_bloque,
                id_variedad: g.id_variedad,
                id_finca: b.id_finca,
                id_grupo: g.id_grupo,
                ancho: c.ancho_metros || 0,
                largo: c.largo_metros || 0,
                estado: g.estado || ''
            })
        }

        // Always add to active area so we have a denominator, 
        // but we can filter later if needed.
        bloqueActiveAreas.set(blockKey, (bloqueActiveAreas.get(blockKey) || 0) + groupArea)
    }

    const bloques = new Map(bloque.map(b => [b.id_bloque, { 
        nombre: b.nombre, 
        finca: fincas.get(b.id_finca) || '',
        id_finca: b.id_finca 
    }]))
    const users = new Map(usuario.map(u => [u.id_usuario, `${u.nombres} ${u.apellidos || ''}`.trim()]))

    return { beds, fincas, bloques, variedades, users, bloqueActiveAreas }
}

const emptyMetadata: Metadata = {
    beds: new Map(), fincas: new Map(), bloques: new Map(), variedades: new Map(), users: new Map(), bloqueActiveAreas: new Map(), loading: true
}

const MetadataContext = createContext<Metadata | null>(null)

export function MetadataProvider({ children }: { children: ReactNode }) {
    const [metadata, setMetadata] = useState<Metadata>(emptyMetadata)

    useEffect(() => {
        queryTables([
            { table: 'grupo_cama', select: 'id_grupo,id_bloque,id_variedad,estado,cama(id_cama,nombre,ancho_metros,largo_metros)' },
            { table: 'bloque', select: 'id_bloque,nombre,id_finca' },
            { table: 'finca', select: 'id_finca,nombre' },
            { table: 'variedad', select: 'id_variedad,nombre' },
            { table: 'usuario', select: 'id_usuario,nombres,apellidos' }
        ]).then(raw => setMetadata({ ...buildMetadata(raw as RawTables), loading: false }))
    }, [])

    const value = useMemo(() => metadata, [metadata])
    return <MetadataContext.Provider value={value}>{children}</MetadataContext.Provider>
}

export function useMetadata() {
    const ctx = useContext(MetadataContext)
    if (!ctx) throw new Error('useMetadata must be used within MetadataProvider')
    return ctx
}
