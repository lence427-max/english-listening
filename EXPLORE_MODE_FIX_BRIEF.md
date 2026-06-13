# Explore Mode & 内容库修复优化提示词

> 给 Codex 使用：请先完整阅读本文件，再阅读项目结构和现有代码。  
> 本次任务重点修复 4 个问题：  
> 1. 素材库假音频  
> 2. Explore Mode 关联词质量差  
> 3. 探索中心卡片排版与中文显示  
> 4. Explore Mode 背景不够梦幻、不够灵动  
>
> 不要重写项目，不要破坏已有功能。请小步修改。

---

## 0. 当前问题概述

当前网站已经完成了基础 UI 优化，但还存在几个严重体验问题：

1. 内容库里有些素材是假的音频链接，文本有，但音频播放失败。
2. Explore Mode 的关联词质量差，例如测试 `planet / 行星` 时出现 `for / so / then / and` 这种无意义功能词。
3. Explore Mode 的中心卡片排版不好，单词没有居中，跑到左上角。
4. 中心探索卡片里缺少中文释义。
5. Explore Mode 背景不够梦幻、不够灵动，还没有达到“概念宇宙”的感觉。

本次优化目标不是继续堆功能，而是修复体验问题，让 Explore Mode 更像一个有趣、梦幻、可探索的英语概念宇宙。

---

# 1. 修复素材库假音频问题

## 1.1 当前问题

内容库里有些素材文本存在，但音频 URL 是假的，点击播放一直失败。

这会让用户以为网站坏了。

## 1.2 目标

不要再让用户点击不可用音频后反复播放失败。

如果素材没有真实可用音频，就把它作为“纯文本素材”处理。

## 1.3 处理方案

选择方案 A：

```text
保留文本素材。
如果音频不可用，就显示“暂无音频，可自行导入音频”。
不要继续使用假的 audioUrl。
```

## 1.4 UI 行为

对于没有真实音频的素材：

- 不显示普通播放按钮；或
- 播放按钮置灰；并
- 显示提示：`暂无音频，可自行导入音频`
- 不要反复触发播放失败
- 不要把假 audioUrl 当作真实音频处理

用户自己导入的真实音频仍然必须正常播放。

## 1.5 实现建议

请检查内容库数据来源。

如果发现：

- 空 audioUrl
- 占位 audioUrl
- 明显假的 URL
- 无法播放的本地假路径

不要当作真实音频处理。

可以新增字段：

```js
audioAvailable: false
```

或者根据 `audioUrl` 是否真实存在判断。

但不要影响已有用户导入音频功能。

---

# 2. 修复 Explore Mode 关联词质量

## 2.1 当前问题

Explore Mode 关联词质量很差。

例如测试：

```text
planet
```

却生成：

```text
for
so
then
and
```

这种词完全没有学习价值。

我要的不是功能词、停用词、连接词，而是真正与概念相关的语义联想词。

---

## 2.2 正确示例

`planet / 行星` 应该关联：

```text
orbit
moon
star
gravity
solar system
atmosphere
galaxy
asteroid
telescope
spacecraft
universe
surface
core
crater
probe
```

注意：这里的词是 `planet`，不是 `plant`。  
中文“行星”对应 `planet`。

---

## 2.3 目标

Explore Mode 的词汇关联必须从：

```text
低质量文本共现词
```

升级为：

```text
真正有语义关系的概念联想词
```

不要再出现：

```text
for
so
then
and
the
a
an
of
to
in
on
is
are
was
were
this
that
it
you
we
they
```

这种词。

---

## 2.4 加 stopwords 过滤

请在以下模块统一做 stopwords 过滤：

- 本地共现分析
- knowledge graph
- fallback 关联词生成
- Explore Mode 最终渲染节点前

至少过滤：

```js
[
  "the", "a", "an",
  "and", "or", "but",
  "for", "so", "then", "than",
  "of", "to", "in", "on", "at", "by", "with", "from", "as", "into", "about", "over", "under",
  "is", "are", "was", "were", "be", "been", "being",
  "do", "does", "did",
  "have", "has", "had",
  "will", "would", "can", "could", "should", "may", "might",
  "this", "that", "these", "those",
  "it", "its", "you", "your", "we", "our", "they", "their", "he", "she", "his", "her",
  "i", "me", "my",
  "not", "no", "yes",
  "very", "just", "also", "only", "really",
  "there", "here", "where", "when", "what", "which", "who", "how",
  "because", "if", "while", "during", "before", "after"
]
```

同时过滤：

- 长度小于 3 的词
- 纯数字
- 标点
- 重复词
- 和中心词完全相同的词
- 太泛化的词，例如 `example / thing / people / time / way`，除非它们和中心词有很强语义关系

---

## 2.5 AI 生成优先

如果 DeepSeek AI 可用，Explore Mode 应优先使用 AI 生成语义概念图，而不是直接使用低质量共现词。

AI prompt 要明确要求：

- 不要输出停用词
- 不要输出语法功能词
- 不要输出泛泛的高频词
- 输出与中心词有强语义关系的词
- 输出分类节点和具体联想词
- 每个分类 3~6 个词
- 所有词尽量是名词、动词、形容词或固定搭配
- 必须返回中文释义
- 必须返回 insight 字段

建议 prompt 方向：

```text
For the word "planet", generate a semantic concept map.

Requirements:
- Do not include function words like for, so, and, the, of, to.
- Do not include generic filler words.
- Return meaningful semantic associations only.
- Categories should include astronomy, orbit, physical features, exploration, universe.
- Each category should contain 3-6 meaningful English words or phrases.
- Also provide a Chinese translation and a short concept insight.
```

---

## 2.6 本地 fallback 也要变聪明

如果 AI 不可用，本地 fallback 也不能返回 `for / so / and`。

请做：

- stopwords 过滤
- 简单词频过滤
- 语义种子词库 fallback

可以加入一个小型内置语义词库。

示例：

```js
const semanticFallback = {
  planet: {
    translation: "行星",
    definition: "A large round object that moves around a star.",
    insight: "Planets are worlds shaped by gravity, orbit, atmosphere and time.",
    categories: [
      {
        name: "天文学",
        emoji: "🔭",
        words: ["orbit", "star", "moon", "solar system", "galaxy"]
      },
      {
        name: "物理特征",
        emoji: "🪐",
        words: ["gravity", "atmosphere", "surface", "core", "crater"]
      },
      {
        name: "太空探索",
        emoji: "🚀",
        words: ["telescope", "spacecraft", "mission", "astronaut", "probe"]
      },
      {
        name: "宇宙环境",
        emoji: "🌌",
        words: ["universe", "asteroid", "comet", "meteor", "nebula"]
      }
    ]
  }
}
```

不需要覆盖所有词，但常见词可以先做基础兜底。

---

## 2.7 增加质量门槛

在最终渲染节点前再做一次过滤。

规则：

- 如果某个词属于 stopwords，直接丢弃
- 如果词太短，直接丢弃
- 如果词是纯数字，直接丢弃
- 如果词和中心词完全相同，直接丢弃
- 如果一个分类过滤后没有有效词，不显示这个分类
- 如果 AI 返回结果质量很差，fallback 到本地语义词库
- 如果没有高质量结果，显示“暂无高质量关联词”，不要硬塞垃圾词

---

# 3. 优化 Explore 中心卡片排版和中文显示

## 3.1 当前问题

当前 Explore 中心卡片里，单词跑到左上角，不居中，很丑。

同时卡片里缺少中文释义。

## 3.2 目标

中心概念卡要精致、居中、稳定，是整个 Explore Mode 的视觉核心。

---

## 3.3 中心卡内容结构

中心卡建议显示：

```text
planet
行星

A large round object that moves around a star.

💡 Concept Insight
Planets are worlds shaped by gravity, orbit, atmosphere and time.
```

如果有 CEFR 标签，例如 B1，可以放在右上角或角落，但不要破坏标题居中。

---

## 3.4 排版要求

- 英文单词水平居中
- 中文释义水平居中
- 英文解释居中或视觉居中
- 不要贴到左上角
- 卡片内部留白合理
- AI Insight 不要像脚注，要清楚可读
- CEFR 标签可以放角落，但标题区域仍然要视觉居中
- 卡片整体要有高级感，保持玻璃拟态和柔和光晕

---

## 3.5 中文策略

采用方案 A：

- 中心卡：英文 + 中文
- 分类节点：中文 + emoji
- 子词节点：只显示英文，保持简洁
- Hover tooltip 或点击词汇时：显示英文 + 中文释义
- 不要让每个节点都直接显示中文，避免画面变乱

---

## 3.6 Hover tooltip 建议

鼠标 hover 到子词节点时，显示：

```text
orbit
轨道

A path followed by a planet or object around a star.
```

如果能找到素材来源，也可以显示：

```text
出现于 2 篇素材
```

没有中文释义时，可以调用已有词典或 AI 解释；如果都没有，就先不显示中文，不要显示错误内容。

---

# 4. Explore Mode 背景升级：浅色梦幻 + Apple Vision 风

## 4.1 当前问题

当前背景不够梦幻、不够灵动，还没有达到“概念宇宙”的感觉。

## 4.2 目标

Explore Mode 背景风格：

```text
浅色概念宇宙
梦幻星云
Apple Vision 空间感
玻璃拟态
柔和粒子
轻微星尘
```

不要做成：

- 黑暗赛博风
- 廉价科技蓝
- 游戏大特效
- PPT 背景
- 过度花哨

---

## 4.3 风格选择

采用 B + D 混合：

### B：轻梦幻浅色风

- 浅蓝灰背景
- 淡紫 / 淡蓝 / 淡青色云雾
- 柔和粒子
- 轻微星尘
- 有空间感

### D：Apple Vision 风

- 玻璃拟态
- 柔和光晕
- 大面积留白
- 低饱和渐变
- 高级克制

---

## 4.4 可实现效果

可以在 Explore Mode 背景中加入：

- 多层 radial-gradient 星云
- 极淡 floating particles
- 柔和 constellation dots
- 低透明度 concept dust
- 中心周围轻微蓝紫光晕
- 卡片背景使用 translucent white + backdrop-filter

建议透明度：

```css
opacity: 0.025 ~ 0.08
```

不要影响文字阅读。

---

## 4.5 背景关键词

Knowledge Dust 不要只用通用词。

应该叠加当前中心词相关词。

例如中心词：

```text
planet
```

背景淡淡出现：

```text
orbit
gravity
moon
star
galaxy
atmosphere
universe
solar system
```

这些词非常淡，只提供氛围感，不要喧宾夺主。

---

## 4.6 动效原则

背景可以动，但必须：

- 慢
- 轻
- 优雅
- 不抢主内容
- 不影响阅读
- 不让页面卡顿

不要变成廉价游戏特效。

---

# 5. 保留现有功能

不要破坏：

- 听力播放
- 用户导入音频
- 内容库文本
- 听写训练
- 查词
- 生词收藏
- Explore Mode
- DeepSeek AI
- 本地 fallback
- 拖拽缩放
- Hover tooltip
- 面包屑
- Concept Journey
- 听力联动 UI
- 搜索
- 已有响应式布局

尤其不要为了修素材库音频，把用户导入音频功能搞坏。

---

# 6. 验收标准

## 6.1 素材库

完成后应满足：

- 假音频不再触发播放失败
- 无音频素材显示“暂无音频，可自行导入”
- 文本仍然能学习
- 用户导入音频仍然可用
- 不再出现无限播放失败体验

---

## 6.2 Explore 关联词

测试：

```text
planet
```

不能出现：

```text
for
so
then
and
the
of
to
in
on
is
are
was
were
```

应该出现类似：

```text
orbit
moon
star
gravity
solar system
atmosphere
galaxy
asteroid
telescope
spacecraft
universe
```

其他词也应该遵循同样规则：优先语义关联，而不是功能词共现。

---

## 6.3 Explore 卡片

完成后应满足：

- 中心词居中
- 中文释义显示
- 卡片不拥挤
- AI Insight 可读
- 子节点保持英文
- Hover 显示中文
- CEFR 标签不破坏整体居中

---

## 6.4 Explore 背景

完成后应满足：

- 更梦幻
- 更灵动
- 仍然高级克制
- 不影响阅读
- 不变成黑暗赛博风
- 不变成廉价科技风
- 背景关键词与当前中心词相关

---

# 7. 执行要求

请按以下顺序处理：

1. 检查素材库数据和音频播放逻辑。
2. 修复假音频和播放失败体验。
3. 检查 Explore Mode 关联词生成逻辑。
4. 加 stopwords 过滤和质量门槛。
5. 优化 AI prompt 和 fallback 语义词库。
6. 修复中心卡片排版和中文显示。
7. 优化 Explore Mode 梦幻背景。
8. 保留所有现有功能。
9. 运行 `npm test`。
10. 运行 `npm run check`。
11. 运行 `git diff --check`。
12. 最后总结修改了哪些文件、解决了哪些问题、测试是否通过。

---

# 8. 最终汇报格式

完成后请按这个格式汇报：

```text
已完成：
1. 素材库假音频处理
2. Explore stopwords 过滤
3. planet 等语义 fallback 优化
4. 中心卡片居中和中文显示
5. 梦幻背景升级

修改文件：
- xxx.js：……
- xxx.css：……
- xxx.html：……

验证结果：
- npm test：通过 / 未通过
- npm run check：通过 / 未通过
- git diff --check：通过 / 未通过

未完成或需要人工确认：
- ……
```

---

# 9. 最重要的一句话

不要再让 Explore Mode 返回 `for / so / and` 这种词。

用户要的是：

```text
planet → orbit / gravity / moon / star / galaxy
```

不是：

```text
planet → for / so / then / and
```

Explore Mode 的核心价值是“语义联想”和“概念探索”，不是文本词频统计。
