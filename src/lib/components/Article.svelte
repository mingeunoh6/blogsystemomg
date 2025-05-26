<script lang="ts">
  import { onMount } from "svelte";
  import Body from '$lib/blocks/text/body';
  import Title from '$lib/blocks/text/title';

  export let articleData: {
    title: string;
    blocks: Array<{
      id: string;
      type: string;
      content: string;
      level?: number;
    }>;
  };

  let articleContainer: HTMLElement | null = null;

  onMount(() => {
    if (articleContainer && articleData?.blocks) {
      // Render each block using the appropriate class
      articleData.blocks.forEach(block => {
        if (block.type === 'title') {
          const level = block.level || 1; // 기본값 1
          new Title(articleContainer as HTMLElement, block.content, level, true);
        } else if (block.type === 'body') {
          new Body(articleContainer as HTMLElement, block.content, true);
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
</style>