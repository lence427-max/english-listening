# 十篇精听工坊 — UI/UX 设计规范

## 设计理念

- **极简学习风**：减少视觉噪音，帮助用户聚焦内容
- **高对比度**：确保文本清晰可读，降低视觉疲劳
- **一致的反馈**：hover、active、disabled 状态有明确区分
- **渐进式复杂度**：默认界面简洁，高级功能按需展开

## 布局方案

采用**侧边栏 + 主内容区**布局：

```
┌─────────────┬──────────────────────────────────┐
│   Logo      │                                   │
│             │         主内容区                    │
│  导航菜单    │    （卡片式容器）                   │
│  ·素材管理   │                                   │
│  ·开始训练   │                                   │
│  ·进度看板   │                                   │
│             │                                   │
│  ─────────  │                                   │
│  主题切换    │                                   │
└─────────────┴──────────────────────────────────┘
```

- 侧边栏宽度：240px（桌面端）
- 移动端：侧边栏收起为滑入式菜单，汉堡按钮触发
- 主内容区最大宽度：1200px，居中

## 色彩系统

### 浅色主题

| Token | 色值 | 用途 |
|-------|------|------|
| `--bg` | `#f8fafc` | 页面背景 |
| `--surface` | `#ffffff` | 卡片、面板背景 |
| `--border` | `#e2e8f0` | 边框、分割线 |
| `--text` | `#1e293b` | 主文字 |
| `--text-secondary` | `#64748b` | 辅助文字 |
| `--primary` | `#6366f1` | 主色调（按钮、链接、激活态） |
| `--primary-hover` | `#4f46e5` | 主色 hover |
| `--success` | `#22c55e` | 正确/完成 |
| `--warning` | `#f59e0b` | 警告/进行中 |
| `--danger` | `#ef4444` | 错误/删除 |
| `--sidebar-bg` | `#1e293b` | 侧边栏背景 |
| `--sidebar-text` | `#cbd5e1` | 侧边栏文字 |
| `--sidebar-active` | `#6366f1` | 侧边栏激活项 |

### 深色主题

| Token | 色值 | 用途 |
|-------|------|------|
| `--bg` | `#0f172a` | 页面背景 |
| `--surface` | `#1e293b` | 卡片、面板背景 |
| `--border` | `#334155` | 边框、分割线 |
| `--text` | `#f1f5f9` | 主文字 |
| `--text-secondary` | `#94a3b8` | 辅助文字 |
| `--primary` | `#818cf8` | 主色调 |
| `--primary-hover` | `#6366f1` | 主色 hover |
| `--success` | `#4ade80` | 正确/完成 |
| `--warning` | `#fbbf24` | 警告/进行中 |
| `--danger` | `#f87171` | 错误/删除 |
| `--sidebar-bg` | `#0c1222` | 侧边栏背景 |
| `--sidebar-text` | `#94a3b8` | 侧边栏文字 |
| `--sidebar-active` | `#818cf8` | 侧边栏激活项 |

## 字体

```css
font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
```

- 标题：`font-weight: 700`（bold）
- 正文：`font-weight: 400`（normal）
- 辅助文字：`font-size: 0.875rem`（text-sm）
- 代码/单词：`font-family: 'JetBrains Mono', 'Fira Code', monospace`

## 圆角与阴影

- 卡片：`border-radius: 12px`
- 按钮：`border-radius: 8px`
- 输入框：`border-radius: 8px`
- 标签/徽章：`border-radius: 9999px`（全圆角）
- 卡片阴影（浅色）：`box-shadow: 0 1px 3px rgba(0,0,0,0.08)`
- 弹出层阴影：`box-shadow: 0 10px 25px rgba(0,0,0,0.12)`

## 组件设计

### 按钮

| 类型 | 样式 | 使用场景 |
|------|------|---------|
| Primary | 主色背景 + 白色文字 | 主操作（新建、保存、提交） |
| Secondary | 透明 + 边框 + 主色文字 | 次要操作（取消、返回） |
| Ghost | 透明 + hover 时浅背景 | 列表操作图标 |
| Danger | 红色背景 + 白色文字 | 删除、重置 |

### 表单

- 文本输入：边框 + hover 主色边框 + focus 主色 ring
- 下拉选择：与输入框一致风格
- 标签：浮于输入框上方，缩小字号
- 错误提示：红色文字 + 图标

### 卡片

- 统一样式：`background: var(--surface); border: 1px solid var(--border); border-radius: 12px;`
- header 区域：加底部 border，放置标题和操作
- body 区域：内容 padding 20px

### 状态标签

- `待开始`：灰色
- `分句中`：蓝色
- `听写中`：黄色
- `精读中`：紫色
- `已完成`：绿色
- `已掌握`：绿色
- `需复习`：橙色
- `待强化`：红色

## 交互规范

### 过渡动画
- hover 过渡：`transition: all 0.15s ease`
- 面板展开：`transition: max-height 0.3s ease`
- 侧边栏滑入：`transition: transform 0.3s ease`
- 弹窗出现：`opacity + scale` 组合动画

### 反馈
- 操作成功：右上角 Toast，3 秒自动消失
- 操作失败：Toast + 红色图标
- 加载中：骨架屏或 spinner
- 音频加载：进度条动画

### 响应式断点
- `sm`：640px（手机横屏）
- `md`：768px（平板，侧边栏收起）
- `lg`：1024px（桌面，侧边栏展开）
- `xl`：1280px（大桌面）

## 听觉设计（规划中）

- 音频控制栏悬浮于底部或嵌入内容区
- 播放时按钮改用暂停图标 + 脉冲动画
- 倍速选择：下拉或分段滑块
- 波形图：Canvas 绘制，浅色波形 + 主色进度指示
