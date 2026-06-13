/**
 * Silentium — 智能复习模块
 */

import { getMaterials, getTrainingRecords, saveTrainingRecord } from './storage.js';
import { showToast, sanitizeHTML, formatDateCN } from './utils.js';
import { collectReviewCandidates } from './review-candidates.js';

/**
 * 开始抽检复习模式
 */
export async function startReview() {
  const materials = getMaterials();
  const records = getTrainingRecords();

  // 找到需要复习的素材
  const needReviewRecords = records.filter(r =>
    r.reviewStatus === 'need_review' &&
    materials.some(m => m.id === r.materialId)
  );

  if (needReviewRecords.length === 0) {
    showToast('目前没有需要复习的素材', 'info');
    return;
  }

  const allSentences = collectReviewCandidates(materials, needReviewRecords);

  if (allSentences.length === 0) {
    showToast('没有可复习的句子', 'info');
    return;
  }

  // 随机抽取 5-10 句
  const count = Math.min(10, Math.max(5, allSentences.length));
  const selected = shuffleArray([...allSentences]).slice(0, count);

  showReviewModal(selected);
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showReviewModal(selectedSentences) {
  let currentIdx = 0;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width: 640px; max-height: 90vh;">
      <div class="modal-header">
        <h3><i class="fa-solid fa-rotate"></i> 抽检复习</h3>
        <button class="btn btn-ghost btn-icon" id="review-close-btn">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body" id="review-body">
        ${renderReviewSentence(selectedSentences[currentIdx], currentIdx, selectedSentences.length)}
      </div>
      <div class="modal-footer" id="review-footer">
        <span class="text-sm" style="color: var(--text-secondary);">
          ${currentIdx + 1} / ${selectedSentences.length}
        </span>
        <div class="flex gap-2">
          <button class="btn btn-ghost btn-sm" id="review-show-answer-btn">
            <i class="fa-solid fa-eye"></i> 显示原文
          </button>
          <button class="btn btn-primary btn-sm" id="review-next-btn">
            下一句 <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#review-close-btn').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#review-show-answer-btn').addEventListener('click', () => {
    const body = overlay.querySelector('#review-body');
    const item = selectedSentences[currentIdx];
    body.innerHTML = `
      ${renderReviewSentence(item, currentIdx, selectedSentences.length)}
      <div class="mt-3 p-3 rounded-lg" style="background: var(--bg); border: 1px solid var(--border);">
        <div class="text-xs mb-1" style="color: var(--text-secondary);">📝 原文</div>
        <div class="text-sm" style="font-family: var(--font-mono);">${sanitizeHTML(item.text)}</div>
      </div>
    `;
  });

  overlay.querySelector('#review-next-btn').addEventListener('click', () => {
    currentIdx++;
    if (currentIdx >= selectedSentences.length) {
      showToast('🎉 复习完成！', 'success');
      close();
      return;
    }
    const body = overlay.querySelector('#review-body');
    body.innerHTML = renderReviewSentence(selectedSentences[currentIdx], currentIdx, selectedSentences.length);
    overlay.querySelector('#review-footer span').textContent =
      `${currentIdx + 1} / ${selectedSentences.length}`;
  });
}

function renderReviewSentence(item, idx, total) {
  return `
    <div class="mb-4">
      <div class="flex items-center justify-between mb-3">
        <span class="badge badge-info">
          <i class="fa-solid fa-book"></i> ${sanitizeHTML(item.materialTitle.substring(0, 20))}
        </span>
        <span class="text-sm" style="color: var(--text-secondary);">
          句子 ${idx + 1}/${total}
        </span>
      </div>
      <p class="text-sm mb-3" style="color: var(--text-secondary);">
        🎧 请听音频，默写这句话
      </p>
      <textarea class="form-textarea" id="review-input" rows="3"
                placeholder="输入你听到的内容..."
                style="font-family: var(--font-mono);"></textarea>
      ${item.result ? `
        <div class="mt-2 text-xs" style="color: var(--text-secondary);">
          上次错误：${item.errorCount} 处
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * 获取待复习篇数
 */
export function getReviewCount() {
  const records = getTrainingRecords();
  return records.filter(r => r.reviewStatus === 'need_review').length;
}

/**
 * 标记复习状态
 */
export function updateReviewStatus(materialId, status) {
  const records = getTrainingRecords();
  const record = records.find(r => r.materialId === materialId);
  if (!record) return;

  record.reviewStatus = status;
  if (status === 'mastered') {
    // mastered: 7 天后复习
    record.nextReviewDate = daysFromNow(7);
  } else if (status === 'need_review') {
    record.nextReviewDate = daysFromNow(1);
  } else {
    record.nextReviewDate = daysFromNow(3);
  }
  saveTrainingRecord(record);
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
