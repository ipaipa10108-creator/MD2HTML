/**
 * Service to interact with Cloudflare Worker & R2 backend and manage publish history in localStorage.
 * Includes Export and Import features to prevent history loss when changing devices.
 */

const STORAGE_KEY_WORKER_URL = 'md2html_worker_url';
const STORAGE_KEY_HISTORY = 'md2html_publish_history';

// Default worker URL can be empty or set to user's deployment
export function getSavedWorkerUrl() {
  return localStorage.getItem(STORAGE_KEY_WORKER_URL) || '';
}

export function saveWorkerUrl(url) {
  if (!url) {
    localStorage.removeItem(STORAGE_KEY_WORKER_URL);
  } else {
    localStorage.setItem(STORAGE_KEY_WORKER_URL, url.trim().replace(/\/+$/, ''));
  }
}

/**
 * Upload an HTML file to Cloudflare Worker
 */
export async function uploadToWorker(workerUrl, { html, title, description, isEncrypted }) {
  const endpoint = `${workerUrl.replace(/\/+$/, '')}/api/upload`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      html,
      title,
      description,
      isEncrypted
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `發布失敗 (HTTP ${res.status})`);
  }

  return await res.json();
}

/**
 * Delete a published HTML document from Cloudflare Worker using secret token
 */
export async function deleteFromWorker(workerUrl, id, secret) {
  const endpoint = `${workerUrl.replace(/\/+$/, '')}/api/${id}`;

  const res = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${secret}`
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `下架刪除失敗 (HTTP ${res.status})`);
  }

  return await res.json();
}

/**
 * Get publishing history from localStorage
 */
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

/**
 * Save new publishing history item
 */
export function savePublishHistoryItem(item) {
  const history = getPublishHistory();
  // Filter out any duplicate with the same id
  const filtered = history.filter(h => h.id !== item.id);
  filtered.unshift(item);
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(filtered));
  return filtered;
}

/**
 * Remove an item from publishing history
 */
export function removePublishHistoryItem(id) {
  const history = getPublishHistory();
  const filtered = history.filter(h => h.id !== id);
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(filtered));
  return filtered;
}

/**
 * Clear all publish history
 */
export function clearPublishHistory() {
  localStorage.removeItem(STORAGE_KEY_HISTORY);
  return [];
}

/**
 * Export publishing history to a JSON file
 */
export function exportPublishHistory() {
  const history = getPublishHistory();
  if (history.length === 0) {
    throw new Error('目前尚無任何發布記錄可匯出！');
  }

  const exportData = {
    version: '1.0',
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

/**
 * Import publishing history from a JSON string or object
 * @param {string|object} input - JSON string or parsed JSON object
 * @param {'merge'|'replace'} mode - 'merge' (default) adds new items; 'replace' overwrites
 * @returns {{ importedCount: number, totalCount: number }}
 */
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

  // Handle format with wrapper or direct array
  let importedItems;
  if (Array.isArray(parsed)) {
    importedItems = parsed;
  } else if (parsed && Array.isArray(parsed.history)) {
    importedItems = parsed.history;
  } else {
    throw new Error('匯入失敗：找不到合法的發布記錄陣列！');
  }

  // Validate item schema
  const validItems = importedItems.filter(item => item && item.id && item.url);
  if (validItems.length === 0) {
    throw new Error('匯入失敗：檔案內沒有有效的發布記錄！');
  }

  let finalHistory;
  if (mode === 'replace') {
    finalHistory = validItems;
  } else {
    // Merge mode: existing items + new validItems, deduplicated by id
    const current = getPublishHistory();
    const map = new Map();
    // Add current items first
    current.forEach(item => map.set(item.id, item));
    // Add / overwrite with imported items
    validItems.forEach(item => map.set(item.id, item));
    finalHistory = Array.from(map.values());
    // Sort by createdAt desc
    finalHistory.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(finalHistory));

  return {
    importedCount: validItems.length,
    totalCount: finalHistory.length
  };
}
