/**
 * Silentium — semantic concept quality rules
 * Pure functions shared by knowledge graph, AI output, and Explore Mode.
 */

export const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'so', 'then', 'than',
  'of', 'to', 'in', 'on', 'at', 'by', 'with', 'from', 'as', 'into',
  'about', 'over', 'under', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would',
  'can', 'could', 'should', 'may', 'might', 'this', 'that', 'these',
  'those', 'it', 'its', 'you', 'your', 'we', 'our', 'they', 'their',
  'he', 'she', 'his', 'her', 'i', 'me', 'my', 'not', 'no', 'yes',
  'very', 'just', 'also', 'only', 'really', 'there', 'here', 'where',
  'when', 'what', 'which', 'who', 'how', 'because', 'if', 'while',
  'during', 'before', 'after',
]);

const GENERIC_FILLERS = new Set([
  'example', 'examples', 'thing', 'things', 'people', 'person', 'time',
  'times', 'way', 'ways', 'something', 'anything', 'everything',
]);

const VALID_TYPES = new Set(['scene', 'emotion', 'action', 'power', 'concept']);

const SEMANTIC_FALLBACKS = {
  planet: {
    centerWord: 'planet',
    meaning_zh: '行星',
    cefr: 'B1',
    definition: 'A large round world that moves around a star.',
    insight: 'Planets are worlds shaped by gravity, orbit, atmosphere, and time.',
    categories: [
      {
        name: '天文学',
        emoji: '🔭',
        type: 'concept',
        words: [
          { word: 'orbit', meaning_zh: '轨道', definition: 'The curved path of an object around a star or planet.', relation: 'path around a star' },
          { word: 'star', meaning_zh: '恒星', definition: 'A luminous body that planets can orbit.', relation: 'anchors a planetary system' },
          { word: 'moon', meaning_zh: '卫星', definition: 'A natural object that moves around a planet.', relation: 'natural satellite' },
          { word: 'solar system', meaning_zh: '太阳系', definition: 'A star and the worlds that orbit it.', relation: 'planetary neighborhood' },
          { word: 'galaxy', meaning_zh: '星系', definition: 'A vast system of stars, gas, dust, and planets.', relation: 'cosmic home' },
        ],
      },
      {
        name: '物理特征',
        emoji: '🪐',
        type: 'concept',
        words: [
          { word: 'gravity', meaning_zh: '引力', definition: 'The force that shapes planets and their motion.', relation: 'shapes orbit and form' },
          { word: 'atmosphere', meaning_zh: '大气层', definition: 'The layer of gases surrounding a planet.', relation: 'surrounding gases' },
          { word: 'surface', meaning_zh: '表面', definition: 'The outermost part of a solid planet.', relation: 'visible outer layer' },
          { word: 'core', meaning_zh: '核心', definition: 'The dense central region of a planet.', relation: 'deep interior' },
          { word: 'crater', meaning_zh: '陨石坑', definition: 'A bowl-shaped hollow made by an impact.', relation: 'impact feature' },
        ],
      },
      {
        name: '太空探索',
        emoji: '🚀',
        type: 'action',
        words: [
          { word: 'telescope', meaning_zh: '望远镜', definition: 'An instrument used to observe distant objects.', relation: 'observes distant worlds' },
          { word: 'spacecraft', meaning_zh: '航天器', definition: 'A vehicle designed to travel through space.', relation: 'travels between worlds' },
          { word: 'probe', meaning_zh: '探测器', definition: 'An unmanned craft sent to collect information.', relation: 'studies a planet' },
          { word: 'mission', meaning_zh: '太空任务', definition: 'An organized journey for scientific exploration.', relation: 'plans exploration' },
          { word: 'astronaut', meaning_zh: '宇航员', definition: 'A person trained to travel and work in space.', relation: 'human explorer' },
        ],
      },
      {
        name: '宇宙环境',
        emoji: '🌌',
        type: 'scene',
        words: [
          { word: 'universe', meaning_zh: '宇宙', definition: 'All space, matter, energy, and time.', relation: 'largest cosmic setting' },
          { word: 'asteroid', meaning_zh: '小行星', definition: 'A small rocky body orbiting a star.', relation: 'rocky neighbor' },
          { word: 'comet', meaning_zh: '彗星', definition: 'An icy body that develops a tail near a star.', relation: 'icy visitor' },
          { word: 'meteor', meaning_zh: '流星', definition: 'A streak of light from space material entering an atmosphere.', relation: 'atmospheric event' },
          { word: 'nebula', meaning_zh: '星云', definition: 'A cloud of gas and dust between stars.', relation: 'stellar birthplace' },
        ],
      },
    ],
    bridges: [
      { from: 'gravity', to: 'orbit', insight: 'Gravity turns motion into a repeating path.' },
      { from: 'atmosphere', to: 'probe', insight: 'Atmospheres reveal what distant worlds are made of.' },
    ],
  },
  orbit: {
    centerWord: 'orbit',
    meaning_zh: '轨道',
    cefr: 'B2',
    definition: 'The curved path followed by an object moving around another body in space.',
    insight: 'An orbit is the balance between forward motion and the pull of gravity.',
    categories: [
      {
        name: '运动与力',
        emoji: '↻',
        type: 'concept',
        words: [
          { word: 'gravity', meaning_zh: '引力', definition: 'The force that pulls objects toward one another.', relation: 'holds an object in orbit' },
          { word: 'rotation', meaning_zh: '自转', definition: 'The spinning of an object around its own axis.', relation: 'spin around an axis' },
          { word: 'revolution', meaning_zh: '公转', definition: 'One complete journey of an object around another body.', relation: 'one completed orbit' },
          { word: 'velocity', meaning_zh: '速度', definition: 'Speed in a particular direction.', relation: 'controls orbital shape' },
          { word: 'path', meaning_zh: '路径', definition: 'The course followed by a moving object.', relation: 'describes orbital motion' },
        ],
      },
      {
        name: '轨道天体',
        emoji: '◌',
        type: 'concept',
        words: [
          { word: 'satellite', meaning_zh: '卫星', definition: 'An object that moves around a planet or other body.', relation: 'travels in an orbit' },
          { word: 'moon', meaning_zh: '月球；卫星', definition: 'A natural satellite that orbits a planet.', relation: 'natural orbiting body' },
          { word: 'planet', meaning_zh: '行星', definition: 'A large world that moves around a star.', relation: 'orbits a star' },
          { word: 'asteroid', meaning_zh: '小行星', definition: 'A small rocky body that travels around a star.', relation: 'follows a solar orbit' },
        ],
      },
      {
        name: '航天应用',
        emoji: '⌁',
        type: 'action',
        words: [
          { word: 'spacecraft', meaning_zh: '航天器', definition: 'A vehicle designed to travel through space.', relation: 'enters and changes orbit' },
          { word: 'space station', meaning_zh: '空间站', definition: 'A large spacecraft where people live and work in orbit.', relation: 'operates in orbit' },
          { word: 'launch', meaning_zh: '发射', definition: 'The act of sending a vehicle into the air or space.', relation: 'begins the journey to orbit' },
          { word: 'trajectory', meaning_zh: '飞行轨迹', definition: 'The path followed by a moving object through space.', relation: 'planned route into orbit' },
        ],
      },
    ],
    bridges: [
      { from: 'gravity', to: 'velocity', insight: 'Gravity bends forward motion into an orbit.' },
      { from: 'launch', to: 'satellite', insight: 'A launch gives a satellite the speed needed to stay in orbit.' },
    ],
  },
};

function normalizeCandidate(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9'\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isConceptCandidate(value, centerWord = '') {
  const candidate = normalizeCandidate(value);
  const center = normalizeCandidate(centerWord);
  if (!candidate || candidate === center || /^\d+$/.test(candidate)) return false;
  if (candidate.replace(/[^a-z]/g, '').length < 3) return false;
  if (STOPWORDS.has(candidate) || GENERIC_FILLERS.has(candidate)) return false;

  const tokens = candidate.split(/\s+/);
  return tokens.some(token => token.length >= 3 && !STOPWORDS.has(token));
}

export function cleanConceptCandidates(values, centerWord = '', limit = Infinity) {
  const output = [];
  const seen = new Set();
  for (const value of values || []) {
    const candidate = normalizeCandidate(typeof value === 'string' ? value : value?.word);
    if (!isConceptCandidate(candidate, centerWord) || seen.has(candidate)) continue;
    seen.add(candidate);
    output.push(candidate);
    if (output.length >= limit) break;
  }
  return output;
}

export function sanitizeConceptMap(input, centerWord = '') {
  if (!input || typeof input !== 'object') return null;
  const center = normalizeCandidate(input.centerWord || centerWord) || normalizeCandidate(centerWord);
  const seen = new Set();
  const categories = [];

  for (const category of input.categories || []) {
    const words = [];
    for (const item of category.words || []) {
      const normalized = normalizeCandidate(typeof item === 'string' ? item : item?.word);
      if (!isConceptCandidate(normalized, center) || seen.has(normalized)) continue;
      seen.add(normalized);
      words.push({
        word: normalized,
        relation: String(item?.relation || '').trim(),
        meaning_zh: String(item?.meaning_zh || item?.zh || '').trim(),
        definition: String(item?.definition || '').trim(),
      });
      if (words.length >= 6) break;
    }
    if (!words.length) continue;
    categories.push({
      name: String(category.name || '语义关联').trim(),
      emoji: String(category.emoji || '✦').trim(),
      type: VALID_TYPES.has(category.type) ? category.type : 'concept',
      words,
    });
    if (categories.length >= 5) break;
  }

  const validWords = new Set(categories.flatMap(category => category.words.map(item => item.word)));
  const bridges = (input.bridges || []).filter(bridge => {
    const from = normalizeCandidate(bridge?.from);
    const to = normalizeCandidate(bridge?.to);
    return from !== to && validWords.has(from) && validWords.has(to);
  }).slice(0, 2).map(bridge => ({
    from: normalizeCandidate(bridge.from),
    to: normalizeCandidate(bridge.to),
    insight: String(bridge.insight || '').trim(),
  }));

  return {
    centerWord: center,
    meaning_zh: String(input.meaning_zh || input.translation || '').trim(),
    cefr: String(input.cefr || '').trim().toUpperCase(),
    definition: String(input.definition || '').trim(),
    insight: String(input.insight || '').trim(),
    categories,
    bridges,
  };
}

export function isHighQualityConceptMap(map) {
  if (!map?.meaning_zh || !map?.definition || !map?.insight) return false;
  const words = map.categories?.flatMap(category => category.words || []) || [];
  return map.categories?.length >= 2 && words.length >= 6;
}

export function isRenderableConceptMap(map, minWords = 3) {
  const words = map?.categories?.flatMap(category => category.words || []) || [];
  return words.length >= minWords && words.every(item => isConceptCandidate(item.word, map.centerWord));
}

export function getSemanticFallback(word) {
  const fallback = SEMANTIC_FALLBACKS[normalizeCandidate(word)];
  return fallback ? structuredClone(fallback) : null;
}
