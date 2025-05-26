export abstract class Block {
  protected id: string;
  protected parent: HTMLElement;
  protected element: HTMLElement;
  protected contextMenu: HTMLElement | null = null;
  protected blockWrapper: HTMLElement | null = null;
  protected type: string;
  protected readOnly: boolean;

  // Custom event for block deletion
  protected deleteBlockEvent = new CustomEvent("deleteBlock", {
    bubbles: true,
    detail: { blockId: "" },
  });

  constructor(parent: HTMLElement, type: string, readOnly: boolean = false) {
    this.parent = parent;
    this.element = document.createElement("div");
    this.type = type;
    this.readOnly = readOnly;
    this.id = this.generateUUID();
  }

  protected generateUUID(): string {
    return Array.from({ length: 6 }, () => {
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      return chars.charAt(Math.floor(Math.random() * chars.length));
    }).join("");
  }

  protected setupElement(
    className: string,
    styles: Record<string, string>
  ): void {
    // Setup element
    this.element.className = className;
    this.element.id = this.id;

    // Apply styles
    Object.entries(styles).forEach(([property, value]) => {
      this.element.style[property as any] = value;
    });

    // Store the blockWrapper reference for context menu
    setTimeout(() => {
      this.blockWrapper = this.element.closest(
        ".text-block-wrapper, .title-block-wrapper, .block-wrapper"
      ) as HTMLElement;
      if (this.blockWrapper && !this.readOnly) {
        // Add context menu event listener
        this.blockWrapper.addEventListener(
          "contextmenu",
          this.showContextMenu.bind(this)
        );
      }
    }, 0);
  }

  showContextMenu(e: MouseEvent): void {
    e.preventDefault();

    // Hide any existing context menu
    this.hideContextMenu();

    // Create context menu
    this.contextMenu = document.createElement("div");
    this.contextMenu.className = "block-context-menu";
    this.contextMenu.style.position = "absolute";
    this.contextMenu.style.zIndex = "2000";
    this.contextMenu.style.background = "#fff";
    this.contextMenu.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    this.contextMenu.style.borderRadius = "4px";
    this.contextMenu.style.padding = "5px 0";

    // Create delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "블럭 제거";
    deleteBtn.className = "context-menu-btn";
    deleteBtn.style.display = "block";
    deleteBtn.style.width = "100%";
    deleteBtn.style.padding = "8px 12px";
    deleteBtn.style.textAlign = "left";
    deleteBtn.style.background = "none";
    deleteBtn.style.border = "none";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.style.fontSize = "14px";

    // Hover effect
    deleteBtn.addEventListener("mouseover", () => {
      deleteBtn.style.background = "#f0f0f0";
    });

    deleteBtn.addEventListener("mouseout", () => {
      deleteBtn.style.background = "none";
    });

    // Delete action
    deleteBtn.addEventListener("click", () => {
      console.log("Delete button clicked for block:", this.element.id);

      // Create and dispatch custom event for block deletion
      const deleteEvent = new CustomEvent("deleteBlock", {
        bubbles: true,
        detail: { blockId: this.element.id },
      });

      this.element.dispatchEvent(deleteEvent);

      // Hide the context menu
      this.hideContextMenu();
    });

    this.contextMenu.appendChild(deleteBtn);
    document.body.appendChild(this.contextMenu);

    // Position the context menu at mouse coordinates
    this.contextMenu.style.top = `${e.clientY + window.scrollY}px`;
    this.contextMenu.style.left = `${e.clientX + window.scrollX}px`;

    // Close the context menu when clicking outside
    setTimeout(() => {
      document.addEventListener("click", this.hideContextMenu.bind(this), {
        once: true,
      });
    }, 0);
  }

  hideContextMenu(): void {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
    }
  }

  abstract toJSON(): Record<string, any>;
}
