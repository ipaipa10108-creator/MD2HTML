/**
 * Cloudflare Worker for MD2HTML Online Publishing (Plan B)
 * Handles uploading HTML to Cloudflare R2, generating short URLs, serving HTML, and deletion via secret tokens.
 */

// Generate random URL-safe ID (8 characters)
function generateRandomId(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

// Generate secure secret token for deletion
function generateSecretToken() {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// Common CORS headers
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// JSON response helper
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...getCorsHeaders(),
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(),
      });
    }

    try {
      // 1. POST /api/upload: Upload HTML file
      if (request.method === 'POST' && pathname === '/api/upload') {
        if (!env.DOCS_BUCKET) {
          return jsonResponse({ error: 'R2 儲存桶未設定 (DOCS_BUCKET 未綁定)' }, 500);
        }

        const body = await request.json().catch(() => null);
        if (!body || !body.html) {
          return jsonResponse({ error: '無效的請求資料：HTML 內容為必填' }, 400);
        }

        const id = generateRandomId(8);
        const secret = generateSecretToken();
        const key = `doc-${id}.html`;
        const createdAt = new Date().toISOString();

        // Save HTML to R2
        await env.DOCS_BUCKET.put(key, body.html, {
          httpMetadata: {
            contentType: 'text/html; charset=utf-8',
          },
          customMetadata: {
            secret,
            title: encodeURIComponent(body.title || 'Markdown 文件'),
            isEncrypted: String(Boolean(body.isEncrypted)),
            createdAt,
          },
        });

        const shareUrl = `${url.origin}/${id}`;

        return jsonResponse({
          success: true,
          id,
          url: shareUrl,
          secret,
          createdAt,
        });
      }

      // 2. DELETE /api/:id: Delete file with Secret Token
      if (request.method === 'DELETE' && pathname.startsWith('/api/')) {
        if (!env.DOCS_BUCKET) {
          return jsonResponse({ error: 'R2 儲存桶未設定' }, 500);
        }

        const id = pathname.replace('/api/', '').trim();
        if (!id) {
          return jsonResponse({ error: '缺少文件 ID' }, 400);
        }

        const authHeader = request.headers.get('Authorization') || '';
        const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
        const providedSecret = tokenMatch ? tokenMatch[1].trim() : '';

        if (!providedSecret) {
          return jsonResponse({ error: '未授權：缺少管理金鑰 (Secret Token)' }, 401);
        }

        const key = `doc-${id}.html`;
        const obj = await env.DOCS_BUCKET.head(key);
        if (!obj) {
          return jsonResponse({ error: '文件不存在或已下架' }, 404);
        }

        const storedSecret = obj.customMetadata ? obj.customMetadata.secret : null;
        if (storedSecret !== providedSecret) {
          return jsonResponse({ error: '驗證失敗：管理金鑰不符，無權刪除' }, 403);
        }

        await env.DOCS_BUCKET.delete(key);
        return jsonResponse({
          success: true,
          message: '文件已成功從伺服器下架刪除！',
        });
      }

      // 3. GET /:id: Serve HTML document
      if (request.method === 'GET' && pathname.length > 1 && !pathname.startsWith('/api/')) {
        if (!env.DOCS_BUCKET) {
          return new Response('Server configuration error: DOCS_BUCKET not bound', { status: 500 });
        }

        const id = pathname.substring(1).trim();
        const key = `doc-${id}.html`;

        const obj = await env.DOCS_BUCKET.get(key);
        if (!obj) {
          // Render elegant 404 Page
          const notFoundHtml = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>文件不存在或已下架 - MD2HTML</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1.5rem;
      box-sizing: border-box;
      text-align: center;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      padding: 2.5rem 2rem;
      border-radius: 1.25rem;
      max-width: 420px;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.4);
    }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.25rem; margin: 0 0 0.5rem; color: #f1f5f9; }
    p { font-size: 0.875rem; color: #94a3b8; line-height: 1.6; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📭</div>
    <h1>文件不存在或已下架</h1>
    <p>抱歉，該文件可能已被發布者刪除下架，或是分享連結網址有誤。</p>
  </div>
</body>
</html>`;

          return new Response(notFoundHtml, {
            status: 404,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'X-Robots-Tag': 'noindex, nofollow',
            },
          });
        }

        // Return HTML file
        const headers = new Headers();
        headers.set('Content-Type', 'text/html; charset=utf-8');
        headers.set('X-Robots-Tag', 'noindex, nofollow');
        headers.set('Cache-Control', 'public, max-age=60');

        return new Response(obj.body, { headers });
      }

      // Root endpoint
      if (pathname === '/' || pathname === '') {
        return new Response('MD2HTML Cloudflare Worker Publishing Service is running.', {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', ...getCorsHeaders() },
        });
      }

      return jsonResponse({ error: 'Endpoint not found' }, 404);
    } catch (err) {
      console.error('Worker error:', err);
      return jsonResponse({ error: err.message || '內部伺服器錯誤' }, 500);
    }
  },
};
