import { Metadata, Bed } from '@/lib/context/metadata-context'

// --- Types ---
export type EstadoFenologico = {
    id_bloque: number
    id_variedad: number
    dias_brotacion: number | null
    dias_cincuenta_mm: number | null
    dias_quince_cm: number | null
    dias_veinte_cm: number | null
    dias_primera_hoja: number | null
    dias_espiga: number | null
    dias_arroz: number | null
    dias_arveja: number | null
    dias_garbanzo: number | null
    dias_uva: number | null
    dias_rayando_color: number | null
    dias_sepalos_abiertos: number | null
    dias_cosecha: number | null
}

export type SourceInfo = {
    type: 'observacion' | 'pinche'
    id: number
    fecha: string
    cama: string
    originalStage: string   // stage when observed/pinched
    currentStage?: string   // stage at projected date
    cantidad: number
}

export type TimelineRow = {
    key: string
    fecha: string
    fechaDate: Date
    isPast: boolean
    tipos: Record<string, number>  // projected quantities at each stage
    cosechaDisponible: number      // available for harvest (accumulated - produccion)
    sources: SourceInfo[]          // original observations/pinches that contribute to this row
}

export type PrediccionRow = {
    key: string
    fecha: string
    fechaDate: Date
    finca: string
    bloque: string
    variedad: string
    id_bloque: number
    id_variedad: number
    tipos: Record<string, number>  // projected quantities at each stage for this date
    cosechaDisponible: number      // stems available for harvest
    _timeline: TimelineRow[]       // full timeline for dialog
}

// --- Constants ---
export const OBS_COLUMNS = ['arroz', 'arveja', 'garbanzo', 'rayando_color', 'sepalos_abiertos'] as const

// Full stage order with ALL stages from estado_fenologico table
export const FULL_STAGE_ORDER = [
    'brotacion',
    'cincuenta_mm',
    'quince_cm',
    'veinte_cm',
    'primera_hoja',
    'espiga',
    'arroz',
    'arveja',
    'garbanzo',
    'uva',
    'rayando_color',
    'sepalos_abiertos',
    'cosecha'
] as const

// --- Helper: Get days remaining from a stage to cosecha ---
export function getDaysToHarvest(
    fromStage: string,
    estado: EstadoFenologico
): number {
    const stageIndex = FULL_STAGE_ORDER.indexOf(fromStage as any)
    if (stageIndex === -1) return 0

    let days = 0
    for (let i = stageIndex; i < FULL_STAGE_ORDER.length; i++) {
        const stage = FULL_STAGE_ORDER[i]
        const diasKey = `dias_${stage}` as keyof EstadoFenologico
        days += (estado[diasKey] as number) || 0
    }
    return days
}

// --- Helper: Get all camas for a bloque+variedad ---
export function getCamasForBloqueVariedad(
    metadata: Metadata,
    id_bloque: number,
    id_variedad: number
): Map<number, Bed> {
    const result = new Map<number, Bed>()
    metadata.beds.forEach((bed, id) => {
        if (bed.id_bloque === id_bloque && bed.id_variedad === id_variedad) {
            result.set(id, bed)
        }
    })
    return result
}

// --- Main projection logic ---
export function processProjections(
    observaciones: any[],
    pinches: any[],
    estadosFenologicos: EstadoFenologico[],
    producciones: any[],
    metadata: Metadata
): PrediccionRow[] {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Build estado fenologico lookup: id_bloque-id_variedad -> EstadoFenologico
    const estadoMap = new Map<string, EstadoFenologico>()
    estadosFenologicos.forEach(e => {
        estadoMap.set(`${e.id_bloque}-${e.id_variedad}`, e)
    })

    // Build produccion lookup: id_bloque-id_variedad-fecha -> cantidad
    const produccionMap = new Map<string, number>()
    producciones.forEach(p => {
        const fecha = new Date(p.created_at).toISOString().split('T')[0]
        const key = `${p.bloque}-${p.variedad}-${fecha}`
        produccionMap.set(key, (produccionMap.get(key) || 0) + (p.cantidad || 0))
    })

    // Group observations by bloque+variedad, then project each observation forward
    type Cohort = {
        observationDate: Date
        stage: string
        cantidad: number
        source: SourceInfo
    }

    const bloqueVariedadData = new Map<string, {
        id_bloque: number
        id_variedad: number
        finca: string
        bloque: string
        variedad: string
        cohorts: Cohort[]
    }>()

    // Collect all observations as cohorts
    observaciones.forEach(obs => {
        const bed = metadata.beds.get(obs.id_cama)
        if (!bed) return

        // Normalize tipo_observacion (trim, lowercase) and check if valid
        const tipoObs = (obs.tipo_observacion || '').toString().trim().toLowerCase()
        if (!tipoObs || !OBS_COLUMNS.includes(tipoObs as any)) return

        const key = `${bed.id_bloque}-${bed.id_variedad}`
        let entry = bloqueVariedadData.get(key)
        if (!entry) {
            entry = {
                id_bloque: bed.id_bloque,
                id_variedad: bed.id_variedad,
                finca: bed.finca,
                bloque: bed.bloque,
                variedad: bed.variedad,
                cohorts: []
            }
            bloqueVariedadData.set(key, entry)
        }

        entry.cohorts.push({
            observationDate: new Date(obs.creado_en),
            stage: tipoObs,
            cantidad: obs.cantidad || 0,
            source: {
                type: 'observacion',
                id: obs.id,
                fecha: obs.creado_en,
                cantidad: obs.cantidad || 0,
                cama: bed.cama,
                originalStage: tipoObs
            }
        })
    })

    // Collect pinches as cohorts starting at 'brotacion' (first stage)
    pinches.forEach(pinche => {
        // Pinche has bloque and variedad directly, or cama
        let id_bloque = pinche.bloque
        let id_variedad = pinche.variedad
        let finca = ''
        let bloque = ''
        let variedad = ''

        // If pinche has cama, get bloque/variedad from bed
        if (pinche.cama) {
            const bed = metadata.beds.get(pinche.cama)
            if (bed) {
                id_bloque = bed.id_bloque
                id_variedad = bed.id_variedad
                finca = bed.finca
                bloque = bed.bloque
                variedad = bed.variedad
            }
        } else {
            // Get names from metadata
            const bloqueInfo = metadata.bloques.get(id_bloque)
            finca = bloqueInfo?.finca || ''
            bloque = bloqueInfo?.nombre || ''
            variedad = metadata.variedades.get(id_variedad) || ''
        }

        if (!id_bloque || !id_variedad) return

        const key = `${id_bloque}-${id_variedad}`
        let entry = bloqueVariedadData.get(key)
        if (!entry) {
            entry = {
                id_bloque,
                id_variedad,
                finca,
                bloque,
                variedad,
                cohorts: []
            }
            bloqueVariedadData.set(key, entry)
        }

        entry.cohorts.push({
            observationDate: new Date(pinche.created_at),
            stage: 'brotacion',  // Pinches start at the first stage
            cantidad: pinche.cantidad || 0,
            source: {
                type: 'pinche',
                id: pinche.id,
                fecha: pinche.created_at,
                cantidad: pinche.cantidad || 0,
                cama: pinche.cama || '',
                originalStage: 'brotacion'
            }
        })
    })

    // For each bloque+variedad, generate timeline and find max future date
    const results: PrediccionRow[] = []

    // Default estado fenologico if none exists for a bloque+variedad
    const defaultEstado: EstadoFenologico = {
        id_bloque: 0,
        id_variedad: 0,
        dias_brotacion: 14,
        dias_cincuenta_mm: 7,
        dias_quince_cm: 7,
        dias_veinte_cm: 7,
        dias_primera_hoja: 7,
        dias_espiga: 7,
        dias_arroz: 7,
        dias_arveja: 5,
        dias_garbanzo: 4,
        dias_uva: 3,
        dias_rayando_color: 3,
        dias_sepalos_abiertos: 2,
        dias_cosecha: 1
    }

    bloqueVariedadData.forEach((data, key) => {
        const estado = estadoMap.get(key) || defaultEstado

        // Calculate max days to project (sum of all stage durations)
        const maxDays = FULL_STAGE_ORDER.reduce((sum, stage) => {
            const diasKey = `dias_${stage}` as keyof EstadoFenologico
            return sum + ((estado[diasKey] as number) || 0)
        }, 0)

        // Build timeline: for each day from today to today+maxDays
        const timeline: TimelineRow[] = []

        for (let dayOffset = 0; dayOffset <= maxDays; dayOffset++) {
            const targetDate = new Date(today)
            targetDate.setDate(today.getDate() + dayOffset)

            const dateStr = targetDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
            const dateKey = targetDate.toISOString().split('T')[0]

            // For this date, calculate what's at each stage
            const tipos: Record<string, number> = {}
            let atCosecha = 0
            const sources: SourceInfo[] = []

            data.cohorts.forEach(cohort => {
                // How many days since this cohort was observed?
                const daysSinceObs = Math.floor((targetDate.getTime() - cohort.observationDate.getTime()) / (1000 * 60 * 60 * 24))
                if (daysSinceObs < 0) return  // Observation is in the future, skip

                // What stage is this cohort at now?
                // When observed/pinched, the plant is AT that stage (day 0 of that stage)
                // dias_X tells us how many days it will REMAIN in stage X
                const startStageIndex = FULL_STAGE_ORDER.indexOf(cohort.stage as any)
                if (startStageIndex === -1) return

                let daysRemaining = daysSinceObs
                let currentStage = cohort.stage

                // Keep cycling through stages until we've used up all days
                let stageIndex = startStageIndex
                while (daysRemaining >= 0) {
                    const stage = FULL_STAGE_ORDER[stageIndex]
                    const diasKey = `dias_${stage}` as keyof EstadoFenologico
                    // Use default duration if the value is null/0
                    const defaultDurations: Record<string, number> = {
                        brotacion: 14, cincuenta_mm: 7, quince_cm: 7, veinte_cm: 7, primera_hoja: 7,
                        espiga: 7, arroz: 7, arveja: 5, garbanzo: 4, uva: 3, rayando_color: 3,
                        sepalos_abiertos: 2, cosecha: 1
                    }
                    const stageDuration = (estado[diasKey] as number) || defaultDurations[stage] || 3

                    if (daysRemaining < stageDuration) {
                        // Cohort is still in this stage
                        currentStage = stage
                        break
                    }
                    daysRemaining -= stageDuration

                    // Move to next stage (cycle back to first after last)
                    stageIndex = (stageIndex + 1) % FULL_STAGE_ORDER.length
                    currentStage = FULL_STAGE_ORDER[stageIndex]
                }

                if (currentStage === 'cosecha') {
                    atCosecha += cohort.cantidad
                    sources.push({ ...cohort.source, currentStage: 'cosecha' })
                } else if (OBS_COLUMNS.includes(currentStage as any)) {
                    tipos[currentStage] = (tipos[currentStage] || 0) + cohort.cantidad
                    sources.push({ ...cohort.source, currentStage })
                }
                // Note: 'brotacion' is not in OBS_COLUMNS so it won't show in tipos (that's correct - it's before arroz)
            })

            // Subtract produccion from cosecha available
            const produccionKey = `${data.id_bloque}-${data.id_variedad}-${dateKey}`
            const producido = produccionMap.get(produccionKey) || 0
            const cosechaDisponible = Math.max(0, atCosecha - producido)

            timeline.push({
                key: `${key}-${dateKey}`,
                fecha: dateStr,
                fechaDate: targetDate,
                isPast: targetDate < today,
                tipos,
                cosechaDisponible,
                sources
            })
        }

        // Create a row for each future date that has activity
        timeline.forEach(tl => {
            const hasActivity = Object.values(tl.tipos).some(v => v > 0) || tl.cosechaDisponible > 0
            if (!hasActivity) return

            results.push({
                key: `${key}-${tl.fechaDate.toISOString().split('T')[0]}`,
                fecha: tl.fecha,
                fechaDate: tl.fechaDate,
                finca: data.finca,
                bloque: data.bloque,
                variedad: data.variedad,
                id_bloque: data.id_bloque,
                id_variedad: data.id_variedad,
                tipos: tl.tipos,
                cosechaDisponible: tl.cosechaDisponible,
                _timeline: timeline
            })
        })
    })

    // Sort by date, then finca, bloque, variedad
    return results.sort((a, b) =>
        a.fechaDate.getTime() - b.fechaDate.getTime() ||
        a.finca.localeCompare(b.finca) ||
        a.bloque.localeCompare(b.bloque) ||
        a.variedad.localeCompare(b.variedad)
    )
}
