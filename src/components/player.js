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
        } else if (buildingType === 'board-room') {
            this.createBoardRoomInterior();
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

        // Add garage furniture
        this.addGarageFurniture();

        // Add garage NPC and items
        this.addGarageNPC();

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

        // Add conference furniture
        this.addConferenceFurniture();

        // Add conference NPC and items
        this.addConferenceNPC();

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

        // Add loft furniture
        this.addLoftFurniture();

        // Add loft NPC and items
        this.addLoftNPC();

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

        // Add accelerator furniture
        this.addAcceleratorFurniture();

        // Add accelerator NPC and items
        this.addAcceleratorNPC();

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

    createBoardRoomInterior() {
        this.scene.background = new THREE.Color(0x3a2a1a); // Executive atmosphere
        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Mahogany floor
        const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x4a2511 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x5a3521);

        // Add board room NPC
        this.addBoardRoomNPC();

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

        // Couch
        const couchGeometry = new THREE.BoxGeometry(2, 0.6, 1);
        const couchMaterial = new THREE.MeshBasicMaterial({ color: 0x5a3a2a }); // Dark brown
        const couch = new THREE.Mesh(couchGeometry, couchMaterial);
        couch.position.set(3, 0.3, 3);
        couch.width = 2;
        couch.depth = 1;
        this.scene.add(couch);
        this.buildingObstacles.push(couch);

        // Coffee table
        const coffeeTableGeometry = new THREE.BoxGeometry(1, 0.3, 0.5);
        const coffeeTableMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 });
        const coffeeTable = new THREE.Mesh(coffeeTableGeometry, coffeeTableMaterial);
        coffeeTable.position.set(3, 0.15, 1.5);
        coffeeTable.width = 1;
        coffeeTable.depth = 0.5;
        this.scene.add(coffeeTable);
        this.buildingObstacles.push(coffeeTable);

        // Whiteboard on wall
        const whiteboardGeometry = new THREE.PlaneGeometry(2, 1.5);
        const whiteboardMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const whiteboard = new THREE.Mesh(whiteboardGeometry, whiteboardMaterial);
        whiteboard.position.set(-6, 1.5, -5);
        whiteboard.rotation.y = Math.PI / 2; // Face into the room
        this.scene.add(whiteboard);

        // Houseplant in corner
        const plantGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8);
        const plantMaterial = new THREE.MeshBasicMaterial({ color: 0x2d5016 }); // Dark green
        const plant = new THREE.Mesh(plantGeometry, plantMaterial);
        plant.position.set(-6.5, 0.4, 5);
        this.scene.add(plant);
        this.buildingObstacles.push(plant);
    }

    addGarageFurniture() {
        // Workbench at back wall
        const workbenchGeometry = new THREE.BoxGeometry(3, 0.8, 1.5);
        const workbenchMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 }); // Gray
        const workbench = new THREE.Mesh(workbenchGeometry, workbenchMaterial);
        workbench.position.set(0, 0.4, -5);
        workbench.width = 3;
        workbench.depth = 1.5;
        this.scene.add(workbench);
        this.buildingObstacles.push(workbench);

        // Toolbox on workbench
        const toolboxGeometry = new THREE.BoxGeometry(0.8, 0.4, 0.6);
        const toolboxMaterial = new THREE.MeshBasicMaterial({ color: 0xcc0000 }); // Red
        const toolbox = new THREE.Mesh(toolboxGeometry, toolboxMaterial);
        toolbox.position.set(-1, 0.8, -5);
        toolbox.width = 0.8;
        toolbox.depth = 0.6;
        this.scene.add(toolbox);
        this.buildingObstacles.push(toolbox);

        // Car (visual only, non-collidable)
        const carGeometry = new THREE.BoxGeometry(4, 1.2, 2);
        const carMaterial = new THREE.MeshBasicMaterial({ color: 0x3a5f8a }); // Blue car
        const car = new THREE.Mesh(carGeometry, carMaterial);
        car.position.set(-3, 0.6, 0);
        this.scene.add(car);
        // Not added to obstacles - visual only

        // Server rack prototype
        const serverGeometry = new THREE.BoxGeometry(0.8, 1.8, 0.8);
        const serverMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a }); // Black
        const server = new THREE.Mesh(serverGeometry, serverMaterial);
        server.position.set(5, 0.9, -3);
        server.width = 0.8;
        server.depth = 0.8;
        this.scene.add(server);
        this.buildingObstacles.push(server);

        // Pegboard on wall
        const pegboardGeometry = new THREE.PlaneGeometry(2.5, 2);
        const pegboardMaterial = new THREE.MeshBasicMaterial({ color: 0x8b7355 }); // Brown
        const pegboard = new THREE.Mesh(pegboardGeometry, pegboardMaterial);
        pegboard.position.set(7, 1.5, 0);
        pegboard.rotation.y = -Math.PI / 2;
        this.scene.add(pegboard);
    }

    addAcceleratorFurniture() {
        // Hot desks in rows
        for (let i = 0; i < 6; i++) {
            const deskGeometry = new THREE.BoxGeometry(1.2, 0.6, 0.8);
            const deskMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 }); // Brown
            const desk = new THREE.Mesh(deskGeometry, deskMaterial);
            const row = Math.floor(i / 3);
            const col = i % 3;
            desk.position.set(-3 + col * 2.5, 0.3, -2 + row * 2.5);
            desk.width = 1.2;
            desk.depth = 0.8;
            this.scene.add(desk);
            this.buildingObstacles.push(desk);
        }

        // Whiteboard wall
        const whiteboardGeometry = new THREE.PlaneGeometry(4, 2.5);
        const whiteboardMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const whiteboard = new THREE.Mesh(whiteboardGeometry, whiteboardMaterial);
        whiteboard.position.set(0, 1.5, -5.5);
        this.scene.add(whiteboard);

        // Beanbag chairs
        const beanbagGeometry = new THREE.SphereGeometry(0.6, 8, 6);
        const beanbag1Material = new THREE.MeshBasicMaterial({ color: 0xff6b6b }); // Red
        const beanbag1 = new THREE.Mesh(beanbagGeometry, beanbag1Material);
        beanbag1.position.set(-5, 0.3, 4);
        this.scene.add(beanbag1);
        this.buildingObstacles.push(beanbag1);

        const beanbag2Material = new THREE.MeshBasicMaterial({ color: 0x4169e1 }); // Blue
        const beanbag2 = new THREE.Mesh(beanbagGeometry, beanbag2Material);
        beanbag2.position.set(-3.5, 0.3, 4.5);
        this.scene.add(beanbag2);
        this.buildingObstacles.push(beanbag2);

        // Water cooler
        const coolerGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 8);
        const coolerMaterial = new THREE.MeshBasicMaterial({ color: 0x4a90e2 }); // Blue
        const cooler = new THREE.Mesh(coolerGeometry, coolerMaterial);
        cooler.position.set(6, 0.5, 4);
        this.scene.add(cooler);
        this.buildingObstacles.push(cooler);

        // Startup posters on walls
        const posterGeometry = new THREE.PlaneGeometry(1.5, 1);
        const poster1Material = new THREE.MeshBasicMaterial({ color: 0xffd700 }); // Gold
        const poster1 = new THREE.Mesh(posterGeometry, poster1Material);
        poster1.position.set(-7, 1.5, 0);
        poster1.rotation.y = Math.PI / 2;
        this.scene.add(poster1);

        const poster2Material = new THREE.MeshBasicMaterial({ color: 0xff6b6b }); // Red
        const poster2 = new THREE.Mesh(posterGeometry, poster2Material);
        poster2.position.set(7, 1.5, 2);
        poster2.rotation.y = -Math.PI / 2;
        this.scene.add(poster2);
    }

    addLoftFurniture() {
        // Drafting table (angled)
        const draftTableGeometry = new THREE.BoxGeometry(1.5, 0.1, 1);
        const draftTableMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 });
        const draftTable = new THREE.Mesh(draftTableGeometry, draftTableMaterial);
        draftTable.position.set(-4, 0.8, -2);
        draftTable.rotation.x = -Math.PI / 6; // Angle it
        this.scene.add(draftTable);

        // Art easel
        const easelGeometry = new THREE.BoxGeometry(0.1, 1.8, 0.1);
        const easelMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 }); // Brown wood
        const easel = new THREE.Mesh(easelGeometry, easelMaterial);
        easel.position.set(4, 0.9, -1);
        this.scene.add(easel);
        this.buildingObstacles.push(easel);

        // Couch (sectional L-shape)
        const couchPart1Geometry = new THREE.BoxGeometry(3, 0.6, 1);
        const couchMaterial = new THREE.MeshBasicMaterial({ color: 0x4169e1 }); // Blue
        const couchPart1 = new THREE.Mesh(couchPart1Geometry, couchMaterial);
        couchPart1.position.set(0, 0.3, 4);
        this.scene.add(couchPart1);
        this.buildingObstacles.push(couchPart1);

        const couchPart2Geometry = new THREE.BoxGeometry(1, 0.6, 2);
        const couchPart2 = new THREE.Mesh(couchPart2Geometry, couchMaterial);
        couchPart2.position.set(-2, 0.3, 3);
        this.scene.add(couchPart2);
        this.buildingObstacles.push(couchPart2);

        // Kitchen island
        const islandGeometry = new THREE.BoxGeometry(2, 0.8, 1.2);
        const islandMaterial = new THREE.MeshBasicMaterial({ color: 0x708090 }); // Gray
        const island = new THREE.Mesh(islandGeometry, islandMaterial);
        island.position.set(-5, 0.4, 2);
        this.scene.add(island);
        this.buildingObstacles.push(island);

        // Bar stools around island
        const stoolGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 8);
        const stoolMaterial = new THREE.MeshBasicMaterial({ color: 0x2f4f4f });
        for (let i = 0; i < 4; i++) {
            const stool = new THREE.Mesh(stoolGeometry, stoolMaterial);
            stool.position.set(-5 + (i % 2) * 1.5, 0.4, 1 + Math.floor(i / 2) * 0.8);
            this.scene.add(stool);
            this.buildingObstacles.push(stool);
        }
    }

    addConferenceFurniture() {
        // Conference table already exists in game.js setupConferenceInterior
        // Executive chairs around table
        const chairGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.6);
        const chairMaterial = new THREE.MeshBasicMaterial({ color: 0x2f4f4f }); // Dark gray

        const chairPositions = [
            [-2, 0.4, -1], [-1, 0.4, -1], [0, 0.4, -1], [1, 0.4, -1], [2, 0.4, -1],
            [-2, 0.4, 1], [-1, 0.4, 1], [0, 0.4, 1]
        ];

        chairPositions.forEach(pos => {
            const chair = new THREE.Mesh(chairGeometry, chairMaterial);
            chair.position.set(...pos);
            this.scene.add(chair);
            this.buildingObstacles.push(chair);
        });

        // Projector screen on wall
        const screenGeometry = new THREE.PlaneGeometry(4, 2.5);
        const screenMaterial = new THREE.MeshBasicMaterial({ color: 0xf0f0f0 }); // Light gray
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.set(0, 1.5, -5.5);
        this.scene.add(screen);

        // Podium at front
        const podiumGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.6);
        const podiumMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 }); // Brown
        const podium = new THREE.Mesh(podiumGeometry, podiumMaterial);
        podium.position.set(0, 0.6, -4);
        this.scene.add(podium);
        this.buildingObstacles.push(podium);

        // Coffee station
        const coffeeStationGeometry = new THREE.BoxGeometry(1.5, 0.8, 0.6);
        const coffeeStationMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 });
        const coffeeStation = new THREE.Mesh(coffeeStationGeometry, coffeeStationMaterial);
        coffeeStation.position.set(6, 0.4, 4);
        this.scene.add(coffeeStation);
        this.buildingObstacles.push(coffeeStation);
    }

    addHouseNPC() {
        // Create house NPC
        const houseNPC = this.createNPC(-5, -3, 0xff6b6b, 'sam');
        this.scene.add(houseNPC);
        this.buildingObstacles.push(houseNPC);
        this.interactiveNPCs.push(houseNPC);

        // Add MacBook and iPhone items
        this.addHouseItems();
    }

    addGarageNPC() {
        // Create garage NPC
        const garageNPC = this.createNPC(-4, -2, 0x2C3E50, 'alex');
        this.scene.add(garageNPC);
        this.buildingObstacles.push(garageNPC);
        this.interactiveNPCs.push(garageNPC);

        // Add garage items
        this.addGarageItems();
    }

    addAcceleratorNPC() {
        // Create accelerator NPC
        const acceleratorNPC = this.createNPC(0, -2, 0x34495E, 'jordan');
        this.scene.add(acceleratorNPC);
        this.buildingObstacles.push(acceleratorNPC);
        this.interactiveNPCs.push(acceleratorNPC);

        // Add accelerator items
        this.addAcceleratorItems();
    }

    addLoftNPC() {
        // Create loft NPC
        const loftNPC = this.createNPC(-3, 0, 0xE74C3C, 'casey');
        this.scene.add(loftNPC);
        this.buildingObstacles.push(loftNPC);
        this.interactiveNPCs.push(loftNPC);

        // Add loft items
        this.addLoftItems();
    }

    addConferenceNPC() {
        // Create conference NPC
        const conferenceNPC = this.createNPC(0, 2, 0x16A085, 'morgan');
        this.scene.add(conferenceNPC);
        this.buildingObstacles.push(conferenceNPC);
        this.interactiveNPCs.push(conferenceNPC);

        // Add conference items
        this.addConferenceItems();
    }

    addBoardRoomNPC() {
        // Create board room NPC
        const boardRoomNPC = this.createNPC(0, 2, 0x8b4513, 'board_room_npc');
        this.scene.add(boardRoomNPC);
        this.buildingObstacles.push(boardRoomNPC);
        this.interactiveNPCs.push(boardRoomNPC);
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

        // Create Whiteboard Markers
        const whiteboardTexture = new THREE.TextureLoader().load('/assets/textures/items/whiteboard.png');
        whiteboardTexture.magFilter = THREE.NearestFilter;
        whiteboardTexture.minFilter = THREE.NearestFilter;

        const whiteboardGeometry = new THREE.PlaneGeometry(0.6, 0.6);
        const whiteboardMaterial = new THREE.MeshBasicMaterial({
            map: whiteboardTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const whiteboardSprite = new THREE.Mesh(whiteboardGeometry, whiteboardMaterial);

        whiteboardSprite.position.set(2, 0.5, -4); // Near fireplace
        whiteboardSprite.rotation.x = -Math.PI / 2;

        whiteboardSprite.width = 0.6;
        whiteboardSprite.depth = 0.6;
        whiteboardSprite.userData.isPickupItem = true;
        whiteboardSprite.userData.itemType = 'whiteboard';
        whiteboardSprite.userData.itemData = {
            name: 'Whiteboard Markers',
            icon: '🖊️',
            description: 'For brainstorming your next big idea (+10 validation points)'
        };

        this.scene.add(whiteboardSprite);
        this.interactiveNPCs.push(whiteboardSprite);

        // Create Interview Notes
        const notesTexture = new THREE.TextureLoader().load('/assets/textures/items/interview-notes.png');
        notesTexture.magFilter = THREE.NearestFilter;
        notesTexture.minFilter = THREE.NearestFilter;

        const notesGeometry = new THREE.PlaneGeometry(0.8, 0.6);
        const notesMaterial = new THREE.MeshBasicMaterial({
            map: notesTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const notesSprite = new THREE.Mesh(notesGeometry, notesMaterial);

        notesSprite.position.set(-3, 1.2, 0); // On the bookshelf
        notesSprite.rotation.x = -Math.PI / 2;

        notesSprite.width = 0.8;
        notesSprite.depth = 0.6;
        notesSprite.userData.isPickupItem = true;
        notesSprite.userData.itemType = 'interview-notes';
        notesSprite.userData.itemData = {
            name: 'Customer Interview Notes',
            icon: '📝',
            description: 'Insights from talking to potential customers (unlocks ideation help)'
        };

        this.scene.add(notesSprite);
        this.interactiveNPCs.push(notesSprite);
    }

    addGarageItems() {
        const loader = new THREE.TextureLoader();

        // Mechanical Keyboard
        const keyboardTexture = loader.load('/assets/textures/items/keyboard.png');
        keyboardTexture.magFilter = THREE.NearestFilter;
        const keyboardSprite = new THREE.Mesh(
            new THREE.PlaneGeometry(0.8, 0.8),
            new THREE.MeshBasicMaterial({ map: keyboardTexture, transparent: true, side: THREE.DoubleSide })
        );
        keyboardSprite.position.set(1, 0.5, -2);
        keyboardSprite.rotation.x = -Math.PI / 2;
        keyboardSprite.width = 0.8;
        keyboardSprite.depth = 0.8;
        keyboardSprite.userData = {
            isPickupItem: true,
            itemType: 'keyboard',
            itemData: { name: 'Mechanical Keyboard', icon: '⌨️', description: 'Clicky keys make you code 2x faster (not really)' }
        };
        this.scene.add(keyboardSprite);
        this.interactiveNPCs.push(keyboardSprite);

        // Energy Drink
        const drinkTexture = loader.load('/assets/textures/items/energy-drink.png');
        drinkTexture.magFilter = THREE.NearestFilter;
        const drinkSprite = new THREE.Mesh(
            new THREE.PlaneGeometry(0.4, 0.6),
            new THREE.MeshBasicMaterial({ map: drinkTexture, transparent: true, side: THREE.DoubleSide })
        );
        drinkSprite.position.set(-2, 0.5, 1);
        drinkSprite.rotation.x = -Math.PI / 2;
        drinkSprite.width = 0.4;
        drinkSprite.depth = 0.6;
        drinkSprite.userData = {
            isPickupItem: true,
            itemType: 'energy-drink',
            itemData: { name: 'Energy Drink', icon: '⚡', description: 'Restore morale +10 (caffeine required)' }
        };
        this.scene.add(drinkSprite);
        this.interactiveNPCs.push(drinkSprite);

        // GitHub Stickers
        const stickersTexture = loader.load('/assets/textures/items/github-stickers.png');
        stickersTexture.magFilter = THREE.NearestFilter;
        const stickersSprite = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.6),
            new THREE.MeshBasicMaterial({ map: stickersTexture, transparent: true, side: THREE.DoubleSide })
        );
        stickersSprite.position.set(0, 0.5, 2);
        stickersSprite.rotation.x = -Math.PI / 2;
        stickersSprite.width = 0.6;
        stickersSprite.depth = 0.6;
        stickersSprite.userData = {
            isPickupItem: true,
            itemType: 'github-stickers',
            itemData: { name: 'GitHub Stickers', icon: '🐙', description: 'Trophy collectible - proof you ship code' }
        };
        this.scene.add(stickersSprite);
        this.interactiveNPCs.push(stickersSprite);

        // MVP Demo USB
        const usbTexture = loader.load('/assets/textures/items/mvp-usb.png');
        usbTexture.magFilter = THREE.NearestFilter;
        const usbSprite = new THREE.Mesh(
            new THREE.PlaneGeometry(0.5, 0.3),
            new THREE.MeshBasicMaterial({ map: usbTexture, transparent: true, side: THREE.DoubleSide })
        );
        usbSprite.position.set(3, 0.5, -1);
        usbSprite.rotation.x = -Math.PI / 2;
        usbSprite.width = 0.5;
        usbSprite.depth = 0.3;
        usbSprite.userData = {
            isPickupItem: true,
            itemType: 'mvp-usb',
            itemData: { name: 'MVP Demo USB', icon: '💾', description: 'Contains your first working prototype' }
        };
        this.scene.add(usbSprite);
        this.interactiveNPCs.push(usbSprite);

        // Technical Debt Note
        const noteTexture = loader.load('/assets/textures/items/tech-debt-note.png');
        noteTexture.magFilter = THREE.NearestFilter;
        const noteSprite = new THREE.Mesh(
            new THREE.PlaneGeometry(0.5, 0.5),
            new THREE.MeshBasicMaterial({ map: noteTexture, transparent: true, side: THREE.DoubleSide })
        );
        noteSprite.position.set(-1, 0.5, -3);
        noteSprite.rotation.x = -Math.PI / 2;
        noteSprite.width = 0.5;
        noteSprite.depth = 0.5;
        noteSprite.userData = {
            isPickupItem: true,
            itemType: 'tech-debt-note',
            itemData: { name: 'Technical Debt Note', icon: '⚠️', description: '"TODO: Refactor this mess" - Future You' }
        };
        this.scene.add(noteSprite);
        this.interactiveNPCs.push(noteSprite);
    }

    addAcceleratorItems() {
        const loader = new THREE.TextureLoader();

        // Pitch Deck
        const pitchTexture = loader.load('/assets/textures/items/pitch-deck.png');
        pitchTexture.magFilter = THREE.NearestFilter;
        const pitchSprite = new THREE.Mesh(
            new THREE.PlaneGeometry(1.0, 0.7),
            new THREE.MeshBasicMaterial({ map: pitchTexture, transparent: true, side: THREE.DoubleSide })
        );
        pitchSprite.position.set(0, 0.5, -2);
        pitchSprite.rotation.x = -Math.PI / 2;
        pitchSprite.width = 1.0;
        pitchSprite.depth = 0.7;
        pitchSprite.userData = {
            isPickupItem: true,
            itemType: 'pitch-deck',
            itemData: { name: 'Pitch Deck', icon: '📊', description: 'Required to start fundraising simulator' }
        };
        this.scene.add(pitchSprite);
        this.interactiveNPCs.push(pitchSprite);

        // Term Sheet
        const termTexture = loader.load('/assets/textures/items/term-sheet.png');
        termTexture.magFilter = THREE.NearestFilter;
        const termSprite = new THREE.Mesh(
            new THREE.PlaneGeometry(0.8, 1.0),
            new THREE.MeshBasicMaterial({ map: termTexture, transparent: true, side: THREE.DoubleSide })
        );
        termSprite.position.set(-2, 0.5, 0);
        termSprite.rotation.x = -Math.PI / 2;
        termSprite.width = 0.8;
        termSprite.depth = 1.0;
        termSprite.userData = {
            isPickupItem: true,
            itemType: 'term-sheet',
            itemData: { name: 'Term Sheet', icon: '📄', description: 'Proof of $2M seed round - read the fine print!' }
        };
        this.scene.add(termSprite);
        this.interactiveNPCs.push(termSprite);

        // Investor Business Cards
        const cardTexture = loader.load('/assets/textures/items/business-card.png');
        cardTexture.magFilter = THREE.NearestFilter;
        const cardSprite = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.4),
            new THREE.MeshBasicMaterial({ map: cardTexture, transparent: true, side: THREE.DoubleSide })
        );
        cardSprite.position.set(2, 0.5, 1);
        cardSprite.rotation.x = -Math.PI / 2;
        cardSprite.width = 0.6;
        cardSprite.depth = 0.4;
        cardSprite.userData = {
            isPickupItem: true,
            itemType: 'business-card',
            itemData: { name: 'Investor Business Cards', icon: '👔', description: 'Collect all 5 VCs who said no' }
        };
        this.scene.add(cardSprite);
        this.interactiveNPCs.push(cardSprite);

        // YC Acceptance Letter
        const ycTexture = loader.load('/assets/textures/items/yc-letter.png');
        ycTexture.magFilter = THREE.NearestFilter;
        const ycSprite = new THREE.Mesh(
            new THREE.PlaneGeometry(0.7, 0.9),
            new THREE.MeshBasicMaterial({ map: ycTexture, transparent: true, side: THREE.DoubleSide })
        );
        ycSprite.position.set(3, 0.5, -1);
        ycSprite.rotation.x = -Math.PI / 2;
        ycSprite.width = 0.7;
        ycSprite.depth = 0.9;
        ycSprite.userData = {
            isPickupItem: true,
            itemType: 'yc-letter',
            itemData: { name: 'YC Acceptance Letter', icon: '🎉', description: 'Easter egg - the dream email' }
        };
        this.scene.add(ycSprite);
        this.interactiveNPCs.push(ycSprite);

        // Cap Table Spreadsheet
        const capTexture = loader.load('/assets/textures/items/cap-table.png');
        capTexture.magFilter = THREE.NearestFilter;
        const capSprite = new THREE.Mesh(
            new THREE.PlaneGeometry(1.0, 0.8),
            new THREE.MeshBasicMaterial({ map: capTexture, transparent: true, side: THREE.DoubleSide })
        );
        capSprite.position.set(-3, 0.5, -2);
        capSprite.rotation.x = -Math.PI / 2;
        capSprite.width = 1.0;
        capSprite.depth = 0.8;
        capSprite.userData = {
            isPickupItem: true,
            itemType: 'cap-table',
            itemData: { name: 'Cap Table Spreadsheet', icon: '📈', description: 'Shows equity split - you still own 65%!' }
        };
        this.scene.add(capSprite);
        this.interactiveNPCs.push(capSprite);
    }

    addLoftItems() {
        const loader = new THREE.TextureLoader();

        // Employee Handbook
        const handbookTexture = loader.load('/assets/textures/items/handbook.png');
        handbookTexture.magFilter = THREE.NearestFilter;
        const handbookSprite = new THREE.Mesh(
            new THREE.PlaneGeometry(0.8, 1.0),
            new THREE.MeshBasicMaterial({ map: handbookTexture, transparent: true, side: THREE.DoubleSide })
        );
        handbookSprite.position.set(-2, 0.5, -1);
        handbookSprite.rotation.x = -Math.PI / 2;
        handbookSprite.width = 0.8;
        handbookSprite.depth = 1.0;
        handbookSprite.userData = {
            isPickupItem: true,
            itemType: 'handbook',
            itemData: { name: 'Employee Handbook', icon: '📖', description: 'Company culture document - unlimited PTO included' }
        };
        this.scene.add(handbookSprite);
        this.interactiveNPCs.push(handbookSprite);

        // Team Photos
        const photoTexture = loader.load('/assets/textures/items/team-photo.png');
        photoTexture.magFilter = THREE.NearestFilter;
        const photoSprite = new THREE.Mesh(
            new THREE.PlaneGeometry(1.0, 0.7),
            new THREE.MeshBasicMaterial({ map: photoTexture, transparent: true, side: THREE.DoubleSide })
        );
        photoSprite.position.set(2, 0.5, 0);
        photoSprite.rotation.x = -Math.PI / 2;
        photoSprite.width = 1.0;
        photoSprite.depth = 0.7;
        photoSprite.userData = {
            isPickupItem: true,
            itemType: 'team-photo',
            itemData: { name: 'Team Photos', icon: '📸', description: 'Collectible - find all 5 early employee pics' }
        };
        this.scene.add(photoSprite);
        this.interactiveNPCs.push(photoSprite);

        // Stock Option Pool Doc
        const stockTexture = loader.load('/assets/textures/items/stock-options.png');
        stockTexture.magFilter = THREE.NearestFilter;
        const stockSprite = new THREE.Mesh(
            new THREE.PlaneGeometry(0.9, 0.7),
            new THREE.MeshBasicMaterial({ map: stockTexture, transparent: true, side: THREE.DoubleSide })
        );
        stockSprite.position.set(0, 0.5, 2);
        stockSprite.rotation.x = -Math.PI / 2;
        stockSprite.width = 0.9;
        stockSprite.depth = 0.7;
        stockSprite.userData = {
            isPickupItem: true,
            itemType: 'stock-options',
            itemData: { name: 'Stock Option Pool Doc', icon: '💼', description: 'Explains equity vesting - 4 year cliff' }
        };
        this.scene.add(stockSprite);
        this.interactiveNPCs.push(stockSprite);

        // Ping Pong Paddle
        const paddleTexture = loader.load('/assets/textures/items/ping-pong-paddle.png');
        paddleTexture.magFilter = THREE.NearestFilter;
        const paddleSprite = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.8),
            new THREE.MeshBasicMaterial({ map: paddleTexture, transparent: true, side: THREE.DoubleSide })
        );
        paddleSprite.position.set(-3, 0.5, 1);
        paddleSprite.rotation.x = -Math.PI / 2;
        paddleSprite.width = 0.6;
        paddleSprite.depth = 0.8;
        paddleSprite.userData = {
            isPickupItem: true,
            itemType: 'ping-pong-paddle',
            itemData: { name: 'Ping Pong Paddle', icon: '🏓', description: 'Easter egg - the startup cliché starter pack' }
        };
        this.scene.add(paddleSprite);
        this.interactiveNPCs.push(paddleSprite);
    }

    addConferenceItems() {
        const loader = new THREE.TextureLoader();

        // Growth Playbook
        const playbookTexture = loader.load('/assets/textures/items/growth-playbook.png');
        playbookTexture.magFilter = THREE.NearestFilter;
        const playbookSprite = new THREE.Mesh(
            new THREE.PlaneGeometry(0.9, 1.1),
            new THREE.MeshBasicMaterial({ map: playbookTexture, transparent: true, side: THREE.DoubleSide })
        );
        playbookSprite.position.set(0, 0.5, -2);
        playbookSprite.rotation.x = -Math.PI / 2;
        playbookSprite.width = 0.9;
        playbookSprite.depth = 1.1;
        playbookSprite.userData = {
            isPickupItem: true,
            itemType: 'growth-playbook',
            itemData: { name: 'Growth Playbook', icon: '📚', description: 'Marketing strategies - viral loops inside!' }
        };
        this.scene.add(playbookSprite);
        this.interactiveNPCs.push(playbookSprite);

        // Analytics Dashboard Printout
        const analyticsTexture = loader.load('/assets/textures/items/analytics-dashboard.png');
        analyticsTexture.magFilter = THREE.NearestFilter;
        const analyticsSprite = new THREE.Mesh(
            new THREE.PlaneGeometry(1.2, 0.8),
            new THREE.MeshBasicMaterial({ map: analyticsTexture, transparent: true, side: THREE.DoubleSide })
        );
        analyticsSprite.position.set(-2, 0.5, 0);
        analyticsSprite.rotation.x = -Math.PI / 2;
        analyticsSprite.width = 1.2;
        analyticsSprite.depth = 0.8;
        analyticsSprite.userData = {
            isPickupItem: true,
            itemType: 'analytics-dashboard',
            itemData: { name: 'Analytics Dashboard', icon: '📊', description: 'Shows DAU/MRR metrics in real-time' }
        };
        this.scene.add(analyticsSprite);
        this.interactiveNPCs.push(analyticsSprite);

        // Product Hunt Trophy
        const trophyTexture = loader.load('/assets/textures/items/product-hunt-trophy.png');
        trophyTexture.magFilter = THREE.NearestFilter;
        const trophySprite = new THREE.Mesh(
            new THREE.PlaneGeometry(0.7, 0.9),
            new THREE.MeshBasicMaterial({ map: trophyTexture, transparent: true, side: THREE.DoubleSide })
        );
        trophySprite.position.set(3, 0.5, 1);
        trophySprite.rotation.x = -Math.PI / 2;
        trophySprite.width = 0.7;
        trophySprite.depth = 0.9;
        trophySprite.userData = {
            isPickupItem: true,
            itemType: 'product-hunt-trophy',
            itemData: { name: 'Product Hunt Trophy', icon: '🏆', description: 'Launch day memento - #1 Product!' }
        };
        this.scene.add(trophySprite);
        this.interactiveNPCs.push(trophySprite);

        // Ad Campaign Budget
        const budgetTexture = loader.load('/assets/textures/items/ad-budget.png');
        budgetTexture.magFilter = THREE.NearestFilter;
        const budgetSprite = new THREE.Mesh(
            new THREE.PlaneGeometry(0.8, 0.6),
            new THREE.MeshBasicMaterial({ map: budgetTexture, transparent: true, side: THREE.DoubleSide })
        );
        budgetSprite.position.set(2, 0.5, -2);
        budgetSprite.rotation.x = -Math.PI / 2;
        budgetSprite.width = 0.8;
        budgetSprite.depth = 0.6;
        budgetSprite.userData = {
            isPickupItem: true,
            itemType: 'ad-budget',
            itemData: { name: 'Ad Campaign Budget', icon: '💰', description: '$50k/month on Google Ads - CAC looking good' }
        };
        this.scene.add(budgetSprite);
        this.interactiveNPCs.push(budgetSprite);
    }

    createNPC(x, z, color, characterId) {
        // Map character IDs to sprite filenames
        const spriteMap = {
            'sam': 'sam-visionary',
            'alex': 'alex-builder',
            'jordan': 'jordan-connector',
            'casey': 'casey-creative',
            'morgan': 'morgan-marketer'
        };

        const spriteName = spriteMap[characterId] || 'sam-visionary';
        const spritePath = `/assets/textures/npc/${spriteName}.png`;

        // Load character sprite texture
        const loader = new THREE.TextureLoader();
        const spriteTexture = loader.load(spritePath);
        spriteTexture.magFilter = THREE.NearestFilter;
        spriteTexture.minFilter = THREE.NearestFilter;

        // Create plane geometry for sprite (1x1.5 aspect ratio for character)
        const npcGeometry = new THREE.PlaneGeometry(1, 1.5);
        const npcMaterial = new THREE.MeshBasicMaterial({
            map: spriteTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const npc = new THREE.Mesh(npcGeometry, npcMaterial);

        // Position flat on ground, rotated to XZ plane
        npc.position.set(x, 0.1, z);
        npc.rotation.x = -Math.PI / 2;

        npc.width = 1;
        npc.depth = 1.5;
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
