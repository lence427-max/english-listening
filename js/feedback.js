/**
 * Silentium — 训练反馈页面
 * 展示准确率、错误分布、逐词对比、快速加入生词本
 */

import { getMaterialById, addVocabularyItem, upsertMaterial } from './storage.js';
import { createVocabularyItem } from './data-structure.js';
import { sanitizeHTML, showToast, formatTime } from './utils.js';
import { getErrorLabel } from './diff.js';
import { calcParagraphHeatmap, adjustParagraphTime, saveParagraphs, getOrCreateParagraphs, estimateParagraphTimes } from './paragraph.js';

export function renderFeedbackView(container, materialId) {
  const material = getMaterialById(materialId);
  if (!material) {
    container.innerHTML = '<div class="empty-state"><h3>素材未找到</h3></div>';
    return;
  }

  const result = material.dictationResult;
  if (!result || !result.pairs) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>暂无训练记录</h3>
        <p>请先完成一次听写训练</p>
        <button class="btn btn-primary" onclick="window.App.switchView('training', { materialId: '${materialId}' })">
          开始训练
        </button>
      </div>
    `;
    return;
  }

  const { pairs, stats, accuracy, grade } = result;

  // 统计错误词（不重复）
  const errorPairs = pairs.filter(p => !p.match);

  container.innerHTML = `
    <div class="feedback-view">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <button class="btn btn-ghost btn-sm" id="fb-back-btn">
          <i class="fa-solid fa-arrow-left"></i> 返回
        </button>
        <span class="text-sm truncate max-w-[300px]" style="color: var(--text-secondary);">
          ${sanitizeHTML(material.title)}
        </span>
        <span></span>
      </div>

      <!-- Score Section -->
      <div class="card mb-6 text-center">
        <div class="card-body">
          <div class="feedback-score">${accuracy}%</div>
          <div class="text-sm mt-1" style="color: var(--text-secondary);">准确率</div>
          <span class="feedback-grade feedback-grade-${grade}">${grade}</span>
          <div class="text-xs mt-3" style="color: var(--text-secondary);">
            共计 ${stats.total} 词 · 正确 ${stats.correct} · 错误 ${stats.missing + stats.extra + stats.replacement}
          </div>
        </div>
      </div>

      <!-- Error Distribution -->
      <div class="card mb-6">
        <div class="card-header">
          <h3 class="font-semibold text-sm">📊 错误分布</h3>
          ${errorPairs.length > 0 ? `
            <button class="btn btn-secondary btn-sm" id="fb-add-all-btn">
              <i class="fa-solid fa-plus"></i> 全部错误词加入生词本
            </button>
          ` : ''}
        </div>
        <div class="card-body">
          <div class="feedback-stat-grid">
            ${renderStatCard('漏词', stats.missing, 'var(--warning)', '#b45309')}
            ${renderStatCard('多词', stats.extra, 'var(--text-tertiary)', '#64748b')}
            ${renderStatCard('替换词', stats.replacement, 'var(--danger)', '#b91c1c')}
          </div>
        </div>
      </div>

      <!-- Paragraph Heatmap -->
      ${renderHeatmap(material, result)}

      <!-- Word-by-word Comparison -->
      <div class="card mb-6">
        <div class="card-header">
          <h3 class="font-semibold text-sm">📝 逐词对比</h3>
        </div>
        <div class="card-body">
          <div class="feedback-comparison" id="fb-comparison">
            ${renderComparison(pairs)}
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between">
        <button class="btn btn-secondary" id="fb-materials-btn">
          <i class="fa-solid fa-folder-open"></i> 返回素材列表
        </button>
        <div class="flex items-center gap-2">
          <button class="btn btn-secondary" id="fb-shadowing-btn">
            <i class="fa-solid fa-microphone"></i> 影子跟读
          </button>
          <button class="btn btn-primary" id="fb-retrain-btn">
            <i class="fa-solid fa-rotate-right"></i> 重新训练
          </button>
        </div>
      </div>
    </div>
  `;

  bindEvents(container, material, errorPairs);
}

// ==================== 渲染 ====================

function renderStatCard(label, count, bgColor, textColor) {
  return `
    <div class="feedback-stat-card" style="background: ${bgColor}20; border: 1px solid ${bgColor}40;">
      <div class="feedback-stat-num" style="color: ${textColor};">${count}</div>
      <div class="feedback-stat-label">${label}</div>
    </div>
  `;
}

// ==================== 段落热力图 ====================

function renderHeatmap(material, result) {
  const audioDuration = material.audioDuration || 0;
  const paragraphResults = material.paragraphResults || {};

  // 使用持久化的段落数据
  const paragraphs = getOrCreateParagraphs(material);
  estimateParagraphTimes(paragraphs, audioDuration);

  // 计算每段准确率
  const heatmapData = calcParagraphHeatmap(material.originalText, result, audioDuration, paragraphResults);

  if (paragraphs.length < 2) return ''; // 单段落不显示热力图

  const maxErr = Math.max(1, ...paragraphs.map(p => p.errors || 0));
  const weakestIdx = paragraphs.reduce((min, p, i) =>
    (p.accuracy < paragraphs[min].accuracy) ? i : min, 0);

  return `
    <div class="card mb-6">
      <div class="card-header">
        <h3 class="font-semibold text-sm">🔥 段落表现</h3>
        <span class="text-xs" style="color: var(--text-secondary);">点击按钮重练薄弱段落</span>
      </div>
      <div class="card-body">
        <div class="heatmap-list">
          ${heatmapData.map((p, i) => {
            const heatColor = getHeatColor(p.accuracy);
            const isWeakest = i === weakestIdx && p.accuracy < 100;
            const para = paragraphs[i] || p;
            return `
              <div class="heatmap-row ${isWeakest ? 'heatmap-weakest' : ''}">
                <div class="heatmap-label">
                  <span class="text-sm font-medium">段落${i + 1}</span>
                  ${para.startTime !== undefined ? `<span class="text-xs" style="color: var(--text-secondary);">${formatTime(para.startTime)}</span>` : ''}
                </div>
                <div class="heatmap-bar-wrap">
                  <div class="heatmap-bar" style="width: ${p.accuracy}%; background: ${heatColor};"></div>
                </div>
                <div class="heatmap-score" style="color: ${heatColor};">
                  ${p.accuracy}%
                </div>
                <div class="time-adjust-row" style="gap: 2px;">
                  <button class="time-adjust-btn fb-time-btn" data-para="${i}" data-delta="-3">-3s</button>
                  <button class="time-adjust-btn fb-time-btn" data-para="${i}" data-delta="-1">-1s</button>
                  <button class="time-adjust-btn fb-time-btn" data-para="${i}" data-delta="1">+1s</button>
                  <button class="time-adjust-btn fb-time-btn" data-para="${i}" data-delta="3">+3s</button>
                </div>
                <button class="btn btn-ghost btn-sm heatmap-retrain-btn"
                        data-para="${i}"
                        ${p.accuracy >= 100 ? 'disabled' : ''}>
                  <i class="fa-solid fa-rotate-right"></i> 重练
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function getHeatColor(accuracy) {
  if (accuracy >= 90) return 'var(--success)';
  if (accuracy >= 75) return '#84cc16';  // lime
  if (accuracy >= 60) return 'var(--warning)';
  return 'var(--danger)';
}

function renderComparison(pairs) {
  if (!pairs || pairs.length === 0) return '';

  return pairs.map((p, idx) => {
    const word = sanitizeHTML(p.word);
    const userWord = sanitizeHTML(p.userWord || '');

    if (p.match) {
      return `<span class="fb-word fb-correct" data-idx="${idx}">${word}</span>`;
    }

    // 错误词：显示原文词 + 用户词 + 类型标签 + [+] 按钮
    const label = getErrorLabel(p.errorType);
    const cls = `fb-word fb-${p.errorType}`;

    let html = `<span class="${cls}" data-idx="${idx}">`;
    html += `<span class="fb-orig-word">${word}</span>`;

    if (p.errorType === 'replacement') {
      html += `<span class="fb-arrow">→</span>`;
      html += `<span class="fb-user-word">${userWord}</span>`;
    } else if (p.errorType === 'missing') {
      html += `<span class="fb-tag">${label}</span>`;
    }

    html += `<button class="fb-add-btn" data-word="${word}" title="加入生词本">+</button>`;
    html += `</span>`;

    return html;
  }).join(' ');
}

// ==================== 事件 ====================

function bindEvents(container, material, errorPairs) {
  // 返回训练列表
  container.querySelector('#fb-back-btn').addEventListener('click', () => {
    window.App.switchView('training');
  });

  // 返回素材列表
  container.querySelector('#fb-materials-btn').addEventListener('click', () => {
    window.App.switchView('materials');
  });

  // 重新训练
  container.querySelector('#fb-retrain-btn').addEventListener('click', () => {
    window.App.switchView('training', { materialId: material.id });
  });

  // 影子跟读
  container.querySelector('#fb-shadowing-btn').addEventListener('click', () => {
    window.App.switchView('shadowing', { materialId: material.id });
  });

  // [+] 单个加词
  container.querySelectorAll('.fb-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const word = btn.dataset.word;
      if (!word) return;
      addWordToVocab(word, material.id);
      btn.disabled = true;
      btn.textContent = '✓';
      btn.style.color = 'var(--success)';
    });
  });

  // 时间微调（反馈页热力图）
  container.querySelectorAll('.fb-time-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const paraIdx = parseInt(btn.dataset.para, 10);
      const delta = parseInt(btn.dataset.delta, 10);
      const paragraphs = getOrCreateParagraphs(material);
      adjustParagraphTime(paragraphs, paraIdx, delta);
      saveParagraphs(material, paragraphs, upsertMaterial);
      // 重新渲染反馈页
      renderFeedbackView(container, materialId);
    });
  });

  // 段落重练
  container.querySelectorAll('.heatmap-retrain-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const paraIdx = parseInt(btn.dataset.para, 10);
      window.App.switchView('training', { materialId: material.id, paragraphIndex: paraIdx });
    });
  });

  // 全部加入生词本
  container.querySelector('#fb-add-all-btn')?.addEventListener('click', () => {
    const words = new Set();
    let addedCount = 0;

    for (const p of errorPairs) {
      const w = p.word;
      if (!w || words.has(w.toLowerCase())) continue;
      words.add(w.toLowerCase());
      const ok = addWordToVocab(w, material.id, true);
      if (ok) addedCount++;
    }

    if (addedCount > 0) {
      showToast(`${addedCount} 个生词已加入生词本`, 'success');
      // 禁用所有 [+] 按钮
      container.querySelectorAll('.fb-add-btn').forEach(btn => {
        btn.disabled = true;
        btn.textContent = '✓';
        btn.style.color = 'var(--success)';
      });
    } else {
      showToast('这些词已在生词本中', 'info');
    }
  });
}

/**
 * 快速加入生词本（跳过词典查询）
 */
function addWordToVocab(word, materialId, silent = false) {
  const item = createVocabularyItem({
    word,
    materialId,
  });
  const result = addVocabularyItem(item);
  if (!silent && result) {
    showToast(`"${word}" 已加入生词本`, 'success');
  }
  return !!result;
}
