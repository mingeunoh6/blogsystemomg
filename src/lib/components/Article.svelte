<script lang="ts">
  import { onMount } from "svelte";
  import Body from '$lib/blocks/text/body';
  import Title from '$lib/blocks/text/title';

  // Article data - will be replaced with server data later
  const dummyArticle = {
  "blocks": [
    {
      "id": "EhUyJd",
      "type": "title",
      "content": "어디 한번 테스트 해볼까?&nbsp;"
    },
    {
      "id": "RbNgid",
      "type": "body",
      "content": "본문 입력 테스트 1<div>본문입력테스트2</div><div><div><br></div></div>"
    },
    {
      "id": "87L2LI",
      "type": "title",
      "content": "제목2<div>ㅇㅇㅇㅇ</div>"
    },
    {
      "id": "K3OEDS",
      "type": "body",
      "content": "제목 2Click to start typing."
    }
  ]
}

  // Extract blocks from the article data
  const { blocks } = dummyArticle;
  let articleContainer: HTMLElement | null = null;

  onMount(() => {
    if (articleContainer) {
      // Render each block using the appropriate class
      blocks.forEach(block => {
        if (block.type === 'title') {
          new Title(articleContainer as HTMLElement, block.content, true);
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
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  .article-content {
    line-height: 1.6;
    color: #333;
  }

  /* Additional styles for article container */
  :global(.title-block-wrapper:first-child .title-block-content) {
    font-size: 32px !important;
    margin-top: 0;
  }

  :global(.title-block-wrapper .title-block-content) {
    margin: 1.5em 0 0.5em;
  }
  
  :global(.text-block-wrapper .text-block-content) {
    margin-bottom: 1.5em;
  }
</style>