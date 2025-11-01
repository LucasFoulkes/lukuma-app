"use client"

import * as React from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ObservationTable } from "@/components/observation-table"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { type DateRange } from "react-day-picker"
import * as XLSX from 'xlsx'

interface DashboardContentProps {
    initialObservations: any[]
    totalObservations: number
    initialDate: Date
    camaCountsByBloque: Record<string, { finca: string, bloque: string, count: number, area: number, areaProductiva: number }>
    error: string | null
}

export function DashboardContent({ initialObservations, totalObservations, initialDate, camaCountsByBloque, error: initialError }: DashboardContentProps) {
    // Start with no date filter - show all observations
    const [date, setDate] = React.useState<DateRange | undefined>(undefined)
    const [observations, setObservations] = React.useState(initialObservations)
    const [isLoading, setIsLoading] = React.useState(false)
    const [isLoadingMore, setIsLoadingMore] = React.useState(false)
    const [error, setError] = React.useState<string | null>(initialError)
    const [viewMode, setViewMode] = React.useState<'cama' | 'bloque'>('bloque')
    const [hasMoreData, setHasMoreData] = React.useState(initialObservations.length < totalObservations)

    // Function to load more observations from the database
    const loadMoreObservations = React.useCallback(async () => {
        if (isLoadingMore || !hasMoreData) return

        setIsLoadingMore(true)
        try {
            const response = await fetch(`/api/observations/more?offset=${observations.length}&limit=1000`)
            if (!response.ok) {
                throw new Error('Failed to fetch more observations')
            }

            const result = await response.json()
            if (result.data && result.data.length > 0) {
                setObservations(prev => [...prev, ...result.data])
                setHasMoreData(observations.length + result.data.length < result.total)
            } else {
                setHasMoreData(false)
            }
        } catch (err) {
            console.error('Error loading more observations:', err)
        } finally {
            setIsLoadingMore(false)
        }
    }, [observations.length, isLoadingMore, hasMoreData])

    // Function to download data as Excel
    const downloadExcel = () => {
        // Create a new workbook
        const wb = XLSX.utils.book_new()
        
        // Convert data to worksheet
        const ws = XLSX.utils.json_to_sheet(filteredData)
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Observaciones')
        
        // Generate filename with current date
        const date = new Date().toISOString().split('T')[0]
        const filename = `observaciones_${viewMode}_${date}.xlsx`
        
        // Write file
        XLSX.writeFile(wb, filename)
    }

    // Fetch observations when date changes
    React.useEffect(() => {
        if (!date?.from || !date?.to) return

        const fetchObservations = async () => {
            setIsLoading(true)
            try {
                const fromDate = new Date(date.from!)
                const toDate = new Date(date.to!)
                
                const params = new URLSearchParams({
                    from: fromDate.toISOString(),
                    to: toDate.toISOString()
                })

                const response = await fetch(`/api/observations?${params}`)
                if (!response.ok) {
                    throw new Error('Failed to fetch observations')
                }

                const data = await response.json()
                setObservations(data)
                setError(null)
            } catch (err) {
                console.error('Error fetching observations:', err)
                setError(err instanceof Error ? err.message : 'Unknown error')
            } finally {
                setIsLoading(false)
            }
        }

        fetchObservations()
    }, [date])

    const filteredData = React.useMemo(() => {
        console.log('🔍 Total observations:', observations.length)
        if (observations.length === 0) return []

        // Group by cama + date and aggregate by tipo_observacion
        const groupedByCama = observations.reduce((acc, obs) => {
            // Get the date (YYYY-MM-DD) from the observation
            const obsDate = new Date(obs.creado_en)
            const dateKey = obsDate.toISOString().split('T')[0] // YYYY-MM-DD format
            const camaId = obs.id_cama
            const groupKey = `${camaId}|${dateKey}`
            
            if (!acc[groupKey]) {
                // Get usuario name - use first observation's usuario
                const usuarioNombre = obs.usuario 
                    ? `${obs.usuario.nombres || ''} ${obs.usuario.apellidos || ''}`.trim()
                    : ''
                
                // Get variedad name
                const variedadNombre = obs.cama?.grupo_cama?.variedad?.nombre || 'Sin variedad'
                
                acc[groupKey] = {
                    id_cama: camaId,
                    fecha: dateKey,
                    cama_nombre: obs.cama?.nombre || '',
                    bloque_nombre: obs.cama?.grupo_cama?.bloque?.nombre || '',
                    finca_nombre: obs.cama?.grupo_cama?.bloque?.finca?.nombre || '',
                    variedad_nombre: variedadNombre,
                    usuario_nombre: usuarioNombre,
                    largo_metros: obs.cama?.largo_metros || 0,
                    ancho_metros: obs.cama?.ancho_metros || 0,
                    observaciones: {},
                    observation_count: 0,
                    first_observation: null as Date | null,
                    last_observation: null as Date | null
                }
            }
            
            // Count observations
            acc[groupKey].observation_count++
            
            // Track first and last observation times
            const obsDateTime = new Date(obs.creado_en)
            if (!acc[groupKey].first_observation || obsDateTime < acc[groupKey].first_observation!) {
                acc[groupKey].first_observation = obsDateTime
            }
            if (!acc[groupKey].last_observation || obsDateTime > acc[groupKey].last_observation!) {
                acc[groupKey].last_observation = obsDateTime
            }
            
            const tipo = obs.tipo_observacion || 'Sin tipo'
            const cantidad = parseFloat(obs.cantidad) || 0
            
            if (acc[groupKey].observaciones[tipo]) {
                acc[groupKey].observaciones[tipo] += cantidad
            } else {
                acc[groupKey].observaciones[tipo] = cantidad
            }
            
            return acc
        }, {} as Record<string, { 
            id_cama: number,
            fecha: string,
            cama_nombre: string,
            bloque_nombre: string,
            finca_nombre: string,
            variedad_nombre: string,
            usuario_nombre: string,
            largo_metros: number,
            ancho_metros: number,
            observaciones: Record<string, number>,
            observation_count: number,
            first_observation: Date | null,
            last_observation: Date | null
        }>)

        // Convert to array and flatten the observaciones into columns
        const result = Object.values(groupedByCama).map((cama) => {
            // Calculate time span in minutes
            let timeSpan = 0
            let timeSpanDisplay = '—'
            if (cama.first_observation && cama.last_observation) {
                const diffMs = cama.last_observation.getTime() - cama.first_observation.getTime()
                timeSpan = diffMs / (1000 * 60) // minutes
                timeSpanDisplay = `${timeSpan.toFixed(2)} min`
            }
            
            // Calculate per square meter metrics
            const largoMetros = cama.largo_metros || 0
            const anchoMetros = cama.ancho_metros || 0
            const areaCama = largoMetros * anchoMetros
            const obsPerMetro = areaCama > 0 ? cama.observation_count / areaCama : 0
            const timePerMetro = areaCama > 0 && timeSpan > 0 ? timeSpan / areaCama : 0
            
            // Get cama count and area for this bloque from the passed prop
            const bloqueKey = `${cama.finca_nombre}|${cama.bloque_nombre}`
            const areaProductiva = camaCountsByBloque[bloqueKey]?.areaProductiva || 0
            
            // Calculate percentage of productive area this cama represents
            const porcentajeArea = areaProductiva > 0 ? (areaCama / areaProductiva) * 100 : 0
            
            const row: Record<string, any> = {
                'Fecha': cama.fecha,
                'Finca': cama.finca_nombre,
                'Bloque': cama.bloque_nombre,
                'Cama': cama.cama_nombre,
                'Variedad': cama.variedad_nombre,
                'Área Observada (m²)': areaCama,
                '% del Bloque': porcentajeArea,
                'Usuario': cama.usuario_nombre,
                'Observaciones': cama.observation_count,
                'Obs/m²': obsPerMetro,
                'Tiempo Total': timeSpanDisplay,
                'Tiempo/m²': timePerMetro > 0 ? `${timePerMetro.toFixed(2)} min` : '—'
            }
            
            // Add each tipo_observacion as a column
            Object.entries(cama.observaciones).forEach(([tipo, cantidad]) => {
                row[tipo] = cantidad
            })
            
            return row
        })

        console.log('📊 Grouped by cama/date:', result.length, 'rows')
        console.log('📅 Unique dates:', [...new Set(result.map(r => r.Fecha))].sort())

        // If viewing by bloque, aggregate cama data by bloque AND variedad AND date
        if (viewMode === 'bloque') {
            const groupedByBloque = result.reduce((acc, row) => {
                // Group by fecha|finca|bloque|variedad to keep different dates/varieties separate
                const bloqueKey = `${row.Fecha}|${row.Finca}|${row.Bloque}|${row.Variedad}`
                
                if (!acc[bloqueKey]) {
                    acc[bloqueKey] = {
                        'Fecha': row.Fecha,
                        'Finca': row.Finca,
                        'Bloque': row.Bloque,
                        'Variedad': row.Variedad,
                        'Área Observada (m²)': 0,
                        '% del Bloque': 0,
                        'Usuario': row.Usuario,
                        'Observaciones': 0,
                        'Obs/m²': 0,
                        'Tiempo Total': '—',
                        'Tiempo/m²': '—',
                        observaciones: {},
                        totalAreaObservada: 0,
                        camaIds: new Set()
                    }
                }
                
                // Track unique camas to avoid double counting
                const camaName = row['Cama']
                if (!acc[bloqueKey].camaIds.has(camaName)) {
                    acc[bloqueKey].camaIds.add(camaName)
                    // Sum up areas and observations
                    acc[bloqueKey]['Área Observada (m²)'] += row['Área Observada (m²)'] || 0
                    acc[bloqueKey].totalAreaObservada += row['Área Observada (m²)'] || 0
                    acc[bloqueKey]['Observaciones'] += row['Observaciones'] || 0
                }
                
                // Aggregate observation types
                Object.keys(row).forEach(key => {
                    if (!['Fecha', 'Finca', 'Bloque', 'Cama', 'Variedad', 'Área Observada (m²)', '% del Bloque', 'Usuario', 'Observaciones', 'Obs/m²', 'Tiempo Total', 'Tiempo/m²'].includes(key)) {
                        if (typeof row[key] === 'number') {
                            acc[bloqueKey].observaciones[key] = (acc[bloqueKey].observaciones[key] || 0) + row[key]
                        }
                    }
                })
                
                return acc
            }, {} as Record<string, any>)
            
            // Now we need to get first and last observation times per date+bloque+variedad from the original observations
            const bloqueTimeSpans: Record<string, { first: Date | null, last: Date | null }> = {}
            
            observations.forEach((obs: any) => {
                const obsDateTime = new Date(obs.creado_en)
                const fecha = obsDateTime.toISOString().split('T')[0] // YYYY-MM-DD
                const finca = obs.cama?.grupo_cama?.bloque?.finca?.nombre || ''
                const bloque = obs.cama?.grupo_cama?.bloque?.nombre || ''
                const variedad = obs.cama?.grupo_cama?.variedad?.nombre || 'Sin variedad'
                const bloqueKey = `${fecha}|${finca}|${bloque}|${variedad}`
                
                if (!bloqueTimeSpans[bloqueKey]) {
                    bloqueTimeSpans[bloqueKey] = { first: null, last: null }
                }
                
                if (!bloqueTimeSpans[bloqueKey].first || obsDateTime < bloqueTimeSpans[bloqueKey].first!) {
                    bloqueTimeSpans[bloqueKey].first = obsDateTime
                }
                if (!bloqueTimeSpans[bloqueKey].last || obsDateTime > bloqueTimeSpans[bloqueKey].last!) {
                    bloqueTimeSpans[bloqueKey].last = obsDateTime
                }
            })
            
            // Calculate aggregated metrics and add observation columns
            const bloqueResult = Object.values(groupedByBloque).map((bloque: any) => {
                const bloqueKeyForArea = `${bloque.Finca}|${bloque.Bloque}`
                const bloqueKeyForTime = `${bloque.Fecha}|${bloque.Finca}|${bloque.Bloque}|${bloque.Variedad}`
                const areaObservada = bloque.totalAreaObservada
                const areaProductiva = camaCountsByBloque[bloqueKeyForArea]?.areaProductiva || 0
                const porcentaje = areaProductiva > 0 ? (areaObservada / areaProductiva) * 100 : 0
                
                // Calculate obs/m based on total area
                const obsPerMetro = areaObservada > 0 ? bloque.Observaciones / areaObservada : 0
                
                // Calculate time span for this date+bloque+variedad
                let tiempoTotal = '—'
                let tiempoPorMetro = '—'
                const timeSpan = bloqueTimeSpans[bloqueKeyForTime]
                if (timeSpan?.first && timeSpan?.last) {
                    const diffMs = timeSpan.last.getTime() - timeSpan.first.getTime()
                    const tiempoMinutos = diffMs / (1000 * 60) // minutes
                    tiempoTotal = `${tiempoMinutos.toFixed(2)} min`
                    
                    // Calculate tiempo per metro
                    if (areaObservada > 0) {
                        const tiempoPerM = tiempoMinutos / areaObservada
                        tiempoPorMetro = `${tiempoPerM.toFixed(2)} min`
                    }
                }
                
                const result: Record<string, any> = {
                    'Fecha': bloque.Fecha,
                    'Finca': bloque.Finca,
                    'Bloque': bloque.Bloque,
                    'Variedad': bloque.Variedad,
                    'Área Observada (m²)': areaObservada,
                    '% del Bloque': porcentaje,
                    'Usuario': bloque.Usuario,
                    'Observaciones': bloque.Observaciones,
                    'Obs/m²': obsPerMetro,
                    'Tiempo Total': tiempoTotal,
                    'Tiempo/m²': tiempoPorMetro
                }
                
                // Add observation type columns
                Object.entries(bloque.observaciones).forEach(([tipo, cantidad]) => {
                    result[tipo] = cantidad
                })
                
                return result
            })
            
            console.log('🏢 Grouped by bloque:', bloqueResult.length, 'rows')
            
            // Sort by fecha, finca, bloque, then variedad
            return bloqueResult.sort((a, b) => {
                // First sort by date (most recent first)
                if (a.Fecha !== b.Fecha) return b.Fecha.localeCompare(a.Fecha)
                
                // Then by finca
                if (a.Finca !== b.Finca) return a.Finca.localeCompare(b.Finca)
                
                // Then by bloque
                const bloqueA = parseInt(a.Bloque)
                const bloqueB = parseInt(b.Bloque)
                if (!isNaN(bloqueA) && !isNaN(bloqueB)) {
                    if (bloqueA !== bloqueB) return bloqueA - bloqueB
                } else if (a.Bloque !== b.Bloque) {
                    return a.Bloque.localeCompare(b.Bloque)
                }
                
                // Finally by variedad
                return a.Variedad.localeCompare(b.Variedad)
            })
        }

        // Sort by fecha, finca, bloque, then cama nombre (for cama view)
        return result.sort((a, b) => {
            // First sort by date (most recent first)
            if (a.Fecha !== b.Fecha) return b.Fecha.localeCompare(a.Fecha)
            
            // Sort by finca name (alphabetically)
            if (a.Finca !== b.Finca) return a.Finca.localeCompare(b.Finca)
            
            // Sort by bloque name (numerically if possible, otherwise alphabetically)
            if (a.Bloque !== b.Bloque) {
                const bloqueA = parseInt(a.Bloque)
                const bloqueB = parseInt(b.Bloque)
                if (!isNaN(bloqueA) && !isNaN(bloqueB)) {
                    return bloqueA - bloqueB
                }
                return a.Bloque.localeCompare(b.Bloque)
            }
            
            // Sort by cama name (numerically if possible, otherwise alphabetically)
            const camaA = parseInt(a.Cama)
            const camaB = parseInt(b.Cama)
            if (!isNaN(camaA) && !isNaN(camaB)) {
                return camaA - camaB
            }
            return a.Cama.localeCompare(b.Cama)
        })
    }, [observations, viewMode, camaCountsByBloque])

    return (
        <>
            <header className="flex items-center justify-between border-b px-4 py-2">
                <div className="flex items-center gap-4">
                    <SidebarTrigger />
                    <h1 className="text-lg font-semibold">Observaciones</h1>
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadExcel}
                        className="gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Excel
                    </Button>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Por Cama</span>
                        <Switch
                            checked={viewMode === 'bloque'}
                            onCheckedChange={(checked) => setViewMode(checked ? 'bloque' : 'cama')}
                        />
                        <span className="text-sm font-medium">Por Bloque</span>
                    </div>
                </div>
            </header>
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                {error ? (
                    <div className="text-red-500 p-4 border border-red-300 rounded-lg bg-red-50">
                        <p className="font-semibold">Error:</p>
                        <p>{error}</p>
                    </div>
                ) : isLoading ? (
                    <p className="text-center py-8 text-muted-foreground">Cargando...</p>
                ) : (
                    <div className="flex-1 min-h-0">
                        <ObservationTable 
                            data={filteredData}
                            initialDateRange={date}
                            onDateRangeChange={(range) => setDate(range)}
                            onLoadMore={loadMoreObservations}
                            hasMoreData={hasMoreData}
                            isLoadingMore={isLoadingMore}
                            totalObservations={totalObservations}
                            loadedObservations={observations.length}
                        />
                    </div>
                )}
            </div>
        </>
    )
}
