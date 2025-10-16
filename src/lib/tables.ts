// Single source of truth - just table names and columns
export const TABLES = {
    finca: ['nombre'],
    bloque: ['id_finca', 'nombre'],
    grupo_cama: ['id_bloque', 'id_variedad', 'fecha_siembra', 'estado', 'patron', 'tipo_planta'],
    cama: ['id_grupo', 'nombre', 'largo_metros', 'ancho_metros'],
    breeder: ['nombre'],
    variedad: ['id_breeder', 'nombre', 'color'],
    observacion: ['creado_en', 'id_cama', 'id_usuario', 'tipo_observacion', 'cantidad'],
    estado_fenologico: [
        "id_bloque",
        "id_variedad",
        "dias_brotacion",
        "dias_cincuenta_mm",
        "dias_quince_cm",
        "dias_veinte_cm",
        "dias_primera_hoja",
        "dias_espiga",
        "dias_arroz",
        "dias_arveja",
        "dias_garbanzo",
        "dias_uva",
        "dias_rayando_color",
        "dias_sepalos_abiertos",
        "dias_cosecha",
    ],
    punto_gps: ['id', 'latitud', 'longitud', 'precision', 'altitud', 'usuario_id'],
    produccion: ['created_at', 'finca', 'bloque', 'variedad', 'cantidad'],
    pinche: ['id', 'bloque', 'cama', 'variedad', 'cantidad', 'tipo'],
    usuario: ['id_usuario', 'nombres', 'apellidos', 'cedula', 'rol', 'nombre_usuario'],
    rol: ['id', 'nombre'],
    observacion_tipo: ['id', 'nombre'],
    estado_fenologico_orden: ['id', 'orden', 'nombre'],
    patron: ['id', 'nombre'],
    grupo_cama_estado: ['id', 'nombre'],
    grupo_cama_tipo_planta: ['id', 'nombre'],
    pinche_tipo: ['id', 'nombre'],
} as const

// Helper functions
export function getColumnsForTable(tableName: string, allColumns: string[]): string[] {
    const columns = TABLES[tableName as keyof typeof TABLES]
    return columns ? [...columns] : allColumns
}

export function getTableNames(): string[] {
    return Object.keys(TABLES)
}
