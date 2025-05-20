import * as THREE from 'three';

// Asset loading functions
export function loadTexture(url) {
    return new Promise((resolve, reject) => {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(url, resolve, undefined, reject);
    });
}

export function loadModel(url) {
    return new Promise((resolve, reject) => {
        // We'll use the GLTFLoader if available
        try {
            const loader = new THREE.GLTFLoader();
            loader.load(url, resolve, undefined, reject);
        } catch (e) {
            console.error("GLTFLoader not available, please import it: ", e);
            reject(e);
        }
    });
}

// Function to load all game assets
export function loadAssets() {
    return new Promise(async (resolve) => {
        // In a real game, you'd load actual assets
        console.log("Loading assets...");
        
        // Simulate asset loading time
        await new Promise(r => setTimeout(r, 500));
        
        console.log("Assets loaded!");
        resolve();
    });
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