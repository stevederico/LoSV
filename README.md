<img width="1023" height="1027" alt="screenshot" src="https://github.com/user-attachments/assets/dd4165b4-bfb3-4bb7-9248-91d540d1a02b" />
# Zelda Tribute Game


This project is a tribute to the classic game "The Legend of Zelda: A Link to the Past" using Three.js. The game features a top-down perspective, allowing players to explore a vibrant world filled with challenges, enemies, and treasures.

## Project Structure

- **src/**: Contains the main source code for the game.
  - **index.js**: Entry point of the game. Initializes the Three.js scene and starts the game loop.
  - **game.js**: Manages overall game logic, including asset loading and game state updates.
  - **assets/**: Contains all game assets.
    - **models/**: 3D models for characters and environment objects.
    - **textures/**: Texture files for models, providing visual details.
    - **audio/**: Audio files for sound effects and background music.
  - **components/**: Contains various game components.
    - **player.js**: Handles player movement, animations, and interactions.
    - **world.js**: Manages the game environment, including terrain and obstacles.
    - **camera.js**: Controls the camera's position and perspective.
    - **controls.js**: Manages user input for character movement and actions.
    - **enemies.js**: Handles enemy behavior and interactions with the player.
  - **utils/**: Utility functions for the game.
    - **collision.js**: Functions for detecting and handling collisions.
    - **helpers.js**: Utility functions for loading assets and managing game state.

- **public/**: Contains public files for the game.
  - **index.html**: Main HTML file that includes the game canvas and links to JavaScript files.

- **package.json**: Configuration file for npm, listing dependencies and scripts.

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```
   cd zelda-tribute
   ```

3. Install the dependencies:
   ```
   npm install
   ```

4. Start the development server:
   ```
   npm start
   ```

5. Open your browser and go to `http://localhost:3000` to play the game.

## Gameplay

Explore the world, defeat enemies, and solve puzzles as you embark on an adventure reminiscent of classic Zelda games. Collect items, unlock new areas, and enjoy the nostalgic experience!

## Contributing

Contributions are welcome! Feel free to submit a pull request or open an issue for any suggestions or improvements.
