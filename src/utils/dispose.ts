import * as THREE from 'three';

function disposeMaterialMaps(material: THREE.Material): void {
  const keys = [
    'map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap',
    'envMap', 'alphaMap', 'aoMap', 'displacementMap',
    'emissiveMap', 'gradientMap', 'metalnessMap', 'roughnessMap'
  ];
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(material, key)) continue;
    const desc = Object.getOwnPropertyDescriptor(material, key);
    const value = desc ? desc.value : undefined;
    if (value && typeof value === 'object' && value !== null && 'dispose' in value) {
      const disposeFn = Reflect.get(value, 'dispose');
      if (typeof disposeFn === 'function') {
        disposeFn.call(value);
      }
    }
  }
  material.dispose();
}

/** Dispose geometry/material maps on a scene object tree node. */
export function disposeObject3D(object: THREE.Object3D): void {
  if (object instanceof THREE.Mesh) {
    object.geometry?.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (material) disposeMaterialMaps(material);
    }
  }
  for (const child of [...object.children]) {
    disposeObject3D(child);
    object.remove(child);
  }
}
