import { NextResponse } from 'next/server'
import { insertRow, getRowsByColumns, getTable } from '@/services/db'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { bloqueId, variedadId, columna, startNumber, count, avgLength } = body

        console.log('Creating camas:', { bloqueId, variedadId, columna, startNumber, count, avgLength })

        // If no variedad specified, find or create "Sin Asignar" variedad
        let finalVariedadId = variedadId
        if (!variedadId) {
            const allVariedades = await getTable('variedad')
            let sinAsignarVariedad = allVariedades.find((v: any) => v.nombre === 'Sin Asignar')
            
            if (!sinAsignarVariedad) {
                // Create "Sin Asignar" variedad
                // Need to find or create a breeder first
                const allBreeders = await getTable('breeder')
                let sinAsignarBreeder = allBreeders.find((b: any) => b.nombre === 'Sin Asignar')
                
                if (!sinAsignarBreeder) {
                    sinAsignarBreeder = await insertRow('breeder', { nombre: 'Sin Asignar' })
                }
                
                sinAsignarVariedad = await insertRow('variedad', {
                    nombre: 'Sin Asignar',
                    id_breeder: sinAsignarBreeder.id_breeder,
                    color: 'gris'
                })
            }
            
            finalVariedadId = sinAsignarVariedad.id_variedad
            console.log('Using Sin Asignar variedad:', finalVariedadId)
        }

        // Find or create a grupo for this bloque + variedad with estado 'sin_asignar'
        const existingGrupos = await getRowsByColumns('grupo_cama', { 
            id_bloque: bloqueId,
            id_variedad: finalVariedadId,
            estado: null
        })

        let targetGrupo
        if (existingGrupos.length > 0) {
            targetGrupo = existingGrupos[0]
            console.log('Found existing unassigned grupo:', targetGrupo.id_grupo)
        } else {
            // Create new grupo with this variedad
            targetGrupo = await insertRow('grupo_cama', {
                id_bloque: bloqueId,
                id_variedad: finalVariedadId,
                estado: null,
                patron: null,
                tipo_planta: null,
                fecha_siembra: null
            })
            console.log('Created new unassigned grupo:', targetGrupo.id_grupo)
        }

        const createdCamas = []

        for (let i = 0; i < count; i++) {
            const camaNumber = startNumber + i
            
            // Calculate columna: if specified use it, otherwise use odd/even logic
            let camaColumna = columna
            if (camaColumna === null || camaColumna === undefined) {
                // Auto: odd numbers go to column 1, even to column 2
                camaColumna = camaNumber % 2 === 1 ? 1 : 2
            }
            
            const newCama = await insertRow('cama', {
                nombre: camaNumber.toString(),
                id_grupo: targetGrupo.id_grupo,
                largo_metros: avgLength,
                ancho_metros: null,
                columna: camaColumna,
                plantas_totales: null
            })
            createdCamas.push(newCama)
        }

        console.log('Created', createdCamas.length, 'camas')

        return NextResponse.json({ 
            success: true, 
            created: createdCamas.length,
            camas: createdCamas
        })
    } catch (error) {
        console.error('Error creating camas:', error)
        return NextResponse.json(
            { error: 'Failed to create camas' },
            { status: 500 }
        )
    }
}
