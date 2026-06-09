/**
 * 十篇精听工坊 — 分句与时间戳编辑模块
 */

import { getMaterialById, upsertMaterial, getAudio } from './storage.js';
import { createSentence } from './data-structure.js';
import { createPlayer } from './player.js';
import { formatTimeMs, parseTime, showToast, generateId } from './utils.js';

let materialId = null;
let sentences = [];
let player = null;
let currentPlayingIdx = -1;

/**
 * 渲染分句编辑界面
 */
export async function renderSegmentationView(container, matId) {
  materialId = matId;
  const material = getMaterialById(matId);
  if (!material) {
    container.innerHTML = '<div class="empty-state"><h3>素材未找到</h3></div>';
    return;
  }

  sentences = material.sentences && material.sentences.length > 0
    ? [...material.sentences]
    : autoSegmentSentences(material.originalText);

  // 初始化播放器
  if (player) player.destroy();
  player = createPlayer({
    onTimeUpdate: (state) => updatePlayHighlight(state),
    onEnded: () => { currentPlayingIdx = -1; updatePlayHighlight(null); },
  });

  // 加载音频
  const audioData = await getAudio(matId);
  if (audioData) {
    player.load(audioData.blob);
  }

  // 如果时间戳全为0，不自动均分，提示用户使用智能检测
  const needsTimestamps = sentences.length > 0 && sentences.every(s => s.startTime === 0 && s.endTime === 0);

  renderUI(container, material, needsTimestamps);
}

function autoSegmentSentences(text) {
  if (!text) return [];
  const lines = text.split(/\n+/).filter(l => l.trim());
  const result = [];
  let index = 0;
  for (const line of lines) {
    const parts = line.split(/(?<=[.!?])\s+/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed) {
        result.push(createSentence({ index, text: trimmed }));
        index++;
      }
    }
  }
  return result;
}

function renderUI(container, material, needsTimestamps = false) {
  container.innerHTML = `
    <div class="segmentation-view">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div>
          <button class="btn btn-ghost btn-sm" id="seg-back-btn">
            <i class="fa-solid fa-arrow-left"></i> 返回
          </button>
          <h1 class="text-xl font-bold mt-2">${material.title} — 分句编辑</h1>
          <p class="text-sm" style="color: var(--text-secondary);">
            调整句子分割和时间戳，确保每句对应音频的正确段落
          </p>
        </div>
        <button class="btn btn-primary" id="seg-confirm-btn">
          <i class="fa-solid fa-check"></i> 确认并开始听写
        </button>
      </div>

      ${needsTimestamps ? `
        <div class="card mb-4" style="background: var(--primary-light); border-color: var(--primary);">
          <div class="card-body" style="padding: 1rem;">
            <div class="flex items-center gap-3">
              <i class="fa-solid fa-lightbulb text-xl" style="color: var(--primary);"></i>
              <div>
                <p class="text-sm font-medium">时间戳尚未设置</p>
                <p class="text-xs mt-0.5" style="color: var(--text-secondary);">
                  点击下方「智能检测时间戳」自动分析音频静音位置精准匹配，或手动调整每句起止时间
                </p>
              </div>
              <button class="btn btn-primary btn-sm flex-shrink-0" id="seg-detect-banner-btn">
                <i class="fa-solid fa-microchip"></i> 智能检测
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Audio Player -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="audio-player" id="seg-player">
            <button class="play-btn" id="seg-play-btn">
              <i class="fa-solid fa-play"></i>
            </button>
            <div class="progress-area">
              <div class="progress-track" id="seg-progress-track">
                <div class="progress-fill" id="seg-progress-fill"></div>
              </div>
              <div class="time-display">
                <span id="seg-time-current">0:00</span>
                <span id="seg-time-total">${formatTimeMs(material.audioDuration)}</span>
              </div>
            </div>
            <select class="speed-select" id="seg-speed">
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1" selected>1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Sentence List -->
      <div class="card">
        <div class="card-header">
          <h2 class="font-semibold">句子列表 (${sentences.length} 句)</h2>
          <div class="flex items-center gap-2">
            <button class="btn btn-ghost btn-sm" id="seg-auto-time-btn">
              <i class="fa-solid fa-divide"></i> 均分时间
            </button>
            <button class="btn btn-primary btn-sm" id="seg-detect-btn">
              <i class="fa-solid fa-microchip"></i> 智能检测时间戳
            </button>
          </div>
        </div>
        <div class="divide-y" style="border-color: var(--border);" id="seg-sentence-list">
          ${sentences.map((s, i) => renderSentenceRow(s, i)).join('')}
        </div>
      </div>
    </div>
  `;

  bindEvents(container, material);
}

function renderSentenceRow(s, i) {
  const isActive = i === currentPlayingIdx;
  return `
    <div class="p-3 sentence-row ${isActive ? 'sentence-active' : ''}" data-index="${i}" id="sentence-row-${i}"
         style="${isActive ? 'background: var(--primary-light);' : ''}">
      <div class="flex items-start gap-3">
        <!-- Index -->
        <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
             style="background: var(--primary); color: white;">${i + 1}</div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <!-- Text (editable) -->
          <textarea class="form-textarea sentence-textarea" data-index="${i}" rows="2"
                    style="min-height: auto; font-size: 0.875rem;">${s.text}</textarea>

          <!-- Time controls -->
          <div class="flex items-center gap-3 mt-2 flex-wrap">
            <div class="flex items-center gap-1">
              <label class="text-xs" style="color: var(--text-secondary);">起:</label>
              <input type="text" class="form-input time-input" data-index="${i}" data-field="startTime"
                     value="${formatTimeMs(s.startTime)}" style="width: 80px; padding: 0.25rem 0.5rem; font-size: 0.75rem; font-family: var(--font-mono);">
            </div>
            <div class="flex items-center gap-1">
              <label class="text-xs" style="color: var(--text-secondary);">止:</label>
              <input type="text" class="form-input time-input" data-index="${i}" data-field="endTime"
                     value="${formatTimeMs(s.endTime)}" style="width: 80px; padding: 0.25rem 0.5rem; font-size: 0.75rem; font-family: var(--font-mono);">
            </div>
            <button class="btn btn-ghost btn-sm play-sentence-btn" data-index="${i}"
                    style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
              <i class="fa-solid ${isActive ? 'fa-stop' : 'fa-play'}"></i> ${isActive ? '停止' : '播放此句'}
            </button>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex-shrink-0 flex flex-col gap-1">
          <button class="btn btn-ghost btn-sm merge-up-btn" data-index="${i}" title="与上一句合并"
                  ${i === 0 ? 'disabled' : ''}>
            <i class="fa-solid fa-arrow-up"></i>
          </button>
          <button class="btn btn-ghost btn-sm split-btn" data-index="${i}" title="拆分此句">
            <i class="fa-solid fa-scissors"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

function bindEvents(container, material) {
  // 返回按钮
  container.querySelector('#seg-back-btn').addEventListener('click', () => {
    if (player) player.destroy();
    window.App.switchView('training');
  });

  // 播放器控制
  setupPlayerControls(container);

  // 句子文本修改
  container.querySelectorAll('.sentence-textarea').forEach(ta => {
    ta.addEventListener('change', () => {
      const idx = parseInt(ta.dataset.index);
      sentences[idx].text = ta.value.trim();
    });
  });

  // 时间输入
  container.querySelectorAll('.time-input').forEach(input => {
    input.addEventListener('change', () => {
      const idx = parseInt(input.dataset.index);
      const field = input.dataset.field;
      const val = parseTime(input.value);
      if (!isNaN(val) && val >= 0) {
        sentences[idx][field] = val;
      } else {
        input.value = formatTimeMs(sentences[idx][field]);
      }
    });
  });

  // 播放单句
  container.querySelectorAll('.play-sentence-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      playSentence(idx);
    });
  });

  // 合并到上一句
  container.querySelectorAll('.merge-up-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      if (idx <= 0) return;
      mergeWithPrevious(idx);
      renderUI(container, material);
    });
  });

  // 拆分句子
  container.querySelectorAll('.split-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      splitSentenceAtCursor(idx, container);
    });
  });

  // 自动均分时间
  container.querySelector('#seg-auto-time-btn').addEventListener('click', () => {
    const totalDuration = material.audioDuration || 60;
    const avgDuration = totalDuration / sentences.length;
    sentences.forEach((s, i) => {
      s.startTime = Math.round(i * avgDuration * 100) / 100;
      s.endTime = Math.round(Math.min((i + 1) * avgDuration, totalDuration) * 100) / 100;
    });
    showToast('时间戳已均分', 'info');
    renderUI(container, material);
  });

  // 智能检测时间戳（基于音频静音分析）
  async function runSilenceDetection(triggerBtnId) {
    const btn = container.querySelector(triggerBtnId);
    const origHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 分析音频中...';

    try {
      const audioData = await getAudio(materialId);
      if (!audioData) {
        showToast('未找到音频文件', 'error');
        return;
      }

      const { detectSpeechSegments, matchSegmentsToSentences } = await import('./silence-detector.js');

      const segments = await detectSpeechSegments(audioData.blob, {
        silenceThreshold: 0.06,
        minSilenceDuration: 0.3,
        minSegmentDuration: 0.4,
      });

      if (segments.length === 0) {
        showToast('未检测到有效语音段落，使用均分方案', 'warning');
        return;
      }

      const matchedSentences = matchSegmentsToSentences(segments, sentences);
      sentences = matchedSentences;
      sentences.forEach((s, i) => { s.index = i; });

      showToast(
        `检测到 ${segments.length} 个语音段落，已匹配 ${sentences.length} 个句子`,
        'success'
      );
    } catch (err) {
      console.error('静音检测失败:', err);
      showToast('音频分析失败: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = origHTML;
      renderUI(container, material);
    }
  }

  container.querySelector('#seg-detect-btn')?.addEventListener('click', () => runSilenceDetection('#seg-detect-btn'));
  container.querySelector('#seg-detect-banner-btn')?.addEventListener('click', () => runSilenceDetection('#seg-detect-banner-btn'));

  // 确认并开始听写
  container.querySelector('#seg-confirm-btn').addEventListener('click', () => {
    // 重新编号
    sentences.forEach((s, i) => { s.index = i; });
    material.sentences = sentences;
    material.status = material.status === 'pending' ? 'segmenting' : material.status;
    upsertMaterial(material);
    showToast('分句已保存，开始听写训练', 'success');

    // 切换到听写视图（保持在 training 视图中，但显示 dictation 子视图）
    import('./dictation.js').then(m => {
      m.renderDictationView(container, materialId);
    });
  });
}

function setupPlayerControls(container) {
  const playBtn = container.querySelector('#seg-play-btn');
  const progressTrack = container.querySelector('#seg-progress-track');
  const progressFill = container.querySelector('#seg-progress-fill');
  const timeCurrent = container.querySelector('#seg-time-current');
  const timeTotal = container.querySelector('#seg-time-total');
  const speedSelect = container.querySelector('#seg-speed');

  if (player) {
    // 更新进度条
    const origUpdate = player.getState;
    setInterval(() => {
      if (!player) return;
      const state = player.getState();
      if (state.duration > 0) {
        const pct = (state.currentTime / state.duration) * 100;
        progressFill.style.width = `${pct}%`;
        timeCurrent.textContent = formatTimeMs(state.currentTime);
      }
    }, 100);

    playBtn.addEventListener('click', () => {
      player.toggle().then(() => {
        const state = player.getState();
        playBtn.innerHTML = state.isPlaying
          ? '<i class="fa-solid fa-pause"></i>'
          : '<i class="fa-solid fa-play"></i>';
      }).catch(() => {});
    });

    progressTrack.addEventListener('click', (e) => {
      const rect = progressTrack.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const state = player.getState();
      player.seek(pct * state.duration);
    });

    speedSelect.addEventListener('change', () => {
      player.setRate(parseFloat(speedSelect.value));
    });
  }
}

function playSentence(idx) {
  if (!player) return;
  if (currentPlayingIdx === idx) {
    player.pause();
    currentPlayingIdx = -1;
  } else {
    const s = sentences[idx];
    player.setSentenceLoop(s.startTime, s.endTime);
    currentPlayingIdx = idx;
    player.play().catch(() => {});
  }
  updatePlayHighlight(player?.getState() || null);
}

function updatePlayHighlight(state) {
  document.querySelectorAll('.sentence-row').forEach((row, i) => {
    const isActive = i === currentPlayingIdx;
    row.style.background = isActive ? 'var(--primary-light)' : '';
    const btn = row.querySelector('.play-sentence-btn');
    if (btn) {
      btn.innerHTML = isActive
        ? '<i class="fa-solid fa-stop"></i> 停止'
        : '<i class="fa-solid fa-play"></i> 播放此句';
    }
  });
}

function mergeWithPrevious(idx) {
  if (idx <= 0 || idx >= sentences.length) return;
  const prev = sentences[idx - 1];
  const curr = sentences[idx];
  prev.text = prev.text + ' ' + curr.text;
  prev.endTime = curr.endTime;
  sentences.splice(idx, 1);
  sentences.forEach((s, i) => { s.index = i; });
}

function splitSentenceAtCursor(idx, container) {
  const ta = container.querySelector(`.sentence-textarea[data-index="${idx}"]`);
  const cursorPos = ta?.selectionStart;
  const text = sentences[idx].text;

  if (!cursorPos || cursorPos <= 0 || cursorPos >= text.length) {
    showToast('请将光标放在要拆分的位置', 'warning');
    return;
  }

  const before = text.substring(0, cursorPos).trim();
  const after = text.substring(cursorPos).trim();
  if (!before || !after) {
    showToast('拆分位置无效，请放在句子中间', 'warning');
    return;
  }

  const origSentence = sentences[idx];
  const midTime = (origSentence.startTime + origSentence.endTime) / 2;

  sentences[idx] = createSentence({
    ...origSentence,
    id: generateId(),
    text: before,
    endTime: midTime,
  });

  sentences.splice(idx + 1, 0, createSentence({
    id: generateId(),
    index: idx + 1,
    text: after,
    startTime: midTime,
    endTime: origSentence.endTime,
  }));

  sentences.forEach((s, i) => { s.index = i; });
  showToast('句子已拆分', 'success');
}

/**
 * 清理
 */
export function destroySegmentation() {
  if (player) {
    player.destroy();
    player = null;
  }
  currentPlayingIdx = -1;
  materialId = null;
  sentences = [];
}
