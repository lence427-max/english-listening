/**
 * 十篇精听工坊 — 计时专注模式
 */

import { showToast, confirmDialog, sanitizeHTML } from './utils.js';
import { STORAGE_KEYS } from './data-structure.js';
import { getItem, setItem } from './storage.js';

let isActive = false;
let timerInterval = null;
let remainingSeconds = 0;
let totalSeconds = 0;
let startTime = null;
let focusContainer = null;
let originalContent = null;

/**
 * 渲染专注模式入口按钮
 */
export function renderFocusModeButton() {
  const btn = document.createElement('button');
  btn.className = 'btn btn-ghost btn-sm';
  btn.id = 'focus-mode-btn';
  btn.innerHTML = '<i class="fa-solid fa-clock"></i> 专注';
  btn.title = '计时专注模式';
  btn.addEventListener('click', () => showFocusSetupDialog());
  return btn;
}

export function showFocusSetupDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width: 420px;">
      <div class="modal-header">
        <h3><i class="fa-solid fa-clock"></i> 计时专注模式</h3>
        <button class="btn btn-ghost btn-icon close-btn"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <p class="text-sm mb-4" style="color: var(--text-secondary);">
          选择专注时长，界面将精简以帮助你集中注意力。切屏会收到提醒。
        </p>
        <div class="form-group">
          <label class="form-label">专注时长（分钟）</label>
          <div class="grid grid-cols-3 gap-2" id="duration-options">
            ${[15, 25, 30, 45, 60, 90].map(m => `
              <button class="btn btn-secondary btn-sm duration-option" data-minutes="${m}">${m} 分钟</button>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">或自定义（分钟）</label>
          <input type="number" class="form-input" id="custom-duration" min="5" max="180" value="25" placeholder="25">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary close-btn">取消</button>
        <button class="btn btn-primary" id="start-focus-btn">
          <i class="fa-solid fa-play"></i> 开始专注
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelectorAll('.close-btn').forEach(b => b.addEventListener('click', close));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  let selectedMinutes = 25;

  overlay.querySelectorAll('.duration-option').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedMinutes = parseInt(btn.dataset.minutes);
      overlay.querySelector('#custom-duration').value = selectedMinutes;
      overlay.querySelectorAll('.duration-option').forEach(b => b.classList.remove('btn-primary'));
      overlay.querySelectorAll('.duration-option').forEach(b => b.classList.add('btn-secondary'));
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
    });
  });

  overlay.querySelector('#custom-duration').addEventListener('input', (e) => {
    selectedMinutes = parseInt(e.target.value) || 25;
    overlay.querySelectorAll('.duration-option').forEach(b => {
      b.classList.remove('btn-primary');
      b.classList.add('btn-secondary');
    });
  });

  overlay.querySelector('#start-focus-btn').addEventListener('click', () => {
    selectedMinutes = parseInt(overlay.querySelector('#custom-duration').value) || 25;
    close();
    startFocusMode(selectedMinutes);
  });
}

function startFocusMode(minutes) {
  if (isActive) return;

  isActive = true;
  totalSeconds = minutes * 60;
  remainingSeconds = totalSeconds;
  startTime = Date.now();

  // 保存原始内容
  const mainContent = document.querySelector('.main-content');
  focusContainer = mainContent;
  originalContent = mainContent.innerHTML;

  // 精简界面
  document.getElementById('sidebar')?.classList.add('hidden');
  document.querySelector('.mobile-menu-btn')?.classList.add('hidden');

  mainContent.innerHTML = `
    <div class="focus-mode-view">
      <div class="focus-timer-container">
        <div class="focus-ring">
          <svg viewBox="0 0 200 200" class="focus-ring-svg">
            <circle cx="100" cy="100" r="90" fill="none" stroke="var(--border)" stroke-width="6"/>
            <circle cx="100" cy="100" r="90" fill="none" stroke="var(--primary)" stroke-width="6"
                    stroke-dasharray="${2 * Math.PI * 90}" stroke-dashoffset="0"
                    stroke-linecap="round" id="focus-progress-circle"
                    transform="rotate(-90 100 100)"/>
          </svg>
          <div class="focus-ring-text">
            <div class="focus-timer-display" id="focus-timer">${formatFocusTime(remainingSeconds)}</div>
            <div class="focus-timer-label" id="focus-status">专注中...</div>
          </div>
        </div>

        <div class="focus-controls">
          <button class="btn btn-ghost btn-lg" id="focus-pause-btn">
            <i class="fa-solid fa-pause"></i> 暂停
          </button>
          <button class="btn btn-danger btn-lg" id="focus-quit-btn">
            <i class="fa-solid fa-xmark"></i> 结束专注
          </button>
        </div>
      </div>
    </div>
  `;

  // 绑定控制按钮
  document.getElementById('focus-pause-btn')?.addEventListener('click', togglePause);
  document.getElementById('focus-quit-btn')?.addEventListener('click', () => quitFocusMode(false));

  // 切屏监听
  document.addEventListener('visibilitychange', onVisibilityChange);

  // 启动计时器
  timerInterval = setInterval(tick, 1000);
}

function tick() {
  remainingSeconds--;
  updateDisplay();

  if (remainingSeconds <= 0) {
    completeFocusMode();
  }
}

function updateDisplay() {
  const timerEl = document.getElementById('focus-timer');
  const statusEl = document.getElementById('focus-status');
  const circleEl = document.getElementById('focus-progress-circle');

  if (timerEl) {
    timerEl.textContent = formatFocusTime(Math.max(0, remainingSeconds));
  }

  if (circleEl) {
    const circumference = 2 * Math.PI * 90;
    const progress = remainingSeconds / totalSeconds;
    circleEl.style.strokeDashoffset = circumference * (1 - progress);
  }

  if (statusEl && document.hidden && isActive) {
    statusEl.textContent = '⏸ 已暂停（切屏）';
    statusEl.style.color = 'var(--warning)';
  }
}

function togglePause() {
  const btn = document.getElementById('focus-pause-btn');
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    if (btn) btn.innerHTML = '<i class="fa-solid fa-play"></i> 继续';
  } else {
    timerInterval = setInterval(tick, 1000);
    if (btn) btn.innerHTML = '<i class="fa-solid fa-pause"></i> 暂停';
    document.getElementById('focus-status').textContent = '专注中...';
    document.getElementById('focus-status').style.color = '';
  }
}

function onVisibilityChange() {
  if (document.hidden && timerInterval) {
    showToast('检测到切屏，专注计时已暂停', 'warning');
    togglePause();
  }
}

async function quitFocusMode(completed = false) {
  if (!completed) {
    const confirmed = await confirmDialog(
      '结束专注',
      `你已经专注了 ${formatFocusTime(totalSeconds - remainingSeconds)}，确定要结束吗？`,
      '结束专注',
      true
    );
    if (!confirmed) return;
  }

  clearInterval(timerInterval);
  timerInterval = null;
  isActive = false;

  // 保存记录
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  saveFocusSession(elapsed, completed);

  // 恢复界面
  document.getElementById('sidebar')?.classList.remove('hidden');
  document.querySelector('.mobile-menu-btn')?.classList.remove('hidden');
  document.removeEventListener('visibilitychange', onVisibilityChange);

  if (focusContainer && originalContent) {
    // 重新渲染当前视图
    window.App?.switchView(window.App?.getCurrentView() || 'materials');
  }

  if (completed) {
    showToast(`🎉 专注完成！共 ${formatFocusTime(elapsed)}`, 'success');
  }
}

function completeFocusMode() {
  clearInterval(timerInterval);
  timerInterval = null;

  // 播放提示音
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      osc2.connect(gain);
      osc2.frequency.value = 1000;
      osc2.start();
      osc2.stop(ctx.currentTime + 0.3);
    }, 400);
  } catch (e) { /* ignore */ }

  quitFocusMode(true);
}

function saveFocusSession(elapsedSeconds, completed) {
  const sessions = getItem(STORAGE_KEYS.FOCUS_SESSIONS) || [];
  sessions.push({
    date: new Date().toISOString(),
    duration: elapsedSeconds,
    completed,
  });
  // 只保留最近 100 条
  if (sessions.length > 100) sessions.splice(0, sessions.length - 100);
  setItem(STORAGE_KEYS.FOCUS_SESSIONS, sessions);
}

function formatFocusTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * 获取专注统计
 */
export function getFocusStats() {
  const sessions = getItem(STORAGE_KEYS.FOCUS_SESSIONS) || [];
  const total = sessions.reduce((sum, s) => sum + s.duration, 0);
  const completed = sessions.filter(s => s.completed).length;
  return {
    totalSessions: sessions.length,
    completedSessions: completed,
    totalMinutes: Math.round(total / 60),
  };
}
