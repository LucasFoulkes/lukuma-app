import { getRowById, getRowsByColumn, getTable } from "@/services/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BloqueMapWithSettings } from "@/components/bloque-map-with-settings"
import { COLORS } from "@/lib/colors"
import { BloquePageClient } from "@/components/bloque-page-client"
import { BloqueGruposList } from "@/components/bloque-grupos-list"

export default async function BloquePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    let error = null
    let bloque: any = null
    let finca: any = null
    let camasWithData: any[] = []

    try {
        bloque = await getRowById('bloque', 'id_bloque', parseInt(id))

        if (bloque) {
            // Fetch finca and grupos in parallel
            const [fincaData, allGrupos] = await Promise.all([
                getRowById('finca', 'id_finca', bloque.id_finca),
                getRowsByColumn('grupo_cama', 'id_bloque', bloque.id_bloque)
            ])
            finca = fincaData
            const grupos = allGrupos.filter((g: any) => g.eliminado_en === null)

            console.log(`📊 Bloque ${bloque.nombre} (ID: ${bloque.id_bloque})`)
            console.log(`  Total grupos fetched: ${allGrupos.length}`)
            console.log(`  Non-deleted grupos: ${grupos.length}`)
            console.log('  Grupos:', grupos.map((g: any) => ({ 
                id: g.id_grupo, 
                id_variedad: g.id_variedad,
                eliminado_en: g.eliminado_en 
            })))

            // Get unique variedad IDs
            const variedadIds = new Set<number>()
            grupos.forEach((g: any) => {
                if (g.id_variedad) variedadIds.add(g.id_variedad)
            })

            // Fetch all variedades once
            const allVariedades = await getTable('variedad')
            const variedadMap = new Map()
            allVariedades.forEach((v: any) => {
                if (variedadIds.has(v.id_variedad)) {
                    variedadMap.set(v.id_variedad, v)
                }
            })

            // Fetch camas for each grupo and link with variedad
            camasWithData = (await Promise.all(
                grupos.map(async (grupo: any) => {
                    const allCamas = await getRowsByColumn('cama', 'id_grupo', grupo.id_grupo)
                    const camas = allCamas.filter((c: any) => c.eliminado_en === null)
                    const variedad = variedadMap.get(grupo.id_variedad)

                    console.log(`  Grupo ${grupo.id_grupo} (variedad ${variedad?.nombre}): ${allCamas.length} total, ${camas.length} non-deleted camas`)

                    return camas.map((cama: any) => ({
                        ...cama,
                        variedad: variedad,
                        grupo: grupo
                    }))
                })
            )).flat()
        }
    } catch (e) {
        console.error('Bloque page error:', e)
        error = e instanceof Error ? e.message : 'Unknown error'
    }

    if (error || !bloque) {
        return (
            <div className="p-8">
                <h1 className="text-3xl font-bold mb-6">Bloque</h1>
                <div className="text-red-500 p-4 border border-red-300 rounded-lg bg-red-50">
                    <p className="font-semibold">Error:</p>
                    <p>{error || 'Bloque no encontrado'}</p>
                </div>
            </div>
        )
    }

    // Group camas by grupo_cama
    const gruposCamasMap = new Map<number, { grupo: any, camas: any[], variedad: any }>()
    camasWithData.forEach((cama) => {
        const grupoId = cama.grupo?.id_grupo
        if (grupoId) {
            if (!gruposCamasMap.has(grupoId)) {
                gruposCamasMap.set(grupoId, {
                    grupo: cama.grupo,
                    variedad: cama.variedad,
                    camas: []
                })
            }
            gruposCamasMap.get(grupoId)?.camas.push(cama)
        }
    })

    // Sort grupos by variedad name, then by grupo name
    const gruposList = Array.from(gruposCamasMap.values()).map(({ grupo, variedad, camas }) => {
        const areaTotal = camas.reduce((sum, cama) => {
            const largo = cama.largo_metros || 0
            const ancho = cama.ancho_metros || 0
            return sum + (largo * ancho)
        }, 0)

        return { grupo, variedad, camas, areaTotal }
    }).sort((a, b) => {
        // First sort by variedad name
        const variedadCompare = (a.variedad?.nombre || '').localeCompare(
            b.variedad?.nombre || '',
            undefined,
            { numeric: true }
        )
        if (variedadCompare !== 0) return variedadCompare

        // Then sort by grupo name
        return (a.grupo?.nombre || '').localeCompare(
            b.grupo?.nombre || '',
            undefined,
            { numeric: true }
        )
    })

    // Add colorHex to gruposList for display
    const gruposListWithColors = gruposList.map((g) => {
        const estado = g.grupo.estado?.toLowerCase()
        let colorHex = estado === 'vegetativo'
            ? '#555555'
            : (COLORS[g.variedad?.color?.toLowerCase()] || '#999999')

        // Apply shade variation if multiple grupos share same color
        const colorName = g.variedad?.color?.toLowerCase() || 'default'
        const gruposWithSameColor = gruposList.filter(item => {
            const gEstado = item.grupo.estado?.toLowerCase()
            const gColor = item.variedad?.color?.toLowerCase() || 'default'
            return gEstado !== 'vegetativo' && gColor === colorName
        })

        if (gruposWithSameColor.length > 1 && estado !== 'vegetativo') {
            const grupoIndexInColor = gruposWithSameColor.findIndex(item =>
                item.grupo.id_grupo === g.grupo.id_grupo
            )

            // Convert hex to RGB and blend
            const hex = colorHex.replace('#', '')
            const r = parseInt(hex.substr(0, 2), 16)
            const gVal = parseInt(hex.substr(2, 2), 16)
            const b = parseInt(hex.substr(4, 2), 16)

            let newR, newG, newB
            if (grupoIndexInColor % 2 === 0) {
                // Even: blend 3% with white (lighter)
                newR = Math.round(r * 0.97 + 255 * 0.03)
                newG = Math.round(gVal * 0.97 + 255 * 0.03)
                newB = Math.round(b * 0.97 + 255 * 0.03)
            } else {
                // Odd: blend 3% with black (darker)
                newR = Math.round(r * 0.97)
                newG = Math.round(gVal * 0.97)
                newB = Math.round(b * 0.97)
            }

            colorHex = `rgb(${newR}, ${newG}, ${newB})`
        }

        return {
            ...g,
            variedad: { ...g.variedad, colorHex }
        }
    })

    return (
        <BloquePageClient
            bloque={bloque}
            finca={finca}
            camasWithData={camasWithData}
            gruposForMap={gruposListWithColors.map((g) => ({
                ...g.grupo,
                variedad: g.variedad,
                camasCount: g.camas.length,
                colorHex: g.variedad.colorHex
            }))}
            gruposList={gruposList}
        >
            {/* Grupos List */}
            <BloqueGruposList
                gruposList={gruposListWithColors}
            />
        </BloquePageClient>
    )
}
