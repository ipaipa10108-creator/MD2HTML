
const isDefinitelyNotMermaid = (line) => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^#{1,6}\s+/.test(trimmed)) return true;
  if (/^[•*]\s+/.test(trimmed)) return true;
  if (/^-\s+(?!--)/.test(trimmed)) return true;
  if (/^\d+[.、)）]\s+/.test(trimmed)) return true;
  if (/^[①②③④⑤⑥⑦⑧⑨⑩]/.test(trimmed)) return true;
  if (/^(?:---+|───+|\*\*\*+|___+)$/.test(trimmed)) return true;
  if (/^>/.test(trimmed) || /^[│|┌└├┼]/.test(trimmed)) return true;
  if (/Diagram exceeds terminal width/i.test(trimmed)) return true;
  if (/Displayed as code block/i.test(trimmed)) return true;
  return false;
};

// 1. Repair AI CLI artifacts (e.g. Claude Code terminal banners, fullwidth dividers, over-extended code blocks)
const repairAIArtifacts = (text) => {
  if (!text) return '';

  // Remove Claude Code / terminal CLI warning banners
  text = text.replace(/^[ \t]*[│|]?[ \t]*Diagram exceeds terminal width[^\n]*\n?/gmi, '');
  text = text.replace(/^[ \t]*[│|]?[ \t]*Displayed as code block[^\n]*\n?/gmi, '');

  // Convert box-drawing horizontal dividers (e.g. ──────) to standard markdown ---
  text = text.replace(/^[ \t]*[─━═]{3,}[ \t]*$/gm, '---');

  // Fix unclosed or over-extended fenced mermaid code blocks
  const lines = text.split('\n');
  const outLines = [];
  let inCode = false;
  let codeLang = '';
  let codeHasMermaidStatements = false;
  let swallowedBlock = false;
  let swallowedIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (swallowedBlock) {
        swallowedBlock = false;
        swallowedIndent = 0;
        continue; // Discard the orphaned closing fence
      }

      if (!inCode) {
        inCode = true;
        codeLang = trimmed.slice(3).trim().toLowerCase();
        codeHasMermaidStatements = false;
        outLines.push(line);
      } else {
        inCode = false;
        codeLang = '';
        codeHasMermaidStatements = false;
        outLines.push(line);
      }
      continue;
    }

    if (inCode && (codeLang === 'mermaid' || codeLang === '')) {
      if (/^(graph|flowchart|sequencediagram|classdiagram|statediagram|erdiagram|journey|gantt|pie|gitgraph|mindmap|timeline|quadrantchart|sankey-beta|zenuml)\b/i.test(trimmed) ||
          /(-->|---|==>|\bparticipant\b|\bactor\b|\[".*"\])/.test(trimmed)) {
        codeHasMermaidStatements = true;
      }

      const isMdHeading = /^#{1,6}\s+/.test(trimmed);
      const isMdHr = /^---+$|^───+$/.test(trimmed);
      const isNotMermaid = isDefinitelyNotMermaid(line);

      if (codeHasMermaidStatements && (isMdHeading || isMdHr || isNotMermaid)) {
        while (outLines.length && !outLines[outLines.length - 1].trim()) {
          outLines.pop();
        }
        outLines.push('```');
        outLines.push('');

        inCode = false;
        swallowedBlock = true;

        const indentMatch = line.match(/^([ \t]+)/);
        swallowedIndent = indentMatch ? indentMatch[1].length : 0;

        const unindented = swallowedIndent > 0 && line.startsWith(' '.repeat(swallowedIndent))
          ? line.slice(swallowedIndent)
          : trimmed;
        outLines.push(unindented);
        continue;
      }
    }

    if (swallowedBlock) {
      let unindented = line;
      if (swallowedIndent > 0) {
        if (line.startsWith(' '.repeat(swallowedIndent))) {
          unindented = line.slice(swallowedIndent);
        } else if (/^[ \t]{1,4}/.test(line)) {
          unindented = line.replace(/^[ \t]{1,4}/, '');
        }
      }
      outLines.push(unindented);
      continue;
    }

    outLines.push(line);
  }

  if (inCode && codeLang === 'mermaid') {
    outLines.push('```');
  }

  return outLines.join('\n');
};

// 2. Parse a block of table lines into a GFM markdown table, merging multiline wrapped rows
const parseTableBlock = (lines) => {
  if (lines.length < 2) return null;

  let sepIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (/^[─━═\-+┼|│\s]+$/.test(l) && (/[┼+]/.test(l) || (/[─━═\-]/.test(l) && /[|│]/.test(l)))) {
      sepIdx = i;
      break;
    }
  }

  if (sepIdx <= 0) return null;

  let headerLineIdx = sepIdx - 1;
  while (headerLineIdx >= 0 && /^[┌┏╔─━═┬┳╦\s]+$/.test(lines[headerLineIdx].trim())) {
    headerLineIdx--;
  }
  if (headerLineIdx < 0) return null;

  const headerLine = lines[headerLineIdx];
  const sepLine = lines[sepIdx];

  const isBoxDrawing = /[│┃┼─]/.test(headerLine) || /[│┃┼─]/.test(sepLine);
  const vSepRegex = isBoxDrawing ? /[│┃]/ : /[|]/;

  const splitRow = (line) => line.split(vSepRegex).map(c => c.trim());

  let headers = splitRow(headerLine);
  const expectedColCount = headers.length;

  const rawRows = [];
  for (let i = sepIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^[└┗╚─━═┴┻╩\s]+$/.test(trimmed) || /^[├┣╠─━═┼╂┿\s]+$/.test(trimmed)) {
      continue;
    }

    const parts = line.split(vSepRegex).map(c => c.trim());
    if (parts.length === expectedColCount) {
      rawRows.push(parts);
    }
  }

  const prefixRegexes = [
    /^[A-Z]型[：:]/,
    /^[A-Z0-9一二三四五六七八九十]+[、.：:]/,
    /^\d+[、.：:]/,
    /^\[\d+\]/,
    /^\(\d+\)/,
    /^[A-Za-z][、.：:]/
  ];

  let matchedPrefixRegex = null;
  if (rawRows.length > 0 && rawRows[0][0]) {
    for (const r of prefixRegexes) {
      if (r.test(rawRows[0][0])) {
        matchedPrefixRegex = r;
        break;
      }
    }
  }

  const logicalRows = [];
  let currentRow = null;

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const col0 = row[0];

    let isNewRow = false;
    if (!currentRow) {
      isNewRow = true;
    } else if (matchedPrefixRegex && matchedPrefixRegex.test(col0)) {
      isNewRow = true;
    } else if (!matchedPrefixRegex) {
      if (!col0) {
        isNewRow = false;
      } else if (currentRow._hadEmptyCol0) {
        isNewRow = true;
      } else {
        const prevColLast = currentRow[expectedColCount - 1] || '';
        const isPrevFinished = /[。！？!?）)」\s]$/.test(prevColLast) || !prevColLast;
        if (isPrevFinished && !/^[()（）]/.test(col0) && !/^[a-z]/.test(col0)) {
          isNewRow = true;
        } else {
          isNewRow = false;
        }
      }
    } else {
      isNewRow = false;
    }

    if (isNewRow) {
      currentRow = row.map(c => c);
      currentRow._hadEmptyCol0 = !col0;
      logicalRows.push(currentRow);
    } else {
      if (!col0) currentRow._hadEmptyCol0 = true;
      for (let c = 0; c < expectedColCount; c++) {
        const piece = row[c];
        if (!piece) continue;

        if (!currentRow[c]) {
          currentRow[c] = piece;
        } else {
          if (c === 0 && (/^[()（）]/.test(piece) || /型\(/.test(piece))) {
            currentRow[c] += '<br>' + piece;
          } else {
            const lastChar = currentRow[c].slice(-1);
            const firstChar = piece[0];
            const isCJK = (ch) => /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(ch);
            if (isCJK(lastChar) && isCJK(firstChar)) {
              currentRow[c] += piece;
            } else if (/[\s]/.test(lastChar) || /[\s]/.test(firstChar)) {
              currentRow[c] += piece;
            } else if (/[.,;:!?'"）)」]/.test(lastChar) || /[.,;:!?'"（(「]/.test(firstChar)) {
              currentRow[c] += piece;
            } else if (/[a-zA-Z]/.test(lastChar) && /[a-zA-Z]/.test(firstChar)) {
              currentRow[c] += ' ' + piece;
            } else {
              currentRow[c] += piece;
            }
          }
        }
      }
    }
  }

  const out = [];
  out.push('| ' + headers.join(' | ') + ' |');
  out.push('| ' + headers.map(() => '---').join(' | ') + ' |');
  for (const r of logicalRows) {
    const cleanCells = r.map(cell => (cell || '').replace(/\|/g, '\\|'));
    out.push('| ' + cleanCells.join(' | ') + ' |');
  }

  return out.join('\n');
};

// 3. Convert all Unicode box-drawing or terminal tables into GFM Markdown tables
const convertBoxTablesToGFM = (text) => {
  if (!text) return '';
  const lines = text.split('\n');
  const result = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    const isBoxSep = (l) => /^[─━═\-+┼|│\s]+$/.test(l) && (/[┼+]/.test(l) || (/[─━═\-]/.test(l) && /[|│]/.test(l)));
    const hasColSep = (l) => /[│┃]/.test(l) || (/\|/.test(l) && !l.startsWith('| ---'));

    if (i + 1 < lines.length && hasColSep(trimmed) && isBoxSep(lines[i + 1].trim())) {
      const tableLines = [line, lines[i + 1]];
      i += 2;
      while (i < lines.length) {
        const rowLine = lines[i];
        const rowTrimmed = rowLine.trim();
        if (!rowTrimmed) break;
        if (/^#{1,6}\s+/.test(rowTrimmed) || (/^[─━═\-]{3,}$/.test(rowTrimmed) && !/[┼+]/.test(rowTrimmed))) {
          break;
        }
        if (hasColSep(rowTrimmed) || /^[└┗╚─━═┴┻╩├┣╠┼╂┿\s]+$/.test(rowTrimmed)) {
          tableLines.push(rowLine);
          i++;
        } else {
          break;
        }
      }

      const gfmTable = parseTableBlock(tableLines);
      if (gfmTable) {
        result.push(gfmTable);
      } else {
        result.push(...tableLines);
      }
      continue;
    }

    result.push(line);
    i++;
  }

  return result.join('\n');
};

// Function to detect and wrap loose un-fenced mermaid blocks without mutating user's markdown
const wrapLooseMermaid = (text) => {
  if (!text) return '';
  const lines = text.split('\n');
  const result = [];
  let inFencedCode = false;
  let inLooseMermaid = false;
  let looseMermaidLines = [];

  const mermaidStartKeywords = [
    'graph', 'flowchart', 'sequencediagram', 'classdiagram',
    'statediagram', 'erdiagram', 'journey', 'gantt', 'pie',
    'gitgraph', 'mindmap', 'timeline', 'quadrantchart', 'sankey-beta', 'zenuml'
  ];

  function isMermaidStart(line) {
    const trimmed = line.trim().toLowerCase();
    return mermaidStartKeywords.some(kw => trimmed.startsWith(kw));
  }

  function isMermaidLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (isDefinitelyNotMermaid(line)) return false;
    if (isMermaidStart(line)) return true;
    if (trimmed.startsWith('%%')) return true;
    if (/(-->|---|--\s*\||-\.->|==>|~~|\.->|->>|<<-|->|<--)/i.test(trimmed)) return true;
    if (/^(subgraph\b|\bend\b|participant\b|actor\b|classDef\b|class\b|style\b|click\b|linkStyle\b|title\b|section\b|accTitle\b|accDescr\b|Note\b|activate\b|deactivate\b|autonumber\b|loop\b|alt\b|else\b|opt\b|par\b|critical\b|break\b|rect\b)/i.test(trimmed)) {
      return true;
    }
    if (/^[A-Za-z0-9_]+(?:\s*\[|\s*\(|\s*\{|\s*\{\{|\s*\[\[|\s*>)/.test(trimmed)) return true;
    return false;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inLooseMermaid) {
        result.push('```mermaid');
        result.push(...looseMermaidLines);
        result.push('```');
        looseMermaidLines = [];
        inLooseMermaid = false;
      }
      inFencedCode = !inFencedCode;
      result.push(line);
      continue;
    }

    if (inFencedCode) {
      result.push(line);
      continue;
    }

    if (!inLooseMermaid) {
      if (trimmed.toLowerCase() === 'mermaid' && i + 1 < lines.length && isMermaidStart(lines[i + 1])) {
        inLooseMermaid = true;
        looseMermaidLines = [];
        continue;
      } else if (isMermaidStart(line)) {
        inLooseMermaid = true;
        looseMermaidLines = [line];
        continue;
      } else {
        result.push(line);
      }
    } else {
      if (!trimmed) {
        let nextIsMermaid = false;
        for (let j = i + 1; j < lines.length; j++) {
          const nextTrimmed = lines[j].trim();
          if (!nextTrimmed) continue;
          if (isMermaidLine(lines[j])) {
            nextIsMermaid = true;
          }
          break;
        }

        if (nextIsMermaid) {
          looseMermaidLines.push(line);
        } else {
          while (looseMermaidLines.length && !looseMermaidLines[looseMermaidLines.length - 1].trim()) {
            looseMermaidLines.pop();
          }
          result.push('```mermaid');
          result.push(...looseMermaidLines);
          result.push('```');
          looseMermaidLines = [];
          inLooseMermaid = false;
          result.push(line);
        }
      } else if (isMermaidLine(line)) {
        looseMermaidLines.push(line);
      } else {
        while (looseMermaidLines.length && !looseMermaidLines[looseMermaidLines.length - 1].trim()) {
          looseMermaidLines.pop();
        }
        result.push('```mermaid');
        result.push(...looseMermaidLines);
        result.push('```');
        looseMermaidLines = [];
        inLooseMermaid = false;
        result.push(line);
      }
    }
  }

  if (inLooseMermaid) {
    while (looseMermaidLines.length && !looseMermaidLines[looseMermaidLines.length - 1].trim()) {
      looseMermaidLines.pop();
    }
    result.push('```mermaid');
    result.push(...looseMermaidLines);
    result.push('```');
  }

  return result.join('\n');
};

// Function to clean and beautify text directly copied from AI chats
const cleanAndBeautifyText = (rawText) => {
  if (!rawText) return '';

  // 1. Repair AI CLI artifacts (unclosed mermaid blocks, terminal banners, divider lines)
  let text = repairAIArtifacts(rawText);

  // 2. Convert Unicode box-drawing or terminal tables to standard GFM tables
  text = convertBoxTablesToGFM(text);

  // 3. Wrap loose un-fenced mermaid blocks
  text = wrapLooseMermaid(text);

  // 4. Fix broken single-line file paths flanked by newlines into inline code `path/to/file.ext`
  const fileExts = 'js|jsx|ts|tsx|vue|css|scss|sass|html|json|md|py|go|rs|java|c|cpp|h|sh|yml|yaml|sql|php|txt';
  const isolatedFileRegex = new RegExp(`(\\n[ \\t]*)([a-zA-Z0-9_\\-\\.\\/]+\\.(?:${fileExts}))([ \\t]*\\n)`, 'g');
  text = text.replace(isolatedFileRegex, ' `$2` ');

  // Connect split sentences where previous line didn't end with a sentence terminator
  text = text.replace(/([^\n\r。！？：!?:#*>\-])[ \t]*\n[ \t]*(`[^`\n]+`)[ \t]*\n[ \t]*([^\n\r#*>\-])/g, '$1 $2 $3');
  text = text.replace(/([^\n\r。！？：!?:#*>\-])[ \t]*\n[ \t]*(`[^`\n]+`)/g, '$1 $2');
  text = text.replace(/(`[^`\n]+`)[ \t]*\n[ \t]*([^\n\r#*>\-])/g, '$1 $2');

  // 5. Process lines for headings and bullet points
  const lines = text.split('\n');
  const cleanedLines = [];
  let inCode = false;

  const emojiRegex = /^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inCode = !inCode;
      cleanedLines.push(line);
      continue;
    }

    if (inCode) {
      cleanedLines.push(line);
      continue;
    }

    // Preserve leading indentation for nested lists, code, and blockquotes
    const indentMatch = line.match(/^([ \t]*)(.*)$/);
    const indent = indentMatch ? indentMatch[1] : '';
    let content = indentMatch ? indentMatch[2] : trimmed;

    // Only collapse excessive whitespace within the content (not leading indent, and not inside tables)
    if (!content.startsWith('|')) {
      content = content.replace(/([^\s])[ \t]{2,}([^\s])/g, '$1 $2');
    }
    line = indent + content;

    // Numbered emoji heading: "1. 🔍 為何..." -> "## 1. 🔍 為何..."
    const numEmojiMatch = trimmed.match(/^(\d+\.)\s*([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}].*)$/u);
    if (numEmojiMatch && !trimmed.startsWith('#')) {
      if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] !== '') {
        cleanedLines.push('');
      }
      cleanedLines.push(`## ${numEmojiMatch[1]} ${numEmojiMatch[2]}`);
      cleanedLines.push('');
      continue;
    }

    // Standalone emoji heading: "📌 問題根因分析：" or "🛠️ 修復方案："
    if (emojiRegex.test(trimmed) && trimmed.length < 40 && !trimmed.startsWith('#') && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
      const cleanTitle = trimmed.replace(/[：:]$/, '');
      if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] !== '') {
        cleanedLines.push('');
      }
      cleanedLines.push(`### ${cleanTitle}`);
      cleanedLines.push('');
      continue;
    }

    // Key-value sub-items ending with colon: "前端未傳遞化名旗標：" (only at root level when not already indented and not a table row)
    const colonMatch = trimmed.match(/^([^#*>\-\d\s|][^：:]{1,35})[：:]$/);
    if (colonMatch && !trimmed.includes('http') && !trimmed.startsWith('```') && !trimmed.startsWith('|') && !indent) {
      const keyName = colonMatch[1].trim();
      cleanedLines.push(`* **${keyName}**：`);
      continue;
    }

    cleanedLines.push(line);
  }

  // Remove excessive consecutive blank lines (max 2)
  let result = cleanedLines.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
};

// Preprocess markdown before passing to marked to tolerate loose mermaid blocks & box tables


const out1 = repairAIArtifacts("> qurey 手術險理賠常遇到同一次手術多處多部位如何理賠的問題，\n對於傳統手術可能是兩處傷口視野，有的條款擇高理賠，有的分別理賠兩處，現在醫學進步，有的透過達文西處理不同部位，不論單孔、多孔達文西，若理賠以手術視野來論，不論條款如何只能理賠一處(擇高)手術險?\n\n請說明不同條款理賠差異、理賠應該長什麼樣子? 保戶遇到不公該如何主張權益? \n另請製作成互動式HTML 輔助理解學習。\n資料不足部分可透過上網查詢補充。\n\n-------------\n\n  ### 核心結論：絕非「不論條款如何，只能理賠一處（擇高）」\n\n  在保險實務中，保險公司常以**「達文西手術無論單孔或多孔，器械與內視鏡均進入同一腹腔／胸腔，屬於同一手術視野或同一切口\n  」**為由，依「同一次手術但書」強行主張僅能擇高理賠一項。\n\n  此種抗辯在醫學外科學與保險法理上均屬嚴重謬誤與擴張解釋：\n\n  1. 「手術切口／孔道（Incision/Port）」≠「手術部位（Surgical\n  Site）」：微創或達文西之皮膚穿刺孔只是進入體腔的「通路」，右上腹的膽囊與骨盆腔的卵巢／子宮，在解剖系統、供血神經、組\n  織剝離與切除範圍均完全獨立，絕非同一手術位置。\n  2. 「手術視野（Surgical\n  Field）」在微創時代具獨立性與切換性：達文西手臂處理不同病灶時，需進行機器人重新擺位（Redocking）或轉向鏡頭，兩者視野\n  互不重疊。更重要的是，絕大多數保單條款從未出現「手術視野」四個字，保險公司無權私設契約所無之限制。\n  3.\n  不得懲罰微創醫療：若保戶為了多領一項理賠被迫在肚皮劃開兩道15公分大傷口（傳統開腹），而選擇低創傷、高精密之達文西卻遭\n  苛扣，完全違背《保險法》第54條第2項有利解釋原則與「醫療替代性原則」。\n  ──────\n  ### 一、五大保單條款理賠型態差異深度對照\n\n  理賠是否能爭取「分別給付」，核心繫於個別保單的手術條款但書文字：\n\n   條款型態             │ 典型約定文字（但書） │ 微創／達文西跨部位認… │ 理賠結果與實務認定    │ 保戶爭取勝率\n  ─────────────────────┼──────────────────────┼────────────────────────────┼─────────────────────┼─────────────────────\n   A型：同次手術限額型 │ 「同一次手術中接受兩 │ 以「進出手術室一次／同一次 │ 僅擇高給付 1        │ 低(除非能證明分次麻\n   (最嚴格舊約)        │ 項以上手術時，按最高 │ 麻醉」為限制，無「手術位置 │ 項（契約文義明確限  │ 醉或非同次手術)\n                       │ 一項給付。」         │ 」除外門檻。               │ 縮）                │\n   B型：同一手術位置型 │ 「同一次手術中於**同 │ 但書限制要件為**「同一位置 │ 應分別給付 2        │ 極高(援引評議110評1\n   (最常見手術險)      │ 一手術位置（或部位） │ ／部位」**。達文西膽囊與卵 │ 項（兩項保險金相加  │ 048號)\n                       │ **接受兩項以上手術時 │ 巢解剖位置截然不同，不符但 │ ）                  │\n                       │ ，按最高一項給付。」 │ 書要件！                   │                     │\n   C型：金管會示範條款 │ 「...但同一次手術中  │ 須同時滿足三個要件：①同次  │ 各項手術限額分別計  │ 極高(援引評議112評3\n   型(標準實支實付)    │ 於同一手術位置接受兩 │ 手術、②同一手術位置、③兩項 │ 算（提高可賠總上限  │ 551號)\n                       │ 項器官以上手術時，按 │ 器官以上。若位置不同或同器 │ ）                  │\n                       │ 最高一項計算。」     │ 官不同位置，無但書適用！   │                     │\n   D型：主手術+次手術  │ 「主要手術按 100%    │ 若同位置，次手術享 50%     │ 至少給付 150%       │ 極高(絕非僅賠最高一\n   折半型(新光等現代條 │ 全額給付；其餘手術按 │ 折半保障；若經主張為「不同 │ 或兩項全額          │ 項)\n   款)                 │ 50% 計算給付。」     │ 位置」，兩項皆應 100%      │                     │\n                       │                      │ 分別給付！                 │                     │\n   E型：逐項分別計算型 │ 「被保險人同一住院期 │ 契約無同次或同位置合併限制 │ 各自 100% 分別給付  │ 100%(條款自始無除外\n   (無但書優質約)      │ 間接受兩項以上手術時 │ ，只要各自具備醫療必要性且 │                     │ 限制)\n                       │ ，其各項手術費用分別 │ 非連帶附隨步驟，全額給付。 │                     │\n                       │ 計算。」             │                            │                     │\n  ──────\n");
const out2 = convertBoxTablesToGFM(out1);
console.log("=== OUTPUT OF convertBoxTablesToGFM ===");
console.log(out2);

const out3 = cleanAndBeautifyText("> qurey 手術險理賠常遇到同一次手術多處多部位如何理賠的問題，\n對於傳統手術可能是兩處傷口視野，有的條款擇高理賠，有的分別理賠兩處，現在醫學進步，有的透過達文西處理不同部位，不論單孔、多孔達文西，若理賠以手術視野來論，不論條款如何只能理賠一處(擇高)手術險?\n\n請說明不同條款理賠差異、理賠應該長什麼樣子? 保戶遇到不公該如何主張權益? \n另請製作成互動式HTML 輔助理解學習。\n資料不足部分可透過上網查詢補充。\n\n-------------\n\n  ### 核心結論：絕非「不論條款如何，只能理賠一處（擇高）」\n\n  在保險實務中，保險公司常以**「達文西手術無論單孔或多孔，器械與內視鏡均進入同一腹腔／胸腔，屬於同一手術視野或同一切口\n  」**為由，依「同一次手術但書」強行主張僅能擇高理賠一項。\n\n  此種抗辯在醫學外科學與保險法理上均屬嚴重謬誤與擴張解釋：\n\n  1. 「手術切口／孔道（Incision/Port）」≠「手術部位（Surgical\n  Site）」：微創或達文西之皮膚穿刺孔只是進入體腔的「通路」，右上腹的膽囊與骨盆腔的卵巢／子宮，在解剖系統、供血神經、組\n  織剝離與切除範圍均完全獨立，絕非同一手術位置。\n  2. 「手術視野（Surgical\n  Field）」在微創時代具獨立性與切換性：達文西手臂處理不同病灶時，需進行機器人重新擺位（Redocking）或轉向鏡頭，兩者視野\n  互不重疊。更重要的是，絕大多數保單條款從未出現「手術視野」四個字，保險公司無權私設契約所無之限制。\n  3.\n  不得懲罰微創醫療：若保戶為了多領一項理賠被迫在肚皮劃開兩道15公分大傷口（傳統開腹），而選擇低創傷、高精密之達文西卻遭\n  苛扣，完全違背《保險法》第54條第2項有利解釋原則與「醫療替代性原則」。\n  ──────\n  ### 一、五大保單條款理賠型態差異深度對照\n\n  理賠是否能爭取「分別給付」，核心繫於個別保單的手術條款但書文字：\n\n   條款型態             │ 典型約定文字（但書） │ 微創／達文西跨部位認… │ 理賠結果與實務認定    │ 保戶爭取勝率\n  ─────────────────────┼──────────────────────┼────────────────────────────┼─────────────────────┼─────────────────────\n   A型：同次手術限額型 │ 「同一次手術中接受兩 │ 以「進出手術室一次／同一次 │ 僅擇高給付 1        │ 低(除非能證明分次麻\n   (最嚴格舊約)        │ 項以上手術時，按最高 │ 麻醉」為限制，無「手術位置 │ 項（契約文義明確限  │ 醉或非同次手術)\n                       │ 一項給付。」         │ 」除外門檻。               │ 縮）                │\n   B型：同一手術位置型 │ 「同一次手術中於**同 │ 但書限制要件為**「同一位置 │ 應分別給付 2        │ 極高(援引評議110評1\n   (最常見手術險)      │ 一手術位置（或部位） │ ／部位」**。達文西膽囊與卵 │ 項（兩項保險金相加  │ 048號)\n                       │ **接受兩項以上手術時 │ 巢解剖位置截然不同，不符但 │ ）                  │\n                       │ ，按最高一項給付。」 │ 書要件！                   │                     │\n   C型：金管會示範條款 │ 「...但同一次手術中  │ 須同時滿足三個要件：①同次  │ 各項手術限額分別計  │ 極高(援引評議112評3\n   型(標準實支實付)    │ 於同一手術位置接受兩 │ 手術、②同一手術位置、③兩項 │ 算（提高可賠總上限  │ 551號)\n                       │ 項器官以上手術時，按 │ 器官以上。若位置不同或同器 │ ）                  │\n                       │ 最高一項計算。」     │ 官不同位置，無但書適用！   │                     │\n   D型：主手術+次手術  │ 「主要手術按 100%    │ 若同位置，次手術享 50%     │ 至少給付 150%       │ 極高(絕非僅賠最高一\n   折半型(新光等現代條 │ 全額給付；其餘手術按 │ 折半保障；若經主張為「不同 │ 或兩項全額          │ 項)\n   款)                 │ 50% 計算給付。」     │ 位置」，兩項皆應 100%      │                     │\n                       │                      │ 分別給付！                 │                     │\n   E型：逐項分別計算型 │ 「被保險人同一住院期 │ 契約無同次或同位置合併限制 │ 各自 100% 分別給付  │ 100%(條款自始無除外\n   (無但書優質約)      │ 間接受兩項以上手術時 │ ，只要各自具備醫療必要性且 │                     │ 限制)\n                       │ ，其各項手術費用分別 │ 非連帶附隨步驟，全額給付。 │                     │\n                       │ 計算。」             │                            │                     │\n  ──────\n");
console.log("=== OUTPUT OF cleanAndBeautifyText ===");
console.log(out3);
