const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Imports
const conflict1Target = `<<<<<<< HEAD
import mermaid from 'mermaid';
=======
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
>>>>>>> 3fc22c81f94733269354124a6d69228cb4eccefb`;

const conflict1Replace = `import mermaid from 'mermaid';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';`;

content = content.replace(conflict1Target, conflict1Replace);

// 2. Turndown rules
const conflict2Target = `<<<<<<< HEAD
// Custom rule for preserving Mermaid diagram blocks when converting back to Markdown
turndownService.addRule('mermaidBlock', {
  filter: function (node) {
    return (
      node.nodeName === 'DIV' &&
      (node.classList.contains('mermaid-wrapper') || node.hasAttribute('data-mermaid-code'))
    );
  },
  replacement: function (content, node) {
    const code = decodeURIComponent(node.getAttribute('data-mermaid-code') || '');
    if (code) {
      return \`\\n\\n\`\`\`mermaid\\n\${code.trim()}\\n\`\`\`\\n\\n\`;
    }
=======
// Custom rule for parsing mermaid wrappers back to markdown code blocks
turndownService.addRule('mermaidBlock', {
  filter: function (node) {
    return node.classList.contains('mermaid-wrapper');
  },
  replacement: function (content, node) {
    const encoded = node.getAttribute('data-mermaid-code') || '';
    let rawCode;
    try {
      rawCode = decodeURIComponent(escape(window.atob(encoded)));
    } catch {
      rawCode = '';
    }
    return \`\\n\`\`\`mermaid\\n\${rawCode}\\n\`\`\`\\n\`;
  }
});

// Custom rule for stripping YAML metadata cards from HTML conversion
turndownService.addRule('metadataCard', {
  filter: function (node) {
    return node.classList.contains('metadata-card-wrapper');
  },
  replacement: function () {
>>>>>>> 3fc22c81f94733269354124a6d69228cb4eccefb`;

const conflict2Replace = `// Custom rule for preserving Mermaid diagram blocks when converting back to Markdown
turndownService.addRule('mermaidBlock', {
  filter: function (node) {
    return (
      node.nodeName === 'DIV' &&
      (node.classList.contains('mermaid-wrapper') || node.hasAttribute('data-mermaid-code'))
    );
  },
  replacement: function (content, node) {
    const encoded = node.getAttribute('data-mermaid-code') || '';
    let rawCode = '';
    try {
      rawCode = decodeURIComponent(escape(window.atob(encoded)));
    } catch {
      try {
        rawCode = decodeURIComponent(encoded);
      } catch {
        rawCode = '';
      }
    }
    if (rawCode) {
      return \`\\n\\n\`\`\`mermaid\\n\${rawCode.trim()}\\n\`\`\`\\n\\n\`;
    }
    return '';
  }
});

// Custom rule for stripping YAML metadata cards from HTML conversion
turndownService.addRule('metadataCard', {
  filter: function (node) {
    return node.classList.contains('metadata-card-wrapper');
  },
  replacement: function () {
    return '';
  }
});`;

content = content.replace(conflict2Target, conflict2Replace);

// 3. marked renderer code
const conflict3Target = `<<<<<<< HEAD
      if (language.toLowerCase() === 'mermaid') {
        const safeText = (text || '').trim();
        const encoded = encodeURIComponent(safeText);
        return \`<div class="mermaid-wrapper my-6 select-none" contenteditable="false" data-mermaid-code="\${encoded}">
  <div class="mermaid-diagram flex justify-center items-center py-4 px-3 overflow-x-auto rounded-xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm" data-code="\${encoded}">
    <div class="mermaid-svg-container flex justify-center w-full">
      <div class="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 py-3">
        <svg class="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span>繪製 Mermaid 圖表中...</span>
      </div>
    </div>
  </div>
</div>\`;
=======
      if (language === 'mermaid') {
        const encodedContent = window.btoa(unescape(encodeURIComponent(text)));
        return \`<div class="mermaid-wrapper" contenteditable="false" data-mermaid-code="\${encodedContent}">
          <pre class="mermaid">\${text}</pre>
        </div>\`;
>>>>>>> 3fc22c81f94733269354124a6d69228cb4eccefb`;

const conflict3Replace = `      if (language.toLowerCase() === 'mermaid') {
        const safeText = (text || '').trim();
        const encodedContent = window.btoa(unescape(encodeURIComponent(safeText)));
        return \`<div class="mermaid-wrapper my-6 select-none" contenteditable="false" data-mermaid-code="\${encodedContent}">
          <pre class="mermaid">\${safeText}</pre>
        </div>\`;
      }`;

content = content.replace(conflict3Target, conflict3Replace);

// 4 & 5. initialMarkdown features and showcases
const conflict4Target = `<<<<<<< HEAD
9. **Mermaid 向量圖表視覺化**：原生支援流程圖、時序圖、心智圖等圖表語法，並提供無引號裸寫自動容錯與向量匯出。

10. **✨ AI 複製排版智慧修復**：針對從 AI 對話（如 ChatGPT / Claude / Antigravity）直接反白複製的內容，一鍵修復多餘換行、檔案代碼行內化、Emoji 標題階層化、粗體項目與補齊 Mermaid 語法。
=======
9. **GFM 擴充語法支援**：
   * 完整支援 **GitHub Flavored Markdown (GFM)**，包括表格、任務清單與 ~~刪除線~~ 等語法。

10. **程式碼語法高亮**：
    * 整合 \\\`highlight.js\\\`，自動為各類程式碼區塊提供高品質語法著色與一鍵複製按鈕。

11. **Mermaid 流程圖與延遲載入**：
    * 支援標準 Mermaid 繪圖語法，且具備延遲載入優化——僅在文件確實包含 \\\` \\\`\`\`mermaid \\\` 時載入對應模組，純文字文件零效能負擔。

12. **YAML Front Matter 元資料卡片**：
    * 文件開頭的 \\\`---\\\` 包裹區塊會渲染為結構化的精美 metadata 卡片（含標題、描述、日期、標籤與 Draft 草稿狀態），而非解析成混亂的分隔線。
>>>>>>> 3fc22c81f94733269354124a6d69228cb4eccefb`;

const conflict4Replace = `9. **GFM 擴充語法支援**：
   * 完整支援 **GitHub Flavored Markdown (GFM)**，包括表格、任務清單與 ~~刪除線~~ 等語法。

10. **程式碼語法高亮**：
    * 整合 \\\`highlight.js\\\`，自動為各類程式碼區塊提供高品質語法著色與一鍵複製按鈕。

11. **Mermaid 向量圖表視覺化與容錯支援**：
    * 原生支援流程圖、時序圖等圖表語法，深淺主題自適應，並具備無引號裸寫自動容錯與向量匯出。

12. **YAML Front Matter 元資料卡片**：
    * 文件開頭的 \\\`---\\\` 包裹區塊會渲染為結構化的精美 metadata 卡片（含標題、描述、日期、標籤與 Draft 草稿狀態）。

13. **✨ AI 複製排版智慧修復**：
    * 針對從 AI 對話（如 ChatGPT / Claude / Antigravity）直接反白複製的內容，一鍵修復多餘換行、檔案標籤、Emoji 標題階層化、粗體項目與補齊 Mermaid 圍欄。`;

content = content.replace(conflict4Target, conflict4Replace);

const conflict5Target = `<<<<<<< HEAD
### 3. Mermaid 圖表視覺化

\\\`\\\`\\\`mermaid
graph TD
    A[使用者輸入 Markdown] --> B{包含 Mermaid 語法?}
    B -->|"是 (標準/容錯)"| C[即時渲染高質感向量圖表]
    B -->|否| D[標準 Markdown 格式渲染]
    C --> E[支援 2x 圖片、向量 PDF 與 HTML 匯出]
    D --> E
=======
### 3. 任務清單與刪除線

* [x] 支援 GFM 表格渲染
* [x] 支援 ~~舊版~~ highlight.js 程式碼著色
* [x] 支援 Mermaid 流程圖載入與渲染
* [ ] 支援更多客製化 Markdown 解析選項

### 4. Mermaid 流程圖

\\\`\\\`\\\`mermaid
flowchart TD
    A[Markdown 編輯區] <--> B(HTML 原始碼區)
    A <--> C(美化閱讀排版區)
    B <--> C
    C -->|雙擊啟用| D[contentEditable 視覺編輯]
    D -->|自動同步| A
    
    style A fill:#e0e7ff,stroke:#6366f1,stroke-width:2px;
    style B fill:#f1f5f9,stroke:#64748b,stroke-width:2px;
    style C fill:#ecfdf5,stroke:#10b981,stroke-width:2px;
    style D fill:#fef3c7,stroke:#d97706,stroke-width:2px;
>>>>>>> 3fc22c81f94733269354124a6d69228cb4eccefb`;

const conflict5Replace = `### 3. 任務清單與刪除線

* [x] 支援 GFM 表格渲染
* [x] 支援 ~~舊版~~ highlight.js 程式碼著色
* [x] 支援 Mermaid 流程圖載入與渲染
* [ ] 支援更多客製化 Markdown 解析選項

### 4. Mermaid 流程圖

\\\`\\\`\\\`mermaid
flowchart TD
    A[Markdown 編輯區] <--> B(HTML 原始碼區)
    A <--> C(美化閱讀排版區)
    B <--> C
    C -->|"雙擊啟用 (標準/容錯)"| D[contentEditable 視覺編輯]
    D -->|自動同步| A
    
    style A fill:#e0e7ff,stroke:#6366f1,stroke-width:2px;
    style B fill:#f1f5f9,stroke:#64748b,stroke-width:2px;
    style C fill:#ecfdf5,stroke:#10b981,stroke-width:2px;
    style D fill:#fef3c7,stroke:#d97706,stroke-width:2px;`;

content = content.replace(conflict5Target, conflict5Replace);

// 6. Utilities conflict
const conflict6Target = `<<<<<<< HEAD
// --- Mermaid & AI Copy Beautification Utilities ---
=======
// Helper to parse YAML Front Matter
const parseFrontMatter = (md) => {
  if (!md || !md.startsWith('---')) return { markdown: md, metadata: null, rawFrontMatter: '' };
  
  const match = md.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---\\r?\\n/);
  if (!match) return { markdown: md, metadata: null, rawFrontMatter: '' };
  
  const rawFrontMatter = match[0];
  const yamlText = match[1];
  const remainingMarkdown = md.substring(match[0].length);
  
  const metadata = {};
  const lines = yamlText.split(/\\r?\\n/);
  lines.forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.substring(0, colonIdx).trim().toLowerCase();
      let value = line.substring(colonIdx + 1).trim();
      
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      
      if (key === 'tags') {
        if (value.startsWith('[') && value.endsWith(']')) {
          metadata.tags = value.substring(1, value.length - 1).split(',').map(t => t.trim().replace(/['"]/g, ''));
        } else {
          metadata.tags = value.split(',').map(t => t.trim()).filter(Boolean);
        }
      } else if (key === 'draft') {
        metadata.draft = value === 'true';
      } else {
        metadata[key] = value;
      }
    }
  });
  
  return { markdown: remainingMarkdown, metadata, rawFrontMatter };
};

// Render YAML metadata card
const renderMetadataCard = (metadata) => {
  if (!metadata) return '';
  
  const title = metadata.title || '';
  const description = metadata.description || metadata.desc || '';
  const date = metadata.date || '';
  const tags = metadata.tags || [];
  const isDraft = metadata.draft;
  
  if (!title && !description && !date && tags.length === 0 && !isDraft) return '';
  
  const tagsHtml = tags.map(tag => \`
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-100/50 dark:border-indigo-900/30">
      # \${tag}
    </span>
  \`).join(' ');

  const draftBadgeHtml = isDraft ? \`
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider animate-pulse">
      Draft 草稿
    </span>
  \` : '';

  return \`
    <div class="metadata-card-wrapper mb-8 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/30 backdrop-blur-sm shadow-sm flex flex-col gap-4" contenteditable="false">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="flex flex-col gap-1.5">
          \${draftBadgeHtml}
          <h2 class="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-slate-100 m-0 tracking-tight" style="border-bottom: none; margin-top: 0; padding-bottom: 0;">
            \${title}
          </h2>
        </div>
        \${date ? \`<span class="text-xs font-medium text-slate-400 dark:text-slate-500 font-mono">\${date}</span>\` : ''}
      </div>
      \${description ? \`<p class="text-sm text-slate-500 dark:text-slate-400 m-0 leading-relaxed">\${description}</p>\` : ''}
      \${tags.length > 0 ? \`<div class="flex flex-wrap gap-2 mt-1">\${tagsHtml}</div>\` : ''}
    </div>
  \`;
};

// HTML Sanitizer using DOMPurify
const sanitizeHtml = (htmlContent) => {
  return DOMPurify.sanitize(htmlContent, {
    ADD_TAGS: ['use'],
    ADD_ATTR: ['target', 'aria-label', 'contenteditable', 'suppresscontenteditablewarning', 'data-mermaid-code', 'data-placeholder'],
    USE_PROFILES: { html: true, svg: true }
  });
};

// Helper to resolve relative path images to blob URLs
const resolveImageSources = (htmlString, map) => {
  if (!map || Object.keys(map).length === 0) return htmlString;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const imgs = doc.querySelectorAll('img');
  let modified = false;
  
  imgs.forEach(img => {
    const src = img.getAttribute('src');
    if (src) {
      const decodedSrc = decodeURIComponent(src);
      const cleanSrc = decodedSrc.replace(/^\\.\\//, '');
      
      for (const [key, value] of Object.entries(map)) {
        if (key === cleanSrc || key.endsWith('/' + cleanSrc) || cleanSrc.endsWith('/' + key)) {
          img.setAttribute('src', value);
          modified = true;
          break;
        }
      }
    }
  });
  
  return modified ? doc.body.innerHTML : htmlString;
};

// Cache variable for the dynamically loaded Chinese font
let cachedFontBase64 = null;
>>>>>>> 3fc22c81f94733269354124a6d69228cb4eccefb`;

const conflict6Replace = `// Helper to parse YAML Front Matter
const parseFrontMatter = (md) => {
  if (!md || !md.startsWith('---')) return { markdown: md, metadata: null, rawFrontMatter: '' };
  
  const match = md.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---\\r?\\n/);
  if (!match) return { markdown: md, metadata: null, rawFrontMatter: '' };
  
  const rawFrontMatter = match[0];
  const yamlText = match[1];
  const remainingMarkdown = md.substring(match[0].length);
  
  const metadata = {};
  const lines = yamlText.split(/\\r?\\n/);
  lines.forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.substring(0, colonIdx).trim().toLowerCase();
      let value = line.substring(colonIdx + 1).trim();
      
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      
      if (key === 'tags') {
        if (value.startsWith('[') && value.endsWith(']')) {
          metadata.tags = value.substring(1, value.length - 1).split(',').map(t => t.trim().replace(/['"]/g, ''));
        } else {
          metadata.tags = value.split(',').map(t => t.trim()).filter(Boolean);
        }
      } else if (key === 'draft') {
        metadata.draft = value === 'true';
      } else {
        metadata[key] = value;
      }
    }
  });
  
  return { markdown: remainingMarkdown, metadata, rawFrontMatter };
};

// Render YAML metadata card
const renderMetadataCard = (metadata) => {
  if (!metadata) return '';
  
  const title = metadata.title || '';
  const description = metadata.description || metadata.desc || '';
  const date = metadata.date || '';
  const tags = metadata.tags || [];
  const isDraft = metadata.draft;
  
  if (!title && !description && !date && tags.length === 0 && !isDraft) return '';
  
  const tagsHtml = tags.map(tag => \`
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-100/50 dark:border-indigo-900/30">
      # \${tag}
    </span>
  \`).join(' ');

  const draftBadgeHtml = isDraft ? \`
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider animate-pulse">
      Draft 草稿
    </span>
  \` : '';

  return \`
    <div class="metadata-card-wrapper mb-8 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/30 backdrop-blur-sm shadow-sm flex flex-col gap-4" contenteditable="false">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="flex flex-col gap-1.5">
          \${draftBadgeHtml}
          <h2 class="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-slate-100 m-0 tracking-tight" style="border-bottom: none; margin-top: 0; padding-bottom: 0;">
            \${title}
          </h2>
        </div>
        \${date ? \`<span class="text-xs font-medium text-slate-400 dark:text-slate-500 font-mono">\${date}</span>\` : ''}
      </div>
      \${description ? \`<p class="text-sm text-slate-500 dark:text-slate-400 m-0 leading-relaxed">\${description}</p>\` : ''}
      \${tags.length > 0 ? \`<div class="flex flex-wrap gap-2 mt-1">\${tagsHtml}</div>\` : ''}
    </div>
  \`;
};

// HTML Sanitizer using DOMPurify
const sanitizeHtml = (htmlContent) => {
  return DOMPurify.sanitize(htmlContent, {
    ADD_TAGS: ['use'],
    ADD_ATTR: ['target', 'aria-label', 'contenteditable', 'suppresscontenteditablewarning', 'data-mermaid-code', 'data-placeholder'],
    USE_PROFILES: { html: true, svg: true }
  });
};

// Helper to resolve relative path images to blob URLs
const resolveImageSources = (htmlString, map) => {
  if (!map || Object.keys(map).length === 0) return htmlString;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const imgs = doc.querySelectorAll('img');
  let modified = false;
  
  imgs.forEach(img => {
    const src = img.getAttribute('src');
    if (src) {
      const decodedSrc = decodeURIComponent(src);
      const cleanSrc = decodedSrc.replace(/^\\.\\//, '');
      
      for (const [key, value] of Object.entries(map)) {
        if (key === cleanSrc || key.endsWith('/' + cleanSrc) || cleanSrc.endsWith('/' + key)) {
          img.setAttribute('src', value);
          modified = true;
          break;
        }
      }
    }
  });
  
  return modified ? doc.body.innerHTML : htmlString;
};

// Cache variable for the dynamically loaded Chinese font
let cachedFontBase64 = null;

// --- Mermaid & AI Copy Beautification Utilities ---`;

content = content.replace(conflict6Target, conflict6Replace);

// Update parseMarkdownToHtml implementation to incorporate FrontMatter and Sanitization
const oldParseMarkdownToHtml = `const parseMarkdownToHtml = (md) => {
  if (!md) return '';
  const preprocessed = wrapLooseMermaid(md);
  return marked.parse(preprocessed);
};`;

const newParseMarkdownToHtml = `const parseMarkdownToHtml = (md) => {
  if (!md) return { html: '', readingHtml: '', rawFrontMatter: '' };
  const { markdown: cleanMd, metadata, rawFrontMatter } = parseFrontMatter(md);
  const preprocessed = wrapLooseMermaid(cleanMd);
  const parsedHTML = marked.parse(preprocessed);
  const sanitizedHTML = sanitizeHtml(parsedHTML);
  const metadataHtml = renderMetadataCard(metadata);
  return {
    html: sanitizedHTML,
    readingHtml: metadataHtml + sanitizedHTML,
    rawFrontMatter
  };
};`;

content = content.replace(oldParseMarkdownToHtml, newParseMarkdownToHtml);

// 7. Initial state conflict
const conflict7Target = `<<<<<<< HEAD
  const defaultHtml = parseMarkdownToHtml(defaultMarkdown);
=======
  
  const initialParse = parseFrontMatter(defaultMarkdown);
  const defaultHtml = sanitizeHtml(marked.parse(initialParse.markdown));
  const defaultReadingHtml = renderMetadataCard(initialParse.metadata) + defaultHtml;
>>>>>>> 3fc22c81f94733269354124a6d69228cb4eccefb`;

const conflict7Replace = `  const initialParse = parseMarkdownToHtml(defaultMarkdown);
  const defaultHtml = initialParse.html;
  const defaultReadingHtml = initialParse.readingHtml;`;

content = content.replace(conflict7Target, conflict7Replace);

// 8. useEffect conflict
const conflict8Target = `<<<<<<< HEAD
  // Render Mermaid Diagrams whenever content, theme, layout or pane view changes
  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(() => {
      if (!isCancelled) {
        renderAllMermaidDiagrams(darkMode);
      }
    }, 80);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [readingHtml, darkMode, layout, singlePane, leftPane, rightPane]);
=======
  // Window Resize, Orientation Change, and CSS Animation End Listener to trigger Mermaid diagram updates
  useEffect(() => {
    const handleResize = () => {
      setResizeKey(prev => prev + 1);
    };
    const handleAnimationEnd = (e) => {
      if (e.animationName === 'fadeIn') {
        setResizeKey(prev => prev + 1);
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    document.addEventListener('animationend', handleAnimationEnd);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('animationend', handleAnimationEnd);
    };
  }, []);
>>>>>>> 3fc22c81f94733269354124a6d69228cb4eccefb`;

const conflict8Replace = `  // Window Resize, Orientation Change, and CSS Animation End Listener to trigger Mermaid diagram updates
  useEffect(() => {
    const handleResize = () => {
      setResizeKey(prev => prev + 1);
    };
    const handleAnimationEnd = (e) => {
      if (e.animationName === 'fadeIn') {
        setResizeKey(prev => prev + 1);
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    document.addEventListener('animationend', handleAnimationEnd);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('animationend', handleAnimationEnd);
    };
  }, []);

  // Render Mermaid Diagrams whenever content, theme, layout or pane view changes
  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(() => {
      if (!isCancelled) {
        renderAllMermaidDiagrams(darkMode);
      }
    }, 80);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [readingHtml, darkMode, layout, singlePane, leftPane, rightPane, resizeKey]);`;

content = content.replace(conflict8Target, conflict8Replace);

// 9. ServiceWorker shared data conflict
const conflict9Target = `<<<<<<< HEAD
                const parsedHTML = parseMarkdownToHtml(sharedVal);
                setHtml(parsedHTML);
                setReadingHtml(parsedHTML);
=======
                const { markdown: cleanMd, metadata, rawFrontMatter } = parseFrontMatter(sharedVal);
                setFrontMatterRaw(rawFrontMatter);
                const parsedHTML = marked.parse(cleanMd);
                const sanitizedHTML = sanitizeHtml(parsedHTML);
                const metadataHtml = renderMetadataCard(metadata);
                setHtml(sanitizedHTML);
                setReadingHtml(metadataHtml + sanitizedHTML);
>>>>>>> 3fc22c81f94733269354124a6d69228cb4eccefb`;

const conflict9Replace = `                const { html: parsedHTML, readingHtml: parsedReadingHtml, rawFrontMatter } = parseMarkdownToHtml(sharedVal);
                setFrontMatterRaw(rawFrontMatter);
                setHtml(parsedHTML);
                setReadingHtml(parsedReadingHtml);`;

content = content.replace(conflict9Target, conflict9Replace);

// 10. Undo conflict
const conflict10Target = `<<<<<<< HEAD
      const parsedHTML = parseMarkdownToHtml(prevMD);
      setHtml(parsedHTML);
      setReadingHtml(parsedHTML);
=======
      
      const { markdown: cleanMd, metadata, rawFrontMatter } = parseFrontMatter(prevMD);
      setFrontMatterRaw(rawFrontMatter);
      const parsedHTML = marked.parse(cleanMd);
      const sanitizedHTML = sanitizeHtml(parsedHTML);
      const metadataHtml = renderMetadataCard(metadata);
      
      setHtml(sanitizedHTML);
      setReadingHtml(metadataHtml + sanitizedHTML);
>>>>>>> 3fc22c81f94733269354124a6d69228cb4eccefb`;

const conflict10Replace = `      const { html: parsedHTML, readingHtml: parsedReadingHtml, rawFrontMatter } = parseMarkdownToHtml(prevMD);
      setFrontMatterRaw(rawFrontMatter);
      setHtml(parsedHTML);
      setReadingHtml(parsedReadingHtml);`;

content = content.replace(conflict10Target, conflict10Replace);

// 11. Redo conflict
const conflict11Target = `<<<<<<< HEAD
      const parsedHTML = parseMarkdownToHtml(nextMD);
      setHtml(parsedHTML);
      setReadingHtml(parsedHTML);
=======
      
      const { markdown: cleanMd, metadata, rawFrontMatter } = parseFrontMatter(nextMD);
      setFrontMatterRaw(rawFrontMatter);
      const parsedHTML = marked.parse(cleanMd);
      const sanitizedHTML = sanitizeHtml(parsedHTML);
      const metadataHtml = renderMetadataCard(metadata);
      
      setHtml(sanitizedHTML);
      setReadingHtml(metadataHtml + sanitizedHTML);
>>>>>>> 3fc22c81f94733269354124a6d69228cb4eccefb`;

const conflict11Replace = `      const { html: parsedHTML, readingHtml: parsedReadingHtml, rawFrontMatter } = parseMarkdownToHtml(nextMD);
      setFrontMatterRaw(rawFrontMatter);
      setHtml(parsedHTML);
      setReadingHtml(parsedReadingHtml);`;

content = content.replace(conflict11Target, conflict11Replace);

// 12. handleMarkdownChange conflict
const conflict12Target = `<<<<<<< HEAD
    const parsedHTML = parseMarkdownToHtml(val);
    setHtml(parsedHTML);
    setReadingHtml(parsedHTML);
=======
    const { markdown: cleanMd, metadata, rawFrontMatter } = parseFrontMatter(val);
    setFrontMatterRaw(rawFrontMatter);
    
    const parsedHTML = marked.parse(cleanMd);
    const sanitizedHTML = sanitizeHtml(parsedHTML);
    const metadataHtml = renderMetadataCard(metadata);
    const finalReadingHtml = metadataHtml + sanitizedHTML;
    
    setHtml(sanitizedHTML);
    setReadingHtml(finalReadingHtml);
>>>>>>> 3fc22c81f94733269354124a6d69228cb4eccefb`;

const conflict12Replace = `    const { html: parsedHTML, readingHtml: parsedReadingHtml, rawFrontMatter } = parseMarkdownToHtml(val);
    setFrontMatterRaw(rawFrontMatter);
    setHtml(parsedHTML);
    setReadingHtml(parsedReadingHtml);`;

content = content.replace(conflict12Target, conflict12Replace);

// 13. handlePaste reading conflict
const conflict13Target = `<<<<<<< HEAD
        const parsedHTML = parseMarkdownToHtml(text);
        setHtml(parsedHTML);
=======
        const { markdown: cleanMd, metadata, rawFrontMatter } = parseFrontMatter(text);
        setFrontMatterRaw(rawFrontMatter);
        const parsedHTML = marked.parse(cleanMd);
        const sanitizedHTML = sanitizeHtml(parsedHTML);
        const metadataHtml = renderMetadataCard(metadata);
        
        setHtml(sanitizedHTML);
>>>>>>> 3fc22c81f94733269354124a6d69228cb4eccefb
        setMarkdown(text);
        setReadingHtml(parsedHTML);`;

const conflict13Replace = `        const { html: parsedHTML, readingHtml: parsedReadingHtml, rawFrontMatter } = parseMarkdownToHtml(text);
        setFrontMatterRaw(rawFrontMatter);
        setHtml(parsedHTML);
        setMarkdown(text);
        setReadingHtml(parsedReadingHtml);`;

content = content.replace(conflict13Target, conflict13Replace);

// Also update handleSmartBeautify's parse call
content = content.replace(
  `    setMarkdown(beautified);\n    const parsedHTML = parseMarkdownToHtml(beautified);\n    setHtml(parsedHTML);\n    setReadingHtml(parsedHTML);`,
  `    setMarkdown(beautified);\n    const { html: parsedHTML, readingHtml: parsedReadingHtml, rawFrontMatter } = parseMarkdownToHtml(beautified);\n    setFrontMatterRaw(rawFrontMatter);\n    setHtml(parsedHTML);\n    setReadingHtml(parsedReadingHtml);`
);

// 14. Toolbar button conflict
const conflict14Target = `<<<<<<< HEAD
        {/* Smart Beautify Button (only visible for markdown editor) */}
        {isMd && (
          <button
            onClick={handleSmartBeautify}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-950/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-all active:scale-95 shadow-xs"
            title="✨ 智慧排版修復：自動修復從 AI 聊天視窗複製文字造成的換行破碎、Emoji 小標、條目清單及補齊 Mermaid 標籤"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span>智慧美化</span>
          </button>
=======
        {/* Load Local Images button (only visible for markdown editor in single/left columns) */}
        {isMd && (uniqueKey === 'left-pane-util' || uniqueKey === 'single-pane-util') && (
          <label className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-950 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg cursor-pointer transition-all select-none">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375 0 11-.75 0 .375 0 01.75 0z" />
            </svg>
            <span>載入本機圖片</span>
            <input
              type="file"
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleLoadLocalImages}
              className="hidden"
            />
          </label>
>>>>>>> 3fc22c81f94733269354124a6d69228cb4eccefb`;

const conflict14Replace = `        {/* Smart Beautify Button (only visible for markdown editor) */}
        {isMd && (
          <button
            onClick={handleSmartBeautify}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-950/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-all active:scale-95 shadow-xs"
            title="✨ 智慧排版修復：自動修復從 AI 聊天視窗複製文字造成的換行破碎、Emoji 小標、條目清單及補齊 Mermaid 標籤"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span>智慧美化</span>
          </button>
        )}

        {/* Load Local Images button (only visible for markdown editor in single/left columns) */}
        {isMd && (uniqueKey === 'left-pane-util' || uniqueKey === 'single-pane-util') && (
          <label className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-950 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg cursor-pointer transition-all select-none">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375 0 11-.75 0 .375 0 01.75 0z" />
            </svg>
            <span>載入本機圖片</span>
            <input
              type="file"
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleLoadLocalImages}
              className="hidden"
            />
          </label>
        )}`;

content = content.replace(conflict14Target, conflict14Replace);

fs.writeFileSync('src/App.jsx', content, 'utf8');
console.log('Successfully processed src/App.jsx');
