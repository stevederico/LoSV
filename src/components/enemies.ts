import * as THREE from 'three';

function geomSize(geometry: THREE.BufferGeometry | undefined): { width: number; height: number; depth: number } {
    if (!geometry) return { width: 1, height: 1, depth: 1 };
    if (geometry instanceof THREE.BoxGeometry) {
        const p = geometry.parameters;
        return { width: p.width, height: p.height, depth: p.depth };
    }
    if (geometry instanceof THREE.PlaneGeometry) {
        const p = geometry.parameters;
        return { width: p.width, height: p.height, depth: 0.1 };
    }
    return { width: 1, height: 1, depth: 1 };
}


export class Enemies {
    scene: THREE.Scene;
    world: import('./world').World;
    enemies: import('../types').EnemyInstance[];
    enemyTypes: Record<string, import('../types').EnemyTypeDef>;
    spawnTimer: number;
    spawnRate: number;
    constructor(scene: THREE.Scene, world: import("./world").World) {
        this.scene = scene;
        this.world = world;
        this.enemies = [];
        this.enemyTypes = {
            octorok: {
                speed: 0.03,
                color: 0xff0000,
                size: 0.8,
                health: 2,
                movementPattern: 'random' // random, chase, patrol
            },
            moblin: {
                speed: 0.02,
                color: 0x8B4513,
                size: 1.2,
                health: 4,
                movementPattern: 'chase'
            },
            keese: {
                speed: 0.05,
                color: 0x333333,
                size: 0.6,
                health: 1,
                movementPattern: 'erratic'
            }
        };
        
        // Enemy spawn timer
        this.spawnTimer = 0;
        this.spawnRate = 300; // Frames between spawns
        
        // Initialize enemies
        // this.initEnemies(); // Commented out to remove initial enemies
    }
    
    initEnemies() {
        // Add a few enemies to start
        // this.spawnEnemy('octorok', new THREE.Vector3(5, 0, -8));
        // this.spawnEnemy('octorok', new THREE.Vector3(-10, 0, 12));
        // this.spawnEnemy('moblin', new THREE.Vector3(8, 0, 8));
        // this.spawnEnemy('keese', new THREE.Vector3(-5, 0, -5));
    }

    spawnEnemy(type: string, position: THREE.Vector3) {
        const enemyType = this.enemyTypes[type];
        if (!enemyType) return;
        
        // Create enemy mesh based on type
        const geometry = new THREE.BoxGeometry(
            enemyType.size, 
            enemyType.size * 1.5, 
            enemyType.size
        );
        const material = new THREE.MeshBasicMaterial({ color: enemyType.color });
        const enemy = new THREE.Mesh(geometry, material);
        
        // Set initial position
        enemy.position.copy(position);
        enemy.position.y = enemyType.size * 0.75; // Set height based on size
        
        // Store enemy properties
        enemy.userData = {
            type: type,
            health: enemyType.health,
            speed: enemyType.speed,
            movementPattern: enemyType.movementPattern,
            direction: new THREE.Vector3(
                Math.random() - 0.5,
                0,
                Math.random() - 0.5
            ).normalize(),
            directionChangeTime: 0,
            lastPosition: position.clone()
        };
        
        this.scene.add(enemy);
        this.enemies.push(enemy);
        
        return enemy;
    }
    
    moveRandomly(enemy: import("../types").EnemyInstance) {
        // Change direction occasionally
        enemy.userData.directionChangeTime--;
        if (enemy.userData.directionChangeTime <= 0) {
            enemy.userData.direction = new THREE.Vector3(
                Math.random() - 0.5,
                0,
                Math.random() - 0.5
            ).normalize();
            enemy.userData.directionChangeTime = Math.floor(Math.random() * 100) + 50;
        }
        
        // Move in current direction
        const moveAmount = enemy.userData.speed;
        const newPosition = enemy.position.clone().add(
            enemy.userData.direction.clone().multiplyScalar(moveAmount)
        );
        
        // Store last position for collision reversion
        enemy.userData.lastPosition = enemy.position.clone();
        
        // Update position
        enemy.position.copy(newPosition);
    }
    
    moveChase(enemy: import("../types").EnemyInstance, playerPosition: THREE.Vector3) {
        // Move toward player
        const direction = new THREE.Vector3();
        direction.subVectors(playerPosition, enemy.position).normalize();
        
        // Store last position for collision reversion
        enemy.userData.lastPosition = enemy.position.clone();
        
        // Move in direction of player
        enemy.position.add(direction.multiplyScalar(enemy.userData.speed));
    }
    
    moveErratic(enemy: import("../types").EnemyInstance) {
        // Change direction frequently with sudden movements
        enemy.userData.directionChangeTime--;
        if (enemy.userData.directionChangeTime <= 0) {
            enemy.userData.direction = new THREE.Vector3(
                Math.random() - 0.5,
                0,
                Math.random() - 0.5
            ).normalize();
            enemy.userData.directionChangeTime = Math.floor(Math.random() * 30) + 10;
        }
        
        // Store last position
        enemy.userData.lastPosition = enemy.position.clone();
        
        // Move with varying speed
        const speedVariation = Math.sin(Date.now() * 0.005) * 0.5 + 1;
        enemy.position.add(
            enemy.userData.direction.clone()
                .multiplyScalar(enemy.userData.speed * speedVariation)
        );
    }
    
    checkCollisions() {
        const obstacles = this.world ? this.world.getObstacles() : [];
        
        this.enemies.forEach((enemy: import("../types").EnemyInstance) => {
            // Check collision with world boundaries
            const worldSize = this.world ? this.world.worldSize / 2 : 25;
            if (
                Math.abs(enemy.position.x) > worldSize - 1 ||
                Math.abs(enemy.position.z) > worldSize - 1
            ) {
                // Revert to last position and change direction
                enemy.position.copy(enemy.userData.lastPosition);
                enemy.userData.direction.negate();
                enemy.userData.directionChangeTime = 0;
            }
            
            // Check collision with obstacles
            for (const obstacle of obstacles) {
                // Simple distance-based collision
                const distance = enemy.position.distanceTo(obstacle.position);
                const minDistance = geomSize(enemy.geometry).width / 2 + 
                                   geomSize(obstacle.geometry).width / 2;
                
                if (distance < minDistance) {
                    // Revert to last position and change direction
                    enemy.position.copy(enemy.userData.lastPosition);
                    enemy.userData.direction.negate();
                    enemy.userData.directionChangeTime = 0;
                    break;
                }
            }
            
            // Check collision with other enemies
            for (const otherEnemy of this.enemies) {
                if (enemy === otherEnemy) continue;
                
                const distance = enemy.position.distanceTo(otherEnemy.position);
                const minDistance = geomSize(enemy.geometry).width / 2 + 
                                   geomSize(otherEnemy.geometry).width / 2;
                
                if (distance < minDistance) {
                    // Push both enemies away from each other
                    const pushDirection = new THREE.Vector3()
                        .subVectors(enemy.position, otherEnemy.position)
                        .normalize();
                    
                    enemy.position.add(pushDirection.clone().multiplyScalar(0.1));
                    otherEnemy.position.add(pushDirection.clone().multiplyScalar(-0.1));
                    
                    // Change directions
                    enemy.userData.directionChangeTime = 0;
                    otherEnemy.userData.directionChangeTime = 0;
                }
            }
        });
    }
    
    takeDamage(enemy: import("../types").EnemyInstance, damage: number) {
        enemy.userData.health -= damage;
        
        // Flash the enemy red when hit
        const originalColor = (enemy.material instanceof THREE.MeshBasicMaterial ? enemy.material.color.clone() : new THREE.Color());
        if (enemy.material instanceof THREE.MeshBasicMaterial) enemy.material.color.set(0xffffff);
        
        setTimeout(() => {
            if (enemy.material instanceof THREE.MeshBasicMaterial) enemy.material.color.copy(originalColor);
        }, 100);
        
        // Check if enemy is defeated
        if (enemy.userData.health <= 0) {
            this.removeEnemy(enemy);
        }
    }

    removeEnemy(enemy: import("../types").EnemyInstance) {
        this.scene.remove(enemy);
        const index = this.enemies.indexOf(enemy);
        if (index !== -1) {
            this.enemies.splice(index, 1);
        }
    }
    
    checkSpawn() {
        // this.spawnTimer++; // Commented out to prevent new spawns
        
        // Spawn new enemies occasionally if there aren't too many
        // if (this.spawnTimer >= this.spawnRate && this.enemies.length < 10) { // Commented out
            // this.spawnTimer = 0;
            
            // Choose a random enemy type
            // const types = Object.keys(this.enemyTypes);
            // const randomType = types[Math.floor(Math.random() * types.length)];
            
            // Choose a position away from the player
            // const angle = Math.random() * Math.PI * 2;
            // const distance = 15 + Math.random() * 10; // Spawn 15-25 units away
            // const spawnPosition = new THREE.Vector3(
            //     Math.cos(angle) * distance,
            //     0,
            //     Math.sin(angle) * distance
            // );
            
            // Spawn the enemy
            // this.spawnEnemy(randomType, spawnPosition);
        // } // Commented out
    }

    update(playerPosition: THREE.Vector3) {
        // Check if we should spawn new enemies
        // this.checkSpawn(); // Commented out
        
        // Update each enemy
        this.enemies.forEach((enemy: import("../types").EnemyInstance) => {
            // Move based on movement pattern
            switch(enemy.userData.movementPattern) {
                case 'chase':
                    this.moveChase(enemy, playerPosition);
                    break;
                case 'erratic':
                    this.moveErratic(enemy);
                    break;
                case 'random':
                default:
                    this.moveRandomly(enemy);
                    break;
            }
            
            // Enemies always face their movement direction
            if (enemy.userData.direction) {
                const angle = Math.atan2(
                    enemy.userData.direction.x,
                    enemy.userData.direction.z
                );
                enemy.rotation.y = angle;
            }
        });
        
        // Check collisions after movement
        this.checkCollisions();
    }
}