const fs = require('fs');

const rawText = `> qurey 手術險理賠常遇到同一次手術多處多部位如何理賠的問題，
對於傳統手術可能是兩處傷口視野，有的條款擇高理賠，有的分別理賠兩處，現在醫學進步，有的透過達文西處理不同部位，不論單孔、多孔達文西，若理賠以手術視野來論，不論條款如何只能理賠一處(擇高)手術險?

請說明不同條款理賠差異、理賠應該長什麼樣子? 保戶遇到不公該如何主張權益? 
另請製作成互動式HTML 輔助理解學習。
資料不足部分可透過上網查詢補充。

-------------

  ### 核心結論：絕非「不論條款如何，只能理賠一處（擇高）」

  在保險實務中，保險公司常以**「達文西手術無論單孔或多孔，器械與內視鏡均進入同一腹腔／胸腔，屬於同一手術視野或同一切口
  」**為由，依「同一次手術但書」強行主張僅能擇高理賠一項。

  此種抗辯在醫學外科學與保險法理上均屬嚴重謬誤與擴張解釋：

  1. 「手術切口／孔道（Incision/Port）」≠「手術部位（Surgical
  Site）」：微創或達文西之皮膚穿刺孔只是進入體腔的「通路」，右上腹的膽囊與骨盆腔的卵巢／子宮，在解剖系統、供血神經、組
  織剝離與切除範圍均完全獨立，絕非同一手術位置。
  2. 「手術視野（Surgical
  Field）」在微創時代具獨立性與切換性：達文西手臂處理不同病灶時，需進行機器人重新擺位（Redocking）或轉向鏡頭，兩者視野
  互不重疊。更重要的是，絕大多數保單條款從未出現「手術視野」四個字，保險公司無權私設契約所無之限制。
  3.
  不得懲罰微創醫療：若保戶為了多領一項理賠被迫在肚皮劃開兩道15公分大傷口（傳統開腹），而選擇低創傷、高精密之達文西卻遭
  苛扣，完全違背《保險法》第54條第2項有利解釋原則與「醫療替代性原則」。
  ──────
  ### 一、五大保單條款理賠型態差異深度對照

  理賠是否能爭取「分別給付」，核心繫於個別保單的手術條款但書文字：

   條款型態             │ 典型約定文字（但書） │ 微創／達文西跨部位認… │ 理賠結果與實務認定    │ 保戶爭取勝率
  ─────────────────────┼──────────────────────┼────────────────────────────┼─────────────────────┼─────────────────────
   A型：同次手術限額型 │ 「同一次手術中接受兩 │ 以「進出手術室一次／同一次 │ 僅擇高給付 1        │ 低(除非能證明分次麻
   (最嚴格舊約)        │ 項以上手術時，按最高 │ 麻醉」為限制，無「手術位置 │ 項（契約文義明確限  │ 醉或非同次手術)
                       │ 一項給付。」         │ 」除外門檻。               │ 縮）                │
   B型：同一手術位置型 │ 「同一次手術中於**同 │ 但書限制要件為**「同一位置 │ 應分別給付 2        │ 極高(援引評議110評1
   (最常見手術險)      │ 一手術位置（或部位） │ ／部位」**。達文西膽囊與卵 │ 項（兩項保險金相加  │ 048號)
                       │ **接受兩項以上手術時 │ 巢解剖位置截然不同，不符但 │ ）                  │
                       │ ，按最高一項給付。」 │ 書要件！                   │                     │
   C型：金管會示範條款 │ 「...但同一次手術中  │ 須同時滿足三個要件：①同次  │ 各項手術限額分別計  │ 極高(援引評議112評3
   型(標準實支實付)    │ 於同一手術位置接受兩 │ 手術、②同一手術位置、③兩項 │ 算（提高可賠總上限  │ 551號)
                       │ 項器官以上手術時，按 │ 器官以上。若位置不同或同器 │ ）                  │
                       │ 最高一項計算。」     │ 官不同位置，無但書適用！   │                     │
   D型：主手術+次手術  │ 「主要手術按 100%    │ 若同位置，次手術享 50%     │ 至少給付 150%       │ 極高(絕非僅賠最高一
   折半型(新光等現代條 │ 全額給付；其餘手術按 │ 折半保障；若經主張為「不同 │ 或兩項全額          │ 項)
   款)                 │ 50% 計算給付。」     │ 位置」，兩項皆應 100%      │                     │
                       │                      │ 分別給付！                 │                     │
   E型：逐項分別計算型 │ 「被保險人同一住院期 │ 契約無同次或同位置合併限制 │ 各自 100% 分別給付  │ 100%(條款自始無除外
   (無但書優質約)      │ 間接受兩項以上手術時 │ ，只要各自具備醫療必要性且 │                     │ 限制)
                       │ ，其各項手術費用分別 │ 非連帶附隨步驟，全額給付。 │                     │
                       │ 計算。」             │                            │                     │
  ──────
  ### 二、合理解賠「應該長什麼樣子」？（四大審核原則）
`;

const isGfmTableSep = (l) => {
  const trimmed = l.trim();
  if (!trimmed || /^[─━═┼+┌┏╔└┗╚├┣╠┤┫╣┬┳╦┴┻╩]/.test(trimmed)) return false;
  if (!/^[|\-:\s]+$/.test(trimmed) || !trimmed.includes('-')) return false;
  const parts = trimmed.split('|').map(s => s.trim()).filter(Boolean);
  return parts.length >= 1 && parts.every(s => /^:?-+:?$/.test(s));
};

const parseTableBlockImproved = (lines) => {
  if (lines.length < 2) return null;

  let sepIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (/^[─━═\-+┼╂┿|│┃├┣╠┤┫╣\s]+$/.test(l) && (/[┼╂┿+]/.test(l) || (/[─━═\-]/.test(l) && /[|│┃]/.test(l)))) {
      sepIdx = i;
      break;
    }
  }

  if (sepIdx <= 0) return null;

  let headerLineIdx = sepIdx - 1;
  while (headerLineIdx >= 0 && /^[┌┏╔─━═┬┳╦+\-\s]+$/.test(lines[headerLineIdx].trim()) && !/[│┃|]/.test(lines[headerLineIdx])) {
    headerLineIdx--;
  }
  if (headerLineIdx < 0) return null;

  const headerLine = lines[headerLineIdx];
  const sepLine = lines[sepIdx];

  const isBoxDrawing = /[│┃┼─━═├┤┬┴]/.test(headerLine) || /[│┃┼─━═├┤┬┴]/.test(sepLine);
  const vSepRegex = isBoxDrawing ? /[│┃]/ : /[|]/;

  const splitRow = (line) => {
    let s = line.trim();
    if (s.startsWith('│') || s.startsWith('┃') || s.startsWith('|')) {
      s = s.slice(1);
    }
    if (s.endsWith('│') || s.endsWith('┃') || s.endsWith('|')) {
      s = s.slice(0, -1);
    }
    return s.split(vSepRegex).map(c => c.trim());
  };

  let headers = splitRow(headerLine);
  const expectedColCount = headers.length;
  if (expectedColCount === 0) return null;

  const rawRows = [];
  for (let i = sepIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^[└┗╚─━═┴┻╩├┣╠┤┫╣┼╂┿+\s]+$/.test(trimmed)) {
      continue;
    }

    const parts = splitRow(line);
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

const convertBoxTablesToGFMImproved = (text) => {
  if (!text) return '';
  const lines = text.split('\n');
  const result = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if next line is a separator line
    const isBoxSep = (l) => /^[─━═\-+┼╂┿|│┃├┣╠┤┫╣\s]+$/.test(l) && (/[┼╂┿+]/.test(l) || (/[─━═\-]/.test(l) && /[|│┃]/.test(l)));
    const hasColSep = (l) => /[│┃]/.test(l) || (/\|/.test(l) && !l.startsWith('| ---'));

    // If next line is already a valid standard GFM separator, do not treat as an unparsed box table
    if (i + 1 < lines.length && isGfmTableSep(lines[i + 1])) {
      result.push(line);
      i++;
      continue;
    }

    // Skip top border if present
    const isTopBorder = /^[┌┏╔─━═┬┳╦+\-\s]+$/.test(trimmed) && !/[│┃|]/.test(trimmed) && (/[┌┏╔]/.test(trimmed) || /^[+\-][+\-\s]+$/.test(trimmed));
    let checkIdx = i;
    let headerIdx = i;
    if (isTopBorder && i + 2 < lines.length && hasColSep(lines[i + 1].trim()) && isBoxSep(lines[i + 2].trim())) {
      headerIdx = i + 1;
      checkIdx = i + 1;
    }

    if (checkIdx + 1 < lines.length && hasColSep(lines[checkIdx].trim()) && isBoxSep(lines[checkIdx + 1].trim())) {
      const tableLines = [lines[headerIdx], lines[checkIdx + 1]];
      i = checkIdx + 2;
      while (i < lines.length) {
        const rowLine = lines[i];
        const rowTrimmed = rowLine.trim();
        if (!rowTrimmed) break;
        if (/^#{1,6}\s+/.test(rowTrimmed) || (/^[─━═\-]{3,}$/.test(rowTrimmed) && !/[┼+]/.test(rowTrimmed))) {
          break;
        }
        if (hasColSep(rowTrimmed) || /^[└┗╚─━═┴┻╩├┣╠┤┫╣┼╂┿+\s]+$/.test(rowTrimmed)) {
          tableLines.push(rowLine);
          i++;
        } else {
          break;
        }
      }

      const gfmTable = parseTableBlockImproved(tableLines);
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

const appCode = fs.readFileSync('src/App.jsx', 'utf8');

const parseTableBlockMatch = appCode.slice(appCode.indexOf('const isDefinitelyNotMermaid ='), appCode.indexOf('const parseMarkdownToHtml ='));
const fnBuilder = new Function(parseTableBlockMatch + '\nreturn { repairAIArtifacts, convertBoxTablesToGFM, wrapLooseMermaid, cleanAndBeautifyText };');
const { repairAIArtifacts, convertBoxTablesToGFM, wrapLooseMermaid, cleanAndBeautifyText } = fnBuilder();

console.log("=== STEP 1: repairAIArtifacts ===");
const t1 = repairAIArtifacts(rawText);

console.log("=== STEP 2: convertBoxTablesToGFM ===");
const t2 = convertBoxTablesToGFM(t1);
console.log(t2.slice(t2.indexOf('條款型態'), t2.indexOf('### 二、')));

console.log("=== STEP 3: cleanAndBeautifyText ===");
const beautified = cleanAndBeautifyText(rawText);
console.log("=== AFTER cleanAndBeautifyText, table part: ===");
console.log(beautified.slice(beautified.indexOf('條款型態'), beautified.indexOf('### 二、')));

console.log("=== STEP 4: parseMarkdownToHtml WITH IMPROVED FUNCTIONS ===");
const preprocessedImproved = wrapLooseMermaid(convertBoxTablesToGFMImproved(repairAIArtifacts(beautified)));
console.log("=== preprocessedImproved table part: ===");
console.log(preprocessedImproved.slice(preprocessedImproved.indexOf('條款型態'), preprocessedImproved.indexOf('### 二、')));

console.log("=== STEP 5: Test boxedTable with full borders ===");
const boxedTable = `
┌────────┬────────┐
│ Header │ Value  │
├────────┼────────┤
│ A型：1 │ Val A  │
│ (備註) │ Val A2 │
│ B型：2 │ Val B  │
└────────┴────────┘
`;
console.log(convertBoxTablesToGFMImproved(boxedTable));
