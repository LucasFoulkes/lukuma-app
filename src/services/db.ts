import { supabase } from '@/lib/supabase'

export async function getTable(tableName: string) {
    const { data, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .range(0, 9999)

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