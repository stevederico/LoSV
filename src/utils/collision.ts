import * as THREE from 'three';

// Check collision between objects using bounding boxes
export function checkCollision(object1: THREE.Object3D, object2: THREE.Object3D): boolean {
    const box1 = new THREE.Box3().setFromObject(object1);
    const box2 = new THREE.Box3().setFromObject(object2);

    return box1.intersectsBox(box2);
}

// Check if a position collides with any objects in the obstacles array
export function checkPositionCollision(
    position: THREE.Vector3,
    obstacles: THREE.Object3D[]
): boolean {
    // Create a small box around the position
    const tempBox = new THREE.Box3(
        new THREE.Vector3(position.x - 0.4, position.y - 0.4, position.z - 0.4),
        new THREE.Vector3(position.x + 0.4, position.y + 0.4, position.z + 0.4)
    );

    // Check against all obstacles
    for (const obstacle of obstacles) {
        if (!('geometry' in obstacle) || !obstacle.geometry) continue;

        const obstacleBox = new THREE.Box3().setFromObject(obstacle);

        if (tempBox.intersectsBox(obstacleBox)) {
            return true;
        }
    }

    return false;
}

// Simple physics-based collision resolution
export function resolveCollision(object1: THREE.Object3D, object2: THREE.Object3D): THREE.Vector3 {
    const box1 = new THREE.Box3().setFromObject(object1);
    const box2 = new THREE.Box3().setFromObject(object2);

    const center1 = new THREE.Vector3();
    const center2 = new THREE.Vector3();
    box1.getCenter(center1);
    box2.getCenter(center2);

    const direction = center1.clone().sub(center2).normalize();

    const size1 = new THREE.Vector3();
    const size2 = new THREE.Vector3();
    box1.getSize(size1).multiplyScalar(0.5);
    box2.getSize(size2).multiplyScalar(0.5);

    const overlapX = size1.x + size2.x - Math.abs(center1.x - center2.x);
    const overlapY = size1.y + size2.y - Math.abs(center1.y - center2.y);
    const overlapZ = size1.z + size2.z - Math.abs(center1.z - center2.z);

    let overlap = overlapX;
    let axis: 'x' | 'y' | 'z' = 'x';

    if (overlapY < overlap) {
        overlap = overlapY;
        axis = 'y';
    }

    if (overlapZ < overlap) {
        overlap = overlapZ;
        axis = 'z';
    }

    const pushVector = new THREE.Vector3();
    pushVector[axis] = direction[axis] * overlap;

    object1.position.add(pushVector);

    return pushVector;
}

// Detect if two circles overlap (for simpler collision detection)
export function circleOverlap(
    x1: number,
    z1: number,
    r1: number,
    x2: number,
    z2: number,
    r2: number
): boolean {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const distance = Math.sqrt(dx * dx + dz * dz);
    return distance < (r1 + r2);
}
