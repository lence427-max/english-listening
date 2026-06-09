/**
 * Silentium — 极简影子跟读
 * 逐段播放 → 录音 → 回放 → 下一段
 */

import { getMaterialById, getAudio } from './storage.js';
import { createPlayer } from './player.js';
import { splitParagraphs, estimateParagraphTimes } from './paragraph.js';
import { sanitizeHTML, showToast, formatTime } from './utils.js';

let player = null;
let materialId = null;
let paragraphs = [];
let currentIdx = 0;

// 录音相关
let mediaRecorder = null;
let audioChunks = [];
let recordedBlob = null;
let recordedUrl = null;

export async function renderShadowingView(container, matId) {
  materialId = matId;
  const material = getMaterialById(matId);
  if (!material) {
    container.innerHTML = '<div class="empty-state"><h3>素材未找到</h3></div>';
    return;
  }

  // 拆分段落
  paragraphs = splitParagraphs(material.originalText);
  estimateParagraphTimes(paragraphs, material.audioDuration || 0);

  if (paragraphs.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>素材没有可跟读的内容</h3></div>';
    return;
  }

  // 初始化播放器
  if (player) player.destroy();
  player = createPlayer({
    onTimeUpdate: () => handleTimeUpdate(),
  });

  const audioData = await getAudio(matId);
  if (audioData) {
    player.load(audioData.blob);
  }

  currentIdx = 0;
  recordedBlob = null;
  recordedUrl = null;

  renderUI(container, material);
}

function handleTimeUpdate() {
  if (!player) return;
  const para = paragraphs[currentIdx];
  if (!para || para.endTime === undefined) return;

  const state = player.getState();
  if (state.currentTime >= para.endTime) {
    player.pause();
    updatePlayBtn(false);
  }

  // 更新进度
  const timeEl = document.getElementById('shadow-time-current');
  if (timeEl) {
    timeEl.textContent = formatTime(state.currentTime);
  }
}

function renderUI(container, material) {
  const para = paragraphs[currentIdx];
  const total = paragraphs.length;

  container.innerHTML = `
    <div class="shadowing-view">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <button class="btn btn-ghost btn-sm" id="shadow-back-btn">
          <i class="fa-solid fa-arrow-left"></i> 返回
        </button>
        <span class="text-sm" style="color: var(--text-secondary);">
          段落 ${currentIdx + 1} / ${total}
        </span>
        <span class="text-sm truncate max-w-[200px]" style="color: var(--text-secondary);">
          ${sanitizeHTML(material.title)}
        </span>
      </div>

      <!-- Paragraph text -->
      <div class="card mb-6">
        <div class="card-header">
          <h3 class="font-semibold text-sm">📖 段落${currentIdx + 1}</h3>
          <span class="text-xs" style="color: var(--text-secondary);">
            ${para.wordCount} 词 · ${para.startTime !== undefined ? formatTime(para.startTime) + ' - ' + formatTime(para.endTime) : ''}
          </span>
        </div>
        <div class="card-body">
          <div class="shadow-text">${sanitizeHTML(para.text)}</div>
        </div>
      </div>

      <!-- Original audio -->
      <div class="card mb-4">
        <div class="card-body" style="padding: 1rem;">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium">🎧 原音</span>
            <span class="text-xs" style="color: var(--text-secondary); font-family: var(--font-mono);" id="shadow-time-current">0:00</span>
          </div>
          <div class="flex items-center gap-3">
            <button class="btn btn-primary btn-sm" id="shadow-play-btn">
              <i class="fa-solid fa-play"></i> 播放段落
            </button>
            <span class="text-xs" style="color: var(--text-tertiary);">播放到段落结束自动停止</span>
          </div>
        </div>
      </div>

      <!-- Recording -->
      <div class="card mb-6">
        <div class="card-body" style="padding: 1rem;">
          <span class="text-sm font-medium mb-2 block">🎤 我的录音</span>
          <div class="flex items-center gap-3 flex-wrap">
            <button class="btn btn-danger btn-sm" id="shadow-record-btn">
              <i class="fa-solid fa-circle"></i> 开始录音
            </button>
            <button class="btn btn-secondary btn-sm hidden" id="shadow-playback-btn">
              <i class="fa-solid fa-play"></i> 回放
            </button>
            <span class="text-xs hidden" style="color: var(--success);" id="shadow-rec-ok">
              <i class="fa-solid fa-check"></i> 录音完成
            </span>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex items-center justify-between">
        <button class="btn btn-secondary btn-sm" id="shadow-prev-btn" ${currentIdx === 0 ? 'disabled' : ''}>
          <i class="fa-solid fa-chevron-left"></i> 上一段
        </button>
        <span class="text-sm" style="color: var(--text-secondary);">${currentIdx + 1} / ${total}</span>
        ${currentIdx < total - 1 ? `
          <button class="btn btn-primary btn-sm" id="shadow-next-btn">
            下一段 <i class="fa-solid fa-chevron-right"></i>
          </button>
        ` : `
          <button class="btn btn-success btn-sm" id="shadow-finish-btn" style="background: var(--success); color: #fff;">
            <i class="fa-solid fa-check"></i> 完成
          </button>
        `}
      </div>
    </div>
  `;

  bindEvents(container);
  updatePlayBtn(false);
}

function bindEvents(container) {
  // 返回
  container.querySelector('#shadow-back-btn').addEventListener('click', cleanup);

  // 播放段落音频
  container.querySelector('#shadow-play-btn').addEventListener('click', () => {
    if (!player) return;
    const para = paragraphs[currentIdx];
    const state = player.getState();

    if (state.isPlaying) {
      player.pause();
      updatePlayBtn(false);
      return;
    }

    // 跳转到段落起始位置
    if (para.startTime !== undefined) {
      player.seek(para.startTime);
    }
    player.play().then(() => {
      updatePlayBtn(true);
    }).catch(() => {
      showToast('播放失败', 'error');
    });
  });

  // 录音
  const recordBtn = container.querySelector('#shadow-record-btn');
  recordBtn.addEventListener('click', async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      // 停止录音
      mediaRecorder.stop();
      recordBtn.innerHTML = '<i class="fa-solid fa-circle"></i> 开始录音';
      recordBtn.classList.remove('recording');
      return;
    }

    // 清理旧录音
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      recordedUrl = null;
      recordedBlob = null;
    }
    audioChunks = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        recordedBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
        recordedUrl = URL.createObjectURL(recordedBlob);

        // 显示回放按钮
        const pbBtn = container.querySelector('#shadow-playback-btn');
        const okSpan = container.querySelector('#shadow-rec-ok');
        pbBtn.classList.remove('hidden');
        okSpan.classList.remove('hidden');

        // 停止录音轨道
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      recordBtn.innerHTML = '<i class="fa-solid fa-stop"></i> 停止录音';
      recordBtn.classList.add('recording');
    } catch (err) {
      console.error('[Shadowing] 录音失败:', err);
      showToast('无法访问麦克风，请检查权限', 'error');
    }
  });

  // 回放录音
  const playbackBtn = container.querySelector('#shadow-playback-btn');
  playbackBtn.addEventListener('click', () => {
    if (!recordedUrl) return;
    const audio = new Audio(recordedUrl);
    audio.play().catch(() => showToast('回放失败', 'error'));
  });

  // 上一段
  container.querySelector('#shadow-prev-btn').addEventListener('click', () => {
    if (currentIdx > 0) {
      currentIdx--;
      resetRecording(container);
      renderUI(container, getMaterialById(materialId));
    }
  });

  // 下一段
  container.querySelector('#shadow-next-btn')?.addEventListener('click', () => {
    if (currentIdx < paragraphs.length - 1) {
      currentIdx++;
      resetRecording(container);
      renderUI(container, getMaterialById(materialId));
    }
  });

  // 完成
  container.querySelector('#shadow-finish-btn')?.addEventListener('click', () => {
    showToast('🎉 影子跟读完成！', 'success');
    cleanup();
  });

  // 键盘快捷键
  const keyHandler = (e) => {
    if (e.key === 'ArrowRight' && currentIdx < paragraphs.length - 1) {
      currentIdx++;
      resetRecording(container);
      renderUI(container, getMaterialById(materialId));
    } else if (e.key === 'ArrowLeft' && currentIdx > 0) {
      currentIdx--;
      resetRecording(container);
      renderUI(container, getMaterialById(materialId));
    }
  };
  document.addEventListener('keydown', keyHandler);
  container._keyHandler = keyHandler;
}

function updatePlayBtn(isPlaying) {
  const btn = document.getElementById('shadow-play-btn');
  if (!btn) return;
  if (isPlaying) {
    btn.innerHTML = '<i class="fa-solid fa-pause"></i> 暂停';
  } else {
    btn.innerHTML = '<i class="fa-solid fa-play"></i> 播放段落';
  }
}

function resetRecording(container) {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  mediaRecorder = null;
  audioChunks = [];
  if (recordedUrl) {
    URL.revokeObjectURL(recordedUrl);
    recordedUrl = null;
  }
  recordedBlob = null;
}

function cleanup() {
  if (player) { player.pause(); }
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  if (recordedUrl) {
    URL.revokeObjectURL(recordedUrl);
  }
  mediaRecorder = null;
  recordedUrl = null;
  recordedBlob = null;
  audioChunks = [];
  paragraphs = [];
  currentIdx = 0;

  // 清理键盘监听
  const container = document.getElementById('view-shadowing');
  if (container && container._keyHandler) {
    document.removeEventListener('keydown', container._keyHandler);
  }

  window.App.switchView('training');
}

export function destroyShadowing() {
  if (player) { player.destroy(); player = null; }
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  if (recordedUrl) {
    URL.revokeObjectURL(recordedUrl);
  }
  materialId = null;
}
