/**
 * Silentium — 词库
 * 全素材词频索引 + 搜索 + 关联素材
 */

import { getMaterials, getVocabulary } from './storage.js';
import { sanitizeHTML, showToast } from './utils.js';
import { lookupWord } from './dictionary.js';

let wordStats = null;

function buildWordStats() {
  if (wordStats) return wordStats;
  const materials = getMaterials();
  const stats = {};

  for (const m of materials) {
    if (!m.originalText) continue;
    const words = m.originalText.split(/\s+/)
      .map(w => w.toLowerCase().replace(/[^a-z']/g, ''))
      .filter(w => w.length > 1);

    const seen = new Set();
    for (const w of words) {
      if (!stats[w]) stats[w] = { word: w, freq: 0, materials: [] };
      stats[w].freq++;
      if (!seen.has(w)) {
        seen.add(w);
        stats[w].materials.push({ id: m.id, title: m.title });
      }
    }
  }

  wordStats = Object.values(stats).sort((a, b) => b.freq - a.freq);
  return wordStats;
}

export function renderWordBankView(container) {
  const stats = buildWordStats();
  const vocab = getVocabulary();
  const vocabWords = new Set(vocab.map(v => v.word.toLowerCase()));

  // 按首字母分组
  const grouped = {};
  for (const s of stats) {
    const first = s.word[0] || '#';
    if (!grouped[first]) grouped[first] = [];
    grouped[first].push(s);
  }

  const letters = Object.keys(grouped).sort();

  container.innerHTML = `
    <div class="wordbank-view">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold">📖 词库</h1>
          <p class="text-sm mt-1" style="color: var(--text-secondary);">
            ${stats.length} 个词汇 · 来自 ${getMaterials().filter(m => m.originalText).length} 篇素材
          </p>
        </div>
        <div class="relative">
          <input type="text" class="form-input" id="wb-search" placeholder="搜索单词..."
                 style="padding-left: 2rem; width: 200px;">
          <i class="fa-solid fa-search absolute" style="left: 0.625rem; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); font-size: 0.75rem;"></i>
        </div>
      </div>

      <!-- 字母导航 -->
      <div class="flex flex-wrap gap-1 mb-4" id="wb-letter-nav">
        ${letters.map(l => `
          <button class="wb-letter-btn" data-letter="${l}">${l.toUpperCase()}</button>
        `).join('')}
      </div>

      <!-- 单词列表 -->
      <div class="card">
        <div class="card-body" id="wb-list">
          ${renderWordList(stats.slice(0, 100), vocabWords)}
        </div>
      </div>
    </div>
  `;

  bindEvents(container, stats, vocabWords);
}

function renderWordList(list, vocabWords) {
  if (list.length === 0) {
    return '<p class="text-sm text-center" style="color: var(--text-secondary); padding: 2rem;">无匹配词汇</p>';
  }
  return list.map(s => `
    <div class="wb-word-row" data-word="${sanitizeHTML(s.word)}">
      <div class="wb-word-main">
        <span class="wb-word-text">${sanitizeHTML(s.word)}</span>
        <span class="wb-word-freq">${s.freq} 次</span>
        ${vocabWords.has(s.word) ? '<span class="badge badge-success" style="font-size: 0.5625rem;">生词本</span>' : ''}
      </div>
      <div class="wb-word-mats">
        ${s.materials.slice(0, 3).map(m => `
          <span class="wb-mat-link" data-id="${m.id}" title="${sanitizeHTML(m.title)}">
            ${sanitizeHTML(m.title.substring(0, 20))}
          </span>
        `).join('')}
        ${s.materials.length > 3 ? `<span class="text-xs" style="color: var(--text-tertiary);">+${s.materials.length - 3}</span>` : ''}
      </div>
      <button class="btn btn-ghost btn-sm wb-explore-btn" data-word="${sanitizeHTML(s.word)}" title="知识探索">
        <i class="fa-solid fa-globe"></i>
      </button>
    </div>
  `).join('');
}

function bindEvents(container, allStats, vocabWords) {
  // 字母导航
  container.querySelectorAll('.wb-letter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const letter = btn.dataset.letter;
      const filtered = allStats.filter(s => s.word[0] === letter);
      container.querySelector('#wb-list').innerHTML = renderWordList(filtered, vocabWords);
    });
  });

  // 搜索
  const searchInput = container.querySelector('#wb-search');
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    if (!q) {
      container.querySelector('#wb-list').innerHTML = renderWordList(allStats.slice(0, 100), vocabWords);
      return;
    }
    const filtered = allStats.filter(s => s.word.includes(q));
    container.querySelector('#wb-list').innerHTML = renderWordList(filtered.slice(0, 100), vocabWords);
  });

  // 双击查词
  container.querySelectorAll('.wb-word-text').forEach(el => {
    el.addEventListener('dblclick', (e) => {
      const word = el.closest('.wb-word-row')?.dataset.word;
      if (word) {
        const rect = el.getBoundingClientRect();
        lookupWord(word, rect.right + 10, rect.top);
      }
    });
  });

  // 素材链接 → 跳转训练
  container.querySelectorAll('.wb-mat-link').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.id;
      if (id) window.App?.switchView('segmented', { materialId: id });
    });
  });

  // 探索按钮 → 跳转知识探索
  container.querySelectorAll('.wb-explore-btn').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const word = el.dataset.word;
      if (word) window.App?.switchView('explore', { word });
    });
  });
}
