import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.terrain = [];
        this.obstacles = [];
        this.interactiveElements = [];
        this.buildings = [];
        this.colliders = [];
        this.worldSize = 50; // Size of the world in units
        this.tileSize = 1; // Size of each tile
        this.textureLoader = new THREE.TextureLoader(); // Added texture loader
        this.init();
    }

    init() {
        this.createTerrain();
        this.createBoundaries(); // We'll address this later
        this.createBuildings();
        this.createTrees(); // We'll address this later
        this.createInteractiveElements(); // We'll address this later
    }

    createTerrain() {
        // Load textures
        const grassTexture = this.textureLoader.load('/assets/textures/grass-tile.png');
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        grassTexture.repeat.set(this.worldSize / this.tileSize, this.worldSize / this.tileSize);
        grassTexture.magFilter = THREE.NearestFilter;
        grassTexture.minFilter = THREE.NearestFilter;

        // Create terrain with tiled grass
        const groundGeometry = new THREE.PlaneGeometry(this.worldSize, this.worldSize);
        const groundMaterial = new THREE.MeshBasicMaterial({ 
            map: grassTexture,
            side: THREE.DoubleSide 
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.01; // Slightly below other elements
        this.scene.add(ground);
        this.terrain.push(ground);

        // Create paths with a different texture/color
        // This will be simplified for now, ideally paths are part of a tilemap
        this.createPath(-5, -5, 10, 2); // Horizontal path
        this.createPath(-1, -5, 2, 10); // Vertical path
    }

    createPath(x, z, width, depth) {
        const pathTexture = this.textureLoader.load('/assets/textures/path-tile.png');
        pathTexture.wrapS = THREE.RepeatWrapping;
        pathTexture.wrapT = THREE.RepeatWrapping;
        pathTexture.repeat.set(width / this.tileSize, depth / this.tileSize);
        pathTexture.magFilter = THREE.NearestFilter;
        pathTexture.minFilter = THREE.NearestFilter;

        const pathGeometry = new THREE.PlaneGeometry(width, depth);
        const pathMaterial = new THREE.MeshBasicMaterial({ 
            map: pathTexture,
            side: THREE.DoubleSide,
            transparent: true // Allow grass to show through if path texture has alpha
        });
        const path = new THREE.Mesh(pathGeometry, pathMaterial);
        path.rotation.x = -Math.PI / 2;
        path.position.set(x + width/2, 0, z + depth/2); // Position slightly above ground
        this.scene.add(path);
        this.terrain.push(path);
    }

    createBoundaries() {
        // Create boundaries around the world like in Zelda
        const wallHeight = 2;
        const wallThickness = 1;
        const halfSize = this.worldSize / 2;
        
        const wallGeometry = new THREE.BoxGeometry(this.worldSize + wallThickness * 2, wallHeight, wallThickness);
        const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x777777 });
        
        // North wall
        const northWall = new THREE.Mesh(wallGeometry, wallMaterial);
        northWall.position.set(0, wallHeight/2, -halfSize - wallThickness/2);
        northWall.width = this.worldSize + wallThickness * 2;
        northWall.depth = wallThickness;
        this.scene.add(northWall);
        this.colliders.push(northWall);
        
        // South wall
        const southWall = new THREE.Mesh(wallGeometry, wallMaterial);
        southWall.position.set(0, wallHeight/2, halfSize + wallThickness/2);
        southWall.width = this.worldSize + wallThickness * 2;
        southWall.depth = wallThickness;
        this.scene.add(southWall);
        this.colliders.push(southWall);
        
        // East & West walls
        const sideWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, this.worldSize + wallThickness * 2);
        
        // East wall
        const eastWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        eastWall.position.set(halfSize + wallThickness/2, wallHeight/2, 0);
        eastWall.width = wallThickness;
        eastWall.depth = this.worldSize + wallThickness * 2;
        this.scene.add(eastWall);
        this.colliders.push(eastWall);
        
        // West wall
        const westWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        westWall.position.set(-halfSize - wallThickness/2, wallHeight/2, 0);
        westWall.width = wallThickness;
        westWall.depth = this.worldSize + wallThickness * 2;
        this.scene.add(westWall);
        this.colliders.push(westWall);
    }

    createBuildings() {
        // Create a house similar to the one in the image
        this.createHouse(10, -10, 6, 4); // Dimensions might represent sprite size now
    }

    createHouse(x, z, spriteWidth, spriteHeight) {
        const houseTexture = this.textureLoader.load('/assets/textures/house-sprite.png');
        houseTexture.magFilter = THREE.NearestFilter;
        houseTexture.minFilter = THREE.NearestFilter;
        
        const houseGeometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const houseMaterial = new THREE.MeshBasicMaterial({ 
            map: houseTexture, 
            transparent: true, // Assuming PNG with transparency
            side: THREE.DoubleSide 
        });
        const houseSprite = new THREE.Mesh(houseGeometry, houseMaterial);
        
        // Position the house sprite flat on the ground
        houseSprite.position.set(x, 0.1, z); // x, z are center, y is slightly above ground
        houseSprite.rotation.x = -Math.PI / 2; // Rotate to be flat on XZ plane

        // Define width and depth for collision detection
        // When rotated, spriteWidth is along X, spriteHeight is along Z
        houseSprite.width = spriteWidth;
        houseSprite.depth = spriteHeight;

        houseSprite.userData.isBuilding = true;  // Tag as building
        this.scene.add(houseSprite);
        this.buildings.push(houseSprite);
        this.colliders.push(houseSprite); // Collision might need adjustment based on sprite
        
        // Remove old 3D roof
        // const roofGeometry = new THREE.ConeGeometry(Math.sqrt(width*width + depth*depth)/2, 2, 4);
        // const roofMaterial = new THREE.MeshBasicMaterial({ color: 0xaa3333 }); // Red roof
        // const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        // roof.position.set(x + width/2, height + 1, z + depth/2);
        // roof.rotation.y = Math.PI / 4;
        // roof.userData.isBuilding = true;  // Tag as building
        // this.scene.add(roof);
        // this.buildings.push(roof);
    }

    createTrees() {
        // Create trees as obstacles around the map
        for (let i = 0; i < 15; i++) { // Restore loop
            const treeX = (Math.random() - 0.5) * (this.worldSize - 5);
            const treeZ = (Math.random() - 0.5) * (this.worldSize - 5);
            // Define sprite dimensions for the tree - adjust these to match your sprite
            const treeSpriteWidth = 1.5; // Adjusted size
            const treeSpriteHeight = 1.5; // Adjusted size
            this.createTree(treeX, treeZ, treeSpriteWidth, treeSpriteHeight);
        }

        // Create one large, centrally located test tree // Remove Test tree
        // const testTreeX = 0;
        // const testTreeZ = 0;
        // const testTreeSpriteWidth = 10; // Make it large for testing
        // const testTreeSpriteHeight = 10; // Make it large for testing
        // this.createTree(testTreeX, testTreeZ, testTreeSpriteWidth, testTreeSpriteHeight);
    }

    createTree(x, z, spriteWidth, spriteHeight) {
        const treeTexture = this.textureLoader.load('/assets/textures/tree-sprite.png'); // Restore texture
        treeTexture.magFilter = THREE.NearestFilter;
        treeTexture.minFilter = THREE.NearestFilter;

        const treeGeometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const treeMaterial = new THREE.MeshBasicMaterial({
            map: treeTexture, // Use texture
            transparent: true, // Assuming PNG with transparency
            side: THREE.DoubleSide
            // depthTest: false, // Remove testing property
            // depthWrite: false // Remove testing property
        });
        const treeSprite = new THREE.Mesh(treeGeometry, treeMaterial);

        // Position the tree sprite flat on the ground
        treeSprite.position.set(x, 0.15, z); // x, z are center, y is slightly above ground
        treeSprite.rotation.x = -Math.PI / 2; // Rotate to be flat on XZ plane
        // treeSprite.renderOrder = 999; // Remove testing property

        // Add width and depth properties for collision detection if needed,
        // these might be different from spriteWidth if the collision area is smaller/larger.
        treeSprite.width = spriteWidth; 
        treeSprite.depth = spriteHeight; // Or a more appropriate depth for collision

        this.scene.add(treeSprite);
        this.obstacles.push(treeSprite);
        this.colliders.push(treeSprite); // Re-enable tree collision
    }

    createInteractiveElements() {
        // Create interactive elements like chests, pots, etc.
        this.createChest(5, 0);
        this.createChest(-8, 7);
        
        // Create some rupees/gems to collect
        for (let i = 0; i < 10; i++) {
            const gemX = (Math.random() - 0.5) * (this.worldSize - 5);
            const gemZ = (Math.random() - 0.5) * (this.worldSize - 5);
            this.createGem(gemX, gemZ);
        }
    }

    createChest(x, z) {
        const chestGeometry = new THREE.BoxGeometry(1, 0.8, 0.8);
        const chestMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown
        const chest = new THREE.Mesh(chestGeometry, chestMaterial);
        chest.position.set(x, 0.4, z);
        this.scene.add(chest);
        this.interactiveElements.push(chest);
    }

    createGem(x, z) {
        const gemGeometry = new THREE.OctahedronGeometry(0.3);
        const gemMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green rupee
        const gem = new THREE.Mesh(gemGeometry, gemMaterial);
        gem.position.set(x, 0.3, z);
        this.scene.add(gem);
        this.interactiveElements.push(gem);
    }

    getObstacles() {
        return this.colliders;
    }

    getInteractiveElements() {
        return this.interactiveElements;
    }

    update() {
        // Animate interactive elements
        this.interactiveElements.forEach((element, index) => {
            // Make gems float and rotate
            if (element.geometry instanceof THREE.OctahedronGeometry) {
                element.rotation.y += 0.02;
                element.position.y = 0.3 + Math.sin(Date.now() * 0.003 + index) * 0.1;
            }
        });
    }
}
