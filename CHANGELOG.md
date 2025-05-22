# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Building interior scene that matches a provided image.
- Functionality to enter and exit buildings.
- Player collision with interior walls.
- Callback system for `Player` to notify `Game` when exiting a building to restore the main world.
- `CHANGELOG.md` to track project changes.

### Changed
- When entering a building, the scene background changes.
- Player character is now correctly re-added to the main world scene after exiting a building.
- Game logic in `Game.js` now handles transitions between the main world and building interiors, including lighting and enemy management.

### Fixed
- Player character visibility issues in the main world after exiting a building.
- Collision detection logic to use appropriate obstacles based on whether the player is in a building or the main world.
- Ensured player mesh is added to the scene on initial game load.

