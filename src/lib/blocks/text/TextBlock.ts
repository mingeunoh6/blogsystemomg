export abstract class TextBlock {
    protected text: string;
    protected parent: HTMLElement;
    protected element: HTMLElement;
    protected selectionTooltip: HTMLElement | null = null;
    protected type: string;
    protected readOnly: boolean;

    constructor(parent: HTMLElement, text: string, type: string, readOnly: boolean = false) {
        this.text = text;
        this.parent = parent;
        this.element = document.createElement("div");
        this.type = type;
        this.readOnly = readOnly;
    }

    protected generateUUID(): string {
        return Array.from({length: 6}, () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            return chars.charAt(Math.floor(Math.random() * chars.length));
        }).join('');
    }

    protected setupElement(className: string, styles: Record<string, string>): void {
        // Setup contenteditable div
        this.element.className = className;
        this.element.contentEditable = this.readOnly ? 'false' : 'true';
        this.element.innerHTML = this.text;
        this.element.id = this.generateUUID();
        
        // Apply styles
        Object.entries(styles).forEach(([property, value]) => {
            this.element.style[property as any] = value;
        });
        
        // Only add event listeners for editable mode
        if (!this.readOnly) {
            this.element.addEventListener('click', this.onClick.bind(this));
            this.element.addEventListener('input', this.onTextChange.bind(this));
            this.element.addEventListener('mouseup', this.onMouseUp.bind(this));
            this.element.addEventListener('keyup', this.onKeyUp.bind(this));
            this.element.addEventListener('blur', this.hideTooltip.bind(this));
        }
    }

    onClick(): void {
        // Handle click events
    }

    onTextChange(): void {
        this.text = this.element.innerHTML;
    }

    onMouseUp(): void {
        this.checkSelection();
    }

    onKeyUp(e: KeyboardEvent): void {
        // Check for keyboard shortcuts and selection
        if (e.key === 'Escape') {
            this.hideTooltip();
            return;
        }
        
        this.checkSelection();
    }

    checkSelection(): void {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0 && 
            selection.anchorNode && this.element.contains(selection.anchorNode)) {
            this.showTooltip(selection);
        } else {
            this.hideTooltip();
        }
    }

    showTooltip(selection: Selection): void {
        if (!this.selectionTooltip) {
            this.selectionTooltip = document.createElement('div');
            this.selectionTooltip.className = 'text-format-tooltip';
            this.selectionTooltip.style.position = 'absolute';
            this.selectionTooltip.style.background = '#333';
            this.selectionTooltip.style.color = '#fff';
            this.selectionTooltip.style.padding = '5px';
            this.selectionTooltip.style.borderRadius = '3px';
            this.selectionTooltip.style.zIndex = '1000';
            this.selectionTooltip.style.display = 'flex';
            this.selectionTooltip.style.gap = '5px';
            
            // Create formatting buttons
            this.createFormatButton('B', 'bold', { fontWeight: 'bold' });
            this.createFormatButton('I', 'italic', { fontStyle: 'italic' });
            this.createFormatButton('U', 'underline', { textDecoration: 'underline' });
            
            // Color button
            const colorBtn = document.createElement('button');
            colorBtn.innerHTML = 'A';
            colorBtn.style.margin = '0 2px';
            colorBtn.style.background = 'transparent';
            colorBtn.style.color = 'red';
            colorBtn.style.border = 'none';
            colorBtn.style.cursor = 'pointer';
            colorBtn.style.position = 'relative';
            colorBtn.title = 'Text Color';
            
            const colorPicker = document.createElement('input');
            colorPicker.type = 'color';
            colorPicker.style.opacity = '0';
            colorPicker.style.position = 'absolute';
            colorPicker.style.left = '0';
            colorPicker.style.top = '0';
            colorPicker.style.width = '100%';
            colorPicker.style.height = '100%';
            colorPicker.style.cursor = 'pointer';
            
            colorPicker.addEventListener('input', (e) => {
                const color = (e.target as HTMLInputElement).value;
                colorBtn.style.color = color;
                this.formatText('color', color);
            });
            
            colorBtn.appendChild(colorPicker);
            this.selectionTooltip.appendChild(colorBtn);
            
            document.body.appendChild(this.selectionTooltip);
        }
        
        // Position the tooltip above the selection
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        this.selectionTooltip.style.top = `${window.scrollY + rect.top - 40}px`;
        this.selectionTooltip.style.left = `${window.scrollX + rect.left + rect.width / 2 - this.selectionTooltip.offsetWidth / 2}px`;
        this.selectionTooltip.style.display = 'flex';
    }

    private createFormatButton(label: string, format: string, styles: Record<string, string>) {
        const button = document.createElement('button');
        button.innerHTML = label;
        button.title = format.charAt(0).toUpperCase() + format.slice(1);
        
        // Apply styles
        Object.entries({
            margin: '0 2px',
            background: 'transparent',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            ...styles
        }).forEach(([property, value]) => {
            button.style[property as any] = value;
        });
        
        button.onclick = () => this.formatText(format);
        
        if (this.selectionTooltip) {
            this.selectionTooltip.appendChild(button);
        }
    }

    hideTooltip(): void {
        if (this.selectionTooltip) {
            this.selectionTooltip.style.display = 'none';
        }
    }

    formatText(format: string, value?: string): void {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        switch (format) {
            case 'bold':
                document.execCommand('bold', false);
                break;
            case 'italic':
                document.execCommand('italic', false);
                break;
            case 'underline':
                document.execCommand('underline', false);
                break;
            case 'color':
                if (value) {
                    document.execCommand('foreColor', false, value);
                }
                break;
        }
        
        // Update text state after formatting
        this.text = this.element.innerHTML;
        this.hideTooltip();
    }

    toJSON() {
        return {
            id: this.element.id,
            type: this.type,
            content: this.element.innerHTML
        };
    }
} 