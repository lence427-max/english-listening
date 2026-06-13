/**
 * Silentium — 分段训练模式
 * 逐段播放 → 默写 → 提交 → 查看对比 → 下一段 → 总结
 */

import { getMaterialById, upsertMaterial, getAudio } from './storage.js';
import { createPlayer } from './player.js';
import { getOrCreateParagraphs, estimateParagraphTimes, adjustParagraphTime, adjustParagraphEndTime, saveParagraphs } from './paragraph.js';
import { enhancedDiff } from './diff.js';
import { sanitizeHTML, showToast, formatTime } from './utils.js';

let player = null;
let materialId = null;
let paragraphs = [];
let currentIdx = 0;
let paraResults = [];
let showingOriginal = false;
let segPlayedOnce = false;  // 本段是否已播放过一次

export async function renderSegmentedView(container, matId) {
  materialId = matId;
  const material = getMaterialById(matId);
  if (!material) {
    container.innerHTML = '<div class="empty-state"><h3>素材未找到</h3></div>';
    return;
  }

  paragraphs = getOrCreateParagraphs(material);
  estimateParagraphTimes(paragraphs, material.audioDuration || 0);

  if (!material.paragraphs || material.paragraphs.length === 0) {
    saveParagraphs(material, paragraphs, upsertMaterial);
  }

  if (paragraphs.length < 2) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>素材内容太短</h3>
        <p>分段训练需要多个段落，请用整篇模式训练</p>
        <button class="btn btn-primary" onclick="window.App.switchView('training', { materialId: '${matId}' })">
          整篇训练
        </button>
      </div>
    `;
    return;
  }

  if (player) player.destroy();
  player = createPlayer({
    onTimeUpdate: () => updateTimeDisplay(),
  });
  player.audio.addEventListener('ended', () => { updatePlayBtn(false); segPlayedOnce = false; });
  player.audio.addEventListener('pause', () => { updatePlayBtn(false); });

  const audioData = await getAudio(matId);
  if (audioData) {
    player.load(audioData.blob);
  }

  currentIdx = 0;
  paraResults = [];
  showingOriginal = false;
  segPlayedOnce = false;

  renderParagraph(container, material);
}

function handleEndTimeReached() {
  if (!player) return;
  const para = paragraphs[currentIdx];
  if (!para || !para.endTime) return;
  if (player.getState().currentTime >= para.endTime) {
    player.pause();
    updatePlayBtn(false);
    segPlayedOnce = false;
  }
}

function updateTimeDisplay() {
  if (!player) return;
  handleEndTimeReached();

  const state = player.getState();
  const el = document.getElementById('seg-time-current');
  const fill = document.getElementById('seg-progress-fill');
  const para = paragraphs[currentIdx];

  if (el) el.textContent = formatTime(state.currentTime);

  // 更新段落内进度条
  if (fill && para && para.startTime !== undefined && para.endTime !== undefined) {
    const paraDuration = para.endTime - para.startTime;
    const relativePos = state.currentTime - para.startTime;
    const pct = paraDuration > 0 ? Math.min(100, Math.max(0, (relativePos / paraDuration) * 100)) : 0;
    fill.style.width = `${pct}%`;
  }
}

function renderParagraph(container, material, showComparison = false) {
  const para = paragraphs[currentIdx];
  const total = paragraphs.length;
  const prevResult = paraResults[currentIdx];
  segPlayedOnce = false;

  container.innerHTML = `
    <div class="segmented-view learning-workspace">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <button class="btn btn-ghost btn-sm" id="seg-back-btn">
          <i class="fa-solid fa-xmark"></i> 退出
        </button>
        <span class="text-sm font-medium">分段训练 · 段落 ${currentIdx + 1}/${total}</span>
        <span class="text-xs truncate max-w-[180px]" style="color: var(--text-secondary);">
          ${sanitizeHTML(material.title)}
        </span>
      </div>

      <!-- Paragraph progress blocks -->
      <div class="mb-4">
        <div class="seg-progress-grid">
          ${Array.from({ length: total }, (_, i) => {
            let cls = 'seg-prog-pending';
            if (paraResults[i]) cls = 'seg-prog-done';
            else if (i === currentIdx) cls = 'seg-prog-current';
            return `<div class="seg-prog-block ${cls}" data-idx="${i}" title="段落${i + 1}${paraResults[i] ? ' ✓ 已完成' : i === currentIdx ? ' 当前' : ''}">
              <span class="seg-prog-num">${i + 1}</span>
            </div>`;
          }).join('')}
        </div>
      </div>

      ${prevResult ? `
        <div class="card mb-4" style="border-color: ${prevResult.accuracy >= 80 ? 'var(--success)' : 'var(--warning)'};">
          <div class="card-body" style="padding: 0.75rem 1rem;">
            <div class="flex items-center justify-between">
              <span class="text-sm">段落${currentIdx + 1} 上次成绩</span>
              <span class="font-bold" style="color: ${prevResult.accuracy >= 80 ? 'var(--success)' : 'var(--warning)'};">${prevResult.accuracy}%</span>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Paragraph text (collapsible) -->
      <div class="card mb-4 workspace-source-card">
        <div class="card-header">
          <h3 class="font-semibold text-sm">📖 原文</h3>
          <div class="flex items-center gap-3">
            <span class="text-xs" style="color: var(--text-secondary);">
              ${para.wordCount} 词 · ${para.startTime !== undefined ? formatTime(para.startTime) + ' - ' + formatTime(para.endTime) : ''}
            </span>
            <button class="btn btn-ghost btn-sm" id="seg-toggle-original">
              <i class="fa-solid ${showingOriginal ? 'fa-eye-slash' : 'fa-eye'}"></i>
              ${showingOriginal ? '隐藏' : '查看'}
            </button>
          </div>
        </div>
        <div class="card-body" id="seg-original-body" style="${showingOriginal ? '' : 'display: none;'}">
          <div class="seg-para-text">${sanitizeHTML(para.text)}</div>
        </div>
      </div>

      <!-- Audio + Time adjustment -->
      <div class="card mb-4 workspace-player-card">
        <div class="card-body" style="padding: 0.75rem 1rem;">
          <!-- Audio progress bar -->
          <div class="seg-audio-bar">
            <button class="seg-play-btn" id="seg-play-btn">
              <i class="fa-solid fa-play"></i>
            </button>
            <div class="progress-area">
              <div class="progress-track" id="seg-progress-track">
                <div class="progress-fill" id="seg-progress-fill"></div>
              </div>
              <div class="time-display">
                <span id="seg-time-current">0:00</span>
                <span id="seg-time-para-end">${para.endTime !== undefined ? formatTime(para.endTime) : '--'}</span>
              </div>
            </div>
          </div>

          <!-- Start time adjustment -->
          <div class="time-adjust-row mb-1">
            <span class="text-xs" style="color: var(--text-tertiary); min-width: 50px;">起始:</span>
            <button class="time-adjust-btn seg-start-btn" data-delta="-3">-3s</button>
            <button class="time-adjust-btn seg-start-btn" data-delta="-1">-1s</button>
            <span class="text-xs" style="color: var(--text-secondary); font-family: var(--font-mono); min-width: 40px;">${para.startTime !== undefined ? formatTime(para.startTime) : '--'}</span>
            <button class="time-adjust-btn seg-start-btn" data-delta="1">+1s</button>
            <button class="time-adjust-btn seg-start-btn" data-delta="3">+3s</button>
          </div>

          <!-- End time adjustment -->
          <div class="time-adjust-row">
            <span class="text-xs" style="color: var(--text-tertiary); min-width: 50px;">结束:</span>
            <button class="time-adjust-btn seg-end-btn" data-delta="-3">-3s</button>
            <button class="time-adjust-btn seg-end-btn" data-delta="-1">-1s</button>
            <span class="text-xs" style="color: var(--text-secondary); font-family: var(--font-mono); min-width: 40px;">${para.endTime !== undefined ? formatTime(para.endTime) : '--'}</span>
            <button class="time-adjust-btn seg-end-btn" data-delta="1">+1s</button>
            <button class="time-adjust-btn seg-end-btn" data-delta="3">+3s</button>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="card mb-4 workspace-input-card">
        <div class="card-header">
          <h3 class="font-semibold text-sm">✏️ 输入你听到的内容</h3>
        </div>
        <div class="card-body">
          <textarea class="form-textarea" id="seg-input" rows="6"
                    placeholder="播放音频，输入你听到的内容..."
                    style="font-family: var(--font-mono); font-size: 0.9375rem; line-height: 1.8;"></textarea>
          <div class="flex items-center justify-between mt-3">
            <div class="flex items-center gap-2">
              ${currentIdx > 0 ? `<button class="btn btn-secondary btn-sm" id="seg-prev-btn"><i class="fa-solid fa-chevron-left"></i> 上一段</button>` : ''}
            </div>
            <button class="btn btn-primary" id="seg-submit-btn">
              提交并查看对比 <i class="fa-solid fa-magnifying-glass"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Comparison result (after submit) -->
      ${showComparison && prevResult ? renderComparisonBlock(prevResult, currentIdx) : ''}

      ${showComparison ? `
        <div class="flex items-center justify-between">
          <button class="btn btn-secondary btn-sm" id="seg-retry-para-btn">
            <i class="fa-solid fa-rotate-right"></i> 重写本段
          </button>
          <button class="btn btn-primary" id="seg-next-btn">
            ${currentIdx < total - 1 ? '下一段 <i class="fa-solid fa-chevron-right"></i>' : '查看总结 <i class="fa-solid fa-check"></i>'}
          </button>
        </div>
      ` : ''}
    </div>
  `;

  bindEvents(container, material, showComparison);
  updatePlayBtn(false);
}

function renderComparisonBlock(result, paraIdx) {
  if (!result || !result.pairs) return '';
  return `
    <div class="card mb-4" style="border-color: var(--primary);">
      <div class="card-header">
        <h3 class="font-semibold text-sm">🔍 对比结果 — 段落${paraIdx + 1}</h3>
        <span class="text-xs" style="color: var(--text-secondary);">
          正确 ${result.stats.correct} · 漏词 ${result.stats.missing} · 多词 ${result.stats.extra} · 替换 ${result.stats.replacement}
        </span>
      </div>
      <div class="card-body">
        <div class="feedback-comparison">
          ${result.pairs.map(p => {
            const word = sanitizeHTML(p.word);
            if (p.match) return `<span class="fb-word fb-correct">${word}</span>`;
            const cls = `fb-word fb-${p.errorType}`;
            let html = `<span class="${cls}">${word}`;
            if (p.errorType === 'replacement') {
              html += ` <span class="fb-arrow">→</span> <span class="fb-user-word">${sanitizeHTML(p.userWord || '')}</span>`;
            } else if (p.errorType === 'missing') {
              html += ` <span class="fb-tag">漏词</span>`;
            }
            html += `</span>`;
            return html;
          }).join(' ')}
        </div>
      </div>
    </div>
  `;
}

function bindEvents(container, material, showComparison) {
  // 退出
  container.querySelector('#seg-back-btn').addEventListener('click', () => {
    if (paraResults.length > 0 && !confirm('确定退出分段训练？已完成的段落成绩将会保存。')) return;
    cleanup();
    window.App.switchView('training');
  });

  // 显示/隐藏原文
  container.querySelector('#seg-toggle-original').addEventListener('click', () => {
    showingOriginal = !showingOriginal;
    const body = container.querySelector('#seg-original-body');
    const btn = container.querySelector('#seg-toggle-original');
    if (body) body.style.display = showingOriginal ? '' : 'none';
    if (btn) btn.innerHTML = `<i class="fa-solid ${showingOriginal ? 'fa-eye-slash' : 'fa-eye'}"></i> ${showingOriginal ? '隐藏' : '查看'}`;
  });

  // 起始时间微调
  container.querySelectorAll('.seg-start-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = parseInt(btn.dataset.delta, 10);
      adjustParagraphTime(paragraphs, currentIdx, delta);
      saveParagraphs(material, paragraphs, upsertMaterial);
      renderParagraph(container, material);
    });
  });

  // 结束时间微调
  container.querySelectorAll('.seg-end-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = parseInt(btn.dataset.delta, 10);
      adjustParagraphEndTime(paragraphs, currentIdx, delta);
      saveParagraphs(material, paragraphs, upsertMaterial);
      renderParagraph(container, material);
    });
  });

  // 进度条点击
  const progressTrack = container.querySelector('#seg-progress-track');
  if (progressTrack) {
    progressTrack.addEventListener('click', (e) => {
      if (!player) return;
      const para = paragraphs[currentIdx];
      if (!para || para.startTime === undefined || para.endTime === undefined) return;
      const rect = progressTrack.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const targetTime = para.startTime + pct * (para.endTime - para.startTime);
      player.seek(targetTime);
      segPlayedOnce = true;
    });
  }

  // 段落方块点击跳转
  container.querySelectorAll('.seg-prog-block').forEach(block => {
    block.addEventListener('click', () => {
      const targetIdx = parseInt(block.dataset.idx, 10);
      if (targetIdx === currentIdx) return;
      currentIdx = targetIdx;
      renderParagraph(container, material, !!paraResults[targetIdx]);
    });
  });

  // 播放段落（修复：只在第一次播放时 seek）
  container.querySelector('#seg-play-btn').addEventListener('click', () => {
    if (!player) return;
    const para = paragraphs[currentIdx];
    const state = player.getState();

    if (state.isPlaying) {
      player.pause();
      updatePlayBtn(false);
      return;
    }

    // 只在第一次播放时 seek 到段落起始
    if (!segPlayedOnce && para.startTime !== undefined) {
      player.seek(para.startTime);
    }
    segPlayedOnce = true;
    player.play().then(() => updatePlayBtn(true)).catch(() => showToast('播放失败', 'error'));
  });

  if (!showComparison) {
    // 提交
    container.querySelector('#seg-submit-btn').addEventListener('click', () => {
      const input = container.querySelector('#seg-input')?.value || '';
      if (!input.trim()) { showToast('请先输入内容', 'warning'); return; }

      const para = paragraphs[currentIdx];
      const diff = enhancedDiff(para.text, input.trim());

      paraResults[currentIdx] = {
        paragraphId: para.id || currentIdx,
        pairs: diff.pairs,
        stats: diff.stats,
        accuracy: diff.accuracy,
        text: para.text,
      };

      material.paragraphResults = material.paragraphResults || {};
      material.paragraphResults[currentIdx] = {
        pairs: diff.pairs,
        stats: diff.stats,
        accuracy: diff.accuracy,
        grade: diff.grade,
        createdAt: new Date().toISOString(),
      };
      upsertMaterial(material);

      // 显示对比结果（不自动跳转）
      renderParagraph(container, material, true);
    });
  } else {
    // 重写本段
    container.querySelector('#seg-retry-para-btn').addEventListener('click', () => {
      renderParagraph(container, material, false);
    });

    // 下一段
    container.querySelector('#seg-next-btn').addEventListener('click', () => {
      if (currentIdx < paragraphs.length - 1) {
        currentIdx++;
        renderParagraph(container, material, false);
      } else {
        renderSummary(container, material);
      }
    });
  }

  // 上一段
  container.querySelector('#seg-prev-btn')?.addEventListener('click', () => {
    if (currentIdx > 0) {
      currentIdx--;
      renderParagraph(container, material, false);
    }
  });

  // 键盘快捷键
  const keyHandler = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      if (showComparison) {
        container.querySelector('#seg-next-btn')?.click();
      } else {
        container.querySelector('#seg-submit-btn')?.click();
      }
    }
  };
  document.addEventListener('keydown', keyHandler);
  container._keyHandler = keyHandler;
}

function renderSummary(container, material) {
  const total = paraResults.length;
  const avgAccuracy = paraResults.reduce((s, r) => s + r.accuracy, 0) / total;
  const roundedAcc = Math.round(avgAccuracy * 10) / 10;
  const grade = avgAccuracy >= 90 ? 'A' : avgAccuracy >= 80 ? 'B' : avgAccuracy >= 70 ? 'C' : avgAccuracy >= 60 ? 'D' : 'E';

  let weakestIdx = 0;
  for (let i = 1; i < paraResults.length; i++) {
    if (paraResults[i].accuracy < paraResults[weakestIdx].accuracy) weakestIdx = i;
  }

  container.innerHTML = `
    <div class="segmented-view">
      <div class="flex items-center justify-between mb-6">
        <button class="btn btn-ghost btn-sm" id="seg-done-btn">
          <i class="fa-solid fa-arrow-left"></i> 返回
        </button>
        <span class="text-sm truncate max-w-[300px]" style="color: var(--text-secondary);">
          ${sanitizeHTML(material.title)}
        </span>
        <span></span>
      </div>

      <div class="card mb-6 text-center">
        <div class="card-body">
          <div class="feedback-score">${roundedAcc}%</div>
          <div class="text-sm mt-1" style="color: var(--text-secondary);">分段训练总准确率</div>
          <span class="feedback-grade feedback-grade-${grade}">${grade}</span>
          <div class="text-xs mt-2" style="color: var(--text-secondary);">共 ${total} 段</div>
        </div>
      </div>

      <div class="card mb-6">
        <div class="card-header">
          <h3 class="font-semibold text-sm">📊 各段成绩</h3>
        </div>
        <div class="card-body">
          <div class="heatmap-list">
            ${paraResults.map((r, i) => {
              const heatColor = r.accuracy >= 90 ? 'var(--success)' : r.accuracy >= 75 ? '#84cc16' : r.accuracy >= 60 ? 'var(--warning)' : 'var(--danger)';
              const isWeakest = i === weakestIdx && r.accuracy < 100;
              return `
                <div class="heatmap-row ${isWeakest ? 'heatmap-weakest' : ''}">
                  <div class="heatmap-label">
                    <span class="text-sm font-medium">段落${i + 1}</span>
                    <span class="text-xs" style="color: var(--text-secondary);">${r.stats.correct}/${r.stats.total} 词</span>
                  </div>
                  <div class="heatmap-bar-wrap">
                    <div class="heatmap-bar" style="width: ${r.accuracy}%; background: ${heatColor};"></div>
                  </div>
                  <div class="heatmap-score" style="color: ${heatColor};">${r.accuracy}%</div>
                  <button class="btn btn-ghost btn-sm heatmap-retrain-btn seg-retry-btn" data-para="${i}">
                    <i class="fa-solid fa-rotate-right"></i> 重练
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <button class="btn btn-secondary" id="seg-materials-btn">
          <i class="fa-solid fa-folder-open"></i> 素材列表
        </button>
        <button class="btn btn-primary" id="seg-restart-btn">
          <i class="fa-solid fa-rotate-right"></i> 重新分段训练
        </button>
      </div>
    </div>
  `;

  container.querySelector('#seg-done-btn').addEventListener('click', () => { cleanup(); window.App.switchView('training'); });
  container.querySelector('#seg-materials-btn').addEventListener('click', () => { cleanup(); window.App.switchView('materials'); });
  container.querySelector('#seg-restart-btn').addEventListener('click', () => { currentIdx = 0; paraResults = []; renderParagraph(container, material); });

  container.querySelectorAll('.seg-retry-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentIdx = parseInt(btn.dataset.para, 10);
      renderParagraph(container, material, false);
    });
  });
}

function updatePlayBtn(isPlaying) {
  const btn = document.getElementById('seg-play-btn');
  if (!btn) return;
  btn.innerHTML = isPlaying
    ? '<i class="fa-solid fa-pause"></i>'
    : '<i class="fa-solid fa-play"></i>';
}

function cleanup() {
  if (player) { player.pause(); }
  const container = document.getElementById('view-segmented');
  if (container && container._keyHandler) {
    document.removeEventListener('keydown', container._keyHandler);
  }
}

export function destroySegmented() {
  if (player) { player.destroy(); player = null; }
  materialId = null;
  paragraphs = [];
  currentIdx = 0;
  paraResults = [];
  showingOriginal = false;
  segPlayedOnce = false;
}
