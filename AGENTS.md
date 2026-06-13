# Silentium — 项目开发指引

## 项目简介
纯前端英语精听训练网站。定位从"听力播放器"升级为"英语知识探索工具"。

## 线上状态
**已下线**。仅本地使用：`npx serve . -p 3456` → http://localhost:3456

## 核心原则
1. **纯前端**，无后端，数据存 LocalStorage + IndexedDB
2. **安全第一**：用户输入用 textContent，禁止 innerHTML
3. **实时保存**：800ms 防抖写入 LocalStorage
4. **极简交互**：不堆功能，优先学习价值

## 技术栈
| 层面 | 选型 |
|------|------|
| 页面 | HTML5 SPA |
| CSS | Tailwind CSS v3 CDN |
| JS | 原生 ES Modules |
| 图标 | Font Awesome 6 CDN |
| 存储 | LocalStorage（元数据）+ IndexedDB（音频 Blob） |
| 词典 | Free Dictionary API → MyMemory 翻译（中文） |
| AI | DeepSeek API（知识网络生成，需用户配置 Key） |

## 文件结构
```
English web/
├── index.html
├── AGENTS.md
├── css/style.css
├── js/
│   ├── app.js              # SPA 路由/视图切换
│   ├── storage.js          # LocalStorage + IndexedDB + Streak
│   ├── data-structure.js   # 数据结构定义
│   ├── utils.js            # 工具函数
│   ├── theme.js            # 深浅色主题
│   ├── player.js           # 音频播放器
│   ├── materials.js        # 素材管理（含段落编辑器）
│   ├── text-cleaner.js     # 原文清洗
│   ├── dictation.js        # 整篇听写（含段落重练模式）
│   ├── diff.js             # LCS 词对齐 + 错误分类
│   ├── paragraph.js        # 段落拆分/时间估算/热力图/持久化
│   ├── segmented.js        # 分段训练模式（默认入口）
│   ├── feedback.js         # 训练反馈页（评分+热力图+加词）
│   ├── shadowing.js        # 极简影子跟读
│   ├── dictionary.js       # 查词卡片（中英释义+自动收藏+AI入口）
│   ├── vocabulary.js       # 生词本
│   ├── content-library.js  # 内置内容库（BBC/VOA等9+篇）
│   ├── knowledge-graph.js  # 词共现分析 + SVG图谱
│   ├── word-bank.js        # 词库（全素材词频索引）
│   ├── ai-network.js       # DeepSeek AI 知识网络
│   ├── explore-mode.js     # Concept Universe V5 概念宇宙探索器
│   ├── dashboard.js        # 进度看板 + 个人统计 + 趋势图
│   ├── focus-mode.js       # 计时专注
│   ├── review.js           # 智能复习
│   ├── segmentation.js     # 分句编辑（已废弃）
│   └── silence-detector.js # 静音检测（已废弃）
```

## 已实现功能

### 训练体系
- **分段训练**（默认入口）：逐段播放→默写→提交→对比→下一段→总结
- **整篇听写**：保留为备选（训练列表"整篇"按钮）
- **影子跟读**：逐段播放→录音→回放→下一段
- **段落重练**：热力图点击薄弱段落单独重练

### 错误分析
- LCS 词对齐，3 类错误：漏词/多词/替换词
- 准确率保留一位小数 + A/B/C/D/E 五档等级
- 独立反馈页：评分 + 错误分布 + 逐词对比 + 段落热力图

### 词典 & 知识
- 双击查词：中英释义（MyMemory 翻译）+ 例句 + 自动收藏生词本
- 知识图谱：词共现 SVG 径向图（单击展开/双击聚焦）
- 词库：全素材词频索引 + 字母导航 + 搜索
- AI 知识网络：DeepSeek 生成搭配/同义词/场景/思维导图

### 内容库
- 9 篇内置素材（BBC 6ME/VOA/TED/Bloomberg）
- 难度标签（初级/中级/高级）+ 分类
- 一键导入 + 来源链接

### 进度 & 统计
- 连续学习天数（Streak）+ 里程碑
- 个人成长：最佳/进步最大/最困难/总训练次数
- SVG 准确率趋势图

### 素材管理
- CRUD + JSON 导入导出 + 原文清洗
- 段落拆分编辑器（自动分段 + 手动合并/拆分）
- 段落时间微调（起始/结束独立调整，链式传播）

## 数据存储关键字段

```
Material {
  id, title, originalText, audioId, audioDuration, audioUrl,
  paragraphs: [{id, index, text, startTime, endTime, wordCount}],
  dictationInput,                       // 整篇输入
  dictationResult: {pairs, stats, accuracy, grade, createdAt},
  scoreHistory: [{accuracy, grade, stats, createdAt}], // 最多20条
  paragraphResults: {[paraIndex]: {pairs, stats, accuracy}},
  status: 'pending' | 'dictating' | 'completed',
}

Vocabulary { id, word, phonetic, partOfSpeech, definition, materialId }

Streak { lastActiveDate, currentStreak, longestStreak }

AI Cache { [word]: {...} }  // aiWordCache

IndexedDB: EnglishListeningDB / audioFiles (key = materialId)
```

## 开发注意事项

1. **SVG 渲染**：必须用 `document.createElementNS('http://www.w3.org/2000/svg', ...)` 创建 SVG 元素。innerHTML 设置 SVG 内容在浏览器中不可靠，CSS 变量也无法解析。
2. **全屏视图**：使用 `cnt.innerHTML` 替换 view-panel 内容，不要创建独立 div 挂 body。
3. **段落拆分**：优先空行 → 单行分组 → 句子均匀拆分。
4. **时间估算**：词数比例（段落词数/总词数×总时长）。
5. **错误分类**：missing + extra 按序配对合并为 replacement，accuracy = correct/(correct+missing+replacement)。
6. **API 顺序**：查词先出英文（快），异步补中文（慢），不阻塞显示。

## 正在开发
- Explore Mode：全屏知识探索画布。当前状态：V5 已实现。Concept Universe 概念宇宙 — 中心概念卡（300×170，含 AI Insight）+ 知识岛聚类布局（黄金角螺旋）+ 概念岛领土模糊光晕 + 空间路径标记 + 飞行动画（650ms pan+zoom）+ 跨岛弱连接 + AI 意外桥接 + Knowledge Dust 双重背景尘埃 + Concept Journey 推荐路线 + 听力联动 UI 入口。V5 修复：fetch 10s 超时 + 15s 安全定时器防止永久 loading。
