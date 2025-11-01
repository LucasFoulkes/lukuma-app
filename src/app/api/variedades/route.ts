import { NextResponse } from 'next/server'
import { getTable } from '@/services/db'

export async function GET() {
    try {
        const variedades = await getTable('variedad')
        console.log('API: Fetched variedades raw:', variedades)
        return NextResponse.json(variedades)
    } catch (error) {
        console.error('Error fetching variedades:', error)
        return NextResponse.json({ error: 'Failed to fetch variedades' }, { status: 500 })
    }
}
