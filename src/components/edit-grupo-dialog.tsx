"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

interface EditGrupoDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    grupo: any
    variedades: any[]
    estados: any[]
    tiposPlanta: any[]
    patrones: any[]
    onSave: () => void
    onDelete?: (grupoId: number) => void
}

export function EditGrupoDialog({
    open,
    onOpenChange,
    grupo,
    variedades,
    estados,
    tiposPlanta,
    patrones,
    onSave,
    onDelete
}: EditGrupoDialogProps) {
    const [formData, setFormData] = useState({
        variedad: '',
        estado: '',
        tipoPlanta: '',
        patron: '',
        fechaSiembra: null as Date | null
    })

    useEffect(() => {
        if (grupo) {
            setFormData({
                variedad: grupo.variedad?.nombre || grupo.variedad?.codigo || '',
                estado: grupo.estado || '',
                tipoPlanta: grupo.tipo_planta || '',
                patron: grupo.patron || '',
                fechaSiembra: grupo.fecha_siembra ? new Date(grupo.fecha_siembra) : null
            })
        }
    }, [grupo])

    const handleSave = async () => {
        try {
            const varietyId = variedades.find(v =>
                (v.nombre || v.codigo) === formData.variedad
            )?.id_variedad

            const updates: any = {}
            if (formData.variedad !== (grupo.variedad?.nombre || grupo.variedad?.codigo || '')) {
                updates.id_variedad = varietyId
            }
            if (formData.estado !== grupo.estado) {
                updates.estado = formData.estado
            }
            if (formData.tipoPlanta !== grupo.tipo_planta) {
                updates.tipo_planta = formData.tipoPlanta || null
            }
            if (formData.patron !== grupo.patron) {
                updates.patron = formData.patron || null
            }
            if (formData.fechaSiembra?.toISOString() !== grupo.fecha_siembra) {
                updates.fecha_siembra = formData.fechaSiembra?.toISOString() || null
            }

            const response = await fetch('/api/grupos/bulk-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grupoIds: [grupo.id_grupo],
                    updates
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to update grupo')
            }

            onSave()
            onOpenChange(false)
        } catch (error) {
            console.error('Error updating grupo:', error)
            alert(error instanceof Error ? error.message : 'Error al actualizar grupo')
        }
    }

    if (!grupo) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar Grupo: {grupo.nombre}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Variedad</Label>
                        <Combobox
                            value={formData.variedad}
                            onValueChange={(value) => setFormData({ ...formData, variedad: value })}
                            options={variedades
                                .filter(v => (v.nombre || v.codigo) && (v.nombre || v.codigo).trim() !== '')
                                .map(v => ({
                                    value: v.nombre || v.codigo,
                                    label: v.nombre || v.codigo
                                }))}
                            placeholder="Seleccionar variedad"
                            searchPlaceholder="Buscar variedad..."
                            emptyText="No se encontró variedad"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Estado</Label>
                        <Select
                            value={formData.estado}
                            onValueChange={(value) => setFormData({ ...formData, estado: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar estado" />
                            </SelectTrigger>
                            <SelectContent>
                                {estados
                                    .filter(e => e.codigo && e.codigo.trim() !== '')
                                    .map((estado) => (
                                        <SelectItem key={estado.codigo} value={estado.codigo}>
                                            {estado.codigo}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Tipo de Planta</Label>
                        <Combobox
                            value={formData.tipoPlanta}
                            onValueChange={(value) => setFormData({ ...formData, tipoPlanta: value })}
                            options={tiposPlanta
                                .filter(t => t.codigo && t.codigo.trim() !== '')
                                .map(t => ({
                                    value: t.codigo,
                                    label: t.codigo
                                }))}
                            placeholder="Seleccionar tipo de planta"
                            searchPlaceholder="Buscar tipo..."
                            emptyText="No se encontró tipo"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Patrón</Label>
                        <Combobox
                            value={formData.patron}
                            onValueChange={(value) => setFormData({ ...formData, patron: value })}
                            options={patrones
                                .filter(p => p.codigo && p.codigo.trim() !== '')
                                .map(p => ({
                                    value: p.codigo,
                                    label: p.codigo
                                }))}
                            placeholder="Seleccionar patrón"
                            searchPlaceholder="Buscar patrón..."
                            emptyText="No se encontró patrón"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Fecha de Siembra</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.fechaSiembra ? format(formData.fechaSiembra, 'PPP') : 'Seleccionar fecha'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={formData.fechaSiembra || undefined}
                                    onSelect={(date) => setFormData({ ...formData, fechaSiembra: date || null })}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <DialogFooter className="flex justify-between">
                    <Button
                        variant="destructive"
                        onClick={() => {
                            if (onDelete && grupo) {
                                onDelete(grupo.id_grupo)
                                onOpenChange(false)
                            }
                        }}
                        className="mr-auto"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar Grupo
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave}>
                            Guardar Cambios
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
