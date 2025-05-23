import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.terrain = [];
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
        this.createBoundaries();
        this.createBuildings();
        this.createInteractiveElements();
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
        this.createPath(-5, -5, 10, 2); // Horizontal path
        this.createPath(-1, -5, 2, 10); // Vertical path
        
        // Create main path in front of all buildings
        this.createPath(2, -8, 21, 3); // Long horizontal path in front of buildings (from x=2 to x=23, z=-8 to z=-5)
        
        // Create connecting paths to each building
        this.createPath(4.5, -10, 2, 2); // Path to YComb building
        this.createPath(9.5, -10, 2, 2); // Path to House
        this.createPath(14.5, -10, 2, 2); // Path to Garage  
        this.createPath(19.5, -10, 2, 2); // Path to Venture building
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
        
        const northWall = new THREE.Mesh(wallGeometry, wallMaterial);
        northWall.position.set(0, wallHeight/2, -halfSize - wallThickness/2);
        northWall.width = this.worldSize + wallThickness * 2;
        northWall.depth = wallThickness;
        this.scene.add(northWall);
        this.colliders.push(northWall);
        
        const southWall = new THREE.Mesh(wallGeometry, wallMaterial);
        southWall.position.set(0, wallHeight/2, halfSize + wallThickness/2);
        southWall.width = this.worldSize + wallThickness * 2;
        southWall.depth = wallThickness;
        this.scene.add(southWall);
        this.colliders.push(southWall);
        
        const sideWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, this.worldSize + wallThickness * 2);
        
        const eastWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        eastWall.position.set(halfSize + wallThickness/2, wallHeight/2, 0);
        eastWall.width = wallThickness;
        eastWall.depth = this.worldSize + wallThickness * 2;
        this.scene.add(eastWall);
        this.colliders.push(eastWall);
        
        const westWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        westWall.position.set(-halfSize - wallThickness/2, wallHeight/2, 0);
        westWall.width = wallThickness;
        westWall.depth = this.worldSize + wallThickness * 2;
        this.scene.add(westWall);
        this.colliders.push(westWall);
    }

    createBuildings() {
        this.createHouse(10, -10, 3, 3); 
        this.createGarage(15, -10, 3, 3);
        this.createYCombBuilding(5, -10, 3, 3);
        this.createVentureBuilding(20, -10, 3, 3);
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
        houseSprite.userData.buildingType = 'house'; // Specify building type
        this.scene.add(houseSprite);
        this.buildings.push(houseSprite);
        this.colliders.push(houseSprite); // Collision might need adjustment based on sprite
    }

    createGarage(x, z, spriteWidth, spriteHeight) {
        const garageTexture = this.textureLoader.load('/assets/textures/garage.png');
        garageTexture.magFilter = THREE.NearestFilter;
        garageTexture.minFilter = THREE.NearestFilter;
        
        const garageGeometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const garageMaterial = new THREE.MeshBasicMaterial({ 
            map: garageTexture, 
            transparent: true, // Assuming PNG with transparency
            side: THREE.DoubleSide 
        });
        const garageSprite = new THREE.Mesh(garageGeometry, garageMaterial);
        
        // Position the garage sprite flat on the ground
        garageSprite.position.set(x, 0.1, z); // x, z are center, y is slightly above ground
        garageSprite.rotation.x = -Math.PI / 2; // Rotate to be flat on XZ plane

        // Define width and depth for collision detection
        // When rotated, spriteWidth is along X, spriteHeight is along Z
        garageSprite.width = spriteWidth;
        garageSprite.depth = spriteHeight;

        garageSprite.userData.isBuilding = true;  // Tag as building
        garageSprite.userData.buildingType = 'garage'; // Specify building type
        this.scene.add(garageSprite);
        this.buildings.push(garageSprite);
        this.colliders.push(garageSprite); // Collision might need adjustment based on sprite
    }

    createYCombBuilding(x, z, spriteWidth, spriteHeight) {
        const ycombTexture = this.textureLoader.load('/assets/textures/ycomb.png');
        ycombTexture.magFilter = THREE.NearestFilter;
        ycombTexture.minFilter = THREE.NearestFilter;
        
        const ycombGeometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const ycombMaterial = new THREE.MeshBasicMaterial({ 
            map: ycombTexture, 
            transparent: true, // Assuming PNG with transparency
            side: THREE.DoubleSide 
        });
        const ycombSprite = new THREE.Mesh(ycombGeometry, ycombMaterial);
        
        // Position the YComb building sprite flat on the ground
        ycombSprite.position.set(x, 0.1, z); // x, z are center, y is slightly above ground
        ycombSprite.rotation.x = -Math.PI / 2; // Rotate to be flat on XZ plane

        // Define width and depth for collision detection
        // When rotated, spriteWidth is along X, spriteHeight is along Z
        ycombSprite.width = spriteWidth;
        ycombSprite.depth = spriteHeight;

        ycombSprite.userData.isBuilding = true;  // Tag as building
        ycombSprite.userData.buildingType = 'ycomb'; // Specify building type
        this.scene.add(ycombSprite);
        this.buildings.push(ycombSprite);
        this.colliders.push(ycombSprite); // Collision might need adjustment based on sprite
    }

    createVentureBuilding(x, z, spriteWidth, spriteHeight) {
        const ventureTexture = this.textureLoader.load('/assets/textures/venture.png');
        ventureTexture.magFilter = THREE.NearestFilter;
        ventureTexture.minFilter = THREE.NearestFilter;
        
        const ventureGeometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const ventureMaterial = new THREE.MeshBasicMaterial({ 
            map: ventureTexture, 
            transparent: true, // Assuming PNG with transparency
            side: THREE.DoubleSide 
        });
        const ventureSprite = new THREE.Mesh(ventureGeometry, ventureMaterial);
        
        // Position the Venture building sprite flat on the ground
        ventureSprite.position.set(x, 0.1, z); // x, z are center, y is slightly above ground
        ventureSprite.rotation.x = -Math.PI / 2; // Rotate to be flat on XZ plane

        // Define width and depth for collision detection
        // When rotated, spriteWidth is along X, spriteHeight is along Z
        ventureSprite.width = spriteWidth;
        ventureSprite.depth = spriteHeight;

        ventureSprite.userData.isBuilding = true;  // Tag as building
        ventureSprite.userData.buildingType = 'venture'; // Specify building type
        this.scene.add(ventureSprite);
        this.buildings.push(ventureSprite);
        this.colliders.push(ventureSprite); // Collision might need adjustment based on sprite
    }

    createInteractiveElements() {
        // Create interactive elements like chests, pots, etc.
        // this.createChest(5, 0, 2, 2); // Commented out
        // this.createChest(-8, 7, 2, 2); // Commented out
        
        // Create some rupees/gems to collect
        // for (let i = 0; i < 10; i++) { // Commented out
        //     const gemX = (Math.random() - 0.5) * (this.worldSize - 5);
        //     const gemZ = (Math.random() - 0.5) * (this.worldSize - 5);
        //     this.createGem(gemX, gemZ, 1, 1); 
        // }
    }

    createChest(x, z, spriteWidth, spriteHeight) {
        const chestTexture = this.textureLoader.load('/assets/textures/chest-sprite.png');
        chestTexture.magFilter = THREE.NearestFilter;
        chestTexture.minFilter = THREE.NearestFilter;

        const chestGeometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const chestMaterial = new THREE.MeshBasicMaterial({
            map: chestTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const chestSprite = new THREE.Mesh(chestGeometry, chestMaterial);

        chestSprite.position.set(x, 0.1, z); // y slightly above ground
        chestSprite.rotation.x = -Math.PI / 2; // Rotate to be flat on XZ plane

        chestSprite.width = spriteWidth;
        chestSprite.depth = spriteHeight;
        chestSprite.userData.isChest = true; // Tag for interaction

        this.scene.add(chestSprite);
        this.interactiveElements.push(chestSprite);
    }

    createGem(x, z, spriteWidth, spriteHeight) {
        const gemTexture = this.textureLoader.load('/assets/textures/gem-sprite.png');
        gemTexture.magFilter = THREE.NearestFilter;
        gemTexture.minFilter = THREE.NearestFilter;

        const gemGeometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const gemMaterial = new THREE.MeshBasicMaterial({
            map: gemTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const gemSprite = new THREE.Mesh(gemGeometry, gemMaterial);

        gemSprite.position.set(x, 0.05, z); // y slightly above ground, below chests
        gemSprite.rotation.x = -Math.PI / 2; // Rotate to be flat on XZ plane
        
        gemSprite.width = spriteWidth;
        gemSprite.depth = spriteHeight;
        gemSprite.userData.isGem = true; // Tag for animation and interaction

        this.scene.add(gemSprite);
        this.interactiveElements.push(gemSprite);
    }

    getObstacles() {
        return this.colliders;
    }

    getInteractiveElements() {
        return this.interactiveElements;
    }

    update() {
        // Animate interactive elements
        // this.interactiveElements.forEach((element, index) => {
        //     // Make gems float and rotate (now checking userData tag)
        //     if (element.userData.isGem) { // Commented out gem animation
        //         element.rotation.z += 0.02; 
        //         element.position.y = 0.1 + Math.sin(Date.now() * 0.003 + index) * 0.05; 
        //     }
        // });
    }
}
