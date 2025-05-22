import * as THREE from 'three';

export class Camera {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        
        // Use orthographic camera for a true top-down view like in Zelda: ALTTP
        this.setupOrthographicCamera();
        
        // Event listeners
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }
    
    setupOrthographicCamera() {
        // Orthographic camera provides a flat, top-down view without perspective distortion
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 20;
        
        this.camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,  // left
            frustumSize * aspect / 2,   // right
            frustumSize / 2,            // top
            frustumSize / -2,           // bottom
            1,                         // near
            1000                       // far
        );
        
        this.camera.position.set(0, 20, 0); // Position directly above
        this.camera.lookAt(0, 0, 0);        // Look straight down
    }

    onWindowResize() {
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 20;
        
        this.camera.left = frustumSize * aspect / -2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = frustumSize / -2;
        
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    update(position) {
        // Follow the player from above, maintaining the top-down view
        this.camera.position.x = position.x;
        this.camera.position.z = position.z;
        
        // Always look down at the player's position
        this.camera.lookAt(position.x, 0, position.z);
    }
    
    zoomIn() {
        // Adjust camera zoom for a closer view
        this.camera.zoom += 0.1;
        this.camera.updateProjectionMatrix();
    }
    
    zoomOut() {
        // Adjust camera zoom for a wider view
        this.camera.zoom -= 0.1;
        this.camera.updateProjectionMatrix();
    }

    getCamera() {
        return this.camera;
    }
}