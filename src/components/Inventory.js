import { trackEvent } from '../utils/analytics.js';

export class Inventory {
    constructor() {
        this.items = [];
        this.maxSlots = 20;
        this.isVisible = false;
        
        // Create inventory UI
        this.createInventoryUI();
        
        // Bind keyboard handler
        this.handleKeyPress = this.handleKeyPress.bind(this);
        document.addEventListener('keydown', this.handleKeyPress);
    }
    
    createInventoryUI() {
        // Create main inventory container
        this.inventoryContainer = document.createElement('div');
        this.inventoryContainer.id = 'inventory-container';
        this.inventoryContainer.dataset.sectionId = 'inventory';
        this.inventoryContainer.style.position = 'fixed';
        this.inventoryContainer.style.top = '50%';
        this.inventoryContainer.style.left = '50%';
        this.inventoryContainer.style.transform = 'translate(-50%, -50%)';
        this.inventoryContainer.style.width = '600px';
        this.inventoryContainer.style.height = '400px';
        this.inventoryContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
        this.inventoryContainer.style.border = '4px solid #8B4513';
        this.inventoryContainer.style.borderRadius = '8px';
        this.inventoryContainer.style.padding = '20px';
        this.inventoryContainer.style.display = 'none';
        this.inventoryContainer.style.zIndex = '10002';
        this.inventoryContainer.style.fontFamily = '"Press Start 2P", monospace';
        this.inventoryContainer.style.color = '#ffffff';
        
        // Title
        const title = document.createElement('h2');
        title.textContent = 'INVENTORY';
        title.style.textAlign = 'center';
        title.style.marginBottom = '20px';
        title.style.fontSize = '20px';
        title.style.color = '#ffff00';
        this.inventoryContainer.appendChild(title);
        
        // Grid container
        this.gridContainer = document.createElement('div');
        this.gridContainer.style.display = 'grid';
        this.gridContainer.style.gridTemplateColumns = 'repeat(5, 1fr)';
        this.gridContainer.style.gridTemplateRows = 'repeat(4, 1fr)';
        this.gridContainer.style.gap = '10px';
        this.gridContainer.style.height = '280px';
        this.inventoryContainer.appendChild(this.gridContainer);
        
        // Create inventory slots
        for (let i = 0; i < this.maxSlots; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.style.backgroundColor = 'rgba(139, 69, 19, 0.3)';
            slot.style.border = '2px solid #8B4513';
            slot.style.borderRadius = '4px';
            slot.style.display = 'flex';
            slot.style.alignItems = 'center';
            slot.style.justifyContent = 'center';
            slot.style.cursor = 'pointer';
            slot.style.position = 'relative';
            slot.dataset.slotIndex = i;
            
            this.gridContainer.appendChild(slot);
        }
        
        // Instructions
        const instructions = document.createElement('div');
        instructions.style.position = 'absolute';
        instructions.style.bottom = '10px';
        instructions.style.left = '50%';
        instructions.style.transform = 'translateX(-50%)';
        instructions.style.fontSize = '10px';
        instructions.style.color = '#888888';
        instructions.textContent = 'Press I to close';
        this.inventoryContainer.appendChild(instructions);
        
        document.body.appendChild(this.inventoryContainer);
    }
    
    handleKeyPress(event) {
        if (event.key.toLowerCase() === 'i') {
            this.toggle();
        }
    }
    
    toggle() {
        this.isVisible = !this.isVisible;
        this.inventoryContainer.style.display = this.isVisible ? 'block' : 'none';

        if (this.isVisible) {
            trackEvent('inventory-opened', { itemCount: this.items.length });
            this.updateDisplay();
        } else {
            trackEvent('inventory-closed');
        }
    }
    
    show() {
        this.isVisible = true;
        this.inventoryContainer.style.display = 'block';
        this.updateDisplay();
    }
    
    hide() {
        this.isVisible = false;
        this.inventoryContainer.style.display = 'none';
    }
    
    addItem(item) {
        if (this.items.length < this.maxSlots) {
            this.items.push(item);
            trackEvent('item-collected', { item: item.name });
            this.updateDisplay();
            return true;
        }
        trackEvent('inventory-full', { item: item.name });
        return false; // Inventory full
    }
    
    removeItem(index) {
        if (index >= 0 && index < this.items.length) {
            this.items.splice(index, 1);
            this.updateDisplay();
            return true;
        }
        return false;
    }
    
    hasItem(itemName) {
        return this.items.some(item => item.name === itemName);
    }
    
    updateDisplay() {
        const slots = this.gridContainer.querySelectorAll('.inventory-slot');
        
        slots.forEach((slot, index) => {
            slot.innerHTML = ''; // Clear slot
            
            if (index < this.items.length) {
                const item = this.items[index];
                
                // Create item display
                const itemDisplay = document.createElement('div');
                itemDisplay.style.width = '100%';
                itemDisplay.style.height = '100%';
                itemDisplay.style.display = 'flex';
                itemDisplay.style.flexDirection = 'column';
                itemDisplay.style.alignItems = 'center';
                itemDisplay.style.justifyContent = 'center';
                
                // Item icon (using emoji or text for now)
                const icon = document.createElement('div');
                icon.style.fontSize = '24px';
                icon.textContent = item.icon || '📦';
                itemDisplay.appendChild(icon);
                
                // Item name
                const name = document.createElement('div');
                name.style.fontSize = '8px';
                name.style.marginTop = '4px';
                name.style.textAlign = 'center';
                name.textContent = item.name;
                itemDisplay.appendChild(name);
                
                slot.appendChild(itemDisplay);
            }
        });
    }
}
