<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import Article from "$lib/components/Article.svelte";

  interface ArticleContent {
    title: string;
    blocks: Array<{
      id: string;
      type: string;
      content: string;
      level?: number;
    }>;
  }

  interface ArticleData {
    id: string;
    date: string;
    time: string;
    author: string;
    title: string;
    link: string;
    content: ArticleContent | null;
  }

  let article = $state<ArticleData | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // 글 데이터 가져오기
  async function loadArticle(id: string) {
    try {
      loading = true;
      error = null;
      
      const response = await fetch(`/api/blog/${id}`);
      const result = await response.json();
      
      if (result.success) {
        article = result.data;
        console.log('로드된 글 정보:', article);
      } else {
        error = result.message || '글을 가져오는데 실패했습니다.';
      }
    } catch (err) {
      console.error('글 로드 오류:', err);
      error = '글을 가져오는 중 오류가 발생했습니다.';
    } finally {
      loading = false;
    }
  }

  // 날짜와 시간 형식화
  function formatDateTime(date: string, time: string): string {
    if (!date || !time) return '날짜 없음';
    
    // 날짜 형식: YY.MM.DD
    const year = date.substring(0, 2);
    const month = date.substring(2, 4);
    const day = date.substring(4, 6);
    
    return `${year}.${month}.${day} ${time}`;
  }

  onMount(async () => {
    const id = $page.params.id;
    console.log('블로그 상세 페이지 마운트, ID:', id);
    
    if (id) {
      await loadArticle(id);
    }
  });
</script>

<div class="article-container">
  {#if loading}
    <div class="loading">글을 불러오는 중...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if !article}
    <div class="not-found">글을 찾을 수 없습니다.</div>
  {:else}
    <div class="article-header">
      <a href="/blog" class="back-button">← 목록으로</a>
      <h1 class="article-title">{article.title}</h1>
      <div class="article-meta">
        <span class="article-date">{formatDateTime(article.date, article.time)}</span>
        <span class="article-author">작성자: {article.author}</span>
      </div>
    </div>
    
    <div class="article-content">
      {#if article.content}
        <Article articleData={article.content} />
      {:else}
        <div class="content-error">글 내용을 불러올 수 없습니다.</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .article-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  
  .loading, .error, .not-found, .content-error {
    text-align: center;
    padding: 20px;
    font-style: italic;
    color: #666;
  }
  
  .error {
    color: #e74c3c;
  }
  
  .article-header {
    margin-bottom: 30px;
  }
  
  .back-button {
    display: inline-block;
    margin-bottom: 15px;
    color: #555;
    text-decoration: none;
  }
  
  .back-button:hover {
    text-decoration: underline;
  }
  
  .article-title {
    font-size: 32px;
    margin-bottom: 10px;
  }
  
  .article-meta {
    display: flex;
    justify-content: space-between;
    color: #666;
    font-size: 14px;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
  }
  
  .article-content {
    margin-top: 30px;
    line-height: 1.6;
  }
  
  .content-error {
    padding: 50px;
    background-color: #f9f9f9;
    border-radius: 4px;
  }
</style> 