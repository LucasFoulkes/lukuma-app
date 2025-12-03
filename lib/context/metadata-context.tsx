'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getTableData } from '@/lib/services/database.service'

// Types
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
    estado: string  // grupo_cama.estado (e.g., 'Productivo', 'Vegetativo')
}

export type BloqueInfo = { nombre: string; finca: string }

export interface Metadata {
    beds: Map<number, Bed>
    fincas: Map<number, string>
    bloques: Map<number, BloqueInfo>
    variedades: Map<number, string>
    users: Map<string, string>
    loading: boolean
}

const MetadataContext = createContext<Metadata | null>(null)

export function MetadataProvider({ children }: { children: ReactNode }) {
    const [metadata, setMetadata] = useState<Metadata>({
        beds: new Map(),
        fincas: new Map(),
        bloques: new Map(),
        variedades: new Map(),
        users: new Map(),
        loading: true
    })

    useEffect(() => {
        async function load() {
            const [camas, grupos, bloques, fincas, variedades, usuarios] = await Promise.all(
                ['cama', 'grupo_cama', 'bloque', 'finca', 'variedad', 'usuario'].map(t => getTableData(t))
            )

            const fincaMap = new Map(fincas.map((f: any) => [f.id_finca, f.nombre]))
            const variedadMap = new Map<number, string>(variedades.map((v: any) => [v.id_variedad, v.nombre]))
            const bloqueMap = new Map(bloques.map((b: any) => [b.id_bloque, { nombre: b.nombre, id_finca: b.id_finca }]))
            const grupoMap = new Map(grupos.map((g: any) => [g.id_grupo, { id_bloque: g.id_bloque, id_variedad: g.id_variedad, estado: g.estado || '' }]))

            const beds = new Map<number, Bed>()
            camas.forEach((c: any) => {
                const grupo = grupoMap.get(c.id_grupo)
                const bloque = grupo && bloqueMap.get(grupo.id_bloque)
                if (bloque) {
                    beds.set(c.id_cama, {
                        cama: c.nombre,
                        bloque: bloque.nombre,
                        finca: fincaMap.get(bloque.id_finca),
                        variedad: variedadMap.get(grupo.id_variedad) || '',
                        id_bloque: grupo.id_bloque,
                        id_variedad: grupo.id_variedad,
                        id_finca: bloque.id_finca,
                        id_grupo: c.id_grupo,
                        ancho: c.ancho_metros || 0,
                        largo: c.largo_metros || 0,
                        estado: grupo.estado || ''
                    })
                }
            })

            const bloquesWithFinca = new Map<number, BloqueInfo>(
                bloques.map((b: any) => [b.id_bloque, { nombre: b.nombre, finca: fincaMap.get(b.id_finca) || '' }])
            )
            const users = new Map<string, string>(
                usuarios.map((u: any) => [u.id_usuario, `${u.nombres} ${u.apellidos || ''}`.trim()])
            )

            setMetadata({ beds, fincas: fincaMap, bloques: bloquesWithFinca, variedades: variedadMap, users, loading: false })
        }
        load()
    }, [])

    return <MetadataContext.Provider value={metadata}>{children}</MetadataContext.Provider>
}

export function useMetadata() {
    const ctx = useContext(MetadataContext)
    if (!ctx) throw new Error('useMetadata must be used within MetadataProvider')
    return ctx
}
