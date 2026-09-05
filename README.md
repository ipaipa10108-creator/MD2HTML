# 🚀 萬能 Markdown 編輯轉換器 | Universal Markdown Editor Converter

[繁體中文](#繁體中文說明書) | [English](#english-user-manual)

---

## 繁體中文說明書

歡迎使用 **萬能 Markdown 編輯轉換器**！這是一個基於 Vite、React 與 Tailwind CSS 打造的極致美觀、高效單頁網頁應用程式 (SPA)，同時支援 PWA 漸進式安裝，可加入手機主畫面作為獨立 App 使用。

### 🌟 核心特色功能

1. **三向即時互轉同步**
   - **Markdown 編輯區**、**HTML 原始碼編輯區** 與 **美化閱讀排版區** 三者無縫即時同步。
   - 雙擊「美化閱讀排版」即可啟用 `contentEditable` 直覺式視覺編輯模式，修改內容亦會即時同步回 Markdown 及 HTML。
   - 針對 Android/iOS 行動端輸入法進行了防抖設計，僅在您離開編輯（Blur）或點擊「儲存」時觸發同步，確保手機打字 100% 順暢不跳游標。

2. **彈性版面配置 ＆ 雙欄同步捲動**
   - 支援**單欄模式**或**雙欄對照模式**，可在工具列下拉選單自訂左右兩欄的顯示內容（Markdown / HTML / 閱讀格式三選一）。
   - **雙欄兩邊同步捲動**：在雙欄對照模式下，點選左欄「🔗 同步捲動」按鈕，滾動左側或右側皆會依滾動比例（Scroll Ratio）平滑同步聯動，對照長文與排版時流暢精準。
   - 工具列在行動端滑動時自動隱藏、點擊時浮現，維持最大閱讀空間。

3. **行動端閱讀排版工具列緊湊化優化**
   - 在窄螢幕手機（如 360px–414px）單欄「美化閱讀排版」頁面中：
     - 「快速跳至段落」選單精簡為 `📑 段落` 與彈性寬度。
     - 「Mermaid 底圖」選單以精緻圖標 `📊` 代替冗長標籤文字。
     - 複製按鈕精簡為 `HTML` 與 `純文字`。
     - 確保「**匯出/分享**」及各項功能按鈕在手機端完整舒展顯示，不再受擠壓。

4. **⚙️ 偏好設定中心 ＆ 📖 新手使用教學**
   - 左欄工具列與單欄頂部皆設有「齒輪 (⚙️)」設定按鈕，呼出毛玻璃風格設定面板：
     - **功能偏好設定**：
       - **貼上內容後自動跳轉**：在單欄 Markdown 編輯器貼上文字後自動切換至「美化閱讀排版」立即檢視。
       - **接收分享文字時自動啟動「智慧美化」**：從手機其他 App 分享文字進本工具時自動修復排版。
       - **自動美化後自動切換至「美化閱讀排版」**：智慧美化後自動導航至閱讀視角。
       - **雙欄模式預設開啟「同步捲動」**：進入雙欄對照時自動鎖定左右兩欄同步聯動。
     - **新手使用教學**：
       - 專為初次接觸使用者提供系統化圖文指南，快速掌握三向即時編輯、雙欄同步、AI 智慧美化、多樣化匯出與 PWA 捷徑。

5. **智慧圖片匯出與自由切片**
   - 整合 `html2canvas` 與 `JSZip`，將文件渲染成 2x 高清圖片。
   - 支援**整頁輸出**、**按張數均等裁切**或**按固定像素高度裁切**。
   - 提供「極簡白」與「質感暗黑」兩種背景風格。
   - 各切片圖片具備獨立勾選框，可自由選擇後**一鍵打包下載 ZIP**。

6. **PDF 匯出與分享（支援圖片版與文字版）**
   - **圖片版 PDF**：完美還原美化排版樣式，支援一鍵下載與系統分享。
   - **文字版 PDF**：動態載入高級中文向量字型（**霞鶩文楷 Lite**，約 14MB），產生 100% 可選取複製與全文搜尋的 PDF 文件。
   - 所有匯出選項整合於單一下拉選單，介面乾淨俐落。

7. **美化 HTML 匯出（雙欄大綱排版）**
   - 支援下載或分享一個精緻排版的獨立 HTML 文件，開啟後免安裝、免網路即可閱讀。
   - **自適應雙欄佈局**：
     - 桌機 / 平板（橫向）：預設雙欄並排——左側為快速跳轉的**文件大綱 (TOC)**，右側為**文章主體**。
     - 手機：預設單欄，點擊頂部漢堡選單 `☰` 可展開大綱，點擊段落後自動收合。
   - **大綱折疊按鈕**：桌機端大綱右邊緣有一個懸浮圓形箭頭按鈕，點擊可流暢地展開/收合左欄大綱，使內文版面自動適應。
   - **Scrollspy 滾動偵測**：讀者滾動時，左側大綱對應的段落標題自動高亮，讓使用者清楚知道目前閱讀位置。
   - **A+ / A- 字體大小調整**：
     - 桌機：右上角固定按鈕。
     - 手機/平板：標頭列右側，可即時放大 (最大 24px) / 縮小 (最小 12px) 全頁字體，偏好自動儲存。
   - **深色 / 淺色主題切換**：右上角（桌機）或標頭內（手機/平板）切換，偏好自動儲存。
   - **客製化檔名規律**：
     - 含 `#` 標題：`md2html_標題_YYYYMMDD.html`（自動去除 `#` 字首）。
     - 無 `#` 標題：`md2html_YYYYMMDDssss.html`（完整毫秒時間戳記）。
   - **智慧下載策略**：桌機（非觸控）直接下載，由 OS 另存對話框讓使用者改名；手機/平板先彈出「確認檔名」對話框。

8. **深度社群分享優化 ＆ Web Share Target 接收**
   - 在支援的行動裝置上，直接呼叫系統 Web Share API 將圖片、PDF 或 HTML 傳送至 LINE、Messenger 等 App。
   - **複製圖片至剪貼簿（PC / LINE 最佳方案）**：直接將 PNG Blob 存入剪貼簿，在 LINE 對話框按 `Ctrl + V` 即可無縫傳送。
   - **Web Share Target 接收**：手機其他 App（如瀏覽器、LINE、AI 視窗）選取文字後點選系統「分享」，可直接選取本工具開啟並自動匯入、智慧美化與排版！

9. **PWA 漸進式網頁應用**
   - 具備現代漸層向量圖標與 Web App Manifest，支援加入手機主畫面或瀏覽器桌面捷徑，離線時仍可使用。

10. **歷史記錄管理（Undo / Redo）**
    - 400ms 輸入防抖機制，自動記錄編輯歷史，支援無限次上一步與下一步。

11. **毛玻璃風格確認對話框**
    - 全客製毛玻璃視覺 Modal，取代瀏覽器原生 `window.confirm`，用於清除內容、確認檔名等關鍵操作。

12. **Mermaid 向量圖表即時視覺化與容錯支援**
    - 內建 `mermaid.js` 向量繪圖引擎，支援流程圖 (Flowchart)、時序圖 (Sequence)、甘特圖 (Gantt)、圓餅圖 (Pie) 等各類專業圖表。
    - **深淺色主題自適應**：圖表根據白底/黑底主題自動套用最佳化配色。
    - **全匯出管道整合**：向量圖表完整嵌入於匯出之獨立 HTML、2x 高畫質切片圖片與 PDF 文件中。
    - **三向同步保護**：在視覺化閱讀區編輯時，透過特製 Turndown 規則完整保留 ```` ```mermaid ```` 原始碼，不遺失任何圖表定義。
    - **非標準語法寬容解析**：即使直接貼上未加反引號圍欄的 `mermaid\ngraph TD...` 鬆散語法，編輯器亦能自動容錯辨識並即時渲染出圖表。

13. **✨ AI 複製排版智慧修復 (Smart Beautify)**
    - 針對從 ChatGPT、Claude、Gemini、Antigravity、Claude Code 終端機等對話視窗複製文本時常見的排版缺陷，提供獨立「智慧美化」按鈕（採主動點擊觸發，不干擾標準格式輸入）：
      - **終端機／Unicode 框線表格轉 GFM**：自動識別終端機 CLI 輸出的 Unicode 繪圖字元表格（`│`, `─`, `┼`, `┌`, `└` 等）或 ASCII 表格（`+`, `-`, `|`），自動轉換為標準 GFM 表格。
      - **多行儲存格智慧換行整併**：支援將被換行切碎的儲存格內容或括號附註（如 `(最嚴格舊約)`）智慧整併為 `<br>` 換行，並依序號精準辨識獨立資料行，防止行被擠壓或誤整併為單一儲存格。
      - **GFM 表格防重複解析保護**：內建標準 GFM 分隔線偵測機制，避免重複點擊智慧美化或即時渲染時破壞原有 Markdown 表格結構。
      - **CLI 溢出橫幅過濾**：自動清除終端機輸出時夾帶的 `Diagram exceeds terminal width` 與 `Displayed as code block` 等提示雜訊。
      - **全形水平線標準化**：將全形連續橫線（`──────`）自動轉換為標準 Markdown 分隔線（`---`）。
      - **檔案標籤破碎斷行修復**：將被多個換行切碎的檔案路徑（如 `\n\napi/timeline.js\n`）自動聚合為流暢行內程式碼 (`` `api/timeline.js` ``)，並接合前後破碎語句。
      - **Emoji 標題階層化**：自動識別 `1. 🔍 ...` 升級為標準 Markdown 二級標題 (`## 1. 🔍`)；單獨 Emoji 標題（如 `📌 問題根因分析：`）升級為三級標題 (`### 📌`)。
      - **條目與清單美化**：自動將行尾帶冒號的非清單條目格式化為粗體項目符號 (`* **條目**：`)。
      - **Mermaid 區塊自動補全與提早閉合**：自動將未封閉或鬆散的 Mermaid 圖表程式碼補齊為標準圍欄代碼區塊，並能精確判斷非圖表內文提早結束圍欄，防止後續段落被吞入。
      - **完整歷史回溯**：智慧美化動作完整納入歷史佇列，隨時支援 `Ctrl + Z` 一鍵復原。

14. **🌐 線上發布與分享（雙方案自由切換 ＋ 零知識端對端加密 ＋ 發布歷史備份）**
    - **雙平台自由選擇（100% 免費、完全免綁信用卡）**：
      - ☁️ **Cloudflare Workers KV 方案**：極速邊緣運算，隨機短網址（8 碼），隱私度高、秒級發布生效。
      - 🐙 **GitHub REST API + GitHub Pages 方案**：純前端直連，免架設任何後端伺服器，自動推送到公開倉庫發布。
      - 支援同時配置兩種方案，發布時可一鍵自由切換指定要使用哪一個服務！
    - **零知識端對端密碼保護 (Client-Side AES-256-GCM)**：
      - 支援為發布文件自訂閱讀密碼，採用瀏覽器原生 Web Crypto API（PBKDF2 100,000 次金鑰衍生與 AES-256-GCM 高強度加密）。
      - 內容於瀏覽器本地加密後方上傳，伺服器與儲存庫僅保存密文；讀者打開短網址時直接在瀏覽器本地輸入密碼秒解密，無任何第三方窺探風險。
      - **社群卡片公開預覽**：加密文件的 Open Graph 社群標籤（`og:title`、`og:description`）保持公開，在 LINE、Facebook、Messenger 等各類社群軟體分享時依然呈現精美預覽摘要卡片。
    - **全方位分享與動態 QR Code**：
      - 自動產生專屬短網址，支援呼叫系統原生分享 (Web Share API) 一鍵轉發至 LINE 或任何行動 App，亦可一鍵複製連結。
      - 動態即時繪製高解析度 QR Code，方便手機掃描即刻閱讀。
    - **本機發布歷史管理中心（支援備份匯出與匯入）**：
      - 本地保存已發布文件的標題、短網址、提供者標籤與管理金鑰。
      - 支援從遠端伺服器或 GitHub 倉庫一鍵下架刪除文件。
      - **跨裝置無縫移轉**：提供「匯出 JSON」與「匯入 JSON（合併 / 覆蓋模式）」功能，更換手機或瀏覽器時輕鬆備份移轉所有發布紀錄與管理金鑰，不怕資料遺失。

---

### 🌐 線上發布與分享服務設定指南（100% 免費、完全免綁信用卡）

MD2HTML 支援兩種完全免費且免綁信用卡的線上短網址發布服務，您可以依個人習慣選擇設定其中一種（或兩者皆設定）：

#### 方案一：Cloudflare Workers KV（推薦：極速、隨機短網址）

> [!NOTE]
> Cloudflare 的 **Workers 基本運算** 與 **Workers KV（鍵值資料庫）** 在免費方案中**完全不需要綁定信用卡**！

##### 🛠️ 新版 Cloudflare 控制台詳細設定步驟（約 2 分鐘，避坑指引）：

1. **建立 KV 命名空間（資料庫）**：
   - 進入 [Cloudflare 控制台](https://dash.cloudflare.com/)。
   - 點擊左側選單的 **`Workers & Pages`**（在部分新版介面中位於 **`Storage & Databases`**）➔ 點選 **`KV`**。
   - 點擊右上角藍色的 **`Create a namespace`** 按鈕。
   - **Namespace Name** 輸入 **`MD_SHARES`** ➔ 點擊 **`Add`**。
2. **建立 Worker 服務**：
   - 點擊左側選單 **`Workers & Pages`** ➔ 點選 **`Create Application`** ➔ **`Create Worker`**。
   - 命名為 `mdshares`（或任何您喜歡的名稱）➔ 點擊 **`Deploy`**。
   - 點擊 **`Edit code`**，清空編輯器預設內容，將本專案 [`worker/worker.js`](file:///c:/Users/User/Desktop/@Antigravity/MD2HTML/MD2HTML/worker/worker.js) 的完整代碼複製貼上 ➔ 點擊右上角 **`Save and deploy`**。
3. **重要關鍵！正確綁定 KV Namespace（避免常見錯誤）**：
   - 回到該 Worker 的主頁面，看上方橫向選單列（在 `Deployments` 與 `Observability` 之間），點選 **`Bindings`** 標籤。
     *(註：若為傳統舊版介面，則位於 `Settings` ➔ `Variables and Secrets` ➔ `KV Namespace Bindings`)*。
   - 點擊 **`+ Add binding`**。
   - 左側選擇 **`KV namespace`** ➔ 點擊右下角藍色 **`Add Binding`**。
   - **Variable name（變數名稱）**：務必輸入大寫的 **`MY_KV`**（Worker 程式碼以此識別）。
   - **KV namespace**：點擊下拉選單，選取第 1 步建立的 **`MD_SHARES`**。
   - 點擊 **`Save and deploy`**（儲存並部署）。
   > [!CAUTION]
   > **避坑提醒**：千萬不要將 `MY_KV` 加在「Runtime variables and secrets」中的 `Text` 純文字變數！若誤設為 Text，Worker 會把 `MY_KV` 當成字串 `"MD_SHARES"`，執行時會出現 `env.MY_KV.put is not a function` 錯誤。務必確認是在 **`Bindings`** 標籤下綁定為真正的 **`KV namespace`**！
4. **填入 MD2HTML 即可使用**：
   - 複製您的 Worker 網址（例如 `https://mdshares.xxx.workers.dev`）。
   - 在 MD2HTML 點擊頂部或選單中的「🌐 線上發布與分享」➔ 選擇「☁️ Cloudflare KV」➔ 貼上網址即可開始發布！

---

#### 方案二：GitHub REST API + GitHub Pages（免架伺服器，純前端發布）

> [!NOTE]
> 若不想註冊 Cloudflare，可直接使用現有的 GitHub 帳號，由 MD2HTML 前端自動透過 GitHub REST API 推送到您的專屬公開倉庫儲存與發布！

##### 🛠️ 設定步驟（約 2 分鐘）：

1. **建立分享專用倉庫**：
   - 登入 GitHub ➔ 點擊右上角 **+** ➔ **New repository**。
   - 倉庫名稱輸入 `html-shares`（若改用其他名稱，後續在 MD2HTML 設定中對應填寫即可）。
   - 務必選擇 **Public（公開）**，並勾選 **Add a README file** ➔ 點擊 **Create repository**。
2. **開啟 GitHub Pages 託管**：
   - 進入該倉庫的 **Settings** ➔ 點選左側 **Pages**。
   - 在 **Build and deployment** ➔ **Branch** 下拉選單選擇 **`main`**，資料夾維持 **`/ (root)`** ➔ 點擊 **Save**。
3. **建立 GitHub Personal Access Token (PAT)**：
   - 點擊 GitHub 右上角個人頭像 ➔ **Settings** ➔ 滑到最下方點選 **Developer Settings**。
   - 選擇 **Personal access tokens** ➔ **Fine-grained tokens**（或 Tokens (classic)）➔ 點擊 **Generate new token**。
   - Token 名稱填寫 `MD2HTML Publish`，過期時間建議選擇最長或自訂。
   - **Repository access**：選擇 **Only select repositories**，選取剛建立的 `html-shares` 倉庫。
   - **Permissions**：找到 **Repository permissions** ➔ 將 **Contents** 權限設為 **Read and write**（讀取與寫入）。
   - 點擊 **Generate token**，並複製產生的 Token（格式通常為 `github_pat_...`）。
4. **填入 MD2HTML 即可使用**：
   - 在 MD2HTML 點擊「🌐 線上發布與分享」➔ 點選「🐙 GitHub Pages」。
   - 系統會自動辨識並帶入您的 GitHub 使用者名稱（亦可手動填寫），貼上剛剛複製的 Token 與倉庫名稱，即可開始發布！

---

### 📦 安裝與本地開發

請確保已安裝 [Node.js](https://nodejs.org/)。

1. **安裝依賴**
   ```bash
   npm install
   ```
2. **啟動開發伺服器**
   ```bash
   npm run dev
   ```
3. **編譯打包**
   ```bash
   npm run build
   ```

---

### 🚀 部署至 GitHub Pages

本專案支援 **GitHub Actions 全自動化部署** 與 **本機指令手動部署** 兩種方式：

#### 方式一：GitHub Actions 自動化部署（推薦，推送到 `main` 自動生效）
專案已內建 `.github/workflows/deploy.yml` 自動化工作流程：
1. 將代碼推送至 `main` 分支。
2. 進入 GitHub 倉庫頁面：**Settings** ➔ **Pages**。
3. 在 **Build and deployment** ➔ **Source** 下拉選單中，將原本的 `Deploy from a branch` 改選為 **`GitHub Actions`**。
4. 此後每次只要 `git push origin main`，GitHub 即會自動執行雲端建置並發布至 Pages，完全無需手動部署！

#### 方式二：本機指令手動部署（備援方式）
如維持使用 `gh-pages` 分支發布：
1. 確保遠端倉庫已正確關聯：
   ```bash
   git remote add origin https://github.com/您的帳號/您的倉庫名.git
   ```
2. 執行一鍵自動清除快取、編譯並發布：
   ```bash
   npm run deploy
   ```

---

<br/>

## English User Manual

Welcome to the **Universal Markdown Editor Converter**! A visually stunning, highly efficient Single-Page Application (SPA) built with Vite, React, and Tailwind CSS. Supports Progressive Web App (PWA) installation, powerful multi-pane real-time synchronization, and deep optimization for mobile/desktop sharing.

### 🌟 Key Features

1. **Three-Way Live Synchronization**
   - Seamless real-time updates across the **Markdown Editor**, **HTML Source Editor**, and **Reading Layout View**.
   - Double-click the Reading View to activate direct `contentEditable` visual editing; changes sync back to both Markdown and HTML instantly.
   - Debounced input for Android/iOS virtual keyboards — syncs only on `onBlur` or "Save", eliminating caret jumps on mobile.

2. **Flexible Layout Modes & Dual-Pane Synchronized Scrolling**
   - Switch between **Single Pane** and **Dual Pane** modes; customize each column content (Markdown / HTML / Reading) via dropdown.
   - **Dual-Pane Synchronized Scrolling**: In dual-column contrast mode, toggle "🔗 Sync Scroll" in the left pane toolbar. Scrolling either the left or right pane moves both sides in precise ratio-based synchronization, ensuring smooth side-by-side comparison.
   - Toolbar auto-hides on mobile scroll and reappears on tap to maximize reading space.

3. **Mobile Reading Toolbar Optimization**
   - On narrow mobile viewports (360px–414px) in the Reading Layout:
     - Heading navigation dropdown is compacted to `📑 Headings` with adaptive width.
     - Mermaid background select replaces verbose text with a sleek `📊` icon.
     - Copy buttons are streamlined to `HTML` and `Plain Text`.
     - The **"Export / Share"** dropdown and other actions remain completely visible without crowding or clipping.

4. **⚙️ Preferences Center & 📖 Beginner's Tutorial Guide**
   - Accessible via the gear icon (⚙️) on the left column and single-column top bar:
     - **Preferences Tab**:
       - **Auto-Jump on Paste**: Automatically switches from Markdown to Reading Layout after pasting text.
       - **Auto-Beautify on Shared Content**: Automatically fixes formatting when receiving text from other mobile apps.
       - **Auto-Switch to Reading View**: Automatically transitions to the Reading Layout after beautification.
       - **Dual-Pane Sync Scroll by Default**: Persistently remembers dual-pane synchronized scrolling preference.
     - **Tutorial Guide Tab**:
       - A step-by-step interactive manual for newcomers covering 3-way synchronization, dual split-view, AI Smart Beautifier, exports, and PWA integration.

5. **Smart Image Export & Custom Slicing**
   - Powered by `html2canvas` + `JSZip` for 2× hi-res rendering.
   - Modes: **Full Document**, **Equal Slices (by count)**, or **Fixed-Height Slices (by pixels)**.
   - Two background styles: "Minimalist Light" and "Chic Dark".
   - Checkbox per slice; **one-click ZIP download** of selected slices.

6. **PDF Export & Sharing (Image & Selectable-Text Versions)**
   - **Image PDF**: Captures exact CSS/HTML styling as high-definition PDF images.
   - **Text PDF**: Dynamically embeds the **LXGW WenKai Lite** Chinese font (~14MB) for 100% copyable, selectable, and searchable text.
   - All options consolidated in a single elegant dropdown menu.

7. **Styled HTML Export (Dual-Column Outline Layout)**
   - Downloads or shares a fully self-contained, beautifully styled HTML document — no internet required to read.
   - **Responsive Split Layout**:
     - Desktop / Landscape Tablet: Default dual-column — left TOC sidebar + right article body.
     - Mobile: Single column; tap `☰` in the header to expand TOC; auto-collapses after navigation.
   - **Sidebar Toggle Button**: A floating circular arrow button on the sidebar's right edge collapses/expands the TOC panel on desktop.
   - **Scrollspy**: Active heading is automatically highlighted in the sidebar as you scroll.
   - **A+ / A- Font Size Controls**:
     - Desktop: Fixed top-right buttons.
     - Mobile / Tablet: Inline buttons in the header bar. Range: 12px–24px; persisted to `localStorage`.
   - **Dark / Light Theme Toggle**: Available in the top-right panel (desktop) or header bar (mobile/tablet); preference persisted.
   - **Custom Filename Rules**:
     - With `#` heading: `md2html_Title_YYYYMMDD.html` (strips the `#` prefix).
     - Without heading: `md2html_YYYYMMDDssss.html` (full millisecond timestamp).
   - **Smart Download Strategy**: Desktop (non-touch) downloads directly via OS Save dialog; mobile/tablet shows a filename confirmation modal first.

8. **Deep Social Share Optimization & Web Share Target API**
   - Invokes the Web Share API on supported devices to send images, PDFs, or HTML to LINE, Messenger, etc.
   - **Copy Image to Clipboard (PC / LINE)**: Writes PNG blob directly to clipboard — paste with `Ctrl + V` in LINE.
   - **Web Share Target**: Select text in any external mobile app (browsers, LINE, ChatGPT) and tap "Share" to open MD2HTML with automatic import, smart beautification, and formatted rendering!

9. **PWA — Progressive Web App**
   - Custom gradient vector icon + Web App Manifest; installable to mobile homescreen or desktop shortcut; offline-capable.

10. **History Management (Undo / Redo)**
    - 400ms debounced state stack for unlimited undo and redo.

11. **Custom Frosted-Glass Dialogs**
    - Premium glassmorphic modals replace native `window.confirm` for clear, delete, and filename confirmation actions.

12. **Mermaid Vector Diagram Rendering & Fault-Tolerant Parsing**
    - Integrated `mermaid.js` engine to render flowcharts, sequence diagrams, Gantt charts, pie charts, and more directly into responsive vector SVGs.
    - **Theme Adaptive**: Automatically switches diagram palettes between Light and Dark modes.
    - **Full Export Pipeline Integration**: Rendered diagrams are seamlessly embedded into standalone HTML exports, 2x sliced PNGs, and PDF documents.
    - **Round-Trip Editing Preservation**: Custom Turndown rules guarantee ```` ```mermaid ```` code blocks remain intact during visual `contentEditable` sync.
    - **Loose Syntax Tolerance**: Automatically recognizes un-fenced `mermaid\ngraph TD...` blocks pasted without backticks.

13. **✨ AI Copy Smart Beautifier**
    - Designed specifically to fix messy text copied from AI chat interfaces (ChatGPT, Claude, Gemini, Antigravity, Claude Code CLI) via an opt-in toolbar button without altering standard user input:
      - **Terminal / Unicode Box-Drawing Tables to GFM**: Automatically converts CLI box-drawing tables (`│`, `─`, `┼`, `┌`, `└`) or ASCII tables (`+`, `-`, `|`) into standard GitHub Flavored Markdown (GFM) tables.
      - **Multi-Line Cell Auto-Merge & `<br>` Preservation**: Intelligently consolidates wrapped cell annotations (e.g. parenthetical notes) into clean `<br>` tags while preserving distinct rows based on list item / type prefixes.
      - **GFM Table Repetition Guard**: Prevents re-parsing or corrupting tables that are already in valid GFM syntax.
      - **CLI Terminal Banner Cleanup**: Strips terminal noise lines such as `Diagram exceeds terminal width` and `Displayed as code block`.
      - **Fullwidth Horizontal Rule Normalization**: Automatically converts fullwidth Unicode dividers (`──────`) into standard Markdown dividers (`---`).
      - **Broken File Path Auto-Join**: Detects isolated file chip names separated by extraneous newlines and joins them into smooth inline code (`` `api/timeline.js` ``) while healing broken sentence structures.
      - **Emoji Title Elevation**: Elevates numbered emoji titles (e.g. `1. 🔍`) to Markdown `##` headings and standalone emoji headers to `###` headings.
      - **List Item Formatting**: Formats key lines ending in colons into crisp bold bullet points (`* **Key**:`).
      - **Mermaid Fence Enclosure & Early Closing**: Automatically wraps un-fenced Mermaid definitions in ```` ```mermaid ```` code blocks and detects non-diagram text to close fences early.
      - **Undo Support**: Integrated with the history stack, enabling full `Ctrl + Z` undo capability.

14. **🌐 Online Publishing & Universal Sharing (Dual-Provider + Zero-Knowledge Client-Side Encryption + Local History Backup)**
    - **Dual Free Providers (100% Free, Zero Credit Card Required)**:
      - ☁️ **Cloudflare Workers KV**: Instant global edge distribution, 8-character random short URLs, lightning-fast rendering.
      - 🐙 **GitHub REST API + GitHub Pages**: 100% serverless, direct client-side publishing pushing directly to your public repository.
      - Configure either or both providers; seamlessly switch between them directly on the publishing dialog!
    - **Zero-Knowledge Client-Side Password Protection (AES-256-GCM)**:
      - Protect published articles with a password using the browser's native Web Crypto API (PBKDF2 with 100,000 iterations & AES-256-GCM encryption).
      - Document content is encrypted locally on your device before uploading. Neither Cloudflare nor GitHub can see the plaintext. Readers decrypt in their browser in milliseconds upon password entry.
      - **Public Social Cards (Open Graph)**: Essential metadata tags (`og:title`, `og:description`) remain unencrypted, allowing LINE, Facebook, and Messenger to render rich snippet cards even for password-protected posts.
    - **Universal Sharing & Dynamic QR Code**:
      - One-click copy for custom short URLs; invokes the native Web Share API to send links straight to LINE, WhatsApp, or any mobile messaging app.
      - Dynamically renders high-resolution QR codes for immediate mobile camera scanning.
    - **Local Publishing History & Cloud Deletion**:
      - Stores published article history, provider tags, creation timestamps, and management secret tokens in `localStorage`.
      - Delete or take down published files from Cloudflare KV or GitHub Pages with a single click.
      - **JSON Export & Import (Merge / Replace)**: Easily backup and restore your publishing history and deletion keys across different mobile devices or browsers!

---

### 🌐 Online Publishing Setup Guide (100% Free & No Credit Card Needed)

MD2HTML supports two free publishing channels. You may configure either one or both based on your workflow:

#### Option 1: Cloudflare Workers KV (Recommended: Ultra-Fast, Random Short URLs)

> [!NOTE]
> Cloudflare's **Workers free tier** and **Workers KV** require **NO credit card verification**!

##### 🛠️ Setup Steps for the Modern Cloudflare Dashboard (Takes ~2 minutes):

1. **Create a KV Namespace**:
   - Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
   - In the left sidebar, navigate to **`Workers & Pages`** (or **`Storage & Databases`**) ➔ **`KV`**.
   - Click the blue **`Create a namespace`** button.
   - Enter **`MD_SHARES`** as the Namespace Name ➔ Click **`Add`**.
2. **Create the Worker**:
   - In the left sidebar, go to **`Workers & Pages`** ➔ **`Create Application`** ➔ **`Create Worker`**.
   - Name it `mdshares` (or any preferred name) ➔ Click **`Deploy`**.
   - Click **`Edit code`**, clear the default template, and copy-paste the entire code from [`worker/worker.js`](file:///c:/Users/User/Desktop/@Antigravity/MD2HTML/MD2HTML/worker/worker.js) ➔ Click **`Save and deploy`**.
3. **Crucial Step: Correctly Bind the KV Namespace**:
   - Go back to the Worker's main page. In the top navigation bar (between `Deployments` and `Observability`), click the **`Bindings`** tab.
     *(Note: in older dashboard layouts, this is under `Settings` ➔ `Variables and Secrets` ➔ `KV Namespace Bindings`)*.
   - Click **`+ Add binding`**.
   - Select **`KV namespace`** on the left ➔ Click the blue **`Add Binding`** button.
   - **Variable name**: Enter **`MY_KV`** in all uppercase (matching the code identifier).
   - **KV namespace**: Open the dropdown and select **`MD_SHARES`** created in Step 1.
   - Click **`Save and deploy`**.
   > [!CAUTION]
   > **Common Pitfall**: Do NOT add `MY_KV` as a `Text` variable under "Runtime variables and secrets"! If configured as Text, the Worker treats `MY_KV` as a raw string `"MD_SHARES"`, causing runtime errors like `env.MY_KV.put is not a function`. It MUST be bound under **`Bindings`** as a **`KV namespace`**!
4. **Enter into MD2HTML**:
   - Copy your Worker URL (e.g. `https://mdshares.xxx.workers.dev`).
   - In MD2HTML, click **"🌐 Online Publishing & Sharing"** in the top bar or menu ➔ Select **`Cloudflare KV`** ➔ Paste the Worker URL to publish!

---

#### Option 2: GitHub REST API + GitHub Pages (100% Serverless)

> [!NOTE]
> If you prefer not to use Cloudflare, publish directly using your GitHub account! MD2HTML commits HTML files directly to your public repository via GitHub's REST API.

##### 🛠️ Setup Steps (~2 minutes):

1. **Create a Dedicated Sharing Repository**:
   - On GitHub, click **+** ➔ **New repository**.
   - Name the repository `html-shares`.
   - Ensure it is set to **Public** and check **Add a README file** ➔ Click **Create repository**.
2. **Enable GitHub Pages**:
   - In the repository, go to **Settings** ➔ **Pages**.
   - Under **Build and deployment** ➔ **Branch**, select **`main`** with folder **`/ (root)`** ➔ Click **Save**.
3. **Generate a GitHub Personal Access Token (PAT)**:
   - Click your profile icon ➔ **Settings** ➔ scroll down to **Developer Settings**.
   - Select **Personal access tokens** ➔ **Fine-grained tokens** ➔ Click **Generate new token**.
   - Name: `MD2HTML Publish`.
   - **Repository access**: Select **Only select repositories** ➔ pick `html-shares`.
   - **Permissions**: Under **Repository permissions**, set **Contents** to **Read and write**.
   - Click **Generate token** and copy the generated token string (`github_pat_...`).
4. **Enter into MD2HTML**:
   - In MD2HTML, click **"🌐 Online Publishing & Sharing"** ➔ Select **`GitHub Pages`**.
   - Your username will be auto-detected (or entered manually). Paste the token and repository name to start publishing!

---

### 📦 Setup & Local Development

Make sure [Node.js](https://nodejs.org/) is installed.

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Start dev server**
   ```bash
   npm run dev
   ```
3. **Build for production**
   ```bash
   npm run build
   ```

---

### 🚀 Deploying to GitHub Pages

This project supports both **GitHub Actions Automated CI/CD Deployment** and **Manual CLI Deployment**:

#### Option 1: GitHub Actions CI/CD (Recommended — automatic on push to `main`)
The repository includes `.github/workflows/deploy.yml`:
1. Push your commits to the `main` branch.
2. In your GitHub repository, navigate to: **Settings** ➔ **Pages**.
3. Under **Build and deployment** ➔ **Source**, change from `Deploy from a branch` to **`GitHub Actions`**.
4. Every subsequent `git push origin main` will automatically build and deploy to GitHub Pages in under a minute without any manual commands!

#### Option 2: Manual CLI Deployment (Fallback)
To manually deploy via the `gh-pages` branch:
1. Ensure your remote origin is connected:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   ```
2. Run the deploy script (cleans cache, builds, and publishes):
   ```bash
   npm run deploy
   ```
