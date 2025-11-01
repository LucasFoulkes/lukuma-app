import { NextResponse } from 'next/server'
import { getRowsByColumns, updateRowsByIds } from '@/services/db'

export async function POST(request: Request) {
    console.log('=== API /camas/update CALLED ===')
    try {
        const body = await request.json()
        console.log('Request body received:', JSON.stringify(body, null, 2))
        
        const { bloqueId, camaNames, updates } = body

        console.log('Extracted values:', { bloqueId, camaNames, updates })

        if (!bloqueId || !camaNames || !Array.isArray(camaNames) || !updates) {
            console.log('Missing required fields!')
            return NextResponse.json(
                { error: 'Missing required fields: bloqueId, camaNames (array), updates' },
                { status: 400 }
            )
        }

        // First, get all grupos for this bloque to filter camas correctly
        console.log('Fetching grupos for bloque:', bloqueId)
        const grupos = await getRowsByColumns('grupo_cama', { id_bloque: bloqueId })
        const grupoIds = grupos.map((g: any) => g.id_grupo)
        console.log('Found', grupoIds.length, 'grupos in this bloque:', grupoIds)

        // Find all cama IDs by their names, filtering by bloque
        console.log('Starting to find camas...')
        const camaIds: number[] = []
        
        for (const nombre of camaNames) {
            console.log(`Looking for cama with nombre: ${nombre}`)
            const allCamasWithName = await getRowsByColumns('cama', { nombre })
            console.log(`Found ${allCamasWithName.length} cama(s) with nombre ${nombre} (across all bloques)`)
            
            // Filter to only camas that belong to grupos in THIS bloque
            const camasInBloque = allCamasWithName.filter((c: any) => grupoIds.includes(c.id_grupo))
            console.log(`  ${camasInBloque.length} of them belong to this bloque`)
            
            if (camasInBloque.length > 0) {
                const cama = camasInBloque[0]
                camaIds.push(cama.id_cama)
                console.log(`  Added cama ID: ${cama.id_cama}, belongs to grupo: ${cama.id_grupo}`)
            } else {
                console.log(`  WARNING: No cama named ${nombre} found in this bloque`)
            }
        }

        console.log('All cama IDs found:', camaIds)

        if (camaIds.length === 0) {
            console.log('ERROR: No camas found with provided names!')
            return NextResponse.json(
                { error: 'No camas found with provided names' },
                { status: 404 }
            )
        }

        // Bulk update all camas
        console.log('STEP 4: About to call updateRowsByIds')
        console.log('  - Table: cama')
        console.log('  - IDs:', camaIds)
        console.log('  - Updates:', updates)
        
        // cama table's primary key is id_cama, not id
        const updatedCamas = await updateRowsByIds('cama', camaIds, updates, 'id_cama')
        
        console.log('STEP 5: updateRowsByIds completed successfully')
        console.log('Updated camas result:', updatedCamas)

        console.log('STEP 6: Sending success response')
        return NextResponse.json({
            success: true,
            updatedCount: updatedCamas.length,
            camas: updatedCamas
        })

    } catch (error) {
        console.log('!!! CAUGHT ERROR IN API ROUTE !!!')
        console.error('Error updating camas (detailed):', error)
        console.error('Error type:', typeof error)
        console.error('Error constructor:', error?.constructor?.name)
        
        if (error && typeof error === 'object') {
            console.error('Error keys:', Object.keys(error))
            console.error('Error as JSON:', JSON.stringify(error, null, 2))
        }
        
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
        
        // Extract useful error info
        let errorMessage = 'Unknown error'
        let errorDetails = {}
        
        if (error instanceof Error) {
            errorMessage = error.message
        } else if (error && typeof error === 'object') {
            errorMessage = (error as any).message || JSON.stringify(error)
            errorDetails = error
        } else {
            errorMessage = String(error)
        }
        
        return NextResponse.json(
            { 
                error: 'Failed to update camas', 
                message: errorMessage,
                details: errorDetails
            },
            { status: 500 }
        )
    }
}
