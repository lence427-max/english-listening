# Silentium — 项目开发指引

## 项目简介
纯前端的英语精听训练网站。整篇听写模式：播放音频 → 边听边写 → 提交对比，不一致处标红。

## 线上地址
**https://lence427-max.github.io/english-listening/**
仓库：https://github.com/lence427-max/english-listening

## 核心原则

1. **纯前端**，无后端，所有数据存浏览器 LocalStorage + IndexedDB
2. **极简听写**：整篇一个输入框，不拆句不分段
3. **安全第一**：所有用户输入用 textContent，禁止 innerHTML 插入用户内容
4. **实时保存**：输入内容 800ms 防抖自动写入 LocalStorage

## 技术栈

| 层面 | 选型 |
|------|------|
| 页面 | HTML5 |
| CSS | Tailwind CSS v3 CDN |
| JS | 原生 ES Modules |
| 图标 | Font Awesome 6 CDN |
| 存储 | LocalStorage（元数据）+ IndexedDB（音频 Blob） |
| 词典 | Free Dictionary API → Datamuse API（备用） |
| 部署 | GitHub Pages |

## 文件结构

```
English web/
├── index.html              # SPA 入口
├── CLAUDE.md               # 本文件
├── .gitignore
├── devlog/                  # 开发日志
├── docs/                    # 需求/技术/设计文档
├── css/
│   └── style.css           # 主题变量 + 全部样式
├── js/
│   ├── app.js              # 路由/视图切换
│   ├── storage.js          # LocalStorage + IndexedDB 封装
│   ├── data-structure.js   # 数据结构定义与校验
│   ├── utils.js            # 工具函数（XSS过滤/Toast/对话框等）
│   ├── theme.js            # 深浅色主题
│   ├── player.js           # 音频播放器
│   ├── materials.js        # 素材管理 CRUD + JSON导入导出
│   ├── text-cleaner.js     # 原文智能清洗（去BBC格式噪音）
│   ├── dictation.js        # 核心听写（整篇模式）
│   ├── dictionary.js       # 在线词典（双击查词）
│   ├── focus-mode.js       # 计时专注模式
│   ├── dashboard.js        # 进度看板
│   ├── review.js           # 智能复习
│   ├── vocabulary.js       # 生词本
│   ├── segmentation.js     # 分句编辑（已废弃，保留备用）
│   └── silence-detector.js # 音频静音检测（已废弃，保留备用）
└── 训练素材/
    └── 1/                  # BBC 6 Minute English — The Power of Poetry
```

## 当前功能

### 已实现
- 素材管理（新建/编辑/删除 + 原文清洗 + JSON导入导出）
- 整篇听写（播放音频 → 边听边写 → 查看原文 → 提交 → 对比标红）
- 在线词典（双击查词 + 加入生词本）
- 生词本（按素材分类 + 导出Markdown）
- 进度看板（10篇目标网格 + 统计 + 里程碑）
- 计时专注模式（SVG倒计时 + 切屏提醒）
- 智能复习（随机抽句）
- 深浅色主题（跟随系统 + 手动切换）
- GitHub Pages 部署

### 已废弃
- 分句编辑、3级提示、精读面板、错题集 → 用户要求极简化

### 未做
- 录音跟读、语音评分、影子跟读（阶段三）
- 学习周报卡片（阶段五）
- 移动端深度适配
- 存储容量监控

## 开发部署

### 本地开发
```bash
cd "d:/vibe coding/English web"
npx serve . -p 3456
```
浏览器打开 http://localhost:3456

### 部署更新
```bash
cd "d:/vibe coding/English web"
git add -A && git commit -m "更新描述" && git push
```
1 分钟后自动更新到线上。

## 数据存储关键字段

- Material：`dictationInput`（整篇听写输入）、`dictationResult`（对比结果数组 `[{word, userWord, match}]`）
- 状态：`pending` → `dictating` → `completed`
- IndexedDB：`EnglishListeningDB` / `audioFiles` store（key 为素材 ID）
