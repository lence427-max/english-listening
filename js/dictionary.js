/**
 * 十篇精听工坊 — 在线词典模块
 * 主 API：Free Dictionary API，备用：Datamuse API
 */

import { sanitizeHTML, showToast } from './utils.js';
import { addVocabularyItem } from './storage.js';
import { createVocabularyItem } from './data-structure.js';

const PRIMARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const FALLBACK_API = 'https://api.datamuse.com/words';
const TIMEOUT = 3000;

let popupEl = null;
const initializedContainers = new WeakSet();

/**
 * 初始化词典功能：为容器内的单词绑定事件（每个容器只初始化一次）
 */
export function initDictionary(container) {
  if (!container || initializedContainers.has(container)) return;
  initializedContainers.add(container);

  // 使用事件委托处理单词点击
  container.addEventListener('dblclick', (e) => {
    const word = getWordAtPoint(e);
    if (word && word.length > 1) {
      lookupWord(word, e.clientX, e.clientY);
    }
  });

  // 在对比结果区域的单词上 hover 显示小手
  container.addEventListener('mouseover', (e) => {
    const word = getWordAtPoint(e);
    if (word && word.length > 1) {
      e.target.style.cursor = 'pointer';
      e.target.title = '双击查词';
    }
  });
}

/**
 * 获取点击位置的单词
 */
function getWordAtPoint(e) {
  // 如果是文本节点，获取单词
  const selection = window.getSelection();
  const range = document.caretRangeFromPoint(e.clientX, e.clientY);
  if (!range) return null;

  // 扩展 range 到完整单词
  const textNode = range.startContainer;
  if (textNode.nodeType !== Node.TEXT_NODE) return null;

  const text = textNode.textContent;
  let start = range.startOffset;
  let end = range.startOffset;

  while (start > 0 && /[a-zA-Z']/.test(text[start - 1])) start--;
  while (end < text.length && /[a-zA-Z']/.test(text[end])) end++;

  const word = text.substring(start, end).trim();
  return word || null;
}

/**
 * 查询单词
 */
export async function lookupWord(word, x, y) {
  removePopup();

  // 显示加载状态
  showPopup(x, y, 'loading', word);

  try {
    const result = await fetchWithTimeout(PRIMARY_API + encodeURIComponent(word), TIMEOUT);
    if (result && result.length > 0) {
      renderDictionaryResult(result, word);
      return;
    }
  } catch (e) {
    // 主 API 失败，尝试备用
    console.warn('[Dictionary] 主 API 失败，尝试备用:', e.message);
  }

  try {
    const fallback = await fetchFallbackAPI(word);
    if (fallback) {
      renderFallbackResult(fallback, word);
      return;
    }
  } catch (e) {
    console.warn('[Dictionary] 备用 API 也失败:', e.message);
  }

  showPopup(x, y, 'error', word);
}

function fetchWithTimeout(url, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeout);
    fetch(url)
      .then(res => {
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(resolve)
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function fetchFallbackAPI(word) {
  const url = `${FALLBACK_API}?sp=${encodeURIComponent(word)}&md=d&max=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function renderDictionaryResult(data, word) {
  const entry = data[0];
  const wordData = {
    word: entry.word || word,
    phonetic: entry.phonetic || (entry.phonetics && entry.phonetics[0]?.text) || '',
    meanings: entry.meanings || [],
    phonetics: entry.phonetics || [],
  };

  const html = `
    <div class="dict-popup-content">
      <div class="dict-popup-header">
        <div>
          <strong class="dict-word">${sanitizeHTML(wordData.word)}</strong>
          ${wordData.phonetic ? `<span class="dict-phonetic">/${sanitizeHTML(wordData.phonetic)}/</span>` : ''}
        </div>
        ${wordData.phonetics.find(p => p.audio) ? `
          <button class="btn btn-ghost btn-sm dict-audio-btn" data-audio="${sanitizeHTML(wordData.phonetics.find(p => p.audio).audio)}">
            <i class="fa-solid fa-volume-high"></i>
          </button>
        ` : ''}
      </div>
      <div class="dict-meanings">
        ${wordData.meanings.slice(0, 3).map(m => `
          <div class="dict-meaning">
            <span class="badge badge-info dict-pos">${sanitizeHTML(m.partOfSpeech)}</span>
            <ul class="dict-defs">
              ${m.definitions.slice(0, 3).map(d => `
                <li>
                  ${sanitizeHTML(d.definition)}
                  ${d.example ? `<div class="dict-example">"${sanitizeHTML(d.example)}"</div>` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
      <div class="dict-popup-footer">
        <button class="btn btn-ghost btn-sm dict-add-vocab">
          <i class="fa-solid fa-bookmark"></i> 加入生词本
        </button>
      </div>
    </div>
  `;

  if (popupEl) updatePopupContent(html, wordData);
  bindAudioBtn();
  bindAddVocabBtn(wordData);
}

function renderFallbackResult(data, word) {
  const item = data[0];
  const html = `
    <div class="dict-popup-content">
      <div class="dict-popup-header">
        <strong class="dict-word">${sanitizeHTML(item?.word || word)}</strong>
        <span class="text-xs" style="color: var(--text-tertiary);">(备用数据源)</span>
      </div>
      <div class="dict-meanings">
        ${item?.tags ? `
          <div class="dict-meaning">
            <span class="badge badge-info dict-pos">${sanitizeHTML(item.tags.slice(0, 3).join(', '))}</span>
          </div>
        ` : ''}
        ${item?.defs ? `
          <ul class="dict-defs">
            ${item.defs.slice(0, 3).map(d => `<li>${sanitizeHTML(d)}</li>`).join('')}
          </ul>
        ` : '<p class="text-sm" style="color: var(--text-secondary);">仅限基本信息</p>'}
      </div>
      <div class="dict-popup-footer">
        <button class="btn btn-ghost btn-sm dict-add-vocab">
          <i class="fa-solid fa-bookmark"></i> 加入生词本
        </button>
      </div>
    </div>
  `;

  if (popupEl) updatePopupContent(html, { word });
  bindAddVocabBtn({ word });
}

// ==================== 弹出窗管理 ====================

function showPopup(x, y, state, word) {
  removePopup();

  popupEl = document.createElement('div');
  popupEl.className = 'dict-popup';
  popupEl.style.cssText = `
    position: fixed;
    z-index: 300;
    left: ${Math.min(x, window.innerWidth - 320)}px;
    top: ${Math.min(y, window.innerHeight - 300)}px;
    width: 300px;
    max-height: 350px;
  `;

  if (state === 'loading') {
    popupEl.innerHTML = `
      <div class="dict-popup-loading">
        <i class="fa-solid fa-spinner fa-spin"></i> 查询 "${sanitizeHTML(word)}" ...
      </div>
    `;
  } else if (state === 'error') {
    popupEl.innerHTML = `
      <div class="dict-popup-error">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>词典暂不可用</p>
        <p class="text-xs" style="color: var(--text-tertiary);">"${sanitizeHTML(word)}"</p>
      </div>
    `;
  }

  document.body.appendChild(popupEl);

  // 点击外部关闭
  setTimeout(() => {
    document.addEventListener('click', closePopupOnClickOutside);
  }, 0);
}

function updatePopupContent(html, wordData) {
  if (!popupEl) return;
  popupEl.innerHTML = html;
  popupEl.dataset.word = wordData.word;
  popupEl.dataset.phonetic = wordData.phonetic || '';

  // 调整位置确保不超出屏幕
  const rect = popupEl.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    popupEl.style.left = `${window.innerWidth - rect.width - 10}px`;
  }
  if (rect.bottom > window.innerHeight) {
    popupEl.style.top = `${window.innerHeight - rect.height - 10}px`;
  }
}

function closePopupOnClickOutside(e) {
  if (popupEl && !popupEl.contains(e.target)) {
    removePopup();
  }
}

function removePopup() {
  if (popupEl) {
    popupEl.remove();
    popupEl = null;
  }
  document.removeEventListener('click', closePopupOnClickOutside);
}

// ==================== 交互绑定 ====================

function bindAudioBtn() {
  const btn = popupEl?.querySelector('.dict-audio-btn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const audio = new Audio(btn.dataset.audio);
      audio.play().catch(() => showToast('发音播放失败', 'warning'));
    });
  }
}

function bindAddVocabBtn(wordData) {
  const btn = popupEl?.querySelector('.dict-add-vocab');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = createVocabularyItem({
        word: wordData.word,
        phonetic: wordData.phonetic || '',
        partOfSpeech: wordData.meanings?.[0]?.partOfSpeech || '',
        definition: wordData.meanings?.[0]?.definitions?.[0]?.definition || '',
      });
      const result = addVocabularyItem(item);
      if (result) {
        showToast(`"${wordData.word}" 已加入生词本`, 'success');
      } else {
        showToast(`"${wordData.word}" 已在生词本中`, 'info');
      }
      removePopup();
    });
  }
}

/**
 * 清理
 */
export function destroyDictionary() {
  removePopup();
}
