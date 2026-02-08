/**
 * Authentic NES-style color palette for consistent retro visuals.
 * Based on the NES PPU color capabilities.
 */
export const NES_PALETTE = {
    // Browns (wood, furniture)
    WOOD_DARK: 0x6B4423,
    WOOD_MED: 0x8B5A2B,
    WOOD_LIGHT: 0xCD853F,
    WOOD_GRAIN: 0x5C3317,

    // Reds (carpet, accents, fire)
    RED_DARK: 0x8B0000,
    RED_MED: 0xB22222,
    RED_LIGHT: 0xDC143C,
    FIRE_ORANGE: 0xFF6B35,
    FIRE_YELLOW: 0xFFD93D,

    // Blues (office, tech, water)
    BLUE_DARK: 0x191970,
    BLUE_MED: 0x4169E1,
    BLUE_LIGHT: 0x6495ED,
    BLUE_SKY: 0x87CEEB,

    // Greens (plants, nasdaq, money)
    GREEN_DARK: 0x228B22,
    GREEN_MED: 0x32CD32,
    GREEN_LIGHT: 0x90EE90,
    GREEN_MONEY: 0x2E7D32,

    // Grays (concrete, metal, tech)
    GRAY_DARK: 0x2F4F4F,
    GRAY_MED: 0x696969,
    GRAY_LIGHT: 0xA9A9A9,
    GRAY_STEEL: 0x708090,

    // Warm tones (atmosphere, walls)
    CREAM: 0xFFFDD0,
    TAN: 0xD2B48C,
    BEIGE: 0xF5F5DC,
    PEACH: 0xFFDAB9,

    // Cool tones
    PURPLE_DARK: 0x4B0082,
    PURPLE_MED: 0x8B008B,
    TEAL: 0x008080,

    // Accents
    GOLD: 0xFFD700,
    WHITE: 0xF5F5F5,
    BLACK: 0x1A1A1A,
    OFF_WHITE: 0xFAFAFA,

    // Stone/brick
    STONE_DARK: 0x5A5A5A,
    STONE_LIGHT: 0x808080,
    BRICK_RED: 0x8B4513,
    BRICK_MORTAR: 0xC4A484,

    // Leather/executive
    LEATHER_DARK: 0x3C1414,
    LEATHER_MED: 0x654321,
    MAHOGANY: 0x420420
};

/**
 * Room-specific color schemes using the NES palette.
 */
export const ROOM_THEMES = {
    house: {
        background: 0x4A3728,
        floor: NES_PALETTE.WOOD_MED,
        walls: NES_PALETTE.TAN,
        accent: NES_PALETTE.RED_DARK
    },
    garage: {
        background: 0x3A3A3A,
        floor: NES_PALETTE.GRAY_MED,
        walls: NES_PALETTE.GRAY_DARK,
        accent: NES_PALETTE.RED_MED
    },
    accelerator: {
        background: 0x1A1A3A,
        floor: NES_PALETTE.GRAY_STEEL,
        walls: NES_PALETTE.OFF_WHITE,
        accent: NES_PALETTE.BLUE_MED
    },
    loft: {
        background: 0x4A4A3A,
        floor: NES_PALETTE.WOOD_LIGHT,
        walls: NES_PALETTE.CREAM,
        accent: NES_PALETTE.BLUE_MED
    },
    conference: {
        background: 0x3A2A1A,
        floor: NES_PALETTE.WOOD_DARK,
        walls: NES_PALETTE.BEIGE,
        accent: NES_PALETTE.GRAY_STEEL
    },
    boardRoom: {
        background: 0x2A1A1A,
        floor: NES_PALETTE.MAHOGANY,
        walls: NES_PALETTE.LEATHER_MED,
        accent: NES_PALETTE.GOLD
    },
    venture: {
        background: 0x2A2A2A,
        floor: NES_PALETTE.GRAY_DARK,
        walls: NES_PALETTE.GRAY_MED,
        accent: NES_PALETTE.BLUE_LIGHT
    },
    dataCenter: {
        background: 0x001122,
        floor: NES_PALETTE.GRAY_DARK,
        walls: NES_PALETTE.BLUE_DARK,
        accent: NES_PALETTE.TEAL
    },
    law: {
        background: 0x2A1A1A,
        floor: NES_PALETTE.WOOD_DARK,
        walls: NES_PALETTE.TAN,
        accent: NES_PALETTE.BLUE_DARK
    },
    nasdaq: {
        background: 0x1A3A1A,
        floor: NES_PALETTE.GREEN_MONEY,
        walls: NES_PALETTE.GRAY_MED,
        accent: NES_PALETTE.GREEN_LIGHT
    }
};

/**
 * Converts hex color to RGB object.
 * @param {number} hex - Hex color value
 * @returns {{r: number, g: number, b: number}} RGB values (0-255)
 */
export function hexToRgb(hex) {
    return {
        r: (hex >> 16) & 255,
        g: (hex >> 8) & 255,
        b: hex & 255
    };
}

/**
 * Converts hex color to CSS rgba string.
 * @param {number} hex - Hex color value
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} CSS rgba string
 */
export function hexToRgba(hex, alpha = 1) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Converts hex color to CSS hex string.
 * @param {number} hex - Hex color value
 * @returns {string} CSS hex string
 */
export function hexToString(hex) {
    return '#' + hex.toString(16).padStart(6, '0');
}

/**
 * Darkens a color by a percentage.
 * @param {number} hex - Hex color value
 * @param {number} percent - Percentage to darken (0-100)
 * @returns {number} Darkened hex color
 */
export function darken(hex, percent) {
    const { r, g, b } = hexToRgb(hex);
    const factor = 1 - (percent / 100);
    return (
        (Math.floor(r * factor) << 16) |
        (Math.floor(g * factor) << 8) |
        Math.floor(b * factor)
    );
}

/**
 * Lightens a color by a percentage.
 * @param {number} hex - Hex color value
 * @param {number} percent - Percentage to lighten (0-100)
 * @returns {number} Lightened hex color
 */
export function lighten(hex, percent) {
    const { r, g, b } = hexToRgb(hex);
    const factor = percent / 100;
    return (
        (Math.floor(r + (255 - r) * factor) << 16) |
        (Math.floor(g + (255 - g) * factor) << 8) |
        Math.floor(b + (255 - b) * factor)
    );
}
