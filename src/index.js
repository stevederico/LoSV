import { Game } from './game.js';

// Add loading screen
const loadingScreen = document.createElement('div');
loadingScreen.style.position = 'fixed';
loadingScreen.style.top = '0';
loadingScreen.style.left = '0';
loadingScreen.style.width = '100%';
loadingScreen.style.height = '100%';
loadingScreen.style.zIndex = '999';
loadingScreen.style.backgroundColor = '#000'; // Black background for letterboxing

// Add full screen loading image
const loadingImage = document.createElement('img');
loadingImage.src = '/assets/textures/loading.png';
loadingImage.style.position = 'absolute';
loadingImage.style.top = '50%';
loadingImage.style.left = '50%';
loadingImage.style.transform = 'translate(-50%, -50%)';
loadingImage.style.maxWidth = '100%';
loadingImage.style.maxHeight = '100%';
loadingImage.style.width = 'auto';
loadingImage.style.height = 'auto';
loadingImage.style.objectFit = 'contain'; // Maintain aspect ratio
loadingImage.style.imageRendering = 'pixelated'; // For crisp pixel art
loadingImage.style.imageRendering = '-moz-crisp-edges';
loadingImage.style.imageRendering = 'crisp-edges';

// Progress bar container
const progressContainer = document.createElement('div');
progressContainer.style.position = 'absolute';
progressContainer.style.bottom = '60px';
progressContainer.style.left = '50%';
progressContainer.style.transform = 'translateX(-50%)';
progressContainer.style.width = '80%';
progressContainer.style.maxWidth = '500px';
progressContainer.style.padding = '0 20px';
progressContainer.style.boxSizing = 'border-box';

const loadingBar = document.createElement('div');
loadingBar.style.width = '100%';
loadingBar.style.height = '24px';
loadingBar.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
loadingBar.style.borderRadius = '12px';
loadingBar.style.overflow = 'hidden';
loadingBar.style.border = '3px solid #fff';
loadingBar.style.padding = '2px';
loadingBar.style.boxSizing = 'border-box';

const loadingProgress = document.createElement('div');
loadingProgress.style.width = '0%';
loadingProgress.style.height = '100%';
loadingProgress.style.backgroundColor = '#e4c025';
loadingProgress.style.borderRadius = '8px';
loadingProgress.style.transition = 'width 0.5s ease-in-out';

loadingBar.appendChild(loadingProgress);
progressContainer.appendChild(loadingBar);
loadingScreen.appendChild(loadingImage);
loadingScreen.appendChild(progressContainer);
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
    // Add SNES-style font
    const fontStyle = document.createElement('style');
    fontStyle.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
    `;
    document.head.appendChild(fontStyle);

    // Create menu bar (SNES-style HUD)
    const menuBar = document.createElement('div');
    menuBar.id = 'menu-bar';
    menuBar.style.position = 'absolute';
    menuBar.style.top = '0';
    menuBar.style.left = '0';
    menuBar.style.width = '100%';
    menuBar.style.height = '50px';
    menuBar.style.backgroundColor = 'transparent';
    menuBar.style.color = '#fff';
    menuBar.style.display = 'flex';
    menuBar.style.alignItems = 'center';
    menuBar.style.justifyContent = 'space-between';
    menuBar.style.padding = '0 20px';
    menuBar.style.boxSizing = 'border-box';
    menuBar.style.fontFamily = '"Press Start 2P", "Courier New", monospace';
    menuBar.style.fontSize = '14px';
    menuBar.style.zIndex = '100';

    // Item slot
    const itemSlots = document.createElement('div');
    itemSlots.className = 'menu-item';
    itemSlots.innerHTML = ''; // Remove "ITEM" text
    menuBar.appendChild(itemSlots);

    // Middle section for DAU/MRR counters
    const statsContainer = document.createElement('div');
    statsContainer.className = 'menu-item';
    statsContainer.style.display = 'flex';
    statsContainer.style.flexDirection = 'row'; // Changed from column
    statsContainer.style.justifyContent = 'space-around'; // To space DAU and MRR
    statsContainer.style.alignItems = 'center'; 
    statsContainer.style.flexGrow = '1'; 
    
    // DAU Display
    const dauDisplay = document.createElement('div');
    dauDisplay.id = 'dau-display';
    dauDisplay.style.display = 'flex';
    dauDisplay.style.flexDirection = 'column';
    dauDisplay.style.alignItems = 'center';
    dauDisplay.style.fontSize = '12px';

    const dauLabel = document.createElement('span');
    dauLabel.textContent = 'DAU';
    dauLabel.style.marginBottom = '10px'; // Updated margin
    const dauValue = document.createElement('span');
    dauValue.className = 'stat-value'; // Added class for easier targeting
    dauValue.textContent = '0';
    
    dauDisplay.appendChild(dauLabel);
    dauDisplay.appendChild(dauValue);
    
    // MRR Display
    const mrrDisplay = document.createElement('div');
    mrrDisplay.id = 'mrr-display';
    mrrDisplay.style.display = 'flex';
    mrrDisplay.style.flexDirection = 'column';
    mrrDisplay.style.alignItems = 'center';
    mrrDisplay.style.fontSize = '12px';

    const mrrLabel = document.createElement('span');
    mrrLabel.textContent = 'MRR';
    mrrLabel.style.marginBottom = '10px'; // Updated margin
    const mrrValue = document.createElement('span');
    mrrValue.className = 'stat-value'; // Added class for easier targeting
    mrrValue.textContent = '$0'; 
    
    mrrDisplay.appendChild(mrrLabel);
    mrrDisplay.appendChild(mrrValue);
    
    statsContainer.appendChild(dauDisplay);
    statsContainer.appendChild(mrrDisplay);
    menuBar.appendChild(statsContainer);

    document.body.appendChild(menuBar);

    // Create instruction overlay
    const instructions = document.createElement('div');
    instructions.style.position = 'absolute';
    instructions.style.top = '60px'; // Moved down to be below menu bar
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
        <p>Arrow Keys/WASD: Move</p>
        <p>Space/Z/Enter: Action/Pickup</p>
        <p>I: Open Inventory</p>
        <p>+/-: Zoom in/out</p>
    `;
    document.body.appendChild(instructions);
    
    // Mobile notice
    if ('ontouchstart' in window && window.innerWidth < 768) {
        const mobileNotice = document.createElement('div');
        mobileNotice.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000;color:#fff;font-family:"Press Start 2P",monospace;text-align:center;padding:20px;box-sizing:border-box';
        mobileNotice.innerHTML = `
            <p style="font-size:14px;line-height:2;margin-bottom:30px">Best played on desktop<br>with keyboard</p>
            <button style="font-family:'Press Start 2P',monospace;font-size:12px;padding:12px 24px;background:#e4c025;color:#000;border:none;cursor:pointer;border-radius:4px" onclick="this.parentElement.remove()">Play Anyway</button>
        `;
        document.body.appendChild(mobileNotice);
    }

    // Create game instance to start the game
    const game = new Game();
    console.log('Game initialized!');
    
    // DAU and MRR start at 0 and will be updated by the simulator
    
    // Hide instructions after 10 seconds
    setTimeout(() => {
        instructions.style.opacity = '0';
        instructions.style.transition = 'opacity 1s';
        setTimeout(() => {
            document.body.removeChild(instructions);
        }, 1000);
    }, 10000);
}
