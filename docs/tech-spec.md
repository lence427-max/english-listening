# Silentium — 技术规格文档

## 技术栈

| 层面 | 选型 | 说明 |
|------|------|------|
| 标记语言 | HTML5 | 语义化标签 |
| CSS 框架 | Tailwind CSS v3 | CDN 引入，utility-first |
| 编程语言 | 原生 JavaScript (ES Modules) | 无框架，无构建工具 |
| 图标 | Font Awesome 6 | CDN 引入 |
| 存储 | LocalStorage + IndexedDB | 元数据用 LS，音频用 IDB |
| 浏览器 API | 见下文 | 全部浏览器原生能力 |

## 浏览器 API 依赖

| API | 用途 | 阶段 |
|-----|------|------|
| HTMLAudioElement | 音频播放控制 | 一 |
| Web Audio API | 音频分析、波形采样 | 二/三（延后） |
| MediaRecorder | 用户录音 | 三（延后） |
| Web Speech API | 语音识别转写 | 三（延后） |
| Page Visibility API | 专注模式切屏检测 | 四 |
| File API | 文件读取（音频、JSON） | 一 |
| Canvas API | 波形绘制、周报卡片 | 三/五（延后） |
| IndexedDB | 大文件（音频）存储 | 一 |

## 外部 API

### 词典 API

**主 API**：Free Dictionary API
```
GET https://api.dictionaryapi.dev/api/v2/entries/en/{word}
```
- 免费，支持 CORS
- 返回：音标、词性、释义、例句
- 稳定性一般，需要错误处理

**备用 API**：Datamuse API
```
GET https://api.datamuse.com/api/words?sp={word}&md=d&max=1
```
- 免费，支持 CORS
- 返回：词性标签、近义词
- 不提供完整释义，作为降级方案

**降级策略**：
1. 先请求主 API
2. 3 秒超时或出错 → 请求备用 API
3. 备用也失败 → 显示"词典暂不可用"提示
4. 不阻断任何核心功能

## 数据存储结构

### LocalStorage Key 设计

| Key | 内容 | 大小估算 |
|-----|------|---------|
| `materials` | 素材元数据数组 | ~5KB/条 |
| `trainingRecords` | 训练记录数组 | ~10KB/条 |
| `vocabulary` | 生词本数组 | ~2KB/条 |
| `settings` | 用户设置对象 | ~1KB |
| `focusSessions` | 专注计时记录 | ~1KB/条 |

### IndexedDB 设计

**数据库名**：`EnglishListeningDB`
**版本**：1

**Object Store**：`audioFiles`
- `keyPath`: `id`（与素材 ID 对应）
- 字段：`id`, `blob`, `fileName`, `mimeType`, `size`, `createdAt`

### 核心数据结构

```javascript
// 素材
Material {
  id: string,           // UUID
  title: string,
  originalText: string, // 原始英文文本
  audioId: string,      // IndexedDB 中的音频 key
  audioFileName: string,
  audioDuration: number,// 秒
  sentences: Sentence[],// 分句列表
  status: 'pending' | 'segmenting' | 'dictating' | 'reading' | 'completed',
  createdAt: string,    // ISO 8601
  updatedAt: string,
}

// 句子
Sentence {
  id: string,
  index: number,
  text: string,
  startTime: number,    // 音频起始时间（秒）
  endTime: number,      // 音频结束时间（秒）
  hintUsed: number,     // 0-3
  dictationInput: string,      // 用户听写输入
  dictationResult: {           // 比对结果
    words: [{ word: string, status: 'correct' | 'wrong' | 'missing' | 'extra' }]
  },
  isDifficult: boolean, // 手动标记难句
  notes: string,        // 单句笔记
  recordings: Recording[], // 最多5条（延后）
  matchScore: number,   // 语音匹配度（延后）
  reciteDone: boolean,  // 背诵完成（延后）
}

// 训练记录
TrainingRecord {
  materialId: string,
  phase: 'dictation' | 'reading' | 'reciting',
  completedAt: string,
  totalSentences: number,
  errorCount: number,
  hintTotalCount: number,
  difficultSentences: string[], // sentenceId[]
  notes: string,
  reviewStatus: 'mastered' | 'need_review' | 'strengthen',
  nextReviewDate: string,
}

// 生词本
VocabularyItem {
  id: string,
  word: string,
  phonetic: string,
  partOfSpeech: string,
  definition: string,
  materialId: string,
  sentenceId: string,
  addedAt: string,
}

// 用户设置
Settings {
  theme: 'light' | 'dark' | 'system',
  playbackRate: number,    // 0.5-1.5
  focusDuration: number,   // 专注时长（分钟），默认 25
  autoPauseBetweenSentences: boolean,
  pauseDuration: number,   // 句间暂停秒数
}
```

## 文件结构

```
English web/
├── index.html              # 主入口（SPA）
├── CLAUDE.md               # 项目开发指引
├── devlog/                  # 开发日志
│   └── YYYY-MM-DD.md
├── docs/                    # 文档
│   ├── requirements.md
│   ├── tech-spec.md
│   ├── design-spec.md
│   └── development-steps.md
├── css/
│   └── style.css           # 自定义样式 + 主题 CSS 变量
├── js/
│   ├── app.js              # 应用初始化、路由、视图切换
│   ├── storage.js          # LocalStorage + IndexedDB 封装
│   ├── data-structure.js   # 数据校验、Schema 定义
│   ├── theme.js            # 主题管理
│   ├── materials.js        # 素材管理 CRUD
│   ├── player.js           # 音频播放器封装
│   ├── dictation.js        # 听写模块
│   ├── segmentation.js     # 分句模块
│   ├── dictionary.js       # 在线词典
│   ├── focus-mode.js       # 计时专注模式
│   ├── dashboard.js        # 进度看板
│   ├── vocabulary.js       # 生词本
│   ├── review.js           # 智能复习
│   └── utils.js            # 工具函数（XSS 过滤、UUID 生成等）
└── prototypes/              # 原型文件（开发后删除）
    ├── prototype-sidebar.html
    └── prototype-topnav.html
```

## 安全措施

1. **XSS 防护**：所有用户输入使用 `textContent` 或 `createTextNode`；必要 HTML 渲染时使用 DOMPurify
2. **JSON 校验**：导入时验证结构完整性，拒绝非预期字段和脚本
3. **CDN 安全**：所有 CDN 资源使用 HTTPS，Tailwind/FontAwesome 从官方 CDN 加载
4. **API 请求**：不传递用户数据到外部 API，仅发送查询词
5. **CSP 兼容**：不使用 `eval()`、`new Function()` 等
