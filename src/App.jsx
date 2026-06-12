import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import TurndownService from 'turndown';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';

// Initialize and configure Turndown Service for HTML to MD conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bullet: '*',
  codeBlockStyle: 'fenced'
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

// Configure marked to allow safe HTML tags and keep styling clean
marked.setOptions({
  gfm: true,
  breaks: true,
});

const initialMarkdown = `# 🚀 萬能 Markdown 編輯轉換器

歡迎使用這個功能強大且設計精美的 **Vite + React + Tailwind CSS** 單頁應用程式！它能夠實現三欄位/雙欄位的即時同步，並完美支援行動端及桌面端排版。

## ✨ 核心特色功能

1. **三向即時互轉同步**：
   * 在左側或右側編輯 **Markdown** / **HTML**，另一端及中間的**美化閱讀排版**將即時更新。
   * **雙擊閱讀排版**即可進入直覺式的 \`contentEditable\` 編輯模式，修改內容亦會即時同步回 Markdown 及 HTML。
   
2. **多樣化版面配置**：
   * 支援 **單欄模式** 或 **雙欄對照模式**。
   * 下拉選單自訂左右兩欄的內容（Markdown / HTML / 閱讀格式）。

3. **智慧圖片導出與切片**：
   * 整合 \`html2canvas\` 與 \`JSZip\`。
   * 支援**整頁輸出**、**均等張數裁切**或**固定高度裁切**。
   * 提供「極簡白」與「質感暗黑」背景風格，支援批次打包下載。

---

## 📊 範例展示

### 1. 表格排版

| 功能 | 支援度 | 說明 |
| :--- | :---: | :--- |
| 即時同步 | 100% | 支援鍵盤輸入、貼上與雙擊編輯同步 |
| 圖片裁切 | 100% | 網頁自動生成 Canvas 圖片並封裝成 ZIP |
| 歷史紀錄 | 105% | 自動防抖，支援無限次 Undo/Redo |

### 2. 程式碼區塊

\`\`\`javascript
// 核心三向同步邏輯範例
function syncContent(source, content) {
  if (source === 'markdown') {
    const html = marked.parse(content);
    updateHTML(html);
    updatePreview(html);
  }
}
\`\`\`

> **提示**：雙擊右側（或閱讀格式面板）的任意文字即可直接進行可視化編輯！再次點擊空白處或其它面板即可完成同步。

---

祝您寫作愉快！如果有任何問題，歡迎隨時在編輯器中修改這個文件。
`;

export default function App() {
  // --- Content State ---
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [html, setHtml] = useState(() => marked.parse(initialMarkdown));
  const [readingHtml, setReadingHtml] = useState(() => marked.parse(initialMarkdown));

  // --- Layout State ---
  const [layout, setLayout] = useState('double'); // 'single' | 'double'
  const [singlePane, setSinglePane] = useState('markdown'); // 'markdown' | 'html' | 'reading'
  const [leftPane, setLeftPane] = useState('markdown'); // 'markdown' | 'html' | 'reading'
  const [rightPane, setRightPane] = useState('reading'); // 'markdown' | 'html' | 'reading'

  // --- Double Click Editable State ---
  const [isReadingEditable, setIsReadingEditable] = useState(false);

  // --- Undo/Redo History Stack ---
  const [history, setHistory] = useState([initialMarkdown]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // --- Modals State ---
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // --- Export Configurations ---
  const [exportTheme, setExportTheme] = useState('light'); // 'light' | 'dark'
  const [sliceMode, setSliceMode] = useState('full'); // 'full' | 'parts' | 'height'
  const [numParts, setNumParts] = useState(3);
  const [fixedHeight, setFixedHeight] = useState(800);
  const [slices, setSlices] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zipProgress, setZipProgress] = useState(null);

  // --- Dark Mode State ---
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // --- Temporary Status Messages (e.g. Copied) ---
  const [copiedStatus, setCopiedStatus] = useState({}); // { panelId: boolean }

  // --- Refs ---
  const activePaneRef = useRef(null); // 'markdown' | 'html' | 'reading'
  const readingViewRef = useRef(null);
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

  // Clean up timeouts
  useEffect(() => {
    return () => {
      if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
    };
  }, []);

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
      const parsedHTML = marked.parse(prevMD);
      setHtml(parsedHTML);
      setReadingHtml(parsedHTML);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      const nextMD = history[nextIdx];

      activePaneRef.current = 'history';
      setMarkdown(nextMD);
      const parsedHTML = marked.parse(nextMD);
      setHtml(parsedHTML);
      setReadingHtml(parsedHTML);
    }
  };

  // --- Three-way Synchronization Handlers ---

  // 1. Triggered by typing in Markdown Textarea
  const handleMarkdownChange = (val) => {
    activePaneRef.current = 'markdown';
    setMarkdown(val);
    
    // Parse to HTML
    const parsedHTML = marked.parse(val);
    setHtml(parsedHTML);
    setReadingHtml(parsedHTML);

    // Debounce history additions
    if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
    historyTimeoutRef.current = setTimeout(() => {
      pushToHistory(val);
    }, 400);
  };

  // 2. Triggered by typing in HTML Textarea
  const handleHtmlChange = (val) => {
    activePaneRef.current = 'html';
    setHtml(val);
    setReadingHtml(val);

    // Convert back to Markdown
    const convertedMD = turndownService.turndown(val);
    setMarkdown(convertedMD);

    // Debounce history additions
    if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
    historyTimeoutRef.current = setTimeout(() => {
      pushToHistory(convertedMD);
    }, 400);
  };

  // 3. Triggered by editing in Reading View (contentEditable)
  const handleReadingInput = (e) => {
    activePaneRef.current = 'reading';
    const innerHTML = e.currentTarget.innerHTML;
    
    // Sync other states, but NOT readingHtml (to preserve caret focus)
    setHtml(innerHTML);
    const convertedMD = turndownService.turndown(innerHTML);
    setMarkdown(convertedMD);

    // Debounce history additions
    if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
    historyTimeoutRef.current = setTimeout(() => {
      pushToHistory(convertedMD);
    }, 400);
  };

  // Double click event on Reading View
  const handleReadingDoubleClick = () => {
    setIsReadingEditable(true);
    activePaneRef.current = 'reading';
    setTimeout(() => {
      if (readingViewRef.current) {
        readingViewRef.current.focus();
      }
    }, 30);
  };

  // When focus leaves Reading view, do final sync & close edit mode
  const handleReadingBlur = (e) => {
    setIsReadingEditable(false);
    const innerHTML = e.currentTarget.innerHTML;
    setHtml(innerHTML);
    const convertedMD = turndownService.turndown(innerHTML);
    setMarkdown(convertedMD);
    setReadingHtml(innerHTML);
    pushToHistory(convertedMD);
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
        // Strip tags fallback
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
      } else if (type === 'html') {
        handleHtmlChange(text);
      } else if (type === 'reading') {
        // Parse markdown if pasted as plain text, or inject directly
        const parsedHTML = marked.parse(text);
        setHtml(parsedHTML);
        setMarkdown(text);
        setReadingHtml(parsedHTML);
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

  // --- Slicing & Export Logic ---

  const handleGenerateSlices = async () => {
    setIsGenerating(true);
    setSlices([]);
    try {
      // Small delay to ensure modal options finish rendering
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const element = document.getElementById('export-capture-area');
      if (!element) return;

      // Capture element with html2canvas
      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: 2, // 2x high-resolution rendering
        backgroundColor: exportTheme === 'light' ? '#ffffff' : '#090d16',
        logging: false
      });

      const mainWidth = canvas.width;
      const mainHeight = canvas.height;
      const generated = [];

      if (sliceMode === 'full') {
        const url = canvas.toDataURL('image/png');
        generated.push({
          name: 'full_document.png',
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
            name: `slice_part_${i + 1}.png`,
            url,
            width: mainWidth / 2,
            height: currentHeight / 2
          });
        }
      } else if (sliceMode === 'height') {
        const targetHeight = Math.max(100, parseInt(fixedHeight) || 800);
        const scaledHeight = targetHeight * 2; // match canvas scale = 2
        
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
            name: `slice_height_${index}.png`,
            url,
            width: mainWidth / 2,
            height: currentHeight / 2
          });
          
          currentY += scaledHeight;
          index++;
        }
      }
      setSlices(generated);
    } catch (err) {
      console.error('Image Slicing Error: ', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadZip = async () => {
    if (slices.length === 0) return;
    setZipProgress('正在封裝壓縮檔...');
    try {
      const zip = new JSZip();
      slices.forEach((slice, index) => {
        // Extract raw base64 data from URL
        const base64Data = slice.url.split(',')[1];
        zip.file(slice.name, base64Data, { base64: true });
      });

      const blobContent = await zip.generateAsync({ type: 'blob' });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(blobContent);
      downloadLink.download = `universal_markdown_slices_${Date.now()}.zip`;
      downloadLink.click();
    } catch (err) {
      console.error('Failed to create ZIP: ', err);
    } finally {
      setZipProgress(null);
    }
  };

  // Helper render to display characters count
  const getCharCount = (str) => {
    return str ? str.length : 0;
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      
      {/* --- HEADER NAVBAR --- */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 glass shadow-sm">
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${layout === 'single' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-850'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2.5" />
                </svg>
                單欄
              </button>
              <button 
                onClick={() => setLayout('double')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${layout === 'double' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-850'}`}
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
                // Pre-generate preview right away
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

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 active:scale-95 transition-all"
              title={darkMode ? '切換為淺色模式' : '切換為深色模式'}
            >
              {darkMode ? (
                <svg className="w-4.5 h-4.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.46 5.05L5.75 4.343a1 1 0 10-1.414 1.414l.707.707zm1.414 8.486a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4.5 h-4.5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* --- MAIN WORKSPACE --- */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-4 md:py-6 flex flex-col min-h-0">
        
        {layout === 'single' ? (
          /* --- SINGLE COLUMN LAYOUT --- */
          <div className="flex flex-col flex-1 min-h-[500px] border border-slate-200 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all duration-200">
            {/* Column Toolbar */}
            <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">顯示面板</span>
                <select 
                  value={singlePane}
                  onChange={(e) => setSinglePane(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-850 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
                >
                  <option value="markdown">Markdown 編輯格式</option>
                  <option value="html">HTML 原始碼編輯</option>
                  <option value="reading">美化閱讀排版 (可編輯)</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                {singlePane === 'reading' && (
                  <span className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold mr-2 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    雙擊內容可直接修改
                  </span>
                )}
                {renderPanelUtilityButtons(singlePane, 'single-pane-util')}
              </div>
            </div>
            
            {/* Workspace Area */}
            <div className="flex-1 min-h-0 relative">
              {renderWorkspaceContent(singlePane)}
            </div>
          </div>
        ) : (
          /* --- DOUBLE COLUMN CONTRAST LAYOUT --- */
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 min-h-0">
            
            {/* Left Pane Card */}
            <div className="flex flex-col border border-slate-200 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all duration-200">
              <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-wrap gap-3 items-center justify-between">
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
                <div className="flex items-center gap-1.5">
                  {leftPane === 'reading' && (
                    <span className="text-[11px] text-indigo-500 dark:text-indigo-400 font-semibold mr-1 flex items-center gap-0.5">
                      💡 雙擊直接修改
                    </span>
                  )}
                  {renderPanelUtilityButtons(leftPane, 'left-pane-util')}
                </div>
              </div>
              <div className="flex-1 min-h-0 relative">
                {renderWorkspaceContent(leftPane)}
              </div>
            </div>

            {/* Right Pane Card */}
            <div className="flex flex-col border border-slate-200 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all duration-200">
              <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">右欄</span>
                  <select 
                    value={rightPane}
                    onChange={(e) => setRightPane(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-850 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
                  >
                    <option value="markdown">Markdown 編輯格式</option>
                    <option value="html">HTML 原始碼編輯</option>
                    <option value="reading">美化閱讀排版 (可編輯)</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  {rightPane === 'reading' && (
                    <span className="text-[11px] text-indigo-500 dark:text-indigo-400 font-semibold mr-1 flex items-center gap-0.5">
                      💡 雙擊直接修改
                    </span>
                  )}
                  {renderPanelUtilityButtons(rightPane, 'right-pane-util')}
                </div>
              </div>
              <div className="flex-1 min-h-0 relative">
                {renderWorkspaceContent(rightPane)}
              </div>
            </div>

          </div>
        )}
      </main>

      {/* --- FOOTER STATUS --- */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-900 px-4 py-3 bg-slate-50 dark:bg-slate-950 text-center text-xs text-slate-400 font-medium">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row gap-2 items-center justify-between">
          <p>© 2026 萬能 Markdown 編輯轉換器. Powered by React & Tailwind CSS.</p>
          <div className="flex gap-4 items-center">
            <span>歷史記錄狀態: <strong className="text-indigo-500 dark:text-indigo-400">{historyIndex + 1}</strong>/{history.length}</span>
            <span>字數統計: MD ({getCharCount(markdown)}) | HTML ({getCharCount(html)})</span>
          </div>
        </div>
      </footer>

      {/* --- MODAL: CONFIRM CLEAR --- */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto transition-all">
          <div className="w-full max-w-5xl my-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col md:flex-row max-h-[85vh] overflow-hidden">
            
            {/* Modal Configurations Pane (Left) */}
            <div className="w-full md:w-[350px] p-6 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-850 flex flex-col justify-between overflow-y-auto bg-slate-50/50 dark:bg-slate-900/30">
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
                      <span className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-800"></span>
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
                      { key: 'parts', label: '按張數均等裁切', desc: '將內容均分成指定張數的圖片' },
                      { key: 'height', label: '按固定高度裁切', desc: '按固定像素高度逐張裁切' }
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
                  <div className="space-y-2 p-3 bg-slate-100 dark:bg-slate-850 rounded-xl">
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
                  <div className="space-y-2 p-3 bg-slate-100 dark:bg-slate-850 rounded-xl">
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
                      className="w-full px-3 py-1.5 rounded-lg text-sm border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                    />
                    <div className="text-[9px] text-slate-400">標準高度介於 400px 到 3000px 之間</div>
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
                className="mt-6 w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 font-bold text-xs transition-all"
              >
                關閉視窗
              </button>
            </div>

            {/* Modal Preview Canvas & Downloads Grid (Right) */}
            <div className="flex-1 p-6 flex flex-col justify-between overflow-hidden bg-slate-100 dark:bg-slate-950">
              
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-900 pb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">切片結果預覽 ({slices.length} 張圖)</span>
                {slices.length > 0 && (
                  <button
                    onClick={handleDownloadZip}
                    disabled={zipProgress !== null}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/10 active:scale-95 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 transition-all"
                  >
                    {zipProgress ? (
                      zipProgress
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        一鍵批次打包下載 (ZIP)
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Slices Preview Grid Area */}
              <div className="flex-1 my-4 overflow-y-auto min-h-0 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 rounded-2xl p-4">
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
                      <div key={i} className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        {/* Image Preview Container */}
                        <div className="flex-1 bg-slate-200 dark:bg-slate-955/80 p-2 flex items-center justify-center min-h-[160px] max-h-[200px] overflow-hidden relative group">
                          <img 
                            src={slice.url} 
                            alt={slice.name} 
                            className="max-w-full max-h-full object-contain rounded-md shadow-sm border border-slate-200/20" 
                          />
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a
                              href={slice.url}
                              download={slice.name}
                              className="px-3.5 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-650 text-white font-semibold text-[11px] shadow-sm transition-all"
                            >
                              單張下載
                            </a>
                          </div>
                        </div>
                        {/* Info details */}
                        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-500 dark:text-slate-400 truncate max-w-[65%]">{slice.name}</span>
                          <span className="text-slate-400 font-mono">{Math.round(slice.width)} x {Math.round(slice.height)} px</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notification Banner */}
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 leading-relaxed bg-slate-100 dark:bg-slate-900/50 px-3.5 py-2.5 rounded-xl border border-slate-200/40 dark:border-slate-900/40">
                <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  本功能直接在您的瀏覽器端進行 Canvas 像素分析，<strong>絕不發送您的內容至任何伺服器</strong>，保護您的資料安全。部分外部資源圖片可能因跨域限制 (CORS) 無法正確截取。
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- HIDDEN CANVAS OFFSCREEN RENDERING CONTAINER --- */}
      <div className="absolute left-[-9999px] top-[-9999px] pointer-events-none" aria-hidden="true">
        <div 
          id="export-capture-area" 
          className={`w-[800px] p-12 transition-colors duration-100 ${exportTheme === 'light' ? 'bg-white text-slate-900' : 'bg-slate-950 text-slate-100 dark'}`}
        >
          {/* Prose style wrapper for html2canvas to capture */}
          <div 
            className="preview-prose"
            dangerouslySetInnerHTML={{ __html: readingHtml }} 
          />
        </div>
      </div>

    </div>
  );

  // --- Sub-renderer: Layout View Render Mode ---
  function renderWorkspaceContent(paneType) {
    if (paneType === 'markdown') {
      return (
        <textarea
          value={markdown}
          onChange={(e) => handleMarkdownChange(e.target.value)}
          placeholder="在此處輸入或貼上您的 Markdown 內容..."
          className="w-full h-full p-4 md:p-6 font-mono text-sm leading-relaxed bg-transparent border-0 resize-none focus:outline-none focus:ring-0 text-slate-805 dark:text-slate-200"
          style={{ minHeight: 'calc(100vh - 250px)' }}
        />
      );
    } else if (paneType === 'html') {
      return (
        <textarea
          value={html}
          onChange={(e) => handleHtmlChange(e.target.value)}
          placeholder="在此處輸入或貼上您的 HTML 原始碼..."
          className="w-full h-full p-4 md:p-6 font-mono text-sm leading-relaxed bg-transparent border-0 resize-none focus:outline-none focus:ring-0 text-slate-805 dark:text-slate-200"
          style={{ minHeight: 'calc(100vh - 250px)' }}
        />
      );
    } else if (paneType === 'reading') {
      return (
        <div 
          className="w-full h-full overflow-y-auto p-4 md:p-6"
          style={{ minHeight: 'calc(100vh - 250px)' }}
        >
          {/* Double Click Edit Guide Info Banner */}
          {!isReadingEditable && (
            <div className="mb-4 text-[10px] text-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-950/40 rounded-lg px-2.5 py-1.5 flex items-center justify-between select-none">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                提示：下方雙擊進入直覺式 contentEditable 編輯模式，點擊外部自動儲存。
              </span>
              <span className="font-semibold uppercase tracking-wider text-[9px] bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded">唯讀</span>
            </div>
          )}

          {isReadingEditable && (
            <div className="mb-4 text-[10px] text-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-950/40 rounded-lg px-2.5 py-1.5 flex items-center justify-between animate-pulse select-none">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                編輯中... 游標直接點擊文字修改內容，點擊別處以同步到其它編輯器。
              </span>
              <span className="font-semibold uppercase tracking-wider text-[9px] bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400">編輯中</span>
            </div>
          )}

          {/* Editable HTML Viewer Container */}
          <div
            ref={readingViewRef}
            contentEditable={isReadingEditable}
            onInput={handleReadingInput}
            onBlur={handleReadingBlur}
            onDoubleClick={handleReadingDoubleClick}
            suppressContentEditableWarning
            className={`preview-prose focus:outline-none min-h-[400px] h-full ${isReadingEditable ? 'ring-2 ring-indigo-500/20 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/50 border border-indigo-200/30 dark:border-indigo-900/20' : ''}`}
            dangerouslySetInnerHTML={{ __html: readingHtml }}
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
      <div className="flex items-center gap-1">
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

        {/* Paste Buttons */}
        <button
          onClick={() => handlePaste(paneType)}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-950 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-all"
          title="從系統剪貼簿貼上文字並同步"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 00-2 2v12a2 2 0 002-2v-3" />
          </svg>
          <span>貼上</span>
        </button>
      </div>
    );
  }
}
