import { TextBlock } from './TextBlock';

export default class Title extends TextBlock {
  constructor(
    parent: HTMLElement,
    text: string,
    level: number = 1,
    readOnly: boolean = false
  ) {
    super(parent, text, "title", readOnly);
    this.level = level;
    this.init();
  }

  init() {
    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "title-block-wrapper";
    this.parent.appendChild(wrapper);

    // Setup element
    wrapper.appendChild(this.element);

    //제목 크기 설정
    let fontSize;
    switch (this.level) {
      case 1:
        fontSize = "42px";
        break;
      case 2:
        fontSize = "36px";
        break;
      case 3:
        fontSize = "24px";
        break;
      case 4:
        fontSize = "18px";
        break;
      default:
        fontSize = "24px";
    }

    this.setupElement("title-block-content", {
      boxSizing: "border-box",
      width: "100%",
      fontSize: fontSize,
      fontWeight: "bold",
      padding: "8px",
      outline: "none",
      margin: "0px",
      border: this.readOnly ? "none" : "1px solid rgba(0,0,0,0.5)",
    });

    // Add event listeners only if not in readOnly mode
    if (!this.readOnly) {
      // Force event listeners for editing features
      this.element.addEventListener("mouseup", this.onMouseUp.bind(this));
      this.element.addEventListener("keyup", this.onKeyUp.bind(this));
      this.element.addEventListener("input", this.onTextChange.bind(this));
    }
  }

  // Title 블록의 level 정보를 명시적으로 JSON에 포함
  toJSON() {
    return {
      id: this.element.id,
      type: this.type,
      content: this.element.innerHTML,
      level: this.level,
    };
  }
} 