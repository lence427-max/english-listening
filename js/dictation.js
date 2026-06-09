/**
 * 十篇精听工坊 — 极简听写（整篇模式）
 */

import { getMaterialById, upsertMaterial, getAudio } from './storage.js';
import { createPlayer } from './player.js';
import { formatTimeMs, showToast, sanitizeHTML } from './utils.js';

let materialId = null;
let player = null;
let showingOriginal = false;

export async function renderDictationView(container, matId) {
  materialId = matId;
  const material = getMaterialById(matId);
  if (!material) {
    container.innerHTML = '<div class="empty-state"><h3>素材未找到</h3></div>';
    return;
  }

  // 初始化播放器
  if (player) player.destroy();
  player = createPlayer({
    onTimeUpdate: () => updateTimeDisplay(),
    onLoaded: (s) => { updateDuration(s.duration); },
  });

  const audioData = await getAudio(matId);
  if (audioData) {
    player.load(audioData.blob);
  }

  // 加载已有的听写内容
  const savedInput = material.dictationInput || '';
  const savedResult = material.dictationResult || null;

  showingOriginal = false;

  renderUI(container, material, savedInput, savedResult);
}

function renderUI(container, material, savedInput, savedResult) {
  const hasResult = !!savedResult;
  const totalErr = savedResult ? savedResult.filter(w => !w.match).length : 0;

  container.innerHTML = `
    <div class="dictation-view">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <button class="btn btn-ghost btn-sm" id="dict-back-btn">
          <i class="fa-solid fa-arrow-left"></i> 返回
        </button>
        <span class="text-sm truncate max-w-[300px]" style="color: var(--text-secondary);">
          ${sanitizeHTML(material.title)}
        </span>
        ${hasResult ? `
          <span class="badge ${totalErr === 0 ? 'badge-success' : 'badge-danger'}">
            ${totalErr === 0 ? '✓ 完全正确' : totalErr + ' 处不一致'}
          </span>
        ` : ''}
      </div>

      <!-- Audio Player Bar -->
      <div class="card mb-4">
        <div class="card-body" style="padding: 0.75rem 1rem;">
          <div class="audio-player">
            <button class="play-btn" id="dict-play-btn">
              <i class="fa-solid fa-play"></i>
            </button>
            <div class="progress-area">
              <div class="progress-track" id="dict-progress-track">
                <div class="progress-fill" id="dict-progress-fill"></div>
              </div>
              <div class="time-display">
                <span id="dict-time-current">0:00</span>
                <span id="dict-time-total">${formatTimeMs(material.audioDuration || 0)}</span>
              </div>
            </div>
            <select class="speed-select" id="dict-speed">
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1" selected>1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Original Text Toggle -->
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-semibold text-sm">✏️ 听写输入</h2>
        <button class="btn btn-ghost btn-sm" id="dict-show-original-btn">
          <i class="fa-solid ${showingOriginal ? 'fa-eye-slash' : 'fa-eye'}"></i>
          ${showingOriginal ? '隐藏原文' : '查看原文'}
        </button>
      </div>

      <!-- Original Text (toggle) -->
      <div id="original-text-area" class="${showingOriginal ? '' : 'hidden'} mb-3 p-4 rounded-lg"
           style="background: var(--bg); border: 1px solid var(--border); line-height: 1.8;">
        <div class="text-xs mb-2" style="color: var(--text-secondary);">📝 原文</div>
        <div class="leading-relaxed" style="font-size: 0.9375rem;">${sanitizeHTML(material.originalText)}</div>
      </div>

      <!-- Input Area -->
      <div class="card mb-4">
        <div class="card-body">
          <textarea class="form-textarea" id="dict-input" rows="14"
                    placeholder="播放音频，在这里输入你听到的内容..."
                    style="font-family: var(--font-mono); font-size: 0.9375rem; line-height: 1.8;"
                    ${hasResult ? 'readonly' : ''}>${savedInput}</textarea>
          <div class="flex items-center justify-between mt-3">
            <span class="text-xs" style="color: var(--text-secondary);" id="dict-char-count">${savedInput.length} 字符</span>
            <div class="flex items-center gap-2">
              ${hasResult ? `
                <button class="btn btn-secondary btn-sm" id="dict-retry-btn">
                  <i class="fa-solid fa-rotate-right"></i> 重试
                </button>
              ` : ''}
              <button class="btn btn-primary" id="dict-submit-btn" ${hasResult ? 'disabled' : ''}>
                <i class="fa-solid fa-check"></i> 提交对比
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Comparison Result -->
      <div id="comparison-area" class="${hasResult ? '' : 'hidden'}">
        <div class="card">
          <div class="card-header">
            <h3 class="font-semibold">
              <i class="fa-solid fa-code-compare"></i> 对比结果
              ${totalErr > 0 ? `<span class="badge badge-danger ml-2">${totalErr} 处不一致</span>` : '<span class="badge badge-success ml-2">全部正确</span>'}
            </h3>
          </div>
          <div class="card-body">
            <div id="comparison-display" class="leading-relaxed" style="font-family: var(--font-mono); font-size: 0.9375rem; line-height: 2;">
              ${hasResult ? renderComparison(savedResult, material.originalText) : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  bindEvents(container, material);
}

// ==================== 事件 ====================

function bindEvents(container, material) {
  const playBtn = container.querySelector('#dict-play-btn');
  const progressTrack = container.querySelector('#dict-progress-track');
  const speedSelect = container.querySelector('#dict-speed');

  // 返回
  container.querySelector('#dict-back-btn').addEventListener('click', () => {
    if (player) player.destroy();
    player = null;
    window.App.switchView('training');
  });

  // 播放/暂停
  playBtn.addEventListener('click', () => {
    if (!player) return;
    const state = player.getState();
    if (state.isPlaying) {
      player.pause();
      playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    } else {
      player.play().then(() => {
        playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      }).catch(() => {
        showToast('播放失败，请检查音频文件', 'error');
      });
    }
  });

  // 播放结束
  player.audio.addEventListener('ended', () => {
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  });
  player.audio.addEventListener('pause', () => {
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  });

  // 进度条点击
  progressTrack.addEventListener('click', (e) => {
    if (!player) return;
    const rect = progressTrack.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    player.seek(pct * (player.getState().duration || 0));
  });

  // 倍速
  speedSelect.addEventListener('change', () => {
    player?.setRate(parseFloat(speedSelect.value));
  });

  // 查看/隐藏原文
  container.querySelector('#dict-show-original-btn').addEventListener('click', () => {
    showingOriginal = !showingOriginal;
    const area = container.querySelector('#original-text-area');
    const btn = container.querySelector('#dict-show-original-btn');
    area.classList.toggle('hidden', !showingOriginal);
    btn.innerHTML = `<i class="fa-solid ${showingOriginal ? 'fa-eye-slash' : 'fa-eye'}"></i> ${showingOriginal ? '隐藏原文' : '查看原文'}`;
  });

  // 提交对比
  container.querySelector('#dict-submit-btn')?.addEventListener('click', () => {
    const input = container.querySelector('#dict-input')?.value || '';
    if (!input.trim()) { showToast('请先输入内容', 'warning'); return; }

    const result = simpleDiff(material.originalText, input.trim());
    material.dictationInput = input.trim();
    material.dictationResult = result;
    material.status = 'completed';
    upsertMaterial(material);

    const errCount = result.filter(r => !r.match).length;
    showToast(errCount === 0 ? '🎉 完全正确！' : `${errCount} 处不一致`, errCount === 0 ? 'success' : 'info');
    renderUI(container, material, input.trim(), result);
  });

  // 重试
  container.querySelector('#dict-retry-btn')?.addEventListener('click', () => {
    material.dictationInput = '';
    material.dictationResult = null;
    material.status = 'dictating';
    upsertMaterial(material);
    showingOriginal = false;
    renderUI(container, material, '', null);
  });

  // 实时保存
  const inputEl = container.querySelector('#dict-input');
  if (inputEl && !inputEl.readOnly) {
    let timer;
    inputEl.addEventListener('input', () => {
      const val = inputEl.value;
      container.querySelector('#dict-char-count').textContent = `${val.length} 字符`;
      clearTimeout(timer);
      timer = setTimeout(() => {
        material.dictationInput = val;
        upsertMaterial(material);
      }, 800);
    });
  }
}

// ==================== 简单逐词对比 ====================

/**
 * 简单 diff：将原文和用户输入逐词对齐，不一致的标红
 * 返回 [{ word, match: boolean }]
 */
function simpleDiff(original, userInput) {
  const origWords = (original || '').split(/\s+/).filter(w => w.length > 0);
  const userWords = (userInput || '').split(/\s+/).filter(w => w.length > 0);

  // 以原文为基准，逐个对比
  const result = [];
  const maxLen = Math.max(origWords.length, userWords.length);

  for (let i = 0; i < maxLen; i++) {
    const orig = origWords[i];
    const user = userWords[i];

    if (orig && user) {
      const match = normalizeWord(orig) === normalizeWord(user);
      result.push({ word: orig, userWord: user, match });
    } else if (orig && !user) {
      result.push({ word: orig, userWord: null, match: false });
    } else if (!orig && user) {
      result.push({ word: user, userWord: user, match: false, extra: true });
    }
  }

  return result;
}

function normalizeWord(w) {
  return w.toLowerCase().replace(/[^a-z0-9']/g, '');
}

/**
 * 渲染对比结果：不一致标红，不区分类型
 */
function renderComparison(result, originalText) {
  if (!result || result.length === 0) return sanitizeHTML(originalText);

  return result.map(r => {
    const word = sanitizeHTML(r.word);
    if (r.match) {
      return `<span style="color: var(--success);">${word}</span>`;
    } else if (r.extra) {
      return `<span style="color: var(--danger);">${word}</span>`;
    } else if (!r.userWord) {
      return `<span style="color: var(--danger); background: rgba(239,68,68,0.1); padding: 1px 3px; border-radius: 3px;">${word}</span>`;
    } else {
      return `<span style="color: var(--danger); background: rgba(239,68,68,0.1); padding: 1px 3px; border-radius: 3px;" title="你写的是: ${sanitizeHTML(r.userWord)}">${word}</span>`;
    }
  }).join(' ');
}

// ==================== 进度条更新 ====================

function updateTimeDisplay() {
  if (!player) return;
  const state = player.getState();
  const fill = document.querySelector('#dict-progress-fill');
  const time = document.querySelector('#dict-time-current');

  if (fill && state.duration > 0) {
    fill.style.width = `${(state.currentTime / state.duration) * 100}%`;
  }
  if (time) {
    time.textContent = formatTimeMs(state.currentTime);
  }
}

function updateDuration(duration) {
  const el = document.querySelector('#dict-time-total');
  if (el) el.textContent = formatTimeMs(duration);
}

// ==================== 清理 ====================

export function destroyDictation() {
  if (player) { player.destroy(); player = null; }
  materialId = null;
  showingOriginal = false;
}
