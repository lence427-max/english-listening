/**
 * Silentium — 段落工具模块
 * 段落拆分、时间估算、热力图计算、时间调整
 */

import { generateId } from './utils.js';

/**
 * 将文本拆分为段落
 * 优先用空行分割，否则按句子均匀拆成 4~8 段
 * @param {string} text - 原文
 * @returns {Array<{index: number, text: string, wordCount: number}>}
 */
export function splitParagraphs(text) {
  if (!text) return [];

  // 方案1：空行分割（兼容 Windows \r\n\r\n 和 Unix \n\n）
  const emptyLineParts = text.split(/\r?\n\s*\r?\n/).filter(p => p.trim());
  if (emptyLineParts.length >= 2) {
    return buildParagraphs(emptyLineParts);
  }

  // 方案2：按单行分割（BBC 录音稿等逐行格式）
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length >= 3) {
    // 将行分组为 4~8 个段落，每组最少 1 行
    const targetGroups = Math.min(8, Math.max(4, Math.ceil(lines.length / 3)));
    const perGroup = Math.ceil(lines.length / targetGroups);

    const groups = [];
    for (let i = 0; i < lines.length; i += perGroup) {
      groups.push(lines.slice(i, i + perGroup).join('\n'));
    }
    return buildParagraphs(groups);
  }

  // 方案3：按句子拆分，均匀分组成 4~8 段
  const sentences = splitSentences(text);
  const targetGroups = Math.min(8, Math.max(4, Math.ceil(sentences.length / 3)));
  const perGroup = Math.ceil(sentences.length / targetGroups);

  const groups = [];
  for (let i = 0; i < sentences.length; i += perGroup) {
    groups.push(sentences.slice(i, i + perGroup).join(' '));
  }
  return buildParagraphs(groups);
}

function buildParagraphs(groups) {
  return groups.map((t, i) => {
    const words = tokenize(t);
    return { index: i, text: t.trim(), wordCount: words.length };
  });
}

/**
 * 按句子拆分文本
 */
function splitSentences(text) {
  // 在句号、问号、感叹号后分割（保留标点在句尾）
  const raw = text.match(/[^.!?\n]+[.!?]*(\s|$)/g) || [text];
  return raw.map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * 分词
 */
function tokenize(text) {
  return (text || '').split(/\s+/).filter(w => w.length > 0);
}

/**
 * 估算每个段落的起止时间（基于词数比例）
 * @param {Array} paragraphs - splitParagraphs 的输出
 * @param {number} audioDuration - 音频总时长（秒）
 * @returns {Array} 带有 startTime/endTime 的段落数组
 */
export function estimateParagraphTimes(paragraphs, audioDuration) {
  if (!audioDuration || paragraphs.length === 0) return paragraphs;

  const totalWords = paragraphs.reduce((sum, p) => sum + p.wordCount, 0);
  if (totalWords === 0) return paragraphs;

  let offset = 0;
  for (const p of paragraphs) {
    const dur = (p.wordCount / totalWords) * audioDuration;
    p.startTime = Math.round(offset * 100) / 100;
    p.endTime = Math.round((offset + dur) * 100) / 100;
    offset += dur;
  }
  // 最后一段的 endTime 对齐到音频结尾
  if (paragraphs.length > 0) {
    paragraphs[paragraphs.length - 1].endTime = audioDuration;
  }

  return paragraphs;
}

/**
 * 计算每个段落的准确率（用于热力图）
 * 基于完整听写的 dictationResult.pairs，将词按位置分配到各段落
 * @param {string} originalText - 原文
 * @param {object} dictationResult - {pairs, stats, ...}
 * @param {number} audioDuration - 音频时长
 * @param {object} paragraphResults - 可选，段落重练记录 {[paraIndex]: {accuracy, ...}}
 * @returns {Array} 带有 accuracy/startTime/endTime 的段落数组
 */
export function calcParagraphHeatmap(originalText, dictationResult, audioDuration, paragraphResults = {}) {
  const paragraphs = splitParagraphs(originalText);
  if (!dictationResult || !dictationResult.pairs) {
    return estimateParagraphTimes(paragraphs, audioDuration);
  }

  const pairs = dictationResult.pairs;
  const nonExtraPairs = pairs.filter(p => p.errorType !== 'extra');

  let cursor = 0; // 当前在 nonExtraPairs 中的位置
  for (const para of paragraphs) {
    // 如果该段落有专门的段落重练结果，优先使用
    if (paragraphResults[para.index]) {
      para.accuracy = paragraphResults[para.index].accuracy;
      para.correct = paragraphResults[para.index].stats.correct;
      para.errors = paragraphResults[para.index].stats.missing +
                     paragraphResults[para.index].stats.replacement;
    } else {
      // 从完整听写结果中截取该段落的 pairs
      const paraPairs = nonExtraPairs.slice(cursor, cursor + para.wordCount);
      cursor += para.wordCount;

      const correct = paraPairs.filter(p => p.match).length;
      const missing = paraPairs.filter(p => p.errorType === 'missing').length;
      const replacement = paraPairs.filter(p => p.errorType === 'replacement').length;
      const denom = correct + missing + replacement;

      para.accuracy = denom > 0 ? Math.round((correct / denom) * 1000) / 10 : 100;
      para.correct = correct;
      para.errors = missing + replacement;
    }
  }

  return estimateParagraphTimes(paragraphs, audioDuration);
}

// ==================== 段落持久化与时间调整 ====================

/**
 * 获取或创建段落实体（优先使用已存储的段落数据）
 * @param {object} material
 * @returns {Array}
 */
export function getOrCreateParagraphs(material) {
  if (material.paragraphs && material.paragraphs.length > 0) {
    return material.paragraphs;
  }
  const paragraphs = splitParagraphs(material.originalText);
  // 给每段加上 id
  return paragraphs.map((p, i) => ({
    ...p,
    id: generateId(),
  }));
}

/**
 * 保存段落到 material 并持久化
 * @param {object} material
 * @param {Array} paragraphs
 * @param {Function} upsertFn — upsertMaterial
 */
export function saveParagraphs(material, paragraphs, upsertFn) {
  material.paragraphs = paragraphs;
  if (upsertFn) upsertFn(material);
}

/**
 * 调整某段落的起始时间（独立调整，不影响其他段落的时间）
 * @param {Array} paragraphs
 * @param {number} paraIndex
 * @param {number} deltaSeconds — 正数延后，负数提前
 */
export function adjustParagraphTime(paragraphs, paraIndex, deltaSeconds) {
  if (paraIndex < 0 || paraIndex >= paragraphs.length) return paragraphs;
  const para = paragraphs[paraIndex];
  const prevEnd = paraIndex > 0 ? (paragraphs[paraIndex - 1].endTime || 0) : 0;
  const newStart = Math.max(prevEnd, (para.startTime || 0) + deltaSeconds);
  // 不晚于自己的 endTime
  para.startTime = Math.min(newStart, para.endTime || newStart + 10);
  // 前一段的 endTime 对齐
  if (paraIndex > 0) {
    paragraphs[paraIndex - 1].endTime = para.startTime;
  }
  return paragraphs;
}

/**
 * 调整某段落的结束时间（独立调整，下一段 startTime 自动对齐）
 * @param {Array} paragraphs
 * @param {number} paraIndex
 * @param {number} deltaSeconds — 正数延后，负数提前
 */
export function adjustParagraphEndTime(paragraphs, paraIndex, deltaSeconds) {
  if (paraIndex < 0 || paraIndex >= paragraphs.length) return paragraphs;
  const para = paragraphs[paraIndex];
  const newEnd = Math.max((para.startTime || 0) + 1, (para.endTime || para.startTime + 10) + deltaSeconds);
  para.endTime = newEnd;

  // 后面所有段落整体平移
  for (let i = paraIndex + 1; i < paragraphs.length; i++) {
    const dur = (paragraphs[i].endTime || 0) - (paragraphs[i].startTime || 0);
    paragraphs[i].startTime = paragraphs[i - 1].endTime;
    paragraphs[i].endTime = paragraphs[i].startTime + dur;
  }
  return paragraphs;
}
