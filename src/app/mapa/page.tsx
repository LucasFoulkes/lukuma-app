"use client"

import { FincaBloqueCard, FincaBloqueCardSkeleton } from "@/components/finca-bloque-card"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { getTable, getRowsByColumn } from "@/services/db"
import { SidebarTrigger } from "@/components/ui/sidebar"

interface FincaData {
    finca: any
    bloques: any[]
    bloqueVariedades: Map<number, Set<string>>
}

export default function MapaPage() {
    const [fincasData, setFincasData] = useState<FincaData[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("")

    useEffect(() => {
        async function loadData() {
            const allFincas = await getTable('finca')
            const fincas = allFincas.filter((f: any) => f.eliminado_en === null)

            const allGrupos = await getTable('grupo_cama')
            const allVariedades = await getTable('variedad')

            const fincasDataArray: FincaData[] = []

            for (const finca of fincas) {
                const allBloques = await getRowsByColumn('bloque', 'id_finca', finca.id_finca)
                const bloques = allBloques.filter((b: any) => b.eliminado_en === null)
                
                const bloqueIds = bloques.map((b: any) => b.id_bloque)
                const grupos = allGrupos.filter((g: any) => 
                    g.eliminado_en === null && bloqueIds.includes(g.id_bloque)
                )

                const variedadIds = new Set<number>()
                grupos.forEach((grupo: any) => {
                    if (grupo.id_variedad) variedadIds.add(grupo.id_variedad)
                })

                const variedades = allVariedades.filter((v: any) => 
                    v.eliminado_en === null && variedadIds.has(v.id_variedad)
                )

                const variedadMap = new Map<number, string>()
                variedades.forEach((v: any) => {
                    variedadMap.set(v.id_variedad, v.nombre)
                })

                const bloqueVariedades = new Map<number, Set<string>>()
                grupos.forEach((grupo: any) => {
                    const variedadName = variedadMap.get(grupo.id_variedad)
                    if (variedadName) {
                        if (!bloqueVariedades.has(grupo.id_bloque)) {
                            bloqueVariedades.set(grupo.id_bloque, new Set())
                        }
                        bloqueVariedades.get(grupo.id_bloque)?.add(variedadName)
                    }
                })

                fincasDataArray.push({ finca, bloques, bloqueVariedades })
            }

            setFincasData(fincasDataArray)
            setLoading(false)
        }

        loadData()
    }, [])

    const filteredFincasData = filter
        ? fincasData.map(({ finca, bloques, bloqueVariedades }) => {
            const filteredBloques = bloques.filter((bloque: any) => {
                const variedadesInBloque = bloqueVariedades.get(bloque.id_bloque)
                if (!variedadesInBloque) return false
                
                const filterLower = filter.toLowerCase()
                return Array.from(variedadesInBloque).some(v => 
                    v.toLowerCase().includes(filterLower)
                )
            })

            return filteredBloques.length > 0 
                ? { finca, bloques: filteredBloques, bloqueVariedades }
                : null
        }).filter(Boolean) as FincaData[]
        : fincasData

    return (
        <>
            <header className="flex items-center gap-4 border-b px-4 py-2">
                <SidebarTrigger />
                <h1 className="text-lg font-semibold">Mapa</h1>
                <div className="flex-1" />
                <div className="relative w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Filtrar por variedad..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </header>
            <div className="h-full overflow-hidden p-4">
                {loading ? (
                    <div className="grid grid-cols-2 gap-4">
                        <FincaBloqueCardSkeleton />
                        <FincaBloqueCardSkeleton />
                    </div>
                ) : filteredFincasData.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        {filter ? 'No se encontraron bloques con esa variedad' : 'No hay fincas disponibles'}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 overflow-auto">
                        {filteredFincasData.map(({ finca, bloques, bloqueVariedades }) => (
                            <FincaBloqueCard
                                key={finca.id_finca}
                                finca={finca}
                                bloques={bloques}
                                bloqueVariedades={bloqueVariedades}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}
