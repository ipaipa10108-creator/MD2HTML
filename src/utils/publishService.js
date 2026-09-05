/**
 * Service to interact with Cloudflare Workers KV and GitHub Pages publishing providers.
 * Manages dual-provider configuration, publishing, deletion, and local history with export/import.
 * Both providers are 100% free and require NO credit cards!
 */

import { bufferToBase64 } from './crypto';

const STORAGE_KEY_WORKER_URL = 'md2html_worker_url';
const STORAGE_KEY_GITHUB_TOKEN = 'md2html_github_token';
const STORAGE_KEY_GITHUB_OWNER = 'md2html_github_owner';
const STORAGE_KEY_GITHUB_REPO = 'md2html_github_repo';
const STORAGE_KEY_ACTIVE_PROVIDER = 'md2html_active_provider';
const STORAGE_KEY_HISTORY = 'md2html_publish_history';

// --- Configuration Management ---

export function cleanWorkerUrl(url) {
  let clean = (url || '').trim().replace(/\/+$/, '');
  if (clean.endsWith('/api/upload')) {
    clean = clean.slice(0, -'/api/upload'.length).replace(/\/+$/, '');
  }
  return clean;
}

export function getSavedWorkerUrl() {
  return localStorage.getItem(STORAGE_KEY_WORKER_URL) || '';
}

export function saveWorkerUrl(url) {
  if (!url) {
    localStorage.removeItem(STORAGE_KEY_WORKER_URL);
  } else {
    localStorage.setItem(STORAGE_KEY_WORKER_URL, cleanWorkerUrl(url));
  }
}

export function getSavedGitHubConfig() {
  let defaultOwner = '';
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io')) {
    defaultOwner = window.location.hostname.split('.')[0];
  }
  return {
    token: localStorage.getItem(STORAGE_KEY_GITHUB_TOKEN) || '',
    owner: localStorage.getItem(STORAGE_KEY_GITHUB_OWNER) || defaultOwner,
    repo: localStorage.getItem(STORAGE_KEY_GITHUB_REPO) || 'html-shares'
  };
}

export function saveGitHubConfig({ token, owner, repo }) {
  if (token !== undefined) {
    if (token.trim()) localStorage.setItem(STORAGE_KEY_GITHUB_TOKEN, token.trim());
    else localStorage.removeItem(STORAGE_KEY_GITHUB_TOKEN);
  }
  if (owner !== undefined) {
    if (owner.trim()) localStorage.setItem(STORAGE_KEY_GITHUB_OWNER, owner.trim());
    else localStorage.removeItem(STORAGE_KEY_GITHUB_OWNER);
  }
  if (repo !== undefined) {
    if (repo.trim()) localStorage.setItem(STORAGE_KEY_GITHUB_REPO, repo.trim());
    else localStorage.setItem(STORAGE_KEY_GITHUB_REPO, 'html-shares');
  }
}

export function getActiveProvider() {
  const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_PROVIDER);
  if (saved === 'github' || saved === 'cloudflare') return saved;
  // Auto-detect based on what is configured
  if (getSavedGitHubConfig().token) return 'github';
  return 'cloudflare';
}

export function saveActiveProvider(provider) {
  if (provider === 'github' || provider === 'cloudflare') {
    localStorage.setItem(STORAGE_KEY_ACTIVE_PROVIDER, provider);
  }
}

// Generate random short ID
function generateShortId(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  let res = '';
  for (let i = 0; i < length; i++) {
    res += chars[array[i] % chars.length];
  }
  return res;
}

// --- Provider 1: Cloudflare Workers KV API ---

export async function uploadToWorker(workerUrl, { html, title, description, isEncrypted }) {
  if (workerUrl.toLowerCase().includes('github.io')) {
    throw new Error('您輸入的是 GitHub Pages 網站網址，靜態空間不支援 POST 上傳！若要使用 GitHub 發布，請切換至「🐙 GitHub Pages」方案。');
  }

  const baseUrl = cleanWorkerUrl(workerUrl);
  const endpoint = `${baseUrl}/api/upload`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, title, description, isEncrypted })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Cloudflare 發布失敗 (HTTP ${res.status})`);
  }

  const data = await res.json();
  return {
    ...data,
    provider: 'cloudflare'
  };
}

export async function deleteFromWorker(workerUrl, id, secret) {
  const baseUrl = cleanWorkerUrl(workerUrl);
  const endpoint = `${baseUrl}/api/${id}`;

  const res = await fetch(endpoint, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${secret}` }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Cloudflare 下架刪除失敗 (HTTP ${res.status})`);
  }

  return await res.json();
}

// --- Provider 2: GitHub REST API + GitHub Pages ---

export async function uploadToGitHub({ token, owner, repo, html, title, description, isEncrypted }) {
  const cleanOwner = owner.trim();
  const cleanRepo = repo.trim() || 'html-shares';
  const cleanToken = token.trim();

  if (!cleanOwner || !cleanToken) {
    throw new Error('請提供完整的 GitHub Token 與使用者名稱 (Owner)！');
  }

  const id = generateShortId(8);
  const fileName = `${id}.html`;
  const endpoint = `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/contents/${fileName}`;

  // Encode HTML into Base64 safely supporting Unicode
  const utf8Bytes = new TextEncoder().encode(html);
  const base64Content = bufferToBase64(utf8Bytes);

  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${cleanToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `Publish: ${title || fileName}`,
      content: base64Content
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    let msg = errData.message || `HTTP ${res.status}`;
    if (res.status === 404) {
      msg = `找不到倉庫 "${cleanOwner}/${cleanRepo}"，請確認該倉庫是否存在且為公開倉庫 (Public)。`;
    } else if (res.status === 401 || res.status === 403) {
      msg = `GitHub 權限不足 (${msg})，請確認 Token 具備該倉庫的 "Contents: Read and write" 權限。`;
    }
    throw new Error(`GitHub 發布失敗: ${msg}`);
  }

  const resData = await res.json();
  const shareUrl = `https://${cleanOwner.toLowerCase()}.github.io/${cleanRepo}/${fileName}`;

  return {
    success: true,
    id,
    url: shareUrl,
    sha: resData.content ? resData.content.sha : null,
    path: fileName,
    provider: 'github',
    owner: cleanOwner,
    repo: cleanRepo,
    title,
    description,
    isEncrypted,
    createdAt: new Date().toISOString()
  };
}

export async function deleteFromGitHub({ token, owner, repo, path, sha }) {
  const cleanOwner = owner.trim();
  const cleanRepo = repo.trim() || 'html-shares';
  const cleanToken = token.trim();

  if (!cleanOwner || !cleanToken) {
    throw new Error('缺少 GitHub Token 或帳號資訊，無法執行刪除！');
  }

  // If sha is missing, fetch current file metadata to retrieve sha first
  let fileSha = sha;
  const endpoint = `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/contents/${path}`;

  if (!fileSha) {
    const getRes = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (getRes.status === 404) {
      // File already gone
      return { success: true, message: '檔案在 GitHub 上已不存在' };
    }
    if (!getRes.ok) {
      throw new Error(`無法取得 GitHub 檔案資訊 (HTTP ${getRes.status})`);
    }
    const getData = await getRes.json();
    fileSha = getData.sha;
  }

  const deleteRes = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${cleanToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `Delete ${path}`,
      sha: fileSha
    })
  });

  if (!deleteRes.ok && deleteRes.status !== 404) {
    const errData = await deleteRes.json().catch(() => ({}));
    throw new Error(errData.message || `GitHub 刪除失敗 (HTTP ${deleteRes.status})`);
  }

  return { success: true, message: '文件已成功從 GitHub 刪除下架！' };
}

// --- Local Publish History Management ---

export function getPublishHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Failed to parse publish history:', err);
    return [];
  }
}

export function savePublishHistoryItem(item) {
  const history = getPublishHistory();
  const filtered = history.filter(h => h.id !== item.id);
  filtered.unshift(item);
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(filtered));
  return filtered;
}

export function removePublishHistoryItem(id) {
  const history = getPublishHistory();
  const filtered = history.filter(h => h.id !== id);
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(filtered));
  return filtered;
}

export function clearPublishHistory() {
  localStorage.removeItem(STORAGE_KEY_HISTORY);
  return [];
}

export function exportPublishHistory() {
  const history = getPublishHistory();
  if (history.length === 0) {
    throw new Error('目前尚無任何發布記錄可匯出！');
  }

  const exportData = {
    version: '2.0',
    app: 'MD2HTML',
    exportTime: new Date().toISOString(),
    count: history.length,
    history
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const fileName = `md2html_publish_history_${yyyy}${mm}${dd}_${hh}${min}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importPublishHistory(input, mode = 'merge') {
  let parsed;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (err) {
      throw new Error('匯入失敗：JSON 格式無效！', { cause: err });
    }
  } else {
    parsed = input;
  }

  let importedItems;
  if (Array.isArray(parsed)) {
    importedItems = parsed;
  } else if (parsed && Array.isArray(parsed.history)) {
    importedItems = parsed.history;
  } else {
    throw new Error('匯入失敗：找不到合法的發布記錄陣列！');
  }

  const validItems = importedItems.filter(item => item && item.id && item.url);
  if (validItems.length === 0) {
    throw new Error('匯入失敗：檔案內沒有有效的發布記錄！');
  }

  let finalHistory;
  if (mode === 'replace') {
    finalHistory = validItems;
  } else {
    const current = getPublishHistory();
    const map = new Map();
    current.forEach(item => map.set(item.id, item));
    validItems.forEach(item => map.set(item.id, item));
    finalHistory = Array.from(map.values());
    finalHistory.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(finalHistory));

  return {
    importedCount: validItems.length,
    totalCount: finalHistory.length
  };
}
