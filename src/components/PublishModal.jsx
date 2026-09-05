import { useState } from 'react';
import { buildPublishableHTML } from '../utils/crypto';
import {
  getSavedWorkerUrl,
  saveWorkerUrl,
  uploadToWorker,
  savePublishHistoryItem
} from '../utils/publishService';

function extractInitialMeta(markdown) {
  const lines = (markdown || '').split(/\r?\n/);
  let extractedTitle = '';
  const subHeadings = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!extractedTitle && line.startsWith('# ')) {
      extractedTitle = line.replace(/^#\s+/, '').trim();
    } else if (line.startsWith('## ')) {
      if (subHeadings.length < 4) {
        subHeadings.push(line.replace(/^##\s+/, '').trim());
      }
    }
  }

  const finalTitle = extractedTitle || 'Markdown 文件分享';
  let finalDesc;
  if (subHeadings.length > 0) {
    finalDesc = `章節摘要：${subHeadings.join(' · ')}`;
  } else {
    const firstParagraph = lines.find(l => l.trim() && !l.startsWith('#') && !l.startsWith('`')) || '';
    finalDesc = firstParagraph.slice(0, 80) || '點擊連結閱讀精美排版的完整文件內容。';
  }

  return { title: finalTitle, description: finalDesc };
}

export default function PublishModal(props) {
  if (!props.isOpen) return null;
  return <PublishModalContent {...props} />;
}

function PublishModalContent({
  onClose,
  markdown,
  readingHtml,
  readingViewRef,
  leftReadingViewRef,
  rightReadingViewRef,
  showToast,
  onOpenHistory
}) {
  const initialMeta = extractInitialMeta(markdown);
  const [title, setTitle] = useState(initialMeta.title);
  const [description, setDescription] = useState(initialMeta.description);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [workerUrl, setWorkerUrlState] = useState(() => getSavedWorkerUrl());
  const [showServerConfig, setShowServerConfig] = useState(() => !getSavedWorkerUrl());

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedResult, setPublishedResult] = useState(null); // { url, id, secret, password }

  // Extract headings and article HTML
  const generateExportData = () => {
    const activeRef = [readingViewRef, leftReadingViewRef, rightReadingViewRef].find(r => r && r.current);
    const sourceHtml = activeRef && activeRef.current ? activeRef.current.innerHTML : readingHtml;
    const parser = new DOMParser();
    const doc = parser.parseFromString(sourceHtml, 'text/html');
    const docHeadings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const exportedHeadings = [];

    docHeadings.forEach((heading, index) => {
      const id = `h-${index}`;
      heading.setAttribute('id', id);
      exportedHeadings.push({
        id,
        level: parseInt(heading.tagName.substring(1)),
        text: heading.textContent || ''
      });
    });

    const articleContentHtml = doc.body.innerHTML;
    return { articleContentHtml, exportedHeadings };
  };

  const handlePublish = async (e) => {
    e.preventDefault();

    const targetWorkerUrl = workerUrl.trim();
    if (!targetWorkerUrl) {
      showToast('⚠️ 請先填寫線上發布伺服器 (Worker) 網址！', 'warning');
      setShowServerConfig(true);
      return;
    }

    if (isEncrypted && !password.trim()) {
      showToast('⚠️ 您啟用了密碼保護，請輸入閱讀密碼！', 'warning');
      return;
    }

    setIsPublishing(true);
    showToast('⏳ 正在打包並發布至雲端...', 'info');

    try {
      saveWorkerUrl(targetWorkerUrl);

      const { articleContentHtml, exportedHeadings } = generateExportData();
      const hasMermaid = markdown.includes('```mermaid');

      // Build standalone HTML with embedded lock screen if encrypted
      const fullHtml = await buildPublishableHTML({
        title: title.trim() || 'Markdown 文件分享',
        description: description.trim(),
        articleContentHtml,
        exportedHeadings,
        isEncrypted,
        password: password.trim(),
        hasMermaid
      });

      // Upload to Cloudflare Worker
      const result = await uploadToWorker(targetWorkerUrl, {
        html: fullHtml,
        title: title.trim() || 'Markdown 文件分享',
        description: description.trim(),
        isEncrypted
      });

      // Save to local publishing history
      const historyItem = {
        id: result.id,
        url: result.url,
        title: title.trim() || 'Markdown 文件分享',
        description: description.trim(),
        isEncrypted,
        secret: result.secret,
        createdAt: result.createdAt || new Date().toISOString(),
        password: isEncrypted ? password.trim() : ''
      };
      savePublishHistoryItem(historyItem);

      setPublishedResult({
        ...result,
        title: historyItem.title,
        password: historyItem.password
      });

      showToast('🎉 線上發布成功！可直接複製或分享至其他 App', 'success');
    } catch (err) {
      console.error('Publish error:', err);
      showToast(`❌ 發布失敗: ${err.message}`, 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopy = (text, successMsg) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg, 'success');
    }).catch(() => {
      showToast('⚠️ 複製失敗，請手動選取複製', 'error');
    });
  };

  const handleSystemShare = async () => {
    if (!publishedResult) return;
    const shareUrl = publishedResult.url;
    const shareTitle = publishedResult.title || title;
    let shareText = description;
    if (publishedResult.isEncrypted && publishedResult.password) {
      shareText += `\n🔒 閱讀密碼：${publishedResult.password}`;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        showToast('✅ 系統分享面板已開啟！', 'success');
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopy(shareUrl, '📋 分享已取消，連結已自動複製！');
        }
      }
    } else {
      handleCopy(shareUrl, '📋 系統不支援原生分享，已為您複製連結！');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 animate-fade-in">
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl glass shadow-2xl dark:shadow-indigo-950/30 border border-slate-200/70 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-lg">
              🌐
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base sm:text-lg">
                線上發布與分享
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                產生專屬短網址，可選密碼保護，流暢分享至各通訊與社群 App
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[calc(92vh-130px)] space-y-5">
          {!publishedResult ? (
            /* --- Form View --- */
            <form onSubmit={handlePublish} className="space-y-4">
              {/* Link Preview Card */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  📱 社群預覽卡片外觀（在各通訊軟體呈現之效果）
                </label>
                <div className="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-950/60 bg-gradient-to-br from-indigo-50/40 via-purple-50/20 to-slate-50/40 dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-slate-950/40 space-y-2">
                  <div>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="分享文章標題..."
                      className="w-full text-sm font-bold text-slate-800 dark:text-slate-100 bg-transparent border-b border-indigo-200/60 dark:border-indigo-800/60 pb-1 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="文章章節與簡介摘要..."
                      rows="2"
                      className="w-full text-xs text-slate-600 dark:text-slate-400 bg-transparent resize-none border-none p-0 focus:outline-none leading-relaxed"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-indigo-100/60 dark:border-indigo-900/40 text-[10px] text-slate-400">
                    <span>🔗 支援各通訊軟體卡片預覽</span>
                    <span>{isEncrypted ? '🔒 已啟用密碼' : '🌐 公開閱讀'}</span>
                  </div>
                </div>
              </div>

              {/* Password Protection Toggle */}
              <div className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/40 space-y-3">
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🔒</span>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">
                        設定存取密碼
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        開啟網址時必須輸入密碼才能解密閱讀
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isEncrypted}
                    onChange={(e) => setIsEncrypted(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500/30 accent-indigo-500 cursor-pointer"
                  />
                </label>

                {isEncrypted && (
                  <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 animate-fade-in">
                    <div className="relative flex items-center">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="請設定閱讀密碼..."
                        className="w-full px-3.5 py-2 pr-10 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                        required={isEncrypted}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 text-sm"
                        title={showPassword ? '隱藏密碼' : '顯示密碼'}
                      >
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 leading-relaxed flex items-center gap-1">
                      <span>🛡️</span>
                      <span>採用純瀏覽器原生 AES-256 零知識加密，伺服器無密碼紀錄，未得密碼者無法窺探內容。</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Server Endpoint Config (Accordion) */}
              <div className="border border-slate-200/60 dark:border-slate-800/60 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowServerConfig(!showServerConfig)}
                  className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-100/50 flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <span>⚙️</span>
                    <span>發布伺服器設定 {workerUrl ? '✅' : '（尚未設定）'}</span>
                  </span>
                  <span className="text-[10px] text-indigo-500">
                    {showServerConfig ? '收合 ▲' : '展開設定 ▼'}
                  </span>
                </button>

                {showServerConfig && (
                  <div className="p-3.5 space-y-2 bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800/60">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Cloudflare Worker 網址
                    </label>
                    <input
                      type="url"
                      value={workerUrl}
                      onChange={(e) => setWorkerUrlState(e.target.value)}
                      placeholder="https://your-worker.workers.dev"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      填入您部署的 Worker 網址或自訂域名，發布時檔案將安全存入您自己的 R2 儲存槽。
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-between items-center">
                <button
                  type="button"
                  onClick={onOpenHistory}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>📑</span>
                  <span>管理歷史記錄</span>
                </button>

                <button
                  type="submit"
                  disabled={isPublishing}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isPublishing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>正在發布中...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>立即發布並分享</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* --- Publish Success View --- */
            <div className="space-y-4 animate-fade-in text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20">
                🎉
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-base sm:text-lg">
                  線上發布成功！
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  文件已儲存至雲端，所有人點擊專屬短網址即可立即閱讀。
                </p>
              </div>

              {/* URL Box */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center gap-2 text-left">
                <input
                  type="text"
                  readOnly
                  value={publishedResult.url}
                  className="w-full text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-transparent border-none focus:outline-none select-all"
                />
                <button
                  onClick={() => handleCopy(publishedResult.url, '📋 短網址已複製到剪貼簿！')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shrink-0 transition-all"
                >
                  複製
                </button>
              </div>

              {/* Password notice if encrypted */}
              {publishedResult.isEncrypted && publishedResult.password && (
                <div className="p-3 rounded-xl border border-amber-200/70 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/30 text-left space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <span>🔒</span>
                      <span>本文件設有閱讀密碼：</span>
                    </span>
                    <button
                      onClick={() => handleCopy(publishedResult.password, '📋 密碼已複製！')}
                      className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      複製密碼
                    </button>
                  </div>
                  <div className="text-sm font-mono font-extrabold text-slate-800 dark:text-slate-100 bg-white/70 dark:bg-slate-900/70 px-2.5 py-1.5 rounded-lg border border-amber-200/50 dark:border-amber-800/50 inline-block">
                    {publishedResult.password}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    請將密碼一併提供給閱讀者，否則無法解鎖內容。
                  </p>
                </div>
              )}

              {/* Share Actions */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleSystemShare}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <span>📲</span>
                  <span>系統分享（直接發送至其他 APP）</span>
                </button>

                {publishedResult.isEncrypted && publishedResult.password && (
                  <button
                    onClick={() => {
                      const shareText = `${publishedResult.title}\n🔗 連結：${publishedResult.url}\n🔒 密碼：${publishedResult.password}`;
                      handleCopy(shareText, '📋 已複製完整分享訊息 (包含連結與密碼)！');
                    }}
                    className="w-full py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-bold transition-all"
                  >
                    📋 一鍵複製訊息（含連結與密碼）
                  </button>
                )}

                <div className="flex gap-2 pt-1">
                  <a
                    href={publishedResult.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold text-center transition-all"
                  >
                    🔗 開啟頁面
                  </a>
                  <button
                    onClick={onOpenHistory}
                    className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
                  >
                    📑 管理歷史記錄
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/30">
          <span className="text-[10px] text-slate-400">
            {publishedResult ? '管理金鑰已安全保存於本地' : '支援所有裝置與通訊軟體分享'}
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
