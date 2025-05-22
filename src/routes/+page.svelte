<script lang="ts">
  import { onMount } from 'svelte';
  import Editor from '$lib/components/Editor.svelte';
  
  let showEditor = false;
  
  function toggleEditor() {
    showEditor = !showEditor;
  }
  
  onMount(() => {
    console.log('Home page mounted');
  });
</script>

<div class="home-container">
  <header>
    <h1>블록형 텍스트 에디터 데모</h1>
  </header>
  
  <main>
    <div class="card">
      <h2>에디터 데모</h2>
      <p>블록형 텍스트 에디터를 사용하여 본문과 제목을 작성해보세요.</p>
      <button on:click={toggleEditor}>
        {showEditor ? '에디터 숨기기' : '에디터 보기'}
      </button>
    </div>
    
    {#if showEditor}
      <div class="editor-container">
        <Editor />
      </div>
    {/if}
    
    <div class="card">
      <h2>저장된 게시글 보기</h2>
      <p>에디터로 작성한 게시글을 볼 수 있습니다.</p>
      <a href="/blog/demo-article" class="button">게시글 보기</a>
    </div>
  </main>
  
  <footer>
    <p>© 2023 블로그 에디터</p>
  </footer>
</div>

<style>
  .home-container {
    max-width: 800px;
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
  }
  
  .card {
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    padding: 20px;
    margin-bottom: 20px;
  }
  
  .editor-container {
    margin-bottom: 20px;
  }
  
  button, .button {
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
  
  button:hover, .button:hover {
    background-color: #43A047;
  }
  
  footer {
    text-align: center;
    margin-top: 40px;
    color: #666;
    font-size: 14px;
  }
</style>