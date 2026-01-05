import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton client
let client: SupabaseClient | null = null
function getClient(): SupabaseClient {
    return client ??= createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

type QueryOptions = {
    select?: string
    orderBy?: string
    ascending?: boolean
    limit?: number
    offset?: number
    where?: Record<string, unknown>
}

/** Fetch rows with optional filtering, ordering, pagination */
export async function query<T = Record<string, unknown>>(
    table: string,
    { select = '*', orderBy, ascending = false, limit, offset, where }: QueryOptions = {}
): Promise<T[]> {
    let q = getClient().from(table).select(select)

    if (where) for (const [col, val] of Object.entries(where)) {
        if (val === undefined) continue
        if (col.endsWith('_gte')) q = q.gte(col.replace('_gte', ''), val as any)
        else if (col.endsWith('_lte')) q = q.lte(col.replace('_lte', ''), val as any)
        else if (col.endsWith('_cs')) q = q.contains(col.replace('_cs', ''), val as any)
        else if (col.endsWith('_in')) q = q.in(col.replace('_in', ''), val as any)
        else q = q.eq(col, val as any)
    }
    if (orderBy) q = q.order(orderBy, { ascending })
    if (offset !== undefined && limit) q = q.range(offset, offset + limit - 1)
    else if (limit) q = q.limit(limit)

    const { data, error } = await q
    if (error) throw error
    return (data || []) as T[]
}

/** Fetch all rows (auto-pagination) */
export async function queryAll<T = Record<string, unknown>>(
    table: string,
    options: Omit<QueryOptions, 'limit' | 'offset'> = {}
): Promise<T[]> {
    const pageSize = 1000
    let offset = 0
    const all: T[] = []

    while (true) {
        const page = await query<T>(table, { ...options, limit: pageSize, offset })
        all.push(...page)
        if (page.length < pageSize) break
        offset += pageSize
    }
    return all
}

/** Fetch multiple tables in parallel */
export async function queryTables(
    tables: (string | { table: string; select?: string })[]
): Promise<Record<string, unknown[]>> {
    const results = await Promise.all(
        tables.map(async t => {
            const { table, select } = typeof t === 'string' ? { table: t, select: undefined } : t
            return [table, await queryAll(table, { select })] as const
        })
    )
    return Object.fromEntries(results)
}

/** Update rows matching filter */
export async function update<T = Record<string, unknown>>(
    table: string,
    where: { column: string; values: (string | number)[] },
    updates: Partial<T>
): Promise<T[]> {
    const { data, error } = await getClient()
        .from(table)
        .update(updates)
        .in(where.column, where.values)
        .select()
    if (error) throw error
    return (data || []) as T[]
}

/** Insert rows */
export async function insert<T = Record<string, unknown>>(
    table: string,
    rows: Partial<T> | Partial<T>[]
): Promise<T[]> {
    const { data, error } = await getClient()
        .from(table)
        .insert(rows)
        .select()
    if (error) throw error
    return (data || []) as T[]
}

/** Delete rows matching filter */
export async function remove(
    table: string,
    where: { column: string; values: (string | number)[] }
): Promise<void> {
    const { error } = await getClient()
        .from(table)
        .delete()
        .in(where.column, where.values)
    if (error) throw error
}

export { getClient }
