"use client"

import { useEffect, useRef } from 'react'

interface BloqueMapProps {
    bloqueId: number
    bloqueName: string
    fincaName?: string
    camas?: any[]
}

const COLORS: Record<string, string> = {
    'amarillo': '#FFD700', 'amarillo pálido': '#FFFFE0', 'arena': '#C2B280',
    'beige': '#F5F5DC', 'bicolor amarillo': '#FFD700', 'bicolor naranja': '#FF8C00',
    'bicolor rosa': '#FFB6C1', 'blanco': '#FAF8F0', 'caramelo': '#C68E17',
    'champaña': '#F7E7CE', 'coral': '#FF7F50', 'crema': '#FFFDD0',
    'durazno': '#FFDAB9', 'fucsia': '#FF00FF', 'lavanda': '#E6E6FA',
    'lavanda grisácea': '#C8A2C8', 'marfil': '#FFFFF0', 'naranja': '#FFA500',
    'púrpura': '#800080', 'rojo': '#FF0000', 'rosa': '#FFC0CB',
    'rosa claro': '#FFB6C1', 'rosa concha': '#FFF5EE', 'rosa lavanda': '#FFF0F5',
    'rosa oscuro': '#FF1493', 'rosa pálido': '#FFE4E1', 'terracota': '#E2725B'
}

export function BloqueMap({ bloqueId, bloqueName, fincaName, camas = [] }: BloqueMapProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const p5Instance = useRef<any>(null)
    const resizeTimeoutRef = useRef<any>(null)

    useEffect(() => {
        if (!containerRef.current || camas.length === 0) return

        let mounted = true
        let resizeObserver: ResizeObserver | null = null

        // Sort beds by name (numeric sort)
        const sortedCamas = [...camas].sort((a, b) =>
            a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' })
        )

        // Single pass: enrich camas with computed fields
        const grupoMaxLengths = new Map<string, number>()
        const grupoColors = new Map<string, string>()
        let colorIndex = 0

        // First collect grupo info and max lengths per grupo per side
        sortedCamas.forEach((cama, i) => {
            const isOdd = (i + 1) % 2 === 1
            const side = isOdd ? 'L' : 'R'
            const length = cama.largo_metros || 36
            const grupoId = cama.grupo?.id_grupo
            const estado = cama.grupo?.estado?.toLowerCase()
            const variety = cama.variedad?.nombre || 'Sin variedad'

            const isProductivo = estado === 'productivo'
            const grupoKey = isProductivo ? `p_${variety}` : `g_${grupoId}`

            if (grupoId || isProductivo) {
                const sideKey = `${grupoKey}_${side}`
                grupoMaxLengths.set(sideKey, Math.max(grupoMaxLengths.get(sideKey) || 0, length))

                if (!grupoColors.has(grupoKey)) {
                    const hue = (colorIndex * 137.5) % 360
                    grupoColors.set(grupoKey, `hsl(${hue}, 70%, 50%)`)
                    colorIndex++
                }
            }
        })

        // Enrich beds
        const beds = sortedCamas.map((cama, i) => {
            const isOdd = (i + 1) % 2 === 1
            const side = isOdd ? 'L' : 'R'
            const length = cama.largo_metros || 36
            const grupoId = cama.grupo?.id_grupo
            const estado = cama.grupo?.estado?.toLowerCase()
            const variety = cama.variedad?.nombre || 'Sin variedad'
            const varietyColor = COLORS[cama.variedad?.color?.toLowerCase()] || '#999999'

            const isProductivo = estado === 'productivo'
            const grupoKey = isProductivo ? `p_${variety}` : `g_${grupoId}`
            const sideKey = `${grupoKey}_${side}`

            return {
                nombre: cama.nombre,
                index: i,
                isOdd,
                length,
                variety,
                varietyColor,
                grupoId,
                grupoKey,
                grupoColor: grupoColors.get(grupoKey) || '#999999',
                grupoMaxLength: grupoMaxLengths.get(sideKey) || length,
                grupoNombre: cama.grupo?.nombre || '',
                grupoEstado: cama.grupo?.estado || '',
                isProductivo
            }
        })

        const settings = {
            bedThickness: 10,
            rowSpacing: 14,
            baseScale: 8,
            centerGap: 20,
            lengthLineOffset: 30,
            grupoLineOffset: 80
        }

        import('p5').then((p5Module) => {
            if (!mounted || !containerRef.current) return

            const P5 = p5Module.default

            const sketch = (p: any) => {
                p.setup = () => {
                    const rect = containerRef.current?.getBoundingClientRect()
                    p.createCanvas(rect?.width || 900, rect?.height || 600)
                    p.noLoop()
                }

                p.draw = () => {
                    if (beds.length === 0) return

                    p.background(255)

                    const maxLength = Math.max(...beds.map(b => b.length))
                    const numRows = Math.ceil(beds.length / 2)

                    // Calculate width including beds, gaps, lines, and text labels
                    // Need space for: bed + lengthLineOffset + grupoLineOffset + text width
                    const naturalW = (maxLength * settings.baseScale + settings.lengthLineOffset + settings.grupoLineOffset + 200) * 2 + settings.centerGap
                    const naturalH = (numRows - 1) * settings.rowSpacing + settings.bedThickness + 15

                    const sf = Math.min(p.width / naturalW, p.height / naturalH, 1)
                    const scale = settings.baseScale * sf
                    const startY = (5 + settings.bedThickness / 2) * sf
                    const rowSp = settings.rowSpacing * sf
                    const bedH = settings.bedThickness * sf
                    const gap = settings.centerGap * sf
                    const centerX = p.width / 2

                    // Draw beds
                    beds.forEach((bed, i) => {
                        const row = Math.floor(i / 2)
                        const y = startY + row * rowSp
                        const bedW = bed.length * scale
                        const x = bed.isOdd ? centerX - gap - bedW : centerX + gap

                        // Bed background
                        p.noStroke()
                        const c = p.color(bed.varietyColor)
                        p.fill(p.red(c), p.green(c), p.blue(c), 255)
                        p.rect(x, y - bedH / 2, bedW, bedH)

                        // Dots
                        const brightness = p.red(c) * 0.299 + p.green(c) * 0.587 + p.blue(c) * 0.114
                        const dotGrey = brightness > 230 ? p.map(brightness, 230, 255, 255, 100) : 255
                        p.fill(dotGrey, dotGrey, dotGrey, 128)

                        for (let m = 0; m <= bed.length; m++) {
                            const size = m % 10 === 0 ? 2 : m % 5 === 0 ? 1.5 : 1
                            const dotX = bed.isOdd ? x + bedW - m * scale : x + m * scale
                            p.circle(dotX, y, size * 2 * sf)
                        }

                        // Bed label - position at the end of the bed (away from center)
                        p.fill(85)
                        p.textAlign(p.CENTER, p.CENTER)
                        p.textSize(12 * sf)
                        p.textStyle(p.NORMAL)
                        const labelX = bed.isOdd ? x - 13 * sf : x + bedW + 13 * sf
                        p.text(bed.nombre, labelX, y)
                    })

                    // Helper: draw segment lines and labels
                    const drawSegments = (
                        keyFn: (b: any) => string,
                        getX: (b: any, row: number) => number,
                        getColor: (b: any) => string,
                        thickness: number,
                        labelFn: (b: any) => string,
                        labelSize: number,
                        textColor?: (b: any) => string
                    ) => {
                        const segments: any[] = []
                        beds.forEach((bed, i) => {
                            const key = keyFn(bed)
                            if (!key) return

                            const prevI = i - 2
                            const isStart = prevI < 0 || keyFn(beds[prevI]) !== key || beds[prevI].isOdd !== bed.isOdd

                            if (isStart) {
                                let endI = i
                                while (endI + 2 < beds.length &&
                                    keyFn(beds[endI + 2]) === key &&
                                    beds[endI + 2].isOdd === bed.isOdd) {
                                    endI += 2
                                }
                                segments.push({ key, bed, startI: i, endI })
                            }
                        })

                        segments.forEach(seg => {
                            const startRow = Math.floor(seg.startI / 2)
                            const endRow = Math.floor(seg.endI / 2)
                            const y1 = startY + startRow * rowSp
                            const y2 = startY + endRow * rowSp
                            const lineX = getX(seg.bed, startRow)

                            p.stroke(getColor(seg.bed))
                            p.strokeWeight(thickness * sf)
                            if (seg.startI === seg.endI) {
                                p.line(lineX, y1 - bedH / 2, lineX, y1 + bedH / 2)
                            } else {
                                p.line(lineX, y1, lineX, y2)
                            }

                            p.noStroke()
                            p.fill(textColor ? textColor(seg.bed) : getColor(seg.bed))
                            p.textAlign(seg.bed.isOdd ? p.RIGHT : p.LEFT, p.CENTER)
                            p.textSize(labelSize * sf)
                            p.textStyle(labelSize > 15 ? p.BOLD : p.NORMAL)
                            const textOff = (labelSize > 15 ? 5 : 3) * sf
                            const labelX = seg.bed.isOdd ? lineX - textOff : lineX + textOff
                            p.text(labelFn(seg.bed), labelX, (y1 + y2) / 2)
                        })
                    }

                    // Length segments
                    drawSegments(
                        b => b.isOdd ? `${b.length}_L` : `${b.length}_R`,
                        (b) => {
                            const row = Math.floor(b.index / 2)
                            const bedW = b.length * scale
                            const bedX = b.isOdd ? centerX - gap - bedW : centerX + gap
                            return b.isOdd ? bedX - settings.lengthLineOffset * sf : bedX + bedW + settings.lengthLineOffset * sf
                        },
                        () => '#CCCCCC',
                        4,
                        b => `${b.length}m`,
                        12,
                        () => '#666'
                    )

                    // Grupo segments
                    drawSegments(
                        b => (b.grupoId || b.isProductivo) ? (b.isOdd ? `${b.grupoKey}_L` : `${b.grupoKey}_R`) : '',
                        (b) => {
                            const maxW = b.grupoMaxLength * scale
                            const maxX = b.isOdd ? centerX - gap - maxW : centerX + gap
                            return b.isOdd ? maxX - settings.grupoLineOffset * sf : maxX + maxW + settings.grupoLineOffset * sf
                        },
                        b => b.grupoColor,
                        6,
                        b => b.isProductivo ? b.variety : `${b.grupoNombre} | ${b.variety} | ${b.grupoEstado}`,
                        20
                    )
                }

                p.windowResized = () => {
                    if (resizeTimeoutRef.current) cancelAnimationFrame(resizeTimeoutRef.current)
                    resizeTimeoutRef.current = requestAnimationFrame(() => {
                        if (!containerRef.current) return
                        const rect = containerRef.current.getBoundingClientRect()
                        p.resizeCanvas(rect.width, rect.height)
                        p.redraw()
                    })
                }
            }

            p5Instance.current = new P5(sketch, containerRef.current)

            if (containerRef.current) {
                resizeObserver = new ResizeObserver(() => {
                    p5Instance.current?.windowResized()
                })
                resizeObserver.observe(containerRef.current)
            }
        })

        return () => {
            mounted = false
            if (resizeTimeoutRef.current) cancelAnimationFrame(resizeTimeoutRef.current)
            resizeObserver?.disconnect()
            p5Instance.current?.remove()
            p5Instance.current = null
        }
    }, [bloqueId, bloqueName, fincaName, camas])

    return <div ref={containerRef} className="w-full h-full" />
}