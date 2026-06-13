import { generateId } from './utils.js';

function countErrors(stats = {}) {
  return (stats.missing || 0) + (stats.extra || 0) + (stats.replacement || 0);
}

function nextDay(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + 1);
  return date.toISOString();
}

export function applyCompletedDictation(material, input, diff, completedAt = new Date().toISOString()) {
  material.dictationInput = input;
  material.dictationResult = {
    pairs: diff.pairs,
    stats: diff.stats,
    accuracy: diff.accuracy,
    grade: diff.grade,
    createdAt: completedAt,
  };
  material.status = 'completed';

  material.scoreHistory = material.scoreHistory || [];
  material.scoreHistory.push({
    accuracy: diff.accuracy,
    grade: diff.grade,
    stats: diff.stats,
    createdAt: completedAt,
  });
  material.scoreHistory = material.scoreHistory.slice(-20);

  return material;
}

export function buildDictationReviewRecord(
  records,
  materialId,
  diff,
  { completedAt = new Date().toISOString(), idFactory = generateId } = {}
) {
  const existing = records.find(record =>
    record.materialId === materialId && record.phase === 'dictation'
  );

  return {
    id: existing?.id || idFactory(),
    materialId,
    phase: 'dictation',
    completedAt,
    totalSentences: 1,
    errorCount: countErrors(diff.stats),
    hintTotalCount: existing?.hintTotalCount || 0,
    difficultSentences: existing?.difficultSentences || [],
    notes: existing?.notes || '',
    reviewStatus: 'need_review',
    nextReviewDate: nextDay(completedAt),
  };
}
