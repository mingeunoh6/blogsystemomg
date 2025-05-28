<script lang="ts">
    //Chat.svelte
  import { onMount } from "svelte";
  import { returnJSONtypeArticle, downloadArticleJSON, generateAndSaveArticle, autoArticle, type Article } from "$lib/openai/chat"
  import { reasoningArticleAgent } from "$lib/openai/chatagent"

  let userInput = $state('')
  let isLoading = $state(false)
  let generatedArticle: Article | null = $state(null)
  let fileName: string | null = $state(null)
  let errorMessage = $state('')
  let uploadStatus = $state<{success: boolean, message: string, uuid?: string, link?: string} | null>(null)
  let autoSave = $state(false)
  let useReasoning = $state(false)
  let aiMessage = $state('')
  let logs = $state<string[]>([])
  
  // Google Drive 링크를 프록시 URL로 변환하는 함수
  function convertGoogleDriveUrl(url: string | null): string | null {
    if (!url) return null;
    
    // 이미 프록시 URL인 경우 변환하지 않음
    if (url.includes("/api/blog/image/proxy")) {
      return url;
    }
    
    // Google Drive 파일 링크 패턴 확인
    const googleDrivePattern = /drive\.google\.com\/file\/d\/([^/]+)/;
    const match = url.match(googleDrivePattern);
    
    if (match && match[1]) {
      // 파일 ID 추출
      const fileId = match[1];
      console.log("Chat: Google Drive 파일 ID 감지:", fileId);
      
      // 프록시 URL로 변환 (상대 경로 사용)
      return `/api/blog/image/proxy?id=${fileId}`;
    }
    
    return url;
  }

  async function generateArticle() {
    if (!userInput.trim()) {
      errorMessage = "프롬프트를 입력해주세요."
      return
    }
    
    try {
      isLoading = true
      errorMessage = ''
      generatedArticle = null
      fileName = null
      uploadStatus = null
      aiMessage = ''
      logs = []
      
      if (useReasoning) {
        // Reasoning 모델을 사용한 생성
        logs.push("Reasoning 모델을 사용하여 요청을 처리합니다...");
        const result = await reasoningArticleAgent(userInput);
        console.log("Reasoning agent result:", result);
        
        if (result.error) {
          errorMessage = `오류가 발생했습니다: ${result.error}`;
        } else {
          aiMessage = result.message || '';
          logs = result.logs || [];
          
          if (result.article && result.fileName) {
            generatedArticle = result.article;
            fileName = result.fileName;
          }
        }
      } else if (autoSave) {
        // Function calling으로 자동화된 과정 사용
        const result = await autoArticle(userInput);
        console.log("Auto article result:", result);
        
        if (result.error) {
          errorMessage = `오류가 발생했습니다: ${result.error}`;
        } else {
          aiMessage = result.message || '';
          logs = result.logs || [];
          
          if (result.article && result.fileName) {
            generatedArticle = result.article;
            fileName = result.fileName;
          }
        }
      } else {
        // 기존 방식 사용
        const result = await generateAndSaveArticle(userInput, false);
        
        if (result.article && result.fileName) {
          generatedArticle = result.article;
          fileName = result.fileName;
          
          if (result.uploadResult) {
            uploadStatus = result.uploadResult;
          }
        } else {
          errorMessage = "아티클 생성에 실패했습니다. 다시 시도해주세요.";
        }
      }
    } catch (err) {
      console.error("Article generation error:", err)
      errorMessage = "오류가 발생했습니다. 다시 시도해주세요."
    } finally {
      isLoading = false
    }
  }

  function handleDownload() {
    if (generatedArticle && fileName) {
      downloadArticleJSON(generatedArticle, fileName)
    }
  }

  async function uploadToDrive() {
    if (!generatedArticle) {
      errorMessage = "업로드할 아티클이 없습니다."
      return
    }

    try {
      isLoading = true
      uploadStatus = null

      // API 호출하여 Google Drive에 저장
      const response = await fetch('/api/blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: generatedArticle.title,
          blocks: generatedArticle.blocks
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        uploadStatus = {
          success: true,
          message: "Google Drive에 업로드되었습니다.",
          uuid: result.uuid,
          link: result.file.webViewLink
        };
      } else {
        uploadStatus = {
          success: false,
          message: result.message || "업로드 실패"
        };
      }
    } catch (err) {
      console.error("Upload error:", err);
      uploadStatus = {
        success: false,
        message: "업로드 중 오류가 발생했습니다."
      };
    } finally {
      isLoading = false
    }
  }

  onMount(()=>{
    console.log('Chat component mounted')
  })
</script>

<main>
  <div class="chat-container">
    <h2>블록형 텍스트 에디터 콘텐츠 생성</h2>
    
    <div class="input-wrapper">
      <textarea 
        bind:value={userInput} 
        placeholder="원하는 블로그 콘텐츠에 대해 설명해주세요. 예: '인공지능의 발전과 미래 전망에 대한 블로그 글을 작성해줘'"
        class="prompt-input"
        rows="4"
      ></textarea>
      
      <div class="generate-options">
        <div class="options-group">
          <label class="option">
            <input type="checkbox" bind:checked={autoSave}>
            <span>AI 자동화 기능</span>
          </label>
          
          <label class="option">
            <input type="checkbox" bind:checked={useReasoning}>
            <span>Reasoning 모델 사용</span>
          </label>
        </div>
        
        <button 
          onclick={generateArticle} 
          disabled={isLoading} 
          class="generate-btn"
        >
          {isLoading ? '생성 중...' : '아티클 생성하기'}
        </button>
      </div>
    </div>

    {#if errorMessage}
      <div class="error-message">
        {errorMessage}
      </div>
    {/if}

    {#if logs.length > 0}
      <div class="logs-container">
        <h3>작업 로그</h3>
        <div class="logs-list">
          {#each logs as log}
            <div class="log-item">{log}</div>
          {/each}
        </div>
      </div>
    {/if}

    {#if aiMessage}
      <div class="ai-message">
        <p>{aiMessage}</p>
      </div>
    {/if}

    {#if generatedArticle}
      <div class="result-container">
        <div class="result-header">
          <h3>생성된 아티클</h3>
          <div class="action-buttons">
            {#if !uploadStatus?.success}
              <button onclick={uploadToDrive} class="upload-btn" disabled={isLoading}>
                {isLoading ? '업로드 중...' : 'Google Drive에 저장'}
              </button>
            {/if}
            <button onclick={handleDownload} class="download-btn">
              JSON 다운로드
            </button>
          </div>
        </div>
        
        {#if uploadStatus}
          <div class="upload-status {uploadStatus.success ? 'success' : 'error'}">
            <p>{uploadStatus.message}</p>
            {#if uploadStatus.success && uploadStatus.uuid}
              <p>ID: {uploadStatus.uuid}</p>
            {/if}
            {#if uploadStatus.success && uploadStatus.link}
              <p>링크: <a href={uploadStatus.link} target="_blank" rel="noopener noreferrer">{uploadStatus.link}</a></p>
            {/if}
          </div>
        {/if}
        
        <div class="article-preview">
          <h2>{generatedArticle.title}</h2>
          
          <div class="blocks-preview">
            {#each generatedArticle.blocks as block}
              <div class="block-item">
                {#if block.type === 'title'}
                  <div class="title-block level-{block.level}">
                    <span class="block-label">제목 (레벨 {block.level})</span>
                    <div class="block-content">
                      {@html block.content}
                    </div>
                  </div>
                {:else if block.type === 'body'}
                  <div class="body-block">
                    <span class="block-label">본문</span>
                    <div class="block-content">
                      {@html block.content}
                    </div>
                  </div>
                {:else if block.type === 'image'}
                  <div class="image-block">
                    <span class="block-label">이미지</span>
                    {#if block.imageUrl}
                      <div class="image-container">
                        <!-- Google Drive URL을 프록시 URL로 변환 -->
                        <img src={convertGoogleDriveUrl(block.imageUrl)} alt="블로그 이미지" class="blog-image" />
                      </div>
                    {:else}
                      <div class="image-placeholder">
                        <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="24" height="24" fill="none"/>
                          <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM13.96 12.29L11.21 15.83L9.25 13.47L6.5 17H17.5L13.96 12.29Z" fill="#666"/>
                        </svg>
                        <p class="image-description">이미지 블록 (에디터에서 이미지를 업로드할 수 있습니다)</p>
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>
</main>

<style>
  .chat-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

  h2, h3 {
    text-align: center;
    margin-bottom: 20px;
  }

  .input-wrapper {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
  }

  .prompt-input {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
    resize: vertical;
  }

  .generate-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .options-group {
    display: flex;
    gap: 15px;
  }
  
  .option {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }
  
  .option input[type="checkbox"] {
    width: 16px;
    height: 16px;
  }

  .generate-btn {
    padding: 12px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
  }

  .generate-btn:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }

  .error-message {
    color: #e74c3c;
    padding: 10px;
    background-color: #fdecea;
    border-radius: 4px;
    margin-bottom: 20px;
  }

  .logs-container {
    margin-bottom: 20px;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 4px;
    border: 1px solid #dee2e6;
  }

  .logs-list {
    max-height: 200px;
    overflow-y: auto;
  }

  .log-item {
    padding: 8px;
    border-bottom: 1px solid #eee;
    font-family: monospace;
    font-size: 14px;
  }

  .log-item:last-child {
    border-bottom: none;
  }

  .ai-message {
    padding: 10px;
    background-color: #e8f5e9;
    border-radius: 4px;
    margin-bottom: 20px;
    color: #2e7d32;
  }

  .result-container {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 20px;
    margin-top: 20px;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
  }

  .action-buttons {
    display: flex;
    gap: 10px;
  }

  .download-btn, .upload-btn {
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
  }

  .download-btn {
    background-color: #2196F3;
  }

  .upload-btn {
    background-color: #FF9800;
  }

  .upload-btn:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }

  .upload-status {
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 15px;
  }

  .upload-status.success {
    background-color: #e7f5e9;
    color: #2e7d32;
  }

  .upload-status.error {
    background-color: #fdecea;
    color: #e74c3c;
  }

  .upload-status a {
    color: inherit;
    text-decoration: underline;
  }

  .article-preview {
    padding: 10px;
  }

  .article-preview h2 {
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
  }

  .blocks-preview {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .block-item {
    border: 1px solid #eee;
    border-radius: 4px;
    padding: 10px;
  }

  .block-label {
    display: inline-block;
    background-color: #f5f5f5;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    margin-bottom: 5px;
  }

  .block-content {
    padding: 5px;
  }

  .title-block {
    font-weight: bold;
  }

  .level-1 .block-content {
    font-size: 32px;
  }

  .level-2 .block-content {
    font-size: 28px;
  }

  .level-3 .block-content {
    font-size: 24px;
  }

  .level-4 .block-content {
    font-size: 20px;
  }

  .body-block .block-content {
    font-size: 16px;
    line-height: 1.6;
  }

  .image-block {
    position: relative;
  }
  
  /* 이미지 컨테이너 추가 */
  .image-container {
    position: relative;
    width: 100%;
    height: 0;
    padding-bottom: 56.25%; /* 16:9 비율 */
    background-color: #f5f5f5;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .blog-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .image-placeholder {
    position: relative;
    width: 100%;
    height: 0;
    padding-bottom: 56.25%; /* 16:9 비율 */
    background-color: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .image-placeholder svg {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 48px;
    height: 48px;
    opacity: 0.5;
  }

  .image-description {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px;
    background-color: rgba(0, 0, 0, 0.5);
    color: #fff;
    text-align: center;
    font-size: 14px;
  }
</style>