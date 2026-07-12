/**
 * Manages game audio including background music and sound effects.
 * Uses Web Audio API for precise control and mixing.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type AudioSettings = {
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    muted: boolean;
};

type AudioFiles = {
    music: Record<string, string>;
    sfx: Record<string, string>;
};

export class AudioManager {
    audioContext: AudioContext | null;
    masterGain: GainNode | null;
    musicGain: GainNode | null;
    sfxGain: GainNode | null;
    currentMusic: string | null;
    musicSource: AudioBufferSourceNode | null;
    audioBuffers: Map<string, AudioBuffer>;
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    audioFiles: AudioFiles;
    initialized: boolean;
    muted: boolean;

    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;

        this.currentMusic = null;
        this.musicSource = null;
        this.audioBuffers = new Map();

        this.masterVolume = 1.0;
        this.musicVolume = 0.5;
        this.sfxVolume = 0.7;

        this.audioFiles = {
            music: {
                main: '/assets/audio/music/main-theme.mp3',
                interior: '/assets/audio/music/interior-ambient.mp3',
                victory: '/assets/audio/music/victory.mp3',
                gameover: '/assets/audio/music/gameover.mp3'
            },
            sfx: {
                footstep: '/assets/audio/sfx/footstep.mp3',
                pickup: '/assets/audio/sfx/pickup.mp3',
                doorOpen: '/assets/audio/sfx/door-open.mp3',
                doorClose: '/assets/audio/sfx/door-close.mp3',
                uiClick: '/assets/audio/sfx/ui-click.mp3',
                uiHover: '/assets/audio/sfx/ui-hover.mp3',
                levelUp: '/assets/audio/sfx/level-up.mp3',
                success: '/assets/audio/sfx/success.mp3',
                error: '/assets/audio/sfx/error.mp3',
                coin: '/assets/audio/sfx/coin.mp3'
            }
        };

        this.initialized = false;
        this.muted = false;

        this.loadSettings();
    }

    /**
     * Initializes the Web Audio API context.
     * Must be called after a user interaction (browser requirement).
     */
    async init(): Promise<void> {
        if (this.initialized) return;

        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) {
                console.warn('AudioManager: Web Audio API not available');
                return;
            }
            this.audioContext = new AudioCtx();

            this.masterGain = this.audioContext.createGain();
            this.musicGain = this.audioContext.createGain();
            this.sfxGain = this.audioContext.createGain();

            this.musicGain.connect(this.masterGain);
            this.sfxGain.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);

            this.updateVolumes();

            this.initialized = true;
            console.log('AudioManager: Initialized');

            await this.preloadAudio();
        } catch (error: unknown) {
            console.warn('AudioManager: Failed to initialize', error);
        }
    }

    /**
     * Preloads audio files into buffers for faster playback.
     */
    async preloadAudio(): Promise<void> {
        const preloadList = [
            ...Object.values(this.audioFiles.sfx)
        ];

        const loadPromises = preloadList.map(url => this.loadAudioBuffer(url));
        await Promise.allSettled(loadPromises);

        console.log(`AudioManager: Preloaded ${this.audioBuffers.size} audio files`);
    }

    /**
     * Loads an audio file into a buffer.
     */
    async loadAudioBuffer(url: string): Promise<AudioBuffer | null> {
        if (this.audioBuffers.has(url)) {
            return this.audioBuffers.get(url) ?? null;
        }

        if (!this.audioContext) return null;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.audioBuffers.set(url, audioBuffer);
            return audioBuffer;
        } catch (error: unknown) {
            console.warn(`AudioManager: Failed to load ${url}`, error);
            return null;
        }
    }

    /**
     * Plays background music with optional looping.
     */
    async playMusic(trackName: string, loop = true, fadeIn = 1): Promise<void> {
        if (!this.initialized || this.muted) return;
        if (!this.audioContext || !this.musicGain) return;

        const url = this.audioFiles.music[trackName];
        if (!url) {
            console.warn(`AudioManager: Unknown music track: ${trackName}`);
            return;
        }

        this.stopMusic(0.5);

        try {
            let buffer = this.audioBuffers.get(url);
            if (!buffer) {
                buffer = await this.loadAudioBuffer(url) ?? undefined;
            }
            if (!buffer) return;

            this.musicSource = this.audioContext.createBufferSource();
            this.musicSource.buffer = buffer;
            this.musicSource.loop = loop;
            this.musicSource.connect(this.musicGain);

            this.musicGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            this.musicGain.gain.linearRampToValueAtTime(
                this.musicVolume,
                this.audioContext.currentTime + fadeIn
            );

            this.musicSource.start(0);
            this.currentMusic = trackName;
            console.log(`AudioManager: Playing music - ${trackName}`);
        } catch (error: unknown) {
            console.warn(`AudioManager: Failed to play music ${trackName}`, error);
        }
    }

    /**
     * Stops the current background music.
     */
    stopMusic(fadeOut = 0.5): void {
        if (!this.musicSource) return;
        if (!this.audioContext || !this.musicGain) return;

        try {
            this.musicGain.gain.linearRampToValueAtTime(
                0,
                this.audioContext.currentTime + fadeOut
            );

            const source = this.musicSource;
            setTimeout(() => {
                try {
                    source.stop();
                } catch {
                    // Already stopped
                }
            }, fadeOut * 1000);

            this.musicSource = null;
            this.currentMusic = null;
        } catch (error: unknown) {
            console.warn('AudioManager: Error stopping music', error);
        }
    }

    /**
     * Plays a sound effect.
     */
    async playSFX(sfxName: string, volume = 1): Promise<void> {
        if (!this.initialized || this.muted) return;
        if (!this.audioContext || !this.sfxGain) return;

        const url = this.audioFiles.sfx[sfxName];
        if (!url) {
            console.warn(`AudioManager: Unknown SFX: ${sfxName}`);
            return;
        }

        try {
            let buffer = this.audioBuffers.get(url);
            if (!buffer) {
                buffer = await this.loadAudioBuffer(url) ?? undefined;
            }
            if (!buffer) return;

            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;

            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = this.sfxVolume * volume;

            source.connect(gainNode);
            gainNode.connect(this.sfxGain);

            source.start(0);
        } catch (error: unknown) {
            console.warn(`AudioManager: Failed to play SFX ${sfxName}`, error);
        }
    }

    setMasterVolume(volume: number): void {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
        this.saveSettings();
    }

    setMusicVolume(volume: number): void {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
        this.saveSettings();
    }

    setSFXVolume(volume: number): void {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
        this.saveSettings();
    }

    updateVolumes(): void {
        if (!this.initialized) return;
        if (!this.masterGain || !this.musicGain || !this.sfxGain) return;

        this.masterGain.gain.value = this.masterVolume;
        this.musicGain.gain.value = this.musicVolume;
        this.sfxGain.gain.value = this.sfxVolume;
    }

    toggleMute(): boolean {
        this.muted = !this.muted;

        if (this.initialized && this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
        }

        this.saveSettings();
        return this.muted;
    }

    setMuted(muted: boolean): void {
        this.muted = muted;

        if (this.initialized && this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
        }

        this.saveSettings();
    }

    async resume(): Promise<void> {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            console.log('AudioManager: Context resumed');
        }
    }

    saveSettings(): void {
        const settings: AudioSettings = {
            masterVolume: this.masterVolume,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            muted: this.muted
        };
        localStorage.setItem('losv_audio_settings', JSON.stringify(settings));
    }

    loadSettings(): void {
        try {
            const saved = localStorage.getItem('losv_audio_settings');
            if (!saved) return;
            const parsed: unknown = JSON.parse(saved);
            // yagni: narrow JSON without full zod; upgrade if settings schema grows
            if (!isPlainObject(parsed)) return;
            if (typeof parsed.masterVolume === 'number') this.masterVolume = parsed.masterVolume;
            if (typeof parsed.musicVolume === 'number') this.musicVolume = parsed.musicVolume;
            if (typeof parsed.sfxVolume === 'number') this.sfxVolume = parsed.sfxVolume;
            if (typeof parsed.muted === 'boolean') this.muted = parsed.muted;
        } catch (error: unknown) {
            console.warn('AudioManager: Failed to load settings', error);
        }
    }

    getSettings(): AudioSettings {
        return {
            masterVolume: this.masterVolume,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            muted: this.muted
        };
    }

    dispose(): void {
        this.stopMusic(0);

        if (this.audioContext) {
            void this.audioContext.close();
        }

        this.audioBuffers.clear();
        this.initialized = false;
    }
}

// Singleton instance for global use
export const audioManager = new AudioManager();
