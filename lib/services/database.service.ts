import { createBrowserClient } from '@supabase/ssr'

function getClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

export async function getTableData(tableName: string, limit?: number) {
    const supabase = getClient()

    if (limit) {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(limit)

        if (error) {
            console.error(`Error fetching data from ${tableName}:`, error)
            throw error
        }

        return data || []
    }

    // Fetch all data by pagination
    let allData: any[] = []
    let from = 0
    const pageSize = 1000

    while (true) {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .range(from, from + pageSize - 1)

        if (error) {
            console.error(`Error fetching data from ${tableName}:`, error)
            throw error
        }

        if (!data || data.length === 0) break

        allData = [...allData, ...data]

        if (data.length < pageSize) break

        from += pageSize
    }

    return allData
}

export async function getMultipleTables(...tableNames: string[]) {
    const supabase = getClient()

    const results = await Promise.all(
        tableNames.map(async (tableName) => {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')

            if (error) {
                console.error(`Error fetching data from ${tableName}:`, error)
                throw error
            }

            return data || []
        })
    )

    return results
}

export async function getByForeignKey(tableName: string, fkColumn: string, fkValue: any) {
    const supabase = getClient()

    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq(fkColumn, fkValue)

    if (error) {
        console.error(`Error fetching data from ${tableName} where ${fkColumn}=${fkValue}:`, error)
        throw error
    }

    return data || []
}

export async function getRecentObservaciones(limit: number = 1000) {
    const supabase = getClient()

    const { data, error } = await supabase
        .from('observacion')
        .select('*')
        .order('creado_en', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching observaciones:', error)
        throw error
    }

    return data || []
}
