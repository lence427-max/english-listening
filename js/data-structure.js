/**
 * Silentium — 数据结构定义与校验
 */

import { generateId } from './utils.js';

// ==================== 默认值工厂函数 ====================

/**
 * 创建新素材对象
 */
export function createMaterial(data = {}) {
  return {
    id: data.id || generateId(),
    title: data.title || '',
    originalText: data.originalText || '',
    audioId: data.audioId || '',
    audioFileName: data.audioFileName || '',
    audioDuration: data.audioDuration || 0,
    audioAvailable: data.audioAvailable ?? Boolean(data.audioId),
    sourceUrl: data.sourceUrl || '',
    sentences: data.sentences || [],
    paragraphs: data.paragraphs || [],                // [{id, index, text, startTime, endTime, wordCount}]
    dictationInput: data.dictationInput || '',       // 整篇听写输入
    dictationResult: data.dictationResult || null,    // 对比结果 {pairs, stats, accuracy, grade, createdAt}
    scoreHistory: data.scoreHistory || [],             // [{accuracy, grade, stats, createdAt}] 最多20条
    paragraphResults: data.paragraphResults || {},      // {[paraIndex]: {pairs, stats, accuracy, grade, createdAt}}
    status: data.status || 'pending',                 // pending | dictating | completed
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

/**
 * 创建新句子对象
 */
export function createSentence(data = {}) {
  return {
    id: data.id || generateId(),
    index: data.index ?? 0,
    text: data.text || '',
    startTime: data.startTime ?? 0,
    endTime: data.endTime ?? 0,
    hintUsed: data.hintUsed ?? 0,
    dictationInput: data.dictationInput || '',
    dictationResult: data.dictationResult || null,
    isDifficult: data.isDifficult || false,
    notes: data.notes || '',
    recordings: data.recordings || [],
    matchScore: data.matchScore ?? 0,
    reciteDone: data.reciteDone || false,
  };
}

/**
 * 创建训练记录
 */
export function createTrainingRecord(materialId, phase) {
  return {
    id: generateId(),
    materialId,
    phase,                             // dictation | reading | reciting
    completedAt: new Date().toISOString(),
    totalSentences: 0,
    errorCount: 0,
    hintTotalCount: 0,
    difficultSentences: [],
    notes: '',
    reviewStatus: 'need_review',       // mastered | need_review | strengthen
    nextReviewDate: '',
  };
}

/**
 * 创建生词条目
 */
export function createVocabularyItem(data = {}) {
  return {
    id: data.id || generateId(),
    word: data.word || '',
    phonetic: data.phonetic || '',
    partOfSpeech: data.partOfSpeech || '',
    definition: data.definition || '',
    materialId: data.materialId || '',
    sentenceId: data.sentenceId || '',
    addedAt: data.addedAt || new Date().toISOString(),
  };
}

/**
 * 创建设置对象
 */
export function createSettings(data = {}) {
  return {
    theme: data.theme || 'system',
    playbackRate: data.playbackRate ?? 1,
    focusDuration: data.focusDuration ?? 25,
    autoPauseBetweenSentences: data.autoPauseBetweenSentences ?? true,
    pauseDuration: data.pauseDuration ?? 2,
  };
}

// ==================== 校验函数 ====================

const REQUIRED_MATERIAL_FIELDS = ['id', 'title', 'status'];
const VALID_STATUSES = ['pending', 'dictating', 'completed'];
const VALID_REVIEW_STATUSES = ['mastered', 'need_review', 'strengthen'];
const VALID_PHASES = ['dictation', 'reading', 'reciting'];

/**
 * 校验素材对象
 */
export function validateMaterial(material) {
  const errors = [];
  if (!material || typeof material !== 'object') {
    return ['素材数据无效'];
  }
  for (const field of REQUIRED_MATERIAL_FIELDS) {
    if (!(field in material)) {
      errors.push(`缺少必要字段: ${field}`);
    }
  }
  if (material.status && !VALID_STATUSES.includes(material.status)) {
    errors.push(`无效状态: ${material.status}`);
  }
  if (material.sentences && !Array.isArray(material.sentences)) {
    errors.push('sentences 必须是数组');
  }
  return errors;
}

/**
 * 校验 JSON 导入数据
 */
export function validateImportData(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return ['导入数据必须是一个 JSON 对象'];
  }

  // 校验 materials
  if (data.materials !== undefined) {
    if (!Array.isArray(data.materials)) {
      errors.push('materials 必须是数组');
    } else {
      data.materials.forEach((m, i) => {
        const e = validateMaterial(m);
        if (e.length > 0) {
          errors.push(`素材[${i}]: ${e.join('; ')}`);
        }
      });
    }
  }

  // 校验 trainingRecords
  if (data.trainingRecords !== undefined && !Array.isArray(data.trainingRecords)) {
    errors.push('trainingRecords 必须是数组');
  }

  // 校验 vocabulary
  if (data.vocabulary !== undefined && !Array.isArray(data.vocabulary)) {
    errors.push('vocabulary 必须是数组');
  }

  return errors;
}

/**
 * 拒绝包含危险内容的 JSON（script 标签等）
 */
export function isSafeJSON(str) {
  // 检查是否包含可能的脚本注入
  const dangerous = /<script[\s>]|javascript\s*:|on\w+\s*=/i;
  return !dangerous.test(str);
}

// ==================== 存储键常量 ====================

export const STORAGE_KEYS = {
  MATERIALS: 'materials',
  TRAINING_RECORDS: 'trainingRecords',
  VOCABULARY: 'vocabulary',
  SETTINGS: 'settings',
  FOCUS_SESSIONS: 'focusSessions',
  STREAK: 'streakData',
};

export const DB_NAME = 'EnglishListeningDB';
export const DB_VERSION = 1;
export const AUDIO_STORE = 'audioFiles';
