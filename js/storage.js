/**
 * Silentium — 数据存储模块
 * LocalStorage（元数据） + IndexedDB（音频 Blob）
 */

import { STORAGE_KEYS, DB_NAME, DB_VERSION, AUDIO_STORE } from './data-structure.js';

// ==================== LocalStorage 操作 ====================

/**
 * 从 LocalStorage 读取数据
 */
export function getItem(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error(`[Storage] 读取 ${key} 失败:`, e);
    return null;
  }
}

/**
 * 写入数据到 LocalStorage
 */
export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`[Storage] 写入 ${key} 失败:`, e);
    if (e.name === 'QuotaExceededError') {
      console.warn('[Storage] LocalStorage 容量已满');
    }
    return false;
  }
}

/**
 * 从 LocalStorage 删除数据
 */
export function removeItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error(`[Storage] 删除 ${key} 失败:`, e);
    return false;
  }
}

/**
 * 获取所有素材
 */
export function getMaterials() {
  return getItem(STORAGE_KEYS.MATERIALS) || [];
}

/**
 * 保存所有素材
 */
export function saveMaterials(materials) {
  return setItem(STORAGE_KEYS.MATERIALS, materials);
}

/**
 * 根据 ID 获取单个素材
 */
export function getMaterialById(id) {
  const materials = getMaterials();
  return materials.find(m => m.id === id) || null;
}

/**
 * 添加或更新素材
 */
export function upsertMaterial(material) {
  const materials = getMaterials();
  const idx = materials.findIndex(m => m.id === material.id);
  material.updatedAt = new Date().toISOString();
  if (idx >= 0) {
    materials[idx] = material;
  } else {
    materials.push(material);
  }
  saveMaterials(materials);
  return material;
}

/**
 * 删除素材
 */
export function deleteMaterial(id) {
  const materials = getMaterials().filter(m => m.id !== id);
  saveMaterials(materials);
  // 同时删除相关训练记录
  const records = getTrainingRecords().filter(r => r.materialId !== id);
  setItem(STORAGE_KEYS.TRAINING_RECORDS, records);
  // 同时删除相关生词
  const vocab = getVocabulary().filter(v => v.materialId !== id);
  setItem(STORAGE_KEYS.VOCABULARY, vocab);
}

/**
 * 获取所有训练记录
 */
export function getTrainingRecords() {
  return getItem(STORAGE_KEYS.TRAINING_RECORDS) || [];
}

/**
 * 获取某个素材的训练记录
 */
export function getTrainingRecordByMaterial(materialId, phase) {
  const records = getTrainingRecords();
  return records.find(r => r.materialId === materialId && r.phase === phase) || null;
}

/**
 * 保存训练记录
 */
export function saveTrainingRecord(record) {
  const records = getTrainingRecords();
  const idx = records.findIndex(r => r.id === record.id);
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.push(record);
  }
  setItem(STORAGE_KEYS.TRAINING_RECORDS, records);
  return record;
}

/**
 * 获取生词本
 */
export function getVocabulary() {
  return getItem(STORAGE_KEYS.VOCABULARY) || [];
}

/**
 * 保存生词本
 */
export function saveVocabulary(vocab) {
  return setItem(STORAGE_KEYS.VOCABULARY, vocab);
}

/**
 * 添加生词
 */
export function addVocabularyItem(item) {
  const vocab = getVocabulary();
  // 避免重复添加
  if (vocab.some(v => v.word.toLowerCase() === item.word.toLowerCase() && v.materialId === item.materialId)) {
    return null;
  }
  vocab.push(item);
  saveVocabulary(vocab);
  return item;
}

/**
 * 删除生词
 */
export function deleteVocabularyItem(id) {
  const vocab = getVocabulary().filter(v => v.id !== id);
  saveVocabulary(vocab);
}

/**
 * 获取设置
 */
export function getSettings() {
  return getItem(STORAGE_KEYS.SETTINGS) || null;
}

/**
 * 保存设置
 */
export function saveSettings(settings) {
  return setItem(STORAGE_KEYS.SETTINGS, settings);
}

// ==================== IndexedDB 操作 ====================

let dbPromise = null;

/**
 * 打开/初始化 IndexedDB
 */
export function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('[IndexedDB] 打开失败:', event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

/**
 * 保存音频文件到 IndexedDB
 * @param {string} id - 素材 ID
 * @param {Blob|File} blob - 音频数据
 * @param {string} fileName - 原始文件名
 */
export async function saveAudio(id, blob, fileName = '') {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    const store = tx.objectStore(AUDIO_STORE);
    const record = {
      id,
      blob,
      fileName,
      mimeType: blob.type || 'audio/mpeg',
      size: blob.size,
      createdAt: new Date().toISOString(),
    };
    const request = store.put(record);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 从 IndexedDB 读取音频 Blob
 * @param {string} id - 素材 ID
 * @returns {Promise<object|null>} { blob, fileName, mimeType }
 */
export async function getAudio(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE, 'readonly');
    const store = tx.objectStore(AUDIO_STORE);
    const request = store.get(id);
    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        resolve({
          blob: result.blob,
          fileName: result.fileName,
          mimeType: result.mimeType,
          size: result.size,
        });
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * 从 IndexedDB 删除音频
 * @param {string} id - 素材 ID
 */
export async function deleteAudio(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    const store = tx.objectStore(AUDIO_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 获取 IndexedDB 存储用量（估算）
 */
export async function getIDBSize() {
  try {
    const estimate = await navigator.storage?.estimate();
    if (estimate) {
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
  } catch (e) {
    console.warn('[Storage] 无法获取存储用量:', e);
  }
  return { usage: 0, quota: 0 };
}

// ==================== JSON 导入导出 ====================

/**
 * 导出所有数据为 JSON 字符串
 */
export function exportAllData() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    materials: getMaterials(),
    trainingRecords: getTrainingRecords(),
    vocabulary: getVocabulary(),
    settings: getSettings(),
  };
  return JSON.stringify(data, null, 2);
}

/**
 * 导入 JSON 数据
 * @param {string} jsonStr - JSON 字符串
 * @param {'merge'|'overwrite'} mode - 合并或覆盖
 */
export function importAllData(jsonStr, mode = 'merge') {
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('JSON 解析失败，请检查文件格式');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('无效的数据格式');
  }

  if (mode === 'overwrite') {
    // 覆盖模式：清空后写入
    localStorage.clear();
    if (data.materials) saveMaterials(data.materials);
    if (data.trainingRecords) setItem(STORAGE_KEYS.TRAINING_RECORDS, data.trainingRecords);
    if (data.vocabulary) saveVocabulary(data.vocabulary);
    if (data.settings) saveSettings(data.settings);
  } else {
    // 合并模式：按 ID 去重合并
    if (data.materials) {
      const existing = getMaterials();
      const existingIds = new Set(existing.map(m => m.id));
      const toAdd = data.materials.filter(m => !existingIds.has(m.id));
      saveMaterials([...existing, ...toAdd]);
    }
    if (data.trainingRecords) {
      const existing = getTrainingRecords();
      const existingIds = new Set(existing.map(r => r.id));
      const toAdd = data.trainingRecords.filter(r => !existingIds.has(r.id));
      setItem(STORAGE_KEYS.TRAINING_RECORDS, [...existing, ...toAdd]);
    }
    if (data.vocabulary) {
      const existing = getVocabulary();
      const existingIds = new Set(existing.map(v => v.id));
      const toAdd = data.vocabulary.filter(v => !existingIds.has(v.id));
      saveVocabulary([...existing, ...toAdd]);
    }
    if (data.settings && !getSettings()) {
      saveSettings(data.settings);
    }
  }
}

/**
 * 清理所有数据
 */
export async function clearAllData() {
  localStorage.clear();
  const db = await openDB();
  const tx = db.transaction(AUDIO_STORE, 'readwrite');
  const store = tx.objectStore(AUDIO_STORE);
  store.clear();
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve(true);
  });
}

// ==================== 连续学习天数 ====================

/**
 * 获取连续学习数据
 */
export function getStreakData() {
  const data = getItem(STORAGE_KEYS.STREAK);
  return data || { lastActiveDate: null, currentStreak: 0, longestStreak: 0 };
}

/**
 * 记录今日训练（在完成听写后调用）
 */
export function recordTrainingDay() {
  const streak = getStreakData();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  if (streak.lastActiveDate === today) {
    // 今天已经记录过
    return streak;
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (streak.lastActiveDate === yesterday) {
    // 连续
    streak.currentStreak++;
  } else if (!streak.lastActiveDate) {
    // 第一次
    streak.currentStreak = 1;
  } else {
    // 中断，重新开始
    streak.currentStreak = 1;
  }

  streak.lastActiveDate = today;
  if (streak.currentStreak > streak.longestStreak) {
    streak.longestStreak = streak.currentStreak;
  }

  setItem(STORAGE_KEYS.STREAK, streak);
  return streak;
}
