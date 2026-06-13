# DEPLOY_TO_GITHUB_PAGES.md

给 Codex：请按本文件操作，把当前本地项目更新部署到 GitHub Pages。不要修改业务逻辑。

## 仓库

https://github.com/lence427-max/english-listening

目标访问地址：

https://lence427-max.github.io/english-listening/

---

## 任务目标

1. 检查当前项目的 Git 状态。
2. 确认远程仓库是否指向 `lence427-max/english-listening`。
3. 提交当前本地最新代码。
4. 推送到 GitHub。
5. 确认项目适合 GitHub Pages 发布。
6. 告诉我是否还需要手动去 GitHub Settings → Pages 开启发布。

---

## 操作步骤

### 1. 检查 Git 状态

运行：

```bash
git status
git remote -v
git branch
```

确认：

- 当前是否是 git 仓库
- 当前分支是否是 `main`
- remote 是否是：

```bash
https://github.com/lence427-max/english-listening.git
```

如果 remote 不对，设置为：

```bash
git remote set-url origin https://github.com/lence427-max/english-listening.git
```

如果没有 remote，添加：

```bash
git remote add origin https://github.com/lence427-max/english-listening.git
```

---

### 2. 判断项目类型

如果项目根目录有：

```text
index.html
css/
js/
```

并且不需要 build 就能运行，则按纯静态项目处理。

纯静态项目发布方式：

```text
GitHub Pages → Deploy from a branch → main / root
```

如果根目录没有 `.nojekyll`，请创建一个空的 `.nojekyll` 文件。

---

### 3. 提交并推送

运行：

```bash
git add .
git commit -m "Update Silentium UI and Explore Mode"
git push origin main
```

如果没有可提交内容，请说明。

如果 push 出现认证问题，请停止并把错误告诉我。

---

### 4. 不要做的事

不要修改业务逻辑。

不要重写项目。

不要删除功能。

不要提交：

```text
node_modules
本地缓存
临时文件
```

如有需要，请检查 `.gitignore`。

---

## 最终回复格式

完成后按这个格式告诉我：

```text
部署处理完成：

Git 状态：
- 分支：
- remote：
- 是否有提交：

项目类型：
- 纯静态 / 需要 build

本次操作：
- 是否添加 .nojekyll：
- 是否 commit：
- 是否 push 成功：

GitHub Pages：
- 推荐设置：
- 是否需要手动去 Settings → Pages 开启：
- 线上地址：

问题：
- 无 / 具体错误
```
