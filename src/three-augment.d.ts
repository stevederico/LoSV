import 'three';

declare module 'three' {
  interface Object3D {
    /** Game-attached collider width (custom runtime field). */
    width?: number;
    /** Game-attached collider depth (custom runtime field). */
    depth?: number;
  }

  interface Mesh {
    width?: number;
    depth?: number;
  }
}

export {};
