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

2. **彈性版面配置**
   - 支援**單欄模式**或**雙欄對照模式**，可在工具列下拉選單自訂左右兩欄的顯示內容（Markdown / HTML / 閱讀格式三選一）。
   - 工具列在行動端滑動時自動隱藏、點擊時浮現，維持最大閱讀空間。

3. **智慧圖片匯出與自由切片**
   - 整合 `html2canvas` 與 `JSZip`，將文件渲染成 2x 高清圖片。
   - 支援**整頁輸出**、**按張數均等裁切**或**按固定像素高度裁切**。
   - 提供「極簡白」與「質感暗黑」兩種背景風格。
   - 各切片圖片具備獨立勾選框，可自由選擇後**一鍵打包下載 ZIP**。

4. **PDF 匯出與分享（支援圖片版與文字版）**
   - **圖片版 PDF**：完美還原美化排版樣式，支援一鍵下載與系統分享。
   - **文字版 PDF**：動態載入高級中文向量字型（**霞鶩文楷 Lite**，約 14MB），產生 100% 可選取複製與全文搜尋的 PDF 文件。
   - 所有匯出選項整合於單一下拉選單，介面乾淨俐落。

5. **美化 HTML 匯出（雙欄大綱排版）**
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

6. **深度社群分享優化**
   - 在支援的行動裝置上，直接呼叫系統 Web Share API 將圖片、PDF 或 HTML 傳送至 LINE、Messenger 等 App。
   - **複製圖片至剪貼簿（PC / LINE 最佳方案）**：直接將 PNG Blob 存入剪貼簿，在 LINE 對話框按 `Ctrl + V` 即可無縫傳送。

7. **PWA 漸進式網頁應用**
   - 具備現代漸層向量圖標與 Web App Manifest，支援加入手機主畫面或瀏覽器桌面捷徑，離線時仍可使用。

8. **歷史記錄管理（Undo / Redo）**
   - 400ms 輸入防抖機制，自動記錄編輯歷史，支援無限次上一步與下一步。

9. **毛玻璃風格確認對話框**
   - 全客製毛玻璃視覺 Modal，取代瀏覽器原生 `window.confirm`，用於清除內容、確認檔名等關鍵操作。

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

### 🚀 一鍵部署至 GitHub Pages

本專案已完整配置 `gh-pages` 與相對路徑。

1. 關聯 GitHub 遠端倉庫：
   ```bash
   git remote add origin https://github.com/您的帳號/您的倉庫名.git
   ```
2. 一鍵打包並推送：
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

2. **Flexible Layout Modes**
   - Switch between **Single Pane** and **Dual Pane** modes; customize each column content (Markdown / HTML / Reading) via dropdown.
   - Toolbar auto-hides on mobile scroll and reappears on tap to maximize reading space.

3. **Smart Image Export & Custom Slicing**
   - Powered by `html2canvas` + `JSZip` for 2× hi-res rendering.
   - Modes: **Full Document**, **Equal Slices (by count)**, or **Fixed-Height Slices (by pixels)**.
   - Two background styles: "Minimalist Light" and "Chic Dark".
   - Checkbox per slice; **one-click ZIP download** of selected slices.

4. **PDF Export & Sharing (Image & Selectable-Text Versions)**
   - **Image PDF**: Captures exact CSS/HTML styling as high-definition PDF images.
   - **Text PDF**: Dynamically embeds the **LXGW WenKai Lite** Chinese font (~14MB) for 100% copyable, selectable, and searchable text.
   - All options consolidated in a single elegant dropdown menu.

5. **Styled HTML Export (Dual-Column Outline Layout)**
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

6. **Deep Social Share Optimization**
   - Invokes the Web Share API on supported devices to send images, PDFs, or HTML to LINE, Messenger, etc.
   - **Copy Image to Clipboard (PC / LINE)**: Writes PNG blob directly to clipboard — paste with `Ctrl + V` in LINE.

7. **PWA — Progressive Web App**
   - Custom gradient vector icon + Web App Manifest; installable to mobile homescreen or desktop shortcut; offline-capable.

8. **History Management (Undo / Redo)**
   - 400ms debounced state stack for unlimited undo and redo.

9. **Custom Frosted-Glass Dialogs**
   - Premium glassmorphic modals replace native `window.confirm` for clear, delete, and filename confirmation actions.

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

1. Connect to your GitHub remote:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   ```
2. One-command deploy (builds + publishes to `gh-pages` branch):
   ```bash
   npm run deploy
   ```
