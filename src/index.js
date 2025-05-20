import { Game } from './game.js';

// Add loading screen
const loadingScreen = document.createElement('div');
loadingScreen.style.position = 'fixed';
loadingScreen.style.top = '0';
loadingScreen.style.left = '0';
loadingScreen.style.width = '100%';
loadingScreen.style.height = '100%';
loadingScreen.style.backgroundColor = '#000';
loadingScreen.style.color = '#fff';
loadingScreen.style.display = 'flex';
loadingScreen.style.flexDirection = 'column';
loadingScreen.style.justifyContent = 'center';
loadingScreen.style.alignItems = 'center';
loadingScreen.style.zIndex = '999';
loadingScreen.style.fontFamily = 'Arial, sans-serif';

const title = document.createElement('h1');
title.textContent = 'THE LEGEND OF ZELDA';
title.style.marginBottom = '10px';
title.style.color = '#e4c025';
title.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';

const subtitle = document.createElement('h2');
subtitle.textContent = 'A Link to the Past Tribute';
subtitle.style.marginBottom = '30px';
subtitle.style.color = '#e4c025';
subtitle.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';

const loadingText = document.createElement('p');
loadingText.textContent = 'Loading...';

const loadingBar = document.createElement('div');
loadingBar.style.width = '300px';
loadingBar.style.height = '20px';
loadingBar.style.backgroundColor = '#333';
loadingBar.style.marginTop = '20px';
loadingBar.style.borderRadius = '10px';
loadingBar.style.overflow = 'hidden';

const loadingProgress = document.createElement('div');
loadingProgress.style.width = '0%';
loadingProgress.style.height = '100%';
loadingProgress.style.backgroundColor = '#e4c025';
loadingProgress.style.transition = 'width 0.5s';
loadingBar.appendChild(loadingProgress);

loadingScreen.appendChild(title);
loadingScreen.appendChild(subtitle);
loadingScreen.appendChild(loadingText);
loadingScreen.appendChild(loadingBar);
document.body.appendChild(loadingScreen);

// Simulate loading progress
let progress = 0;
const loadingInterval = setInterval(() => {
    progress += 5;
    loadingProgress.style.width = `${progress}%`;
    
    if (progress >= 100) {
        clearInterval(loadingInterval);
        setTimeout(() => {
            document.body.removeChild(loadingScreen);
            startGame();
        }, 500);
    }
}, 100);

// Initialize the game when loading is complete
function startGame() {
    // Create instruction overlay
    const instructions = document.createElement('div');
    instructions.style.position = 'absolute';
    instructions.style.top = '10px';
    instructions.style.left = '10px';
    instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    instructions.style.color = '#fff';
    instructions.style.padding = '10px';
    instructions.style.fontFamily = 'Arial, sans-serif';
    instructions.style.fontSize = '14px';
    instructions.style.borderRadius = '5px';
    instructions.style.maxWidth = '300px';
    instructions.style.zIndex = '10';
    instructions.innerHTML = `
        <h3>Controls:</h3>
        <p>Arrow Keys/WASD: Move Link</p>
        <p>Space/Z/Enter: Action</p>
        <p>+/-: Zoom in/out</p>
    `;
    document.body.appendChild(instructions);
    
    // Create game instance to start the game
    const game = new Game();
    console.log('Game initialized!');
    
    // Hide instructions after 10 seconds
    setTimeout(() => {
        instructions.style.opacity = '0';
        instructions.style.transition = 'opacity 1s';
        setTimeout(() => {
            document.body.removeChild(instructions);
        }, 1000);
    }, 10000);
}