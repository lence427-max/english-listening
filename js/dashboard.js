/**
 * 十篇精听工坊 — 进度看板
 */

import { getMaterials, getTrainingRecords, getVocabulary } from './storage.js';
import { STORAGE_KEYS } from './data-structure.js';
import { getItem } from './storage.js';
import { formatTime, sanitizeHTML } from './utils.js';
import { getFocusStats } from './focus-mode.js';

/**
 * 渲染进度看板
 */
export function renderDashboardView(container) {
  const materials = getMaterials();
  const records = getTrainingRecords();
  const vocab = getVocabulary();
  const focusStats = getFocusStats();

  // 统计数据
  const stats = computeDashboardStats(materials, records);
  const reviewCount = computeReviewCount(records);

  container.innerHTML = `
    <div class="dashboard-view">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold">进度看板</h1>
          <p class="text-sm mt-1" style="color: var(--text-secondary);">
            十篇精听目标 · 深度学习追踪
          </p>
        </div>
        ${reviewCount > 0 ? `
          <button class="btn btn-warning" id="review-btn" style="background: var(--warning); color: #000;">
            <i class="fa-solid fa-rotate"></i> ${reviewCount} 篇待复习
          </button>
        ` : ''}
      </div>

      <!-- Global stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div class="card p-4 text-center">
          <div class="text-2xl font-bold" style="color: var(--primary);">${stats.completedCount}/10</div>
          <div class="text-xs mt-1" style="color: var(--text-secondary);">已完成</div>
        </div>
        <div class="card p-4 text-center">
          <div class="text-2xl font-bold" style="color: var(--success);">${stats.totalTrained}</div>
          <div class="text-xs mt-1" style="color: var(--text-secondary);">已训练</div>
        </div>
        <div class="card p-4 text-center">
          <div class="text-2xl font-bold" style="color: var(--warning);">${vocab.length}</div>
          <div class="text-xs mt-1" style="color: var(--text-secondary);">生词积累</div>
        </div>
        <div class="card p-4 text-center">
          <div class="text-2xl font-bold" style="color: var(--text-secondary);">${focusStats.totalMinutes}</div>
          <div class="text-xs mt-1" style="color: var(--text-secondary);">专注分钟</div>
        </div>
      </div>

      <!-- 10-Article Goal Board -->
      <div class="card mb-6">
        <div class="card-header">
          <h2 class="font-semibold">🎯 十篇目标看板</h2>
          <span class="text-sm" style="color: var(--text-secondary);">${stats.completedCount}/10 完成</span>
        </div>
        <div class="card-body">
          <div class="goal-grid">
            ${renderGoalGrid(materials, stats)}
          </div>
        </div>
      </div>

      <!-- Single article progress cards -->
      ${materials.length > 0 ? `
        <div class="card mb-6">
          <div class="card-header">
            <h2 class="font-semibold">📊 单篇进度</h2>
          </div>
          <div class="card-body">
            <div class="space-y-3">
              ${materials.map(m => renderProgressCard(m)).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Milestones -->
      ${stats.completedCount > 0 ? renderMilestones(stats.completedCount) : ''}
    </div>
  `;

  // 绑定复习按钮
  container.querySelector('#review-btn')?.addEventListener('click', async () => {
    const { startReview } = await import('./review.js');
    startReview();
  });
}

function renderGoalGrid(materials, stats) {
  const goalSlots = [];
  for (let i = 0; i < 10; i++) {
    const material = i < materials.length ? materials[i] : null;
    const completed = material?.status === 'completed';

    goalSlots.push(`
      <div class="goal-slot ${completed ? 'goal-completed' : material ? 'goal-in-progress' : 'goal-empty'}"
           ${material ? `data-id="${material.id}"` : ''}
           title="${material ? sanitizeHTML(material.title) : `第 ${i + 1} 篇 — 待填充`}">
        <div class="goal-slot-number">${i + 1}</div>
        ${completed ? '<i class="fa-solid fa-circle-check goal-check"></i>' : ''}
        ${material && !completed ? `
          <div class="goal-progress-mini">
            <div class="progress-bar" style="height: 3px;">
              <div class="progress-bar-fill" style="width: ${getMaterialProgress(material)}%;"></div>
            </div>
          </div>
        ` : ''}
        <div class="goal-slot-label truncate">${material ? sanitizeHTML(material.title.substring(0, 12)) : '—'}</div>
      </div>
    `);
  }
  return goalSlots.join('');
}

function renderProgressCard(material) {
  const hasResult = !!material.dictationResult;
  const progress = hasResult ? 100 : 0;
  const errCount = material.dictationResult ? material.dictationResult.filter(w => !w.match).length : 0;

  const statusMap = {
    pending: { label: '待开始', color: 'var(--text-tertiary)' },
    dictating: { label: '听写中', color: 'var(--warning)' },
    completed: { label: '已完成', color: 'var(--success)' },
  };
  const s = statusMap[material.status] || statusMap.pending;

  return `
    <div class="progress-card p-3 rounded-lg" style="border: 1px solid var(--border); cursor: pointer;"
         data-id="${material.id}">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style="background: ${s.color};">
            <i class="fa-solid ${hasResult ? 'fa-check' : 'fa-pen'}"></i>
          </span>
          <span class="font-medium text-sm truncate">${sanitizeHTML(material.title)}</span>
        </div>
        <span class="badge flex-shrink-0 ml-2" style="background: ${s.color}20; color: ${s.color}; border: 1px solid ${s.color}40;">
          ${s.label}
        </span>
      </div>
      <div class="progress-bar mb-2">
        <div class="progress-bar-fill" style="width: ${progress}%; ${hasResult ? 'background: var(--success);' : ''}"></div>
      </div>
      <div class="flex items-center gap-4 text-xs" style="color: var(--text-secondary);">
        <span>${material.audioDuration ? formatTime(material.audioDuration) : '—'}</span>
        ${hasResult ? `<span style="color: ${errCount === 0 ? 'var(--success)' : 'var(--danger)'};">${errCount === 0 ? '✓ 全部正确' : errCount + ' 处错误'}</span>` : ''}
      </div>
    </div>
  `;
}

function renderMilestones(count) {
  const milestones = [
    { at: 1, msg: '🎉 第一篇完成！好的开始是成功的一半' },
    { at: 3, msg: '🔥 已完成 3 篇，保持节奏！' },
    { at: 5, msg: '🏆 目标过半！第五篇完成' },
    { at: 8, msg: '🚀 仅剩 2 篇，冲刺阶段！' },
    { at: 10, msg: '👑 十篇目标全部完成！你是精听大师！' },
  ];

  const reached = milestones.filter(m => count >= m.at).pop();

  return reached ? `
    <div class="card p-4 mb-6" style="background: var(--primary-light); border-color: var(--primary);">
      <p class="text-sm font-medium" style="color: var(--primary);">${reached.msg}</p>
    </div>
  ` : '';
}

// ==================== 计算 ====================

function computeDashboardStats(materials, records) {
  const completedCount = materials.filter(m => m.status === 'completed').length;
  const totalTrained = materials.filter(m => m.dictationResult).length;
  const completionPercent = materials.length > 0 ? Math.round((completedCount / 10) * 100) : 0;

  return { completedCount, totalTrained, completionPercent };
}

function computeReviewCount(records) {
  return records.filter(r => r.reviewStatus === 'need_review').length;
}

function getMaterialProgress(material) {
  return material.dictationResult ? 100 : 0;
}

// ==================== 事件 ====================

export function bindDashboardEvents(container) {
  container.querySelectorAll('.progress-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      if (id) {
        window.App?.switchView('training', { materialId: id });
      }
    });
  });

  container.querySelectorAll('.goal-slot[data-id]').forEach(slot => {
    slot.addEventListener('click', () => {
      const id = slot.dataset.id;
      if (id) {
        window.App?.switchView('training', { materialId: id });
      }
    });
  });
}
