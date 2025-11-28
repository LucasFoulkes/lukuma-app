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

export async function getTableDataOrdered(
    tableName: string,
    orderByColumn: string,
    limit?: number,
    ascending: boolean = false,
    offset?: number
) {
    const supabase = getClient()

    let query = supabase
        .from(tableName)
        .select('*')
        .order(orderByColumn, { ascending })

    if (offset !== undefined && limit) {
        query = query.range(offset, offset + limit - 1)
    } else if (limit) {
        query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching observaciones:', error)
        throw error
    }

    return data || []
}

/**
 * Update rows in a table matching a filter condition
 * @param tableName - Table to update
 * @param filterColumn - Column to filter by
 * @param filterValues - Values to match (uses 'in' for arrays)
 * @param updates - Object with column:value pairs to update
 */
export async function updateRows(
    tableName: string,
    filterColumn: string,
    filterValues: string | number | (string | number)[],
    updates: Record<string, any>
) {
    const supabase = getClient()

    let query = supabase.from(tableName).update(updates)

    if (Array.isArray(filterValues)) {
        query = query.in(filterColumn, filterValues)
    } else {
        query = query.eq(filterColumn, filterValues)
    }

    const { data, error } = await query.select()

    if (error) {
        console.error(`Error updating ${tableName}:`, error)
        throw error
    }

    return data || []
}
