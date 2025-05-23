import { DialogueLoader } from '../utils/DialogueLoader.js';

export class DialogueManager {
    constructor() {
        this.dialogueBox = document.getElementById('dialogue-box');
        this.dialogueTextElement = document.getElementById('dialogue-text');
        this.dialogueNPCNameElement = document.getElementById('dialogue-npc-name'); // For NPC names

        if (!this.dialogueBox || !this.dialogueTextElement) {
            console.log("Dialogue UI elements not found in HTML, creating them dynamically.");
            this.createDialogueUI();
        }

        this.currentDialogueLines = [];
        this.currentLineIndex = 0;
        this.isVisible = false;
        this.onDialogueCompleteCallback = null; // Callback for when dialogue finishes
        this.lineDisplayTime = 1500; // Time in ms to display each line (50% faster than 3000ms)
        this.dialogueTimeoutId = null; // To store the timeout ID
        
        // Initialize dialogue loader
        this.dialogueLoader = new DialogueLoader();
        this.currentCharacterId = null;
        this.currentDialogueId = null;
        
        // Load dialogue data
        this.loadDialogueData();
    }

    async loadDialogueData() {
        await this.dialogueLoader.loadDialogues();
        const settings = this.dialogueLoader.getSettings();
        this.lineDisplayTime = settings.defaultLineDisplayTime;
        console.log('DialogueManager initialized with JSON data');
    }

    createDialogueUI() {
        // Create dialogue-box container
        this.dialogueBox = document.createElement('div');
        this.dialogueBox.id = 'dialogue-box';
        this.dialogueBox.style.position = 'fixed';
        this.dialogueBox.style.bottom = '30px'; // Adjusted position
        this.dialogueBox.style.left = '50%';
        this.dialogueBox.style.transform = 'translateX(-50%)';
        this.dialogueBox.style.width = '90%'; // Adjusted width
        this.dialogueBox.style.maxWidth = '700px'; // Adjusted max-width
        this.dialogueBox.style.padding = '25px'; // Adjusted padding
        this.dialogueBox.style.backgroundColor = 'rgba(0, 0, 0, 0.85)'; // Slightly more opaque
        this.dialogueBox.style.color = 'white';
        this.dialogueBox.style.border = '3px solid #555'; // Darker border
        this.dialogueBox.style.borderRadius = '8px'; // Slightly less rounded
        this.dialogueBox.style.fontFamily = '"Press Start 2P", cursive, Arial, sans-serif'; // Example pixel font (needs import)
        this.dialogueBox.style.fontSize = '16px'; // Adjusted font size for pixel style
        this.dialogueBox.style.lineHeight = '1.6';
        this.dialogueBox.style.zIndex = '10000'; // Ensure it's on top
        this.dialogueBox.style.display = 'none'; // Initially hidden
        this.dialogueBox.style.boxSizing = 'border-box';

        // Create NPC name element
        this.dialogueNPCNameElement = document.createElement('div');
        this.dialogueNPCNameElement.id = 'dialogue-npc-name';
        this.dialogueNPCNameElement.style.fontSize = '14px';
        this.dialogueNPCNameElement.style.color = '#ffff00'; // Yellow for NPC names
        this.dialogueNPCNameElement.style.marginBottom = '10px';
        this.dialogueNPCNameElement.style.fontWeight = 'bold';
        this.dialogueNPCNameElement.style.display = 'none'; // Initially hidden

        // Create dialogue-text paragraph
        this.dialogueTextElement = document.createElement('p');
        this.dialogueTextElement.id = 'dialogue-text';
        this.dialogueTextElement.style.margin = '0';
        this.dialogueTextElement.style.whiteSpace = 'pre-wrap'; // Preserve line breaks in text

        this.dialogueBox.appendChild(this.dialogueNPCNameElement);
        this.dialogueBox.appendChild(this.dialogueTextElement);
        document.body.appendChild(this.dialogueBox);
        console.log("Dialogue UI elements created dynamically with SNES-inspired styling.");

        // Attempt to load a pixel font (example using Google Fonts)
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);
    }

    // New method to show dialogue from JSON data
    showCharacterDialogue(characterId, dialogueId = 'greeting', onComplete = null) {
        const dialogue = this.dialogueLoader.getCharacterDialogue(characterId, dialogueId);
        if (!dialogue) {
            console.warn(`No dialogue found for ${characterId}:${dialogueId}`);
            return false;
        }

        const character = this.dialogueLoader.getCharacterData(characterId);
        this.currentCharacterId = characterId;
        this.currentDialogueId = dialogueId;

        // Show character name if available
        if (character && character.name && this.dialogueNPCNameElement) {
            this.dialogueNPCNameElement.textContent = character.name;
            this.dialogueNPCNameElement.style.display = 'block';
        }

        // Set up completion callback to mark dialogue as completed
        const wrappedCallback = () => {
            this.dialogueLoader.markDialogueCompleted(characterId, dialogueId);
            if (onComplete) onComplete();
        };

        this.showDialogue(dialogue.lines, wrappedCallback);
        return true;
    }

    // Show global dialogue (system messages, tutorial, etc.)
    showGlobalDialogue(category, dialogueId, onComplete = null) {
        const dialogue = this.dialogueLoader.getGlobalDialogue(category, dialogueId);
        if (!dialogue) {
            console.warn(`No global dialogue found for ${category}:${dialogueId}`);
            return false;
        }

        // Hide NPC name for global dialogues
        if (this.dialogueNPCNameElement) {
            this.dialogueNPCNameElement.style.display = 'none';
        }

        this.showDialogue(dialogue.lines, onComplete);
        return true;
    }

    // Show random dialogue from a category
    showRandomDialogue(category, onComplete = null) {
        const dialogue = this.dialogueLoader.getRandomDialogue(category);
        if (!dialogue) {
            console.warn(`No random dialogue found for category: ${category}`);
            return false;
        }

        // Hide NPC name for random dialogues
        if (this.dialogueNPCNameElement) {
            this.dialogueNPCNameElement.style.display = 'none';
        }

        this.showDialogue(dialogue.lines, onComplete);
        return true;
    }

    // Show conditional dialogue based on player stats
    showConditionalDialogue(playerStats, onComplete = null) {
        const dialogue = this.dialogueLoader.getConditionalDialogue(playerStats);
        if (!dialogue) {
            return false;
        }

        // Hide NPC name for conditional dialogues
        if (this.dialogueNPCNameElement) {
            this.dialogueNPCNameElement.style.display = 'none';
        }

        this.showDialogue(dialogue.lines, onComplete);
        return true;
    }

    // Original method for backward compatibility
    showDialogue(lines, onComplete) {
        if (!this.dialogueBox || !this.dialogueTextElement) {
            console.error("Cannot show dialogue, UI elements are missing.");
            return;
        }

        // Clear any existing dialogue timeout
        if (this.dialogueTimeoutId) {
            clearTimeout(this.dialogueTimeoutId);
            this.dialogueTimeoutId = null;
        }

        this.currentDialogueLines = lines;
        this.currentLineIndex = 0;
        this.onDialogueCompleteCallback = onComplete || null;

        if (this.currentDialogueLines.length > 0) {
            this.dialogueBox.style.display = 'block';
            this.isVisible = true;
            this._autoAdvance(); // Start auto-advancing
        } else {
            this.hideDialogue(); // No lines to show, just hide
        }
    }

    _autoAdvance() {
        if (!this.isVisible) return; // Stop if dialogue was hidden externally

        if (this.currentLineIndex < this.currentDialogueLines.length) {
            this.dialogueTextElement.textContent = this.currentDialogueLines[this.currentLineIndex];
            this.currentLineIndex++;
            this.dialogueTimeoutId = setTimeout(() => this._autoAdvance(), this.lineDisplayTime);
        } else {
            // All lines have been shown, wait for lineDisplayTime then hide
            this.dialogueTimeoutId = setTimeout(() => this.hideDialogue(), this.lineDisplayTime);
        }
    }

    hideDialogue() {
        if (this.dialogueTimeoutId) {
            clearTimeout(this.dialogueTimeoutId);
            this.dialogueTimeoutId = null;
        }
        if (!this.dialogueBox) return;
        this.dialogueBox.style.display = 'none';
        this.isVisible = false;
        
        // Hide NPC name when dialogue is hidden
        if (this.dialogueNPCNameElement) {
            this.dialogueNPCNameElement.style.display = 'none';
        }

        if (this.onDialogueCompleteCallback) {
            this.onDialogueCompleteCallback();
            this.onDialogueCompleteCallback = null; // Clear callback after execution
        }

        // Clear current dialogue tracking
        this.currentCharacterId = null;
        this.currentDialogueId = null;
    }

    isActive() {
        return this.isVisible;
    }

    // Get available dialogues for a character
    getAvailableDialogues(characterId) {
        return this.dialogueLoader.getAvailableDialogues(characterId);
    }

    // Get dialogue chain progress
    getDialogueChainProgress(chainId) {
        return this.dialogueLoader.getDialogueChainProgress(chainId);
    }

    // Get next dialogue in chain
    getNextDialogueInChain(chainId) {
        return this.dialogueLoader.getNextDialogueInChain(chainId);
    }

    // Debug method
    getDebugInfo() {
        return {
            ...this.dialogueLoader.getDebugInfo(),
            currentCharacter: this.currentCharacterId,
            currentDialogue: this.currentDialogueId,
            isActive: this.isActive()
        };
    }
}
