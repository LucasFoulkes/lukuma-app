import { NextResponse } from 'next/server'
import { insertRow, getRowsByColumns, updateRowsByIds } from '@/services/db'

export async function POST(request: Request) {
    try {
        const { bloqueId, camaNames, grupoData } = await request.json()

        if (!bloqueId || !camaNames || !Array.isArray(camaNames) || !grupoData) {
            return NextResponse.json(
                { error: 'Missing required fields: bloqueId, camaNames (array), grupoData' },
                { status: 400 }
            )
        }

        // Create new grupo_cama record
        const newGrupo = await insertRow('grupo_cama', {
            id_bloque: bloqueId,
            ...grupoData
        })

        console.log('Created new grupo:', newGrupo)

        // Find all cama IDs by their names and bloque
        const camaIds: number[] = []
        for (const nombre of camaNames) {
            const camas = await getRowsByColumns('cama', { nombre, id_bloque: bloqueId })
            if (camas.length > 0) {
                camaIds.push(camas[0].id)
            }
        }

        if (camaIds.length === 0) {
            return NextResponse.json(
                { error: 'No camas found with provided names' },
                { status: 404 }
            )
        }

        // Assign camas to the new grupo
        const updatedCamas = await updateRowsByIds('cama', camaIds, { id_grupo: newGrupo.id })

        return NextResponse.json({
            success: true,
            grupo: newGrupo,
            updatedCount: updatedCamas.length,
            camas: updatedCamas
        })

    } catch (error) {
        console.error('Error creating grupo and assigning camas:', error)
        return NextResponse.json(
            { error: 'Failed to create grupo and assign camas' },
            { status: 500 }
        )
    }
}
