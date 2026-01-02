/** Format time as HH:MM */
export const formatTime = (d: Date) => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

/** Format date as DD/MM/YYYY */
export const formatDate = (d: Date) => d.toLocaleDateString('es-ES')

/** Format duration between two dates */
export const formatDuration = (start: Date, end: Date) => {
    const mins = Math.round((end.getTime() - start.getTime()) / 60000)
    if (mins < 60) return `${mins}m`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/** Format percentage */
export const formatPct = (pct: number) => `${pct.toFixed(2)}%`
