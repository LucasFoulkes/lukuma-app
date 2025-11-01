import { NextResponse } from 'next/server'
import { getTable } from '@/services/db'

export async function GET() {
    try {
        const tiposPlantas = await getTable('grupo_cama_tipo_planta')
        console.log('API: Fetched tipos plantas raw:', tiposPlantas)
        return NextResponse.json(tiposPlantas)
    } catch (error) {
        console.error('Error fetching tipos plantas:', error)
        return NextResponse.json({ error: 'Failed to fetch tipos plantas' }, { status: 500 })
    }
}
