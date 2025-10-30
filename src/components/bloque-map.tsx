"use client"

import { useEffect, useRef, useState } from 'react'
import { COLORS, getLabelColor } from '@/lib/colors'
import { MapSettings, DEFAULT_MAP_SETTINGS } from '@/lib/map-settings'

interface BloqueMapProps {
    bloqueId: number
    bloqueName: string
    fincaName?: string
    camas?: any[]
    settings?: MapSettings
}

export function BloqueMap({ 
    bloqueId, 
    bloqueName, 
    fincaName, 
    camas = [],
    settings = DEFAULT_MAP_SETTINGS
}: BloqueMapProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const p5Instance = useRef<any>(null)
    const [selectedCamas, setSelectedCamas] = useState<Set<string>>(new Set())
    const selectedCamasRef = useRef<Set<string>>(new Set())
    const [hoveredCama, setHoveredCama] = useState<{
        nombre: string
        variedad: string
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
                    if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
                        const originalX = (p.mouseX / transformScale) - transformOffsetX
                        const originalY = (p.mouseY / transformScale) - transformOffsetY
                        
                        let foundBed: {
                            nombre: string
                            variedad: string
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
                    // Clear selection when mouse is released
                    setSelectedCamas(new Set())
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
            <div ref={containerRef} className="w-full h-full flex items-center justify-center" />
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
        </div>
    )
}