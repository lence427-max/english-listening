/**
 * Silentium — DeepSeek AI 知识网络
 * 调用 AI 生成单词知识图谱 JSON，缓存结果
 */

import { sanitizeHTML } from './utils.js';
import { getItem, setItem } from './storage.js';
import {
  getSemanticFallback,
  isHighQualityConceptMap,
  sanitizeConceptMap,
} from './concept-quality.js';

const AI_CACHE_KEY = 'aiWordCache';
const API_BASE = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';

/**
 * 获取/设置 API Key
 */
export function getApiKey() {
  return getItem('aiApiKey') || '';
}
export function setApiKey(key) {
  setItem('aiApiKey', key);
}

/**
 * 获取缓存的 AI 结果
 */
function getCache() {
  return getItem(AI_CACHE_KEY) || {};
}
function setCache(cache) {
  setItem(AI_CACHE_KEY, cache);
}

/**
 * 调用 DeepSeek API 生成知识网络
 * @param {string} word
 * @returns {object|null}
 */
export async function fetchAIGraph(word) {
  const key = getApiKey();
  if (!key) return null;

  const cache = getCache();
  const cacheKey = word.toLowerCase();
  if (cache[cacheKey]) return cache[cacheKey];

  const prompt = `You are an English vocabulary knowledge graph builder. For the word "${word}", return ONLY a valid JSON object (no markdown, no explanation) with this structure:
{
  "meaning_zh": "Chinese meaning in Simplified Chinese",
  "collocations": [{"phrase": "common collocation", "zh": "Chinese translation"}],
  "scenes": [{"name": "scenario name in Chinese", "related": ["related word1", "related word2"]}],
  "synonyms": [{"word": "synonym", "zh": "Chinese", "nuance": "difference in one line"}],
  "mindmap": {"nodes": [{"word": "related word", "relation": "how it relates"}], "centerWord": "${word}"}
}`;

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '';

    // 提取 JSON（可能包裹在 ```json ``` 中）
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const result = JSON.parse(jsonMatch[0]);

    // 缓存
    cache[cacheKey] = result;
    setCache(cache);
    return result;
  } catch (e) {
    console.warn('[AI Network] 请求失败:', e.message);
    return null;
  }
}

/**
 * 渲染 AI 知识图谱
 */
export function renderAIGraph(aiData, word) {
  if (!aiData) return '';

  const { meaning_zh, collocations, scenes, synonyms, mindmap } = aiData;
  const allNodes = mindmap?.nodes || [];
  const totalNodes = allNodes.length + 1; // +1 for center

  const CX = 200, CY = 200;
  const RINGS = [
    { r: 85, max: 6 },   // 内环
    { r: 150, max: 10 }, // 外环
  ];

  // 分配节点到环
  const ring0 = allNodes.slice(0, RINGS[0].max);
  const ring1 = allNodes.slice(RINGS[0].max, RINGS[0].max + RINGS[1].max);

  let svg = `
    <svg viewBox="0 0 400 400" class="ai-graph-svg">
      <defs>
        <radialGradient id="aiCenter"><stop offset="0%" stop-color="var(--primary)" stop-opacity="0.3"/><stop offset="100%" stop-color="var(--primary)" stop-opacity="0.05"/></radialGradient>
      </defs>
      <circle cx="${CX}" cy="${CY}" r="170" fill="url(#aiCenter)" />
      <circle cx="${CX}" cy="${CY}" r="32" fill="var(--primary)" />
      <text x="${CX}" y="${CY + 5}" text-anchor="middle" fill="white" font-size="12" font-weight="700">${sanitizeHTML(word)}</text>
  `;

  // 内环
  ring0.forEach((node, i) => {
    const angle = (i / ring0.length) * Math.PI * 2 - Math.PI / 2;
    const x = CX + Math.cos(angle) * RINGS[0].r;
    const y = CY + Math.sin(angle) * RINGS[0].r;
    svg += `
      <line x1="${CX}" y1="${CY}" x2="${x}" y2="${y}" stroke="var(--primary)" opacity="0.3" stroke-width="1.5" />
      <circle cx="${x}" cy="${y}" r="18" fill="var(--surface)" stroke="var(--primary)" stroke-width="1.5" class="kg-node" data-word="${sanitizeHTML(node.word)}" />
      <text x="${x}" y="${y - 10}" text-anchor="middle" fill="var(--text)" font-size="7">${sanitizeHTML(node.word)}</text>
      <text x="${x}" y="${y + 2}" text-anchor="middle" fill="var(--text-tertiary)" font-size="6">${sanitizeHTML(node.relation || '')}</text>
    `;
  });

  // 外环
  ring1.forEach((node, i) => {
    const angle = (i / ring1.length) * Math.PI * 2 - Math.PI / 2 + 0.2;
    const x = CX + Math.cos(angle) * RINGS[1].r;
    const y = CY + Math.sin(angle) * RINGS[1].r;
    svg += `
      <line x1="${CX}" y1="${CY}" x2="${x}" y2="${y}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,2" />
      <circle cx="${x}" cy="${y}" r="14" fill="var(--bg)" stroke="var(--border)" stroke-width="1" class="kg-node" data-word="${sanitizeHTML(node.word)}" />
      <text x="${x}" y="${y + 4}" text-anchor="middle" fill="var(--text-secondary)" font-size="7">${sanitizeHTML(node.word)}</text>
    `;
  });

  svg += `</svg>`;

  return `
    <div class="ai-graph-container">
      <div class="ai-graph-header">
        <span class="badge badge-info">AI 分析</span>
        ${meaning_zh ? `<span class="text-sm font-medium">${sanitizeHTML(meaning_zh)}</span>` : ''}
      </div>
      <div class="ai-graph-svg-wrap">${svg}</div>

      ${collocations?.length ? `
        <div class="ai-section">
          <div class="ai-section-title">高频搭配</div>
          <div class="ai-tags">
            ${collocations.slice(0, 8).map(c => `
              <span class="ai-tag">${sanitizeHTML(c.phrase)} <small>${sanitizeHTML(c.zh || '')}</small></span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${synonyms?.length ? `
        <div class="ai-section">
          <div class="ai-section-title">近义词辨析</div>
          ${synonyms.slice(0, 5).map(s => `
            <div class="ai-synonym-row">
              <span class="ai-syn-word">${sanitizeHTML(s.word)}</span>
              <span class="ai-syn-zh">${sanitizeHTML(s.zh || '')}</span>
              <span class="ai-syn-nuance">${sanitizeHTML(s.nuance || '')}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${scenes?.length ? `
        <div class="ai-section">
          <div class="ai-section-title">场景联想</div>
          ${scenes.slice(0, 4).map(s => `
            <div class="ai-scene-row">
              <span class="ai-scene-name">${sanitizeHTML(s.name)}</span>
              <span class="ai-scene-words">${(s.related || []).map(w => sanitizeHTML(w)).join(' · ')}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * 调用 DeepSeek API 生成概念思维导图
 * @param {string} word
 * @returns {object|null} { centerWord, meaning_zh, cefr, definition, categories }
 */
export async function fetchMindMap(word, { signal } = {}) {
  const key = getApiKey();
  if (!key) return null;

  const cache = getCache();
  const cacheKey = 'mm4_v6_' + word.toLowerCase();
  if (cache[cacheKey]) {
    const cached = sanitizeConceptMap(cache[cacheKey], word);
    if (isHighQualityConceptMap(cached)) return cached;
    delete cache[cacheKey];
    setCache(cache);
  }

  const prompt = `You are a concept universe designer for English learners (Chinese speakers). Your goal is NOT to create a dictionary entry or thesaurus map. Your goal is to create a DISCOVERY EXPERIENCE — users should feel they're exploring a concept universe, not reading a vocabulary list.

CRITICAL QUALITY RULES:
- Return meaningful semantic associations, not raw text co-occurrence.
- Never include function words or stopwords such as the, a, an, and, or, for, so, then, of, to, in, on, is, are, was, were.
- Never include generic filler words such as thing, people, example, time, or way unless the relationship is unusually specific and essential.
- Prefer concrete nouns, meaningful verbs, descriptive adjectives, and established phrases.
- Every related word must have a strong explainable relationship to "${word}".
- Each category must contain 3-6 useful English words or phrases.
- Every related word must include meaning_zh and a concise English definition.
- The center must include meaning_zh, definition, and insight.

For "${word}", generate a CONCEPT UNIVERSE:

DESIGN RULES:
- Center: the English word, its Chinese meaning, CEFR level (A1/A2/B1/B2/C1/C2), and a one-line English definition
- insight: ONE natural English sentence (under 120 chars) that captures the ESSENCE of this concept in human experience. Make it memorable and poetic. NOT a dictionary definition — something that makes the learner remember the concept forever.
- Categories: 3-5 conceptual realms (NOT thesaurus categories). These are "concept islands" — territories of related ideas. Avoid the obvious (don't put "collaboration" in the same group as "team" — learners expect that). Mix domains: a business word might connect to art, a science word might connect to emotion. Surprise the learner.
- Each category has 3-5 related English words. Each with a short relation hint.
- Category names in Simplified Chinese. Use ONE expressive emoji per category.
- type: "scene" | "emotion" | "action" | "power" | "concept"
- bridges: 1-2 unexpected conceptual bridges across categories. These are surprising but TRUE connections — pairs of words from DIFFERENT categories that share a deep, non-obvious link. Include a short insight (under 60 chars) explaining why. Example: for "team", a bridge between "orchestra" (scene) and "leader" (power) with insight "Like a conductor guiding musicians toward harmony."

Return ONLY valid JSON (no markdown, no backticks):
{
  "centerWord": "${word}",
  "meaning_zh": "简中释义",
  "cefr": "B1",
  "definition": "one-line clear English definition",
  "insight": "One memorable sentence capturing the essence",
  "categories": [
    {
      "name": "概念领域名",
      "emoji": "🚀",
      "type": "scene",
      "words": [{
        "word": "rocket",
        "meaning_zh": "火箭",
        "definition": "A vehicle propelled into space.",
        "relation": "travels through it"
      }]
    }
  ],
  "bridges": [
    {"from": "wordA", "to": "wordB", "insight": "Why these two connect in a surprising way"}
  ]
}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s 超时
  const abortFromCaller = () => controller.abort();
  if (signal?.aborted) {
    controller.abort();
  } else {
    signal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2500,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '';

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const result = sanitizeConceptMap(JSON.parse(jsonMatch[0]), word);
    if (isHighQualityConceptMap(result)) {
      cache[cacheKey] = result;
      setCache(cache);
      return result;
    }
    return getSemanticFallback(word);
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.warn('[AI MindMap] 请求失败:', e.message);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

/**
 * 清除 AI 缓存
 */
export function clearAICache() {
  setItem(AI_CACHE_KEY, {});
}
