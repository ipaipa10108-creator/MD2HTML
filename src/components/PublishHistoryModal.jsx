import { useState, useRef } from 'react';
import {
  getPublishHistory,
  removePublishHistoryItem,
  exportPublishHistory,
  importPublishHistory,
  deleteFromWorker,
  getSavedWorkerUrl,
  getSavedWorkerAdminToken,
  deleteFromGitHub,
  getSavedGitHubConfig,
  getActiveProvider,
  syncRemoteShares,
  mergeRemoteSharesIntoHistory
} from '../utils/publishService';
import { fetchAndImportFromUrl } from '../utils/importer';

// 解析並取得歷史記錄中更有辨識度的主題與副標題
export function resolveHistoryItemInfo(item) {
  const rawTitle = (item?.title || '').trim();
  const rawDesc = (item?.description || '').trim();

  // 清除常見前綴（如「主題分享：」、「主題分享:」、「主題分享」、Markdown標題或清單符號）
  const cleanPrefix = (text) => {
    return (text || '')
      .replace(/^主題分享[:：\s]*/i, '')
      .replace(/^[📌#\-\*•\d\.\s]+/, '')
      .trim();
  };

  const cleanedTitle = cleanPrefix(rawTitle);

  // 1. 如果原始標題除去「主題分享：」後有明確主題文字，以此為主標題
  if (cleanedTitle) {
    const cleanedDesc = rawDesc && rawDesc !== rawTitle && cleanPrefix(rawDesc) !== cleanedTitle
      ? rawDesc.split(/\r?\n/).map(l => cleanPrefix(l)).filter(Boolean).slice(0, 2).join(' · ')
      : '';
    return {
      title: cleanedTitle,
      subtitle: cleanedDesc,
      hasRealTitle: true
    };
  }

  // 2. 若原始標題僅有「主題分享：」或為空，跳過並提取下一段內容
  if (rawDesc) {
    const descLines = rawDesc
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    const validSegments = [];
    for (const line of descLines) {
      const c = cleanPrefix(line);
      if (c) {
        validSegments.push(c);
      }
    }

    if (validSegments.length > 0) {
      return {
        title: validSegments[0],
        subtitle: validSegments.length > 1 ? validSegments.slice(1, 3).join(' · ') : '',
        hasRealTitle: true
      };
    }
  }

  // 3. 回退：若無描述內容，提取短網址後綴或預設說明
  const urlSuffix = item?.url ? item.url.split('/').filter(Boolean).pop() : '';
  return {
    title: urlSuffix ? `線上發布文件 (${urlSuffix})` : '未命名發布文件',
    subtitle: '',
    hasRealTitle: false
  };
}

export default function PublishHistoryModal({ isOpen, onClose, showToast, onApplyImport }) {
  if (!isOpen) return null;
  return <PublishHistoryModalContent onClose={onClose} showToast={showToast} onApplyImport={onApplyImport} />;
}

function PublishHistoryModalContent({ onClose, showToast, onApplyImport }) {
  const [history, setHistory] = useState(() => getPublishHistory());
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [importingId, setImportingId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [importPendingData, setImportPendingData] = useState(null); // Data pending user merge/replace decision
  const fileInputRef = useRef(null);

  const activeProvider = getActiveProvider();
  const workerUrl = getSavedWorkerUrl();
  const ghConfig = getSavedGitHubConfig();

  const refreshHistory = () => {
    setHistory(getPublishHistory());
  };

  const filteredHistory = history.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const { title, subtitle } = resolveHistoryItemInfo(item);
    return (
      (item.title && item.title.toLowerCase().includes(q)) ||
      (title && title.toLowerCase().includes(q)) ||
      (subtitle && subtitle.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.url && item.url.toLowerCase().includes(q)) ||
      (item.provider && item.provider.toLowerCase().includes(q))
    );
  });

  const handleCopy = (text, msg) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast(msg, 'success');
    }).catch(() => {
      showToast('⚠️ 複製失敗，請手動複製', 'error');
    });
  };

  // Sync with Remote Cloud (Cloudflare KV or GitHub Pages repo)
  const handleSyncRemote = async () => {
    setIsSyncing(true);
    const providerName = activeProvider === 'github' ? 'GitHub 倉庫' : 'Cloudflare Workers KV';
    showToast(`⏳ 正在同步 ${providerName} 的雲端已發布清單...`, 'info');

    try {
      const { items } = await syncRemoteShares({ provider: activeProvider });
      const result = mergeRemoteSharesIntoHistory(items);
      refreshHistory();
      showToast(
        `🎉 成功同步！在雲端發現 ${items.length} 筆檔案（新增 ${result.newCount} 筆，共 ${result.totalCount} 筆）`,
        'success'
      );
    } catch (err) {
      console.warn('Sync failed:', err);
      showToast(`⚠️ 同步失敗：${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Import published document from remote directly into the MD2HTML editor
  const handleImportToEditor = async (item) => {
    if (!onApplyImport) {
      showToast('⚠️ 尚未提供編輯器匯入處理程序', 'warning');
      return;
    }

    setImportingId(item.id);
    const { title: displayTitle } = resolveHistoryItemInfo(item);
    showToast(`⏳ 正在從雲端載入《${displayTitle}》並還原 Markdown...`, 'info');

    try {
      let res = await fetchAndImportFromUrl(item.url, item.password || null);
      if (res.needsPassword) {
        const inputPass = window.prompt(`🔒 此文件受密碼保護，請輸入閱讀密碼以解密匯入：`);
        if (!inputPass) {
          showToast('已取消匯入', 'info');
          setImportingId(null);
          return;
        }
        res = await fetchAndImportFromUrl(item.url, inputPass.trim());
      }

      if (res && res.success && res.markdown) {
        onApplyImport({
          markdown: res.markdown,
          title: res.title || displayTitle,
          theme: res.theme || 'light'
        });
        onClose();
        showToast(`🎉 已成功將《${res.title || displayTitle}》載入編輯器，可直接修改內容！`, 'success');
      } else {
        throw new Error('無法解析 Markdown 內容');
      }
    } catch (err) {
      console.error('Import to editor failed:', err);
      showToast(`❌ 匯入失敗：${err.message}`, 'error');
    } finally {
      setImportingId(null);
    }
  };

  // Takedown / Delete handler supporting both Cloudflare and GitHub
  const handleDelete = async (item) => {
    const isGitHub = item.provider === 'github';
    const providerName = isGitHub ? 'GitHub Pages' : 'Cloudflare Workers KV';
    const { title: displayTitle } = resolveHistoryItemInfo(item);

    const confirmDelete = window.confirm(`確定要從 ${providerName} 刪除下架《${displayTitle}》嗎？\n\n刪除後該網址將立即失效無法存取。`);
    if (!confirmDelete) return;

    setDeletingId(item.id);
    showToast(`⏳ 正在從 ${providerName} 下架刪除文件...`, 'info');

    try {
      if (isGitHub) {
        const gh = getSavedGitHubConfig();
        const token = gh.token;
        const owner = item.owner || gh.owner;
        const repo = item.repo || gh.repo || 'html-shares';
        const path = item.path || `${item.id}.html`;

        if (!token || !owner) {
          throw new Error('未偵測到有效的 GitHub Token 或帳號資訊，請至發布設定中補齊！');
        }

        await deleteFromGitHub({
          token,
          owner,
          repo,
          path,
          sha: item.sha
        });
      } else {
        const wUrl = getSavedWorkerUrl();
        if (!wUrl) {
          throw new Error('未偵測到 Cloudflare Worker 網址，請至發布設定中確認！');
        }
        const adminToken = getSavedWorkerAdminToken();
        const effectiveSecret = item.secret || adminToken;
        await deleteFromWorker(wUrl, item.id, effectiveSecret);
      }

      removePublishHistoryItem(item.id);
      refreshHistory();
      showToast(`✅ 《${displayTitle}》已成功從 ${providerName} 下架刪除！`, 'success');
    } catch (err) {
      console.warn('Delete failed:', err);
      const removeLocal = window.confirm(`雲端回報：${err.message}\n\n是否仍要從清單中移除此項目？`);
      if (removeLocal) {
        removePublishHistoryItem(item.id);
        refreshHistory();
        showToast('已從清單中移除。', 'info');
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Export History (Download JSON)
  const handleExport = () => {
    try {
      exportPublishHistory();
      showToast('📦 發布記錄已成功匯出為 JSON 檔案！可妥善備份或傳至新手機。', 'success');
    } catch (err) {
      showToast(`⚠️ 匯出失敗: ${err.message}`, 'warning');
    }
  };

  // Trigger File Picker for Import
  const handleTriggerImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Handle File Selected
  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsed = JSON.parse(text);
        let items;
        if (Array.isArray(parsed)) {
          items = parsed;
        } else if (parsed && Array.isArray(parsed.history)) {
          items = parsed.history;
        } else {
          throw new Error('找不到合法的發布記錄陣列');
        }

        const validItems = items.filter(i => i && i.id && i.url);
        if (validItems.length === 0) {
          showToast('❌ 檔案內沒有合法的發布項目！', 'error');
          return;
        }

        // Prompt user for Merge or Replace mode
        setImportPendingData({
          validItems,
          fileName: file.name
        });
      } catch (err) {
        showToast(`❌ 讀取 JSON 失敗: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // Execute Import with chosen mode
  const executeImport = (mode) => {
    if (!importPendingData) return;
    try {
      const result = importPublishHistory(importPendingData.validItems, mode);
      setImportPendingData(null);
      refreshHistory();
      showToast(`🎉 成功匯入 ${result.importedCount} 筆發布記錄！(目前共 ${result.totalCount} 筆)`, 'success');
    } catch (err) {
      showToast(`❌ 匯入失敗: ${err.message}`, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 animate-fade-in">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl glass shadow-2xl dark:shadow-indigo-950/30 border border-slate-200/70 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 overflow-hidden">
        
        {/* Hidden file input for import */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,application/json"
          className="hidden"
        />

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-lg">
              📑
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base sm:text-lg">
                發布歷史與雲端同步管理
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                跨裝置讀取、修改與刪除已發布的文件，支援 Cloudflare KV 與 GitHub Pages 遠端檔案即時同步
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="關閉"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current Provider Endpoint Banner */}
        <div className="px-5 py-2 bg-indigo-50/40 dark:bg-indigo-950/30 border-b border-indigo-100/60 dark:border-indigo-900/40 flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">目前雲端：</span>
            {activeProvider === 'github' ? (
              <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                🐙 {ghConfig.owner ? `${ghConfig.owner}/${ghConfig.repo || 'html-shares'}` : '尚未設定 GitHub 帳號'}
              </span>
            ) : (
              <span className="font-mono text-blue-600 dark:text-blue-400 font-bold truncate max-w-xs sm:max-w-md">
                ☁️ {workerUrl || '尚未設定 Cloudflare Worker 網址'}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400">點擊「同步雲端清單」即可抓取遠端全部檔案與網址</span>
        </div>

        {/* Action Toolbar (Sync / Export / Import / Search) */}
        <div className="px-5 py-3 border-b border-slate-200/70 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/30 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncRemote}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50/90 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
              title={`從 ${activeProvider === 'github' ? 'GitHub 倉庫' : 'Cloudflare Workers KV'} 同步所有已發布文件`}
            >
              <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
              <span>{isSyncing ? '同步中...' : '同步雲端清單'}</span>
            </button>

            <button
              onClick={handleExport}
              disabled={history.length === 0}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="將所有發布短網址與管理金鑰匯出成 JSON 備份檔"
            >
              <span>📤</span>
              <span>匯出記錄</span>
            </button>

            <button
              onClick={handleTriggerImport}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all"
              title="從 JSON 檔案匯入發布記錄 (換手機時輕鬆移轉)"
            >
              <span>📥</span>
              <span>匯入記錄</span>
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋標題、網址或平台..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              🔍
            </span>
          </div>
        </div>

        {/* Pending Import Decision Dialog */}
        {importPendingData && (
          <div className="p-4 m-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 animate-fade-in space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📥</span>
              <div>
                <div className="font-bold text-xs sm:text-sm text-indigo-900 dark:text-indigo-200">
                  準備匯入「{importPendingData.fileName}」
                </div>
                <div className="text-[11px] text-indigo-700 dark:text-indigo-300">
                  共解析出 {importPendingData.validItems.length} 筆發布記錄，請選擇匯入模式：
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => executeImport('merge')}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition-all"
              >
                合併記錄（保留現有，加入新項目）
              </button>
              <button
                onClick={() => executeImport('replace')}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow transition-all"
              >
                覆蓋現有記錄
              </button>
              <button
                onClick={() => setImportPendingData(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* History List Body */}
        <div className="p-5 overflow-y-auto max-h-[calc(92vh-190px)] space-y-3">
          {filteredHistory.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="text-4xl text-slate-300 dark:text-slate-700">📭</div>
              <div className="text-sm font-bold text-slate-600 dark:text-slate-400">
                {searchQuery ? '找不到符合搜尋條件的記錄' : '尚無任何線上發布記錄'}
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                {searchQuery ? '請嘗試更換關鍵字搜尋' : '當您在匯出選單點選「🌐線上發布與分享」發布後，專屬網址與管理密鑰將安全保存在此處。'}
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const formattedDate = item.createdAt
                ? new Date(item.createdAt).toLocaleString('zh-TW', { hour12: false })
                : '未知時間';

              const isDeleting = deletingId === item.id;
              const isGitHub = item.provider === 'github';
              const { title: displayTitle, subtitle: displaySubtitle } = resolveHistoryItemInfo(item);

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all space-y-2.5"
                >
                  {/* 頂部列：平台與加密狀態標籤 (左) + 快捷按鈕 (右) */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Provider Badge */}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        isGitHub
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60'
                          : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60'
                      }`}>
                        {isGitHub ? '🐙 GitHub' : '☁️ CF KV'}
                      </span>

                      {/* Encrypted Badge */}
                      {item.isEncrypted ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                          🔒 密碼保護
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                          🌐 公開
                        </span>
                      )}

                      {/* Synced Badge */}
                      {item.isSynced && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                          ☁️ 雲端同步
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleCopy(item.url, '📋 短網址已複製！')}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                        title="複製網址"
                      >
                        <span>📋</span>
                        <span>複製</span>
                      </button>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                        title="在新分頁開啟"
                      >
                        <span>🔗</span>
                        <span>開啟</span>
                      </a>
                      <button
                        onClick={() => handleImportToEditor(item)}
                        disabled={importingId === item.id}
                        className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                        title="將此已發布文件直接載入編輯器進行修改"
                      >
                        <span>{importingId === item.id ? '⏳' : '✏️'}</span>
                        <span>匯入編輯</span>
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={isDeleting}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 flex items-center gap-1"
                        title="下架刪除此文件"
                      >
                        <span>{isDeleting ? '⏳' : '🗑️'}</span>
                        <span>刪除</span>
                      </button>
                    </div>
                  </div>

                  {/* 標題列：獨立佔滿整行，避免被按鈕或標籤排擠截斷 */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-snug break-words">
                      {displayTitle}
                    </h4>
                    {displaySubtitle && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed break-words bg-slate-50/70 dark:bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-100/80 dark:border-slate-800/60">
                        {displaySubtitle}
                      </p>
                    )}
                  </div>

                  {/* 資訊列：發布時間與密碼 */}
                  <div className="text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
                    <span>🕒 {formattedDate}</span>
                    {item.isEncrypted && item.password && (
                      <span className="text-amber-600 dark:text-amber-400 font-mono text-xs font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200/50 dark:border-amber-800/50">
                        🔑 密碼: {item.password}
                      </span>
                    )}
                  </div>

                  {/* URL Display */}
                  <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5 rounded-lg truncate select-all border border-slate-100 dark:border-slate-800/60">
                    {item.url}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/30">
          <span className="text-[11px] text-slate-400">
            共 {history.length} 筆發布記錄（資料保存在本機瀏覽器）
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
