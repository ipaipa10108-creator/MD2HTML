// Speech Service for MD2HTML
// Uses Browser Native Web Speech API (SpeechSynthesis)
// Supports speed adjustments, sentence-by-sentence reading, and progress persistence for resume.

const STORAGE_KEY_SPEECH_PROGRESS = 'md2html-speech-progress-map';
const STORAGE_KEY_SPEECH_RATE = 'md2html-speech-rate';
const STORAGE_KEY_SPEECH_VOICE = 'md2html-speech-voice';

// Simple fast string hash for document identification
export const getDocHash = (text) => {
  if (!text) return 'empty';
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'doc_' + Math.abs(hash);
};

// Convert Markdown text to clean speech paragraphs
export const markdownToSpeechSegments = (markdown) => {
  if (!markdown || !markdown.trim()) return [];

  // Remove code blocks (Mermaid, code snippets) as they sound bad read aloud
  let clean = markdown.replace(/```[\s\S]*?```/g, '');
  
  // Remove HTML comments and tags
  clean = clean.replace(/<!--[\s\S]*?-->/g, '');
  clean = clean.replace(/<[^>]+>/g, '');

  // Remove markdown images ![alt](url)
  clean = clean.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');

  // Convert markdown links [text](url) to just text
  clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove blockquote alerts e.g. > [!NOTE] -> 提示：
  clean = clean.replace(/>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/gi, (match, p1) => {
    const map = {
      note: '重點備註：',
      tip: '實用技巧：',
      important: '重要提示：',
      warning: '警告注意：',
      caution: '特別警示：'
    };
    return map[p1.toLowerCase()] || '提示：';
  });

  // Remove blockquote '>' signs
  clean = clean.replace(/^>\s*/gm, '');

  // Convert headers # Title to Title
  clean = clean.replace(/^#{1,6}\s+(.+)$/gm, '$1。');

  // Convert bullet points - Item or * Item to Item
  clean = clean.replace(/^[-*+]\s+(.+)$/gm, '$1。');

  // Convert numbered lists 1. Item to Item
  clean = clean.replace(/^\d+\.\s+(.+)$/gm, '$1。');

  // Remove bold/italic markers
  clean = clean.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');

  // Remove inline code backticks `code`
  clean = clean.replace(/`([^`]+)`/g, '$1');

  // Remove horizontal rules
  clean = clean.replace(/^---+$|^===+$/gm, '');

  // Split into paragraphs / sentences
  const rawParagraphs = clean.split(/\n\s*\n|\r\n\s*\r\n/);
  const segments = [];

  for (const para of rawParagraphs) {
    const trimmed = para.trim().replace(/\s+/g, ' ');
    if (!trimmed) continue;

    // If paragraph is very long, split by sentences (。！？.!?\n)
    if (trimmed.length > 120) {
      const sentenceRegex = /[^。！？!?\n]+[。！？!?\n]?/g;
      const matched = trimmed.match(sentenceRegex);
      if (matched && matched.length > 1) {
        for (const s of matched) {
          const st = s.trim();
          if (st) segments.push(st);
        }
        continue;
      }
    }
    segments.push(trimmed);
  }

  return segments;
};

// Speech Controller
export class SpeechController {
  constructor() {
    this.segments = [];
    this.currentIndex = 0;
    this.docId = 'default';
    this.rate = 1.0;
    this.voice = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.utterance = null;
    this.onProgress = null; // (current, total, text) => {}
    this.onEnd = null; // () => {}
    this.onError = null; // (err) => {}
    this.onStateChange = null; // (state) => {}

    this.initSettings();
  }

  initSettings() {
    try {
      const savedRate = localStorage.getItem(STORAGE_KEY_SPEECH_RATE);
      if (savedRate) {
        const r = parseFloat(savedRate);
        if (!isNaN(r) && r >= 0.5 && r <= 2.0) this.rate = r;
      }
    } catch (e) {
      console.warn(e);
    }
  }

  // Load document text
  loadText(text) {
    this.stop();
    this.docId = getDocHash(text);
    this.segments = markdownToSpeechSegments(text);
    this.currentIndex = 0;
  }

  // Check if speech synthesis is supported
  isSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  // Get available voices
  getVoices() {
    if (!this.isSupported()) return [];
    return window.speechSynthesis.getVoices();
  }

  // Get preferred default voice (prioritize Traditional Chinese)
  getDefaultVoice() {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;

    // Check saved voice URI first
    try {
      const savedVoiceUri = localStorage.getItem(STORAGE_KEY_SPEECH_VOICE);
      if (savedVoiceUri) {
        const found = voices.find(v => v.voiceURI === savedVoiceUri);
        if (found) return found;
      }
    } catch {
      // ignore
    }

    // Prioritize zh-TW, zh-HK, zh-CN, then Chinese
    const twVoice = voices.find(v => v.lang.includes('zh-TW') || v.lang.includes('cmn-TW'));
    if (twVoice) return twVoice;

    const zhVoice = voices.find(v => v.lang.startsWith('zh'));
    if (zhVoice) return zhVoice;

    return voices[0];
  }

  setVoice(voice) {
    this.voice = voice;
    try {
      if (voice) {
        localStorage.setItem(STORAGE_KEY_SPEECH_VOICE, voice.voiceURI);
      }
    } catch (e) {
      console.warn(e);
    }
  }

  setRate(rate) {
    this.rate = Math.max(0.5, Math.min(2.0, rate));
    try {
      localStorage.setItem(STORAGE_KEY_SPEECH_RATE, String(this.rate));
    } catch (e) {
      console.warn(e);
    }

    // If currently playing, restart current segment with new rate
    if (this.isPlaying && !this.isPaused) {
      this.playIndex(this.currentIndex);
    }
  }

  getSavedProgress() {
    try {
      const mapRaw = localStorage.getItem(STORAGE_KEY_SPEECH_PROGRESS);
      if (!mapRaw) return null;
      const map = JSON.parse(mapRaw);
      return map[this.docId] || null;
    } catch {
      return null;
    }
  }

  saveProgress(index) {
    try {
      const mapRaw = localStorage.getItem(STORAGE_KEY_SPEECH_PROGRESS);
      const map = mapRaw ? JSON.parse(mapRaw) : {};
      map[this.docId] = {
        index,
        total: this.segments.length,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY_SPEECH_PROGRESS, JSON.stringify(map));
    } catch (e) {
      console.warn('Failed to save speech progress:', e);
    }
  }

  clearSavedProgress() {
    try {
      const mapRaw = localStorage.getItem(STORAGE_KEY_SPEECH_PROGRESS);
      if (mapRaw) {
        const map = JSON.parse(mapRaw);
        delete map[this.docId];
        localStorage.setItem(STORAGE_KEY_SPEECH_PROGRESS, JSON.stringify(map));
      }
    } catch (e) {
      console.warn(e);
    }
  }

  play() {
    if (!this.isSupported()) {
      if (this.onError) this.onError('此瀏覽器不支援內建語音朗讀功能');
      return;
    }

    if (this.isPaused) {
      this.resume();
      return;
    }

    if (this.segments.length === 0) return;

    this.playIndex(this.currentIndex);
  }

  playIndex(index) {
    if (!this.isSupported()) return;

    window.speechSynthesis.cancel();

    if (index >= this.segments.length) {
      this.isPlaying = false;
      this.isPaused = false;
      this.currentIndex = 0;
      this.clearSavedProgress();
      if (this.onEnd) this.onEnd();
      if (this.onStateChange) this.onStateChange({ isPlaying: false, isPaused: false });
      return;
    }

    this.currentIndex = Math.max(0, index);
    this.saveProgress(this.currentIndex);

    const textToSpeak = this.segments[this.currentIndex];
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    this.utterance = utterance;

    const activeVoice = this.voice || this.getDefaultVoice();
    if (activeVoice) {
      utterance.voice = activeVoice;
      utterance.lang = activeVoice.lang;
    } else {
      utterance.lang = 'zh-TW';
    }

    utterance.rate = this.rate;

    utterance.onstart = () => {
      this.isPlaying = true;
      this.isPaused = false;
      if (this.onProgress) {
        this.onProgress(this.currentIndex + 1, this.segments.length, textToSpeak);
      }
      if (this.onStateChange) {
        this.onStateChange({ isPlaying: true, isPaused: false });
      }
    };

    utterance.onend = () => {
      if (this.isPlaying && !this.isPaused) {
        this.playIndex(this.currentIndex + 1);
      }
    };

    utterance.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      console.warn('SpeechSynthesis error:', e);
      if (this.onError) this.onError(e.error || '語音播放中斷');
    };

    window.speechSynthesis.speak(utterance);
  }

  pause() {
    if (!this.isSupported()) return;
    if (this.isPlaying && !this.isPaused) {
      this.isPaused = true;
      window.speechSynthesis.pause();
      if (this.onStateChange) {
        this.onStateChange({ isPlaying: true, isPaused: true });
      }
    }
  }

  resume() {
    if (!this.isSupported()) return;
    if (this.isPaused) {
      this.isPaused = false;
      window.speechSynthesis.resume();
      if (this.onStateChange) {
        this.onStateChange({ isPlaying: true, isPaused: false });
      }
    } else {
      this.playIndex(this.currentIndex);
    }
  }

  stop() {
    if (!this.isSupported()) return;
    window.speechSynthesis.cancel();
    this.isPlaying = false;
    this.isPaused = false;
    this.saveProgress(this.currentIndex);
    if (this.onStateChange) {
      this.onStateChange({ isPlaying: false, isPaused: false });
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.playIndex(this.currentIndex - 1);
    }
  }

  next() {
    if (this.currentIndex < this.segments.length - 1) {
      this.playIndex(this.currentIndex + 1);
    }
  }
}
