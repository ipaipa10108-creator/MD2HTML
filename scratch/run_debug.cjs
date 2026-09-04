const fs = require('fs');

const userInput = `> qurey 手術險理賠常遇到同一次手術多處多部位如何理賠的問題，
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
`;

// Let's test parseTableBlock and cleanAndBeautifyText on this
const AppJsx = fs.readFileSync('src/App.jsx', 'utf8');

// Extract parseTableBlock and convertBoxTablesToGFM and cleanAndBeautifyText
// Or test directly with node
fs.writeFileSync('scratch/test_user_paste.cjs', `
const fs = require('fs');
${userInput ? 'const rawText = ' + JSON.stringify(userInput) + ';' : ''}

// Read App.jsx and eval the functions
const appCode = fs.readFileSync('src/App.jsx', 'utf8');

// We can extract convertBoxTablesToGFM and parseTableBlock
const fnStart = appCode.indexOf('const parseTableBlock =');
const fnEnd = appCode.indexOf('// Function to detect and wrap loose un-fenced mermaid');
const tableCode = appCode.slice(fnStart, fnEnd);

const repairStart = appCode.indexOf('const repairAIArtifacts =');
const repairEnd = appCode.indexOf('// 2. Parse a block of table lines');
const repairCode = appCode.slice(repairStart, repairEnd);

eval(repairCode);
eval(tableCode);

console.log("--- TEST convertBoxTablesToGFM ---");
const converted = convertBoxTablesToGFM(repairAIArtifacts(rawText));
console.log(converted);
`);
