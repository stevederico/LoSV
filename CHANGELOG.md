# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### TO-DO

- add talking and text
- start the character inside the house, remvove the trees. the dialog with the NPC should ask a question what is your favorite color? give two options Red or Blue have an arrow and allow the player to select the color, the NPC should respond and say they love the color selected
- Consider a tilemap system for terrain for better variety and performance.
- Convert world boundaries to 2D sprites/tiles.

### Changes

- Added `CHANGELOG.md` to track project changes.
- **Overall Style:** Initiated conversion of the game from a 3D aesthetic to a 2D SNES-style (e.g., "The Legend of Zelda: A Link to the Past").
- **Rendering:** Game elements (terrain, house, trees, player, items) now rendered as 2D sprites on `THREE.PlaneGeometry` instead of 3D geometries.
- **Textures:** Applied `THREE.NearestFilter` to all 2D textures for a crisp, pixelated look.
- **Asset Paths:** Updated texture asset paths to reflect their new location in `public/assets/textures/`.
- Added texture loading (`THREE.TextureLoader`) for 2D game assets.
- Added directional 2D sprites for the player character (up, down, left, right).
- Added 2D sprites for terrain (grass, path), house, trees, chests, and gems.
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
- Added collision properties (`width`, `depth`) to 2D sprite-based game objects.
- Fixed initial camera orientation that caused the map to appear upside-down briefly on load.
- Fixed gem sprites flickering and disappearing due to Z-fighting with the ground/path during their floating animation.
- **Enemies:** Temporarily removed all enemies from the game.
- Added collidable objects (table, chairs, NPCs) to the building interior scene.
- Added building interior scene that matches a provided image.
- Added functionality to enter and exit buildings.
- Added player collision with interior walls.
- When entering a building, the scene background changes.
- Fixed player character visibility issues in the main world after exiting a building.
- Player character is now correctly re-added to the main world scene after exiting a building.
- Added callback system for `Player` to notify `Game` when exiting a building to restore the main world.
- Game logic in `Game.js` now handles transitions between the main world and building interiors, including lighting and enemy management.
- Fixed collision detection logic to use appropriate obstacles based on whether the player is in a building or the main world.
- Fixed ensured player mesh is added to the scene on initial game load.
- ~~add a menu bar with MRR and DAU counters~~ (Completed)
- **New Buildings:** Added 6 additional buildings to the game world:
  - **Data Center**: High-tech server room with server racks, cooling units, and network equipment. Features cyan tech specialist NPC.
  - **Conference**: Professional boardroom with large conference table, executive chairs, presentation screen, and podium. Features brown business professional NPC.
  - **Loft**: Modern creative space with concrete floors, sectional sofa, kitchen island, bar stools, and art easel. Features orange artist NPC.
  - **Accelerator**: Innovation hub with circular collaboration pods, workstations, innovation wall, and prototype workbench. Features royal blue startup mentor NPC.
  - **Law**: Professional legal office with marble floors, mahogany desk, law bookshelves, client chairs, filing cabinets, and golden scales of justice. Features dark navy lawyer NPC.
  - **Nasdaq**: Financial trading floor with trading desks, market display screens, server towers, and golden trading podium. Features green trader NPC.
- **Building System Enhancements:**
  - Dynamic room depth tracking for proper exit functionality across all building types.
  - Extended world path system to accommodate 9 total buildings.
  - Unique interior designs with thematic furniture, equipment, and atmospheric lighting for each building.
  - Interactive NPCs in each building with placeholder dialogue (3 lines each).
