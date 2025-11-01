import { NextResponse } from 'next/server'
import { getCamaCountByBloque } from '@/services/db'

export async function GET() {
    try {
        const counts = await getCamaCountByBloque()
        return NextResponse.json(counts)
    } catch (error) {
        console.error('Error fetching cama counts:', error)
        return NextResponse.json(
            { error: 'Failed to fetch cama counts' },
            { status: 500 }
        )
    }
}
