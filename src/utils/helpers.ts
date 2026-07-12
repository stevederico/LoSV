import * as THREE from 'three';
import { textureManager } from './TextureManager';

/**
 * Loads a texture with error handling.
 */
export function loadTexture(url: string): Promise<THREE.Texture> {
    return textureManager.loadAsync(url);
}

/**
 * Loads a 3D model (placeholder — GLTFLoader not bundled).
 */
export function loadModel(url: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
        // yagni: GLTFLoader not used; wire @types + import when 3D models land
        void url;
        reject(new Error('GLTFLoader not available'));
        void resolve;
    });
}

/**
 * Preloads all game textures with progress tracking.
 */
export async function loadAssets(
    onProgress?: (loaded: number, total: number, percent: number) => void
): Promise<void> {
    console.log("Loading assets...");

    const textureUrls = [
        '/assets/textures/grass-tile.png',
        '/assets/textures/path-tile.png',
        '/assets/textures/player-down-sprite.png',
        '/assets/textures/player-up-sprite.png',
        '/assets/textures/player-left-sprite.png',
        '/assets/textures/player-right-sprite.png',
        '/assets/textures/house-sprite.png',
        '/assets/textures/garage.png',
        '/assets/textures/accelerator.png',
        '/assets/textures/loft.png',
        '/assets/textures/conference.png',
        '/assets/textures/data-center.png',
        '/assets/textures/board-room.png',
        '/assets/textures/venture.png',
        '/assets/textures/law.png',
        '/assets/textures/nasdaq.png',
        '/assets/textures/macbook.png',
        '/assets/textures/iphone.png',
        '/assets/textures/npc/sam-visionary.png',
        '/assets/textures/npc/alex-builder.png',
        '/assets/textures/npc/jordan-connector.png',
        '/assets/textures/npc/casey-creative.png',
        '/assets/textures/npc/morgan-marketer.png',
        '/assets/textures/ui/padlock.png'
    ];

    try {
        await textureManager.preload(textureUrls, (loaded, total) => {
            const percent = Math.round((loaded / total) * 100);
            if (onProgress) {
                onProgress(loaded, total, percent);
            }
        });

        const stats = textureManager.getStats();
        console.log(`Assets loaded! (${stats.loaded} textures, ${stats.errors} errors)`);

        if (stats.errors > 0) {
            console.warn(`Some textures failed to load and are using fallback colors.`);
        }
    } catch (error: unknown) {
        console.error("Error during asset preload:", error);
    }
}

// Create a sprite with texture
export function createSprite(
    texture: THREE.Texture,
    width: number,
    height: number
): THREE.Sprite {
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(width, height, 1);
    return sprite;
}

export type TileCell = {
    type: string;
    walkable: boolean;
};

// Helper function to create a tile grid
export function createGrid(size: number, _tileSize: number): TileCell[][] {
    void _tileSize;
    const grid: TileCell[][] = [];

    for (let x = 0; x < size; x++) {
        grid[x] = [];
        for (let z = 0; z < size; z++) {
            grid[x][z] = {
                type: 'grass',
                walkable: true
            };
        }
    }

    return grid;
}

// Generate a simple tilemap with different terrain types
export function generateTileMap(size: number): TileCell[][] {
    const map = createGrid(size, 1);

    const pathCount = Math.floor(size / 5);

    for (let i = 0; i < pathCount; i++) {
        const startX = Math.floor(Math.random() * size);
        const startZ = Math.floor(Math.random() * size);
        const length = 5 + Math.floor(Math.random() * 10);
        const horizontal = Math.random() > 0.5;

        for (let j = 0; j < length; j++) {
            const x = horizontal ? (startX + j) % size : startX;
            const z = horizontal ? startZ : (startZ + j) % size;

            if (x >= 0 && x < size && z >= 0 && z < size) {
                map[x][z].type = 'path';
            }
        }
    }

    const waterRegions = Math.floor(size / 10);

    for (let i = 0; i < waterRegions; i++) {
        const centerX = Math.floor(Math.random() * size);
        const centerZ = Math.floor(Math.random() * size);
        const radius = 1 + Math.floor(Math.random() * 3);

        for (let x = centerX - radius; x <= centerX + radius; x++) {
            for (let z = centerZ - radius; z <= centerZ + radius; z++) {
                if (x >= 0 && x < size && z >= 0 && z < size) {
                    const dx = x - centerX;
                    const dz = z - centerZ;
                    const distance = Math.sqrt(dx * dx + dz * dz);

                    if (distance <= radius) {
                        map[x][z].type = 'water';
                        map[x][z].walkable = false;
                    }
                }
            }
        }
    }

    return map;
}

// Random number generator in range
export function randomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

// Keyboard event helper for more consistent behavior
export function setupKeyboardControls(): Record<string, boolean> {
    const keys: Record<string, boolean> = {};

    window.addEventListener('keydown', (e: KeyboardEvent) => {
        keys[e.key] = true;

        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].indexOf(e.key) > -1) {
            e.preventDefault();
        }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
        keys[e.key] = false;
    });

    return keys;
}

// Create a simple debounce function
export function debounce<T extends (...args: never[]) => void>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
