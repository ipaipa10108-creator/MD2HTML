import { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import TurndownService from 'turndown';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

// Initialize and configure Turndown Service for HTML to MD conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bullet: '*',
  codeBlockStyle: 'fenced'
});

// Remove copy code buttons when converting back to Markdown
turndownService.remove(function (node) {
  return node.nodeName === 'BUTTON' && node.classList.contains('copy-code-btn');
});

// Custom rule for parsing table back into Markdown GFM tables
turndownService.addRule('table', {
  filter: 'table',
  replacement: function (content, node) {
    const rows = Array.from(node.rows);
    if (rows.length === 0) return '';
    let mdTable = '\n';
    
    rows.forEach((row, rowIndex) => {
      let mdRow = '|';
      const cells = Array.from(row.cells);
      cells.forEach(cell => {
        mdRow += ` ${cell.textContent.trim().replace(/\n/g, ' ')} |`;
      });
      mdTable += mdRow + '\n';
      
      // Inject alignment divider row right after header row
      if (rowIndex === 0) {
        let divider = '|';
        cells.forEach(cell => {
          const align = cell.getAttribute('align') || '';
          if (align === 'center') divider += ' :---: |';
          else if (align === 'right') divider += ' ---: |';
          else divider += ' --- |';
        });
        mdTable += divider + '\n';
      }
    });
    return mdTable + '\n';
  }
});

// Custom rule for parsing codeblocks with language preservation
turndownService.addRule('fencedCodeBlock', {
  filter: function (node) {
    return node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
  },
  replacement: function (content, node) {
    const codeElem = node.firstChild;
    const className = codeElem.className || '';
    const langMatch = className.match(/language-(\S+)/);
    const lang = langMatch ? langMatch[1] : '';
    const codeText = codeElem.textContent || '';
    return `\n\`\`\`${lang}\n${codeText}\n\`\`\`\n`;
  }
});

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
    return `\n\`\`\`mermaid\n${rawCode}\n\`\`\`\n`;
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
});

// Configure marked to allow safe HTML tags and keep styling clean
marked.setOptions({
  gfm: true,
  breaks: true,
});

marked.use({
  renderer: {
    code({ text, lang }) {
      const language = lang || '';
      if (language === 'mermaid') {
        const encodedContent = window.btoa(unescape(encodeURIComponent(text)));
        return `<div class="mermaid-wrapper" contenteditable="false" data-mermaid-code="${encodedContent}">
          <pre class="mermaid">${text}</pre>
        </div>`;
      }
      return `<div class="code-block-wrapper">
  <button class="copy-code-btn" aria-label="Copy code" title="複製此程式碼">
    <svg class="copy-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
    <svg class="check-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  </button>
  <pre><code class="language-${language}">${text}</code></pre>
</div>`;
    },
    listitem(item) {
      if (item.task) {
        const checkedAttr = item.checked ? 'checked=""' : '';
        const itemHtml = `<span class="flex items-start gap-2">
          <input type="checkbox" disabled ${checkedAttr} class="w-4 h-4 mt-1 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500/30 accent-indigo-500 cursor-default shrink-0" />
          <span class="task-list-text">${this.parser.parse(item.tokens)}</span>
        </span>`;
        return `<li class="task-list-item list-none py-0.5">${itemHtml}</li>`;
      }
      return `<li>${this.parser.parse(item.tokens)}</li>`;
    }
  }
});

const initialMarkdown = `---
title: "萬能 Markdown 編輯轉換器"
description: "一個極致美觀、高效的三向即時同步 Markdown 編輯器，支援 GFM、Mermaid、YAML Front Matter 等強大功能。"
date: "2026-06-17"
tags: [Markdown, WebApp, Productivity, Mermaid]
draft: false
---

# 🚀 萬能 Markdown 編輯轉換器

歡迎使用這個功能強大且設計精美的 **Vite + React + Tailwind CSS** 單頁應用程式 (PWA)！支援三向即時同步、多種格式匯出，並針對行動端與桌面端進行深度最佳化。

## ✨ 核心特色功能

1. **三向即時互轉同步**：
   * 在 **Markdown**、**HTML 原始碼** 或 **美化閱讀排版** 任一區塊編輯，其餘兩者即時更新。
   * **雙擊閱讀排版**即可進入 \`contentEditable\` 視覺編輯模式，修改內容同步回 Markdown 及 HTML。

2. **彈性版面配置**：
   * 支援**單欄**或**雙欄對照**模式，可自訂左右欄位顯示（Markdown / HTML / 閱讀格式）。

3. **智慧圖片匯出與自由切片**：
   * 整合 \`html2canvas\` + \`JSZip\`，支援整頁、均等裁切或固定高度裁切。
   * 提供「極簡白」與「質感暗黑」兩種風格，一鍵打包下載 ZIP。

4. **PDF 匯出（圖片版 + 文字可複製版）**：
   * **圖片版 PDF**：完美還原美化排版，一鍵下載或分享。
   * **文字版 PDF**：動態載入霞鶩文楷字型，輸出 100% 可選取複製與全文搜尋的 PDF。

5. **美化 HTML 匯出（雙欄大綱排版）**：
   * 匯出精緻排版的獨立 HTML 檔案，開啟免安裝、免網路。
   * **自適應雙欄版面**：桌機預設左側大綱 + 右側文章；手機單欄，點選單展開大綱，點段落自動收合。
   * **字體調整（A+ / A-）**：桌機右上角，手機於標頭列右側，範圍 12–24px，偏好自動儲存。
   * **深色 / 淺色主題切換**：偏好自動儲存，桌機 / 手機版皆支援。
   * **Scrollspy 滾動偵測**：滾動時左側大綱自動高亮目前閱讀位置。

6. **社群分享最佳化**：
   * 行動端呼叫 Web Share API 直接傳送至 LINE 等 App。
   * **複製圖片至剪貼簿**：桌機直接 Ctrl+V 貼至 LINE 對話框。

7. **PWA 漸進式網頁應用**：可加入手機主畫面，離線時仍可使用。

8. **歷史記錄管理（Undo / Redo）**：400ms 防抖，支援無限次上一步與下一步。

9. **GFM 擴充語法支援**：
   * 完整支援 **GitHub Flavored Markdown (GFM)**，包括表格、任務清單與 ~~刪除線~~ 等語法。

10. **程式碼語法高亮**：
    * 整合 \`highlight.js\`，自動為各類程式碼區塊提供高品質語法著色與一鍵複製按鈕。

11. **Mermaid 流程圖與延遲載入**：
    * 支援標準 Mermaid 繪圖語法，且具備延遲載入優化——僅在文件確實包含 \` \`\`\`mermaid \` 時載入對應模組，純文字文件零效能負擔。

12. **YAML Front Matter 元資料卡片**：
    * 文件開頭的 \`---\` 包裹區塊會渲染為結構化的精美 metadata 卡片（含標題、描述、日期、標籤與 Draft 草稿狀態），而非解析成混亂的分隔線。

---

## 📊 範例展示

### 1. 表格排版

| 功能 | 支援狀態 | 說明 |
| :--- | :---: | :--- |
| 三向即時同步 | ✅ | Markdown / HTML / 閱讀格式三者互轉 |
| 圖片裁切匯出 | ✅ | Canvas 渲染 + JSZip 打包下載 |
| 文字可複製 PDF | ✅ | 霞鶩文楷向量字型嵌入 |
| 美化 HTML 匯出 | ✅ | 雙欄大綱、A± 字體、主題切換 |
| PWA 離線安裝 | ✅ | Service Worker + Web Manifest |
| Mermaid 流程圖 | ✅ | 延遲載入，僅在需要時載入 |
| YAML 元資料卡 | ✅ | 開頭 \`---\` 區塊美化渲染 |

### 2. 程式碼區塊

\`\`\`javascript
// 核心三向同步邏輯示意
function syncFromMarkdown(md) {
  const html = marked.parse(md);
  setHtml(html);         // 更新 HTML 原始碼
  setReadingHtml(html);  // 更新美化閱讀排版
}
\`\`\`

### 3. 任務清單與刪除線

* [x] 支援 GFM 表格渲染
* [x] 支援 ~~舊版~~ highlight.js 程式碼著色
* [x] 支援 Mermaid 流程圖載入與渲染
* [ ] 支援更多客製化 Markdown 解析選項

### 4. Mermaid 流程圖

\`\`\`mermaid
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
\`\`\`

> **提示**：雙擊右側「美化閱讀排版」的任意文字即可進行視覺化編輯，點擊空白處或其它面板即完成同步。

---

祝您使用愉快！點選上方工具列的「PDF 匯出 ▾」即可體驗所有匯出功能。
`;

// Helper to calculate character count
const getCharCount = (str) => {
  return str ? str.length : 0;
};

// Helper to parse headings from markdown text
const parseHeadings = (md) => {
  if (!md) return [];
  const lines = md.split('\n');
  const headings = [];
  let headingCount = 0;
  
  lines.forEach((line) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim().replace(/[#*`_~]/g, ''); // strip markdown formatting
      headingCount++;
      headings.push({
        id: `heading-${headingCount}`,
        level,
        text
      });
    }
  });
  return headings;
};

// Helper to find the first index of difference between two strings
const findDiffIndex = (oldStr, newStr) => {
  if (!oldStr || !newStr) return 0;
  if (oldStr === newStr) return -1;
  const minLen = Math.min(oldStr.length, newStr.length);
  for (let i = 0; i < minLen; i++) {
    if (oldStr[i] !== newStr[i]) {
      return i;
    }
  }
  return minLen;
};

// Helper to find a text node or element containing a specific text snippet
const findDOMNodeByText = (root, searchText) => {
  if (!root || !searchText) return null;
  
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue.includes(searchText)) {
      return node;
    }
  }
  
  const elements = root.getElementsByTagName('*');
  for (let el of elements) {
    if (el.innerText && el.innerText.includes(searchText) && el.children.length === 0) {
      return el;
    }
  }
  
  return null;
};

// Helper to parse YAML Front Matter
const parseFrontMatter = (md) => {
  if (!md || !md.startsWith('---')) return { markdown: md, metadata: null, rawFrontMatter: '' };
  
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return { markdown: md, metadata: null, rawFrontMatter: '' };
  
  const rawFrontMatter = match[0];
  const yamlText = match[1];
  const remainingMarkdown = md.substring(match[0].length);
  
  const metadata = {};
  const lines = yamlText.split(/\r?\n/);
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
  
  const tagsHtml = tags.map(tag => `
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-100/50 dark:border-indigo-900/30">
      # ${tag}
    </span>
  `).join(' ');

  const draftBadgeHtml = isDraft ? `
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider animate-pulse">
      Draft 草稿
    </span>
  ` : '';

  return `
    <div class="metadata-card-wrapper mb-8 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/30 backdrop-blur-sm shadow-sm flex flex-col gap-4" contenteditable="false">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="flex flex-col gap-1.5">
          ${draftBadgeHtml}
          <h2 class="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-slate-100 m-0 tracking-tight" style="border-bottom: none; margin-top: 0; padding-bottom: 0;">
            ${title}
          </h2>
        </div>
        ${date ? `<span class="text-xs font-medium text-slate-400 dark:text-slate-500 font-mono">${date}</span>` : ''}
      </div>
      ${description ? `<p class="text-sm text-slate-500 dark:text-slate-400 m-0 leading-relaxed">${description}</p>` : ''}
      ${tags.length > 0 ? `<div class="flex flex-wrap gap-2 mt-1">${tagsHtml}</div>` : ''}
    </div>
  `;
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
      const cleanSrc = decodedSrc.replace(/^\.\//, '');
      
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

const fetchFontWithCache = async () => {
  if (cachedFontBase64) return cachedFontBase64;
  
  const url = 'https://cdn.jsdelivr.net/gh/lxgw/LxgwWenKai-Lite@main/fonts/TTF/LXGWWenKaiLite-Regular.ttf';
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch font from CDN');
  
  const buffer = await response.arrayBuffer();
  
  // Safe ArrayBuffer to Base64 conversion without call stack limitations
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 65536; // 64KB chunks
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  
  cachedFontBase64 = window.btoa(binary);
  return cachedFontBase64;
};

export default function App() {
  // Check for shared content from Android Web Share Target API on Mount/Initial Render
  const sharedText = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('text') || params.get('title') || params.get('url') || '';
    } catch (err) {
      console.error('Failed to parse search params:', err);
      return '';
    }
  })();

  const defaultMarkdown = sharedText || initialMarkdown;
  
  const initialParse = parseFrontMatter(defaultMarkdown);
  const defaultHtml = sanitizeHtml(marked.parse(initialParse.markdown));
  const defaultReadingHtml = renderMetadataCard(initialParse.metadata) + defaultHtml;

  // --- Content State ---
  const [markdown, setMarkdown] = useState(defaultMarkdown);
  const [html, setHtml] = useState(() => defaultHtml);
  const [readingHtml, setReadingHtml] = useState(() => defaultReadingHtml);
  const [frontMatterRaw, setFrontMatterRaw] = useState(initialParse.rawFrontMatter);

  // --- Drag and Drop File State ---
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // --- Local Relative Image Mapping State ---
  const [imageMap, setImageMap] = useState({});

  // --- Layout State ---
  const [layout, setLayout] = useState('single'); // default changed to 'single'
  const [previewFontSize, setPreviewFontSize] = useState(15); // default base font size is 15px
  const [singlePane, setSinglePane] = useState(() => sharedText ? 'reading' : 'markdown'); // 'markdown' | 'html' | 'reading'
  const [leftPane, setLeftPane] = useState('markdown'); // 'markdown' | 'html' | 'reading'
  const [rightPane, setRightPane] = useState('reading'); // 'markdown' | 'html' | 'reading'
  const [autoJump, setAutoJump] = useState(true); // Auto jump on paste

  const [showToolbars, setShowToolbars] = useState(true); // Auto hide/show toolbars on mobile scroll/tap

  // --- Mermaid Custom Background State ---
  const [mermaidBg, setMermaidBg] = useState(() => {
    const saved = localStorage.getItem('mermaid-bg');
    return saved || 'white';
  });

  useEffect(() => {
    localStorage.setItem('mermaid-bg', mermaidBg);
  }, [mermaidBg]);

  const getMermaidBgColor = () => {
    if (mermaidBg === 'dark') return '#0f172a';
    if (mermaidBg === 'light') return '#f8fafc';
    if (mermaidBg === 'white') return '#ffffff';
    if (mermaidBg === 'transparent') return 'transparent';
    return '#ffffff';
  };

  const getMermaidTheme = () => {
    if (mermaidBg === 'dark') return 'dark';
    if (mermaidBg === 'light' || mermaidBg === 'white') return 'default';
    return darkMode ? 'dark' : 'default';
  };

  // --- Double Click Editable State ---
  const [isReadingEditable, setIsReadingEditable] = useState(false);

  // --- Undo/Redo History Stack ---
  const [history, setHistory] = useState([defaultMarkdown]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // --- Modals State ---
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFilenameModal, setShowFilenameModal] = useState(false);
  const [pendingHtmlAction, setPendingHtmlAction] = useState(null);
  const [tempExportFilename, setTempExportFilename] = useState('');
  const [exportHTMLBlob, setExportHTMLBlob] = useState(null);
  const [exportHTMLTitle, setExportHTMLTitle] = useState('');

  // --- Export Configurations ---
  const [exportTheme, setExportTheme] = useState('light'); // 'light' | 'dark'
  const [sliceMode, setSliceMode] = useState('full'); // 'full' | 'parts' | 'height'
  const [numParts, setNumParts] = useState(3);
  const [fixedHeight, setFixedHeight] = useState(800);
  const [slices, setSlices] = useState([]);
  const [selectedSlices, setSelectedSlices] = useState({}); // { sliceIndex: boolean }
  const [isGenerating, setIsGenerating] = useState(false);
  const [zipProgress, setZipProgress] = useState(null);
  const [shareStatus, setShareStatus] = useState(null); // null | 'sharing' | 'success' | 'error' | 'unsupported'

  // --- Toast Notification System ---
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  // --- PDF Dropdown State ---
  const [activePdfDropdown, setActivePdfDropdown] = useState(null); // 'mobile-pdf' or '${uniqueKey}-pdf'

  // --- Dark Mode State ---
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return false; // Default is light mode (白底模式)
  });

  const [resizeKey, setResizeKey] = useState(0);

  const [captureTotalHeight, setCaptureTotalHeight] = useState(0);

  const measureCaptureHeight = () => {
    const el = document.getElementById('export-capture-area');
    if (el) {
      setCaptureTotalHeight(el.scrollHeight);
    }
  };

  useEffect(() => {
    if (showExportModal) {
      const timer = setTimeout(() => {
        measureCaptureHeight();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showExportModal, readingHtml, exportTheme]);

  // --- Temporary Status Messages (e.g. Copied) ---
  const [copiedStatus, setCopiedStatus] = useState({}); // { panelId: boolean }

  // --- Refs ---
  const activePaneRef = useRef(null); // 'markdown' | 'html' | 'reading'
  const readingViewRef = useRef(null);
  const leftReadingViewRef = useRef(null);
  const rightReadingViewRef = useRef(null);
  const leftPaneElementRef = useRef(null);
  const rightPaneElementRef = useRef(null);
  const singlePaneElementRef = useRef(null);
  const historyTimeoutRef = useRef(null);

  // Sync Dark Mode Class on Mount & Update
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

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

  // Clean up timeouts
  useEffect(() => {
    return () => {
      if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
    };
  }, []);

  // Click outside detection for PDF dropdowns (supports both mouse click and mobile touch)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.pdf-dropdown-container')) {
        setActivePdfDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  const handleMarkdownChangeRef = useRef(handleMarkdownChange);
  const handleHtmlChangeRef = useRef(handleHtmlChange);
  const showToastRef = useRef(showToast);
  const imageMapRef = useRef(imageMap);

  useEffect(() => {
    handleMarkdownChangeRef.current = handleMarkdownChange;
    handleHtmlChangeRef.current = handleHtmlChange;
    showToastRef.current = showToast;
    imageMapRef.current = imageMap;
  });

  const handleLoadLocalImages = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newMap = { ...imageMap };
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = file.webkitRelativePath || file.name;
      // Strip root folder name if webkitRelativePath exists
      const parts = path.split('/');
      const cleanKey = parts.slice(1).join('/') || file.name;
      
      const url = URL.createObjectURL(file);
      newMap[cleanKey] = url;
      newMap[file.name] = url;
    }
    setImageMap(newMap);
    showToast(`📁 已成功載入 ${files.length} 張本機圖片以解析相對路徑！`, 'success');
  };

  const mermaidRef = useRef(null);
  // Track the last readingHtml+theme for which Mermaid was fully rendered
  // so layout/resize events don't needlessly re-render already-rendered diagrams
  const mermaidLastRenderKeyRef = useRef('');

  // Lazy-load Mermaid only when necessary
  useEffect(() => {
    const containsMermaid = markdown.includes('```mermaid');
    if (containsMermaid) {
      // Build a key from content+theme. If only layout/resize changed,
      // the key stays the same and we can skip already-rendered wrappers.
      const contentKey = `${readingHtml}::${darkMode}::${mermaidBg}`;
      const contentChanged = contentKey !== mermaidLastRenderKeyRef.current;

      let active = true;
      // Use a shorter debounce for content changes, longer for mere resize
      const debounce = contentChanged ? 300 : 0;
      const timer = setTimeout(() => {
        const renderDiagrams = async (mermaid) => {
          if (!active) return;
          mermaid.initialize({
            startOnLoad: false,
            theme: getMermaidTheme(),
            securityLevel: 'loose',
            suppressErrorRendering: true,
          });

          const wrappers = document.querySelectorAll('.mermaid-wrapper');
          for (const el of wrappers) {
            if (!active) return;

            // If content/theme has NOT changed, skip wrappers that already
            // have a rendered SVG (marked by data-mermaid-rendered attribute)
            if (!contentChanged && el.getAttribute('data-mermaid-rendered') === 'true') {
              continue;
            }

            const encoded = el.getAttribute('data-mermaid-code') || '';
            let rawCode = '';
            try {
              rawCode = decodeURIComponent(escape(window.atob(encoded)));
            } catch (e) {
              continue;
            }
            
            const svgId = `mermaid-svg-${Math.random().toString(36).substring(2, 11)}`;
            try {
              await mermaid.parse(rawCode);
              const { svg } = await mermaid.render(svgId, rawCode);
              if (active) {
                el.innerHTML = svg;
                el.setAttribute('data-mermaid-rendered', 'true');
              }
            } catch (err) {
              console.warn("Mermaid rendering failed:", err);
              if (active) {
                el.innerHTML = `<pre class="mermaid">${rawCode}</pre>`;
                el.setAttribute('data-mermaid-rendered', 'true');
              }
            }
          }

          if (active && contentChanged) {
            mermaidLastRenderKeyRef.current = contentKey;
          }
        };

        if (!mermaidRef.current) {
          import('mermaid').then((mermaidModule) => {
            if (!active) return;
            const mermaid = mermaidModule.default;
            mermaidRef.current = mermaid;
            renderDiagrams(mermaid);
          });
        } else {
          renderDiagrams(mermaidRef.current);
        }
      }, debounce);
      
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [readingHtml, darkMode, markdown, mermaidBg, layout, singlePane, leftPane, rightPane, resizeKey]);

  // Imperatively update innerHTML of reading view containers when readingHtml changes.
  // This replaces dangerouslySetInnerHTML so React never wipes Mermaid-rendered SVGs
  // on re-renders caused by unrelated state changes (e.g. isReadingEditable toggle).
  // We skip the update while in edit mode to preserve user's in-progress edits.
  useEffect(() => {
    if (isReadingEditable) return; // Don't overwrite user's live edits
    const resolvedHtml = resolveImageSources(readingHtml, imageMap);
    const refs = [readingViewRef, leftReadingViewRef, rightReadingViewRef];
    refs.forEach(ref => {
      if (ref.current) {
        ref.current.innerHTML = resolvedHtml;
      }
    });
    // Reset mermaid-rendered flags so the Mermaid effect will re-render fresh diagrams
    mermaidLastRenderKeyRef.current = '';
  }, [readingHtml, imageMap]);

  // Syntax highlighting for regular code blocks
  useEffect(() => {
    const codeBlocks = document.querySelectorAll('.preview-prose pre code:not(.language-mermaid)');
    codeBlocks.forEach((block) => {
      if (!block.classList.contains('hljs')) {
        hljs.highlightElement(block);
      }
    });
  }, [readingHtml, layout, singlePane, leftPane, rightPane]);

  // --- Global Window Drag and Drop File Listeners ---
  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
    };

    const handleDragEnter = (e) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
        dragCounterRef.current++;
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
        dragCounterRef.current--;
        if (dragCounterRef.current <= 0) {
          dragCounterRef.current = 0;
          setIsDragging(false);
        }
      }
    };

    const handleDrop = async (e) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);

      const items = e.dataTransfer.items;
      const newImageMap = { ...imageMapRef.current };
      let mdContent = '';
      let mdFileName = '';
      let htmlContent = '';
      let htmlFileName = '';

      const traverseFileTree = async (item, path = '') => {
        if (item.isFile) {
          const file = await new Promise((resolve) => item.file(resolve));
          const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
          const relativePath = path + file.name;
          
          if (['.md', '.txt'].includes(ext)) {
            mdContent = await file.text();
            mdFileName = file.name;
          } else if (['.html', '.htm'].includes(ext)) {
            htmlContent = await file.text();
            htmlFileName = file.name;
          } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext)) {
            const blobUrl = URL.createObjectURL(file);
            newImageMap[relativePath] = blobUrl;
            newImageMap[file.name] = blobUrl;
          }
        } else if (item.isDirectory) {
          const dirReader = item.createReader();
          const readEntries = () => {
            return new Promise((resolve) => {
              dirReader.readEntries(resolve);
            });
          };
          
          let entries = await readEntries();
          for (const entry of entries) {
            await traverseFileTree(entry, path + item.name + '/');
          }
        }
      };

      if (items && items.length > 0) {
        const promises = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i].webkitGetAsEntry();
          if (item) {
            promises.push(traverseFileTree(item));
          }
        }
        await Promise.all(promises);

        setImageMap(newImageMap);

        if (mdContent) {
          handleMarkdownChangeRef.current(mdContent);
          showToastRef.current(`📥 已成功讀取 Markdown 檔案: ${mdFileName}，並載入本機圖片！`, 'success');
        } else if (htmlContent) {
          let parsedContent = htmlContent;
          if (htmlContent.includes('<body') || htmlContent.includes('<BODY')) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            const markdownBody = doc.querySelector('.markdown-body');
            if (markdownBody) {
              parsedContent = markdownBody.innerHTML;
            } else if (doc.body) {
              parsedContent = doc.body.innerHTML;
            }
          }
          handleHtmlChangeRef.current(parsedContent);
          showToastRef.current(`📥 已成功讀取 HTML 檔案: ${htmlFileName}，並載入本機圖片！`, 'success');
        } else if (Object.keys(newImageMap).length > 0) {
          showToastRef.current(`📥 已載入 ${Object.keys(newImageMap).length} 張本機圖片！`, 'success');
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Handle shared content from Android Web Share Target API on Mount
  useEffect(() => {
    // 1. Handle legacy GET-based share target parameters
    if (sharedText) {
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => {
          showToast('📥 已成功載入分享的 Markdown 文字！', 'success');
        }, 150);
      } catch (err) {
        console.error('Failed to clear search parameters:', err);
      }
    }

    // 2. Handle POST-based share target (intercepted by service worker)
    const params = new URLSearchParams(window.location.search);
    if (params.get('shared') === 'true') {
      const checkSharedData = () => {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          const messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = (event) => {
            if (event.data && event.data.type === 'SHARED_DATA') {
              const { text, title, url } = event.data.data;
              const sharedVal = text || title || url;
              if (sharedVal) {
                setMarkdown(sharedVal);
                const { markdown: cleanMd, metadata, rawFrontMatter } = parseFrontMatter(sharedVal);
                setFrontMatterRaw(rawFrontMatter);
                const parsedHTML = marked.parse(cleanMd);
                const sanitizedHTML = sanitizeHtml(parsedHTML);
                const metadataHtml = renderMetadataCard(metadata);
                setHtml(sanitizedHTML);
                setReadingHtml(metadataHtml + sanitizedHTML);
                setHistory([sharedVal]);
                setHistoryIndex(0);
                setLayout('single');
                setSinglePane('reading');
                window.history.replaceState({}, document.title, window.location.pathname);
                setTimeout(() => {
                  showToast('📥 已成功載入分享的 Markdown 文字！', 'success');
                }, 150);
              }
            }
          };
          navigator.serviceWorker.controller.postMessage(
            { type: 'GET_SHARED_DATA' },
            [messageChannel.port2]
          );
        } else {
          // If controller is not ready yet, retry in 100ms
          setTimeout(checkSharedData, 100);
        }
      };
      
      checkSharedData();
    }
  }, [sharedText]);

  const lastScrollY = useRef(0);

  const handleScroll = (e) => {
    // Only auto-hide on mobile devices (e.g. window.innerWidth < 768)
    if (window.innerWidth >= 768) return;
    
    // If the user is currently editing, don't hide
    if (isReadingEditable) return;
    if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') {
      return;
    }

    const scrollTop = e.currentTarget.scrollTop;
    const diff = scrollTop - lastScrollY.current;
    
    if (scrollTop > 20 && Math.abs(diff) > 8) {
      if (diff > 0) {
        // Scrolling down -> hide toolbars
        if (showToolbars) {
          setShowToolbars(false);
        }
      }
    }
    // If scrolled back to absolute top, show them
    if (scrollTop < 5) {
      if (!showToolbars) {
        setShowToolbars(true);
      }
    }
    lastScrollY.current = scrollTop;
  };

  const handleContentClick = (e) => {
    // Single tap on content to show toolbars on mobile if they are hidden
    if (window.innerWidth < 768) {
      if (!showToolbars) {
        setShowToolbars(true);
      }
    }

    // Handle copying code blocks when the copy button is clicked
    if (e && e.target) {
      const copyBtn = e.target.closest('.copy-code-btn');
      if (copyBtn) {
        e.stopPropagation();
        e.preventDefault();
        
        const wrapper = copyBtn.closest('.code-block-wrapper');
        const pre = wrapper ? wrapper.querySelector('pre') : null;
        if (pre) {
          const codeText = pre.textContent || '';
          navigator.clipboard.writeText(codeText)
            .then(() => {
              copyBtn.classList.add('copied');
              setTimeout(() => {
                copyBtn.classList.remove('copied');
              }, 2000);
            })
            .catch(err => {
              console.error('Failed to copy code block content:', err);
              showToast('複製失敗，請手動複製', 'error');
            });
        }
      }
    }
  };

  // Align left pane cursor and scroll when right pane is modified
  const alignLeftPaneToRight = (targetPane, oldTargetVal, newTargetVal) => {
    if (layout !== 'double') return;
    
    // Find the first index of difference
    const diffIdx = findDiffIndex(oldTargetVal, newTargetVal);
    if (diffIdx === -1) return;
    
    // Schedule the scroll/caret highlight in the next tick (after DOM updates)
    setTimeout(() => {
      const leftEl = leftPaneElementRef.current;
      if (!leftEl) return;
      
      if (targetPane === 'markdown' || targetPane === 'html') {
        // Target is a textarea
        try {
          // 1. Set the caret position (selectionStart/selectionEnd)
          leftEl.focus();
          leftEl.setSelectionRange(diffIdx, diffIdx);
          
          // 2. Scroll the textarea to make the modified line visible
          const textBefore = newTargetVal.substring(0, diffIdx);
          const lineIndex = textBefore.split('\n').length - 1;
          
          const computedStyle = window.getComputedStyle(leftEl);
          const lineHeight = parseInt(computedStyle.lineHeight) || 20;
          
          leftEl.scrollTop = Math.max(0, lineIndex * lineHeight - leftEl.clientHeight / 2);

          // Restore focus to the active element (which is the right pane textarea)
          const activeEl = rightPaneElementRef.current;
          if (activeEl && activeEl !== document.activeElement) {
            activeEl.focus();
          }
        } catch (e) {
          console.warn("Failed to sync selection/scroll in textarea:", e);
        }
      } else if (targetPane === 'reading') {
        // Target is the Reading View outer container (which has ref={leftPaneElementRef})
        // The inner contentEditable element is leftReadingViewRef.current
        const readingDiv = leftReadingViewRef.current;
        if (!readingDiv) return;
        
        try {
          // Convert HTML string to plain text to find the text diff index
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = newTargetVal;
          const newPlainText = tempDiv.innerText;
          
          const tempOldDiv = document.createElement('div');
          tempOldDiv.innerHTML = oldTargetVal;
          const oldPlainText = tempOldDiv.innerText;
          
          const textDiffIdx = findDiffIndex(oldPlainText, newPlainText);
          if (textDiffIdx === -1) return;
          
          // Get a text snippet around the edit position to search in DOM
          const start = Math.max(0, textDiffIdx - 10);
          const end = Math.min(newPlainText.length, textDiffIdx + 10);
          const snippet = newPlainText.substring(start, end).trim();
          
          if (snippet.length > 2) {
            const targetNode = findDOMNodeByText(readingDiv, snippet);
            if (targetNode) {
              const elementToScroll = targetNode.nodeType === Node.TEXT_NODE ? targetNode.parentElement : targetNode;
              
              // Scroll the element into view of the container
              elementToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              // Add a visual flash highlight
              elementToScroll.classList.add('animate-change-highlight');
              setTimeout(() => {
                elementToScroll.classList.remove('animate-change-highlight');
              }, 2000);
            }
          }
        } catch (e) {
          console.warn("Failed to sync scroll in reading view:", e);
        }
      }
    }, 80);
  };

  // --- Undo / Redo Stack Handler ---
  const pushToHistory = (newMD) => {
    if (history[historyIndex] === newMD) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newMD);
    if (newHistory.length > 50) {
      newHistory.shift();
      setHistoryIndex(newHistory.length - 1);
    } else {
      setHistoryIndex(newHistory.length - 1);
    }
    setHistory(newHistory);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      const prevMD = history[nextIdx];
      
      activePaneRef.current = 'history';
      setMarkdown(prevMD);
      
      const { markdown: cleanMd, metadata, rawFrontMatter } = parseFrontMatter(prevMD);
      setFrontMatterRaw(rawFrontMatter);
      const parsedHTML = marked.parse(cleanMd);
      const sanitizedHTML = sanitizeHtml(parsedHTML);
      const metadataHtml = renderMetadataCard(metadata);
      
      setHtml(sanitizedHTML);
      setReadingHtml(metadataHtml + sanitizedHTML);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      const nextMD = history[nextIdx];

      activePaneRef.current = 'history';
      setMarkdown(nextMD);
      
      const { markdown: cleanMd, metadata, rawFrontMatter } = parseFrontMatter(nextMD);
      setFrontMatterRaw(rawFrontMatter);
      const parsedHTML = marked.parse(cleanMd);
      const sanitizedHTML = sanitizeHtml(parsedHTML);
      const metadataHtml = renderMetadataCard(metadata);
      
      setHtml(sanitizedHTML);
      setReadingHtml(metadataHtml + sanitizedHTML);
    }
  };

  // --- Three-way Synchronization Handlers ---

  // 1. Triggered by typing in Markdown Textarea
  function handleMarkdownChange(val, side, nativeEvent) {
    activePaneRef.current = 'markdown';
    const oldHtml = html;
    setMarkdown(val);
    
    const { markdown: cleanMd, metadata, rawFrontMatter } = parseFrontMatter(val);
    setFrontMatterRaw(rawFrontMatter);
    
    const parsedHTML = marked.parse(cleanMd);
    const sanitizedHTML = sanitizeHtml(parsedHTML);
    const metadataHtml = renderMetadataCard(metadata);
    const finalReadingHtml = metadataHtml + sanitizedHTML;
    
    setHtml(sanitizedHTML);
    setReadingHtml(finalReadingHtml);

    if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
    historyTimeoutRef.current = setTimeout(() => {
      pushToHistory(val);
    }, 400);

    // Auto-jump logic for GBoard paste suggestion and other direct pasting methods
    if (autoJump && layout === 'single') {
      const isPaste = nativeEvent && (
        nativeEvent.inputType === 'insertFromPaste' ||
        nativeEvent.inputType === 'insertReplacementText'
      );
      const isLargeDiff = val.length - markdown.length > 15;
      const isComposition = nativeEvent && nativeEvent.inputType === 'insertCompositionText';

      if (isPaste || (isLargeDiff && !isComposition)) {
        setTimeout(() => {
          setSinglePane('reading');
        }, 120);
      }
    }

    // If the edit came from the right column, align the left column
    if (layout === 'double' && side === 'right') {
      if (leftPane === 'html') {
        alignLeftPaneToRight('html', oldHtml, sanitizedHTML);
      } else if (leftPane === 'reading') {
        alignLeftPaneToRight('reading', oldHtml, finalReadingHtml);
      }
    }
  }

  // 2. Triggered by typing in HTML Textarea
  function handleHtmlChange(val, side) {
    activePaneRef.current = 'html';
    const oldMarkdown = markdown;
    const oldHtml = html;
    
    const sanitizedHTML = sanitizeHtml(val);
    setHtml(sanitizedHTML);
    
    const { metadata } = parseFrontMatter(markdown);
    const metadataHtml = renderMetadataCard(metadata);
    setReadingHtml(metadataHtml + sanitizedHTML);

    const convertedMD = turndownService.turndown(sanitizedHTML);
    const finalMD = frontMatterRaw + convertedMD;
    setMarkdown(finalMD);

    if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
    historyTimeoutRef.current = setTimeout(() => {
      pushToHistory(finalMD);
    }, 400);

    // If the edit came from the right column, align the left column
    if (layout === 'double' && side === 'right') {
      if (leftPane === 'markdown') {
        alignLeftPaneToRight('markdown', oldMarkdown, finalMD);
      } else if (leftPane === 'reading') {
        alignLeftPaneToRight('reading', oldHtml, sanitizedHTML);
      }
    }
  }

  // Double click event on Reading View — toggles edit mode.
  // First double-click enters edit mode; second double-click exits (calls blur).
  const handleReadingDoubleClick = (side) => {
    const readingRef = side === 'left' ? leftReadingViewRef : (side === 'right' ? rightReadingViewRef : readingViewRef);
    if (isReadingEditable) {
      // Already in edit mode: second double-click exits by triggering blur
      if (readingRef.current) {
        readingRef.current.blur();
      }
      return;
    }
    setIsReadingEditable(true);
    activePaneRef.current = 'reading';
    setTimeout(() => {
      if (readingRef.current) {
        readingRef.current.focus();
      }
    }, 30);
  };

  // When focus leaves Reading view (Blur), sync is executed. Resolves mobile keyboard/caret bugs.
  const handleReadingBlur = (e, side) => {
    setIsReadingEditable(false);
    const innerHTML = e.currentTarget.innerHTML;
    const oldMarkdown = markdown;
    const oldHtml = html;
    
    const sanitizedHTML = sanitizeHtml(innerHTML);
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizedHTML, 'text/html');
    const metaCard = doc.querySelector('.metadata-card-wrapper');
    if (metaCard) {
      metaCard.remove();
    }
    const cleanBodyHtml = doc.body.innerHTML;
    
    setHtml(cleanBodyHtml);
    setReadingHtml(sanitizedHTML);
    
    const convertedMD = turndownService.turndown(cleanBodyHtml);
    const finalMD = frontMatterRaw + convertedMD;
    setMarkdown(finalMD);
    pushToHistory(finalMD);

    // If the edit came from the right column, align the left column
    if (layout === 'double' && side === 'right') {
      if (leftPane === 'markdown') {
        alignLeftPaneToRight('markdown', oldMarkdown, finalMD);
      } else if (leftPane === 'html') {
        alignLeftPaneToRight('html', oldHtml, cleanBodyHtml);
      }
    }
  };

  // --- Clipboard utilities ---

  const triggerCopiedFeedback = (panelId) => {
    setCopiedStatus(prev => ({ ...prev, [panelId]: true }));
    setTimeout(() => {
      setCopiedStatus(prev => ({ ...prev, [panelId]: false }));
    }, 1500);
  };

  const handleCopy = (type, panelId) => {
    let copyText = '';
    if (type === 'markdown') {
      copyText = markdown;
    } else if (type === 'html') {
      copyText = html;
    } else if (type === 'plain') {
      if (readingViewRef.current) {
        copyText = readingViewRef.current.innerText;
      } else {
        copyText = html.replace(/<[^>]*>/g, '');
      }
    }
    
    navigator.clipboard.writeText(copyText)
      .then(() => triggerCopiedFeedback(panelId))
      .catch(err => console.error('Failed to copy text: ', err));
  };

  const handlePaste = async (type) => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;

      if (type === 'markdown') {
        handleMarkdownChange(text);
        if (autoJump && layout === 'single') {
          setSinglePane('reading');
        }
      } else if (type === 'html') {
        handleHtmlChange(text);
      } else if (type === 'reading') {
        const { markdown: cleanMd, metadata, rawFrontMatter } = parseFrontMatter(text);
        setFrontMatterRaw(rawFrontMatter);
        const parsedHTML = marked.parse(cleanMd);
        const sanitizedHTML = sanitizeHtml(parsedHTML);
        const metadataHtml = renderMetadataCard(metadata);
        
        setHtml(sanitizedHTML);
        setMarkdown(text);
        setReadingHtml(metadataHtml + sanitizedHTML);
        pushToHistory(text);
      }
    } catch (err) {
      alert('請先授權剪貼簿讀取權限！');
      console.error('Failed to read clipboard: ', err);
    }
  };

  const handleClearAll = () => {
    setMarkdown('');
    setHtml('');
    setReadingHtml('');
    pushToHistory('');
    setShowConfirmClear(false);
  };

  // --- Slicing, Export, Clipboard Copy & Share Logic ---

  const handleExportPDF = async (action) => {
    showToast('⏳ 正在產生 PDF 文件，請稍候...', 'info');
    try {
      const element = document.getElementById('export-capture-area');
      if (!element) {
        showToast('找不到匯出區域', 'error');
        return;
      }

      // Render the offscreen element to a high-resolution canvas
      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: 2, // 2x high-resolution rendering
        backgroundColor: '#ffffff', // PDFs should always have white background
        logging: false
      });

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Calculate PDF dimensions (A4 size: 595.28 pt x 841.89 pt)
      const pdfWidth = 595.28;
      const pdfHeight = 841.89;
      
      // Calculate scale factor to fit PDF width
      const ratio = pdfWidth / (imgWidth / 2); // image width divided by scale factor 2
      
      // Calculate how many canvas pixels fit on one A4 page
      const pageHeightInCanvas = (pdfHeight / ratio) * 2; // page height in canvas scale 2
      const totalPages = Math.ceil(imgHeight / pageHeightInCanvas);
      
      // Load jsPDF dynamically
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage();
        
        const startY = i * pageHeightInCanvas;
        const currentHeight = Math.min(pageHeightInCanvas, imgHeight - startY);
        
        // Draw slice of the main canvas to a temporary slice canvas
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = imgWidth;
        sliceCanvas.height = currentHeight;
        
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, startY, imgWidth, currentHeight, 0, 0, imgWidth, currentHeight);
        
        const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.95);
        const destHeight = (currentHeight / 2) * ratio;
        
        pdf.addImage(sliceImgData, 'JPEG', 0, 0, pdfWidth, destHeight);
      }

      const ts = getTimestampString();
      const fileName = `md2pdf_${ts}.pdf`;

      if (action === 'download') {
        pdf.save(fileName);
        showToast('✅ PDF 已成功儲存至本地！', 'success');
      } else if (action === 'share') {
        // Convert to Blob and File object for sharing
        const pdfBlob = pdf.output('blob');
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            files: [pdfFile],
            title: '分享 PDF 文件',
            text: '這是從 Markdown 編輯器產生的 PDF 文件。'
          });
          showToast('✅ 分享視窗已開啟！', 'success');
        } else {
          // Fallback if sharing is unsupported
          pdf.save(fileName);
          showToast('⚠️ 本裝置不支援直接分享 PDF，已自動為您下載！', 'warning');
        }
      }
    } catch (err) {
      console.error('PDF generation failed:', err);
      showToast('❌ 產生 PDF 失敗，請重試！', 'error');
    }
  };

  const handleExportTextPDF = async (action) => {
    showToast('⏳ 正在載入字型並產生文字 PDF，請稍候...', 'info');
    try {
      // 1. Fetch Chinese font
      const fontBase64 = await fetchFontWithCache();
      
      // 2. Load jsPDF
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });
      
      // 3. Register and set font
      pdf.addFileToVFS('LXGWWenKaiLite.ttf', fontBase64);
      pdf.addFont('LXGWWenKaiLite.ttf', 'LXGWWenKaiLite', 'normal');
      pdf.setFont('LXGWWenKaiLite');
      
      // 4. Set document parameters
      const pageHeight = 841.89;
      const pageWidth = 595.28;
      const margin = 50;
      const printableWidth = pageWidth - 2 * margin;
      
      let currentY = margin;
      
      const checkPageBreak = (neededHeight) => {
        if (currentY + neededHeight > pageHeight - margin) {
          pdf.addPage();
          pdf.setFont('LXGWWenKaiLite');
          currentY = margin;
        }
      };
      
      // Parse markdown text line-by-line
      const lines = markdown.split(/\r?\n/);
      let inCodeBlock = false;
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trimEnd();
        
        // Skip empty lines, but add vertical spacing
        if (line.trim() === '') {
          currentY += 12;
          continue;
        }
        
        // Code blocks block toggle
        if (line.startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          continue;
        }
        
        if (inCodeBlock) {
          // Inside a code block, use smaller font and distinct style
          pdf.setFontSize(10);
          const wrapped = pdf.splitTextToSize(line, printableWidth - 20);
          const lineHeight = 15;
          
          wrapped.forEach(l => {
            checkPageBreak(lineHeight);
            // Draw light background for code line
            pdf.setFillColor(245, 247, 250);
            pdf.rect(margin, currentY - 10, printableWidth, lineHeight, 'F');
            pdf.setTextColor(80, 80, 80);
            pdf.text(l, margin + 10, currentY);
            currentY += lineHeight;
          });
          pdf.setTextColor(0, 0, 0); // reset color
          pdf.setFontSize(11);
          continue;
        }
        
        // Headers
        if (line.startsWith('#')) {
          const match = line.match(/^(#{1,6})\s+(.*)$/);
          if (match) {
            const level = match[1].length;
            const text = match[2];
            
            let fontSize = 11;
            let spacingBefore = 15;
            let spacingAfter = 8;
            
            if (level === 1) { fontSize = 20; spacingBefore = 20; }
            else if (level === 2) { fontSize = 16; spacingBefore = 18; }
            else if (level === 3) { fontSize = 14; spacingBefore = 14; }
            else { fontSize = 12; spacingBefore = 12; }
            
            currentY += spacingBefore;
            pdf.setFontSize(fontSize);
            
            const wrapped = pdf.splitTextToSize(text, printableWidth);
            const lineHeight = fontSize * 1.3;
            
            wrapped.forEach(l => {
              checkPageBreak(lineHeight);
              pdf.text(l, margin, currentY);
              // Draw twice slightly offset to create bold effect since we use single regular font file
              pdf.text(l, margin + 0.3, currentY);
              currentY += lineHeight;
            });
            
            currentY += spacingAfter;
            pdf.setFontSize(11);
            continue;
          }
        }
        
        // Blockquotes
        if (line.startsWith('>')) {
          const text = line.substring(1).trim();
          pdf.setFontSize(10.5);
          const wrapped = pdf.splitTextToSize(text, printableWidth - 20);
          const lineHeight = 16;
          
          const startY = currentY - 10;
          wrapped.forEach(l => {
            checkPageBreak(lineHeight);
            pdf.text(l, margin + 15, currentY);
            currentY += lineHeight;
          });
          const endY = currentY - 10;
          
          // Draw blockquote border line
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(2);
          pdf.line(margin + 5, startY, margin + 5, endY);
          
          pdf.setFontSize(11);
          continue;
        }
        
        // List items
        const listMatch = line.match(/^(\s*)(-\s+|\*\s+|\+\s+|\d+\.\s+)(.*)$/);
        if (listMatch) {
          const indentLevel = listMatch[1].length;
          const marker = listMatch[2];
          const text = listMatch[3];
          
          const isNumbered = /^\d+/.test(marker.trim());
          const displayMarker = isNumbered ? marker.trim() : '•';
          
          const indentWidth = 15 + indentLevel * 10;
          pdf.setFontSize(11);
          const wrapped = pdf.splitTextToSize(text, printableWidth - indentWidth);
          const lineHeight = 16;
          
          wrapped.forEach((l, idx) => {
            checkPageBreak(lineHeight);
            if (idx === 0) {
              pdf.text(displayMarker, margin + indentWidth - 10, currentY);
            }
            pdf.text(l, margin + indentWidth, currentY);
            currentY += lineHeight;
          });
          continue;
        }
        
        // Standard Paragraph
        pdf.setFontSize(11);
        const wrapped = pdf.splitTextToSize(line.trim(), printableWidth);
        const lineHeight = 16;
        
        wrapped.forEach(l => {
          checkPageBreak(lineHeight);
          pdf.text(l, margin, currentY);
          currentY += lineHeight;
        });
      }
      
      const ts = getTimestampString();
      const fileName = `md2pdf_text_${ts}.pdf`;
      
      if (action === 'download') {
        pdf.save(fileName);
        showToast('✅ 文字版 PDF 已成功儲存至本地！', 'success');
      } else if (action === 'share') {
        const pdfBlob = pdf.output('blob');
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
        
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            files: [pdfFile],
            title: '分享文字版 PDF 文件',
            text: '這是從 Markdown 編輯器產生的文字版 PDF 文件（可複製內文）。'
          });
          showToast('✅ 分享視窗已開啟！', 'success');
        } else {
          pdf.save(fileName);
          showToast('⚠️ 本裝置不支援直接分享 PDF，已自動為您下載！', 'warning');
        }
      }
    } catch (err) {
      console.error('Text PDF generation failed:', err);
      showToast('❌ 產生文字 PDF 失敗，請重試！', 'error');
    }
  };

  const escapeHtml = (text) => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const generateExportHTML = () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(readingHtml, 'text/html');
    const docHeadings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const exportedHeadings = [];
    
    docHeadings.forEach((heading, index) => {
      const id = `h-${index}`;
      heading.setAttribute('id', id);
      exportedHeadings.push({
        id,
        level: parseInt(heading.tagName.substring(1)),
        text: heading.textContent || ''
      });
    });
    
    const articleContentHtml = doc.body.innerHTML;
    return { articleContentHtml, exportedHeadings };
  };

  const handleExportHTML = async (action) => {
    showToast('⏳ 正在產生 HTML 文件，請稍候...', 'info');
    try {
      const { articleContentHtml, exportedHeadings } = generateExportHTML();
      const hasMermaidInExport = markdown.includes('```mermaid');
      
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

      const lines = markdown.split(/\r?\n/);
      let titleHeader = '';
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#')) {
          const match = line.match(/^#+\s+(.+)$/);
          if (match) {
            titleHeader = match[1].trim();
            break;
          }
        }
      }

      let fileName = '';
      if (titleHeader) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}${mm}${dd}`;

        const sanitizedTitle = titleHeader.replace(/[\\/:*?"<>|#]/g, '_');
        fileName = `md2html_${sanitizedTitle}_${dateStr}.html`;
      } else {
        const ts = getTimestampString();
        fileName = `md2html_${ts}.html`;
      }

      const title = titleHeader || (exportedHeadings.length > 0 ? exportedHeadings[0].text : 'Markdown 匯出文件');
      
      // Always start with sidebar-expanded for desktop; JS will collapse on mobile at runtime
      const bodyClass = exportedHeadings.length === 0 ? 'no-sidebar' : 'sidebar-expanded';

      const fullHtml = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+TC:wght@300;400;500;700;900&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <!-- Highlight.js for code blocks syntax highlighting -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  
  <style>
    /* Styling variables and aesthetics */
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
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    html {
      scroll-behavior: smooth;
      scroll-padding-top: 80px;
    }
    
    body {
      background-color: var(--bg-body);
      color: var(--text-main);
      font-family: var(--font-body);
      font-size: var(--font-size-base);
      line-height: 1.8;
      transition: background-color 0.3s, color 0.3s;
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
    
    body.sidebar-expanded .sidebar {
      transform: translateX(0);
    }
    
    .sidebar-toggle-btn {
      position: absolute;
      top: 1.5rem;
      right: -16px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: var(--bg-panel);
      border: 1px solid var(--border);
      color: var(--text-main);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: var(--shadow);
      z-index: 11;
      transition: background-color 0.2s, color 0.2s, right 0.3s;
    }
    
    body:not(.sidebar-expanded) .sidebar-toggle-btn {
      right: -24px;
    }
    
    .sidebar-toggle-btn:hover {
      background-color: var(--bg-card);
      color: var(--accent);
    }
    
    #toggle-arrow {
      transition: transform 0.3s;
    }
    
    body:not(.sidebar-expanded) #toggle-arrow {
      transform: rotate(180deg);
    }
    
    .toc {
      flex: 1;
      overflow-y: auto;
      padding-right: 0.5rem;
      position: relative;
    }
    
    .toc-link {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.6rem 0.8rem;
      margin: 0.25rem 0;
      color: var(--text-muted);
      text-decoration: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.4;
      transition: all 0.2s;
    }
    
    .toc-link:hover {
      color: var(--text-main);
      background-color: var(--toc-hover);
    }
    
    .toc-link.active {
      color: var(--accent);
      background-color: var(--accent-light);
      font-weight: 700;
    }
    
    .toc-bullet {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: var(--border);
      margin-top: 0.5rem;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    
    .toc-link.active .toc-bullet {
      background-color: var(--accent);
      box-shadow: 0 0 8px var(--accent);
      transform: scale(1.3);
    }
    
    .toc-link.l1 {
      font-weight: 600;
    }
    .toc-link.l2 {
      padding-left: 1.75rem;
      font-size: 0.8rem;
    }
    .toc-link.l3 {
      padding-left: 2.75rem;
      font-size: 0.75rem;
    }
    
    .toc-empty {
      font-size: 0.875rem;
      color: var(--text-muted);
      text-align: center;
      margin-top: 3rem;
      font-style: italic;
    }
    
    .main-content {
      flex: 1;
      margin-left: 0;
      padding: 3rem 4rem 6rem;
      min-width: 0;
      transition: margin-left 0.3s;
    }
    
    body.sidebar-expanded .main-content {
      margin-left: 300px;
    }
    
    .markdown-body {
      max-width: 800px;
      margin: 0 auto;
    }
    
    .markdown-body h1 {
      font-family: var(--font-heading);
      font-size: 2.5rem;
      font-weight: 800;
      line-height: 1.3;
      margin-top: 0;
      margin-bottom: 1.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 2px solid var(--border);
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .markdown-body h2 {
      font-family: var(--font-heading);
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.4;
      margin-top: 2.5rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }
    
    .markdown-body h3 {
      font-family: var(--font-heading);
      font-size: 1.35rem;
      font-weight: 600;
      line-height: 1.4;
      margin-top: 2rem;
      margin-bottom: 1rem;
    }
    
    .markdown-body p {
      margin-bottom: 1.25rem;
    }
    
    .markdown-body a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
      border-bottom: 1px dashed var(--accent);
      transition: all 0.2s;
    }
    
    .markdown-body a:hover {
      color: var(--accent);
      border-bottom-style: solid;
      background-color: var(--accent-light);
    }
    
    .markdown-body ul, .markdown-body ol {
      padding-left: 1.5rem;
      margin-bottom: 1.5rem;
    }
    
    .markdown-body li {
      margin-bottom: 0.5rem;
    }
    
    .markdown-body blockquote {
      border-left: 4px solid var(--accent);
      padding: 0.75rem 1.25rem;
      background-color: var(--bg-card);
      border-radius: 0 12px 12px 0;
      margin: 1.5rem 0;
      color: var(--text-muted);
      font-style: italic;
    }
    
    .markdown-body code {
      font-family: var(--font-mono);
      background-color: var(--bg-card);
      padding: 0.2rem 0.4rem;
      border-radius: 6px;
      font-size: 0.85em;
    }
    
    .markdown-body pre {
      margin: 1.5rem 0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
    }
    
    .markdown-body pre code {
      font-family: var(--font-mono);
      font-size: 0.9em;
      padding: 1.25rem;
      background-color: #0f172a;
      color: #f8fafc;
      border-radius: 0;
      display: block;
      overflow-x: auto;
    }
    
    .mermaid-wrapper {
      background-color: ${getMermaidBgColor()};
      border: 1px solid ${mermaidBg === 'transparent' ? 'transparent' : 'var(--border)'};
      border-radius: 12px;
      padding: 1.5rem;
      margin: 1.5rem 0;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: background-color 0.3s;
      overflow-x: auto;
      min-width: 100%;
    }
    
    .markdown-body pre.mermaid {
      background-color: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 !important;
      width: 100%;
      display: flex;
      justify-content: center;
    }
    
    .markdown-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 2rem 0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
    }
    
    .markdown-body th, .markdown-body td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    
    .markdown-body th {
      background-color: var(--bg-card);
      font-weight: 600;
      font-family: var(--font-heading);
    }
    
    .markdown-body tr:last-child td {
      border-bottom: none;
    }
    
    .markdown-body tr:nth-child(even) {
      background-color: rgba(0, 0, 0, 0.02);
    }
    
    [data-theme="dark"] .markdown-body tr:nth-child(even) {
      background-color: rgba(255, 255, 255, 0.02);
    }
    
    .markdown-body hr {
      border: 0;
      height: 1px;
      background-color: var(--border);
      margin: 2.5rem 0;
    }
    
    .controls-panel {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      display: flex;
      gap: 0.5rem;
      z-index: 50;
      align-items: center;
    }
    
    .control-btn {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background-color: var(--bg-panel);
      border: 1px solid var(--border);
      color: var(--text-main);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: var(--shadow);
      transition: all 0.2s;
    }
    
    .control-btn:hover {
      background-color: var(--bg-card);
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }
    
    .theme-icon-sun { display: none; }
    .theme-icon-moon { display: block; }
    [data-theme="dark"] .theme-icon-sun { display: block; }
    [data-theme="dark"] .theme-icon-moon { display: none; }

    .font-ctrl-btn {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background-color: var(--bg-panel);
      border: 1px solid var(--border);
      color: var(--text-main);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: var(--shadow);
      transition: all 0.2s;
      font-weight: 800;
      font-family: var(--font-body);
      user-select: none;
    }
    .font-ctrl-btn:hover {
      background-color: var(--bg-card);
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }
    .font-ctrl-btn.font-inc { font-size: 1rem; }
    .font-ctrl-btn.font-dec { font-size: 0.75rem; }

    /* Mobile inline controls (inside mobile-header) */
    .mobile-controls {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      flex-shrink: 0;
    }
    .mobile-ctrl-btn {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-main);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-weight: 800;
      font-family: var(--font-body);
      transition: background-color 0.2s;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    .mobile-ctrl-btn:active {
      background-color: var(--bg-card);
    }
    .mobile-ctrl-btn.font-inc { font-size: 0.85rem; }
    .mobile-ctrl-btn.font-dec { font-size: 0.68rem; }
    .mobile-ctrl-btn .theme-icon-sun { display: none; }
    .mobile-ctrl-btn .theme-icon-moon { display: block; }
    [data-theme="dark"] .mobile-ctrl-btn .theme-icon-sun { display: block; }
    [data-theme="dark"] .mobile-ctrl-btn .theme-icon-moon { display: none; }
    
    .mobile-header {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      background-color: var(--bg-panel);
      border-bottom: 1px solid var(--border);
      align-items: center;
      justify-content: space-between;
      padding: 0 1rem;
      z-index: 40;
      box-shadow: var(--shadow);
    }
    
    .mobile-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .mobile-logo {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: var(--accent-gradient);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .mobile-title {
      font-family: var(--font-heading);
      font-size: 0.95rem;
      font-weight: 800;
    }
    
    .mobile-active-section {
      font-size: 0.75rem;
      color: var(--accent);
      font-weight: 600;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 0 0.5rem;
    }
    
    .menu-toggle-btn {
      background: transparent;
      border: none;
      color: var(--text-main);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
    }
    
    .sidebar-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      z-index: 9;
    }
    
    .toc::-webkit-scrollbar {
      width: 4px;
    }
    .toc::-webkit-scrollbar-track {
      background: transparent;
    }
    .toc::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 2px;
    }
    
    body.no-sidebar .sidebar {
      display: none;
    }
    body.no-sidebar .main-content {
      margin-left: 0;
      padding: 3rem 2rem 6rem;
    }
    body.no-sidebar .mobile-header {
      display: none;
    }

    
    @media (max-width: 1024px) {
      body:not(.no-sidebar) .sidebar {
        transform: translateX(-100%);
        box-shadow: var(--shadow-lg);
        height: 100%;
        padding-top: 80px;
      }
      
      body:not(.no-sidebar).sidebar-expanded .sidebar {
        transform: translateX(0);
      }
      
      body:not(.no-sidebar).sidebar-expanded .sidebar-overlay {
        display: block;
      }
      
      body:not(.no-sidebar) .main-content {
        margin-left: 0 !important;
        padding: 6rem 1.5rem 4rem;
      }
      
      body:not(.no-sidebar) .mobile-header {
        display: flex;
      }

      /* Hide desktop controls-panel on mobile; controls live in mobile-header instead */
      .controls-panel {
        display: none;
      }

      /* Center sidebar-toggle-btn vertically so it clears the mobile header */
      .sidebar-toggle-btn {
        top: 50%;
        transform: translateY(-50%);
      }
      body:not(.sidebar-expanded) .sidebar-toggle-btn {
        transform: translateY(-50%) rotate(0deg);
      }
    }

    /* Code block copy buttons styling */
    .code-block-wrapper {
      position: relative;
      margin: 1.5rem 0;
    }
    
    .markdown-body .code-block-wrapper pre {
      margin: 0;
    }
    
    .copy-code-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background-color: rgba(30, 41, 59, 0.7);
      color: #94a3b8;
      border: 1px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s, background-color 0.2s, color 0.2s, transform 0.1s;
      z-index: 10;
    }
    
    .copy-code-btn:hover {
      background-color: rgba(30, 41, 59, 0.95);
      color: #f8fafc;
      border-color: rgba(255, 255, 255, 0.2);
    }
    
    .copy-code-btn:active {
      transform: scale(0.95);
    }
    
    .code-block-wrapper:hover .copy-code-btn {
      opacity: 1;
    }
    
    @media (max-width: 1024px) {
      .copy-code-btn {
        opacity: 0.85;
      }
    }
    
    .copy-code-btn.copied {
      background-color: #10b981 !important;
      color: #ffffff !important;
      border-color: #10b981 !important;
    }
    
    .copy-code-btn .check-icon {
      display: none;
    }
    
    .copy-code-btn.copied .copy-icon {
      display: none;
    }
    
    .copy-code-btn.copied .check-icon {
      display: block;
    }
  </style>
</head>
<body class="${bodyClass}" data-theme="light">
  
  <header class="mobile-header">
    <div class="mobile-brand">
      <button id="menu-toggle" class="menu-toggle-btn" aria-label="Toggle navigation">
        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div class="mobile-logo">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </div>
      <div>
        <h1 class="mobile-title">文件大綱</h1>
      </div>
    </div>
    <div id="mobile-current-title" class="mobile-active-section"></div>
    <div class="mobile-controls">
      <button id="mobile-font-decrease" class="mobile-ctrl-btn font-dec" title="縮小字體">A-</button>
      <button id="mobile-font-increase" class="mobile-ctrl-btn font-inc" title="放大字體">A+</button>
      <button id="mobile-theme-toggle" class="mobile-ctrl-btn" title="切換主題">
        <svg class="theme-icon-sun" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <svg class="theme-icon-moon" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>
    </div>
  </header>

  <div id="sidebar-overlay" class="sidebar-overlay"></div>

  <div class="app-container">
    <aside id="sidebar" class="sidebar">
      <nav class="toc">
        ${tocHtml}
      </nav>
      <button id="sidebar-toggle-btn" class="sidebar-toggle-btn" aria-label="Toggle Sidebar" title="切換大綱 (展開/折疊)">
        <svg id="toggle-arrow" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </aside>

    <main class="main-content">
      <article class="markdown-body">
        ${articleContentHtml}
      </article>
    </main>
  </div>

  <div class="controls-panel">
    <button id="font-decrease" class="font-ctrl-btn font-dec" title="縮小字體">A-</button>
    <button id="font-increase" class="font-ctrl-btn font-inc" title="放大字體">A+</button>
    <button id="theme-toggle" class="control-btn" title="切換主題 (深色/淺色)">
      <svg class="theme-icon-sun" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <svg class="theme-icon-moon" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    </button>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script>
    hljs.highlightAll();

    // --- Copy Code Blocks ---
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.copy-code-btn');
      if (btn) {
        e.stopPropagation();
        e.preventDefault();
        var wrapper = btn.closest('.code-block-wrapper');
        var pre = wrapper ? wrapper.querySelector('pre') : null;
        if (pre) {
          var text = pre.textContent || '';
          navigator.clipboard.writeText(text).then(function() {
            btn.classList.add('copied');
            setTimeout(function() {
              btn.classList.remove('copied');
            }, 2000);
          }).catch(function(err) {
            console.error('Failed to copy code:', err);
          });
        }
      }
    });

    // --- Theme ---
    function applyTheme(theme) {
      document.body.setAttribute('data-theme', theme);
      localStorage.setItem('exported-theme', theme);
    }
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    applyTheme(localStorage.getItem('exported-theme') || (systemPrefersDark.matches ? 'dark' : 'light'));

    function onToggleTheme() {
      applyTheme(document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    }
    const themeToggle = document.getElementById('theme-toggle');
    const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
    if (themeToggle) themeToggle.addEventListener('click', onToggleTheme);
    if (mobileThemeToggle) mobileThemeToggle.addEventListener('click', onToggleTheme);

    // --- Font Size ---
    let currentFontSize = parseInt(localStorage.getItem('exported-font-size') || '16');
    function applyFontSize(size) {
      currentFontSize = Math.min(24, Math.max(12, size));
      document.documentElement.style.setProperty('--font-size-base', currentFontSize + 'px');
      localStorage.setItem('exported-font-size', String(currentFontSize));
    }
    applyFontSize(currentFontSize);

    const fontIncrease = document.getElementById('font-increase');
    const fontDecrease = document.getElementById('font-decrease');
    const mobileFontIncrease = document.getElementById('mobile-font-increase');
    const mobileFontDecrease = document.getElementById('mobile-font-decrease');
    if (fontIncrease) fontIncrease.addEventListener('click', () => applyFontSize(currentFontSize + 1));
    if (fontDecrease) fontDecrease.addEventListener('click', () => applyFontSize(currentFontSize - 1));
    if (mobileFontIncrease) mobileFontIncrease.addEventListener('click', () => applyFontSize(currentFontSize + 1));
    if (mobileFontDecrease) mobileFontDecrease.addEventListener('click', () => applyFontSize(currentFontSize - 1));

    const menuToggle = document.getElementById('menu-toggle');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    function isMobile() {
      return window.innerWidth <= 1024;
    }

    function updateSidebarState(expanded) {
      if (expanded) {
        document.body.classList.add('sidebar-expanded');
        localStorage.setItem('exported-sidebar-state', 'expanded');
      } else {
        document.body.classList.remove('sidebar-expanded');
        localStorage.setItem('exported-sidebar-state', 'collapsed');
      }
    }

    // On first load: collapse on mobile, keep expanded on desktop
    // Check localStorage for user preference, fall back to screen-based default
    const storedSidebar = localStorage.getItem('exported-sidebar-state');
    if (storedSidebar === 'expanded') {
      updateSidebarState(true);
    } else if (storedSidebar === 'collapsed') {
      updateSidebarState(false);
    } else {
      // No stored preference: desktop=expanded, mobile=collapsed
      updateSidebarState(!isMobile());
    }

    function toggleSidebar() {
      const isCurrentlyExpanded = document.body.classList.contains('sidebar-expanded');
      updateSidebarState(!isCurrentlyExpanded);
    }

    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');

    if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', toggleSidebar);
    if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    const tocLinks = document.querySelectorAll('.toc-link');
    tocLinks.forEach(link => {
      link.addEventListener('click', () => {
        // Auto-collapse sidebar after navigation on mobile
        if (isMobile()) {
          updateSidebarState(false);
        }
      });
    });

    const headings = document.querySelectorAll('.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6');
    const mobileTitleEl = document.getElementById('mobile-current-title');

    function updateActiveHeading() {
      let activeId = null;
      const scrollPosition = window.scrollY + 120;
      
      headings.forEach((heading) => {
        if (heading.offsetTop <= scrollPosition) {
          activeId = heading.getAttribute('id');
        }
      });

      if (!activeId && headings.length > 0) {
        activeId = headings[0].getAttribute('id');
      }

      tocLinks.forEach((link) => {
        const linkId = link.getAttribute('data-id');
        if (linkId === activeId) {
          link.classList.add('active');
          if (mobileTitleEl) {
            mobileTitleEl.textContent = link.querySelector('.toc-text').textContent;
          }
          const tocContainer = document.querySelector('.toc');
          if (tocContainer) {
            const linkTop = link.offsetTop;
            const containerScrollTop = tocContainer.scrollTop;
            const containerHeight = tocContainer.clientHeight;
            if (linkTop < containerScrollTop || linkTop > (containerScrollTop + containerHeight - 50)) {
              tocContainer.scrollTo({
                top: linkTop - containerHeight / 2,
                behavior: 'smooth'
              });
            }
          }
        } else {
          link.classList.remove('active');
        }
      });
    }

    let scrollTimeout;
    window.addEventListener('scroll', () => {
      if (!scrollTimeout) {
        scrollTimeout = requestAnimationFrame(() => {
          updateActiveHeading();
          scrollTimeout = null;
        });
      }
    });

    updateActiveHeading();
  </script>
  ${hasMermaidInExport ? `
  <!-- Mermaid -->
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
    const mermaidBg = "${mermaidBg}";
    const getMermaidTheme = (theme) => {
      if (mermaidBg === 'dark') return 'dark';
      if (mermaidBg === 'light' || mermaidBg === 'white') return 'default';
      return theme === 'dark' ? 'dark' : 'default';
    };

    mermaid.initialize({
      startOnLoad: true,
      theme: getMermaidTheme(document.body.getAttribute('data-theme')),
      securityLevel: 'loose'
    });
    
    // Observer to update theme dynamically
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          const currentTheme = document.body.getAttribute('data-theme');
          mermaid.initialize({
            theme: getMermaidTheme(currentTheme)
          });
          
          const wrappers = document.querySelectorAll('.mermaid-wrapper');
          wrappers.forEach(el => {
            const encoded = el.getAttribute('data-mermaid-code') || '';
            let rawCode = '';
            try {
              rawCode = decodeURIComponent(escape(window.atob(encoded)));
            } catch (e) {
              rawCode = '';
            }
            el.innerHTML = '<pre class="mermaid">' + rawCode + '</pre>';
          });
          mermaid.run({ querySelector: 'pre.mermaid, div.mermaid' });
        }
      });
    });
    observer.observe(document.body, { attributes: true });
  </script>
  ` : ''}
</body>
</html>`;
      
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });

      // On desktop (non-touch), skip the filename modal — the OS save dialog lets users rename
      // On mobile/touch devices, show the modal so users can confirm/edit the filename first
      const isTouchDevice = navigator.maxTouchPoints > 0;
      if (!isTouchDevice && action === 'download') {
        // Desktop: direct download with pre-computed filename
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
        showToast('✅ HTML 已成功儲存至本地！', 'success');
        return;
      }

      setExportHTMLBlob(blob);
      setExportHTMLTitle(title);
      setTempExportFilename(fileName);
      setPendingHtmlAction(action);
      setShowFilenameModal(true);
    } catch (err) {
      console.error('HTML generation failed:', err);
      showToast('❌ 產生 HTML 失敗，請重試！', 'error');
    }
  };

  const proceedExportHTML = async () => {
    if (!exportHTMLBlob || !pendingHtmlAction) return;
    
    let fileName = tempExportFilename.trim();
    if (!fileName) {
      fileName = 'export.html';
    }
    if (!fileName.toLowerCase().endsWith('.html')) {
      fileName += '.html';
    }

    setShowFilenameModal(false);
    
    try {
      if (pendingHtmlAction === 'download') {
        const url = URL.createObjectURL(exportHTMLBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
        showToast('✅ HTML 已成功儲存至本地！', 'success');
      } else if (pendingHtmlAction === 'share') {
        const file = new File([exportHTMLBlob], fileName, { type: 'text/html' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: exportHTMLTitle,
              text: '這是從 Markdown 編輯器產生的美化網頁文檔。'
            });
            showToast('✅ 分享視窗已開啟！', 'success');
          } catch (shareErr) {
            if (shareErr.name === 'AbortError') {
              return;
            }
            const url = URL.createObjectURL(exportHTMLBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(url);
            showToast('⚠️ 分享失敗，已自動為您下載 HTML 文件！', 'warning');
          }
        } else {
          const url = URL.createObjectURL(exportHTMLBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.click();
          URL.revokeObjectURL(url);
          showToast('⚠️ 本裝置不支援直接分享 HTML，已自動為您下載！', 'warning');
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('HTML action failed:', err);
        showToast('❌ 處理 HTML 失敗，請重試！', 'error');
      }
    } finally {
      setPendingHtmlAction(null);
      setExportHTMLBlob(null);
    }
  };

  const getTimestampString = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0').slice(0, 2);
    const ssss = secs + ms;
    return `${yyyy}${mm}${dd}${ssss}`;
  };

  const handleGenerateSlices = async () => {
    setIsGenerating(true);
    setSlices([]);
    setSelectedSlices({});
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      const element = document.getElementById('export-capture-area');
      if (!element) return;

      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: 2, // 2x high-resolution rendering
        backgroundColor: exportTheme === 'light' ? '#ffffff' : '#090d16',
        logging: false
      });

      const mainWidth = canvas.width;
      const mainHeight = canvas.height;
      const generated = [];
      const ts = getTimestampString();
      const prefix = `md2pic_${ts}`;

      if (sliceMode === 'full') {
        const url = canvas.toDataURL('image/png');
        generated.push({
          name: `${prefix}.png`,
          url,
          width: mainWidth / 2,
          height: mainHeight / 2
        });
      } else if (sliceMode === 'parts') {
        const parts = Math.max(1, parseInt(numParts) || 1);
        const sliceHeight = Math.ceil(mainHeight / parts);
        for (let i = 0; i < parts; i++) {
          const startY = i * sliceHeight;
          const currentHeight = Math.min(sliceHeight, mainHeight - startY);
          
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = mainWidth;
          sliceCanvas.height = currentHeight;
          
          const ctx = sliceCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, startY, mainWidth, currentHeight, 0, 0, mainWidth, currentHeight);
          
          const url = sliceCanvas.toDataURL('image/png');
          generated.push({
            name: `${prefix}_${i + 1}.png`,
            url,
            width: mainWidth / 2,
            height: currentHeight / 2
          });
        }
      } else if (sliceMode === 'height') {
        const targetHeight = Math.max(100, parseInt(fixedHeight) || 800);
        const scaledHeight = targetHeight * 2;
        
        let currentY = 0;
        let index = 1;
        while (currentY < mainHeight) {
          const currentHeight = Math.min(scaledHeight, mainHeight - currentY);
          
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = mainWidth;
          sliceCanvas.height = currentHeight;
          
          const ctx = sliceCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, currentY, mainWidth, currentHeight, 0, 0, mainWidth, currentHeight);
          
          const url = sliceCanvas.toDataURL('image/png');
          generated.push({
            name: `${prefix}_${index}.png`,
            url,
            width: mainWidth / 2,
            height: currentHeight / 2
          });
          
          currentY += scaledHeight;
          index++;
        }
      }
      setSlices(generated);
      
      // Auto-select all slices by default
      const initialSelected = {};
      generated.forEach((_, idx) => {
        initialSelected[idx] = true;
      });
      setSelectedSlices(initialSelected);
      showToast('✨ 圖片切片生成成功！', 'success');
    } catch (err) {
      console.error('Image Slicing Error: ', err);
      showToast('生成圖片切片失敗。', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy PNG Blob to Clipboard (highly compatible workaround for LINE/PC sharing)
  const handleCopySliceImage = async (slice) => {
    try {
      const response = await fetch(slice.url);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      showToast('📋 圖片已複製到剪貼簿！您現在可以在 LINE、Discord 中直接按 Ctrl+V (或貼上) 傳送圖片。', 'success');
    } catch (err) {
      console.error('Failed to copy slice: ', err);
      showToast('此瀏覽器不支援複製圖片，請使用下載按鈕存檔。', 'error');
    }
  };

  const handleDownloadZip = async () => {
    const selectedList = slices.filter((_, idx) => selectedSlices[idx]);
    if (selectedList.length === 0) {
      showToast('請先選擇至少一張圖片！', 'info');
      return;
    }
    
    setZipProgress('正在封裝壓縮檔...');
    try {
      const zip = new JSZip();
      selectedList.forEach((slice) => {
        const base64Data = slice.url.split(',')[1];
        zip.file(slice.name, base64Data, { base64: true });
      });

      const blobContent = await zip.generateAsync({ type: 'blob' });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(blobContent);
      downloadLink.download = `md2pic_zip_${getTimestampString()}.zip`;
      downloadLink.click();
      showToast('📦 ZIP 壓縮檔下載完成！', 'success');
    } catch (err) {
      console.error('Failed to create ZIP: ', err);
      showToast('下載 ZIP 壓縮檔失敗。', 'error');
    } finally {
      setZipProgress(null);
    }
  };

  // Web Share API to send SELECTED sliced files. Offers copy-to-clipboard fallback on cancel/error.
  const handleShare = async () => {
    const selectedList = slices.filter((_, idx) => selectedSlices[idx]);
    if (selectedList.length === 0) {
      showToast('請先選擇至少一張圖片！', 'info');
      return;
    }
    
    setShareStatus('sharing');
    try {
      const filesArray = [];
      for (const slice of selectedList) {
        const response = await fetch(slice.url);
        const blob = await response.blob();
        const file = new File([blob], slice.name, { type: 'image/png' });
        filesArray.push(file);
      }

      if (navigator.canShare && navigator.canShare({ files: filesArray })) {
        await navigator.share({
          files: filesArray,
          title: 'Markdown 切片圖片匯出',
          text: '使用「萬能 Markdown 編輯轉換器」匯出的切割圖片。'
        });
        setShareStatus('success');
        showToast('分享呼叫成功！若 LINE 傳送失敗，請使用「複製」功能貼上傳送。', 'success');
        setTimeout(() => setShareStatus(null), 2000);
      } else {
        // Fallback for PCs or unsupported mobile sharing: copy the first selected image
        setShareStatus('unsupported');
        showToast('系統/軟體不支援多圖直接分享。已為您將第一張選取的圖片複製到剪貼簿，請貼上傳送！', 'info');
        if (selectedList.length > 0) {
          await handleCopySliceImage(selectedList[0]);
        }
        setTimeout(() => setShareStatus(null), 4000);
      }
    } catch (err) {
      console.error('Web Share failed: ', err);
      if (err.name !== 'AbortError') {
        setShareStatus('error');
        showToast('分享失敗。已自動將首張選取圖片複製到剪貼簿！', 'info');
        if (selectedList.length > 0) {
          await handleCopySliceImage(selectedList[0]);
        }
        setTimeout(() => setShareStatus(null), 3000);
      } else {
        setShareStatus(null);
      }
    }
  };

  // Web Share API to share a single slice
  const handleShareSingle = async (slice) => {
    try {
      const response = await fetch(slice.url);
      const blob = await response.blob();
      const file = new File([blob], slice.name, { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: '分享單張圖片',
          text: `分享切片圖片：${slice.name}`
        });
        showToast('分享呼叫成功！', 'success');
      } else {
        // Fallback to copy image to clipboard
        await handleCopySliceImage(slice);
      }
    } catch (err) {
      console.error('Share single failed: ', err);
      if (err.name !== 'AbortError') {
        await handleCopySliceImage(slice);
      }
    }
  };

  // Toggle selection state for a slice
  const toggleSelectSlice = (idx) => {
    setSelectedSlices(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Render Toast Notifications
  const renderToast = () => {
    if (!toast.show) return null;
    
    const colors = {
      success: 'border-emerald-500/30 bg-emerald-50/90 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300',
      error: 'border-rose-500/30 bg-rose-50/90 dark:bg-rose-950/90 text-rose-800 dark:text-rose-300',
      info: 'border-indigo-500/30 bg-indigo-50/90 dark:bg-indigo-950/90 text-indigo-800 dark:text-indigo-300',
    };
    
    return (
      <div className={`fixed bottom-6 right-6 z-[100] max-w-sm p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 ${colors[toast.type] || colors.info}`}>
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            {toast.type === 'success' && (
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="flex-1 text-xs font-bold leading-relaxed">
            {toast.message}
          </div>
        </div>
      </div>
    );
  };

  // Helper variables for checkbox selection state
  const selectedCount = Object.values(selectedSlices).filter(Boolean).length;
  const allSelected = slices.length > 0 && Object.values(selectedSlices).every(Boolean);
  
  const handleToggleSelectAll = () => {
    const nextVal = !allSelected;
    const newSelected = {};
    slices.forEach((_, idx) => {
      newSelected[idx] = nextVal;
    });
    setSelectedSlices(newSelected);
  };

  const handleScrollToHeading = (index) => {
    const activeRefs = [readingViewRef, leftReadingViewRef, rightReadingViewRef];
    activeRefs.forEach(ref => {
      if (ref.current) {
        const headings = ref.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings[index]) {
          headings[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          headings[index].classList.add('animate-change-highlight');
          setTimeout(() => {
            headings[index].classList.remove('animate-change-highlight');
          }, 2000);
        }
      }
    });
  };

  const renderReadingHeaderControls = (paneType) => {
    if (paneType !== 'reading') return null;
    const headings = parseHeadings(markdown);

    return (
      <div className="flex items-center gap-1.5 shrink-0 select-none">
        {headings.length > 0 && (
          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val !== "") {
                handleScrollToHeading(parseInt(val));
                e.target.value = "";
              }
            }}
            defaultValue=""
            className="px-2 py-1.5 rounded-lg text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500/20 text-slate-700 dark:text-slate-200 max-w-[130px] sm:max-w-[160px] truncate"
          >
            <option value="" disabled>-- 快速跳至段落 --</option>
            {headings.map((h, idx) => (
              <option key={idx} value={idx}>
                {"\u00a0".repeat((h.level - 1) * 2)}
                {h.level === 1 ? '📌 ' : h.level === 2 ? '🔹 ' : '▪️ '}
                {h.text}
              </option>
            ))}
          </select>
        )}

        {/* Mermaid Background Customizer */}
        {markdown.includes('```mermaid') && (
          <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 gap-1 select-none text-[10px] font-bold text-slate-500 dark:text-slate-400">
            <span className="pl-1.5 pr-0.5 text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">Mermaid 底圖:</span>
            <select
              value={mermaidBg}
              onChange={(e) => setMermaidBg(e.target.value)}
              className="bg-transparent border-0 py-0.5 pl-0.5 pr-4 text-[10px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-0 cursor-pointer select-none"
            >
              <option value="dark" className="bg-white dark:bg-slate-900">深色</option>
              <option value="light" className="bg-white dark:bg-slate-900">淺色</option>
              <option value="white" className="bg-white dark:bg-slate-900">純白</option>
              <option value="transparent" className="bg-white dark:bg-slate-900">透明</option>
            </select>
          </div>
        )}



        {/* Mobile PDF Dropdown Button */}
        <div className="relative flex sm:hidden pdf-dropdown-container">
          <button
            onClick={() => setActivePdfDropdown(activePdfDropdown === 'mobile-pdf' ? null : 'mobile-pdf')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-white dark:hover:bg-slate-800 border border-indigo-200/30 dark:border-indigo-900/30 rounded-lg shadow-sm transition-all active:scale-95"
            title="文件匯出與分享 (PDF/HTML)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span>匯出/分享</span>
            <svg className="w-2.5 h-2.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {activePdfDropdown === 'mobile-pdf' && (
            <div className="absolute right-0 mt-8 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl z-40 p-1 flex flex-col gap-0.5 animate-fade-in">
              <button
                onClick={() => {
                  handleExportPDF('download');
                  setActivePdfDropdown(null);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all"
              >
                <span className="text-base">🖼️</span>
                <div>
                  <div className="font-bold text-xs">下載圖片 PDF</div>
                  <div className="text-[10px] text-slate-400 font-normal">保留完整排版樣式</div>
                </div>
              </button>
              <button
                onClick={() => {
                  handleExportPDF('share');
                  setActivePdfDropdown(null);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all"
              >
                <span className="text-base">📤</span>
                <div>
                  <div className="font-bold text-xs">分享圖片 PDF</div>
                  <div className="text-[10px] text-slate-400 font-normal">傳送圖片版 PDF</div>
                </div>
              </button>
              <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />
              <button
                onClick={() => {
                  handleExportTextPDF('download');
                  setActivePdfDropdown(null);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all"
              >
                <span className="text-base">📝</span>
                <div>
                  <div className="font-bold text-xs">下載文字 PDF</div>
                  <div className="text-[10px] text-slate-400 font-normal">可搜尋、複製內文</div>
                </div>
              </button>
              <button
                onClick={() => {
                  handleExportTextPDF('share');
                  setActivePdfDropdown(null);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all"
              >
                <span className="text-base">📤</span>
                <div>
                  <div className="font-bold text-xs">分享文字 PDF</div>
                  <div className="text-[10px] text-slate-400 font-normal">傳送文字版 PDF</div>
                </div>
              </button>
              <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />
              <button
                onClick={() => {
                  handleExportHTML('download');
                  setActivePdfDropdown(null);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all"
              >
                <span className="text-base">🌐</span>
                <div>
                  <div className="font-bold text-xs">下載美化 HTML</div>
                  <div className="text-[10px] text-slate-400 font-normal">快速跳轉大綱與雙欄排版</div>
                </div>
              </button>
              <button
                onClick={() => {
                  handleExportHTML('share');
                  setActivePdfDropdown(null);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all"
              >
                <span className="text-base">📤</span>
                <div>
                  <div className="font-bold text-xs">分享美化 HTML</div>
                  <div className="text-[10px] text-slate-400 font-normal">傳送雙欄大綱 HTML</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Font Size Adjuster - only visible on mobile (sm:hidden) and single layout */}
        {layout === 'single' && (
          <div className="flex sm:hidden items-center rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200/50 dark:border-slate-800/50 gap-0.5 ml-1 select-none">
            <button
              onClick={() => setPreviewFontSize(prev => Math.max(12, prev - 1))}
              className="px-2 py-1 text-[10px] font-extrabold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded transition-all active:scale-95"
              title="縮小字體"
            >
              A-
            </button>
            <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-800" />
            <button
              onClick={() => setPreviewFontSize(prev => Math.min(24, prev + 1))}
              className="px-2 py-1 text-[10px] font-extrabold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded transition-all active:scale-95"
              title="放大字體"
            >
              A+
            </button>
          </div>
        )}
      </div>
    );
  };

  // --- Sub-renderer: Layout View Render Mode ---
  function renderWorkspaceContent(paneType, side) {
    const elementRef = side === 'left' ? leftPaneElementRef : (side === 'right' ? rightPaneElementRef : singlePaneElementRef);

    if (paneType === 'markdown') {
      const handleMarkdownPaste = () => {
        if (autoJump && layout === 'single') {
          setTimeout(() => {
            setSinglePane('reading');
          }, 120);
        }
      };

      return (
        <textarea
          ref={elementRef}
          value={markdown}
          onChange={(e) => handleMarkdownChange(e.target.value, side, e.nativeEvent)}
          onPaste={handleMarkdownPaste}
          onScroll={handleScroll}
          onClick={handleContentClick}
          placeholder="在此處輸入或貼上您的 Markdown 內容..."
          className="w-full h-full p-4 md:p-6 font-mono text-sm leading-relaxed bg-transparent border-0 resize-none focus:outline-none focus:ring-0 text-slate-800 dark:text-slate-200 overflow-y-auto animate-fade-in"
        />
      );
    } else if (paneType === 'html') {
      return (
        <textarea
          ref={elementRef}
          value={html}
          onChange={(e) => handleHtmlChange(e.target.value, side)}
          onScroll={handleScroll}
          onClick={handleContentClick}
          placeholder="在此處輸入或貼上您的 HTML 原始碼..."
          className="w-full h-full p-4 md:p-6 font-mono text-sm leading-relaxed bg-transparent border-0 resize-none focus:outline-none focus:ring-0 text-slate-800 dark:text-slate-200 overflow-y-auto animate-fade-in"
        />
      );
    } else if (paneType === 'reading') {
      const readingRef = side === 'left' ? leftReadingViewRef : (side === 'right' ? rightReadingViewRef : readingViewRef);
      return (
        <div 
          ref={elementRef}
          onScroll={handleScroll}
          onClick={handleContentClick}
          className="w-full h-full overflow-y-auto p-4 md:p-6 flex flex-col animate-fade-in"
        >
          {/* Double Click Edit Guide Info Banner */}
          {!isReadingEditable && (
            <div className="mb-4 shrink-0 text-[10px] text-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-950/40 rounded-lg px-2.5 py-1.5 flex items-center justify-between select-none">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                提示：雙擊進入編輯模式；編輯中再雙擊可退出。
              </span>
              <span className="font-semibold uppercase tracking-wider text-[9px] bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded">唯讀</span>
            </div>
          )}

          {isReadingEditable && (
            <div className="mb-4 shrink-0 text-[10px] text-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-950/40 rounded-lg px-2.5 py-1.5 flex items-center justify-between animate-pulse select-none">
              <span className="flex items-center gap-1.5 font-bold">
                ✏️ 編輯中（再次雙擊或點擊「完成」可退出）
              </span>
              <button
                onClick={() => {
                  if (readingRef.current) {
                    readingRef.current.blur();
                  }
                }}
                className="px-2.5 py-0.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[9px] shadow-sm transition-all"
              >
                完成編輯
              </button>
            </div>
          )}

          {/* Editable HTML Viewer Container */}
          {/* NOTE: We intentionally do NOT use dangerouslySetInnerHTML here.
               Instead, a useEffect below updates innerHTML imperatively.
               This prevents React from wiping Mermaid-rendered SVGs on
               re-renders triggered by unrelated state changes (e.g. edit mode toggle). */}
          <div
            ref={readingRef}
            contentEditable={isReadingEditable}
            onBlur={(e) => handleReadingBlur(e, side)}
            onDoubleClick={() => handleReadingDoubleClick(side)}
            suppressContentEditableWarning
            style={{ 
              fontSize: `${previewFontSize}px`,
              '--mermaid-bg': getMermaidBgColor(),
              '--mermaid-border': mermaidBg === 'transparent' ? 'transparent' : (darkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)')
            }}
            className={`flex-1 preview-prose focus:outline-none min-h-[300px] pb-12 ${isReadingEditable ? 'ring-2 ring-indigo-500/20 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-indigo-200/30 dark:border-indigo-900/20' : ''}`}
            data-placeholder="無內容。在此處雙擊或輸入文字，或在左邊編寫 Markdown..."
          />
        </div>
      );
    }
  }

  // --- Utility Panel Buttons ---
  function renderPanelUtilityButtons(paneType, uniqueKey) {
    const isMd = paneType === 'markdown';
    const isHtml = paneType === 'html';
    const isReading = paneType === 'reading';

    return (
      <div className="flex items-center gap-1 relative z-20">
        {/* Copy Buttons */}
        <div className="relative flex items-center rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200/50 dark:border-slate-800/50">
          {isMd && (
            <button
              onClick={() => handleCopy('markdown', `${uniqueKey}-copy-md`)}
              className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded transition-all"
              title="複製 Markdown 文字"
            >
              {copiedStatus[`${uniqueKey}-copy-md`] ? '已複製!' : '複製 MD'}
            </button>
          )}

          {(isHtml || isReading) && (
            <>
              <button
                onClick={() => handleCopy('html', `${uniqueKey}-copy-html`)}
                className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded transition-all"
                title="複製 HTML 原始碼"
              >
                {copiedStatus[`${uniqueKey}-copy-html`] ? '已複製!' : '複製 HTML'}
              </button>
              <button
                onClick={() => handleCopy('plain', `${uniqueKey}-copy-plain`)}
                className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded transition-all"
                title="複製純文字內容"
              >
                {copiedStatus[`${uniqueKey}-copy-plain`] ? '已複製!' : '複製純文字'}
              </button>
            </>
          )}
        </div>

        {/* PDF/HTML Export Dropdown */}
        {isReading && (
          <div className="relative hidden sm:flex pdf-dropdown-container">
            <button
              onClick={() => setActivePdfDropdown(activePdfDropdown === `${uniqueKey}-pdf` ? null : `${uniqueKey}-pdf`)}
              className="px-2 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-white dark:hover:bg-slate-800 border border-indigo-200/30 dark:border-indigo-900/30 rounded-lg transition-all flex items-center gap-1"
              title="文件匯出與分享 (PDF/HTML)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span>匯出/分享</span>
              <svg className="w-2.5 h-2.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {activePdfDropdown === `${uniqueKey}-pdf` && (
              <div className="absolute right-0 mt-7 w-52 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl z-20 p-1 flex flex-col gap-0.5 animate-fade-in">
                <button
                  onClick={() => {
                    handleExportPDF('download');
                    setActivePdfDropdown(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all"
                >
                  <span className="text-sm">🖼️</span>
                  <div>
                    <div className="font-bold text-[11px]">下載圖片 PDF</div>
                    <div className="text-[9px] text-slate-400 font-normal">保留完整排版樣式</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    handleExportPDF('share');
                    setActivePdfDropdown(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all"
                >
                  <span className="text-sm">📤</span>
                  <div>
                    <div className="font-bold text-[11px]">分享圖片 PDF</div>
                    <div className="text-[9px] text-slate-400 font-normal">傳送圖片版 PDF</div>
                  </div>
                </button>
                <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />
                <button
                  onClick={() => {
                    handleExportTextPDF('download');
                    setActivePdfDropdown(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all"
                >
                  <span className="text-sm">📝</span>
                  <div>
                    <div className="font-bold text-[11px]">下載文字 PDF</div>
                    <div className="text-[9px] text-slate-400 font-normal">可搜尋、複製內文</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    handleExportTextPDF('share');
                    setActivePdfDropdown(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all"
                >
                  <span className="text-sm">📤</span>
                  <div>
                    <div className="font-bold text-[11px]">分享文字 PDF</div>
                    <div className="text-[9px] text-slate-400 font-normal">傳送文字版 PDF</div>
                  </div>
                </button>
                <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />
                <button
                  onClick={() => {
                    handleExportHTML('download');
                    setActivePdfDropdown(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all"
                >
                  <span className="text-sm">🌐</span>
                  <div>
                    <div className="font-bold text-[11px]">下載美化 HTML</div>
                    <div className="text-[9px] text-slate-400 font-normal">快速跳轉大綱與雙欄排版</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    handleExportHTML('share');
                    setActivePdfDropdown(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-305 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all"
                >
                  <span className="text-sm">📤</span>
                  <div>
                    <div className="font-bold text-[11px]">分享美化 HTML</div>
                    <div className="text-[9px] text-slate-400 font-normal">傳送雙欄大綱 HTML</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Font Size Adjuster */}
        {isReading && layout === 'single' && (
          <div className="hidden sm:flex items-center rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200/50 dark:border-slate-800/50 gap-0.5 ml-1 select-none">
            <button
              onClick={() => setPreviewFontSize(prev => Math.max(12, prev - 1))}
              className="px-2 py-1 text-[10px] font-extrabold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded transition-all active:scale-95"
              title="縮小字體"
            >
              A-
            </button>
            <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-800" />
            <button
              onClick={() => setPreviewFontSize(prev => Math.min(24, prev + 1))}
              className="px-2 py-1 text-[10px] font-extrabold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded transition-all active:scale-95"
              title="放大字體"
            >
              A+
            </button>
          </div>
        )}

        {/* Auto Jump Checkbox (only visible for markdown editor in single column layout) */}
        {isMd && layout === 'single' && (
          <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 cursor-pointer select-none mr-2 bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 px-2 py-1 rounded-lg">
            <input
              type="checkbox"
              checked={autoJump}
              onChange={(e) => setAutoJump(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500/30 accent-indigo-500 cursor-pointer"
            />
            <span>貼上後跳轉</span>
          </label>
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
        )}

        {/* Paste Buttons */}
        <button
          onClick={() => handlePaste(paneType)}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-950 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-all"
          title="從系統剪貼簿貼上文字並同步"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2v-3" />
          </svg>
          <span>貼上</span>
        </button>

        {/* Clear Button (Clear specific panel, added on Single Column & Left Column next to Paste) */}
        {(uniqueKey === 'left-pane-util' || uniqueKey === 'single-pane-util') && (
          <button
            onClick={() => {
              if (paneType === 'markdown') handleMarkdownChange('');
              else if (paneType === 'html') handleHtmlChange('');
              else if (paneType === 'reading') handleHtmlChange('');
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-950 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
            title="清除此面板內容"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>清除</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen lg:h-screen min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200 overflow-visible lg:overflow-hidden">
      
      {/* --- HEADER NAVBAR --- */}
      <header className={`sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 glass shadow-sm shrink-0 transition-all duration-300 transform ${showToolbars ? 'translate-y-0 opacity-100' : 'md:translate-y-0 md:opacity-100 -translate-y-full opacity-0 h-0 overflow-hidden pointer-events-none'}`}>
        <div className="max-w-[1600px] mx-auto px-4 py-3.5 flex flex-wrap gap-4 items-center justify-between">
          {/* Logo Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-indigo-500/10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-100 dark:via-indigo-300 dark:to-slate-100 bg-clip-text text-transparent font-sans">
                萬能 Markdown 編輯轉換器
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Vite + React + Tailwind CSS 三向同步系統</p>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Undo / Redo */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200/60 dark:border-slate-800/60">
              <button 
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="復原 (Undo)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                </svg>
              </button>
              <button 
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="重做 (Redo)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" />
                </svg>
              </button>
            </div>

            {/* Layout Toggle Segmented Control */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200/60 dark:border-slate-800/60">
              <button 
                onClick={() => setLayout('single')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${layout === 'single' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-855'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2.5" />
                </svg>
                單欄
              </button>
              <button 
                onClick={() => setLayout('double')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${layout === 'double' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-855'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="8" height="18" rx="1.5" strokeWidth="2.5" />
                  <rect x="13" y="3" width="8" height="18" rx="1.5" strokeWidth="2.5" />
                </svg>
                雙欄對照
              </button>
            </div>

            {/* Clear All Trigger */}
            <button 
              onClick={() => setShowConfirmClear(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all border border-rose-200/40 dark:border-rose-950/40"
              title="清空所有內容"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden sm:inline">清空</span>
            </button>

            {/* Export Trigger */}
            <button 
              onClick={() => {
                setShowExportModal(true);
                setTimeout(handleGenerateSlices, 105);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-750 shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all"
              title="匯出為圖片/切片"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>圖片切片匯出</span>
            </button>

            {/* Dark Mode Switcher (白底/黑底模式) */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200/60 dark:border-slate-800/60 shrink-0">
              <button 
                onClick={() => setDarkMode(false)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${!darkMode ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-855'}`}
                title="切換為白底模式"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>白底</span>
              </button>
              <button 
                onClick={() => setDarkMode(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${darkMode ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-855'}`}
                title="切換為黑底模式"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <span>黑底</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- MAIN WORKSPACE --- */}
      <main className={`flex-1 max-w-[1600px] w-full mx-auto flex flex-col min-h-0 overflow-y-auto lg:overflow-hidden animate-fade-in transition-all duration-300 ${showToolbars ? 'px-4 py-4 md:py-6' : 'md:px-4 md:py-4 lg:py-6 px-0 py-0'}`}>
        
        {layout === 'single' ? (
          /* --- SINGLE COLUMN LAYOUT --- */
          <div className={`flex flex-col flex-1 transition-all duration-300 ${showToolbars ? 'h-[calc(100vh-200px)] md:h-[calc(100vh-220px)] lg:h-[calc(100vh-180px)] border border-slate-200 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-900 shadow-sm' : 'h-[100vh] border-0 rounded-none bg-white dark:bg-slate-900'} overflow-hidden`}>
            {/* Column Toolbar with Segmented Tab Buttons */}
            <div className={`relative z-20 px-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-wrap gap-3 items-center justify-between shrink-0 transition-all duration-300 ${showToolbars ? 'translate-y-0 opacity-100 py-3 h-auto' : 'md:translate-y-0 md:opacity-100 md:py-3 md:h-auto -translate-y-4 opacity-0 h-0 py-0 overflow-hidden pointer-events-none'}`}>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase mr-1">切換視角</span>
                <div className="flex items-center rounded-xl bg-slate-150 dark:bg-slate-950 p-0.5 border border-slate-200/60 dark:border-slate-800/60">
                  {[
                    { key: 'markdown', label: 'Markdown 編輯' },
                    { key: 'html', label: 'HTML 原始碼' },
                    { key: 'reading', label: '美化閱讀排版' }
                  ].map(btn => (
                    <button
                      key={btn.key}
                      onClick={() => setSinglePane(btn.key)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${singlePane === btn.key ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-850'}`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                {singlePane === 'reading' && (
                  <span className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold mr-2 flex items-center gap-1 hidden md:flex">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    雙擊內容可直接修改
                  </span>
                )}
                {renderReadingHeaderControls(singlePane)}
                {renderPanelUtilityButtons(singlePane, 'single-pane-util')}
              </div>
            </div>
            
            {/* Workspace Area */}
            <div className="flex-1 min-h-0 relative overflow-hidden">
              {renderWorkspaceContent(singlePane, 'single')}
            </div>
          </div>
        ) : (
          /* --- DOUBLE COLUMN CONTRAST LAYOUT --- */
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 min-h-0">
            
            {/* Left Pane Card */}
            <div className={`flex flex-col transition-all duration-300 ${showToolbars ? 'h-[500px] md:h-[600px] lg:h-full border border-slate-200 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-900 shadow-sm' : 'h-[50vh] border-0 rounded-none bg-white dark:bg-slate-900'} overflow-hidden`}>
              <div className={`relative z-20 px-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-wrap gap-3 items-center justify-between shrink-0 transition-all duration-300 ${showToolbars ? 'translate-y-0 opacity-100 py-3 h-auto' : 'md:translate-y-0 md:opacity-100 md:py-3 md:h-auto -translate-y-4 opacity-0 h-0 py-0 overflow-hidden pointer-events-none'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">左欄</span>
                  <select 
                    value={leftPane}
                    onChange={(e) => setLeftPane(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-850 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
                  >
                    <option value="markdown">Markdown 編輯格式</option>
                    <option value="html">HTML 原始碼編輯</option>
                    <option value="reading">美化閱讀排版 (可編輯)</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                  {leftPane === 'reading' && (
                    <span className="text-[11px] text-indigo-500 dark:text-indigo-400 font-semibold mr-1 flex items-center gap-0.5 hidden xl:flex">
                      💡 雙擊直接修改
                    </span>
                  )}
                  {renderReadingHeaderControls(leftPane)}
                  {renderPanelUtilityButtons(leftPane, 'left-pane-util')}
                </div>
              </div>
              <div className="flex-1 min-h-0 relative overflow-hidden">
                {renderWorkspaceContent(leftPane, 'left')}
              </div>
            </div>

            {/* Right Pane Card */}
            <div className={`flex flex-col transition-all duration-300 ${showToolbars ? 'h-[500px] md:h-[600px] lg:h-full border border-slate-200 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-900 shadow-sm' : 'h-[50vh] border-0 rounded-none bg-white dark:bg-slate-900'} overflow-hidden`}>
              <div className={`relative z-20 px-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-wrap gap-3 items-center justify-between shrink-0 transition-all duration-300 ${showToolbars ? 'translate-y-0 opacity-100 py-3 h-auto' : 'md:translate-y-0 md:opacity-100 md:py-3 md:h-auto -translate-y-4 opacity-0 h-0 py-0 overflow-hidden pointer-events-none'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">右欄</span>
                  <select 
                    value={rightPane}
                    onChange={(e) => setRightPane(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-850 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
                  >
                    <option value="markdown">Markdown 編輯格式</option>
                    <option value="html">HTML 原始碼編輯</option>
                    <option value="reading">美化閱讀排版 (可編輯)</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                  {rightPane === 'reading' && (
                    <span className="text-[11px] text-indigo-500 dark:text-indigo-400 font-semibold mr-1 flex items-center gap-0.5 hidden xl:flex">
                      💡 雙擊直接修改
                    </span>
                  )}
                  {renderReadingHeaderControls(rightPane)}
                  {renderPanelUtilityButtons(rightPane, 'right-pane-util')}
                </div>
              </div>
              <div className="flex-1 min-h-0 relative overflow-hidden">
                {renderWorkspaceContent(rightPane, 'right')}
              </div>
            </div>

          </div>
        )}
      </main>

      {/* --- FOOTER STATUS --- */}
      <footer className={`w-full border-t border-slate-200 dark:border-slate-900 px-4 bg-slate-50 dark:bg-slate-955 text-center text-xs text-slate-400 font-medium shrink-0 transition-all duration-300 ${showToolbars ? 'translate-y-0 opacity-100 py-3 h-auto' : 'md:translate-y-0 md:opacity-100 md:py-3 md:h-auto translate-y-full opacity-0 h-0 py-0 overflow-hidden pointer-events-none'}`}>
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row gap-2 items-center justify-between">
          <p>© 2026 萬能 Markdown 編輯轉換器. Powered by React & Tailwind CSS.</p>
          <div className="flex gap-4 items-center">
            <span>歷史記錄狀態: <strong className="text-indigo-500 dark:text-indigo-400">{historyIndex + 1}</strong>/{history.length}</span>
            <span>字數統計: MD ({getCharCount(markdown)}) | HTML ({getCharCount(html)})</span>
          </div>
        </div>
      </footer>

      {/* --- MODAL: CONFIRM FILENAME --- */}
      {showFilenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl glass shadow-2xl dark:shadow-indigo-950/20 scale-100 transition-all border border-slate-200/50 dark:border-slate-800/80">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 w-full">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">確認匯出 HTML 檔案名稱</h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  請確認或修改即將匯出的 HTML 檔案名稱：
                </p>
                <input
                  type="text"
                  value={tempExportFilename}
                  onChange={(e) => setTempExportFilename(e.target.value)}
                  className="w-full mt-3 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 font-medium"
                  placeholder="請輸入檔案名稱"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => {
                  setShowFilenameModal(false);
                  setPendingHtmlAction(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                取消
              </button>
              <button 
                onClick={proceedExportHTML}
                className="px-4.5 py-2 text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-650 hover:from-indigo-600 hover:to-purple-750 rounded-xl shadow-md shadow-indigo-500/10 active:scale-95 transition-all"
              >
                確認並{pendingHtmlAction === 'share' ? '分享' : '下載'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CONFIRM CLEAR --- */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl glass shadow-2xl dark:shadow-indigo-950/20 scale-100 transition-all border border-slate-200/50 dark:border-slate-800/80">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">確定要清空所有編輯內容嗎？</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  這項操作會清空 Markdown 編輯器、HTML 原始碼編輯器以及閱讀排版的所有內容。清空後您可以按 **「上一步」** 按鈕來復原，但仍建議您在操作前做好備份。
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                取消
              </button>
              <button 
                onClick={handleClearAll}
                className="px-4.5 py-2 text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-750 rounded-xl shadow-md shadow-rose-500/10 active:scale-95 transition-all"
              >
                確認清空
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: IMAGE EXPORT & SLICING --- */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto transition-all animate-fade-in">
          <div className="w-full max-w-5xl my-4 md:my-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh] overflow-y-auto md:overflow-hidden">
            
            {/* Modal Configurations Pane (Left) */}
            <div className="w-full md:w-[350px] p-6 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-850 flex flex-col justify-between overflow-visible md:overflow-y-auto bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    圖片匯出切片設定
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">自訂背景主題與高度裁切模式</p>
                </div>

                {/* 1. Theme Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">背景底色風格</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setExportTheme('light'); setSlices([]); }}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${exportTheme === 'light' ? 'border-indigo-500 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/10 shadow-sm' : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850'}`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-slate-100 border border-slate-300"></span>
                      極簡白
                    </button>
                    <button
                      onClick={() => { setExportTheme('dark'); setSlices([]); }}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${exportTheme === 'dark' ? 'border-indigo-500 bg-white dark:bg-slate-805 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/10 shadow-sm' : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-855'}`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-slate-955 border border-slate-800"></span>
                      質感暗黑
                    </button>
                  </div>
                </div>

                {/* 2. Slice Mode Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">裁切切割模式</label>
                  <div className="space-y-1.5">
                    {[
                      { key: 'full', label: '整頁輸出 (單一圖片)', desc: '將整篇文件輸出成一張長圖' },
                      { key: 'parts', label: '按張數均等裁切', desc: '將內容均分成指定張數 of 圖片' },
                      { key: 'height', label: `按固定高度裁切 ${captureTotalHeight ? `(總高 ${captureTotalHeight}px)` : ''}`, desc: '按固定像素高度逐張裁切' }
                    ].map(mode => (
                      <button
                        key={mode.key}
                        onClick={() => { setSliceMode(mode.key); setSlices([]); }}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${sliceMode === mode.key ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'}`}
                      >
                        <div className="text-xs font-bold">{mode.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Slicing dynamic parameters */}
                {sliceMode === 'parts' && (
                  <div className="space-y-2 p-3 bg-slate-100 dark:bg-slate-855 rounded-xl">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex justify-between">
                      <span>均分張數:</span>
                      <strong className="text-indigo-500 font-bold">{numParts} 張</strong>
                    </label>
                    <input 
                      type="range"
                      min="2"
                      max="10"
                      value={numParts}
                      onChange={(e) => { setNumParts(e.target.value); setSlices([]); }}
                      className="w-full accent-indigo-500 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-lg cursor-pointer"
                    />
                    <div className="text-[9px] text-slate-400">拉動滑桿可切割 2 到 10 張均等圖片</div>
                  </div>
                )}

                {sliceMode === 'height' && (
                  <div className="space-y-2 p-3 bg-slate-100 dark:bg-slate-855 rounded-xl">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex justify-between">
                      <span>每張高度 (px):</span>
                      <strong className="text-indigo-500 font-bold">{fixedHeight} px</strong>
                    </label>
                    <input 
                      type="number"
                      min="400"
                      max="3000"
                      step="50"
                      value={fixedHeight}
                      onChange={(e) => { setFixedHeight(parseInt(e.target.value) || 800); setSlices([]); }}
                      className="w-full px-3 py-1.5 rounded-lg text-sm border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 animate-fade-in"
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 border-t border-slate-200/40 dark:border-slate-700/40 pt-1.5 font-medium">
                      <span>內容總高度: <strong className="text-indigo-500 dark:text-indigo-400">{captureTotalHeight} px</strong></span>
                      <span>預估裁切: <strong className="text-indigo-500 dark:text-indigo-400">{Math.ceil(captureTotalHeight / fixedHeight)} 張</strong></span>
                    </div>
                  </div>
                )}

                {/* Generate Action Button */}
                <button
                  onClick={handleGenerateSlices}
                  disabled={isGenerating}
                  className="w-full py-3 rounded-xl font-extrabold text-sm text-white bg-indigo-500 hover:bg-indigo-650 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      正在渲染並切片中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      生成切片預覽
                    </>
                  )}
                </button>
              </div>

              {/* Close Panel Button */}
              <button
                onClick={() => { setShowExportModal(false); setSlices([]); }}
                className="mt-6 w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-855 font-bold text-xs transition-all"
              >
                關閉視窗
              </button>
            </div>

            {/* Modal Preview Canvas & Downloads Grid (Right) */}
            <div className="flex-1 p-6 flex flex-col justify-between overflow-visible md:overflow-hidden bg-slate-100 dark:bg-slate-955">
              
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-900 pb-3 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">切片結果預覽 ({slices.length} 張圖)</span>
                  {slices.length > 0 && (
                    <button
                      onClick={handleToggleSelectAll}
                      className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150/40 dark:border-indigo-900/40"
                    >
                      {allSelected ? '取消全選' : `全選 (${slices.length})`}
                    </button>
                  )}
                </div>
                
                {slices.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Share SELECTED slices via Web Share API */}
                    <button
                      onClick={handleShare}
                      disabled={selectedCount === 0}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 shadow-md shadow-indigo-500/10 active:scale-95 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 transition-all"
                    >
                      {shareStatus === 'sharing' ? '傳送中...' :
                       shareStatus === 'success' ? '分享成功!' :
                       shareStatus === 'error' ? '分享失敗' :
                       shareStatus === 'unsupported' ? '不支援分享' : `選取分享 (${selectedCount})`}
                    </button>
                    {/* ZIP download button of SELECTED slices */}
                    <button
                      onClick={handleDownloadZip}
                      disabled={zipProgress !== null || selectedCount === 0}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/10 active:scale-95 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 transition-all"
                    >
                      {zipProgress ? (
                        zipProgress
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          `打包下載 (${selectedCount})`
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Slices Preview Grid Area */}
              <div className="flex-1 my-4 overflow-visible md:overflow-y-auto min-h-[260px] md:min-h-0 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 rounded-2xl p-4">
                {slices.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 flex items-center justify-center mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">尚未生成圖片切片</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">請在左側選擇底色與切片高度模式，並點擊「生成切片預覽」按鈕開始處理。</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {slices.map((slice, i) => (
                      <div 
                        key={i} 
                        className={`flex flex-col border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all relative ${selectedSlices[i] ? 'border-indigo-500 bg-white dark:bg-slate-900 ring-2 ring-indigo-500/15' : 'border-slate-250 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 opacity-60'}`}
                      >
                        {/* Checkbox overlay button (top left corner) */}
                        <div className="absolute top-2.5 left-2.5 z-10">
                          <button
                            onClick={() => toggleSelectSlice(i)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all shadow-sm ${selectedSlices[i] ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white/90 border-slate-300 dark:bg-slate-800/90 dark:border-slate-650 text-transparent'}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        </div>

                        {/* Image Preview Container */}
                        <div className="flex-1 bg-slate-200 dark:bg-slate-955/80 p-2 flex items-center justify-center min-h-[160px] max-h-[200px] overflow-hidden relative group">
                          <img 
                            src={slice.url} 
                            alt={slice.name} 
                            className="max-w-full max-h-full object-contain rounded-md shadow-sm border border-slate-200/20" 
                          />
                          {/* Desktop hover menu overlay */}
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 lg:group-hover:opacity-100 transition-opacity flex flex-col gap-2 items-center justify-center">
                            <a
                              href={slice.url}
                              download={slice.name}
                              className="px-3.5 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-650 text-white font-semibold text-[11px] shadow-sm transition-all text-center w-24"
                            >
                              單張下載
                            </a>
                            <button
                              onClick={() => handleCopySliceImage(slice)}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-[11px] shadow-sm transition-all text-center w-24"
                            >
                              複製圖片
                            </button>
                            <button
                              onClick={() => handleShareSingle(slice)}
                              className="px-3.5 py-1.5 rounded-lg bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-[11px] shadow-sm transition-all text-center w-24"
                            >
                              社群分享
                            </button>
                          </div>
                        </div>

                        {/* Info details / Mobile-friendly buttons below image */}
                        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-2">
                          <div className="flex items-center justify-between text-[11px] font-medium">
                            <span className="font-bold text-slate-500 dark:text-slate-400 truncate max-w-[65%]">{slice.name}</span>
                            <span className="text-slate-400 font-mono">{Math.round(slice.width)} x {Math.round(slice.height)} px</span>
                          </div>
                          
                          {/* Mobile Actions (Visible on screens < lg) */}
                          <div className="flex items-center gap-1.5 mt-1 lg:hidden">
                            <a 
                              href={slice.url} 
                              download={slice.name} 
                              className="flex-1 text-center py-1.5 rounded-lg bg-indigo-500 text-white font-bold text-[10px] shadow-sm active:scale-95"
                            >
                              下載
                            </a>
                            <button 
                              onClick={() => handleCopySliceImage(slice)} 
                              className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-white font-bold text-[10px] shadow-sm active:scale-95"
                            >
                              複製
                            </button>
                            <button 
                              onClick={() => handleShareSingle(slice)} 
                              className="flex-1 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-[10px] shadow-sm active:scale-95"
                            >
                              分享
                            </button>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notification Banner */}
              <div className="text-[10px] text-slate-400 flex items-start gap-1.5 leading-relaxed bg-slate-100 dark:bg-slate-900/50 px-3.5 py-2.5 rounded-xl border border-slate-200/40 dark:border-slate-900/40 shrink-0">
                <svg className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="space-y-0.5">
                  <p>
                    <strong>💡 電腦版與社群分享提示：</strong>
                    本機電腦環境不支援直接以 Web Share 傳送檔案。在電腦上點擊<strong>「社群分享」</strong>或<strong>「複製」</strong>將會把圖片複製到剪貼簿，您只需直接在 LINE 對話框按下 <strong>Ctrl+V</strong> 貼上即可傳送！
                  </p>
                  <p>
                    <strong>📱 手機版分享提示：</strong>
                    若點擊分享發送至 LINE 後畫面閃退或對方未收到，這是由於通訊軟體的檔案沙盒限制所致。建議改為點擊<strong>「複製」</strong>，並直接於 LINE 輸入框中貼上傳送，此方式 100% 穩定有效。
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- HIDDEN CANVAS OFFSCREEN RENDERING CONTAINER --- */}
      <div className="absolute left-[-9999px] top-[-9999px] pointer-events-none" aria-hidden="true">
        <div 
          id="export-capture-area" 
          className={`w-[800px] p-12 transition-colors duration-100 ${exportTheme === 'light' ? 'bg-white text-slate-900' : 'bg-slate-955 text-slate-100 dark'}`}
        >
          <div 
            className="preview-prose"
            dangerouslySetInnerHTML={{ __html: resolveImageSources(readingHtml, imageMap) }} 
          />
        </div>
      </div>

      {renderToast()}

      {/* --- DRAG AND DROP FILE IMPORT OVERLAY --- */}
      {isDragging && (
        <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md transition-all duration-300 animate-fade-in pointer-events-none">
          <div className="w-full max-w-lg p-12 rounded-3xl border-2 border-dashed border-indigo-400 bg-white/90 dark:bg-slate-900/90 shadow-2xl flex flex-col items-center justify-center text-center gap-6 animate-pulse">
            {/* Upload/Drop Icon */}
            <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <svg className="w-10 h-10 animate-bounce text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 font-heading bg-gradient-to-r from-indigo-500 to-purple-650 bg-clip-text text-transparent">
                放開滑鼠以讀取檔案
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                支援自動讀取並同步 <strong className="text-indigo-500 dark:text-indigo-400 font-bold">.md</strong>、<strong className="text-indigo-500 dark:text-indigo-400 font-bold">.txt</strong> 或 <strong className="text-indigo-500 dark:text-indigo-400 font-bold">.html</strong> 格式的檔案
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
