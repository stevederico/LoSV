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
        this.waitingForInput = false; // Track if we're waiting for player input
        
        // Initialize dialogue loader
        this.dialogueLoader = new DialogueLoader();
        this.currentCharacterId = null;
        this.currentDialogueId = null;
        
        // Set up keyboard listener for dialogue advancement
        this.setupKeyboardListener();
        
        // Load dialogue data
        this.loadDialogueData();
    }

    async loadDialogueData() {
        await this.dialogueLoader.loadDialogues();
        console.log('DialogueManager initialized with JSON data');
    }

    setupKeyboardListener() {
        this.keyHandler = (event) => {
            if (!this.isVisible) return;

            const key = event.key.toLowerCase();

            // Handle Escape to close dialogue
            if (event.key === 'Escape') {
                event.preventDefault();
                this.hideChoices();
                this.hideDialogue();
                return;
            }

            // Handle choice navigation
            if (this.waitingForChoiceConfirm) {
                if (key === 'arrowup' || key === 'w') {
                    event.preventDefault();
                    this.selectedChoiceIndex = Math.max(0, this.selectedChoiceIndex - 1);
                    this.updateChoiceHighlight();
                } else if (key === 'arrowdown' || key === 's') {
                    event.preventDefault();
                    this.selectedChoiceIndex = Math.min(
                        this.currentChoices.length - 1,
                        this.selectedChoiceIndex + 1
                    );
                    this.updateChoiceHighlight();
                } else if (key === 'enter' || event.key === ' ' || key === 'z') {
                    event.preventDefault();
                    this.confirmChoice();
                }
                return;
            }

            // Handle regular dialogue advancement
            if (this.waitingForInput) {
                if (event.key === ' ' || event.key === 'Enter' || key === 'z') {
                    event.preventDefault();
                    this.advanceDialogue();
                }
            }
        };

        document.addEventListener('keydown', this.keyHandler);
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

        // Create instruction text
        this.instructionElement = document.createElement('div');
        this.instructionElement.style.fontSize = '12px';
        this.instructionElement.style.color = '#aaaaaa';
        this.instructionElement.style.marginTop = '15px';
        this.instructionElement.style.textAlign = 'center';
        this.instructionElement.textContent = 'Press SPACE, ENTER, or Z to continue...';

        // Create choice container
        this.choiceContainer = document.createElement('div');
        this.choiceContainer.id = 'dialogue-choices';
        this.choiceContainer.style.marginTop = '15px';
        this.choiceContainer.style.display = 'none';

        // Track choice state
        this.currentChoices = [];
        this.selectedChoiceIndex = 0;
        this.waitingForChoiceConfirm = false;

        this.dialogueBox.appendChild(this.dialogueNPCNameElement);
        this.dialogueBox.appendChild(this.dialogueTextElement);
        this.dialogueBox.appendChild(this.instructionElement);
        this.dialogueBox.appendChild(this.choiceContainer);
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

        // Wrap callback to handle choices after dialogue
        const wrappedCallback = () => {
            this.dialogueLoader.markDialogueCompleted(characterId, dialogueId);

            // Check if this dialogue has choices
            if (dialogue.choices && dialogue.choices.length > 0) {
                this.showChoices(dialogue.choices, (choice) => {
                    this.handleChoiceAction(characterId, choice, onComplete);
                });
            } else {
                if (onComplete) onComplete();
            }
        };

        this.showDialogue(dialogue.lines, wrappedCallback);
        return true;
    }

    handleChoiceAction(characterId, choice, originalCallback) {
        switch (choice.action) {
            case 'start_simulator':
                // Trigger simulator for current building
                this.hideDialogue();
                if (this.onStartSimulator) {
                    this.onStartSimulator();
                }
                break;

            case 'dialogue':
                // Navigate to another dialogue
                if (choice.nextDialogue) {
                    this.showCharacterDialogue(characterId, choice.nextDialogue, originalCallback);
                }
                break;

            case 'close':
                // Just close dialogue
                this.hideDialogue();
                if (originalCallback) originalCallback();
                break;

            default:
                if (originalCallback) originalCallback();
        }
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

        this.currentDialogueLines = lines;
        this.currentLineIndex = 0;
        this.onDialogueCompleteCallback = onComplete || null;

        if (this.currentDialogueLines.length > 0) {
            this.dialogueBox.style.display = 'block';
            this.isVisible = true;
            this.showCurrentLine();
        } else {
            this.hideDialogue(); // No lines to show, just hide
        }
    }

    showCurrentLine() {
        if (this.currentLineIndex < this.currentDialogueLines.length) {
            this.dialogueTextElement.textContent = this.currentDialogueLines[this.currentLineIndex];
            this.waitingForInput = true;
        } else {
            this.hideDialogue();
        }
    }

    advanceDialogue() {
        if (!this.waitingForInput) return;
        
        this.waitingForInput = false;
        this.currentLineIndex++;
        
        if (this.currentLineIndex < this.currentDialogueLines.length) {
            this.showCurrentLine();
        } else {
            this.hideDialogue();
        }
    }

    hideDialogue() {
        if (!this.dialogueBox) return;
        this.dialogueBox.style.display = 'none';
        this.isVisible = false;
        this.waitingForInput = false;

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

    showChoices(choices, onChoiceSelected) {
        this.currentChoices = choices;
        this.selectedChoiceIndex = 0;
        this.onChoiceCallback = onChoiceSelected;
        this.waitingForChoiceConfirm = true;

        // Hide advance instruction
        if (this.instructionElement) {
            this.instructionElement.style.display = 'none';
        }

        // Build choice list
        this.choiceContainer.innerHTML = '';
        choices.forEach((choice, index) => {
            const choiceElement = document.createElement('div');
            choiceElement.style.padding = '8px';
            choiceElement.style.marginBottom = '5px';
            choiceElement.style.cursor = 'pointer';
            choiceElement.style.borderRadius = '4px';
            choiceElement.dataset.choiceIndex = index;

            // Add arrow for selected choice
            const arrow = document.createElement('span');
            arrow.textContent = index === 0 ? '▶ ' : '  ';
            arrow.style.color = '#ffff00';

            const text = document.createElement('span');
            text.textContent = choice.text;

            choiceElement.appendChild(arrow);
            choiceElement.appendChild(text);
            this.choiceContainer.appendChild(choiceElement);
        });

        this.choiceContainer.style.display = 'block';
        this.updateChoiceHighlight();
    }

    updateChoiceHighlight() {
        const choices = this.choiceContainer.querySelectorAll('div');
        choices.forEach((elem, index) => {
            const arrow = elem.querySelector('span');
            arrow.textContent = index === this.selectedChoiceIndex ? '▶ ' : '  ';
            elem.style.backgroundColor = index === this.selectedChoiceIndex ?
                'rgba(255, 255, 255, 0.2)' : 'transparent';
        });
    }

    hideChoices() {
        if (this.choiceContainer) {
            this.choiceContainer.style.display = 'none';
            this.choiceContainer.innerHTML = '';
        }
        this.currentChoices = [];
        this.waitingForChoiceConfirm = false;

        // Show advance instruction again
        if (this.instructionElement) {
            this.instructionElement.style.display = 'block';
        }
    }

    confirmChoice() {
        const selectedChoice = this.currentChoices[this.selectedChoiceIndex];
        this.hideChoices();

        if (this.onChoiceCallback) {
            this.onChoiceCallback(selectedChoice, this.selectedChoiceIndex);
        }
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
            isActive: this.isActive(),
            waitingForInput: this.waitingForInput
        };
    }

    // Cleanup method
    destroy() {
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
        }
    }
}
