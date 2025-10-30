import Link from "next/link"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"

interface FincaBloqueCardProps {
    finca: any
    bloques: any[]
    bloqueVariedades: Map<number, Set<string>>
}

// Loading skeleton for the finca card
export function FincaBloqueCardSkeleton() {
    return (
        <div className="flex flex-col overflow-hidden">
            <div className="flex items-baseline gap-3 mb-5 flex-shrink-0">
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-4 w-20" />
            </div>
            <Card className="p-4 overflow-hidden flex-1 flex flex-col space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </Card>
        </div>
    )
}

export function FincaBloqueCard({ finca, bloques, bloqueVariedades }: FincaBloqueCardProps) {
    const fincaBloques = bloques
        .filter(b => b.id_finca === finca.id_finca)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' }))

    return (
        <div className="flex flex-col overflow-hidden">
            <div className="flex items-baseline gap-3 mb-5 flex-shrink-0">
                <h2 className="text-xl font-semibold">{finca.nombre}</h2>
                <span className="text-sm text-muted-foreground">
                    {fincaBloques.length} {fincaBloques.length === 1 ? 'bloque' : 'bloques'}
                </span>
            </div>

            <Card className="p-0 overflow-hidden flex-1 flex flex-col">
                {fincaBloques.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                        No hay bloques en esta finca
                    </p>
                ) : (
                    <ScrollArea className="flex-1 h-0">
                        <div className="divide-y">
                            {fincaBloques.map((bloque) => {
                                const variedadNames = Array.from(bloqueVariedades.get(bloque.id_bloque) || [])

                                return (
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
                                            {variedadNames.length > 0 ? (
                                                variedadNames.map((nombre, i) => (
                                                    <div
                                                        key={i}
                                                        className="text-sm relative pl-3 before:content-['•'] before:absolute before:left-0 before:text-muted-foreground"
                                                    >
                                                        {nombre}
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-sm text-muted-foreground italic">Sin variedades</span>
                                            )}
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    </ScrollArea>
                )}
            </Card>
        </div>
    )
}
