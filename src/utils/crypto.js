/**
 * Web Crypto API utilities for Client-Side Zero-Knowledge Encryption (AES-256-GCM + PBKDF2)
 * Allows encrypting documents before uploading, ensuring the server/worker has zero knowledge of content.
 */

// Chunked Base64 encoding to prevent stack overflow on large buffers
export function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

// Base64 decoding to Uint8Array ArrayBuffer
export function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypt arbitrary JS object with password using AES-GCM (256-bit) and PBKDF2
 */
export async function encryptPayload(payloadObj, password) {
  const enc = new TextEncoder();
  const rawText = JSON.stringify(payloadObj);
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(rawText)
  );

  return {
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(encrypted)
  };
}

/**
 * Escape text for safe HTML injection
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Build a complete publishable/exportable standalone HTML document.
 * If isEncrypted is true, embeds the encrypted payload and a sleek client-side lock/unlock interface.
 */
export async function buildPublishableHTML({
  title = 'Markdown 匯出文件',
  description = '',
  articleContentHtml = '',
  exportedHeadings = [],
  isEncrypted = false,
  password = '',
  hasMermaid = false
}) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description || title);

  // Generate plain TOC HTML
  let tocHtml = '';
  if (exportedHeadings.length === 0) {
    tocHtml = '<div class="toc-empty">無章節大綱</div>';
  } else {
    exportedHeadings.forEach(h => {
      let levelClass = 'l1';
      if (h.level === 3) levelClass = 'l2';
      else if (h.level >= 4) levelClass = 'l3';

      tocHtml += `<a class="toc-link ${levelClass}" href="#${h.id}" data-id="${h.id}">
        <span class="toc-bullet"></span>
        <span class="toc-text">${escapeHtml(h.text)}</span>
      </a>\n`;
    });
  }

  let encryptedPayloadJson = null;
  if (isEncrypted) {
    if (!password) {
      throw new Error('請輸入加密密碼！');
    }
    const encryptedData = await encryptPayload(
      {
        articleContentHtml,
        exportedHeadings,
        tocHtml
      },
      password
    );
    encryptedPayloadJson = JSON.stringify(encryptedData);
  }

  const initialBodyClass = isEncrypted
    ? 'is-locked no-sidebar'
    : (exportedHeadings.length === 0 ? 'no-sidebar' : 'sidebar-expanded');

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>

  <!-- Open Graph & Social Preview (LINE, Telegram, Facebook, X, etc.) -->
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:type" content="article">
  <meta name="description" content="${safeDesc}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="robots" content="noindex, nofollow">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+TC:wght@300;400;500;700;900&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <!-- Highlight.js for code blocks -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">

  <style>
    :root {
      --bg-body: #f8fafc;
      --bg-panel: #ffffff;
      --bg-card: #f1f5f9;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --accent: #6366f1;
      --accent-gradient: linear-gradient(135deg, #6366f1, #4f46e5);
      --accent-light: rgba(99, 102, 241, 0.08);
      --border: #e2e8f0;
      --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05);
      --font-heading: 'Outfit', 'Noto Sans TC', sans-serif;
      --font-body: 'Inter', 'Noto Sans TC', system-ui, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --toc-hover: rgba(99, 102, 241, 0.04);
      --font-size-base: 16px;
    }

    [data-theme="dark"] {
      --bg-body: #090d16;
      --bg-panel: #0f172a;
      --bg-card: #1e293b;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #818cf8;
      --accent-gradient: linear-gradient(135deg, #818cf8, #6366f1);
      --accent-light: rgba(129, 140, 248, 0.12);
      --border: #1e293b;
      --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3);
      --toc-hover: rgba(129, 140, 248, 0.06);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; scroll-padding-top: 80px; }
    body {
      background-color: var(--bg-body);
      color: var(--text-main);
      font-family: var(--font-body);
      font-size: var(--font-size-base);
      line-height: 1.8;
      transition: background-color 0.3s, color 0.3s;
      min-height: 100vh;
    }

    .app-container {
      display: flex;
      max-width: 1440px;
      margin: 0 auto;
      position: relative;
    }

    .sidebar {
      width: 300px;
      height: 100vh;
      position: fixed;
      top: 0;
      left: 0;
      background-color: var(--bg-panel);
      border-right: 1px solid var(--border);
      padding: 1.5rem 1rem;
      display: flex;
      flex-direction: column;
      z-index: 10;
      transition: transform 0.3s, background-color 0.3s, border-color 0.3s;
      transform: translateX(-300px);
    }

    body.sidebar-expanded .sidebar { transform: translateX(0); }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 0.75rem;
      margin-bottom: 0.75rem;
      border-bottom: 1px solid var(--border);
    }

    .sidebar-title {
      font-family: var(--font-heading);
      font-size: 0.875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .toc-scroll {
      overflow-y: auto;
      flex: 1;
      padding-right: 0.25rem;
    }
    .toc-scroll::-webkit-scrollbar { width: 4px; }
    .toc-scroll::-webkit-scrollbar-thumb { background-color: var(--border); border-radius: 4px; }

    .toc-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.6rem;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.8125rem;
      border-radius: 0.5rem;
      transition: all 0.2s;
      margin-bottom: 0.125rem;
      line-height: 1.4;
    }
    .toc-link:hover {
      background-color: var(--toc-hover);
      color: var(--accent);
    }
    .toc-link.active {
      background-color: var(--accent-light);
      color: var(--accent);
      font-weight: 600;
    }
    .toc-link.l2 { padding-left: 1.5rem; font-size: 0.775rem; }
    .toc-link.l3 { padding-left: 2.25rem; font-size: 0.725rem; }

    .toc-bullet {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background-color: currentColor;
      opacity: 0.4;
      flex-shrink: 0;
    }
    .toc-link.active .toc-bullet { opacity: 1; transform: scale(1.4); }

    .toc-empty {
      font-size: 0.8125rem;
      color: var(--text-muted);
      padding: 1rem 0;
      text-align: center;
    }

    .main-content {
      flex: 1;
      min-width: 0;
      margin-left: 0;
      transition: margin-left 0.3s;
    }
    body.sidebar-expanded .main-content { margin-left: 300px; }

    .header-bar {
      position: sticky;
      top: 0;
      z-index: 5;
      background-color: var(--bg-body);
      border-bottom: 1px solid var(--border);
      padding: 0.75rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-icon {
      background: var(--bg-panel);
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 0.4rem 0.6rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.8125rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .btn-icon:hover { border-color: var(--accent); color: var(--accent); }

    .toggle-sidebar-btn {
      position: fixed;
      bottom: 1.5rem;
      left: 1.5rem;
      z-index: 20;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 50%;
      width: 42px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: var(--shadow-lg);
      transition: transform 0.2s, background-color 0.2s;
    }
    .toggle-sidebar-btn:hover { transform: scale(1.05); }

    .article-wrap {
      max-width: 860px;
      margin: 0 auto;
      padding: 2.5rem 1.5rem 6rem;
    }

    /* Content Typography & Layout */
    .article-content { line-height: 1.8; word-break: break-word; }
    .article-content h1, .article-content h2, .article-content h3,
    .article-content h4, .article-content h5, .article-content h6 {
      font-family: var(--font-heading);
      color: var(--text-main);
      font-weight: 700;
      margin-top: 2rem;
      margin-bottom: 0.8rem;
      line-height: 1.35;
    }
    .article-content h1 { font-size: 2rem; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; margin-top: 0; }
    .article-content h2 { font-size: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.4rem; }
    .article-content h3 { font-size: 1.25rem; }
    .article-content p { margin-bottom: 1.2rem; }
    .article-content ul, .article-content ol { margin-bottom: 1.2rem; padding-left: 1.5rem; }
    .article-content li { margin-bottom: 0.35rem; }
    .article-content blockquote {
      border-left: 4px solid var(--accent);
      padding: 0.6rem 1.2rem;
      margin: 1.5rem 0;
      background: var(--bg-card);
      border-radius: 0 0.5rem 0.5rem 0;
      color: var(--text-muted);
    }
    .article-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .article-content th, .article-content td {
      padding: 0.65rem 0.9rem;
      border: 1px solid var(--border);
      text-align: left;
    }
    .article-content th { background: var(--bg-card); font-weight: 600; }
    .article-content pre {
      position: relative;
      margin: 1.5rem 0;
      border-radius: 0.75rem;
      overflow: hidden;
    }
    .article-content code {
      font-family: var(--font-mono);
      font-size: 0.875em;
    }
    .article-content p code, .article-content li code {
      background: var(--bg-card);
      padding: 0.15rem 0.35rem;
      border-radius: 0.3rem;
      color: var(--accent);
      border: 1px solid var(--border);
    }
    .article-content img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1rem 0; }
    .copy-btn {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: rgba(15, 23, 42, 0.7);
      color: #94a3b8;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 0.4rem;
      padding: 0.25rem 0.5rem;
      font-size: 0.7rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .copy-btn:hover { background: rgba(15, 23, 42, 0.9); color: #fff; }

    /* Lock Screen Overlay (For Password-Protected Content) */
    #lock-screen {
      position: fixed;
      inset: 0;
      z-index: 999;
      background: var(--bg-body);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      transition: opacity 0.35s ease, visibility 0.35s ease;
    }
    body:not(.is-locked) #lock-screen {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    .lock-card {
      width: 100%;
      max-width: 440px;
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: 1.25rem;
      padding: 2.25rem 2rem;
      box-shadow: var(--shadow-lg);
      text-align: center;
      position: relative;
    }

    .lock-icon-wrap {
      width: 64px;
      height: 64px;
      margin: 0 auto 1.25rem;
      border-radius: 50%;
      background: var(--accent-light);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
      box-shadow: 0 0 24px rgba(99, 102, 241, 0.2);
    }

    .lock-title {
      font-family: var(--font-heading);
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 0.5rem;
      line-height: 1.4;
    }

    .lock-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 1.75rem;
      line-height: 1.5;
    }

    .password-field-wrap {
      position: relative;
      margin-bottom: 1rem;
    }

    .password-input {
      width: 100%;
      padding: 0.85rem 2.85rem 0.85rem 1.15rem;
      border: 1.5px solid var(--border);
      background: var(--bg-body);
      color: var(--text-main);
      border-radius: 0.75rem;
      font-size: 0.95rem;
      font-family: var(--font-body);
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .password-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-light);
    }

    .toggle-pwd-vis {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1.1rem;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .toggle-pwd-vis:hover { color: var(--text-main); }

    .unlock-btn {
      width: 100%;
      padding: 0.85rem;
      background: var(--accent-gradient);
      color: white;
      border: none;
      border-radius: 0.75rem;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
      transition: transform 0.15s, opacity 0.15s;
    }
    .unlock-btn:hover { opacity: 0.95; transform: translateY(-1px); }
    .unlock-btn:active { transform: translateY(0); }
    .unlock-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .error-msg {
      margin-top: 0.85rem;
      font-size: 0.825rem;
      color: #ef4444;
      font-weight: 600;
      min-height: 1.25rem;
      transition: opacity 0.2s;
    }

    .shake {
      animation: shake-anim 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }
    @keyframes shake-anim {
      10%, 90% { transform: translate3d(-2px, 0, 0); }
      20%, 80% { transform: translate3d(3px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
      40%, 60% { transform: translate3d(4px, 0, 0); }
    }

    /* Mobile view */
    @media (max-width: 768px) {
      body.sidebar-expanded .sidebar { transform: translateX(0); box-shadow: var(--shadow-lg); }
      body.sidebar-expanded .main-content { margin-left: 0; }
      .article-wrap { padding: 1.5rem 1rem 4rem; }
      .article-content h1 { font-size: 1.6rem; }
      .article-content h2 { font-size: 1.3rem; }
      .sidebar { width: 280px; }
      .lock-card { padding: 1.75rem 1.25rem; }
    }
  </style>
</head>
<body class="${initialBodyClass}">

  ${isEncrypted ? `
  <!-- Lock Screen for Encrypted Document -->
  <div id="lock-screen">
    <div class="lock-card" id="lock-card">
      <div class="lock-icon-wrap">🔒</div>
      <h1 class="lock-title">${safeTitle}</h1>
      <p class="lock-desc">這是一份受密碼保護的美化網頁文檔，請輸入密碼以解鎖閱讀。</p>
      <form id="unlock-form" onsubmit="handleUnlock(event)">
        <div class="password-field-wrap">
          <input
            type="password"
            id="password-input"
            class="password-input"
            placeholder="請輸入閱讀密碼..."
            autocomplete="current-password"
            required
            autofocus
          />
          <button type="button" class="toggle-pwd-vis" id="toggle-pwd-btn" onclick="togglePasswordVisibility()" title="顯示/隱藏密碼">👁️</button>
        </div>
        <button type="submit" class="unlock-btn" id="unlock-submit-btn">
          <span>🔓 解鎖並閱讀</span>
        </button>
        <div class="error-msg" id="error-msg"></div>
      </form>
    </div>
  </div>

  <script id="encrypted-payload" type="application/json">
    ${encryptedPayloadJson}
  </script>
  ` : ''}

  <!-- Main Container -->
  <div class="app-container" id="main-app-container">
    <!-- Sidebar / TOC -->
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">📑 文件大綱</span>
        <button class="btn-icon" id="close-sidebar-btn" title="關閉大綱">✕</button>
      </div>
      <div class="toc-scroll" id="toc-container">
        ${isEncrypted ? '<div id="toc-links"></div>' : tocHtml}
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="main-content">
      <header class="header-bar">
        <div class="header-controls">
          <button class="btn-icon" id="open-sidebar-btn" title="展開大綱">📑 目錄</button>
        </div>
        <div class="header-controls">
          <button class="btn-icon" id="font-dec-btn" title="縮小字體">A-</button>
          <button class="btn-icon" id="font-inc-btn" title="放大字體">A+</button>
          <button class="btn-icon" id="theme-toggle-btn" title="深淺色切換">🌙</button>
        </div>
      </header>

      <div class="article-wrap">
        <article class="article-content" id="article-content">
          ${isEncrypted ? '' : articleContentHtml}
        </article>
      </div>
    </main>
  </div>

  <!-- Highlight.js -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>

  ${hasMermaid ? '<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>' : ''}

  <script>
    // Theme Management
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('md2html_theme') || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggleBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('md2html_theme', next);
      themeToggleBtn.textContent = next === 'dark' ? '☀️' : '🌙';
    });

    // Font Size Scaling
    let currentFontSize = parseInt(localStorage.getItem('md2html_font_size') || '16', 10);
    document.documentElement.style.setProperty('--font-size-base', currentFontSize + 'px');

    document.getElementById('font-inc-btn').addEventListener('click', () => {
      if (currentFontSize < 24) {
        currentFontSize += 1;
        document.documentElement.style.setProperty('--font-size-base', currentFontSize + 'px');
        localStorage.setItem('md2html_font_size', currentFontSize);
      }
    });

    document.getElementById('font-dec-btn').addEventListener('click', () => {
      if (currentFontSize > 12) {
        currentFontSize -= 1;
        document.documentElement.style.setProperty('--font-size-base', currentFontSize + 'px');
        localStorage.setItem('md2html_font_size', currentFontSize);
      }
    });

    // Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');

    openSidebarBtn.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-expanded');
    });

    closeSidebarBtn.addEventListener('click', () => {
      document.body.classList.remove('sidebar-expanded');
    });

    // Auto-collapse sidebar on mobile click
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        if (e.target.closest('.toc-link')) {
          document.body.classList.remove('sidebar-expanded');
        }
      }
    });

    // Code block copy buttons & Syntax highlighting
    function initCodeBlocks() {
      if (window.hljs) {
        window.hljs.highlightAll();
      }
      document.querySelectorAll('pre code').forEach((codeBlock) => {
        const pre = codeBlock.parentNode;
        if (pre.querySelector('.copy-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = '複製';
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(codeBlock.innerText).then(() => {
            btn.textContent = '已複製！';
            setTimeout(() => { btn.textContent = '複製'; }, 2000);
          });
        });
        pre.appendChild(btn);
      });
    }

    // Scrollspy for TOC
    function initScrollspy() {
      const headings = document.querySelectorAll('.article-content h1, .article-content h2, .article-content h3, .article-content h4');
      const tocLinks = document.querySelectorAll('.toc-link');
      if (headings.length === 0 || tocLinks.length === 0) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            tocLinks.forEach(link => {
              if (link.getAttribute('data-id') === id) {
                link.classList.add('active');
              } else {
                link.classList.remove('active');
              }
            });
          }
        });
      }, { rootMargin: '-80px 0px -70% 0px' });

      headings.forEach(h => observer.observe(h));
    }

    // Mermaid Initialization
    function initMermaid() {
      if (window.mermaid) {
        try {
          window.mermaid.initialize({
            startOnLoad: false,
            theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
            securityLevel: 'loose'
          });
          window.mermaid.run();
        } catch (e) {
          console.warn('Mermaid rendering error:', e);
        }
      }
    }

    ${isEncrypted ? `
    // Base64 helper for decryption
    function base64ToBuffer(base64) {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    }

    // Decrypt handler
    async function handleUnlock(e) {
      e.preventDefault();
      const pwdInput = document.getElementById('password-input');
      const submitBtn = document.getElementById('unlock-submit-btn');
      const errorMsg = document.getElementById('error-msg');
      const lockCard = document.getElementById('lock-card');
      const password = pwdInput.value;

      if (!password) return;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>⏳ 正在解密...</span>';
      errorMsg.textContent = '';
      lockCard.classList.remove('shake');

      try {
        const payloadTag = document.getElementById('encrypted-payload');
        const payload = JSON.parse(payloadTag.textContent);

        const enc = new TextEncoder();
        const salt = base64ToBuffer(payload.salt);
        const iv = base64ToBuffer(payload.iv);
        const ciphertext = base64ToBuffer(payload.ciphertext);

        const keyMaterial = await window.crypto.subtle.importKey(
          'raw',
          enc.encode(password),
          'PBKDF2',
          false,
          ['deriveKey']
        );

        const key = await window.crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );

        const decryptedBuffer = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          ciphertext
        );

        const decryptedText = new TextDecoder().decode(decryptedBuffer);
        const data = JSON.parse(decryptedText);

        // Inject content
        document.getElementById('article-content').innerHTML = data.articleContentHtml;
        const tocContainer = document.getElementById('toc-links');
        if (tocContainer) {
          tocContainer.innerHTML = data.tocHtml;
        }

        // Show sidebar if headings exist
        if (data.exportedHeadings && data.exportedHeadings.length > 0) {
          document.body.classList.remove('no-sidebar');
          if (window.innerWidth > 768) {
            document.body.classList.add('sidebar-expanded');
          }
        }

        // Unlock view
        document.body.classList.remove('is-locked');
        setTimeout(() => {
          const lockScreen = document.getElementById('lock-screen');
          if (lockScreen) lockScreen.remove();
        }, 400);

        // Initialize components
        initCodeBlocks();
        initScrollspy();
        initMermaid();

      } catch (err) {
        console.error('Decryption error:', err);
        errorMsg.textContent = '❌ 密碼錯誤，請重新輸入！';
        lockCard.classList.add('shake');
        pwdInput.select();
        pwdInput.focus();
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>🔓 解鎖並閱讀</span>';
      }
    }

    function togglePasswordVisibility() {
      const pwdInput = document.getElementById('password-input');
      const btn = document.getElementById('toggle-pwd-btn');
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        btn.textContent = '🙈';
      } else {
        pwdInput.type = 'password';
        btn.textContent = '👁️';
      }
    }
    ` : `
    // Direct initialization for non-encrypted document
    document.addEventListener('DOMContentLoaded', () => {
      initCodeBlocks();
      initScrollspy();
      initMermaid();
    });
    `}
  </script>
</body>
</html>`;
}
