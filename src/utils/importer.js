/**
 * MD2HTML Importer Utilities
 * Supports importing and restoring documents from:
 * 1. Web URLs (Cloudflare Workers, GitHub Pages, arbitrary web pages)
 * 2. Encrypted HTML web pages (AES-256-GCM + PBKDF2 with client-side decryption)
 * 3. Exported HTML files with or without embedded MD2HTML metadata
 * 4. PDF files (extracting embedded MD2HTML metadata or parsing structured text & headings via PDF.js)
 */

import TurndownService from 'turndown';
import { decryptPayload } from './crypto.js';

// --- Dedicated Turndown Converter for Importer ---
export function createImporterTurndownService() {
  const td = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bullet: '*',
    codeBlockStyle: 'fenced'
  });

  // Remove UI-specific buttons & overlays
  td.remove((node) => {
    if (!node || !node.tagName) return false;
    const tag = node.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'noscript') return true;
    if (tag === 'button' && (
      node.classList.contains('copy-code-btn') ||
      node.classList.contains('copy-btn') ||
      node.classList.contains('btn-icon') ||
      node.classList.contains('unlock-btn')
    )) {
      return true;
    }
    if (node.id === 'lock-screen' || node.classList.contains('header-bar')) {
      return true;
    }
    return false;
  });

  // GFM Table parsing rule
  td.addRule('table', {
    filter: 'table',
    replacement: function (content, node) {
      const rows = Array.from(node.rows || []);
      if (rows.length === 0) return '';
      let mdTable = '\n\n';

      rows.forEach((row, rowIndex) => {
        let mdRow = '|';
        const cells = Array.from(row.cells || []);
        cells.forEach((cell) => {
          const text = cell.textContent.trim().replace(/\r?\n+/g, ' ');
          mdRow += ` ${text} |`;
        });
        mdTable += mdRow + '\n';

        // Add alignment divider row after header
        if (rowIndex === 0) {
          let divider = '|';
          cells.forEach((cell) => {
            const align = cell.getAttribute('align') || cell.style?.textAlign || '';
            if (align === 'center') divider += ' :---: |';
            else if (align === 'right') divider += ' ---: |';
            else divider += ' --- |';
          });
          mdTable += divider + '\n';
        }
      });
      return mdTable + '\n\n';
    }
  });

  // Mermaid diagrams preservation
  td.addRule('mermaidBlock', {
    filter: function (node) {
      if (!node || !node.classList) return false;
      return (
        node.classList.contains('mermaid-wrapper') ||
        node.classList.contains('mermaid') ||
        node.hasAttribute('data-mermaid-code')
      );
    },
    replacement: function (content, node) {
      const encoded = node.getAttribute('data-mermaid-code') || '';
      let rawCode = '';
      if (encoded) {
        try {
          rawCode = decodeURIComponent(escape(window.atob(encoded)));
        } catch {
          try {
            rawCode = window.atob(encoded);
          } catch {
            rawCode = '';
          }
        }
      }
      if (!rawCode) {
        // Look inside <pre class="mermaid">
        const pre = node.querySelector('pre.mermaid, pre') || node;
        rawCode = pre.textContent || '';
      }
      if (rawCode && rawCode.trim()) {
        return `\n\n\`\`\`mermaid\n${rawCode.trim()}\n\`\`\`\n\n`;
      }
      return '';
    }
  });

  // Fenced code blocks with language preservation
  td.addRule('fencedCodeBlock', {
    filter: function (node) {
      return node.nodeName === 'PRE' && node.querySelector('code');
    },
    replacement: function (content, node) {
      const codeElem = node.querySelector('code');
      const className = (codeElem && codeElem.className) || (node.className || '');
      const langMatch = className.match(/language-(\S+)/);
      const lang = langMatch ? langMatch[1] : '';
      const codeText = codeElem ? (codeElem.textContent || '') : (node.textContent || '');
      return `\n\n\`\`\`${lang}\n${codeText.replace(/\n$/, '')}\n\`\`\`\n\n`;
    }
  });

  // Callout Alert blockquotes (> [!NOTE], > [!TIP], etc.)
  td.addRule('calloutBlockquote', {
    filter: function (node) {
      if (node.nodeName !== 'BLOCKQUOTE') return false;
      const firstChild = node.firstElementChild;
      if (firstChild && firstChild.classList && Array.from(firstChild.classList).some(c => c.startsWith('alert-') || c.startsWith('callout-'))) {
        return true;
      }
      return false;
    },
    replacement: function (content) {
      const lines = content.trim().split(/\r?\n/);
      return '\n\n' + lines.map(line => `> ${line}`).join('\n') + '\n\n';
    }
  });

  // Strip metadata cards if present
  td.addRule('metadataCard', {
    filter: function (node) {
      return node.classList && node.classList.contains('metadata-card-wrapper');
    },
    replacement: function () {
      return '';
    }
  });

  return td;
}

const importerTurndown = createImporterTurndownService();

// --- Dynamic PDF.js Loader ---
let pdfjsPromise = null;

export async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  if (pdfjsPromise) return pdfjsPromise;

  pdfjsPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-pdfjs="true"]');
    if (existingScript && window.pdfjsLib) {
      return resolve(window.pdfjsLib);
    }

    const script = document.createElement('script');
    script.setAttribute('data-pdfjs', 'true');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('PDF.js 載入失敗'));
      }
    };

    script.onerror = () => {
      reject(new Error('無法載入 PDF.js 解析庫，請確認網路連線！'));
    };

    document.head.appendChild(script);
  });

  return pdfjsPromise;
}

// --- PDF Parser ---
export async function parsePdfToMarkdown(arrayBuffer) {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;

  // 1. Try reading embedded metadata (100% Lossless MD2HTML export check)
  try {
    const metaData = await pdfDoc.getMetadata().catch(() => null);
    if (metaData && metaData.info) {
      const candidates = [metaData.info.Keywords, metaData.info.Subject, metaData.info.Title];
      for (const str of candidates) {
        if (str && typeof str === 'string' && str.includes('"generator":"MD2HTML"')) {
          try {
            const parsed = JSON.parse(str);
            if (parsed.markdown) {
              return {
                success: true,
                isLossless: true,
                markdown: parsed.markdown,
                title: parsed.title || metaData.info.Title || '匯入自 PDF',
                theme: parsed.theme || 'light',
                sourceType: 'pdf'
              };
            }
          } catch (_e) {
            void _e;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to read PDF metadata:', err);
  }

  // 2. Structured Text Extraction across all pages
  const numPages = pdfDoc.numPages;
  const pageTexts = [];
  let totalItemCount = 0;
  const allHeights = [];

  for (let p = 1; p <= numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const textContent = await page.getTextContent();
    const items = textContent.items || [];
    totalItemCount += items.length;

    items.forEach((it) => {
      const h = it.transform ? Math.abs(it.transform[0] || it.transform[3] || it.height) : (it.height || 12);
      if (h > 4 && h < 60) allHeights.push(h);
    });

    pageTexts.push(items);
  }

  if (totalItemCount === 0 || allHeights.length === 0) {
    throw new Error(
      '此 PDF 檔案無文字層（可能為純圖片掃描檔或舊版切片 PDF），無法直接提取文字。建議匯入原始發布網址或具文字層的檔案！'
    );
  }

  // Calculate median body font size
  allHeights.sort((a, b) => a - b);
  const medianHeight = allHeights[Math.floor(allHeights.length / 2)] || 12;

  // Reconstruct Markdown page by page
  const markdownSections = [];

  for (let p = 0; p < pageTexts.length; p++) {
    const items = pageTexts[p];
    if (items.length === 0) continue;

    // Group items by line based on y-coordinate (tolerance: ~3.5 units)
    const lineMap = [];

    items.forEach((it) => {
      const str = (it.str || '').trim();
      if (!str) return;
      const x = it.transform ? it.transform[4] : 0;
      const y = it.transform ? it.transform[5] : 0;
      const h = it.transform ? Math.abs(it.transform[0] || it.transform[3] || it.height) : (it.height || 12);

      let foundLine = lineMap.find((line) => Math.abs(line.y - y) <= 3.5);
      if (foundLine) {
        foundLine.items.push({ x, str, h });
        foundLine.maxHeight = Math.max(foundLine.maxHeight, h);
      } else {
        lineMap.push({ y, maxHeight: h, items: [{ x, str, h }] });
      }
    });

    // Sort lines from top to bottom (descending y)
    lineMap.sort((a, b) => b.y - a.y);

    const pageLines = [];

    lineMap.forEach((line) => {
      // Sort items on the same line from left to right (ascending x)
      line.items.sort((a, b) => a.x - b.x);
      const text = line.items.map((i) => i.str).join(' ').trim();
      if (!text) return;

      const h = line.maxHeight;

      // Classify line type based on font height
      if (h >= medianHeight * 1.6) {
        pageLines.push(`\n# ${text}\n`);
      } else if (h >= medianHeight * 1.3) {
        pageLines.push(`\n## ${text}\n`);
      } else if (h >= medianHeight * 1.15) {
        pageLines.push(`\n### ${text}\n`);
      } else if (/^[•●\-*]\s*/.test(text)) {
        pageLines.push(`* ${text.replace(/^[•●\-*]\s*/, '')}`);
      } else if (/^\d+[.、]\s*/.test(text)) {
        pageLines.push(text);
      } else {
        pageLines.push(text);
      }
    });

    if (pageLines.length > 0) {
      markdownSections.push(pageLines.join('\n'));
    }
  }

  const generatedMd = markdownSections.join('\n\n---\n\n').trim();

  // Extract a sensible title
  let extractedTitle = 'PDF 匯入文件';
  const firstH1 = generatedMd.match(/^#\s+(.+)$/m);
  if (firstH1) {
    extractedTitle = firstH1[1].trim();
  }

  return {
    success: true,
    isLossless: false,
    markdown: generatedMd,
    title: extractedTitle,
    theme: 'light',
    sourceType: 'pdf'
  };
}

// --- HTML Parser ---
export async function parseHtmlToMarkdown(htmlString, password = null) {
  if (!htmlString || typeof htmlString !== 'string') {
    throw new Error('無效的 HTML 內容');
  }

  // 1. Detect if this is an Encrypted document (created by MD2HTML password protection)
  const isEncrypted = htmlString.includes('id="encrypted-payload"') || htmlString.includes("id='encrypted-payload'");
  if (isEncrypted) {
    const titleMatch = htmlString.match(/<title[^>]*>([^<]+)<\/title>/i);
    const docTitle = titleMatch ? titleMatch[1].trim() : '受密碼保護的美化網頁';

    if (!password) {
      return {
        needsPassword: true,
        title: docTitle,
        sourceType: 'encrypted_html'
      };
    }

    // Attempt decryption
    const payloadMatch = htmlString.match(/<script id=["']encrypted-payload["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!payloadMatch) {
      throw new Error('找不到加密載荷資料');
    }

    let payloadObj;
    try {
      payloadObj = JSON.parse(payloadMatch[1].trim());
    } catch {
      throw new Error('加密載荷資料格式錯誤');
    }

    let decryptedData;
    try {
      decryptedData = await decryptPayload(payloadObj, password);
    } catch {
      throw new Error('密碼錯誤，無法解密！');
    }

    // If lossless markdown is embedded in the decrypted payload
    if (decryptedData.markdown) {
      return {
        success: true,
        isLossless: true,
        markdown: decryptedData.markdown,
        title: decryptedData.title || docTitle,
        theme: decryptedData.theme || 'light',
        sourceType: 'encrypted_html'
      };
    }

    // Otherwise, convert decrypted articleContentHtml to Markdown
    const contentHtml = decryptedData.articleContentHtml || '';
    const convertedMd = importerTurndown.turndown(contentHtml).trim();

    return {
      success: true,
      isLossless: false,
      markdown: convertedMd,
      title: decryptedData.title || docTitle,
      theme: decryptedData.theme || 'light',
      sourceType: 'encrypted_html'
    };
  }

  // 2. Detect if Lossless MD2HTML metadata tag exists in unencrypted page
  const metaMatch = htmlString.match(/<script id=["']md2html-metadata["'][^>]*>([\s\S]*?)<\/script>/i);
  if (metaMatch) {
    try {
      const parsedMeta = JSON.parse(metaMatch[1].trim());
      if (parsedMeta.markdown) {
        return {
          success: true,
          isLossless: true,
          markdown: parsedMeta.markdown,
          title: parsedMeta.title || '匯入文件',
          theme: parsedMeta.theme || 'light',
          sourceType: 'md2html_html'
        };
      }
    } catch (_e) {
      void _e;
    }
  }

  // 3. General or Standard MD2HTML Exported HTML Parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Determine Title
  let docTitle = '';
  const titleEl = doc.querySelector('title');
  if (titleEl && titleEl.textContent) {
    docTitle = titleEl.textContent.trim();
  }
  if (!docTitle) {
    const ogTitle = doc.querySelector('meta[property="og:title"]');
    if (ogTitle) docTitle = ogTitle.getAttribute('content') || '';
  }

  // Determine Theme
  let docTheme = 'light';
  const bodyEl = doc.body;
  if (bodyEl) {
    const themeAttr = bodyEl.getAttribute('data-theme');
    if (themeAttr === 'dark' || bodyEl.classList.contains('dark')) {
      docTheme = 'dark';
    }
  }

  // Find target article container
  let articleEl =
    doc.querySelector('article#article-content') ||
    doc.querySelector('article.article-content') ||
    doc.querySelector('#article-content') ||
    doc.querySelector('#article-root') ||
    doc.querySelector('.markdown-body') ||
    doc.querySelector('article') ||
    doc.querySelector('main') ||
    doc.body;

  if (!articleEl) {
    throw new Error('無法找到可供解析的網頁主體內容！');
  }

  // Clone element to avoid modifying the original DOM
  const clone = articleEl.cloneNode(true);

  // Strip sidebar, lock screen, floating buttons, header controls, scripts
  const removeSelectors = [
    '#lock-screen',
    '#sidebar',
    '.sidebar',
    '.header-bar',
    '.toggle-sidebar-btn',
    '.copy-btn',
    '.copy-code-btn',
    'script',
    'style',
    'noscript'
  ];
  removeSelectors.forEach((sel) => {
    clone.querySelectorAll(sel).forEach((el) => el.remove());
  });

  const cleanInnerHtml = clone.innerHTML;
  const convertedMd = importerTurndown.turndown(cleanInnerHtml).trim();

  if (!convertedMd) {
    throw new Error('解析完成後未發現有效文字內容。');
  }

  if (!docTitle) {
    const firstH = convertedMd.match(/^#\s+(.+)$/m);
    if (firstH) docTitle = firstH[1].trim();
    else docTitle = '匯入網頁文件';
  }

  return {
    success: true,
    isLossless: false,
    markdown: convertedMd,
    title: docTitle,
    theme: docTheme,
    sourceType: 'standard_html'
  };
}

// --- Fetch & Import from URL Router ---
export async function fetchAndImportFromUrl(rawUrl, password = null) {
  let url = (rawUrl || '').trim();
  if (!url) {
    throw new Error('請輸入要匯入的網址！');
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  let response;
  try {
    response = await fetch(url);
  } catch (netErr) {
    console.error('Fetch URL error:', netErr);
    throw new Error(
      `無法直接讀取該網址（可能受跨域 CORS 安全限制或連線中斷）。\n建議您可以：\n1. 將該網頁另存為 HTML 檔案後，使用「檔案匯入」拖放載入\n2. 直接複製該網頁原始碼進行貼上匯入`,
      { cause: netErr }
    );
  }

  if (!response.ok) {
    throw new Error(`無法取得網頁內容（伺服器回應狀態: ${response.status} ${response.statusText}）`);
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const isPdf = url.toLowerCase().split('?')[0].endsWith('.pdf') || contentType.includes('application/pdf');

  if (isPdf) {
    const arrayBuffer = await response.arrayBuffer();
    return await parsePdfToMarkdown(arrayBuffer);
  }

  const htmlText = await response.text();
  return await parseHtmlToMarkdown(htmlText, password);
}
