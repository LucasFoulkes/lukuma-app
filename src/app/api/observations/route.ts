import { NextRequest, NextResponse } from 'next/server'
import { getObservationsByDateRange } from '@/services/db'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const from = searchParams.get('from')
        const to = searchParams.get('to')

        if (!from || !to) {
            return NextResponse.json(
                { error: 'Missing from or to date parameters' },
                { status: 400 }
            )
        }

        const fromDate = new Date(from)
        const toDate = new Date(to)

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            return NextResponse.json(
                { error: 'Invalid date format' },
                { status: 400 }
            )
        }

        const observations = await getObservationsByDateRange(fromDate, toDate)

        return NextResponse.json(observations)
    } catch (error) {
        console.error('Error fetching observations:', error)
        return NextResponse.json(
            { error: 'Failed to fetch observations' },
            { status: 500 }
        )
    }
}
