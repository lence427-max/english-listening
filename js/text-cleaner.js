/**
 * 十篇精听工坊 — 原文智能清洗
 * 自动去除 BBC/VOA 等广播稿中的格式噪音
 */

/**
 * 清洗原文，去除常见格式噪音
 * @param {string} text - 原始文本
 * @returns {string} - 清洗后的纯脚本
 */
export function cleanTranscript(text) {
  if (!text) return '';

  let cleaned = text;

  // 1. 按行处理
  const lines = cleaned.split('\n');
  const filtered = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // 跳过纯页码行
    if (/^Page\s+\d+\s+of\s+\d+$/i.test(line)) continue;

    // 跳过纯版权/网站行
    if (/^©\s*British Broadcasting Corporation/i.test(line)) continue;
    if (/^bbclearningenglish\.com/i.test(line)) continue;
    if (/^\d+\s*Minute English\s*©/i.test(line)) continue;
    if (/^BBC LEARNING ENGLISH$/i.test(line)) continue;
    if (/^6 Minute English$/i.test(line)) continue;
    if (/This is not a word-for-word transcript/i.test(line)) continue;

    // 跳过词汇表标题和分隔
    if (/^VOCABULARY$/i.test(line)) continue;
    if (/^vocabulary$/i.test(line)) continue;

    // 移除方括号内容标记 [Music], [Applause], [Laughter] 等
    line = line.replace(/\[.*?\]/g, '').trim();
    if (!line) continue;

    // 移除行首说话人标签（如 "Neil", "Pippa:", "Maria "）
    // 保留常见的说话人模式
    line = line.replace(/^(Neil|Pippa|Beth|Phil|Georgie|Feifei|Rob|Sam|Finn|Catherine|Dan|Alice|Sophie|Tim|James|Callum|Jennifer)\s*:?\s*/i, '');
    // 通用：单个大写单词开头 + 冒号
    line = line.replace(/^[A-Z][a-z]+\s*:\s*/, '');

    line = line.trim();
    if (!line) continue;

    // 移除连在一起的版权信息（如 "6 Minute English ©British Broadcasting Corporation 2026 bbclearningenglish.com Page 1 of 5"）
    line = line.replace(/©British Broadcasting Corporation\s*\d{4}\s*bbclearningenglish\.com\s*Page\s*\d+\s*of\s*\d+/gi, '');
    line = line.replace(/6 Minute English\s*©British Broadcasting Corporation\s*\d{4}/gi, '');
    line = line.replace(/bbclearningenglish\.com\s*Page\s*\d+\s*of\s*\d+/gi, '');

    line = line.trim();
    if (!line) continue;

    filtered.push(line);
  }

  cleaned = filtered.join('\n');

  // 2. 全局清理
  // 移除多余空白（3个以上换行 → 2个换行）
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  // 移除行内多余空格
  cleaned = cleaned.replace(/ {2,}/g, ' ');

  return cleaned;
}

/**
 * 展示清洗前后的对比
 * @returns {{ original: number, cleaned: number, removed: string[] }}
 */
export function getCleanReport(original, cleaned) {
  const origLines = original.split('\n').filter(l => l.trim());
  const cleanLines = cleaned.split('\n').filter(l => l.trim());
  const removed = origLines.filter(l => {
    const trimmed = l.trim();
    return trimmed && !cleanLines.includes(trimmed);
  });

  return {
    originalLines: origLines.length,
    cleanedLines: cleanLines.length,
    removedCount: removed.length,
    removed: removed.slice(0, 10), // 最多显示10条被移除的行
  };
}
