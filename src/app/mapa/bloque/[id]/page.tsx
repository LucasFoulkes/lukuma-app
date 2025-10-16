import { getRowById, getRowsByColumn, getTable } from "@/services/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BloqueMap } from "@/components/bloque-map"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function BloquePage({
    params,
}: {
    params: { id: string }
}) {
    let error = null
    let bloque: any = null
    let finca: any = null
    let grupos: any[] = []
    let variedades: any[] = []
    let camasWithData: any[] = []
    let allBloques: any[] = []
    let prevBloque: any = null
    let nextBloque: any = null

    try {
        bloque = await getRowById('bloque', 'id_bloque', parseInt(params.id))

        if (bloque) {
            // Get all bloques from same finca for navigation
            allBloques = await getTable('bloque')
            const sameFincaBloques = allBloques
                .filter((b: any) => b.id_finca === bloque.id_finca)
                .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' }))

            const currentIndex = sameFincaBloques.findIndex((b: any) => b.id_bloque === bloque.id_bloque)
            if (currentIndex > 0) prevBloque = sameFincaBloques[currentIndex - 1]
            if (currentIndex < sameFincaBloques.length - 1) nextBloque = sameFincaBloques[currentIndex + 1]
        }

        bloque = await getRowById('bloque', 'id_bloque', parseInt(params.id))

        if (bloque) {
            finca = await getRowById('finca', 'id_finca', bloque.id_finca)
            grupos = await getRowsByColumn('grupo_cama', 'id_bloque', bloque.id_bloque)

            // Get unique variedades
            const variedadIds = new Set<number>()
            grupos.forEach((g: any) => {
                if (g.id_variedad) variedadIds.add(g.id_variedad)
            })

            variedades = await Promise.all(
                Array.from(variedadIds).map(id =>
                    getRowById('variedad', 'id_variedad', id).catch(() => null)
                )
            ).then(results => results.filter(Boolean))

            // Get all camas with their grupo and variedad info
            camasWithData = await Promise.all(
                grupos.map(async (grupo: any) => {
                    const camas = await getRowsByColumn('cama', 'id_grupo', grupo.id_grupo)
                    const variedad = grupo.id_variedad
                        ? await getRowById('variedad', 'id_variedad', grupo.id_variedad).catch(() => null)
                        : null

                    return camas.map((cama: any) => ({
                        ...cama,
                        variedad: variedad,
                        grupo: grupo
                    }))
                })
            ).then(results => results.flat())
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

    // Calculate statistics
    const uniqueVariedades = Array.from(new Set(camasWithData.map(c => c.variedad?.nombre).filter(Boolean)))
    const totalCamas = camasWithData.length

    return (
        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
            {/* Map Card */}
            <Card className="flex-1 p-4 overflow-hidden flex flex-col min-h-0 relative">
                {/* Navigation Arrows */}
                {prevBloque && (
                    <Link href={`/mapa/bloque/${prevBloque.id_bloque}`} className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
                        <Button variant="outline" size="icon" className="h-8 w-8">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                )}
                {nextBloque && (
                    <Link href={`/mapa/bloque/${nextBloque.id_bloque}`} className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                        <Button variant="outline" size="icon" className="h-8 w-8">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </Link>
                )}

                <div className="flex-1 min-h-0">
                    <BloqueMap
                        bloqueId={bloque.id_bloque}
                        bloqueName={bloque.nombre}
                        fincaName={finca?.nombre}
                        camas={camasWithData}
                    />
                </div>
            </Card>

            {/* Info Column */}
            <div className="w-64 flex flex-col gap-4 overflow-hidden">
                {/* Varieties Card */}
                <Card className="p-4">
                    <CardHeader className="p-0 pb-3">
                        <CardTitle className="text-sm font-medium">Variedades</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="space-y-1">
                            {uniqueVariedades.map((variedad, i) => (
                                <div key={i} className="text-sm text-muted-foreground">
                                    {variedad}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Bloque Info Card */}
                <Card className="p-4">
                    <CardHeader className="p-0 pb-3">
                        <CardTitle className="text-sm font-medium">Información</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 space-y-2">
                        <div>
                            <div className="text-xs text-muted-foreground">Finca</div>
                            <div className="text-sm font-medium">{finca?.nombre}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Bloque</div>
                            <div className="text-sm font-medium">{bloque.nombre}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Total Camas</div>
                            <div className="text-2xl font-bold">{totalCamas}</div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
