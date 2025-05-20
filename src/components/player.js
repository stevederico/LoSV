import * as THREE from 'three';

export class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.speed = 0.1;
        this.position = new THREE.Vector3(0, 0, 0);
        this.direction = 'down'; // down, up, left, right
        this.isMoving = false;
        this.animationFrame = 0;
        this.animationSpeed = 8; // frames before changing sprite
        this.frameCount = 0;
        this.mesh = this.createPlayerMesh();
        this.scene.add(this.mesh);
    }

    createPlayerMesh() {
        // In a real implementation, we would load Link's sprite sheet
        // For now, create a simple colored box as placeholder
        const geometry = new THREE.BoxGeometry(0.8, 1.6, 0.8);
        const material = new THREE.MeshBasicMaterial({ color: 0x44aa88 }); // Link's green tunic color
        const mesh = new THREE.Mesh(geometry, material);
        
        // Create a simple directional indicator (front side of player)
        const indicatorGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const indicatorMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        this.indicator.position.set(0, 0, 0.5);
        mesh.add(this.indicator);
        
        return mesh;
    }

    updateDirection(newDirection) {
        this.direction = newDirection;
        
        // Update the indicator based on direction
        this.indicator.position.set(0, 0, 0); // Reset position
        switch(this.direction) {
            case 'down':
                this.indicator.position.set(0, 0, 0.5);
                break;
            case 'up':
                this.indicator.position.set(0, 0, -0.5);
                break;
            case 'left':
                this.indicator.position.set(-0.5, 0, 0);
                break;
            case 'right':
                this.indicator.position.set(0.5, 0, 0);
                break;
        }
    }

    update(keys, obstacles = []) {
        // Reset movement
        this.isMoving = false;
        const moveVector = new THREE.Vector3(0, 0, 0);
        
        // Determine movement and direction
        if (keys['ArrowUp'] || keys['w']) {
            moveVector.z -= this.speed;
            this.updateDirection('up');
            this.isMoving = true;
        }
        else if (keys['ArrowDown'] || keys['s']) {
            moveVector.z += this.speed;
            this.updateDirection('down');
            this.isMoving = true;
        }
        else if (keys['ArrowLeft'] || keys['a']) {
            moveVector.x -= this.speed;
            this.updateDirection('left');
            this.isMoving = true;
        }
        else if (keys['ArrowRight'] || keys['d']) {
            moveVector.x += this.speed;
            this.updateDirection('right');
            this.isMoving = true;
        }

        // Update animation
        if (this.isMoving) {
            this.frameCount++;
            if (this.frameCount >= this.animationSpeed) {
                this.frameCount = 0;
                this.animationFrame = (this.animationFrame + 1) % 2;
                // In a real game, update the sprite texture based on animationFrame
            }
        }

        // Check for collisions with obstacles before moving
        if (this.isMoving && obstacles && obstacles.length > 0) {
            const tempPosition = this.position.clone().add(moveVector);
            const playerBounds = {
                minX: tempPosition.x - 0.4,
                maxX: tempPosition.x + 0.4,
                minZ: tempPosition.z - 0.4,
                maxZ: tempPosition.z + 0.4
            };
            let collision = false;
            for (const obstacle of obstacles) {
                const obstacleBounds = {
                    minX: obstacle.position.x - obstacle.width / 2,
                    maxX: obstacle.position.x + obstacle.width / 2,
                    minZ: obstacle.position.z - obstacle.depth / 2,
                    maxZ: obstacle.position.z + obstacle.depth / 2
                };
                if (playerBounds.maxX > obstacleBounds.minX &&
                    playerBounds.minX < obstacleBounds.maxX &&
                    playerBounds.maxZ > obstacleBounds.minZ &&
                    playerBounds.minZ < obstacleBounds.maxZ) {
                    collision = true;
                    if (obstacle.userData && obstacle.userData.isBuilding) {
                        this.enterBuilding(obstacle);  // Automatically enter on collision
                    }
                    break;
                }
            }
            if (!collision) {
                this.position.add(moveVector);
            }
        } else {
            this.position.add(moveVector);
        }
        
        this.mesh.position.copy(this.position);
        
        if (this.camera) {
            if (this.camera.position) {
                this.camera.position.set(this.position.x, this.position.y + 10, this.position.z);
                this.camera.lookAt(this.position);
            }
        }
        
        this.enterBuilding = function(building) {
            if (Math.abs(building.position.x - 10) < 1 && Math.abs(building.position.z + 10) < 1) {  // Check for first building at (10, -10)
                // Clear current scene
                while (this.scene.children.length > 0) {
                    this.scene.remove(this.scene.children[0]);
                }
                // Add simple home interior: four walls and a floor
                const floorGeometry = new THREE.PlaneGeometry(10, 10);
                const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });  // Brown for wooden floor
                const floor = new THREE.Mesh(floorGeometry, floorMaterial);
                floor.rotation.x = -Math.PI / 2;
                this.scene.add(floor);
                
                const wallGeometry = new THREE.BoxGeometry(10, 3, 0.1);  // Long wall
                const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 });  // Wood color
                const wall1 = new THREE.Mesh(wallGeometry, wallMaterial);  // Back wall
                wall1.position.set(0, 1.5, -5);
                this.scene.add(wall1);
                
                const wall2 = new THREE.Mesh(wallGeometry, wallMaterial);  // Front wall with door
                wall2.position.set(0, 1.5, 5);
                this.scene.add(wall2);
                
                const sideWallGeometry = new THREE.BoxGeometry(0.1, 3, 10);  // Side wall
                const wall3 = new THREE.Mesh(sideWallGeometry, wallMaterial);  // Left wall
                wall3.position.set(-5, 1.5, 0);
                this.scene.add(wall3);
                
                const wall4 = new THREE.Mesh(sideWallGeometry, wallMaterial);  // Right wall
                wall4.position.set(5, 1.5, 0);
                this.scene.add(wall4);
                
                console.log('Entered home interior');
            } else {
                console.log('Entered a generic building');
                alert('Entered a generic building!');
            }
        };
    }
    
    getPosition() {
        return this.position;
    }
    
    getMesh() {
        return this.mesh;
    }
}
