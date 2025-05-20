import * as THREE from 'three';

// Check collision between objects using bounding boxes
export function checkCollision(object1, object2) {
    const box1 = new THREE.Box3().setFromObject(object1);
    const box2 = new THREE.Box3().setFromObject(object2);
    
    return box1.intersectsBox(box2);
}

// Check if a position collides with any objects in the obstacles array
export function checkPositionCollision(position, obstacles) {
    // Create a small box around the position
    const tempBox = new THREE.Box3(
        new THREE.Vector3(position.x - 0.4, position.y - 0.4, position.z - 0.4),
        new THREE.Vector3(position.x + 0.4, position.y + 0.4, position.z + 0.4)
    );
    
    // Check against all obstacles
    for (const obstacle of obstacles) {
        if (!obstacle.geometry) continue; // Skip if no geometry
        
        const obstacleBox = new THREE.Box3().setFromObject(obstacle);
        
        if (tempBox.intersectsBox(obstacleBox)) {
            return true; // Collision detected
        }
    }
    
    return false; // No collision
}

// Simple physics-based collision resolution
export function resolveCollision(object1, object2) {
    const box1 = new THREE.Box3().setFromObject(object1);
    const box2 = new THREE.Box3().setFromObject(object2);
    
    // Calculate penetration depth and direction
    const center1 = new THREE.Vector3();
    const center2 = new THREE.Vector3();
    box1.getCenter(center1);
    box2.getCenter(center2);
    
    // Direction from object2 to object1
    const direction = center1.clone().sub(center2).normalize();
    
    // Calculate penetration depth along each axis
    const size1 = new THREE.Vector3();
    const size2 = new THREE.Vector3();
    box1.getSize(size1).multiplyScalar(0.5);
    box2.getSize(size2).multiplyScalar(0.5);
    
    const overlapX = size1.x + size2.x - Math.abs(center1.x - center2.x);
    const overlapY = size1.y + size2.y - Math.abs(center1.y - center2.y);
    const overlapZ = size1.z + size2.z - Math.abs(center1.z - center2.z);
    
    // Find minimum overlap axis
    let overlap = overlapX;
    let axis = 'x';
    
    if (overlapY < overlap) {
        overlap = overlapY;
        axis = 'y';
    }
    
    if (overlapZ < overlap) {
        overlap = overlapZ;
        axis = 'z';
    }
    
    // Push object1 away from object2 in the direction of minimum overlap
    const pushVector = new THREE.Vector3();
    pushVector[axis] = direction[axis] * overlap;
    
    // Apply push to object1's position
    object1.position.add(pushVector);
    
    return pushVector;
}

// Detect if two circles overlap (for simpler collision detection)
export function circleOverlap(x1, z1, r1, x2, z2, r2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const distance = Math.sqrt(dx * dx + dz * dz);
    return distance < (r1 + r2);
}