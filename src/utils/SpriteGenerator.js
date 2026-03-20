import * as THREE from 'three';
import { NES_PALETTE, hexToRgba, darken, lighten } from './NESPalette.js';

/**
 * Generates NES-style pixel art sprites and textures at runtime using Canvas API.
 * No external PNG files needed - all sprites are procedurally generated.
 */
export class SpriteGenerator {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Generates a canvas-based texture and converts to THREE.Texture.
     * @param {string} cacheKey - Unique key for caching
     * @param {number} width - Canvas width in pixels
     * @param {number} height - Canvas height in pixels
     * @param {Function} drawFunction - Function that draws on ctx
     * @returns {THREE.Texture} The generated texture
     */
    generateTexture(cacheKey, width, height, drawFunction) {
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        drawFunction(ctx, width, height);

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;

        this.cache.set(cacheKey, texture);
        return texture;
    }

    // ========== FLOOR TEXTURES ==========

    /**
     * Generates wood plank floor texture.
     * @returns {THREE.Texture}
     */
    generateWoodFloor() {
        return this.generateTexture('floor_wood', 32, 32, (ctx, w, h) => {
            // Base wood color
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_MED);
            ctx.fillRect(0, 0, w, h);

            // Wood planks (horizontal stripes)
            const plankHeight = 8;
            for (let y = 0; y < h; y += plankHeight) {
                // Plank border (darker line)
                ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
                ctx.fillRect(0, y, w, 1);

                // Slight color variation per plank
                const variation = (y / plankHeight) % 2 === 0 ? NES_PALETTE.WOOD_MED : darken(NES_PALETTE.WOOD_MED, 10);
                ctx.fillStyle = hexToRgba(variation);
                ctx.fillRect(0, y + 1, w, plankHeight - 2);

                // Wood grain lines
                ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_GRAIN, 0.3);
                for (let i = 0; i < 3; i++) {
                    const grainY = y + 2 + i * 2;
                    ctx.fillRect(0, grainY, w, 1);
                }
            }

            // Knot detail
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
            ctx.beginPath();
            ctx.arc(20, 12, 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /**
     * Generates concrete floor texture.
     * @returns {THREE.Texture}
     */
    generateConcreteFloor() {
        return this.generateTexture('floor_concrete', 32, 32, (ctx, w, h) => {
            // Base gray
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_MED);
            ctx.fillRect(0, 0, w, h);

            // Random noise for texture
            for (let x = 0; x < w; x += 2) {
                for (let y = 0; y < h; y += 2) {
                    if (Math.random() > 0.7) {
                        const shade = Math.random() > 0.5 ? NES_PALETTE.GRAY_LIGHT : NES_PALETTE.GRAY_DARK;
                        ctx.fillStyle = hexToRgba(shade, 0.3);
                        ctx.fillRect(x, y, 2, 2);
                    }
                }
            }

            // Crack lines
            ctx.strokeStyle = hexToRgba(NES_PALETTE.GRAY_DARK, 0.5);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(5, 0);
            ctx.lineTo(8, 10);
            ctx.lineTo(12, 18);
            ctx.lineTo(10, 32);
            ctx.stroke();

            // Oil stain
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.3);
            ctx.beginPath();
            ctx.ellipse(22, 24, 4, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /**
     * Generates carpet texture.
     * @returns {THREE.Texture}
     */
    generateCarpetFloor() {
        return this.generateTexture('floor_carpet', 32, 32, (ctx, w, h) => {
            // Base carpet red
            ctx.fillStyle = hexToRgba(NES_PALETTE.RED_DARK);
            ctx.fillRect(0, 0, w, h);

            // Diamond pattern
            ctx.fillStyle = hexToRgba(darken(NES_PALETTE.RED_DARK, 20));
            for (let x = 0; x < w; x += 8) {
                for (let y = 0; y < h; y += 8) {
                    // Draw diamond
                    ctx.beginPath();
                    ctx.moveTo(x + 4, y);
                    ctx.lineTo(x + 8, y + 4);
                    ctx.lineTo(x + 4, y + 8);
                    ctx.lineTo(x, y + 4);
                    ctx.closePath();
                    ctx.fill();
                }
            }

            // Decorative border dots
            ctx.fillStyle = hexToRgba(NES_PALETTE.GOLD, 0.6);
            ctx.fillRect(0, 0, 2, 2);
            ctx.fillRect(30, 0, 2, 2);
            ctx.fillRect(0, 30, 2, 2);
            ctx.fillRect(30, 30, 2, 2);
        });
    }

    /**
     * Generates office tile floor texture.
     * @returns {THREE.Texture}
     */
    generateOfficeTileFloor() {
        return this.generateTexture('floor_office_tile', 32, 32, (ctx, w, h) => {
            // Base color
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_STEEL);
            ctx.fillRect(0, 0, w, h);

            // Checkerboard pattern
            ctx.fillStyle = hexToRgba(lighten(NES_PALETTE.GRAY_STEEL, 15));
            ctx.fillRect(0, 0, 16, 16);
            ctx.fillRect(16, 16, 16, 16);

            // Tile grout lines
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK);
            ctx.fillRect(15, 0, 2, 32);
            ctx.fillRect(0, 15, 32, 2);
        });
    }

    /**
     * Generates marble floor texture.
     * @returns {THREE.Texture}
     */
    generateMarbleFloor() {
        return this.generateTexture('floor_marble', 32, 32, (ctx, w, h) => {
            // Base cream color
            ctx.fillStyle = hexToRgba(NES_PALETTE.CREAM);
            ctx.fillRect(0, 0, w, h);

            // Marble veins
            ctx.strokeStyle = hexToRgba(NES_PALETTE.GRAY_LIGHT, 0.4);
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.moveTo(0, 8);
            ctx.quadraticCurveTo(16, 12, 32, 6);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(5, 32);
            ctx.quadraticCurveTo(12, 20, 28, 24);
            ctx.stroke();

            // Slight tile border
            ctx.strokeStyle = hexToRgba(NES_PALETTE.TAN, 0.5);
            ctx.strokeRect(1, 1, 30, 30);
        });
    }

    /**
     * Generates green financial tile floor.
     * @returns {THREE.Texture}
     */
    generateGreenTileFloor() {
        return this.generateTexture('floor_green_tile', 32, 32, (ctx, w, h) => {
            // Base green
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_MONEY);
            ctx.fillRect(0, 0, w, h);

            // Checkerboard
            ctx.fillStyle = hexToRgba(darken(NES_PALETTE.GREEN_MONEY, 15));
            ctx.fillRect(0, 0, 16, 16);
            ctx.fillRect(16, 16, 16, 16);

            // Gold accent lines
            ctx.strokeStyle = hexToRgba(NES_PALETTE.GOLD, 0.4);
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, 32, 32);
        });
    }

    // ========== OVERWORLD TERRAIN TEXTURES ==========

    /**
     * Generates grass texture with subtle variation for overworld.
     * @returns {THREE.Texture}
     */
    generateGrassTexture() {
        return this.generateTexture('terrain_grass', 32, 32, (ctx, w, h) => {
            // Base grass green
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_MED);
            ctx.fillRect(0, 0, w, h);

            // Grass variation patches
            for (let i = 0; i < 8; i++) {
                const x = Math.floor(Math.random() * w);
                const y = Math.floor(Math.random() * h);
                ctx.fillStyle = hexToRgba(darken(NES_PALETTE.GREEN_MED, 10), 0.5);
                ctx.fillRect(x, y, 4, 4);
            }

            // Light grass highlights
            for (let i = 0; i < 6; i++) {
                const x = Math.floor(Math.random() * w);
                const y = Math.floor(Math.random() * h);
                ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_LIGHT, 0.4);
                ctx.fillRect(x, y, 2, 2);
            }

            // Small grass blades
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_DARK, 0.3);
            for (let x = 0; x < w; x += 6) {
                ctx.fillRect(x, 4, 1, 3);
                ctx.fillRect(x + 3, 18, 1, 3);
            }
        });
    }

    /**
     * Generates cobblestone texture for town square.
     * @returns {THREE.Texture}
     */
    generateCobblestone() {
        return this.generateTexture('terrain_cobblestone', 32, 32, (ctx, w, h) => {
            // Mortar base
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK);
            ctx.fillRect(0, 0, w, h);

            // Cobblestone pattern
            const stones = [
                { x: 1, y: 1, w: 8, h: 6 },
                { x: 11, y: 1, w: 9, h: 7 },
                { x: 22, y: 1, w: 8, h: 6 },
                { x: 1, y: 9, w: 10, h: 6 },
                { x: 13, y: 10, w: 8, h: 5 },
                { x: 23, y: 9, w: 7, h: 6 },
                { x: 2, y: 17, w: 7, h: 7 },
                { x: 11, y: 17, w: 10, h: 6 },
                { x: 23, y: 17, w: 7, h: 7 },
                { x: 1, y: 26, w: 9, h: 5 },
                { x: 12, y: 25, w: 8, h: 6 },
                { x: 22, y: 26, w: 8, h: 5 }
            ];

            stones.forEach(stone => {
                // Stone fill with variation
                const shade = Math.random() > 0.5 ? NES_PALETTE.GRAY_MED : NES_PALETTE.GRAY_LIGHT;
                ctx.fillStyle = hexToRgba(shade);
                ctx.fillRect(stone.x, stone.y, stone.w, stone.h);

                // Stone highlight (top-left)
                ctx.fillStyle = hexToRgba(lighten(shade, 20), 0.4);
                ctx.fillRect(stone.x, stone.y, stone.w, 1);
                ctx.fillRect(stone.x, stone.y, 1, stone.h);

                // Stone shadow (bottom-right)
                ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK, 0.5);
                ctx.fillRect(stone.x, stone.y + stone.h - 1, stone.w, 1);
                ctx.fillRect(stone.x + stone.w - 1, stone.y, 1, stone.h);
            });
        });
    }

    /**
     * Generates marble tile texture for Nasdaq plaza.
     * @returns {THREE.Texture}
     */
    generateMarbleTile() {
        return this.generateTexture('terrain_marble_tile', 32, 32, (ctx, w, h) => {
            // Base white marble
            ctx.fillStyle = hexToRgba(NES_PALETTE.OFF_WHITE);
            ctx.fillRect(0, 0, w, h);

            // Marble veins
            ctx.strokeStyle = hexToRgba(NES_PALETTE.GRAY_LIGHT, 0.3);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, 6);
            ctx.quadraticCurveTo(12, 10, 32, 4);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(4, 32);
            ctx.quadraticCurveTo(16, 20, 28, 28);
            ctx.stroke();

            // Subtle green marble veins (money theme)
            ctx.strokeStyle = hexToRgba(NES_PALETTE.GREEN_MONEY, 0.15);
            ctx.beginPath();
            ctx.moveTo(0, 20);
            ctx.quadraticCurveTo(20, 16, 32, 22);
            ctx.stroke();

            // Tile border
            ctx.strokeStyle = hexToRgba(NES_PALETTE.TAN, 0.4);
            ctx.strokeRect(0, 0, 32, 32);

            // Corner accent
            ctx.fillStyle = hexToRgba(NES_PALETTE.GOLD, 0.2);
            ctx.fillRect(0, 0, 2, 2);
            ctx.fillRect(30, 0, 2, 2);
            ctx.fillRect(0, 30, 2, 2);
            ctx.fillRect(30, 30, 2, 2);
        });
    }

    /**
     * Generates sand texture for beach areas.
     * @returns {THREE.Texture}
     */
    generateSandTexture() {
        return this.generateTexture('terrain_sand', 32, 32, (ctx, w, h) => {
            // Base sand color
            ctx.fillStyle = hexToRgba(NES_PALETTE.TAN);
            ctx.fillRect(0, 0, w, h);

            // Sand grain variation
            for (let i = 0; i < 20; i++) {
                const x = Math.floor(Math.random() * w);
                const y = Math.floor(Math.random() * h);
                const shade = Math.random() > 0.5 ?
                    darken(NES_PALETTE.TAN, 10) :
                    lighten(NES_PALETTE.TAN, 10);
                ctx.fillStyle = hexToRgba(shade, 0.4);
                ctx.fillRect(x, y, 2, 2);
            }

            // Shell/pebble details
            ctx.fillStyle = hexToRgba(NES_PALETTE.CREAM, 0.6);
            ctx.fillRect(8, 12, 2, 2);
            ctx.fillRect(22, 6, 3, 2);
            ctx.fillRect(14, 24, 2, 2);

            // Darker wet sand patches
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_MED, 0.2);
            ctx.fillRect(2, 26, 6, 4);
            ctx.fillRect(20, 28, 8, 4);
        });
    }

    /**
     * Generates water texture for bay area.
     * @returns {THREE.Texture}
     */
    generateWaterTexture() {
        return this.generateTexture('terrain_water', 32, 32, (ctx, w, h) => {
            // Deep water base
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_MED);
            ctx.fillRect(0, 0, w, h);

            // Wave patterns (horizontal lines)
            ctx.strokeStyle = hexToRgba(NES_PALETTE.BLUE_LIGHT, 0.4);
            ctx.lineWidth = 2;
            for (let y = 4; y < h; y += 8) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.quadraticCurveTo(8, y - 2, 16, y);
                ctx.quadraticCurveTo(24, y + 2, 32, y);
                ctx.stroke();
            }

            // Sparkle highlights
            ctx.fillStyle = hexToRgba(NES_PALETTE.WHITE, 0.6);
            ctx.fillRect(6, 6, 2, 2);
            ctx.fillRect(20, 14, 2, 2);
            ctx.fillRect(12, 22, 2, 2);
            ctx.fillRect(26, 26, 2, 2);

            // Darker depth areas
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_DARK, 0.3);
            ctx.fillRect(0, 0, 32, 4);
            ctx.fillRect(0, 28, 32, 4);
        });
    }

    /**
     * Generates dirt path texture.
     * @returns {THREE.Texture}
     */
    generateDirtPath() {
        return this.generateTexture('terrain_dirt_path', 32, 32, (ctx, w, h) => {
            // Base dirt color
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_GRAIN);
            ctx.fillRect(0, 0, w, h);

            // Path texture variation
            for (let i = 0; i < 15; i++) {
                const x = Math.floor(Math.random() * w);
                const y = Math.floor(Math.random() * h);
                ctx.fillStyle = hexToRgba(darken(NES_PALETTE.WOOD_GRAIN, 15), 0.4);
                ctx.fillRect(x, y, 3, 2);
            }

            // Lighter worn areas
            ctx.fillStyle = hexToRgba(NES_PALETTE.TAN, 0.3);
            ctx.fillRect(10, 8, 12, 16);

            // Pebbles
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_MED, 0.5);
            ctx.fillRect(4, 6, 2, 2);
            ctx.fillRect(18, 20, 2, 2);
            ctx.fillRect(26, 12, 2, 2);

            // Edge definition
            ctx.fillStyle = hexToRgba(darken(NES_PALETTE.WOOD_GRAIN, 25), 0.6);
            ctx.fillRect(0, 0, 2, h);
            ctx.fillRect(w - 2, 0, 2, h);
        });
    }

    // ========== WALL TEXTURES ==========

    /**
     * Generates wood paneling wall texture.
     * @returns {THREE.Texture}
     */
    generateWoodPanelWall() {
        return this.generateTexture('wall_wood_panel', 32, 32, (ctx, w, h) => {
            // Base wood
            ctx.fillStyle = hexToRgba(NES_PALETTE.TAN);
            ctx.fillRect(0, 0, w, h);

            // Vertical panels
            const panelWidth = 8;
            for (let x = 0; x < w; x += panelWidth) {
                // Panel shadow (left edge)
                ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK, 0.4);
                ctx.fillRect(x, 0, 1, h);

                // Panel highlight (right edge)
                ctx.fillStyle = hexToRgba(NES_PALETTE.CREAM, 0.3);
                ctx.fillRect(x + panelWidth - 1, 0, 1, h);

                // Grain lines
                ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_MED, 0.2);
                ctx.fillRect(x + 2, 0, 1, h);
                ctx.fillRect(x + 5, 0, 1, h);
            }

            // Baseboard
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
            ctx.fillRect(0, h - 4, w, 4);
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_GRAIN);
            ctx.fillRect(0, h - 4, w, 1);
        });
    }

    /**
     * Generates brick wall texture.
     * @returns {THREE.Texture}
     */
    generateBrickWall() {
        return this.generateTexture('wall_brick', 32, 32, (ctx, w, h) => {
            // Mortar base
            ctx.fillStyle = hexToRgba(NES_PALETTE.BRICK_MORTAR);
            ctx.fillRect(0, 0, w, h);

            // Brick pattern
            const brickWidth = 14;
            const brickHeight = 6;
            const mortarGap = 2;

            for (let row = 0; row < 5; row++) {
                const y = row * (brickHeight + mortarGap);
                const offset = (row % 2) * (brickWidth / 2 + mortarGap / 2);

                for (let x = -brickWidth; x < w + brickWidth; x += brickWidth + mortarGap) {
                    const brickX = x + offset;
                    if (brickX + brickWidth > 0 && brickX < w) {
                        // Brick color with slight variation
                        const shade = Math.random() > 0.5 ? NES_PALETTE.BRICK_RED : darken(NES_PALETTE.BRICK_RED, 10);
                        ctx.fillStyle = hexToRgba(shade);
                        ctx.fillRect(brickX, y, brickWidth, brickHeight);

                        // Brick highlight
                        ctx.fillStyle = hexToRgba(lighten(NES_PALETTE.BRICK_RED, 20), 0.3);
                        ctx.fillRect(brickX, y, brickWidth, 1);
                    }
                }
            }
        });
    }

    /**
     * Generates office wall texture.
     * @returns {THREE.Texture}
     */
    generateOfficeWall() {
        return this.generateTexture('wall_office', 32, 32, (ctx, w, h) => {
            // Base beige
            ctx.fillStyle = hexToRgba(NES_PALETTE.BEIGE);
            ctx.fillRect(0, 0, w, h);

            // Subtle texture
            for (let x = 0; x < w; x += 4) {
                for (let y = 0; y < h; y += 4) {
                    if (Math.random() > 0.8) {
                        ctx.fillStyle = hexToRgba(NES_PALETTE.CREAM, 0.3);
                        ctx.fillRect(x, y, 2, 2);
                    }
                }
            }

            // Baseboard
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_MED);
            ctx.fillRect(0, h - 3, w, 3);
            ctx.fillStyle = hexToRgba(NES_PALETTE.WHITE, 0.5);
            ctx.fillRect(0, h - 3, w, 1);
        });
    }

    // ========== FURNITURE SPRITES ==========

    /**
     * Generates dining table sprite (top-down view).
     * @returns {THREE.Texture}
     */
    generateDiningTable() {
        return this.generateTexture('furniture_dining_table', 64, 48, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.3);
            ctx.fillRect(4, 4, w - 4, h - 4);

            // Table top
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_MED);
            ctx.fillRect(0, 0, w - 4, h - 4);

            // Table edge highlight
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_LIGHT);
            ctx.fillRect(0, 0, w - 4, 2);
            ctx.fillRect(0, 0, 2, h - 4);

            // Table edge shadow
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
            ctx.fillRect(0, h - 6, w - 4, 2);
            ctx.fillRect(w - 6, 0, 2, h - 4);

            // Wood grain
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_GRAIN, 0.3);
            for (let y = 6; y < h - 8; y += 4) {
                ctx.fillRect(4, y, w - 12, 1);
            }

            // Center runner
            ctx.fillStyle = hexToRgba(NES_PALETTE.RED_DARK, 0.6);
            ctx.fillRect(w / 2 - 8, 4, 16, h - 12);
        });
    }

    /**
     * Generates desk sprite (top-down view).
     * @returns {THREE.Texture}
     */
    generateDesk() {
        return this.generateTexture('furniture_desk', 48, 32, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.3);
            ctx.fillRect(3, 3, w - 3, h - 3);

            // Desk top
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_MED);
            ctx.fillRect(0, 0, w - 3, h - 3);

            // Edge details
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_LIGHT);
            ctx.fillRect(0, 0, w - 3, 2);

            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
            ctx.fillRect(0, h - 5, w - 3, 2);

            // Drawer lines
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK, 0.5);
            ctx.fillRect(4, h - 12, w - 10, 1);
            ctx.fillRect(4, h - 8, w - 10, 1);

            // Drawer handle
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_STEEL);
            ctx.fillRect(w / 2 - 4, h - 10, 8, 2);
        });
    }

    /**
     * Generates chair sprite (top-down view).
     * @returns {THREE.Texture}
     */
    generateChair() {
        return this.generateTexture('furniture_chair', 24, 24, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.3);
            ctx.fillRect(3, 3, w - 3, h - 3);

            // Seat
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_MED);
            ctx.fillRect(2, 6, w - 5, h - 8);

            // Backrest
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
            ctx.fillRect(2, 0, w - 5, 6);

            // Seat highlight
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_LIGHT, 0.5);
            ctx.fillRect(4, 8, w - 9, 2);
        });
    }

    /**
     * Generates couch sprite (top-down view).
     * @returns {THREE.Texture}
     */
    generateCouch() {
        return this.generateTexture('furniture_couch', 64, 32, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.3);
            ctx.fillRect(4, 4, w - 4, h - 4);

            // Base
            ctx.fillStyle = hexToRgba(NES_PALETTE.LEATHER_MED);
            ctx.fillRect(0, 0, w - 4, h - 4);

            // Backrest
            ctx.fillStyle = hexToRgba(NES_PALETTE.LEATHER_DARK);
            ctx.fillRect(0, 0, w - 4, 8);

            // Cushion lines
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.3);
            ctx.fillRect(w / 3 - 2, 10, 2, h - 16);
            ctx.fillRect(2 * w / 3 - 4, 10, 2, h - 16);

            // Armrests
            ctx.fillStyle = hexToRgba(NES_PALETTE.LEATHER_DARK);
            ctx.fillRect(0, 0, 6, h - 4);
            ctx.fillRect(w - 10, 0, 6, h - 4);

            // Pillows
            ctx.fillStyle = hexToRgba(NES_PALETTE.RED_DARK);
            ctx.fillRect(8, 4, 8, 6);
            ctx.fillRect(w - 20, 4, 8, 6);
        });
    }

    /**
     * Generates bookshelf sprite (top-down view).
     * @returns {THREE.Texture}
     */
    generateBookshelf() {
        return this.generateTexture('furniture_bookshelf', 16, 48, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.3);
            ctx.fillRect(2, 2, w - 2, h - 2);

            // Frame
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
            ctx.fillRect(0, 0, w - 2, h - 2);

            // Back panel
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_GRAIN);
            ctx.fillRect(2, 2, w - 6, h - 6);

            // Shelves
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
            for (let y = 10; y < h - 4; y += 12) {
                ctx.fillRect(2, y, w - 6, 2);
            }

            // Books (colored spines)
            const bookColors = [NES_PALETTE.RED_MED, NES_PALETTE.BLUE_MED, NES_PALETTE.GREEN_MED, NES_PALETTE.GOLD];
            for (let shelf = 0; shelf < 3; shelf++) {
                const shelfY = 2 + shelf * 12;
                for (let b = 0; b < 4; b++) {
                    ctx.fillStyle = hexToRgba(bookColors[(shelf + b) % bookColors.length]);
                    ctx.fillRect(3 + b * 3, shelfY + 1, 2, 8);
                }
            }
        });
    }

    /**
     * Generates fireplace sprite (top-down view).
     * @returns {THREE.Texture}
     */
    generateFireplace() {
        return this.generateTexture('furniture_fireplace', 48, 24, (ctx, w, h) => {
            // Stone hearth
            ctx.fillStyle = hexToRgba(NES_PALETTE.STONE_DARK);
            ctx.fillRect(0, 0, w, h);

            // Inner stone
            ctx.fillStyle = hexToRgba(NES_PALETTE.STONE_LIGHT);
            ctx.fillRect(4, 4, w - 8, h - 8);

            // Fire opening
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK);
            ctx.fillRect(8, 6, w - 16, h - 10);

            // Fire glow
            ctx.fillStyle = hexToRgba(NES_PALETTE.FIRE_ORANGE, 0.8);
            ctx.fillRect(12, 8, w - 24, h - 14);

            // Flame shapes
            ctx.fillStyle = hexToRgba(NES_PALETTE.FIRE_YELLOW);
            ctx.beginPath();
            ctx.moveTo(w / 2 - 4, h - 6);
            ctx.lineTo(w / 2, 8);
            ctx.lineTo(w / 2 + 4, h - 6);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(w / 2 - 10, h - 6);
            ctx.lineTo(w / 2 - 6, 10);
            ctx.lineTo(w / 2 - 2, h - 6);
            ctx.fill();

            // Mantle
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
            ctx.fillRect(0, 0, w, 3);
        });
    }

    /**
     * Generates workbench sprite (top-down view).
     * @returns {THREE.Texture}
     */
    generateWorkbench() {
        return this.generateTexture('furniture_workbench', 64, 32, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.3);
            ctx.fillRect(3, 3, w - 3, h - 3);

            // Metal top
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_STEEL);
            ctx.fillRect(0, 0, w - 3, h - 3);

            // Edge
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK);
            ctx.fillRect(0, h - 5, w - 3, 2);

            // Tool outlines
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.4);
            // Wrench
            ctx.fillRect(8, 4, 12, 3);
            ctx.fillRect(6, 3, 4, 5);
            // Screwdriver
            ctx.fillRect(24, 6, 16, 2);
            ctx.fillRect(24, 5, 6, 4);
            // Pliers
            ctx.fillRect(44, 4, 8, 6);

            // Vise
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK);
            ctx.fillRect(w - 18, h - 12, 12, 8);
        });
    }

    /**
     * Generates server rack sprite (top-down view).
     * @returns {THREE.Texture}
     */
    generateServerRack() {
        return this.generateTexture('furniture_server_rack', 24, 24, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.3);
            ctx.fillRect(3, 3, w - 3, h - 3);

            // Rack body
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK);
            ctx.fillRect(0, 0, w - 3, h - 3);

            // Server units
            for (let y = 2; y < h - 5; y += 5) {
                ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK);
                ctx.fillRect(2, y, w - 7, 4);

                // LED lights
                ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_LIGHT);
                ctx.fillRect(3, y + 1, 2, 2);

                ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_LIGHT);
                ctx.fillRect(6, y + 1, 2, 2);
            }

            // Ventilation
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_MED);
            ctx.fillRect(w - 7, 2, 4, h - 7);
        });
    }

    /**
     * Generates car sprite (top-down view).
     * @returns {THREE.Texture}
     */
    generateCar() {
        return this.generateTexture('furniture_car', 96, 48, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.4);
            ctx.fillRect(6, 6, w - 6, h - 6);

            // Car body
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_MED);
            ctx.fillRect(4, 8, w - 10, h - 16);

            // Hood/trunk (lighter)
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_LIGHT);
            ctx.fillRect(4, 8, 20, h - 16);
            ctx.fillRect(w - 26, 8, 20, h - 16);

            // Roof (cabin)
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_DARK);
            ctx.fillRect(28, 12, 40, h - 24);

            // Windows
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_SKY);
            ctx.fillRect(30, 14, 16, h - 28);
            ctx.fillRect(50, 14, 16, h - 28);

            // Wheels
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK);
            ctx.fillRect(12, 4, 12, 6);
            ctx.fillRect(12, h - 10, 12, 6);
            ctx.fillRect(w - 28, 4, 12, 6);
            ctx.fillRect(w - 28, h - 10, 12, 6);

            // Headlights
            ctx.fillStyle = hexToRgba(NES_PALETTE.FIRE_YELLOW);
            ctx.fillRect(2, 12, 3, 4);
            ctx.fillRect(2, h - 16, 3, 4);

            // Taillights
            ctx.fillStyle = hexToRgba(NES_PALETTE.RED_MED);
            ctx.fillRect(w - 7, 12, 3, 4);
            ctx.fillRect(w - 7, h - 16, 3, 4);
        });
    }

    /**
     * Generates plant sprite (top-down view).
     * @returns {THREE.Texture}
     */
    generatePlant() {
        return this.generateTexture('furniture_plant', 24, 24, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.2);
            ctx.beginPath();
            ctx.ellipse(w / 2 + 2, h / 2 + 2, 10, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pot
            ctx.fillStyle = hexToRgba(NES_PALETTE.BRICK_RED);
            ctx.fillRect(w / 2 - 5, h / 2 - 4, 10, 8);

            // Pot rim
            ctx.fillStyle = hexToRgba(darken(NES_PALETTE.BRICK_RED, 20));
            ctx.fillRect(w / 2 - 6, h / 2 - 4, 12, 2);

            // Soil
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_GRAIN);
            ctx.fillRect(w / 2 - 4, h / 2 - 3, 8, 2);

            // Leaves
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_MED);
            const leaves = [
                [w / 2, h / 2 - 6, 4],
                [w / 2 - 5, h / 2 - 4, 3],
                [w / 2 + 5, h / 2 - 4, 3],
                [w / 2 - 3, h / 2 - 8, 3],
                [w / 2 + 3, h / 2 - 8, 3]
            ];
            leaves.forEach(([x, y, r]) => {
                ctx.beginPath();
                ctx.ellipse(x, y, r, r * 1.5, 0, 0, Math.PI * 2);
                ctx.fill();
            });

            // Leaf highlights
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_LIGHT, 0.5);
            ctx.fillRect(w / 2 - 1, h / 2 - 8, 2, 2);
        });
    }

    /**
     * Generates decorative rug sprite.
     * @returns {THREE.Texture}
     */
    generateRug() {
        return this.generateTexture('furniture_rug', 96, 64, (ctx, w, h) => {
            // Main rug color
            ctx.fillStyle = hexToRgba(NES_PALETTE.RED_DARK);
            ctx.fillRect(0, 0, w, h);

            // Border
            ctx.fillStyle = hexToRgba(NES_PALETTE.GOLD);
            ctx.fillRect(0, 0, w, 4);
            ctx.fillRect(0, h - 4, w, 4);
            ctx.fillRect(0, 0, 4, h);
            ctx.fillRect(w - 4, 0, 4, h);

            // Inner border
            ctx.fillStyle = hexToRgba(NES_PALETTE.RED_MED);
            ctx.fillRect(6, 6, w - 12, 2);
            ctx.fillRect(6, h - 8, w - 12, 2);
            ctx.fillRect(6, 6, 2, h - 12);
            ctx.fillRect(w - 8, 6, 2, h - 12);

            // Center medallion
            ctx.fillStyle = hexToRgba(NES_PALETTE.GOLD, 0.7);
            ctx.beginPath();
            ctx.ellipse(w / 2, h / 2, 16, 12, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = hexToRgba(NES_PALETTE.RED_DARK);
            ctx.beginPath();
            ctx.ellipse(w / 2, h / 2, 10, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            // Corner ornaments
            const corners = [[12, 12], [w - 12, 12], [12, h - 12], [w - 12, h - 12]];
            ctx.fillStyle = hexToRgba(NES_PALETTE.GOLD);
            corners.forEach(([x, y]) => {
                ctx.fillRect(x - 3, y - 3, 6, 6);
            });

            // Fringe at ends
            ctx.fillStyle = hexToRgba(NES_PALETTE.GOLD, 0.6);
            for (let x = 4; x < w - 4; x += 4) {
                ctx.fillRect(x, 0, 2, 2);
                ctx.fillRect(x, h - 2, 2, 2);
            }
        });
    }

    // ========== DECORATIVE ELEMENTS ==========

    /**
     * Generates window sprite.
     * @returns {THREE.Texture}
     */
    generateWindow() {
        return this.generateTexture('decor_window', 32, 32, (ctx, w, h) => {
            // Frame
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
            ctx.fillRect(0, 0, w, h);

            // Glass panes
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_SKY);
            ctx.fillRect(3, 3, 12, 12);
            ctx.fillRect(17, 3, 12, 12);
            ctx.fillRect(3, 17, 12, 12);
            ctx.fillRect(17, 17, 12, 12);

            // Glass shine
            ctx.fillStyle = hexToRgba(NES_PALETTE.WHITE, 0.4);
            ctx.fillRect(4, 4, 4, 2);
            ctx.fillRect(18, 4, 4, 2);

            // Center cross
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
            ctx.fillRect(14, 0, 4, h);
            ctx.fillRect(0, 14, w, 4);
        });
    }

    /**
     * Generates picture frame sprite.
     * @returns {THREE.Texture}
     */
    generatePictureFrame() {
        return this.generateTexture('decor_picture_frame', 24, 24, (ctx, w, h) => {
            // Frame
            ctx.fillStyle = hexToRgba(NES_PALETTE.GOLD);
            ctx.fillRect(0, 0, w, h);

            // Inner frame shadow
            ctx.fillStyle = hexToRgba(darken(NES_PALETTE.GOLD, 30));
            ctx.fillRect(2, 2, w - 4, h - 4);

            // Picture area
            ctx.fillStyle = hexToRgba(NES_PALETTE.CREAM);
            ctx.fillRect(4, 4, w - 8, h - 8);

            // Abstract art inside
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_MED);
            ctx.fillRect(6, 8, 6, 8);

            ctx.fillStyle = hexToRgba(NES_PALETTE.RED_MED);
            ctx.fillRect(10, 6, 6, 6);

            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_MED);
            ctx.beginPath();
            ctx.arc(12, 14, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /**
     * Generates lamp sprite.
     * @returns {THREE.Texture}
     */
    generateLamp() {
        return this.generateTexture('decor_lamp', 16, 16, (ctx, w, h) => {
            // Glow effect
            const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 8);
            gradient.addColorStop(0, hexToRgba(NES_PALETTE.FIRE_YELLOW, 0.6));
            gradient.addColorStop(0.5, hexToRgba(NES_PALETTE.FIRE_ORANGE, 0.3));
            gradient.addColorStop(1, hexToRgba(NES_PALETTE.FIRE_ORANGE, 0));
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);

            // Lamp base
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_STEEL);
            ctx.fillRect(w / 2 - 2, h / 2 + 2, 4, 4);

            // Lamp shade
            ctx.fillStyle = hexToRgba(NES_PALETTE.CREAM);
            ctx.beginPath();
            ctx.moveTo(w / 2 - 4, h / 2 + 2);
            ctx.lineTo(w / 2, h / 2 - 4);
            ctx.lineTo(w / 2 + 4, h / 2 + 2);
            ctx.closePath();
            ctx.fill();
        });
    }

    /**
     * Generates whiteboard sprite.
     * @returns {THREE.Texture}
     */
    generateWhiteboard() {
        return this.generateTexture('decor_whiteboard', 48, 32, (ctx, w, h) => {
            // Frame
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_LIGHT);
            ctx.fillRect(0, 0, w, h);

            // Board surface
            ctx.fillStyle = hexToRgba(NES_PALETTE.WHITE);
            ctx.fillRect(2, 2, w - 4, h - 4);

            // Marker writings (scribbles)
            ctx.strokeStyle = hexToRgba(NES_PALETTE.BLUE_MED);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(6, 8);
            ctx.lineTo(18, 8);
            ctx.lineTo(24, 12);
            ctx.stroke();

            ctx.strokeStyle = hexToRgba(NES_PALETTE.RED_MED);
            ctx.beginPath();
            ctx.moveTo(8, 16);
            ctx.lineTo(20, 14);
            ctx.lineTo(30, 18);
            ctx.stroke();

            ctx.strokeStyle = hexToRgba(NES_PALETTE.GREEN_DARK);
            ctx.beginPath();
            ctx.moveTo(10, 24);
            ctx.lineTo(36, 22);
            ctx.stroke();

            // Marker tray
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_MED);
            ctx.fillRect(4, h - 4, w - 8, 3);
        });
    }

    /**
     * Generates beanbag chair sprite.
     * @returns {THREE.Texture}
     */
    generateBeanbag() {
        return this.generateTexture('furniture_beanbag', 24, 24, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.3);
            ctx.beginPath();
            ctx.ellipse(w / 2 + 2, h / 2 + 2, 10, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // Beanbag body
            ctx.fillStyle = hexToRgba(NES_PALETTE.RED_MED);
            ctx.beginPath();
            ctx.ellipse(w / 2, h / 2, 10, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // Highlight
            ctx.fillStyle = hexToRgba(NES_PALETTE.RED_LIGHT, 0.5);
            ctx.beginPath();
            ctx.ellipse(w / 2 - 2, h / 2 - 2, 5, 4, -0.5, 0, Math.PI * 2);
            ctx.fill();

            // Seam line
            ctx.strokeStyle = hexToRgba(darken(NES_PALETTE.RED_MED, 30));
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(w / 2 - 8, h / 2);
            ctx.quadraticCurveTo(w / 2, h / 2 - 4, w / 2 + 8, h / 2);
            ctx.stroke();
        });
    }

    // ========== OVERWORLD DECORATIONS ==========

    /**
     * Generates tree sprite (top-down view for overworld).
     * @returns {THREE.Texture}
     */
    generateOverworldTree() {
        return this.generateTexture('decor_tree', 32, 32, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.3);
            ctx.beginPath();
            ctx.ellipse(w / 2 + 2, h / 2 + 2, 14, 14, 0, 0, Math.PI * 2);
            ctx.fill();

            // Tree foliage (main circle)
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_DARK);
            ctx.beginPath();
            ctx.ellipse(w / 2, h / 2, 14, 14, 0, 0, Math.PI * 2);
            ctx.fill();

            // Inner lighter foliage
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_MED);
            ctx.beginPath();
            ctx.ellipse(w / 2 - 2, h / 2 - 2, 10, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // Foliage highlights
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_LIGHT, 0.6);
            ctx.beginPath();
            ctx.ellipse(w / 2 - 4, h / 2 - 4, 5, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Trunk visible from top (center dot)
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /**
     * Generates bush sprite (top-down view).
     * @returns {THREE.Texture}
     */
    generateBush() {
        return this.generateTexture('decor_bush', 16, 16, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.2);
            ctx.beginPath();
            ctx.ellipse(w / 2 + 1, h / 2 + 1, 7, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Bush body
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_DARK);
            ctx.beginPath();
            ctx.ellipse(w / 2, h / 2, 7, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Lighter center
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_MED, 0.7);
            ctx.beginPath();
            ctx.ellipse(w / 2 - 1, h / 2 - 1, 4, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Small highlight
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_LIGHT, 0.5);
            ctx.fillRect(w / 2 - 2, h / 2 - 2, 2, 2);
        });
    }

    /**
     * Generates fountain sprite (top-down view).
     * @returns {THREE.Texture}
     */
    generateFountain() {
        return this.generateTexture('decor_fountain', 48, 48, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.3);
            ctx.beginPath();
            ctx.ellipse(w / 2 + 2, h / 2 + 2, 22, 22, 0, 0, Math.PI * 2);
            ctx.fill();

            // Outer stone rim
            ctx.fillStyle = hexToRgba(NES_PALETTE.STONE_LIGHT);
            ctx.beginPath();
            ctx.ellipse(w / 2, h / 2, 22, 22, 0, 0, Math.PI * 2);
            ctx.fill();

            // Inner rim
            ctx.fillStyle = hexToRgba(NES_PALETTE.STONE_DARK);
            ctx.beginPath();
            ctx.ellipse(w / 2, h / 2, 18, 18, 0, 0, Math.PI * 2);
            ctx.fill();

            // Water
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_MED);
            ctx.beginPath();
            ctx.ellipse(w / 2, h / 2, 16, 16, 0, 0, Math.PI * 2);
            ctx.fill();

            // Water highlights
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_LIGHT, 0.5);
            ctx.beginPath();
            ctx.ellipse(w / 2 - 4, h / 2 - 4, 6, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Center spout
            ctx.fillStyle = hexToRgba(NES_PALETTE.STONE_LIGHT);
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, 4, 0, Math.PI * 2);
            ctx.fill();

            // Water spray effect
            ctx.fillStyle = hexToRgba(NES_PALETTE.WHITE, 0.7);
            ctx.fillRect(w / 2 - 1, h / 2 - 6, 2, 4);
            ctx.fillRect(w / 2 - 4, h / 2 - 4, 2, 2);
            ctx.fillRect(w / 2 + 2, h / 2 - 4, 2, 2);
        });
    }

    /**
     * Generates park bench sprite (top-down view).
     * @returns {THREE.Texture}
     */
    generateParkBench() {
        return this.generateTexture('decor_bench', 32, 16, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.3);
            ctx.fillRect(3, 3, w - 3, h - 3);

            // Bench seat (wood planks)
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_MED);
            ctx.fillRect(0, 4, w - 3, h - 8);

            // Wood plank lines
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK, 0.5);
            ctx.fillRect(0, 6, w - 3, 1);
            ctx.fillRect(0, 9, w - 3, 1);

            // Armrests
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
            ctx.fillRect(0, 2, 4, h - 4);
            ctx.fillRect(w - 7, 2, 4, h - 4);

            // Highlight on top
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_LIGHT, 0.4);
            ctx.fillRect(4, 4, w - 11, 2);
        });
    }

    /**
     * Generates lamppost sprite (top-down view).
     * @returns {THREE.Texture}
     */
    generateLamppost() {
        return this.generateTexture('decor_lamppost', 16, 16, (ctx, w, h) => {
            // Light glow
            const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 8);
            gradient.addColorStop(0, hexToRgba(NES_PALETTE.FIRE_YELLOW, 0.4));
            gradient.addColorStop(0.5, hexToRgba(NES_PALETTE.FIRE_ORANGE, 0.2));
            gradient.addColorStop(1, hexToRgba(NES_PALETTE.FIRE_ORANGE, 0));
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);

            // Lamp base (pole from top)
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK);
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2);
            ctx.fill();

            // Lamp light
            ctx.fillStyle = hexToRgba(NES_PALETTE.FIRE_YELLOW);
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /**
     * Generates signpost sprite (top-down view).
     * @returns {THREE.Texture}
     */
    generateSignpost() {
        return this.generateTexture('decor_signpost', 24, 24, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.3);
            ctx.fillRect(w / 2 - 1, h / 2 - 1, 6, 6);

            // Post (from top)
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
            ctx.fillRect(w / 2 - 2, h / 2 - 2, 4, 4);

            // Sign arms pointing in directions
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_MED);
            // North arrow
            ctx.fillRect(w / 2 - 1, 2, 2, h / 2 - 4);
            // East arrow
            ctx.fillRect(w / 2 + 2, h / 2 - 1, h / 2 - 4, 2);
            // West arrow
            ctx.fillRect(4, h / 2 - 1, h / 2 - 6, 2);

            // Arrow tips
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_LIGHT);
            ctx.fillRect(w / 2 - 2, 2, 4, 2);
            ctx.fillRect(w - 6, h / 2 - 2, 2, 4);
            ctx.fillRect(4, h / 2 - 2, 2, 4);
        });
    }

    /**
     * Generates dock sprite for water edge.
     * @returns {THREE.Texture}
     */
    generateDock() {
        return this.generateTexture('decor_dock', 48, 24, (ctx, w, h) => {
            // Water underneath
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_MED, 0.5);
            ctx.fillRect(0, 0, w, h);

            // Dock shadow
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.3);
            ctx.fillRect(4, 4, w - 4, h - 4);

            // Wood planks
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_MED);
            ctx.fillRect(0, 0, w - 4, h - 4);

            // Plank lines
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK, 0.5);
            for (let x = 0; x < w - 4; x += 8) {
                ctx.fillRect(x, 0, 1, h - 4);
            }

            // Cross planks
            ctx.fillRect(0, 4, w - 4, 2);
            ctx.fillRect(0, h - 10, w - 4, 2);

            // Support posts visible at edges
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
            ctx.fillRect(2, h - 6, 4, 4);
            ctx.fillRect(w - 10, h - 6, 4, 4);
        });
    }

    /**
     * Generates flower patch sprite.
     * @returns {THREE.Texture}
     */
    generateFlowers() {
        return this.generateTexture('decor_flowers', 16, 16, (ctx, w, h) => {
            // Grass base
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_MED, 0.5);
            ctx.fillRect(0, 0, w, h);

            // Flowers (various colors)
            const flowerPositions = [
                { x: 4, y: 4, color: NES_PALETTE.RED_MED },
                { x: 10, y: 6, color: NES_PALETTE.FIRE_YELLOW },
                { x: 6, y: 10, color: NES_PALETTE.BLUE_LIGHT },
                { x: 12, y: 12, color: NES_PALETTE.PURPLE_MED },
                { x: 2, y: 12, color: NES_PALETTE.RED_LIGHT }
            ];

            flowerPositions.forEach(f => {
                // Flower petals
                ctx.fillStyle = hexToRgba(f.color);
                ctx.fillRect(f.x, f.y, 3, 3);

                // Center
                ctx.fillStyle = hexToRgba(NES_PALETTE.FIRE_YELLOW);
                ctx.fillRect(f.x + 1, f.y + 1, 1, 1);
            });

            // Green leaves/stems
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_DARK, 0.6);
            ctx.fillRect(3, 7, 1, 2);
            ctx.fillRect(11, 9, 1, 2);
            ctx.fillRect(7, 13, 1, 2);
        });
    }

    /**
     * Generates decorative rock sprite.
     * @returns {THREE.Texture}
     */
    generateRock() {
        return this.generateTexture('decor_rock', 16, 16, (ctx, w, h) => {
            // Shadow
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.3);
            ctx.beginPath();
            ctx.ellipse(w / 2 + 1, h / 2 + 1, 6, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Rock body
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_MED);
            ctx.beginPath();
            ctx.ellipse(w / 2, h / 2, 6, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Rock highlight
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_LIGHT, 0.6);
            ctx.beginPath();
            ctx.ellipse(w / 2 - 2, h / 2 - 2, 3, 2, -0.3, 0, Math.PI * 2);
            ctx.fill();

            // Rock crack/detail
            ctx.strokeStyle = hexToRgba(NES_PALETTE.GRAY_DARK, 0.5);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(w / 2 - 3, h / 2);
            ctx.lineTo(w / 2 + 2, h / 2 + 1);
            ctx.stroke();
        });
    }

    // ========== NPC SPRITES ==========

    /**
     * Dispatches NPC sprite generation by character name.
     * @param {string} name - NPC identifier (e.g. 'sam-visionary')
     * @returns {THREE.Texture} 48x48 pixel-art character texture
     */
    generateNPCSprite(name) {
        const generators = {
            'sam-visionary': () => this.generateSamVisionary(),
            'alex-builder': () => this.generateAlexBuilder(),
            'jordan-connector': () => this.generateJordanConnector(),
            'casey-creative': () => this.generateCaseyCreative(),
            'morgan-marketer': () => this.generateMorganMarketer(),
        };
        const gen = generators[name];
        return gen ? gen() : this.generateDefaultNPC();
    }

    /**
     * Draws a pixel-art NPC body onto the canvas context.
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} w - Canvas width
     * @param {number} h - Canvas height
     * @param {string} bodyColor - Hex color for torso
     * @param {string} legColor - Hex color for legs
     */
    _drawNPCBody(ctx, w, h, bodyColor, legColor) {
        const cx = w / 2;

        // Head (skin tone circle)
        ctx.fillStyle = '#DEB887';
        ctx.beginPath();
        ctx.arc(cx, 12, 8, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx - 3, 10, 2, 2);
        ctx.fillRect(cx + 1, 10, 2, 2);

        // Body
        ctx.fillStyle = bodyColor;
        ctx.fillRect(cx - 8, 20, 16, 14);

        // Legs
        ctx.fillStyle = legColor;
        ctx.fillRect(cx - 7, 34, 6, 10);
        ctx.fillRect(cx + 1, 34, 6, 10);
    }

    /**
     * Generates Sam the Visionary NPC sprite (brown hoodie).
     * @returns {THREE.Texture}
     */
    generateSamVisionary() {
        return this.generateTexture('npc_sam_visionary', 48, 48, (ctx, w, h) => {
            this._drawNPCBody(ctx, w, h, '#8B4513', '#5C2E0A');
        });
    }

    /**
     * Generates Alex the Builder NPC sprite (dark blue shirt).
     * @returns {THREE.Texture}
     */
    generateAlexBuilder() {
        return this.generateTexture('npc_alex_builder', 48, 48, (ctx, w, h) => {
            this._drawNPCBody(ctx, w, h, '#2C3E50', '#1A252F');
        });
    }

    /**
     * Generates Jordan the Connector NPC sprite (business gray).
     * @returns {THREE.Texture}
     */
    generateJordanConnector() {
        return this.generateTexture('npc_jordan_connector', 48, 48, (ctx, w, h) => {
            this._drawNPCBody(ctx, w, h, '#34495E', '#1F2B38');
        });
    }

    /**
     * Generates Casey the Creative NPC sprite (red).
     * @returns {THREE.Texture}
     */
    generateCaseyCreative() {
        return this.generateTexture('npc_casey_creative', 48, 48, (ctx, w, h) => {
            this._drawNPCBody(ctx, w, h, '#E74C3C', '#962F24');
        });
    }

    /**
     * Generates Morgan the Marketer NPC sprite (teal).
     * @returns {THREE.Texture}
     */
    generateMorganMarketer() {
        return this.generateTexture('npc_morgan_marketer', 48, 48, (ctx, w, h) => {
            this._drawNPCBody(ctx, w, h, '#16A085', '#0D6B58');
        });
    }

    /**
     * Generates a fallback NPC sprite with gray body and question mark.
     * @returns {THREE.Texture}
     */
    generateDefaultNPC() {
        return this.generateTexture('npc_default', 48, 48, (ctx, w, h) => {
            const cx = w / 2;

            // Head
            ctx.fillStyle = '#DEB887';
            ctx.beginPath();
            ctx.arc(cx, 12, 8, 0, Math.PI * 2);
            ctx.fill();

            // Question mark instead of eyes
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', cx, 12);

            // Gray body
            ctx.fillStyle = '#808080';
            ctx.fillRect(cx - 8, 20, 16, 14);

            // Legs
            ctx.fillStyle = '#555555';
            ctx.fillRect(cx - 7, 34, 6, 10);
            ctx.fillRect(cx + 1, 34, 6, 10);
        });
    }

    // ========== UI SPRITES ==========

    /**
     * Generates a 16x16 red pixel heart sprite.
     * @returns {THREE.Texture}
     */
    generateHeartSprite() {
        return this.generateTexture('ui_heart', 16, 16, (ctx) => {
            ctx.fillStyle = '#FF0000';
            // Classic pixel heart shape row by row
            const rows = [
                [2, 3, 4, 5, 8, 9, 10, 11],       // y=2
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // y=3
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // y=4
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // y=5
                [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],         // y=6
                [3, 4, 5, 6, 7, 8, 9, 10],                 // y=7
                [4, 5, 6, 7, 8, 9],                         // y=8
                [5, 6, 7, 8],                               // y=9
                [6, 7],                                     // y=10
            ];
            rows.forEach((cols, i) => {
                const y = i + 2;
                cols.forEach(x => {
                    ctx.fillRect(x, y, 1, 1);
                });
            });
        });
    }

    /**
     * Generates a 16x16 gold padlock sprite.
     * @returns {THREE.Texture}
     */
    generatePadlockSprite() {
        return this.generateTexture('ui_padlock', 16, 16, (ctx, w, h) => {
            // Shackle arc (darker gold)
            ctx.fillStyle = '#B8860B';
            ctx.fillRect(5, 1, 6, 2);
            ctx.fillRect(4, 2, 2, 5);
            ctx.fillRect(10, 2, 2, 5);
            ctx.fillRect(5, 1, 1, 2);
            ctx.fillRect(10, 1, 1, 2);

            // Lock body (gold)
            ctx.fillStyle = '#DAA520';
            ctx.fillRect(3, 6, 10, 8);

            // Body highlight
            ctx.fillStyle = '#F0C850';
            ctx.fillRect(3, 6, 10, 1);

            // Body shadow
            ctx.fillStyle = '#B8860B';
            ctx.fillRect(3, 13, 10, 1);

            // Keyhole
            ctx.fillStyle = '#5C3A08';
            ctx.beginPath();
            ctx.arc(w / 2, 10, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(w / 2 - 1, 10, 2, 3);
        });
    }

    // ========== ITEM SPRITES ==========

    /**
     * Dispatches item sprite generation by type.
     * @param {string} itemType - Item type identifier
     * @returns {THREE.Texture} Generated 32x32 item sprite texture
     */
    generateItemSprite(itemType) {
        const generators = {
            'whiteboard': () => this.generateWhiteboardItem(),
            'interview-notes': () => this.generateInterviewNotes(),
            'keyboard': () => this.generateKeyboardItem(),
            'energy-drink': () => this.generateEnergyDrink(),
            'github-stickers': () => this.generateGithubStickers(),
            'mvp-usb': () => this.generateMvpUsb(),
            'tech-debt-note': () => this.generateTechDebtNote(),
            'pitch-deck': () => this.generatePitchDeck(),
            'term-sheet': () => this.generateTermSheet(),
            'business-card': () => this.generateBusinessCard(),
            'yc-letter': () => this.generateYcLetter(),
            'cap-table': () => this.generateCapTable(),
            'handbook': () => this.generateHandbook(),
            'team-photo': () => this.generateTeamPhoto(),
            'stock-options': () => this.generateStockOptions(),
            'ping-pong-paddle': () => this.generatePingPongPaddle(),
            'growth-playbook': () => this.generateGrowthPlaybook(),
            'analytics-dashboard': () => this.generateAnalyticsDashboard(),
            'product-hunt-trophy': () => this.generateProductHuntTrophy(),
            'ad-budget': () => this.generateAdBudget(),
        };
        const gen = generators[itemType];
        return gen ? gen() : this.generateDefaultItem();
    }

    /**
     * Generates whiteboard item sprite — white rectangle with colored marker lines.
     * @returns {THREE.Texture}
     */
    generateWhiteboardItem() {
        return this.generateTexture('item_whiteboard', 32, 32, (ctx, w, h) => {
            // White board background
            ctx.fillStyle = hexToRgba(NES_PALETTE.WHITE);
            ctx.fillRect(2, 2, 28, 28);

            // Border
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_LIGHT);
            ctx.fillRect(2, 2, 28, 2);
            ctx.fillRect(2, 2, 2, 28);
            ctx.fillRect(2, 28, 28, 2);
            ctx.fillRect(28, 2, 2, 28);

            // Red marker line
            ctx.fillStyle = hexToRgba(NES_PALETTE.RED_MED);
            ctx.fillRect(6, 10, 20, 2);

            // Blue marker line
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_MED);
            ctx.fillRect(6, 16, 18, 2);

            // Green marker line
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_MED);
            ctx.fillRect(6, 22, 16, 2);
        });
    }

    /**
     * Generates interview notes sprite — yellow rectangle with horizontal lines.
     * @returns {THREE.Texture}
     */
    generateInterviewNotes() {
        return this.generateTexture('item_interview_notes', 32, 32, (ctx, w, h) => {
            // Yellow notepad
            ctx.fillStyle = hexToRgba(NES_PALETTE.FIRE_YELLOW);
            ctx.fillRect(4, 2, 24, 28);

            // Lines
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_LIGHT, 0.5);
            for (let y = 8; y < 28; y += 4) {
                ctx.fillRect(7, y, 18, 1);
            }

            // Red margin line
            ctx.fillStyle = hexToRgba(NES_PALETTE.RED_MED, 0.6);
            ctx.fillRect(10, 2, 1, 28);
        });
    }

    /**
     * Generates keyboard item sprite — dark rectangle with key dots.
     * @returns {THREE.Texture}
     */
    generateKeyboardItem() {
        return this.generateTexture('item_keyboard', 32, 32, (ctx, w, h) => {
            // Keyboard body
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK);
            ctx.fillRect(2, 8, 28, 18);

            // Border highlight
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_MED);
            ctx.fillRect(2, 8, 28, 1);

            // Key rows
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_LIGHT);
            for (let row = 0; row < 3; row++) {
                const y = 11 + row * 5;
                for (let col = 0; col < 8; col++) {
                    ctx.fillRect(5 + col * 3, y, 2, 2);
                }
            }

            // Spacebar
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_LIGHT);
            ctx.fillRect(10, 23, 12, 2);
        });
    }

    /**
     * Generates energy drink sprite — cyan tall rectangle with yellow lightning bolt.
     * @returns {THREE.Texture}
     */
    generateEnergyDrink() {
        return this.generateTexture('item_energy_drink', 32, 32, (ctx, w, h) => {
            // Can body
            ctx.fillStyle = hexToRgba(NES_PALETTE.TEAL);
            ctx.fillRect(10, 4, 12, 24);

            // Can top
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_STEEL);
            ctx.fillRect(11, 4, 10, 3);

            // Lightning bolt
            ctx.fillStyle = hexToRgba(NES_PALETTE.FIRE_YELLOW);
            ctx.fillRect(16, 10, 4, 2);
            ctx.fillRect(14, 12, 4, 2);
            ctx.fillRect(16, 14, 4, 2);
            ctx.fillRect(14, 16, 4, 2);
            ctx.fillRect(16, 18, 4, 2);
        });
    }

    /**
     * Generates GitHub stickers sprite — dark octagon shape.
     * @returns {THREE.Texture}
     */
    generateGithubStickers() {
        return this.generateTexture('item_github_stickers', 32, 32, (ctx, w, h) => {
            // Octagon shape
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK);
            ctx.beginPath();
            ctx.moveTo(10, 4);
            ctx.lineTo(22, 4);
            ctx.lineTo(28, 10);
            ctx.lineTo(28, 22);
            ctx.lineTo(22, 28);
            ctx.lineTo(10, 28);
            ctx.lineTo(4, 22);
            ctx.lineTo(4, 10);
            ctx.closePath();
            ctx.fill();

            // Inner lighter circle (octocat silhouette area)
            ctx.fillStyle = hexToRgba(NES_PALETTE.WHITE);
            ctx.beginPath();
            ctx.arc(16, 16, 7, 0, Math.PI * 2);
            ctx.fill();

            // Simple cat ears
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK);
            ctx.fillRect(11, 10, 3, 3);
            ctx.fillRect(18, 10, 3, 3);

            // Face
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK);
            ctx.beginPath();
            ctx.arc(16, 17, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /**
     * Generates MVP USB drive sprite — small gray rectangle with silver connector.
     * @returns {THREE.Texture}
     */
    generateMvpUsb() {
        return this.generateTexture('item_mvp_usb', 32, 32, (ctx, w, h) => {
            // USB body
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_MED);
            ctx.fillRect(8, 10, 16, 14);

            // Connector
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_LIGHT);
            ctx.fillRect(12, 6, 8, 4);

            // Connector pins
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_STEEL);
            ctx.fillRect(13, 7, 2, 2);
            ctx.fillRect(17, 7, 2, 2);

            // LED indicator
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_LIGHT);
            ctx.fillRect(15, 14, 2, 2);

            // Label area
            ctx.fillStyle = hexToRgba(NES_PALETTE.WHITE, 0.5);
            ctx.fillRect(10, 18, 12, 4);
        });
    }

    /**
     * Generates tech debt note sprite — yellow square with red "!".
     * @returns {THREE.Texture}
     */
    generateTechDebtNote() {
        return this.generateTexture('item_tech_debt_note', 32, 32, (ctx, w, h) => {
            // Yellow sticky note
            ctx.fillStyle = hexToRgba(NES_PALETTE.FIRE_YELLOW);
            ctx.fillRect(4, 4, 24, 24);

            // Folded corner
            ctx.fillStyle = hexToRgba(darken(NES_PALETTE.FIRE_YELLOW, 20));
            ctx.beginPath();
            ctx.moveTo(22, 4);
            ctx.lineTo(28, 10);
            ctx.lineTo(22, 10);
            ctx.closePath();
            ctx.fill();

            // Red exclamation mark "!"
            ctx.fillStyle = hexToRgba(NES_PALETTE.RED_MED);
            ctx.fillRect(14, 10, 4, 10);
            ctx.fillRect(14, 22, 4, 4);
        });
    }

    /**
     * Generates pitch deck sprite — orange rectangle with ascending bars.
     * @returns {THREE.Texture}
     */
    generatePitchDeck() {
        return this.generateTexture('item_pitch_deck', 32, 32, (ctx, w, h) => {
            // Slide background
            ctx.fillStyle = hexToRgba(NES_PALETTE.FIRE_ORANGE);
            ctx.fillRect(3, 4, 26, 24);

            // Border
            ctx.fillStyle = hexToRgba(darken(NES_PALETTE.FIRE_ORANGE, 20));
            ctx.fillRect(3, 4, 26, 2);

            // Three ascending bars
            ctx.fillStyle = hexToRgba(NES_PALETTE.WHITE);
            ctx.fillRect(8, 20, 5, 6);
            ctx.fillRect(14, 15, 5, 11);
            ctx.fillRect(20, 10, 5, 16);
        });
    }

    /**
     * Generates term sheet sprite — white rectangle with lines and signature squiggle.
     * @returns {THREE.Texture}
     */
    generateTermSheet() {
        return this.generateTexture('item_term_sheet', 32, 32, (ctx, w, h) => {
            // Paper background
            ctx.fillStyle = hexToRgba(NES_PALETTE.WHITE);
            ctx.fillRect(5, 2, 22, 28);

            // Text lines
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK, 0.6);
            for (let y = 6; y < 20; y += 3) {
                ctx.fillRect(8, y, 16, 1);
            }

            // Signature squiggle
            ctx.strokeStyle = hexToRgba(NES_PALETTE.BLUE_DARK);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(10, 24);
            ctx.quadraticCurveTo(14, 22, 16, 25);
            ctx.quadraticCurveTo(18, 28, 22, 24);
            ctx.stroke();

            // Signature line
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK, 0.4);
            ctx.fillRect(9, 27, 14, 1);
        });
    }

    /**
     * Generates business card sprite — small white rectangle with text lines.
     * @returns {THREE.Texture}
     */
    generateBusinessCard() {
        return this.generateTexture('item_business_card', 32, 32, (ctx, w, h) => {
            // Card shadow
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK, 0.3);
            ctx.fillRect(5, 10, 24, 15);

            // Card background
            ctx.fillStyle = hexToRgba(NES_PALETTE.WHITE);
            ctx.fillRect(3, 8, 24, 15);

            // Name line (bold)
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLACK);
            ctx.fillRect(6, 12, 12, 2);

            // Title line
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_MED);
            ctx.fillRect(6, 16, 10, 1);

            // Email line
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_MED, 0.7);
            ctx.fillRect(6, 19, 14, 1);
        });
    }

    /**
     * Generates YC letter sprite — orange rectangle with white "Y".
     * @returns {THREE.Texture}
     */
    generateYcLetter() {
        return this.generateTexture('item_yc_letter', 32, 32, (ctx, w, h) => {
            // Orange background
            ctx.fillStyle = hexToRgba(NES_PALETTE.FIRE_ORANGE);
            ctx.fillRect(4, 4, 24, 24);

            // Border
            ctx.fillStyle = hexToRgba(darken(NES_PALETTE.FIRE_ORANGE, 15));
            ctx.fillRect(4, 4, 24, 2);
            ctx.fillRect(4, 4, 2, 24);
            ctx.fillRect(4, 26, 24, 2);
            ctx.fillRect(26, 4, 2, 24);

            // White "Y"
            ctx.fillStyle = hexToRgba(NES_PALETTE.WHITE);
            ctx.fillRect(10, 10, 3, 5);
            ctx.fillRect(19, 10, 3, 5);
            ctx.fillRect(14, 14, 4, 3);
            ctx.fillRect(14, 17, 4, 7);
        });
    }

    /**
     * Generates cap table sprite — light green grid with darker borders.
     * @returns {THREE.Texture}
     */
    generateCapTable() {
        return this.generateTexture('item_cap_table', 32, 32, (ctx, w, h) => {
            // Background
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_LIGHT);
            ctx.fillRect(3, 4, 26, 24);

            // Grid lines (4 columns, 3 rows)
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_DARK, 0.6);
            // Horizontal lines
            for (let y = 4; y <= 28; y += 8) {
                ctx.fillRect(3, y, 26, 1);
            }
            // Vertical lines
            for (let x = 3; x <= 29; x += 7) {
                ctx.fillRect(x, 4, 1, 24);
            }

            // Header row darker
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_MED, 0.5);
            ctx.fillRect(4, 5, 25, 7);
        });
    }

    /**
     * Generates handbook sprite — blue book with white spine line.
     * @returns {THREE.Texture}
     */
    generateHandbook() {
        return this.generateTexture('item_handbook', 32, 32, (ctx, w, h) => {
            // Book body
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_MED);
            ctx.fillRect(6, 4, 20, 24);

            // Spine
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_DARK);
            ctx.fillRect(6, 4, 4, 24);

            // Spine line
            ctx.fillStyle = hexToRgba(NES_PALETTE.WHITE);
            ctx.fillRect(8, 4, 1, 24);

            // Cover decoration
            ctx.fillStyle = hexToRgba(NES_PALETTE.WHITE, 0.7);
            ctx.fillRect(14, 10, 8, 2);
            ctx.fillRect(14, 14, 6, 1);

            // Pages edge
            ctx.fillStyle = hexToRgba(NES_PALETTE.CREAM);
            ctx.fillRect(25, 6, 2, 20);
        });
    }

    /**
     * Generates team photo sprite — brown frame with colored circles inside.
     * @returns {THREE.Texture}
     */
    generateTeamPhoto() {
        return this.generateTexture('item_team_photo', 32, 32, (ctx, w, h) => {
            // Frame
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_MED);
            ctx.fillRect(3, 3, 26, 26);

            // Photo area
            ctx.fillStyle = hexToRgba(NES_PALETTE.CREAM);
            ctx.fillRect(5, 5, 22, 22);

            // Background
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_SKY, 0.5);
            ctx.fillRect(5, 5, 22, 10);

            // Four head circles
            const heads = [
                { x: 11, y: 18, color: NES_PALETTE.RED_MED },
                { x: 19, y: 18, color: NES_PALETTE.BLUE_MED },
                { x: 11, y: 24, color: NES_PALETTE.GREEN_MED },
                { x: 19, y: 24, color: NES_PALETTE.FIRE_YELLOW },
            ];
            heads.forEach(({ x, y, color }) => {
                ctx.fillStyle = hexToRgba(color);
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        });
    }

    /**
     * Generates stock options sprite — green rectangle with white "$".
     * @returns {THREE.Texture}
     */
    generateStockOptions() {
        return this.generateTexture('item_stock_options', 32, 32, (ctx, w, h) => {
            // Green background
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_MONEY);
            ctx.fillRect(4, 4, 24, 24);

            // Border
            ctx.fillStyle = hexToRgba(darken(NES_PALETTE.GREEN_MONEY, 20));
            ctx.fillRect(4, 4, 24, 2);
            ctx.fillRect(4, 4, 2, 24);
            ctx.fillRect(4, 26, 24, 2);
            ctx.fillRect(26, 4, 2, 24);

            // White "$"
            ctx.fillStyle = hexToRgba(NES_PALETTE.WHITE);
            // Vertical bar
            ctx.fillRect(15, 8, 2, 16);
            // Top curve
            ctx.fillRect(12, 10, 8, 2);
            ctx.fillRect(12, 10, 2, 4);
            // Middle bar
            ctx.fillRect(12, 15, 8, 2);
            // Bottom curve
            ctx.fillRect(18, 17, 2, 4);
            ctx.fillRect(12, 20, 8, 2);
        });
    }

    /**
     * Generates ping pong paddle sprite — red circle with brown handle.
     * @returns {THREE.Texture}
     */
    generatePingPongPaddle() {
        return this.generateTexture('item_ping_pong_paddle', 32, 32, (ctx, w, h) => {
            // Handle
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_MED);
            ctx.fillRect(14, 20, 4, 10);

            // Handle grip
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
            ctx.fillRect(14, 26, 4, 4);

            // Paddle face
            ctx.fillStyle = hexToRgba(NES_PALETTE.RED_MED);
            ctx.beginPath();
            ctx.arc(16, 13, 10, 0, Math.PI * 2);
            ctx.fill();

            // Paddle highlight
            ctx.fillStyle = hexToRgba(NES_PALETTE.RED_LIGHT, 0.4);
            ctx.beginPath();
            ctx.arc(14, 10, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /**
     * Generates growth playbook sprite — blue rectangle with white upward arrow.
     * @returns {THREE.Texture}
     */
    generateGrowthPlaybook() {
        return this.generateTexture('item_growth_playbook', 32, 32, (ctx, w, h) => {
            // Book body
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_MED);
            ctx.fillRect(5, 3, 22, 26);

            // Spine
            ctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_DARK);
            ctx.fillRect(5, 3, 3, 26);

            // White upward arrow
            ctx.fillStyle = hexToRgba(NES_PALETTE.WHITE);
            // Arrow shaft
            ctx.fillRect(15, 12, 3, 12);
            // Arrow head
            ctx.beginPath();
            ctx.moveTo(12, 14);
            ctx.lineTo(17, 7);
            ctx.lineTo(22, 14);
            ctx.closePath();
            ctx.fill();
        });
    }

    /**
     * Generates analytics dashboard sprite — dark rectangle with colored line chart.
     * @returns {THREE.Texture}
     */
    generateAnalyticsDashboard() {
        return this.generateTexture('item_analytics_dashboard', 32, 32, (ctx, w, h) => {
            // Screen background
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK);
            ctx.fillRect(3, 4, 26, 22);

            // Screen border
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_STEEL);
            ctx.fillRect(3, 4, 26, 2);
            ctx.fillRect(3, 24, 26, 2);
            ctx.fillRect(3, 4, 2, 22);
            ctx.fillRect(27, 4, 2, 22);

            // Stand
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_STEEL);
            ctx.fillRect(13, 26, 6, 3);

            // Green line chart going up
            ctx.strokeStyle = hexToRgba(NES_PALETTE.GREEN_LIGHT);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(6, 22);
            ctx.lineTo(10, 20);
            ctx.lineTo(14, 18);
            ctx.lineTo(18, 14);
            ctx.lineTo(22, 10);
            ctx.lineTo(26, 8);
            ctx.stroke();

            // Data point dots
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_LIGHT);
            ctx.fillRect(9, 19, 2, 2);
            ctx.fillRect(17, 13, 2, 2);
            ctx.fillRect(25, 7, 2, 2);
        });
    }

    /**
     * Generates Product Hunt trophy sprite — orange/gold trophy shape.
     * @returns {THREE.Texture}
     */
    generateProductHuntTrophy() {
        return this.generateTexture('item_product_hunt_trophy', 32, 32, (ctx, w, h) => {
            // Base/pedestal
            ctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
            ctx.fillRect(10, 26, 12, 4);

            // Trophy stem
            ctx.fillStyle = hexToRgba(NES_PALETTE.GOLD);
            ctx.fillRect(14, 22, 4, 4);

            // Trophy body (cup shape)
            ctx.fillStyle = hexToRgba(NES_PALETTE.FIRE_ORANGE);
            ctx.beginPath();
            ctx.moveTo(6, 6);
            ctx.lineTo(26, 6);
            ctx.lineTo(22, 22);
            ctx.lineTo(10, 22);
            ctx.closePath();
            ctx.fill();

            // Trophy highlight
            ctx.fillStyle = hexToRgba(NES_PALETTE.GOLD, 0.6);
            ctx.fillRect(12, 8, 8, 2);

            // Cat silhouette (Product Hunt cat)
            ctx.fillStyle = hexToRgba(NES_PALETTE.WHITE);
            ctx.fillRect(12, 12, 3, 3);
            ctx.fillRect(17, 12, 3, 3);
            ctx.fillRect(13, 16, 6, 3);
        });
    }

    /**
     * Generates ad budget sprite — green rectangle stack like money bills.
     * @returns {THREE.Texture}
     */
    generateAdBudget() {
        return this.generateTexture('item_ad_budget', 32, 32, (ctx, w, h) => {
            // Bottom bill
            ctx.fillStyle = hexToRgba(darken(NES_PALETTE.GREEN_MONEY, 15));
            ctx.fillRect(4, 14, 24, 14);
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_DARK, 0.4);
            ctx.fillRect(4, 14, 24, 1);

            // Middle bill
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_MONEY);
            ctx.fillRect(4, 10, 24, 14);
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_DARK, 0.4);
            ctx.fillRect(4, 10, 24, 1);

            // Top bill
            ctx.fillStyle = hexToRgba(lighten(NES_PALETTE.GREEN_MONEY, 10));
            ctx.fillRect(4, 6, 24, 14);

            // Top bill border
            ctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_DARK, 0.3);
            ctx.fillRect(4, 6, 24, 1);
            ctx.fillRect(4, 19, 24, 1);
            ctx.fillRect(4, 6, 1, 14);
            ctx.fillRect(27, 6, 1, 14);

            // Dollar sign on top bill
            ctx.fillStyle = hexToRgba(NES_PALETTE.WHITE, 0.6);
            ctx.fillRect(15, 9, 2, 8);
            ctx.fillRect(13, 10, 6, 1);
            ctx.fillRect(13, 13, 6, 1);
            ctx.fillRect(13, 16, 6, 1);
        });
    }

    /**
     * Generates default item fallback sprite — gray square with white "?".
     * @returns {THREE.Texture}
     */
    generateDefaultItem() {
        return this.generateTexture('item_default', 32, 32, (ctx, w, h) => {
            // Gray background
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_MED);
            ctx.fillRect(4, 4, 24, 24);

            // Border
            ctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK);
            ctx.fillRect(4, 4, 24, 2);
            ctx.fillRect(4, 4, 2, 24);
            ctx.fillRect(4, 26, 24, 2);
            ctx.fillRect(26, 4, 2, 24);

            // White "?"
            ctx.fillStyle = hexToRgba(NES_PALETTE.WHITE);
            ctx.fillRect(12, 10, 8, 2);
            ctx.fillRect(18, 10, 2, 4);
            ctx.fillRect(12, 14, 8, 2);
            ctx.fillRect(12, 14, 2, 4);
            ctx.fillRect(12, 18, 8, 2);
            // Dot
            ctx.fillRect(14, 22, 4, 4);
        });
    }

    /**
     * Disposes of all cached textures.
     */
    dispose() {
        this.cache.forEach(texture => {
            if (texture && texture.dispose) {
                texture.dispose();
            }
        });
        this.cache.clear();
    }
}

// Singleton instance
export const spriteGenerator = new SpriteGenerator();
