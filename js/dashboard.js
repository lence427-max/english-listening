/**
 * Silentium — 进度看板
 */

import { getMaterials, getTrainingRecords, getVocabulary, getStreakData } from './storage.js';
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
  const streak = getStreakData();

  // 统计数据
  const stats = computeDashboardStats(materials, records);
  const reviewCount = computeReviewCount(records);
  const personalStats = computePersonalStats(materials);
  const trendData = collectTrendData(materials);

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
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
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
        <div class="card p-4 text-center" style="${streak.currentStreak >= 7 ? 'border-color: var(--warning);' : ''}">
          <div class="text-2xl font-bold" style="color: ${streak.currentStreak >= 7 ? 'var(--warning)' : 'var(--text-secondary)'};">
            🔥 ${streak.currentStreak}
          </div>
          <div class="text-xs mt-1" style="color: var(--text-secondary);">连续天数</div>
        </div>
      </div>

      <!-- Streak milestones -->
      ${streak.currentStreak > 0 ? renderStreakMilestone(streak) : ''}

      <!-- Personal growth stats -->
      ${personalStats ? `
        <div class="card mb-6">
          <div class="card-header">
            <h2 class="font-semibold">📈 个人成长</h2>
          </div>
          <div class="card-body">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              ${personalStats.best ? `
                <div class="text-center p-3">
                  <div class="text-lg font-bold" style="color: var(--success);">${personalStats.best.accuracy}%</div>
                  <div class="text-xs mt-1" style="color: var(--text-secondary);">🏆 最佳成绩</div>
                  <div class="text-xs truncate mt-0.5" style="color: var(--text-tertiary);">${sanitizeHTML(personalStats.best.title)}</div>
                </div>
              ` : ''}
              ${personalStats.mostImproved ? `
                <div class="text-center p-3">
                  <div class="text-lg font-bold" style="color: var(--primary);">+${personalStats.mostImproved.gain}%</div>
                  <div class="text-xs mt-1" style="color: var(--text-secondary);">🚀 进步最大</div>
                  <div class="text-xs truncate mt-0.5" style="color: var(--text-tertiary);">${sanitizeHTML(personalStats.mostImproved.title)}</div>
                </div>
              ` : ''}
              ${personalStats.hardest ? `
                <div class="text-center p-3">
                  <div class="text-lg font-bold" style="color: var(--danger);">${personalStats.hardest.accuracy}%</div>
                  <div class="text-xs mt-1" style="color: var(--text-secondary);">💪 最困难</div>
                  <div class="text-xs truncate mt-0.5" style="color: var(--text-tertiary);">${sanitizeHTML(personalStats.hardest.title)}</div>
                </div>
              ` : ''}
              <div class="text-center p-3">
                <div class="text-lg font-bold" style="color: var(--text-secondary);">${personalStats.totalAttempts}</div>
                <div class="text-xs mt-1" style="color: var(--text-secondary);">📝 总训练次数</div>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Accuracy trend chart -->
      ${trendData.length >= 2 ? `
        <div class="card mb-6">
          <div class="card-header">
            <h2 class="font-semibold">📈 准确率趋势</h2>
            <span class="text-xs" style="color: var(--text-secondary);">最近 ${trendData.length} 次训练</span>
          </div>
          <div class="card-body">
            ${renderTrendChart(trendData)}
          </div>
        </div>
      ` : ''}

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
  const errCount = getErrCount(material.dictationResult);

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

/**
 * 获取听写错误数（兼容新旧 dictationResult 格式）
 */
function getErrCount(result) {
  if (!result) return 0;
  // 新格式：{pairs, stats, ...}
  if (result.stats) {
    return result.stats.missing + result.stats.extra + result.stats.replacement;
  }
  // 旧格式：[{word, userWord, match}]
  if (Array.isArray(result)) {
    return result.filter(w => !w.match).length;
  }
  return 0;
}

// ==================== 个人成长统计 ====================

function computePersonalStats(materials) {
  const trained = materials.filter(m => m.scoreHistory && m.scoreHistory.length > 0);
  if (trained.length === 0) return null;

  let best = null;        // 准确率最高的一次
  let mostImproved = null; // 进步最大（同素材多次训练）
  let hardest = null;      // 平均准确率最低
  let totalAttempts = 0;

  for (const m of trained) {
    const history = m.scoreHistory;
    totalAttempts += history.length;

    // 寻找最佳成绩
    for (const h of history) {
      if (!best || h.accuracy > best.accuracy) {
        best = { accuracy: h.accuracy, title: m.title, materialId: m.id };
      }
    }

    // 寻找进步最大（同一素材第一次 vs 最后一次，至少2次）
    if (history.length >= 2) {
      const first = history[0].accuracy;
      const last = history[history.length - 1].accuracy;
      const gain = Math.round((last - first) * 10) / 10;
      if (!mostImproved || gain > mostImproved.gain) {
        mostImproved = { gain, title: m.title, materialId: m.id };
      }
    }

    // 寻找最困难（平均准确率最低）
    const avgAcc = history.reduce((s, h) => s + h.accuracy, 0) / history.length;
    if (!hardest || avgAcc < hardest.accuracy) {
      hardest = { accuracy: Math.round(avgAcc * 10) / 10, title: m.title, materialId: m.id };
    }
  }

  return { best, mostImproved, hardest, totalAttempts };
}

// ==================== 趋势数据 ====================

function collectTrendData(materials) {
  const entries = [];
  for (const m of materials) {
    if (m.scoreHistory) {
      for (const h of m.scoreHistory) {
        entries.push({
          accuracy: h.accuracy,
          createdAt: h.createdAt,
          materialId: m.id,
          title: m.title,
        });
      }
    }
  }
  // 按时间排序，取最近 20 条
  entries.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return entries.slice(-20);
}

// ==================== 连续天数里程碑 ====================

function renderStreakMilestone(streak) {
  const milestones = [
    { at: 50, msg: '👑 连续 50 天！你是精听之王' },
    { at: 21, msg: '🔥 连续 21 天！习惯已经养成' },
    { at: 7, msg: '⭐ 连续 7 天！坚持就是胜利' },
  ];

  const reached = milestones.find(m => streak.currentStreak >= m.at);
  if (!reached) return '';

  return `
    <div class="card p-4 mb-6" style="background: var(--warning-light); border-color: var(--warning);">
      <p class="text-sm font-medium" style="color: var(--warning);">
        ${reached.msg} · 最长连续 ${streak.longestStreak} 天
      </p>
    </div>
  `;
}

// ==================== SVG 趋势图 ====================

function renderTrendChart(entries) {
  if (entries.length < 2) return '';

  const W = 600;
  const H = 180;
  const PAD_L = 40;
  const PAD_R = 20;
  const PAD_T = 15;
  const PAD_B = 30;

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const minAcc = Math.max(0, Math.floor(Math.min(...entries.map(e => e.accuracy)) / 10) * 10 - 10);
  const maxAcc = 100;
  const accRange = maxAcc - minAcc;

  // 计算 Y 轴刻度
  const yTicks = [];
  for (let a = maxAcc; a >= minAcc; a -= 10) yTicks.push(a);

  // 计算数据点坐标
  const points = entries.map((e, i) => ({
    x: PAD_L + (i / Math.max(1, entries.length - 1)) * plotW,
    y: PAD_T + ((maxAcc - e.accuracy) / accRange) * plotH,
    ...e,
  }));

  // SVG path
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return `
    <div class="trend-chart-wrap">
      <svg viewBox="0 0 ${W} ${H}" class="trend-chart-svg">
        <!-- Grid lines -->
        ${yTicks.map(a => {
          const y = PAD_T + ((maxAcc - a) / accRange) * plotH;
          return `<line x1="${PAD_L}" y1="${y.toFixed(1)}" x2="${W - PAD_R}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="1" />`;
        }).join('')}

        <!-- Y axis labels -->
        ${yTicks.map(a => {
          const y = PAD_T + ((maxAcc - a) / accRange) * plotH;
          return `<text x="${PAD_L - 5}" y="${y.toFixed(1)}" text-anchor="end" font-size="10" fill="var(--text-secondary)" dy="3">${a}%</text>`;
        }).join('')}

        <!-- X axis labels -->
        ${points.filter((_, i) => i % Math.ceil(points.length / 6) === 0 || i === points.length - 1).map(p => {
          return `<text x="${p.x.toFixed(1)}" y="${H - 5}" text-anchor="middle" font-size="9" fill="var(--text-tertiary)">#${points.indexOf(p) + 1}</text>`;
        }).join('')}

        <!-- Line -->
        <polyline points="${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}"
                  fill="none" stroke="var(--primary)" stroke-width="2" stroke-linejoin="round" />

        <!-- Data dots -->
        ${points.map(p => `
          <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="var(--surface)" stroke="var(--primary)" stroke-width="1.5"
                  class="trend-dot" data-id="${p.materialId}" title="${sanitizeHTML(p.title)}: ${p.accuracy}%">
            <title>${sanitizeHTML(p.title)}: ${p.accuracy}%</title>
          </circle>
        `).join('')}

        <!-- Fill area -->
        <polygon points="${PAD_L},${PAD_T + plotH} ${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} ${W - PAD_R},${PAD_T + plotH}"
                 fill="var(--primary)" opacity="0.08" />
      </svg>
    </div>
  `;
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

  // 趋势图数据点点击 → 跳转训练
  container.querySelectorAll('.trend-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const id = dot.dataset.id;
      if (id) {
        window.App?.switchView('training', { materialId: id });
      }
    });
  });
}
