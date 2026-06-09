/**
 * 十篇精听工坊 — 工具函数
 */

/**
 * 生成 UUID v4
 */
export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * XSS 过滤：转义 HTML 特殊字符
 * 用于安全地插入用户输入到 DOM
 */
export function sanitizeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * 安全地设置元素的文本内容（防止 XSS）
 */
export function safeText(el, text) {
  if (el) el.textContent = text;
}

/**
 * 安全地设置元素的 HTML（仅用于受信任内容）
 * 使用前确保内容已经过 sanitizeHTML 处理
 */
export function safeHTML(el, html) {
  if (el) el.innerHTML = html;
}

/**
 * 格式化时间为 mm:ss 或 hh:mm:ss
 */
export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * 格式化时间为 mm:ss.ms（毫秒级精度，用于时间戳）
 */
export function formatTimeMs(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00.000';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/**
 * 解析时间字符串（mm:ss 或 mm:ss.ms）为秒数
 */
export function parseTime(str) {
  if (!str) return 0;
  const parts = str.trim().split(':');
  if (parts.length === 1) {
    return parseFloat(parts[0]) || 0;
  }
  const minutes = parseInt(parts[0], 10) || 0;
  const seconds = parseFloat(parts[1]) || 0;
  return minutes * 60 + seconds;
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toISOString().split('T')[0];
}

/**
 * 格式化日期为友好的中文格式
 */
export function formatDateCN(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 防抖
 */
export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 节流
 */
export function throttle(fn, delay = 300) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/**
 * 显示 Toast 消息
 */
export function showToast(message, type = 'info', duration = 3000) {
  const container = document.querySelector('.toast-container');
  if (!container) return;

  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info}"></i>
    <span>${sanitizeHTML(message)}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-removing');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

/**
 * 确认对话框
 * @returns {Promise<boolean>}
 */
export function confirmDialog(title, message, confirmText = '确认', danger = false) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width: 400px;">
        <div class="modal-header">
          <h3>${sanitizeHTML(title)}</h3>
          <button class="btn btn-ghost btn-icon close-btn">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="modal-body confirm-dialog">
          <p>${sanitizeHTML(message)}</p>
          <div style="display:flex;gap:0.75rem;justify-content:center;">
            <button class="btn btn-secondary cancel-btn">取消</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} confirm-btn">${sanitizeHTML(confirmText)}</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector('.close-btn').onclick = () => close(false);
    overlay.querySelector('.cancel-btn').onclick = () => close(false);
    overlay.querySelector('.confirm-btn').onclick = () => close(true);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
  });
}

/**
 * 显示模态框
 */
export function showModal(contentHTML, options = {}) {
  const { title = '', onClose } = options;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      ${title ? `
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="btn btn-ghost btn-icon close-btn">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      ` : ''}
      <div class="modal-body">
        ${contentHTML}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    if (onClose) onClose();
  };

  overlay.querySelector('.close-btn')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  return { overlay, close };
}

/**
 * 文件大小格式化
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * 估算 LocalStorage 使用量（字节）
 */
export function getLocalStorageSize() {
  let total = 0;
  for (const key in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
      total += (localStorage[key].length + key.length) * 2; // UTF-16
    }
  }
  return total;
}

/**
 * 获取音频时长
 * @param {File|Blob} file
 * @returns {Promise<number>} 秒
 */
export function getAudioDuration(file) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取音频文件'));
    });
    audio.preload = 'metadata';
    audio.src = url;
  });
}
