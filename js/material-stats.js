export function countMaterialsNeedingReview(materials, records) {
  const materialIds = new Set(materials.map(material => material.id));
  const reviewMaterialIds = new Set();

  for (const record of records) {
    if (record.reviewStatus === 'need_review' && materialIds.has(record.materialId)) {
      reviewMaterialIds.add(record.materialId);
    }
  }

  return reviewMaterialIds.size;
}
