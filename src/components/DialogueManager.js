export class DialogueManager {
    constructor() {
        this.dialogueBox = document.getElementById('dialogue-box');
        this.dialogueTextElement = document.getElementById('dialogue-text');
        // this.dialogueNPCNameElement = document.getElementById('dialogue-npc-name'); // Optional for future use

        if (!this.dialogueBox || !this.dialogueTextElement) {
            console.log("Dialogue UI elements not found in HTML, creating them dynamically.");
            this.createDialogueUI();
        }

        this.currentDialogueLines = [];
        this.currentLineIndex = 0;
        this.isVisible = false;
        this.onDialogueCompleteCallback = null; // Callback for when dialogue finishes
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

        // Create dialogue-text paragraph
        this.dialogueTextElement = document.createElement('p');
        this.dialogueTextElement.id = 'dialogue-text';
        this.dialogueTextElement.style.margin = '0';
        this.dialogueTextElement.style.whiteSpace = 'pre-wrap'; // Preserve line breaks in text

        this.dialogueBox.appendChild(this.dialogueTextElement);
        document.body.appendChild(this.dialogueBox);
        console.log("Dialogue UI elements created dynamically with SNES-inspired styling.");

        // Attempt to load a pixel font (example using Google Fonts)
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);
    }

    showDialogue(lines, onComplete) {
        if (!this.dialogueBox || !this.dialogueTextElement) {
            console.error("Cannot show dialogue, UI elements are missing.");
            return;
        }
        this.currentDialogueLines = lines;
        this.currentLineIndex = 0;
        this.onDialogueCompleteCallback = onComplete || null;

        if (this.currentDialogueLines.length > 0) {
            this.dialogueTextElement.textContent = this.currentDialogueLines[this.currentLineIndex];
            this.dialogueBox.style.display = 'block';
            this.isVisible = true;
        } else {
            this.hideDialogue();
        }
    }

    advanceDialogue() {
        if (!this.isVisible) return false; // Not active, nothing to advance

        this.currentLineIndex++;
        if (this.currentLineIndex < this.currentDialogueLines.length) {
            this.dialogueTextElement.textContent = this.currentDialogueLines[this.currentLineIndex];
            return true; // Dialogue continues
        } else {
            this.hideDialogue();
            return false; // Dialogue ended
        }
    }

    hideDialogue() {
        if (!this.dialogueBox) return;
        this.dialogueBox.style.display = 'none';
        this.isVisible = false;
        if (this.onDialogueCompleteCallback) {
            this.onDialogueCompleteCallback();
            this.onDialogueCompleteCallback = null; // Clear callback after execution
        }
    }

    isActive() {
        return this.isVisible;
    }
}
