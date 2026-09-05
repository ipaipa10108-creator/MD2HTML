# 🚀 MD2HTML 線上發布與分享後端 (Cloudflare Worker + R2)

本目錄包含供「萬能 Markdown 編輯轉換器」使用的免費雲端短網址發布與存儲服務。
支援端對端 AES-256-GCM 密碼保護、社群卡片預覽 (Open Graph)、免伺服器維護與隨時一鍵下架刪除。

---

## 🌟 免費層額度說明

- **Cloudflare R2（物件儲存）**：
  - 每月 **10 GB** 免費儲存空間（可存放數十萬份 HTML）。
  - **對外流出流量（Egress）完全 0 元免費**，絕無突發帳單風險。
  - 每月 1,000,000 次寫入、10,000,000 次讀取免費。
- **Cloudflare Workers**：
  - 每天 **100,000 次** 免費請求。

---

## 🛠️ 快速部署教學（約 3 分鐘）

### 方式一：使用 Wrangler CLI 命令列部署（推薦）

1. **登入 Cloudflare**（若未安裝 Wrangler，會自動引導登入）：
   ```bash
   cd worker
   npx wrangler login
   ```

2. **建立 R2 儲存槽**：
   ```bash
   npx wrangler r2 bucket create md2html-docs
   ```

3. **發布 Worker**：
   ```bash
   npx wrangler deploy
   ```

4. 終端機將輸出您的 Worker 網址，例如：
   ```
   https://md2html-publish-worker.<您的帳號子域>.workers.dev
   ```

5. 將該網址複製並填入 MD2HTML 編輯器內的 **「發布伺服器設定」** 即可！

---

### 方式二：使用 Cloudflare 網頁控制台（Dashboard）直接貼上

1. 登入 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. 進入側邊欄 **R2 Object Storage** ➔ 點擊 **Create bucket** ➔ 輸入儲存桶名稱 `md2html-docs` ➔ 建立。
3. 進入側邊欄 **Workers & Pages** ➔ 點擊 **Create Application** ➔ **Create Worker** ➔ 命名為 `md2html-publish-worker` ➔ 點擊 **Deploy**。
4. 點擊 **Edit Code** ➔ 將 `worker.js` 的完整內容直接貼上覆蓋 ➔ 點擊 **Save and Deploy**。
5. 回到該 Worker 的 **Settings** ➔ **Variables and Secrets** (或 Bindings) ➔ 找到 **R2 Bucket Bindings**：
   - Variable name 填寫：`DOCS_BUCKET`
   - R2 bucket 選擇：`md2html-docs`
   - 儲存並部署。
6. 在 Worker 概述頁面複製您的 `https://xxx.workers.dev` 網址，填入 MD2HTML 的設定中即可開始享受線上發布！
