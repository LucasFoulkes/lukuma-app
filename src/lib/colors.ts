export const COLORS: Record<string, string> = {
    'amarillo': '#FFD700', 'amarillo pálido': '#FFFFE0', 'arena': '#C2B280',
    'beige': '#F5F5DC', 'bicolor amarillo': '#FFD700', 'bicolor naranja': '#FF8C00',
    'bicolor rosa': '#FFB6C1', 'blanco': '#FAF8F0', 'caramelo': '#C68E17',
    'champaña': '#F7E7CE', 'coral': '#FF7F50', 'crema': '#FFFDD0',
    'durazno': '#FFDAB9', 'fucsia': '#FF00FF', 'lavanda': '#E6E6FA',
    'lavanda grisácea': '#C8A2C8', 'marfil': '#FFFFF0', 'naranja': '#FFA500',
    'pink xpresion': '#FF69B4', 'púrpura': '#800080', 'rojo': '#FF0000', 'rosa': '#FFC0CB',
    'rosa claro': '#FFB6C1', 'rosa concha': '#FFF5EE', 'rosa lavanda': '#FFF0F5',
    'rosa oscuro': '#FF1493', 'rosa pálido': '#FFE4E1', 'terracota': '#E2725B',
    'tiffany': '#0ABAB5'
}

// Darker versions for labels/lines on white background (keeping relationship to original)
const LABEL_COLOR_OVERRIDES: Record<string, string> = {
    'amarillo pálido': '#D4AF37', 'blanco': '#808080', 'crema': '#D4A574',
    'marfil': '#C9A86A', 'rosa concha': '#E0A9B4', 'rosa lavanda': '#D8A8BC',
    'rosa pálido': '#E8A0A0', 'beige': '#C4A57B', 'champaña': '#C9A861',
    'durazno': '#D99F77', 'lavanda': '#9B8FC2'
}

// Get the appropriate label color for a given color name
export function getLabelColor(colorName: string): string {
    // If there's a manual override, use it
    if (LABEL_COLOR_OVERRIDES[colorName]) {
        return LABEL_COLOR_OVERRIDES[colorName]
    }
    // Otherwise use the base color
    return COLORS[colorName] || '#999999'
}
