<script lang="ts">
  import { onMount } from "svelte";
  import Body from '$lib/blocks/text/body';
  import Title from '$lib/blocks/text/title';
  import ImageBlock from '$lib/blocks/text/image';

  export let articleData: {
    title: string;
    blocks: Array<{
      id: string;
      type: string;
      content?: string;
      level?: number;
      imageUrl?: string | null;
    }>;
  };

  let articleContainer: HTMLElement | null = null;
  
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
      console.log("Article: Google Drive 파일 ID 감지:", fileId);
      
      // 프록시 URL로 변환 (상대 경로 사용)
      return `/api/blog/image/proxy?id=${fileId}`;
    }
    
    return url;
  }

  onMount(() => {
    if (articleContainer && articleData?.blocks) {
      // Render each block using the appropriate class
      articleData.blocks.forEach(block => {
        if (block.type === 'title') {
          const level = block.level || 1; // 기본값 1
          new Title(articleContainer as HTMLElement, block.content || '', level, true);
        } else if (block.type === 'body') {
          new Body(articleContainer as HTMLElement, block.content || '', true);
        } else if (block.type === 'image') {
          // 이미지 URL 변환
          const imageUrl = convertGoogleDriveUrl(block.imageUrl || null);
          new ImageBlock(articleContainer as HTMLElement, imageUrl, true);
        }
      });
    }
  });
</script>

<div class="article-container">
  <article class="article-content" bind:this={articleContainer}>
    <!-- Blocks will be rendered here -->
  </article>
</div>

<style>
  .article-container {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
  }

  .article-content {
    line-height: 1.6;
    color: #333;
  }

  /* Additional styles for article container */
  :global(.title-block-wrapper .title-block-content) {
    margin: 1.5em 0 0.5em;
  }
  
  :global(.text-block-wrapper .text-block-content) {
    margin-bottom: 1.5em;
  }
  
  :global(.image-block-wrapper) {
    margin: 1.5em 0;
  }
</style>