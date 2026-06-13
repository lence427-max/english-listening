# UI_OPTIMIZATION_BRIEF.md

> 给 Codex 使用：请先完整阅读本文件，再阅读项目结构和现有代码。  
> 目标是优化 UI/UX，不要重写业务逻辑，不要破坏现有功能。

---

## 0. 项目定位

这是一个英语听力学习网站，但未来定位不是普通播放器，也不是传统词典。

产品目标：

**英语听力 + 单词探索 + 概念宇宙**

用户体验应该从：

```text
听力 → 查词 → 返回
```

升级为：

```text
听力 → 点击单词 → 进入概念宇宙 → 发散探索 → 回到真实语境
```

核心亮点是 **Explore Mode / Concept Universe**。

---

## 1. 总体 UI 目标

当前 UI 问题：整体像学生项目，页面风格不统一，视觉层级弱，缺少高级产品感。

请把 UI 优化成：

- 现代
- 干净
- 高级
- 有 AI 产品感
- 有空间感和探索感
- 交互顺滑
- 页面留白合理
- 色彩统一
- 不像后台系统
- 不像 PPT 模板
- 不像传统词典

参考气质：

- Apple Vision Pro：柔和空间感、玻璃拟态、轻光晕
- Arc Browser：高级简洁、圆润、克制
- Linear / Notion：清晰信息层级
- FigJam / Obsidian：探索感、空间感
- Google Earth：进入下一个概念地点的感觉

---

## 2. 严格约束

### 2.1 不要破坏现有功能

必须保留：

- 听力播放
- 听写训练
- 内容库
- 查词
- 生词收藏
- Explore Mode
- DeepSeek AI 生成概念图
- 本地兜底数据
- 拖拽 / 缩放
- Hover tooltip
- 面包屑
- Concept Journey
- 听力联动 UI
- 搜索
- 已有动画

### 2.2 不要大重构

本任务是 UI/UX 优化，不是重写项目。

原则：

```text
小步迭代 > 大面积重构
保留功能 > 追求完美
先修风格 > 再改结构
```

除非非常必要，不要重写核心逻辑。

### 2.3 不要堆特效

现有动画已经足够，下一步重点是：

```text
布局比例
视觉层级
间距系统
色彩统一
Explore Mode 的空间感
知识岛结构
```

不要继续加很多炫酷动画。

---

## 3. 全站 Design System

请优先整理统一视觉系统。

建议建立或优化 CSS 变量：

```css
:root {
  --bg-main: #f7f8fb;
  --bg-card: rgba(255, 255, 255, 0.78);
  --bg-card-solid: #ffffff;

  --text-main: #111827;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;

  --border-soft: rgba(148, 163, 184, 0.18);
  --shadow-soft: 0 18px 50px rgba(15, 23, 42, 0.08);
  --shadow-hover: 0 24px 70px rgba(15, 23, 42, 0.13);

  --primary: #6366f1;
  --primary-soft: rgba(99, 102, 241, 0.12);
  --accent-cyan: #06b6d4;
  --accent-violet: #8b5cf6;
  --accent-warm: #f59e0b;

  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 22px;
  --radius-xl: 28px;

  --blur-glass: blur(20px);
}
```

全站需要统一：

- 背景
- 字体
- 标题层级
- 卡片
- 按钮
- 输入框
- 标签
- 阴影
- 边框
- hover 状态
- active 状态
- selected 状态
- loading 状态
- empty 状态

---

## 4. 全站视觉方向

### 4.1 背景

不要纯白。

推荐：

```text
浅灰蓝背景 + 极淡 radial-gradient 光晕
```

例如：

```css
body {
  background:
    radial-gradient(circle at 20% 10%, rgba(99,102,241,0.10), transparent 28%),
    radial-gradient(circle at 80% 20%, rgba(6,182,212,0.08), transparent 26%),
    #f7f8fb;
}
```

注意：光晕要淡，不要廉价科技风。

### 4.2 卡片

卡片要现代化：

- 大圆角：18~24px
- 轻玻璃拟态
- 轻边框
- 柔和阴影
- hover 时轻微上浮

不要脏阴影，不要大面积高饱和颜色。

### 4.3 字体层级

建议：

```text
页面标题：28~36px，semibold/bold
区域标题：18~22px，semibold
卡片标题：16~20px，semibold
正文：14~16px
辅助信息：12~14px，浅灰
标签：11~13px
```

英文单词要突出，中文释义辅助，不要抢主视觉。

---

## 5. 内容库页面优化

内容库卡片建议包含：

- 来源：BBC / VOA / TED / News
- 难度：A2 / B1 / B2 / C1
- 标题
- 简短描述
- 时长
- 学习状态
- 开始学习按钮

视觉要求：

- 卡片圆角 20px 左右
- 轻阴影
- hover 轻微上浮
- 来源和难度标签统一
- 内容不要拥挤
- 卡片之间间距加大
- 空状态要有友好提示

目标：像现代学习产品，不像列表表格。

---

## 6. 听力训练页优化

听力页要像一个 **学习工作台**。

建议布局：

```text
顶部：材料信息 + 当前进度
中间：音频播放器 + 听写输入区
侧边/底部：生词、错误反馈、学习状态
```

重点优化：

- 播放器现代化
- 输入框不要像普通 textarea
- 按钮层级清楚
- 错误反馈颜色柔和
- 不要红绿大色块
- 当前句子、答案、反馈的视觉层级要清楚
- 页面不要挤

---

## 7. 单词卡 / 查词 UI 优化

单词卡不要像传统词典弹窗。

建议结构：

```text
word
中文释义
CEFR 标签
简短英文解释
高频搭配
真实例句
收藏按钮
探索按钮
```

视觉原则：

- word 最大
- 中文释义辅助
- CEFR 小标签
- 英文解释简洁
- 例句用浅色小卡片
- “探索”按钮要突出，作为进入 Explore Mode 的主行为

不要把所有信息堆满。

---

## 8. Explore Mode 是重点

Explore Mode 是产品最大亮点，请重点优化。

目标不是普通知识图谱，而是：

```text
Concept Universe / 概念宇宙
```

用户感觉不是在查词，而是在进入一个概念世界。

---

# 8.1 中心概念卡

中心卡必须成为视觉核心。

建议尺寸：

```text
宽度：280~320px
高度：160~180px
```

结构建议：

```text
influence                         B1
影响

The power to affect someone's character,
beliefs, or decisions.

💡 Concept Insight
Influence often works better than authority
because it changes people voluntarily.
```

要求：

- 英文词最大
- 中文释义清晰
- CEFR 标签醒目但不刺眼
- AI Insight 不要像脚注，要有存在感
- 卡片有玻璃拟态
- 蓝紫柔和光晕
- 中心卡呼吸动画可以保留，但要轻

---

# 8.2 画面比例

当前问题：图谱容易缩在中间，像一个 Logo。

V5 目标：

首次进入时，知识网络至少占据：

```text
屏幕宽度：60%~80%
屏幕高度：60%~70%
```

不要让 70% 屏幕都是空白。

建议：

- 中心卡放大
- 分类节点距离中心更远：260~340px
- 知识岛领土更大：180~300px
- 词簇半径更大：120~200px
- 岛内词汇不要拥挤

---

# 8.3 知识岛布局

不要只是：

```text
中心词 + 四个圆形分类节点
```

每个分类应该像一个 **概念岛**。

例如：

```text
🏛️ 影响发生的场景
office / media / politics / school

⚡ 施加影响的行为
persuade / inspire / motivate / guide

❤️ 影响带来的情绪
trust / pressure / respect / fear

🧠 认知与记忆
storytelling / memory / belief / culture
```

每个岛要有自己的空间区域。

不要做成硬边框矩形卡片。

推荐：软性领土。

实现方式：

- 大面积淡色 radial-gradient
- blur 30~40px
- opacity 0.08~0.12
- 无边框
- 无矩形
- 无硬边界
- 展开时领土从中心扩散出现

用户要感觉是在看概念区域，而不是 UI 容器。

---

# 8.4 聚焦式探索路径

选择方案：**聚焦式探索路径**。

用户双击词汇后：

```text
旧中心退到背景
新词成为中心
旧中心与新中心之间保留淡色探索连线
面包屑更新
镜头平滑飞向新中心
```

不要清空后瞬间刷新。

推荐流程：

```text
双击 leadership
→ leadership 从词节点放大
→ 镜头 500~800ms 平滑移动
→ leadership 成为中心概念卡
→ 旧中心 influence 缩小成路径标记
→ 新概念岛群生成
```

目标像：

```text
Google Earth 飞向下一个地点
```

不是：

```text
页面刷新
```

---

# 8.5 路径标记

旧中心不要固定堆在左下角。

建议：

- 保留在原空间位置
- 缩小成路径标记
- opacity 0.3~0.45
- 与新中心之间有淡色连线
- 点击路径标记可以回到该词

这样用户会感觉自己真的走过了一条空间路径。

---

# 8.6 弱连接

知识岛之间不要完全孤立。

允许少量跨岛虚线连接：

- 每个岛最多 1~3 条
- opacity 很低
- 线条很细
- 只连接强相关词

例如：

```text
persuade ↔ trust
authority ↔ leadership
storytelling ↔ memory
```

作用：增加知识网络感。

不要连太多，避免变乱。

---

# 8.7 意外连接

AI 不要只生成最标准的同义词、搭配词。

需要偶尔给出有启发性的连接。

例如：

```text
influence
→ storytelling
→ memory
→ emotion
→ trust
→ leadership
```

这种比：

```text
influence
→ persuade
→ motivate
→ guide
```

更有探索价值。

目标不是分类整理，而是认知发现。

---

# 8.8 Knowledge Dust / Concept Landscape

保留通用 Knowledge Dust，同时增加当前中心词相关的背景词。

例如中心词 influence：

```text
power
trust
authority
leadership
persuasion
culture
storytelling
memory
```

要求：

- opacity 0.025~0.06
- pointer-events: none
- 不影响阅读
- 随中心词切换更新

它的作用不是让用户阅读，而是形成概念氛围。

---

# 8.9 动画原则

保留已有：

- 中心卡呼吸
- 岛屿漂浮
- 光晕变化
- Knowledge Dust 漂浮

但动画要：

- 慢
- 轻
- 优雅
- 不喧宾夺主

不要像游戏特效。

---

## 9. Concept Journey

Concept Journey 可以保留。

建议：

- 静态路线模板即可，不需要每次 AI 实时生成
- 路线要有探索感
- 不要只给标准词汇链

示例：

```text
team → leadership → authority → power → strategy
team → friendship → trust → emotion
influence → storytelling → memory → emotion → trust
```

用户点击路线时，应该沿着路线逐步进入中心，而不是一次性全部显示。

---

## 10. 中文展示策略

保持英语环境，不要把所有英文替换成中文。

建议：

- 中心卡：英文 + 中文
- 分类节点：中文 + emoji
- 词汇节点：英文
- Hover tooltip：显示完整中英信息
- 单词卡：显示中文、CEFR、例句、素材来源

这样既有沉浸式英语，又不会让用户看不懂。

---

## 11. 交互细节

所有交互都要有反馈：

- hover 轻微上浮 / 发光
- active 有按压感
- selected 状态明显
- loading 有 skeleton 或 spinner
- 弹窗/卡片出现淡入
- 页面切换不要突兀
- Explore Mode 切换中心要顺滑

---

## 12. 响应式要求

至少兼容：

- 1920×1080 桌面
- 1366×768 笔记本
- 平板
- 手机

手机端 Explore Mode 可以简化，但不能崩。

---

## 13. 建议执行步骤

请按以下顺序执行：

1. 阅读项目结构。
2. 找到主要页面、CSS 文件、Explore Mode 文件。
3. 总结当前 UI 问题。
4. 整理全站 CSS 变量和 Design System。
5. 优化基础 UI：背景、字体、按钮、卡片、输入框、标签。
6. 优化内容库页面。
7. 优化听力训练页。
8. 优化单词卡。
9. 重点优化 Explore Mode 的比例、中心卡、知识岛、路径感。
10. 保留现有功能，避免大重构。
11. 能运行就运行 build/test/lint。
12. 最后总结修改文件、优化点、无法验证的内容。

---

## 14. 验收标准

最终效果应满足：

- 不像学生项目
- 不像后台管理系统
- 不像传统词典
- 风格统一
- 页面高级干净
- 内容库卡片现代
- 听力训练页像学习工作台
- 单词卡有产品感
- Explore Mode 有概念宇宙感
- 图谱不是缩在中间的小 Logo
- 用户有继续点击探索的欲望
- 原有功能不坏

---

## 15. 最重要的一句话

不要只改颜色。

请真正优化：

```text
布局
比例
层级
间距
卡片质感
动效节奏
Explore Mode 空间感
知识岛结构
探索路径
```

产品真正的爽点是：

```text
用户因为一个词，不知不觉探索十几分钟。
```
