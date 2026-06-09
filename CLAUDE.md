# 十篇精听工坊 — 项目开发指引

## 项目简介
纯前端的英语精听训练网站，复刻"尚雯婕十篇精听背诵学习法"。
只做英语，不涉及其他语种。

## 核心原则

1. **纯前端实现**，无后端，所有数据存于浏览器
2. **训练链路不可跳跃**：听写 → 精读 → 跟读背诵
3. **所有用户操作实时保存**，防止刷新丢失数据
4. **安全第一**：所有用户输入 XSS 过滤，禁止 innerHTML 直接插入
5. **文档先行**：新功能前先更新 docs/ 下的文档

## 标准文件路径

| 文件 | 路径 |
|------|------|
| 产品需求 | `docs/requirements.md` |
| 技术规格 | `docs/tech-spec.md` |
| 设计规范 | `docs/design-spec.md` |
| 开发步骤 | `docs/development-steps.md` |
| 开发日志 | `devlog/YYYY-MM-DD.md` |

## 工作流程

### 日常开发流程

1. **头脑风暴**：做任何新功能前，先触发 `/brainstorming` 理清思路
2. **写计划**：用 `/writing-plans` 制定详细实现步骤
3. **按计划执行**：用 `/executing-plans` 分步实现
4. **代码审查**：阶段完成后用 `/requesting-code-review` 和 `/receiving-code-review`
5. **验证**：用 `/verification-before-completion` 确认功能正常
6. **写日志**：每天结束时在 `devlog/` 生成日志

### 并行开发
- 无依赖的独立模块可用 `/subagent-driven-development` 并行开发
- 多 Agent 任务分发用 `/dispatching-parallel-agents`
- 系统性调试用 `/systematic-debugging`
- 核心逻辑测试用 `/test-driven-development`

### UI/UX
- 使用 `ui-ux-pro-max` 技能和其子技能进行界面设计
- 参考 `docs/design-spec.md` 中的色彩、组件规范

## 技术速查

- **栈**：HTML5 + Tailwind CSS v3 + 原生 JS (ES Modules)
- **存储**：LocalStorage（元数据）+ IndexedDB（音频 Blob）
- **图标**：Font Awesome 6
- **词典**：Free Dictionary API（主）→ Datamuse API（备）
- **兼容**：Chrome / Edge / Firefox 最新 3 个版本

## 当前状态

- ✅ 文档体系已建立
- 🔜 阶段一：基础底座开发
- 🔜 阶段二：核心听写与 AI 分句
- 🔜 阶段四部分功能：词典、专注、看板、复习、生词本
- ⏸️ 阶段三：跟读录音（延后）
- ⏸️ 阶段五：周报卡片等（延后）
