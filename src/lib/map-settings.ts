export type CamaLabelInterval = 'all' | 'start+intervals' | 'every5' | 'every10' | 'both' | 'none'

export interface MapSettings {
    showLabels: boolean
    compactView: boolean
    noGap: boolean
    whiteCenter: boolean
    showVariedadLabels: boolean
    coloredCamaLabels: boolean
    camaLabelInterval: CamaLabelInterval
}

export const DEFAULT_MAP_SETTINGS: MapSettings = {
    showLabels: false,
    compactView: true,
    noGap: true,
    whiteCenter: true,
    showVariedadLabels: false,
    coloredCamaLabels: false,
    camaLabelInterval: 'every10'
}
