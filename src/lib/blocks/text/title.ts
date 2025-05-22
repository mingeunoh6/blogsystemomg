import { TextBlock } from './TextBlock';

export default class Title extends TextBlock {
    constructor(parent: HTMLElement, text: string, readOnly: boolean = false) {
        super(parent, text, 'title', readOnly);
        this.init();
    }

    init() {
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'title-block-wrapper';
        this.parent.appendChild(wrapper);

        // Setup element
        wrapper.appendChild(this.element);
        
        this.setupElement('title-block-content', {
            width: '100%',
            fontSize: '24px',
            fontWeight: 'bold',
            padding: '8px',
            outline: 'none',
            border: this.readOnly ? 'none' : '1px solid transparent'
        });
    }
} 