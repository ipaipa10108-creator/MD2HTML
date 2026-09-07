// AI Service for MD2HTML
// Supports: OpenAI, Claude (Anthropic), Gemini (Google), OpenRouter, and Custom (OpenAI-compatible)

export const AI_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-mini', 'o3-mini'],
    placeholderKey: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    placeholderKey: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys'
  },
  {
    id: 'gemini',
    name: 'Gemini (Google)',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-3.5-flash-lite',
    models: [
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemma-4-26b',
      'gemini-2.5-flash',
      'gemma-2-27b-it'
    ],
    placeholderKey: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (聚合平台)',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.0-flash-exp:free',
    models: [
      'google/gemini-2.0-flash-exp:free',
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o-mini',
      'deepseek/deepseek-chat',
      'meta-llama/llama-3.3-70b-instruct'
    ],
    placeholderKey: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys'
  },
  {
    id: 'custom',
    name: '自訂相容 API (OpenAI 規格)',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner', 'llama3', 'mistral-large'],
    placeholderKey: '輸入自訂 API Key',
    docsUrl: ''
  }
];

// OpenRouter Free Models (ending in :free)
export const OPENROUTER_FREE_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-2.0-pro-exp-02-05:free',
  'google/gemini-2.0-flash-thinking-exp:free',
  'deepseek/deepseek-r1:free',
  'deepseek/deepseek-chat:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'qwen/qwen-2.5-coder-32b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'mistralai/mistral-small-24b-instruct-2501:free',
  'cognitivecomputations/dolphin3.0-r1-mistral-24b:free'
];

// Gemini Flash-Lite and Gemma Models baseline with RPD (Requests Per Day), sorted descending
export const GEMINI_LITE_GEMMA_MODELS = [
  { id: 'gemma-4-26b', name: 'Gemma 4 26B', rpd: 14400, rpm: 30, family: 'gemma' },
  { id: 'gemma-4-31b', name: 'Gemma 4 31B', rpd: 14400, rpm: 30, family: 'gemma' },
  { id: 'gemma-2-27b-it', name: 'Gemma 2 27B IT', rpd: 14400, rpm: 30, family: 'gemma' },
  { id: 'gemma-2-9b-it', name: 'Gemma 2 9B IT', rpd: 14400, rpm: 30, family: 'gemma' },
  { id: 'gemma-2-2b-it', name: 'Gemma 2 2B IT', rpd: 14400, rpm: 30, family: 'gemma' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', rpd: 500, rpm: 15, family: 'flash-lite' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', rpd: 500, rpm: 15, family: 'flash-lite' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', rpd: 20, rpm: 10, family: 'flash-lite' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite', rpd: 0, rpm: 0, family: 'flash-lite' }
].sort((a, b) => b.rpd - a.rpd);

// Storage keys for live models cache
const STORAGE_KEY_GEMINI_LIVE = 'md2html-gemini-live-models';
const STORAGE_KEY_OPENROUTER_LIVE_FREE = 'md2html-openrouter-live-free';

// Calculate RPD and RPM based on model name according to Google's official free-tier rate limits
export const getGeminiModelRateLimit = (modelId) => {
  const id = modelId.toLowerCase();

  // 1. Live API models (Unlimited)
  if (id.includes('live') || id.includes('native-audio') || id.includes('native_audio')) {
    return { rpd: 999999, rpm: 999999, isUnlimited: true, family: 'live' };
  }

  // 2. Gemma series (Gemma 4 26B, Gemma 4 31B, Gemma 2, etc.) -> 14,400 RPD, 30 RPM
  if (id.includes('gemma')) {
    return { rpd: 14400, rpm: 30, family: 'gemma' };
  }

  // 3. Antigravity Agent -> 100 RPD, 60 RPM
  if (id.includes('antigravity')) {
    return { rpd: 100, rpm: 60, family: 'agents' };
  }

  // 4. TTS models (2.5 / 3.1 Flash TTS) -> 10 RPD, 3 RPM
  if (id.includes('tts')) {
    return { rpd: 10, rpm: 3, family: 'tts' };
  }

  // 5. Transcribe models -> 25 RPD, 3 RPM
  if (id.includes('transcribe')) {
    return { rpd: 25, rpm: 3, family: 'audio' };
  }

  // 6. Embedding models (Embedding 1, Embedding 2) -> 1,000 RPD, 100 RPM
  if (id.includes('embedding')) {
    return { rpd: 1000, rpm: 100, family: 'embedding' };
  }

  // 7. Robotics ER 2 -> 20 RPD, 5 RPM
  if (id.includes('robotics')) {
    return { rpd: 20, rpm: 5, family: 'other' };
  }

  // 8. Flash-Lite series:
  if (id.includes('flash-lite') || id.includes('flash_lite') || id.includes('flashlite')) {
    // 3.1, 3.5 (and later 3.x) Flash Lite -> 500 RPD, 15 RPM
    if (/3\.[1-9]|3\.\d{2}/.test(id)) {
      return { rpd: 500, rpm: 15, family: 'flash-lite' };
    }
    // 2.5 Flash Lite -> 20 RPD, 10 RPM
    if (id.includes('2.5')) {
      return { rpd: 20, rpm: 10, family: 'flash-lite' };
    }
    // 2.0 / 2 Flash Lite -> 0 RPD, 0 RPM
    if (id.includes('2.0') || (/2[-_]?flash/.test(id) && !id.includes('2.5'))) {
      return { rpd: 0, rpm: 0, family: 'flash-lite' };
    }
    // Default fallback for flash-lite
    return { rpd: 500, rpm: 15, family: 'flash-lite' };
  }

  // 9. Standard Flash series (Text-out models):
  if (id.includes('flash')) {
    // 2.0 / 2 Flash -> 0 RPD, 0 RPM
    if (id.includes('2.0') || (/2[-_]?flash/.test(id) && !id.includes('2.5'))) {
      return { rpd: 0, rpm: 0, family: 'flash' };
    }
    // 2.5, 3, 3.5, 3.6, 3.7, 3.8 Flash -> 20 RPD, 5 RPM
    if (/2\.5|3(\.[0-9])?/.test(id)) {
      return { rpd: 20, rpm: 5, family: 'flash' };
    }
    // Default fallback for Flash
    return { rpd: 20, rpm: 5, family: 'flash' };
  }

  // 10. Pro models (2.5 Pro, 3.1 Pro, 2.0 Pro) -> 0 RPD, 0 RPM
  if (id.includes('pro')) {
    return { rpd: 0, rpm: 0, family: 'pro' };
  }

  // 11. Multi-modal / Preview models with 0 Free tier
  if (
    id.includes('banana') ||
    id.includes('omni') ||
    id.includes('veo') ||
    id.includes('lyria') ||
    id.includes('deep-research') ||
    id.includes('computer-use')
  ) {
    return { rpd: 0, rpm: 0, family: 'other' };
  }

  return { rpd: 20, rpm: 5, family: 'other' };
};

// Fetch real-time model list from Google Gemini API
export const fetchGeminiLiveModels = async (apiKey, baseUrl) => {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('請先填入 Gemini API Key 才能即時獲取您帳號可用的模型清單。');
  }

  const rootUrl = (baseUrl || 'https://generativelanguage.googleapis.com/v1beta').trim().replace(/\/+$/, '');
  const url = `${rootUrl}/models?key=${apiKey.trim()}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    const errText = await resp.text();
    let msg = `Google API 連線失敗 (${resp.status})`;
    try {
      const j = JSON.parse(errText);
      msg = j.error?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  const data = await resp.json();
  const rawList = data.models || [];

  // Filter only models that support generateContent
  const validModels = rawList
    .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
    .map(m => {
      const cleanId = m.name.replace(/^models\//, '');
      const rate = getGeminiModelRateLimit(cleanId);
      const isLiteOrGemma = rate.family === 'flash-lite' || rate.family === 'gemma';
      return {
        id: cleanId,
        name: m.displayName || cleanId,
        description: m.description || '',
        rpd: rate.rpd,
        rpm: rate.rpm,
        family: rate.family,
        isLiteOrGemma,
        inputTokenLimit: m.inputTokenLimit,
        outputTokenLimit: m.outputTokenLimit
      };
    })
    .sort((a, b) => {
      // Sort by RPD descending (14,400 RPD before 1,500 RPD)
      if (b.rpd !== a.rpd) return b.rpd - a.rpd;
      return a.id.localeCompare(b.id);
    });

  try {
    localStorage.setItem(STORAGE_KEY_GEMINI_LIVE, JSON.stringify(validModels));
  } catch {}

  return validModels;
};

// Get cached live Gemini models
export const getCachedGeminiLiveModels = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GEMINI_LIVE);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {}
  return null;
};

// Fetch real-time free models from OpenRouter API
export const fetchOpenRouterLiveFreeModels = async () => {
  const resp = await fetch('https://openrouter.ai/api/v1/models');
  if (!resp.ok) {
    throw new Error(`OpenRouter API 回應錯誤 (${resp.status})`);
  }
  const data = await resp.json();
  const models = data.data || [];

  const freeModels = models
    .filter(m => m.id.endsWith(':free') || (m.pricing && m.pricing.prompt === '0' && m.pricing.completion === '0'))
    .map(m => ({
      id: m.id,
      name: m.name || m.id,
      description: m.description || '',
      contextLength: m.context_length || 0
    }));

  try {
    localStorage.setItem(STORAGE_KEY_OPENROUTER_LIVE_FREE, JSON.stringify(freeModels));
  } catch {}

  return freeModels;
};

export const getCachedOpenRouterLiveFreeModels = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OPENROUTER_LIVE_FREE);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {}
  return null;
};

// Default Universal Prompt
export const DEFAULT_UNIVERSAL_PROMPT = `你是一位頂尖的 Markdown 排版與內容架構美化專家。請將使用者提供的 Markdown 內容進行深度重新設計與排版優化。

請全面遵循以下原則進行編排：
1. **圖表與格式修復**：
   - 修正任何破碎換行、縮排混亂或未閉合的程式碼區塊。
   - 將任何 ASCII / Unicode 框線表格或鬆散列表重編為標準 GFM 表格。
   - 若內容涉及流程、時序、架構或步驟，自動提煉或修復為語法精確的 Mermaid 向量圖表（\`\`\`mermaid）。
2. **層次結構與視覺重塑**：
   - 合理劃分一級至四級標題（# ~ ####），維持清晰的大綱脈絡。
   - 善用 GitHub 規範提示框（> [!NOTE]、> [!TIP]、> [!IMPORTANT]、> [!WARNING]、> [!CAUTION]）來醒目標記關鍵提示。
   - 適度加入專業 Emoji、標籤徽章與水平分隔線（---）增加視覺層次感。
3. **語言潤飾與流暢度**：
   - 保留原文所有核心數據與論點，剔除贅詞，優化標點符號與專有名詞，使文筆更通順易讀（如使用者有指定語言則在地化轉換）。
4. **內容補充與要點提煉**：
   - 在各重要段落末尾適度提煉核心要點（Key Takeaways）或補充結論架構，使讀者能快速掌握精髓。
5. **故事稿與朗讀親和力**：
   - 若內容為故事、散文、演說或長文敘述，請轉化為條理分明、語音朗讀親和的故事講稿，段落長度適中，方便使用內建語音朗讀播放。

【輸出規定】：
- 請直接輸出美化後的 Markdown 全文，**嚴禁**輸出任何前後問候語、解釋性廢話或包裹在額外反引號外的外層對話。`;

// Built-in Prompt Presets
export const PROMPT_PRESETS = [
  {
    id: 'universal',
    name: '🌟 通用全效排版美化 (預設)',
    description: '圖表修復、層次重構、提示框美化、流暢潤飾與故事朗讀親和',
    prompt: DEFAULT_UNIVERSAL_PROMPT
  },
  {
    id: 'charts_tables',
    name: '📊 圖表與表格精修 (Mermaid + GFM)',
    description: '專注將文字數據轉換為 Mermaid 向量圖表與標準 Markdown 表格',
    prompt: `你是一位數據可視化與技術文檔專家。請將使用者的 Markdown 內容進行「圖表與表格精修」：
1. 嚴格檢查所有表格，重構為語法標準、對齊完美的 GFM Markdown 表格。
2. 將文章中的步驟、時序、狀態流轉或分類架構，轉化為語法正確的 Mermaid 向量圖表（flowchart TD/LR, sequenceDiagram, pie, gantt, classDiagram 等）。
3. 確保 Mermaid 代碼塊以 \`\`\`mermaid 開頭並正確閉合，節點文字若有特殊符號需加上雙引號。
4. 修正程式碼區塊標籤與排版。
【輸出規定】：請直接回傳重新設計後的 Markdown 內容，不要包含問候語或解說。`
  },
  {
    id: 'story_speech',
    name: '🎙️ 故事稿與語音朗讀改寫 (Story & Speech)',
    description: '改寫為生動引人的故事稿或廣播講稿，適合搭配內建語音朗讀播放',
    prompt: `你是一位專業的說故事大師與演說撰稿人。請將使用者的 Markdown 內容改寫為適合「語音朗讀收聽的故事稿」：
1. 語氣生動自然、富有感染力與節奏感，段落長度適中（適合逐句朗讀與停頓）。
2. 在故事或講稿中保留原內容的核心事實與知識點，但以生動案例、引人入勝的開場與富有哲理的收尾重新編排。
3. 採用 Markdown 標題清晰劃分篇章（如：序幕、轉折、高潮、啟發與結語）。
4. 適度穿插重點金句標記（使用 > [!TIP] 醒目引言）。
【輸出規定】：請直接回傳故事講稿的 Markdown 全文，不要包含多餘的前後說明。`
  },
  {
    id: 'localization',
    name: '🌐 專業語言翻譯與在地化潤飾',
    description: '精確翻譯並轉換為台灣常用繁體中文（或指定語系），保留排版語法',
    prompt: `你是一位資深的多語言技術翻譯與排版專家。請將使用者的 Markdown 內容進行在地化翻譯與專業潤飾：
1. 預設翻譯為流暢自然的繁體中文（台灣用語習慣，例如：程式碼、演算法、專案、使用者）。
2. 完整保留原文的所有 Markdown 標籤、程式碼區塊、Mermaid 圖表與表格結構不被破壞。
3. 術語專有名詞若合適可在括號中保留英文原文對照。
4. 標題與內文條目層次優化，排版更具視覺美感。
【輸出規定】：請直接輸出翻譯並排版後的 Markdown 全文，無需多餘贅述。`
  },
  {
    id: 'visual_styling',
    name: '🎨 視覺排版與提示框配色強化',
    description: '善用 GitHub 樣式提示框（Alerts）、Emoji 徽章、分割線重塑現代科技感',
    prompt: `你是一位前沿 UI/UX 與文檔美學設計師。請大幅提升這篇 Markdown 的視覺觀感與排版層次：
1. 廣泛且恰當地運用 GitHub 樣式 Alert 提示框（> [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION]）分流重要資訊。
2. 每個章節標題加入呼應主題的精緻 Emoji 與標籤。
3. 長篇大論轉換為清單列表、重點加粗與行內代碼標記，大幅增強「F 型掃描閱讀」體驗。
4. 將複雜對比內容整理為乾淨的 Markdown 對比表格。
【輸出規定】：請直接輸出視覺強化後的 Markdown 全文，無需額外對話。`
  }
];

// LocalStorage Keys
const STORAGE_KEY_AI_CONFIG = 'md2html-ai-config';
const STORAGE_KEY_SAVED_PROMPTS = 'md2html-saved-prompts';
const STORAGE_KEY_LAST_PROMPT_ID = 'md2html-last-prompt-id';

// Get AI Configuration
export const getAiConfig = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AI_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        provider: parsed.provider || 'openai',
        apiKey: parsed.apiKey || '',
        model: parsed.model || 'gpt-4o',
        baseUrl: parsed.baseUrl || 'https://api.openai.com/v1',
        customHeaders: parsed.customHeaders || '',
        openRouterOnlyFree: Boolean(parsed.openRouterOnlyFree),
        geminiOnlyLiteGemma: Boolean(parsed.geminiOnlyLiteGemma)
      };
    }
  } catch (e) {
    console.warn('Failed to load AI config:', e);
  }

  return {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o',
    baseUrl: 'https://api.openai.com/v1',
    customHeaders: '',
    openRouterOnlyFree: false,
    geminiOnlyLiteGemma: false
  };
};

// Save AI Configuration
export const saveAiConfig = (config) => {
  try {
    localStorage.setItem(STORAGE_KEY_AI_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save AI config:', e);
  }
};

// Get Saved Prompts
export const getSavedPrompts = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_PROMPTS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load saved prompts:', e);
  }
  return [];
};

// Save Saved Prompts list
export const saveSavedPrompts = (prompts) => {
  try {
    localStorage.setItem(STORAGE_KEY_SAVED_PROMPTS, JSON.stringify(prompts));
  } catch (e) {
    console.warn('Failed to save prompts list:', e);
  }
};

// Get Last Used Prompt ID
export const getLastPromptId = () => {
  try {
    return localStorage.getItem(STORAGE_KEY_LAST_PROMPT_ID) || 'universal';
  } catch {
    return 'universal';
  }
};

export const setLastPromptId = (id) => {
  try {
    localStorage.setItem(STORAGE_KEY_LAST_PROMPT_ID, id);
  } catch (e) {
    console.warn(e);
  }
};

// Call AI API for beautification
export const callAiBeautify = async ({ prompt, markdown, config = null, signal = null }) => {
  const cfg = config || getAiConfig();
  const { provider, apiKey, model, baseUrl } = cfg;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('尚未設定 API Key！請先在設定中填入 API Key。');
  }

  const cleanBaseUrl = (baseUrl || '').trim().replace(/\/+$/, '');

  switch (provider) {
    case 'openai':
    case 'openrouter':
    case 'custom': {
      const url = cleanBaseUrl ? `${cleanBaseUrl}/chat/completions` : 'https://api.openai.com/v1/chat/completions';
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      };

      if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://ipaipa10108-creator.github.io/MD2HTML';
        headers['X-Title'] = 'MD2HTML Universal Editor';
      }

      const body = {
        model: model || 'gpt-4o',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: markdown }
        ],
        temperature: 0.5
      };

      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal
      });

      if (!resp.ok) {
        const errText = await resp.text();
        let errMsg = `請求失敗 (${resp.status})`;
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.error?.message || errJson.message || errMsg;
        } catch {
          if (errText) errMsg += `: ${errText.slice(0, 200)}`;
        }
        throw new Error(errMsg);
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || '';
      return cleanAiOutput(content);
    }

    case 'claude': {
      const url = cleanBaseUrl ? `${cleanBaseUrl}/messages` : 'https://api.anthropic.com/v1/messages';
      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      };

      const body = {
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: 8192,
        system: prompt,
        messages: [
          { role: 'user', content: markdown }
        ],
        temperature: 0.5
      };

      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal
      });

      if (!resp.ok) {
        const errText = await resp.text();
        let errMsg = `請求失敗 (${resp.status})`;
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.error?.message || errMsg;
        } catch {
          if (errText) errMsg += `: ${errText.slice(0, 200)}`;
        }
        throw new Error(errMsg);
      }

      const data = await resp.json();
      const content = data.content?.[0]?.text || '';
      return cleanAiOutput(content);
    }

    case 'gemini': {
      const rawModel = (model || 'gemini-2.0-flash').trim();
      const modelName = rawModel.replace(/^models\//, '');
      const rootUrl = cleanBaseUrl || 'https://generativelanguage.googleapis.com/v1beta';
      const url = `${rootUrl}/models/${modelName}:generateContent?key=${apiKey.trim()}`;

      const body = {
        systemInstruction: {
          parts: [{ text: prompt }]
        },
        contents: [
          {
            parts: [{ text: markdown }]
          }
        ],
        generationConfig: {
          temperature: 0.5
        }
      };

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal
      });

      if (!resp.ok) {
        const errText = await resp.text();
        let errMsg = `Google Gemini 請求失敗 (${resp.status})`;
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.error?.message || errMsg;
        } catch {
          if (errText) errMsg += `: ${errText.slice(0, 200)}`;
        }
        throw new Error(errMsg);
      }

      const data = await resp.json();
      const candidate = data.candidates?.[0];
      const content = candidate?.content?.parts?.[0]?.text || '';
      return cleanAiOutput(content);
    }

    default:
      throw new Error(`不支援的 AI 提供商: ${provider}`);
  }
};

// Clean outer markdown code fences if LLM inadvertently wraps entire output in ```markdown ... ```
export const cleanAiOutput = (raw) => {
  if (!raw) return '';
  let text = raw.trim();

  // If the model wrapped the entire response in ```markdown\n ... \n```
  const outerFenceMatch = text.match(/^```(?:markdown|md)?\r?\n([\s\S]*?)\r?\n```$/);
  if (outerFenceMatch) {
    text = outerFenceMatch[1].trim();
  }

  return text;
};

// Test AI Connection
export const testAiConnection = async (config) => {
  const testMarkdown = '# 測試連線\n這是一段測試文字。';
  const testPrompt = '請只回傳「OK」兩個字。';
  const res = await callAiBeautify({
    prompt: testPrompt,
    markdown: testMarkdown,
    config
  });
  return res;
};
