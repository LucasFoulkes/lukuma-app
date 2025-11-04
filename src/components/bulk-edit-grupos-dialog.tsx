"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Edit2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface BulkEditGruposDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    grupos: any[]
}

export function BulkEditGruposDialog({ open, onOpenChange, grupos }: BulkEditGruposDialogProps) {
    const [variedades, setVariedades] = useState<any[]>([])
    const [estados, setEstados] = useState<{ id: number; codigo: string }[]>([])
    const [tiposPlantas, setTiposPlantas] = useState<any[]>([])
    const [patrones, setPatrones] = useState<any[]>([])
    const [isSaving, setIsSaving] = useState(false)

    // Field enable toggles
    const [enableVariedad, setEnableVariedad] = useState(false)
    const [enableEstado, setEnableEstado] = useState(false)
    const [enableTipoPlanta, setEnableTipoPlanta] = useState(false)
    const [enablePatron, setEnablePatron] = useState(false)
    const [enableFechaSiembra, setEnableFechaSiembra] = useState(false)

    // Form values
    const [selectedVariedad, setSelectedVariedad] = useState<string>('')
    const [selectedEstado, setSelectedEstado] = useState<string>('')
    const [selectedTipoPlanta, setSelectedTipoPlanta] = useState<string>('')
    const [selectedPatron, setSelectedPatron] = useState<string>('')
    const [selectedFechaSiembra, setSelectedFechaSiembra] = useState<Date | undefined>(undefined)

    // Fetch data
    useEffect(() => {
        async function loadData() {
            const [variedadesRes, estadosRes, tiposRes, patronesRes] = await Promise.all([
                fetch('/api/variedades'),
                fetch('/api/estados'),
                fetch('/api/tipos-plantas'),
                fetch('/api/patrones')
            ])

            if (variedadesRes.ok) setVariedades(await variedadesRes.json())
            if (estadosRes.ok) setEstados(await estadosRes.json())
            if (tiposRes.ok) setTiposPlantas(await tiposRes.json())
            if (patronesRes.ok) setPatrones(await patronesRes.json())
        }
        loadData()
    }, [])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            // Build updates object with only enabled fields
            const updates: any = {}

            if (enableVariedad && selectedVariedad) {
                const variedad = variedades.find(v => (v.nombre || v.codigo) === selectedVariedad)
                if (variedad) {
                    updates.id_variedad = variedad.id_variedad
                }
            }

            if (enableEstado) {
                updates.estado = selectedEstado || null
            }

            if (enableTipoPlanta) {
                updates.tipo_planta = selectedTipoPlanta || null
            }

            if (enablePatron) {
                updates.patron = selectedPatron || null
            }

            if (enableFechaSiembra) {
                updates.fecha_siembra = selectedFechaSiembra ? selectedFechaSiembra.toISOString() : null
            }

            // Only proceed if at least one field is enabled
            if (Object.keys(updates).length === 0) {
                alert('Por favor habilita y selecciona al menos un campo para actualizar')
                setIsSaving(false)
                return
            }

            const grupoIds = grupos.map(g => g.grupo.id_grupo)

            const response = await fetch('/api/grupos/bulk-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grupoIds,
                    updates
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to update grupos')
            }

            const result = await response.json()
            console.log('Bulk updated grupos:', result)

            // Close dialog and reload
            onOpenChange(false)
            window.location.reload()

        } catch (error) {
            console.error('Error bulk updating grupos:', error)
            alert(`Error al actualizar grupos: ${error instanceof Error ? error.message : String(error)}`)
        } finally {
            setIsSaving(false)
        }
    }

    const handleCancel = () => {
        // Reset all fields
        setEnableVariedad(false)
        setEnableEstado(false)
        setEnableTipoPlanta(false)
        setEnablePatron(false)
        setEnableFechaSiembra(false)
        setSelectedVariedad('')
        setSelectedEstado('')
        setSelectedTipoPlanta('')
        setSelectedPatron('')
        setSelectedFechaSiembra(undefined)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Edit2 className="h-5 w-5" />
                        Edición Masiva de Grupos
                    </DialogTitle>
                    <DialogDescription>
                        Editando {grupos.length} grupo{grupos.length !== 1 ? 's' : ''}.
                        Activa las casillas para habilitar los campos que deseas modificar.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Variedad */}
                    <div className="flex items-start gap-3">
                        <Checkbox
                            id="enable-variedad"
                            checked={enableVariedad}
                            onCheckedChange={(checked) => setEnableVariedad(!!checked)}
                            className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="enable-variedad" className="text-sm font-medium">
                                Variedad
                            </Label>
                            <Combobox
                                value={selectedVariedad}
                                onValueChange={setSelectedVariedad}
                                options={variedades
                                    .filter(v => (v.nombre || v.codigo) && (v.nombre || v.codigo).trim() !== '')
                                    .map(v => ({
                                        value: v.nombre || v.codigo,
                                        label: v.nombre || v.codigo
                                    }))}
                                placeholder="Seleccionar variedad"
                                searchPlaceholder="Buscar variedad..."
                                emptyText="No se encontró variedad"
                                className="w-full"
                                disabled={!enableVariedad}
                            />
                        </div>
                    </div>

                    {/* Estado */}
                    <div className="flex items-start gap-3">
                        <Checkbox
                            id="enable-estado"
                            checked={enableEstado}
                            onCheckedChange={(checked) => setEnableEstado(!!checked)}
                            className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="enable-estado" className="text-sm font-medium">
                                Estado
                            </Label>
                            <Select
                                value={selectedEstado}
                                onValueChange={setSelectedEstado}
                                disabled={!enableEstado}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Seleccionar estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    {estados
                                        .filter(estado => estado.codigo && estado.codigo.trim() !== '')
                                        .map((estado) => (
                                            <SelectItem key={estado.codigo} value={estado.codigo}>
                                                {estado.codigo}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Tipo de Planta */}
                    <div className="flex items-start gap-3">
                        <Checkbox
                            id="enable-tipo-planta"
                            checked={enableTipoPlanta}
                            onCheckedChange={(checked) => setEnableTipoPlanta(!!checked)}
                            className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="enable-tipo-planta" className="text-sm font-medium">
                                Tipo de Planta
                            </Label>
                            <Select
                                value={selectedTipoPlanta}
                                onValueChange={setSelectedTipoPlanta}
                                disabled={!enableTipoPlanta}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Seleccionar tipo de planta" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tiposPlantas
                                        .filter(tp => tp.codigo && tp.codigo.trim() !== '')
                                        .map((tp) => (
                                            <SelectItem key={tp.codigo} value={tp.codigo}>
                                                {tp.codigo}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Patrón */}
                    <div className="flex items-start gap-3">
                        <Checkbox
                            id="enable-patron"
                            checked={enablePatron}
                            onCheckedChange={(checked) => setEnablePatron(!!checked)}
                            className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="enable-patron" className="text-sm font-medium">
                                Patrón
                            </Label>
                            <Select
                                value={selectedPatron}
                                onValueChange={setSelectedPatron}
                                disabled={!enablePatron}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Seleccionar patrón" />
                                </SelectTrigger>
                                <SelectContent>
                                    {patrones
                                        .filter(p => p.codigo && p.codigo.trim() !== '')
                                        .map((p) => (
                                            <SelectItem key={p.codigo} value={p.codigo}>
                                                {p.codigo}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Fecha de Siembra */}
                    <div className="flex items-start gap-3">
                        <Checkbox
                            id="enable-fecha-siembra"
                            checked={enableFechaSiembra}
                            onCheckedChange={(checked) => setEnableFechaSiembra(!!checked)}
                            className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="enable-fecha-siembra" className="text-sm font-medium">
                                Fecha de Siembra
                            </Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                        disabled={!enableFechaSiembra}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {selectedFechaSiembra ? (
                                            format(selectedFechaSiembra, 'PPP', { locale: es })
                                        ) : (
                                            <span>Seleccionar fecha</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={selectedFechaSiembra}
                                        onSelect={setSelectedFechaSiembra}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Guardando...' : `Actualizar ${grupos.length} Grupo${grupos.length !== 1 ? 's' : ''}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
