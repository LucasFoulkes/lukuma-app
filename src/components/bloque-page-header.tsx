"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Combobox } from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { getTable, getRowsByColumn } from "@/services/db"
import { Edit, Plus, Minus } from "lucide-react"

interface BloquePageHeaderProps {
    currentFincaId: number
    currentBloqueId: number
    currentFincaName: string
    currentBloqueName: string
    camas?: any[]
    onDialogOpenChange?: (open: boolean) => void
}

export function BloquePageHeader({ 
    currentFincaId, 
    currentBloqueId,
    currentFincaName,
    currentBloqueName,
    camas = [],
    onDialogOpenChange
}: BloquePageHeaderProps) {
    const router = useRouter()
    const [fincas, setFincas] = useState<any[]>([])
    const [bloques, setBloques] = useState<any[]>([])
    const [selectedFinca, setSelectedFinca] = useState(currentFincaId.toString())
    const [selectedBloque, setSelectedBloque] = useState(currentBloqueId.toString())
    const [camaCount, setCamaCount] = useState(camas.length)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [variedades, setVariedades] = useState<any[]>([])
    const [selectedVariedad, setSelectedVariedad] = useState<string>('')

    // Fetch variedades
    useEffect(() => {
        async function loadVariedades() {
            const response = await fetch('/api/variedades')
            const data = await response.json()
            setVariedades(data)
        }
        loadVariedades()
    }, [])

    // Notify parent when dialog state changes
    useEffect(() => {
        onDialogOpenChange?.(showEditDialog)
    }, [showEditDialog, onDialogOpenChange])

    // Calculate average cama length
    const avgLength = camas.length > 0 
        ? camas.reduce((sum, cama) => sum + (cama.largo_metros || 0), 0) / camas.length 
        : 0

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const diff = camaCount - camas.length

            if (diff > 0) {
                // Adding camas
                const maxCamaNumber = camas.reduce((max, cama) => {
                    const num = parseInt(cama.nombre)
                    return isNaN(num) ? max : Math.max(max, num)
                }, 0)

                const response = await fetch('/api/camas/bulk-create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bloqueId: currentBloqueId,
                        variedadId: selectedVariedad ? parseInt(selectedVariedad) : null,
                        startNumber: maxCamaNumber + 1,
                        count: diff,
                        avgLength: avgLength || 50 // Default to 50m if no camas exist
                    })
                })

                if (!response.ok) throw new Error('Failed to create camas')
                
                console.log('Created', diff, 'camas')
            } else if (diff < 0) {
                // Deleting camas - delete the last ones by number
                const sortedCamas = [...camas]
                    .filter(c => !isNaN(parseInt(c.nombre)))
                    .sort((a, b) => parseInt(b.nombre) - parseInt(a.nombre))
                
                const camasToDelete = sortedCamas.slice(0, Math.abs(diff))
                const camaIds = camasToDelete.map(c => c.id_cama)

                const response = await fetch('/api/camas/bulk-delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ camaIds })
                })

                if (!response.ok) throw new Error('Failed to delete camas')
                
                console.log('Deleted', camaIds.length, 'camas')
            }

            // Refresh the page to show changes
            window.location.reload()
        } catch (error) {
            console.error('Error saving cama changes:', error)
            alert('Error al guardar cambios')
        } finally {
            setIsSaving(false)
        }
    }

    useEffect(() => {
        async function loadFincas() {
            const allFincas = await getTable('finca')
            const activeFincas = allFincas.filter((f: any) => f.eliminado_en === null)
            setFincas(activeFincas)
        }
        loadFincas()
    }, [])

    useEffect(() => {
        async function loadBloques() {
            const allBloques = await getRowsByColumn('bloque', 'id_finca', parseInt(selectedFinca))
            const activeBloques = allBloques.filter((b: any) => b.eliminado_en === null)
            setBloques(activeBloques)
        }
        if (selectedFinca) {
            loadBloques()
        }
    }, [selectedFinca])

    const handleFincaChange = (fincaId: string) => {
        setSelectedFinca(fincaId)
        // When finca changes, we'll wait for bloques to load
        // The user will then need to select a bloque
    }

    const handleBloqueChange = (bloqueId: string) => {
        setSelectedBloque(bloqueId)
        router.push(`/mapa/bloque/${bloqueId}`)
    }

    const fincaOptions = fincas.map((f) => ({
        value: f.id_finca.toString(),
        label: f.nombre
    }))

    const bloqueOptions = bloques.map((b) => ({
        value: b.id_bloque.toString(),
        label: b.nombre || `Bloque ${b.id_bloque}`
    }))

    return (
        <header className="flex items-center gap-4 border-b px-4 py-2">
            <SidebarTrigger />
            <div className="flex items-center gap-2 text-sm">
                <a href="/mapa" className="text-muted-foreground hover:text-foreground">
                    Mapa
                </a>
                <span className="text-muted-foreground">/</span>
                <Combobox
                    value={selectedFinca}
                    onValueChange={handleFincaChange}
                    options={fincaOptions}
                    placeholder="Select finca..."
                    searchPlaceholder="Search finca..."
                    emptyText="No finca found."
                    className="w-[200px]"
                />
                <span className="text-muted-foreground">/</span>
                <Combobox
                    value={selectedBloque}
                    onValueChange={handleBloqueChange}
                    options={bloqueOptions}
                    placeholder="Select bloque..."
                    searchPlaceholder="Search bloque..."
                    emptyText="No bloque found."
                    className="w-[200px]"
                />
            </div>
            <div className="flex-1" />
            <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowEditDialog(true)}
            >
                <Edit className="h-4 w-4 mr-2" />
                Editar Camas
            </Button>
            
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar Camas</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        {/* Current count display */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Cantidad de Camas</label>
                            <div className="flex items-center gap-4">
                                <Button 
                                    variant="outline" 
                                    size="icon"
                                    onClick={() => setCamaCount(Math.max(0, camaCount - 1))}
                                >
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <div className="flex-1 text-center">
                                    <span className="text-2xl font-bold">{camaCount}</span>
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="icon"
                                    onClick={() => setCamaCount(camaCount + 1)}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Variedad selector - only shown when adding camas */}
                        {camaCount > camas.length && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Variedad para nuevas camas (opcional)</label>
                                <Select value={selectedVariedad} onValueChange={setSelectedVariedad}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sin asignar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {variedades.map((v) => (
                                            <SelectItem key={v.id_variedad} value={v.id_variedad.toString()}>
                                                {v.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Si no se selecciona, se usará "Sin Asignar"
                                </p>
                            </div>
                        )}

                        {/* Average length info */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Largo Promedio</label>
                            <div className="text-center p-3 bg-muted rounded-lg">
                                <span className="text-xl font-semibold">{avgLength.toFixed(1)} m</span>
                            </div>
                        </div>

                        {/* Change summary */}
                        {camaCount !== camas.length && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-900">
                                    {camaCount > camas.length 
                                        ? `Se agregarán ${camaCount - camas.length} cama(s)`
                                        : `Se eliminarán ${camas.length - camaCount} cama(s)`
                                    }
                                </p>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button 
                                variant="outline" 
                                onClick={() => {
                                    setCamaCount(camas.length)
                                    setShowEditDialog(false)
                                }}
                                disabled={isSaving}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                disabled={camaCount === camas.length || isSaving}
                                onClick={handleSave}
                            >
                                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </header>
    )
}
