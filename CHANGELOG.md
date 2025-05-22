# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### TO-DO
- Convert world boundaries to 2D sprites/tiles.
- Implement SNES-style 2D sprites for enemies.
- Consider a tilemap system for terrain for better variety and performance.
- add a MRR bar to the top
- add talking and text
- add 


### Added
- Texture loading (`THREE.TextureLoader`) for 2D game assets.
- Directional 2D sprites for the player character (up, down, left, right).
- 2D sprites for terrain (grass, path), house, trees, chests, and gems.
- Collision properties (`width`, `depth`) to 2D sprite-based game objects.
- Collidable objects (table, chairs, NPCs) to the building interior scene.
- Building interior scene that matches a provided image.
- Functionality to enter and exit buildings.
- Player collision with interior walls.
- Callback system for `Player` to notify `Game` when exiting a building to restore the main world.
- `CHANGELOG.md` to track project changes.

### Changed
- **Overall Style:** Initiated conversion of the game from a 3D aesthetic to a 2D SNES-style (e.g., "The Legend of Zelda: A Link to the Past").
- **Rendering:** Game elements (terrain, house, trees, player, items) now rendered as 2D sprites on `THREE.PlaneGeometry` instead of 3D geometries.
- **Textures:** Applied `THREE.NearestFilter` to all 2D textures for a crisp, pixelated look.
- **Asset Paths:** Updated texture asset paths to reflect their new location in `public/assets/textures/`.
- **Sprites Orientation:** All 2D sprites (player, trees, house, items) rotated to be flat on the XZ plane and Y-positions adjusted for correct layering.
- **Player:**
    - Player character model replaced with a 2D sprite.
    - Player movement logic now updates the sprite based on direction.
    - Player collision logic, camera follow behavior, and Y-positions for building entry/exit adjusted for the 2D sprite.
    - Player sprite size increased.
- **Interactive Elements:**
    - Chests and Gems converted to use 2D sprites.
    - Gem animation updated to rotate around its Z-axis (as it's flat on XZ) and float appropriately.
    - Chest and Gem sprite sizes increased.
- **Enemies:** Temporarily removed all enemies from the game.
- When entering a building, the scene background changes.
- Player character is now correctly re-added to the main world scene after exiting a building.
- Game logic in `Game.js` now handles transitions between the main world and building interiors, including lighting and enemy management.

### Fixed
- Initial camera orientation that caused the map to appear upside-down briefly on load.
- Gem sprites flickering and disappearing due to Z-fighting with the ground/path during their floating animation.
- Player character visibility issues in the main world after exiting a building.
- Collision detection logic to use appropriate obstacles based on whether the player is in a building or the main world.
- Ensured player mesh is added to the scene on initial game load.

