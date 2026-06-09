/**
 * Silentium — 增强词级对比引擎
 * LCS 词对齐 + 3类错误（missing / extra / replacement）
 */

/**
 * 分词：按空白分割，保留单词
 */
function tokenize(text) {
  if (!text) return [];
  return text.split(/\s+/).filter(w => w.length > 0);
}

/**
 * 标准化用于比较（忽略大小写、标点）
 */
function normalize(w) {
  return w.toLowerCase().replace(/[^a-z0-9']/g, '');
}

/**
 * 增强词级对比
 * @param {string} originalText - 原文
 * @param {string} userInput - 用户输入
 * @returns {{ pairs, stats, accuracy, grade }}
 */
export function enhancedDiff(originalText, userInput) {
  const origWords = tokenize(originalText);
  const userWords = tokenize(userInput);

  const n = origWords.length;
  const m = userWords.length;

  // ============ LCS DP ============
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (normalize(origWords[i - 1]) === normalize(userWords[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // ============ 回溯 ============
  const matches = new Set(); // "i,j" strings for matched pairs
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (normalize(origWords[i - 1]) === normalize(userWords[j - 1])) {
      matches.add(`${i - 1},${j - 1}`);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  // 构建匹配对 Map：origIdx → userIdx
  const matchMap = new Map(); // origIdx → userIdx
  for (const key of matches) {
    const [oi, uj] = key.split(',').map(Number);
    matchMap.set(oi, uj);
  }

  const matchedOrig = new Set(matchMap.keys());
  const matchedUser = new Set(matchMap.values());

  // 收集 missing 和 extra
  const missingList = []; // [{origIdx, word}]
  for (let k = 0; k < n; k++) {
    if (!matchedOrig.has(k)) {
      missingList.push({ origIdx: k, word: origWords[k] });
    }
  }

  const extraList = []; // [{userIdx, word}]
  for (let k = 0; k < m; k++) {
    if (!matchedUser.has(k)) {
      extraList.push({ userIdx: k, word: userWords[k] });
    }
  }

  // 后处理：按顺序配对 missing + extra → replacement
  const mergeCount = Math.min(missingList.length, extraList.length);
  const replacementMap = new Map(); // origIdx → userIdx
  const replacementOrigSet = new Set();
  const replacementUserSet = new Set();

  for (let k = 0; k < mergeCount; k++) {
    const oi = missingList[k].origIdx;
    const uj = extraList[k].userIdx;
    replacementMap.set(oi, uj);
    replacementOrigSet.add(oi);
    replacementUserSet.add(uj);
  }

  // ============ 按原文顺序输出最终 pairs ============
  const pairs = [];

  for (let oi = 0; oi < n; oi++) {
    if (matchMap.has(oi)) {
      // LCS 匹配
      const uj = matchMap.get(oi);
      pairs.push({
        word: origWords[oi],
        userWord: userWords[uj],
        match: true,
        errorType: null,
      });
    } else if (replacementMap.has(oi)) {
      // 合并为 replacement
      const uj = replacementMap.get(oi);
      pairs.push({
        word: origWords[oi],
        userWord: userWords[uj],
        match: false,
        errorType: 'replacement',
      });
    } else {
      // 漏词
      pairs.push({
        word: origWords[oi],
        userWord: null,
        match: false,
        errorType: 'missing',
      });
    }
  }

  // 剩余的 extra（未被合并的）
  for (let uj = 0; uj < m; uj++) {
    if (!matchedUser.has(uj) && !replacementUserSet.has(uj)) {
      pairs.push({
        word: userWords[uj],
        userWord: userWords[uj],
        match: false,
        errorType: 'extra',
      });
    }
  }

  // ============ 统计 ============
  let correct = 0, missing = 0, extra = 0, replacement = 0;
  for (const p of pairs) {
    if (p.match) correct++;
    else if (p.errorType === 'missing') missing++;
    else if (p.errorType === 'extra') extra++;
    else if (p.errorType === 'replacement') replacement++;
  }

  const stats = { total: n, correct, missing, extra, replacement };

  // ============ 准确率（保留一位小数） ============
  // accuracy = correct / (correct + missing + replacement)
  // extra 不参与分母
  const denominator = correct + missing + replacement;
  const accuracy = denominator > 0 ? Math.round((correct / denominator) * 1000) / 10 : 0;

  // ============ 等级 ============
  const grade = calcGrade(accuracy);

  return { pairs, stats, accuracy, grade };
}

/**
 * 计算等级
 * 90+ A, 80+ B, 70+ C, 60+ D, <60 E
 */
function calcGrade(accuracy) {
  if (accuracy >= 90) return 'A';
  if (accuracy >= 80) return 'B';
  if (accuracy >= 70) return 'C';
  if (accuracy >= 60) return 'D';
  return 'E';
}

/**
 * 用于渲染对比结果的工具函数：计算逐词错误类型 CSS class
 */
export function getDiffClass(errorType, match) {
  if (match) return 'fb-correct';
  if (errorType === 'missing') return 'fb-missing';
  if (errorType === 'extra') return 'fb-extra';
  if (errorType === 'replacement') return 'fb-replacement';
  return '';
}

/**
 * 获取错误类型的显示标签
 */
export function getErrorLabel(errorType) {
  switch (errorType) {
    case 'missing': return '漏词';
    case 'extra': return '多词';
    case 'replacement': return '替换';
    default: return '';
  }
}
