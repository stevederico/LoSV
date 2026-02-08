import * as THREE from 'three';

export class Controls {
    constructor(player, camera, world, onEnterBuilding) {
        this.player = player;
        this.camera = camera;
        this.world = world;
        this.onEnterBuilding = onEnterBuilding;
        this.keys = {};
        this.actionCooldown = 0;
        this.actionCooldownTime = 20; // Frames to wait between actions

        // Store bound event handlers for cleanup
        this.boundKeyDown = null;
        this.boundKeyUp = null;
        this.touchArea = null;

        this.init();
    }

    /**
     * Checks if any UI dialogue or simulator is currently active.
     * @returns {boolean} True if dialogue/simulator is active
     */
    isUIActive() {
        const game = this.player.game;
        if (!game) return false;

        // Check if regular dialogue is visible
        if (game.dialogueManager && game.dialogueManager.isVisible) {
            return true;
        }

        // Check if simulator dialogue is visible
        if (game.simulatorDialogue && game.simulatorDialogue.waitingForChoice) {
            return true;
        }

        // Check if simulator box is displayed
        if (game.simulatorDialogue && game.simulatorDialogue.simulatorBox &&
            game.simulatorDialogue.simulatorBox.style.display !== 'none') {
            return true;
        }

        return false;
    }

    init() {
        // Create bound event handlers for proper removal later
        this.boundKeyDown = (event) => {
            // Only prevent default and track keys if UI is not active
            if (!this.isUIActive()) {
                event.preventDefault();
            }
            this.keys[event.key] = true;
        };

        this.boundKeyUp = (event) => {
            this.keys[event.key] = false;
        };

        // Set up keyboard event listeners
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);

        // Touch controls for mobile
        this.setupTouchControls();
    }

    /**
     * Removes all event listeners and cleans up touch controls.
     * Call this before destroying the Controls instance.
     */
    dispose() {
        // Remove keyboard listeners
        if (this.boundKeyDown) {
            window.removeEventListener('keydown', this.boundKeyDown);
        }
        if (this.boundKeyUp) {
            window.removeEventListener('keyup', this.boundKeyUp);
        }

        // Remove touch control element
        if (this.touchArea && this.touchArea.parentNode) {
            this.touchArea.parentNode.removeChild(this.touchArea);
        }

        this.keys = {};
    }
    
    setupTouchControls() {
        // Virtual directional pad
        this.touchArea = document.createElement('div');
        this.touchArea.style.position = 'absolute';
        this.touchArea.style.bottom = '20px';
        this.touchArea.style.left = '20px';
        this.touchArea.style.width = '150px';
        this.touchArea.style.height = '150px';
        this.touchArea.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        this.touchArea.style.borderRadius = '75px';
        this.touchArea.style.display = 'none'; // Hidden on desktop
        document.body.appendChild(this.touchArea);

        // Alias for use in event handlers
        const touchArea = this.touchArea;
        
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
                        
                        // Check if it's a pickup item
                        if (element.userData.isPickupItem) {
                            console.log(`Picking up ${element.userData.itemType}!`);

                            // Add to inventory if game has inventory system
                            if (this.player.game && this.player.game.inventory) {
                                const itemData = element.userData.itemData;
                                const added = this.player.game.inventory.addItem(itemData);

                                if (added) {
                                    // Play pickup sound
                                    if (this.player.game.playSFX) {
                                        this.player.game.playSFX('pickup');
                                    }

                                    // Remove from scene
                                    if (element.parent) {
                                        element.parent.remove(element);
                                    }
                                    
                                    // Remove from interactive elements list
                                    const index = interactives.indexOf(element);
                                    if (index > -1) {
                                        interactives.splice(index, 1);
                                    }
                                    
                                    // Also remove from building interactive elements if in building
                                    if (this.player.buildingInteractiveElements) {
                                        const buildingIndex = this.player.buildingInteractiveElements.indexOf(element);
                                        if (buildingIndex > -1) {
                                            this.player.buildingInteractiveElements.splice(buildingIndex, 1);
                                        }
                                    }
                                    
                                    // Show pickup message
                                    if (this.player.game.dialogueManager) {
                                        this.player.game.dialogueManager.showDialogue(
                                            [`You picked up a ${itemData.name}!`],
                                            null
                                        );
                                    }
                                }
                            }
                        }
                        // If the element is a gem, remove it from the scene
                        else if (element.geometry instanceof THREE.OctahedronGeometry) {
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

    update(obstacles) {
        // Skip movement processing if dialogue/simulator UI is active
        if (this.isUIActive()) {
            // Still update camera but don't process movement
            if (this.camera) {
                this.camera.update(this.player.getPosition());
            }
            return;
        }

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

        // Update player based on combined inputs
        this.player.update(this.keys, obstacles || []);

        // Update camera to follow player
        if (this.camera) {
            this.camera.update(this.player.getPosition());
        }
    }
    
    checkBuildingInteraction() {
        // Check if player is trying to interact with something in a building
        if (this.keys[' '] || this.keys['z'] || this.keys['Enter']) {
            if (this.actionCooldown <= 0) {
                // Try NPC interaction first (requires pressing action button near NPC)
                if (this.player.interactWithNearbyNPC()) {
                    this.actionCooldown = this.actionCooldownTime;
                    return;
                }

                // Check for nearby interactive elements in building (including items)
                if (!this.player.interactiveNPCs) return;
                const playerPos = this.player.getPosition();

                for (const element of this.player.interactiveNPCs) {
                    const distance = playerPos.distanceTo(element.position);
                    if (distance < 1.5) {
                        console.log('Interacting with building element');
                        
                        // Reset cooldown
                        this.actionCooldown = this.actionCooldownTime;
                        
                        // Check if it's a pickup item
                        if (element.userData.isPickupItem) {
                            console.log(`Picking up ${element.userData.itemType}!`);

                            // Add to inventory if game has inventory system
                            if (this.player.game && this.player.game.inventory) {
                                const itemData = element.userData.itemData;
                                const added = this.player.game.inventory.addItem(itemData);

                                if (added) {
                                    // Play pickup sound
                                    if (this.player.game.playSFX) {
                                        this.player.game.playSFX('pickup');
                                    }

                                    // Mark item as picked up
                                    if (element.userData.buildingType && element.userData.itemType) {
                                        const building = element.userData.buildingType;
                                        const itemType = element.userData.itemType;

                                        if (this.player.game.pickedUpItems[building]) {
                                            this.player.game.pickedUpItems[building].push(itemType);
                                        }
                                    }

                                    // Remove from scene
                                    if (element.parent) {
                                        element.parent.remove(element);
                                    }
                                    
                                    // Remove from interactiveNPCs array
                                    const npcIndex = this.player.interactiveNPCs.indexOf(element);
                                    if (npcIndex > -1) {
                                        this.player.interactiveNPCs.splice(npcIndex, 1);
                                    }
                                    
                                    // Show pickup message
                                    if (this.player.game.dialogueManager) {
                                        this.player.game.dialogueManager.showDialogue(
                                            [`You picked up a ${itemData.name}!`],
                                            null
                                        );
                                    }
                                }
                            }
                        }
                        
                        break;
                    }
                }
            }
        }
    }
}
