import { useState, useEffect, useRef } from 'react';
import {
  AI_PROVIDERS,
  PROMPT_PRESETS,
  DEFAULT_UNIVERSAL_PROMPT,
  getAiConfig,
  getSavedPrompts,
  saveSavedPrompts,
  getLastPromptId,
  setLastPromptId,
  callAiBeautify
} from '../utils/aiService';
import VoicePlayerBar from './VoicePlayerBar';

export default function AiBeautifyModal(props) {
  if (!props.isOpen) return null;
  return <AiBeautifyModalContent {...props} />;
}

function AiBeautifyModalContent({
  onClose,
  markdown,
  onApply,
  onOpenSettings,
  showToast
}) {
  const [aiConfig] = useState(() => getAiConfig());
  const [savedPrompts, setSavedPrompts] = useState(() => getSavedPrompts());
  const [selectedPromptId, setSelectedPromptId] = useState(() => getLastPromptId());
  const [promptText, setPromptText] = useState(() => {
    const lastId = getLastPromptId();
    const preset = PROMPT_PRESETS.find(p => p.id === lastId);
    if (preset) return preset.prompt;
    const saved = getSavedPrompts();
    const custom = saved.find(p => p.id === lastId);
    return custom ? custom.prompt : DEFAULT_UNIVERSAL_PROMPT;
  });

  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [customPromptName, setCustomPromptName] = useState('');

  // Execution state
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [resultText, setResultText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeResultTab, setActiveResultTab] = useState('preview'); // 'preview' | 'raw'
  const [showVoicePlayer, setShowVoicePlayer] = useState(false);

  const abortControllerRef = useRef(null);
  const timerRef = useRef(null);

  // Clean up timer and abort controller
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const currentProviderInfo = AI_PROVIDERS.find(p => p.id === aiConfig.provider) || AI_PROVIDERS[0];
  const hasApiKey = Boolean(aiConfig.apiKey && aiConfig.apiKey.trim());

  // Handle select prompt
  const handleSelectPrompt = (id) => {
    setSelectedPromptId(id);
    setLastPromptId(id);

    const preset = PROMPT_PRESETS.find(p => p.id === id);
    if (preset) {
      setPromptText(preset.prompt);
      return;
    }

    const custom = savedPrompts.find(p => p.id === id);
    if (custom) {
      setPromptText(custom.prompt);
    }
  };

  // Save as new custom prompt
  const handleSaveCustomPrompt = () => {
    if (!customPromptName.trim()) {
      showToast?.('請輸入 Prompt 範本名稱', 'info');
      return;
    }

    const newPrompt = {
      id: 'custom_' + Date.now(),
      name: customPromptName.trim(),
      prompt: promptText,
      updatedAt: Date.now()
    };

    const updated = [...savedPrompts, newPrompt];
    setSavedPrompts(updated);
    saveSavedPrompts(updated);
    setSelectedPromptId(newPrompt.id);
    setLastPromptId(newPrompt.id);
    setIsSavingCustom(false);
    setCustomPromptName('');
    showToast?.('✅ 已成功儲存自訂 Prompt 範本！', 'success');
  };

  // Update existing custom prompt
  const handleUpdateCurrentPrompt = () => {
    const customIndex = savedPrompts.findIndex(p => p.id === selectedPromptId);
    if (customIndex === -1) return;

    const updated = [...savedPrompts];
    updated[customIndex] = {
      ...updated[customIndex],
      prompt: promptText,
      updatedAt: Date.now()
    };

    setSavedPrompts(updated);
    saveSavedPrompts(updated);
    showToast?.('✅ 已更新此自訂 Prompt！', 'success');
  };

  // Delete custom prompt
  const handleDeleteCustomPrompt = () => {
    const updated = savedPrompts.filter(p => p.id !== selectedPromptId);
    setSavedPrompts(updated);
    saveSavedPrompts(updated);
    setSelectedPromptId('universal');
    setLastPromptId('universal');
    setPromptText(DEFAULT_UNIVERSAL_PROMPT);
    showToast?.('🗑️ 已刪除該自訂 Prompt 範本', 'info');
  };

  // Reset to default universal prompt
  const handleResetToDefault = () => {
    setPromptText(DEFAULT_UNIVERSAL_PROMPT);
    setSelectedPromptId('universal');
    setLastPromptId('universal');
    showToast?.('已還原為預設通用 Prompt', 'info');
  };

  // Execute AI Beautify
  const handleExecuteAi = async () => {
    if (!hasApiKey) {
      setErrorMsg('尚未設定 API Key，請點擊上方「⚙️ API 設定」進行配置。');
      return;
    }

    if (!markdown || !markdown.trim()) {
      setErrorMsg('編輯器中沒有可美化的 Markdown 內容！');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setElapsedSeconds(0);
    setShowVoicePlayer(false);

    const ac = new AbortController();
    abortControllerRef.current = ac;

    timerRef.current = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);

    try {
      const output = await callAiBeautify({
        prompt: promptText,
        markdown,
        config: aiConfig,
        signal: ac.signal
      });

      setResultText(output);
      showToast?.('🎉 AI 排版重新設計完成！', 'success');

      // If prompt suggests story or user selected story, auto enable voice player preview
      if (selectedPromptId === 'story_speech' || promptText.includes('故事稿')) {
        setShowVoicePlayer(true);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        showToast?.('已取消 AI 請求', 'info');
      } else {
        console.error('AI Beautify error:', err);
        setErrorMsg(err.message || 'AI 請求失敗，請檢查 API 設定與網路連線。');
      }
    } finally {
      setLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleApplyResult = () => {
    if (!resultText) return;
    onApply(resultText);
    onClose();
  };

  const isCurrentCustom = selectedPromptId.startsWith('custom_');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 animate-fade-in">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl glass shadow-2xl dark:shadow-indigo-950/30 border border-slate-200/70 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-indigo-600 text-white rounded-xl shadow-md">
              <span className="text-lg">🤖</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base sm:text-lg">
                  AI 智能排版與內容美化
                </h3>
                {/* Active Provider Badge */}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                  hasApiKey
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hasApiKey ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                  <span>{currentProviderInfo.name} ({aiConfig.model})</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                透過大語言模型深度重新排版、精修圖表表格、潤飾擴充、風格重塑或改寫為故事稿配音
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings?.('ai');
              }}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs transition-all flex items-center gap-1"
              title="前往偏好設定修改 AI API 金鑰與模型"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">API 設定</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(92vh-140px)] space-y-4">
          
          {/* Missing API Key Warning */}
          {!hasApiKey && (
            <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <span>尚未設定 <strong>{currentProviderInfo.name}</strong> 的 API Key，無法呼叫 AI 模型。</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings?.('ai');
                }}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 shadow-xs transition-all"
              >
                前往設定
              </button>
            </div>
          )}

          {/* Prompt Management Section */}
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/80">
            {/* Top row: Select preset/custom prompt & Actions */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                  🎯 指令範本 (Prompt)：
                </label>
                <select
                  value={selectedPromptId}
                  onChange={(e) => handleSelectPrompt(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 flex-1"
                >
                  <optgroup label="✨ 系統內建範本">
                    {PROMPT_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                  {savedPrompts.length > 0 && (
                    <optgroup label="💾 我的自訂 Prompt 範本">
                      {savedPrompts.map((p) => (
                        <option key={p.id} value={p.id}>⭐ {p.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Action Buttons for Prompt */}
              <div className="flex items-center gap-1.5 ml-auto">
                {isCurrentCustom ? (
                  <>
                    <button
                      type="button"
                      onClick={handleUpdateCurrentPrompt}
                      className="px-2 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-all"
                      title="覆蓋儲存目前修改至此自訂範本"
                    >
                      💾 儲存修改
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteCustomPrompt}
                      className="px-2 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                      title="刪除此自訂範本"
                    >
                      🗑️ 刪除
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSavingCustom(!isSavingCustom)}
                    className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-900/50 rounded-lg transition-all flex items-center gap-1"
                  >
                    <span>💾</span>
                    <span>另存為新範本</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-all"
                  title="還原為預設通用 Prompt"
                >
                  🔄 還原預設
                </button>
              </div>
            </div>

            {/* Inline Save Prompt Input */}
            {isSavingCustom && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 animate-fade-in">
                <input
                  type="text"
                  value={customPromptName}
                  onChange={(e) => setCustomPromptName(e.target.value)}
                  placeholder="請輸入自訂 Prompt 範本名稱 (例如: 英文科技演說稿)"
                  className="flex-1 px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleSaveCustomPrompt}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded shadow-xs"
                >
                  儲存
                </button>
                <button
                  type="button"
                  onClick={() => setIsSavingCustom(false)}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600"
                >
                  取消
                </button>
              </div>
            )}

            {/* Prompt Editor Textarea */}
            <textarea
              rows={4}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="輸入或修改 AI 美化 Prompt 指令..."
              className="w-full p-2.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          {/* Action Button & Status Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExecuteAi}
                disabled={loading || !hasApiKey}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white font-extrabold text-xs shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                    <span>AI 美化設計中 ({elapsedSeconds}s)...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>開始 AI 重新設計美化</span>
                  </>
                )}
              </button>

              {loading && (
                <button
                  type="button"
                  onClick={handleCancelRequest}
                  className="px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all font-bold"
                >
                  取消請求
                </button>
              )}
            </div>

            {/* Quick Helper Note */}
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              💡 美化後支援一鍵「套用至編輯器」，隨時可用 Ctrl+Z 復原
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-fade-in">
              <span className="text-base shrink-0">❌</span>
              <div className="space-y-1">
                <div className="font-bold">AI 處理失敗</div>
                <div className="text-[11px] leading-relaxed break-all">{errorMsg}</div>
              </div>
            </div>
          )}

          {/* AI Result Section */}
          {resultText && (
            <div className="space-y-3 p-4 rounded-xl border border-indigo-200/70 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/30 to-white dark:from-indigo-950/20 dark:to-slate-900/40 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                    <span>🎉</span>
                    <span>AI 美化成果</span>
                  </span>
                  
                  {/* Segmented Tab */}
                  <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/60 dark:border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => setActiveResultTab('preview')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                        activeResultTab === 'preview'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                      }`}
                    >
                      排版預覽
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveResultTab('raw')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                        activeResultTab === 'raw'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                      }`}
                    >
                      Markdown 原始碼
                    </button>
                  </div>
                </div>

                {/* Top Action Buttons for result */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowVoicePlayer(!showVoicePlayer)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 ${
                      showVoicePlayer
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 hover:bg-indigo-100'
                    }`}
                    title="使用內建語音朗讀此故事稿或排版成果"
                  >
                    <span>🎙️</span>
                    <span>{showVoicePlayer ? '收合語音播放器' : '語音朗讀 (故事稿)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(resultText);
                      showToast?.('📋 已複製美化結果至剪貼簿！', 'success');
                    }}
                    className="px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-all"
                  >
                    複製結果
                  </button>
                </div>
              </div>

              {/* Voice Player Bar Component (if toggled) */}
              {showVoicePlayer && (
                <VoicePlayerBar
                  text={resultText}
                  onClose={() => setShowVoicePlayer(false)}
                  autoPlay={false}
                />
              )}

              {/* Result Content Box */}
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950/70 overflow-hidden">
                {activeResultTab === 'raw' ? (
                  <pre className="p-3 text-xs font-mono text-slate-800 dark:text-slate-200 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {resultText}
                  </pre>
                ) : (
                  <div className="p-4 max-h-72 overflow-y-auto text-xs text-slate-800 dark:text-slate-200 prose dark:prose-invert max-w-none whitespace-pre-wrap font-sans leading-relaxed">
                    {resultText}
                  </div>
                )}
              </div>

              {/* Bottom Apply Action */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  字數：{resultText.length} 字
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs"
                  >
                    保留原樣關閉
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyResult}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span>✨</span>
                    <span>套用至編輯器</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
