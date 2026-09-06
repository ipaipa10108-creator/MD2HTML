import { useState, useEffect } from 'react';
import { SpeechController } from '../utils/speechService';

export default function VoicePlayerBar({ text, onClose, autoPlay = false, className = '' }) {
  const [controller] = useState(() => {
    const sc = new SpeechController();
    sc.loadText(text);
    return sc;
  });
  const [state, setState] = useState({ isPlaying: false, isPaused: false });
  const [progress, setProgress] = useState({ current: 0, total: 0, text: '' });
  const [rate, setRate] = useState(() => controller.rate);
  const [savedProgress, setSavedProgress] = useState(() => {
    const saved = controller.getSavedProgress();
    return saved && saved.index > 0 && saved.index < controller.segments.length ? saved : null;
  });
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    controller.onStateChange = (st) => setState({ ...st });
    controller.onProgress = (cur, tot, txt) => setProgress({ current: cur, total: tot, text: txt });
    controller.onEnd = () => {
      setProgress(p => ({ ...p, current: 0, text: '朗讀完畢 🎉' }));
      setSavedProgress(null);
    };
    controller.onError = (err) => setErrorMsg(err);

    let playTimer = null;
    if (autoPlay) {
      playTimer = setTimeout(() => controller.play(), 300);
    }

    return () => {
      if (playTimer) clearTimeout(playTimer);
      controller.stop();
    };
  }, [controller, autoPlay]);

  const handlePlayPause = () => {
    if (!controller) return;
    if (state.isPlaying && !state.isPaused) {
      controller.pause();
    } else if (state.isPaused) {
      controller.resume();
    } else {
      controller.play();
    }
  };

  const handleStop = () => {
    if (!controller) return;
    controller.stop();
    setProgress(p => ({ ...p, current: 0, text: '' }));
  };

  const handleResume = () => {
    if (!controller || !savedProgress) return;
    controller.playIndex(savedProgress.index);
    setSavedProgress(null);
  };

  const handleRateChange = (newRate) => {
    if (!controller) return;
    setRate(newRate);
    controller.setRate(newRate);
  };

  if (!controller || !controller.isSupported()) {
    return (
      <div className={`p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between ${className}`}>
        <span>⚠️ 您的瀏覽器尚未支援內建語音朗讀合成 API (Web Speech API)。</span>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 px-1">✕</button>
        )}
      </div>
    );
  }

  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className={`rounded-2xl p-3 sm:p-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-indigo-200/70 dark:border-indigo-900/60 shadow-xl transition-all space-y-2.5 animate-fade-in ${className}`}>
      {/* Top row: Status, Controls, Speed, Close */}
      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        {/* Left: Indicator & Progress */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
            {state.isPlaying && !state.isPaused ? (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
            ) : (
              <span className="text-base">🎙️</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">內建語音朗讀</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold">
                {controller.segments.length > 0 ? `${progress.current || (savedProgress ? savedProgress.index + 1 : 1)} / ${controller.segments.length} 段` : '無內容'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {state.isPlaying && !state.isPaused ? '正在播放故事稿 / 內文...' : (state.isPaused ? '暫停中' : '準備播放')}
            </div>
          </div>
        </div>

        {/* Center: Playback Buttons */}
        <div className="flex items-center gap-1">
          {/* Prev */}
          <button
            type="button"
            onClick={() => controller.prev()}
            disabled={!state.isPlaying}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-all"
            title="上一段"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          {/* Play / Pause Toggle */}
          <button
            type="button"
            onClick={handlePlayPause}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all active:scale-95 flex items-center gap-1.5"
            title={state.isPlaying && !state.isPaused ? '暫停' : '播放'}
          >
            {state.isPlaying && !state.isPaused ? (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
                <span>暫停</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <span>{state.isPaused ? '繼續' : '播放'}</span>
              </>
            )}
          </button>

          {/* Stop */}
          <button
            type="button"
            onClick={handleStop}
            disabled={!state.isPlaying && !state.isPaused}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-all"
            title="停止"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z"/>
            </svg>
          </button>

          {/* Next */}
          <button
            type="button"
            onClick={() => controller.next()}
            disabled={!state.isPlaying}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-all"
            title="下一段"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
        </div>

        {/* Right: Speed Selection & Close */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Rate Selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg p-0.5 border border-slate-200/60 dark:border-slate-700/60">
            {[0.75, 1.0, 1.25, 1.5, 2.0].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRateChange(r)}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-all ${
                  rate === r
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title={`播放速度 ${r}x`}
              >
                {r}x
              </button>
            ))}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={() => {
                handleStop();
                onClose();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              title="關閉播放器"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Saved Progress Resume Banner */}
      {savedProgress && !state.isPlaying && (
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200 text-xs animate-fade-in">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span>📌</span>
            <span>已保存上次播放進度至 <strong>第 {savedProgress.index + 1} 段</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleResume}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-xs transition-all active:scale-95"
            >
              從上次續播
            </button>
            <button
              type="button"
              onClick={() => {
                controller.clearSavedProgress();
                setSavedProgress(null);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px]"
              title="清除進度記錄"
            >
              忽略
            </button>
          </div>
        </div>
      )}

      {/* Current Reading Text Snippet */}
      {progress.text && (
        <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
          <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1">正在朗讀：</span>
          {progress.text}
        </div>
      )}

      {errorMsg && (
        <div className="text-[11px] text-rose-500 dark:text-rose-400 font-semibold">
          ⚠️ {errorMsg}
        </div>
      )}
    </div>
  );
}
