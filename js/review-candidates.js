function countResultErrors(result) {
  if (result?.stats) {
    return (result.stats.missing || 0) +
      (result.stats.extra || 0) +
      (result.stats.replacement || 0);
  }
  return (result?.pairs || []).filter(pair => !pair.match).length;
}

export function collectReviewCandidates(materials, records) {
  const materialById = new Map(materials.map(material => [material.id, material]));
  const candidates = [];

  for (const record of records) {
    if (record.reviewStatus !== 'need_review') continue;
    const material = materialById.get(record.materialId);
    if (!material) continue;

    const paragraphEntries = Object.entries(material.paragraphResults || {});
    if (paragraphEntries.length > 0) {
      for (const [index, result] of paragraphEntries) {
        const paragraph = material.paragraphs?.[Number(index)];
        if (!paragraph?.text || !result) continue;
        candidates.push({
          materialId: material.id,
          materialTitle: material.title,
          text: paragraph.text,
          result,
          errorCount: countResultErrors(result),
        });
      }
      continue;
    }

    const legacySentences = (material.sentences || []).filter(sentence => sentence.dictationResult);
    if (legacySentences.length > 0) {
      for (const sentence of legacySentences) {
        candidates.push({
          materialId: material.id,
          materialTitle: material.title,
          text: sentence.text,
          result: sentence.dictationResult,
          errorCount: countResultErrors(sentence.dictationResult),
        });
      }
      continue;
    }

    if (material.originalText && material.dictationResult) {
      candidates.push({
        materialId: material.id,
        materialTitle: material.title,
        text: material.originalText,
        result: material.dictationResult,
        errorCount: countResultErrors(material.dictationResult),
      });
    }
  }

  return candidates;
}
