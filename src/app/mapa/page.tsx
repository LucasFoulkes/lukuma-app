import { getTable, getRowsByColumn, getRowById } from "@/services/db"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"

export default async function MapaPage() {
    let error = null
    let fincas: any[] = []

    try {
        const allFincas = await getTable('finca')
        const activeFincas = allFincas.filter((f: any) => f.eliminado_en === null)

        fincas = await Promise.all(
            activeFincas.map(async (finca: any) => {
                const bloques = await getRowsByColumn('bloque', 'id_finca', finca.id_finca)

                const bloquesWithCamas = await Promise.all(
                    bloques.map(async (bloque: any) => {
                        const grupos = await getRowsByColumn('grupo_cama', 'id_bloque', bloque.id_bloque)

                        let camaCount = 0
                        const variedadIds = new Set<number>()

                        for (const grupo of grupos) {
                            const camas = await getRowsByColumn('cama', 'id_grupo', grupo.id_grupo)
                            camaCount += camas.length

                            if (grupo.id_variedad) {
                                variedadIds.add(grupo.id_variedad)
                            }
                        }

                        const variedades = await Promise.all(
                            Array.from(variedadIds).map(id =>
                                getRowById('variedad', 'id_variedad', id).catch(() => null)
                            )
                        )

                        return {
                            ...bloque,
                            cama_count: camaCount,
                            variedades: variedades.filter(Boolean)
                        }
                    })
                )

                return {
                    ...finca,
                    bloques: bloquesWithCamas.sort((a: any, b: any) =>
                        a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' })
                    )
                }
            })
        )
    } catch (e) {
        console.error('Mapa page error:', e)
        error = e instanceof Error ? e.message : 'Unknown error'
    }

    if (error) {
        return (
            <div className="p-8">
                <h1 className="text-3xl font-bold mb-6">Mapa</h1>
                <div className="text-red-500 p-4 border border-red-300 rounded-lg bg-red-50">
                    <p className="font-semibold">Error:</p>
                    <p>{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full overflow-hidden p-4">
            <div className="grid grid-cols-2 gap-4 h-full">
                {fincas.map((finca) => (
                    <div key={finca.id_finca} className="flex flex-col overflow-hidden">
                        <div className="flex items-baseline gap-3 mb-5 flex-shrink-0">
                            <h2 className="text-xl font-semibold">{finca.nombre}</h2>
                            <span className="text-sm text-muted-foreground">
                                {finca.bloques.length} {finca.bloques.length === 1 ? 'bloque' : 'bloques'}
                            </span>
                        </div>

                        <Card className="p-0 overflow-hidden flex-1 flex flex-col">
                            {finca.bloques.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">
                                    No hay bloques en esta finca
                                </p>
                            ) : (
                                <ScrollArea className="flex-1 h-0">
                                    <div className="divide-y">
                                        {finca.bloques.map((bloque: any, idx: number) => (
                                            <Link
                                                key={bloque.id_bloque}
                                                href={`/mapa/bloque/${bloque.id_bloque}`}
                                                className="grid grid-cols-[50px_1fr] gap-4 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                                            >
                                                <div className="flex items-center justify-center border-r pr-2">
                                                    <span className="text-[15px] font-semibold text-muted-foreground">
                                                        {bloque.nombre}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 items-center py-1">
                                                    {bloque.variedades && bloque.variedades.length > 0 ? (
                                                        bloque.variedades.map((v: any, i: number) => (
                                                            <div
                                                                key={i}
                                                                className="text-sm relative pl-3 before:content-['•'] before:absolute before:left-0 before:text-muted-foreground"
                                                            >
                                                                {v.nombre}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">Sin variedades</span>
                                                    )}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </Card>
                    </div>
                ))}
            </div>

            {fincas.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    No hay fincas disponibles
                </div>
            )}
        </div>
    )
}
