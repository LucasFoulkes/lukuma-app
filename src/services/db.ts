import { supabase } from '@/lib/supabase'

export async function getTable(tableName: string) {
    const { data, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })

    if (error) {
        console.error(`Error fetching ${tableName}:`, error)
        throw error
    }

    return data || []
}

export async function getRowsByColumn(tableName: string, columnName: string, value: any) {
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq(columnName, value)
        .range(0, 9999)

    if (error) {
        console.error(`Error fetching ${tableName} where ${columnName}=${value}:`, error)
        throw error
    }

    return data || []
}

export async function getRowById(tableName: string, idColumn: string, id: any) {
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq(idColumn, id)
        .single()

    if (error) {
        console.error(`Error fetching ${tableName} with ${idColumn}=${id}:`, error)
        throw error
    }

    return data
}

// Generic function to find rows by multiple column conditions
export async function getRowsByColumns(tableName: string, conditions: Record<string, any>) {
    let query = supabase.from(tableName).select('*')
    
    // Apply each condition
    Object.entries(conditions).forEach(([column, value]) => {
        query = query.eq(column, value)
    })

    const { data, error } = await query.range(0, 9999)

    if (error) {
        console.error(`Error fetching ${tableName} with conditions:`, conditions, error)
        throw error
    }

    return data || []
}

// Generic function to insert a row and return it with ID
export async function insertRow(tableName: string, rowData: any) {
    const { data, error } = await supabase
        .from(tableName)
        .insert(rowData)
        .select()
        .single()

    if (error) {
        console.error(`Error inserting into ${tableName}:`, error)
        throw error
    }

    return data
}

// Generic function to query with nested relationships
export async function getTableWithRelations(
    tableName: string, 
    selectString: string,
    filters?: Record<string, any>
) {
    let query = supabase
        .from(tableName)
        .select(selectString)
        .range(0, 99999)
    
    // Apply filters if provided
    if (filters) {
        Object.entries(filters).forEach(([column, value]) => {
            if (value === null) {
                query = query.is(column, null)
            } else {
                query = query.eq(column, value)
            }
        })
    }

    const { data, error } = await query

    if (error) {
        console.error(`Error fetching ${tableName} with relations:`, error)
        throw error
    }

    return data || []
}


// Generic function to update a single row by ID
export async function updateRowById(tableName: string, id: any, updates: any) {
    const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error(`Error updating ${tableName} id=${id}:`, error)
        throw error
    }

    return data
}

// Generic function to bulk update multiple rows by their IDs
export async function updateRowsByIds(tableName: string, ids: any[], updates: any, idColumn: string = 'id') {
    console.log('DB: updateRowsByIds called')
    console.log('  - tableName:', tableName)
    console.log('  - ids:', ids)
    console.log('  - updates:', updates)
    console.log('  - idColumn:', idColumn)
    
    const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .in(idColumn, ids)
        .select()

    console.log('DB: Supabase response received')
    console.log('  - data:', data)
    console.log('  - error:', error)

    if (error) {
        console.error(`DB ERROR: bulk updating ${tableName} ${idColumn}s=${ids}`)
        console.error('Full error object:', JSON.stringify(error, null, 2))
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        console.error('Error details:', error.details)
        console.error('Error hint:', error.hint)
        throw error
    }

    console.log('DB: Update successful, returning data')
    return data || []
}

export async function getCamaCountByBloque() {
    // Use RPC to execute a custom SQL query for accurate counting
    const { data, error } = await supabase.rpc('get_cama_count_by_bloque')

    if (error) {
        // If RPC doesn't exist, fall back to using generic method with nested relations
        console.log('RPC not available, using fallback method with nested relations')
        
        // Get bloques with nested relationships using generic method
        const bloques = await getTableWithRelations(
            'bloque',
            `
                id_bloque,
                nombre,
                finca:id_finca!inner (
                    nombre
                ),
                grupo_cama!inner (
                    id_grupo,
                    estado,
                    cama (
                        id_cama,
                        largo_metros,
                        ancho_metros
                    )
                )
            `,
            { eliminado_en: null }
        )

        // Transform data to count camas and calculate area per bloque
        const result: Record<string, { finca: string, bloque: string, count: number, area: number, areaProductiva: number }> = {}
        
        if (bloques) {
            bloques.forEach((bloque: any) => {
                const fincaNombre = bloque.finca?.nombre || ''
                const bloqueNombre = bloque.nombre || ''
                const key = `${fincaNombre}|${bloqueNombre}`
                
                // Count camas and calculate total area across all grupos in this bloque
                let totalCamas = 0
                let totalArea = 0
                let areaProductiva = 0
                if (bloque.grupo_cama && Array.isArray(bloque.grupo_cama)) {
                    bloque.grupo_cama.forEach((grupo: any) => {
                        const esProductivo = grupo.estado === 'Productivo'
                        if (grupo.cama && Array.isArray(grupo.cama)) {
                            grupo.cama.forEach((cama: any) => {
                                totalCamas++
                                // Calculate area for each cama (largo * ancho)
                                const largo = parseFloat(cama.largo_metros) || 0
                                const ancho = parseFloat(cama.ancho_metros) || 0
                                const areaCama = largo * ancho
                                totalArea += areaCama
                                // Only add to productive area if grupo is Productivo
                                if (esProductivo) {
                                    areaProductiva += areaCama
                                }
                            })
                        }
                    })
                }
                
                result[key] = {
                    finca: fincaNombre,
                    bloque: bloqueNombre,
                    count: totalCamas,
                    area: totalArea,
                    areaProductiva: areaProductiva
                }
            })
        }

        return result
    }

    // Transform RPC result
    const result: Record<string, { finca: string, bloque: string, count: number, area: number, areaProductiva: number }> = {}
    if (data) {
        data.forEach((row: any) => {
            const key = `${row.finca}|${row.bloque}`
            result[key] = {
                finca: row.finca,
                bloque: row.bloque,
                count: row.total_camas || 0,
                area: row.total_area || 0,
                areaProductiva: row.area_productiva || 0
            }
        })
    }

    return result
}

// Get the most recent observation date
export async function getLastObservationDate() {
    const { data, error } = await supabase
        .from('observacion')
        .select('creado_en')
        .order('creado_en', { ascending: false })
        .limit(1)
        .single()

    if (error) {
        console.error('Error fetching last observation date:', error)
        // Return today as fallback
        return new Date()
    }

    return data?.creado_en ? new Date(data.creado_en) : new Date()
}

export async function getObservationsByDateRange(fromDate: Date, toDate: Date) {
    // Format dates as ISO strings for Supabase
    const fromISO = new Date(fromDate.setHours(0, 0, 0, 0)).toISOString()
    const toISO = new Date(toDate.setHours(23, 59, 59, 999)).toISOString()

    const { data, error } = await supabase
        .from('observacion')
        .select(`
            *,
            cama:id_cama (
                nombre,
                largo_metros,
                ancho_metros,
                grupo_cama:id_grupo (
                    bloque:id_bloque (
                        nombre,
                        finca:id_finca (
                            nombre
                        )
                    ),
                    variedad:id_variedad (
                        nombre
                    )
                )
            ),
            usuario:id_usuario (
                nombres,
                apellidos
            )
        `)
        .gte('creado_en', fromISO)
        .lte('creado_en', toISO)
        .order('creado_en', { ascending: false })

    if (error) {
        console.error(`Error fetching observations from ${fromISO} to ${toISO}:`, error)
        throw error
    }

    return data || []
}

// Get all observations without date filtering
export async function getAllObservations(limit: number = 1000, offset: number = 0) {
    // Fetch observations with pagination support
    const { data, error, count } = await supabase
        .from('observacion')
        .select(`
            *,
            cama:id_cama (
                nombre,
                largo_metros,
                ancho_metros,
                grupo_cama:id_grupo (
                    bloque:id_bloque (
                        nombre,
                        finca:id_finca (
                            nombre
                        )
                    ),
                    variedad:id_variedad (
                        nombre
                    )
                )
            ),
            usuario:id_usuario (
                nombres,
                apellidos
            )
        `, { count: 'exact' })
        .order('creado_en', { ascending: false })
        .range(offset, offset + limit - 1)

    if (error) {
        console.error('Error fetching observations:', error)
        throw error
    }

    console.log(`✅ Fetched ${data?.length || 0} observations (${offset}-${offset + (data?.length || 0)}, total: ${count})`)
    return { data: data || [], total: count || 0 }
}