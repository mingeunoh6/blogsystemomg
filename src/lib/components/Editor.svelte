<script lang="ts">
  import { onMount } from "svelte";
  import Body from '$lib/blocks/text/body';
  import Title from '$lib/blocks/text/title';

  let editArea: HTMLElement | null = null;
  let blocks: Array<{id: string, type: string, content: string}> = [];
  let isEditorActive = false;

  function activateEditor() {
    isEditorActive = true;
  }

  function addTextBlock() {
    if (editArea) {
      const textBlock = new Body(editArea, 'Click to start typing...');
      blocks = [...blocks, textBlock.toJSON()];
    }
  }

  function addTitleBlock() {
    if (editArea) {
      const titleBlock = new Title(editArea, 'Add Title Here');
      blocks = [...blocks, titleBlock.toJSON()];
    }
  }

  // Save content as JSON
  function saveContent() {
    if (editArea) {
      // Update blocks array with current content
      const blockElements = editArea.querySelectorAll('.text-block-content, .title-block-content');
      
      // Create new blocks array from current DOM state
      const updatedBlocks = Array.from(blockElements).map(el => {
        const element = el as HTMLElement;
        const blockType = element.classList.contains('title-block-content') ? 'title' : 'body';
        
        return {
          id: element.id,
          type: blockType,
          content: element.innerHTML
        };
      });
      
      // Update the blocks state
      blocks = updatedBlocks;
      
      // Save to JSON
      const editorContent = {
        blocks: blocks
      };
      const jsonContent = JSON.stringify(editorContent, null, 2);
      console.log('Saving content:', jsonContent);
      
      // Display the JSON in an alert for demo purposes
      
      console.log(jsonContent)
      // In a real app, you would send this to your backend
    }
  }

  onMount(() => {
    console.log('editor mounted');
    // Add initial title block if there are no blocks
    if (blocks.length === 0 && editArea) {
      addTitleBlock();
    }
  });

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    // Only handle if editor is active
    if (!isEditorActive) return;

    // Ctrl+B for new body text block
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      addTextBlock();
    }
    
    // Ctrl+H for new heading/title block
    if (e.ctrlKey && e.key === 'h') {
      e.preventDefault();
      addTitleBlock();
    }
    
    // Ctrl+S to save
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveContent();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="editor-container">
  <h2 class="editor-heading">블록형 텍스트 에디터</h2>
  
  <div class="toolbar">
    <div class="toolbar-group">
      <button on:click={addTextBlock} title="Add Text Block (Ctrl+B)">
        <span>T</span> 본문 추가
      </button>
      <button on:click={addTitleBlock} title="Add Title Block (Ctrl+H)">
        <span>H</span> 제목 추가
      </button>
    </div>
    <div class="toolbar-group">
      <button on:click={saveContent} class="save-btn" title="Save Content (Ctrl+S)">
        저장
      </button>
    </div>
  </div>
  
  <div class="edit-area-container">
    <div class="edit-area" bind:this={editArea} on:click={activateEditor}>
      <!-- Blocks will be added here -->
    </div>
  </div>
  
  <div class="editor-footer">
    <div class="blocks-info">
      블록 수: {blocks.length}
    </div>
    <div class="keyboard-shortcuts">
      단축키: Ctrl+B (본문 추가), Ctrl+H (제목 추가), Ctrl+S (저장)
    </div>
  </div>
</div>

<style>
  .editor-container {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
  
  .editor-heading {
    text-align: center;
    margin-bottom: 20px;
    color: #333;
  }
  
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding: 10px;
    background-color: #f5f5f5;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  .toolbar-group {
    display: flex;
    gap: 10px;
  }
  
  .toolbar button {
    padding: 8px 12px;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: all 0.2s;
  }
  
  .toolbar button:hover {
    background-color: #f0f0f0;
    border-color: #bbb;
  }
  
  .toolbar button span {
    font-weight: bold;
    font-size: 16px;
  }
  
  .save-btn {
    background-color: #4CAF50 !important;
    color: white;
    border-color: #43A047 !important;
  }
  
  .save-btn:hover {
    background-color: #43A047 !important;
    border-color: #388E3C !important;
  }
  
  .edit-area-container {
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    margin-bottom: 15px;
  }
  
  .edit-area {
    position: relative;
    width: 100%;
    min-height: 400px;
    box-sizing: border-box;
    padding: 20px;
    cursor: text;
    overflow-y: auto;
  }
  
  .editor-footer {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #666;
    padding: 10px 0;
  }
  
  /* Empty state */
  .edit-area:empty::before {
    content: "Click 'ADD TEXT' or 'ADD TITLE' to start editing";
    color: #999;
    font-style: italic;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
</style>