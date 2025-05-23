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
            const roomDepth = 12; // Must match roomDepth in enterBuilding
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
        } else if (buildingType === 'ycomb') {
            this.createYCombInterior();
        } else if (buildingType === 'venture') {
            this.createVentureInterior();
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

    createYCombInterior() {
        // Set YComb-specific background (startup/tech atmosphere)
        this.scene.background = new THREE.Color(0x1a1a2e); // Dark blue-purple

        const roomWidth = 20; // Large open office space
        const roomDepth = 16; 
        const wallHeight = 3.5;

        // Create modern tech floor
        const techFloorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const techFloorMaterial = new THREE.MeshBasicMaterial({ color: 0x2c2c54 }); // Dark purple-blue
        const techFloor = new THREE.Mesh(techFloorGeometry, techFloorMaterial);
        techFloor.rotation.x = -Math.PI / 2;
        this.scene.add(techFloor);

        // Add carpet areas for different zones
        const carpetGeometry = new THREE.PlaneGeometry(8, 6);
        const carpetMaterial = new THREE.MeshBasicMaterial({ color: 0xff6b35 }); // Orange accent
        const carpet = new THREE.Mesh(carpetGeometry, carpetMaterial);
        carpet.rotation.x = -Math.PI / 2;
        carpet.position.set(-4, 0.01, -3);
        this.scene.add(carpet);

        this.createWalls(roomWidth, roomDepth, wallHeight, 0x4a4a4a); // Dark grey walls

        // Add YComb office furniture
        this.addYCombFurniture();

        // Add YComb NPC
        this.addYCombNPC();

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

    addYCombNPC() {
        const ycombNPC = this.createNPC(2, -6, 0xff6b35, // Orange NPC for YComb
            ["Welcome to Y Combinator!", "We're looking for the next big startup.", "Do you have a disruptive idea?"]);
        this.scene.add(ycombNPC);
        this.buildingObstacles.push(ycombNPC);
        this.interactiveNPCs.push(ycombNPC);
    }

    addVentureNPC() {
        const ventureNPC = this.createNPC(-3, -7, 0x2f4f2f, // Dark green NPC for Venture
            ["Greetings, entrepreneur.", "We invest in promising ventures.", "What's your business model and growth strategy?"]);
        this.scene.add(ventureNPC);
        this.buildingObstacles.push(ventureNPC);
        this.interactiveNPCs.push(ventureNPC);
    }

    addYCombFurniture() {
        // Conference table with chairs (startup meeting setup)
        const conferenceTableGeometry = new THREE.BoxGeometry(6, 0.6, 2.5);
        const conferenceTableMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 }); // Dark modern table
        const conferenceTable = new THREE.Mesh(conferenceTableGeometry, conferenceTableMaterial);
        conferenceTable.position.set(-4, 0.3, -3);
        conferenceTable.width = 6; 
        conferenceTable.depth = 2.5;
        this.scene.add(conferenceTable);
        this.buildingObstacles.push(conferenceTable);

        // Modern chairs around conference table
        const modernChairGeometry = new THREE.BoxGeometry(0.6, 1, 0.6);
        const modernChairMaterial = new THREE.MeshBasicMaterial({ color: 0xff6b35 }); // Orange chairs

        // Add chairs around the table
        for (let i = 0; i < 6; i++) {
            const chair = new THREE.Mesh(modernChairGeometry, modernChairMaterial);
            const angle = (i / 6) * Math.PI * 2;
            chair.position.set(-4 + Math.cos(angle) * 2, 0.5, -3 + Math.sin(angle) * 1.8);
            chair.width = 0.6; 
            chair.depth = 0.6;
            this.scene.add(chair);
            this.buildingObstacles.push(chair);
        }

        // Standing desks
        const standingDeskGeometry = new THREE.BoxGeometry(2, 1.2, 1);
        const standingDeskMaterial = new THREE.MeshBasicMaterial({ color: 0x2c2c54 });
        
        const desk1 = new THREE.Mesh(standingDeskGeometry, standingDeskMaterial);
        desk1.position.set(6, 0.6, -5);
        desk1.width = 2; 
        desk1.depth = 1;
        this.scene.add(desk1);
        this.buildingObstacles.push(desk1);

        const desk2 = new THREE.Mesh(standingDeskGeometry, standingDeskMaterial);
        desk2.position.set(6, 0.6, -2);
        desk2.width = 2; 
        desk2.depth = 1;
        this.scene.add(desk2);
        this.buildingObstacles.push(desk2);

        // Whiteboard
        const whiteboardGeometry = new THREE.BoxGeometry(0.1, 2, 3);
        const whiteboardMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const whiteboard = new THREE.Mesh(whiteboardGeometry, whiteboardMaterial);
        whiteboard.position.set(-9.9, 1, -4);
        whiteboard.width = 0.1; 
        whiteboard.depth = 3;
        this.scene.add(whiteboard);
        this.buildingObstacles.push(whiteboard);

        // Server rack (tech startup essential)
        const serverRackGeometry = new THREE.BoxGeometry(0.8, 2, 1.2);
        const serverRackMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const serverRack = new THREE.Mesh(serverRackGeometry, serverRackMaterial);
        serverRack.position.set(8, 1, 5);
        serverRack.width = 0.8; 
        serverRack.depth = 1.2;
        this.scene.add(serverRack);
        this.buildingObstacles.push(serverRack);
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
