import { useState, useRef } from 'react';
import {
  fetchAndImportFromUrl,
  parseHtmlToMarkdown,
  parsePdfToMarkdown
} from '../utils/importer';
import {
  getPublishHistory,
  syncRemoteShares,
  mergeRemoteSharesIntoHistory,
  getActiveProvider,
  getSavedWorkerUrl,
  getSavedGitHubConfig
} from '../utils/publishService';
import { resolveHistoryItemInfo } from './PublishHistoryModal';

export default function ImportModal({
  isOpen,
  onClose,
  onApplyImport,
  showToast
}) {
  if (!isOpen) return null;
  return (
    <ImportModalContent
      onClose={onClose}
      onApplyImport={onApplyImport}
      showToast={showToast}
    />
  );
}

function ImportModalContent({ onClose, onApplyImport, showToast }) {
  const [activeTab, setActiveTab] = useState('url'); // 'url' | 'file' | 'cloud'
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  // Cloud shares state
  const [cloudShares, setCloudShares] = useState(() => getPublishHistory());
  const [cloudSearch, setCloudSearch] = useState('');
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  const activeProvider = getActiveProvider();
  const workerUrl = getSavedWorkerUrl();
  const ghConfig = getSavedGitHubConfig();

  const handleSyncCloudInModal = async () => {
    setIsCloudSyncing(true);
    const providerName = activeProvider === 'github' ? 'GitHub 倉庫' : 'Cloudflare Workers KV';
    showToast?.(`⏳ 正在同步 ${providerName} 的雲端已發布清單...`, 'info');
    try {
      const { items } = await syncRemoteShares({ provider: activeProvider });
      mergeRemoteSharesIntoHistory(items);
      setCloudShares(getPublishHistory());
      showToast?.(`🎉 成功同步！在雲端發現 ${items.length} 筆檔案`, 'success');
    } catch (err) {
      showToast?.(`⚠️ 同步失敗：${err.message}`, 'error');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const filteredCloudShares = cloudShares.filter(item => {
    if (!cloudSearch.trim()) return true;
    const q = cloudSearch.toLowerCase();
    const { title, subtitle } = resolveHistoryItemInfo(item);
    return (
      (item.title && item.title.toLowerCase().includes(q)) ||
      (title && title.toLowerCase().includes(q)) ||
      (subtitle && subtitle.toLowerCase().includes(q)) ||
      (item.url && item.url.toLowerCase().includes(q)) ||
      (item.provider && item.provider.toLowerCase().includes(q))
    );
  });

  // Password-protected encrypted page state
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [cachedEncryptedHtml, setCachedEncryptedHtml] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  // Parsed result
  const [parsedResult, setParsedResult] = useState(null);

  // File drag & drop
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Raw HTML paste fallback
  const [showRawHtmlInput, setShowRawHtmlInput] = useState(false);
  const [rawHtmlText, setRawHtmlText] = useState('');

  // Sample URLs provided by user
  const SAMPLE_WORKER_URL = 'https://mdshares.ipaipa10108.workers.dev/tdnjt7a7';
  const SAMPLE_GITHUB_URL = 'https://ipaipa10108-creator.github.io/html-shares/7zmn0jdo.html';

  // --- Handlers ---

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text.trim());
        showToast?.('📋 已貼上剪貼簿網址', 'info');
      }
    } catch {
      showToast?.('無法讀取剪貼簿，請手動貼上！', 'warning');
    }
  };

  const handleFetchUrl = async (overrideUrl = null) => {
    const targetUrl = (overrideUrl || urlInput).trim();
    if (!targetUrl) {
      showToast?.('請輸入要匯入的網址！', 'warning');
      return;
    }

    setIsLoading(true);
    setLoadingText('⏳ 正在抓取網址內容並分析結構...');
    setNeedsPassword(false);
    setPasswordError('');
    setPassword('');
    setParsedResult(null);

    try {
      const res = await fetchAndImportFromUrl(targetUrl);
      if (res.needsPassword) {
        setNeedsPassword(true);
        setCachedEncryptedHtml(res.rawHtml || '');
        setLoadingText('');
        setIsLoading(false);
        return;
      }

      setParsedResult(res);
      showToast?.('✅ 成功剖析網頁！請預覽後點擊「載入至編輯器」', 'success');
    } catch (err) {
      console.error('Import error:', err);
      setShowRawHtmlInput(true);
      showToast?.(err.message || '匯入失敗，請檢查網址或連線！', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleParseRawHtml = async () => {
    if (!rawHtmlText.trim()) return;
    setIsLoading(true);
    setLoadingText('⏳ 正在解析貼上的 HTML 原始碼...');
    try {
      const res = await parseHtmlToMarkdown(rawHtmlText.trim());
      if (res.needsPassword) {
        setNeedsPassword(true);
        setCachedEncryptedHtml(rawHtmlText.trim());
        setIsLoading(false);
        return;
      }
      setParsedResult(res);
      showToast?.('✅ 成功剖析 HTML 原始碼！', 'success');
    } catch (err) {
      showToast?.(err.message || '原始碼剖析失敗！', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockEncrypted = async (e) => {
    if (e) e.preventDefault();
    if (!password.trim()) {
      setPasswordError('請輸入解鎖密碼！');
      return;
    }

    setIsLoading(true);
    setLoadingText('🔓 正在使用 AES-GCM 解密文檔...');
    setPasswordError('');

    try {
      const res = await parseHtmlToMarkdown(cachedEncryptedHtml, password.trim());
      setParsedResult(res);
      setNeedsPassword(false);
      showToast?.('🔓 解密成功！已還原文章與排版結構', 'success');
    } catch (err) {
      console.error('Decryption failed:', err);
      setPasswordError(err.message || '密碼錯誤，無法解密！');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  const processSelectedFile = async (file) => {
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    setIsLoading(true);
    setLoadingText(`⏳ 正在讀取並解析 ${file.name}...`);
    setNeedsPassword(false);
    setPasswordError('');
    setParsedResult(null);

    try {
      if (ext === '.pdf') {
        const buffer = await file.arrayBuffer();
        const res = await parsePdfToMarkdown(buffer);
        setParsedResult({ ...res, title: res.title || file.name.replace(/\.[^/.]+$/, '') });
        showToast?.(`✅ 成功解析 PDF 檔案！`, 'success');
      } else if (['.html', '.htm'].includes(ext)) {
        const text = await file.text();
        const res = await parseHtmlToMarkdown(text);
        if (res.needsPassword) {
          setNeedsPassword(true);
          setCachedEncryptedHtml(text);
          setIsLoading(false);
          return;
        }
        setParsedResult({ ...res, title: res.title || file.name.replace(/\.[^/.]+$/, '') });
        showToast?.(`✅ 成功解析 HTML 檔案！`, 'success');
      } else if (['.md', '.txt'].includes(ext)) {
        const text = await file.text();
        setParsedResult({
          success: true,
          isLossless: true,
          markdown: text,
          title: file.name.replace(/\.[^/.]+$/, ''),
          theme: 'light',
          sourceType: 'markdown_file'
        });
        showToast?.(`✅ 成功讀取 Markdown 檔案！`, 'success');
      } else {
        throw new Error('不支援的檔案格式，請上傳 .pdf、.html、.htm、.md 或 .txt 檔案！');
      }
    } catch (err) {
      console.error('File import error:', err);
      showToast?.(err.message || '檔案解析失敗！', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleApply = () => {
    if (!parsedResult || !parsedResult.markdown) return;
    onApplyImport?.({
      markdown: parsedResult.markdown,
      title: parsedResult.title,
      theme: parsedResult.theme || 'light',
      sourceType: parsedResult.sourceType,
      isLossless: parsedResult.isLossless
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-indigo-500/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  匯入網頁網址或 PDF
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  狀態還原重編
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                貼上已製作的網址或上傳 PDF，還原回排版編輯狀態進行修改
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <button
            onClick={() => {
              setActiveTab('url');
              setParsedResult(null);
              setNeedsPassword(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'url'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <span>🌐 網頁網址匯入</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('file');
              setParsedResult(null);
              setNeedsPassword(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'file'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <span>📑 PDF / 本機檔案匯入</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('cloud');
              setParsedResult(null);
              setNeedsPassword(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'cloud'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <span>☁️ 雲端分享庫</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center p-6 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl space-y-2 animate-pulse">
              <div className="w-8 h-8 border-3 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs sm:text-sm font-bold text-indigo-700 dark:text-indigo-300">
                {loadingText || '處理中...'}
              </p>
            </div>
          )}

          {/* Tab 1: URL Import */}
          {activeTab === 'url' && !isLoading && !parsedResult && !needsPassword && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  請輸入或貼上已發布之網頁網址 (支援 Worker、GitHub Pages、自訂網址或 PDF 網址)：
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://mdshares.xxx.workers.dev/xxx 或 GitHub Pages 網址"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 font-mono"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFetchUrl();
                      }}
                    />
                    {urlInput && (
                      <button
                        onClick={() => setUrlInput('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handlePasteClipboard}
                    type="button"
                    className="px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/70 dark:border-indigo-800 rounded-xl transition-all shrink-0"
                    title="從剪貼簿貼上"
                  >
                    📋 貼上
                  </button>
                </div>
              </div>

              {/* Sample Shortcuts */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 rounded-xl">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <span>💡 點擊直接載入範例進行測試：</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUrlInput(SAMPLE_WORKER_URL);
                      handleFetchUrl(SAMPLE_WORKER_URL);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-all"
                  >
                    <span>☁️ Cloudflare Worker 範例</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUrlInput(SAMPLE_GITHUB_URL);
                      handleFetchUrl(SAMPLE_GITHUB_URL);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-all"
                  >
                    <span>🔒 GitHub Pages 範例 (含密碼保護)</span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleFetchUrl()}
                  disabled={!urlInput.trim()}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
                >
                  🚀 擷取並還原網頁狀態
                </button>
              </div>

              {/* Collapsible Direct HTML Source Input */}
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRawHtmlInput(!showRawHtmlInput)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 transition-colors"
                >
                  <span>{showRawHtmlInput ? '▼' : '▶'}</span>
                  <span>或直接貼上 HTML 原始碼進行剖析還原</span>
                </button>

                {showRawHtmlInput && (
                  <div className="mt-2.5 space-y-2.5">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      若網址受瀏覽器跨域限制，您可於該網頁按 <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px]">Ctrl+U</kbd> 複製網頁原始碼並貼於此：
                    </p>
                    <textarea
                      value={rawHtmlText}
                      onChange={(e) => setRawHtmlText(e.target.value)}
                      placeholder="請在此貼上 HTML 原始碼 (例如 <html>...</html> 或包含 <article> 的內容)..."
                      rows={4}
                      className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800 dark:text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={handleParseRawHtml}
                      disabled={!rawHtmlText.trim()}
                      className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-40"
                    >
                      🚀 解析貼上的 HTML 原始碼
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: File Import (PDF / HTML / MD) */}
          {activeTab === 'file' && !isLoading && !parsedResult && !needsPassword && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div className="w-12 h-12 mb-3 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl shadow-inner">
                  📄
                </div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 text-center">
                  點擊選取或拖曳檔案至此區域
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">
                  支援格式：<span className="font-semibold text-indigo-600 dark:text-indigo-400">PDF (.pdf)</span>、HTML (.html / .htm)、Markdown (.md / .txt)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.html,.htm,.md,.txt"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      processSelectedFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300">💡 提示：</span>
                由本系統匯出的文字 PDF 或 HTML 具有專屬中繼資料，可達成 100% 絕對無損還原。外部製作或傳統 PDF 亦可透過智慧文字層辨識自動重構 Markdown 章節與標題。
              </div>
            </div>
          )}

          {/* Tab 3: Cloud Shared Library (Cloudflare / GitHub) */}
          {activeTab === 'cloud' && !isLoading && !parsedResult && !needsPassword && (
            <div className="space-y-4">
              {/* Endpoint Banner & Sync Button */}
              <div className="p-3.5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/80 bg-indigo-50/50 dark:bg-indigo-950/30 flex flex-wrap items-center justify-between gap-2.5">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>{activeProvider === 'github' ? '🐙 GitHub Pages 倉庫' : '☁️ Cloudflare Workers KV'}</span>
                  </div>
                  <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 truncate max-w-sm sm:max-w-md">
                    {activeProvider === 'github'
                      ? (ghConfig.owner ? `${ghConfig.owner}/${ghConfig.repo || 'html-shares'}` : '尚未設定 GitHub 帳號')
                      : (workerUrl || '尚未設定 Cloudflare Worker 網址')}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSyncCloudInModal}
                  disabled={isCloudSyncing}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                  title="從已設定的雲端抓取最新檔案清單"
                >
                  <span className={isCloudSyncing ? 'animate-spin' : ''}>🔄</span>
                  <span>{isCloudSyncing ? '同步中...' : '同步雲端清單'}</span>
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={cloudSearch}
                  onChange={(e) => setCloudSearch(e.target.value)}
                  placeholder="搜尋雲端已發布檔案..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              </div>

              {/* Items List */}
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {filteredCloudShares.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                    <div className="text-2xl">📭</div>
                    <div>{cloudSearch ? '找不到符合搜尋的檔案' : '目前尚無已同步的雲端分享檔案'}</div>
                    <p className="text-[11px]">點擊上方「🔄 同步雲端清單」從設定的空間抓取已發布的文件</p>
                  </div>
                ) : (
                  filteredCloudShares.map(item => {
                    const { title: displayTitle, subtitle: displaySubtitle } = resolveHistoryItemInfo(item);
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-800/70 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5"
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold whitespace-nowrap ${
                              item.provider === 'github'
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            }`}>
                              {item.provider === 'github' ? '🐙 GitHub' : '☁️ CF KV'}
                            </span>
                            {item.isEncrypted && (
                              <span className="inline-flex items-center text-[10px] font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">🔒 密碼保護</span>
                            )}
                            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 break-words flex-1 min-w-0">
                              {displayTitle}
                            </h4>
                          </div>
                          {displaySubtitle && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {displaySubtitle}
                            </p>
                          )}
                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            {item.url}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleFetchUrl(item.url)}
                          className="w-full sm:w-auto px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 transition-all shrink-0 flex items-center justify-center gap-1 active:scale-95"
                        >
                          <span>✏️</span>
                          <span>載入此文件</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Password Prompt Sub-View for Encrypted HTML */}
          {needsPassword && !isLoading && (
            <div
              className={`p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-3 transition-transform ${
                isShaking ? 'animate-shake' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🔒</span>
                <div>
                  <h3 className="text-sm font-black text-amber-900 dark:text-amber-200">
                    此網頁受到密碼保護
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    這是一份受 AES-256 加密的專屬分享文檔，請輸入閱讀密碼以解密還原。
                  </p>
                </div>
              </div>

              <form onSubmit={handleUnlockEncrypted} className="space-y-3 pt-1">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="請輸入解密閱讀密碼..."
                    autoFocus
                    required
                    className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>

                {passwordError && (
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setNeedsPassword(false);
                      setPassword('');
                      setPasswordError('');
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-[0.99]"
                  >
                    🔓 解密並還原文章
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Parsed Result Preview */}
          {parsedResult && !isLoading && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📄</span>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate max-w-md">
                      {parsedResult.title || '已成功剖析文件'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {parsedResult.isLossless ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <span>✨</span> 100% 原始無損還原
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                        <span>🔄</span> 智慧排版轉譯還原
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-700">
                  <span>字元總數: <strong className="text-slate-700 dark:text-slate-200">{parsedResult.markdown?.length || 0}</strong> 字</span>
                  <span>主題偏好: <strong className="text-slate-700 dark:text-slate-200">{parsedResult.theme === 'dark' ? '深色模式' : '淺色模式'}</strong></span>
                </div>
              </div>

              {/* Markdown Content Snippet Preview */}
              <div>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Markdown 內文預覽：</span>
                  <span className="text-[10px] text-slate-400">前 500 字元</span>
                </div>
                <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs max-h-48 overflow-y-auto leading-relaxed border border-slate-800 select-text whitespace-pre-wrap">
                  {parsedResult.markdown?.slice(0, 1000) || '無預覽內容'}
                  {parsedResult.markdown?.length > 1000 ? '\n\n... (其餘內容將在載入時完整呈現)' : ''}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setParsedResult(null);
                    setNeedsPassword(false);
                  }}
                  className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  重新選擇
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <span>📥 載入至編輯器並開始修改</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>支援 Markdown、HTML、PDF 互轉重塑</span>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold"
          >
            關閉視窗
          </button>
        </div>

      </div>
    </div>
  );
}
