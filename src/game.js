import * as THREE from 'three';
import { Player } from './components/player.js';
import { World } from './components/world.js';
import { Camera } from './components/camera.js';
import { Controls } from './components/controls.js';
import { Enemies } from './components/enemies.js';
import { DialogueManager } from './components/DialogueManager.js'; // Import DialogueManager
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
        
        // Create game world
        this.world = new World(this.scene);
        
        // Set up camera after world is created
        this.camera = new Camera(this.scene, this.renderer);
        
        // Create player after camera is set up, passing the exit callback
        this.player = new Player(this.scene, this.camera, this.handleExitBuilding.bind(this));
        this.player.game = this; // Give player a reference to the game instance for dialogue
        this.scene.add(this.player.getMesh());
        
        // Create controls after player is created
        this.controls = new Controls(this.player, this.camera, this.world);
        
        // Create enemies after world and player exist
        this.enemies = new Enemies(this.scene, this.world);

        this.setupLights();
        this.setupUI(); // Add this line
        
        this.assetsLoaded = false;
        
        this.loadAssets();
        this.startGameLoop();
        
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
            
            // Initialize UI
            this.updateRupees(0); // Initial rupee count
            this.updateLife(3);   // Initial life count
            this.updateDAU(0);    // Initial DAU count
            this.updateMRR(0);    // Initial MRR count
        }, 100);
    }

    updateRupees(count) {
        if (this.rupeesElement) {
            this.rupeesElement.textContent = String(count).padStart(3, '0');
        } else {
            // Try to find the element again
            this.rupeesElement = document.querySelector('#rupees span');
            if (this.rupeesElement) {
                this.rupeesElement.textContent = String(count).padStart(3, '0');
            }
        }
    }

    updateLife(lifeCount) {
        if (this.lifeHeartsContainer) {
            this.lifeHeartsContainer.innerHTML = ''; // Clear existing hearts
            for (let i = 0; i < lifeCount; i++) {
                const heartElement = document.createElement('div');
                heartElement.className = 'heart-icon-placeholder';
                heartElement.style.width = '25px';
                heartElement.style.height = '25px';
                heartElement.style.backgroundColor = 'red';
                heartElement.style.marginLeft = '5px';
                this.lifeHeartsContainer.appendChild(heartElement);
            }
        } else {
            // Try to find the element again
            this.lifeHeartsContainer = document.getElementById('life-hearts');
            if (this.lifeHeartsContainer) {
                this.updateLife(lifeCount); // Call again with found container
            }
        }
    }

    updateDAU(count) {
        if (this.dauElement) {
            // this.dauElement.textContent = count.toString(); // Old way
            const valueElement = this.dauElement.querySelector('.stat-value');
            if (valueElement) valueElement.textContent = count.toString();
        } else {
            this.dauElement = document.getElementById('dau-display'); // Get the container
            if (this.dauElement) {
                // this.dauElement.textContent = count.toString(); // Old way
                const valueElement = this.dauElement.querySelector('.stat-value');
                if (valueElement) valueElement.textContent = count.toString();
            }
        }
    }

    updateMRR(amount) {
        if (this.mrrElement) {
            // this.mrrElement.textContent = amount.toString(); // Old way
            const valueElement = this.mrrElement.querySelector('.stat-value');
            if (valueElement) valueElement.textContent = `$${amount.toString()}`;
        } else {
            this.mrrElement = document.getElementById('mrr-display'); // Get the container
            if (this.mrrElement) {
                // this.mrrElement.textContent = amount.toString(); // Old way
                const valueElement = this.mrrElement.querySelector('.stat-value');
                if (valueElement) valueElement.textContent = `$${amount.toString()}`;
            }
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

    update() {
        if (!this.assetsLoaded) return;

        // Handle dialogue advancement/interaction first
        // The DialogueManager itself doesn't need an update() call here,
        // but player input for it is handled in Player.update()
        // and visibility is managed by its own methods.

        // Update controls to handle player movement and actions
        if (this.player.isInBuilding) {
            // Pass all interactive elements in the building, including NPCs
            const buildingInteractiveElements = [...this.player.buildingObstacles, ...this.player.interactiveNPCs];
            // Filter out duplicates if any (e.g. NPC is in both lists)
            const uniqueBuildingElements = Array.from(new Set(buildingInteractiveElements));
            this.controls.update(uniqueBuildingElements);
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

    handleExitBuilding() {
        console.log("Game: Handling exit building.");

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
}