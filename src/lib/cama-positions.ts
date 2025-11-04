/**
 * Utility for managing cama position overrides in localStorage
 * Allows manual control of which side (left/right) a bed appears on the map
 */

const STORAGE_KEY = 'camaPositionOverrides'

export type CamaSide = 'L' | 'R'

interface PositionOverrides {
    [key: string]: CamaSide // Format: "bloqueId_camaName" -> "L" | "R"
}

/**
 * Get all position overrides from localStorage
 */
function getOverrides(): PositionOverrides {
    if (typeof window === 'undefined') return {}
    
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? JSON.parse(stored) : {}
    } catch (e) {
        console.error('Failed to load cama position overrides:', e)
        return {}
    }
}

/**
 * Save all position overrides to localStorage
 */
function saveOverrides(overrides: PositionOverrides): void {
    if (typeof window === 'undefined') return
    
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
    } catch (e) {
        console.error('Failed to save cama position overrides:', e)
    }
}

/**
 * Get the override position for a specific cama in a specific bloque
 * Returns undefined if no override exists (use default logic)
 */
export function getCamaPosition(bloqueId: number, camaName: string): CamaSide | undefined {
    const overrides = getOverrides()
    const key = `${bloqueId}_${camaName}`
    return overrides[key]
}

/**
 * Set the position override for a specific cama in a specific bloque
 */
export function setCamaPosition(bloqueId: number, camaName: string, side: CamaSide): void {
    const overrides = getOverrides()
    const key = `${bloqueId}_${camaName}`
    overrides[key] = side
    saveOverrides(overrides)
}

/**
 * Clear the position override for a specific cama (reverts to default odd/even logic)
 */
export function clearCamaPosition(bloqueId: number, camaName: string): void {
    const overrides = getOverrides()
    const key = `${bloqueId}_${camaName}`
    delete overrides[key]
    saveOverrides(overrides)
}

/**
 * Clear all position overrides for a specific bloque
 */
export function clearBloquePositions(bloqueId: number): void {
    const overrides = getOverrides()
    const prefix = `${bloqueId}_`
    
    // Remove all keys that start with this bloque's prefix
    Object.keys(overrides).forEach(key => {
        if (key.startsWith(prefix)) {
            delete overrides[key]
        }
    })
    
    saveOverrides(overrides)
}

/**
 * Get all position overrides for a specific bloque
 * Returns a map of camaName -> side
 */
export function getBloquePositions(bloqueId: number): Record<string, CamaSide> {
    const overrides = getOverrides()
    const prefix = `${bloqueId}_`
    const result: Record<string, CamaSide> = {}
    
    Object.entries(overrides).forEach(([key, side]) => {
        if (key.startsWith(prefix)) {
            const camaName = key.substring(prefix.length)
            result[camaName] = side
        }
    })
    
    return result
}

/**
 * Check if a cama has a position override
 */
export function hasPositionOverride(bloqueId: number, camaName: string): boolean {
    return getCamaPosition(bloqueId, camaName) !== undefined
}

/**
 * Clean up position overrides for camas that no longer exist in a bloque
 * @param bloqueId - The bloque to clean up
 * @param existingCamaNames - Array of cama names that currently exist in the bloque
 */
export function cleanupDeletedCamas(bloqueId: number, existingCamaNames: string[]): void {
    const overrides = getOverrides()
    const prefix = `${bloqueId}_`
    const existingSet = new Set(existingCamaNames)
    let cleaned = false
    
    Object.keys(overrides).forEach(key => {
        if (key.startsWith(prefix)) {
            const camaName = key.substring(prefix.length)
            // If this cama name is not in the existing camas list, remove the override
            if (!existingSet.has(camaName)) {
                delete overrides[key]
                cleaned = true
                console.log(`Cleaned up position override for deleted cama: ${camaName}`)
            }
        }
    })
    
    if (cleaned) {
        saveOverrides(overrides)
    }
}
