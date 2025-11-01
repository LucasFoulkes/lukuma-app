import { NextResponse } from 'next/server'
import { getTable } from '@/services/db'

export async function GET() {
    try {
        const estados = await getTable('grupo_cama_estado')
        return NextResponse.json(estados)
    } catch (error) {
        console.error('Error fetching estados:', error)
        return NextResponse.json({ error: 'Failed to fetch estados' }, { status: 500 })
    }
}
