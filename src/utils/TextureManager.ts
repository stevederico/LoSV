import * as THREE from 'three';

export type TextureLoadOptions = {
    fallbackColor?: number;
    pixelArt?: boolean;
    timeout?: number;
};

/**
 * Manages texture loading with error handling and fallback materials.
 * Caches loaded textures to avoid duplicate loads.
 */
export class TextureManager {
    loader: THREE.TextureLoader;
    cache: Map<string, THREE.Texture>;
    failedUrls: Set<string>;
    loadingCount: number;
    loadedCount: number;
    errorCount: number;

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
     */
    createFallbackTexture(color = 0x888888): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('2d context unavailable');
        if (!ctx) {
            // yagni: solid texture via DataTexture if canvas 2d ever missing
            return new THREE.Texture();
        }

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
     */
    load(url: string, options: TextureLoadOptions = {}): THREE.Texture {
        const { fallbackColor = 0x888888, pixelArt = true } = options;

        if (this.cache.has(url)) {
            const cached = this.cache.get(url);
            if (cached) return cached;
        }

        if (this.failedUrls.has(url)) {
            return this.createFallbackTexture(fallbackColor);
        }

        this.loadingCount++;

        const texture = this.createFallbackTexture(fallbackColor);

        this.loader.load(
            url,
            (loadedTexture) => {
                if (pixelArt) {
                    loadedTexture.magFilter = THREE.NearestFilter;
                    loadedTexture.minFilter = THREE.NearestFilter;
                }

                this.cache.set(url, loadedTexture);
                this.loadedCount++;

                texture.image = loadedTexture.image;
                texture.needsUpdate = true;
            },
            undefined,
            (error) => {
                console.warn(`TextureManager: Failed to load texture: ${url}`, error);
                this.failedUrls.add(url);
                this.errorCount++;
                this.cache.set(url, texture);
            }
        );

        this.cache.set(url, texture);
        return texture;
    }

    /**
     * Loads a texture and returns a Promise.
     */
    loadAsync(url: string, options: TextureLoadOptions = {}): Promise<THREE.Texture> {
        const { fallbackColor = 0x888888, pixelArt = true, timeout = 10000 } = options;

        return new Promise((resolve) => {
            if (this.cache.has(url)) {
                const cached = this.cache.get(url);
                if (cached) {
                    resolve(cached);
                    return;
                }
            }

            if (this.failedUrls.has(url)) {
                resolve(this.createFallbackTexture(fallbackColor));
                return;
            }

            this.loadingCount++;

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
     */
    async preload(
        urls: string[],
        onProgress?: (loaded: number, total: number) => void
    ): Promise<void> {
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
     */
    getStats(): {
        loading: number;
        loaded: number;
        errors: number;
        cached: number;
        failed: number;
    } {
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
    clear(): void {
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
     */
    dispose(url: string): void {
        const texture = this.cache.get(url);
        if (texture && texture.dispose) {
            texture.dispose();
        }
        this.cache.delete(url);
    }
}

// Singleton instance for global use
export const textureManager = new TextureManager();
