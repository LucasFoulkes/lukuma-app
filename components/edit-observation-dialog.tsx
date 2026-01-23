'use client'

import { useState, useMemo } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { useMetadata } from '@/lib/context/metadata-context'
import { updateWhere } from '@/lib/services/database.service'

interface EditObservationDialogProps {
    camaId: number
    primeraHora: Date
    ultimaHora: Date
    onSuccess: () => void
}

export function EditObservationDialog({ camaId, primeraHora, ultimaHora, onSuccess }: EditObservationDialogProps) {
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const { fincas, bloques, beds } = useMetadata()

    // Initial State
    const initialBed = beds.get(camaId)
    const [fincaId, setFincaId] = useState<number>(initialBed?.id_finca || 0)
    const [bloqueId, setBloqueId] = useState<number>(initialBed?.id_bloque || 0)
    const [newCamaId, setNewCamaId] = useState<number>(camaId)

    // Derived Options
    const bloqueOptions = useMemo(() =>
        Array.from(bloques.entries())
            .filter(([_, b]) => b.id_finca === Number(fincaId))
            .map(([id, b]) => ({ id, name: b.nombre })),
        [bloques, fincaId])

    const camaOptions = useMemo(() =>
        Array.from(beds.entries())
            .filter(([_, b]) => b.id_bloque === Number(bloqueId))
            .map(([id, b]) => ({ id, name: b.cama }))
            // Sort by numerical value of bed name if possible, or just string sort
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
        [beds, bloqueId])

    const handleSave = async () => {
        if (!newCamaId || newCamaId === camaId) {
            setOpen(false)
            return
        }

        setSaving(true)
        try {
            await updateWhere('observacion',
                {
                    id_cama: camaId,
                    // Use ISO strings for timestamptz comparison
                    creado_en_gte: primeraHora.toISOString(),
                    creado_en_lte: ultimaHora.toISOString()
                },
                { id_cama: newCamaId }
            )
            setOpen(false)
            onSuccess()
        } catch (e) {
            console.error(e)
            alert('Error updating observations')
        } finally {
            setSaving(false)
        }
    }

    const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Mover Observaciones</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Finca</label>
                        <select
                            className={selectClass}
                            value={fincaId}
                            onChange={e => {
                                const val = Number(e.target.value)
                                setFincaId(val)
                                setBloqueId(0)
                                setNewCamaId(0)
                            }}
                        >
                            <option value={0}>Seleccione Finca</option>
                            {Array.from(fincas.entries()).map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Bloque</label>
                        <select
                            className={selectClass}
                            value={bloqueId}
                            onChange={e => {
                                const val = Number(e.target.value)
                                setBloqueId(val)
                                setNewCamaId(0)
                            }}
                            disabled={!fincaId}
                        >
                            <option value={0}>Seleccione Bloque</option>
                            {bloqueOptions.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Cama</label>
                        <select
                            className={selectClass}
                            value={newCamaId}
                            onChange={e => {
                                setNewCamaId(Number(e.target.value))
                            }}
                            disabled={!bloqueId}
                        >
                            <option value={0}>Seleccione Cama</option>
                            {camaOptions.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave} disabled={saving || !newCamaId}>
                        {saving && <Spinner className="mr-2 h-4 w-4" />}
                        Guardar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
