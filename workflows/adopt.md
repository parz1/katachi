# 产品接入和版本锁定

产品项目引用本库的一个标签版本。产品自己的规范和例外写在产品仓库的 `DESIGN.md`。选择这种方式的原因见[决策 0003](../decisions/0003-version-pinning.md)。

> **现在还没有可接入的版本。** 第一个版本是 v0.1.0。本库也还没有远程仓库，所以其他机器和云端 agent 暂时取不到它。

## 1. 添加子模块

在产品仓库根目录运行：

```bash
git submodule add <katachi 仓库地址> design/katachi
git -C design/katachi checkout v0.1.0
git add .gitmodules design/katachi
git commit -m "Pin katachi v0.1.0"
```

其他环境克隆产品仓库时要带上子模块：

```bash
git clone --recurse-submodules <产品仓库地址>
```

已经克隆过的环境运行 `git submodule update --init`。云端 agent 要把这一步写进启动脚本，并且要有访问本库的权限。

本库有远程仓库之前，只能用本地路径在本机试验。Git 默认禁止这样添加子模块，要临时放行。这样添加的子模块在其他机器上取不到，不要用于正式接入：

```bash
git -c protocol.file.allow=always submodule add ~/Projects/katachi design/katachi
```

## 2. 告诉 agent

Codex 不会自动加载启动目录以下的 `AGENTS.md`，所以要在产品仓库自己的入口文件里加这一段。产品的 `CLAUDE.md` 已经导入 `AGENTS.md` 时不用重复。

```markdown
## 界面设计

改动界面前先读 `DESIGN.md`，再按其中的指引读 `design/katachi/AGENT_GUIDE.md`。
不要修改 `design/katachi/` 里的文件，也不要自行升级它的版本。
```

## 3. 添加 DESIGN.md

在产品仓库根目录新建，内容从这个模板开始：

```markdown
# <产品名> 设计规范

## 依赖

- 共享设计库：`design/katachi`，锁定 `v0.1.0`
- 使用说明：`design/katachi/AGENT_GUIDE.md`
- 优先级：当前用户要求 > 产品明确约束 > 本文件 > katachi > 探索性参考

## 约束

- 目标平台（`design/katachi/platforms/` 里的 ID）和最低系统版本：
- 界面语言：
- 技术限制、品牌或法规要求：

## 这个产品的选择

- 用户和高频任务：
- 布局和导航：
- 密度：
- 主要组件和平台行为：

## 例外

长期保留的偏离写在这里，包括偏离共享基础和本文件其他规定的做法。一次性的不用写。

| 偏离的规则 | 这里的做法 | 原因 | 日期 | 建议回流到共享库？ |
|---|---|---|---|---|

## 验证记录

按 `design/katachi/workflows/review.md` 的格式记录。
```

同一个例外出现在第二个产品时，考虑修改共享基础。

## 4. 使用 tokens

- **Web，构建环境能取到子模块**：直接引用 `design/katachi/tokens/build/tokens.css`。
- **Web，取不到子模块**（例如公开仓库的 CI）：把这个文件复制进产品仓库，不要手改，并在 `DESIGN.md` 记录版本。
- **其他平台（原生、终端）**：读 `design/katachi/tokens/katachi.tokens.json`，按 `platforms` 筛选。还没有生成器，第一个项目接入时再加。

## 升级版本

```bash
git -C design/katachi fetch --tags
git -C design/katachi checkout v0.2.0
git add design/katachi
```

然后读 `design/katachi/CHANGELOG.md` 里两个版本之间的内容，更新 `DESIGN.md` 的版本号，重新检查受影响的页面。

## 版本号规则

| 变化 | 版本 | 产品要做什么 |
|---|---|---|
| 修正错字、补充说明 | 修订号 | 通常不用做 |
| 新增 token、模式、示例 | 次版本 | 按需使用 |
| 重命名或删除 token；改变已采用规则的含义或数值 | 1.0 前升次版本并标「破坏性」；1.0 后升主版本 | 读版本说明，重新检查受影响的页面 |
