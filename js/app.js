/**
 * 十篇精听工坊 — 主应用控制器
 * 初始化、路由、视图切换
 */

import { initTheme } from './theme.js';
import { renderMaterialsView } from './materials.js';
import { renderVocabularyView } from './vocabulary.js';
import { renderDashboardView, bindDashboardEvents } from './dashboard.js';
import { initDictionary } from './dictionary.js';
import { renderFocusModeButton } from './focus-mode.js';
import { getMaterials } from './storage.js';
import { formatTime, formatDateCN, sanitizeHTML } from './utils.js';

// 当前活动视图
let currentView = 'materials';

/**
 * 初始化应用
 */
function init() {
  // 初始化主题
  initTheme();

  // 初始化侧边栏导航
  initNavigation();

  // 渲染默认视图（素材管理）
  switchView('materials');

  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // 关闭所有模态框
      document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
    }
  });
}

/**
 * 初始化导航
 */
function initNavigation() {
  const navLinks = document.querySelectorAll('.sidebar-nav a[data-view]');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      switchView(view);
    });
  });

  // 移动端汉堡菜单
  const menuBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    });
  }
}

/**
 * 切换视图
 * @param {string} view - 视图名称
 * @param {object} opts - 可选参数 { materialId }
 */
function switchView(view, opts = {}) {
  currentView = view;

  // 隐藏所有视图
  document.querySelectorAll('.view-panel').forEach(el => {
    el.classList.add('hidden');
  });

  // 显示目标视图
  const target = document.getElementById(`view-${view}`);
  if (target) {
    target.classList.remove('hidden');
  }

  // 更新导航高亮
  document.querySelectorAll('.sidebar-nav a[data-view]').forEach(link => {
    link.classList.toggle('active', link.dataset.view === view);
  });

  // 渲染视图内容
  switch (view) {
    case 'materials':
      renderMaterialsView(target);
      break;
    case 'training':
      if (opts.materialId) {
        // 直接打开特定素材的训练
        startTraining(target, opts.materialId);
      } else {
        renderTrainingView(target);
      }
      break;
    case 'vocabulary':
      renderVocabularyView(target);
      // 为生词本的单词启用双击查词
      initDictionary(target);
      break;
    case 'dashboard':
      renderDashboardView(target);
      bindDashboardEvents(target);
      break;
  }

  // 启用词典功能（双击查词）
  initDictionary(target);

  // 移动端关闭侧边栏
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar && window.innerWidth <= 768) {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('visible');
  }
}

/**
 * 训练视图 — 素材选择与训练入口
 */
function renderTrainingView(container) {
  const materials = getMaterials();

  // 筛选可训练的素材（有音频 + 有原文）
  const trainableMaterials = materials.filter(m => m.audioId && m.originalText);

  if (trainableMaterials.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold">开始训练</h1>
          <p class="text-sm mt-1" style="color: var(--text-secondary);">选择素材，开始逐句精听</p>
        </div>
      </div>
      <div class="empty-state">
        <i class="fa-solid fa-pen-to-square"></i>
        <h3>还没有可训练的素材</h3>
        <p>请先在「素材管理」中创建素材，上传音频并粘贴原文</p>
        <button class="btn btn-primary" onclick="window.App.switchView('materials')">
          <i class="fa-solid fa-folder-open"></i> 去创建素材
        </button>
      </div>
    `;
    return;
  }

  const statusMap = {
    pending: { label: '待开始', cls: 'badge-pending', icon: 'fa-circle' },
    dictating: { label: '听写中', cls: 'badge-progress', icon: 'fa-pen-to-square' },
    completed: { label: '已完成', cls: 'badge-success', icon: 'fa-circle-check' },
  };

  container.innerHTML = `
    <div class="training-select-view">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold">开始训练</h1>
          <p class="text-sm mt-1" style="color: var(--text-secondary);">
            共 ${trainableMaterials.length} 篇素材，选择一篇开始精听
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${trainableMaterials.map(m => {
          const s = statusMap[m.status] || statusMap.pending;
          const completedSentences = m.sentences.filter(s => s.dictationResult).length;
          const progress = m.sentences.length > 0
            ? Math.round((completedSentences / m.sentences.length) * 100) : 0;

          return `
            <div class="card hover-highlight cursor-pointer training-material-card"
                 data-id="${m.id}" data-status="${m.status}">
              <div class="card-body">
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold truncate">${sanitizeHTML(m.title)}</h3>
                    <div class="text-xs mt-1" style="color: var(--text-secondary);">
                      ${m.sentences.length || 0} 句 · ${m.audioDuration ? formatTime(m.audioDuration) : '—'}
                      · ${formatDateCN(m.updatedAt)}
                    </div>
                  </div>
                  <span class="badge ${s.cls} flex-shrink-0 ml-2">
                    <i class="fa-solid ${s.icon}"></i> ${s.label}
                  </span>
                </div>

                ${m.sentences.length > 0 ? `
                  <div class="mb-3">
                    <div class="flex justify-between text-xs mb-1" style="color: var(--text-secondary);">
                      <span>听写进度</span>
                      <span>${completedSentences}/${m.sentences.length} 句 (${progress}%)</span>
                    </div>
                    <div class="progress-bar">
                      <div class="progress-bar-fill" style="width: ${progress}%; ${progress === 100 ? 'background: var(--success);' : ''}"></div>
                    </div>
                  </div>
                ` : ''}

                <div class="flex items-center justify-between">
                  <span class="text-xs" style="color: var(--text-secondary);">
                    ${getActionLabel(m.status)}
                  </span>
                  <button class="btn btn-primary btn-sm start-training-btn" data-id="${m.id}">
                    ${m.status === 'completed' ? '重新训练' : '开始训练'}
                    <i class="fa-solid fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // 绑定卡片点击
  container.querySelectorAll('.training-material-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // 不拦截按钮点击
      if (e.target.closest('button')) return;
      const id = card.dataset.id;
      startTraining(container, id);
    });
  });

  // 绑定按钮点击
  container.querySelectorAll('.start-training-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      startTraining(container, id);
    });
  });
}

function getActionLabel(status) {
  switch (status) {
    case 'pending': return '点击开始 → 全文听写';
    case 'dictating': return '继续听写 → ';
    case 'completed': return '✅ 已完成，可重新训练';
    default: return '点击开始训练';
  }
}

async function startTraining(container, materialId) {
  const material = getMaterials().find(m => m.id === materialId);
  if (!material) return;

  // 跳过手动分句，直接进入听写（内部自动按段落分割）
  const { renderDictationView } = await import('./dictation.js');
  renderDictationView(container, materialId);
}

/**
 * 进度看板占位（阶段四实现）
 */
function renderDashboardPlaceholder(container) {
  container.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">进度看板</h1>
        <p class="text-sm mt-1" style="color: var(--text-secondary);">追踪你的十篇精听目标进度</p>
      </div>
    </div>
    <div class="empty-state">
      <i class="fa-solid fa-chart-line"></i>
      <h3>进度看板开发中</h3>
      <p>十篇目标追踪看板将在阶段四完成，敬请期待</p>
    </div>
  `;
}

// 挂载全局 API
window.App = {
  switchView,
  getCurrentView: () => currentView,
};

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
