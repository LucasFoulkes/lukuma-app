import { NextResponse } from 'next/server'
import { getRowsByColumn, updateRowsByIds } from '@/services/db'

export async function POST(request: Request) {
    try {
        const { grupoId } = await request.json()

        if (!grupoId) {
            return NextResponse.json(
                { error: 'Missing required field: grupoId' },
                { status: 400 }
            )
        }

        console.log('Soft deleting grupo:', grupoId)

        // Soft delete the grupo by setting eliminado_en timestamp
        const now = new Date().toISOString()
        await updateRowsByIds('grupo_cama', [grupoId], { eliminado_en: now }, 'id_grupo')

        // Also set eliminado_en for all camas in this grupo
        const camas = await getRowsByColumn('cama', 'id_grupo', grupoId)
        const camaIds = camas.map((c: any) => c.id_cama)

        if (camaIds.length > 0) {
            await updateRowsByIds('cama', camaIds, { eliminado_en: now }, 'id_cama')
            console.log(`Soft deleted ${camaIds.length} camas`)
        }

        return NextResponse.json({
            success: true,
            deletedGrupo: grupoId,
            deletedCamas: camaIds.length
        })

    } catch (error) {
        console.error('Error deleting grupo:', error)
        return NextResponse.json(
            { error: 'Failed to delete grupo' },
            { status: 500 }
        )
    }
}
