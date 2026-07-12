import type * as THREE from 'three';

/** Mesh with game-specific custom fields attached at runtime. */
export type GameMesh = THREE.Mesh & {
  width?: number;
  depth?: number;
};

export type GameObject3D = THREE.Object3D & {
  width?: number;
  depth?: number;
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material | THREE.Material[];
  isLight?: boolean;
  isMesh?: boolean;
};

export type BuildingData = {
  type?: string;
  name?: string;
  position: THREE.Vector3;
  width?: number;
  depth?: number;
  mesh?: GameMesh;
  locked?: boolean;
  userData?: Record<string, unknown>;
};

export type NPCData = {
  id?: string;
  name?: string;
  mesh?: THREE.Object3D;
  position?: THREE.Vector3;
  characterId?: string;
  userData?: Record<string, unknown>;
};

export type InteractiveElement = GameObject3D;

export type PlayerStats = {
  dau: number;
  mrr: number;
  funding?: number;
  runway?: number;
  health?: number;
  maxHealth?: number;
  teamSize?: number;
  morale?: number;
  [key: string]: number | undefined;
};

export type LevelRequirement = {
  building?: string;
  minDau?: number;
  minMrr?: number;
  name?: string;
  description?: string;
  levelNumber?: number;
  requiredLevel?: string | null;
  stats?: Record<string, number>;
  [key: string]: unknown;
};

export type InventoryItem = {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  type?: string;
  parent?: unknown;
};

export type PauseSettings = {
  masterVolume?: number;
  musicVolume?: number;
  sfxVolume?: number;
  muted?: boolean;
};

export type SimulatorOption = {
  id?: string;
  text?: string;
  label?: string;
  name?: string;
  action?: string;
  effects?: Record<string, number>;
  nextDialogue?: string;
  target?: string;
  targetNPC?: string;
  hint?: string;
  flag?: string;
  score?: number;
  // Level-specific choice fields (loose by design)
  [key: string]: string | number | boolean | string[] | Record<string, number> | undefined;
};

export type SimulatorLevel = {
  id?: number;
  name?: string;
  goal?: number;
  rounds?: number;
  choices?: SimulatorOption[];
  progressUnit?: string;
  description?: string;
};

export type RandomEvent = {
  id?: string;
  type?: string;
  text?: string;
  message?: string;
  effects?: Record<string, number>;
};

export type DialogueChoice = {
  text?: string;
  next?: string;
  action?: string;
  nextDialogue?: string;
  target?: string;
  targetNPC?: string;
  hint?: string;
  flag?: string;
  lines?: string[];
  name?: string;
  [key: string]: string | number | boolean | string[] | undefined;
};

export type DialogueDef = {
  lines: string[];
  repeatable?: boolean;
  requirements?: string[];
  unlocks?: string[];
  choices?: DialogueChoice[];
  id?: string;
};

export type CharacterDef = {
  name: string;
  dialogues: Record<string, DialogueDef>;
};

export type DialogueData = {
  settings?: Record<string, unknown>;
  characters: Record<string, CharacterDef>;
  global_dialogues?: Record<string, Record<string, DialogueDef | unknown>>;
  random_dialogues?: Record<string, string[]>;
  conditional_dialogues?: {
    player_stats?: Record<string, { lines: string[] }>;
  };
  dialogue_chains?: Record<string, { steps: Array<{ npc: string; dialogue: string }> }>;
};

export type EnemyTypeDef = {
  speed: number;
  color: number;
  size: number;
  health: number;
  movementPattern: string;
};

export type EnemyInstance = THREE.Mesh & {
  type?: string;
  health?: number;
  speed?: number;
  movementPattern?: string;
};

export function isMesh(obj: THREE.Object3D): obj is THREE.Mesh {
  if (!('isMesh' in obj)) return false;
  const candidate: unknown = obj.isMesh;
  return candidate === true;
}

export function isGameMesh(obj: THREE.Object3D): obj is GameMesh {
  return isMesh(obj);
}

export function isKeyboardEvent(e: Event): e is KeyboardEvent {
  return 'key' in e;
}

export function isTouchEvent(e: Event): e is TouchEvent {
  return 'touches' in e;
}

export function isHTMLInputElement(el: EventTarget | null): el is HTMLInputElement {
  return el instanceof HTMLInputElement;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
