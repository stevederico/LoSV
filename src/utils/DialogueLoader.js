export class DialogueLoader {
    constructor() {
        this.dialogueData = null;
        this.playerProgress = new Map(); // Track player progress through dialogue chains
        this.completedDialogues = new Set(); // Track completed non-repeatable dialogues
    }

    async loadDialogues() {
        try {
            const response = await fetch('/src/data/dialogues.json');
            this.dialogueData = await response.json();
            console.log('Dialogue data loaded successfully');
            return this.dialogueData;
        } catch (error) {
            console.error('Failed to load dialogue data:', error);
            return null;
        }
    }

    getCharacterDialogue(characterId, dialogueId = 'greeting') {
        if (!this.dialogueData || !this.dialogueData.characters[characterId]) {
            console.warn(`Character ${characterId} not found in dialogue data`);
            return null;
        }

        const character = this.dialogueData.characters[characterId];
        const dialogue = character.dialogues[dialogueId];

        if (!dialogue) {
            console.warn(`Dialogue ${dialogueId} not found for character ${characterId}`);
            return null;
        }

        // Check if dialogue is repeatable or hasn't been completed
        const dialogueKey = `${characterId}_${dialogueId}`;
        if (!dialogue.repeatable && this.completedDialogues.has(dialogueKey)) {
            console.log(`Non-repeatable dialogue ${dialogueKey} already completed`);
            return null;
        }

        // Check requirements
        if (dialogue.requirements) {
            for (const requirement of dialogue.requirements) {
                const reqKey = `${characterId}_${requirement}`;
                if (!this.completedDialogues.has(reqKey)) {
                    console.log(`Dialogue ${dialogueKey} requires ${reqKey} to be completed first`);
                    return null;
                }
            }
        }

        return dialogue;
    }

    markDialogueCompleted(characterId, dialogueId) {
        const dialogueKey = `${characterId}_${dialogueId}`;
        this.completedDialogues.add(dialogueKey);

        // Handle unlocks
        const dialogue = this.getCharacterDialogue(characterId, dialogueId);
        if (dialogue && dialogue.unlocks) {
            for (const unlock of dialogue.unlocks) {
                this.playerProgress.set(unlock, true);
                console.log(`Unlocked: ${unlock}`);
            }
        }
    }

    getCharacterData(characterId) {
        if (!this.dialogueData || !this.dialogueData.characters[characterId]) {
            return null;
        }
        return this.dialogueData.characters[characterId];
    }

    getGlobalDialogue(category, dialogueId) {
        if (!this.dialogueData || !this.dialogueData.global_dialogues[category]) {
            return null;
        }
        return this.dialogueData.global_dialogues[category][dialogueId];
    }

    getRandomDialogue(category) {
        if (!this.dialogueData || !this.dialogueData.random_dialogues[category]) {
            return null;
        }
        const dialogues = this.dialogueData.random_dialogues[category];
        const randomIndex = Math.floor(Math.random() * dialogues.length);
        return {
            id: `random_${category}_${randomIndex}`,
            lines: [dialogues[randomIndex]]
        };
    }

    getConditionalDialogue(playerStats) {
        if (!this.dialogueData || !this.dialogueData.conditional_dialogues) {
            return null;
        }

        const conditions = this.dialogueData.conditional_dialogues.player_stats;
        
        // Check high DAU condition
        if (playerStats.dau > 1000 && conditions.high_dau) {
            return {
                id: 'conditional_high_dau',
                lines: conditions.high_dau.lines
            };
        }

        // Check high MRR condition
        if (playerStats.mrr > 10000 && conditions.high_mrr) {
            return {
                id: 'conditional_high_mrr',
                lines: conditions.high_mrr.lines
            };
        }

        // Check low stats condition
        if (playerStats.dau < 100 && playerStats.mrr < 1000 && conditions.low_stats) {
            return {
                id: 'conditional_low_stats',
                lines: conditions.low_stats.lines
            };
        }

        return null;
    }

    getDialogueChainProgress(chainId) {
        if (!this.dialogueData || !this.dialogueData.dialogue_chains[chainId]) {
            return null;
        }

        const chain = this.dialogueData.dialogue_chains[chainId];
        const progress = {
            chainId: chainId,
            currentStep: 0,
            totalSteps: chain.steps.length,
            completed: false
        };

        // Find current step based on completed dialogues
        for (let i = 0; i < chain.steps.length; i++) {
            const step = chain.steps[i];
            const dialogueKey = `${step.npc}_${step.dialogue}`;
            
            if (this.completedDialogues.has(dialogueKey)) {
                progress.currentStep = i + 1;
            } else {
                break;
            }
        }

        progress.completed = progress.currentStep >= progress.totalSteps;
        return progress;
    }

    getNextDialogueInChain(chainId) {
        const progress = this.getDialogueChainProgress(chainId);
        if (!progress || progress.completed) {
            return null;
        }

        const chain = this.dialogueData.dialogue_chains[chainId];
        const nextStep = chain.steps[progress.currentStep];
        
        return {
            npc: nextStep.npc,
            dialogue: nextStep.dialogue,
            step: progress.currentStep + 1,
            totalSteps: progress.totalSteps
        };
    }

    getSettings() {
        return this.dialogueData ? this.dialogueData.settings : {
            defaultLineDisplayTime: 1500,
            maxDialogueDistance: 7,
            autoAdvance: true
        };
    }

    // Helper method to get all available dialogues for a character
    getAvailableDialogues(characterId) {
        const character = this.getCharacterData(characterId);
        if (!character) return [];

        const available = [];
        for (const [dialogueId, dialogue] of Object.entries(character.dialogues)) {
            const dialogueKey = `${characterId}_${dialogueId}`;
            
            // Check if dialogue is available (repeatable or not completed)
            if (dialogue.repeatable || !this.completedDialogues.has(dialogueKey)) {
                // Check requirements
                let requirementsMet = true;
                if (dialogue.requirements) {
                    for (const requirement of dialogue.requirements) {
                        const reqKey = `${characterId}_${requirement}`;
                        if (!this.completedDialogues.has(reqKey)) {
                            requirementsMet = false;
                            break;
                        }
                    }
                }
                
                if (requirementsMet) {
                    available.push({
                        id: dialogueId,
                        dialogue: dialogue
                    });
                }
            }
        }
        
        return available;
    }

    // Debug method to get current state
    getDebugInfo() {
        return {
            loadedDialogues: this.dialogueData ? Object.keys(this.dialogueData.characters).length : 0,
            completedDialogues: Array.from(this.completedDialogues),
            playerProgress: Object.fromEntries(this.playerProgress),
            settings: this.getSettings()
        };
    }
}
