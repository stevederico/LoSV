import * as THREE from 'three';

export class Player {
    constructor(scene, camera, onExitBuildingCallback) {
        this.scene = scene;
        this.camera = camera;
        this.speed = 0.2; // Increased speed for better movement
        this.position = new THREE.Vector3(0, 0.1, 5); // Start inside house near door
        this.direction = 'down'; // down, up, left, right
        this.isMoving = false;
        this.game = null; // Will be set by Game.js
        this.currentSpeaker = null; // To track the NPC the player is talking to

        this.textureLoader = new THREE.TextureLoader();
        this.textures = {
            'down': this.textureLoader.load('/assets/textures/player-down-sprite.png'),
            'up': this.textureLoader.load('/assets/textures/player-up-sprite.png'),
            'left': this.textureLoader.load('/assets/textures/player-left-sprite.png'),
            'right': this.textureLoader.load('/assets/textures/player-right-sprite.png')
        };

        // Apply NearestFilter for crisp pixel art style to all textures
        for (const key in this.textures) {
            this.textures[key].magFilter = THREE.NearestFilter;
            this.textures[key].minFilter = THREE.NearestFilter;
        }

        this.mesh = this.createPlayerMesh();
        // this.scene.add(this.mesh); // Game.js will add the player

        this.isInBuilding = true; // Start inside the house
        this.buildingObstacles = [];
        this.interactiveNPCs = []; // For NPCs that can be interacted with
        this.onExitBuildingCallback = onExitBuildingCallback;
        this.lastEnteredBuildingData = {
            position: new THREE.Vector3(-17, 0.1, -10),
            width: 3,
            depth: 3
        }; // Set house data for proper exit
        this.currentRoomDepth = 12; // Store current room depth for exit logic
        
        // Initialize house interior immediately
        this.initializeHouseInterior();
    }

    initializeHouseInterior() {
        // Clear any existing scene objects first
        while (this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }
        
        // Create the house interior when the player starts
        this.createHouseInterior();
    }

    createPlayerMesh() {
        // Player sprite dimensions (adjust if needed)
        const spriteWidth = 1.5;
        const spriteHeight = 1.5;

        const geometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        // Initial material with the 'down' sprite
        const material = new THREE.MeshBasicMaterial({
            map: this.textures['down'],
            transparent: true,
            side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2; // Rotate to be flat on XZ plane
        mesh.position.copy(this.position); // Set initial position

        return mesh;
    }

    updateDirection(newDirection) {
        if (this.direction !== newDirection) {
            this.direction = newDirection;
            if (this.textures[this.direction]) {
                this.mesh.material.map = this.textures[this.direction];
                this.mesh.material.needsUpdate = true;
            }
        }
    }

    update(keys, worldObstacles = []) {
        this.isMoving = false;
        const moveVector = new THREE.Vector3(0, 0, 0);

        // If dialogue is active, check distance to speaker. If too far, hide dialogue.
        // Player movement is no longer blocked here.
        if (this.game && this.game.dialogueManager && this.game.dialogueManager.isActive() && this.currentSpeaker) {
            const distanceToSpeaker = this.position.distanceTo(this.currentSpeaker.position);
            const maxDialogueDistance = 7; // Max distance before dialogue disappears
            if (distanceToSpeaker > maxDialogueDistance) {
                this.game.dialogueManager.hideDialogue(); // This will trigger onComplete, clearing currentSpeaker
            }
        }

        let newDirection = this.direction;

        if (keys['ArrowUp'] || keys['w']) {
            moveVector.z -= this.speed;
            newDirection = 'up';
            this.isMoving = true;
        }
        else if (keys['ArrowDown'] || keys['s']) {
            moveVector.z += this.speed;
            newDirection = 'down';
            this.isMoving = true;
        }
        else if (keys['ArrowLeft'] || keys['a']) {
            moveVector.x -= this.speed;
            newDirection = 'left';
            this.isMoving = true;
        }
        else if (keys['ArrowRight'] || keys['d']) {
            moveVector.x += this.speed;
            newDirection = 'right';
            this.isMoving = true;
        }

        if (this.isMoving) {
            this.updateDirection(newDirection);
        }

        let collision = false;
        // Player's Y position is fixed for 2D top-down, so only XZ for tempPosition
        const tempPosition = this.position.clone();
        tempPosition.x += moveVector.x;
        tempPosition.z += moveVector.z;

        // Collision bounds might need adjustment based on sprite size. Assuming 1x1 sprite.
        const playerSpriteWidth = 1;
        const playerSpriteDepth = 1;
        const playerBounds = {
            minX: tempPosition.x - playerSpriteWidth / 2,
            maxX: tempPosition.x + playerSpriteWidth / 2,
            minZ: tempPosition.z - playerSpriteDepth / 2,
            maxZ: tempPosition.z + playerSpriteDepth / 2
        };

        const currentObstacles = this.isInBuilding ? this.buildingObstacles : worldObstacles;

        for (const obstacle of currentObstacles) {
            const obsWidth = obstacle.width || (obstacle.userData && obstacle.userData.width);
            const obsDepth = obstacle.depth || (obstacle.userData && obstacle.userData.depth);

            if (!obsWidth && obsWidth !== 0 || !obsDepth && obsDepth !== 0) { // Allow 0 for very thin walls if necessary
                // console.warn("Obstacle missing width/depth for collision", obstacle);
                continue;
            }

            const obstacleBounds = {
                minX: obstacle.position.x - obsWidth / 2,
                maxX: obstacle.position.x + obsWidth / 2,
                minZ: obstacle.position.z - obsDepth / 2,
                maxZ: obstacle.position.z + obsDepth / 2
            };

            if (playerBounds.maxX > obstacleBounds.minX &&
                playerBounds.minX < obstacleBounds.maxX &&
                playerBounds.maxZ > obstacleBounds.minZ &&
                playerBounds.minZ < obstacleBounds.maxZ) {
                collision = true;
                if (!this.isInBuilding && obstacle.userData && obstacle.userData.isBuilding) {
                    this.enterBuilding(obstacle);
                    return;
                }
                // Check for NPC interaction using new JSON system
                if (this.isInBuilding && obstacle.userData && obstacle.userData.isNPC && obstacle.userData.characterId) {
                    // Only start new dialogue if not already talking or talking to someone else
                    if (this.game && this.game.dialogueManager && (!this.game.dialogueManager.isActive() || this.currentSpeaker !== obstacle)) {
                        this.currentSpeaker = obstacle; // Set current speaker
                        this.game.dialogueManager.showCharacterDialogue(obstacle.userData.characterId, 'greeting', () => {
                            this.currentSpeaker = null; // Clear speaker when dialogue naturally ends or is hidden
                        });
                    }
                }
                break;
            }
        }

        // Exit Logic: Check before applying movement if inside a building
        if (this.isInBuilding && this.isMoving) {
            // Use the current room depth stored when entering the building
            const roomDepth = this.currentRoomDepth || 12; // Fallback to 12 if not set
            const room_Z_DoorPlane = roomDepth / 2;
            const doorwayWidth = 3; // Width of the door opening

            // Check if player is moving towards the door (positive Z in room coordinates)
            // and is about to cross the door plane, aligned with the opening.
            if (moveVector.z > 0 && // Moving "out"
                this.position.z < room_Z_DoorPlane &&
                tempPosition.z >= room_Z_DoorPlane &&
                Math.abs(tempPosition.x) < doorwayWidth / 2) {
                this.exitBuilding();
                return;
            }
        }

        if (!collision) {
            this.position.add(moveVector);
        }

        this.mesh.position.copy(this.position);

        if (this.camera && this.camera.position) {
            // Camera follows player's XZ, Y is for height/zoom
            this.camera.position.set(this.position.x, this.camera.position.y, this.position.z + 5); // Keep camera slightly behind or adjust as needed
            this.camera.lookAt(this.position.x, this.position.y, this.position.z); // Look at player's actual Y

            // Further refined zoom functionality with explicit Math.max
            if (keys['+'] || keys['=']) {  // Zoom in
                if (this.camera.position.y > 5) {
                    this.camera.position.y = Math.max(5, this.camera.position.y - 1);
                }
            } else if (keys['-']) {  // Zoom out
                this.camera.position.y += 1;
            }
        }
    }

    enterBuilding(building) {
        // Store data of the building being entered for correct exit positioning
        this.lastEnteredBuildingData = {
            position: building.position.clone(),
            width: building.width,
            depth: building.depth
        };

        this.isInBuilding = true;
        this.buildingObstacles = [];
        this.interactiveNPCs = []; // For NPCs that can be interacted with

        // Clear current scene
        while (this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }

        // Create building-specific interior based on building type
        const buildingType = building.userData.buildingType;
        
        if (buildingType === 'house') {
            this.createHouseInterior();
        } else if (buildingType === 'garage') {
            this.createGarageInterior();
        } else if (buildingType === 'venture') {
            this.createVentureInterior();
        } else if (buildingType === 'data-center') {
            this.createDataCenterInterior();
        } else if (buildingType === 'conference') {
            this.createConferenceInterior();
        } else if (buildingType === 'loft') {
            this.createLoftInterior();
        } else if (buildingType === 'accelerator') {
            this.createAcceleratorInterior();
        } else if (buildingType === 'law') {
            this.createLawInterior();
        } else if (buildingType === 'nasdaq') {
            this.createNasdaqInterior();
        } else {
            // Fallback for unknown building types
            this.createGenericInterior();
        }

        console.log('Entered building:', buildingType);
    }

    exitBuilding() {
        console.log("Player: Attempting to exit building...");
        this.isInBuilding = false;

        // Clear interior scene objects
        while (this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }
        this.buildingObstacles = []; // Clear interior obstacles

        // Call the callback to Game.js to handle main world restoration
        if (this.onExitBuildingCallback) {
            this.onExitBuildingCallback();
        }

        // Position player outside the building they just exited
        if (this.lastEnteredBuildingData) {
            const buildingPos = this.lastEnteredBuildingData.position;
            // Ensure buildingDepth is a number, use a default if not
            const buildingDepth = typeof this.lastEnteredBuildingData.depth === 'number' ? this.lastEnteredBuildingData.depth : 4;

            this.position.set(
                buildingPos.x,
                0.1, // Player Y position for flat sprite in main world
                // Position just in front of the building's original Z-face
                buildingPos.z + (buildingDepth / 2) + 0.6
            );
        } else {
            // Fallback position if something went wrong
            this.position.set(0, 0.1, 5);
            console.warn("Player: lastEnteredBuildingData was null, using fallback exit position.");
        }
        this.mesh.position.copy(this.position);
        // The Game.js callback (onExitBuildingCallback) is responsible for:
        // 1. Resetting scene background/renderer clear color.
        // 2. Repopulating the main world (terrain, other buildings, enemies).
        // 3. Re-adding the player's mesh to the scene (this.scene.add(this.mesh)).
        // 4. Setting up main world lights.
        console.log('Player: Exited building. Callback invoked to restore main world.');
    }

    createHouseInterior() {
        // Set house-specific background (warm home atmosphere)
        this.scene.background = new THREE.Color(0x4a3728); // Warm dark brown

        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Create house floor with wooden texture
        const woodFloorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const woodFloorMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 }); // Saddle brown
        const woodFloor = new THREE.Mesh(woodFloorGeometry, woodFloorMaterial);
        woodFloor.rotation.x = -Math.PI / 2;
        this.scene.add(woodFloor);

        // Add a cozy carpet in the center
        const carpetWidth = roomWidth * 0.6;
        const carpetDepth = roomDepth * 0.8;
        const carpetGeometry = new THREE.PlaneGeometry(carpetWidth, carpetDepth);
        const carpetMaterial = new THREE.MeshBasicMaterial({ color: 0x8b0000 }); // Dark red carpet
        const carpet = new THREE.Mesh(carpetGeometry, carpetMaterial);
        carpet.rotation.x = -Math.PI / 2;
        carpet.position.y = 0.01;
        this.scene.add(carpet);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0xa0522d); // Sienna brown walls

        // Add house furniture
        this.addHouseFurniture();

        // Add house NPC
        this.addHouseNPC();

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting();
    }

    createGarageInterior() {
        this.scene.background = new THREE.Color(0x555555); // Gray garage atmosphere
        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Concrete floor
        const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x888888);

        // Add garage NPC
        const garageNPC = this.createNPC(-2, -3, 0xff8800, 'garage_npc');
        this.scene.add(garageNPC);
        this.buildingObstacles.push(garageNPC);

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting();
    }

    createVentureInterior() {
        this.scene.background = new THREE.Color(0x2a2a2a); // Dark modern atmosphere
        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Modern floor
        const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x444444);

        // Add venture NPC
        const ventureNPC = this.createNPC(-1, -3, 0x0088ff, 'venture_npc');
        this.scene.add(ventureNPC);
        this.buildingObstacles.push(ventureNPC);

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting();
    }

    createDataCenterInterior() {
        this.scene.background = new THREE.Color(0x001122); // Dark tech atmosphere
        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Tech floor
        const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x222244 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x334455);

        // Add data center NPC
        const dataNPC = this.createNPC(-1, -3, 0x00ffff, 'data_center_npc');
        this.scene.add(dataNPC);
        this.buildingObstacles.push(dataNPC);

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting();
    }

    createConferenceInterior() {
        this.scene.background = new THREE.Color(0x3a2a1a); // Professional atmosphere
        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Professional floor
        const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x4a3a2a });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x5a4a3a);

        // Add conference NPC
        const confNPC = this.createNPC(-1, -3, 0x8b4513, 'conference_npc');
        this.scene.add(confNPC);
        this.buildingObstacles.push(confNPC);

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting();
    }

    createLoftInterior() {
        this.scene.background = new THREE.Color(0x4a4a3a); // Creative atmosphere
        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Creative floor
        const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x5a5a4a });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x6a6a5a);

        // Add loft NPC
        const loftNPC = this.createNPC(-1, -3, 0xff8800, 'loft_npc');
        this.scene.add(loftNPC);
        this.buildingObstacles.push(loftNPC);

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting();
    }

    createAcceleratorInterior() {
        this.scene.background = new THREE.Color(0x1a1a3a); // Innovation atmosphere
        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Innovation floor
        const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x2a2a4a });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x3a3a5a);

        // Add accelerator NPC
        const accelNPC = this.createNPC(-1, -3, 0x4169e1, 'accelerator_npc');
        this.scene.add(accelNPC);
        this.buildingObstacles.push(accelNPC);

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting();
    }

    createLawInterior() {
        this.scene.background = new THREE.Color(0x2a1a1a); // Legal atmosphere
        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Professional floor
        const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x3a2a2a });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x4a3a3a);

        // Add law NPC
        const lawNPC = this.createNPC(-1, -3, 0x191970, 'law_npc');
        this.scene.add(lawNPC);
        this.buildingObstacles.push(lawNPC);

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting();
    }

    createNasdaqInterior() {
        this.scene.background = new THREE.Color(0x1a3a1a); // Financial atmosphere
        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Trading floor
        const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x2a4a2a });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x3a5a3a);

        // Add nasdaq NPC
        const nasdaqNPC = this.createNPC(-1, -3, 0x00ff00, 'nasdaq_npc');
        this.scene.add(nasdaqNPC);
        this.buildingObstacles.push(nasdaqNPC);

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting();
    }

    createGenericInterior() {
        this.scene.background = new THREE.Color(0x333333); // Generic atmosphere
        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Generic floor
        const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x555555);

        // Add generic NPC
        const genericNPC = this.createNPC(-1, -3, 0x888888, 'generic_npc');
        this.scene.add(genericNPC);
        this.buildingObstacles.push(genericNPC);

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting();
    }

    createWalls(roomWidth, roomDepth, wallHeight, wallColor) {
        const wallMaterial = new THREE.MeshBasicMaterial({ color: wallColor });

        // Back wall
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(roomWidth, wallHeight, 0.2), wallMaterial);
        backWall.position.set(0, wallHeight / 2, -roomDepth / 2);
        backWall.width = roomWidth; 
        backWall.depth = 0.2;
        this.scene.add(backWall); 
        this.buildingObstacles.push(backWall);

        // Front walls with doorway
        const frontWallPartWidth = (roomWidth / 2) - 1.5;
        const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(frontWallPartWidth, wallHeight, 0.2), wallMaterial);
        frontWallLeft.position.set(-(frontWallPartWidth / 2) - 1.5, wallHeight / 2, roomDepth / 2);
        frontWallLeft.width = frontWallPartWidth; 
        frontWallLeft.depth = 0.2;
        this.scene.add(frontWallLeft); 
        this.buildingObstacles.push(frontWallLeft);

        const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(frontWallPartWidth, wallHeight, 0.2), wallMaterial);
        frontWallRight.position.set((frontWallPartWidth / 2) + 1.5, wallHeight / 2, roomDepth / 2);
        frontWallRight.width = frontWallPartWidth; 
        frontWallRight.depth = 0.2;
        this.scene.add(frontWallRight); 
        this.buildingObstacles.push(frontWallRight);

        // Side walls
        const sideWallGeometry = new THREE.BoxGeometry(0.2, wallHeight, roomDepth);
        const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        leftWall.position.set(-roomWidth / 2, wallHeight / 2, 0);
        leftWall.width = 0.2; 
        leftWall.depth = roomDepth;
        this.scene.add(leftWall); 
        this.buildingObstacles.push(leftWall);

        const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        rightWall.position.set(roomWidth / 2, wallHeight / 2, 0);
        rightWall.width = 0.2; 
        rightWall.depth = roomDepth;
        this.scene.add(rightWall); 
        this.buildingObstacles.push(rightWall);
    }

    addHouseFurniture() {
        // Dining table
        const tableGeometry = new THREE.BoxGeometry(3, 0.6, 1.5);
        const tableMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 }); // Dark brown
        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        table.position.set(-3, 0.3, -2);
        table.width = 3; 
        table.depth = 1.5;
        this.scene.add(table);
        this.buildingObstacles.push(table);

        // Chairs around table
        const chairGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.8);
        const chairMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 });
        
        const chair1 = new THREE.Mesh(chairGeometry, chairMaterial);
        chair1.position.set(-3, 0.6, -3.2);
        chair1.width = 0.8; 
        chair1.depth = 0.8;
        this.scene.add(chair1);
        this.buildingObstacles.push(chair1);

        const chair2 = new THREE.Mesh(chairGeometry, chairMaterial);
        chair2.position.set(-3, 0.6, -0.8);
        chair2.width = 0.8; 
        chair2.depth = 0.8;
        this.scene.add(chair2);
        this.buildingObstacles.push(chair2);

        // Bookshelf
        const bookshelfGeometry = new THREE.BoxGeometry(0.4, 2.5, 3);
        const bookshelfMaterial = new THREE.MeshBasicMaterial({ color: 0x2f1b14 });
        const bookshelf = new THREE.Mesh(bookshelfGeometry, bookshelfMaterial);
        bookshelf.position.set(7, 1.25, -3);
        bookshelf.width = 0.4; 
        bookshelf.depth = 3;
        this.scene.add(bookshelf);
        this.buildingObstacles.push(bookshelf);

        // Fireplace
        const fireplaceGeometry = new THREE.BoxGeometry(2, 1.5, 0.5);
        const fireplaceMaterial = new THREE.MeshBasicMaterial({ color: 0x8b0000 });
        const fireplace = new THREE.Mesh(fireplaceGeometry, fireplaceMaterial);
        fireplace.position.set(0, 0.75, -5.5);
        fireplace.width = 2;
        fireplace.depth = 0.5;
        this.scene.add(fireplace);
        this.buildingObstacles.push(fireplace);
    }

    addHouseNPC() {
        // Create house NPC
        const houseNPC = this.createNPC(-5, -3, 0xff6b6b, 'house_npc');
        this.scene.add(houseNPC);
        this.buildingObstacles.push(houseNPC);
        
        // Add MacBook and iPhone items
        this.addHouseItems();
    }
    
    addHouseItems() {
        // Create MacBook
        const macbookTexture = new THREE.TextureLoader().load('/assets/textures/macbook.png');
        macbookTexture.magFilter = THREE.NearestFilter;
        macbookTexture.minFilter = THREE.NearestFilter;
        
        const macbookGeometry = new THREE.PlaneGeometry(1.6, 1.2);
        const macbookMaterial = new THREE.MeshBasicMaterial({
            map: macbookTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const macbookSprite = new THREE.Mesh(macbookGeometry, macbookMaterial);
        
        macbookSprite.position.set(0, 0.5, -2.5); // On the table
        macbookSprite.rotation.x = -Math.PI / 2;
        
        macbookSprite.width = 1.6;
        macbookSprite.depth = 1.2;
        macbookSprite.userData.isPickupItem = true;
        macbookSprite.userData.itemType = 'macbook';
        macbookSprite.userData.itemData = {
            name: 'MacBook Pro',
            icon: '💻',
            description: 'A powerful laptop for building your startup'
        };
        
        this.scene.add(macbookSprite);
        this.interactiveNPCs.push(macbookSprite); // Add to interactive elements
        
        // Create iPhone
        const iphoneTexture = new THREE.TextureLoader().load('/assets/textures/iphone.png');
        iphoneTexture.magFilter = THREE.NearestFilter;
        iphoneTexture.minFilter = THREE.NearestFilter;
        
        const iphoneGeometry = new THREE.PlaneGeometry(1.8, 1.0);
        const iphoneMaterial = new THREE.MeshBasicMaterial({
            map: iphoneTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const iphoneSprite = new THREE.Mesh(iphoneGeometry, iphoneMaterial);
        
        iphoneSprite.position.set(-2.7, 0.5, 0); // Near the NPC
        iphoneSprite.rotation.x = -Math.PI / 2;
        
        iphoneSprite.width = 1.8;
        iphoneSprite.depth = 1.0;
        iphoneSprite.userData.isPickupItem = true;
        iphoneSprite.userData.itemType = 'iphone';
        iphoneSprite.userData.itemData = {
            name: 'iPhone',
            icon: '📱',
            description: 'Essential for staying connected with your team'
        };
        
        this.scene.add(iphoneSprite);
        this.interactiveNPCs.push(iphoneSprite); // Add to interactive elements
    }

    createNPC(x, z, color, characterId) {
        // Create triangle geometry for NPCs (cone with 3 sides)
        const npcGeometry = new THREE.ConeGeometry(0.5, 1.5, 3);
        const npcMaterial = new THREE.MeshBasicMaterial({ color: color });
        const npc = new THREE.Mesh(npcGeometry, npcMaterial);
        npc.position.set(x, 0.75, z);
        npc.width = 1;
        npc.depth = 1;
        npc.userData = {
            isNPC: true,
            characterId: characterId
        };
        return npc;
    }

    addPlayerToRoom(roomDepth) {
        // Store the room depth for exit logic
        this.currentRoomDepth = roomDepth;
        
        // Position player near the door inside the room
        this.position.set(0, 0.1, roomDepth / 2 - 1);
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    addInteriorLighting() {
        // Add ambient lighting for interior
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Add a point light for more dramatic lighting
        const pointLight = new THREE.PointLight(0xffffff, 0.8, 20);
        pointLight.position.set(0, 5, 0);
        this.scene.add(pointLight);
    }

    // Getter methods required by Game class
    getMesh() {
        return this.mesh;
    }

    getPosition() {
        return this.position;
    }
}
