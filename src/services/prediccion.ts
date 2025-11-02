import { supabase } from '@/lib/supabase'

// Final output interface
export interface HarvestPrediction {
    fecha: string
    finca: string
    bloque: string
    variedad: string
    dias_cosecha: number // Bed-days at 100% capacity
}

// Parse "count (pct%)" format from resumen_fenologico
function parseCosechaString(cosechaStr: string): { count: number, pct: number } | null {
    if (!cosechaStr) return null
    
    const match = cosechaStr.match(/^(\d+(?:\.\d+)?)\s*\((\d+(?:\.\d+)?)%?\)/)
    if (!match) return null
    
    return {
        count: parseFloat(match[1]),
        pct: parseFloat(match[2])
    }
}

// Scale timeline rows to 100% capacity
function scaleTimelineToTotals(timelineRows: any[]): any[] {
    return timelineRows.map(row => {
        const cosechaData = parseCosechaString(row.cosecha || '')
        
        if (cosechaData && cosechaData.pct > 0) {
            // Scale to 100%: count × (100 / pct)
            const scaledBeds = cosechaData.count * (100 / cosechaData.pct)
            
            return {
                ...row,
                dias_cosecha: Math.round(scaledBeds)
            }
        }
        
        return {
            ...row,
            dias_cosecha: 0
        }
    })
}

// Keep only last day of each harvest window per FBV
function keepOnlyLastCosechaDay(rows: any[]): any[] {
    // Group by FBV
    const byFBV: Record<string, any[]> = {}
    
    rows.forEach(row => {
        const key = `${row.finca}||${row.bloque}||${row.variedad}`
        if (!byFBV[key]) byFBV[key] = []
        byFBV[key].push(row)
    })
    
    const result: any[] = []
    
    Object.values(byFBV).forEach(fbvRows => {
        // Sort by date
        fbvRows.sort((a, b) => a.fecha.localeCompare(b.fecha))
        
        let windowStart: number | null = null
        
        for (let i = 0; i < fbvRows.length; i++) {
            const row = fbvRows[i]
            const hasHarvest = row.dias_cosecha > 0
            const nextRow = fbvRows[i + 1]
            const isLast = !nextRow || nextRow.dias_cosecha === 0
            
            if (hasHarvest) {
                if (windowStart === null) windowStart = i
                
                // Keep if it's the last day of the window
                if (isLast) {
                    result.push(row)
                    windowStart = null
                }
            }
        }
    })
    
    return result
}

// Sum by fecha + FBV
function sumCosechaByFechaVariedad(rows: any[]): HarvestPrediction[] {
    const grouped: Record<string, HarvestPrediction> = {}
    
    rows.forEach(row => {
        const key = `${row.fecha}||${row.finca}||${row.bloque}||${row.variedad}`
        
        if (!grouped[key]) {
            grouped[key] = {
                fecha: row.fecha,
                finca: row.finca,
                bloque: row.bloque,
                variedad: row.variedad,
                dias_cosecha: 0
            }
        }
        
        grouped[key].dias_cosecha += row.dias_cosecha || 0
    })
    
    return Object.values(grouped)
        .filter(p => p.dias_cosecha > 0)
        .sort((a, b) => b.fecha.localeCompare(a.fecha)) // DESC
}

// Main function: Generate harvest predictions from resumen_fenologico table
export async function generateHarvestPredictions(): Promise<HarvestPrediction[]> {
    try {
        // First, try to fetch from cosecha table directly (might already be computed)
        console.log('📥 Trying to fetch from cosecha table...')
        
        const { data: cosechaData, error: cosechaError } = await supabase
            .from('cosecha')
            .select('*')
            .order('fecha', { ascending: false })
        
        if (!cosechaError && cosechaData && cosechaData.length > 0) {
            console.log(`✅ Found ${cosechaData.length} predictions in cosecha table`)
            return cosechaData as HarvestPrediction[]
        }
        
        console.log('⚠️ cosecha table not available, trying resumen_fenologico...')
        
        // Step 1: Fetch resumen_fenologico table (FIFO timeline already computed)
        const { data, error } = await supabase
            .from('resumen_fenologico')
            .select('*')
            .order('fecha', { ascending: true })
        
        if (error) {
            console.error('Error fetching resumen_fenologico:', error)
            console.error('Error details:', JSON.stringify(error, null, 2))
            console.error('Error message:', error.message)
            console.error('Error code:', error.code)
            throw error
        }
        
        if (!data || data.length === 0) {
            console.warn('⚠️ No data in resumen_fenologico table')
            return []
        }
        
        console.log(`✅ Fetched ${data.length} rows from resumen_fenologico`)
        console.log('Sample row:', data[0])
        
        // Step 2: Scale cosecha column to 100%
        const scaled = scaleTimelineToTotals(data)
        
        // Step 3: Keep only last day of harvest windows
        const lastDays = keepOnlyLastCosechaDay(scaled)
        
        console.log(`📊 Kept ${lastDays.length} peak harvest days`)
        
        // Step 4: Sum by fecha + FBV
        const predictions = sumCosechaByFechaVariedad(lastDays)
        
        console.log(`🎯 Generated ${predictions.length} harvest predictions`)
        
        return predictions
    } catch (error) {
        console.error('Error generating harvest predictions:', error)
        if (error instanceof Error) {
            console.error('Error stack:', error.stack)
        }
        throw error
    }
}
