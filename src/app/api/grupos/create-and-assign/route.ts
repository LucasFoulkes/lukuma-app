import { NextResponse } from 'next/server'
import { insertRow, getRowsByColumns, updateRowsByIds } from '@/services/db'

export async function POST(request: Request) {
    try {
        const { bloqueId, camaNames, grupoData } = await request.json()

        console.log('Received request:', { bloqueId, camaNames, grupoData })

        if (!bloqueId || !camaNames || !Array.isArray(camaNames) || !grupoData) {
            return NextResponse.json(
                { error: 'Missing required fields: bloqueId, camaNames (array), grupoData' },
                { status: 400 }
            )
        }

        // Validate required grupo fields
        if (!grupoData.id_variedad) {
            return NextResponse.json(
                { error: 'id_variedad is required in grupoData' },
                { status: 400 }
            )
        }

        if (!grupoData.estado) {
            return NextResponse.json(
                { error: 'estado is required in grupoData' },
                { status: 400 }
            )
        }

        // Create new grupo with only essential fields to avoid unique constraint conflicts
        const targetGrupo = await insertRow('grupo_cama', {
            id_bloque: bloqueId,
            id_variedad: grupoData.id_variedad,
            estado: grupoData.estado
        })

        console.log('Created new grupo:', targetGrupo.id_grupo)

        // Find all cama IDs by their names within this bloque
        // First, get all grupos in this bloque
        const gruposInBloque = await getRowsByColumns('grupo_cama', { id_bloque: bloqueId })
        const grupoIdsInBloque = gruposInBloque.map((g: any) => g.id_grupo)

        console.log('Grupos in bloque:', grupoIdsInBloque)

        // Now find camas that belong to those grupos AND match the names
        const camaIds: number[] = []
        for (const nombre of camaNames) {
            const allCamasWithName = await getRowsByColumns('cama', { nombre })
            console.log(`Found ${allCamasWithName.length} camas with name ${nombre}`)

            // Filter to only camas in this bloque
            const camasInBloque = allCamasWithName.filter((c: any) =>
                grupoIdsInBloque.includes(c.id_grupo)
            )

            if (camasInBloque.length > 0) {
                camaIds.push(camasInBloque[0].id_cama)
                console.log(`Using cama ${camasInBloque[0].id_cama} from grupo ${camasInBloque[0].id_grupo}`)
            }
        }

        if (camaIds.length === 0) {
            return NextResponse.json(
                { error: 'No camas found with provided names in this bloque' },
                { status: 404 }
            )
        }

        // Assign camas to the new grupo
        const grupoId = targetGrupo.id_grupo || targetGrupo.id
        console.log('Assigning', camaIds.length, 'camas to grupo ID:', grupoId)

        const updatedCamas = await updateRowsByIds('cama', camaIds, { id_grupo: grupoId }, 'id_cama')

        return NextResponse.json({
            success: true,
            grupo: targetGrupo,
            updatedCount: updatedCamas.length,
            camas: updatedCamas
        })

    } catch (error) {
        console.error('Error creating grupo and assigning camas:', error)
        console.error('Error type:', typeof error)
        console.error('Error constructor:', error?.constructor?.name)

        let errorMessage = 'Unknown error'
        let errorDetails = null

        if (error instanceof Error) {
            errorMessage = error.message
            errorDetails = error.stack
        } else if (error && typeof error === 'object') {
            errorMessage = JSON.stringify(error)
            errorDetails = error
        } else {
            errorMessage = String(error)
        }

        console.error('Parsed error message:', errorMessage)
        console.error('Parsed error details:', errorDetails)

        return NextResponse.json(
            {
                error: 'Failed to create grupo and assign camas',
                details: errorMessage,
                fullError: errorDetails
            },
            { status: 500 }
        )
    }
}
