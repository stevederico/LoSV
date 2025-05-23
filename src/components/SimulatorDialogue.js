export class SimulatorDialogue {
    constructor(dialogueManager) {
        this.dialogueManager = dialogueManager;
        this.currentOptions = [];
        this.waitingForChoice = false;
        this.onChoiceCallback = null;
        
        // Create custom UI elements for simulator
        this.createSimulatorUI();
        
        // Bind keyboard handler
        this.handleKeyPress = this.handleKeyPress.bind(this);
    }
    
    createSimulatorUI() {
        // Create main simulator container
        this.simulatorBox = document.createElement('div');
        this.simulatorBox.id = 'simulator-box';
        this.simulatorBox.style.position = 'fixed';
        this.simulatorBox.style.bottom = '30px';
        this.simulatorBox.style.left = '50%';
        this.simulatorBox.style.transform = 'translateX(-50%)';
        this.simulatorBox.style.width = '90%';
        this.simulatorBox.style.maxWidth = '800px';
        this.simulatorBox.style.maxHeight = '70vh';
        this.simulatorBox.style.overflowY = 'auto';
        this.simulatorBox.style.padding = '25px';
        this.simulatorBox.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        this.simulatorBox.style.color = '#00ff00'; // Green terminal text
        this.simulatorBox.style.border = '3px solid #00ff00';
        this.simulatorBox.style.borderRadius = '8px';
        this.simulatorBox.style.fontFamily = '"Press Start 2P", "Courier New", monospace';
        this.simulatorBox.style.fontSize = '12px';
        this.simulatorBox.style.lineHeight = '1.8';
        this.simulatorBox.style.zIndex = '10001';
        this.simulatorBox.style.display = 'none';
        this.simulatorBox.style.boxSizing = 'border-box';
        
        // Create content container
        this.contentContainer = document.createElement('div');
        this.contentContainer.id = 'simulator-content';
        this.simulatorBox.appendChild(this.contentContainer);
        
        // Create progress bar container
        this.progressContainer = document.createElement('div');
        this.progressContainer.id = 'simulator-progress';
        this.progressContainer.style.marginTop = '20px';
        this.progressContainer.style.display = 'none';
        this.simulatorBox.appendChild(this.progressContainer);
        
        document.body.appendChild(this.simulatorBox);
    }
    
    show() {
        this.simulatorBox.style.display = 'block';
        // Hide regular dialogue box if visible
        if (this.dialogueManager.dialogueBox) {
            this.dialogueManager.dialogueBox.style.display = 'none';
        }
        document.addEventListener('keydown', this.handleKeyPress);
    }
    
    hide() {
        this.simulatorBox.style.display = 'none';
        document.removeEventListener('keydown', this.handleKeyPress);
        this.waitingForChoice = false;
        this.onChoiceCallback = null;
    }
    
    handleKeyPress(event) {
        if (!this.waitingForChoice) return;
        
        const key = event.key;
        if (key >= '1' && key <= '3') {
            const choice = parseInt(key);
            if (choice <= this.currentOptions.length) {
                this.waitingForChoice = false;
                if (this.onChoiceCallback) {
                    this.onChoiceCallback(choice);
                }
            }
        }
    }
    
    displayRound(roundData) {
        this.contentContainer.innerHTML = '';
        this.currentOptions = roundData.options;
        
        // Round header
        const header = document.createElement('div');
        header.style.marginBottom = '20px';
        header.innerHTML = `
            <div style="color: #ffff00; font-size: 16px; margin-bottom: 10px;">
                <strong>Level ${roundData.level}: ${roundData.levelName}</strong>
            </div>
            <div style="color: #00ffff; margin-bottom: 15px;">
                <strong>Round ${roundData.round}</strong>
            </div>
            <div style="color: #ffffff; margin-bottom: 20px;">
                <strong>Objective:</strong> ${roundData.objective}
            </div>
        `;
        this.contentContainer.appendChild(header);
        
        // Options
        const optionsContainer = document.createElement('div');
        optionsContainer.style.marginBottom = '20px';
        
        roundData.options.forEach((option, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.style.marginBottom = '15px';
            optionDiv.style.padding = '10px';
            optionDiv.style.border = '1px solid #00ff00';
            optionDiv.style.borderRadius = '4px';
            
            let optionHTML = `<div style="color: #ffff00; margin-bottom: 8px;"><strong>${index + 1}. ${option.name}</strong></div>`;
            
            // Add option details based on level type
            const details = this.getOptionDetails(option);
            details.forEach(detail => {
                optionHTML += `<div style="color: #ffffff; margin-left: 20px; font-size: 10px;">• ${detail}</div>`;
            });
            
            optionDiv.innerHTML = optionHTML;
            optionsContainer.appendChild(optionDiv);
        });
        
        this.contentContainer.appendChild(optionsContainer);
        
        // Choose prompt
        const choosePrompt = document.createElement('div');
        choosePrompt.style.color = '#00ff00';
        choosePrompt.style.fontSize = '14px';
        choosePrompt.style.textAlign = 'center';
        choosePrompt.style.marginTop = '20px';
        choosePrompt.innerHTML = '<strong>Choose: Press 1, 2, or 3</strong>';
        this.contentContainer.appendChild(choosePrompt);
        
        // Show progress
        this.updateProgress(roundData.currentProgress, roundData.goalTarget, roundData.goal, roundData.progressUnit);
        
        this.waitingForChoice = true;
        this.show();
    }
    
    getOptionDetails(option) {
        const details = [];
        
        // Add relevant details based on available properties
        if (option.targetUser) details.push(`Target User: ${option.targetUser}`);
        if (option.valueProposition) details.push(`Value Prop: ${option.valueProposition}`);
        if (option.technicalFeasibility) details.push(`Tech: ${option.technicalFeasibility}`);
        
        if (option.coreFeature) details.push(`Core: ${option.coreFeature}`);
        if (option.niceToHave) details.push(`Nice-to-Have: ${option.niceToHave}`);
        if (option.technicalDebt) details.push(`Tech Debt: ${option.technicalDebt}`);
        
        if (option.investorType) details.push(`Type: ${option.investorType}`);
        if (option.priorities) details.push(`Priorities: ${option.priorities}`);
        if (option.terms) details.push(`Terms: ${option.terms}`);
        
        if (option.skill) details.push(`Skill: ${option.skill}`);
        if (option.fit) details.push(`Fit: ${option.fit}`);
        if (option.cost) details.push(`Cost: ${option.cost}`);
        
        if (option.reach) details.push(`Reach: ${option.reach}`);
        if (option.cac) details.push(`CAC: ${option.cac}`);
        if (option.conversion) details.push(`Conversion: ${option.conversion}`);
        
        if (option.reliability) details.push(`Reliability: ${option.reliability}`);
        if (option.flexibility) details.push(`Flexibility: ${option.flexibility}`);
        
        if (option.severity) details.push(`Severity: ${option.severity}`);
        if (option.impact) details.push(`Impact: ${option.impact}`);
        if (option.mitigationCost) details.push(`Mitigation: ${option.mitigationCost}`);
        
        if (option.metrics) details.push(`Metrics: ${option.metrics}`);
        if (option.structure) details.push(`Structure: ${option.structure}`);
        if (option.roadmap) details.push(`Roadmap: ${option.roadmap}`);
        
        if (option.complexity) details.push(`Complexity: ${option.complexity}`);
        
        if (option.valuation) details.push(`Valuation: ${option.valuation}`);
        if (option.timeline) details.push(`Timeline: ${option.timeline}`);
        if (option.risk) details.push(`Risk: ${option.risk}`);
        
        return details;
    }
    
    displayResult(result) {
        this.contentContainer.innerHTML = '';
        
        // Results header
        const header = document.createElement('div');
        header.style.marginBottom = '20px';
        header.style.color = '#ffff00';
        header.style.fontSize = '16px';
        header.innerHTML = '<strong>Results</strong>';
        this.contentContainer.appendChild(header);
        
        // Choice made
        const choiceDiv = document.createElement('div');
        choiceDiv.style.marginBottom = '15px';
        choiceDiv.style.color = '#ffffff';
        choiceDiv.innerHTML = `<strong>You chose:</strong> ${result.choice}`;
        this.contentContainer.appendChild(choiceDiv);
        
        // Scores
        const scoresDiv = document.createElement('div');
        scoresDiv.style.marginBottom = '15px';
        scoresDiv.style.padding = '10px';
        scoresDiv.style.border = '1px solid #00ff00';
        scoresDiv.style.borderRadius = '4px';
        scoresDiv.innerHTML = `
            <div style="color: #00ffff; margin-bottom: 5px;">
                <strong>Round Score:</strong> ${result.roundScore}
            </div>
            <div style="color: #00ffff;">
                <strong>Total Score:</strong> ${result.totalScore}
            </div>
        `;
        this.contentContainer.appendChild(scoresDiv);
        
        // Progress update
        if (result.progressPercent !== undefined) {
            const progressDiv = document.createElement('div');
            progressDiv.style.marginBottom = '15px';
            progressDiv.style.color = '#00ff00';
            progressDiv.innerHTML = `<strong>Progress:</strong> ${result.progressPercent}% complete`;
            this.contentContainer.appendChild(progressDiv);
        }
        
        // Random event
        if (result.randomEvent) {
            const eventDiv = document.createElement('div');
            eventDiv.style.marginTop = '20px';
            eventDiv.style.padding = '15px';
            eventDiv.style.border = '2px solid';
            eventDiv.style.borderRadius = '4px';
            
            if (result.randomEvent.type === 'positive') {
                eventDiv.style.borderColor = '#00ff00';
                eventDiv.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
            } else if (result.randomEvent.type === 'negative') {
                eventDiv.style.borderColor = '#ff0000';
                eventDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
            } else {
                eventDiv.style.borderColor = '#ffff00';
                eventDiv.style.backgroundColor = 'rgba(255, 255, 0, 0.1)';
            }
            
            eventDiv.innerHTML = `
                <div style="color: #ffff00; margin-bottom: 8px;">
                    <strong>Random Event!</strong>
                </div>
                <div style="color: #ffffff; font-size: 11px;">
                    ${result.randomEvent.message}
                </div>
            `;
            this.contentContainer.appendChild(eventDiv);
        }
        
        // Level complete message
        if (result.levelComplete) {
            const completeDiv = document.createElement('div');
            completeDiv.style.marginTop = '30px';
            completeDiv.style.padding = '20px';
            completeDiv.style.border = '3px solid';
            completeDiv.style.borderRadius = '8px';
            completeDiv.style.textAlign = 'center';
            
            if (result.levelSuccess) {
                completeDiv.style.borderColor = '#00ff00';
                completeDiv.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
                completeDiv.innerHTML = `
                    <div style="color: #00ff00; font-size: 18px; margin-bottom: 10px;">
                        <strong>Success!</strong>
                    </div>
                    <div style="color: #ffffff;">
                        Level completed with score: ${result.finalScore}
                    </div>
                    <div style="color: #00ffff; margin-top: 15px;">
                        Exit the building to continue your journey
                    </div>
                `;
            } else {
                completeDiv.style.borderColor = '#ff0000';
                completeDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
                completeDiv.innerHTML = `
                    <div style="color: #ff0000; font-size: 18px; margin-bottom: 10px;">
                        <strong>Failure!</strong>
                    </div>
                    <div style="color: #ffffff;">
                        Level failed. Final score: ${result.finalScore}
                    </div>
                    <div style="color: #ffff00; margin-top: 15px;">
                        Exit and try again later
                    </div>
                `;
            }
            
            this.contentContainer.appendChild(completeDiv);
        }
        
        // Continue prompt
        if (!result.levelComplete) {
            const continueDiv = document.createElement('div');
            continueDiv.style.marginTop = '30px';
            continueDiv.style.color = '#00ff00';
            continueDiv.style.textAlign = 'center';
            continueDiv.style.fontSize = '14px';
            continueDiv.innerHTML = '<strong>Press any key to continue...</strong>';
            this.contentContainer.appendChild(continueDiv);
        }
    }
    
    updateProgress(current, target, goalText, unit) {
        this.progressContainer.innerHTML = '';
        this.progressContainer.style.display = 'block';
        
        const percent = Math.min(100, Math.floor((current / target) * 100));
        
        // Goal text
        const goalDiv = document.createElement('div');
        goalDiv.style.color = '#ffff00';
        goalDiv.style.marginBottom = '10px';
        goalDiv.innerHTML = `<strong>Goal:</strong> ${goalText}`;
        this.progressContainer.appendChild(goalDiv);
        
        // Progress bar
        const barContainer = document.createElement('div');
        barContainer.style.width = '100%';
        barContainer.style.height = '20px';
        barContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        barContainer.style.border = '2px solid #00ff00';
        barContainer.style.borderRadius = '4px';
        barContainer.style.overflow = 'hidden';
        barContainer.style.marginBottom = '10px';
        
        const barFill = document.createElement('div');
        barFill.style.width = `${percent}%`;
        barFill.style.height = '100%';
        barFill.style.backgroundColor = '#00ff00';
        barFill.style.transition = 'width 0.5s ease-in-out';
        
        barContainer.appendChild(barFill);
        this.progressContainer.appendChild(barContainer);
        
        // Progress text
        const progressText = document.createElement('div');
        progressText.style.color = '#00ffff';
        progressText.style.textAlign = 'center';
        progressText.style.fontSize = '11px';
        
        if (unit === 'funding') {
            progressText.innerHTML = `$${current.toLocaleString()} of $${target.toLocaleString()} raised`;
        } else if (unit === 'users') {
            progressText.innerHTML = `${current.toLocaleString()} of ${target.toLocaleString()} users acquired`;
        } else if (unit === 'hires') {
            progressText.innerHTML = `${current} of ${target} key roles hired`;
        } else if (unit === 'revenue') {
            progressText.innerHTML = `$${current.toLocaleString()} of $${target.toLocaleString()} ARR`;
        } else if (unit === 'capacity') {
            progressText.innerHTML = `${current.toLocaleString()} of ${target.toLocaleString()} user capacity`;
        } else {
            progressText.innerHTML = `${percent}% complete`;
        }
        
        this.progressContainer.appendChild(progressText);
    }
    
    setChoiceCallback(callback) {
        this.onChoiceCallback = callback;
    }
    
    displayMessage(message, duration = 3000) {
        this.contentContainer.innerHTML = '';
        
        const messageDiv = document.createElement('div');
        messageDiv.style.color = '#ffffff';
        messageDiv.style.textAlign = 'center';
        messageDiv.style.fontSize = '14px';
        messageDiv.style.padding = '40px';
        messageDiv.innerHTML = message;
        
        this.contentContainer.appendChild(messageDiv);
        this.show();
        
        if (duration > 0) {
            setTimeout(() => {
                this.hide();
            }, duration);
        }
    }
}
