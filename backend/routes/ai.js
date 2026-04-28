const express = require('express');
const http = require('http');
const https = require('https');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/coding/v3';
const DEFAULT_MODEL = 'GLM-5.1';
const MAX_RECORDS = 36;
const requestBuckets = new Map();

function normalizeArkBaseUrl(value) {
  let base = String(value || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  if (!base) return DEFAULT_BASE_URL;
  if (base.endsWith('/chat/completions')) {
    base = base.slice(0, -'/chat/completions'.length);
  }
  return base;
}

function getChatCompletionsUrl() {
  if (process.env.ARK_CHAT_COMPLETIONS_URL) return process.env.ARK_CHAT_COMPLETIONS_URL;
  return `${normalizeArkBaseUrl(process.env.ARK_BASE_URL || DEFAULT_BASE_URL)}/chat/completions`;
}

function getApiKey() {
  return process.env.ARK_API_KEY
    || process.env.VOLCENGINE_API_KEY
    || process.env.OPENAI_API_KEY
    || process.env.API_KEY
    || '';
}

function postJson(url, payload, headers, signal) {
  if (typeof fetch === 'function') {
    return fetch(url, {
      method: 'POST',
      signal,
      headers,
      body: JSON.stringify(payload),
    });
  }

  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const body = JSON.stringify(payload);
    const req = client.request(
      {
        method: 'POST',
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { text += chunk; });
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: async () => text,
            json: async () => JSON.parse(text || '{}'),
          });
        });
      },
    );

    req.on('error', reject);
    if (signal) {
      signal.addEventListener('abort', () => {
        req.destroy(new Error('AI provider request timed out'));
      });
    }
    req.write(body);
    req.end();
  });
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'local';
}

function rateLimit(req, res, next) {
  const key = getClientIp(req);
  const now = Date.now();
  const bucket = requestBuckets.get(key) || { count: 0, resetAt: now + 60_000 };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + 60_000;
  }

  bucket.count += 1;
  requestBuckets.set(key, bucket);

  if (bucket.count > 12) {
    return res.status(429).json({ error: 'AI requests are too frequent. Please try again later.' });
  }

  next();
}

function safeText(value, maxLength = 1200) {
  return String(value || '').trim().slice(0, maxLength);
}

function compactRecord(record = {}) {
  return {
    id: record.id,
    province: safeText(record.province_name, 40),
    city: safeText(record.name, 40),
    district: safeText(record.district_name, 40),
    date: safeText(record.visited_at, 20),
    description: safeText(record.description, 280),
    tags: safeText(record.tags, 120),
    photos: Number(record.photo_count || 0),
  };
}

function compactJourney(journey = {}) {
  return {
    id: journey.id,
    from: safeText(journey.from_city_name, 60),
    to: safeText(journey.to_city_name, 60),
    transport_type: safeText(journey.transport_type, 20),
    transport_name: safeText(journey.transport_name, 40),
    departure_time: safeText(journey.departure_time, 30),
    arrival_time: safeText(journey.arrival_time, 30),
    notes: safeText(journey.notes, 220),
  };
}

function extractJson(content) {
  if (!content) return {};

  const raw = String(content).trim();
  try {
    return JSON.parse(raw);
  } catch (error) {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1] || raw.match(/\{[\s\S]*\}/)?.[0];
    if (!candidate) return {};
    try {
      return JSON.parse(candidate);
    } catch (innerError) {
      return {};
    }
  }
}

async function callModel({ system, user, temperature = 0.72 }) {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'replace_with_your_ark_api_key') {
    const error = new Error('ARK_API_KEY is not configured');
    error.status = 503;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await postJson(
      getChatCompletionsUrl(),
      {
        model: process.env.ARK_MODEL || DEFAULT_MODEL,
        temperature,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      },
      {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      controller.signal,
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      const error = new Error(detail || 'AI provider request failed');
      error.status = response.status;
      error.providerUrl = getChatCompletionsUrl();
      throw error;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || data.choices?.[0]?.text || data.output_text || data.output?.text || '';
  } catch (error) {
    if (error.name === 'AbortError' || error.message === 'AI provider request timed out') {
      const timeoutError = new Error('AI provider request timed out');
      timeoutError.status = 504;
      timeoutError.providerUrl = getChatCompletionsUrl();
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function sendAiError(res, error) {
  console.error('[AI]', {
    status: error.status,
    url: error.providerUrl || getChatCompletionsUrl(),
    message: String(error.message || '').slice(0, 500),
  });

  const status = error.status && error.status >= 400 && error.status < 600 ? error.status : 502;
  const messageByStatus = {
    401: 'AI authorization failed. Please check ARK_API_KEY.',
    403: 'The configured AI model is not allowed. Please check ARK_MODEL permissions.',
    404: 'AI endpoint was not found. Use https://ark.cn-beijing.volces.com/api/coding/v3 as ARK_BASE_URL.',
    429: 'AI requests are too frequent. Please try again later.',
    503: 'AI service is not configured. Please set ARK_API_KEY on the server.',
    504: 'AI request timed out. Please try again later.',
  };

  res.status(status).json({
    error: messageByStatus[status] || 'AI generation failed. Please try again later.',
  });
}

router.use(authMiddleware, rateLimit);

router.post('/footprint-draft', async (req, res) => {
  const context = req.body || {};
  const userPayload = {
    location: {
      province: safeText(context.province),
      city: safeText(context.city),
      district: safeText(context.district),
      address: safeText(context.address, 160),
    },
    date: safeText(context.date, 30),
    keywords: safeText(context.keywords, 180),
    current_description: safeText(context.description, 500),
    current_tags: safeText(context.tags, 160),
  };

  try {
    const content = await callModel({
      system:
        'You are a gentle Chinese travel journal editor. Return strict JSON only, no Markdown. Output Chinese text. Fields: title, description, tags. tags must be an array of 4 to 8 short Chinese tags.',
      user: `Create a vivid but restrained title, description, and tags for this travel footprint:\n${JSON.stringify(userPayload, null, 2)}`,
    });
    const json = extractJson(content);
    res.json({
      title: safeText(json.title, 40),
      description: safeText(json.description, 600),
      tags: Array.isArray(json.tags) ? json.tags.map((tag) => safeText(tag, 18)).filter(Boolean).slice(0, 8) : [],
    });
  } catch (error) {
    sendAiError(res, error);
  }
});

router.post('/map-summary', async (req, res) => {
  const records = Array.isArray(req.body?.records) ? req.body.records.slice(0, MAX_RECORDS).map(compactRecord) : [];
  const scope = safeText(req.body?.scope || 'current map view', 80);

  try {
    const content = await callModel({
      system:
        'You are the Chinese narrator for a travel memory website. Return strict JSON only, no Markdown. Output Chinese text. Fields: headline, summary, highlights, next_prompt. highlights must be an array of 3 short Chinese sentences.',
      user: `Generate a travel memory summary card for this map view. Scope: ${scope}\nFootprint records:\n${JSON.stringify(records, null, 2)}`,
      temperature: 0.68,
    });
    const json = extractJson(content);
    res.json({
      headline: safeText(json.headline, 48),
      summary: safeText(json.summary, 520),
      highlights: Array.isArray(json.highlights) ? json.highlights.map((item) => safeText(item, 60)).filter(Boolean).slice(0, 3) : [],
      next_prompt: safeText(json.next_prompt, 90),
    });
  } catch (error) {
    sendAiError(res, error);
  }
});

router.post('/search', async (req, res) => {
  const query = safeText(req.body?.query, 160);
  const records = Array.isArray(req.body?.records) ? req.body.records.slice(0, MAX_RECORDS).map(compactRecord) : [];

  if (!query) {
    return res.status(400).json({ error: 'Search query is required.' });
  }

  try {
    const content = await callModel({
      system:
        'You are a semantic search assistant for travel footprints. Return strict JSON only, no Markdown. Output Chinese text. Fields: matched_ids, reason. matched_ids must be an array of numeric existing IDs, up to 8.',
      user: `User wants to find: "${query}". Select the most relevant existing records and return only existing IDs:\n${JSON.stringify(records, null, 2)}`,
      temperature: 0.2,
    });
    const json = extractJson(content);
    res.json({
      matched_ids: Array.isArray(json.matched_ids)
        ? json.matched_ids.map(Number).filter(Number.isFinite).slice(0, 8)
        : [],
      reason: safeText(json.reason, 180),
    });
  } catch (error) {
    sendAiError(res, error);
  }
});

router.post('/journey-title', async (req, res) => {
  const journey = compactJourney(req.body?.journey || req.body || {});

  try {
    const content = await callModel({
      system:
        'You are a Chinese travel route naming assistant. Return strict JSON only, no Markdown. Output Chinese text. Fields: title, note, tags. tags must be an array of 3 to 6 short Chinese tags.',
      user: `Create a memorable title, note, and tags for this journey route:\n${JSON.stringify(journey, null, 2)}`,
    });
    const json = extractJson(content);
    res.json({
      title: safeText(json.title, 48),
      note: safeText(json.note, 320),
      tags: Array.isArray(json.tags) ? json.tags.map((tag) => safeText(tag, 18)).filter(Boolean).slice(0, 6) : [],
    });
  } catch (error) {
    sendAiError(res, error);
  }
});

module.exports = router;
