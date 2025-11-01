"use client"

import { useEffect, useRef, useState } from 'react'
import { COLORS, getLabelColor } from '@/lib/colors'
import { MapSettings, DEFAULT_MAP_SETTINGS } from '@/lib/map-settings'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Settings } from 'lucide-react'

interface BloqueMapProps {
    bloqueId: number
    bloqueName: string
    fincaName?: string
    camas?: any[]
    grupos?: any[]
    settings?: MapSettings
    disableInteraction?: boolean
}

export function BloqueMap({ 
    bloqueId, 
    bloqueName, 
    fincaName, 
    camas = [],
    grupos = [],
    settings = DEFAULT_MAP_SETTINGS,
    disableInteraction = false
}: BloqueMapProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const p5Instance = useRef<any>(null)
    const [selectedCamas, setSelectedCamas] = useState<Set<string>>(new Set())
    const selectedCamasRef = useRef<Set<string>>(new Set())
    const [showSelectionDialog, setShowSelectionDialog] = useState(false)
    const showSelectionDialogRef = useRef(false)
    const disableInteractionRef = useRef(disableInteraction)
    const [selectionDialogCamas, setSelectionDialogCamas] = useState<any[]>([])
    const [estados, setEstados] = useState<{ id: number; codigo: string }[]>([])
    const [tiposPlantas, setTiposPlantas] = useState<any[]>([])
    const [patrones, setPatrones] = useState<any[]>([])
    const [variedades, setVariedades] = useState<any[]>([])
    
    // Keep disableInteraction ref in sync
    useEffect(() => {
        disableInteractionRef.current = disableInteraction
    }, [disableInteraction])
    useEffect(() => {
        const fetchEstados = async () => {
            try {
                const response = await fetch('/api/estados')
                if (response.ok) {
                    const data = await response.json()
                    console.log('Fetched estados:', data)
                    setEstados(data)
                } else {
                    console.error('Failed to fetch estados:', response.status)
                }
            } catch (error) {
                console.error('Error fetching estados:', error)
            }
        }
        fetchEstados()
    }, [])
    
    // Fetch tipos de planta
    useEffect(() => {
        const fetchTiposPlantas = async () => {
            try {
                const response = await fetch('/api/tipos-plantas')
                if (response.ok) {
                    const data = await response.json()
                    console.log('Fetched tipos plantas:', data)
                    setTiposPlantas(data)
                }
            } catch (error) {
                console.error('Error fetching tipos plantas:', error)
            }
        }
        fetchTiposPlantas()
    }, [])
    
    // Fetch patrones
    useEffect(() => {
        const fetchPatrones = async () => {
            try {
                const response = await fetch('/api/patrones')
                if (response.ok) {
                    const data = await response.json()
                    console.log('Fetched patrones:', data)
                    setPatrones(data)
                }
            } catch (error) {
                console.error('Error fetching patrones:', error)
            }
        }
        fetchPatrones()
    }, [])
    
    // Fetch variedades
    useEffect(() => {
        const fetchVariedades = async () => {
            try {
                const response = await fetch('/api/variedades')
                if (response.ok) {
                    const data = await response.json()
                    console.log('Fetched variedades:', data)
                    setVariedades(data)
                }
            } catch (error) {
                console.error('Error fetching variedades:', error)
            }
        }
        fetchVariedades()
    }, [])
    const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null)
    const [editFormData, setEditFormData] = useState<any>({})
    const [isSaving, setIsSaving] = useState(false)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [pendingSave, setPendingSave] = useState<{ groupKey: string, camas: any[] } | null>(null)
    
    // Keep ref in sync with state
    useEffect(() => {
        showSelectionDialogRef.current = showSelectionDialog
    }, [showSelectionDialog])
    
    // Debug logging
    useEffect(() => {
        console.log('showSelectionDialog changed:', showSelectionDialog, 'camas:', selectionDialogCamas.length)
    }, [showSelectionDialog, selectionDialogCamas])
    
    const [hoveredCama, setHoveredCama] = useState<{
        nombre: string
        variedad: string
        grupoId: number | null
        grupoNombre: string
        grupoEstado: string
        grupoFechaSiembra: string | null
        grupoTipoPlanta: string | null
        grupoPatron: string | null
        length: number
    } | null>(null)
    const hoveredCamaRef = useRef<{
        nombre: string
        variedad: string
        grupoId: number | null
        grupoNombre: string
        grupoEstado: string
        grupoFechaSiembra: string | null
        grupoTipoPlanta: string | null
        grupoPatron: string | null
        length: number
    } | null>(null)
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
    
    // Track mouse position directly from DOM events
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY })
        }
        
        const handleMouseLeave = () => {
            setMousePos(null)
        }
        
        const container = containerRef.current
        if (container) {
            container.addEventListener('mousemove', handleMouseMove)
            container.addEventListener('mouseleave', handleMouseLeave)
            
            return () => {
                container.removeEventListener('mousemove', handleMouseMove)
                container.removeEventListener('mouseleave', handleMouseLeave)
            }
        }
    }, [])
    
    // Keep refs in sync with state
    useEffect(() => {
        selectedCamasRef.current = selectedCamas
    }, [selectedCamas])
    
    useEffect(() => {
        hoveredCamaRef.current = hoveredCama
    }, [hoveredCama])

    // Show confirmation dialog
    const handleSaveClick = (groupKey: string, camasInGroup: any[]) => {
        setPendingSave({ groupKey, camas: camasInGroup })
        setShowConfirmDialog(true)
    }

    // Actual save handler (called after confirmation)
    const handleConfirmSave = async () => {
        if (!pendingSave) return
        
        setIsSaving(true)
        setShowConfirmDialog(false)
        
        try {
            const { groupKey, camas: camasInGroup } = pendingSave
            const camaNames = camasInGroup.map(c => c.nombre)
            const firstCama = camasInGroup[0]
            const originalGrupo = grupos.find(g => g.id === firstCama.grupoId)

            // Case 1: User changed "Cambiar a Grupo" to a different existing grupo
            if (editFormData.grupoId && editFormData.grupoId !== firstCama.grupoId) {
                // Verify the grupo exists
                const targetGrupo = grupos.find(g => g.id_grupo === editFormData.grupoId)
                if (!targetGrupo) {
                    throw new Error(`Grupo ${editFormData.grupoId} no existe en este bloque`)
                }

                console.log('Case 1: Moving camas to grupo', { 
                    bloqueId, 
                    camaNames, 
                    newGrupoId: editFormData.grupoId,
                    oldGrupoId: firstCama.grupoId,
                    targetGrupoExists: !!targetGrupo,
                    targetGrupoName: targetGrupo.nombre
                })
                const response = await fetch('/api/camas/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bloqueId,
                        camaNames,
                        updates: { id_grupo: editFormData.grupoId }
                    })
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    console.error('API error response:', errorData)
                    throw new Error(`Failed to move camas to grupo: ${errorData.error || response.statusText}`)
                }
                
                const result = await response.json()
                console.log('Moved camas to grupo:', result)
                
                // Refresh the page data
                window.location.reload()
                return
            }

            // Check if grupo properties changed
            const grupoPropsChanged = 
                editFormData.variety !== firstCama.variety ||
                editFormData.grupoEstado !== firstCama.grupoEstado ||
                editFormData.grupoTipoPlanta !== firstCama.grupoTipoPlanta ||
                editFormData.grupoPatron !== firstCama.grupoPatron ||
                editFormData.grupoFechaSiembra !== firstCama.grupoFechaSiembra

            console.log('Checking grupo props changed:', {
                grupoPropsChanged,
                variety: { old: firstCama.variety, new: editFormData.variety },
                estado: { old: firstCama.grupoEstado, new: editFormData.grupoEstado },
                tipoPlanta: { old: firstCama.grupoTipoPlanta, new: editFormData.grupoTipoPlanta },
                patron: { old: firstCama.grupoPatron, new: editFormData.grupoPatron }
            })

            // Case 2: Grupo properties changed - create new grupo and assign camas
            if (grupoPropsChanged) {
                console.log('Case 2: Creating new grupo')
                const varietyId = variedades.find(v => (v.nombre || v.codigo) === editFormData.variety)?.id

                const grupoData = {
                    id_variedad: varietyId,
                    estado: editFormData.grupoEstado,
                    tipo_planta: editFormData.grupoTipoPlanta,
                    patron: editFormData.grupoPatron,
                    fecha_siembra: editFormData.grupoFechaSiembra
                }
                console.log('Creating grupo with data:', grupoData)

                const response = await fetch('/api/grupos/create-and-assign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bloqueId,
                        camaNames,
                        grupoData
                    })
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    console.error('API error response:', errorData)
                    throw new Error(`Failed to create grupo: ${errorData.error || response.statusText}`)
                }
                
                const result = await response.json()
                console.log('Created new grupo and assigned camas:', result)
            }

            // Case 3: Only individual cama properties changed (largo)
            if (editFormData.length && editFormData.length !== firstCama.length) {
                console.log('Case 3: Updating cama length')
                const response = await fetch('/api/camas/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bloqueId,
                        camaNames,
                        updates: { largo_metros: editFormData.length }
                    })
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    console.error('API error response:', errorData)
                    throw new Error(`Failed to update cama properties: ${errorData.error || response.statusText}`)
                }
                
                const result = await response.json()
                console.log('Updated cama properties:', result)
            }

            console.log('All updates completed successfully')
            
            // Success - close edit mode and refresh
            setEditingGroupKey(null)
            setEditFormData({})
            setPendingSave(null)
            window.location.reload()

        } catch (error) {
            console.error('Error saving changes (full details):', error)
            console.error('Error message:', error instanceof Error ? error.message : String(error))
            console.error('editFormData:', editFormData)
            console.error('pendingSave:', pendingSave)
            alert(`Error al guardar los cambios: ${error instanceof Error ? error.message : String(error)}`)
        } finally {
            setIsSaving(false)
        }
    }

    const { 
        showLabels, 
        compactView, 
        noGap, 
        whiteCenter, 
        showVariedadLabels, 
        coloredCamaLabels, 
        camaLabelInterval 
    } = settings

    useEffect(() => {
        if (!containerRef.current || camas.length === 0) return

        let mounted = true
        let resizeObserver: ResizeObserver | null = null

        const sortedCamas = [...camas].sort((a, b) =>
            a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' })
        )

        const grupoMaxLengths = new Map<string, number>()
        
        // Group by color to count how many grupos per color (for shade variation)
        const colorGrupos = new Map<string, string[]>() // color -> grupoKeys
        sortedCamas.forEach((cama) => {
            const estado = cama.grupo?.estado?.toLowerCase()
            const colorName = cama.variedad?.color?.toLowerCase() || 'default'
            const grupoKey = `g_${cama.grupo?.id_grupo}` // Always use actual grupo ID
            
            if (estado !== 'vegetativo') { // Only track productivo grupos
                if (!colorGrupos.has(colorName)) {
                    colorGrupos.set(colorName, [])
                }
                const existing = colorGrupos.get(colorName)!
                if (!existing.includes(grupoKey)) {
                    existing.push(grupoKey)
                }
            }
        })

        // Enrich beds with computed fields
        const beds = sortedCamas.map((cama, i) => {
            const isOdd = (i + 1) % 2 === 1
            const length = cama.largo_metros || 36
            const estado = cama.grupo?.estado?.toLowerCase()
            const variety = cama.variedad?.nombre || 'Sin variedad'
            const isProductivo = estado === 'productivo'
            const grupoKey = `g_${cama.grupo?.id_grupo}` // Always use actual grupo ID
            const sideKey = `${grupoKey}_${isOdd ? 'L' : 'R'}`

            if (cama.grupo?.id_grupo || isProductivo) {
                grupoMaxLengths.set(sideKey, Math.max(grupoMaxLengths.get(sideKey) || 0, length))
            }

            const colorName = cama.variedad?.color?.toLowerCase()
            const baseVarietyColor = estado === 'vegetativo' ? '#555555' : (COLORS[colorName] || '#999999')
            
            // Calculate modified color for this grupo (if multiple grupos share same color in THIS bloque)
            const gruposForColor = colorGrupos.get(colorName || 'default') || []
            const grupoIndex = gruposForColor.indexOf(grupoKey)
            const totalGrupos = gruposForColor.length
            
            console.log(`Cama ${cama.nombre}: variety="${variety}", grupoKey="${grupoKey}", color="${colorName}", totalGrupos=${totalGrupos}, grupoIndex=${grupoIndex}, baseColor=${baseVarietyColor}`)
            
            let finalColor = baseVarietyColor
            if (totalGrupos > 1 && estado !== 'vegetativo') {
                // Convert hex to RGB
                const hex = baseVarietyColor.replace('#', '')
                const r = parseInt(hex.substr(0, 2), 16)
                const g = parseInt(hex.substr(2, 2), 16)
                const b = parseInt(hex.substr(4, 2), 16)
                
                // Blend with white (lighter) or black (darker) by 3%
                let newR, newG, newB
                if (grupoIndex % 2 === 0) {
                    // Even: blend 3% with white (lighter)
                    newR = Math.round(r * 0.97 + 255 * 0.03)
                    newG = Math.round(g * 0.97 + 255 * 0.03)
                    newB = Math.round(b * 0.97 + 255 * 0.03)
                } else {
                    // Odd: blend 3% with black (darker)
                    newR = Math.round(r * 0.97)
                    newG = Math.round(g * 0.97)
                    newB = Math.round(b * 0.97)
                }
                
                finalColor = `rgb(${newR}, ${newG}, ${newB})`
                console.log(`  -> Modified to ${finalColor}`)
            }
            
            return {
                nombre: cama.nombre,
                index: i,
                isOdd,
                length,
                variety,
                varietyColor: finalColor,
                varietyLabelColor: estado === 'vegetativo' ? '#555555' : getLabelColor(colorName),
                grupoKey,
                grupoMaxLength: grupoMaxLengths.get(sideKey) || length,
                grupoLabel: isProductivo ? variety : `${cama.grupo?.nombre || ''} | ${variety} | ${cama.grupo?.estado || ''}`,
                grupoId: cama.grupo?.id_grupo || null,
                grupoNombre: cama.grupo?.nombre || '',
                grupoEstado: cama.grupo?.estado || '',
                grupoFechaSiembra: cama.grupo?.fecha_siembra || null,
                grupoTipoPlanta: cama.grupo?.tipo_planta || null,
                grupoPatron: cama.grupo?.patron || null,
                isProductivo
            }
        })

        // Adjust grupo offset based on whether length labels are shown
        const cfg = { 
            bedH: 10, 
            rowSp: compactView ? 10 : 14,  // Reduced spacing in compact view (just bedH, no extra gap)
            scale: 8, 
            gap: noGap ? 0 : 10,  // No horizontal gap when noGap is true
            lenOff: 30, 
            grpOff: showLabels ? 80 : 40  // Closer when length labels are hidden
        }

        import('p5').then((p5Module) => {
            if (!mounted || !containerRef.current) return

            const P5 = p5Module.default

            const sketch = (p: any) => {
                let timeout: any = null
                let bedBounds: Array<{
                    nombre: string, 
                    variety: string, 
                    grupoLabel: string,
                    grupoId: number | null,
                    grupoNombre: string,
                    grupoEstado: string,
                    grupoFechaSiembra: string | null,
                    grupoTipoPlanta: string | null,
                    grupoPatron: string | null,
                    length: number,
                    x: number, 
                    y: number, 
                    w: number, 
                    h: number
                }> = []
                let transformScale = 1
                let transformOffsetX = 0
                let transformOffsetY = 0
                let lastDragX = -1
                let lastDragY = -1

                p.setup = () => {
                    const rect = containerRef.current?.getBoundingClientRect()
                    p.createCanvas(rect?.width || 900, rect?.height || 600)
                    p.frameRate(30) // Set frame rate for continuous drawing
                }

                p.draw = () => {
                    if (!beds.length) return
                    
                    // Reset bed bounds for this frame
                    bedBounds = []

                    // Calculate natural dimensions first
                    p.textSize(20)
                    p.textStyle(p.BOLD)
                    const maxGrupoWidth = Math.max(...beds.map(b => p.textWidth(b.grupoLabel)))
                    
                    const maxLen = Math.max(...beds.map(b => b.length))
                    const numRows = Math.ceil(beds.length / 2)
                    const natW = (maxLen * cfg.scale + cfg.lenOff + cfg.grpOff + maxGrupoWidth + 10) * 2 + cfg.gap
                    const natH = cfg.bedH + (numRows - 1) * cfg.rowSp

                    // Scale to fill container
                    const rect = containerRef.current?.getBoundingClientRect()
                    const containerW = rect?.width || p.width
                    const containerH = rect?.height || p.height
                    const sf = Math.min(containerW / natW, containerH / natH)

                    // Use scaled dimensions for canvas
                    const w = natW * sf
                    const h = natH * sf

                    if (Math.abs(p.width - w) > 1 || Math.abs(p.height - h) > 1) {
                        p.resizeCanvas(w, h)
                    }

                    p.background(255)

                    const scale = cfg.scale * sf
                    const bedH = cfg.bedH * sf
                    const rowSp = cfg.rowSp * sf
                    const gap = cfg.gap * sf
                    const centerX = w / 2

                    // Track bounds
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
                    const track = (x: number, y: number, w = 0, h = 0) => {
                        minX = Math.min(minX, x)
                        maxX = Math.max(maxX, x + w)
                        minY = Math.min(minY, y)
                        maxY = Math.max(maxY, y + h)
                    }

                    // Draw beds
                    beds.forEach((bed, i) => {
                        const row = Math.floor(i / 2)
                        const y = bedH / 2 + row * rowSp
                        const bedW = bed.length * scale
                        const x = bed.isOdd ? centerX - gap - bedW : centerX + gap

                        track(x, y - bedH / 2, bedW, bedH)
                        
                        // Store bed bounds for click detection
                        bedBounds.push({
                            nombre: bed.nombre,
                            variety: bed.variety,
                            grupoLabel: bed.grupoLabel,
                            grupoId: bed.grupoId,
                            grupoNombre: bed.grupoNombre,
                            grupoEstado: bed.grupoEstado,
                            grupoFechaSiembra: bed.grupoFechaSiembra,
                            grupoTipoPlanta: bed.grupoTipoPlanta,
                            grupoPatron: bed.grupoPatron,
                            length: bed.length,
                            x: x,
                            y: y - bedH / 2,
                            w: bedW,
                            h: bedH
                        })

                        // Use blue overlay if selected, otherwise use variety color
                        const isSelected = selectedCamasRef.current.has(bed.nombre)
                        const isHovered = hoveredCamaRef.current === bed.nombre
                        let c
                        
                        if (isSelected) {
                            // Blend variety color with semi-transparent blue (50/50 mix)
                            const baseColor = p.color(bed.varietyColor)
                            const blueColor = p.color(0, 100, 255)
                            const blendedR = (p.red(baseColor) + p.red(blueColor)) / 2
                            const blendedG = (p.green(baseColor) + p.green(blueColor)) / 2
                            const blendedB = (p.blue(baseColor) + p.blue(blueColor)) / 2
                            c = p.color(blendedR, blendedG, blendedB)
                        } else {
                            c = p.color(bed.varietyColor)
                        }
                        
                        // Intensify color on hover by adding white overlay (screen blend effect)
                        if (isHovered && !isSelected) {
                            const r = p.red(c)
                            const g = p.green(c)
                            const b = p.blue(c)
                            // Blend with white at 30% to brighten
                            const brightR = r + (255 - r) * 0.3
                            const brightG = g + (255 - g) * 0.3
                            const brightB = b + (255 - b) * 0.3
                            c = p.color(brightR, brightG, brightB)
                        }
                        
                        p.noStroke()
                        p.fill(c)
                        p.rect(x, y - bedH / 2, bedW, bedH)

                        // Meter dots - ensure proper contrast using perceptual luminance
                        const r = p.red(c)
                        const g = p.green(c)
                        const b = p.blue(c)
                        
                        // Calculate relative luminance (WCAG standard, 0-1 scale)
                        const toLinear = (val: number) => {
                            const v = val / 255
                            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
                        }
                        const relativeLuminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
                        
                        // Target: consistent subtle contrast across all luminance levels
                        let dotR, dotG, dotB
                        if (relativeLuminance > 0.5) {
                            // Light bed -> darken slightly but less aggressive (85-90% of original)
                            const factor = p.map(relativeLuminance, 0.5, 1, 0.9, 0.85)
                            dotR = r * factor
                            dotG = g * factor
                            dotB = b * factor
                        } else {
                            // Dark bed -> lighten more aggressively (the darker it is, the more we lighten)
                            const factor = p.map(relativeLuminance, 0, 0.5, 0.7, 0.3)
                            dotR = r + (255 - r) * factor
                            dotG = g + (255 - g) * factor
                            dotB = b + (255 - b) * factor
                        }
                        
                        p.fill(dotR, dotG, dotB)
                        
                        // When no gap, draw vertical line at start instead of first dot
                        if (noGap && gap === 0) {
                            const lineColor = whiteCenter ? [255, 255, 255] : [dotR, dotG, dotB]
                            p.stroke(lineColor[0], lineColor[1], lineColor[2])
                            p.strokeWeight(2 * sf)
                            const lineX = bed.isOdd ? x + bedW : x
                            p.line(lineX, y - bedH / 2, lineX, y + bedH / 2)
                            p.noStroke()
                        }
                        
                        for (let m = 0; m <= bed.length; m++) {
                            // Skip first dot when no gap (we drew a line instead)
                            if (noGap && gap === 0 && m === 0) continue
                            
                            const sz = (m % 10 === 0 ? 2 : m % 5 === 0 ? 1.5 : 1) * 2 * sf
                            const dotX = bed.isOdd ? x + bedW - m * scale : x + m * scale
                            p.circle(dotX, y, sz)
                        }

                        // Bed label
                        // Determine if we should show this cama number based on interval setting
                        const camaNumber = parseInt(bed.nombre)
                        let shouldShowLabel = false
                        
                        if (camaLabelInterval === 'none') {
                            shouldShowLabel = false
                        } else if (camaLabelInterval === 'all') {
                            shouldShowLabel = true
                        } else if (camaLabelInterval === 'start+intervals') {
                            // Show first cama of each column (1 and 2), then 5 and 6, 10 and 11, etc.
                            const columnStart = bed.isOdd ? 1 : 2
                            shouldShowLabel = camaNumber === columnStart || 
                                            (camaNumber > columnStart && (camaNumber - columnStart) % 5 === 0)
                        } else if (camaLabelInterval === 'every5') {
                            shouldShowLabel = camaNumber === 1 || camaNumber === 2 || camaNumber % 5 === 0
                        } else if (camaLabelInterval === 'every10') {
                            shouldShowLabel = camaNumber === 2 || camaNumber % 10 === 0
                        } else if (camaLabelInterval === 'both') {
                            shouldShowLabel = camaNumber === 1 || camaNumber === 2 || camaNumber % 5 === 0
                        }
                        
                        if (shouldShowLabel) {
                            if (coloredCamaLabels) {
                                const labelColor = p.color(bed.varietyLabelColor)
                                p.fill(labelColor)
                            } else {
                                p.fill(85)
                            }
                            p.textAlign(p.CENTER, p.CENTER)
                            // Different sizes: larger for 10s, medium for 5s, small for all
                            let textSize = 6.75
                            if (camaLabelInterval === 'both') {
                                // Like dots: 10s are larger, 5s are medium
                                textSize = camaNumber % 10 === 0 ? 9 : 7.5
                            } else if (camaLabelInterval !== 'all') {
                                textSize = 8
                            }
                            p.textSize(textSize * sf)
                            p.textStyle(p.NORMAL)
                            const labelX = bed.isOdd ? x - 13 * sf : x + bedW + 13 * sf
                            p.text(bed.nombre, labelX, y)
                            
                            // Track bed label bounds
                            const labelW = p.textWidth(bed.nombre)
                            const labelH = textSize * sf
                            track(labelX - labelW / 2, y - labelH / 2, labelW, labelH)
                        }
                    })

                    // Draw segments (length and grupo)
                    const drawSegs = (keyFn: any, xFn: any, color: any, thick: number, label: any, size: number, txtColor?: any) => {
                        const segs: any[] = []
                        beds.forEach((bed, i) => {
                            const key = keyFn(bed)
                            if (!key) return
                            const prev = i - 2
                            if (prev < 0 || keyFn(beds[prev]) !== key || beds[prev].isOdd !== bed.isOdd) {
                                let end = i
                                let maxBed = bed
                                while (end + 2 < beds.length && keyFn(beds[end + 2]) === key && beds[end + 2].isOdd === bed.isOdd) {
                                    end += 2
                                    if (beds[end].length > maxBed.length) {
                                        maxBed = beds[end]
                                    }
                                }
                                segs.push({ bed: maxBed, start: i, end })
                            }
                        })

                        segs.forEach(seg => {
                            const r1 = Math.floor(seg.start / 2)
                            const r2 = Math.floor(seg.end / 2)
                            const y1 = bedH / 2 + r1 * rowSp
                            const y2 = bedH / 2 + r2 * rowSp
                            const lineX = xFn(seg.bed)

                            track(lineX, y1, 0, y2 - y1)

                            p.stroke(color(seg.bed))
                            p.strokeWeight(thick * sf)
                            p.line(lineX, seg.start === seg.end ? y1 - bedH / 2 : y1, lineX, seg.start === seg.end ? y1 + bedH / 2 : y2)

                            p.noStroke()
                            p.fill(txtColor ? txtColor(seg.bed) : color(seg.bed))
                            p.textAlign(seg.bed.isOdd ? p.RIGHT : p.LEFT, p.CENTER)
                            p.textSize(size * sf)
                            p.textStyle(size > 15 ? p.BOLD : p.NORMAL)
                            const off = (size > 15 ? 5 : 3) * sf
                            const textX = seg.bed.isOdd ? lineX - off : lineX + off
                            const textY = (y1 + y2) / 2
                            p.text(label(seg.bed), textX, textY)

                            // Track text bounds
                            const textW = p.textWidth(label(seg.bed))
                            if (seg.bed.isOdd) {
                                track(textX - textW, textY - size * sf / 2, textW, size * sf)
                            } else {
                                track(textX, textY - size * sf / 2, textW, size * sf)
                            }
                        })
                    }

                    // Length lines
                    if (showLabels) {
                        drawSegs(
                            (b: any) => `${b.length}_${b.isOdd ? 'L' : 'R'}`,
                            (b: any) => {
                                const bedW = b.length * scale
                                const bedX = b.isOdd ? centerX - gap - bedW : centerX + gap
                                return b.isOdd ? bedX - cfg.lenOff * sf : bedX + bedW + cfg.lenOff * sf
                            },
                            () => '#CCCCCC',
                            4,
                            (b: any) => `${b.length}m`,
                            12,
                            () => '#666'
                        )
                    }

                    // Grupo lines
                    if (showVariedadLabels) {
                        drawSegs(
                            (b: any) => b.grupoKey ? `${b.grupoKey}_${b.isOdd ? 'L' : 'R'}` : '',
                            (b: any) => {
                                const maxW = b.grupoMaxLength * scale
                                const maxX = b.isOdd ? centerX - gap - maxW : centerX + gap
                                return b.isOdd ? maxX - cfg.grpOff * sf : maxX + maxW + cfg.grpOff * sf
                            },
                            (b: any) => {
                                // Mix bed color and label color (50/50 blend)
                                const bedColor = p.color(b.varietyColor)
                                const labelColor = p.color(b.varietyLabelColor)
                                const mixedR = (p.red(bedColor) + p.red(labelColor)) / 2
                                const mixedG = (p.green(bedColor) + p.green(labelColor)) / 2
                                const mixedB = (p.blue(bedColor) + p.blue(labelColor)) / 2
                                return p.color(mixedR, mixedG, mixedB)
                            },
                            6,
                            (b: any) => b.grupoLabel,
                            20,
                            (b: any) => p.color(b.varietyLabelColor)
                        )
                    }

                    // Crop to content bounds
                    if (minX !== Infinity) {
                        const contentW = maxX - minX
                        const contentH = maxY - minY
                        
                        if (Math.abs(p.width - contentW) > 2 || Math.abs(p.height - contentH) > 2) {
                            const temp = p.get()
                            
                            // Scale cropped content to fill container
                            const scaleUpX = containerW / contentW
                            const scaleUpY = containerH / contentH
                            const scaleUp = Math.min(scaleUpX, scaleUpY)
                            
                            // Store transform for click detection
                            transformScale = scaleUp
                            transformOffsetX = -minX
                            transformOffsetY = -minY
                            
                            p.resizeCanvas(contentW * scaleUp, contentH * scaleUp)
                            p.background(255)
                            p.image(temp, -minX * scaleUp, -minY * scaleUp, w * scaleUp, h * scaleUp)
                        }
                    }
                    
                    // Update hover detection after bedBounds is populated
                    if (!showSelectionDialogRef.current && !disableInteractionRef.current && p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
                        const originalX = (p.mouseX / transformScale) - transformOffsetX
                        const originalY = (p.mouseY / transformScale) - transformOffsetY
                        
                        let foundBed: {
                            nombre: string
                            variedad: string
                            grupoId: number | null
                            grupoNombre: string
                            grupoEstado: string
                            grupoFechaSiembra: string | null
                            grupoTipoPlanta: string | null
                            grupoPatron: string | null
                            length: number
                        } | null = null
                        for (const bed of bedBounds) {
                            if (originalX >= bed.x && originalX <= bed.x + bed.w &&
                                originalY >= bed.y && originalY <= bed.y + bed.h) {
                                foundBed = {
                                    nombre: bed.nombre,
                                    variedad: bed.variety,
                                    grupoId: bed.grupoId,
                                    grupoNombre: bed.grupoNombre,
                                    grupoEstado: bed.grupoEstado,
                                    grupoFechaSiembra: bed.grupoFechaSiembra,
                                    grupoTipoPlanta: bed.grupoTipoPlanta,
                                    grupoPatron: bed.grupoPatron,
                                    length: bed.length
                                }
                                break
                            }
                        }
                        
                        if (foundBed?.nombre !== hoveredCamaRef.current?.nombre) {
                            setHoveredCama(foundBed)
                        }
                    } else if (hoveredCamaRef.current !== null) {
                        setHoveredCama(null)
                    }
                }

                p.windowResized = () => {
                    if (timeout) cancelAnimationFrame(timeout)
                    timeout = requestAnimationFrame(() => {
                        if (!containerRef.current) return
                        const rect = containerRef.current.getBoundingClientRect()
                        p.resizeCanvas(rect.width, rect.height)
                        p.redraw()
                    })
                }
                
                p.mousePressed = () => {
                    // Don't process mouse events if dialog is open
                    if (showSelectionDialogRef.current || disableInteractionRef.current) {
                        return
                    }
                    
                    // Check if click is within canvas
                    if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) {
                        return
                    }
                    
                    // Store initial drag position
                    lastDragX = p.mouseX
                    lastDragY = p.mouseY
                    
                    // Transform mouse coordinates back to original drawing space
                    const originalX = (p.mouseX / transformScale) - transformOffsetX
                    const originalY = (p.mouseY / transformScale) - transformOffsetY
                    
                    // Find which bed was clicked
                    for (const bed of bedBounds) {
                        if (originalX >= bed.x && originalX <= bed.x + bed.w &&
                            originalY >= bed.y && originalY <= bed.y + bed.h) {
                            // Toggle selection
                            setSelectedCamas(prev => {
                                const next = new Set(prev)
                                if (next.has(bed.nombre)) {
                                    next.delete(bed.nombre)
                                } else {
                                    next.add(bed.nombre)
                                }
                                return next
                            })
                            break
                        }
                    }
                }
                
                p.mouseDragged = () => {
                    // Don't process mouse events if dialog is open
                    if (showSelectionDialogRef.current || disableInteractionRef.current) {
                        return
                    }
                    
                    // Check if drag is within canvas
                    if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) {
                        return
                    }
                    
                    // Check all beds along the line from last position to current position
                    const checkBedAtPoint = (mx: number, my: number) => {
                        const originalX = (mx / transformScale) - transformOffsetX
                        const originalY = (my / transformScale) - transformOffsetY
                        
                        for (const bed of bedBounds) {
                            if (originalX >= bed.x && originalX <= bed.x + bed.w &&
                                originalY >= bed.y && originalY <= bed.y + bed.h) {
                                setSelectedCamas(prev => {
                                    const next = new Set(prev)
                                    next.add(bed.nombre)
                                    return next
                                })
                                break
                            }
                        }
                    }
                    
                    // Check multiple points along the line to avoid missing beds
                    if (lastDragX !== -1 && lastDragY !== -1) {
                        const dx = p.mouseX - lastDragX
                        const dy = p.mouseY - lastDragY
                        const distance = Math.sqrt(dx * dx + dy * dy)
                        const steps = Math.max(1, Math.ceil(distance / 5)) // Check every 5 pixels
                        
                        for (let i = 0; i <= steps; i++) {
                            const t = i / steps
                            const interpX = lastDragX + dx * t
                            const interpY = lastDragY + dy * t
                            checkBedAtPoint(interpX, interpY)
                        }
                    }
                    
                    // Update last position
                    lastDragX = p.mouseX
                    lastDragY = p.mouseY
                }
                
                p.mouseReleased = () => {
                    // Don't process mouse events if dialog is open
                    if (showSelectionDialogRef.current || disableInteractionRef.current) {
                        return
                    }
                    
                    console.log('mouseReleased called, selected count:', selectedCamasRef.current.size)
                    // Show dialog if we have selected camas
                    if (selectedCamasRef.current.size > 0) {
                        const selectedCamaNames = Array.from(selectedCamasRef.current)
                        const selectedCamaObjects = beds.filter(bed => 
                            selectedCamaNames.includes(bed.nombre)
                        )
                        console.log('Selected camas:', selectedCamaNames, 'Objects:', selectedCamaObjects)
                        setSelectionDialogCamas(selectedCamaObjects)
                        setShowSelectionDialog(true)
                    }
                    
                    // Clear selection after capturing it
                    setTimeout(() => {
                        setSelectedCamas(new Set())
                    }, 0)
                    // Reset drag tracking
                    lastDragX = -1
                    lastDragY = -1
                }
            }

            p5Instance.current = new P5(sketch, containerRef.current)

            resizeObserver = new ResizeObserver(() => p5Instance.current?.windowResized())
            resizeObserver.observe(containerRef.current)
        })

        return () => {
            mounted = false
            resizeObserver?.disconnect()
            p5Instance.current?.remove()
            p5Instance.current = null
        }
    }, [bloqueId, bloqueName, fincaName, camas, settings])

    return (
        <div className="relative w-full h-full">
            <div 
                ref={containerRef} 
                className="w-full h-full flex items-center justify-center"
                style={{ pointerEvents: (showSelectionDialog || disableInteraction) ? 'none' : 'auto' }}
            />
            
            {hoveredCama && mousePos && (() => {
                // Smart positioning: show above if more space above, below if more space below
                const spaceAbove = mousePos.y
                const spaceBelow = window.innerHeight - mousePos.y
                const showAbove = spaceBelow < spaceAbove
                
                return (
                    <div 
                        className="fixed pointer-events-none bg-popover text-popover-foreground border rounded-md px-3 py-2 text-xs shadow-md z-50"
                        style={{
                            left: `${mousePos.x + 15}px`,
                            [showAbove ? 'bottom' : 'top']: showAbove 
                                ? `${window.innerHeight - mousePos.y + 15}px` 
                                : `${mousePos.y + 15}px`
                        }}
                    >
                        <div className="font-semibold mb-1">Cama {hoveredCama.nombre}</div>
                        <div className="space-y-0.5 text-[11px]">
                            <div><span className="font-medium">{hoveredCama.variedad}</span> • {hoveredCama.grupoEstado}</div>
                            <div className="text-muted-foreground">{hoveredCama.grupoNombre}</div>
                            <div className="text-muted-foreground">Largo: {hoveredCama.length}m</div>
                            {hoveredCama.grupoFechaSiembra && (
                                <div className="text-muted-foreground">
                                    Siembra: {new Date(hoveredCama.grupoFechaSiembra).toLocaleDateString()}
                                </div>
                            )}
                            {hoveredCama.grupoTipoPlanta && (
                                <div className="text-muted-foreground">Tipo: {hoveredCama.grupoTipoPlanta}</div>
                            )}
                            {hoveredCama.grupoPatron && (
                                <div className="text-muted-foreground">Patrón: {hoveredCama.grupoPatron}</div>
                            )}
                        </div>
                    </div>
                )
            })()}
            
            <Dialog open={showSelectionDialog} onOpenChange={setShowSelectionDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Camas Seleccionadas ({selectionDialogCamas.length})
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {(() => {
                            // Group camas by all grupo variables
                            const groups = new Map<string, typeof selectionDialogCamas>()
                            
                            selectionDialogCamas.forEach(cama => {
                                const groupKey = JSON.stringify({
                                    grupoId: cama.grupoId,
                                    variety: cama.variety,
                                    grupoNombre: cama.grupoNombre,
                                    grupoEstado: cama.grupoEstado,
                                    grupoFechaSiembra: cama.grupoFechaSiembra,
                                    grupoTipoPlanta: cama.grupoTipoPlanta,
                                    grupoPatron: cama.grupoPatron,
                                    length: cama.length,
                                    varietyColor: cama.varietyColor
                                })
                                
                                if (!groups.has(groupKey)) {
                                    groups.set(groupKey, [])
                                }
                                groups.get(groupKey)!.push(cama)
                            })
                            
                            return Array.from(groups.entries()).map(([groupKey, camas]) => {
                                const firstCama = camas[0]
                                const isEditing = editingGroupKey === groupKey
                                
                                // Use all grupos from bloque for the select dropdown
                                const allGrupos = grupos
                                    .filter(g => g.id_grupo)
                                    .map(g => ({
                                        id: g.id_grupo,  // This is the actual grupo_cama.id (primary key)
                                        nombre: g.nombre,
                                        variety: g.variedad?.nombre || 'Sin variedad',
                                        estado: g.estado || '',
                                        camasCount: g.camasCount || 0,
                                        colorHex: g.colorHex || '#999999'
                                    }))
                                    .sort((a, b) => (a.id || 0) - (b.id || 0))
                                
                                return (
                                    <div key={groupKey} className="border rounded-lg p-4 relative">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-2 right-2 h-8 w-8"
                                            onClick={() => {
                                                if (isEditing) {
                                                    setEditingGroupKey(null)
                                                    setEditFormData({})
                                                } else {
                                                    setEditingGroupKey(groupKey)
                                                    setEditFormData({
                                                        variety: firstCama.variety,
                                                        grupoNombre: firstCama.grupoNombre,
                                                        grupoEstado: firstCama.grupoEstado,
                                                        grupoFechaSiembra: firstCama.grupoFechaSiembra,
                                                        grupoTipoPlanta: firstCama.grupoTipoPlanta,
                                                        grupoPatron: firstCama.grupoPatron,
                                                        length: firstCama.length
                                                    })
                                                }
                                            }}
                                        >
                                            <Settings className="h-4 w-4" />
                                        </Button>
                                        <div className="flex gap-3 items-start mb-3">
                                            <div 
                                                className="w-16 h-16 rounded flex-shrink-0"
                                                style={{ backgroundColor: firstCama.varietyColor }}
                                            />
                                            <div className="flex-1 text-sm pr-8">
                                                {isEditing ? (
                                                    <div className="space-y-3">
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium text-muted-foreground">
                                                                Cambiar a Grupo
                                                            </label>
                                                            <Select
                                                                value={editFormData.grupoId?.toString() || firstCama.grupoId?.toString() || ''}
                                                                onValueChange={(value) => {
                                                                    const selectedGrupo = allGrupos.find(g => g.id?.toString() === value)
                                                                    if (selectedGrupo) {
                                                                        setEditFormData({
                                                                            ...editFormData,
                                                                            grupoId: selectedGrupo.id,
                                                                            grupoNombre: selectedGrupo.nombre,
                                                                            grupoEstado: selectedGrupo.estado,
                                                                            variety: selectedGrupo.variety
                                                                        })
                                                                    }
                                                                }}
                                                            >
                                                                <SelectTrigger className="h-8 w-full">
                                                                    <SelectValue placeholder="Seleccionar grupo" />
                                                                </SelectTrigger>
                                                                <SelectContent className="w-full">
                                                                    {allGrupos.map((grupo) => (
                                                                        <SelectItem 
                                                                            key={grupo.id} 
                                                                            value={grupo.id?.toString() || ''}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <div 
                                                                                    className="w-8 h-8 rounded flex-shrink-0"
                                                                                    style={{ backgroundColor: grupo.colorHex }}
                                                                                />
                                                                                <div className="flex flex-col">
                                                                                    <span className="font-medium">
                                                                                        ID {grupo.id} - {grupo.nombre} ({grupo.camasCount} camas)
                                                                                    </span>
                                                                                    <span className="text-xs text-muted-foreground">
                                                                                        {grupo.variety} • {grupo.estado}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <label className="text-xs font-medium text-muted-foreground min-w-[80px]">
                                                                Variedad
                                                            </label>
                                                            <Combobox
                                                                value={editFormData.variety || ''}
                                                                onValueChange={(value) => setEditFormData({ ...editFormData, variety: value })}
                                                                options={variedades
                                                                    .filter(v => (v.nombre || v.codigo) && (v.nombre || v.codigo).trim() !== '')
                                                                    .map(v => ({
                                                                        value: v.nombre || v.codigo,
                                                                        label: v.nombre || v.codigo
                                                                    }))}
                                                                placeholder="Seleccionar variedad"
                                                                searchPlaceholder="Buscar variedad..."
                                                                emptyText="No se encontró variedad"
                                                                className="h-8 flex-1"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <label className="text-xs font-medium text-muted-foreground min-w-[80px]">
                                                                Estado
                                                            </label>
                                                            <Select
                                                                value={editFormData.grupoEstado || ''}
                                                                onValueChange={(value) => {
                                                                    console.log('Estado changed to:', value)
                                                                    setEditFormData({ ...editFormData, grupoEstado: value })
                                                                }}
                                                            >
                                                                <SelectTrigger className="h-8 flex-1">
                                                                    <SelectValue placeholder="Seleccionar estado" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {estados.length > 0 ? (
                                                                        estados
                                                                            .filter(estado => estado.codigo && estado.codigo.trim() !== '')
                                                                            .map((estado, index) => {
                                                                                console.log('Rendering estado:', estado)
                                                                                return (
                                                                                    <SelectItem 
                                                                                        key={estado.codigo || `estado-${index}`} 
                                                                                        value={estado.codigo}
                                                                                    >
                                                                                        {estado.codigo}
                                                                                    </SelectItem>
                                                                                )
                                                                            })
                                                                    ) : (
                                                                        <div className="p-2 text-sm text-muted-foreground">
                                                                            Cargando estados...
                                                                        </div>
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <label className="text-xs font-medium text-muted-foreground min-w-[80px]">
                                                                Largo
                                                            </label>
                                                            <Input
                                                                type="number"
                                                                value={editFormData.length || ''}
                                                                onChange={(e) => setEditFormData({ ...editFormData, length: parseFloat(e.target.value) })}
                                                                placeholder="Largo (m)"
                                                                className="h-8 flex-1"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <label className="text-xs font-medium text-muted-foreground min-w-[80px]">
                                                                Fecha siembra
                                                            </label>
                                                            <Input
                                                                type="date"
                                                                value={editFormData.grupoFechaSiembra ? new Date(editFormData.grupoFechaSiembra).toISOString().split('T')[0] : ''}
                                                                onChange={(e) => setEditFormData({ ...editFormData, grupoFechaSiembra: e.target.value })}
                                                                placeholder="Fecha de siembra"
                                                                className="h-8 flex-1"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <label className="text-xs font-medium text-muted-foreground min-w-[80px]">
                                                                Tipo planta
                                                            </label>
                                                            <Combobox
                                                                value={editFormData.grupoTipoPlanta || ''}
                                                                onValueChange={(value) => setEditFormData({ ...editFormData, grupoTipoPlanta: value })}
                                                                options={tiposPlantas
                                                                    .filter(t => (t.nombre || t.codigo) && (t.nombre || t.codigo).trim() !== '')
                                                                    .map(t => ({
                                                                        value: t.nombre || t.codigo,
                                                                        label: t.nombre || t.codigo
                                                                    }))}
                                                                placeholder="Seleccionar tipo"
                                                                searchPlaceholder="Buscar tipo..."
                                                                emptyText="No se encontró tipo"
                                                                className="h-8 flex-1"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <label className="text-xs font-medium text-muted-foreground min-w-[80px]">
                                                                Patrón
                                                            </label>
                                                            <Combobox
                                                                value={editFormData.grupoPatron || ''}
                                                                onValueChange={(value) => setEditFormData({ ...editFormData, grupoPatron: value })}
                                                                options={patrones
                                                                    .filter(p => (p.nombre || p.codigo) && (p.nombre || p.codigo).trim() !== '')
                                                                    .map(p => ({
                                                                        value: p.nombre || p.codigo,
                                                                        label: p.nombre || p.codigo
                                                                    }))}
                                                                placeholder="Seleccionar patrón"
                                                                searchPlaceholder="Buscar patrón..."
                                                                emptyText="No se encontró patrón"
                                                                className="h-8 flex-1"
                                                            />
                                                        </div>
                                                        <div className="flex gap-2 mt-4">
                                                            <Button
                                                                onClick={() => handleSaveClick(groupKey, camas)}
                                                                disabled={isSaving}
                                                                size="sm"
                                                                className="flex-1"
                                                            >
                                                                {isSaving ? 'Guardando...' : 'Guardar'}
                                                            </Button>
                                                            <Button
                                                                onClick={() => {
                                                                    setEditingGroupKey(null)
                                                                    setEditFormData({})
                                                                }}
                                                                disabled={isSaving}
                                                                variant="outline"
                                                                size="sm"
                                                                className="flex-1"
                                                            >
                                                                Cancelar
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="font-semibold text-base mb-1">
                                                            <span className="font-medium">{firstCama.variety}</span> • {firstCama.grupoEstado}
                                                        </div>
                                                        <div className="text-muted-foreground space-y-0.5">
                                                            {firstCama.grupoId && (
                                                                <div className="text-xs font-mono">Grupo ID: {firstCama.grupoId}</div>
                                                            )}
                                                            <div>{firstCama.grupoNombre}</div>
                                                            <div>Largo: {firstCama.length}m</div>
                                                            {firstCama.grupoFechaSiembra && (
                                                                <div>Siembra: {new Date(firstCama.grupoFechaSiembra).toLocaleDateString()}</div>
                                                            )}
                                                            {firstCama.grupoTipoPlanta && (
                                                                <div>Tipo: {firstCama.grupoTipoPlanta}</div>
                                                            )}
                                                            {firstCama.grupoPatron && (
                                                                <div>Patrón: {firstCama.grupoPatron}</div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pl-[76px]">
                                            {camas.map(cama => (
                                                <span 
                                                    key={cama.nombre}
                                                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-secondary"
                                                >
                                                    {cama.nombre}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })
                        })()}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar cambios</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            ¿Estás seguro de que quieres guardar estos cambios? 
                            {pendingSave && (
                                <span className="block mt-2">
                                    Se actualizarán <strong>{pendingSave.camas.length}</strong> cama(s).
                                </span>
                            )}
                        </p>
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowConfirmDialog(false)
                                    setPendingSave(null)
                                }}
                                disabled={isSaving}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleConfirmSave}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Guardando...' : 'Confirmar'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}