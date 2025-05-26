import { Block } from "./Block";

export abstract class TextBlock extends Block {
  protected text: string;
  protected selectionTooltip: HTMLElement | null = null;
  protected level: number = 1; // Default level

  constructor(
    parent: HTMLElement,
    text: string,
    type: string,
    readOnly: boolean = false
  ) {
    super(parent, type, readOnly);
    this.text = text;
  }

  protected setupElement(
    className: string,
    styles: Record<string, string>
  ): void {
    // Setup contenteditable div
    super.setupElement(className, styles);
    this.element.contentEditable = this.readOnly ? "false" : "true";
    this.element.innerHTML = this.text;

    // Only add event listeners for editable mode
    if (!this.readOnly) {
      this.element.addEventListener("click", this.onClick.bind(this));
      this.element.addEventListener("input", this.onTextChange.bind(this));
      this.element.addEventListener("mouseup", this.onMouseUp.bind(this));
      this.element.addEventListener("keyup", this.onKeyUp.bind(this));
      this.element.addEventListener("keydown", this.onKeyDown.bind(this));
      this.element.addEventListener("blur", this.hideTooltip.bind(this));
    }
  }

  onClick(): void {
    // Handle click events
  }

  onTextChange(): void {
    this.text = this.element.innerHTML;
  }

  onMouseUp(): void {
    // Only check selection if not in readOnly mode
    if (!this.readOnly) {
      this.checkSelection();
    }
  }

  onKeyUp(e: KeyboardEvent): void {
    // Only handle keyboard events if not in readOnly mode
    if (this.readOnly) return;

    // Check for keyboard shortcuts and selection
    if (e.key === "Escape") {
      this.hideTooltip();
      return;
    }

    this.checkSelection();
  }

  onKeyDown(e: KeyboardEvent): void {
    // Check if content is empty and backspace/delete was pressed
    if (!this.readOnly && (e.key === "Backspace" || e.key === "Delete")) {
      // Check if content is empty or only contains HTML tags with no text
      const content = this.element.innerHTML.trim();
      const hasOnlyTags =
        content === "" ||
        content === "<br>" ||
        content === "<div></div>" ||
        content === "<div><br></div>";

      if (hasOnlyTags) {
        console.log("Empty block detected, triggering delete");

        // Create and dispatch custom event for block deletion
        const deleteEvent = new CustomEvent("deleteBlock", {
          bubbles: true,
          detail: { blockId: this.element.id },
        });

        this.element.dispatchEvent(deleteEvent);

        // Prevent default to avoid additional backspace behavior
        e.preventDefault();
      }
    }
  }

  checkSelection(): void {
    const selection = window.getSelection();
    if (
      selection &&
      selection.toString().trim().length > 0 &&
      selection.anchorNode &&
      this.element.contains(selection.anchorNode)
    ) {
      this.showTooltip(selection);
    } else {
      this.hideTooltip();
    }
  }

  showTooltip(selection: Selection): void {
    if (!this.selectionTooltip) {
      this.selectionTooltip = document.createElement("div");
      this.selectionTooltip.className = "text-format-tooltip";
      this.selectionTooltip.style.position = "absolute";
      this.selectionTooltip.style.background = "#333";
      this.selectionTooltip.style.color = "#fff";
      this.selectionTooltip.style.padding = "5px";
      this.selectionTooltip.style.borderRadius = "3px";
      this.selectionTooltip.style.zIndex = "1000";
      this.selectionTooltip.style.display = "flex";
      this.selectionTooltip.style.gap = "5px";

      // Create formatting buttons with direct event listeners
      const boldBtn = document.createElement("button");
      boldBtn.innerHTML = "B";
      boldBtn.style.fontWeight = "bold";
      boldBtn.style.margin = "0 2px";
      boldBtn.style.background = "transparent";
      boldBtn.style.color = "#fff";
      boldBtn.style.border = "none";
      boldBtn.style.cursor = "pointer";
      boldBtn.title = "Bold";
      boldBtn.addEventListener("mousedown", (e) => {
        e.preventDefault(); // Prevent losing focus
        console.log("Bold button clicked");
        this.formatText("bold");
      });

      const italicBtn = document.createElement("button");
      italicBtn.innerHTML = "I";
      italicBtn.style.fontStyle = "italic";
      italicBtn.style.margin = "0 2px";
      italicBtn.style.background = "transparent";
      italicBtn.style.color = "#fff";
      italicBtn.style.border = "none";
      italicBtn.style.cursor = "pointer";
      italicBtn.title = "Italic";
      italicBtn.addEventListener("mousedown", (e) => {
        e.preventDefault(); // Prevent losing focus
        console.log("Italic button clicked");
        this.formatText("italic");
      });

      const underlineBtn = document.createElement("button");
      underlineBtn.innerHTML = "U";
      underlineBtn.style.textDecoration = "underline";
      underlineBtn.style.margin = "0 2px";
      underlineBtn.style.background = "transparent";
      underlineBtn.style.color = "#fff";
      underlineBtn.style.border = "none";
      underlineBtn.style.cursor = "pointer";
      underlineBtn.title = "Underline";
      underlineBtn.addEventListener("mousedown", (e) => {
        e.preventDefault(); // Prevent losing focus
        console.log("Underline button clicked");
        this.formatText("underline");
      });

      this.selectionTooltip.appendChild(boldBtn);
      this.selectionTooltip.appendChild(italicBtn);
      this.selectionTooltip.appendChild(underlineBtn);

      // Color button with direct event listener
      const colorBtn = document.createElement("button");
      colorBtn.innerHTML = "A";
      colorBtn.style.margin = "0 2px";
      colorBtn.style.background = "transparent";
      colorBtn.style.color = "red";
      colorBtn.style.border = "none";
      colorBtn.style.cursor = "pointer";
      colorBtn.style.position = "relative";
      colorBtn.title = "Text Color";

      const colorPicker = document.createElement("input");
      colorPicker.type = "color";
      colorPicker.style.opacity = "0";
      colorPicker.style.position = "absolute";
      colorPicker.style.left = "0";
      colorPicker.style.top = "0";
      colorPicker.style.width = "100%";
      colorPicker.style.height = "100%";
      colorPicker.style.cursor = "pointer";

      colorPicker.addEventListener("input", (e) => {
        const color = (e.target as HTMLInputElement).value;
        colorBtn.style.color = color;
        console.log("Color changed:", color);
        this.formatText("color", color);
      });

      colorBtn.appendChild(colorPicker);
      this.selectionTooltip.appendChild(colorBtn);

      document.body.appendChild(this.selectionTooltip);
    }

    // Position the tooltip above the selection
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    this.selectionTooltip.style.top = `${window.scrollY + rect.top - 40}px`;
    this.selectionTooltip.style.left = `${
      window.scrollX +
      rect.left +
      rect.width / 2 -
      this.selectionTooltip.offsetWidth / 2
    }px`;
    this.selectionTooltip.style.display = "flex";
  }

  private createFormatButton(
    label: string,
    format: string,
    styles: Record<string, string>
  ) {
    const button = document.createElement("button");
    button.innerHTML = label;
    button.title = format.charAt(0).toUpperCase() + format.slice(1);

    // Apply styles
    Object.entries({
      margin: "0 2px",
      background: "transparent",
      color: "#fff",
      border: "none",
      cursor: "pointer",
      ...styles,
    }).forEach(([property, value]) => {
      button.style[property as any] = value;
    });

    // Direct event listener instead of onclick property
    button.addEventListener("mousedown", (e) => {
      e.preventDefault(); // Prevent losing focus
      console.log(`Button clicked: ${format}`);
      this.formatText(format);
    });

    if (this.selectionTooltip) {
      this.selectionTooltip.appendChild(button);
    }

    return button;
  }

  hideTooltip(): void {
    if (this.selectionTooltip) {
      this.selectionTooltip.style.display = "none";
    }
  }

  formatText(format: string, value?: string): void {
    console.log(
      `formatText called: ${format}, isContentEditable:`,
      this.element.isContentEditable
    );

    // Ensure the element is editable
    if (!this.element.isContentEditable) {
      console.warn("Element is not contentEditable");
      return;
    }

    // Make sure we have focus
    this.element.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      console.warn("No selection available");
      return;
    }

    // Get the current selection range
    const range = selection.getRangeAt(0);
    console.log("Selected text:", range.toString());

    try {
      let success = false;

      // Apply the appropriate formatting
      switch (format) {
        case "bold":
          success = document.execCommand("bold", false);
          break;
        case "italic":
          success = document.execCommand("italic", false);
          break;
        case "underline":
          success = document.execCommand("underline", false);
          break;
        case "color":
          if (value) {
            success = document.execCommand("foreColor", false, value);
          }
          break;
      }

      console.log(
        `Format applied (${format}): ${success ? "success" : "failed"}`
      );

      // Update text state after formatting
      this.text = this.element.innerHTML;
      this.hideTooltip();
    } catch (e) {
      console.error("Error applying formatting:", e);
    }
  }

  toJSON() {
    return {
      id: this.element.id,
      type: this.type,
      content: this.element.innerHTML,
      level: this.type === "title" ? this.level : undefined, // Only include level for title blocks
    };
  }
}
