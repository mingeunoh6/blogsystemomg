<script lang="ts">
  import { onMount } from 'svelte';
  import Editor from '$lib/components/Editor.svelte';
  
  onMount(() => {
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
</style>