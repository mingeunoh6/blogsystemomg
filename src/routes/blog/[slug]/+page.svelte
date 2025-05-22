<script>
  import Article from '$lib/components/Article.svelte';
  import { page } from '$app/stores';
  
  // In a real app, you would fetch article data based on the slug
  const slug = $page.params.slug;
</script>

<svelte:head>
  <title>Article: {slug}</title>
</svelte:head>

<div class="page-container">
  <header>
    <nav>
      <a href="/" class="back-link">← 홈으로</a>
    </nav>
  </header>
  
  <main>
    <Article />
  </main>
  
  <footer>
    <p>© 2023 블로그 에디터</p>
  </footer>
</div>

<style>
  .page-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  
  header, footer {
    padding: 20px;
    background-color: #f5f5f5;
  }
  
  main {
    flex: 1;
    padding: 20px 0;
  }
  
  .back-link {
    text-decoration: none;
    color: #333;
    font-weight: bold;
  }
  
  .back-link:hover {
    text-decoration: underline;
  }
  
  footer {
    text-align: center;
    color: #666;
    font-size: 14px;
  }
</style> 