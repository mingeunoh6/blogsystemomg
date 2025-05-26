<script lang="ts">
  import { onMount } from "svelte";
  import Body from '$lib/blocks/text/body';
  import Title from '$lib/blocks/text/title';

  let editArea: HTMLElement | null = null;
  let blocks: Array<{id: string, type: string, content: string}> = $state([]);
  let isEditorActive = $state(false);
  let articleTitle = $state("제목을 입력하세요");
  let currentFocusedBlock: HTMLElement | null = $state(null);

  function activateEditor() {
    isEditorActive = true;
  }

  function trackFocusedBlock(e: MouseEvent) {
    // Find the closest parent block wrapper
    const target = e.target as HTMLElement;
    const blockWrapper = target.closest('.text-block-wrapper, .title-block-wrapper');
    
    if (blockWrapper) {
      currentFocusedBlock = blockWrapper as HTMLElement;
      console.log('Current focused block:', currentFocusedBlock);
    } else {
      // If clicked directly on edit area (not on a block), set to null
      if (target === editArea) {
        currentFocusedBlock = null;
      }
    }
  }

  // Handle block deletion
  function handleBlockDelete(e: CustomEvent) {
    console.log('Delete block event received', e.detail);
    const blockId = e.detail.blockId;
    
    if (blockId && editArea) {
      // Find the block element
      const blockElement = document.getElementById(blockId);
      
      if (blockElement) {
        // Find the block wrapper
        const blockWrapper = blockElement.closest('.text-block-wrapper, .title-block-wrapper');
        
        if (blockWrapper) {
          // Find the previous block wrapper to focus after deletion
          const prevBlockWrapper = blockWrapper.previousElementSibling as HTMLElement;
          const nextBlockWrapper = blockWrapper.nextElementSibling as HTMLElement;
          
          // Remove the block wrapper
          blockWrapper.remove();
          
          // Update the blocks array
          updateBlocksArray();
          
          // Update focus to the previous block or next block if available
          if (prevBlockWrapper) {
            currentFocusedBlock = prevBlockWrapper;
            // Focus on the contenteditable inside this wrapper
            const contentEditable = prevBlockWrapper.querySelector('[contenteditable="true"]') as HTMLElement;
            if (contentEditable) {
              // Focus the element
              contentEditable.focus();
              
              // Place cursor at the end of the text
              const range = document.createRange();
              const selection = window.getSelection();
              
              // Set range to end of contentEditable
              range.selectNodeContents(contentEditable);
              range.collapse(false); // false means collapse to end
              
              // Apply the range
              if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
              }
            }
          } else if (nextBlockWrapper) {
            currentFocusedBlock = nextBlockWrapper;
            // Focus on the contenteditable inside this wrapper
            const contentEditable = nextBlockWrapper.querySelector('[contenteditable="true"]');
            if (contentEditable) {
              (contentEditable as HTMLElement).focus();
            }
          } else {
            // No blocks left, clear current focused block
            currentFocusedBlock = null;
          }
        }
      }
    }
  }

  function addTextBlock() {
    if (editArea) {
      // If we have a focused block, insert after it
      if (currentFocusedBlock) {
        const newBlock = new Body(editArea, 'Click to start typing...', false);
        
        // Move the created block after the focused block by DOM manipulation
        const newBlockWrapper = editArea.querySelector(`.text-block-wrapper:last-child`) as HTMLElement;
        if (newBlockWrapper) {
          currentFocusedBlock.after(newBlockWrapper);
          
          // Update blocks array
          updateBlocksArray();
          
          // Update the focused block to the newly added one
          currentFocusedBlock = newBlockWrapper;
        }
      } else {
        // Default behavior: add to the end
        const textBlock = new Body(editArea, 'Click to start typing...', false);
        blocks = [...blocks, textBlock.toJSON()];
      }
    }
  }

  function addTitleBlock(level: number = 1) {
    if (editArea) {
      // If we have a focused block, insert after it
      if (currentFocusedBlock) {
        const newBlock = new Title(editArea, 'Add Title Here', level, false);
        
        // Move the created block after the focused block by DOM manipulation
        const newBlockWrapper = editArea.querySelector(`.title-block-wrapper:last-child`) as HTMLElement;
        if (newBlockWrapper) {
          currentFocusedBlock.after(newBlockWrapper);
          
          // Update blocks array
          updateBlocksArray();
          
          // Update the focused block to the newly added one
          currentFocusedBlock = newBlockWrapper;
        }
      } else {
        // Default behavior: add to the end
        const titleBlock = new Title(editArea, 'Add Title Here', level, false);
        blocks = [...blocks, titleBlock.toJSON()];
      }
    }
  }
  
  // Function to update blocks array based on current DOM state
  function updateBlocksArray() {
    if (editArea) {
      const blockElements = editArea.querySelectorAll('.text-block-content, .title-block-content');
      
      // Create new blocks array from current DOM state
      const updatedBlocks = Array.from(blockElements).map(el => {
        const element = el as HTMLElement;
        const blockType = element.classList.contains('title-block-content') ? 'title' : 'body';
        
        // Create basic block data
        const blockData: any = {
          id: element.id,
          type: blockType,
          content: element.innerHTML
        };
        
        // Add level information for title blocks
        if (blockType === 'title') {
          // Get level from fontSize style (36px -> 2, 24px -> 3, etc.)
          const fontSize = element.style.fontSize;
          let level = 1; // Default level
          
          if (fontSize) {
            const size = parseInt(fontSize);
            if (size >= 40) level = 1;
            else if (size >= 30) level = 2;
            else if (size >= 20) level = 3;
            else level = 4;
          }
          
          blockData.level = level;
        }
        
        return blockData;
      });
      
      // Update the blocks state
      blocks = updatedBlocks;
    }
  }

  // Save content as JSON
  async function saveContent() {
    if (editArea) {
      // Update blocks array with current content
      updateBlocksArray();
      
      // Save to JSON
      const editorContent = {
        title: articleTitle,
        blocks: blocks
      };
      
      try {
        // API 호출하여 Google Drive에 저장
        const response = await fetch('/api/blog', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(editorContent)
        });
        
        const result = await response.json();
        
        if (result.success) {
          alert(`저장 성공!\n\nID: ${result.uuid}\n파일이 Google Drive에 업로드되었고 스프레드시트에 기록되었습니다.\n\n링크: ${result.file.webViewLink}`);
        } else {
          alert('저장 실패: ' + result.message);
        }
      } catch (err) {
        console.error('저장 오류:', err);
        alert('저장 중 오류가 발생했습니다.');
      }
    }
  }

  onMount(() => {
    console.log('editor mounted');
    // Add initial title block if there are no blocks
    if (blocks.length === 0 && editArea) {
      addTitleBlock();
    }

    // Add event listener for block deletion
    if (editArea) {
      editArea.addEventListener('deleteBlock', handleBlockDelete as EventListener);
    }

    // Cleanup event listener when component is destroyed
    return () => {
      if (editArea) {
        editArea.removeEventListener('deleteBlock', handleBlockDelete as EventListener);
      }
    };
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

<svelte:window onkeydown={handleKeydown} />

<div class="editor-container">
  <h2 class="editor-heading">블록형 텍스트 에디터</h2>
  
  <div class="toolbar">
    <div class="toolbar-group">
      <button onclick={addTextBlock} title="Add Text Block (Ctrl+B)">
        <span>T</span> 본문 추가
      </button>
      <button onclick={() => addTitleBlock(1)} title="Add Title Block (Ctrl+H)">
        <span>H</span> 제목1
      </button>
        <button onclick={() => addTitleBlock(2)} title="Add Title Block (Ctrl+H)">
        <span>H</span> 제목2
      </button>
        <button onclick={() => addTitleBlock(3)} title="Add Title Block (Ctrl+H)">
        <span>H</span> 제목3
      </button>
        <button onclick={() => addTitleBlock(4)} title="Add Title Block (Ctrl+H)">
        <span>H</span> 제목4
      </button>
    </div>
    <div class="toolbar-group">
      <button onclick={saveContent} class="save-btn" title="Save Content (Ctrl+S)">
        저장
      </button>
    </div>
  </div>
  
  <div class="edit-title-container">
    <input 
      type="text" 
      bind:value={articleTitle} 
      class="article-title-input" 
      placeholder="게시글 제목을 입력하세요"
    />
  </div>
  
  <div class="edit-area-container">
    <div 
      class="edit-area" 
      bind:this={editArea} 
      onclick={activateEditor} 
      onmousedown={trackFocusedBlock}
    >
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
  
  .edit-title-container {
    margin-bottom: 15px;
  }
  
  .article-title-input {
    width: 100%;
    padding: 12px 15px;
    font-size: 20px;
    font-weight: bold;
    border: 1px solid #ddd;
    border-radius: 4px;
    outline: none;
    transition: border-color 0.3s;
  }
  
  .article-title-input:focus {
    border-color: #4CAF50;
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