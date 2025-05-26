<script lang="ts">
  import { onMount } from "svelte";

  interface Article {
    id: string;
    date: string;
    time: string;
    author: string;
    title: string;
    link: string;
  }

  let articleList = $state<Article[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // 글 목록 가져오기
  async function loadArticles() {
    try {
      loading = true;
      error = null;
      
      const response = await fetch('/api/blog/list');
      const result = await response.json();
      
      if (result.success) {
        articleList = result.data;
        console.log('로드된 글 목록:', articleList);
      } else {
        error = result.message || '데이터를 가져오는데 실패했습니다.';
      }
    } catch (err) {
      console.error('글 목록 로드 오류:', err);
      error = '데이터를 가져오는 중 오류가 발생했습니다.';
    } finally {
      loading = false;
    }
  }

  onMount(async() => {
    console.log('블로그 페이지 마운트');
    await loadArticles();
  });
  
  // 날짜와 시간 형식화
  function formatDateTime(date: string, time: string): string {
    if (!date || !time) return '날짜 없음';
    
    // 날짜 형식: YY.MM.DD
    const year = date.substring(0, 2);
    const month = date.substring(2, 4);
    const day = date.substring(4, 6);
    
    return `${year}.${month}.${day} ${time}`;
  }
  
  // 글 상세 페이지로 이동
  function goToArticle(id: string): void {
    window.location.href = `/blog/${id}`;
  }
</script>

<div class="blog-container">
  <h1 class="blog-title">블로그 글 목록</h1>
  
  {#if loading}
    <div class="loading">데이터를 불러오는 중...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if articleList.length === 0}
    <div class="empty">작성된 글이 없습니다.</div>
  {:else}
    <ul class="article-list-group">
      {#each articleList as article}
        <li class="article-list" id={article.id} on:click={() => goToArticle(article.id)}>
          <div class="article-list-item">
            <div class="article-list-item-timestamp">
              {formatDateTime(article.date, article.time)}
            </div>
            <div class="article-list-item-title">
              {article.title}
            </div>
            <div class="article-list-item-writer">
              {article.author}
            </div>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .blog-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  
  .blog-title {
    text-align: center;
    margin-bottom: 20px;
  }
  
  .loading, .error, .empty {
    text-align: center;
    padding: 20px;
    font-style: italic;
    color: #666;
  }
  
  .error {
    color: #e74c3c;
  }
  
  .article-list-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    list-style: none;
    padding: 0;
  }
  
  .article-list {
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .article-list:hover {
    background-color: #f5f5f5;
  }
  
  .article-list-item {
    display: flex;
    flex-direction: row;
    gap: 10px;
    border-bottom: 1px solid #ddd;
    width: 100%;
    height: 42px;
    justify-content: flex-start;
    align-items: center;
    padding: 6px;
    box-sizing: border-box;
  }
  
  .article-list-item-timestamp {
    flex: 0 0 120px;
    font-size: 14px;
    color: #666;
  }
  
  .article-list-item-title {
    flex: 1;
    font-weight: bold;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .article-list-item-writer {
    flex: 0 0 80px;
    text-align: right;
    font-size: 14px;
    color: #666;
  }
</style>