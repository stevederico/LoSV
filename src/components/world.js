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
        this.init();
    }

    init() {
        this.createTerrain();
        this.createBoundaries();
        this.createBuildings();
        this.createTrees();
        this.createInteractiveElements();
    }

    createTerrain() {
        // Create terrain with different tile types like in Zelda
        const groundGeometry = new THREE.PlaneGeometry(this.worldSize, this.worldSize);
        const groundMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x66aa55,  // Light green for grass 
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
    }

    createPath(x, z, width, depth) {
        const pathGeometry = new THREE.PlaneGeometry(width, depth);
        const pathMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xccbb88, // Tan/brown for dirt path
            side: THREE.DoubleSide 
        });
        const path = new THREE.Mesh(pathGeometry, pathMaterial);
        path.rotation.x = -Math.PI / 2;
        path.position.set(x + width/2, 0, z + depth/2);
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
        this.createHouse(10, -10, 6, 4); // Adjusted position to match the image more closely
    }

    createHouse(x, z, width, depth) {
        const height = 3;
        // House base
        const baseGeometry = new THREE.BoxGeometry(width, height, depth);
        const baseMaterial = new THREE.MeshBasicMaterial({ color: 0xddaa88 }); // Light brown
        const house = new THREE.Mesh(baseGeometry, baseMaterial);
        house.position.set(x + width/2, height/2, z + depth/2);
        house.width = width;
        house.depth = depth;
        house.userData.isBuilding = true;  // Tag as building
        this.scene.add(house);
        this.buildings.push(house);
        this.colliders.push(house);
        
        const roofGeometry = new THREE.ConeGeometry(Math.sqrt(width*width + depth*depth)/2, 2, 4);
        const roofMaterial = new THREE.MeshBasicMaterial({ color: 0xaa3333 }); // Red roof
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(x + width/2, height + 1, z + depth/2);
        roof.rotation.y = Math.PI / 4;
        roof.userData.isBuilding = true;  // Tag as building
        this.scene.add(roof);
        this.buildings.push(roof);
    }

    createTrees() {
        // Create trees as obstacles around the map
        for (let i = 0; i < 15; i++) {
            const treeX = (Math.random() - 0.5) * (this.worldSize - 5);
            const treeZ = (Math.random() - 0.5) * (this.worldSize - 5);
            this.createTree(treeX, treeZ);
        }
    }

    createTree(x, z) {
        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 2, 8);
        const trunkMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(x, 1, z);
        // Add width and depth properties for collision detection
        trunk.width = 1.0;  // Using a slightly wider collision area than the visual trunk
        trunk.depth = 1.0;  // Using a slightly wider collision area than the visual trunk
        this.scene.add(trunk);
        this.obstacles.push(trunk);
        this.colliders.push(trunk);
        
        // Tree foliage
        const foliageGeometry = new THREE.ConeGeometry(1.5, 3, 8);
        const foliageMaterial = new THREE.MeshBasicMaterial({ color: 0x228822 }); // Dark green
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.set(x, 3, z);
        this.scene.add(foliage);
        this.obstacles.push(foliage);
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
