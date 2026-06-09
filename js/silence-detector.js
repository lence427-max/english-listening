/**
 * 十篇精听工坊 — 音频静音检测 + 自动分句时间戳匹配
 *
 * 原理：
 * 1. 用 Web Audio API 将音频解码为 PCM 原始数据
 * 2. 计算短时窗口 RMS 能量
 * 3. 找到持续低能量的区间 → 句子边界
 * 4. 将句子数与检测到的段落数对齐
 */

/**
 * 从音频 Blob 检测静音段落边界
 *
 * @param {Blob} audioBlob - 音频文件
 * @param {object} options
 *   - silenceThreshold: 低于最大RMS的百分比视为静音（默认 0.08 = 8%）
 *   - minSilenceDuration: 最短静音时长（秒），默认 0.35
 *   - minSegmentDuration: 最短有效段落（秒），默认 0.5
 *   - windowSize: 分析窗口大小（秒），默认 0.05
 * @returns {Promise<Array<{start: number, end: number}>>} 检测到的有声段落
 */
export async function detectSpeechSegments(audioBlob, options = {}) {
  const {
    silenceThreshold = 0.08,
    minSilenceDuration = 0.35,
    minSegmentDuration = 0.5,
    windowSize = 0.05,
  } = options;

  // 1. 解码音频
  const audioBuffer = await decodeAudio(audioBlob);
  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;

  // 2. 获取单声道 PCM 数据
  const pcmData = getMonoData(audioBuffer);
  const totalSamples = pcmData.length;

  // 3. 计算窗口 RMS 能量
  const windowSamples = Math.floor(windowSize * sampleRate);
  const numWindows = Math.floor(totalSamples / windowSamples);
  const rmsValues = new Float32Array(numWindows);

  for (let i = 0; i < numWindows; i++) {
    const start = i * windowSamples;
    let sumSq = 0;
    for (let j = 0; j < windowSamples; j++) {
      sumSq += pcmData[start + j] * pcmData[start + j];
    }
    rmsValues[i] = Math.sqrt(sumSq / windowSamples);
  }

  // 4. 计算自适应阈值
  const maxRMS = findMax(rmsValues);
  const threshold = maxRMS * silenceThreshold;

  // 防止绝对静音文件的极端情况
  const absoluteMinThreshold = 0.001;
  const effectiveThreshold = Math.max(threshold, absoluteMinThreshold);

  // 5. 标记每个窗口是否为静音
  const isSilence = new Array(numWindows);
  for (let i = 0; i < numWindows; i++) {
    isSilence[i] = rmsValues[i] < effectiveThreshold;
  }

  // 6. 找到静音区间（连续静音窗口）
  const minSilenceWindows = Math.floor(minSilenceDuration / windowSize);
  const silenceGaps = [];

  let silenceStart = -1;
  for (let i = 0; i < numWindows; i++) {
    if (isSilence[i]) {
      if (silenceStart === -1) silenceStart = i;
    } else {
      if (silenceStart !== -1) {
        const silenceLength = i - silenceStart;
        if (silenceLength >= minSilenceWindows) {
          silenceGaps.push({
            startTime: (silenceStart * windowSamples) / sampleRate,
            endTime: (i * windowSamples) / sampleRate,
            duration: (silenceLength * windowSamples) / sampleRate,
          });
        }
        silenceStart = -1;
      }
    }
  }
  // 处理末尾的静音
  if (silenceStart !== -1) {
    const silenceLength = numWindows - silenceStart;
    if (silenceLength >= minSilenceWindows) {
      silenceGaps.push({
        startTime: (silenceStart * windowSamples) / sampleRate,
        endTime: duration,
        duration: (silenceLength * windowSamples) / sampleRate,
      });
    }
  }

  // 7. 从静音间隙推导有声段落
  const minSegmentSamples = minSegmentDuration * sampleRate;
  const segments = [];
  let segStart = 0;

  for (const gap of silenceGaps) {
    const segEnd = gap.startTime;
    if (segEnd - segStart >= minSegmentDuration) {
      segments.push({
        start: Math.round(segStart * 100) / 100,
        end: Math.round(segEnd * 100) / 100,
        duration: Math.round((segEnd - segStart) * 100) / 100,
      });
    }
    segStart = gap.endTime;
  }

  // 最后一段
  if (duration - segStart >= minSegmentDuration) {
    segments.push({
      start: Math.round(segStart * 100) / 100,
      end: Math.round(duration * 100) / 100,
      duration: Math.round((duration - segStart) * 100) / 100,
    });
  }

  return segments;
}

/**
 * 将检测到的有声段落与文本句子进行最佳匹配
 *
 * 策略：
 * - 如果段落数 == 句子数 → 一一对应
 * - 如果段落数 > 句子数 → 合并最短的相邻段落
 * - 如果段落数 < 句子数 → 将长段落按比例均分
 *
 * @param {Array} segments - 有声段落 [{start, end, duration}]
 * @param {Array} sentences - 句子数组 [{text}]
 * @returns {Array} sentences with startTime/endTime assigned
 */
export function matchSegmentsToSentences(segments, sentences) {
  if (!segments.length || !sentences.length) return sentences;

  let segs = [...segments];
  const sents = sentences.length;

  // 段落数多于句子数 → 合并最短的相邻段
  while (segs.length > sents) {
    let minIdx = 0;
    let minDuration = Infinity;
    for (let i = 0; i < segs.length; i++) {
      if (segs[i].duration < minDuration) {
        minDuration = segs[i].duration;
        minIdx = i;
      }
    }
    // 合并最短段与相邻段（优先合并到前一段）
    if (minIdx > 0) {
      segs[minIdx - 1].end = segs[minIdx].end;
      segs[minIdx - 1].duration = segs[minIdx - 1].end - segs[minIdx - 1].start;
    } else if (minIdx < segs.length - 1) {
      segs[minIdx + 1].start = segs[minIdx].start;
      segs[minIdx + 1].duration = segs[minIdx + 1].end - segs[minIdx + 1].start;
    }
    segs.splice(minIdx, 1);
  }

  // 段落数少于句子数 → 长段落均分
  while (segs.length < sents) {
    // 找到最长的段落
    let maxIdx = 0;
    let maxDuration = 0;
    for (let i = 0; i < segs.length; i++) {
      if (segs[i].duration > maxDuration) {
        maxDuration = segs[i].duration;
        maxIdx = i;
      }
    }
    // 均分最长段落
    const seg = segs[maxIdx];
    const mid = (seg.start + seg.end) / 2;
    const first = { start: seg.start, end: Math.round(mid * 100) / 100, duration: Math.round((mid - seg.start) * 100) / 100 };
    const second = { start: Math.round(mid * 100) / 100, end: seg.end, duration: Math.round((seg.end - mid) * 100) / 100 };
    segs.splice(maxIdx, 1, first, second);
  }

  // 分配时间戳给句子
  for (let i = 0; i < sents; i++) {
    sentences[i].startTime = segs[i].start;
    sentences[i].endTime = segs[i].end;
  }

  return sentences;
}

// ==================== 辅助函数 ====================

async function decodeAudio(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  audioContext.close();
  return audioBuffer;
}

function getMonoData(audioBuffer) {
  if (audioBuffer.numberOfChannels === 1) {
    return audioBuffer.getChannelData(0);
  }
  // 多声道 → 取平均值
  const length = audioBuffer.length;
  const result = new Float32Array(length);
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    const channelData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      result[i] += channelData[i];
    }
  }
  for (let i = 0; i < length; i++) {
    result[i] /= audioBuffer.numberOfChannels;
  }
  return result;
}

function findMax(arr) {
  let max = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > max) max = arr[i];
  }
  return max;
}
