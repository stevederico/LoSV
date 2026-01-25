# Changelog
All notable changes to this project will be documented in this file.
### TO-DO

0.1.0

Add board room building
  Add board room NPC
  Add dialogue choice system
  Add simulator integration callbacks



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
- **Loading Screen:** Enhanced loading.png image display with full-screen presentation, proper aspect ratio preservation using `objectFit: 'contain'`, centered positioning with black letterboxing, and improved progress bar with better margin/padding (20px padding, responsive width, rounded corners).
- **Scene Management:** Fixed visual clipping issue where house interior overlapped with main map when player starts in the house.
- **NPC System:** Converted NPC placeholders from rectangular sprites to triangular geometry using `THREE.BufferGeometry` for better visual distinction and game aesthetics.

### Completed Tasks
- ~~loading.png image on the loading screen~~ (Completed)
- ~~start the character inside the house.~~ (Completed)
- ~~NPC placeholder should be a triangle.~~ (Completed)
- ~~add a menu bar with MRR and DAU counters~~ (Completed)

## [0.2.0] - 2025-01-22

### Added
- **Startup Founder Simulator Integration:**
  - Created `StartupSimulator.js` class with complete 10-level startup journey
  - Implemented all 10 levels with 3 rounds each, following the exact game specification
  - Level progression: Product Ideation → MVP Development → Fundraising → Team Building → Go-to-Market → Scaling → Crisis Management → Series A → Corporate Governance → Exit Strategy
  - Dynamic scoring system with hidden scores (0-100) per choice
  - Progress tracking for each level with specific goals and units
  - Random events system (positive, negative, neutral) that affect gameplay
  - Player stats tracking: DAU, MRR, funding, team size, morale, runway

- **Simulator Dialogue System:**
  - Created `SimulatorDialogue.js` for SNES-style terminal interface
  - Green terminal text on black background with retro styling
  - Formatted display showing Level, Round, Objective, and Options
  - Progress bars showing goal completion
  - Score display after each choice
  - Random event notifications with color-coded borders
  - Level success/failure screens
  - Keyboard input (1, 2, 3) for option selection

- **Building-Level Integration:**
  - Mapped each building to its corresponding simulator level
  - House → Product Ideation
  - Garage → MVP Development
  - Accelerator → Fundraising
  - Loft → Team Building
  - Conference → Go-to-Market
  - Data Center → Scaling
  - Venture → Series A
  - Law → Corporate Governance
  - Nasdaq → Exit Strategy
  - Note: Board Room building needed for Crisis Management level

- **Enhanced Building Interiors:**
  - Unique furniture and obstacles for each building type
  - House: Table and bookshelf
  - Garage: Car and workbench
  - Accelerator: Desks and whiteboard
  - Loft: Art easels and couch
  - Conference: Conference table and chairs
  - Data Center: Server racks with blinking lights
  - Venture: Executive desk and leather chairs
  - Law: Bookshelves and desk with papers
  - Nasdaq: Trading terminals and stock ticker display

- **Game Stats Integration:**
  - DAU and MRR counters update based on simulator progress
  - Stats persist across building visits
  - Real-time updates during gameplay

### Fixed
- Fixed DAU/MRR display elements to properly update values
- Improved UI element selection for stats display
