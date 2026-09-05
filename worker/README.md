# 🌐 MD2HTML 線上發布與分享服務設定指南（100% 免費、完全免綁信用卡）

MD2HTML 支援 **兩種完全免費且免綁信用卡** 的線上短網址發布方案：
使用者可依需求配置其中一種，若兩種皆已設定，發布時可自由切換要使用哪一個服務！

---

## 方案比較

| 比較項目 | 方案一：Cloudflare Workers KV | 方案二：GitHub REST API + GitHub Pages |
| :--- | :--- | :--- |
| **信用卡驗證** | **完全免驗證（100% 免費）** | **完全免驗證（100% 免費）** |
| **後端維護** | 需要建立一個免費 Worker 腳本 | **完全不用架伺服器**（純前端直連 GitHub API） |
| **隱私安全性** | ⭐️⭐️⭐️⭐️⭐️（短網址隨機 8 碼，外人無法遍歷檔案清單） | ⭐️⭐️⭐️（倉庫為 Public，外人若進入該 Repo 能看到檔案清單） |
| **生效速度** | **即時秒出**（上傳後 1 秒內 LINE 即可讀取） | **略需等待**（GitHub Pages 部署需約 15~30 秒） |
| **免費額度** | 1GB 空間（約 20,000 份文件）、每天 1,000 次寫入、每天 10 萬次讀取 | 100GB 頻寬/月、倉庫大小 1GB |

---

## 方案一：Cloudflare Workers KV 設定（約 2 分鐘）

> [!NOTE]
> Cloudflare 的 **Workers 基本計算** 與 **Workers KV** 在免費方案中**完全不需要綁定信用卡**！

### 步驟說明：

1. **登入 Cloudflare**：進入 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. **建立 KV 命名空間**：
   - 點擊左側 **Workers & Pages** ➔ **KV**。
   - 點擊 **Create a namespace** ➔ 名稱填入 `MD_SHARES` ➔ 儲存。
3. **建立 Worker**：
   - 點擊左側 **Workers & Pages** ➔ **Create Application** ➔ **Create Worker**。
   - 命名為 `md2html-publish-worker` ➔ 點擊 **Deploy**。
4. **貼上程式碼**：
   - 點擊 **Edit code** ➔ 將本目錄下的 `worker.js` 完整內容複製並覆蓋貼上 ➔ 點擊 **Save and deploy**。
5. **綁定 KV**：
   - 回到該 Worker 的 **Settings** ➔ **Variables and Secrets** (或 Bindings)。
   - 找到 **KV Namespace Bindings** ➔ 點擊 **Add**：
     - **Variable name（變數名稱）**：`MY_KV`
     - **KV namespace**：選擇剛建立的 `MD_SHARES`
   - 點擊 **Save and deploy**。
6. **填入 MD2HTML**：
   - 複製您的 Worker 網址（例如 `https://md2html-publish-worker.xxx.workers.dev`）。
   - 在 MD2HTML 點擊「🌐線上發布與分享」➔ 選擇「Cloudflare KV」➔ 填入網址即可！

---

## 方案二：GitHub REST API + GitHub Pages 設定（純前端免伺服器）

> [!NOTE]
> 如果連 Cloudflare 帳號都懶得設定，直接使用現有的 GitHub 帳號即可，由前端呼叫 GitHub REST API 自動推送到 GitHub Pages 儲存與發布！

### 步驟說明：

1. **在 GitHub 建立一個新倉庫**：
   - 登入 GitHub ➔ 點擊右上角 **+** ➔ **New repository**。
   - 倉庫名稱填寫：`html-shares`（或任何您喜歡的名稱）。
   - 務必勾選 **Public（公開）** ➔ 勾選 **Add a README file** ➔ 點擊 **Create repository**。
2. **啟用 GitHub Pages**：
   - 進入該倉庫的 **Settings** ➔ 點擊左側 **Pages**。
   - 在 **Build and deployment** ➔ **Branch** 選擇 **`main`** 分支、目錄選擇 **`/ (root)`** ➔ 點擊 **Save**。
3. **建立 Fine-grained Personal Access Token**：
   - 點選 GitHub 右上角個人大頭貼 ➔ **Settings** ➔ 最下方 **Developer Settings** ➔ **Personal access tokens** ➔ **Fine-grained tokens** ➔ 點擊 **Generate new token**。
   - **Token name**：例如 `md2html-publisher`。
   - **Repository access**：選擇 **Only select repositories** ➔ 選定剛建立的 `html-shares` 倉庫。
   - **Repository permissions**：展開後找到 **Contents** ➔ 將權限切換為 **Read and write**。
   - 點擊最下方 **Generate token** ➔ 複製產生的 Token（格式通常為 `github_pat_...`）。
4. **填入 MD2HTML**：
   - 在 MD2HTML 點擊「🌐線上發布與分享」➔ 切換為「GitHub Pages」標籤。
   - 填入您的 GitHub 使用者名稱（Owner）、倉庫名稱（Repo，預設為 `html-shares`）與剛剛複製的 Token 即可！
   - Token 僅保存在您本機手機/電腦的瀏覽器中，不會外洩。
