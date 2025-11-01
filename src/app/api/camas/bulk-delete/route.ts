import { NextResponse } from 'next/server'
import { updateRowsByIds } from '@/services/db'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { camaIds } = body

        console.log('Soft deleting camas:', camaIds)

        // Soft delete by setting eliminado_en timestamp
        await updateRowsByIds(
            'cama',
            camaIds,
            { eliminado_en: new Date().toISOString() },
            'id_cama'
        )

        console.log('Soft deleted', camaIds.length, 'camas')

        return NextResponse.json({ 
            success: true, 
            deleted: camaIds.length
        })
    } catch (error) {
        console.error('Error deleting camas:', error)
        return NextResponse.json(
            { error: 'Failed to delete camas' },
            { status: 500 }
        )
    }
}
