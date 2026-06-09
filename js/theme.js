/**
 * 十篇精听工坊 — 主题管理
 */

import { getSettings, saveSettings } from './storage.js';
import { createSettings } from './data-structure.js';

const THEME_KEY = 'theme-preference';

/**
 * 初始化主题
 * 优先级：用户手动设置 > 系统偏好
 */
export function initTheme() {
  const settings = getSettings();
  const savedTheme = settings?.theme || 'system';

  applyTheme(savedTheme);

  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getCurrentThemePreference() === 'system') {
      applySystemTheme();
    }
  });
}

/**
 * 获取当前生效的主题偏好
 */
function getCurrentThemePreference() {
  const settings = getSettings();
  return settings?.theme || 'system';
}

/**
 * 应用主题
 */
function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    applySystemTheme();
  }
  updateThemeToggleIcon();
}

/**
 * 应用系统主题
 */
function applySystemTheme() {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/**
 * 切换主题（循环：system → light → dark → system）
 */
export function toggleTheme() {
  const settings = getSettings() || createSettings();
  const current = settings.theme || 'system';

  const nextMap = { system: 'light', light: 'dark', dark: 'system' };
  const next = nextMap[current];

  settings.theme = next;
  saveSettings(settings);
  applyTheme(next);
}

/**
 * 获取当前主题名称
 */
export function getThemeName() {
  const preference = getCurrentThemePreference();
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference;
}

/**
 * 更新侧边栏主题按钮图标
 */
export function updateThemeToggleIcon() {
  const icon = document.getElementById('theme-toggle-icon');
  const label = document.getElementById('theme-toggle-label');
  if (!icon && !label) return;

  const settings = getSettings();
  const current = settings?.theme || 'system';

  const iconMap = { system: 'fa-circle-half-stroke', light: 'fa-sun', dark: 'fa-moon' };
  const labelMap = { system: '跟随系统', light: '浅色模式', dark: '深色模式' };

  if (icon) {
    icon.className = `fa-solid ${iconMap[current]} w-5 text-center`;
  }
  if (label) {
    label.textContent = labelMap[current];
  }
}
