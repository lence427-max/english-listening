/**
 * Silentium — 单词知识图谱引擎
 * 词共现分析 + 搭配提取 + SVG 径向图
 */

import { getMaterials } from './storage.js';
import { sanitizeHTML } from './utils.js';
import { isConceptCandidate } from './concept-quality.js';

// 缓存：词索引
let wordIndex = null;

/**
 * 构建全素材词索引
 * { word: { freq, materials: Set, collocations: Map<word, count>, neighbors: Map<word, count> } }
 */
function buildWordIndex() {
  if (wordIndex) return wordIndex;
  const materials = getMaterials();
  const index = {};

  for (const m of materials) {
    if (!m.originalText) continue;
    const words = tokenize(m.originalText);
    const wordSet = new Set(words.map(w => w.toLowerCase()));

    for (let i = 0; i < words.length; i++) {
      const w = words[i].toLowerCase();
      if (!index[w]) {
        index[w] = { freq: 0, materials: new Set(), collocations: new Map(), neighbors: new Map() };
      }
      index[w].freq++;
      index[w].materials.add(m.id);

      // 搭配词（前后 2 词窗口）
      for (let j = Math.max(0, i - 2); j <= Math.min(words.length - 1, i + 2); j++) {
        if (j === i) continue;
        const neighbor = words[j].toLowerCase();
        const count = index[w].collocations.get(neighbor) || 0;
        index[w].collocations.set(neighbor, count + 1);
      }

      // 共现（同素材出现）
      for (const other of wordSet) {
        if (other === w) continue;
        const count = index[w].neighbors.get(other) || 0;
        index[w].neighbors.set(other, count + 1);
      }
    }
  }

  wordIndex = index;
  return index;
}

function tokenize(text) {
  return (text || '')
    .split(/\s+/)
    .map(w => w.toLowerCase().replace(/[^a-z']/g, ''))
    .filter(w => isConceptCandidate(w));
}

/**
 * 获取单词的知识图谱数据
 */
export function getWordGraphData(word) {
  const index = buildWordIndex();
  const key = word.toLowerCase();
  const entry = index[key];

  if (!entry) return null;

  // 搭配词（按频率排序，取前 12）
  const collocations = [...entry.collocations.entries()]
    .filter(([w]) => isConceptCandidate(w, key))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w, c]) => ({ word: w, count: c }));

  // 关联词（同素材出现，排除搭配词，取前 8）
  const collWords = new Set(collocations.map(c => c.word));
  const related = [...entry.neighbors.entries()]
    .filter(([w]) => !collWords.has(w) && isConceptCandidate(w, key))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w, c]) => ({ word: w, count: c }));

  return {
    word,
    freq: entry.freq,
    materialCount: entry.materials.size,
    collocations,
    related,
  };
}

/**
 * 渲染 SVG 径向知识图谱
 * @param {string} word - 中心词
 * @returns {string} HTML
 */
export function renderKnowledgeGraph(word) {
  const data = getWordGraphData(word);
  if (!data) return '';

  const innerRing = data.collocations.slice(0, 8);  // 搭配词
  const outerRing = data.related.slice(0, 6);        // 关联词

  if (innerRing.length === 0 && outerRing.length === 0) {
    return `<p class="text-sm text-center" style="color: var(--text-secondary); padding: 2rem;">该词暂无足够的关联数据</p>`;
  }

  const CX = 170, CY = 170;
  const INNER_R = 80, OUTER_R = 140;

  // 中心节点
  let svg = `
    <svg viewBox="0 0 340 340" class="kg-svg">
      <circle cx="${CX}" cy="${CY}" r="30" fill="var(--primary)" opacity="0.15" />
      <circle cx="${CX}" cy="${CY}" r="28" fill="var(--primary)" />
      <text x="${CX}" y="${CY + 5}" text-anchor="middle" fill="white" font-size="11" font-weight="600">${sanitizeHTML(word)}</text>
  `;

  // 内环：搭配词
  const innerAngles = innerRing.map((_, i) => (i / innerRing.length) * Math.PI * 2 - Math.PI / 2);
  for (let i = 0; i < innerRing.length; i++) {
    const a = innerAngles[i];
    const x = CX + Math.cos(a) * INNER_R;
    const y = CY + Math.sin(a) * INNER_R;
    const r = Math.max(10, Math.min(20, 8 + innerRing[i].count * 2));
    svg += `
      <line x1="${CX}" y1="${CY}" x2="${x}" y2="${y}" stroke="var(--primary)" opacity="0.3" stroke-width="1" />
      <circle cx="${x}" cy="${y}" r="${r}" fill="var(--surface)" stroke="var(--primary)" stroke-width="1.5" class="kg-node" data-word="${sanitizeHTML(innerRing[i].word)}" />
      <text x="${x}" y="${y + 4}" text-anchor="middle" fill="var(--text)" font-size="8">${sanitizeHTML(innerRing[i].word)}</text>
    `;
  }

  // 外环：关联词
  const outerAngles = outerRing.map((_, i) => (i / outerRing.length) * Math.PI * 2 - Math.PI / 2 + 0.3);
  for (let i = 0; i < outerRing.length; i++) {
    const a = outerAngles[i];
    const x = CX + Math.cos(a) * OUTER_R;
    const y = CY + Math.sin(a) * OUTER_R;
    svg += `
      <line x1="${CX}" y1="${CY}" x2="${x}" y2="${y}" stroke="var(--border)" stroke-width="1" stroke-dasharray="4,3" />
      <circle cx="${x}" cy="${y}" r="14" fill="var(--bg)" stroke="var(--border)" stroke-width="1" class="kg-node" data-word="${sanitizeHTML(outerRing[i].word)}" />
      <text x="${x}" y="${y + 4}" text-anchor="middle" fill="var(--text-secondary)" font-size="7">${sanitizeHTML(outerRing[i].word)}</text>
    `;
  }

  svg += `</svg>`;

  // 搭配词列表
  const listHtml = data.collocations.slice(0, 12).map(c => `
    <span class="kg-tag">${sanitizeHTML(c.word)} <small>${c.count}</small></span>
  `).join('');

  return `
    <div class="kg-container">
      <div class="kg-graph">${svg}</div>
      <div class="kg-list">
        <div class="kg-list-title">高频搭配</div>
        <div class="kg-tags">${listHtml}</div>
      </div>
    </div>
  `;
}

/**
 * 清除词索引缓存（素材变更后调用）
 */
export function clearWordIndex() {
  wordIndex = null;
}
