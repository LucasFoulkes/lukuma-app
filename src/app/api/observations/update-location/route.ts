import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { isEditingAll, editingCama, selectedBloqueInfo, newFinca, newBloque } = body

        // Get the IDs for the new location
        const { data: fincaData } = await supabase
            .from('finca')
            .select('id')
            .eq('nombre', newFinca)
            .single()

        if (!fincaData) {
            return NextResponse.json({ error: 'Finca not found' }, { status: 404 })
        }

        const { data: bloqueData } = await supabase
            .from('bloque')
            .select('id')
            .eq('nombre', newBloque)
            .eq('id_finca', fincaData.id)
            .single()

        if (!bloqueData) {
            return NextResponse.json({ error: 'Bloque not found' }, { status: 404 })
        }

        // Get the old location IDs
        const { data: oldFincaData } = await supabase
            .from('finca')
            .select('id')
            .eq('nombre', selectedBloqueInfo.finca)
            .single()

        const { data: oldBloqueData } = await supabase
            .from('bloque')
            .select('id')
            .eq('nombre', selectedBloqueInfo.bloque)
            .eq('id_finca', oldFincaData?.id)
            .single()

        if (!oldFincaData || !oldBloqueData) {
            return NextResponse.json({ error: 'Old location not found' }, { status: 404 })
        }

        if (isEditingAll) {
            // Update all camas in the bloque to point to new bloque
            const { data: gruposToUpdate } = await supabase
                .from('grupo_cama')
                .select('id')
                .eq('id_bloque', oldBloqueData.id)

            if (gruposToUpdate && gruposToUpdate.length > 0) {
                const { error: updateError } = await supabase
                    .from('grupo_cama')
                    .update({ id_bloque: bloqueData.id })
                    .in('id', gruposToUpdate.map(g => g.id))

                if (updateError) throw updateError
            }
        } else {
            // Update specific cama observations
            const { data: camaData } = await supabase
                .from('cama')
                .select('id, id_grupo')
                .eq('nombre', editingCama.camaName)
                .single()

            if (!camaData) {
                return NextResponse.json({ error: 'Cama not found' }, { status: 404 })
            }

            // Update the grupo_cama to point to new bloque
            const { error: updateError } = await supabase
                .from('grupo_cama')
                .update({ id_bloque: bloqueData.id })
                .eq('id', camaData.id_grupo)

            if (updateError) throw updateError
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating location:', error)
        return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }
}
