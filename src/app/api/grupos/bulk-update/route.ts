import { NextResponse } from 'next/server'
import { updateRowsByIds } from '@/services/db'

export async function POST(request: Request) {
    try {
        const { grupoIds, updates } = await request.json()

        if (!grupoIds || !Array.isArray(grupoIds) || grupoIds.length === 0 || !updates) {
            return NextResponse.json(
                { error: 'Missing required fields: grupoIds (array), updates' },
                { status: 400 }
            )
        }

        console.log('Bulk updating grupos:', { grupoIds, updates })

        // Filter out undefined/null values from updates
        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, value]) => value !== undefined)
        )

        // Update all grupos
        const updatedGrupos = await updateRowsByIds(
            'grupo_cama',
            grupoIds,
            cleanUpdates,
            'id_grupo'
        )

        console.log('Updated', updatedGrupos.length, 'grupos')

        return NextResponse.json({
            success: true,
            updatedCount: updatedGrupos.length,
            grupos: updatedGrupos
        })

    } catch (error) {
        console.error('Error bulk updating grupos:', error)
        return NextResponse.json(
            { error: 'Failed to bulk update grupos' },
            { status: 500 }
        )
    }
}
