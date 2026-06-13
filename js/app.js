/**
 * Silentium — 主应用控制器
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
import { loadAndRenderView } from './view-loader.js';

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
async function switchView(view, opts = {}) {
  // 离开探索模式时清理
  if (currentView === 'explore' && view !== 'explore') {
    try {
      const { destroyExploreMode } = await import('./explore-mode.js');
      destroyExploreMode();
    } catch (e) { /* module might not be loaded */ }
  }

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
    case 'library':
      renderLazyView(target, () => import('./content-library.js'), m => m.renderContentLibrary(target));
      break;
    case 'wordbank':
      renderLazyView(target, () => import('./word-bank.js'), m => m.renderWordBankView(target));
      break;
    case 'materials':
      renderMaterialsView(target);
      break;
    case 'training':
      if (opts.materialId) {
        // 直接打开特定素材的训练（可带 paragraphIndex 进入段落重练模式）
        startTraining(target, opts.materialId, opts.paragraphIndex);
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
    case 'feedback':
      renderLazyView(target, () => import('./feedback.js'), m => m.renderFeedbackView(target, opts.materialId));
      break;
    case 'shadowing':
      renderLazyView(target, () => import('./shadowing.js'), m => m.renderShadowingView(target, opts.materialId));
      break;
    case 'segmented':
      renderLazyView(target, () => import('./segmented.js'), m => m.renderSegmentedView(target, opts.materialId));
      break;
    case 'explore':
      renderLazyView(target, () => import('./explore-mode.js'), m => m.renderExploreView(target, opts.word));
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

function renderLazyView(target, load, render) {
  return loadAndRenderView({
    load,
    render,
    onError(error) {
      console.error('[App] 视图加载失败:', error);
      if (!target) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'empty-state';
      const title = document.createElement('h3');
      title.textContent = '页面加载失败';
      const message = document.createElement('p');
      message.textContent = '请刷新页面后重试。';
      wrapper.append(title, message);
      target.replaceChildren(wrapper);
    },
  });
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
      <div class="page-hero page-hero-compact">
        <div>
          <div class="page-eyebrow">LISTENING WORKSPACE</div>
          <h1 class="page-title">开始训练</h1>
          <p class="page-subtitle">从 ${trainableMaterials.length} 篇素材中选择一篇，进入你的精听工作台。</p>
        </div>
        <div class="page-hero-orbit" aria-hidden="true"><i class="fa-solid fa-headphones-simple"></i></div>
      </div>

      <div class="training-card-grid">
        ${trainableMaterials.map(m => {
          const s = statusMap[m.status] || statusMap.pending;
          const completedSentences = m.sentences.filter(s => s.dictationResult).length;
          const progress = m.sentences.length > 0
            ? Math.round((completedSentences / m.sentences.length) * 100) : 0;

          return `
            <div class="card cursor-pointer training-material-card"
                 data-id="${m.id}" data-status="${m.status}">
              <div class="card-body">
                <div class="training-card-kicker"><i class="fa-solid fa-wave-square"></i> FOCUSED LISTENING</div>
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-1 min-w-0">
                    <h3 class="training-card-title">${sanitizeHTML(m.title)}</h3>
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

                <div class="training-card-footer">
                  <span class="text-xs" style="color: var(--text-secondary);">
                    ${getActionLabel(m.status)}
                  </span>
                  <div class="flex items-center gap-2">
                    <button class="btn btn-ghost btn-sm start-training-btn" data-id="${m.id}" title="整篇听写">
                      整篇
                    </button>
                    <button class="btn btn-secondary btn-sm shadowing-start-btn" data-id="${m.id}" title="影子跟读">
                      <i class="fa-solid fa-microphone"></i> 跟读
                    </button>
                    <button class="btn btn-primary btn-sm segmented-start-btn" data-id="${m.id}">
                      ${m.status === 'completed' ? '重新训练' : '开始训练'}
                      <i class="fa-solid fa-arrow-right"></i>
                    </button>
                  </div>
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

  // 影子跟读按钮
  container.querySelectorAll('.shadowing-start-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      window.App.switchView('shadowing', { materialId: id });
    });
  });

  // 分段训练按钮
  container.querySelectorAll('.segmented-start-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      window.App.switchView('segmented', { materialId: id });
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

async function startTraining(container, materialId, paragraphIndex) {
  const material = getMaterials().find(m => m.id === materialId);
  if (!material) return;

  // 跳过手动分句，直接进入听写（内部自动按段落分割）
  const { renderDictationView } = await import('./dictation.js');
  renderDictationView(container, materialId, paragraphIndex);
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
