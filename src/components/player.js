import * as THREE from 'three';
import { NES_PALETTE, ROOM_THEMES, hexToRgba } from '../utils/NESPalette.js';
import { spriteGenerator } from '../utils/SpriteGenerator.js';

export class Player {
    /**
     * Creates a new Player instance.
     * @param {THREE.Scene} scene - The Three.js scene
     * @param {Camera} camera - The game camera
     * @param {Function} onExitBuildingCallback - Callback when player exits a building
     * @param {Function} onEnterBuildingCallback - Callback when player enters a building
     */
    constructor(scene, camera, onExitBuildingCallback, onEnterBuildingCallback) {
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
        this.nearbyNPC = null; // Track NPC player is close to for interaction
        this.onExitBuildingCallback = onExitBuildingCallback;
        this.onEnterBuildingCallback = onEnterBuildingCallback;
        this.lastEnteredBuildingData = {
            position: new THREE.Vector3(-15, 0.1, 14),
            width: 3,
            depth: 3
        }; // Set house data for proper exit (must match world.js createHouse position)
        this.currentRoomDepth = 12; // Store current room depth for exit logic
        
        // Initialize house interior immediately
        this.initializeHouseInterior();
    }

    initializeHouseInterior() {
        // Clear any existing scene objects first with proper disposal
        this.clearScene();

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

        // Reset nearbyNPC at start of collision loop
        this.nearbyNPC = null;

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
                    // Only allow entry from the south (bottom) side of the building
                    const obsDepthVal = obsDepth || 0;
                    const buildingSouthEdge = obstacle.position.z + obsDepthVal / 2;
                    if (moveVector.z < 0 && this.position.z >= buildingSouthEdge) {
                        this.enterBuilding(obstacle);
                        return;
                    }
                }
                break;
            }
        }

        // Separate NPC proximity detection — decoupled from collision order
        if (this.isInBuilding && this.interactiveNPCs) {
            let closestDist = 2.5;
            for (const npc of this.interactiveNPCs) {
                if (!npc.userData || !npc.userData.isNPC) continue;
                const dist = this.position.distanceTo(npc.position);
                if (dist < closestDist) {
                    closestDist = dist;
                    this.nearbyNPC = npc;
                }
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

        // Clear current scene with proper disposal
        this.clearScene();

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

        // Notify game that building was entered (for UI updates like building name display)
        if (this.onEnterBuildingCallback) {
            this.onEnterBuildingCallback(building);
        }
    }

    exitBuilding() {
        console.log("Player: Attempting to exit building...");
        this.isInBuilding = false;

        // Clear interior scene objects with proper disposal
        this.clearScene();
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

            // Use larger offset (1.5) to ensure player clears the building and doesn't
            // immediately collide with nearby structures
            this.position.set(
                buildingPos.x,
                0.1, // Player Y position for flat sprite in main world
                // Position well in front of the building's original Z-face
                buildingPos.z + (buildingDepth / 2) + 1.5
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

    /**
     * Attempts to interact with a nearby NPC when action button is pressed.
     * @returns {boolean} True if interaction started, false otherwise
     */
    interactWithNearbyNPC() {
        if (!this.nearbyNPC || !this.isInBuilding) return false;

        const npc = this.nearbyNPC;
        if (npc.userData && npc.userData.characterId) {
            if (this.game && this.game.dialogueManager && !this.game.dialogueManager.isActive()) {
                this.currentSpeaker = npc;
                this.game.dialogueManager.showCharacterDialogue(
                    npc.userData.characterId,
                    'greeting',
                    () => { this.currentSpeaker = null; }
                );
                return true;
            }
        }
        return false;
    }

    createHouseInterior() {
        const theme = ROOM_THEMES.house;
        this.scene.background = new THREE.Color(theme.background);

        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Create textured wood floor
        const floorTexture = spriteGenerator.generateWoodFloor();
        const floor = this.createTexturedFloor(floorTexture, roomWidth, roomDepth, 2);
        this.scene.add(floor);

        // Add decorative rug in center
        const rug = this.createRug(8, 6, 0, 0);
        this.scene.add(rug);

        // Create textured walls
        const wallTexture = spriteGenerator.generateWoodPanelWall();
        this.createTexturedWalls(roomWidth, roomDepth, wallHeight, wallTexture);

        // Add house furniture with sprites
        this.addHouseFurniture();

        // Add house NPC
        this.addHouseNPC();

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting(0xFFE4C4, 0.7); // Warm bisque light
    }

    createGarageInterior() {
        const theme = ROOM_THEMES.garage;
        this.scene.background = new THREE.Color(theme.background);

        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Concrete floor with oil stains
        const floorTexture = spriteGenerator.generateConcreteFloor();
        const floor = this.createTexturedFloor(floorTexture, roomWidth, roomDepth, 2);
        this.scene.add(floor);

        // Brick walls
        const wallTexture = spriteGenerator.generateBrickWall();
        this.createTexturedWalls(roomWidth, roomDepth, wallHeight, wallTexture);

        // Add garage furniture with sprites
        this.addGarageFurniture();

        // Add garage NPC and items
        this.addGarageNPC();

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting(0xCCCCCC, 0.8); // Cool industrial light
    }

    createVentureInterior() {
        const theme = ROOM_THEMES.venture;
        this.scene.background = new THREE.Color(theme.background);

        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Modern marble-like floor
        const floorTexture = spriteGenerator.generateMarbleFloor();
        const floor = this.createTexturedFloor(floorTexture, roomWidth, roomDepth, 2);
        this.scene.add(floor);

        // Modern walls
        const wallTexture = spriteGenerator.generateOfficeWall();
        this.createTexturedWalls(roomWidth, roomDepth, wallHeight, wallTexture);

        // Add venture furniture
        this.addVentureFurniture();

        // Add venture NPC
        const ventureNPC = this.createNPC(-5, -2, 0x0088ff, 'venture_npc');
        this.scene.add(ventureNPC);
        this.buildingObstacles.push(ventureNPC);
        this.interactiveNPCs.push(ventureNPC);

        // VC Associate
        const vcAssociate = this.createNPC(5, 0, 0x34495E, 'vc_associate');
        this.scene.add(vcAssociate);
        this.buildingObstacles.push(vcAssociate);
        this.interactiveNPCs.push(vcAssociate);

        // Angel Investor
        const angelInvestor = this.createNPC(0, 3, 0xE74C3C, 'angel_investor');
        this.scene.add(angelInvestor);
        this.buildingObstacles.push(angelInvestor);
        this.interactiveNPCs.push(angelInvestor);

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting(0xE6E6FA, 0.8); // Cool lavender light
    }

    addVentureFurniture() {
        // Executive desk
        const deskTexture = spriteGenerator.generateDesk();
        const desk = this.createFurnitureSprite(deskTexture, 2.5, 1.5, 0, 0.1, -3);
        this.addShadow(2.5, 1.5, 0, -3);
        this.scene.add(desk);
        this.buildingObstacles.push(desk);

        // Visitor chairs
        const chairTexture = spriteGenerator.generateChair();
        const chair1 = this.createFurnitureSprite(chairTexture, 1, 1, -1.5, 0.08, -1);
        const chair2 = this.createFurnitureSprite(chairTexture, 1, 1, 1.5, 0.08, -1);
        this.scene.add(chair1);
        this.scene.add(chair2);
        this.buildingObstacles.push(chair1);
        this.buildingObstacles.push(chair2);

        // Couch for waiting area
        const couchTexture = spriteGenerator.generateCouch();
        const couch = this.createFurnitureSprite(couchTexture, 3, 1.5, 4, 0.1, 3);
        this.scene.add(couch);
        this.buildingObstacles.push(couch);

        // Coffee table
        const coffeeTable = this.createFurnitureSprite(deskTexture, 1.5, 0.8, 4, 0.08, 1.5);
        this.scene.add(coffeeTable);

        // Plants
        const plantTexture = spriteGenerator.generatePlant();
        this.scene.add(this.createFurnitureSprite(plantTexture, 0.8, 0.8, -6, 0.1, -4));
        this.scene.add(this.createFurnitureSprite(plantTexture, 0.8, 0.8, 6, 0.1, -4));

        // Wall art
        const pictureTexture = spriteGenerator.generatePictureFrame();
        const art = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5, 1.5),
            new THREE.MeshBasicMaterial({ map: pictureTexture })
        );
        art.position.set(-7.9, 1.8, -2);
        art.rotation.y = Math.PI / 2;
        this.scene.add(art);
    }

    createDataCenterInterior() {
        const theme = ROOM_THEMES.dataCenter;
        this.scene.background = new THREE.Color(theme.background);

        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Tech floor (dark tiles)
        const floorTexture = spriteGenerator.generateOfficeTileFloor();
        const floor = this.createTexturedFloor(floorTexture, roomWidth, roomDepth, 2);
        this.scene.add(floor);

        // Dark tech walls
        this.createWalls(roomWidth, roomDepth, wallHeight, NES_PALETTE.BLUE_DARK);

        // Add data center furniture
        this.addDataCenterFurniture();

        // Add data center NPC
        const dataNPC = this.createNPC(0, 0, 0x00ffff, 'data_center_npc');
        this.scene.add(dataNPC);
        this.buildingObstacles.push(dataNPC);
        this.interactiveNPCs.push(dataNPC);

        // SRE Pat
        const srePat = this.createNPC(0, 3, 0x7F8C8D, 'sre_pat');
        this.scene.add(srePat);
        this.buildingObstacles.push(srePat);
        this.interactiveNPCs.push(srePat);

        // ML Engineer
        const mlEngineer = this.createNPC(0, -4, 0x9B59B6, 'ml_engineer');
        this.scene.add(mlEngineer);
        this.buildingObstacles.push(mlEngineer);
        this.interactiveNPCs.push(mlEngineer);

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting(0x00FFFF, 0.4); // Cyan tech glow
    }

    addDataCenterFurniture() {
        // Server racks in rows
        const serverTexture = spriteGenerator.generateServerRack();

        // Left row
        for (let z = -4; z <= 2; z += 2) {
            const server = this.createFurnitureSprite(serverTexture, 1.2, 1.2, -5, 0.1, z);
            this.scene.add(server);
            this.buildingObstacles.push(server);
        }

        // Right row
        for (let z = -4; z <= 2; z += 2) {
            const server = this.createFurnitureSprite(serverTexture, 1.2, 1.2, 5, 0.1, z);
            this.scene.add(server);
            this.buildingObstacles.push(server);
        }

        // Center monitoring desk
        const deskTexture = spriteGenerator.generateDesk();
        const desk = this.createFurnitureSprite(deskTexture, 2.5, 1.5, 0, 0.1, -2);
        this.addShadow(2.5, 1.5, 0, -2);
        this.scene.add(desk);
        this.buildingObstacles.push(desk);

        // LED glows
        const colors = [0x00FF00, 0x00FFFF, 0xFF6B35];
        for (let i = 0; i < 3; i++) {
            const glow = new THREE.PointLight(colors[i], 0.3, 3);
            glow.position.set(-5, 0.5, -4 + i * 3);
            this.scene.add(glow);

            const glow2 = new THREE.PointLight(colors[i], 0.3, 3);
            glow2.position.set(5, 0.5, -4 + i * 3);
            this.scene.add(glow2);
        }

        // Floor cable management (visual)
        const cableCanvas = document.createElement('canvas');
        cableCanvas.width = 32;
        cableCanvas.height = 64;
        const cctx = cableCanvas.getContext('2d');
        cctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK);
        cctx.fillRect(14, 0, 4, 64);
        // Cable colors
        cctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_MED);
        cctx.fillRect(12, 0, 2, 64);
        cctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_MED);
        cctx.fillRect(18, 0, 2, 64);
        const cableTexture = new THREE.CanvasTexture(cableCanvas);
        cableTexture.magFilter = THREE.NearestFilter;

        const cableTray = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 10),
            new THREE.MeshBasicMaterial({ map: cableTexture, transparent: true })
        );
        cableTray.rotation.x = -Math.PI / 2;
        cableTray.position.set(0, 0.01, -1);
        this.scene.add(cableTray);
    }

    createConferenceInterior() {
        const theme = ROOM_THEMES.conference;
        this.scene.background = new THREE.Color(theme.background);

        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Professional wood floor
        const floorTexture = spriteGenerator.generateWoodFloor();
        const floor = this.createTexturedFloor(floorTexture, roomWidth, roomDepth, 2);
        this.scene.add(floor);

        // Wood panel walls
        const wallTexture = spriteGenerator.generateWoodPanelWall();
        this.createTexturedWalls(roomWidth, roomDepth, wallHeight, wallTexture);

        // Add conference furniture with sprites
        this.addConferenceFurniture();

        // Add conference NPC and items
        this.addConferenceNPC();

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting(0xFFFAF0, 0.8); // Warm professional light
    }

    createLoftInterior() {
        const theme = ROOM_THEMES.loft;
        this.scene.background = new THREE.Color(theme.background);

        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Light wood floor
        const floorTexture = spriteGenerator.generateWoodFloor();
        const floor = this.createTexturedFloor(floorTexture, roomWidth, roomDepth, 2);
        this.scene.add(floor);

        // Cream walls
        const wallTexture = spriteGenerator.generateOfficeWall();
        this.createTexturedWalls(roomWidth, roomDepth, wallHeight, wallTexture);

        // Add loft furniture with sprites
        this.addLoftFurniture();

        // Add loft NPC and items
        this.addLoftNPC();

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting(0xFFF8DC, 0.8); // Warm creative light
    }

    createAcceleratorInterior() {
        const theme = ROOM_THEMES.accelerator;
        this.scene.background = new THREE.Color(theme.background);

        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Modern office tile floor
        const floorTexture = spriteGenerator.generateOfficeTileFloor();
        const floor = this.createTexturedFloor(floorTexture, roomWidth, roomDepth, 2);
        this.scene.add(floor);

        // Office walls
        const wallTexture = spriteGenerator.generateOfficeWall();
        this.createTexturedWalls(roomWidth, roomDepth, wallHeight, wallTexture);

        // Add accelerator furniture with sprites
        this.addAcceleratorFurniture();

        // Add accelerator NPC and items
        this.addAcceleratorNPC();

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting(0xF0F8FF, 0.9); // Cool white office light
    }

    createLawInterior() {
        const theme = ROOM_THEMES.law;
        this.scene.background = new THREE.Color(theme.background);

        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Dark wood floor
        const floorTexture = spriteGenerator.generateWoodFloor();
        const floor = this.createTexturedFloor(floorTexture, roomWidth, roomDepth, 2);
        this.scene.add(floor);

        // Wood panel walls
        const wallTexture = spriteGenerator.generateWoodPanelWall();
        this.createTexturedWalls(roomWidth, roomDepth, wallHeight, wallTexture);

        // Add law furniture
        this.addLawFurniture();

        // Add law NPC
        const lawNPC = this.createNPC(-5, 0, 0x191970, 'law_npc');
        this.scene.add(lawNPC);
        this.buildingObstacles.push(lawNPC);
        this.interactiveNPCs.push(lawNPC);

        // Patent Attorney
        const patentAtty = this.createNPC(5, 0, 0x2C3E50, 'patent_atty');
        this.scene.add(patentAtty);
        this.buildingObstacles.push(patentAtty);
        this.interactiveNPCs.push(patentAtty);

        // Paralegal Lee
        const paralegalLee = this.createNPC(0, 3, 0x16A085, 'paralegal_lee');
        this.scene.add(paralegalLee);
        this.buildingObstacles.push(paralegalLee);
        this.interactiveNPCs.push(paralegalLee);

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting(0xFFF8DC, 0.7); // Warm cornsilk light
    }

    addLawFurniture() {
        // Large desk
        const deskTexture = spriteGenerator.generateDiningTable();
        const desk = this.createFurnitureSprite(deskTexture, 3, 1.8, 0, 0.12, -3);
        this.addShadow(3, 1.8, 0, -3);
        this.scene.add(desk);
        this.buildingObstacles.push(desk);

        // Visitor chairs
        const chairTexture = spriteGenerator.generateChair();
        const chair1 = this.createFurnitureSprite(chairTexture, 1, 1, -1.5, 0.08, -1);
        const chair2 = this.createFurnitureSprite(chairTexture, 1, 1, 1.5, 0.08, -1);
        this.scene.add(chair1);
        this.scene.add(chair2);
        this.buildingObstacles.push(chair1);
        this.buildingObstacles.push(chair2);

        // Bookshelf (legal books)
        const bookshelfTexture = spriteGenerator.generateBookshelf();
        const bookshelf1 = this.createFurnitureSprite(bookshelfTexture, 0.8, 2.5, -7, 0.1, -2);
        const bookshelf2 = this.createFurnitureSprite(bookshelfTexture, 0.8, 2.5, -7, 0.1, 0);
        const bookshelf3 = this.createFurnitureSprite(bookshelfTexture, 0.8, 2.5, -7, 0.1, 2);
        this.scene.add(bookshelf1);
        this.scene.add(bookshelf2);
        this.scene.add(bookshelf3);
        this.buildingObstacles.push(bookshelf1);
        this.buildingObstacles.push(bookshelf2);
        this.buildingObstacles.push(bookshelf3);

        // Rug
        const rug = this.createRug(6, 4, 0, 0);
        this.scene.add(rug);

        // Diploma/certificate on wall
        const certCanvas = document.createElement('canvas');
        certCanvas.width = 32;
        certCanvas.height = 24;
        const cctx = certCanvas.getContext('2d');
        cctx.fillStyle = hexToRgba(NES_PALETTE.GOLD);
        cctx.fillRect(0, 0, 32, 24);
        cctx.fillStyle = hexToRgba(NES_PALETTE.CREAM);
        cctx.fillRect(2, 2, 28, 20);
        cctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_DARK);
        cctx.font = '4px serif';
        cctx.fillText('HARVARD', 6, 10);
        cctx.fillText('LAW', 10, 16);
        const certTexture = new THREE.CanvasTexture(certCanvas);

        const cert = new THREE.Mesh(
            new THREE.PlaneGeometry(1.2, 0.9),
            new THREE.MeshBasicMaterial({ map: certTexture })
        );
        cert.position.set(7.9, 1.8, -2);
        cert.rotation.y = -Math.PI / 2;
        this.scene.add(cert);

        // Lamp
        const lampTexture = spriteGenerator.generateLamp();
        const lamp = this.createFurnitureSprite(lampTexture, 0.5, 0.5, 2, 0.1, -4);
        this.scene.add(lamp);
    }

    createNasdaqInterior() {
        const theme = ROOM_THEMES.nasdaq;
        this.scene.background = new THREE.Color(theme.background);

        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Green financial floor
        const floorTexture = spriteGenerator.generateGreenTileFloor();
        const floor = this.createTexturedFloor(floorTexture, roomWidth, roomDepth, 2);
        this.scene.add(floor);

        // Modern walls
        const wallTexture = spriteGenerator.generateOfficeWall();
        this.createTexturedWalls(roomWidth, roomDepth, wallHeight, wallTexture);

        // Add nasdaq furniture
        this.addNasdaqFurniture();

        // Add nasdaq NPC
        const nasdaqNPC = this.createNPC(-5, 0, 0x00ff00, 'nasdaq_npc');
        this.scene.add(nasdaqNPC);
        this.buildingObstacles.push(nasdaqNPC);
        this.interactiveNPCs.push(nasdaqNPC);

        // IPO Advisor
        const ipoAdvisor = this.createNPC(5, 0, 0x8E44AD, 'ipo_advisor');
        this.scene.add(ipoAdvisor);
        this.buildingObstacles.push(ipoAdvisor);
        this.interactiveNPCs.push(ipoAdvisor);

        // Retail Investor
        const retailInvestor = this.createNPC(0, 3, 0x27AE60, 'retail_investor');
        this.scene.add(retailInvestor);
        this.buildingObstacles.push(retailInvestor);
        this.interactiveNPCs.push(retailInvestor);

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting(0x90EE90, 0.5); // Green financial glow
    }

    addNasdaqFurniture() {
        // Trading desks with monitors
        const deskTexture = spriteGenerator.generateDesk();

        for (let i = 0; i < 4; i++) {
            const x = -4 + (i % 2) * 8;
            const z = -3 + Math.floor(i / 2) * 4;
            const desk = this.createFurnitureSprite(deskTexture, 2, 1.2, x, 0.1, z);
            this.addShadow(2, 1.2, x, z);
            this.scene.add(desk);
            this.buildingObstacles.push(desk);
        }

        // Stock ticker display on back wall
        const tickerCanvas = document.createElement('canvas');
        tickerCanvas.width = 128;
        tickerCanvas.height = 32;
        const tctx = tickerCanvas.getContext('2d');
        tctx.fillStyle = hexToRgba(NES_PALETTE.BLACK);
        tctx.fillRect(0, 0, 128, 32);
        // Stock data
        tctx.font = '10px monospace';
        tctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_LIGHT);
        tctx.fillText('AAPL +2.5%', 4, 12);
        tctx.fillStyle = hexToRgba(NES_PALETTE.RED_LIGHT);
        tctx.fillText('TSLA -1.2%', 68, 12);
        tctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_LIGHT);
        tctx.fillText('MSFT +0.8%', 4, 26);
        tctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_LIGHT);
        tctx.fillText('NVDA +4.1%', 68, 26);
        const tickerTexture = new THREE.CanvasTexture(tickerCanvas);

        const ticker = new THREE.Mesh(
            new THREE.PlaneGeometry(6, 1.5),
            new THREE.MeshBasicMaterial({ map: tickerTexture })
        );
        ticker.position.set(0, 2.2, -5.9);
        this.scene.add(ticker);

        // Green LED glow
        const tickerGlow = new THREE.PointLight(0x00FF00, 0.4, 5);
        tickerGlow.position.set(0, 2, -5);
        this.scene.add(tickerGlow);

        // Bell display (IPO bell)
        const bellCanvas = document.createElement('canvas');
        bellCanvas.width = 24;
        bellCanvas.height = 32;
        const bctx = bellCanvas.getContext('2d');
        // Stand
        bctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
        bctx.fillRect(10, 20, 4, 12);
        // Bell
        bctx.fillStyle = hexToRgba(NES_PALETTE.GOLD);
        bctx.beginPath();
        bctx.arc(12, 12, 10, 0, Math.PI, false);
        bctx.fill();
        bctx.fillRect(2, 12, 20, 8);
        // Highlight
        bctx.fillStyle = hexToRgba(NES_PALETTE.FIRE_YELLOW, 0.5);
        bctx.beginPath();
        bctx.arc(8, 10, 4, 0, Math.PI * 2);
        bctx.fill();
        const bellTexture = new THREE.CanvasTexture(bellCanvas);
        bellTexture.magFilter = THREE.NearestFilter;

        const bell = this.createFurnitureSprite(bellTexture, 1.2, 1.5, 0, 0.1, -4.5);
        this.scene.add(bell);
        this.buildingObstacles.push(bell);

        // Plants
        const plantTexture = spriteGenerator.generatePlant();
        this.scene.add(this.createFurnitureSprite(plantTexture, 0.8, 0.8, -6.5, 0.1, 4));
        this.scene.add(this.createFurnitureSprite(plantTexture, 0.8, 0.8, 6.5, 0.1, 4));
    }

    createBoardRoomInterior() {
        const theme = ROOM_THEMES.boardRoom;
        this.scene.background = new THREE.Color(theme.background);

        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Rich mahogany floor
        const floorTexture = spriteGenerator.generateWoodFloor();
        const floor = this.createTexturedFloor(floorTexture, roomWidth, roomDepth, 2);
        this.scene.add(floor);

        // Executive wood panel walls
        const wallTexture = spriteGenerator.generateWoodPanelWall();
        this.createTexturedWalls(roomWidth, roomDepth, wallHeight, wallTexture);

        // Add board room furniture
        this.addBoardRoomFurniture();

        // Add board room NPC
        this.addBoardRoomNPC();

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting(0xFFD700, 0.5); // Gold executive glow
    }

    addBoardRoomFurniture() {
        // Large executive conference table
        const tableTexture = spriteGenerator.generateDiningTable();
        const table = this.createFurnitureSprite(tableTexture, 8, 3, 0, 0.12, 0);
        this.addShadow(8, 3, 0, 0);
        this.scene.add(table);
        this.buildingObstacles.push(table);

        // Executive leather chairs
        const chairTexture = spriteGenerator.generateChair();
        const chairPositions = [
            [-3, -2], [-1.5, -2], [0, -2], [1.5, -2], [3, -2],
            [-3, 2], [-1.5, 2], [0, 2], [1.5, 2], [3, 2],
            [-4.5, 0], [4.5, 0] // Head chairs
        ];

        chairPositions.forEach(([x, z]) => {
            const chair = this.createFurnitureSprite(chairTexture, 1, 1, x, 0.08, z);
            this.scene.add(chair);
            this.buildingObstacles.push(chair);
        });

        // Persian rug under table
        const rug = this.createRug(10, 5, 0, 0);
        rug.position.y = 0.01;
        this.scene.add(rug);

        // Credenza/sideboard
        const credenzaCanvas = document.createElement('canvas');
        credenzaCanvas.width = 64;
        credenzaCanvas.height = 24;
        const cctx = credenzaCanvas.getContext('2d');
        cctx.fillStyle = hexToRgba(NES_PALETTE.MAHOGANY);
        cctx.fillRect(0, 0, 64, 24);
        cctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
        cctx.fillRect(2, 2, 60, 2);
        // Cabinet doors
        cctx.fillStyle = hexToRgba(NES_PALETTE.LEATHER_MED);
        cctx.fillRect(4, 6, 26, 14);
        cctx.fillRect(34, 6, 26, 14);
        // Handles
        cctx.fillStyle = hexToRgba(NES_PALETTE.GOLD);
        cctx.fillRect(28, 12, 4, 2);
        cctx.fillRect(32, 12, 4, 2);
        const credenzaTexture = new THREE.CanvasTexture(credenzaCanvas);
        credenzaTexture.magFilter = THREE.NearestFilter;

        const credenza = this.createFurnitureSprite(credenzaTexture, 4, 1, 0, 0.1, -5);
        this.scene.add(credenza);
        this.buildingObstacles.push(credenza);

        // Portrait on back wall
        const portraitCanvas = document.createElement('canvas');
        portraitCanvas.width = 32;
        portraitCanvas.height = 40;
        const pctx = portraitCanvas.getContext('2d');
        // Gold frame
        pctx.fillStyle = hexToRgba(NES_PALETTE.GOLD);
        pctx.fillRect(0, 0, 32, 40);
        // Inner
        pctx.fillStyle = hexToRgba(NES_PALETTE.CREAM);
        pctx.fillRect(3, 3, 26, 34);
        // Figure silhouette
        pctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK);
        pctx.beginPath();
        pctx.arc(16, 14, 6, 0, Math.PI * 2);
        pctx.fill();
        pctx.fillRect(10, 22, 12, 14);
        const portraitTexture = new THREE.CanvasTexture(portraitCanvas);

        const portrait = new THREE.Mesh(
            new THREE.PlaneGeometry(1.2, 1.5),
            new THREE.MeshBasicMaterial({ map: portraitTexture })
        );
        portrait.position.set(0, 1.8, -5.9);
        this.scene.add(portrait);

        // Chandelier effect (multiple point lights)
        for (let x = -2; x <= 2; x += 2) {
            const light = new THREE.PointLight(0xFFD700, 0.2, 5);
            light.position.set(x, 2.5, 0);
            this.scene.add(light);
        }
    }

    createGenericInterior() {
        this.scene.background = new THREE.Color(0x333333);
        const roomWidth = 16;
        const roomDepth = 12;
        const wallHeight = 3;

        // Office tile floor
        const floorTexture = spriteGenerator.generateOfficeTileFloor();
        const floor = this.createTexturedFloor(floorTexture, roomWidth, roomDepth, 2);
        this.scene.add(floor);

        // Office walls
        const wallTexture = spriteGenerator.generateOfficeWall();
        this.createTexturedWalls(roomWidth, roomDepth, wallHeight, wallTexture);

        // Basic furniture
        const deskTexture = spriteGenerator.generateDesk();
        const desk = this.createFurnitureSprite(deskTexture, 2, 1.2, 0, 0.1, -3);
        this.addShadow(2, 1.2, 0, -3);
        this.scene.add(desk);
        this.buildingObstacles.push(desk);

        const chairTexture = spriteGenerator.generateChair();
        const chair = this.createFurnitureSprite(chairTexture, 0.8, 0.8, 0, 0.08, -1.5);
        this.scene.add(chair);
        this.buildingObstacles.push(chair);

        // Add generic NPC
        const genericNPC = this.createNPC(-1, 2, 0x888888, 'generic_npc');
        this.scene.add(genericNPC);
        this.buildingObstacles.push(genericNPC);

        this.addPlayerToRoom(roomDepth);
        this.addInteriorLighting(0xFFFFFF, 0.7);
    }

    // ========== SPRITE-BASED RENDERING HELPERS ==========

    /**
     * Creates a sprite-based furniture piece using generated textures.
     * @param {THREE.Texture} texture - The texture to apply
     * @param {number} width - Width in world units
     * @param {number} height - Height in world units (becomes depth when laid flat)
     * @param {number} x - X position
     * @param {number} y - Y position (height above ground)
     * @param {number} z - Z position
     * @returns {THREE.Mesh} The furniture sprite mesh
     */
    createFurnitureSprite(texture, width, height, x, y, z) {
        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });

        const sprite = new THREE.Mesh(geometry, material);
        sprite.rotation.x = -Math.PI / 2; // Lay flat on ground
        sprite.position.set(x, y, z);
        sprite.userData = { width, depth: height };

        return sprite;
    }

    /**
     * Creates a textured floor with tiled pattern.
     * @param {THREE.Texture} texture - The floor texture
     * @param {number} roomWidth - Width of the room
     * @param {number} roomDepth - Depth of the room
     * @param {number} tileSize - Size of each tile (for repeat calculation)
     * @returns {THREE.Mesh} The floor mesh
     */
    createTexturedFloor(texture, roomWidth, roomDepth, tileSize = 2) {
        const clonedTexture = texture.clone();
        clonedTexture.wrapS = THREE.RepeatWrapping;
        clonedTexture.wrapT = THREE.RepeatWrapping;
        clonedTexture.repeat.set(roomWidth / tileSize, roomDepth / tileSize);
        clonedTexture.needsUpdate = true;

        const geometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const material = new THREE.MeshBasicMaterial({ map: clonedTexture });
        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;

        return floor;
    }

    /**
     * Creates a decorative rug on the floor.
     * @param {number} width - Rug width
     * @param {number} depth - Rug depth
     * @param {number} x - X position
     * @param {number} z - Z position
     * @returns {THREE.Mesh} The rug mesh
     */
    createRug(width, depth, x, z) {
        const texture = spriteGenerator.generateRug();
        const geometry = new THREE.PlaneGeometry(width, depth);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        });
        const rug = new THREE.Mesh(geometry, material);
        rug.rotation.x = -Math.PI / 2;
        rug.position.set(x, 0.02, z);
        return rug;
    }

    /**
     * Creates a textured wall segment.
     * @param {THREE.Texture} texture - The wall texture
     * @param {number} width - Wall width
     * @param {number} height - Wall height
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} z - Z position
     * @param {number} rotationY - Rotation around Y axis
     * @returns {THREE.Mesh} The wall mesh
     */
    createTexturedWall(texture, width, height, x, y, z, rotationY = 0) {
        const clonedTexture = texture.clone();
        clonedTexture.wrapS = THREE.RepeatWrapping;
        clonedTexture.wrapT = THREE.RepeatWrapping;
        clonedTexture.repeat.set(width / 2, height / 2);
        clonedTexture.needsUpdate = true;

        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({
            map: clonedTexture,
            side: THREE.DoubleSide
        });
        const wall = new THREE.Mesh(geometry, material);
        wall.position.set(x, y, z);
        wall.rotation.y = rotationY;

        return wall;
    }

    /**
     * Creates walls with textures instead of solid colors.
     * @param {number} roomWidth - Room width
     * @param {number} roomDepth - Room depth
     * @param {number} wallHeight - Wall height
     * @param {THREE.Texture} wallTexture - Texture for walls
     */
    createTexturedWalls(roomWidth, roomDepth, wallHeight, wallTexture) {
        // Back wall
        const backWall = this.createTexturedWall(
            wallTexture, roomWidth, wallHeight,
            0, wallHeight / 2, -roomDepth / 2, 0
        );
        backWall.width = roomWidth;
        backWall.depth = 0.2;
        this.scene.add(backWall);
        this.buildingObstacles.push(backWall);

        // Side walls
        const leftWall = this.createTexturedWall(
            wallTexture, roomDepth, wallHeight,
            -roomWidth / 2, wallHeight / 2, 0, Math.PI / 2
        );
        leftWall.width = 0.2;
        leftWall.depth = roomDepth;
        this.scene.add(leftWall);
        this.buildingObstacles.push(leftWall);

        const rightWall = this.createTexturedWall(
            wallTexture, roomDepth, wallHeight,
            roomWidth / 2, wallHeight / 2, 0, -Math.PI / 2
        );
        rightWall.width = 0.2;
        rightWall.depth = roomDepth;
        this.scene.add(rightWall);
        this.buildingObstacles.push(rightWall);

        // Front walls with doorway (keep as solid color for collision)
        const frontWallPartWidth = (roomWidth / 2) - 1.5;
        const doorMaterial = new THREE.MeshBasicMaterial({ color: NES_PALETTE.WOOD_DARK });

        const frontWallLeft = new THREE.Mesh(
            new THREE.BoxGeometry(frontWallPartWidth, wallHeight, 0.2),
            doorMaterial
        );
        frontWallLeft.position.set(-(frontWallPartWidth / 2) - 1.5, wallHeight / 2, roomDepth / 2);
        frontWallLeft.width = frontWallPartWidth;
        frontWallLeft.depth = 0.2;
        this.scene.add(frontWallLeft);
        this.buildingObstacles.push(frontWallLeft);

        const frontWallRight = new THREE.Mesh(
            new THREE.BoxGeometry(frontWallPartWidth, wallHeight, 0.2),
            doorMaterial
        );
        frontWallRight.position.set((frontWallPartWidth / 2) + 1.5, wallHeight / 2, roomDepth / 2);
        frontWallRight.width = frontWallPartWidth;
        frontWallRight.depth = 0.2;
        this.scene.add(frontWallRight);
        this.buildingObstacles.push(frontWallRight);
    }

    /**
     * Adds a shadow sprite under furniture.
     * @param {number} width - Shadow width
     * @param {number} depth - Shadow depth
     * @param {number} x - X position
     * @param {number} z - Z position
     */
    addShadow(width, depth, x, z) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const geometry = new THREE.PlaneGeometry(width * 1.2, depth * 1.2);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        });
        const shadow = new THREE.Mesh(geometry, material);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.set(x + 0.1, 0.005, z + 0.1);
        this.scene.add(shadow);
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
        // Dining table (sprite-based)
        const tableTexture = spriteGenerator.generateDiningTable();
        const table = this.createFurnitureSprite(tableTexture, 3, 1.5, -3, 0.15, -2);
        this.addShadow(3, 1.5, -3, -2);
        this.scene.add(table);
        this.buildingObstacles.push(table);

        // Chairs around table
        const chairTexture = spriteGenerator.generateChair();

        const chair1 = this.createFurnitureSprite(chairTexture, 1, 1, -3, 0.1, -3.2);
        this.scene.add(chair1);
        this.buildingObstacles.push(chair1);

        const chair2 = this.createFurnitureSprite(chairTexture, 1, 1, -3, 0.1, -0.8);
        this.scene.add(chair2);
        this.buildingObstacles.push(chair2);

        // Bookshelf (sprite on wall)
        const bookshelfTexture = spriteGenerator.generateBookshelf();
        const bookshelf = this.createFurnitureSprite(bookshelfTexture, 0.8, 2, 7, 0.1, -3);
        this.scene.add(bookshelf);
        this.buildingObstacles.push(bookshelf);

        // Fireplace (sprite-based)
        const fireplaceTexture = spriteGenerator.generateFireplace();
        const fireplace = this.createFurnitureSprite(fireplaceTexture, 2.5, 1.2, 0, 0.1, -5.2);
        this.scene.add(fireplace);
        this.buildingObstacles.push(fireplace);

        // Add warm glow near fireplace
        const fireGlow = new THREE.PointLight(0xFF6B35, 0.5, 5);
        fireGlow.position.set(0, 0.5, -5);
        this.scene.add(fireGlow);

        // Couch (sprite-based)
        const couchTexture = spriteGenerator.generateCouch();
        const couch = this.createFurnitureSprite(couchTexture, 3, 1.5, 3, 0.1, 3);
        this.addShadow(3, 1.5, 3, 3);
        this.scene.add(couch);
        this.buildingObstacles.push(couch);

        // Coffee table
        const coffeeTableTexture = spriteGenerator.generateDesk();
        const coffeeTable = this.createFurnitureSprite(coffeeTableTexture, 1.5, 0.8, 3, 0.08, 1.5);
        this.scene.add(coffeeTable);
        this.buildingObstacles.push(coffeeTable);

        // Picture frames on wall
        const pictureTexture = spriteGenerator.generatePictureFrame();
        const picture1 = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({ map: pictureTexture, transparent: true })
        );
        picture1.position.set(-7.9, 1.8, -2);
        picture1.rotation.y = Math.PI / 2;
        this.scene.add(picture1);

        const picture2 = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({ map: pictureTexture, transparent: true })
        );
        picture2.position.set(-7.9, 1.8, 0);
        picture2.rotation.y = Math.PI / 2;
        this.scene.add(picture2);

        // Window on side wall
        const windowTexture = spriteGenerator.generateWindow();
        const windowMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5, 1.5),
            new THREE.MeshBasicMaterial({ map: windowTexture, transparent: true })
        );
        windowMesh.position.set(7.9, 1.5, 0);
        windowMesh.rotation.y = -Math.PI / 2;
        this.scene.add(windowMesh);

        // Lamp in corner
        const lampTexture = spriteGenerator.generateLamp();
        const lamp = this.createFurnitureSprite(lampTexture, 0.5, 0.5, 5.5, 0.1, -4);
        this.scene.add(lamp);

        // Houseplant in corner (sprite-based)
        const plantTexture = spriteGenerator.generatePlant();
        const plant = this.createFurnitureSprite(plantTexture, 1, 1, -6.5, 0.1, 4.5);
        this.scene.add(plant);
        this.buildingObstacles.push(plant);
    }

    addGarageFurniture() {
        // Workbench at back wall (sprite-based)
        const workbenchTexture = spriteGenerator.generateWorkbench();
        const workbench = this.createFurnitureSprite(workbenchTexture, 4, 2, 0, 0.1, -5);
        this.addShadow(4, 2, 0, -5);
        this.scene.add(workbench);
        this.buildingObstacles.push(workbench);

        // Car (sprite-based, non-collidable visual)
        const carTexture = spriteGenerator.generateCar();
        const car = this.createFurnitureSprite(carTexture, 5, 2.5, -3, 0.15, 0);
        this.addShadow(5, 2.5, -3, 0);
        this.scene.add(car);
        // Not added to obstacles - visual only

        // Server rack prototype (sprite-based)
        const serverTexture = spriteGenerator.generateServerRack();
        const server = this.createFurnitureSprite(serverTexture, 1, 1, 5, 0.1, -3);
        this.scene.add(server);
        this.buildingObstacles.push(server);

        // Second server rack
        const server2 = this.createFurnitureSprite(serverTexture, 1, 1, 6.2, 0.1, -3);
        this.scene.add(server2);
        this.buildingObstacles.push(server2);

        // LED glow for servers
        const serverGlow = new THREE.PointLight(0x00FF00, 0.3, 3);
        serverGlow.position.set(5.5, 0.5, -3);
        this.scene.add(serverGlow);

        // Whiteboard/pegboard on wall
        const whiteboardTexture = spriteGenerator.generateWhiteboard();
        const pegboard = new THREE.Mesh(
            new THREE.PlaneGeometry(2.5, 1.5),
            new THREE.MeshBasicMaterial({ map: whiteboardTexture })
        );
        pegboard.position.set(7.9, 1.5, 0);
        pegboard.rotation.y = -Math.PI / 2;
        this.scene.add(pegboard);

        // Toolbox (small red sprite)
        const toolboxCanvas = document.createElement('canvas');
        toolboxCanvas.width = 16;
        toolboxCanvas.height = 16;
        const tctx = toolboxCanvas.getContext('2d');
        tctx.fillStyle = hexToRgba(NES_PALETTE.RED_MED);
        tctx.fillRect(0, 0, 16, 16);
        tctx.fillStyle = hexToRgba(NES_PALETTE.RED_DARK);
        tctx.fillRect(0, 0, 16, 2);
        tctx.fillRect(6, 0, 4, 4);
        const toolboxTexture = new THREE.CanvasTexture(toolboxCanvas);
        toolboxTexture.magFilter = THREE.NearestFilter;

        const toolbox = this.createFurnitureSprite(toolboxTexture, 0.8, 0.6, 1.5, 0.2, -5);
        this.scene.add(toolbox);

        // Garage door texture on back wall
        const garageDoorCanvas = document.createElement('canvas');
        garageDoorCanvas.width = 64;
        garageDoorCanvas.height = 48;
        const gctx = garageDoorCanvas.getContext('2d');
        gctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_STEEL);
        gctx.fillRect(0, 0, 64, 48);
        // Horizontal panel lines
        for (let y = 0; y < 48; y += 12) {
            gctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK);
            gctx.fillRect(0, y, 64, 2);
        }
        // Window panels at top
        gctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_SKY, 0.6);
        for (let x = 8; x < 56; x += 16) {
            gctx.fillRect(x, 4, 12, 8);
        }
        const garageDoorTexture = new THREE.CanvasTexture(garageDoorCanvas);
        garageDoorTexture.magFilter = THREE.NearestFilter;

        const garageDoor = new THREE.Mesh(
            new THREE.PlaneGeometry(4, 2.5),
            new THREE.MeshBasicMaterial({ map: garageDoorTexture })
        );
        garageDoor.position.set(-5, 1.4, -5.9);
        this.scene.add(garageDoor);

        // Fluorescent light fixture
        const lightFixture = new THREE.Mesh(
            new THREE.BoxGeometry(3, 0.1, 0.3),
            new THREE.MeshBasicMaterial({ color: NES_PALETTE.WHITE })
        );
        lightFixture.position.set(0, 2.9, 0);
        this.scene.add(lightFixture);
    }

    addAcceleratorFurniture() {
        // Hot desks in rows (sprite-based)
        const deskTexture = spriteGenerator.generateDesk();
        for (let i = 0; i < 6; i++) {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const deskX = -3 + col * 2.5;
            const deskZ = -2 + row * 2.5;

            const desk = this.createFurnitureSprite(deskTexture, 1.5, 1, deskX, 0.1, deskZ);
            this.addShadow(1.5, 1, deskX, deskZ);
            this.scene.add(desk);
            this.buildingObstacles.push(desk);
        }

        // Large whiteboard on back wall
        const whiteboardTexture = spriteGenerator.generateWhiteboard();
        const whiteboard = new THREE.Mesh(
            new THREE.PlaneGeometry(4, 2.5),
            new THREE.MeshBasicMaterial({ map: whiteboardTexture })
        );
        whiteboard.position.set(0, 1.5, -5.9);
        this.scene.add(whiteboard);

        // Beanbag chairs (sprite-based)
        const beanbagTexture = spriteGenerator.generateBeanbag();
        const beanbag1 = this.createFurnitureSprite(beanbagTexture, 1.2, 1.2, -5, 0.1, 4);
        this.scene.add(beanbag1);
        this.buildingObstacles.push(beanbag1);

        // Blue beanbag (custom color)
        const blueBeanbagCanvas = document.createElement('canvas');
        blueBeanbagCanvas.width = 24;
        blueBeanbagCanvas.height = 24;
        const bbctx = blueBeanbagCanvas.getContext('2d');
        // Shadow
        bbctx.fillStyle = 'rgba(0,0,0,0.3)';
        bbctx.beginPath();
        bbctx.arc(14, 14, 10, 0, Math.PI * 2);
        bbctx.fill();
        // Body
        bbctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_MED);
        bbctx.beginPath();
        bbctx.arc(12, 12, 10, 0, Math.PI * 2);
        bbctx.fill();
        // Highlight
        bbctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_LIGHT, 0.5);
        bbctx.beginPath();
        bbctx.ellipse(10, 10, 5, 4, -0.5, 0, Math.PI * 2);
        bbctx.fill();
        const blueBeanbagTexture = new THREE.CanvasTexture(blueBeanbagCanvas);
        blueBeanbagTexture.magFilter = THREE.NearestFilter;

        const beanbag2 = this.createFurnitureSprite(blueBeanbagTexture, 1.2, 1.2, -3.5, 0.1, 4.5);
        this.scene.add(beanbag2);
        this.buildingObstacles.push(beanbag2);

        // Water cooler
        const coolerCanvas = document.createElement('canvas');
        coolerCanvas.width = 16;
        coolerCanvas.height = 24;
        const cctx = coolerCanvas.getContext('2d');
        // Base
        cctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_STEEL);
        cctx.fillRect(2, 12, 12, 12);
        // Bottle
        cctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_LIGHT, 0.7);
        cctx.fillRect(4, 0, 8, 14);
        cctx.fillStyle = hexToRgba(NES_PALETTE.WHITE, 0.3);
        cctx.fillRect(5, 2, 2, 6);
        const coolerTexture = new THREE.CanvasTexture(coolerCanvas);
        coolerTexture.magFilter = THREE.NearestFilter;

        const cooler = this.createFurnitureSprite(coolerTexture, 0.8, 1, 6, 0.1, 4);
        this.scene.add(cooler);
        this.buildingObstacles.push(cooler);

        // Startup posters on walls (YC style)
        const posterCanvas = document.createElement('canvas');
        posterCanvas.width = 32;
        posterCanvas.height = 24;
        const pctx = posterCanvas.getContext('2d');
        // Orange YC-style poster
        pctx.fillStyle = hexToRgba(NES_PALETTE.FIRE_ORANGE);
        pctx.fillRect(0, 0, 32, 24);
        pctx.fillStyle = hexToRgba(NES_PALETTE.WHITE);
        pctx.font = 'bold 12px sans-serif';
        pctx.fillText('YC', 8, 16);
        const posterTexture = new THREE.CanvasTexture(posterCanvas);

        const poster1 = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5, 1),
            new THREE.MeshBasicMaterial({ map: posterTexture })
        );
        poster1.position.set(-7.9, 1.8, 0);
        poster1.rotation.y = Math.PI / 2;
        this.scene.add(poster1);

        // Motivational poster
        const motivePosterCanvas = document.createElement('canvas');
        motivePosterCanvas.width = 32;
        motivePosterCanvas.height = 24;
        const mctx = motivePosterCanvas.getContext('2d');
        mctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_MED);
        mctx.fillRect(0, 0, 32, 24);
        mctx.fillStyle = hexToRgba(NES_PALETTE.WHITE);
        mctx.font = '6px sans-serif';
        mctx.fillText('SHIP IT', 4, 14);
        const motiveTexture = new THREE.CanvasTexture(motivePosterCanvas);

        const poster2 = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5, 1),
            new THREE.MeshBasicMaterial({ map: motiveTexture })
        );
        poster2.position.set(7.9, 1.8, 2);
        poster2.rotation.y = -Math.PI / 2;
        this.scene.add(poster2);

        // Plants for atmosphere
        const plantTexture = spriteGenerator.generatePlant();
        const plant1 = this.createFurnitureSprite(plantTexture, 0.8, 0.8, 6.5, 0.1, -4);
        this.scene.add(plant1);

        const plant2 = this.createFurnitureSprite(plantTexture, 0.8, 0.8, -6.5, 0.1, -4);
        this.scene.add(plant2);
    }

    addLoftFurniture() {
        // Drafting table (sprite-based)
        const deskTexture = spriteGenerator.generateDesk();
        const draftTable = this.createFurnitureSprite(deskTexture, 2, 1.2, -4, 0.1, -2);
        this.addShadow(2, 1.2, -4, -2);
        this.scene.add(draftTable);
        this.buildingObstacles.push(draftTable);

        // Art easel (custom sprite)
        const easelCanvas = document.createElement('canvas');
        easelCanvas.width = 24;
        easelCanvas.height = 32;
        const ectx = easelCanvas.getContext('2d');
        // Easel legs
        ectx.fillStyle = hexToRgba(NES_PALETTE.WOOD_MED);
        ectx.fillRect(4, 16, 3, 16);
        ectx.fillRect(17, 16, 3, 16);
        ectx.fillRect(10, 20, 4, 12);
        // Canvas
        ectx.fillStyle = hexToRgba(NES_PALETTE.CREAM);
        ectx.fillRect(2, 0, 20, 18);
        // Frame
        ectx.strokeStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
        ectx.lineWidth = 2;
        ectx.strokeRect(2, 0, 20, 18);
        // Art scribbles
        ectx.fillStyle = hexToRgba(NES_PALETTE.BLUE_MED);
        ectx.fillRect(6, 4, 5, 5);
        ectx.fillStyle = hexToRgba(NES_PALETTE.RED_MED);
        ectx.beginPath();
        ectx.arc(15, 10, 4, 0, Math.PI * 2);
        ectx.fill();
        const easelTexture = new THREE.CanvasTexture(easelCanvas);
        easelTexture.magFilter = THREE.NearestFilter;

        const easel = this.createFurnitureSprite(easelTexture, 1.2, 1.5, 4, 0.1, -1);
        this.scene.add(easel);
        this.buildingObstacles.push(easel);

        // Blue couch (L-shape) - sprite based, moved away from entrance
        const couchTexture = spriteGenerator.generateCouch();
        const couchPart1 = this.createFurnitureSprite(couchTexture, 3.5, 1.5, 0, 0.1, 1);
        this.addShadow(3.5, 1.5, 0, 1);
        this.scene.add(couchPart1);
        this.buildingObstacles.push(couchPart1);

        // L-extension
        const couchPart2 = this.createFurnitureSprite(couchTexture, 1.2, 2, -2.5, 0.1, 0);
        couchPart2.rotation.z = Math.PI / 2;
        this.scene.add(couchPart2);
        this.buildingObstacles.push(couchPart2);

        // Kitchen island
        const islandCanvas = document.createElement('canvas');
        islandCanvas.width = 48;
        islandCanvas.height = 32;
        const ictx = islandCanvas.getContext('2d');
        // Shadow
        ictx.fillStyle = 'rgba(0,0,0,0.3)';
        ictx.fillRect(4, 4, 44, 28);
        // Counter
        ictx.fillStyle = hexToRgba(NES_PALETTE.GRAY_STEEL);
        ictx.fillRect(0, 0, 44, 28);
        // Top surface
        ictx.fillStyle = hexToRgba(NES_PALETTE.WHITE);
        ictx.fillRect(2, 2, 40, 24);
        // Cabinet lines
        ictx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK);
        ictx.fillRect(20, 4, 2, 20);
        const islandTexture = new THREE.CanvasTexture(islandCanvas);
        islandTexture.magFilter = THREE.NearestFilter;

        const island = this.createFurnitureSprite(islandTexture, 2.5, 1.5, -5, 0.1, 2);
        this.addShadow(2.5, 1.5, -5, 2);
        this.scene.add(island);
        this.buildingObstacles.push(island);

        // Bar stools around island
        const stoolCanvas = document.createElement('canvas');
        stoolCanvas.width = 16;
        stoolCanvas.height = 16;
        const sctx = stoolCanvas.getContext('2d');
        sctx.fillStyle = 'rgba(0,0,0,0.3)';
        sctx.beginPath();
        sctx.arc(9, 9, 6, 0, Math.PI * 2);
        sctx.fill();
        sctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK);
        sctx.beginPath();
        sctx.arc(8, 8, 6, 0, Math.PI * 2);
        sctx.fill();
        sctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_STEEL, 0.5);
        sctx.beginPath();
        sctx.arc(6, 6, 3, 0, Math.PI * 2);
        sctx.fill();
        const stoolTexture = new THREE.CanvasTexture(stoolCanvas);
        stoolTexture.magFilter = THREE.NearestFilter;

        const stoolPositions = [[-5.8, 0.8], [-4.2, 0.8], [-5.8, 3.2], [-4.2, 3.2]];
        stoolPositions.forEach(([x, z]) => {
            const stool = this.createFurnitureSprite(stoolTexture, 0.6, 0.6, x, 0.08, z);
            this.scene.add(stool);
            this.buildingObstacles.push(stool);
        });

        // Window
        const windowTexture = spriteGenerator.generateWindow();
        const windowMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.MeshBasicMaterial({ map: windowTexture })
        );
        windowMesh.position.set(7.9, 1.5, -2);
        windowMesh.rotation.y = -Math.PI / 2;
        this.scene.add(windowMesh);

        // Plants
        const plantTexture = spriteGenerator.generatePlant();
        const plant = this.createFurnitureSprite(plantTexture, 0.8, 0.8, 6, 0.1, -4);
        this.scene.add(plant);
    }

    addConferenceFurniture() {
        // Long conference table (sprite-based)
        const tableTexture = spriteGenerator.generateDiningTable();
        const confTable = this.createFurnitureSprite(tableTexture, 6, 2, 0, 0.12, 0);
        this.addShadow(6, 2, 0, 0);
        this.scene.add(confTable);
        this.buildingObstacles.push(confTable);

        // Executive chairs around table (sprite-based)
        const chairTexture = spriteGenerator.generateChair();
        const chairPositions = [
            [-2.5, -1.5], [-1, -1.5], [0.5, -1.5], [2, -1.5],
            [-2.5, 1.5], [-1, 1.5], [0.5, 1.5], [2, 1.5]
        ];

        chairPositions.forEach(([x, z]) => {
            const chair = this.createFurnitureSprite(chairTexture, 0.8, 0.8, x, 0.08, z);
            this.scene.add(chair);
            this.buildingObstacles.push(chair);
        });

        // Projector screen on wall
        const screenCanvas = document.createElement('canvas');
        screenCanvas.width = 64;
        screenCanvas.height = 48;
        const sctx = screenCanvas.getContext('2d');
        // Screen white
        sctx.fillStyle = hexToRgba(NES_PALETTE.WHITE);
        sctx.fillRect(0, 0, 64, 48);
        // Frame
        sctx.strokeStyle = hexToRgba(NES_PALETTE.GRAY_DARK);
        sctx.lineWidth = 2;
        sctx.strokeRect(1, 1, 62, 46);
        // Presentation content
        sctx.fillStyle = hexToRgba(NES_PALETTE.BLUE_MED);
        sctx.font = '8px sans-serif';
        sctx.fillText('Q4 PLAN', 10, 15);
        // Chart
        sctx.fillStyle = hexToRgba(NES_PALETTE.GREEN_MED);
        sctx.fillRect(10, 20, 8, 20);
        sctx.fillRect(22, 25, 8, 15);
        sctx.fillRect(34, 18, 8, 22);
        sctx.fillRect(46, 22, 8, 18);
        const screenTexture = new THREE.CanvasTexture(screenCanvas);

        const screen = new THREE.Mesh(
            new THREE.PlaneGeometry(4, 2.5),
            new THREE.MeshBasicMaterial({ map: screenTexture })
        );
        screen.position.set(0, 1.5, -5.9);
        this.scene.add(screen);

        // Podium at front
        const podiumCanvas = document.createElement('canvas');
        podiumCanvas.width = 24;
        podiumCanvas.height = 32;
        const pctx = podiumCanvas.getContext('2d');
        pctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_DARK);
        pctx.fillRect(2, 0, 20, 32);
        pctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_MED);
        pctx.fillRect(4, 2, 16, 28);
        // Logo placeholder
        pctx.fillStyle = hexToRgba(NES_PALETTE.GOLD);
        pctx.fillRect(8, 12, 8, 8);
        const podiumTexture = new THREE.CanvasTexture(podiumCanvas);
        podiumTexture.magFilter = THREE.NearestFilter;

        const podium = this.createFurnitureSprite(podiumTexture, 1, 1.2, 0, 0.1, -4);
        this.scene.add(podium);
        this.buildingObstacles.push(podium);

        // Coffee station
        const coffeeCanvas = document.createElement('canvas');
        coffeeCanvas.width = 32;
        coffeeCanvas.height = 24;
        const cctx = coffeeCanvas.getContext('2d');
        cctx.fillStyle = hexToRgba(NES_PALETTE.WOOD_MED);
        cctx.fillRect(0, 0, 32, 24);
        // Coffee maker
        cctx.fillStyle = hexToRgba(NES_PALETTE.GRAY_DARK);
        cctx.fillRect(4, 4, 10, 12);
        // Cups
        cctx.fillStyle = hexToRgba(NES_PALETTE.WHITE);
        cctx.fillRect(18, 8, 4, 6);
        cctx.fillRect(24, 8, 4, 6);
        const coffeeTexture = new THREE.CanvasTexture(coffeeCanvas);
        coffeeTexture.magFilter = THREE.NearestFilter;

        const coffeeStation = this.createFurnitureSprite(coffeeTexture, 1.5, 1, 6, 0.1, 4);
        this.scene.add(coffeeStation);
        this.buildingObstacles.push(coffeeStation);

        // Picture frames
        const pictureTexture = spriteGenerator.generatePictureFrame();
        const picture = new THREE.Mesh(
            new THREE.PlaneGeometry(1.2, 1.2),
            new THREE.MeshBasicMaterial({ map: pictureTexture })
        );
        picture.position.set(-7.9, 1.8, 0);
        picture.rotation.y = Math.PI / 2;
        this.scene.add(picture);
    }

    addHouseNPC() {
        // Create house NPC
        const houseNPC = this.createNPC(-5, 0, 0xff6b6b, 'sam');
        this.scene.add(houseNPC);
        this.buildingObstacles.push(houseNPC);
        this.interactiveNPCs.push(houseNPC);

        // Priya the Researcher
        const priya = this.createNPC(5, 0, 0x9B59B6, 'priya');
        this.scene.add(priya);
        this.buildingObstacles.push(priya);
        this.interactiveNPCs.push(priya);

        // Old Timer
        const oldTimer = this.createNPC(0, 3, 0x808080, 'old_timer');
        this.scene.add(oldTimer);
        this.buildingObstacles.push(oldTimer);
        this.interactiveNPCs.push(oldTimer);

        // Add MacBook and iPhone items
        this.addHouseItems();
    }

    addGarageNPC() {
        // Create garage NPC
        const garageNPC = this.createNPC(-5, 0, 0x2C3E50, 'alex');
        this.scene.add(garageNPC);
        this.buildingObstacles.push(garageNPC);
        this.interactiveNPCs.push(garageNPC);

        // DevOps Dani
        const devopsDani = this.createNPC(5, 2, 0xE67E22, 'devops_dani');
        this.scene.add(devopsDani);
        this.buildingObstacles.push(devopsDani);
        this.interactiveNPCs.push(devopsDani);

        // Intern
        const intern = this.createNPC(0, 3, 0x3498DB, 'garage_intern');
        this.scene.add(intern);
        this.buildingObstacles.push(intern);
        this.interactiveNPCs.push(intern);

        // Add garage items
        this.addGarageItems();
    }

    addAcceleratorNPC() {
        // Create accelerator NPC
        const acceleratorNPC = this.createNPC(-5, 0, 0x34495E, 'jordan');
        this.scene.add(acceleratorNPC);
        this.buildingObstacles.push(acceleratorNPC);
        this.interactiveNPCs.push(acceleratorNPC);

        // Demo Coach
        const demoCoach = this.createNPC(5, 0, 0xF39C12, 'demo_coach');
        this.scene.add(demoCoach);
        this.buildingObstacles.push(demoCoach);
        this.interactiveNPCs.push(demoCoach);

        // Fellow Founder
        const fellowFounder = this.createNPC(0, 3, 0x1ABC9C, 'fellow_founder');
        this.scene.add(fellowFounder);
        this.buildingObstacles.push(fellowFounder);
        this.interactiveNPCs.push(fellowFounder);

        // Add accelerator items
        this.addAcceleratorItems();
    }

    addLoftNPC() {
        // Create loft NPC
        const loftNPC = this.createNPC(-5, 0, 0xE74C3C, 'casey');
        this.scene.add(loftNPC);
        this.buildingObstacles.push(loftNPC);
        this.interactiveNPCs.push(loftNPC);

        // Recruiter Riya
        const recruiterRiya = this.createNPC(5, 0, 0x8E44AD, 'recruiter_riya');
        this.scene.add(recruiterRiya);
        this.buildingObstacles.push(recruiterRiya);
        this.interactiveNPCs.push(recruiterRiya);

        // Designer Kai
        const designerKai = this.createNPC(0, 3, 0x2ECC71, 'designer_kai');
        this.scene.add(designerKai);
        this.buildingObstacles.push(designerKai);
        this.interactiveNPCs.push(designerKai);

        // Add loft items
        this.addLoftItems();
    }

    addConferenceNPC() {
        // Create conference NPC
        const conferenceNPC = this.createNPC(-5, 3, 0x16A085, 'morgan');
        this.scene.add(conferenceNPC);
        this.buildingObstacles.push(conferenceNPC);
        this.interactiveNPCs.push(conferenceNPC);

        // Growth Hacker
        const growthHacker = this.createNPC(5, 3, 0xD35400, 'growth_hacker');
        this.scene.add(growthHacker);
        this.buildingObstacles.push(growthHacker);
        this.interactiveNPCs.push(growthHacker);

        // Journalist Zoe
        const journalistZoe = this.createNPC(0, -4, 0xC0392B, 'journalist_zoe');
        this.scene.add(journalistZoe);
        this.buildingObstacles.push(journalistZoe);
        this.interactiveNPCs.push(journalistZoe);

        // Add conference items
        this.addConferenceItems();
    }

    addBoardRoomNPC() {
        // Create board room NPC
        const boardRoomNPC = this.createNPC(-5, 0, 0x8b4513, 'board_room_npc');
        this.scene.add(boardRoomNPC);
        this.buildingObstacles.push(boardRoomNPC);
        this.interactiveNPCs.push(boardRoomNPC);

        // CFO Diana
        const cfoDiana = this.createNPC(5, 0, 0xF1C40F, 'cfo_diana');
        this.scene.add(cfoDiana);
        this.buildingObstacles.push(cfoDiana);
        this.interactiveNPCs.push(cfoDiana);

        // PR Advisor
        const prAdvisor = this.createNPC(0, 3, 0xBDC3C7, 'pr_advisor');
        this.scene.add(prAdvisor);
        this.buildingObstacles.push(prAdvisor);
        this.interactiveNPCs.push(prAdvisor);
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
        const whiteboardTexture = spriteGenerator.generateItemSprite('whiteboard');

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
        const notesTexture = spriteGenerator.generateItemSprite('interview-notes');

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
        // Mechanical Keyboard
        const keyboardTexture = spriteGenerator.generateItemSprite('keyboard');
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
        const drinkTexture = spriteGenerator.generateItemSprite('energy-drink');
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
        const stickersTexture = spriteGenerator.generateItemSprite('github-stickers');
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
        const usbTexture = spriteGenerator.generateItemSprite('mvp-usb');
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
        const noteTexture = spriteGenerator.generateItemSprite('tech-debt-note');
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
        // Pitch Deck
        const pitchTexture = spriteGenerator.generateItemSprite('pitch-deck');
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
        const termTexture = spriteGenerator.generateItemSprite('term-sheet');
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
        const cardTexture = spriteGenerator.generateItemSprite('business-card');
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
        const ycTexture = spriteGenerator.generateItemSprite('yc-letter');
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
        const capTexture = spriteGenerator.generateItemSprite('cap-table');
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
        // Employee Handbook
        const handbookTexture = spriteGenerator.generateItemSprite('handbook');
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
        const photoTexture = spriteGenerator.generateItemSprite('team-photo');
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
        const stockTexture = spriteGenerator.generateItemSprite('stock-options');
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
        const paddleTexture = spriteGenerator.generateItemSprite('ping-pong-paddle');
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
        // Growth Playbook
        const playbookTexture = spriteGenerator.generateItemSprite('growth-playbook');
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
        const analyticsTexture = spriteGenerator.generateItemSprite('analytics-dashboard');
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
        const trophyTexture = spriteGenerator.generateItemSprite('product-hunt-trophy');
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
        const budgetTexture = spriteGenerator.generateItemSprite('ad-budget');
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

        // Generate character sprite procedurally
        const spriteTexture = spriteGenerator.generateNPCSprite(spriteName);

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

    /**
     * Adds atmospheric interior lighting.
     * @param {number} color - Light color (hex)
     * @param {number} intensity - Light intensity (0-1)
     */
    addInteriorLighting(color = 0xffffff, intensity = 0.6) {
        // Add ambient lighting for interior with room-specific color
        const ambientLight = new THREE.AmbientLight(color, intensity);
        this.scene.add(ambientLight);

        // Add a point light for more dramatic lighting
        const pointLight = new THREE.PointLight(0xffffff, 0.6, 20);
        pointLight.position.set(0, 5, 0);
        this.scene.add(pointLight);

        // Add subtle secondary lights at corners for depth
        const cornerIntensity = intensity * 0.3;
        const corners = [[-6, 2, -4], [6, 2, -4], [-6, 2, 4], [6, 2, 4]];
        corners.forEach(([x, y, z]) => {
            const cornerLight = new THREE.PointLight(color, cornerIntensity, 8);
            cornerLight.position.set(x, y, z);
            this.scene.add(cornerLight);
        });
    }

    /**
     * Disposes of a Three.js object and its children, freeing GPU memory.
     * @param {THREE.Object3D} object - The object to dispose
     */
    disposeObject(object) {
        if (!object) return;

        // Recursively dispose children first
        if (object.children && object.children.length > 0) {
            // Clone children array since we're modifying it
            const children = [...object.children];
            children.forEach(child => this.disposeObject(child));
        }

        // Dispose geometry
        if (object.geometry) {
            object.geometry.dispose();
        }

        // Dispose material(s)
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(material => this.disposeMaterial(material));
            } else {
                this.disposeMaterial(object.material);
            }
        }
    }

    /**
     * Disposes of a material and its textures.
     * @param {THREE.Material} material - The material to dispose
     */
    disposeMaterial(material) {
        if (!material) return;

        // Dispose all texture properties
        const textureProperties = [
            'map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap',
            'envMap', 'alphaMap', 'aoMap', 'displacementMap',
            'emissiveMap', 'gradientMap', 'metalnessMap', 'roughnessMap'
        ];

        textureProperties.forEach(prop => {
            if (material[prop]) {
                material[prop].dispose();
            }
        });

        material.dispose();
    }

    /**
     * Clears the scene and properly disposes all objects to prevent memory leaks.
     */
    clearScene() {
        // Clone children array since we're modifying it during iteration
        const children = [...this.scene.children];

        children.forEach(child => {
            // Don't dispose the player mesh - we keep it
            if (child !== this.mesh) {
                this.disposeObject(child);
                this.scene.remove(child);
            }
        });
    }

    /**
     * Cleans up resources when the Player is being destroyed.
     * Call this before removing the Player instance.
     */
    dispose() {
        // Dispose player textures
        Object.values(this.textures).forEach(texture => {
            if (texture) texture.dispose();
        });

        // Dispose player mesh
        this.disposeObject(this.mesh);

        // Clear arrays
        this.buildingObstacles = [];
        this.interactiveNPCs = [];
    }

    // Getter methods required by Game class
    getMesh() {
        return this.mesh;
    }

    getPosition() {
        return this.position;
    }
}
