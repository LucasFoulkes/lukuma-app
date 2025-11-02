"use client"

import * as React from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ObservationTable } from "@/components/observation-table"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Download } from "lucide-react"
import { type DateRange } from "react-day-picker"
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
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
    const [tableFilters, setTableFilters] = React.useState<Record<string, string>>({})
    const [isExporting, setIsExporting] = React.useState(false)

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

        // Define type for grouped cama data
        type GroupedCama = {
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
        }

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
        }, {} as Record<string, GroupedCama>)

        // Convert to array and flatten the observaciones into columns
        const result = (Object.values(groupedByCama) as GroupedCama[]).map((cama) => {
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

    // Columns available for export (derived from filteredData)
    const allColumns = React.useMemo(() => {
        const cols = new Set<string>()
        filteredData.forEach((row: Record<string, any>) => {
            Object.keys(row).forEach(k => cols.add(k))
        })
        return Array.from(cols)
    }, [filteredData])

    const [exportOpen, setExportOpen] = React.useState(false)
    const [selectedExportColumns, setSelectedExportColumns] = React.useState<string[]>([])

    // Initialize selected columns when available
    React.useEffect(() => {
        setSelectedExportColumns(allColumns.slice())
    }, [allColumns])

    const toggleColumn = (col: string) => {
        setSelectedExportColumns(prev =>
            prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
        )
    }

    const downloadExcel = async (columnsToExport?: string[]) => {
        console.log('🚀 Starting export...')
        setIsExporting(true)
        try {
            const cols = columnsToExport && columnsToExport.length > 0 ? columnsToExport : selectedExportColumns
            console.log('📋 Columns to export:', cols)
            
            if (cols.length === 0) {
                alert('Por favor, selecciona al menos una columna para exportar')
                setIsExporting(false)
                return
            }
            
            // First, ensure we have ALL observations loaded
            console.log('📥 Fetching all observations from database...')
            let allObservations: any[] = [...observations]
            let offset = observations.length
            const limit = 1000
            
            // Fetch remaining data if we don't have it all
            while (allObservations.length < totalObservations) {
                console.log(`Fetching batch at offset ${offset}...`)
                const response = await fetch(`/api/observations/more?offset=${offset}&limit=${limit}`)
                if (!response.ok) {
                    throw new Error('Failed to fetch observations for export')
                }
                const result = await response.json()
                if (result.data.length === 0) break
                allObservations = [...allObservations, ...result.data]
                offset += result.data.length
            }
            
            console.log(`📊 Total observations: ${allObservations.length}`)
            
            // Now process all observations the same way as filteredData
            // This will create the grouped/aggregated view just like what's shown in the table
            let processedData: any[] = []
            
            if (viewMode === 'cama') {
                const groupedByCama: Record<string, any> = {}
                
                allObservations.forEach((obs: any) => {
                    const obsDate = new Date(obs.fecha_observacion)
                    
                    // Apply date filter if set
                    if (date?.from && date?.to) {
                        const fromDate = new Date(date.from)
                        const toDate = new Date(date.to)
                        fromDate.setHours(0, 0, 0, 0)
                        toDate.setHours(23, 59, 59, 999)
                        if (obsDate < fromDate || obsDate > toDate) return
                    }
                    
                    const dateKey = format(obsDate, 'yyyy-MM-dd')
                    const camaId = obs.cama?.id_cama
                    if (!camaId) return
                    
                    const key = `${camaId}|${dateKey}`
                    
                    if (!groupedByCama[key]) {
                        groupedByCama[key] = {
                            id_cama: camaId,
                            fecha: dateKey,
                            cama_nombre: obs.cama?.nombre_cama || '',
                            Finca: obs.cama?.grupo_cama?.bloque?.finca?.nombre || '',
                            Bloque: obs.cama?.grupo_cama?.bloque?.nombre || '',
                            Variedad: obs.cama?.grupo_cama?.variedad?.nombre || '',
                            Usuario: obs.usuario?.nombre || '',
                            area: obs.cama?.area || 0,
                            tallos_total: 0,
                            tallos_buenos: 0,
                            tallos_secos: 0,
                            tallos_parciales: 0,
                            tallos_viudas: 0,
                            tallos_malos: 0,
                            abortos: 0,
                            boton_floral: 0,
                            florescencia: 0
                        }
                    }
                    
                    groupedByCama[key].tallos_total += (obs.tallos_buenos || 0) + (obs.tallos_secos || 0) + (obs.tallos_parciales || 0) + (obs.tallos_viudas || 0) + (obs.tallos_malos || 0)
                    groupedByCama[key].tallos_buenos += obs.tallos_buenos || 0
                    groupedByCama[key].tallos_secos += obs.tallos_secos || 0
                    groupedByCama[key].tallos_parciales += obs.tallos_parciales || 0
                    groupedByCama[key].tallos_viudas += obs.tallos_viudas || 0
                    groupedByCama[key].tallos_malos += obs.tallos_malos || 0
                    groupedByCama[key].abortos += obs.abortos || 0
                    groupedByCama[key].boton_floral += obs.boton_floral || 0
                    groupedByCama[key].florescencia += obs.florescencia || 0
                })
                
                processedData = Object.values(groupedByCama).map((cama: any) => {
                    const area = cama.area
                    return {
                        Fecha: cama.fecha,
                        Finca: cama.Finca,
                        Bloque: cama.Bloque,
                        Cama: cama.cama_nombre,
                        Variedad: cama.Variedad,
                        Usuario: cama.Usuario,
                        'Tallos Total': cama.tallos_total,
                        'Tallos Buenos': cama.tallos_buenos,
                        'Tallos Secos': cama.tallos_secos,
                        'Tallos Parciales': cama.tallos_parciales,
                        'Tallos Viudas': cama.tallos_viudas,
                        'Tallos Malos': cama.tallos_malos,
                        'Abortos': cama.abortos,
                        'Boton Floral': cama.boton_floral,
                        'Florescencia': cama.florescencia,
                        'Obs/m': area > 0 ? Number((cama.tallos_total / area).toFixed(2)) : 0
                    }
                })
            } else {
                const groupedByBloque: Record<string, any> = {}
                const bloqueTimeSpans: Record<string, { first: Date | null, last: Date | null }> = {}
                
                allObservations.forEach((obs: any) => {
                    const obsDateTime = new Date(obs.fecha_observacion)
                    
                    // Apply date filter if set
                    if (date?.from && date?.to) {
                        const fromDate = new Date(date.from)
                        const toDate = new Date(date.to)
                        fromDate.setHours(0, 0, 0, 0)
                        toDate.setHours(23, 59, 59, 999)
                        if (obsDateTime < fromDate || obsDateTime > toDate) return
                    }
                    
                    const fecha = format(obsDateTime, 'yyyy-MM-dd')
                    const finca = obs.cama?.grupo_cama?.bloque?.finca?.nombre || ''
                    const bloque = obs.cama?.grupo_cama?.bloque?.nombre || ''
                    const variedad = obs.cama?.grupo_cama?.variedad?.nombre || ''
                    const usuario = obs.usuario?.nombre || ''
                    const area = obs.cama?.area || 0
                    
                    const key = `${fecha}|${finca}|${bloque}|${variedad}`
                    
                    if (!groupedByBloque[key]) {
                        groupedByBloque[key] = {
                            Fecha: fecha,
                            Finca: finca,
                            Bloque: bloque,
                            Variedad: variedad,
                            Usuario: usuario,
                            totalAreaObservada: 0,
                            tallos_total: 0,
                            tallos_buenos: 0,
                            tallos_secos: 0,
                            tallos_parciales: 0,
                            tallos_viudas: 0,
                            tallos_malos: 0,
                            abortos: 0,
                            boton_floral: 0,
                            florescencia: 0
                        }
                    }
                    
                    groupedByBloque[key].totalAreaObservada += area
                    groupedByBloque[key].tallos_total += (obs.tallos_buenos || 0) + (obs.tallos_secos || 0) + (obs.tallos_parciales || 0) + (obs.tallos_viudas || 0) + (obs.tallos_malos || 0)
                    groupedByBloque[key].tallos_buenos += obs.tallos_buenos || 0
                    groupedByBloque[key].tallos_secos += obs.tallos_secos || 0
                    groupedByBloque[key].tallos_parciales += obs.tallos_parciales || 0
                    groupedByBloque[key].tallos_viudas += obs.tallos_viudas || 0
                    groupedByBloque[key].tallos_malos += obs.tallos_malos || 0
                    groupedByBloque[key].abortos += obs.abortos || 0
                    groupedByBloque[key].boton_floral += obs.boton_floral || 0
                    groupedByBloque[key].florescencia += obs.florescencia || 0
                    
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
                
                processedData = Object.values(groupedByBloque).map((bloque: any) => {
                    const bloqueKeyForArea = `${bloque.Finca}|${bloque.Bloque}`
                    const bloqueKeyForTime = `${bloque.Fecha}|${bloque.Finca}|${bloque.Bloque}|${bloque.Variedad}`
                    const areaObservada = bloque.totalAreaObservada
                    const areaProductiva = camaCountsByBloque[bloqueKeyForArea]?.areaProductiva || 0
                    const porcentaje = areaProductiva > 0 ? (areaObservada / areaProductiva) * 100 : 0
                    
                    const timeSpan = bloqueTimeSpans[bloqueKeyForTime]
                    const horaInicio = timeSpan?.first ? format(timeSpan.first, 'HH:mm', { locale: es }) : ''
                    const horaFin = timeSpan?.last ? format(timeSpan.last, 'HH:mm', { locale: es }) : ''
                    const horaRange = horaInicio && horaFin ? `${horaInicio}-${horaFin}` : ''
                    
                    return {
                        Fecha: bloque.Fecha,
                        Hora: horaRange,
                        Finca: bloque.Finca,
                        Bloque: bloque.Bloque,
                        Variedad: bloque.Variedad,
                        Usuario: bloque.Usuario,
                        'Tallos Total': bloque.tallos_total,
                        'Tallos Buenos': bloque.tallos_buenos,
                        'Tallos Secos': bloque.tallos_secos,
                        'Tallos Parciales': bloque.tallos_parciales,
                        'Tallos Viudas': bloque.tallos_viudas,
                        'Tallos Malos': bloque.tallos_malos,
                        'Abortos': bloque.abortos,
                        'Boton Floral': bloque.boton_floral,
                        'Florescencia': bloque.florescencia,
                        'Obs/m': areaObservada > 0 ? Number((bloque.tallos_total / areaObservada).toFixed(2)) : 0,
                        '%': Number(porcentaje.toFixed(1))
                    }
                })
            }
            
            // Apply table filters (Finca, Bloque, Variedad, Usuario)
            Object.entries(tableFilters).forEach(([column, value]) => {
                if (value) {
                    processedData = processedData.filter((row: any) => 
                        String(row[column]) === String(value)
                    )
                }
            })
            
            console.log(`📊 Processed data: ${processedData.length} rows`)
            
            if (processedData.length === 0) {
                alert('No hay datos para exportar con los filtros aplicados')
                setIsExporting(false)
                return
            }
            
            // Create workbook with selected columns
            console.log('📝 Creating Excel workbook...')
            const wb = XLSX.utils.book_new()
            const rows = processedData.map((row: Record<string, any>) => {
                const out: Record<string, any> = {}
                cols.forEach(col => {
                    out[col] = row[col]
                })
                return out
            })
            
            console.log(`📝 Mapped ${rows.length} rows with ${cols.length} columns`)

            const ws = XLSX.utils.json_to_sheet(rows)
            XLSX.utils.book_append_sheet(wb, ws, 'Observaciones')

            const dateStr = new Date().toISOString().split('T')[0]
            const filename = `observaciones_${viewMode}_${dateStr}.xlsx`
            console.log(`💾 Writing file: ${filename}`)
            XLSX.writeFile(wb, filename)
            console.log('✅ Export complete!')
            setExportOpen(false)
        } catch (err) {
            console.error('❌ Error exporting:', err)
            alert(`Error al exportar datos: ${err instanceof Error ? err.message : 'Error desconocido'}`)
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <>
            <header className="flex items-center justify-between border-b px-4 py-2">
                <div className="flex items-center gap-4">
                    <SidebarTrigger />
                    <h1 className="text-lg font-semibold">Observaciones</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Por Cama</span>
                        <Switch
                            checked={viewMode === 'bloque'}
                            onCheckedChange={(checked) => setViewMode(checked ? 'bloque' : 'cama')}
                        />
                        <span className="text-sm font-medium">Por Bloque</span>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => setExportOpen(true)}
                        className="gap-2 border-green-600 text-green-600 hover:bg-green-50"
                        variant="outline"
                    >
                        <Download className="h-4 w-4" />
                        Excel
                    </Button>
                </div>
            </header>
            {/* Export dialog */}
            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Exportar a Excel</DialogTitle>
                        <DialogDescription>Selecciona las columnas que quieres incluir en el archivo Excel.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2 max-h-60 overflow-auto py-2">
                        <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => setSelectedExportColumns(allColumns.slice())}>Seleccionar todo</Button>
                            <Button size="sm" variant="outline" onClick={() => setSelectedExportColumns([])}>Borrar</Button>
                        </div>
                        {allColumns.map((col) => (
                            <div key={col} className="flex items-center gap-2">
                                <Checkbox
                                    id={`col-${col}`}
                                    checked={selectedExportColumns.includes(col)}
                                    onCheckedChange={() => toggleColumn(col)}
                                />
                                <Label htmlFor={`col-${col}`}>{col}</Label>
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setExportOpen(false)} disabled={isExporting}>Cancelar</Button>
                            <Button 
                                onClick={() => downloadExcel(selectedExportColumns)} 
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={isExporting}
                            >
                                {isExporting ? 'Exportando...' : 'Exportar'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
                            onFiltersChange={setTableFilters}
                        />
                    </div>
                )}
            </div>
        </>
    )
}
