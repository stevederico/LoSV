import * as THREE from 'three';

/**
 * Manages texture loading with error handling and fallback materials.
 * Caches loaded textures to avoid duplicate loads.
 */
export class TextureManager {
    constructor() {
        this.loader = new THREE.TextureLoader();
        this.cache = new Map();
        this.failedUrls = new Set();
        this.loadingCount = 0;
        this.loadedCount = 0;
        this.errorCount = 0;
    }

    /**
     * Creates a fallback colored texture when loading fails.
     * @param {number} color - Hex color value
     * @returns {THREE.Texture} A 1x1 colored texture
     */
    createFallbackTexture(color = 0x888888) {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');

        // Convert hex to RGB
        const r = (color >> 16) & 255;
        const g = (color >> 8) & 255;
        const b = color & 255;

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(0, 0, 1, 1);

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        return texture;
    }

    /**
     * Loads a texture with error handling.
     * Returns cached texture if already loaded.
     * @param {string} url - Texture URL
     * @param {Object} options - Loading options
     * @param {number} options.fallbackColor - Color for fallback texture (default: 0x888888)
     * @param {boolean} options.pixelArt - Whether to use nearest filter (default: true)
     * @returns {THREE.Texture} The loaded texture or a fallback
     */
    load(url, options = {}) {
        const { fallbackColor = 0x888888, pixelArt = true } = options;

        // Check cache first
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        // Check if URL previously failed
        if (this.failedUrls.has(url)) {
            return this.createFallbackTexture(fallbackColor);
        }

        this.loadingCount++;

        // Create a placeholder texture that will be updated when loaded
        const texture = this.createFallbackTexture(fallbackColor);

        // Load the actual texture
        this.loader.load(
            url,
            (loadedTexture) => {
                // Success - update properties and cache
                if (pixelArt) {
                    loadedTexture.magFilter = THREE.NearestFilter;
                    loadedTexture.minFilter = THREE.NearestFilter;
                }

                this.cache.set(url, loadedTexture);
                this.loadedCount++;

                // Copy loaded texture properties to the placeholder
                texture.image = loadedTexture.image;
                texture.needsUpdate = true;
            },
            undefined, // Progress callback (not used)
            (error) => {
                // Error - keep fallback texture
                console.warn(`TextureManager: Failed to load texture: ${url}`, error);
                this.failedUrls.add(url);
                this.errorCount++;

                // The fallback texture is already in place
                this.cache.set(url, texture);
            }
        );

        // Return the placeholder (which may be updated later)
        this.cache.set(url, texture);
        return texture;
    }

    /**
     * Loads a texture and returns a Promise.
     * @param {string} url - Texture URL
     * @param {Object} options - Loading options
     * @returns {Promise<THREE.Texture>} Promise resolving to the texture
     */
    loadAsync(url, options = {}) {
        const { fallbackColor = 0x888888, pixelArt = true, timeout = 10000 } = options;

        return new Promise((resolve) => {
            // Check cache first
            if (this.cache.has(url)) {
                resolve(this.cache.get(url));
                return;
            }

            // Check if URL previously failed
            if (this.failedUrls.has(url)) {
                resolve(this.createFallbackTexture(fallbackColor));
                return;
            }

            this.loadingCount++;

            // Set up timeout
            const timeoutId = setTimeout(() => {
                console.warn(`TextureManager: Timeout loading texture: ${url}`);
                this.failedUrls.add(url);
                this.errorCount++;
                const fallback = this.createFallbackTexture(fallbackColor);
                this.cache.set(url, fallback);
                resolve(fallback);
            }, timeout);

            this.loader.load(
                url,
                (texture) => {
                    clearTimeout(timeoutId);

                    if (pixelArt) {
                        texture.magFilter = THREE.NearestFilter;
                        texture.minFilter = THREE.NearestFilter;
                    }

                    this.cache.set(url, texture);
                    this.loadedCount++;
                    resolve(texture);
                },
                undefined,
                (error) => {
                    clearTimeout(timeoutId);
                    console.warn(`TextureManager: Failed to load texture: ${url}`, error);
                    this.failedUrls.add(url);
                    this.errorCount++;

                    const fallback = this.createFallbackTexture(fallbackColor);
                    this.cache.set(url, fallback);
                    resolve(fallback);
                }
            );
        });
    }

    /**
     * Preloads multiple textures.
     * @param {string[]} urls - Array of texture URLs
     * @param {Function} onProgress - Progress callback (loaded, total)
     * @returns {Promise<void>} Promise resolving when all textures are loaded
     */
    async preload(urls, onProgress) {
        const total = urls.length;
        let loaded = 0;

        const promises = urls.map(url =>
            this.loadAsync(url).then(() => {
                loaded++;
                if (onProgress) {
                    onProgress(loaded, total);
                }
            })
        );

        await Promise.all(promises);
    }

    /**
     * Gets loading statistics.
     * @returns {Object} Stats object with loading, loaded, error counts
     */
    getStats() {
        return {
            loading: this.loadingCount,
            loaded: this.loadedCount,
            errors: this.errorCount,
            cached: this.cache.size,
            failed: this.failedUrls.size
        };
    }

    /**
     * Clears the texture cache and disposes textures.
     */
    clear() {
        this.cache.forEach(texture => {
            if (texture && texture.dispose) {
                texture.dispose();
            }
        });
        this.cache.clear();
        this.failedUrls.clear();
        this.loadingCount = 0;
        this.loadedCount = 0;
        this.errorCount = 0;
    }

    /**
     * Disposes a specific texture by URL.
     * @param {string} url - Texture URL to dispose
     */
    dispose(url) {
        const texture = this.cache.get(url);
        if (texture && texture.dispose) {
            texture.dispose();
        }
        this.cache.delete(url);
    }
}

// Singleton instance for global use
export const textureManager = new TextureManager();
