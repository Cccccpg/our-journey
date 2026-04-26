const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/coding/v';
const DEFAULT_MODEL = 'GLM-5.1';
const MAX_RECORDS = 36;
const requestBuckets = new Map();

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
    return res.status(429).json({ error: 'AI 调用过于频繁，请稍后再试' });
  }

  next();
}

function getChatCompletionsUrl() {
  if (process.env.ARK_CHAT_COMPLETIONS_URL) return process.env.ARK_CHAT_COMPLETIONS_URL;
  const base = (process.env.ARK_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  return `${base}/chat/completions`;
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

  try {
    return JSON.parse(content);
  } catch (error) {
    const match = String(content).match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]);
    } catch (innerError) {
      return {};
    }
  }
}

async function callModel({ system, user, temperature = 0.78 }) {
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) {
    const error = new Error('ARK_API_KEY is not configured');
    error.status = 503;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(getChatCompletionsUrl(), {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.ARK_MODEL || DEFAULT_MODEL,
        temperature,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      const error = new Error(detail || 'AI provider request failed');
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || data.output_text || '';
  } finally {
    clearTimeout(timeout);
  }
}

function sendAiError(res, error) {
  console.error('[AI]', error.message);
  const status = error.status && error.status >= 400 && error.status < 600 ? error.status : 502;
  res.status(status).json({
    error: status === 503 ? 'AI 服务尚未配置，请先设置 ARK_API_KEY' : 'AI 生成暂时失败，请稍后再试',
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
        '你是一个温柔克制的中文旅行手账编辑。只返回严格 JSON，不要 Markdown。字段：title, description, tags。tags 是 4 到 8 个中文短标签数组。',
      user: `根据以下旅行足迹信息，生成有画面感但不夸张的标题、描述和标签：\n${JSON.stringify(userPayload, null, 2)}`,
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
  const scope = safeText(req.body?.scope || '当前地图视角', 80);

  try {
    const content = await callModel({
      system:
        '你是旅行记忆网站的中文旁白编辑。只返回严格 JSON，不要 Markdown。字段：headline, summary, highlights, next_prompt。highlights 是 3 个短句数组。',
      user: `请基于当前地图视角生成一张“旅行记忆总结卡”。视角：${scope}\n足迹数据：${JSON.stringify(records, null, 2)}`,
      temperature: 0.72,
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
    return res.status(400).json({ error: '请输入要搜索的内容' });
  }

  try {
    const content = await callModel({
      system:
        '你是旅行足迹的语义搜索助手。只返回严格 JSON，不要 Markdown。字段：matched_ids, reason。matched_ids 是数字 ID 数组，最多 8 个。',
      user: `用户想找：“${query}”。请从足迹数据中找最相关记录，只返回已有 id：\n${JSON.stringify(records, null, 2)}`,
      temperature: 0.25,
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
        '你是中文旅行路线命名助手。只返回严格 JSON，不要 Markdown。字段：title, note, tags。tags 是 3 到 6 个中文短标签数组。',
      user: `请给这段旅途路线生成一个有记忆点的名称、备注和标签：\n${JSON.stringify(journey, null, 2)}`,
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
