<script lang="ts">
  import { onMount } from 'svelte';
  import Editor from '$lib/components/Editor.svelte';
  import {getWorldNews} from '$lib/utils/NEWS/newsUtils'
  
  let newsData: any = $state(null);
  let newsError: string | null = $state(null);
  let isLoading = $state(false);
  
  onMount(async () => {
    console.log('Home page mounted');

 
  });
</script>

<div class="home-container">
  <header>
    <h1>OTR-AI 블록형 블로그 에디터</h1>
    <p>텍스트, 제목, 이미지 블럭을 사용하여 컨텐츠를 작성하세요. 이미지는 구글 드라이브에 자동으로 업로드됩니다.</p>
  </header>
  
  <main>
    <div class="editor-container">
      <Editor />
    </div>
    
    <div class="card">
      <h2>게시글 보기</h2>
      <p>에디터로 작성한 게시글을 볼 수 있습니다.</p>
      <a href="/blog" class="button">게시글 보기</a>
    </div>

    <!-- 뉴스 API 테스트 결과 -->
    <div class="card">
      <h2>뉴스 API 테스트</h2>
      {#if isLoading}
        <p>로딩 중...</p>
      {:else if newsError}
        <div class="error">
          <h3>오류 발생</h3>
          <p>{newsError}</p>
        </div>
      {:else if newsData}
        <div class="success">
          <h3>API 응답 성공</h3>
          <pre>{JSON.stringify(newsData, null, 2)}</pre>
        </div>
      {:else}
        <p>아직 데이터가 없습니다.</p>
      {/if}
    </div>
  </main>
  
  <footer>
    <p>© 2025 OTR-AI HSAD</p>
  </footer>
</div>

<style>
  .home-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
  
  header {
    text-align: center;
    margin-bottom: 30px;
  }
  
  header h1 {
    font-size: 2em;
    color: #333;
    margin-bottom: 10px;
  }
  
  header p {
    color: #666;
    margin-bottom: 20px;
  }
  
  .card {
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    padding: 20px;
    margin: 20px 0;
  }
  
  .editor-container {
    margin-bottom: 20px;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  
  .button {
    display: inline-block;
    background-color: #4CAF50;
    color: white;
    padding: 10px 15px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    text-decoration: none;
    transition: background-color 0.3s;
  }
  
  .button:hover {
    background-color: #43A047;
  }
  
  footer {
    text-align: center;
    margin-top: 40px;
    color: #666;
    font-size: 14px;
  }
  
  .error {
    padding: 10px;
    background-color: #ffecec;
    border-left: 5px solid #f44336;
    color: #333;
  }
  
  .success {
    padding: 10px;
    background-color: #e7f6e7;
    border-left: 5px solid #4CAF50;
    color: #333;
  }
  
  pre {
    white-space: pre-wrap;
    word-break: break-word;
    background-color: #f5f5f5;
    padding: 10px;
    border-radius: 4px;
    max-height: 400px;
    overflow-y: auto;
  }
</style>