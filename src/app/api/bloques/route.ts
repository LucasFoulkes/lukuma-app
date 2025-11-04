import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
    try {
        const { data: bloques, error } = await supabase
            .from('bloque')
            .select(`
                nombre,
                finca:id_finca(nombre)
            `)
            .order('nombre')

        if (error) throw error

        const result = bloques?.map((b: any) => ({
            finca: b.finca?.nombre || '',
            bloque: b.nombre
        })) || []

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error fetching bloques:', error)
        return NextResponse.json({ error: 'Failed to fetch bloques' }, { status: 500 })
    }
}
