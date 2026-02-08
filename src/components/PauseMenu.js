/**
 * Manages the pause menu UI and game pause state.
 */
export class PauseMenu {
    constructor(game) {
        this.game = game;
        this.isPaused = false;
        this.overlay = null;
        this.boundKeyHandler = this.handleKeyPress.bind(this);

        // Settings stored in localStorage
        this.settings = this.loadSettings();

        this.init();
    }

    /**
     * Initializes the pause menu and event listeners.
     */
    init() {
        this.createOverlay();
        window.addEventListener('keydown', this.boundKeyHandler);
    }

    /**
     * Loads settings from localStorage.
     * @returns {Object} Settings object
     */
    loadSettings() {
        const saved = localStorage.getItem('losv_settings');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to parse saved settings');
            }
        }
        return {
            musicVolume: 0.5,
            sfxVolume: 0.7,
            showControls: true
        };
    }

    /**
     * Saves settings to localStorage.
     */
    saveSettings() {
        localStorage.setItem('losv_settings', JSON.stringify(this.settings));
    }

    /**
     * Handles keyboard input for pause menu.
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyPress(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            if (this.isPaused) {
                this.resume();
            } else {
                this.pause();
            }
        }
    }

    /**
     * Creates the pause menu overlay element.
     */
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'pause-menu';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: none;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            color: #e8e8e8;
            font-family: 'Press Start 2P', monospace;
        `;

        this.overlay.innerHTML = `
            <style>
                #pause-menu .menu-title {
                    font-size: 32px;
                    color: #ffd700;
                    margin-bottom: 40px;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                }
                #pause-menu .menu-container {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    min-width: 300px;
                }
                #pause-menu .menu-btn {
                    background: linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 100%);
                    color: #fff;
                    border: 2px solid #666;
                    padding: 15px 30px;
                    font-size: 14px;
                    font-family: inherit;
                    cursor: pointer;
                    border-radius: 5px;
                    transition: all 0.2s;
                    text-align: center;
                }
                #pause-menu .menu-btn:hover {
                    background: linear-gradient(180deg, #5a5a5a 0%, #3a3a3a 100%);
                    border-color: #ffd700;
                    transform: scale(1.02);
                }
                #pause-menu .menu-btn:active {
                    transform: scale(0.98);
                }
                #pause-menu .settings-panel {
                    display: none;
                    background: rgba(40, 40, 40, 0.95);
                    padding: 30px;
                    border-radius: 10px;
                    border: 2px solid #666;
                    min-width: 350px;
                }
                #pause-menu .settings-panel.active {
                    display: block;
                }
                #pause-menu .settings-title {
                    font-size: 20px;
                    color: #ffd700;
                    margin-bottom: 25px;
                    text-align: center;
                }
                #pause-menu .setting-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin: 15px 0;
                }
                #pause-menu .setting-label {
                    font-size: 12px;
                    color: #ccc;
                }
                #pause-menu .setting-slider {
                    width: 150px;
                    height: 8px;
                    -webkit-appearance: none;
                    background: #333;
                    border-radius: 4px;
                    outline: none;
                }
                #pause-menu .setting-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 18px;
                    height: 18px;
                    background: #ffd700;
                    border-radius: 50%;
                    cursor: pointer;
                }
                #pause-menu .controls-panel {
                    display: none;
                    background: rgba(40, 40, 40, 0.95);
                    padding: 30px;
                    border-radius: 10px;
                    border: 2px solid #666;
                    min-width: 350px;
                }
                #pause-menu .controls-panel.active {
                    display: block;
                }
                #pause-menu .controls-title {
                    font-size: 20px;
                    color: #ffd700;
                    margin-bottom: 25px;
                    text-align: center;
                }
                #pause-menu .control-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 12px 0;
                    font-size: 11px;
                }
                #pause-menu .control-key {
                    color: #4ade80;
                    background: #333;
                    padding: 4px 10px;
                    border-radius: 4px;
                }
                #pause-menu .control-desc {
                    color: #ccc;
                }
                #pause-menu .back-btn {
                    margin-top: 20px;
                    background: #444;
                    font-size: 12px;
                    padding: 10px 20px;
                }
            </style>

            <div class="menu-title">PAUSED</div>

            <div class="menu-container" id="main-menu">
                <button class="menu-btn" id="resume-btn">Resume</button>
                <button class="menu-btn" id="settings-btn">Settings</button>
                <button class="menu-btn" id="controls-btn">Controls</button>
                <button class="menu-btn" id="restart-btn">Restart Game</button>
            </div>

            <div class="settings-panel" id="settings-panel">
                <div class="settings-title">Settings</div>
                <div class="setting-row">
                    <span class="setting-label">Music Volume</span>
                    <input type="range" class="setting-slider" id="music-volume" min="0" max="100" value="50">
                </div>
                <div class="setting-row">
                    <span class="setting-label">SFX Volume</span>
                    <input type="range" class="setting-slider" id="sfx-volume" min="0" max="100" value="70">
                </div>
                <button class="menu-btn back-btn" id="settings-back">Back</button>
            </div>

            <div class="controls-panel" id="controls-panel">
                <div class="controls-title">Controls</div>
                <div class="control-row">
                    <span class="control-desc">Move</span>
                    <span class="control-key">Arrow Keys / WASD</span>
                </div>
                <div class="control-row">
                    <span class="control-desc">Interact</span>
                    <span class="control-key">Space / Z / Enter</span>
                </div>
                <div class="control-row">
                    <span class="control-desc">Open Inventory</span>
                    <span class="control-key">I</span>
                </div>
                <div class="control-row">
                    <span class="control-desc">Zoom In/Out</span>
                    <span class="control-key">+ / -</span>
                </div>
                <div class="control-row">
                    <span class="control-desc">Pause Game</span>
                    <span class="control-key">Escape</span>
                </div>
                <button class="menu-btn back-btn" id="controls-back">Back</button>
            </div>
        `;

        document.body.appendChild(this.overlay);
        this.attachEventListeners();
    }

    /**
     * Attaches event listeners to menu buttons.
     */
    attachEventListeners() {
        // Main menu buttons
        document.getElementById('resume-btn').addEventListener('click', () => this.resume());
        document.getElementById('settings-btn').addEventListener('click', () => this.showSettings());
        document.getElementById('controls-btn').addEventListener('click', () => this.showControls());
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());

        // Settings panel
        document.getElementById('settings-back').addEventListener('click', () => this.showMainMenu());
        document.getElementById('music-volume').addEventListener('input', (e) => {
            this.settings.musicVolume = e.target.value / 100;
            this.saveSettings();
            // Notify audio manager if it exists
            if (this.game.audioManager) {
                this.game.audioManager.setMusicVolume(this.settings.musicVolume);
            }
        });
        document.getElementById('sfx-volume').addEventListener('input', (e) => {
            this.settings.sfxVolume = e.target.value / 100;
            this.saveSettings();
            // Notify audio manager if it exists
            if (this.game.audioManager) {
                this.game.audioManager.setSFXVolume(this.settings.sfxVolume);
            }
        });

        // Controls panel
        document.getElementById('controls-back').addEventListener('click', () => this.showMainMenu());

        // Update sliders to match saved settings
        document.getElementById('music-volume').value = this.settings.musicVolume * 100;
        document.getElementById('sfx-volume').value = this.settings.sfxVolume * 100;
    }

    /**
     * Shows the main pause menu.
     */
    showMainMenu() {
        document.getElementById('main-menu').style.display = 'flex';
        document.getElementById('settings-panel').classList.remove('active');
        document.getElementById('controls-panel').classList.remove('active');
    }

    /**
     * Shows the settings panel.
     */
    showSettings() {
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('settings-panel').classList.add('active');
        document.getElementById('controls-panel').classList.remove('active');
    }

    /**
     * Shows the controls panel.
     */
    showControls() {
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('settings-panel').classList.remove('active');
        document.getElementById('controls-panel').classList.add('active');
    }

    /**
     * Pauses the game and shows the pause menu.
     */
    pause() {
        if (this.isPaused) return;

        this.isPaused = true;
        this.overlay.style.display = 'flex';
        this.showMainMenu();

        // Pause game loop if game has a pause method
        if (this.game && typeof this.game.pauseGame === 'function') {
            this.game.pauseGame();
        }
    }

    /**
     * Resumes the game and hides the pause menu.
     */
    resume() {
        if (!this.isPaused) return;

        this.isPaused = false;
        this.overlay.style.display = 'none';

        // Resume game loop if game has a resume method
        if (this.game && typeof this.game.resumeGame === 'function') {
            this.game.resumeGame();
        }
    }

    /**
     * Restarts the game.
     */
    restart() {
        if (this.game && this.game.progressionManager) {
            this.game.progressionManager.resetProgress();
        }
        location.reload();
    }

    /**
     * Returns current settings.
     * @returns {Object} Current settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Cleans up event listeners.
     */
    dispose() {
        window.removeEventListener('keydown', this.boundKeyHandler);
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
    }
}
