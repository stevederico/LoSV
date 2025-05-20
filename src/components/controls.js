import * as THREE from 'three';

export class Controls {
    constructor(player, camera, world) {
        this.player = player;
        this.camera = camera;
        this.world = world;
        this.keys = {};
        this.actionCooldown = 0;
        this.actionCooldownTime = 20; // Frames to wait between actions
        this.init();
    }

    init() {
        // Set up keyboard event listeners
        window.addEventListener('keydown', (event) => {
            event.preventDefault();
            console.log(`Key down: ${event.key}`);
            this.keys[event.key] = true;
            
            // Debug controls
            if (event.key === '+') {
                this.camera.zoomIn();
            }
            if (event.key === '-') {
                this.camera.zoomOut();
            }
        });

        window.addEventListener('keyup', (event) => {
            console.log(`Key up: ${event.key}`);
            this.keys[event.key] = false;
        });
        
        // Touch controls for mobile
        this.setupTouchControls();
    }
    
    setupTouchControls() {
        // Virtual directional pad
        const touchArea = document.createElement('div');
        touchArea.style.position = 'absolute';
        touchArea.style.bottom = '20px';
        touchArea.style.left = '20px';
        touchArea.style.width = '150px';
        touchArea.style.height = '150px';
        touchArea.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        touchArea.style.borderRadius = '75px';
        touchArea.style.display = 'none'; // Hidden on desktop
        document.body.appendChild(touchArea);
        
        // Only show virtual controls on touch devices
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            touchArea.style.display = 'block';
            
            touchArea.addEventListener('touchstart', (event) => {
                event.preventDefault();
                this.handleTouchInput(event);
            });
            
            touchArea.addEventListener('touchmove', (event) => {
                event.preventDefault();
                this.handleTouchInput(event);
            });
            
            touchArea.addEventListener('touchend', () => {
                // Reset all direction keys
                this.keys['ArrowUp'] = false;
                this.keys['ArrowDown'] = false;
                this.keys['ArrowLeft'] = false;
                this.keys['ArrowRight'] = false;
            });
        }
    }
    
    handleTouchInput(event) {
        const touch = event.touches[0];
        const touchArea = event.currentTarget;
        const rect = touchArea.getBoundingClientRect();
        
        // Calculate touch position relative to center of control pad
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const touchX = touch.clientX - rect.left - centerX;
        const touchY = touch.clientY - rect.top - centerY;
        
        // Reset all direction keys
        this.keys['ArrowUp'] = false;
        this.keys['ArrowDown'] = false;
        this.keys['ArrowLeft'] = false;
        this.keys['ArrowRight'] = false;
        
        // Set keys based on touch position
        if (touchY < -centerY * 0.3) this.keys['ArrowUp'] = true;
        if (touchY > centerY * 0.3) this.keys['ArrowDown'] = true;
        if (touchX < -centerX * 0.3) this.keys['ArrowLeft'] = true;
        if (touchX > centerX * 0.3) this.keys['ArrowRight'] = true;
    }
    
    checkInteraction() {
        // Check if player is trying to interact with something
        if (this.keys[' '] || this.keys['z'] || this.keys['Enter']) {
            if (this.actionCooldown <= 0) {
                // Get interactive elements nearby
                const playerPos = this.player.getPosition();
                const interactives = this.world.getInteractiveElements();
                
                // Check for nearby interactive elements
                for (const element of interactives) {
                    const distance = playerPos.distanceTo(element.position);
                    if (distance < 1.5) {
                        console.log('Interacting with element');
                        // In a real game, we would trigger specific actions here
                        // based on the type of interactive element
                        
                        // Reset cooldown
                        this.actionCooldown = this.actionCooldownTime;
                        
                        // If the element is a gem, remove it from the scene
                        if (element.geometry instanceof THREE.OctahedronGeometry) {
                            this.world.scene.remove(element);
                            const index = interactives.indexOf(element);
                            if (index > -1) {
                                interactives.splice(index, 1);
                            }
                        }
                        
                        break;
                    }
                }
            }
        }
    }

    update() {
        // Create a direction vector to store movement input
        const moveDirection = { x: 0, z: 0 };
        
        // Process keyboard input - one direction at a time like in Zelda: ALTTP
        // Only one direction takes priority
        if (this.keys['ArrowUp'] || this.keys['w']) {
            moveDirection.z = -1;
        } else if (this.keys['ArrowDown'] || this.keys['s']) {
            moveDirection.z = 1;
        } else if (this.keys['ArrowLeft'] || this.keys['a']) {
            moveDirection.x = -1;
        } else if (this.keys['ArrowRight'] || this.keys['d']) {
            moveDirection.x = 1;
        }
        
        // Handle action button with cooldown
        this.checkInteraction();
        
        if (this.actionCooldown > 0) {
            this.actionCooldown--;
        }
        
        // Get obstacles for collision detection
        const obstacles = this.world ? this.world.getObstacles() : [];
        
        // Update player based on combined inputs
        this.player.update(this.keys, obstacles);
        
        // Update camera to follow player
        if (this.camera) {
            this.camera.update(this.player.getPosition());
        }
    }
}
