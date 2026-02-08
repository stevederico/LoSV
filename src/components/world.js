import * as THREE from 'three';
import { spriteGenerator } from '../utils/SpriteGenerator.js';

/**
 * World manages the overworld terrain, buildings, and decorations.
 * Layout: Silicon Valley town with districts and water bay.
 */
export class World {
    constructor(scene, progressionManager = null) {
        this.scene = scene;
        this.terrain = [];
        this.interactiveElements = [];
        this.buildings = [];
        this.buildingLocks = new Map();
        this.colliders = [];
        this.decorations = [];
        this.worldSize = 50;
        this.tileSize = 1;
        this.textureLoader = new THREE.TextureLoader();
        this.progressionManager = progressionManager;
        this.init();
    }

    init() {
        this.createTerrain();
        this.createBoundaries();
        this.createBuildings();
        this.createDecorations();
        this.createInteractiveElements();
    }

    // ========== TERRAIN SYSTEM ==========

    /**
     * Creates the multi-zone terrain system.
     */
    createTerrain() {
        this.createGrassBase();
        this.createTownSquare();
        this.createNasdaqPlaza();
        this.createWaterBay();
        this.createSandBeach();
        this.createPaths();
    }

    /**
     * Creates the base grass layer covering the entire world.
     */
    createGrassBase() {
        const grassTexture = spriteGenerator.generateGrassTexture();
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        grassTexture.repeat.set(this.worldSize / this.tileSize, this.worldSize / this.tileSize);

        const groundGeometry = new THREE.PlaneGeometry(this.worldSize, this.worldSize);
        const groundMaterial = new THREE.MeshBasicMaterial({
            map: grassTexture,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.01;
        this.scene.add(ground);
        this.terrain.push(ground);
    }

    /**
     * Creates the central town square with cobblestone.
     */
    createTownSquare() {
        this.createTerrainZone(
            -8, 1,
            16, 12,
            spriteGenerator.generateCobblestone()
        );
    }

    /**
     * Creates the Nasdaq plaza area with marble tiles.
     */
    createNasdaqPlaza() {
        this.createTerrainZone(
            8, -20,
            14, 10,
            spriteGenerator.generateMarbleTile()
        );
    }

    /**
     * Creates the water bay on the east side.
     */
    createWaterBay() {
        const waterTexture = spriteGenerator.generateWaterTexture();
        waterTexture.wrapS = THREE.RepeatWrapping;
        waterTexture.wrapT = THREE.RepeatWrapping;
        waterTexture.repeat.set(3, 5);

        const waterGeometry = new THREE.PlaneGeometry(8, 20);
        const waterMaterial = new THREE.MeshBasicMaterial({
            map: waterTexture,
            side: THREE.DoubleSide,
            transparent: true
        });
        const water = new THREE.Mesh(waterGeometry, waterMaterial);
        water.rotation.x = -Math.PI / 2;
        water.position.set(21, 0.02, 0);
        this.scene.add(water);
        this.terrain.push(water);

        // Water is impassable - add collider
        const waterCollider = new THREE.Mesh(
            new THREE.BoxGeometry(8, 2, 20),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        waterCollider.position.set(21, 0, 0);
        waterCollider.width = 8;
        waterCollider.depth = 20;
        this.scene.add(waterCollider);
        this.colliders.push(waterCollider);
    }

    /**
     * Creates sand beach between water and land.
     */
    createSandBeach() {
        this.createTerrainZone(
            16, -10,
            3, 20,
            spriteGenerator.generateSandTexture()
        );
    }

    /**
     * Helper to create a terrain zone with a specific texture.
     * @param {number} x - X position (left edge)
     * @param {number} z - Z position (top edge)
     * @param {number} width - Width of zone
     * @param {number} depth - Depth of zone
     * @param {THREE.Texture} texture - Texture to use
     */
    createTerrainZone(x, z, width, depth, texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(width / 2, depth / 2);

        const geometry = new THREE.PlaneGeometry(width, depth);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true
        });
        const zone = new THREE.Mesh(geometry, material);
        zone.rotation.x = -Math.PI / 2;
        zone.position.set(x + width / 2, 0.01, z + depth / 2);
        this.scene.add(zone);
        this.terrain.push(zone);
    }

    /**
     * Creates the path network connecting all districts.
     */
    createPaths() {
        // Main entrance road from south
        this.createPath(0, 14, 4, 10);

        // Town square connections
        this.createPath(-4, 13, 8, 2);

        // Path to Home District (SW)
        this.createPath(-14, 8, 10, 3);
        this.createPath(-14, 11, 3, 6);

        // Path to Startup Row (W)
        this.createPath(-14, -2, 10, 3);
        this.createPath(-14, -8, 3, 10);

        // Path to Professional District (E)
        this.createPath(4, 4, 8, 3);

        // Path to Nasdaq Plaza (NE)
        this.createPath(4, -8, 3, 10);
        this.createPath(7, -14, 6, 3);
    }

    /**
     * Creates a dirt path segment.
     * @param {number} x - X position (left edge)
     * @param {number} z - Z position (top edge)
     * @param {number} width - Width
     * @param {number} depth - Depth
     */
    createPath(x, z, width, depth) {
        const pathTexture = spriteGenerator.generateDirtPath();
        pathTexture.wrapS = THREE.RepeatWrapping;
        pathTexture.wrapT = THREE.RepeatWrapping;
        pathTexture.repeat.set(width / this.tileSize, depth / this.tileSize);

        const pathGeometry = new THREE.PlaneGeometry(width, depth);
        const pathMaterial = new THREE.MeshBasicMaterial({
            map: pathTexture,
            side: THREE.DoubleSide,
            transparent: true
        });
        const path = new THREE.Mesh(pathGeometry, pathMaterial);
        path.rotation.x = -Math.PI / 2;
        path.position.set(x + width / 2, 0.02, z + depth / 2);
        this.scene.add(path);
        this.terrain.push(path);
    }

    // ========== BOUNDARIES ==========

    createBoundaries() {
        const wallHeight = 2;
        const wallThickness = 1;
        const halfSize = this.worldSize / 2;

        const wallGeometry = new THREE.BoxGeometry(this.worldSize + wallThickness * 2, wallHeight, wallThickness);
        const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x556644 });

        const northWall = new THREE.Mesh(wallGeometry, wallMaterial);
        northWall.position.set(0, wallHeight / 2, -halfSize - wallThickness / 2);
        northWall.width = this.worldSize + wallThickness * 2;
        northWall.depth = wallThickness;
        this.scene.add(northWall);
        this.colliders.push(northWall);

        const southWall = new THREE.Mesh(wallGeometry, wallMaterial);
        southWall.position.set(0, wallHeight / 2, halfSize + wallThickness / 2);
        southWall.width = this.worldSize + wallThickness * 2;
        southWall.depth = wallThickness;
        this.scene.add(southWall);
        this.colliders.push(southWall);

        const sideWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, this.worldSize + wallThickness * 2);

        const eastWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        eastWall.position.set(halfSize + wallThickness / 2, wallHeight / 2, 0);
        eastWall.width = wallThickness;
        eastWall.depth = this.worldSize + wallThickness * 2;
        this.scene.add(eastWall);
        this.colliders.push(eastWall);

        const westWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        westWall.position.set(-halfSize - wallThickness / 2, wallHeight / 2, 0);
        westWall.width = wallThickness;
        westWall.depth = this.worldSize + wallThickness * 2;
        this.scene.add(westWall);
        this.colliders.push(westWall);
    }

    // ========== BUILDINGS ==========

    /**
     * Creates all buildings organized into districts.
     */
    createBuildings() {
        // Home District (SW corner - starting area)
        this.createHouse(-15, 14, 3, 3);
        this.createGarage(-10, 14, 3, 3);

        // Startup Row (W side - early/mid game)
        this.createAccelerator(-18, 0, 3, 3);
        this.createLoft(-18, -6, 3, 3);
        this.createConference(-12, -4, 3, 3);

        // Professional District (E side - mid/late game)
        this.createDataCenter(10, 6, 3, 3);
        this.createBoardRoom(10, 0, 3, 3);
        this.createVentureBuilding(10, -6, 3, 3);
        this.createLawBuilding(4, -6, 3, 3);

        // Nasdaq Plaza (NE corner - end game)
        this.createNasdaqBuilding(12, -16, 3, 3);
    }

    createHouse(x, z, spriteWidth, spriteHeight) {
        const houseTexture = this.textureLoader.load('/assets/textures/house-sprite.png');
        houseTexture.magFilter = THREE.NearestFilter;
        houseTexture.minFilter = THREE.NearestFilter;

        const houseGeometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const houseMaterial = new THREE.MeshBasicMaterial({
            map: houseTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const houseSprite = new THREE.Mesh(houseGeometry, houseMaterial);

        houseSprite.position.set(x, 0.1, z);
        houseSprite.rotation.x = -Math.PI / 2;
        houseSprite.width = spriteWidth;
        houseSprite.depth = spriteHeight;
        houseSprite.userData.isBuilding = true;
        houseSprite.userData.buildingType = 'house';
        this.scene.add(houseSprite);
        this.buildings.push(houseSprite);
        this.colliders.push(houseSprite);
    }

    createGarage(x, z, spriteWidth, spriteHeight) {
        const garageTexture = this.textureLoader.load('/assets/textures/garage.png');
        garageTexture.magFilter = THREE.NearestFilter;
        garageTexture.minFilter = THREE.NearestFilter;

        const garageGeometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const garageMaterial = new THREE.MeshBasicMaterial({
            map: garageTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const garageSprite = new THREE.Mesh(garageGeometry, garageMaterial);

        garageSprite.position.set(x, 0.1, z);
        garageSprite.rotation.x = -Math.PI / 2;
        garageSprite.width = spriteWidth;
        garageSprite.depth = spriteHeight;
        garageSprite.userData.isBuilding = true;
        garageSprite.userData.buildingType = 'garage';
        this.scene.add(garageSprite);
        this.buildings.push(garageSprite);
        this.colliders.push(garageSprite);
    }

    createAccelerator(x, z, spriteWidth, spriteHeight) {
        const acceleratorTexture = this.textureLoader.load('/assets/textures/accelerator.png');
        acceleratorTexture.magFilter = THREE.NearestFilter;
        acceleratorTexture.minFilter = THREE.NearestFilter;

        const acceleratorGeometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const acceleratorMaterial = new THREE.MeshBasicMaterial({
            map: acceleratorTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const acceleratorSprite = new THREE.Mesh(acceleratorGeometry, acceleratorMaterial);

        acceleratorSprite.position.set(x, 0.1, z);
        acceleratorSprite.rotation.x = -Math.PI / 2;
        acceleratorSprite.width = spriteWidth;
        acceleratorSprite.depth = spriteHeight;
        acceleratorSprite.userData.isBuilding = true;
        acceleratorSprite.userData.buildingType = 'accelerator';
        this.scene.add(acceleratorSprite);
        this.buildings.push(acceleratorSprite);
        this.colliders.push(acceleratorSprite);
    }

    createLoft(x, z, spriteWidth, spriteHeight) {
        const loftTexture = this.textureLoader.load('/assets/textures/loft.png');
        loftTexture.magFilter = THREE.NearestFilter;
        loftTexture.minFilter = THREE.NearestFilter;

        const loftGeometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const loftMaterial = new THREE.MeshBasicMaterial({
            map: loftTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const loftSprite = new THREE.Mesh(loftGeometry, loftMaterial);

        loftSprite.position.set(x, 0.1, z);
        loftSprite.rotation.x = -Math.PI / 2;
        loftSprite.width = spriteWidth;
        loftSprite.depth = spriteHeight;
        loftSprite.userData.isBuilding = true;
        loftSprite.userData.buildingType = 'loft';
        this.scene.add(loftSprite);
        this.buildings.push(loftSprite);
        this.colliders.push(loftSprite);
    }

    createConference(x, z, spriteWidth, spriteHeight) {
        const conferenceTexture = this.textureLoader.load('/assets/textures/conference.png');
        conferenceTexture.magFilter = THREE.NearestFilter;
        conferenceTexture.minFilter = THREE.NearestFilter;

        const conferenceGeometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const conferenceMaterial = new THREE.MeshBasicMaterial({
            map: conferenceTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const conferenceSprite = new THREE.Mesh(conferenceGeometry, conferenceMaterial);

        conferenceSprite.position.set(x, 0.1, z);
        conferenceSprite.rotation.x = -Math.PI / 2;
        conferenceSprite.width = spriteWidth;
        conferenceSprite.depth = spriteHeight;
        conferenceSprite.userData.isBuilding = true;
        conferenceSprite.userData.buildingType = 'conference';
        this.scene.add(conferenceSprite);
        this.buildings.push(conferenceSprite);
        this.colliders.push(conferenceSprite);
    }

    createDataCenter(x, z, spriteWidth, spriteHeight) {
        const dataCenterTexture = this.textureLoader.load('/assets/textures/data-center.png');
        dataCenterTexture.magFilter = THREE.NearestFilter;
        dataCenterTexture.minFilter = THREE.NearestFilter;

        const dataCenterGeometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const dataCenterMaterial = new THREE.MeshBasicMaterial({
            map: dataCenterTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const dataCenterSprite = new THREE.Mesh(dataCenterGeometry, dataCenterMaterial);

        dataCenterSprite.position.set(x, 0.1, z);
        dataCenterSprite.rotation.x = -Math.PI / 2;
        dataCenterSprite.width = spriteWidth;
        dataCenterSprite.depth = spriteHeight;
        dataCenterSprite.userData.isBuilding = true;
        dataCenterSprite.userData.buildingType = 'data-center';
        this.scene.add(dataCenterSprite);
        this.buildings.push(dataCenterSprite);
        this.colliders.push(dataCenterSprite);
    }

    createBoardRoom(x, z, spriteWidth, spriteHeight) {
        const boardRoomTexture = this.textureLoader.load('/assets/textures/board-room.png');
        boardRoomTexture.magFilter = THREE.NearestFilter;
        boardRoomTexture.minFilter = THREE.NearestFilter;

        const boardRoomGeometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const boardRoomMaterial = new THREE.MeshBasicMaterial({
            map: boardRoomTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const boardRoomSprite = new THREE.Mesh(boardRoomGeometry, boardRoomMaterial);

        boardRoomSprite.position.set(x, 0.1, z);
        boardRoomSprite.rotation.x = -Math.PI / 2;
        boardRoomSprite.width = spriteWidth;
        boardRoomSprite.depth = spriteHeight;
        boardRoomSprite.userData.isBuilding = true;
        boardRoomSprite.userData.buildingType = 'board-room';
        this.scene.add(boardRoomSprite);
        this.buildings.push(boardRoomSprite);
        this.colliders.push(boardRoomSprite);
    }

    createVentureBuilding(x, z, spriteWidth, spriteHeight) {
        const ventureTexture = this.textureLoader.load('/assets/textures/venture.png');
        ventureTexture.magFilter = THREE.NearestFilter;
        ventureTexture.minFilter = THREE.NearestFilter;

        const ventureGeometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const ventureMaterial = new THREE.MeshBasicMaterial({
            map: ventureTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const ventureSprite = new THREE.Mesh(ventureGeometry, ventureMaterial);

        ventureSprite.position.set(x, 0.1, z);
        ventureSprite.rotation.x = -Math.PI / 2;
        ventureSprite.width = spriteWidth;
        ventureSprite.depth = spriteHeight;
        ventureSprite.userData.isBuilding = true;
        ventureSprite.userData.buildingType = 'venture';
        this.scene.add(ventureSprite);
        this.buildings.push(ventureSprite);
        this.colliders.push(ventureSprite);
    }

    createLawBuilding(x, z, spriteWidth, spriteHeight) {
        const lawTexture = this.textureLoader.load('/assets/textures/law.png');
        lawTexture.magFilter = THREE.NearestFilter;
        lawTexture.minFilter = THREE.NearestFilter;

        const lawGeometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const lawMaterial = new THREE.MeshBasicMaterial({
            map: lawTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const lawSprite = new THREE.Mesh(lawGeometry, lawMaterial);

        lawSprite.position.set(x, 0.1, z);
        lawSprite.rotation.x = -Math.PI / 2;
        lawSprite.width = spriteWidth;
        lawSprite.depth = spriteHeight;
        lawSprite.userData.isBuilding = true;
        lawSprite.userData.buildingType = 'law';
        this.scene.add(lawSprite);
        this.buildings.push(lawSprite);
        this.colliders.push(lawSprite);
    }

    createNasdaqBuilding(x, z, spriteWidth, spriteHeight) {
        const nasdaqTexture = this.textureLoader.load('/assets/textures/nasdaq.png');
        nasdaqTexture.magFilter = THREE.NearestFilter;
        nasdaqTexture.minFilter = THREE.NearestFilter;

        const nasdaqGeometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const nasdaqMaterial = new THREE.MeshBasicMaterial({
            map: nasdaqTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const nasdaqSprite = new THREE.Mesh(nasdaqGeometry, nasdaqMaterial);

        nasdaqSprite.position.set(x, 0.1, z);
        nasdaqSprite.rotation.x = -Math.PI / 2;
        nasdaqSprite.width = spriteWidth;
        nasdaqSprite.depth = spriteHeight;
        nasdaqSprite.userData.isBuilding = true;
        nasdaqSprite.userData.buildingType = 'nasdaq';
        this.scene.add(nasdaqSprite);
        this.buildings.push(nasdaqSprite);
        this.colliders.push(nasdaqSprite);
    }

    // ========== DECORATIONS ==========

    /**
     * Creates all decorative elements in the world.
     */
    createDecorations() {
        // Trees along edges and forest areas
        this.createDecoration(-22, -18, 'tree', 2, 2);
        this.createDecoration(-22, -10, 'tree', 2, 2);
        this.createDecoration(-22, 0, 'tree', 2, 2);
        this.createDecoration(-22, 10, 'tree', 2, 2);
        this.createDecoration(-22, 18, 'tree', 2, 2);
        this.createDecoration(-18, 20, 'tree', 2, 2);
        this.createDecoration(-10, 20, 'tree', 2, 2);
        this.createDecoration(6, 20, 'tree', 2, 2);
        this.createDecoration(14, 20, 'tree', 2, 2);

        // Trees near Nasdaq plaza
        this.createDecoration(6, -18, 'tree', 2, 2);
        this.createDecoration(18, -18, 'tree', 2, 2);
        this.createDecoration(6, -12, 'tree', 2, 2);

        // Bushes scattered around
        this.createDecoration(-20, -14, 'bush', 1, 1);
        this.createDecoration(-20, 4, 'bush', 1, 1);
        this.createDecoration(-6, 18, 'bush', 1, 1);
        this.createDecoration(2, 18, 'bush', 1, 1);
        this.createDecoration(-16, 8, 'bush', 1, 1);
        this.createDecoration(14, 8, 'bush', 1, 1);

        // Town square fountain
        this.createDecoration(0, 6, 'fountain', 3, 3);

        // Benches in town square
        this.createDecoration(-4, 4, 'bench', 2, 1);
        this.createDecoration(4, 4, 'bench', 2, 1);

        // Lampposts along paths
        this.createDecoration(-2, 10, 'lamppost', 1, 1);
        this.createDecoration(2, 10, 'lamppost', 1, 1);
        this.createDecoration(-6, 6, 'lamppost', 1, 1);
        this.createDecoration(6, 6, 'lamppost', 1, 1);

        // Signpost near entrance
        this.createDecoration(4, 16, 'signpost', 1.5, 1.5);

        // Dock at water
        this.createDecoration(16, 0, 'dock', 3, 1.5);

        // Flower patches
        this.createDecoration(-16, 12, 'flowers', 1, 1);
        this.createDecoration(-8, 16, 'flowers', 1, 1);
        this.createDecoration(-20, 14, 'flowers', 1, 1);
        this.createDecoration(10, 10, 'flowers', 1, 1);

        // Rocks
        this.createDecoration(-14, -12, 'rock', 1, 1);
        this.createDecoration(14, -10, 'rock', 1, 1);
        this.createDecoration(-8, -14, 'rock', 1, 1);
    }

    /**
     * Creates a decoration sprite at the given position.
     * @param {number} x - X position
     * @param {number} z - Z position
     * @param {string} type - Decoration type (tree, bush, fountain, etc.)
     * @param {number} width - Sprite width
     * @param {number} height - Sprite height
     */
    createDecoration(x, z, type, width, height) {
        let texture;
        switch (type) {
            case 'tree':
                texture = spriteGenerator.generateOverworldTree();
                break;
            case 'bush':
                texture = spriteGenerator.generateBush();
                break;
            case 'fountain':
                texture = spriteGenerator.generateFountain();
                break;
            case 'bench':
                texture = spriteGenerator.generateParkBench();
                break;
            case 'lamppost':
                texture = spriteGenerator.generateLamppost();
                break;
            case 'signpost':
                texture = spriteGenerator.generateSignpost();
                break;
            case 'dock':
                texture = spriteGenerator.generateDock();
                break;
            case 'flowers':
                texture = spriteGenerator.generateFlowers();
                break;
            case 'rock':
                texture = spriteGenerator.generateRock();
                break;
            default:
                return;
        }

        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const decoration = new THREE.Mesh(geometry, material);

        decoration.rotation.x = -Math.PI / 2;
        decoration.position.set(x, 0.05, z);
        decoration.userData.isDecoration = true;
        decoration.userData.decorationType = type;

        this.scene.add(decoration);
        this.decorations.push(decoration);

        // Trees are solid obstacles
        if (type === 'tree') {
            decoration.width = width * 0.6;
            decoration.depth = height * 0.6;
            this.colliders.push(decoration);
        }
    }

    // ========== INTERACTIVE ELEMENTS ==========

    createInteractiveElements() {
        // Items will be created inside buildings, not in the main world
    }

    createMacBook(x, z, spriteWidth, spriteHeight) {
        const macbookTexture = this.textureLoader.load('/assets/textures/macbook.png');
        macbookTexture.magFilter = THREE.NearestFilter;
        macbookTexture.minFilter = THREE.NearestFilter;

        const macbookGeometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const macbookMaterial = new THREE.MeshBasicMaterial({
            map: macbookTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const macbookSprite = new THREE.Mesh(macbookGeometry, macbookMaterial);

        macbookSprite.position.set(x, 0.5, z);
        macbookSprite.rotation.x = -Math.PI / 2;
        macbookSprite.width = spriteWidth;
        macbookSprite.depth = spriteHeight;
        macbookSprite.userData.isPickupItem = true;
        macbookSprite.userData.itemType = 'macbook';
        macbookSprite.userData.itemData = {
            name: 'MacBook Pro',
            icon: '\uD83D\uDCBB',
            description: 'A powerful laptop for building your startup'
        };

        this.scene.add(macbookSprite);
        this.interactiveElements.push(macbookSprite);
        return macbookSprite;
    }

    createiPhone(x, z, spriteWidth, spriteHeight) {
        const iphoneTexture = this.textureLoader.load('/assets/textures/iphone.png');
        iphoneTexture.magFilter = THREE.NearestFilter;
        iphoneTexture.minFilter = THREE.NearestFilter;

        const iphoneGeometry = new THREE.PlaneGeometry(spriteWidth, spriteHeight);
        const iphoneMaterial = new THREE.MeshBasicMaterial({
            map: iphoneTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const iphoneSprite = new THREE.Mesh(iphoneGeometry, iphoneMaterial);

        iphoneSprite.position.set(x, 0.5, z);
        iphoneSprite.rotation.x = -Math.PI / 2;
        iphoneSprite.width = spriteWidth;
        iphoneSprite.depth = spriteHeight;
        iphoneSprite.userData.isPickupItem = true;
        iphoneSprite.userData.itemType = 'iphone';
        iphoneSprite.userData.itemData = {
            name: 'iPhone 15 Pro',
            icon: '\uD83D\uDCF1',
            description: 'Essential for staying connected with your team'
        };

        this.scene.add(iphoneSprite);
        this.interactiveElements.push(iphoneSprite);
        return iphoneSprite;
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

        chestSprite.position.set(x, 0.1, z);
        chestSprite.rotation.x = -Math.PI / 2;
        chestSprite.width = spriteWidth;
        chestSprite.depth = spriteHeight;
        chestSprite.userData.isChest = true;

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

        gemSprite.position.set(x, 0.05, z);
        gemSprite.rotation.x = -Math.PI / 2;
        gemSprite.width = spriteWidth;
        gemSprite.depth = spriteHeight;
        gemSprite.userData.isGem = true;

        this.scene.add(gemSprite);
        this.interactiveElements.push(gemSprite);
    }

    // ========== UTILITY METHODS ==========

    getObstacles() {
        return this.colliders;
    }

    getInteractiveElements() {
        return this.interactiveElements;
    }

    update() {
        // Animation updates could go here (water waves, etc.)
    }

    addLockOverlay(building) {
        if (!building || this.buildingLocks.has(building)) return;

        const lockTexture = this.textureLoader.load('/assets/textures/ui/padlock.png');
        lockTexture.magFilter = THREE.NearestFilter;
        lockTexture.minFilter = THREE.NearestFilter;

        const lockGeometry = new THREE.PlaneGeometry(1, 1);
        const lockMaterial = new THREE.MeshBasicMaterial({
            map: lockTexture,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        const lockSprite = new THREE.Mesh(lockGeometry, lockMaterial);

        lockSprite.position.set(
            building.position.x,
            0.2,
            building.position.z
        );
        lockSprite.rotation.x = -Math.PI / 2;

        if (building.material) {
            building.material.color.setHex(0x888888);
            building.material.opacity = 0.6;
            building.material.transparent = true;
        }

        this.scene.add(lockSprite);
        this.buildingLocks.set(building, lockSprite);
    }

    removeLockOverlay(building) {
        const lockSprite = this.buildingLocks.get(building);
        if (lockSprite) {
            this.scene.remove(lockSprite);
            this.buildingLocks.delete(building);

            if (building.material) {
                building.material.color.setHex(0xffffff);
                building.material.opacity = 1.0;
            }
        }
    }

    updateBuildingStates() {
        if (!this.progressionManager) return;

        this.buildings.forEach(building => {
            const buildingType = building.userData.buildingType;
            if (buildingType) {
                if (this.progressionManager.isLocked(buildingType)) {
                    this.addLockOverlay(building);
                } else {
                    this.removeLockOverlay(building);
                }
            }
        });
    }

    getBuildingByType(buildingType) {
        return this.buildings.find(b => b.userData.buildingType === buildingType);
    }

    /**
     * Disposes of a Three.js object and its children.
     * @param {THREE.Object3D} object - The object to dispose
     */
    disposeObject(object) {
        if (!object) return;

        if (object.children && object.children.length > 0) {
            const children = [...object.children];
            children.forEach(child => this.disposeObject(child));
        }

        if (object.geometry) {
            object.geometry.dispose();
        }

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
     * Cleans up all world resources.
     */
    cleanup() {
        this.terrain.forEach(t => {
            this.disposeObject(t);
            this.scene.remove(t);
        });
        this.terrain = [];

        this.buildings.forEach(b => {
            this.disposeObject(b);
            this.scene.remove(b);
        });
        this.buildings = [];

        this.decorations.forEach(d => {
            this.disposeObject(d);
            this.scene.remove(d);
        });
        this.decorations = [];

        this.colliders.forEach(c => {
            if (c instanceof THREE.Mesh) {
                this.disposeObject(c);
                this.scene.remove(c);
            }
        });
        this.colliders = [];

        this.interactiveElements.forEach(e => {
            this.disposeObject(e);
            this.scene.remove(e);
        });
        this.interactiveElements = [];

        this.buildingLocks.forEach((lock) => {
            this.disposeObject(lock);
            this.scene.remove(lock);
        });
        this.buildingLocks.clear();

        spriteGenerator.dispose();
    }
}
