const fs = require('fs');

let lines = fs.readFileSync('src/App.jsx', 'utf8').replace(/\r\n/g, '\n').split('\n');

function resolveBetween(startMarker, endMarker, replacementLines) {
  const startIdx = lines.findIndex(l => l.includes(startMarker));
  if (startIdx === -1) return;
  const endIdx = lines.findIndex((l, idx) => idx > startIdx && l.includes(endMarker));
  if (endIdx === -1) return;

  lines.splice(startIdx, endIdx - startIdx + 1, ...replacementLines);
}

// 1. Conflict around Turndown
resolveBetween(
  '// Custom rule for preserving Mermaid diagram blocks',
  '>>>>>>> 3fc22c81f94733269354124a6d69228cb4eccefb',
  [
    '// Custom rule for preserving Mermaid diagram blocks when converting back to Markdown',
    'turndownService.addRule(\'mermaidBlock\', {',
    '  filter: function (node) {',
    '    return (',
    '      (node.nodeName === \'DIV\' || node.classList.contains(\'mermaid-wrapper\')) &&',
    '      (node.classList.contains(\'mermaid-wrapper\') || node.hasAttribute(\'data-mermaid-code\'))',
    '    );',
    '  },',
    '  replacement: function (content, node) {',
    '    const encoded = node.getAttribute(\'data-mermaid-code\') || \'\';',
    '    let rawCode = \'\';',
    '    try {',
    '      rawCode = decodeURIComponent(escape(window.atob(encoded)));',
    '    } catch {',
    '      try {',
    '        rawCode = decodeURIComponent(encoded);',
    '      } catch {',
    '        rawCode = \'\';',
    '      }',
    '    }',
    '    if (rawCode) {',
    '      return `\\n\\n\`\`\`mermaid\\n${rawCode.trim()}\\n\`\`\`\\n\\n`;',
    '    }',
    '    return \'\';',
    '  }',
    '});',
    '',
    '// Custom rule for stripping YAML metadata cards from HTML conversion',
    'turndownService.addRule(\'metadataCard\', {',
    '  filter: function (node) {',
    '    return node.classList.contains(\'metadata-card-wrapper\');',
    '  },',
    '  replacement: function () {',
    '    return \'\';',
    '  }',
    '});'
  ]
);

// 2. Conflict in initialMarkdown
resolveBetween(
  '9. **Mermaid 向量圖表視覺化**',
  '>>>>>>> 3fc22c81f94733269354124a6d69228cb4eccefb',
  [
    '9. **GFM 擴充語法支援**：',
    '   * 完整支援 **GitHub Flavored Markdown (GFM)**，包括表格、任務清單與 ~~刪除線~~ 等語法。',
    '',
    '10. **程式碼語法高亮**：',
    '    * 整合 `highlight.js`，自動為各類程式碼區塊提供高品質語法著色與一鍵複製按鈕。',
    '',
    '11. **Mermaid 向量圖表視覺化與容錯支援**：',
    '    * 原生支援流程圖、時序圖等圖表語法，深淺主題自適應，並具備無引號裸寫自動容錯與向量匯出。',
    '',
    '12. **YAML Front Matter 元資料卡片**：',
    '    * 文件開頭的 `---` 包裹區塊會渲染為結構化的精美 metadata 卡片（含標題、描述、日期、標籤與 Draft 草稿狀態）。',
    '',
    '13. **✨ AI 複製排版智慧修復**：',
    '    * 針對從 AI 對話（如 ChatGPT / Claude / Antigravity）直接反白複製的內容，一鍵修復多餘換行、檔案標籤、Emoji 標題階層化、粗體項目與補齊 Mermaid 圍欄。'
  ]
);

// 3. Conflict in handlePaste
resolveBetween(
  'const parsedHTML = parseMarkdownToHtml(text);',
  '>>>>>>> 3fc22c81f94733269354124a6d69228cb4eccefb',
  [
    '        const { html: parsedHTML, readingHtml: parsedReadingHtml, rawFrontMatter } = parseMarkdownToHtml(text);',
    '        setFrontMatterRaw(rawFrontMatter);',
    '        setHtml(parsedHTML);',
    '        setMarkdown(text);',
    '        setReadingHtml(parsedReadingHtml);',
    '        pushToHistory(text);'
  ]
);

// Clean up duplicate setReadingHtml or setMarkdown if needed around handlePaste
fs.writeFileSync('src/App.jsx', lines.join('\n'), 'utf8');
console.log('Fixed remaining conflicts in src/App.jsx');
