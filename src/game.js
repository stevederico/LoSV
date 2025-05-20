import * as THREE from 'three';
import { Player } from './components/player.js';
import { World } from './components/world.js';
import { Camera } from './components/camera.js';
import { Controls } from './components/controls.js';
import { Enemies } from './components/enemies.js';
import { loadAssets, setupKeyboardControls } from './utils/helpers.js';

export class Game {
    constructor() {
        // Set up the scene
        this.scene = new THREE.Scene();
        
        // Configure renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        // Set up game components
        this.setupRenderer();
        this.setupLights();
        
        // Initialize keyboard controls
        this.keys = setupKeyboardControls();
        
        // Create game world
        this.world = new World(this.scene);
        
        // Set up camera after world is created
        this.camera = new Camera(this.scene, this.renderer);
        
        // Create player after camera is set up
        this.player = new Player(this.scene, this.camera);
        
        // Create controls after player is created
        this.controls = new Controls(this.player, this.camera, this.world);
        
        // Create enemies after world and player exist
        this.enemies = new Enemies(this.scene, this.world);
        
        // Asset loading status
        this.assetsLoaded = false;
        
        // Load assets and start the game
        this.loadAssets();
        this.startGameLoop();
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }

    setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x87CEEB); // Light blue sky color
        document.getElementById('game-container').appendChild(this.renderer.domElement);
    }
    
    setupLights() {
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
        
        // Update controls to handle player movement and actions
        // Controls.update will call player.update with proper keys and obstacles
        this.controls.update();
        
        // Update enemies to move around and interact with player
        this.enemies.update(this.player.getPosition());
        
        // Update world for any animations or environmental changes
        this.world.update();
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
}