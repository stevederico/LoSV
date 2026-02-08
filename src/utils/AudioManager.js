/**
 * Manages game audio including background music and sound effects.
 * Uses Web Audio API for precise control and mixing.
 */
export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;

        // Track currently playing audio
        this.currentMusic = null;
        this.musicSource = null;
        this.audioBuffers = new Map();

        // Volume settings (0-1)
        this.masterVolume = 1.0;
        this.musicVolume = 0.5;
        this.sfxVolume = 0.7;

        // Audio file paths
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

        // Load saved settings
        this.loadSettings();
    }

    /**
     * Initializes the Web Audio API context.
     * Must be called after a user interaction (browser requirement).
     */
    async init() {
        if (this.initialized) return;

        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create gain nodes for volume control
            this.masterGain = this.audioContext.createGain();
            this.musicGain = this.audioContext.createGain();
            this.sfxGain = this.audioContext.createGain();

            // Connect gain nodes: music/sfx -> master -> destination
            this.musicGain.connect(this.masterGain);
            this.sfxGain.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);

            // Apply saved volume settings
            this.updateVolumes();

            this.initialized = true;
            console.log('AudioManager: Initialized');

            // Preload common sounds
            await this.preloadAudio();
        } catch (error) {
            console.warn('AudioManager: Failed to initialize', error);
        }
    }

    /**
     * Preloads audio files into buffers for faster playback.
     */
    async preloadAudio() {
        const preloadList = [
            ...Object.values(this.audioFiles.sfx)
        ];

        const loadPromises = preloadList.map(url => this.loadAudioBuffer(url));
        await Promise.allSettled(loadPromises);

        console.log(`AudioManager: Preloaded ${this.audioBuffers.size} audio files`);
    }

    /**
     * Loads an audio file into a buffer.
     * @param {string} url - URL of the audio file
     * @returns {Promise<AudioBuffer>} The loaded audio buffer
     */
    async loadAudioBuffer(url) {
        if (this.audioBuffers.has(url)) {
            return this.audioBuffers.get(url);
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.audioBuffers.set(url, audioBuffer);
            return audioBuffer;
        } catch (error) {
            console.warn(`AudioManager: Failed to load ${url}`, error);
            return null;
        }
    }

    /**
     * Plays background music with optional looping.
     * @param {string} trackName - Name of the music track (from audioFiles.music)
     * @param {boolean} loop - Whether to loop the music (default: true)
     * @param {number} fadeIn - Fade in duration in seconds (default: 1)
     */
    async playMusic(trackName, loop = true, fadeIn = 1) {
        if (!this.initialized || this.muted) return;

        const url = this.audioFiles.music[trackName];
        if (!url) {
            console.warn(`AudioManager: Unknown music track: ${trackName}`);
            return;
        }

        // Stop current music
        this.stopMusic(0.5);

        try {
            // Load the audio buffer
            let buffer = this.audioBuffers.get(url);
            if (!buffer) {
                buffer = await this.loadAudioBuffer(url);
            }
            if (!buffer) return;

            // Create source node
            this.musicSource = this.audioContext.createBufferSource();
            this.musicSource.buffer = buffer;
            this.musicSource.loop = loop;
            this.musicSource.connect(this.musicGain);

            // Fade in
            this.musicGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            this.musicGain.gain.linearRampToValueAtTime(
                this.musicVolume,
                this.audioContext.currentTime + fadeIn
            );

            this.musicSource.start(0);
            this.currentMusic = trackName;
            console.log(`AudioManager: Playing music - ${trackName}`);
        } catch (error) {
            console.warn(`AudioManager: Failed to play music ${trackName}`, error);
        }
    }

    /**
     * Stops the current background music.
     * @param {number} fadeOut - Fade out duration in seconds (default: 0.5)
     */
    stopMusic(fadeOut = 0.5) {
        if (!this.musicSource) return;

        try {
            // Fade out
            this.musicGain.gain.linearRampToValueAtTime(
                0,
                this.audioContext.currentTime + fadeOut
            );

            // Stop after fade
            const source = this.musicSource;
            setTimeout(() => {
                try {
                    source.stop();
                } catch (e) {
                    // Already stopped
                }
            }, fadeOut * 1000);

            this.musicSource = null;
            this.currentMusic = null;
        } catch (error) {
            console.warn('AudioManager: Error stopping music', error);
        }
    }

    /**
     * Plays a sound effect.
     * @param {string} sfxName - Name of the sound effect (from audioFiles.sfx)
     * @param {number} volume - Volume multiplier (default: 1)
     */
    async playSFX(sfxName, volume = 1) {
        if (!this.initialized || this.muted) return;

        const url = this.audioFiles.sfx[sfxName];
        if (!url) {
            console.warn(`AudioManager: Unknown SFX: ${sfxName}`);
            return;
        }

        try {
            // Get or load the audio buffer
            let buffer = this.audioBuffers.get(url);
            if (!buffer) {
                buffer = await this.loadAudioBuffer(url);
            }
            if (!buffer) return;

            // Create source node
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;

            // Create individual gain for this sound
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = this.sfxVolume * volume;

            source.connect(gainNode);
            gainNode.connect(this.sfxGain);

            source.start(0);
        } catch (error) {
            console.warn(`AudioManager: Failed to play SFX ${sfxName}`, error);
        }
    }

    /**
     * Sets the master volume.
     * @param {number} volume - Volume level (0-1)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
        this.saveSettings();
    }

    /**
     * Sets the music volume.
     * @param {number} volume - Volume level (0-1)
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
        this.saveSettings();
    }

    /**
     * Sets the sound effects volume.
     * @param {number} volume - Volume level (0-1)
     */
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
        this.saveSettings();
    }

    /**
     * Updates all gain nodes with current volume settings.
     */
    updateVolumes() {
        if (!this.initialized) return;

        this.masterGain.gain.value = this.masterVolume;
        this.musicGain.gain.value = this.musicVolume;
        this.sfxGain.gain.value = this.sfxVolume;
    }

    /**
     * Toggles mute state.
     * @returns {boolean} New mute state
     */
    toggleMute() {
        this.muted = !this.muted;

        if (this.initialized) {
            this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
        }

        this.saveSettings();
        return this.muted;
    }

    /**
     * Sets mute state.
     * @param {boolean} muted - Whether audio should be muted
     */
    setMuted(muted) {
        this.muted = muted;

        if (this.initialized) {
            this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
        }

        this.saveSettings();
    }

    /**
     * Resumes the audio context if suspended.
     * Call this on user interaction if audio isn't playing.
     */
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            console.log('AudioManager: Context resumed');
        }
    }

    /**
     * Saves volume settings to localStorage.
     */
    saveSettings() {
        const settings = {
            masterVolume: this.masterVolume,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            muted: this.muted
        };
        localStorage.setItem('losv_audio_settings', JSON.stringify(settings));
    }

    /**
     * Loads volume settings from localStorage.
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('losv_audio_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.masterVolume = settings.masterVolume ?? 1.0;
                this.musicVolume = settings.musicVolume ?? 0.5;
                this.sfxVolume = settings.sfxVolume ?? 0.7;
                this.muted = settings.muted ?? false;
            }
        } catch (error) {
            console.warn('AudioManager: Failed to load settings', error);
        }
    }

    /**
     * Gets current volume settings.
     * @returns {Object} Volume settings
     */
    getSettings() {
        return {
            masterVolume: this.masterVolume,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            muted: this.muted
        };
    }

    /**
     * Cleans up audio resources.
     */
    dispose() {
        this.stopMusic(0);

        if (this.audioContext) {
            this.audioContext.close();
        }

        this.audioBuffers.clear();
        this.initialized = false;
    }
}

// Singleton instance for global use
export const audioManager = new AudioManager();
