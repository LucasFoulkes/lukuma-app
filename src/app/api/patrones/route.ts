import { NextResponse } from 'next/server'
import { getTable } from '@/services/db'

export async function GET() {
    try {
        const patrones = await getTable('patron')
        console.log('API: Fetched patrones raw:', patrones)
        return NextResponse.json(patrones)
    } catch (error) {
        console.error('Error fetching patrones:', error)
        return NextResponse.json({ error: 'Failed to fetch patrones' }, { status: 500 })
    }
}
