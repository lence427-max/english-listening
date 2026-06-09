/**
 * Silentium — 素材管理模块
 */

import {
  getMaterials, upsertMaterial, deleteMaterial, getMaterialById,
  saveAudio, getAudio, deleteAudio,
  exportAllData, importAllData,
} from './storage.js';
import { createMaterial, createSentence } from './data-structure.js';
import { splitParagraphs, estimateParagraphTimes } from './paragraph.js';
import { createPlayer } from './player.js';
import {
  generateId, formatTime, formatDateCN, formatFileSize,
  showToast, confirmDialog, getAudioDuration, sanitizeHTML,
} from './utils.js';

let currentViewMaterialId = null;
let player = null;

/**
 * 渲染素材管理主页面
 */
export function renderMaterialsView(container) {
  const materials = getMaterials();
  const stats = computeStats(materials);

  container.innerHTML = `
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold" style="color: var(--text);">素材管理</h1>
        <p class="text-sm mt-1" style="color: var(--text-secondary);">管理你的英语精听素材，目标 10 篇</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-secondary btn-sm" onclick="window._importJSON()">
          <i class="fa-solid fa-file-import"></i> 导入
        </button>
        <button class="btn btn-secondary btn-sm" onclick="window._exportJSON()">
          <i class="fa-solid fa-file-export"></i> 导出
        </button>
        <button class="btn btn-primary" onclick="window._showNewMaterialModal()">
          <i class="fa-solid fa-plus"></i> 新建素材
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="card p-5">
        <div class="text-xs font-medium uppercase tracking-wider" style="color: var(--text-secondary);">素材总数</div>
        <div class="text-3xl font-bold mt-1" style="color: var(--text);">
          ${materials.length} <span class="text-sm font-normal" style="color: var(--text-secondary);">/ 10 篇</span>
        </div>
      </div>
      <div class="card p-5">
        <div class="text-xs font-medium uppercase tracking-wider" style="color: var(--text-secondary);">完成进度</div>
        <div class="text-3xl font-bold mt-1" style="color: var(--text);">${stats.completedCount}</div>
        <div class="progress-bar mt-2">
          <div class="progress-bar-fill" style="width: ${stats.completionPercent}%;"></div>
        </div>
      </div>
      <div class="card p-5">
        <div class="text-xs font-medium uppercase tracking-wider" style="color: var(--text-secondary);">待复习</div>
        <div class="text-3xl font-bold mt-1" style="color: var(--text);">
          ${stats.needReviewCount} <span class="text-sm font-normal" style="color: var(--text-secondary);">篇</span>
        </div>
      </div>
    </div>

    <!-- Material List -->
    <div class="card">
      <div class="card-header">
        <h2 class="font-semibold" style="color: var(--text);">素材列表</h2>
        <span class="text-sm" style="color: var(--text-secondary);">
          <i class="fa-solid fa-sort"></i> 最近更新
        </span>
      </div>
      ${materials.length === 0 ? renderEmptyState() : renderMaterialList(materials)}
    </div>

    <!-- Hidden file input for JSON import -->
    <input type="file" id="json-import-input" accept=".json" class="hidden" onchange="window._handleJSONImport(event)">
  `;

  // 绑定全局函数
  window._showNewMaterialModal = () => showMaterialModal();
  window._exportJSON = handleExportJSON;
  window._importJSON = () => document.getElementById('json-import-input')?.click();
  window._handleJSONImport = handleImportJSON;
}

function renderEmptyState() {
  return `
    <div class="empty-state">
      <i class="fa-solid fa-headphones"></i>
      <h3>还没有素材</h3>
      <p>点击上方「新建素材」开始你的第一篇精听训练</p>
      <button class="btn btn-primary" onclick="window._showNewMaterialModal()">
        <i class="fa-solid fa-plus"></i> 新建第一篇素材
      </button>
    </div>
  `;
}

function renderMaterialList(materials) {
  const statusMap = {
    pending: { label: '待开始', cls: 'badge-pending' },
    dictating: { label: '听写中', cls: 'badge-progress' },
    completed: { label: '已完成', cls: 'badge-success' },
  };

  return `
    <div class="divide-y" style="border-color: var(--border);">
      ${materials.map((m, i) => {
        const s = statusMap[m.status] || statusMap.pending;
        return `
          <div class="p-4 hover-highlight cursor-pointer flex items-center justify-between gap-4 material-row"
               data-id="${m.id}">
            <div class="flex items-center gap-4 min-w-0 flex-1" onclick="window._openMaterial('${m.id}')">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
                   style="background: ${getMaterialColor(i)};">
                ${i + 1}
              </div>
              <div class="min-w-0">
                <div class="font-medium truncate" style="color: var(--text);">${sanitizeHTML(m.title) || '未命名素材'}</div>
                <div class="text-xs mt-0.5" style="color: var(--text-secondary);">
                  ${m.audioDuration ? formatTime(m.audioDuration) : '无音频'}
                  · ${getDictationErrCount(m)}
                  · ${formatDateCN(m.updatedAt)}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span class="badge ${s.cls}">${s.label}</span>
              <div class="relative">
                <button class="btn btn-ghost btn-icon btn-sm" onclick="event.stopPropagation(); window._toggleMaterialMenu(event, '${m.id}')">
                  <i class="fa-solid fa-ellipsis-vertical"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function getMaterialColor(index) {
  const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1'];
  return colors[index % colors.length];
}

/**
 * 获取听写错误数（兼容新旧 dictationResult 格式）
 */
function getDictationErrCount(material) {
  const r = material.dictationResult;
  if (!r) return '';
  // 新格式：{pairs, stats, accuracy, grade, createdAt}
  if (r.stats) {
    const err = r.stats.missing + r.stats.extra + r.stats.replacement;
    return err === 0 ? '✓ 正确' : err + ' 处错误';
  }
  // 旧格式：[{word, userWord, match}]
  if (Array.isArray(r)) {
    const err = r.filter(w => !w.match).length;
    return err === 0 ? '✓ 正确' : err + ' 处错误';
  }
  return '';
}

/**
 * 统计计算
 */
function computeStats(materials) {
  const completedCount = materials.filter(m => m.status === 'completed').length;
  const completionPercent = materials.length > 0 ? Math.round((completedCount / 10) * 100) : 0;

  // TODO: 等复习模块实现后完善 needReviewCount
  const needReviewCount = 0;

  return { completedCount, completionPercent, needReviewCount };
}

// ==================== 素材模态框 ====================

/**
 * 新建/编辑素材模态框
 */
export function showMaterialModal(materialId = null) {
  const material = materialId ? getMaterialById(materialId) : null;
  const isEdit = !!material;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width: 640px;">
      <div class="modal-header">
        <h3>${isEdit ? '编辑素材' : '新建素材'}</h3>
        <button class="btn btn-ghost btn-icon" id="modal-close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">素材标题 <span style="color: var(--danger);">*</span></label>
          <input type="text" class="form-input" id="mat-title" placeholder="如：BBC 六分钟英语 — AI"
                 value="${sanitizeHTML(material?.title || '')}" maxlength="200">
        </div>
        <div class="form-group">
          <label class="form-label">音频文件 ${!isEdit ? '<span style="color: var(--danger);">*</span>' : ''}</label>
          <div id="audio-upload-area" class="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
               style="border-color: var(--border);"
               onclick="document.getElementById('mat-audio-file').click()">
            <input type="file" id="mat-audio-file" accept="audio/*" class="hidden">
            <i class="fa-solid fa-cloud-arrow-up text-2xl mb-2 block" style="color: var(--text-tertiary);"></i>
            <p id="audio-file-name" class="text-sm" style="color: var(--text-secondary);">
              ${material?.audioFileName ? sanitizeHTML(material.audioFileName) : '点击选择音频文件（MP3, WAV, M4A...）'}
            </p>
            ${material?.audioDuration ? `<p class="text-xs mt-1" style="color: var(--text-tertiary);">时长: ${formatTime(material.audioDuration)}</p>` : ''}
          </div>
        </div>
        <div class="form-group">
          <div class="flex items-center justify-between mb-1">
            <label class="form-label mb-0">英语原文 <span style="color: var(--danger);">*</span></label>
            <button type="button" class="btn btn-ghost btn-sm" id="mat-clean-btn" title="智能清洗：去除 BBC/VOA 格式噪音、说话人标签、版权信息">
              <i class="fa-solid fa-wand-magic-sparkles"></i> 清洗原文
            </button>
          </div>
          <textarea class="form-textarea" id="mat-text" rows="8"
                    placeholder="粘贴英语原文，按 . ! ? 和换行自动分句&#10;&#10;例如：&#10;Artificial intelligence is transforming our world. But what exactly is AI? Let's find out."
          >${sanitizeHTML(material?.originalText || '')}</textarea>
          <div class="flex items-center justify-between mt-1">
            <p class="form-hint mb-0"></p>
            <span class="text-xs" style="color: var(--text-tertiary);" id="mat-text-stats"></span>
          </div>
        </div>

        <!-- 段落拆分编辑器 -->
        <div class="form-group" id="para-editor-section">
          <div class="flex items-center justify-between mb-2">
            <label class="form-label mb-0">📐 段落拆分</label>
            <span class="text-xs" style="color: var(--text-secondary);" id="para-count"></span>
          </div>
          <div id="para-list" class="space-y-3"></div>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-cancel">取消</button>
        ${!isEdit ? '' : `<button class="btn btn-danger" id="modal-delete" style="margin-right: auto;">删除素材</button>`}
        <button class="btn btn-primary" id="modal-save">
          <i class="fa-solid fa-check"></i> ${isEdit ? '保存' : '创建'}
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  let audioFile = null;

  // 音频文件选择
  const fileInput = overlay.querySelector('#mat-audio-file');
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      audioFile = file;
      const duration = await getAudioDuration(file).catch(() => 0);
      overlay.querySelector('#audio-file-name').textContent = `${file.name} (${formatFileSize(file.size)}) · ${formatTime(duration)}`;
      fileInput.dataset.duration = String(duration);
    }
  });

  // 原文清洗按钮
  const textArea = overlay.querySelector('#mat-text');
  const statsEl = overlay.querySelector('#mat-text-stats');

  const updateTextStats = () => {
    const text = textArea.value;
    const chars = text.length;
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    statsEl.textContent = `${chars} 字符 · 约 ${words} 词`;
  };
  updateTextStats();
  textArea.addEventListener('input', updateTextStats);

  // ========== 段落拆分编辑器 ==========
  const paraList = overlay.querySelector('#para-list');
  const paraCount = overlay.querySelector('#para-count');

  function renderParagraphs(text) {
    if (!text.trim()) {
      paraList.innerHTML = '<p class="text-xs" style="color: var(--text-tertiary);">输入原文后可预览段落拆分</p>';
      paraCount.textContent = '';
      return;
    }
    const paragraphs = splitParagraphs(text);
    paraCount.textContent = `${paragraphs.length} 段`;

    paraList.innerHTML = paragraphs.map((p, i) => `
      <div class="para-block" data-para="${i}">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-medium" style="color: var(--text-secondary);">段落${i + 1} (${p.wordCount} 词)</span>
          <div class="flex gap-2">
            ${i > 0 ? `<button class="btn btn-ghost btn-sm para-merge-btn" data-para="${i}" title="合并到上一段"><i class="fa-solid fa-arrow-up"></i> 合并</button>` : ''}
            <button class="btn btn-ghost btn-sm para-split-btn" data-para="${i}" title="在段落中间插入空行拆分"><i class="fa-solid fa-scissors"></i> 拆分</button>
          </div>
        </div>
        <textarea class="form-textarea para-textarea" data-para="${i}" rows="3"
                  style="font-size: 0.8125rem; min-height: 50px;">${sanitizeHTML(p.text)}</textarea>
      </div>
    `).join('');

    // 绑定段落编辑事件
    paraList.querySelectorAll('.para-textarea').forEach(ta => {
      ta.addEventListener('input', () => {
        syncParagraphsToMain();
      });
    });

    // 合并到上一段
    paraList.querySelectorAll('.para-merge-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.para, 10);
        const paragraphs = splitParagraphs(textArea.value);
        if (idx > 0 && idx < paragraphs.length) {
          // 合并 idx 到 idx-1
          paragraphs[idx - 1].text += '\n' + paragraphs[idx].text;
          paragraphs.splice(idx, 1);
          const merged = paragraphs.map(p => p.text).join('\n\n');
          textArea.value = merged;
          updateTextStats();
          renderParagraphs(merged);
        }
      });
    });

    // 拆分段落
    paraList.querySelectorAll('.para-split-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.para, 10);
        const paragraphs = splitParagraphs(textArea.value);
        if (idx < paragraphs.length) {
          const text = paragraphs[idx].text;
          // 在第一个句号/问号/感叹号后拆分
          const mid = Math.floor(text.length / 2);
          const splitAt = text.indexOf('. ', mid);
          if (splitAt > 0) {
            paragraphs[idx].text = text.substring(0, splitAt + 1).trim();
            paragraphs.splice(idx + 1, 0, { text: text.substring(splitAt + 2).trim() });
          } else {
            // 在中间位置用空行拆分
            const half = Math.floor(text.length / 2);
            paragraphs[idx].text = text.substring(0, half).trim();
            paragraphs.splice(idx + 1, 0, { text: text.substring(half).trim() });
          }
          const result = paragraphs.map(p => p.text).join('\n\n');
          textArea.value = result;
          updateTextStats();
          renderParagraphs(result);
        }
      });
    });
  }

  function syncParagraphsToMain() {
    const texts = [];
    paraList.querySelectorAll('.para-textarea').forEach(ta => {
      texts.push(ta.value.trim());
    });
    if (texts.length > 0) {
      textArea.value = texts.join('\n\n');
      updateTextStats();
    }
  }

  // 初始渲染段落
  renderParagraphs(textArea.value);

  // 原文变化时重新渲染段落（防抖）
  let paraTimer;
  textArea.addEventListener('input', () => {
    clearTimeout(paraTimer);
    paraTimer = setTimeout(() => renderParagraphs(textArea.value), 500);
  });

  // ==========================================

  overlay.querySelector('#mat-clean-btn').addEventListener('click', async () => {
    const { cleanTranscript, getCleanReport } = await import('./text-cleaner.js');
    const original = textArea.value;
    if (!original.trim()) {
      import('./utils.js').then(({ showToast }) => showToast('请先粘贴原文', 'warning'));
      return;
    }
    const cleaned = cleanTranscript(original);
    const report = getCleanReport(original, cleaned);

    if (report.removedCount > 0) {
      textArea.value = cleaned;
      updateTextStats();
      import('./utils.js').then(({ showToast }) =>
        showToast(`已去除 ${report.removedCount} 行格式噪音（共 ${report.originalLines}→${report.cleanedLines} 行）`, 'success')
      );
    } else {
      import('./utils.js').then(({ showToast }) =>
        showToast('未检测到需要清洗的格式噪音', 'info')
      );
    }
  });

  // 关闭
  const closeModal = () => overlay.remove();
  overlay.querySelector('#modal-close').onclick = closeModal;
  overlay.querySelector('#modal-cancel').onclick = closeModal;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  // 删除
  overlay.querySelector('#modal-delete')?.addEventListener('click', async () => {
    const confirmed = await confirmDialog('删除素材', '确认删除该素材及其所有训练数据？此操作不可撤销。', '删除', true);
    if (confirmed) {
      if (material.audioId) await deleteAudio(material.audioId).catch(() => {});
      deleteMaterial(material.id);
      closeModal();
      showToast('素材已删除', 'success');
      renderMaterialsView(document.getElementById('view-materials'));
    }
  });

  // 保存
  overlay.querySelector('#modal-save').addEventListener('click', async () => {
    const title = overlay.querySelector('#mat-title').value.trim();
    const text = overlay.querySelector('#mat-text').value.trim();

    if (!title) { showToast('请输入素材标题', 'warning'); return; }
    if (!isEdit && !audioFile) { showToast('请选择音频文件', 'warning'); return; }
    if (!text) { showToast('请输入英语原文', 'warning'); return; }

    const id = material?.id || generateId();
    const duration = audioFile ? parseFloat(fileInput.dataset.duration || '0') : (material?.audioDuration || 0);

    // 从原文生成段落数据
    const paragraphs = splitParagraphs(text).map((p, i) => ({
      ...p,
      id: generateId(),
    }));
    estimateParagraphTimes(paragraphs, duration);

    const newMaterial = createMaterial({
      ...(material || {}),
      id,
      title,
      originalText: text,
      audioId: id,
      audioFileName: audioFile ? audioFile.name : (material?.audioFileName || ''),
      audioDuration: duration,
      sentences: [],
      paragraphs,
      status: material?.status || 'pending',
    });

    // 保存音频到 IndexedDB
    if (audioFile) {
      await saveAudio(id, audioFile, audioFile.name);
    }

    upsertMaterial(newMaterial);
    closeModal();
    showToast(isEdit ? '素材已更新' : '素材已创建', 'success');
    renderMaterialsView(document.getElementById('view-materials'));
  });
}

// ==================== 自动分句 ====================

/**
 * 按句子分隔符分割文本
 */
function autoSegment(text) {
  if (!text) return [];
  // 先按换行分割
  const lines = text.split(/\n+/).filter(l => l.trim());
  const sentences = [];

  for (const line of lines) {
    // 对每行按 . ! ? 分割（保留分隔符在句尾）
    // 注意：处理 Mr. Dr. etc. i.e. e.g. 等缩写
    const parts = line.split(/(?<=[.!?])\s+/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed) {
        sentences.push(trimmed);
      }
    }
  }

  return sentences;
}

// ==================== 打开素材详情 ====================

window._openMaterial = function (id) {
  const material = getMaterialById(id);
  if (!material) return;
  currentViewMaterialId = id;
  // 默认进入分段训练
  window.App.switchView('segmented', { materialId: id });
};

// ==================== 菜单切换 ====================

window._toggleMaterialMenu = function (event, id) {
  event.stopPropagation();
  // 简单实现：弹出操作菜单
  const menu = document.createElement('div');
  menu.className = 'card';
  menu.style.cssText = `position:fixed;z-index:150;padding:0.5rem;min-width:140px;box-shadow:var(--popup-shadow);`;
  menu.innerHTML = `
    <button class="btn btn-ghost btn-sm w-full justify-start" id="menu-edit">
      <i class="fa-solid fa-pen-to-square"></i> 编辑
    </button>
    <button class="btn btn-ghost btn-sm w-full justify-start" id="menu-delete" style="color: var(--danger);">
      <i class="fa-solid fa-trash"></i> 删除
    </button>
  `;
  document.body.appendChild(menu);

  const rect = event.target.getBoundingClientRect();
  menu.style.left = `${Math.min(rect.left, window.innerWidth - 160)}px`;
  menu.style.top = `${Math.min(rect.bottom + 4, window.innerHeight - 120)}px`;

  const removeMenu = () => { menu.remove(); document.removeEventListener('click', removeMenu); };
  setTimeout(() => document.addEventListener('click', removeMenu), 0);

  menu.querySelector('#menu-edit').onclick = (e) => { e.stopPropagation(); removeMenu(); showMaterialModal(id); };
  menu.querySelector('#menu-delete').onclick = async (e) => {
    e.stopPropagation(); removeMenu();
    const m = getMaterialById(id);
    const confirmed = await confirmDialog('删除素材', `确认删除「${m?.title || '未命名'}」及其训练数据？`, '删除', true);
    if (confirmed) {
      if (m?.audioId) await deleteAudio(m.audioId).catch(() => {});
      deleteMaterial(id);
      showToast('素材已删除', 'success');
      renderMaterialsView(document.getElementById('view-materials'));
    }
  };
};

// ==================== JSON 导入导出 ====================

async function handleExportJSON() {
  try {
    const json = exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `english-listening-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('数据导出成功', 'success');
  } catch (e) {
    showToast('导出失败: ' + e.message, 'error');
  }
}

async function handleImportJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const { validateImportData, isSafeJSON } = await import('./data-structure.js');

    if (!isSafeJSON(text)) {
      showToast('文件包含不安全内容，已拒绝', 'error');
      return;
    }

    const data = JSON.parse(text);
    const errors = validateImportData(data);
    if (errors.length > 0) {
      showToast('数据校验失败: ' + errors.slice(0, 3).join('; '), 'error');
      return;
    }

    const mode = await showImportModeDialog();
    if (mode) {
      importAllData(text, mode);
      showToast(mode === 'overwrite' ? '数据已覆盖导入' : '数据已合并导入', 'success');
      renderMaterialsView(document.getElementById('view-materials'));
    }
  } catch (e) {
    showToast('导入失败: ' + e.message, 'error');
  }

  // 重置 input
  event.target.value = '';
}

function showImportModeDialog() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width: 400px;">
        <div class="modal-header">
          <h3>选择导入方式</h3>
          <button class="btn btn-ghost btn-icon close-btn"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom:1rem;color: var(--text-secondary);">导入的数据包含素材、训练记录和生词本。请选择导入方式：</p>
          <div style="display:flex;flex-direction:column;gap:0.75rem;">
            <button class="btn btn-secondary w-full justify-start" id="import-merge">
              <i class="fa-solid fa-object-group"></i>
              <div style="text-align:left;">
                <div class="font-medium">合并导入</div>
                <div class="text-xs" style="color: var(--text-secondary);">保留现有数据，仅添加新内容</div>
              </div>
            </button>
            <button class="btn btn-secondary w-full justify-start" id="import-overwrite">
              <i class="fa-solid fa-rotate"></i>
              <div style="text-align:left;">
                <div class="font-medium">覆盖导入</div>
                <div class="text-xs" style="color: var(--text-secondary);">清空所有现有数据，用文件内容替换</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = (result) => { overlay.remove(); resolve(result); };
    overlay.querySelector('.close-btn').onclick = () => close(null);
    overlay.querySelector('#import-merge').onclick = () => close('merge');
    overlay.querySelector('#import-overwrite').onclick = () => close('overwrite');
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
  });
}
