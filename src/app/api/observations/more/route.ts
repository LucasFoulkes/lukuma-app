import { NextRequest, NextResponse } from 'next/server'
import { getAllObservations } from '@/services/db'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const offset = parseInt(searchParams.get('offset') || '0')
        const limit = parseInt(searchParams.get('limit') || '1000')

        const result = await getAllObservations(limit, offset)

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error fetching more observations:', error)
        return NextResponse.json(
            { error: 'Failed to fetch observations' },
            { status: 500 }
        )
    }
}
