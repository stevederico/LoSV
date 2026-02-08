import * as THREE from 'three';
import { Player } from './components/player.js';
import { World } from './components/world.js';
import { Camera } from './components/camera.js';
import { Controls } from './components/controls.js';
import { Enemies } from './components/enemies.js';
import { DialogueManager } from './components/DialogueManager.js';
import { StartupSimulator } from './components/StartupSimulator.js';
import { SimulatorDialogue } from './components/SimulatorDialogue.js';
import { Inventory } from './components/Inventory.js';
import { ProgressionManager } from './components/ProgressionManager.js';
import { PauseMenu } from './components/PauseMenu.js';
import { audioManager } from './utils/AudioManager.js';
import { loadAssets, setupKeyboardControls } from './utils/helpers.js';

export class Game {
    constructor() {
        // Set up the scene
        this.scene = new THREE.Scene();
        
        // Configure renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        // Set up game components
        this.setupRenderer();
        
        // Initialize keyboard controls
        this.keys = setupKeyboardControls();

        // Initialize DialogueManager
        this.dialogueManager = new DialogueManager();
        
        // Initialize Startup Simulator
        this.startupSimulator = new StartupSimulator();
        this.simulatorDialogue = new SimulatorDialogue(this.dialogueManager);
        
        // Initialize Inventory
        this.inventory = new Inventory();

        // Initialize Progression Manager
        this.progressionManager = new ProgressionManager();

        // Track picked up items per building (disabled for testing)
        this.pickedUpItems = {
            house: []
        };

        // Create game world with progression manager
        this.world = new World(this.scene, this.progressionManager);
        
        // Set up camera after world is created
        this.camera = new Camera(this.scene, this.renderer);
        
        // Create player after camera is set up, passing both exit and enter callbacks
        this.player = new Player(
            this.scene,
            this.camera,
            this.handleExitBuilding.bind(this),
            this.handleEnterBuilding.bind(this)
        );
        this.player.game = this; // Give player a reference to the game instance for dialogue
        this.scene.add(this.player.getMesh());
        
        // Create controls after player is created
        this.controls = new Controls(this.player, this.camera, this.world, this.handleEnterBuilding.bind(this));
        
        // Create enemies after world and player exist
        this.enemies = new Enemies(this.scene, this.world);

        this.setupLights();
        this.setupUI(); // Add this line

        // Update building lock states based on progression
        this.world.updateBuildingStates();

        // Initialize audio manager
        this.audioManager = audioManager;

        // Initialize pause menu (with reference to audio manager)
        this.pauseMenu = new PauseMenu(this);
        this.gamePaused = false;

        this.assetsLoaded = false;

        this.loadAssets();
        this.startGameLoop();

        // Initialize audio on first user interaction
        this.initAudioOnInteraction();
        
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }

    setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x87CEEB); // Light blue sky color - Default for main world
        document.getElementById('game-container').appendChild(this.renderer.domElement);
    }
    
    setupUI() {
        // Wait a moment for the menu elements to be available in the DOM
        setTimeout(() => {
            this.rupeesElement = document.querySelector('#rupees span');
            this.lifeHeartsContainer = document.getElementById('life-hearts');
            this.dauElement = document.querySelector('#dau-display span:last-child');
            this.mrrElement = document.querySelector('#mrr-display span:last-child');

            // Initialize UI with progression manager values
            const stats = this.progressionManager.currentStats;
            this.updateFunding(stats.funding);
            this.updateRunway(stats.runway);
            this.updateDAU(stats.dau);
            this.updateMRR(stats.mrr);
        }, 100);
    }

    updateFunding(amount) {
        if (this.rupeesElement) {
            // Format funding (e.g., $2.5M, $500k, $0)
            let displayText;
            if (amount >= 1000000) {
                displayText = `$${(amount / 1000000).toFixed(1)}M`;
            } else if (amount >= 1000) {
                displayText = `$${(amount / 1000).toFixed(0)}k`;
            } else {
                displayText = `$${amount}`;
            }
            this.rupeesElement.textContent = displayText;
        } else {
            this.rupeesElement = document.querySelector('#rupees span');
            if (this.rupeesElement) {
                this.updateFunding(amount);
            }
        }
    }

    updateRunway(months) {
        if (this.lifeHeartsContainer) {
            this.lifeHeartsContainer.innerHTML = '';
            const maxHearts = 12; // Maximum runway is 12 months

            for (let i = 0; i < maxHearts; i++) {
                const heartElement = document.createElement('div');
                heartElement.className = i < months ? 'heart' : 'heart empty';
                this.lifeHeartsContainer.appendChild(heartElement);
            }
        } else {
            this.lifeHeartsContainer = document.getElementById('life-hearts');
            if (this.lifeHeartsContainer) {
                this.updateRunway(months);
            }
        }
    }

    updateDAU(count) {
        // Find the DAU value element directly
        const dauValueElement = document.querySelector('#dau-display .stat-value') || 
                               document.querySelector('#dau-display span:last-child');
        if (dauValueElement) {
            dauValueElement.textContent = count.toString();
        }
    }

    updateMRR(amount) {
        // Find the MRR value element directly
        const mrrValueElement = document.querySelector('#mrr-display .stat-value') || 
                               document.querySelector('#mrr-display span:last-child');
        if (mrrValueElement) {
            mrrValueElement.textContent = `$${amount.toString()}`;
        }
    }

    setupLights() {
        // Clear existing lights first to prevent duplicates if called multiple times
        const lights = this.scene.children.filter(obj => obj.isLight);
        lights.forEach(light => this.scene.remove(light));

        // Add ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        
        // Add directional light for shadows and definition
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(1, 10, 1);
        this.scene.add(directionalLight);
    }

    loadAssets() {
        loadAssets().then(() => {
            console.log("Starting game with assets loaded");
            this.assetsLoaded = true;
        });
    }

    startGameLoop() {
        const animate = () => {
            requestAnimationFrame(animate);
            this.update();
            this.render();
        };
        animate();
    }

    /**
     * Initializes audio on the first user interaction (browser requirement).
     */
    initAudioOnInteraction() {
        const initAudio = async () => {
            if (!this.audioManager.initialized) {
                await this.audioManager.init();
                // Start background music
                this.audioManager.playMusic('main');
            }
            // Remove listeners after initialization
            document.removeEventListener('click', initAudio);
            document.removeEventListener('keydown', initAudio);
        };

        document.addEventListener('click', initAudio, { once: true });
        document.addEventListener('keydown', initAudio, { once: true });
    }

    /**
     * Plays a sound effect through the audio manager.
     * @param {string} sfxName - Name of the sound effect
     */
    playSFX(sfxName) {
        if (this.audioManager && this.audioManager.initialized) {
            this.audioManager.playSFX(sfxName);
        }
    }

    /**
     * Pauses the game loop.
     */
    pauseGame() {
        this.gamePaused = true;
    }

    /**
     * Resumes the game loop.
     */
    resumeGame() {
        this.gamePaused = false;
    }

    update() {
        if (!this.assetsLoaded) return;
        if (this.gamePaused) return;

        // Check for game over
        this.checkGameOver();

        // Handle dialogue advancement/interaction first
        // The DialogueManager itself doesn't need an update() call here,
        // but player input for it is handled in Player.update()
        // and visibility is managed by its own methods.

        // Update controls to handle player movement and actions
        if (this.player.isInBuilding) {
            // Pass obstacles for collision
            this.controls.update(this.player.buildingObstacles);
            // Check for building-specific interactions
            this.controls.checkBuildingInteraction();
        } else {
            this.controls.update(this.world.getObstacles());
        }

        // Update enemies only if not in a building and dialogue is not active
        if (!this.player.isInBuilding && !this.dialogueManager.isActive()) {
            this.enemies.update(this.player.getPosition());
        }

        // Update world for any animations or environmental changes (if not in building and dialogue not active)
        if (!this.player.isInBuilding && !this.dialogueManager.isActive()) {
            this.world.update();
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera.getCamera());
    }
    
    onWindowResize() {
        // Update camera aspect ratio and projection matrix
        if (this.camera && this.camera.getCamera()) {
            const camera = this.camera.getCamera();
            const aspect = window.innerWidth / window.innerHeight;
            
            // Check if orthographic camera
            if (camera.isOrthographicCamera) {
                const frustumSize = 20;
                camera.left = frustumSize * aspect / -2;
                camera.right = frustumSize * aspect / 2;
                camera.top = frustumSize / 2;
                camera.bottom = frustumSize / -2;
            } else {
                // For perspective camera
                camera.aspect = aspect;
            }
            
            camera.updateProjectionMatrix();
        }
        
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    handleEnterBuilding(building) {
        console.log("Game: Handling enter building:", building.userData.buildingType);

        const buildingType = building.userData.buildingType;

        // Check if building is locked
        if (this.progressionManager.isLocked(buildingType)) {
            const requirementsText = this.progressionManager.getRequirementsText(buildingType);
            this.dialogueManager.showMessage(
                `🔒 ${this.progressionManager.formatBuildingName(buildingType)} - LOCKED`,
                requirementsText
            );
            this.playSFX('error');
            return; // Don't enter the building
        }

        // Play door open sound
        this.playSFX('doorOpen');

        // Switch to interior ambient music
        if (this.audioManager && this.audioManager.initialized) {
            this.audioManager.playMusic('interior', true, 0.5);
        }

        this.player.isInBuilding = true;
        this.player.currentBuilding = building;

        // 1. Clear the main scene (except player and camera, if they are managed separately)
        // Remove world elements
        this.world.terrain.forEach(t => this.scene.remove(t));
        this.world.obstacles.forEach(o => this.scene.remove(o));
        this.world.interactiveElements.forEach(i => this.scene.remove(i));
        this.world.buildings.forEach(b => this.scene.remove(b)); // Remove building sprites from outdoor scene
        this.world.colliders.forEach(c => { // Also ensure colliders that are meshes are removed
            if (c instanceof THREE.Mesh) {
                this.scene.remove(c);
            }
        });


        // Remove enemies from the outdoor scene
        this.enemies.enemies.forEach(enemy => this.scene.remove(enemy.mesh));
        this.enemies.enemies = []; // Clear the list

        // 2. Set up the building interior and start simulator if applicable
        this.player.buildingObstacles = []; // Clear previous building obstacles

        // Check if this building has a simulator level
        const simulatorLevel = this.startupSimulator.getLevelForBuilding(buildingType);

        if (simulatorLevel) {
            // Set up callback for when dialogue triggers simulator
            // DO NOT auto-start - let dialogue choices control this
            this.dialogueManager.onStartSimulator = () => {
                this.startSimulatorLevel(simulatorLevel);
            };
        } else {
            this.dialogueManager.onStartSimulator = null;
        }

        // Set up building-specific interiors
        switch (buildingType) {
            case 'house':
                this.renderer.setClearColor(0xaaaaaa); // Grey interior for house
                this.setupHouseInterior();
                break;
            case 'garage':
                this.renderer.setClearColor(0xbbbbbb); // Different Grey for garage
                this.setupGarageInterior();
                break;
            case 'accelerator':
                this.renderer.setClearColor(0x9999cc); // Purple-grey for accelerator
                this.setupAcceleratorInterior();
                break;
            case 'loft':
                this.renderer.setClearColor(0xccaa88); // Warm brown for loft
                this.setupLoftInterior();
                break;
            case 'conference':
                this.renderer.setClearColor(0x888888); // Dark grey for conference
                this.setupConferenceInterior();
                break;
            case 'data-center':
                this.renderer.setClearColor(0x666699); // Blue-grey for data center
                this.setupDataCenterInterior();
                break;
            case 'board-room':
                this.renderer.setClearColor(0x664400); // Executive brown
                this.setupBoardRoomInterior();
                break;
            case 'venture':
                this.renderer.setClearColor(0x999966); // Gold-grey for venture
                this.setupVentureInterior();
                break;
            case 'law':
                this.renderer.setClearColor(0x666666); // Dark grey for law
                this.setupLawInterior();
                break;
            case 'nasdaq':
                this.renderer.setClearColor(0x669966); // Green-grey for nasdaq
                this.setupNasdaqInterior();
                break;
            default:
                this.renderer.setClearColor(0xaaaaaa); // Default grey
                break;
        }

        // 3. Position player inside the building (example positions)
        this.player.getMesh().position.set(0, 0.5, 0); // Adjust as needed for each interior

        // 4. Adjust camera if necessary (e.g., different zoom or angle for interiors)
        this.camera.setInteriorView(); // You'll need to implement this in Camera.js

        // 5. Remove main world lights and set up interior lighting
        const lights = this.scene.children.filter(obj => obj.isLight);
        lights.forEach(light => this.scene.remove(light));
        
        const interiorLight = new THREE.PointLight(0xffffff, 0.8, 50);
        interiorLight.position.set(0, 3, 0); // Example position
        this.scene.add(interiorLight);

        // Show building name at top of screen
        this.showBuildingName(buildingType);

        console.log("Game: Entered building interior.");
    }

    /**
     * Shows the building name at the top of the screen.
     * @param {string} buildingType - The building type identifier
     */
    showBuildingName(buildingType) {
        const nameElement = document.getElementById('building-name');
        if (nameElement) {
            nameElement.textContent = this.formatBuildingName(buildingType);
            nameElement.style.display = 'block';
        }
    }

    /**
     * Hides the building name display.
     */
    hideBuildingName() {
        const nameElement = document.getElementById('building-name');
        if (nameElement) {
            nameElement.style.display = 'none';
        }
    }

    /**
     * Formats a building type ID into a human-readable name.
     * @param {string} buildingType - The building type identifier
     * @returns {string} The formatted building name
     */
    formatBuildingName(buildingType) {
        const names = {
            'house': 'Home',
            'garage': 'Garage',
            'accelerator': 'Accelerator',
            'loft': 'Startup Loft',
            'conference': 'Conference Room',
            'data-center': 'Data Center',
            'board-room': 'Board Room',
            'venture': 'VC Office',
            'law': 'Law Firm',
            'nasdaq': 'NASDAQ'
        };
        return names[buildingType] || buildingType;
    }

    handleExitBuilding() {
        console.log("Game: Handling exit building.");

        // Hide building name display
        this.hideBuildingName();

        // Play door close sound
        this.playSFX('doorClose');

        // Switch back to main theme music
        if (this.audioManager && this.audioManager.initialized) {
            this.audioManager.playMusic('main', true, 0.5);
        }

        // Clean up building-specific items
        if (this.player.buildingInteractiveElements) {
            this.player.buildingInteractiveElements.forEach(item => {
                if (item.parent) {
                    item.parent.remove(item);
                }
            });
            this.player.buildingInteractiveElements = [];
        }
        
        // Clean up building obstacles
        this.player.buildingObstacles.forEach(obstacle => {
            if (obstacle.parent) {
                obstacle.parent.remove(obstacle);
            }
        });
        this.player.buildingObstacles = [];

        // 1. Reset scene background/renderer clear color for the main world
        this.renderer.setClearColor(0x87CEEB); // Light blue sky color
        this.scene.background = null; // Or your original main world background if it was a texture/skybox

        // 2. Repopulate the main world
        // Assuming world.init() clears and re-adds its own elements. 
        // If not, manual clearing of old world elements might be needed before this.
        this.world.init(); // This should re-add terrain, buildings, etc.

        // 3. Re-add the player's mesh to the scene
        this.scene.add(this.player.getMesh());
        // Player position is already updated in player.js exitBuilding method

        // 4. Setting up main world lights
        this.setupLights();

        // 5. Re-initialize or re-add enemies
        // If enemies are simple, re-creating them might be easiest.
        // Otherwise, you might need a method to re-add existing enemy meshes to the scene.
        this.scene.remove(this.enemies.enemies.map(e => e.mesh)); // Remove old enemy meshes if any
        this.enemies = new Enemies(this.scene, this.world); // Recreate enemies for the main world

        console.log("Game: Main world restored. Player and enemies re-added.");
    }
    
    // Startup Simulator Methods
    startSimulatorLevel(levelNumber) {
        console.log(`Starting simulator level ${levelNumber}`);
        
        // Start the level
        const roundData = this.startupSimulator.startLevel(levelNumber);
        if (!roundData) {
            console.error(`Failed to start simulator level ${levelNumber}`);
            return;
        }
        
        // Display the first round
        this.simulatorDialogue.displayRound(roundData);
        
        // Set up choice callback
        this.simulatorDialogue.setChoiceCallback((choice) => {
            this.handleSimulatorChoice(choice);
        });
    }
    
    handleSimulatorChoice(choice) {
        console.log(`Player chose option ${choice}`);
        
        // Process the choice
        const result = this.startupSimulator.makeChoice(choice);
        if (!result) {
            console.error('Failed to process choice');
            return;
        }
        
        // Update game stats based on simulator progress
        const stats = this.startupSimulator.getPlayerStats();
        this.updateDAU(stats.dau);
        this.updateMRR(stats.mrr);
        
        // Display the result
        this.simulatorDialogue.displayResult(result);
        
        // Handle next round or level completion
        if (!result.levelComplete) {
            // Wait for player to press any key, then show next round
            const handleContinue = (event) => {
                document.removeEventListener('keydown', handleContinue);
                
                const nextRound = this.startupSimulator.getCurrentRoundData();
                if (nextRound) {
                    this.simulatorDialogue.displayRound(nextRound);
                }
            };
            
            setTimeout(() => {
                document.addEventListener('keydown', handleContinue);
            }, 1000);
        } else {
            // Level complete - update progression
            const finalScore = result.score || 0;
            const currentBuilding = this.player.currentBuilding?.userData.buildingType;

            if (currentBuilding) {
                // Mark level as complete in progression
                this.progressionManager.completeLevel(currentBuilding, finalScore);

                // Update stats from simulator
                const stats = this.startupSimulator.getPlayerStats();
                this.progressionManager.updateStats({
                    dau: stats.dau,
                    mrr: stats.mrr,
                    funding: stats.funding || 0,
                    teamSize: stats.teamSize || 1
                });

                // Update building visuals
                this.world.updateBuildingStates();

                // Check for victory (completed NASDAQ level)
                if (currentBuilding === 'nasdaq') {
                    setTimeout(() => {
                        this.showVictoryScreen(stats);
                    }, 5500);
                } else {
                    // Show unlock notification if next building was unlocked
                    const buildingOrder = [
                        'house', 'garage', 'accelerator', 'loft', 'conference',
                        'data-center', 'board-room', 'venture', 'law', 'nasdaq'
                    ];
                    const currentIndex = buildingOrder.indexOf(currentBuilding);
                    if (currentIndex >= 0 && currentIndex < buildingOrder.length - 1) {
                        const nextBuilding = buildingOrder[currentIndex + 1];
                        if (!this.progressionManager.isLocked(nextBuilding)) {
                            setTimeout(() => {
                                this.dialogueManager.showMessage(
                                    '✨ NEW BUILDING UNLOCKED!',
                                    `${this.progressionManager.formatBuildingName(nextBuilding)} is now accessible!`
                                );
                            }, 5500);
                        }
                    }
                }
            }

            // Hide simulator after a delay
            setTimeout(() => {
                this.simulatorDialogue.hide();
            }, 5000);
        }
    }
    
    // Building Interior Setup Methods
    setupHouseInterior() {
        // Add a table
        const tableGeometry = new THREE.BoxGeometry(2, 0.5, 1);
        const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        table.position.set(0, 0.25, -3);
        this.scene.add(table);
        this.player.buildingObstacles.push(table);
        
        // Add a bookshelf
        const shelfGeometry = new THREE.BoxGeometry(0.5, 2, 3);
        const shelfMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
        const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
        shelf.position.set(-3, 1, 0);
        this.scene.add(shelf);
        this.player.buildingObstacles.push(shelf);
        
        // Initialize building interactive elements array
        this.player.buildingInteractiveElements = this.player.buildingInteractiveElements || [];
        
        // Always create MacBook for testing (pickup tracking disabled)
        const macbook = this.world.createMacBook(0, -2.5, 0.8, 0.6);
        macbook.userData.buildingType = 'house';
        this.player.buildingInteractiveElements.push(macbook);
        
        // Always create iPhone for testing (pickup tracking disabled)
        const iphone = this.world.createiPhone(-2.7, 0, 0.3, 0.5);
        iphone.userData.buildingType = 'house';
        this.player.buildingInteractiveElements.push(iphone);
    }
    
    setupGarageInterior() {
        // Add a car
        const carGeometry = new THREE.BoxGeometry(2, 1, 4);
        const carMaterial = new THREE.MeshStandardMaterial({ color: 0xffa500 });
        const car = new THREE.Mesh(carGeometry, carMaterial);
        car.position.set(0, 0.5, -2);
        this.scene.add(car);
        this.player.buildingObstacles.push(car);
        
        // Add a workbench
        const workbenchGeometry = new THREE.BoxGeometry(3, 0.8, 0.8);
        const workbenchMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
        const workbench = new THREE.Mesh(workbenchGeometry, workbenchMaterial);
        workbench.position.set(-2, 0.4, 2);
        this.scene.add(workbench);
        this.player.buildingObstacles.push(workbench);
    }
    
    setupAcceleratorInterior() {
        // Add desks in rows
        for (let i = 0; i < 3; i++) {
            const deskGeometry = new THREE.BoxGeometry(1.5, 0.7, 0.8);
            const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            const desk = new THREE.Mesh(deskGeometry, deskMaterial);
            desk.position.set(-2 + i * 2, 0.35, -2);
            this.scene.add(desk);
            this.player.buildingObstacles.push(desk);
        }
        
        // Add a whiteboard
        const boardGeometry = new THREE.BoxGeometry(3, 2, 0.1);
        const boardMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const board = new THREE.Mesh(boardGeometry, boardMaterial);
        board.position.set(0, 1.5, -3.5);
        this.scene.add(board);
        this.player.buildingObstacles.push(board);
    }
    
    setupLoftInterior() {
        // Add art easels
        const easelGeometry = new THREE.BoxGeometry(0.8, 1.5, 0.8);
        const easelMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        
        for (let i = 0; i < 2; i++) {
            const easel = new THREE.Mesh(easelGeometry, easelMaterial);
            easel.position.set(-2 + i * 4, 0.75, -1);
            this.scene.add(easel);
            this.player.buildingObstacles.push(easel);
        }
        
        // Add a couch
        const couchGeometry = new THREE.BoxGeometry(3, 0.6, 1.2);
        const couchMaterial = new THREE.MeshStandardMaterial({ color: 0x4169e1 });
        const couch = new THREE.Mesh(couchGeometry, couchMaterial);
        couch.position.set(0, 0.3, 2);
        this.scene.add(couch);
        this.player.buildingObstacles.push(couch);
    }
    
    setupConferenceInterior() {
        // Add conference table
        const tableGeometry = new THREE.BoxGeometry(4, 0.8, 2);
        const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x2F4F4F });
        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        table.position.set(0, 0.4, 0);
        this.scene.add(table);
        this.player.buildingObstacles.push(table);
        
        // Add chairs around table
        const chairGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.6);
        const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x696969 });
        
        const chairPositions = [
            [-1.5, 0.4, -1.5], [0, 0.4, -1.5], [1.5, 0.4, -1.5],
            [-1.5, 0.4, 1.5], [0, 0.4, 1.5], [1.5, 0.4, 1.5]
        ];
        
        chairPositions.forEach(pos => {
            const chair = new THREE.Mesh(chairGeometry, chairMaterial);
            chair.position.set(...pos);
            this.scene.add(chair);
            this.player.buildingObstacles.push(chair);
        });
    }
    
    setupDataCenterInterior() {
        // Add server racks
        const rackGeometry = new THREE.BoxGeometry(0.8, 2, 2);
        const rackMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
        
        for (let i = 0; i < 4; i++) {
            const rack = new THREE.Mesh(rackGeometry, rackMaterial);
            rack.position.set(-3 + i * 2, 1, -2);
            this.scene.add(rack);
            this.player.buildingObstacles.push(rack);
        }
        
        // Add blinking lights on servers
        const lightGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const lightMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.5
        });
        
        for (let i = 0; i < 8; i++) {
            const light = new THREE.Mesh(lightGeometry, lightMaterial);
            light.position.set(-3 + (i % 4) * 2, 1.5, -2.05);
            this.scene.add(light);
        }
    }
    
    setupVentureInterior() {
        // Add fancy desk
        const deskGeometry = new THREE.BoxGeometry(3, 0.8, 1.5);
        const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x4B0000 });
        const desk = new THREE.Mesh(deskGeometry, deskMaterial);
        desk.position.set(0, 0.4, -2);
        this.scene.add(desk);
        this.player.buildingObstacles.push(desk);
        
        // Add leather chairs
        const chairGeometry = new THREE.BoxGeometry(1, 1, 1);
        const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        
        for (let i = 0; i < 2; i++) {
            const chair = new THREE.Mesh(chairGeometry, chairMaterial);
            chair.position.set(-1.5 + i * 3, 0.5, 1);
            this.scene.add(chair);
            this.player.buildingObstacles.push(chair);
        }
    }
    
    setupLawInterior() {
        // Add bookshelves
        const shelfGeometry = new THREE.BoxGeometry(0.5, 2.5, 3);
        const shelfMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
        
        for (let i = 0; i < 2; i++) {
            const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
            shelf.position.set(-3.5 + i * 7, 1.25, 0);
            this.scene.add(shelf);
            this.player.buildingObstacles.push(shelf);
        }
        
        // Add desk with papers
        const deskGeometry = new THREE.BoxGeometry(2, 0.8, 1);
        const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const desk = new THREE.Mesh(deskGeometry, deskMaterial);
        desk.position.set(0, 0.4, 0);
        this.scene.add(desk);
        this.player.buildingObstacles.push(desk);
    }
    
    setupNasdaqInterior() {
        // Add trading terminals
        const terminalGeometry = new THREE.BoxGeometry(1, 1.2, 0.8);
        const terminalMaterial = new THREE.MeshStandardMaterial({ color: 0x000080 });

        for (let i = 0; i < 4; i++) {
            const terminal = new THREE.Mesh(terminalGeometry, terminalMaterial);
            terminal.position.set(-3 + i * 2, 0.6, -2);
            this.scene.add(terminal);
            this.player.buildingObstacles.push(terminal);
        }

        // Add stock ticker display
        const tickerGeometry = new THREE.BoxGeometry(6, 1, 0.2);
        const tickerMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            emissive: 0x00ff00,
            emissiveIntensity: 0.3
        });
        const ticker = new THREE.Mesh(tickerGeometry, tickerMaterial);
        ticker.position.set(0, 2.5, -3.5);
        this.scene.add(ticker);
        this.player.buildingObstacles.push(ticker);
    }

    setupBoardRoomInterior() {
        // Large conference table
        const tableGeometry = new THREE.BoxGeometry(4, 0.5, 2);
        const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2511 });
        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        table.position.set(0, 0.25, -2);
        this.scene.add(table);
        this.player.buildingObstacles.push(table);

        // Executive chairs (8 around table)
        const chairGeometry = new THREE.BoxGeometry(0.5, 1, 0.5);
        const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

        const chairPositions = [
            [-1.5, 0, -3], [1.5, 0, -3],  // Top
            [-1.5, 0, -1], [1.5, 0, -1],  // Bottom
            [-2.5, 0, -2], [2.5, 0, -2],  // Sides
            [-1, 0, -2], [1, 0, -2]       // Middle
        ];

        chairPositions.forEach(pos => {
            const chair = new THREE.Mesh(chairGeometry, chairMaterial);
            chair.position.set(pos[0], 0.5, pos[1]);
            this.scene.add(chair);
            this.player.buildingObstacles.push(chair);
        });

        // Initialize interactive elements array
        this.player.buildingInteractiveElements = this.player.buildingInteractiveElements || [];
    }

    /**
     * Displays the victory screen when the player completes level 10 (NASDAQ).
     * @param {Object} stats - Final player stats to display
     */
    showVictoryScreen(stats) {
        // Play victory music
        if (this.audioManager && this.audioManager.initialized) {
            this.audioManager.playMusic('victory', false, 0.3);
        }

        // Create victory overlay
        const overlay = document.createElement('div');
        overlay.id = 'victory-screen';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            color: #e8e8e8;
            font-family: 'Press Start 2P', monospace;
            animation: fadeIn 1s ease-in;
        `;

        const formatMoney = (amount) => {
            if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
            if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}k`;
            return `$${amount}`;
        };

        overlay.innerHTML = `
            <style>
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
                @keyframes confetti { 0% { transform: translateY(-100vh) rotate(0deg); } 100% { transform: translateY(100vh) rotate(720deg); } }
                .confetti { position: absolute; width: 10px; height: 10px; animation: confetti 3s linear infinite; }
                .victory-title { font-size: 48px; color: #ffd700; text-shadow: 0 0 20px #ffd700; margin-bottom: 20px; animation: pulse 2s infinite; }
                .victory-subtitle { font-size: 18px; color: #4ade80; margin-bottom: 40px; }
                .stats-container { background: rgba(255,255,255,0.1); padding: 30px 50px; border-radius: 10px; margin-bottom: 40px; }
                .stat-row { display: flex; justify-content: space-between; margin: 15px 0; font-size: 14px; }
                .stat-label { color: #888; }
                .stat-value { color: #4ade80; }
                .victory-btn { background: #4ade80; color: #1a1a2e; border: none; padding: 15px 40px; font-size: 16px; font-family: inherit; cursor: pointer; border-radius: 5px; margin: 10px; transition: all 0.3s; }
                .victory-btn:hover { background: #22c55e; transform: scale(1.05); }
            </style>
            <div class="victory-title">CONGRATULATIONS!</div>
            <div class="victory-subtitle">You've taken your startup from idea to IPO!</div>
            <div class="stats-container">
                <div class="stat-row"><span class="stat-label">Final Funding:</span><span class="stat-value">${formatMoney(stats.funding || 0)}</span></div>
                <div class="stat-row"><span class="stat-label">Monthly Revenue:</span><span class="stat-value">${formatMoney(stats.mrr || 0)}</span></div>
                <div class="stat-row"><span class="stat-label">Daily Active Users:</span><span class="stat-value">${(stats.dau || 0).toLocaleString()}</span></div>
                <div class="stat-row"><span class="stat-label">Team Size:</span><span class="stat-value">${stats.teamSize || 1} people</span></div>
            </div>
            <div>
                <button class="victory-btn" id="play-again-btn">Play Again</button>
                <button class="victory-btn" id="main-menu-btn">Main Menu</button>
            </div>
        `;

        // Add confetti
        const colors = ['#ffd700', '#4ade80', '#60a5fa', '#f472b6', '#fb923c'];
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
            overlay.appendChild(confetti);
        }

        document.body.appendChild(overlay);

        // Button handlers
        document.getElementById('play-again-btn').addEventListener('click', () => {
            overlay.remove();
            this.progressionManager.resetProgress();
            location.reload();
        });

        document.getElementById('main-menu-btn').addEventListener('click', () => {
            overlay.remove();
            location.reload();
        });
    }

    /**
     * Displays the game over screen when runway reaches 0.
     */
    showGameOverScreen() {
        if (this.gameOverShown) return;
        this.gameOverShown = true;

        // Play game over music
        if (this.audioManager && this.audioManager.initialized) {
            this.audioManager.playMusic('gameover', false, 0.3);
        }

        const overlay = document.createElement('div');
        overlay.id = 'game-over-screen';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            color: #e8e8e8;
            font-family: 'Press Start 2P', monospace;
            animation: fadeIn 0.5s ease-in;
        `;

        const stats = this.progressionManager.currentStats;
        const completedLevels = this.progressionManager.completedLevels.length;

        overlay.innerHTML = `
            <style>
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
                .game-over-title { font-size: 48px; color: #ef4444; text-shadow: 0 0 20px #ef4444; margin-bottom: 20px; animation: shake 0.5s; }
                .game-over-subtitle { font-size: 16px; color: #888; margin-bottom: 40px; text-align: center; max-width: 400px; }
                .stats-container { background: rgba(255,255,255,0.1); padding: 30px 50px; border-radius: 10px; margin-bottom: 40px; }
                .stat-row { display: flex; justify-content: space-between; margin: 15px 0; font-size: 14px; gap: 40px; }
                .stat-label { color: #888; }
                .stat-value { color: #ef4444; }
                .game-over-btn { background: #ef4444; color: #fff; border: none; padding: 15px 40px; font-size: 16px; font-family: inherit; cursor: pointer; border-radius: 5px; margin: 10px; transition: all 0.3s; }
                .game-over-btn:hover { background: #dc2626; transform: scale(1.05); }
            </style>
            <div class="game-over-title">GAME OVER</div>
            <div class="game-over-subtitle">Your startup ran out of runway. The dream is over... for now.</div>
            <div class="stats-container">
                <div class="stat-row"><span class="stat-label">Levels Completed:</span><span class="stat-value">${completedLevels} / 10</span></div>
                <div class="stat-row"><span class="stat-label">Final DAU:</span><span class="stat-value">${(stats.dau || 0).toLocaleString()}</span></div>
                <div class="stat-row"><span class="stat-label">Final MRR:</span><span class="stat-value">$${(stats.mrr || 0).toLocaleString()}</span></div>
            </div>
            <div>
                <button class="game-over-btn" id="try-again-btn">Try Again</button>
                <button class="game-over-btn" id="main-menu-btn-go">Main Menu</button>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('try-again-btn').addEventListener('click', () => {
            overlay.remove();
            this.progressionManager.resetProgress();
            location.reload();
        });

        document.getElementById('main-menu-btn-go').addEventListener('click', () => {
            overlay.remove();
            location.reload();
        });
    }

    /**
     * Checks if game over conditions are met.
     */
    checkGameOver() {
        if (this.progressionManager.isGameOver()) {
            this.showGameOverScreen();
        }
    }
}
