/**
 * Silentium — 在线词典模块
 * Free Dictionary API → MyMemory 翻译 → 知识卡片
 */

import { sanitizeHTML, showToast } from './utils.js';
import { addVocabularyItem } from './storage.js';
import { createVocabularyItem } from './data-structure.js';
import { renderKnowledgeGraph } from './knowledge-graph.js';
import { fetchAIGraph, renderAIGraph, getApiKey, setApiKey } from './ai-network.js';

const DICT_API = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const TRANSLATE_API = 'https://api.mymemory.translated.net/get';
const TIMEOUT = 4000;

let popupEl = null;
const initializedContainers = new WeakSet();

export function initDictionary(container) {
  if (!container || initializedContainers.has(container)) return;
  initializedContainers.add(container);

  container.addEventListener('dblclick', (e) => {
    const word = getWordAtPoint(e);
    if (word && word.length > 1) {
      lookupWord(word, e.clientX, e.clientY);
    }
  });

  container.addEventListener('mouseover', (e) => {
    const word = getWordAtPoint(e);
    if (word && word.length > 1) {
      e.target.style.cursor = 'pointer';
      e.target.title = '双击查词';
    }
  });
}

function getWordAtPoint(e) {
  const range = document.caretRangeFromPoint(e.clientX, e.clientY);
  if (!range) return null;
  const textNode = range.startContainer;
  if (textNode.nodeType !== Node.TEXT_NODE) return null;
  const text = textNode.textContent;
  let start = range.startOffset, end = range.startOffset;
  while (start > 0 && /[a-zA-Z']/.test(text[start - 1])) start--;
  while (end < text.length && /[a-zA-Z']/.test(text[end])) end++;
  return text.substring(start, end).trim() || null;
}

export async function lookupWord(word, x, y) {
  removePopup();
  showPopup(x, y, 'loading', word);

  // 先渲染英文释义（快），再异步补中文（慢）
  let data = null;
  try {
    data = await fetchDict(word);
  } catch (e) { /* try fallback */ }

  // 主 API 失败，尝试 Datamuse 备用
  if (!data) {
    try {
      data = await fetchFallback(word);
    } catch (e) { /* give up */ }
  }

  if (!data) {
    showPopup(x, y, 'error', word);
    return;
  }

  // 先显示英文释义
  renderWordCard(data, word, []);
  autoCollect(data, word);

  // 异步补中文翻译
  translateAndUpdate(data, word);
}

// ==================== API ====================

async function fetchDict(word) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(DICT_API + encodeURIComponent(word), { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return (json && json.length > 0) ? json : null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFallback(word) {
  const url = `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=d&max=1`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json && json.length > 0 && json[0].defs) {
      // 转换为与主 API 兼容的格式
      return [{
        word: json[0].word || word,
        phonetic: '',
        meanings: [{ partOfSpeech: json[0].tags?.[0] || '—', definitions: json[0].defs.slice(0, 3).map(d => ({ definition: d })) }],
      }];
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function translateAndUpdate(data, word) {
  try {
    const zhMeanings = await translateDefinitions(data);
    if (zhMeanings.some(m => m.zh)) {
      updateCardWithChinese(zhMeanings);
    }
  } catch (e) { /* keep English-only card */ }
}

async function translateDefinitions(data) {
  const entry = data[0];
  const defs = [];
  for (const m of (entry.meanings || []).slice(0, 2)) {
    for (const d of (m.definitions || []).slice(0, 2)) {
      defs.push({ en: d.definition, pos: m.partOfSpeech });
    }
  }

  // 并行翻译，取最快结果
  const results = await Promise.all(defs.map(async (d) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(`${TRANSLATE_API}?q=${encodeURIComponent(d.en)}&langpair=en|zh`, { signal: ctrl.signal });
      clearTimeout(t);
      const json = await res.json();
      return { en: d.en, zh: json.responseData?.translatedText || '', pos: d.pos };
    } catch {
      return { en: d.en, zh: '', pos: d.pos };
    }
  }));
  return results;
}

function updateCardWithChinese(zhMeanings) {
  if (!popupEl) return;
  const meaningsEl = popupEl.querySelector('.word-card-meanings');
  if (!meaningsEl) return;
  meaningsEl.innerHTML = zhMeanings.map(m => `
    <div class="word-meaning-item">
      <span class="badge badge-info word-pos">${sanitizeHTML(m.pos)}</span>
      <div class="word-meaning-zh">${sanitizeHTML(m.zh || m.en)}</div>
      <div class="word-meaning-en">${sanitizeHTML(m.en)}</div>
    </div>
  `).join('');
}

// ==================== 渲染单词知识卡片 ====================

function renderWordCard(data, word, zhMeanings) {
  const entry = data[0];
  const phonetic = entry.phonetic || entry.phonetics?.[0]?.text || '';
  const audioUrl = entry.phonetics?.find(p => p.audio)?.audio || '';

  // 提取搭配词（从例句中）
  const examples = [];
  for (const m of (entry.meanings || [])) {
    for (const d of (m.definitions || [])) {
      if (d.example) examples.push(d.example);
    }
  }

  const html = `
    <div class="word-card">
      <!-- 头部 -->
      <div class="word-card-header">
        <div>
          <div class="word-card-word">${sanitizeHTML(entry.word || word)}</div>
          ${phonetic ? `<div class="word-card-phonetic">/${sanitizeHTML(phonetic)}/</div>` : ''}
        </div>
        <div class="word-card-actions">
          ${audioUrl ? `
            <button class="btn btn-ghost btn-sm word-audio-btn" data-audio="${sanitizeHTML(audioUrl)}">
              <i class="fa-solid fa-volume-high"></i>
            </button>
          ` : ''}
          <button class="btn btn-ghost btn-sm word-close-btn">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <!-- 释义区（中英对照） -->
      <div class="word-card-meanings">
        ${zhMeanings.length > 0 ? zhMeanings.map(m => `
          <div class="word-meaning-item">
            <span class="badge badge-info word-pos">${sanitizeHTML(m.pos)}</span>
            <div class="word-meaning-zh">${sanitizeHTML(m.zh || m.en)}</div>
            <div class="word-meaning-en">${sanitizeHTML(m.en)}</div>
          </div>
        `).join('') : (entry.meanings || []).slice(0, 2).map(m => `
          <div class="word-meaning-item">
            <span class="badge badge-info word-pos">${sanitizeHTML(m.partOfSpeech)}</span>
            ${m.definitions.slice(0, 2).map(d => `
              <div class="word-meaning-zh">${sanitizeHTML(d.definition)}</div>
            `).join('')}
          </div>
        `).join('')}
      </div>

      <!-- 例句 -->
      ${examples.length > 0 ? `
        <div class="word-card-section">
          <div class="word-card-section-title">📝 例句</div>
          ${examples.slice(0, 3).map(e => `
            <div class="word-example">"${sanitizeHTML(e)}"</div>
          `).join('')}
        </div>
      ` : ''}

      <!-- 底部 -->
      <div class="word-card-footer">
        <div class="flex items-center justify-between">
          <span class="text-xs" style="color: var(--success);">
            <i class="fa-solid fa-check"></i> 已自动加入生词本
          </span>
          <div class="flex items-center gap-1">
            <button class="btn btn-primary btn-sm word-explore-btn" data-word="${sanitizeHTML(entry.word || word)}">
              <i class="fa-solid fa-compass"></i> 探索概念
            </button>
            <button class="btn btn-ghost btn-sm word-graph-btn">
              <i class="fa-solid fa-circle-nodes"></i> 图谱
            </button>
            <button class="btn btn-ghost btn-sm word-ai-btn">
              <i class="fa-solid fa-robot"></i> AI
            </button>
          </div>
        </div>
        <div class="word-graph-container hidden"></div>
        <div class="word-ai-container hidden"></div>
      </div>
    </div>
  `;

  if (popupEl) updatePopup(html, entry.word || word);
  bindCardEvents(entry.word || word, audioUrl);
}

function bindCardEvents(word, audioUrl) {
  // 发音
  const audioBtn = popupEl?.querySelector('.word-audio-btn');
  if (audioBtn) {
    audioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const audio = new Audio(audioUrl);
      audio.play().catch(() => showToast('发音播放失败', 'warning'));
    });
  }

  // 关闭
  const closeBtn = popupEl?.querySelector('.word-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removePopup();
    });
  }

  // 探索模式
  const exploreBtn = popupEl?.querySelector('.word-explore-btn');
  if (exploreBtn) {
    exploreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const w = exploreBtn.dataset.word;
      removePopup();
      window.App.switchView('explore', { word: w });
    });
  }

  // AI 深度分析
  const aiBtn = popupEl?.querySelector('.word-ai-btn');
  const aiContainer = popupEl?.querySelector('.word-ai-container');
  if (aiBtn && aiContainer) {
    aiBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const isOpen = !aiContainer.classList.contains('hidden');
      if (isOpen) {
        aiContainer.classList.add('hidden');
        aiBtn.innerHTML = '<i class="fa-solid fa-robot"></i> AI 分析';
        return;
      }

      // 检查 API Key
      let key = getApiKey();
      if (!key) {
        key = prompt('请输入 DeepSeek API Key（格式：sk-...）：');
        if (!key) return;
        setApiKey(key);
      }

      aiContainer.classList.remove('hidden');
      aiContainer.innerHTML = '<div class="ai-loading"><i class="fa-solid fa-spinner fa-spin"></i> AI 分析中...</div>';
      aiBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 分析中';

      const aiData = await fetchAIGraph(word);
      aiContainer.innerHTML = renderAIGraph(aiData, word) || '<p class="ai-error">AI 分析失败，请检查 API Key</p>';
      aiBtn.innerHTML = aiData ? '<i class="fa-solid fa-robot"></i> 收起分析' : '<i class="fa-solid fa-robot"></i> AI 分析';

      // 图谱节点点击查词
      aiContainer.querySelectorAll('.kg-node').forEach(node => {
        node.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const w = node.dataset.word;
          if (w) {
            const rect = popupEl.getBoundingClientRect();
            lookupWord(w, rect.right + 10, rect.top);
          }
        });
      });
    });
  }

  // 知识图谱展开/收起
  const graphBtn = popupEl?.querySelector('.word-graph-btn');
  const graphContainer = popupEl?.querySelector('.word-graph-container');
  if (graphBtn && graphContainer) {
    graphBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !graphContainer.classList.contains('hidden');
      if (isOpen) {
        graphContainer.classList.add('hidden');
        graphBtn.innerHTML = '<i class="fa-solid fa-circle-nodes"></i> 知识图谱';
      } else {
        graphContainer.classList.remove('hidden');
        graphContainer.innerHTML = renderKnowledgeGraph(word);
        graphBtn.innerHTML = '<i class="fa-solid fa-circle-nodes"></i> 收起图谱';
        // 图谱节点点击查词
        graphContainer.querySelectorAll('.kg-node').forEach(node => {
          node.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const w = node.dataset.word;
            if (w) {
              const rect = popupEl.getBoundingClientRect();
              lookupWord(w, rect.right + 10, rect.top);
            }
          });
        });
      }
    });
  }
}

// ==================== 自动收藏 ====================

function autoCollect(data, word) {
  const entry = data[0];
  const phonetic = entry.phonetic || entry.phonetics?.[0]?.text || '';
  const pos = entry.meanings?.[0]?.partOfSpeech || '';
  const def = entry.meanings?.[0]?.definitions?.[0]?.definition || '';

  const item = createVocabularyItem({
    word: entry.word || word,
    phonetic,
    partOfSpeech: pos,
    definition: def,
  });
  // 静默添加，不弹 toast
  addVocabularyItem(item);
}

// ==================== 弹出窗管理 ====================

function showPopup(x, y, state, word) {
  removePopup();
  popupEl = document.createElement('div');
  popupEl.className = 'word-popup';
  popupEl.style.cssText = `
    position: fixed; z-index: 300;
    left: ${Math.min(x, window.innerWidth - 380)}px;
    top: ${Math.min(y, window.innerHeight - 520)}px;
    width: 360px; max-height: 500px;
    overflow-y: auto;
  `;

  if (state === 'loading') {
    popupEl.innerHTML = `<div class="dict-popup-loading"><i class="fa-solid fa-spinner fa-spin"></i> 查询 "${sanitizeHTML(word)}" ...</div>`;
  } else if (state === 'error') {
    popupEl.innerHTML = `<div class="dict-popup-error"><i class="fa-solid fa-triangle-exclamation"></i><p>词典暂不可用</p></div>`;
  }

  document.body.appendChild(popupEl);
  setTimeout(() => document.addEventListener('click', outsideClick), 0);
}

function updatePopup(html, word) {
  if (!popupEl) return;
  popupEl.innerHTML = html;
  popupEl.dataset.word = word;

  const rect = popupEl.getBoundingClientRect();
  if (rect.right > window.innerWidth) popupEl.style.left = `${window.innerWidth - rect.width - 10}px`;
  if (rect.bottom > window.innerHeight) popupEl.style.top = `${window.innerHeight - rect.height - 10}px`;
}

function outsideClick(e) {
  if (popupEl && !popupEl.contains(e.target)) removePopup();
}

function removePopup() {
  if (popupEl) { popupEl.remove(); popupEl = null; }
  document.removeEventListener('click', outsideClick);
}

export function destroyDictionary() { removePopup(); }
