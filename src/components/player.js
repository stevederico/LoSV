import * as THREE from 'three';

export class Player {
    constructor(scene, camera, onExitBuildingCallback) {
        this.scene = scene;
        this.camera = camera;
        this.speed = 0.1;
        this.position = new THREE.Vector3(0, 0.1, 0); // Adjusted Y position for flat sprite
        this.direction = 'down'; // down, up, left, right
        this.isMoving = false;

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

        // Clear current scene
        while (this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }

        // Set a neutral background, or keep the red one if preferred
        this.scene.background = new THREE.Color(0x3d291e); // Dark brown, similar to image shadows

        const roomWidth = 16;
        const roomDepth = 12; // Used for door plane calculation
        const wallHeight = 3;

        // Floor
        // Wooden floor base
        const woodFloorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const woodFloorMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 }); // Brown for wood
        const woodFloor = new THREE.Mesh(woodFloorGeometry, woodFloorMaterial);
        woodFloor.rotation.x = -Math.PI / 2;
        this.scene.add(woodFloor);

        // Green carpet
        const carpetWidth = roomWidth * 0.6;
        const carpetDepth = roomDepth * 0.8;
        const carpetGeometry = new THREE.PlaneGeometry(carpetWidth, carpetDepth);
        const carpetMaterial = new THREE.MeshBasicMaterial({ color: 0x2a572a }); // Darker green
        const carpet = new THREE.Mesh(carpetGeometry, carpetMaterial);
        carpet.rotation.x = -Math.PI / 2;
        carpet.position.y = 0.01; // Slightly above wood floor
        this.scene.add(carpet);

        // Walls - similar to image
        const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x8c6c46 }); // Lighter brown/tan for walls

        // Back wall
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(roomWidth, wallHeight, 0.2), wallMaterial);
        backWall.position.set(0, wallHeight / 2, -roomDepth / 2);
        backWall.width = roomWidth; backWall.depth = 0.2; // For collision
        this.scene.add(backWall); this.buildingObstacles.push(backWall);

        // Front wall (with assumed doorway) - split into two parts
        const frontWallPartWidth = (roomWidth / 2) - 1.5; // Opening of 3 units
        const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(frontWallPartWidth, wallHeight, 0.2), wallMaterial);
        frontWallLeft.position.set(- (frontWallPartWidth / 2) - 1.5 , wallHeight / 2, roomDepth / 2);
        frontWallLeft.width = frontWallPartWidth; frontWallLeft.depth = 0.2; // For collision
        this.scene.add(frontWallLeft); this.buildingObstacles.push(frontWallLeft);

        const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(frontWallPartWidth, wallHeight, 0.2), wallMaterial);
        frontWallRight.position.set((frontWallPartWidth / 2) + 1.5, wallHeight / 2, roomDepth / 2);
        frontWallRight.width = frontWallPartWidth; frontWallRight.depth = 0.2; // For collision
        this.scene.add(frontWallRight); this.buildingObstacles.push(frontWallRight);

        // Side walls
        const sideWallGeometry = new THREE.BoxGeometry(0.2, wallHeight, roomDepth);
        const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        leftWall.position.set(-roomWidth / 2, wallHeight / 2, 0);
        leftWall.width = 0.2; leftWall.depth = roomDepth; // For collision
        this.scene.add(leftWall); this.buildingObstacles.push(leftWall);

        const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        rightWall.position.set(roomWidth / 2, wallHeight / 2, 0);
        rightWall.width = 0.2; rightWall.depth = roomDepth; // For collision
        this.scene.add(rightWall); this.buildingObstacles.push(rightWall);

        // Table
        const tableWidth = carpetWidth * 0.8;
        const tableDepth = 1;
        const tableHeight = 0.8;
        const tableGeometry = new THREE.BoxGeometry(tableWidth, tableHeight, tableDepth);
        const tableMaterial = new THREE.MeshBasicMaterial({ color: 0x5C3317 }); // Darker wood for table
        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        table.position.set(0, tableHeight / 2, 0); // Centered on carpet
        this.scene.add(table);
        this.buildingObstacles.push({ // Add table to obstacles
            position: table.position,
            width: tableWidth,
            depth: tableDepth
        });

        // Chairs and NPCs
        const chairSize = 0.6;
        const chairHeight = 0.5;
        const chairMaterial = new THREE.MeshBasicMaterial({ color: 0x4A2511 }); // Dark brown for chairs
        const npcMaterialFront = new THREE.MeshBasicMaterial({ color: 0x0000ff }); // Blue for front NPCs
        const npcMaterialBack = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red for back NPCs
        const npcHeight = 0.8; // Taller than chair back

        const npcPositions = [
            // Back row (facing player)
            { x: -tableWidth / 2 + 0.5, z: tableDepth / 2 + chairSize, facingPlayer: true },
            { x: -tableWidth / 2 + 1.5, z: tableDepth / 2 + chairSize, facingPlayer: true },
            { x: tableWidth / 2 - 1.5, z: tableDepth / 2 + chairSize, facingPlayer: true },
            { x: tableWidth / 2 - 0.5, z: tableDepth / 2 + chairSize, facingPlayer: true },
            // Front row (back to player)
            { x: -tableWidth / 2 + 0.5, z: -tableDepth / 2 - chairSize, facingPlayer: false },
            { x: -tableWidth / 2 + 1.5, z: -tableDepth / 2 - chairSize, facingPlayer: false },
            { x: tableWidth / 2 - 1.5, z: -tableDepth / 2 - chairSize, facingPlayer: false },
            { x: tableWidth / 2 - 0.5, z: -tableDepth / 2 - chairSize, facingPlayer: false },
        ];

        npcPositions.forEach(pos => {
            const chairGeometry = new THREE.BoxGeometry(chairSize, chairHeight, chairSize);
            const chair = new THREE.Mesh(chairGeometry, chairMaterial);
            chair.position.set(pos.x, chairHeight / 2, pos.z);
            this.scene.add(chair);
            this.buildingObstacles.push({ // Add chairs to obstacles
                position: chair.position,
                width: chairSize,
                depth: chairSize
            });

            const npcGeometry = new THREE.CylinderGeometry(chairSize / 2, chairSize / 2, npcHeight, 8);
            const npc = new THREE.Mesh(npcGeometry, pos.facingPlayer ? npcMaterialFront : npcMaterialBack);
            npc.position.set(pos.x, npcHeight / 2, pos.z); // Position NPC on the chair
            this.scene.add(npc);
            this.buildingObstacles.push({ // Add NPCs to obstacles
                position: npc.position,
                width: chairSize, // Approximate NPC width
                depth: chairSize  // Approximate NPC depth
            });
        });

        // Torches/Sconces (simple placeholders)
        const sconceGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
        const sconceMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 }); // Gold

        const sconceLeft = new THREE.Mesh(sconceGeometry, sconceMaterial);
        sconceLeft.position.set(-roomWidth / 2 + 0.25, wallHeight * 0.6, -roomDepth * 0.3);
        this.scene.add(sconceLeft);

        const sconceRight = new THREE.Mesh(sconceGeometry, sconceMaterial);
        sconceRight.position.set(roomWidth / 2 - 0.25, wallHeight * 0.6, -roomDepth * 0.3);
        this.scene.add(sconceRight);

        // Add the player back to the scene, positioned inside the door
        this.position.set(0, 0.1, roomDepth / 2 - 1); // Player Y position for flat sprite
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        // Add lights back to the scene
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight.position.set(0, 10, 5); // Light from above and slightly front
        this.scene.add(directionalLight);

        console.log('Entered building, scene recreated to match image.');
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

    getPosition() {
        return this.position;
    }

    getMesh() {
        return this.mesh;
    }
}
