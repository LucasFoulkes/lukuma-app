# Export Fix Needed

The export function is using WRONG database schema fields:
- Using: `fecha_observacion`, `tallos_buenos`, `tallos_secos`, etc.
- Actual: `creado_en`, `tipo_observacion`, `cantidad`

The `filteredData` useMemo uses the CORRECT schema. Need to copy that exact logic into downloadExcel.

The database structure is:
- observacion.creado_en (timestamp)
- observacion.id_cama (FK)  
- observacion.tipo_observacion (string like "Tallos Buenos")
- observacion.cantidad (number)
- observacion.usuario (relation)
- observacion.cama.grupo_cama.bloque.finca (nested relations)
- observacion.cama.grupo_cama.variedad (nested relation)
