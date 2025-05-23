import * as THREE from 'three';

export class Player {
    constructor(scene, camera, onExitBuildingCallback) {
        this.scene = scene;
        this.camera = camera;
        this.speed = 0.1;
        this.position = new THREE.Vector3(0, 0.1, 0); // Adjusted Y position for flat sprite
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

        this.isInBuilding = false;
        this.buildingObstacles = [];
        this.interactiveNPCs = []; // For NPCs that can be interacted with
        this.onExitBuildingCallback = onExitBuildingCallback;
        this.lastEnteredBuildingData = null;
        this.currentRoomDepth = null; // Store current room depth for exit logic
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
                // Check for NPC interaction
                if (this.isInBuilding && obstacle.userData && obstacle.userData.isNPC && obstacle.userData.dialogue) {
                    // Only start new dialogue if not already talking or talking to someone else
                    if (this.game && this.game.dialogueManager && (!this.game.dialogueManager.isActive() || this.currentSpeaker !== obstacle)) {
                        this.currentSpeaker = obstacle; // Set current speaker
                        this.game.dialogueManager.showDialogue(obstacle.userData.dialogue, () => {
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
        // Set garage-specific background (industrial atmosphere)
        this.scene.background = new THREE.Color(0x2f2f2f); // Dark grey

        const roomWidth = 18; // Slightly wider for garage
        const roomDepth = 14; // Deeper for cars
        const wallHeight = 4; // Taller ceiling

        // Create concrete floor
        const concreteFloorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const concreteFloorMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 }); // Grey concrete
        const concreteFloor = new THREE.Mesh(concreteFloorGeometry, concreteFloorMaterial);
        concreteFloor.rotation.x = -Math.PI / 2;
        this.scene.add(concreteFloor);

        // Add oil stains on the floor
        const oilStain1 = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 1),
            new THREE.MeshBasicMaterial({ color: 0x1a1a1a })
        );
        oilStain1.rotation.x = -Math.PI / 2;
        oilStain1.position.set(-3, 0.02, -2);
        this.scene.add(oilStain1);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x696969); // Dim grey walls

        // Add garage equipment
        this.addGarageEquipment();

        // Add garage NPC (mechanic)
        this.addGarageNPC();

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting();
    }


    createVentureInterior() {
        // Set Venture-specific background (corporate/investment atmosphere)
        this.scene.background = new THREE.Color(0x1a3a1a); // Dark green

        const roomWidth = 22; // Large corporate space
        const roomDepth = 18;
        const wallHeight = 4; // High ceiling

        // Create corporate marble floor
        const marbleFloorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const marbleFloorMaterial = new THREE.MeshBasicMaterial({ color: 0xf0f0f0 }); // Light marble
        const marbleFloor = new THREE.Mesh(marbleFloorGeometry, marbleFloorMaterial);
        marbleFloor.rotation.x = -Math.PI / 2;
        this.scene.add(marbleFloor);

        // Add luxury carpet in center
        const luxuryCarpetGeometry = new THREE.PlaneGeometry(12, 8);
        const luxuryCarpetMaterial = new THREE.MeshBasicMaterial({ color: 0x8b0000 }); // Deep red
        const luxuryCarpet = new THREE.Mesh(luxuryCarpetGeometry, luxuryCarpetMaterial);
        luxuryCarpet.rotation.x = -Math.PI / 2;
        luxuryCarpet.position.set(0, 0.01, -2);
        this.scene.add(luxuryCarpet);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x2f4f2f); // Dark forest green walls

        // Add Venture corporate furniture
        this.addVentureFurniture();

        // Add Venture NPC
        this.addVentureNPC();

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting();
    }

    createGenericInterior() {
        // Fallback generic interior
        this.scene.background = new THREE.Color(0x3d291e);

        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        const genericFloor = new THREE.Mesh(
            new THREE.PlaneGeometry(roomWidth, roomDepth),
            new THREE.MeshBasicMaterial({ color: 0x654321 })
        );
        genericFloor.rotation.x = -Math.PI / 2;
        this.scene.add(genericFloor);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x8c6c46);

        // Add generic NPC
        const npcMesh = this.createNPC(0, -roomDepth / 2 + 1.5, 0x0000ff, 
            ["Hello and welcome to Silicon Valley,", "we are excited you are here"]);
        this.scene.add(npcMesh);
        this.buildingObstacles.push(npcMesh);
        this.interactiveNPCs.push(npcMesh);

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
        fireplace.position.set(0, 0.75, -5.8);
        fireplace.width = 2; 
        fireplace.depth = 0.5;
        this.scene.add(fireplace);
        this.buildingObstacles.push(fireplace);
    }

    addGarageEquipment() {
        // Car in the center
        const carGeometry = new THREE.BoxGeometry(4.5, 1.5, 2);
        const carMaterial = new THREE.MeshBasicMaterial({ color: 0xff4500 }); // Red-orange car
        const car = new THREE.Mesh(carGeometry, carMaterial);
        car.position.set(0, 0.75, -1);
        car.width = 4.5; 
        car.depth = 2;
        this.scene.add(car);
        this.buildingObstacles.push(car);

        // Workbench
        const workbenchGeometry = new THREE.BoxGeometry(4, 0.8, 1.2);
        const workbenchMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 });
        const workbench = new THREE.Mesh(workbenchGeometry, workbenchMaterial);
        workbench.position.set(-6, 0.4, -4);
        workbench.width = 4; 
        workbench.depth = 1.2;
        this.scene.add(workbench);
        this.buildingObstacles.push(workbench);

        // Tool cabinet
        const cabinetGeometry = new THREE.BoxGeometry(1.5, 2, 0.6);
        const cabinetMaterial = new THREE.MeshBasicMaterial({ color: 0x2f2f2f });
        const cabinet = new THREE.Mesh(cabinetGeometry, cabinetMaterial);
        cabinet.position.set(7, 1, -5);
        cabinet.width = 1.5; 
        cabinet.depth = 0.6;
        this.scene.add(cabinet);
        this.buildingObstacles.push(cabinet);

        // Oil drums
        const drumGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1.2);
        const drumMaterial = new THREE.MeshBasicMaterial({ color: 0x404040 });
        
        const drum1 = new THREE.Mesh(drumGeometry, drumMaterial);
        drum1.position.set(6, 0.6, 3);
        drum1.width = 0.8; 
        drum1.depth = 0.8;
        this.scene.add(drum1);
        this.buildingObstacles.push(drum1);

        const drum2 = new THREE.Mesh(drumGeometry, drumMaterial);
        drum2.position.set(7.2, 0.6, 3);
        drum2.width = 0.8; 
        drum2.depth = 0.8;
        this.scene.add(drum2);
        this.buildingObstacles.push(drum2);
    }

    addHouseNPC() {
        const houseNPC = this.createNPC(-1, -4, 0x00ff00, // Green NPC for house
            ["Welcome to my cozy home!", "I love the warm atmosphere here.", "Feel free to look around!"]);
        this.scene.add(houseNPC);
        this.buildingObstacles.push(houseNPC);
        this.interactiveNPCs.push(houseNPC);
    }

    addGarageNPC() {
        const garageNPC = this.createNPC(-4, -2, 0xffff00, // Yellow NPC for garage (mechanic)
            ["Hey there! Welcome to my garage!", "I can fix any car that comes through here.", "Got any automotive questions?"]);
        this.scene.add(garageNPC);
        this.buildingObstacles.push(garageNPC);
        this.interactiveNPCs.push(garageNPC);
    }


    addVentureNPC() {
        const ventureNPC = this.createNPC(-3, -7, 0x2f4f2f, // Dark green NPC for Venture
            ["Greetings, entrepreneur.", "We invest in promising ventures.", "What's your business model and growth strategy?"]);
        this.scene.add(ventureNPC);
        this.buildingObstacles.push(ventureNPC);
        this.interactiveNPCs.push(ventureNPC);
    }


    addVentureFurniture() {
        // Executive conference table
        const execTableGeometry = new THREE.BoxGeometry(8, 0.8, 3);
        const execTableMaterial = new THREE.MeshBasicMaterial({ color: 0x4a2c17 }); // Rich mahogany
        const execTable = new THREE.Mesh(execTableGeometry, execTableMaterial);
        execTable.position.set(0, 0.4, -3);
        execTable.width = 8; 
        execTable.depth = 3;
        this.scene.add(execTable);
        this.buildingObstacles.push(execTable);

        // Luxury leather chairs
        const luxuryChairGeometry = new THREE.BoxGeometry(0.8, 1.4, 0.8);
        const luxuryChairMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 }); // Leather brown

        // Executive chairs around the table
        for (let i = 0; i < 8; i++) {
            const chair = new THREE.Mesh(luxuryChairGeometry, luxuryChairMaterial);
            if (i < 4) {
                chair.position.set(-3 + (i * 2), 0.7, -4.5);
            } else {
                chair.position.set(-3 + ((i-4) * 2), 0.7, -1.5);
            }
            chair.width = 0.8; 
            chair.depth = 0.8;
            this.scene.add(chair);
            this.buildingObstacles.push(chair);
        }

        // Reception desk
        const receptionDeskGeometry = new THREE.BoxGeometry(4, 1, 1.5);
        const receptionDeskMaterial = new THREE.MeshBasicMaterial({ color: 0x2f4f2f });
        const receptionDesk = new THREE.Mesh(receptionDeskGeometry, receptionDeskMaterial);
        receptionDesk.position.set(-7, 0.5, 6);
        receptionDesk.width = 4; 
        receptionDesk.depth = 1.5;
        this.scene.add(receptionDesk);
        this.buildingObstacles.push(receptionDesk);

        // Corporate bookshelf with awards
        const corpBookshelfGeometry = new THREE.BoxGeometry(0.4, 3, 4);
        const corpBookshelfMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
        const corpBookshelf = new THREE.Mesh(corpBookshelfGeometry, corpBookshelfMaterial);
        corpBookshelf.position.set(10.8, 1.5, -2);
        corpBookshelf.width = 0.4; 
        corpBookshelf.depth = 4;
        this.scene.add(corpBookshelf);
        this.buildingObstacles.push(corpBookshelf);

        // Safe (for storing important documents)
        const safeGeometry = new THREE.BoxGeometry(1.2, 1.5, 1);
        const safeMaterial = new THREE.MeshBasicMaterial({ color: 0x2f2f2f });
        const safe = new THREE.Mesh(safeGeometry, safeMaterial);
        safe.position.set(8, 0.75, 6);
        safe.width = 1.2; 
        safe.depth = 1;
        this.scene.add(safe);
        this.buildingObstacles.push(safe);

        // Art piece (expensive corporate art)
        const artPieceGeometry = new THREE.BoxGeometry(0.1, 2, 1.5);
        const artPieceMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 }); // Gold frame
        const artPiece = new THREE.Mesh(artPieceGeometry, artPieceMaterial);
        artPiece.position.set(-10.9, 1, 2);
        artPiece.width = 0.1; 
        artPiece.depth = 1.5;
        this.scene.add(artPiece);
        this.buildingObstacles.push(artPiece);
    }

    createDataCenterInterior() {
        // Set data center background (high-tech server atmosphere)
        this.scene.background = new THREE.Color(0x0a0a0a); // Very dark for server room

        const roomWidth = 24; // Large server room
        const roomDepth = 20;
        const wallHeight = 4;

        // Create raised server floor
        const serverFloorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const serverFloorMaterial = new THREE.MeshBasicMaterial({ color: 0x2f2f2f }); // Dark grey
        const serverFloor = new THREE.Mesh(serverFloorGeometry, serverFloorMaterial);
        serverFloor.rotation.x = -Math.PI / 2;
        this.scene.add(serverFloor);

        // Add cable management areas
        const cableAreaGeometry = new THREE.PlaneGeometry(2, roomDepth);
        const cableAreaMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a }); // Darker for cables
        const cableArea = new THREE.Mesh(cableAreaGeometry, cableAreaMaterial);
        cableArea.rotation.x = -Math.PI / 2;
        cableArea.position.set(0, 0.01, 0);
        this.scene.add(cableArea);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x404040); // Dark grey walls
        this.addDataCenterEquipment();
        this.addDataCenterNPC();
        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting();
    }

    createConferenceInterior() {
        // Set conference background (professional meeting atmosphere)
        this.scene.background = new THREE.Color(0x2c1810); // Dark brown professional

        const roomWidth = 20; // Large conference space
        const roomDepth = 16;
        const wallHeight = 3.5;

        // Create professional carpet floor
        const carpetFloorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const carpetFloorMaterial = new THREE.MeshBasicMaterial({ color: 0x4a4a4a }); // Professional grey
        const carpetFloor = new THREE.Mesh(carpetFloorGeometry, carpetFloorMaterial);
        carpetFloor.rotation.x = -Math.PI / 2;
        this.scene.add(carpetFloor);

        // Add presentation area carpet
        const presentationCarpetGeometry = new THREE.PlaneGeometry(roomWidth * 0.8, 4);
        const presentationCarpetMaterial = new THREE.MeshBasicMaterial({ color: 0x8b0000 }); // Deep red
        const presentationCarpet = new THREE.Mesh(presentationCarpetGeometry, presentationCarpetMaterial);
        presentationCarpet.rotation.x = -Math.PI / 2;
        presentationCarpet.position.set(0, 0.01, -roomDepth/2 + 2);
        this.scene.add(presentationCarpet);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x654321); // Professional brown walls
        this.addConferenceFurniture();
        this.addConferenceNPC();
        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting();
    }

    createLoftInterior() {
        // Set loft background (modern creative atmosphere)
        this.scene.background = new THREE.Color(0x2a2a2a); // Modern dark grey

        const roomWidth = 18; // Open loft space
        const roomDepth = 15;
        const wallHeight = 5; // High loft ceiling

        // Create polished concrete floor
        const concreteFloorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const concreteFloorMaterial = new THREE.MeshBasicMaterial({ color: 0x696969 }); // Light grey concrete
        const concreteFloor = new THREE.Mesh(concreteFloorGeometry, concreteFloorMaterial);
        concreteFloor.rotation.x = -Math.PI / 2;
        this.scene.add(concreteFloor);

        // Add area rugs for different zones
        const rugGeometry = new THREE.PlaneGeometry(6, 4);
        const rugMaterial = new THREE.MeshBasicMaterial({ color: 0xff6b35 }); // Orange accent
        const rug1 = new THREE.Mesh(rugGeometry, rugMaterial);
        rug1.rotation.x = -Math.PI / 2;
        rug1.position.set(-4, 0.01, -3);
        this.scene.add(rug1);

        const rug2 = new THREE.Mesh(rugGeometry, rugMaterial);
        rug2.rotation.x = -Math.PI / 2;
        rug2.position.set(4, 0.01, 2);
        this.scene.add(rug2);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x8b4513); // Exposed brick color
        this.addLoftFurniture();
        this.addLoftNPC();
        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting();
    }

    createAcceleratorInterior() {
        // Set accelerator background (innovation/startup atmosphere)
        this.scene.background = new THREE.Color(0x1a1a3a); // Deep blue innovation

        const roomWidth = 22; // Large innovation space
        const roomDepth = 18;
        const wallHeight = 4;

        // Store room depth for exit logic
        this.currentRoomDepth = roomDepth;

        // Create modern tech floor
        const techFloorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const techFloorMaterial = new THREE.MeshBasicMaterial({ color: 0x2c2c54 }); // Tech blue
        const techFloor = new THREE.Mesh(techFloorGeometry, techFloorMaterial);
        techFloor.rotation.x = -Math.PI / 2;
        this.scene.add(techFloor);

        // Add innovation zones with different colored areas
        const innovationZone1 = new THREE.Mesh(
            new THREE.PlaneGeometry(8, 6),
            new THREE.MeshBasicMaterial({ color: 0x4169e1 }) // Royal blue
        );
        innovationZone1.rotation.x = -Math.PI / 2;
        innovationZone1.position.set(-5, 0.01, -4);
        this.scene.add(innovationZone1);

        const innovationZone2 = new THREE.Mesh(
            new THREE.PlaneGeometry(8, 6),
            new THREE.MeshBasicMaterial({ color: 0x32cd32 }) // Lime green
        );
        innovationZone2.rotation.x = -Math.PI / 2;
        innovationZone2.position.set(5, 0.01, 2);
        this.scene.add(innovationZone2);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x483d8b); // Dark slate blue walls
        this.addAcceleratorFurniture();
        this.addAcceleratorNPC();
        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting();
    }

    addDataCenterEquipment() {
        // Server racks in rows
        const serverRackGeometry = new THREE.BoxGeometry(0.8, 2.2, 1.2);
        const serverRackMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        // Row 1 of servers
        for (let i = 0; i < 6; i++) {
            const serverRack = new THREE.Mesh(serverRackGeometry, serverRackMaterial);
            serverRack.position.set(-8 + (i * 2.5), 1.1, -6);
            serverRack.width = 0.8;
            serverRack.depth = 1.2;
            this.scene.add(serverRack);
            this.buildingObstacles.push(serverRack);
        }

        // Row 2 of servers
        for (let i = 0; i < 6; i++) {
            const serverRack = new THREE.Mesh(serverRackGeometry, serverRackMaterial);
            serverRack.position.set(-8 + (i * 2.5), 1.1, -3);
            serverRack.width = 0.8;
            serverRack.depth = 1.2;
            this.scene.add(serverRack);
            this.buildingObstacles.push(serverRack);
        }

        // Cooling units
        const coolingUnitGeometry = new THREE.BoxGeometry(2, 2.5, 1.5);
        const coolingUnitMaterial = new THREE.MeshBasicMaterial({ color: 0x4169e1 }); // Blue cooling units

        const coolingUnit1 = new THREE.Mesh(coolingUnitGeometry, coolingUnitMaterial);
        coolingUnit1.position.set(-9, 1.25, 4);
        coolingUnit1.width = 2;
        coolingUnit1.depth = 1.5;
        this.scene.add(coolingUnit1);
        this.buildingObstacles.push(coolingUnit1);

        const coolingUnit2 = new THREE.Mesh(coolingUnitGeometry, coolingUnitMaterial);
        coolingUnit2.position.set(9, 1.25, 4);
        coolingUnit2.width = 2;
        coolingUnit2.depth = 1.5;
        this.scene.add(coolingUnit2);
        this.buildingObstacles.push(coolingUnit2);

        // Network equipment cabinet
        const networkCabinetGeometry = new THREE.BoxGeometry(1.2, 2, 0.8);
        const networkCabinetMaterial = new THREE.MeshBasicMaterial({ color: 0x2f2f2f });
        const networkCabinet = new THREE.Mesh(networkCabinetGeometry, networkCabinetMaterial);
        networkCabinet.position.set(0, 1, 7);
        networkCabinet.width = 1.2;
        networkCabinet.depth = 0.8;
        this.scene.add(networkCabinet);
        this.buildingObstacles.push(networkCabinet);
    }

    addConferenceFurniture() {
        // Large conference table
        const conferenceTableGeometry = new THREE.BoxGeometry(12, 0.8, 4);
        const conferenceTableMaterial = new THREE.MeshBasicMaterial({ color: 0x4a2c17 }); // Rich wood
        const conferenceTable = new THREE.Mesh(conferenceTableGeometry, conferenceTableMaterial);
        conferenceTable.position.set(0, 0.4, 0);
        conferenceTable.width = 12;
        conferenceTable.depth = 4;
        this.scene.add(conferenceTable);
        this.buildingObstacles.push(conferenceTable);

        // Executive chairs around table
        const execChairGeometry = new THREE.BoxGeometry(0.8, 1.4, 0.8);
        const execChairMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 });

        // Chairs along the sides
        for (let i = 0; i < 10; i++) {
            const chair = new THREE.Mesh(execChairGeometry, execChairMaterial);
            if (i < 5) {
                chair.position.set(-5 + (i * 2.5), 0.7, -2.5);
            } else {
                chair.position.set(-5 + ((i-5) * 2.5), 0.7, 2.5);
            }
            chair.width = 0.8;
            chair.depth = 0.8;
            this.scene.add(chair);
            this.buildingObstacles.push(chair);
        }

        // Presentation screen
        const screenGeometry = new THREE.BoxGeometry(0.1, 3, 5);
        const screenMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.set(0, 1.5, -7.9);
        screen.width = 0.1;
        screen.depth = 5;
        this.scene.add(screen);
        this.buildingObstacles.push(screen);

        // Podium
        const podiumGeometry = new THREE.BoxGeometry(1.2, 1.2, 0.8);
        const podiumMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 });
        const podium = new THREE.Mesh(podiumGeometry, podiumMaterial);
        podium.position.set(0, 0.6, -6);
        podium.width = 1.2;
        podium.depth = 0.8;
        this.scene.add(podium);
        this.buildingObstacles.push(podium);
    }

    addLoftFurniture() {
        // Modern sectional sofa
        const sofaGeometry = new THREE.BoxGeometry(4, 0.8, 2);
        const sofaMaterial = new THREE.MeshBasicMaterial({ color: 0x696969 }); // Grey sofa
        const sofa = new THREE.Mesh(sofaGeometry, sofaMaterial);
        sofa.position.set(-4, 0.4, -3);
        sofa.width = 4;
        sofa.depth = 2;
        this.scene.add(sofa);
        this.buildingObstacles.push(sofa);

        // Coffee table
        const coffeeTableGeometry = new THREE.BoxGeometry(2, 0.4, 1);
        const coffeeTableMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 });
        const coffeeTable = new THREE.Mesh(coffeeTableGeometry, coffeeTableMaterial);
        coffeeTable.position.set(-4, 0.2, -1);
        coffeeTable.width = 2;
        coffeeTable.depth = 1;
        this.scene.add(coffeeTable);
        this.buildingObstacles.push(coffeeTable);

        // Kitchen island
        const kitchenIslandGeometry = new THREE.BoxGeometry(3, 1, 1.5);
        const kitchenIslandMaterial = new THREE.MeshBasicMaterial({ color: 0x2f2f2f });
        const kitchenIsland = new THREE.Mesh(kitchenIslandGeometry, kitchenIslandMaterial);
        kitchenIsland.position.set(5, 0.5, 2);
        kitchenIsland.width = 3;
        kitchenIsland.depth = 1.5;
        this.scene.add(kitchenIsland);
        this.buildingObstacles.push(kitchenIsland);

        // Bar stools
        const stoolGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2);
        const stoolMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 });

        const stool1 = new THREE.Mesh(stoolGeometry, stoolMaterial);
        stool1.position.set(4, 0.6, 3);
        stool1.width = 0.6;
        stool1.depth = 0.6;
        this.scene.add(stool1);
        this.buildingObstacles.push(stool1);

        const stool2 = new THREE.Mesh(stoolGeometry, stoolMaterial);
        stool2.position.set(6, 0.6, 3);
        stool2.width = 0.6;
        stool2.depth = 0.6;
        this.scene.add(stool2);
        this.buildingObstacles.push(stool2);

        // Art easel
        const easelGeometry = new THREE.BoxGeometry(0.1, 2, 1.5);
        const easelMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 });
        const easel = new THREE.Mesh(easelGeometry, easelMaterial);
        easel.position.set(7, 1, -5);
        easel.width = 0.1;
        easel.depth = 1.5;
        this.scene.add(easel);
        this.buildingObstacles.push(easel);
    }

    addAcceleratorFurniture() {
        // Innovation pods (circular workspaces)
        const podGeometry = new THREE.CylinderGeometry(2, 2, 0.6);
        const podMaterial = new THREE.MeshBasicMaterial({ color: 0x4169e1 });

        const pod1 = new THREE.Mesh(podGeometry, podMaterial);
        pod1.position.set(-5, 0.3, -4);
        pod1.width = 4;
        pod1.depth = 4;
        this.scene.add(pod1);
        this.buildingObstacles.push(pod1);

        const pod2 = new THREE.Mesh(podGeometry, podMaterial);
        pod2.position.set(5, 0.3, 2);
        pod2.width = 4;
        pod2.depth = 4;
        this.scene.add(pod2);
        this.buildingObstacles.push(pod2);

        // Collaboration stations
        const collabStationGeometry = new THREE.BoxGeometry(3, 1.2, 1.5);
        const collabStationMaterial = new THREE.MeshBasicMaterial({ color: 0x32cd32 });

        const station1 = new THREE.Mesh(collabStationGeometry, collabStationMaterial);
        station1.position.set(-8, 0.6, 3);
        station1.width = 3;
        station1.depth = 1.5;
        this.scene.add(station1);
        this.buildingObstacles.push(station1);

        const station2 = new THREE.Mesh(collabStationGeometry, collabStationMaterial);
        station2.position.set(8, 0.6, -2);
        station2.width = 3;
        station2.depth = 1.5;
        this.scene.add(station2);
        this.buildingObstacles.push(station2);

        // Innovation wall (interactive display)
        const innovationWallGeometry = new THREE.BoxGeometry(0.1, 3, 6);
        const innovationWallMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff }); // Cyan tech color
        const innovationWall = new THREE.Mesh(innovationWallGeometry, innovationWallMaterial);
        innovationWall.position.set(-10.9, 1.5, -2);
        innovationWall.width = 0.1;
        innovationWall.depth = 6;
        this.scene.add(innovationWall);
        this.buildingObstacles.push(innovationWall);

        // Prototype workbench
        const prototypeWorkbenchGeometry = new THREE.BoxGeometry(4, 1, 2);
        const prototypeWorkbenchMaterial = new THREE.MeshBasicMaterial({ color: 0x2f2f2f });
        const prototypeWorkbench = new THREE.Mesh(prototypeWorkbenchGeometry, prototypeWorkbenchMaterial);
        prototypeWorkbench.position.set(0, 0.5, 6);
        prototypeWorkbench.width = 4;
        prototypeWorkbench.depth = 2;
        this.scene.add(prototypeWorkbench);
        this.buildingObstacles.push(prototypeWorkbench);
    }

    addDataCenterNPC() {
        const dataCenterNPC = this.createNPC(2, -7, 0x00ffff, // Cyan NPC for data center
            ["Welcome to our data center!", "We process millions of requests per second.", "The servers never sleep here."]);
        this.scene.add(dataCenterNPC);
        this.buildingObstacles.push(dataCenterNPC);
        this.interactiveNPCs.push(dataCenterNPC);
    }

    addConferenceNPC() {
        const conferenceNPC = this.createNPC(-2, -6, 0x4a2c17, // Brown NPC for conference
            ["Welcome to our conference center!", "We host the most important meetings here.", "What brings you to our boardroom?"]);
        this.scene.add(conferenceNPC);
        this.buildingObstacles.push(conferenceNPC);
        this.interactiveNPCs.push(conferenceNPC);
    }

    addLoftNPC() {
        const loftNPC = this.createNPC(1, -5, 0xff6b35, // Orange NPC for loft
            ["Hey! Welcome to my creative loft!", "This is where all the magic happens.", "Feel free to check out my latest projects!"]);
        this.scene.add(loftNPC);
        this.buildingObstacles.push(loftNPC);
        this.interactiveNPCs.push(loftNPC);
    }

    addAcceleratorNPC() {
        const acceleratorNPC = this.createNPC(-1, -7, 0x4169e1, // Royal blue NPC for accelerator
            ["Welcome to our startup accelerator!", "We turn ideas into billion-dollar companies.", "Do you have what it takes to disrupt an industry?"]);
        this.scene.add(acceleratorNPC);
        this.buildingObstacles.push(acceleratorNPC);
        this.interactiveNPCs.push(acceleratorNPC);
    }

    createLawInterior() {
        // Set law background (professional legal atmosphere)
        this.scene.background = new THREE.Color(0x1a1a2e); // Dark navy professional

        const roomWidth = 20; // Large law office space
        const roomDepth = 16;
        const wallHeight = 4; // High ceiling for authority

        // Store room depth for exit logic
        this.currentRoomDepth = roomDepth;

        // Create professional marble floor
        const marbleFloorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const marbleFloorMaterial = new THREE.MeshBasicMaterial({ color: 0xf5f5dc }); // Beige marble
        const marbleFloor = new THREE.Mesh(marbleFloorGeometry, marbleFloorMaterial);
        marbleFloor.rotation.x = -Math.PI / 2;
        this.scene.add(marbleFloor);

        // Add legal carpet area
        const legalCarpetGeometry = new THREE.PlaneGeometry(12, 8);
        const legalCarpetMaterial = new THREE.MeshBasicMaterial({ color: 0x8b0000 }); // Deep red legal carpet
        const legalCarpet = new THREE.Mesh(legalCarpetGeometry, legalCarpetMaterial);
        legalCarpet.rotation.x = -Math.PI / 2;
        legalCarpet.position.set(0, 0.01, -2);
        this.scene.add(legalCarpet);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x654321); // Professional brown walls
        this.addLawFurniture();
        this.addLawNPC();
        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting();
    }

    createNasdaqInterior() {
        // Set nasdaq background (financial trading atmosphere)
        this.scene.background = new THREE.Color(0x0a0a1a); // Very dark blue financial

        const roomWidth = 24; // Large trading floor
        const roomDepth = 20;
        const wallHeight = 4;

        // Store room depth for exit logic
        this.currentRoomDepth = roomDepth;

        // Create trading floor
        const tradingFloorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const tradingFloorMaterial = new THREE.MeshBasicMaterial({ color: 0x2f2f2f }); // Dark trading floor
        const tradingFloor = new THREE.Mesh(tradingFloorGeometry, tradingFloorMaterial);
        tradingFloor.rotation.x = -Math.PI / 2;
        this.scene.add(tradingFloor);

        // Add trading zones with different colors
        const tradingZone1 = new THREE.Mesh(
            new THREE.PlaneGeometry(8, 6),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 }) // Green for gains
        );
        tradingZone1.rotation.x = -Math.PI / 2;
        tradingZone1.position.set(-6, 0.01, -4);
        this.scene.add(tradingZone1);

        const tradingZone2 = new THREE.Mesh(
            new THREE.PlaneGeometry(8, 6),
            new THREE.MeshBasicMaterial({ color: 0xff0000 }) // Red for losses
        );
        tradingZone2.rotation.x = -Math.PI / 2;
        tradingZone2.position.set(6, 0.01, 2);
        this.scene.add(tradingZone2);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x1a1a1a); // Dark financial walls
        this.addNasdaqFurniture();
        this.addNasdaqNPC();
        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting();
    }

    addLawFurniture() {
        // Large legal desk
        const legalDeskGeometry = new THREE.BoxGeometry(6, 0.8, 3);
        const legalDeskMaterial = new THREE.MeshBasicMaterial({ color: 0x4a2c17 }); // Rich mahogany
        const legalDesk = new THREE.Mesh(legalDeskGeometry, legalDeskMaterial);
        legalDesk.position.set(0, 0.4, -3);
        legalDesk.width = 6;
        legalDesk.depth = 3;
        this.scene.add(legalDesk);
        this.buildingObstacles.push(legalDesk);

        // Legal bookshelves with law books
        const lawBookshelfGeometry = new THREE.BoxGeometry(0.4, 3, 8);
        const lawBookshelfMaterial = new THREE.MeshBasicMaterial({ color: 0x2f1b14 }); // Dark wood

        const bookshelf1 = new THREE.Mesh(lawBookshelfGeometry, lawBookshelfMaterial);
        bookshelf1.position.set(-9.8, 1.5, -2);
        bookshelf1.width = 0.4;
        bookshelf1.depth = 8;
        this.scene.add(bookshelf1);
        this.buildingObstacles.push(bookshelf1);

        const bookshelf2 = new THREE.Mesh(lawBookshelfGeometry, lawBookshelfMaterial);
        bookshelf2.position.set(9.8, 1.5, -2);
        bookshelf2.width = 0.4;
        bookshelf2.depth = 8;
        this.scene.add(bookshelf2);
        this.buildingObstacles.push(bookshelf2);

        // Client chairs
        const clientChairGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.8);
        const clientChairMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 }); // Leather brown

        const chair1 = new THREE.Mesh(clientChairGeometry, clientChairMaterial);
        chair1.position.set(-1.5, 0.6, -1);
        chair1.width = 0.8;
        chair1.depth = 0.8;
        this.scene.add(chair1);
        this.buildingObstacles.push(chair1);

        const chair2 = new THREE.Mesh(clientChairGeometry, clientChairMaterial);
        chair2.position.set(1.5, 0.6, -1);
        chair2.width = 0.8;
        chair2.depth = 0.8;
        this.scene.add(chair2);
        this.buildingObstacles.push(chair2);

        // Legal filing cabinets
        const filingCabinetGeometry = new THREE.BoxGeometry(1.2, 1.8, 0.6);
        const filingCabinetMaterial = new THREE.MeshBasicMaterial({ color: 0x2f2f2f });

        const cabinet1 = new THREE.Mesh(filingCabinetGeometry, filingCabinetMaterial);
        cabinet1.position.set(-7, 0.9, 6);
        cabinet1.width = 1.2;
        cabinet1.depth = 0.6;
        this.scene.add(cabinet1);
        this.buildingObstacles.push(cabinet1);

        const cabinet2 = new THREE.Mesh(filingCabinetGeometry, filingCabinetMaterial);
        cabinet2.position.set(7, 0.9, 6);
        cabinet2.width = 1.2;
        cabinet2.depth = 0.6;
        this.scene.add(cabinet2);
        this.buildingObstacles.push(cabinet2);

        // Legal scales (symbol of justice)
        const scalesGeometry = new THREE.BoxGeometry(0.8, 1.5, 0.8);
        const scalesMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 }); // Gold scales
        const scales = new THREE.Mesh(scalesGeometry, scalesMaterial);
        scales.position.set(0, 0.75, -4.5);
        scales.width = 0.8;
        scales.depth = 0.8;
        this.scene.add(scales);
        this.buildingObstacles.push(scales);
    }

    addNasdaqFurniture() {
        // Trading desks in rows
        const tradingDeskGeometry = new THREE.BoxGeometry(3, 0.8, 1.5);
        const tradingDeskMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a }); // Dark trading desks

        // Row 1 of trading desks
        for (let i = 0; i < 6; i++) {
            const desk = new THREE.Mesh(tradingDeskGeometry, tradingDeskMaterial);
            desk.position.set(-10 + (i * 3.5), 0.4, -6);
            desk.width = 3;
            desk.depth = 1.5;
            this.scene.add(desk);
            this.buildingObstacles.push(desk);
        }

        // Row 2 of trading desks
        for (let i = 0; i < 6; i++) {
            const desk = new THREE.Mesh(tradingDeskGeometry, tradingDeskMaterial);
            desk.position.set(-10 + (i * 3.5), 0.4, -3);
            desk.width = 3;
            desk.depth = 1.5;
            this.scene.add(desk);
            this.buildingObstacles.push(desk);
        }

        // Large display screens
        const screenGeometry = new THREE.BoxGeometry(0.1, 4, 8);
        const screenMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black screens

        const screen1 = new THREE.Mesh(screenGeometry, screenMaterial);
        screen1.position.set(-11.9, 2, 2);
        screen1.width = 0.1;
        screen1.depth = 8;
        this.scene.add(screen1);
        this.buildingObstacles.push(screen1);

        const screen2 = new THREE.Mesh(screenGeometry, screenMaterial);
        screen2.position.set(11.9, 2, 2);
        screen2.width = 0.1;
        screen2.depth = 8;
        this.scene.add(screen2);
        this.buildingObstacles.push(screen2);

        // Server towers for trading systems
        const serverTowerGeometry = new THREE.BoxGeometry(1, 2.5, 1);
        const serverTowerMaterial = new THREE.MeshBasicMaterial({ color: 0x4169e1 }); // Blue servers

        const server1 = new THREE.Mesh(serverTowerGeometry, serverTowerMaterial);
        server1.position.set(-8, 1.25, 8);
        server1.width = 1;
        server1.depth = 1;
        this.scene.add(server1);
        this.buildingObstacles.push(server1);

        const server2 = new THREE.Mesh(serverTowerGeometry, serverTowerMaterial);
        server2.position.set(8, 1.25, 8);
        server2.width = 1;
        server2.depth = 1;
        this.scene.add(server2);
        this.buildingObstacles.push(server2);

        // Central trading podium
        const podiumGeometry = new THREE.BoxGeometry(2, 1.5, 2);
        const podiumMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 }); // Gold podium
        const podium = new THREE.Mesh(podiumGeometry, podiumMaterial);
        podium.position.set(0, 0.75, 0);
        podium.width = 2;
        podium.depth = 2;
        this.scene.add(podium);
        this.buildingObstacles.push(podium);
    }

    addLawNPC() {
        const lawNPC = this.createNPC(-2, -6, 0x1a1a2e, // Dark navy NPC for law
            ["Welcome to our law firm!", "We handle the most complex legal cases.", "Do you need legal representation?"]);
        this.scene.add(lawNPC);
        this.buildingObstacles.push(lawNPC);
        this.interactiveNPCs.push(lawNPC);
    }

    addNasdaqNPC() {
        const nasdaqNPC = this.createNPC(3, -8, 0x00ff00, // Green NPC for nasdaq (money/gains)
            ["Welcome to the NASDAQ trading floor!", "We move billions of dollars every second.", "Are you ready to make some trades?"]);
        this.scene.add(nasdaqNPC);
        this.buildingObstacles.push(nasdaqNPC);
        this.interactiveNPCs.push(nasdaqNPC);
    }

    createNPC(x, z, color, dialogue) {
        const npcSpriteWidth = 1.5;
        const npcSpriteHeight = 1.5;
        const npcGeometry = new THREE.PlaneGeometry(npcSpriteWidth, npcSpriteHeight);
        const npcMaterial = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
        const npcMesh = new THREE.Mesh(npcGeometry, npcMaterial);
        
        npcMesh.position.set(x, 0.1, z);
        npcMesh.rotation.x = -Math.PI / 2;

        npcMesh.width = npcSpriteWidth;
        npcMesh.depth = npcSpriteHeight;
        npcMesh.userData = {
            isNPC: true,
            dialogue: dialogue
        };
        
        return npcMesh;
    }

    addPlayerToRoom(roomDepth) {
        // Position player inside the room near the door
        this.position.set(0, 0.1, roomDepth / 2 - 1);
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    addInteriorLighting() {
        // Add ambient lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        
        // Add directional lighting
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight.position.set(0, 10, 5);
        this.scene.add(directionalLight);
    }

    getPosition() {
        return this.position;
    }

    getMesh() {
        return this.mesh;
    }
}
