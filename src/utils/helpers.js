import * as THREE from 'three';
import { textureManager } from './TextureManager.js';

/**
 * Loads a texture with error handling.
 * @param {string} url - Texture URL
 * @returns {Promise<THREE.Texture>} Promise resolving to the loaded texture
 */
export function loadTexture(url) {
    return textureManager.loadAsync(url);
}

/**
 * Loads a 3D model (placeholder - GLTFLoader not typically available).
 * @param {string} url - Model URL
 * @returns {Promise} Promise resolving to the loaded model
 */
export function loadModel(url) {
    return new Promise((resolve, reject) => {
        // GLTFLoader requires additional import
        try {
            const loader = new THREE.GLTFLoader();
            loader.load(url, resolve, undefined, reject);
        } catch (e) {
            console.error("GLTFLoader not available, please import it: ", e);
            reject(e);
        }
    });
}

/**
 * Preloads all game textures with progress tracking.
 * @param {Function} onProgress - Optional progress callback (loaded, total, percent)
 * @returns {Promise<void>} Promise resolving when all assets are loaded
 */
export async function loadAssets(onProgress) {
    console.log("Loading assets...");

    // List of critical textures to preload
    const textureUrls = [
        // Terrain
        '/assets/textures/grass-tile.png',
        '/assets/textures/path-tile.png',

        // Player sprites
        '/assets/textures/player-down-sprite.png',
        '/assets/textures/player-up-sprite.png',
        '/assets/textures/player-left-sprite.png',
        '/assets/textures/player-right-sprite.png',

        // Building sprites
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

        // Items
        '/assets/textures/macbook.png',
        '/assets/textures/iphone.png',

        // NPC sprites
        '/assets/textures/npc/sam-visionary.png',
        '/assets/textures/npc/alex-builder.png',
        '/assets/textures/npc/jordan-connector.png',
        '/assets/textures/npc/casey-creative.png',
        '/assets/textures/npc/morgan-marketer.png',

        // UI
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
    } catch (error) {
        console.error("Error during asset preload:", error);
        // Continue anyway - fallback textures will be used
    }
}

// Create a sprite with texture
export function createSprite(texture, width, height) {
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(width, height, 1);
    return sprite;
}

// Helper function to create a tile grid
export function createGrid(size, tileSize) {
    const grid = [];
    
    for (let x = 0; x < size; x++) {
        grid[x] = [];
        for (let z = 0; z < size; z++) {
            grid[x][z] = {
                type: 'grass', // Default tile type
                walkable: true
            };
        }
    }
    
    return grid;
}

// Generate a simple tilemap with different terrain types
export function generateTileMap(size) {
    const map = createGrid(size, 1);
    
    // Add some random paths
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
    
    // Add some water
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
export function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

// Keyboard event helper for more consistent behavior
export function setupKeyboardControls() {
    const keys = {};
    
    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        
        // Prevent page scrolling with arrow keys and WASD
        if(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].indexOf(e.key) > -1) {
            e.preventDefault();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });
    
    return keys;
}

// Create a simple debounce function
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}