import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const ROOT_DIR = resolve(process.cwd());
const DIST_DIR = join(ROOT_DIR, 'dist');

loadEnvFile(join(ROOT_DIR, '.env'));
loadEnvFile(join(ROOT_DIR, '.env.server.local'));

const PORT = Number(process.env.LLM_PROXY_PORT || process.env.PORT || 8787);
const API_BASE_URL = trimTrailingSlash(
  process.env.LLM_API_BASE_URL || 'https://ollama.com',
);
const API_MODEL = process.env.LLM_API_MODEL || 'gpt-oss:120b';
const API_KEY = process.env.LLM_API_KEY || '';
const API_FORMAT = process.env.LLM_API_FORMAT || 'ollama';
const RAG_SERVICE_URL = trimTrailingSlash(
  process.env.RAG_SERVICE_URL || 'http://127.0.0.1:8791',
);

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      sendCors(res, 204);
      return;
    }

    if (req.method === 'GET' && req.url === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        provider: 'api-key',
        format: API_FORMAT,
        model: API_MODEL,
        hasApiKey: Boolean(API_KEY),
      });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/llm/chat') {
      await handleChat(req, res);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/rag/search') {
      await handleRagRequest(req, res, '/rag/search');
      return;
    }

    if (req.method === 'POST' && req.url === '/api/rag/debug') {
      await handleRagRequest(req, res, '/rag/debug');
      return;
    }

    if (req.method === 'POST' && req.url === '/api/rag/tour') {
      await handleRagRequest(req, res, '/rag/tour');
      return;
    }

    if (req.method === 'POST' && req.url === '/api/rag/similar') {
      await handleRagSimilarRequest(req, res);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/rag/related') {
      await handleRagPassthroughRequest(req, res, '/rag/related');
      return;
    }

    if (req.method === 'POST' && req.url === '/api/rag/interaction') {
      await handleRagPassthroughRequest(req, res, '/rag/interaction');
      return;
    }

    if (req.method === 'GET') {
      serveStatic(req, res);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error('LLM proxy error:', error);
    sendJson(res, 500, { error: error.message || 'Internal server error' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`LLM proxy listening on http://127.0.0.1:${PORT}`);
  console.log(`Using ${API_FORMAT} API at ${API_BASE_URL} with model ${API_MODEL}`);
  console.log(`Using RAG service at ${RAG_SERVICE_URL}`);
});

async function handleRagRequest(req, res, ragEndpoint) {
  const body = await readJsonBody(req);
  const query = String(body.query || '').trim();
  const topK = Number(body.top_k || body.topK || 5);

  if (!query) {
    sendJson(res, 400, { error: 'query is required.' });
    return;
  }

  try {
    const upstreamResponse = await fetch(`${RAG_SERVICE_URL}${ragEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        top_k: topK,
        min_score: Number(body.min_score || body.minScore || 0),
        current_booth_id: body.current_booth_id || body.currentBoothId || null,
        current_position: body.current_position || body.currentPosition || null,
        print_debug: Boolean(body.print_debug || body.printDebug),
      }),
    });

    const responseText = await upstreamResponse.text();
    const responseData = parseJsonSafely(responseText);

    if (!upstreamResponse.ok) {
      sendJson(res, upstreamResponse.status, {
        error:
          responseData?.detail ||
          responseData?.error ||
          `RAG service returned HTTP ${upstreamResponse.status}`,
      });
      return;
    }

    sendJson(res, 200, responseData || {});
  } catch (error) {
    sendJson(res, 502, {
      error: `RAG service connection failed: ${error.message || 'Unknown error'}. Check that the Python RAG service is running.`,
    });
  }
}

async function handleRagSimilarRequest(req, res) {
  const body = await readJsonBody(req);
  const boothId = String(body.booth_id || body.boothId || '').trim();
  const topK = Number(body.top_k || body.topK || 5);

  if (!boothId) {
    sendJson(res, 400, { error: 'booth_id is required.' });
    return;
  }

  try {
    const upstreamResponse = await fetch(`${RAG_SERVICE_URL}/rag/similar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        booth_id: boothId,
        top_k: topK,
        print_debug: Boolean(body.print_debug || body.printDebug),
      }),
    });

    const responseText = await upstreamResponse.text();
    const responseData = parseJsonSafely(responseText);

    if (!upstreamResponse.ok) {
      sendJson(res, upstreamResponse.status, {
        error:
          responseData?.detail ||
          responseData?.error ||
          `RAG service returned HTTP ${upstreamResponse.status}`,
      });
      return;
    }

    sendJson(res, 200, responseData || {});
  } catch (error) {
    sendJson(res, 502, {
      error: `RAG service connection failed: ${error.message || 'Unknown error'}. Check that the Python RAG service is running.`,
    });
  }
}

async function handleRagPassthroughRequest(req, res, ragEndpoint) {
  const body = await readJsonBody(req);

  try {
    const upstreamResponse = await fetch(`${RAG_SERVICE_URL}${ragEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseText = await upstreamResponse.text();
    const responseData = parseJsonSafely(responseText);

    if (!upstreamResponse.ok) {
      sendJson(res, upstreamResponse.status, {
        error:
          responseData?.detail ||
          responseData?.error ||
          `RAG service returned HTTP ${upstreamResponse.status}`,
      });
      return;
    }

    sendJson(res, 200, responseData || {});
  } catch (error) {
    sendJson(res, 502, {
      error: `RAG service connection failed: ${error.message || 'Unknown error'}. Check that the Python RAG service is running.`,
    });
  }
}

async function handleChat(req, res) {
  if (!API_KEY) {
    sendJson(res, 500, {
      error: 'LLM_API_KEY is not set. Add it to .env.server.local.',
    });
    return;
  }

  const body = await readJsonBody(req);
  const prompt = String(body.prompt || '').trim();
  const systemPrompt = String(body.systemPrompt || '').trim();

  if (!prompt) {
    sendJson(res, 400, { error: 'prompt is required.' });
    return;
  }

  if (API_FORMAT === 'ollama') {
    await handleOllamaGenerate(prompt, systemPrompt, res);
    return;
  }

  await handleOpenAIChat(prompt, systemPrompt, res);
}

async function handleOpenAIChat(prompt, systemPrompt, res) {
  const messages = [];

  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  messages.push({
    role: 'user',
    content: prompt,
  });

  const upstreamResponse = await fetch(`${API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: API_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  const responseText = await upstreamResponse.text();
  const responseData = parseJsonSafely(responseText);

  if (!upstreamResponse.ok) {
    sendJson(res, upstreamResponse.status, {
      error:
        responseData?.error?.message ||
        responseData?.error ||
        responseData?.message ||
        `LLM API returned HTTP ${upstreamResponse.status}`,
    });
    return;
  }

  const content =
    responseData?.choices?.[0]?.message?.content ||
    responseData?.choices?.[0]?.text ||
    '';

  if (!content) {
    sendJson(res, 502, { error: 'LLM API returned an empty response.' });
    return;
  }

  sendJson(res, 200, {
    content,
    model: responseData?.model || API_MODEL,
    usage: responseData?.usage || null,
  });
}

async function handleOllamaGenerate(prompt, systemPrompt, res) {
  const messages = [];

  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  messages.push({
    role: 'user',
    content: prompt,
  });

  const upstreamResponse = await fetch(getOllamaApiUrl('/api/chat'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: API_MODEL,
      messages,
      temperature: 0.7,
      top_p: 0.95,
      stream: false,
    }),
  });

  const responseText = await upstreamResponse.text();
  const responseData = parseJsonSafely(responseText);

  if (!upstreamResponse.ok) {
    sendJson(res, upstreamResponse.status, {
      error:
        responseData?.error ||
        responseData?.message ||
        `Ollama API returned HTTP ${upstreamResponse.status}`,
    });
    return;
  }

  const content = extractOllamaResponseText(responseText);

  if (!content) {
    sendJson(res, 502, { error: 'Ollama API returned an empty response.' });
    return;
  }

  sendJson(res, 200, {
    content,
    model: responseData?.model || API_MODEL,
    usage: null,
  });
}

function getOllamaApiUrl(endpoint) {
  if (API_BASE_URL.endsWith('/api')) {
    return `${API_BASE_URL}${endpoint.replace('/api', '')}`;
  }

  return `${API_BASE_URL}${endpoint}`;
}

function readJsonBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        req.destroy();
        rejectBody(new Error('Request body is too large.'));
      }
    });

    req.on('end', () => {
      resolveBody(parseJsonSafely(body) || {});
    });

    req.on('error', rejectBody);
  });
}

function serveStatic(req, res) {
  if (!existsSync(DIST_DIR)) {
    sendJson(res, 404, {
      error: 'Frontend build not found. Run npm run build first or use npm run dev.',
    });
    return;
  }

  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const requestedPath = urlPath === '/' ? '/index.html' : urlPath;
  const filePath = resolve(join(DIST_DIR, requestedPath));

  if (!filePath.startsWith(DIST_DIR)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  const targetPath = existsSync(filePath) ? filePath : join(DIST_DIR, 'index.html');

  try {
    const file = readFileSync(targetPath);
    res.writeHead(200, {
      'Content-Type': getContentType(targetPath),
    });
    res.end(file);
  } catch {
    sendJson(res, 404, { error: 'Not found' });
  }
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const envFile = readFileSync(filePath, 'utf8');

  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function parseJsonSafely(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractOllamaResponseText(data) {
  if (!data) {
    return '';
  }

  if (typeof data === 'string') {
    const lines = data.trim().split('\n');
    return lines
      .map((line) => {
        const parsedLine = parseJsonSafely(line);
        return parsedLine?.message?.content || parsedLine?.response || '';
      })
      .join('');
  }

  return data.message?.content || data.response || '';
}

function sendJson(res, statusCode, payload) {
  sendCors(res, statusCode, {
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(payload));
}

function sendCors(res, statusCode, headers = {}) {
  res.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...headers,
  });
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function getContentType(filePath) {
  const extension = extname(filePath);

  if (extension === '.html') {
    return 'text/html; charset=utf-8';
  }

  if (extension === '.js') {
    return 'text/javascript; charset=utf-8';
  }

  if (extension === '.css') {
    return 'text/css; charset=utf-8';
  }

  if (extension === '.json') {
    return 'application/json; charset=utf-8';
  }

  if (extension === '.svg') {
    return 'image/svg+xml';
  }

  if (extension === '.png') {
    return 'image/png';
  }

  if (extension === '.jpg' || extension === '.jpeg') {
    return 'image/jpeg';
  }

  if (extension === '.webp') {
    return 'image/webp';
  }

  return 'application/octet-stream';
}
