import { TextBlock } from './TextBlock';

export default class Body extends TextBlock {
    constructor(parent: HTMLElement, text: string, readOnly: boolean = false) {
        super(parent, text, 'body', readOnly);
        this.init();
    }

    init() {
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'text-block-wrapper';
        this.parent.appendChild(wrapper);

        // Setup element
        wrapper.appendChild(this.element);
        
        this.setupElement('text-block-content', {
            width: '100%',
            minHeight: '50px',
            padding: '8px',
            outline: 'none',
            border: this.readOnly ? 'none' : '1px solid transparent'
        });
        
        // Add event listeners
        this.element.addEventListener('click', this.onClick.bind(this));
        this.element.addEventListener('input', this.onTextChange.bind(this));
        this.element.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.element.addEventListener('keyup', this.onKeyUp.bind(this));
        this.element.addEventListener('blur', this.hideTooltip.bind(this));
    }

    onClick() {
        // Handle click events
    }

    onTextChange() {
        this.text = this.element.innerHTML;
    }

    onMouseUp() {
        this.checkSelection();
    }

    onKeyUp(e: KeyboardEvent) {
        // Check for keyboard shortcuts and selection
        if (e.key === 'Escape') {
            this.hideTooltip();
            return;
        }
        
        this.checkSelection();
    }

    checkSelection() {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0 && 
            selection.anchorNode && this.element.contains(selection.anchorNode)) {
            this.showTooltip(selection);
        } else {
            this.hideTooltip();
        }
    }

    showTooltip(selection: Selection) {
        if (!this.selectionTooltip) {
            this.selectionTooltip = document.createElement('div');
            this.selectionTooltip.className = 'text-format-tooltip';
            this.selectionTooltip.style.position = 'absolute';
            this.selectionTooltip.style.background = '#333';
            this.selectionTooltip.style.color = '#fff';
            this.selectionTooltip.style.padding = '5px';
            this.selectionTooltip.style.borderRadius = '3px';
            this.selectionTooltip.style.zIndex = '1000';
            
            // Add formatting buttons
            const boldBtn = document.createElement('button');
            boldBtn.innerHTML = 'B';
            boldBtn.style.fontWeight = 'bold';
            boldBtn.style.margin = '0 5px';
            boldBtn.style.background = 'transparent';
            boldBtn.style.color = '#fff';
            boldBtn.style.border = 'none';
            boldBtn.style.cursor = 'pointer';
            boldBtn.onclick = () => this.formatText('bold');
            
            const italicBtn = document.createElement('button');
            italicBtn.innerHTML = 'I';
            italicBtn.style.fontStyle = 'italic';
            italicBtn.style.margin = '0 5px';
            italicBtn.style.background = 'transparent';
            italicBtn.style.color = '#fff';
            italicBtn.style.border = 'none';
            italicBtn.style.cursor = 'pointer';
            italicBtn.onclick = () => this.formatText('italic');
            
            this.selectionTooltip.appendChild(boldBtn);
            this.selectionTooltip.appendChild(italicBtn);
            
            document.body.appendChild(this.selectionTooltip);
        }
        
        // Position the tooltip above the selection
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        this.selectionTooltip.style.top = `${window.scrollY + rect.top - 40}px`;
        this.selectionTooltip.style.left = `${window.scrollX + rect.left + rect.width / 2 - this.selectionTooltip.offsetWidth / 2}px`;
        this.selectionTooltip.style.display = 'block';
    }

    hideTooltip() {
        if (this.selectionTooltip) {
            this.selectionTooltip.style.display = 'none';
        }
    }

    formatText(format: 'bold' | 'italic') {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        
        if (format === 'bold') {
            document.execCommand('bold', false);
        } else if (format === 'italic') {
            document.execCommand('italic', false);
        }
        
        // Update text state after formatting
        this.text = this.element.innerHTML;
        this.hideTooltip();
    }

    toJSON() {
        return {
            id: this.element.id,
            type: 'body',
            content: this.element.innerHTML
        };
    }
}