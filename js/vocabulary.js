/**
 * 十篇精听工坊 — 生词本模块
 */

import { getVocabulary, deleteVocabularyItem, getMaterials } from './storage.js';
import { sanitizeHTML, showToast, confirmDialog, formatDateCN } from './utils.js';
import { lookupWord } from './dictionary.js';

/**
 * 渲染生词本视图
 */
export function renderVocabularyView(container) {
  const vocab = getVocabulary();
  const materials = getMaterials();
  const materialMap = new Map(materials.map(m => [m.id, m]));

  // 按素材分组
  const grouped = groupByMaterial(vocab, materialMap);

  container.innerHTML = `
    <div class="vocabulary-view">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold">生词本</h1>
          <p class="text-sm mt-1" style="color: var(--text-secondary);">
            ${vocab.length} 个生词 · 按素材分类
          </p>
        </div>
        ${vocab.length > 0 ? `
          <button class="btn btn-secondary btn-sm" id="vocab-export-btn">
            <i class="fa-solid fa-file-export"></i> 导出生词
          </button>
        ` : ''}
      </div>

      ${vocab.length === 0 ? `
        <div class="empty-state">
          <i class="fa-solid fa-book"></i>
          <h3>生词本为空</h3>
          <p>在听写或精读时双击单词查询，然后点击「加入生词本」</p>
        </div>
      ` : `
        <div class="space-y-6">
          ${Object.entries(grouped).map(([materialId, words]) => {
            const mat = materialMap.get(materialId);
            return `
              <div class="card">
                <div class="card-header">
                  <h3 class="font-semibold text-sm">
                    <i class="fa-solid fa-folder"></i>
                    ${mat ? sanitizeHTML(mat.title) : '未分类'}
                  </h3>
                  <span class="badge badge-info">${words.length} 词</span>
                </div>
                <div class="card-body">
                  <div class="vocab-grid">
                    ${words.map(v => renderVocabCard(v)).join('')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;

  bindEvents(container, vocab);
}

function groupByMaterial(vocab, materialMap) {
  const grouped = {};
  for (const item of vocab) {
    const key = item.materialId || '__uncategorized';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }
  // 保持分组顺序
  return grouped;
}

function renderVocabCard(item) {
  return `
    <div class="vocab-card" data-id="${item.id}">
      <div class="vocab-card-main">
        <div class="vocab-word">${sanitizeHTML(item.word)}</div>
        ${item.phonetic ? `<div class="vocab-phonetic">/${sanitizeHTML(item.phonetic)}/</div>` : ''}
        ${item.partOfSpeech ? `<span class="badge vocab-pos">${sanitizeHTML(item.partOfSpeech)}</span>` : ''}
      </div>
      ${item.definition ? `
        <div class="vocab-definition">${sanitizeHTML(item.definition)}</div>
      ` : ''}
      <div class="vocab-card-actions">
        <button class="btn btn-ghost btn-sm vocab-lookup-btn" data-word="${sanitizeHTML(item.word)}">
          <i class="fa-solid fa-magnifying-glass"></i>
        </button>
        <button class="btn btn-ghost btn-sm vocab-delete-btn" data-id="${item.id}" style="color: var(--danger);">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  `;
}

function bindEvents(container, vocab) {
  // 查词
  container.querySelectorAll('.vocab-lookup-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const word = btn.dataset.word;
      const rect = btn.getBoundingClientRect();
      lookupWord(word, rect.left, rect.bottom + 5);
    });
  });

  // 删除
  container.querySelectorAll('.vocab-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const item = vocab.find(v => v.id === id);
      const confirmed = await confirmDialog(
        '删除生词',
        `确定删除 "${item?.word}" 吗？`,
        '删除',
        true
      );
      if (confirmed) {
        deleteVocabularyItem(id);
        showToast('生词已删除', 'success');
        renderVocabularyView(container);
      }
    });
  });

  // 导出
  container.querySelector('#vocab-export-btn')?.addEventListener('click', () => {
    exportVocabulary(vocab);
  });
}

function exportVocabulary(vocab) {
  // 整理为按素材分组的文本
  const materials = getMaterials();
  const materialMap = new Map(materials.map(m => [m.id, m]));
  const grouped = groupByMaterial(vocab, materialMap);

  let text = '# 十篇精听工坊 — 生词本导出\n';
  text += `# 导出时间: ${new Date().toISOString().split('T')[0]}\n\n`;

  for (const [materialId, words] of Object.entries(grouped)) {
    const mat = materialMap.get(materialId);
    text += `## ${mat?.title || '未分类'}\n\n`;
    text += `| 单词 | 音标 | 词性 | 释义 |\n`;
    text += `|------|------|------|------|\n`;
    for (const w of words) {
      text += `| ${w.word} | ${w.phonetic || '—'} | ${w.partOfSpeech || '—'} | ${w.definition || '—'} |\n`;
    }
    text += '\n';
  }

  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vocabulary-${new Date().toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('生词已导出为 Markdown 文件', 'success');
}
