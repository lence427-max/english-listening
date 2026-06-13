/**
 * Silentium — Concept Universe Explorer V5
 * 概念宇宙 · 沉浸式英语词汇探索
 *
 * 视觉参考：Google Earth（飞行探索）· FigJam（空间感）· Wikipedia（知识漫游）
 *
 * V5 核心升级：
 * - 全局尺寸放大：占据屏幕 65-75%
 * - 空间路径标记：旧中心保留在画布中，形成探索轨迹
 * - 飞行动画：点击词 → 镜头平滑飞向目标 → 该词放大为新中心
 * - 跨岛弱连接：不同分类岛之间的虚线连接
 * - AI 意外桥接：发光的创意概念连线
 * - Concept Landscape：中心词关联词的动态背景尘埃
 */

import { sanitizeHTML, showToast } from './utils.js';
import { getWordGraphData, clearWordIndex } from './knowledge-graph.js';
import { getApiKey, fetchMindMap } from './ai-network.js';
import { getMaterials } from './storage.js';
import { createLatestRequestCoordinator } from './async-coordinator.js';
import {
  cleanConceptCandidates,
  getSemanticFallback,
  isRenderableConceptMap,
  sanitizeConceptMap,
} from './concept-quality.js';

const SVGNS = 'http://www.w3.org/2000/svg';

// ==================== 色彩体系 ====================
const TYPE_PALETTE = {
  scene:   { light:{fill:'#eff6ff',stroke:'#3b82f6',text:'#1e40af',glow:'#93c5fd'}, dark:{fill:'#1e3a5f',stroke:'#60a5fa',text:'#bfdbfe',glow:'#3b82f6'} },
  emotion: { light:{fill:'#fff7ed',stroke:'#f97316',text:'#9a3412',glow:'#fdba74'}, dark:{fill:'#5c3d00',stroke:'#fb923c',text:'#fed7aa',glow:'#f97316'} },
  action:  { light:{fill:'#ecfdf5',stroke:'#10b981',text:'#065f46',glow:'#6ee7b7'}, dark:{fill:'#064e3b',stroke:'#34d399',text:'#a7f3d0',glow:'#10b981'} },
  power:   { light:{fill:'#f5f3ff',stroke:'#8b5cf6',text:'#5b21b6',glow:'#c4b5fd'}, dark:{fill:'#3b1f6e',stroke:'#a78bfa',text:'#ddd6fe',glow:'#8b5cf6'} },
  concept: { light:{fill:'#fdf2f8',stroke:'#ec4899',text:'#9d174d',glow:'#f9a8d4'}, dark:{fill:'#5c1a3c',stroke:'#f472b6',text:'#fbcfe8',glow:'#ec4899'} },
};

function palette(type) {
  const dark = document.documentElement.classList.contains('dark');
  const p = TYPE_PALETTE[type] || TYPE_PALETTE.concept;
  return dark ? p.dark : p.light;
}

function theme() {
  const light = !document.documentElement.classList.contains('dark');
  return light
    ? { surface:'#fff',border:'#e2e8f0',text:'#1e293b',textSec:'#64748b',textTer:'#94a3b8',primary:'#6366f1',bg:'#f8fafc' }
    : { surface:'#1e293b',border:'#334155',text:'#f1f5f9',textSec:'#94a3b8',textTer:'#64748b',primary:'#818cf8',bg:'#0f172a' };
}

const CEFR_COLORS = { A1:'#22c55e', A2:'#4ade80', B1:'#facc15', B2:'#f97316', C1:'#ef4444', C2:'#8b5cf6' };
const CEFR_LABELS = { A1:'入门', A2:'基础', B1:'中级', B2:'中高', C1:'高级', C2:'精通' };

// ==================== V5 尺寸常量 ====================
const SIZES = {
  CENTER_CARD_W: 320, CENTER_CARD_H: 180, CENTER_CARD_RX: 26,
  CENTER_WORD_FONT: 27, CENTER_ZH_FONT: 14, CENTER_DEF_FONT: 10, CENTER_INSIGHT_FONT: 10,
  CAT_BASE_RADIUS: 320, CAT_RADIUS_VAR: 70, CAT_NODE_R: 44,
  TERRITORY_BASE: 225, TERRITORY_PER_WORD: 26,
  WORD_CLUSTER_BASE: 148, WORD_CLUSTER_PER_WORD: 19,
  WORD_NODE_R: 16, WORD_LABEL_FONT: 10,
  CAT_NAME_FONT: 12, CAT_EMOJI_FONT: 22,
  GLOW_OUTER_R: 470, GLOW_INNER_R: 315,
};

// ==================== 常量 ====================
const DUST_WORDS = [
  'culture', 'trust', 'learning', 'communication', 'growth',
  'innovation', 'vision', 'strategy', 'harmony', 'wisdom',
  'knowledge', 'creativity', 'leadership', 'purpose', 'balance',
  'insight', 'connection', 'discovery', 'curiosity', 'understanding'
];

const CONCEPT_JOURNEYS = [
  { id:'leadership', title:'领导力之旅', emoji:'👑', route:['team','leadership','authority','power','strategy'], description:'从团队协作到战略决策' },
  { id:'trust-emotion', title:'信任与情感', emoji:'❤️', route:['team','friendship','trust','emotion','connection'], description:'从团队到情感连接' },
  { id:'innovation', title:'创新探索', emoji:'💡', route:['technology','innovation','creativity','design','future'], description:'从技术到未来愿景' },
  { id:'communication', title:'沟通艺术', emoji:'🗣️', route:['language','communication','dialogue','understanding','culture'], description:'从语言到文化理解' },
];

// ==================== 状态 ====================
let svgEl, rootEl, canvasEl;
let transform = { x: 0, y: 0, scale: 1 };
let isDragging = false, dragStart = { x:0, y:0 }, dragTrans = { x:0, y:0 };
let mindMap = null;
let centerNode = null;
let catNodes = [];
let wordNodes = [];
let pathHistory = [];
let pathMarkers = [];         // V5: [{word, meaning_zh, x, y, color}]
let crossIslandEdges = [];    // V5: [{fromCat, toCat, strength, words}]
let aiBridges = [];           // V5: [{from, to, insight}]
let dustParticles = [];
let conceptDust = [];         // V5: 中心词关联尘埃
let starParticles = [];
let animIds = [];
let pendingAnimationCancels = new Set();
const mindMapRequests = createLatestRequestCoordinator();
let journeyExpanded = false;
let activeJourney = null;
let audioCard = null;
let isFlying = false;         // V5: 飞行中标志
let _resizeHandler = null, _escHandler = null, _mouseMoveHandler = null, _mouseUpHandler = null;
let _clickOutsideHandler = null;

// ==================== SVG 工具 ====================
function elSVG(tag, attrs) {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, String(v));
  return e;
}

function appendCenteredLines(parent, text, { y, maxChars = 44, maxLines = 2, lineHeight = 15, ...attrs }) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return;

  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars || !current) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  const consumed = lines.join(' ').length;
  if (consumed < String(text).trim().length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.…]+$/, '')}…`;
  }

  const textEl = elSVG('text', { x:0, y, 'text-anchor':'middle', ...attrs });
  lines.forEach((line, index) => {
    const tspan = elSVG('tspan', { x:0, dy:index === 0 ? 0 : lineHeight });
    tspan.textContent = line;
    textEl.appendChild(tspan);
  });
  parent.appendChild(textEl);
}

function animRequest(fn) {
  const id = requestAnimationFrame((t) => { animIds = animIds.filter(x => x !== id); fn(t); });
  animIds.push(id); return id;
}
function cancelAllAnims() {
  animIds.forEach(id => cancelAnimationFrame(id));
  animIds = [];
  [...pendingAnimationCancels].forEach(cancel => cancel());
  pendingAnimationCancels.clear();
}

// ==================== 工具函数 ====================
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return ((h & 0xffff) % 1000) / 1000;
}

/** 知识岛定位 — 黄金角螺旋（V5 放大） */
function positionCategoryIslands(count) {
  const positions = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const angle = i * goldenAngle;
    const radiusVar = ((i * 97 + 53) % SIZES.CAT_RADIUS_VAR) - SIZES.CAT_RADIUS_VAR / 2;
    const radius = SIZES.CAT_BASE_RADIUS + radiusVar;
    positions.push({ tx: Math.cos(angle) * radius, ty: Math.sin(angle) * radius });
  }
  return positions;
}

/** 词汇集群定位（V5 放大间距） */
function positionWordCluster(catX, catY, words, catIndex) {
  const count = words.length;
  const baseR = SIZES.WORD_CLUSTER_BASE + count * SIZES.WORD_CLUSTER_PER_WORD;
  const jitterStrength = baseR * 0.12;
  return words.map((w, i) => {
    const hash = simpleHash(w.word + '_' + catIndex);
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2 + (hash - 0.5) * 0.6;
    const r = baseR * (0.55 + hash * 0.45);
    return {
      tx: catX + Math.cos(angle) * r + (hash * 2 - 1) * jitterStrength,
      ty: catY + Math.sin(angle) * r + (((hash * 37) % 1) * 2 - 1) * jitterStrength,
    };
  });
}

/** 计算跨岛连接 */
function computeCrossIslandEdges() {
  const edges = [];
  const expandedCats = catNodes.filter(c => c._expanded);
  if (expandedCats.length < 2) return edges;

  for (let i = 0; i < expandedCats.length; i++) {
    for (let j = i + 1; j < expandedCats.length; j++) {
      let sharedCount = 0;
      const sharedWords = [];
      const wordsA = (expandedCats[i].words || []).map(w => w.word.toLowerCase());
      const wordsB = (expandedCats[j].words || []).map(w => w.word.toLowerCase());
      for (const wa of wordsA) {
        const gd = getWordGraphData(wa);
        if (!gd) continue;
        for (const wb of wordsB) {
          if (wa === wb) continue;
          if (gd.collocations?.some(c => c.word === wb)) {
            sharedCount++;
            sharedWords.push({ from: wa, to: wb });
            if (sharedWords.length > 2) break;
          }
        }
        if (sharedWords.length > 2) break;
      }
      if (sharedCount > 0) {
        edges.push({
          fromCat: expandedCats[i], toCat: expandedCats[j],
          strength: Math.min(sharedCount, 3), sharedWords: sharedWords.slice(0, 2),
        });
      }
    }
  }
  // 每岛最多 2 条边
  const perCat = {};
  return edges.filter(e => {
    const a = e.fromCat.id, b = e.toCat.id;
    perCat[a] = (perCat[a] || 0) + 1; perCat[b] = (perCat[b] || 0) + 1;
    return perCat[a] <= 2 && perCat[b] <= 2;
  });
}

/** 初始化通用尘埃 */
function initDustParticles() {
  dustParticles = [];
  const W = window.innerWidth, H = window.innerHeight - 48;
  for (let i = 0; i < 14; i++) {
    dustParticles.push({
      word: DUST_WORDS[i % DUST_WORDS.length],
      x: Math.random() * W, y: Math.random() * H,
      fontSize: 10 + Math.random() * 14,
      dur: 25 + Math.random() * 35, delay: Math.random() * 30,
      driftX: (Math.random() - 0.5) * 120, driftY: (Math.random() - 0.5) * 80,
    });
  }
}

function initStarParticles() {
  const W = window.innerWidth;
  const H = window.innerHeight - 48;
  starParticles = Array.from({ length: 42 }, (_, i) => ({
    x: (simpleHash(`star-x-${i}`) * W),
    y: (simpleHash(`star-y-${i}`) * H),
    r: 0.6 + simpleHash(`star-r-${i}`) * 1.5,
    opacity: 0.02 + simpleHash(`star-o-${i}`) * 0.04,
    tint: i % 4 === 0 ? 'cyan' : 'indigo',
  }));
}

/** V5: 初始化概念环境尘埃 */
function initConceptLandscape() {
  conceptDust = [];
  if (!centerNode || !centerNode.word) return;

  const semanticWords = [];
  if (mindMap?.categories) {
    for (const cat of mindMap.categories) {
      for (const w of cat.words || []) semanticWords.push(w.word);
    }
  }
  const words = cleanConceptCandidates(semanticWords, centerNode.word, 15);
  if (!words.length) return;

  const W = window.innerWidth, H = window.innerHeight - 48;
  conceptDust = words.map(w => ({
    word: w,
    x: Math.random() * W, y: Math.random() * H,
    fontSize: 11 + Math.random() * 16,
    dur: 20 + Math.random() * 30, delay: Math.random() * 20,
    driftX: (Math.random() - 0.5) * 100, driftY: (Math.random() - 0.5) * 70,
  }));
}

// ==================== 入口 ====================
export function renderExploreView(cnt, startWord) {
  cancelAllAnims();
  mindMap = null; centerNode = null; catNodes = []; wordNodes = []; pathHistory = [];
  pathMarkers = []; crossIslandEdges = []; aiBridges = [];
  transform = { x: 0, y: 0, scale: 1 };
  journeyExpanded = false; activeJourney = null; audioCard = null; isFlying = false;
  initDustParticles(); initStarParticles(); conceptDust = [];

  const word = startWord || '';
  const materials = getMaterials();
  if (!materials.some(m => m.originalText)) {
    import('./content-library.js').then(m => { m.bulkImportAll(); clearWordIndex(); }).catch(() => {});
  }

  cnt.innerHTML = `
    <div class="explore-overlay">
      <div class="explore-topbar">
        <button class="btn btn-ghost btn-sm" id="explore-close"><i class="fa-solid fa-xmark"></i> 退出</button>
        <div class="explore-breadcrumb" id="explore-path">
          <span class="explore-path-home" id="explore-path-home" title="返回概念宇宙">🧠</span>
        </div>
        <div class="explore-actions">
          <div style="position:relative;">
            <input type="text" id="explore-search" class="form-input" placeholder="输入单词，探索概念星球…" style="width:220px;padding:0.375rem 0.625rem 0.375rem 1.75rem;font-size:0.8125rem;">
            <i class="fa-solid fa-magnifying-glass" style="position:absolute;left:0.5rem;top:50%;transform:translateY(-50%);color:var(--text-tertiary);font-size:0.6875rem;"></i>
          </div>
          <span class="text-xs" style="color:var(--text-tertiary);white-space:nowrap;">双击词汇探索 · 单击岛展开 · 滚轮缩放</span>
        </div>
      </div>
      <div class="explore-canvas" id="explore-canvas"></div>
      <div class="explore-tooltip hidden" id="explore-tooltip"></div>
      <div class="explore-audio-card hidden" id="explore-audio-card"></div>
      <div class="explore-journey-panel collapsed" id="explore-journey-panel">
        <div class="explore-journey-header" id="explore-journey-toggle">
          <span class="explore-journey-title">🧭 探索路线</span>
          <button class="explore-journey-toggle" id="explore-journey-btn"><i class="fa-solid fa-chevron-up"></i></button>
        </div>
        <div class="explore-journey-body hidden" id="explore-journey-body">
          <div class="explore-journey-list" id="explore-journey-list"></div>
          <div id="explore-journey-active" class="hidden"></div>
        </div>
      </div>
    </div>
  `;

  rootEl = cnt.firstElementChild;
  canvasEl = rootEl.querySelector('#explore-canvas');

  requestAnimationFrame(() => {
    svgEl = document.createElementNS(SVGNS, 'svg');
    const w = window.innerWidth, h = window.innerHeight - 48;
    svgEl.setAttribute('width', w); svgEl.setAttribute('height', h);
    svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svgEl.style.cssText = 'display:block;width:100%;height:100%;';
    canvasEl.appendChild(svgEl);
    bindEvents();
    initJourneyPanel();
    if (word) loadMindMap(word);
    render();
  });

  _resizeHandler = () => {
    if (!svgEl) return;
    const W = window.innerWidth, H = window.innerHeight - 48;
    svgEl.setAttribute('width', W); svgEl.setAttribute('height', H);
    svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
    initDustParticles();
    initStarParticles();
    render();
  };
  window.addEventListener('resize', _resizeHandler);
}

// ==================== 保存路径标记（V5）====================
function savePathMarkers(clickedWordX, clickedWordY) {
  if (!centerNode || !centerNode.word) return;
  pathMarkers.push({
    word: centerNode.word,
    meaning_zh: centerNode.meaning_zh || '',
    x: -clickedWordX,
    y: -clickedWordY,
    color: theme().primary,
  });
  if (pathMarkers.length > 12) pathMarkers.shift();
}

// ==================== 加载思维导图 ====================
async function loadMindMap(word) {
  cancelAllAnims();
  const request = mindMapRequests.begin();
  catNodes = []; wordNodes = []; crossIslandEdges = []; aiBridges = [];
  mindMap = null; audioCard = null;
  const loadingNode = { word, meaning_zh:'', cefr:'', definition:'', insight:'', x:0, y:0, _loading:true };
  centerNode = loadingNode;
  render();

  // V5: 安全网 — 15 秒后强制退出加载态（防止任何原因导致的永久 loading）
  const safetyTimer = setTimeout(() => {
    if (request.isCurrent() && centerNode === loadingNode && centerNode._loading) {
      centerNode._loading = false;
      centerNode._noData = true;
      render();
      console.warn('[Explore] loadMindMap 超时回退:', word);
    }
  }, 15000);

  try {
    const curatedMap = getSemanticFallback(word);
    let data = curatedMap;
    if (!data && getApiKey()) {
      try {
        data = await fetchMindMap(word, { signal: request.signal });
      } catch (e) {}
      if (!request.isCurrent()) {
        clearTimeout(safetyTimer);
        return;
      }
    }
    if (!data || !data.categories?.length) { data = buildLocalMindMap(word); }
    if (!request.isCurrent()) {
      clearTimeout(safetyTimer);
      return;
    }

    clearTimeout(safetyTimer);
    centerNode._loading = false;

    data = sanitizeConceptMap(data, word);
    if (!isRenderableConceptMap(data)) data = getSemanticFallback(word);

    if (data) {
      centerNode.meaning_zh = data.meaning_zh || '';
      centerNode.cefr = data.cefr || '';
      centerNode.definition = data.definition || '';
      centerNode.insight = data.insight || '';
      aiBridges = data.bridges || [];
      mindMap = data;
    }

    const lastInPath = pathHistory[pathHistory.length - 1];
    if (!lastInPath || lastInPath.word !== word) {
      pathHistory.push({ word, level: 0 });
    }

    if (!data || !data.categories?.length) {
      centerNode._noData = true; render();
      showToast(`未找到「${word}」的概念网络。试试其他单词？`, 'warning');
      return;
    }

    // V5 放大布局
    const catPositions = positionCategoryIslands(data.categories.length);
    catNodes = data.categories.map((cat, i) => {
      const pos = catPositions[i];
      return {
        ...cat, id:'cat_'+i, r: SIZES.CAT_NODE_R,
        x:0, y:0, _expanded:false,
        _anim:{ opacity:0, currentR:0, sx:0, sy:0, tx:pos.tx, ty:pos.ty },
      };
    });

    const animationCompleted = await animateNodes(catNodes, 500);
    if (!animationCompleted || !request.isCurrent()) return;
    catNodes.forEach(n => { n._anim.opacity=1; n._anim.currentR=n.r; n.x=n._anim.tx; n.y=n._anim.ty; });

    initConceptLandscape();
    render();
  } catch (err) {
    clearTimeout(safetyTimer);
    if (!request.isCurrent()) return;
    console.error('[Explore] loadMindMap 异常:', err);
    centerNode._loading = false;
    centerNode._noData = true;
    render();
    showToast(`加载「${word}」时出错，请重试`, 'error');
  }
}

// ==================== 本地兜底 ====================
const CATEGORY_MAP = [
  { type:'scene',emoji:'📍',name:'场景',keys:['office','home','city','road','street','airport','station','school','hospital','shop','restaurant','park','beach','river','sea','country','world','place','room','building','house','environment','space','area','garden','kitchen','bedroom','classroom','campus','downtown','suburb','countryside','highway','bridge','tunnel'] },
  { type:'emotion',emoji:'😊',name:'情绪',keys:['happy','sad','angry','fear','anxiety','stress','worry','joy','love','hate','excitement','calm','frustration','hope','depression','anger','surprise','disgust','shame','pride','relief','boredom','lonely','confused','nervous','panic','satisfaction','gratitude','jealous'] },
  { type:'action',emoji:'🎯',name:'动作',keys:['work','learn','study','teach','talk','speak','listen','read','write','eat','drink','sleep','walk','run','drive','travel','play','make','create','build','think','feel','change','help','use','need','want','try','start','stop','move','buy','sell','give','take','bring','send','open','close','push','pull'] },
  { type:'concept',emoji:'💡',name:'概念',keys:['time','money','life','health','power','knowledge','information','technology','science','nature','culture','society','government','business','education','communication','environment','future','history','success','failure','truth','freedom','justice','peace','war','system','process','method','strategy','solution','problem','challenge'] },
  { type:'power',emoji:'⚡',name:'决策',keys:['decision','control','authority','leadership','management','strategy','policy','rule','law','order','command','influence','dominate','negotiate','approve','reject','execute','delegate','responsibility','accountable','govern','regulate'] },
];

function classifyWord(w) {
  const lower = w.toLowerCase();
  for (const cat of CATEGORY_MAP) { if (cat.keys.includes(lower)) return cat; }
  return null;
}

function buildLocalMindMap(word) {
  const semanticFallback = getSemanticFallback(word);
  if (semanticFallback) return semanticFallback;

  const graphData = getWordGraphData(word);
  if (!graphData) return null;
  const words = cleanConceptCandidates([
    ...(graphData.collocations || []).map(c => c.word),
    ...(graphData.related || []).map(c => c.word),
  ], word, 20);
  if (words.length < 3) return null;
  const buckets = {};
  for (const w of words) {
    const cat = classifyWord(w);
    const key = cat ? cat.type : '__other__';
    if (!buckets[key]) buckets[key] = { words:[], catInfo:cat };
    buckets[key].words.push({ word:w, relation:'' });
  }
  const categories = [];
  for (const [key, bucket] of Object.entries(buckets)) {
    if (key === '__other__') {
      if (bucket.words.length >= 2) categories.push({ name:'关联',emoji:'🔗',type:'concept',words:bucket.words.slice(0,5) });
    } else if (bucket.words.length >= 1) {
      const ci = bucket.catInfo;
      categories.push({ name:ci.name,emoji:ci.emoji,type:ci.type,words:bucket.words.slice(0,5) });
    }
  }
  if (categories.length === 0) {
    categories.push({ name:'关联',emoji:'🔗',type:'concept',words:words.slice(0,8).map(w => ({ word:w, relation:'' })) });
  }
  if (categories.length > 5) { categories.sort((a,b) => b.words.length - a.words.length); categories.length = 5; }
  // V5: 加入突发奇想的桥接
  const bridges = [];
  if (categories.length >= 2) {
    const allW = categories.flatMap(c => (c.words||[]).map(w => w.word));
    if (allW.length >= 2) {
      const a = allW[0], b = allW[allW.length-1];
      if (a !== b) bridges.push({ from:a, to:b, insight:'意外的概念连接 — 通过共现网络发现' });
    }
  }
  return sanitizeConceptMap({
    centerWord:word,
    meaning_zh:'',
    cefr:'',
    definition:'',
    insight:'',
    categories,
    bridges,
  }, word);
}

// ==================== 展开/收起概念岛 ====================
function toggleCategory(catId) {
  const cat = catNodes.find(c => c.id === catId);
  if (!cat) return;

  if (cat._expanded) {
    wordNodes = wordNodes.filter(w => w._catId !== catId);
    cat._expanded = false;
    crossIslandEdges = computeCrossIslandEdges();
    render(); return;
  }

  cat._expanded = true;
  const words = cat.words || [];
  if (!words.length) { crossIslandEdges = computeCrossIslandEdges(); render(); return; }

  const catIndex = catNodes.indexOf(cat);
  const clusterPositions = positionWordCluster(cat.x, cat.y, words, catIndex);

  const newWordNodes = words.map((w, i) => {
    const pos = clusterPositions[i];
    return {
      id:'w_'+catId+'_'+i, word:w.word, relation:w.relation||'',
      meaning_zh:w.meaning_zh||'', definition:w.definition||'',
      _catId:catId, x:cat.x, y:cat.y, r:SIZES.WORD_NODE_R,
      _anim:{ opacity:0, currentR:0, sx:cat.x, sy:cat.y, tx:pos.tx, ty:pos.ty },
    };
  });

  wordNodes.push(...newWordNodes);
  crossIslandEdges = computeCrossIslandEdges();
  animateNodes(newWordNodes, 350).then(() => {
    newWordNodes.forEach(n => { n._anim.opacity=1; n._anim.currentR=n.r; n.x=n._anim.tx; n.y=n._anim.ty; });
    render();
  });
  render();
}

async function animateNodes(nodeList, duration) {
  return new Promise(resolve => {
    const start = performance.now();
    let settled = false;
    const finish = completed => {
      if (settled) return;
      settled = true;
      pendingAnimationCancels.delete(cancel);
      resolve(completed);
    };
    const cancel = () => finish(false);
    pendingAnimationCancels.add(cancel);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      nodeList.forEach(n => {
        if (n._anim) {
          n.x = n._anim.sx + (n._anim.tx - n._anim.sx) * e;
          n.y = n._anim.sy + (n._anim.ty - n._anim.sy) * e;
          n._anim.currentR = n.r * e;
          n._anim.opacity = e;
        }
      });
      render();
      if (t < 1) animRequest(tick); else finish(true);
    };
    animRequest(tick);
  });
}

// ==================== V5: 飞行动画 ====================
function flyToWord(wordX, wordY, word) {
  if (isFlying) return;
  isFlying = true;

  savePathMarkers(wordX, wordY);

  const targetX = -wordX * transform.scale;
  const targetY = -wordY * transform.scale;
  const startX = transform.x, startY = transform.y;
  const startScale = transform.scale;
  const duration = 650;
  const startTime = performance.now();

  cancelAllAnims();

  const tick = (now) => {
    const t = Math.min(1, (now - startTime) / duration);
    let panEase, zoomEase;
    if (t < 0.7) {
      const pt = t / 0.7;
      panEase = 1 - Math.pow(1 - pt, 3);
      zoomEase = 0;
    } else {
      panEase = 1;
      const zt = (t - 0.7) / 0.3;
      zoomEase = 1 - Math.pow(1 - zt, 2);
    }
    transform.x = startX + (targetX - startX) * panEase;
    transform.y = startY + (targetY - startY) * panEase;
    transform.scale = startScale * (1 + zoomEase * 0.18);

    render();
    if (t < 1) { animRequest(tick); }
    else {
      transform.scale = 1;
      transform.x = 0; transform.y = 0;
      isFlying = false;
      loadMindMap(word);
    }
  };
  animRequest(tick);
}

// ==================== 渲染核心（V5 重大更新）====================
function render() {
  if (!svgEl) return;
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);

  const T = theme();
  const W = window.innerWidth, H = window.innerHeight - 48;
  const cx = W / 2 + transform.x;
  const cy = H / 2 + transform.y;

  // ---- 定义 ----
  const defs = elSVG('defs');

  const bgGrad = elSVG('radialGradient', { id:'planetGlow', cx:'50%', cy:'50%', r:'50%' });
  bgGrad.appendChild(elSVG('stop', { offset:'0%', 'stop-color':T.primary, 'stop-opacity':'0.1' }));
  bgGrad.appendChild(elSVG('stop', { offset:'60%', 'stop-color':T.primary, 'stop-opacity':'0.02' }));
  bgGrad.appendChild(elSVG('stop', { offset:'100%', 'stop-color':T.primary, 'stop-opacity':'0' }));
  defs.appendChild(bgGrad);

  // V5: 领土模糊滤镜
  const territoryFilter = elSVG('filter', { id:'territoryBlur', x:'-50%', y:'-50%', width:'200%', height:'200%' });
  territoryFilter.appendChild(elSVG('feGaussianBlur', { stdDeviation:'35' }));
  defs.appendChild(territoryFilter);

  const cardFilter = elSVG('filter', { id:'cardShadow', x:'-50%', y:'-50%', width:'200%', height:'200%' });
  cardFilter.appendChild(elSVG('feDropShadow', { dx:'0', dy:'8', stdDeviation:'20', 'flood-color':T.primary, 'flood-opacity':'0.25' }));
  defs.appendChild(cardFilter);

  const islandFilter = elSVG('filter', { id:'islandGlow', x:'-50%', y:'-50%', width:'200%', height:'200%' });
  islandFilter.appendChild(elSVG('feDropShadow', { dx:'0', dy:'3', stdDeviation:'10', 'flood-color':T.primary, 'flood-opacity':'0.15' }));
  defs.appendChild(islandFilter);

  svgEl.appendChild(defs);

  const skyG = elSVG('g', { class:'explore-star-field', 'aria-hidden':'true' });
  for (const star of starParticles) {
    skyG.appendChild(elSVG('circle', {
      cx:star.x,
      cy:star.y,
      r:star.r,
      fill:star.tint === 'cyan' ? '#67e8f9' : '#a5b4fc',
      opacity:star.opacity,
      class:'explore-star-dot',
    }));
  }
  svgEl.appendChild(skyG);

  // ---- 主图层 ----
  const mainG = elSVG('g', { transform: `translate(${cx},${cy}) scale(${transform.scale})` });

  // --- V5: 探索轨迹连线 ---
  if (pathMarkers.length > 0 && centerNode && !centerNode._loading) {
    const allPoints = [...pathMarkers.map(p => ({ x:p.x, y:p.y })), { x:0, y:0 }];
    for (let i = 1; i < allPoints.length; i++) {
      const prev = allPoints[i-1], curr = allPoints[i];
      mainG.appendChild(elSVG('line', {
        x1:prev.x, y1:prev.y, x2:curr.x, y2:curr.y,
        stroke:T.textTer, 'stroke-width':1, 'stroke-dasharray':'4,8',
        opacity:0.2, class:'explore-trail-line',
      }));
    }
  }

  // --- 背景：概念星球光晕（V5 放大）---
  if (centerNode && !centerNode._loading) {
    mainG.appendChild(elSVG('circle', { cx:0, cy:0, r:SIZES.GLOW_OUTER_R, fill:'url(#planetGlow)', class:'explore-center-glow-outer' }));
    mainG.appendChild(elSVG('circle', { cx:0, cy:0, r:SIZES.GLOW_INNER_R, fill:'url(#planetGlow)', class:'explore-center-glow-inner', opacity:0.6 }));
    mainG.appendChild(elSVG('circle', { cx:0, cy:0, r:SIZES.CAT_BASE_RADIUS - 30, fill:'none', stroke:T.border, 'stroke-width':0.5, 'stroke-dasharray':'3,10', class:'explore-orbit-ring' }));
  }

  // --- V5: 知识岛领土（软性光晕，blur 实现）---
  for (const cat of catNodes) {
    if (!cat._expanded) continue;
    const p = palette(cat.type);
    const territoryR = SIZES.TERRITORY_BASE + (cat.words?.length || 3) * SIZES.TERRITORY_PER_WORD;
    mainG.appendChild(elSVG('circle', {
      cx:cat.x, cy:cat.y, r:territoryR,
      fill:p.glow, opacity:0.1, filter:'url(#territoryBlur)',
      class:'explore-island-territory',
    }));
  }

  // --- 连线：中心 → 概念岛 ---
  if (centerNode) {
    for (const cat of catNodes) {
      const op = Math.min(1, cat._anim?.opacity ?? 1);
      if (op < 0.02) continue;
      const p = palette(cat.type);
      mainG.appendChild(elSVG('line', {
        x1:0, y1:0, x2:cat.x, y2:cat.y,
        stroke:p.stroke, 'stroke-width':1.5, 'stroke-dasharray':'5,5', opacity:op*0.4,
      }));
    }
  }

  // --- V5: 跨岛连接 ---
  for (const edge of crossIslandEdges) {
    const p = palette(edge.fromCat.type);
    mainG.appendChild(elSVG('line', {
      x1:edge.fromCat.x, y1:edge.fromCat.y,
      x2:edge.toCat.x, y2:edge.toCat.y,
      stroke:p.stroke, 'stroke-width':1.2, class:'explore-cross-edge',
    }));
  }

  // --- V5: AI 意外桥接 ---
  for (const bridge of aiBridges) {
    const fromWord = wordNodes.find(w => w.word === bridge.from);
    const toWord = wordNodes.find(w => w.word === bridge.to);
    if (fromWord && toWord) {
      const midX = (fromWord.x + toWord.x) / 2;
      const midY = (fromWord.y + toWord.y) / 2;
      const g = elSVG('g', {});
      g.appendChild(elSVG('line', {
        x1:fromWord.x, y1:fromWord.y, x2:toWord.x, y2:toWord.y,
        stroke:T.primary, 'stroke-width':1.5, class:'explore-bridge-edge',
      }));
      if (bridge.insight && bridge.insight.length < 55) {
        const label = elSVG('text', {
          x:midX, y:midY-6, 'text-anchor':'middle', fill:T.primary,
          class:'explore-bridge-label',
        });
        label.textContent = bridge.insight;
        g.appendChild(label);
      }
      mainG.appendChild(g);
    }
  }

  // --- 连线：概念岛 → 词汇卫星 ---
  for (const cat of catNodes) {
    if (!cat._expanded) continue;
    const catWords = wordNodes.filter(w => w._catId === cat.id);
    const p = palette(cat.type);
    for (const w of catWords) {
      const op = Math.min(1, w._anim?.opacity ?? 1);
      if (op < 0.02) continue;
      mainG.appendChild(elSVG('line', {
        x1:cat.x, y1:cat.y, x2:w.x, y2:w.y,
        stroke:p.stroke, 'stroke-width':0.8, opacity:op*0.28,
      }));
    }
  }

  // --- 词汇卫星 ---
  for (const w of wordNodes) {
    const r = w._anim?.currentR ?? w.r;
    const op = w._anim?.opacity ?? 1;
    if (op < 0.02) continue;
    const g = elSVG('g', {
      class:'explore-node explore-word-node',
      'data-id':w.id, 'data-word':w.word,
      transform:`translate(${w.x},${w.y})`, opacity:op,
    });
    g.appendChild(elSVG('circle', { r, fill:T.surface, stroke:T.border, 'stroke-width':1 }));
    if (r > 7) {
      const txt = elSVG('text', {
        y:r+12, 'text-anchor':'middle', fill:T.text,
        'font-size':SIZES.WORD_LABEL_FONT, 'font-weight':400,
        'font-family':'Inter, system-ui, sans-serif',
      });
      txt.textContent = w.word.length > 11 ? w.word.slice(0,10)+'…' : w.word;
      g.appendChild(txt);
    }
    mainG.appendChild(g);
  }

  // --- 概念岛（漂浮动画）---
  for (const cat of catNodes) {
    const r = cat._anim?.currentR ?? cat.r;
    const op = cat._anim?.opacity ?? 1;
    if (op < 0.02) continue;
    const p = palette(cat.type);

    const g = elSVG('g', {
      class:'explore-node explore-island',
      'data-id':cat.id, 'data-type':cat.type,
      transform:`translate(${cat.x},${cat.y})`, opacity:op,
    });
    const floatDur = (3.5 + simpleHash(cat.id)*3.5).toFixed(1);
    const floatDelay = (simpleHash(cat.id+'d')*2).toFixed(1);
    const floatG = elSVG('g', {
      class:'explore-island-float',
      style:`--float-dur:${floatDur}s;--float-delay:${floatDelay}s;`,
    });

    floatG.appendChild(elSVG('circle', { r:r+10, fill:p.glow, opacity:0.3 }));
    floatG.appendChild(elSVG('circle', { r, fill:p.fill, stroke:p.stroke, 'stroke-width':2.5, filter:'url(#islandGlow)' }));

    const et = elSVG('text', { y:-8, 'text-anchor':'middle', 'font-size':SIZES.CAT_EMOJI_FONT });
    et.textContent = cat.emoji||'🔤';
    floatG.appendChild(et);

    const nt = elSVG('text', { y:18, 'text-anchor':'middle', fill:p.text, 'font-size':SIZES.CAT_NAME_FONT, 'font-weight':600, 'font-family':'Inter, system-ui, sans-serif' });
    nt.textContent = cat.name;
    floatG.appendChild(nt);

    if (cat.words?.length) {
      const badgeR = 11;
      const bx = r-7, by = -(r-7);
      floatG.appendChild(elSVG('circle', { cx:bx, cy:by, r:badgeR, fill:p.stroke }));
      const bt = elSVG('text', { x:bx, y:by+3, 'text-anchor':'middle', fill:'#fff', 'font-size':9, 'font-weight':700 });
      bt.textContent = cat._expanded ? '−' : cat.words.length;
      floatG.appendChild(bt);
    }

    g.appendChild(floatG);
    mainG.appendChild(g);
  }

  // --- 中心概念卡（V5 放大）---
  if (centerNode) {
    const cn = centerNode;
    const CW = SIZES.CENTER_CARD_W, CH = SIZES.CENTER_CARD_H, CRx = SIZES.CENTER_CARD_RX;
    const isLoading = cn._loading, noData = cn._noData;
    const word = cn.word || '';
    const hasInsight = !!(cn.insight && !isLoading);

    const g = elSVG('g', {
      class:'explore-node explore-center',
      'data-id':'center', 'data-word':word,
      transform:`translate(${cn.x},${cn.y})`,
    });
    const breatheG = elSVG('g', { class: isLoading ? '' : 'explore-center-breathe' });

    breatheG.appendChild(elSVG('rect', {
      x:-CW/2, y:-CH/2, width:CW, height:CH, rx:CRx, ry:CRx,
      fill:'none', stroke:T.primary, 'stroke-width':6, opacity:0.12, filter:'url(#cardShadow)',
    }));
    breatheG.appendChild(elSVG('rect', {
      x:-CW/2, y:-CH/2, width:CW, height:CH, rx:CRx, ry:CRx,
      fill:T.surface, stroke:T.primary, 'stroke-width':1.5, opacity:0.96,
    }));

    if (isLoading) {
      breatheG.appendChild(elSVG('circle', { cx:0, cy:0, r:22, fill:'none', stroke:T.primary, 'stroke-width':2.5,
        'stroke-dasharray':`${Math.PI*44*0.7} ${Math.PI*44*0.3}`, opacity:0.6 }));
      const loadTxt = elSVG('text', { y:5, 'text-anchor':'middle', fill:T.textSec, 'font-size':12 });
      loadTxt.textContent = '探索中…';
      breatheG.appendChild(loadTxt);
    } else {
      const topY = -CH/2;

      // 英文单词
      const wordTxt = elSVG('text', {
        x:0, y:topY+34, fill:T.text, 'text-anchor':'middle',
        'font-size':SIZES.CENTER_WORD_FONT, 'font-weight':700,
        'font-family':'Inter, system-ui, sans-serif',
      });
      wordTxt.textContent = word.length > 18 ? word.slice(0,17)+'…' : word;
      breatheG.appendChild(wordTxt);

      // 中文释义
      if (cn.meaning_zh) {
        const zhTxt = elSVG('text', {
          x:0, y:topY+56, fill:T.textSec, 'text-anchor':'middle',
          'font-size':SIZES.CENTER_ZH_FONT, 'font-weight':400,
          'font-family':'Inter, system-ui, sans-serif',
        });
        zhTxt.textContent = cn.meaning_zh.length > 18 ? cn.meaning_zh.slice(0,17)+'…' : cn.meaning_zh;
        breatheG.appendChild(zhTxt);
      }

      if (cn.definition) {
        appendCenteredLines(breatheG, cn.definition, {
          y:topY+80,
          maxChars:48,
          maxLines:2,
          lineHeight:14,
          fill:T.textTer,
          'font-size':SIZES.CENTER_DEF_FONT,
          'font-style':'italic',
          'font-family':'Inter, system-ui, sans-serif',
        });
      }

      // AI Insight
      if (hasInsight) {
        breatheG.appendChild(elSVG('rect', {
          x:-CW/2+18, y:topY+118, width:CW-36, height:46, rx:14,
          fill:T.primary, opacity:0.07,
        }));
        appendCenteredLines(breatheG, cn.insight, {
          y:topY+138,
          maxChars:52,
          maxLines:2,
          lineHeight:13,
          fill:T.textSec,
          'font-size':SIZES.CENTER_INSIGHT_FONT,
          'font-style':'italic',
          'font-family':'Inter, system-ui, sans-serif',
          class:'explore-insight-text',
        });
      }

      // CEFR 徽章
      if (cn.cefr) {
        const badgeW=38, badgeH=22;
        const bx=CW/2-badgeW-12, by=topY+10;
        const cefrColor = CEFR_COLORS[cn.cefr]||'#94a3b8';
        breatheG.appendChild(elSVG('rect', { x:bx, y:by, width:badgeW, height:badgeH, rx:11, ry:11, fill:cefrColor, opacity:0.9 }));
        const btxt = elSVG('text', { x:bx+badgeW/2, y:by+badgeH/2+4, 'text-anchor':'middle', fill:'#fff', 'font-size':10, 'font-weight':700, 'font-family':'Inter, system-ui, sans-serif' });
        btxt.textContent = cn.cefr;
        breatheG.appendChild(btxt);
      }
    }

    if (noData) {
      const qt = elSVG('text', { x:CW/2-24, y:-CH/2+18, 'text-anchor':'middle', fill:'#f59e0b', 'font-size':14, 'font-weight':700 });
      qt.textContent = '?';
      breatheG.appendChild(qt);
    }

    g.appendChild(breatheG);
    mainG.appendChild(g);
  }

  // --- V5: 路径标记（空间轨迹点）---
  for (const pm of pathMarkers) {
    const markerG = elSVG('g', {
      class:'explore-path-marker',
      'data-word':pm.word,
      transform:`translate(${pm.x},${pm.y})`,
      opacity:0.32,
    });
    markerG.appendChild(elSVG('circle', {
      r:18, fill:T.surface, stroke:pm.color, 'stroke-width':2,
      class:'explore-path-marker-circle',
    }));
    const txt = elSVG('text', {
      y:27, 'text-anchor':'middle', fill:T.textSec,
      'font-size':9, 'font-weight':500,
      'font-family':'Inter, system-ui, sans-serif',
    });
    txt.textContent = pm.word.length > 11 ? pm.word.slice(0,10)+'…' : pm.word;
    markerG.appendChild(txt);
    mainG.appendChild(markerG);
  }

  // --- V5: 通用尘埃 + 概念环境尘埃 ---
  const allDust = centerNode
    ? conceptDust.map(d => ({ ...d, opacity:0.025 }))
    : dustParticles.map(d => ({ ...d, opacity:0.025 }));
  for (const dp of allDust) {
    const dustG = elSVG('g', { class:'explore-dust-particle' });
    const dt = elSVG('text', {
      x:dp.x, y:dp.y, 'text-anchor':'middle', fill:T.textTer,
      'font-size':dp.fontSize, 'font-weight':200,
      'font-family':'Inter, system-ui, sans-serif',
      opacity: dp.opacity || 0.03,
    });
    dt.textContent = dp.word;
    dt.style.animation = `dust-drift-float ${dp.dur}s linear ${dp.delay}s infinite`;
    dt.style.setProperty('--dx', dp.driftX+'px');
    dt.style.setProperty('--dy', dp.driftY+'px');
    dustG.appendChild(dt);
    mainG.appendChild(dustG);
  }

  // --- 空画布 ---
  if (!centerNode) {
    const msgs = [
      { y:-60, size:36, text:'🌌' },
      { y:-10, size:18, text:'输入一个英文单词，探索它的概念宇宙', weight:500 },
      { y:24, size:13, text:'知识岛 × 词汇卫星 × AI 语义网络' },
      { y:50, size:11, text:'或从下方 🧭 探索路线 开始漫游' },
    ];
    for (const m of msgs) {
      const t = elSVG('text', { x:W/2, y:H/2+m.y, 'text-anchor':'middle', fill:T.textTer, 'font-size':m.size, 'font-weight':m.weight||400 });
      t.textContent = m.text;
      mainG.appendChild(t);
    }
  }

  svgEl.appendChild(mainG);
  updateBreadcrumb();
}

// ==================== 面包屑 ====================
function updateBreadcrumb() {
  const el = rootEl?.querySelector('#explore-path');
  if (!el) return;
  const trail = pathHistory.filter(p => p.level === 0);
  const homeBtn = '<span class="explore-path-home" id="explore-path-home" title="返回概念宇宙">🧠</span>';

  if (trail.length === 0) { el.innerHTML = homeBtn; bindBreadcrumbHome(el); return; }

  const trailHtml = trail.map((p, i) => `
    <span class="explore-path-item" data-idx="${i}" data-word="${sanitizeHTML(p.word)}">${sanitizeHTML(p.word)}</span>
    ${i < trail.length - 1 ? '<span class="explore-path-arrow">→</span>' : ''}
  `).join('');

  el.innerHTML = homeBtn + trailHtml;
  bindBreadcrumbHome(el);

  el.querySelectorAll('.explore-path-item').forEach(item => {
    item.addEventListener('click', () => {
      const w = item.dataset.word;
      const idx = +item.dataset.idx;
      if (w && idx < trail.length - 1) {
        pathHistory = pathHistory.slice(0, pathHistory.findIndex(p => p.word === w && p.level === 0) + 1);
        // 同时裁剪路径标记
        const pmIdx = pathMarkers.findIndex(pm => pm.word === w);
        if (pmIdx >= 0) pathMarkers = pathMarkers.slice(0, pmIdx);
        transform = { x:0, y:0, scale:1 };
        loadMindMap(w);
      }
    });
  });
}

function bindBreadcrumbHome(el) {
  const homeBtn = el.querySelector('#explore-path-home');
  if (homeBtn) {
    homeBtn.onclick = () => {
      pathHistory = []; pathMarkers = [];
      centerNode=null; catNodes=[]; wordNodes=[]; mindMap=null;
      crossIslandEdges=[]; aiBridges=[]; conceptDust=[];
      transform={ x:0, y:0, scale:1 };
      activeJourney=null; audioCard=null;
      render();
    };
  }
}

// ==================== Concept Journey 面板 ====================
function initJourneyPanel() {
  const toggleBtn = rootEl?.querySelector('#explore-journey-toggle');
  const body = rootEl?.querySelector('#explore-journey-body');
  const list = rootEl?.querySelector('#explore-journey-list');
  const activeDiv = rootEl?.querySelector('#explore-journey-active');
  const panel = rootEl?.querySelector('#explore-journey-panel');
  const arrowBtn = rootEl?.querySelector('#explore-journey-btn');
  if (!toggleBtn || !body || !list || !activeDiv || !panel) return;

  toggleBtn.onclick = () => {
    journeyExpanded = !journeyExpanded;
    if (journeyExpanded) {
      panel.classList.remove('collapsed'); body.classList.remove('hidden');
      if (arrowBtn) arrowBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
      renderJourneyChoices(list, activeDiv);
    } else {
      panel.classList.add('collapsed'); body.classList.add('hidden');
      if (arrowBtn) arrowBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
    }
  };
  renderJourneyChoices(list, activeDiv);
}

function renderJourneyChoices(list, activeDiv) {
  if (!list || !activeDiv) return;
  if (activeJourney) {
    list.classList.add('hidden'); activeDiv.classList.remove('hidden');
    const j = activeJourney.journey, idx = activeJourney.currentIndex;
    const isComplete = idx >= j.route.length;
    if (isComplete) {
      activeDiv.innerHTML = `<div class="explore-journey-active"><span>🎉</span><span style="flex:1;">「${sanitizeHTML(j.title)}」探索完成！</span><button class="btn btn-ghost btn-sm" id="journey-reset">重新探索</button></div>`;
      activeDiv.querySelector('#journey-reset').onclick = () => { activeJourney=null; list.classList.remove('hidden'); activeDiv.classList.add('hidden'); renderJourneyChoices(list, activeDiv); };
    } else {
      const currentWord = j.route[idx];
      activeDiv.innerHTML = `<div class="explore-journey-active"><span>${j.emoji}</span><span style="flex:1;">${sanitizeHTML(j.title)} · ${idx+1}/${j.route.length}</span><span style="font-weight:600;color:var(--primary);">${sanitizeHTML(currentWord)}</span><button class="btn btn-sm" id="journey-next" style="background:var(--primary);color:#fff;padding:0.125rem 0.5rem;font-size:0.75rem;">下一站 →</button></div>`;
      activeDiv.querySelector('#journey-next').onclick = () => journeyNext();
    }
  } else {
    list.classList.remove('hidden'); activeDiv.classList.add('hidden');
    list.innerHTML = CONCEPT_JOURNEYS.map(j => `<div class="explore-journey-route" data-journey-id="${j.id}"><span class="explore-journey-route-emoji">${j.emoji}</span><span class="explore-journey-route-words" title="${sanitizeHTML(j.route.join(' → '))}"><strong>${sanitizeHTML(j.title)}</strong><span style="font-size:0.625rem;color:var(--text-tertiary);">${sanitizeHTML(j.description)}</span></span></div>`).join('');
    list.querySelectorAll('.explore-journey-route').forEach(el => {
      el.addEventListener('click', () => {
        const ji = CONCEPT_JOURNEYS.find(j => j.id === el.dataset.journeyId);
        if (ji) startJourney(ji);
      });
    });
  }
}

function startJourney(journey) {
  activeJourney = { journey, currentIndex:0 };
  pathHistory=[]; pathMarkers=[];
  transform={ x:0, y:0, scale:1 };
  loadMindMap(journey.route[0]);
  const list=rootEl?.querySelector('#explore-journey-list');
  const ad=rootEl?.querySelector('#explore-journey-active');
  if (list && ad) renderJourneyChoices(list, ad);
  showToast(`开始「${journey.title}」探索之旅`, 'info');
}

function journeyNext() {
  if (!activeJourney) return;
  activeJourney.currentIndex++;
  const j = activeJourney.journey;
  if (activeJourney.currentIndex >= j.route.length) {
    const list=rootEl?.querySelector('#explore-journey-list');
    const ad=rootEl?.querySelector('#explore-journey-active');
    if (list && ad) renderJourneyChoices(list, ad);
    showToast(`🎉「${j.title}」探索完成！`, 'success');
    return;
  }
  transform={ x:0, y:0, scale:1 };
  loadMindMap(j.route[activeJourney.currentIndex]);
  const list=rootEl?.querySelector('#explore-journey-list');
  const ad=rootEl?.querySelector('#explore-journey-active');
  if (list && ad) renderJourneyChoices(list, ad);
}

// ==================== 听力联动卡片 ====================
function findWordInMaterials(word) {
  const materials = getMaterials();
  const results = [];
  const lower = word.toLowerCase();
  for (const m of materials) {
    if (!m.originalText) continue;
    const text = m.originalText.toLowerCase();
    if (text.includes(lower)) {
      const words = m.originalText.split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        if (words[i].toLowerCase().replace(/[^a-z']/g, '') === lower) {
          const start = Math.max(0, i-5), end = Math.min(words.length, i+6);
          const snippet = words.slice(start, end).join(' ');
          results.push({ materialId:m.id, title:m.title||'Untitled', source:detectSource(m.title), snippet:(start>0?'…':'')+snippet+(end<words.length?'…':'') });
          break;
        }
      }
    }
  }
  return results.slice(0, 3);
}

function detectSource(title) {
  const t = (title||'').toLowerCase();
  if (t.includes('bbc')) return 'BBC';
  if (t.includes('voa')) return 'VOA';
  if (t.includes('ted')) return 'TED';
  if (t.includes('bloomberg')) return 'Bloomberg';
  return '📰';
}

function showWordCard(node, mouseX, mouseY) {
  const word = node?.word || '';
  const sources = findWordInMaterials(word);
  const card = rootEl?.querySelector('#explore-audio-card');
  if (!card) return;
  audioCard = { word, x:mouseX, y:mouseY, sources };

  card.innerHTML = `
    <div class="explore-word-card-head">
      <div class="explore-tt-word">${sanitizeHTML(word)}</div>
      ${node?.meaning_zh ? `<div class="explore-word-card-zh">${sanitizeHTML(node.meaning_zh)}</div>` : ''}
    </div>
    ${node?.definition ? `<div class="explore-word-card-definition">${sanitizeHTML(node.definition)}</div>` : ''}
    ${node?.relation ? `<div class="explore-word-card-relation">与当前中心：${sanitizeHTML(node.relation)}</div>` : ''}
    ${sources.length ? `
      <div class="explore-word-card-sources">素材中的用法</div>
      ${sources.map(s => `<div class="explore-audio-source"><div class="explore-audio-meta"><span style="font-weight:600;font-size:0.625rem;">${sanitizeHTML(s.source)}</span><span class="explore-audio-title" title="${sanitizeHTML(s.snippet)}">${sanitizeHTML(s.snippet)}</span></div></div>`).join('')}
    ` : ''}
    <div class="explore-word-card-hint">双击进入「${sanitizeHTML(word)}」的概念宇宙</div>
  `;

  card.style.left = Math.max(16, Math.min(mouseX+20, window.innerWidth-316))+'px';
  card.style.top = Math.max(76, Math.min(mouseY-30, window.innerHeight-320))+'px';
  card.classList.remove('hidden');

}

function hideAudioCard() {
  const card = rootEl?.querySelector('#explore-audio-card');
  if (card) card.classList.add('hidden');
  audioCard = null;
}

// ==================== 事件 ====================
function bindEvents() {
  rootEl.querySelector('#explore-close').onclick = () => window.App?.switchView('materials');
  _escHandler = e => { if (e.key === 'Escape') window.App?.switchView('materials'); };
  document.addEventListener('keydown', _escHandler);

  // 搜索
  const si = rootEl.querySelector('#explore-search');
  si.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const w = si.value.trim().toLowerCase();
      if (!w || w.length < 2) return;
      transform={ x:0,y:0,scale:1 }; pathHistory=[]; pathMarkers=[];
      activeJourney=null; hideAudioCard(); conceptDust=[];
      loadMindMap(w); si.value='';
      const list=rootEl?.querySelector('#explore-journey-list');
      const ad=rootEl?.querySelector('#explore-journey-active');
      if (list && ad) renderJourneyChoices(list, ad);
    }
  });

  // 拖拽
  canvasEl.addEventListener('mousedown', e => {
    if (e.target.closest('.explore-node') || e.target.closest('.explore-path-marker')) return;
    isDragging=true; dragStart={ x:e.clientX, y:e.clientY };
    dragTrans={ x:transform.x, y:transform.y }; canvasEl.style.cursor='grabbing';
    hideAudioCard();
  });
  _mouseMoveHandler = e => {
    if (!isDragging) return;
    transform.x = dragTrans.x + (e.clientX - dragStart.x);
    transform.y = dragTrans.y + (e.clientY - dragStart.y);
    render();
  };
  _mouseUpHandler = () => { if (isDragging) { isDragging=false; if (canvasEl) canvasEl.style.cursor='grab'; } };
  window.addEventListener('mousemove', _mouseMoveHandler);
  window.addEventListener('mouseup', _mouseUpHandler);

  // 缩放
  canvasEl.addEventListener('wheel', e => {
    e.preventDefault();
    const d = e.deltaY > 0 ? 0.9 : 1.1;
    const ns = Math.min(3, Math.max(0.2, transform.scale * d));
    const rect = canvasEl.getBoundingClientRect();
    const mx = e.clientX - rect.left - rect.width/2;
    const my = e.clientY - rect.top - rect.height/2;
    transform.x = (transform.x - mx) * (ns/transform.scale) + mx;
    transform.y = (transform.y - my) * (ns/transform.scale) + my;
    transform.scale = ns;
    render();
  }, { passive:false });

  // V5: 单击交互 — 词汇 → 音频卡，路径标记 → 跳回
  svgEl.addEventListener('click', e => {
    // 路径标记：点击跳回
    const marker = e.target.closest('.explore-path-marker');
    if (marker) {
      const w = marker.dataset.word;
      if (w) {
        const idx = pathMarkers.findIndex(pm => pm.word === w);
        if (idx >= 0) pathMarkers = pathMarkers.slice(0, idx);
        transform={ x:0,y:0,scale:1 };
        loadMindMap(w);
      }
      return;
    }

    const g = e.target.closest('.explore-node');
    if (!g) { hideAudioCard(); return; }
    if (g.classList.contains('explore-center')) { hideAudioCard(); return; }
    if (g.classList.contains('explore-island')) { hideAudioCard(); if (g.dataset.id) toggleCategory(g.dataset.id); return; }

    const word = g.dataset.word;
    if (word) {
      const node = wordNodes.find(item => item.id === g.dataset.id || item.word === word);
      showWordCard(node, e.clientX, e.clientY);
    }
  });

  // V5: 双击 → 飞行探索（带动画）
  svgEl.addEventListener('dblclick', e => {
    const g = e.target.closest('.explore-node');
    if (!g || isFlying) return;

    if (g.classList.contains('explore-word-node')) {
      const word = g.dataset.word;
      const wn = wordNodes.find(n => n.id === g.dataset.id);
      if (word && wn) {
        hideAudioCard();
        flyToWord(wn.x, wn.y, word);
        return;
      }
    }

    if (g.classList.contains('explore-island')) {
      const cat = catNodes.find(c => c.id === g.dataset.id);
      if (cat) {
        const tx=-cat.x, ty=-cat.y;
        const sx=transform.x, sy=transform.y;
        const start=performance.now();
        cancelAllAnims();
        const tick = now => {
          const t=Math.min(1, (now-start)/500);
          const e=1-Math.pow(1-t,3);
          transform.x=sx+(tx-sx)*e; transform.y=sy+(ty-sy)*e;
          render();
          if (t<1) animRequest(tick);
        };
        animRequest(tick);
      }
      return;
    }
    hideAudioCard();
  });

  // Hover tooltip
  const tip = rootEl.querySelector('#explore-tooltip');
  svgEl.addEventListener('mouseover', e => {
    const g = e.target.closest('.explore-node');
    if (!g) { tip.classList.add('hidden'); return; }

    if (g.classList.contains('explore-center')) {
      const cn = centerNode;
      const cefrL = cn?.cefr ? ` ${cn.cefr} (${CEFR_LABELS[cn.cefr]||''})` : '';
      tip.innerHTML = `<div class="explore-tt-word">${sanitizeHTML(cn?.word||'')}</div>${cn?.insight?`<div class="explore-tt-level">💡 ${sanitizeHTML(cn.insight)}</div>`:''}${cn?.meaning_zh?`<div class="explore-tt-level">${sanitizeHTML(cn.meaning_zh)}${cefrL}</div>`:''}${cn?.definition?`<div class="explore-tt-hint">📖 ${sanitizeHTML(cn.definition)}</div>`:''}`;
    } else if (g.classList.contains('explore-island')) {
      const cat = catNodes.find(c => c.id === g.dataset.id);
      const tl = { scene:'场景',emotion:'情绪',action:'动作',power:'决策',concept:'概念' }[cat?.type]||'';
      const wp = (cat?.words||[]).slice(0,4).map(w=>w.word).join(' · ');
      tip.innerHTML = `<div class="explore-tt-word">${cat?.emoji||''} ${sanitizeHTML(cat?.name||'')}</div><div class="explore-tt-level">${tl}概念岛 · ${cat?.words?.length||0} 个词汇</div><div class="explore-tt-hint">${sanitizeHTML(wp)}</div><div class="explore-tt-hint">单击展开词汇卫星</div>`;
    } else {
      const w = g.dataset.word||'';
      const node = wordNodes.find(item => item.id === g.dataset.id || item.word === w);
      const gd = getWordGraphData(w);
      const freq = gd?.freq||0;
      const fl = freq>10?'高频词':freq>3?'常见词':'';
      tip.innerHTML = `<div class="explore-tt-word">${sanitizeHTML(w)}</div>${node?.meaning_zh?`<div class="explore-tt-level">${sanitizeHTML(node.meaning_zh)}</div>`:''}${node?.definition?`<div class="explore-tt-hint">${sanitizeHTML(node.definition)}</div>`:''}${fl?`<div class="explore-tt-level">${fl} · 在 ${gd?.materialCount||0} 篇素材中出现</div>`:''}<div class="explore-tt-hint">单击查看素材来源 · 双击深入探索</div>`;
    }
    tip.classList.remove('hidden');
  });
  svgEl.addEventListener('mousemove', e => {
    if (tip.classList.contains('hidden')) return;
    tip.style.left = Math.min(e.clientX+15, window.innerWidth-200)+'px';
    tip.style.top = (e.clientY-10)+'px';
  });
  svgEl.addEventListener('mouseleave', () => tip.classList.add('hidden'));

  _clickOutsideHandler = (e) => {
    if (audioCard && !e.target.closest('.explore-audio-card') && !e.target.closest('.explore-word-node')) {
      hideAudioCard();
    }
  };
  document.addEventListener('click', _clickOutsideHandler);
}

// ==================== 销毁 ====================
export function destroyExploreMode() {
  cancelAllAnims();
  mindMapRequests.cancel();
  if (_resizeHandler) { window.removeEventListener('resize', _resizeHandler); _resizeHandler=null; }
  if (_escHandler) { document.removeEventListener('keydown', _escHandler); _escHandler=null; }
  if (_mouseMoveHandler) { window.removeEventListener('mousemove', _mouseMoveHandler); _mouseMoveHandler=null; }
  if (_mouseUpHandler) { window.removeEventListener('mouseup', _mouseUpHandler); _mouseUpHandler=null; }
  if (_clickOutsideHandler) { document.removeEventListener('click', _clickOutsideHandler); _clickOutsideHandler=null; }
  mindMap=null; centerNode=null; catNodes=[]; wordNodes=[]; pathHistory=[];
  pathMarkers=[]; crossIslandEdges=[]; aiBridges=[];
  dustParticles=[]; conceptDust=[]; starParticles=[]; activeJourney=null; audioCard=null;
  journeyExpanded=false; isFlying=false;
  svgEl=null; rootEl=null; canvasEl=null;
}
