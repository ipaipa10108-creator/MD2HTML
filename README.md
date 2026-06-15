# 🚀 萬能 Markdown 編輯轉換器 | Universal Markdown Editor Converter

[繁體中文](#繁體中文說明書) | [English](#english-user-manual)

---

## 繁體中文說明書

歡迎使用 **萬能 Markdown 編輯轉換器**！這是一個基於 Vite、React 與 Tailwind CSS 打造的極致美觀、高效單頁網頁應用程式 (SPA)。本專案支援 PWA 漸進式網頁應用安裝、強大的多終端即時同步，並針對行動端與電腦端社群軟體分享進行了深度最佳化。

### 🌟 核心特色功能

1. **三向即時互轉同步**
   - **Markdown 編輯區**、**HTML 原始碼編輯區** 與 **美化閱讀排版區** 三者無縫即時同步。
   - 雙擊「美化閱讀排版」即可啟用 `contentEditable` 直覺式編輯，直接點擊文字即可修改。
   - 針對 Android/iOS 行動端輸入法與 Backspace 退格鍵進行了防抖設計，僅在您離開編輯（Blur）或點擊「儲存」時觸獲同步，確保在手機上打字 100% 順暢不跳游標。

2. **智慧圖片匯出與自由切片**
   - 整合 `html2canvas`，將您的文件渲染成 crisp 高清 2x 圖片。
   - 支援 **整頁輸出**、**按張數均等裁切** 或 **按固定像素高度裁切**。
   - 支援選擇「極簡白」或「質感暗黑」背景風格。
   - 各切片圖片皆具備獨立勾選框，您可以自由選擇想要處理的圖片。
   - **一鍵打包下載**：將所選圖片自動壓縮為 ZIP 壓縮檔。

3. **全新 PDF 匯出與分享（支援圖片與可選取複製文字）**
   - **圖片版 PDF**：完美還原網頁美化排版樣式，支援單擊下載與一鍵分享。
   - **文字版 PDF**：動態載入高級中文向量字型（**霞鶩文楷 Lite**，約 14MB），產生 **100% 可選取複製與搜尋內文** 的 PDF 文件。
   - **整合式下拉選單**：將所有 PDF 匯出與分享選項收納至單個美觀的「PDF 匯出」下拉選單中，保持雙端介面乾淨俐落。

4. **全新美化 HTML 匯出與分享 (具備雙欄文件大綱)**
   - 支援下載或分享「美化網頁 HTML」檔案。
   - **雙欄自適應佈局**：預設為雙欄排版，左邊為快速跳轉段落的文件大綱（TOC），右邊為文章主體。
   - **大綱快速收合**：在產出的網頁中，右上角提供「顯示大綱」的核取方塊（行動端為自動空間縮減），讓讀者可隨時切換大綱的收合或展示，且會將展開狀態記住於 `localStorage` 中。展開大綱時內容會自動收縮自適應螢幕大小。
   - **Scrollspy 滾動偵測**：當讀者滾動文章時，左側大綱對應的段落會自動高亮點亮，讓讀者極易辨識目前閱讀位置。
   - **客製化檔名規律**：
     - 當 Markdown 內容中含有 `#` 標題（例如 `# 標題`）時，產出檔名為：`md2html_標題_YYYYMMDD.html`（自動去除了 `#` 字首且時間戳記只保留年月日）。
     - 當無 `#` 標題時，檔名則採用毫秒級別完整時間戳記：`md2html_YYYYMMDDssss.html`。

5. **深度社群分享優化 (針對 LINE / Desktop / Mobile)**
   - **一鍵社群分享**：在支援的行動裝置上，可直接呼叫系統分享傳送圖片/PDF 等檔案至 LINE、Messenger 等。
   - **剪貼簿圖片複製 (最佳 PC / LINE 方案)**：因大部分電腦與部分手機沙盒限制無法直接以網頁傳送二進位圖片檔，本程式提供「複製圖片」按鈕。點擊後圖片將自動存入剪貼簿，您只需直接在 LINE 對話框按下 **Ctrl + V (或長按貼上)** 即可 100% 傳送圖片，極速又穩定。

5. **PWA 捷徑與書籤支援**
   - 具備專屬的現代漸層色向量圖標 (`favicon.svg`) 與 Web Manifest 機制。
   - 支援將此工具「新增至手機主畫面」，作為獨立 App 啟動，離線或書籤引導更為專業美觀。

6. **歷史記錄管理 (Undo/Redo)**
   - 內建 400ms 輸入防抖機制，自動記錄您的編輯歷史，支援無限次「上一步」與「下一步」。

7. **客製化毛玻璃確認 Modal**
   - 捨棄會被沙盒阻擋的 `window.confirm`，改用全客製的毛玻璃視覺警告視窗，體驗更高級。

---

### 📦 安裝與本地開發

請確保您已安裝 [Node.js](https://nodejs.org/)。

1. **複製專案並安裝依賴**
   ```bash
   npm install
   ```
2. **啟動開發伺服器**
   ```bash
   npm run dev
   ```
3. **編譯打包專案**
   ```bash
   npm run build
   ```

---

### 🚀 一鍵部署至 GitHub Pages

本專案已完整配置 `gh-pages` 與相對路徑。

1. 將您的本地 Git 倉庫關聯至 GitHub：
   ```bash
   git remote add origin https://github.com/您的帳號/您的倉庫名.git
   ```
2. 執行一鍵部署指令，它會自動打包並推送到遠端 `gh-pages` 分支：
   ```bash
   npm run deploy
   ```

---

<br/>

## English User Manual

Welcome to the **Universal Markdown Editor Converter**! This is a visually stunning, highly efficient Single-Page Application (SPA) built with Vite, React, and Tailwind CSS. It supports Progressive Web App (PWA) installation, powerful multi-pane real-time synchronization, and is heavily optimized for desktop and mobile social sharing (e.g., LINE, Slack, Discord).

### 🌟 Key Features

1. **Three-Way Live Synchronization**
   - Seamless real-time updates between the **Markdown Editor**, **HTML Source Editor**, and **Reading Layout View**.
   - Double-click the Reading View to activate direct `contentEditable` editing.
   - Built with debounce mechanics for Android/iOS virtual keyboards, triggering state synchronization only upon `onBlur` (when clicking away or tapping "Save"), completely eliminating caret jumps or keyboard dismissal bugs on mobile.

2. **Smart Image Export & Custom Slicing**
   - Powered by `html2canvas` to render high-definition 2x resolution captures of your document.
   - Slicing modes: **Full Document**, **Equal Slicing (by page count)**, or **Fixed Height Slicing (by pixels)**.
   - Choose between "Minimalist Light" (white) or "Chic Dark" (dark navy) background styles.
   - Checkboxes are provided on each slice thumbnail, letting you choose exactly which images to process.
   - **Download selected slices as a ZIP**: Instantly bundle selected slices into a zip file.

3. **New PDF Export & Sharing (Image & Selectable Text Versions)**
   - **Image-based PDF**: Capture layout structure as high-definition PDF images (preserving exact CSS/HTML styling), ready for download or sharing.
   - **Text-based PDF**: Dynamically downloads and embeds the **LXGW WenKai Lite** Chinese font (approx. 14MB) to render document text directly as vector PDF objects, ensuring **100% copyable, selectable, and searchable** text for the recipient.
   - **Consolidated PDF Dropdown**: Condenses all PDF options into a premium, responsive dropdown menu suitable for both mobile and desktop utility bars.

4. **HTML Page Export with Collapsible Sidebar Outline**
   - Supports downloading and sharing as a fully functional, styled HTML page.
   - **Responsive Split Layout**: Features a double-column view by default, with a clickable Table of Contents (TOC) sidebar on the left and readable content on the right.
   - **Interactive Sidebar Control Checkbox**: Includes a "Show Outline" checkbox directly on the exported HTML page to collapse/expand the sidebar. Toggling the sidebar automatically shrinks/resizes the content area to fit the viewport. The preference is stored in `localStorage`.
   - **Scrollspy Indicator**: Highlight current active header in the sidebar dynamically as you scroll through the page.
   - **Customized Filename Rules**:
     - If a `#` heading (e.g. `# Title`) is found, the file is named `md2html_Title_YYYYMMDD.html` (the `#` prefix is stripped and only the `YYYYMMDD` date is used for timestamp).
     - If no `#` heading is found, it falls back to full millisecond-precision timestamp: `md2html_YYYYMMDDssss.html`.

5. **Deep Social Share Optimization (PC & LINE Compatibility)**
   - **Share Files**: Directly invokes the system Web Share dialog on supported mobile OS to send multiple sliced files/PDFs to apps like LINE or Messenger.
   - **Copy Image to Clipboard**: Web Share API file-transfers often fail on desktop clients due to OS-level sandboxing. We provide a **"Copy Image"** button that writes the raw PNG blob directly to the clipboard. Simply press **Ctrl + V (or long press paste)** inside LINE, Discord, or WeChat to send the image instantly.

5. **PWA & Desktop Shortcut Ready**
   - Equipped with a custom gradient vector icon (`favicon.svg`) and a Web App Manifest.
   - Easily install the editor to your mobile homescreen or desktop browser shortcuts for a native, app-like standalone experience.

6. **History Management (Undo/Redo)**
   - Features a 400ms debounced state stack, allowing you to seamlessly step backward and forward through your edits.

7. **Custom Frosted Glass Confirmation Dialogs**
   - Replaced standard browser blockages like `window.confirm` with smooth, glassmorphic warnings that elevate the premium feel.

---

### 📦 Setup & Local Development

Make sure you have [Node.js](https://nodejs.org/) installed.

1. **Install Dependencies**
   ```bash
   npm install
   ```
2. **Start Dev Server**
   ```bash
   npm run dev
   ```
3. **Build Production Assets**
   ```bash
   npm run build
   ```

---

### 🚀 Deploying to GitHub Pages

The project is fully pre-configured with relative paths and deployment scripts.

1. Connect your local directory to your GitHub remote repository:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   ```
2. Run the deployment command. It compiles your project and publishes the distribution files directly to the remote `gh-pages` branch:
   ```bash
   npm run deploy
   ```
